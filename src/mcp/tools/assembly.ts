import { buildBillIdentifier, nowIso } from "../../core/citations.js";
import { loadConfig } from "../../core/config.js";
import { InputError } from "../../core/errors.js";
import { resolveSearchBillIntent } from "../../core/resolve.js";
import type {
  GetBillDetailInput,
  GetBillDetailResponse,
  SearchBillInput,
  SearchBillResponse
} from "../../core/types.js";
import { getBillDetailProvider, searchBillProvider } from "../../providers/assembly/openapi.js";

export const assemblyTools = [
  {
    name: "search_bill",
    description: "의안번호, 의안명, 위원회 기준으로 법안 후보를 찾습니다.",
    inputSchema: {
      type: "object",
      properties: {
        bill_no: { type: "string", description: "의안번호" },
        bill_name: { type: "string", description: "의안명" },
        proposer: { type: "string", description: "제안자" },
        committee: { type: "string", description: "소관위원회" },
        age: { type: "string", description: "대수, 예: 제22대" },
        limit: { type: "number", description: "최대 결과 수" }
      }
    }
  },
  {
    name: "get_bill_detail",
    description: "특정 법안의 상태, 타임라인, 제안이유 요약을 가져옵니다.",
    inputSchema: {
      type: "object",
      properties: {
        bill_no: { type: "string", description: "의안번호" },
        bill_id: { type: "string", description: "BILL_ID" }
      }
    }
  }
] as const;

export async function searchBillTool(input: SearchBillInput): Promise<SearchBillResponse> {
  if (!input.bill_no?.trim() && !input.bill_name?.trim() && !input.proposer?.trim() && !input.committee?.trim()) {
    throw new InputError("at least one of bill_no, bill_name, proposer, committee is required for search_bill");
  }

  const config = loadConfig();
  const resolution = resolveSearchBillIntent(input);
  const { items, originalUrl } = await searchBillProvider(input, config);

  return {
    source: "open.assembly.go.kr",
    provider: "열린국회정보",
    tool: "search_bill",
    query: input,
    identifier: buildBillIdentifier(items[0]?.bill_id ?? null, items[0]?.bill_no ?? null),
    summary: items.length > 0 ? `${items.length}개 법안 후보를 찾았습니다.` : "일치하는 법안 후보를 찾지 못했습니다.",
    original_url: originalUrl,
    fetched_at: nowIso(),
    confidence: resolution.confidence,
    matched_by: resolution.matchedBy,
    alternatives: resolution.alternatives,
    items
  };
}

export async function getBillDetailTool(input: GetBillDetailInput): Promise<GetBillDetailResponse> {
  if (!input.bill_no?.trim() && !input.bill_id?.trim()) {
    throw new InputError("bill_no or bill_id is required for get_bill_detail");
  }

  const config = loadConfig();
  const result = await getBillDetailProvider(input, config);

  return {
    source: "open.assembly.go.kr",
    provider: "열린국회정보",
    tool: "get_bill_detail",
    query: input,
    identifier: buildBillIdentifier(result.billId, result.billNo),
    summary: `${result.billName}의 상세 타임라인을 가져왔습니다.`,
    original_url: result.originalUrl,
    fetched_at: nowIso(),
    confidence: input.bill_id ? 0.99 : 0.95,
    matched_by: input.bill_id ? "identifier" : "identifier",
    bill_no: result.billNo,
    bill_id: result.billId,
    bill_name: result.billName,
    summary_text: result.summaryText,
    timeline: result.timeline,
    plenary_result: result.plenaryResult
  };
}
