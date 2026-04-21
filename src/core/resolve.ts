import { normalizeAgeLabel, normalizeArticleRef, normalizeQueryText } from "./normalize.js";
import type {
  BundleDisambiguationOption,
  BundleSuggestedInputValue,
  IntentResolution,
  ResolveSourceBundleInput,
  SearchBillInput,
  SearchLawInput,
  SearchStatSeriesInput,
  ToolAlternative
} from "./types.js";

const billPattern = /^\d{7,8}$/;
const lawKeywordPattern = /(법|시행령|시행규칙|조문|부칙|법령)/;
const billKeywordPattern = /(법안|의안|위원회|발의|제안)/;
const lawmakingKeywordPattern = /(입법현황|입법예고|행정예고|법령해석례|의견제시사례|입법계획|법제처심사|추진현황)/;
const gazetteKeywordPattern = /(관보|정호|호외|고시|공고|훈령|예규)/;
const datasetKeywordPattern = /(데이터셋|공공데이터포털|오픈api|openapi|api 목록|dataset)/i;
const statKeywordPattern = /(통계|시계열|기준금리|금리|cpi|소비자물가|총인구|세대수|kosis|ecos)/i;
const compareKeywordPattern = /(비교|격차|차이|비율|ratio|spread)/i;
const statIdentifierPattern = /(ecos|kosis):[A-Za-z0-9_:-]+/g;
const agencyNamePattern = /([가-힣A-Za-z0-9·]+(?:부|청|처|위원회|교육청|검찰청|법원|국회|원))/g;
const lawNamePattern = /([가-힣A-Za-z0-9·]+(?:법|시행령|시행규칙))/;

type BundleResolutionResult = {
  resolution: IntentResolution;
  recommendedTool: string;
  reasoning: string;
  entities: Array<{ label: string; value: string }>;
  suggestedInput: Record<string, BundleSuggestedInputValue>;
  missingRequiredFields: string[];
  suggestedCli: string | null;
  handoffStatus: "ready" | "needs_input" | "needs_disambiguation";
  handoffMessage: string;
  followUpQuestion: string | null;
  disambiguationOptions: BundleDisambiguationOption[];
};

function resolveCompareProviderId(statIdentifiers: string[]): "ecos" | "kosis" {
  if (statIdentifiers.length === 0) {
    return "ecos";
  }

  const providers = new Set(
    statIdentifiers
      .map((identifier) => identifier.split(":", 1)[0]?.toLowerCase())
      .filter((value): value is string => value === "ecos" || value === "kosis")
  );

  if (providers.size === 1 && providers.has("kosis")) {
    return "kosis";
  }

  return "ecos";
}

function quoteCliValue(value: string): string {
  return /\s/.test(value) ? JSON.stringify(value) : value;
}

