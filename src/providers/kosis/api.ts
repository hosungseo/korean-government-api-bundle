import { ProviderError } from "../../core/errors.js";
import { fetchJsonWithRetry } from "../../core/http.js";
import { clampLimit, normalizeQueryText } from "../../core/normalize.js";
import type {
  BundleConfig,
  GetStatSeriesInput,
  SearchStatSeriesInput,
  SearchStatSeriesItem,
  StatSeriesValue
} from "../../core/types.js";
import { kosisSeriesCatalog, type KosisSeriesCatalogItem } from "./catalog.js";

function effectiveKosisApiKey(config: BundleConfig): string {
  return config.kosis.apiKey || "ZjZjOTI3MjRjNmU1YzdhZTMwOWRjNjgxN2MzNDgwNmY=";
}

function maskKosisApiKey(url: string, apiKey: string): string {
  const encodedKey = encodeURIComponent(apiKey);
  return url.replace(apiKey, "{apiKey}").replace(encodedKey, "{apiKey}");
}

function scoreKosisItem(item: KosisSeriesCatalogItem, normalizedQuery: string): number {
  const keywords = [item.series_name, ...item.topic_keywords].map((value) => value.toLowerCase());
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const exactSeriesMatch = item.series_name.toLowerCase().includes(normalizedQuery) ? 3 : 0;
  const keywordMatchCount = keywords.filter((keyword) => normalizedQuery.includes(keyword) || keyword.includes(normalizedQuery)).length;
  const tokenMatchCount = queryTokens.filter((token) => keywords.some((keyword) => keyword.includes(token))).length;
  return exactSeriesMatch + keywordMatchCount + tokenMatchCount;
}

function resolveCatalogItem(input: GetStatSeriesInput): KosisSeriesCatalogItem | undefined {
  const candidates = kosisSeriesCatalog.filter((item) => {
    if (item.table_id !== input.table_id) return false;
    if (input.item_code && item.item_code !== input.item_code) return false;
    return true;
  });

  if (candidates.length === 0) return undefined;

  const exact = candidates.find((item) =>
    (input.org_id ? item.org_id === input.org_id : true) &&
    (input.obj_l1 ? item.obj_l1 === input.obj_l1 : true) &&
    (input.obj_l2 ? item.obj_l2 === input.obj_l2 : true) &&
    (input.obj_l3 ? item.obj_l3 === input.obj_l3 : true)
  );
  if (exact) return exact;

  return candidates.find((item) => item.default_selection) ?? candidates[0];
}

async function fetchKosisJson(requestUrl: string): Promise<Array<Record<string, string>>> {
  const payload = await fetchJsonWithRetry<Array<Record<string, string>> | { err?: string; errMsg?: string }>(requestUrl, {
    headers: {
      "User-Agent": "korean-government-api-bundle/0.1.0"
    },
    timeoutMs: 8000,
    retries: 2,
    retryDelayMs: 400,
    errorPrefix: "KOSIS"
  });

  if (!Array.isArray(payload)) {
    throw new ProviderError("KOSIS returned an error payload", { requestUrl, payload });
  }

  return payload;
}

function buildParameterModeSummary(payload: Array<Record<string, string>>, fallback: KosisSeriesCatalogItem): string {
  const first = payload[0] ?? {};
  const labels = [first.TBL_NM, first.ITM_NM, first.C1_NM, first.C2_NM, first.C3_NM].filter(Boolean);
  return labels.length > 0 ? labels.join(" / ") : fallback.series_name;
}

