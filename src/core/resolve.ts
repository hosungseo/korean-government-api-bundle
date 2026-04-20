import { normalizeAgeLabel, normalizeQueryText } from "./normalize.js";
import type {
  IntentResolution,
  ResolveSourceBundleInput,
  SearchBillInput,
  SearchLawInput,
  SearchStatSeriesInput,
  ToolAlternative
} from "./types.js";

const billPattern = /^\d{7,8}$/;
const lawKeywordPattern = /(법|시행령|시행규칙|조문|부칙|법령)/;
const lawmakingKeywordPattern = /(입법현황|입법예고|행정예고|법령해석례|의견제시사례|입법계획|법제처심사|추진현황)/;
const gazetteKeywordPattern = /(관보|정호|호외|고시|공고|훈령|예규)/;
const datasetKeywordPattern = /(데이터셋|공공데이터포털|오픈api|openapi|api 목록|dataset)/i;
const statKeywordPattern = /(통계|시계열|기준금리|금리|cpi|소비자물가|총인구|세대수|kosis|ecos)/i;
const compareKeywordPattern = /(비교|격차|차이|비율|ratio|spread)/i;
const statIdentifierPattern = /(ecos|kosis):[A-Za-z0-9_:-]+/g;

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

export function resolveSourceBundle(input: ResolveSourceBundleInput): {
  resolution: IntentResolution;
  recommendedTool: string;
  reasoning: string;
  entities: Array<{ label: string; value: string }>;
} {
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
    const compareProviderId = resolveCompareProviderId(statIdentifiers);

    return {
      resolution: {
        intent: "stat-compare",
        providerId: compareProviderId,
        matchedBy: "identifier",
        confidence: statIdentifiers.length >= 2 ? 0.97 : 0.82,
        alternatives: [
          {
            provider: "KOSIS 국가통계포털",
            tool: "search_stat_series",
            reason: "비교할 identifier가 아직 하나뿐이면 KOSIS/ECOS에서 상대 시계열을 먼저 찾는 흐름이 자연스럽습니다."
          }
        ]
      },
      recommendedTool: "compare_stat_series",
      reasoning: "통계 identifier 또는 비교 표현이 보여 compare_stat_series로 바로 라우팅하는 것이 가장 적절합니다.",
      entities
    };
  }

  if (numericBill) {
    return {
      resolution: {
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
      },
      recommendedTool: "search_bill",
      reasoning: "7~8자리 숫자 패턴이 의안번호와 강하게 일치합니다.",
      entities
    };
  }

  if (mst) {
    return {
      resolution: {
        intent: "law-text",
        providerId: "law_go_kr",
        matchedBy: "identifier",
        confidence: 0.99
      },
      recommendedTool: "get_law_text",
      reasoning: "MST 식별자가 명시되어 있어 법령 본문 조회로 바로 연결하는 것이 가장 정확합니다.",
      entities
    };
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

    return {
      resolution: {
        intent: "lawmaking-search",
        providerId: "lawmaking_center",
        matchedBy: "keyword",
        confidence: 0.93,
        alternatives
      },
      recommendedTool: "search_lawmaking_items",
      reasoning: "입법현황/입법예고/행정예고/해석례 계열 어휘가 국민참여입법센터 surface와 가장 잘 맞습니다.",
      entities
    };
  }

  if (gazetteKeywordPattern.test(normalized)) {
    return {
      resolution: {
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
      },
      recommendedTool: "search_gazette_items",
      reasoning: "관보/정호/호외/고시/공고 계열 표현이 관보 metadata search와 직접 연결됩니다.",
      entities
    };
  }

  if (datasetKeywordPattern.test(normalized)) {
    return {
      resolution: {
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
      },
      recommendedTool: "search_public_dataset",
      reasoning: "데이터셋/API 카탈로그를 찾는 표현이 보여 공공데이터포털 metadata search가 가장 적절합니다.",
      entities
    };
  }

  if (statKeywordPattern.test(normalized)) {
    const statResolution = resolveSearchStatIntent({ query: normalized, source: "all" });
    return {
      resolution: statResolution,
      recommendedTool: "search_stat_series",
      reasoning: statResolution.providerId === "ecos"
        ? "금융·거시계열 어휘가 강해서 ECOS 우선 탐색이 적절합니다."
        : "국가통계/인구 계열 표현이 보여 통계 series 검색으로 라우팅합니다.",
      entities
    };
  }

  if (lawKeywordPattern.test(normalized)) {
    return {
      resolution: {
        intent: "law-search",
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
      },
      recommendedTool: /제\d+조/.test(normalized) ? "get_law_text" : "search_law",
      reasoning: /제\d+조/.test(normalized)
        ? "조문 표현이 있어 법령 본문 조회로 바로 가는 것이 적절합니다."
        : "법령/시행령/조문 계열 표현이 법제처 search surface와 가장 잘 맞습니다.",
      entities
    };
  }

  return {
    resolution: {
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
    },
    recommendedTool: "search_law",
    reasoning: "명시적 식별자가 부족해 기본 법령 검색 surface를 fallback으로 제안합니다.",
    entities
  };
}