function buildCliSuggestion(
  toolName: string,
  suggestedInput: Record<string, BundleSuggestedInputValue>,
  missingRequiredFields: string[]
): string | null {
  const missing = new Set(missingRequiredFields);

  switch (toolName) {
    case "search_law": {
      const query = suggestedInput.query;
      if (typeof query !== "string" || !query.trim()) return null;
      return `kgab search-law ${quoteCliValue(query)}`;
    }
    case "get_law_text": {
      const parts = ["kgab get-law-text"];
      if (typeof suggestedInput.mst === "string" && suggestedInput.mst) parts.push(`--mst ${quoteCliValue(suggestedInput.mst)}`);
      else if (typeof suggestedInput.law_name === "string" && suggestedInput.law_name) parts.push(`--law-name ${quoteCliValue(suggestedInput.law_name)}`);
      else if (missing.has("mst") && missing.has("law_name")) parts.push("--mst <MST>");
      if (typeof suggestedInput.article_ref === "string" && suggestedInput.article_ref) parts.push(`--article ${quoteCliValue(suggestedInput.article_ref)}`);
      return parts.join(" ");
    }
    case "search_bill": {
      const parts = ["kgab search-bill"];
      if (typeof suggestedInput.bill_no === "string" && suggestedInput.bill_no) parts.push(`--bill-no ${quoteCliValue(suggestedInput.bill_no)}`);
      else if (typeof suggestedInput.bill_name === "string" && suggestedInput.bill_name) parts.push(`--bill-name ${quoteCliValue(suggestedInput.bill_name)}`);
      else if (missing.has("bill_no") && missing.has("bill_name")) parts.push("--bill-no <의안번호>");
      return parts.join(" ");
    }
    case "search_lawmaking_items": {
      const parts = ["kgab search-lawmaking-items"];
      if (typeof suggestedInput.category === "string" && suggestedInput.category) parts.push(`--category ${suggestedInput.category}`);
      else if (missing.has("category")) parts.push("--category <gov-status|plan|notice|notice-mod|admin-notice|interpretation|example>");
      if (typeof suggestedInput.agency_name === "string" && suggestedInput.agency_name) parts.push(`--agency-name ${quoteCliValue(suggestedInput.agency_name)}`);
      if (typeof suggestedInput.query === "string" && suggestedInput.query) parts.push(`--query ${quoteCliValue(suggestedInput.query)}`);
      return parts.join(" ");
    }
    case "search_gazette_items": {
      const parts = ["kgab search-gazette-items"];
      if (typeof suggestedInput.query === "string" && suggestedInput.query) parts.push(`--query ${quoteCliValue(suggestedInput.query)}`);
      if (typeof suggestedInput.agency_name === "string" && suggestedInput.agency_name) parts.push(`--agency-name ${quoteCliValue(suggestedInput.agency_name)}`);
      if (typeof suggestedInput.law_name === "string" && suggestedInput.law_name) parts.push(`--law-name ${quoteCliValue(suggestedInput.law_name)}`);
      if (typeof suggestedInput.start_date === "string" && suggestedInput.start_date) parts.push(`--start-date ${quoteCliValue(suggestedInput.start_date)}`);
      if (typeof suggestedInput.end_date === "string" && suggestedInput.end_date) parts.push(`--end-date ${quoteCliValue(suggestedInput.end_date)}`);
      return parts.join(" ");
    }
    case "search_stat_series": {
      const query = suggestedInput.query;
      if (typeof query !== "string" || !query.trim()) return null;
      const parts = ["kgab search-stat-series", quoteCliValue(query)];
      if (typeof suggestedInput.source === "string" && suggestedInput.source) parts.push(`--source ${suggestedInput.source}`);
      return parts.join(" ");
    }
    case "compare_stat_series": {
      const parts = ["kgab compare-stat-series"];
      if (typeof suggestedInput.series_a_identifier === "string" && suggestedInput.series_a_identifier) parts.push(`--id-a ${quoteCliValue(suggestedInput.series_a_identifier)}`);
      else if (missing.has("series_a_identifier")) parts.push("--id-a <IDENTIFIER>");
      if (typeof suggestedInput.series_b_identifier === "string" && suggestedInput.series_b_identifier) parts.push(`--id-b ${quoteCliValue(suggestedInput.series_b_identifier)}`);
      else if (missing.has("series_b_identifier")) parts.push("--id-b <IDENTIFIER>");
      if (typeof suggestedInput.start === "string" && suggestedInput.start) parts.push(`--start ${quoteCliValue(suggestedInput.start)}`);
      else if (missing.has("start")) parts.push("--start <YYYYMM>");
      if (typeof suggestedInput.end === "string" && suggestedInput.end) parts.push(`--end ${quoteCliValue(suggestedInput.end)}`);
      else if (missing.has("end")) parts.push("--end <YYYYMM>");
      return parts.join(" ");
    }
    case "search_public_dataset": {
      const query = suggestedInput.query;
      if (typeof query !== "string" || !query.trim()) return null;
      return `kgab search-public-dataset ${quoteCliValue(query)}`;
    }
    default:
      return null;
  }
}

function removeTokens(input: string, tokens: Array<string | undefined | null>): string {
  return tokens
    .filter((token): token is string => typeof token === "string" && token.trim().length > 0)
    .reduce((acc, token) => acc.replace(token, " "), input)
    .replace(/\s+/g, " ")
    .trim();
}

