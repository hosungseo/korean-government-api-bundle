import { ProviderError } from "../../core/errors.js";
import { clampLimit, normalizeQueryText } from "../../core/normalize.js";
import type {
  BundleConfig,
  GetStatSeriesInput,
  SearchStatSeriesInput,
  SearchStatSeriesItem,
  StatSeriesValue
} from "../../core/types.js";
import { kosisSeriesCatalog } from "./catalog.js";

function effectiveKosisApiKey(config: BundleConfig): string {
  return config.kosis.apiKey || "ZjZjOTI3MjRjNmU1YzdhZTMwOWRjNjgxN2MzNDgwNmY=";
}

function maskKosisApiKey(url: string, apiKey: string): string {
  const encodedKey = encodeURIComponent(apiKey);
  return url.replace(apiKey, "{apiKey}").replace(encodedKey, "{apiKey}");
}

export async function searchKosisSeriesProvider(
  input: SearchStatSeriesInput,
  config: BundleConfig
): Promise<{ items: SearchStatSeriesItem[]; originalUrl: string }> {
  const normalized = normalizeQueryText(input.query).toLowerCase();
  const limit = clampLimit(input.limit, 10, 1, 20);
  const apiKey = effectiveKosisApiKey(config);

  const scored = kosisSeriesCatalog
    .map((item) => {
      const haystack = [item.series_name, ...item.topic_keywords].join(" ").toLowerCase();
      const score = haystack.includes(normalized) ? 2 : item.topic_keywords.some((keyword) => normalized.includes(keyword.toLowerCase())) ? 1 : 0;
      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => ({
      source: entry.item.source,
      series_name: entry.item.series_name,
      table_id: entry.item.table_id,
      item_code: entry.item.item_code,
      unit: entry.item.unit,
      frequency: entry.item.frequency,
      original_url: entry.item.original_url
    }));

  const originalUrl = maskKosisApiKey(`${config.kosis.baseUrl}/statisticsList.do?method=getList&apiKey=${apiKey}&format=json&jsonVD=Y&vwCd=MT_ZTITLE&parentListId=A`, apiKey);
  return { items: scored, originalUrl };
}

export async function getKosisSeriesProvider(
  input: GetStatSeriesInput,
  config: BundleConfig
): Promise<{ unit: string | null; frequency: string | null; values: StatSeriesValue[]; updatedAt: string | null; originalUrl: string; summary: string }> {
  const apiKey = effectiveKosisApiKey(config);
  const catalogItem = kosisSeriesCatalog.find((item) => item.table_id === input.table_id);

  if (!catalogItem?.user_stats_id) {
    throw new ProviderError("KOSIS get_stat_series requires a registered userStatsId mapping for this table", {
      tableId: input.table_id
    });
  }

  const query = new URLSearchParams({
    method: "getList",
    apiKey,
    format: "json",
    jsonVD: "Y",
    userStatsId: catalogItem.user_stats_id,
    prdSe: catalogItem.frequency ?? "Y",
    startPrdDe: input.start,
    endPrdDe: input.end
  });
  const requestUrl = `${config.kosis.baseUrl}/statisticsData.do?${query.toString()}`;
  const response = await fetch(requestUrl, {
    headers: {
      "User-Agent": "korean-government-api-bundle/0.1.0"
    }
  });

  if (!response.ok) {
    throw new ProviderError(`KOSIS request failed with status ${response.status}`, { requestUrl: maskKosisApiKey(requestUrl, apiKey) });
  }

  const payload = (await response.json()) as Array<Record<string, string>> | { err?: string; errMsg?: string };
  if (!Array.isArray(payload)) {
    throw new ProviderError("KOSIS returned an error payload", { requestUrl: maskKosisApiKey(requestUrl, apiKey), payload });
  }

  const values = payload.map((row) => ({
    time: row.PRD_DE,
    value: row.DT
  }));

  if (values.length === 0) {
    throw new ProviderError("KOSIS response contained no values", { requestUrl: maskKosisApiKey(requestUrl, apiKey) });
  }

  return {
    unit: payload[0]?.UNIT_NM ?? catalogItem.unit,
    frequency: catalogItem.frequency,
    values,
    updatedAt: values[values.length - 1]?.time ?? null,
    originalUrl: maskKosisApiKey(requestUrl, apiKey),
    summary: payload[0]?.TBL_NM ?? catalogItem.series_name
  };
}
