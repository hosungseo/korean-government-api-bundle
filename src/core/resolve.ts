import { normalizeAgeLabel, normalizeQueryText } from "./normalize.js";
import type { IntentResolution, SearchBillInput, SearchLawInput } from "./types.js";

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