function extractArticleRef(input: string): string | null {
  const articleMatch = input.match(/제\s*\d+\s*조/);
  return normalizeArticleRef(articleMatch?.[0]);
}

function extractAgencyName(input: string): string | null {
  const matches = [...input.matchAll(agencyNamePattern)].map((match) => match[1]);
  if (matches.length === 0) return null;
  return matches.sort((left, right) => right.length - left.length)[0] ?? null;
}

function extractLawName(input: string): string | null {
  const match = input.match(lawNamePattern);
  return match?.[1] ?? null;
}

function detectLawmakingCategory(input: string): string {
  if (/법령해석례/.test(input)) return "interpretation";
  if (/의견제시사례/.test(input)) return "example";
  if (/행정예고/.test(input)) return "admin-notice";
  if (/입법계획/.test(input)) return "plan";
  if (/입법예고.*변경|변경.*입법예고|notice-mod/i.test(input)) return "notice-mod";
  if (/입법예고/.test(input)) return "notice";
  return "gov-status";
}

function extractPeriodRange(input: string): { start?: string; end?: string } {
  const rangeMatch = input.match(/\b(20\d{2}(?:\d{2})?)\s*(?:~|부터|-|–)\s*(20\d{2}(?:\d{2})?)\b/);
  if (!rangeMatch) {
    return {};
  }

  return {
    start: rangeMatch[1],
    end: rangeMatch[2]
  };
}

function buildSuggestion(
  recommendedTool: string,
  input: ResolveSourceBundleInput,
  normalized: string,
  resolution: IntentResolution,
  entities: Array<{ label: string; value: string }>
): { suggestedInput: Record<string, BundleSuggestedInputValue>; missingRequiredFields: string[]; suggestedCli: string | null } {
  const suggestedInput: Record<string, BundleSuggestedInputValue> = {};
  const missingRequiredFields: string[] = [];
  const billNo = entities.find((entity) => entity.label === "bill_no")?.value;
  const mst = entities.find((entity) => entity.label === "mst")?.value;
  const statIdentifiers = entities.filter((entity) => entity.label === "stat_identifier").map((entity) => entity.value);
  const agencyName = extractAgencyName(normalized);
  const articleRef = extractArticleRef(normalized);
  const lawName = extractLawName(normalized);
  const { start, end } = extractPeriodRange(normalized);

  switch (recommendedTool) {
    case "search_bill": {
      if (billNo) {
        suggestedInput.bill_no = billNo;
      } else {
        const billName = removeTokens(normalized, [agencyName, articleRef]);
        if (billName) suggestedInput.bill_name = billName;
        else missingRequiredFields.push("bill_no", "bill_name");
      }
      break;
    }
    case "get_law_text": {
      if (mst) suggestedInput.mst = mst;
      if (!mst && lawName) suggestedInput.law_name = lawName;
      if (!mst && !lawName) {
        missingRequiredFields.push("mst", "law_name");
      }
      if (articleRef) suggestedInput.article_ref = articleRef;
      break;
    }
    case "search_lawmaking_items": {
      suggestedInput.category = detectLawmakingCategory(normalized);
      if (agencyName) suggestedInput.agency_name = agencyName;
      const query = removeTokens(normalized, [agencyName, "입법현황", "입법예고", "행정예고", "법령해석례", "의견제시사례", "입법계획", "법제처심사", "추진현황"]);
      if (query) suggestedInput.query = query;
      break;
    }
    case "search_gazette_items": {
      if (agencyName) suggestedInput.agency_name = agencyName;
      if (lawName) suggestedInput.law_name = lawName;
      if (start) suggestedInput.start_date = start;
      if (end) suggestedInput.end_date = end;
      const query = removeTokens(normalized, [agencyName, lawName, "관보", "정호", "호외", "고시", "공고", "훈령", "예규", start, end]);
      if (query) suggestedInput.query = query;
      break;
    }
    case "search_stat_series": {
      suggestedInput.source = resolution.providerId === "kosis" ? "kosis" : resolution.providerId === "ecos" ? "ecos" : "all";
      const query = removeTokens(normalized, ["통계", "시계열", "kosis", "ecos"]);
      suggestedInput.query = query || input.query;
      break;
    }
    case "compare_stat_series": {
      if (statIdentifiers[0]) suggestedInput.series_a_identifier = statIdentifiers[0];
      else missingRequiredFields.push("series_a_identifier");
      if (statIdentifiers[1]) suggestedInput.series_b_identifier = statIdentifiers[1];
      else missingRequiredFields.push("series_b_identifier");
      if (start) suggestedInput.start = start;
      else missingRequiredFields.push("start");
      if (end) suggestedInput.end = end;
      else missingRequiredFields.push("end");
      break;
    }
    case "search_public_dataset": {
      const query = removeTokens(normalized, ["데이터셋", "공공데이터포털", "오픈api", "openapi", "api 목록", "dataset"]);
      suggestedInput.query = query || input.query;
      break;
    }
    case "search_law": {
      const query = removeTokens(normalized, [articleRef]);
      suggestedInput.query = query || input.query;
      break;
    }
    default:
      break;
  }

  return {
    suggestedInput,
    missingRequiredFields,
    suggestedCli: buildCliSuggestion(recommendedTool, suggestedInput, missingRequiredFields)
  };
}

