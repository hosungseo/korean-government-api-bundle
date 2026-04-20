import { buildStatIdentifier, nowIso } from "../../core/citations.js";
import { loadConfig } from "../../core/config.js";
import { InputError } from "../../core/errors.js";
import { resolveSearchStatIntent } from "../../core/resolve.js";
import type {
  GetStatSeriesInput,
  GetStatSeriesResponse,
  SearchStatSeriesInput,
  SearchStatSeriesResponse
} from "../../core/types.js";
import { getStatSeriesProvider, searchStatSeriesProvider } from "../../providers/ecos/api.js";

export const statTools = [
  {
    name: "search_stat_series",
    description: "통계 주제로 시계열 후보를 찾습니다. 현재 working slice는 ECOS 중심입니다.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "통계 검색어" },
        source: { type: "string", description: "ecos | kosis | all" },
        limit: { type: "number", description: "최대 결과 수" }
      },
      required: ["query"]
    }
  },
  {
    name: "get_stat_series",
    description: "특정 통계 시계열 값을 가져옵니다. 현재 working slice는 ECOS 중심입니다.",
    inputSchema: {
      type: "object",
      properties: {
        source: { type: "string", description: "ecos | kosis" },
        table_id: { type: "string", description: "통계표 코드" },
        item_code: { type: "string", description: "항목 코드" },
        start: { type: "string", description: "시작 시점 YYYYMM" },
        end: { type: "string", description: "종료 시점 YYYYMM" }
      },
      required: ["source", "table_id", "start", "end"]
    }
  }
] as const;

export async function searchStatSeriesTool(input: SearchStatSeriesInput): Promise<SearchStatSeriesResponse> {
  if (!input.query?.trim()) {
    throw new InputError("query is required for search_stat_series");
  }

  const config = loadConfig();
  const resolution = resolveSearchStatIntent(input);
  const { items, originalUrl } = await searchStatSeriesProvider(input, config);

  return {
    source: resolution.providerId === "kosis" ? "kosis" : "ecos",
    provider: resolution.providerId === "kosis" ? "KOSIS 국가통계포털" : "한국은행 ECOS",
    tool: "search_stat_series",
    query: input,
    identifier: buildStatIdentifier(items[0]?.source ?? "ecos", items[0]?.table_id ?? "search", items[0]?.item_code),
    summary: items.length > 0 ? `${items.length}개 통계 시계열 후보를 찾았습니다.` : "일치하는 통계 시계열 후보를 찾지 못했습니다.",
    original_url: originalUrl,
    fetched_at: nowIso(),
    confidence: resolution.confidence,
    matched_by: resolution.matchedBy,
    alternatives: resolution.alternatives,
    items
  };
}

export async function getStatSeriesTool(input: GetStatSeriesInput): Promise<GetStatSeriesResponse> {
  if (!input.source || !input.table_id?.trim() || !input.start?.trim() || !input.end?.trim()) {
    throw new InputError("source, table_id, start, end are required for get_stat_series");
  }

  const config = loadConfig();
  const result = await getStatSeriesProvider(input, config);

  return {
    source: input.source,
    provider: input.source === "kosis" ? "KOSIS 국가통계포털" : "한국은행 ECOS",
    tool: "get_stat_series",
    query: input,
    identifier: buildStatIdentifier(input.source, input.table_id, input.item_code),
    summary: `${result.summary} 시계열을 가져왔습니다.`,
    original_url: result.originalUrl,
    fetched_at: nowIso(),
    confidence: input.source === "ecos" ? 0.95 : 0.7,
    matched_by: "identifier",
    unit: result.unit,
    frequency: result.frequency,
    values: result.values,
    updated_at: result.updatedAt
  };
}
