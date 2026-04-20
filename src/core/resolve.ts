import { normalizeAgeLabel, normalizeQueryText } from "./normalize.js";
import type { IntentResolution, SearchBillInput, SearchLawInput, SearchStatSeriesInput } from "./types.js";

const billPattern = /^\d{7,8}$/;
const lawKeywordPattern = /(법|시행령|시행규칙|조문|부칙|법령)/;

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
