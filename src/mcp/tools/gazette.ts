import { buildGazetteIdentifier, nowIso } from "../../core/citations.js";
import { loadConfig } from "../../core/config.js";
import { InputError } from "../../core/errors.js";
import type { SearchGazetteItemsInput, SearchGazetteItemsResponse } from "../../core/types.js";
import { searchGazetteItemsProvider } from "../../providers/gazette/api.js";

export const gazetteTools = [
  {
    name: "search_gazette_items",
    description: "행정안전부 관보 API에서 공고, 고시, 입법예고 등 관보 항목을 검색합니다.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "제목/본문 성격의 검색어" },
        agency_name: { type: "string", description: "발행기관명" },
        law_name: { type: "string", description: "근거법령명" },
        start_date: { type: "string", description: "시작일 YYYY-MM-DD" },
        end_date: { type: "string", description: "종료일 YYYY-MM-DD" },
        limit: { type: "number", description: "최대 결과 수" }
      }
    }
  }
] as const;

export async function searchGazetteItemsTool(input: SearchGazetteItemsInput): Promise<SearchGazetteItemsResponse> {
  if (!input.query?.trim() && !input.agency_name?.trim() && !input.law_name?.trim()) {
    throw new InputError("query, agency_name, or law_name is required for search_gazette_items");
  }

  const config = loadConfig();
  const { items, originalUrl, totalCount } = await searchGazetteItemsProvider(input, config);

  return {
    source: "mois-gazette",
    provider: "행정안전부 관보 API",
    tool: "search_gazette_items",
    query: input,
    identifier: buildGazetteIdentifier(items[0]?.item_id ?? null),
    summary: items.length > 0
      ? `${items.length}개 관보 항목 후보를 찾았습니다${typeof totalCount === "number" ? ` (총 ${totalCount}건 중)` : ""}.`
      : "일치하는 관보 항목을 찾지 못했습니다.",
    original_url: originalUrl,
    fetched_at: nowIso(),
    confidence: 0.84,
    matched_by: "keyword",
    items
  };
}
