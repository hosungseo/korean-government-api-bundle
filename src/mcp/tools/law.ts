import { nowIso, buildLawIdentifier } from "../../core/citations.js";
import { loadConfig } from "../../core/config.js";
import { InputError } from "../../core/errors.js";
import { resolveSearchLawIntent } from "../../core/resolve.js";
import type { SearchLawInput, SearchLawResponse } from "../../core/types.js";
import { searchLawProvider } from "../../providers/law/law.go.js";

export const lawTools = [
  {
    name: "search_law",
    description: "법령명/키워드로 법령 후보를 찾습니다.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "검색어" },
        limit: { type: "number", description: "최대 결과 수" }
      },
      required: ["query"]
    }
  }
] as const;

export async function searchLawTool(input: SearchLawInput): Promise<SearchLawResponse> {
  if (!input.query?.trim()) {
    throw new InputError("query is required for search_law");
  }

  const config = loadConfig();
  const resolution = resolveSearchLawIntent(input);
  const { items, originalUrl } = await searchLawProvider(input, config);

  return {
    source: "law.go.kr",
    provider: "법제처 국가법령정보",
    tool: "search_law",
    query: input,
    identifier: buildLawIdentifier(items[0]?.mst ?? null, items[0]?.law_id ?? null),
    summary: items.length > 0 ? `${items.length}개 법령 후보를 찾았습니다.` : "일치하는 법령 후보를 찾지 못했습니다.",
    original_url: originalUrl,
    fetched_at: nowIso(),
    confidence: resolution.confidence,
    matched_by: resolution.matchedBy,
    alternatives: resolution.alternatives,
    items
  };
}
