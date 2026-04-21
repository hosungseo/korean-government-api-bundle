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
import { ecosSeriesCatalog } from "./catalog.js";

interface EcosRow {
  STAT_CODE: string;
  STAT_NAME: string;
  ITEM_CODE1: string | null;
  ITEM_NAME1: string | null;
  UNIT_NAME: string | null;
  TIME: string;
  DATA_VALUE: string;
}

function ensureEcosKey(config: BundleConfig): string {
  if (!config.ecos.apiKey) {
    throw new ProviderError("ECOS_API_KEY is required for ECOS tools");
  }
  return config.ecos.apiKey;
}

function sanitizeEcosUrl(url: string, apiKey: string): string {
  return url.replace(`/${apiKey}/`, "/{apiKey}/");
}

function buildEcosSeriesUrl(config: BundleConfig, apiKey: string, tableId: string, start: string, end: string, itemCode?: string): string {
  const safeItem = itemCode ?? "?";
  return `${config.ecos.baseUrl}/StatisticSearch/${apiKey}/json/${config.ecos.language}/1/100/${tableId}/M/${start}/${end}/${safeItem}`;
}

function normalizePeriod(value: string): string {
  return value.replace(/\D/g, "");
}

export async function searchStatSeriesProvider(
  input: SearchStatSeriesInput,
  _config: BundleConfig
): Promise<{ items: SearchStatSeriesItem[]; originalUrl: string }> {
  const normalized = normalizeQueryText(input.query).toLowerCase();
  const limit = clampLimit(input.limit, 10, 1, 20);
  const source = input.source ?? "all";

  if (source === "kosis") {
    return { items: [], originalUrl: "https://kosis.kr/openapi/" };
  }

  const scored = ecosSeriesCatalog
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

  return {
    items: scored,
    originalUrl: "https://ecos.bok.or.kr/"
  };
}

export async function getStatSeriesProvider(
  input: GetStatSeriesInput,
  config: BundleConfig
): Promise<{ unit: string | null; frequency: string | null; values: StatSeriesValue[]; updatedAt: string | null; originalUrl: string; summary: string }> {
  if (input.source === "kosis") {
    throw new ProviderError("KOSIS get_stat_series is not implemented yet");
  }

  const apiKey = ensureEcosKey(config);
  const start = normalizePeriod(input.start);
  const end = normalizePeriod(input.end);
  const requestUrl = buildEcosSeriesUrl(config, apiKey, input.table_id, start, end, input.item_code);
  const originalUrl = sanitizeEcosUrl(requestUrl, apiKey);

  const payload = await fetchJsonWithRetry<{ StatisticSearch?: { row?: EcosRow[] } }>(requestUrl, {
    headers: {
      "User-Agent": "korean-government-api-bundle/0.1.0"
    },
    timeoutMs: 8000,
    retries: 2,
    retryDelayMs: 400,
    errorPrefix: "ECOS"
  }).catch((error) => {
    if (error instanceof ProviderError) {
      throw new ProviderError(error.message, { originalUrl });
    }
    throw error;
  });

  const rows = payload.StatisticSearch?.row ?? [];
  if (rows.length === 0) {
    throw new ProviderError("ECOS returned no rows", { originalUrl, input });
  }

  return {
    unit: rows[0]?.UNIT_NAME ?? null,
    frequency: "M",
    values: rows.map((row) => ({ time: row.TIME, value: row.DATA_VALUE })),
    updatedAt: rows[rows.length - 1]?.TIME ?? null,
    originalUrl,
    summary: rows[0]?.ITEM_NAME1 ?? rows[0]?.STAT_NAME ?? `${input.table_id} 시계열`
  };
}