function buildDisambiguationOptions(normalized: string): BundleDisambiguationOption[] {
  const options: BundleDisambiguationOption[] = [];

  if (/민간위탁/.test(normalized)) {
    options.push(
      {
        label: "현행 법령 기준으로 보고 싶다",
        value: "law",
        tool: "search_law",
        provider: "법제처 국가법령정보",
        reason: "민간위탁의 법적 근거와 조문을 찾는 흐름입니다."
      },
      {
        label: "국회 법안 기준으로 보고 싶다",
        value: "bill",
        tool: "search_bill",
        provider: "열린국회정보",
        reason: "발의안, 심사 상태, 계류 여부를 보려는 흐름입니다."
      },
      {
        label: "데이터셋부터 찾고 싶다",
        value: "dataset",
        tool: "search_public_dataset",
        provider: "공공데이터포털",
        reason: "공개 데이터 source를 먼저 찾는 흐름입니다."
      }
    );
  }

  if (/입법예고|행정예고/.test(normalized)) {
    options.push(
      {
        label: "예고 제도 정보 중심으로 본다",
        value: "lawmaking",
        tool: "search_lawmaking_items",
        provider: "국민참여입법센터 정보공개활용",
        reason: "예고 목록과 행정 절차 정보를 구조적으로 찾습니다."
      },
      {
        label: "관보 게재본 중심으로 본다",
        value: "gazette",
        tool: "search_gazette_items",
        provider: "행정안전부 관보 API",
        reason: "실제 게재된 관보 공고·고시 문서를 찾습니다."
      }
    );
  }

  if (lawKeywordPattern.test(normalized) && billKeywordPattern.test(normalized)) {
    options.push(
      {
        label: "현행 법령을 찾는다",
        value: "law",
        tool: "search_law",
        provider: "법제처 국가법령정보",
        reason: "현행 조문과 시행 상태를 보려는 질의에 맞습니다."
      },
      {
        label: "법안을 찾는다",
        value: "bill",
        tool: "search_bill",
        provider: "열린국회정보",
        reason: "발의안, 위원회 심사, 처리 상태를 보려는 질의에 맞습니다."
      }
    );
  }

  if (statKeywordPattern.test(normalized) && datasetKeywordPattern.test(normalized)) {
    options.push(
      {
        label: "바로 통계 시계열을 찾는다",
        value: "stats",
        tool: "search_stat_series",
        provider: "ECOS / KOSIS",
        reason: "값과 시계열 후보를 바로 찾습니다."
      },
      {
        label: "원천 데이터셋부터 찾는다",
        value: "dataset",
        tool: "search_public_dataset",
        provider: "공공데이터포털",
        reason: "제공 API나 배포 데이터 source를 먼저 확인합니다."
      }
    );
  }

  return options.filter(
    (option, index, array) => array.findIndex((candidate) => candidate.tool === option.tool && candidate.value === option.value) === index
  );
}

