import { buildLawmakingIdentifier, nowIso } from "../../core/citations.js";
import { loadConfig } from "../../core/config.js";
import { InputError } from "../../core/errors.js";
import type {
  GetLawmakingItemDetailInput,
  GetLawmakingItemDetailResponse,
  SearchLawmakingItemsInput,
  SearchLawmakingItemsResponse
} from "../../core/types.js";
import { getLawmakingItemDetailProvider, searchLawmakingItemsProvider } from "../../providers/lawmaking/api.js";

export const lawmakingTools = [
  {
    name: "search_lawmaking_items",
    description: "국민참여입법센터의 입법현황, 입법계획, 입법예고, 행정예고, 법령해석례, 의견제시사례 목록을 검색합니다.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "gov-status | plan | notice | notice-mod | admin-notice | interpretation | example" },
        agency_code: { type: "string", description: "소관부처 코드" },
        agency_name: { type: "string", description: "기관명, 예: 행정안전부" },
        law_kind_code: { type: "string", description: "법령종류 코드" },
        status_code: { type: "string", description: "진행단계 코드 또는 공고상태 코드" },
        year: { type: "string", description: "입법계획 연도, 예: 2026" },
        start_date: { type: "string", description: "YYYY-MM-DD 또는 YYYY.MM.DD" },
        end_date: { type: "string", description: "YYYY-MM-DD 또는 YYYY.MM.DD" },
        query: { type: "string", description: "법령명 또는 검색어" },
        query_field: { type: "string", description: "example category 검색 필드, 기본값 caseNm" },
        limit: { type: "number", description: "최대 결과 수" }
      },
      required: ["category"]
    }
  },
  {
    name: "get_lawmaking_item_detail",
    description: "국민참여입법센터 항목의 상세 내용을 가져옵니다.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "gov-status | plan | notice | notice-mod | admin-notice | interpretation | example" },
        item_id: { type: "string", description: "목록 응답의 item_id" },
        mapping_id: { type: "string", description: "입법예고/행정예고 상세 조회용 mapping_id" },
        announce_type: { type: "string", description: "입법예고/행정예고 상세 조회용 announce_type" }
      },
      required: ["category", "item_id"]
    }
  }
] as const;

export async function searchLawmakingItemsTool(input: SearchLawmakingItemsInput): Promise<SearchLawmakingItemsResponse> {
  if (!["gov-status", "plan", "notice", "notice-mod", "admin-notice", "interpretation", "example"].includes(input.category)) {
    throw new InputError("category must be one of gov-status, plan, notice, notice-mod, admin-notice, interpretation, example");
  }

  const config = loadConfig();
  const { items, originalUrl } = await searchLawmakingItemsProvider(input, config);

  return {
    source: "lawmaking.go.kr",
    provider: "국민참여입법센터 정보공개활용",
    tool: "search_lawmaking_items",
    query: input,
    identifier: buildLawmakingIdentifier(input.category, items[0]?.item_id ?? "search", items[0]?.mapping_id, items[0]?.announce_type),
    summary: items.length > 0 ? `${items.length}개 항목을 찾았습니다.` : "일치하는 항목을 찾지 못했습니다.",
    original_url: originalUrl,
    fetched_at: nowIso(),
    confidence: 0.88,
    matched_by: input.query ? "keyword" : "fallback",
    items
  };
}

export async function getLawmakingItemDetailTool(input: GetLawmakingItemDetailInput): Promise<GetLawmakingItemDetailResponse> {
  if (!["gov-status", "plan", "notice", "notice-mod", "admin-notice", "interpretation", "example"].includes(input.category)) {
    throw new InputError("category must be one of gov-status, plan, notice, notice-mod, admin-notice, interpretation, example");
  }

  if (!input.item_id?.trim()) {
    throw new InputError("item_id is required for get_lawmaking_item_detail");
  }

  if (["notice", "notice-mod", "admin-notice"].includes(input.category) && (!input.mapping_id?.trim() || !input.announce_type?.trim())) {
    throw new InputError("mapping_id and announce_type are required for notice, notice-mod, and admin-notice detail");
  }

  const config = loadConfig();
  const result = await getLawmakingItemDetailProvider(input, config);

  return {
    source: "lawmaking.go.kr",
    provider: "국민참여입법센터 정보공개활용",
    tool: "get_lawmaking_item_detail",
    query: input,
    identifier: buildLawmakingIdentifier(input.category, result.itemId, result.mappingId, result.announceType),
    summary: `${result.title} 상세를 가져왔습니다.`,
    original_url: result.originalUrl,
    fetched_at: nowIso(),
    confidence: 0.95,
    matched_by: "identifier",
    category: result.category,
    item_id: result.itemId,
    mapping_id: result.mappingId,
    announce_type: result.announceType,
    title: result.title,
    agency_name: result.agencyName,
    department_name: result.departmentName,
    law_kind: result.lawKind,
    revision_type: result.revisionType,
    status: result.status,
    date: result.date,
    summary_text: result.summaryText,
    body_text: result.bodyText,
    fields: result.fields,
    attachments: result.attachments
  };
}
