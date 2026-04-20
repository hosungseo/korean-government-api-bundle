import { nowIso, buildLawCitation, buildLawIdentifier } from "../../core/citations.js";
import { loadConfig } from "../../core/config.js";
import { InputError } from "../../core/errors.js";
import { normalizeArticleRef } from "../../core/normalize.js";
import { resolveSearchLawIntent } from "../../core/resolve.js";
import type { GetLawTextInput, GetLawTextResponse, SearchLawInput, SearchLawResponse } from "../../core/types.js";
import { getLawTextProvider, searchLawProvider } from "../../providers/law/law.go.js";

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
  },
  {
    name: "get_law_text",
    description: "MST 또는 법령명으로 법령 전문 또는 특정 조문을 가져옵니다.",
    inputSchema: {
      type: "object",
      properties: {
        law_name: { type: "string", description: "법령명" },
        mst: { type: "string", description: "법령일련번호(MST)" },
        article_ref: { type: "string", description: "예: 제1조, 1" }
      }
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

export async function getLawTextTool(input: GetLawTextInput): Promise<GetLawTextResponse> {
  if (!input.mst?.trim() && !input.law_name?.trim()) {
    throw new InputError("mst or law_name is required for get_law_text");
  }

  const config = loadConfig();
  const result = await getLawTextProvider(input, config);
  const articleRef = normalizeArticleRef(input.article_ref);

  return {
    source: "law.go.kr",
    provider: "법제처 국가법령정보",
    tool: "get_law_text",
    query: input,
    identifier: buildLawIdentifier(result.mst, null),
    summary: articleRef ? `${result.lawName} ${articleRef}를 가져왔습니다.` : `${result.lawName} 전문을 가져왔습니다.`,
    original_url: result.originalUrl,
    fetched_at: nowIso(),
    confidence: input.mst ? 0.99 : 0.9,
    matched_by: input.mst ? "identifier" : "keyword",
    law_name: result.lawName,
    article_ref: result.articleRef,
    text: result.text,
    citation: buildLawCitation(result.lawName, result.articleRef)
  };
}