function buildHandoff(
  normalized: string,
  recommendedTool: string,
  suggestedCli: string | null,
  missingRequiredFields: string[],
  resolution: IntentResolution
): {
  handoffStatus: "ready" | "needs_input" | "needs_disambiguation";
  handoffMessage: string;
  followUpQuestion: string | null;
  disambiguationOptions: BundleDisambiguationOption[];
} {
  const disambiguationOptions = buildDisambiguationOptions(normalized);
  const confidence = resolution.confidence ?? 0;

  if (disambiguationOptions.length >= 2 && (confidence < 0.8 || /민간위탁|입법예고|행정예고/.test(normalized))) {
    return {
      handoffStatus: "needs_disambiguation",
      handoffMessage: "바로 실행하기 전에 해석 축을 한 번 더 좁히는 편이 안전합니다.",
      followUpQuestion: "어느 쪽을 원하시나요? 아래 옵션 중 하나를 고르면 그 tool 입력으로 바로 이어갈 수 있습니다.",
      disambiguationOptions
    };
  }

  if (missingRequiredFields.length > 0) {
    return {
      handoffStatus: "needs_input",
      handoffMessage: `추천 tool은 정해졌지만 아직 ${missingRequiredFields.join(", ")} 값이 필요합니다.`,
      followUpQuestion: `부족한 값(${missingRequiredFields.join(", ")})만 주시면 ${recommendedTool}로 바로 넘길 수 있습니다.${suggestedCli ? ` 현재 템플릿: ${suggestedCli}` : ""}`,
      disambiguationOptions: []
    };
  }

  return {
    handoffStatus: "ready",
    handoffMessage: suggestedCli
      ? `입력 shape가 충분히 채워져 있어 ${recommendedTool}로 바로 넘길 수 있습니다.`
      : `추천 tool ${recommendedTool}로 바로 진행할 수 있습니다.`,
    followUpQuestion: null,
    disambiguationOptions: []
  };
}

export function resolveSearchLawIntent(input: SearchLawInput): IntentResolution {
  const normalized = normalizeQueryText(input.query);

  if (billPattern.test(normalized)) {
    return {
      intent: "law-search",
      providerId: "law_go_kr",
      matchedBy: "fallback",
      confidence: 0.42,
      alternatives: [
        {
          provider: "열린국회정보",
          tool: "search_bill",
          reason: "숫자형 질의는 의안번호일 가능성이 높습니다."
        }
      ]
    };
  }

  if (lawKeywordPattern.test(normalized)) {
    return {
      intent: "law-search",
      providerId: "law_go_kr",
      matchedBy: "keyword",
      confidence: 0.94
    };
  }

  return {
    intent: "law-search",
    providerId: "law_go_kr",
    matchedBy: "keyword",
    confidence: 0.78
  };
}

export function resolveSearchBillIntent(input: SearchBillInput): IntentResolution {
  if (input.bill_no && billPattern.test(input.bill_no.trim())) {
    return {
      intent: "bill-search",
      providerId: "assembly_openapi",
      matchedBy: "identifier",
      confidence: 0.99
    };
  }

  if (input.bill_name || input.proposer || input.committee || normalizeAgeLabel(input.age)) {
    return {
      intent: "bill-search",
      providerId: "assembly_openapi",
      matchedBy: "keyword",
      confidence: 0.9
    };
  }

  return {
    intent: "bill-search",
    providerId: "assembly_openapi",
    matchedBy: "fallback",
    confidence: 0.5
  };
}

export function resolveSearchStatIntent(input: SearchStatSeriesInput): IntentResolution {
  const normalized = normalizeQueryText(input.query);
  const source = input.source ?? "all";

  if (source === "kosis") {
    return {
      intent: "stat-search",
      providerId: "kosis",
      matchedBy: "keyword",
      confidence: 0.72,
      alternatives: [
        {
          provider: "ECOS",
          tool: "search_stat_series",
          reason: "금융·거시계열은 ECOS가 더 직접적입니다. 인구·국가통계는 KOSIS를 우선 보세요."
        }
      ]
    };
  }

  if (/(기준금리|금리|CPI|소비자물가|통화량|M2|주택담보대출)/.test(normalized)) {
    return {
      intent: "stat-search",
      providerId: "ecos",
      matchedBy: "keyword",
      confidence: 0.95
    };
  }

  return {
    intent: "stat-search",
    providerId: source === "all" ? "ecos" : source,
    matchedBy: "keyword",
    confidence: 0.8
  };
}