async function getKosisSeriesByUserStats(
  input: GetStatSeriesInput,
  config: BundleConfig,
  catalogItem: KosisSeriesCatalogItem
): Promise<{ unit: string | null; frequency: string | null; values: StatSeriesValue[]; updatedAt: string | null; originalUrl: string; summary: string }> {
  const apiKey = effectiveKosisApiKey(config);

  if (!catalogItem.user_stats_id) {
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
  const maskedRequestUrl = maskKosisApiKey(requestUrl, apiKey);
  const payload = await fetchKosisJson(requestUrl).catch((error) => {
    if (error instanceof ProviderError) {
      throw new ProviderError(error.message, { requestUrl: maskedRequestUrl });
    }
    throw error;
  });

  const values = payload.map((row) => ({
    time: row.PRD_DE,
    value: row.DT
  }));

  if (values.length === 0) {
    throw new ProviderError("KOSIS response contained no values", { requestUrl: maskedRequestUrl });
  }

  return {
    unit: payload[0]?.UNIT_NM ?? catalogItem.unit,
    frequency: catalogItem.frequency,
    values,
    updatedAt: values[values.length - 1]?.time ?? null,
    originalUrl: maskedRequestUrl,
    summary: payload[0]?.TBL_NM ?? catalogItem.series_name
  };
}

async function getKosisSeriesByTableParameter(
  input: GetStatSeriesInput,
  config: BundleConfig,
  catalogItem: KosisSeriesCatalogItem
): Promise<{ unit: string | null; frequency: string | null; values: StatSeriesValue[]; updatedAt: string | null; originalUrl: string; summary: string }> {
  if (!config.kosis.apiKey?.trim()) {
    throw new ProviderError("KOSIS table-parameter mode requires KOSIS_API_KEY. The sample/demo key only covers registered userStatsId slices.", {
      tableId: input.table_id,
      itemCode: input.item_code,
      required: ["KOSIS_API_KEY"]
    });
  }

  const apiKey = config.kosis.apiKey.trim();
  const orgId = input.org_id ?? catalogItem.org_id;
  const itemCode = input.item_code ?? catalogItem.item_code;
  const objL1 = input.obj_l1 ?? catalogItem.obj_l1;
  const objL2 = input.obj_l2 ?? catalogItem.obj_l2;
  const objL3 = input.obj_l3 ?? catalogItem.obj_l3;

  if (!orgId || !itemCode || !objL1) {
    throw new ProviderError("KOSIS table-parameter mode requires org_id, item_code, and obj_l1", {
      tableId: input.table_id,
      orgId,
      itemCode,
      objL1
    });
  }

  const query = new URLSearchParams({
    method: "getList",
    apiKey,
    format: "json",
    jsonVD: "Y",
    orgId,
    tblId: input.table_id,
    itmId: itemCode,
    objL1,
    prdSe: catalogItem.frequency ?? "Y",
    startPrdDe: input.start,
    endPrdDe: input.end
  });

  if (objL2) query.set("objL2", objL2);
  if (objL3) query.set("objL3", objL3);

  const requestUrl = `${config.kosis.baseUrl}/Param/statisticsParameterData.do?${query.toString()}`;
  const maskedRequestUrl = maskKosisApiKey(requestUrl, apiKey);
  const payload = await fetchKosisJson(requestUrl).catch((error) => {
    if (error instanceof ProviderError) {
      throw new ProviderError(error.message, { requestUrl: maskedRequestUrl });
    }
    throw error;
  });

  const values = payload.map((row) => ({
    time: row.PRD_DE,
    value: row.DT
  }));

  if (values.length === 0) {
    throw new ProviderError("KOSIS response contained no values", { requestUrl: maskedRequestUrl });
  }

  return {
    unit: payload[0]?.UNIT_NM ?? catalogItem.unit,
    frequency: catalogItem.frequency,
    values,
    updatedAt: payload[0]?.LST_CHN_DE ?? values[values.length - 1]?.time ?? null,
    originalUrl: maskedRequestUrl,
    summary: buildParameterModeSummary(payload, catalogItem)
  };
}

export async function searchKosisSeriesProvider(
  input: SearchStatSeriesInput,
  config: BundleConfig
): Promise<{ items: SearchStatSeriesItem[]; originalUrl: string }> {
  const normalized = normalizeQueryText(input.query).toLowerCase();
  const limit = clampLimit(input.limit, 10, 1, 20);
  const apiKey = effectiveKosisApiKey(config);

  const scored = kosisSeriesCatalog
    .map((item) => ({ item, score: scoreKosisItem(item, normalized) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => ({
      source: entry.item.source,
      series_name: entry.item.series_name,
      table_id: entry.item.table_id,
      item_code: entry.item.item_code,
      org_id: entry.item.org_id,
      obj_l1: entry.item.obj_l1,
      obj_l2: entry.item.obj_l2,
      obj_l3: entry.item.obj_l3,
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
  const catalogItem = resolveCatalogItem(input);

  if (!catalogItem) {
    throw new ProviderError("KOSIS get_stat_series requires a registered catalog mapping for this table", {
      tableId: input.table_id,
      itemCode: input.item_code,
      objL1: input.obj_l1,
      objL2: input.obj_l2,
      objL3: input.obj_l3
    });
  }

  if (catalogItem.retrieval_mode === "user-stats") {
    return getKosisSeriesByUserStats(input, config, catalogItem);
  }

  return getKosisSeriesByTableParameter(input, config, catalogItem);
}

export { resolveCatalogItem };