function finalizeBundleResolution(
  input: ResolveSourceBundleInput,
  normalized: string,
  resolution: IntentResolution,
  recommendedTool: string,
  reasoning: string,
  entities: Array<{ label: string; value: string }>
): BundleResolutionResult {
  const suggestion = buildSuggestion(recommendedTool, input, normalized, resolution, entities);
  const handoff = buildHandoff(normalized, recommendedTool, suggestion.suggestedCli, suggestion.missingRequiredFields, resolution);

  return {
    resolution,
    recommendedTool,
    reasoning,
    entities,
    ...suggestion,
    ...handoff
  };
}

export function resolveSourceBundle(input: ResolveSourceBundleInput): BundleResolutionResult {
  const normalized = normalizeQueryText(input.query);
  const statIdentifiers = normalized.match(statIdentifierPattern) ?? [];
  const normalizedWithoutStatIdentifiers = statIdentifiers.reduce((acc, identifier) => acc.replace(identifier, " "), normalized);
  const entities: Array<{ label: string; value: string }> = [];

  const numericBill = normalizedWithoutStatIdentifiers.match(/\b\d{7,8}\b/);
  if (numericBill) {
    entities.push({ label: "bill_no", value: numericBill[0] });
  }

  const mst = normalized.match(/MST\s*=?\s*(\d+)/i);
  if (mst) {
    entities.push({ label: "mst", value: mst[1] });
  }

  for (const identifier of statIdentifiers) {
    entities.push({ label: "stat_identifier", value: identifier });
  }

  if (statIdentifiers.length >= 2 || (compareKeywordPattern.test(normalized) && statIdentifiers.length >= 1)) {
    const resolution: IntentResolution = {
      intent: "stat-compare",
      providerId: resolveCompareProviderId(statIdentifiers),
      matchedBy: "identifier",
      confidence: statIdentifiers.length >= 2 ? 0.97 : 0.82,
      alternatives: [
        {
          provider: "KOSIS 국가통계포털",
          tool: "search_stat_series",
          reason: "비교할 identifier가 아직 하나뿐이면 KOSIS/ECOS에서 상대 시계열을 먼저 찾는 흐름이 자연스럽습니다."
        }
      ]
    };
    return finalizeBundleResolution(input, normalized, resolution, "compare_stat_series", "통계 identifier 또는 비교 표현이 보여 compare_stat_series로 바로 라우팅하는 것이 가장 적절합니다.", entities);
  }

  if (numericBill) {
    const resolution: IntentResolution = {
      intent: "bill-search",
      providerId: "assembly_openapi",
      matchedBy: "identifier",
      confidence: 0.99,
      alternatives: [
        {
          provider: "법제처 국가법령정보",
          tool: "search_law",
          reason: "숫자열이 법안번호가 아니라면 법령 검색으로 돌아갈 수 있습니다."
        }
      ]
    };
    return finalizeBundleResolution(input, normalized, resolution, "search_bill", "7~8자리 숫자 패턴이 의안번호와 강하게 일치합니다.", entities);
  }

  if (mst) {
    const resolution: IntentResolution = {
      intent: "law-text",
      providerId: "law_go_kr",
      matchedBy: "identifier",
      confidence: 0.99
    };
    return finalizeBundleResolution(input, normalized, resolution, "get_law_text", "MST 식별자가 명시되어 있어 법령 본문 조회로 바로 연결하는 것이 가장 정확합니다.", entities);
  }

  if (lawmakingKeywordPattern.test(normalized)) {
    const alternatives: ToolAlternative[] = [];
    if (/입법예고|행정예고/.test(normalized)) {
      alternatives.push({
        provider: "행정안전부 관보 API",
        tool: "search_gazette_items",
        reason: "예고문의 관보 게재본을 찾고 싶다면 관보 검색도 함께 볼 가치가 있습니다."
      });
    }

    const resolution: IntentResolution = {
      intent: "lawmaking-search",
      providerId: "lawmaking_center",
      matchedBy: "keyword",
      confidence: 0.93,
      alternatives
    };
    return finalizeBundleResolution(input, normalized, resolution, "search_lawmaking_items", "입법현황/입법예고/행정예고/해석례 계열 어휘가 국민참여입법센터 surface와 가장 잘 맞습니다.", entities);
  }

  if (gazetteKeywordPattern.test(normalized)) {
    const resolution: IntentResolution = {
      intent: "gazette-search",
      providerId: "mois_gazette",
      matchedBy: "keyword",
      confidence: 0.9,
      alternatives: [
        {
          provider: "국민참여입법센터 정보공개활용",
          tool: "search_lawmaking_items",
          reason: "입법예고/행정예고가 핵심이면 국민참여입법센터 검색이 더 구조적일 수 있습니다."
        }
      ]
    };
    return finalizeBundleResolution(input, normalized, resolution, "search_gazette_items", "관보/정호/호외/고시/공고 계열 표현이 관보 metadata search와 직접 연결됩니다.", entities);
  }

  if (datasetKeywordPattern.test(normalized)) {
    const resolution: IntentResolution = {
      intent: "dataset-search",
      providerId: "data_go_kr",
      matchedBy: "keyword",
      confidence: 0.9,
      alternatives: [
        {
          provider: "KOSIS 국가통계포털",
          tool: "search_stat_series",
          reason: "질문이 데이터셋보다 바로 통계값 탐색이라면 KOSIS/ECOS가 더 빠를 수 있습니다."
        }
      ]
    };
    return finalizeBundleResolution(input, normalized, resolution, "search_public_dataset", "데이터셋/API 카탈로그를 찾는 표현이 보여 공공데이터포털 metadata search가 가장 적절합니다.", entities);
  }

  if (statKeywordPattern.test(normalized)) {
    const resolution = resolveSearchStatIntent({ query: normalized, source: "all" });
    const reasoning = resolution.providerId === "ecos"
      ? "금융·거시계열 어휘가 강해서 ECOS 우선 탐색이 적절합니다."
      : "국가통계/인구 계열 표현이 보여 통계 series 검색으로 라우팅합니다.";
    return finalizeBundleResolution(input, normalized, resolution, "search_stat_series", reasoning, entities);
  }

  if (lawKeywordPattern.test(normalized)) {
    const recommendedTool = /제\s*\d+\s*조/.test(normalized) ? "get_law_text" : "search_law";
    const resolution: IntentResolution = {
      intent: recommendedTool === "get_law_text" ? "law-text" : "law-search",
      providerId: "law_go_kr",
      matchedBy: "keyword",
      confidence: 0.9,
      alternatives: [
        {
          provider: "열린국회정보",
          tool: "search_bill",
          reason: "법률안 단계인지 현행 법령인지 애매하면 법안 검색도 대안이 됩니다."
        }
      ]
    };
    const reasoning = recommendedTool === "get_law_text"
      ? "조문 표현이 있어 법령 본문 조회로 바로 가는 것이 적절합니다."
      : "법령/시행령/조문 계열 표현이 법제처 search surface와 가장 잘 맞습니다.";
    return finalizeBundleResolution(input, normalized, resolution, recommendedTool, reasoning, entities);
  }

  const resolution: IntentResolution = {
    intent: "law-search",
    providerId: "law_go_kr",
    matchedBy: "fallback",
    confidence: 0.45,
    alternatives: [
      {
        provider: "열린국회정보",
        tool: "search_bill",
        reason: "질문이 법안 단계일 수 있습니다."
      },
      {
        provider: "공공데이터포털",
        tool: "search_public_dataset",
        reason: "질문이 데이터 source 탐색일 수도 있습니다."
      }
    ]
  };
  return finalizeBundleResolution(input, normalized, resolution, "search_law", "명시적 식별자가 부족해 기본 법령 검색 surface를 fallback으로 제안합니다.", entities);
}
