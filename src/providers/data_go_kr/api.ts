import { ProviderError } from "../../core/errors.js";
import { fetchJsonWithRetry, fetchTextWithRetry } from "../../core/http.js";
import { clampLimit, normalizeQueryText, stripXmlTags } from "../../core/normalize.js";
import type {
  BundleConfig,
  GetDatasetMetadataInput,
  SearchPublicDatasetInput,
  SearchPublicDatasetItem
} from "../../core/types.js";
import type { DatasetSearchHit } from "./catalog.js";

type DatasetKind = "openapi" | "fileData";

interface DataGoKrCatalogJson {
  name?: string;
  description?: string;
  url?: string;
  keywords?: string;
  license?: string;
  dateCreated?: string;
  dateModified?: string;
  datePublished?: string;
  spatialCoverage?: string;
  temporalCoverage?: string;
  additionalType?: string;
  datasetTimeInterval?: string;
  encodingFormat?: string;
  creator?: {
    name?: string;
    contactPoint?: {
      contactType?: string;
      telephone?: string;
      "@type"?: string;
    };
    "@type"?: string;
  };
  "@context"?: string;
  "@type"?: string;
}

interface DatasetMetadataRecord {
  datasetId: string;
  kind: DatasetKind;
  title: string;
  provider: string | null;
  description: string | null;
  format: string | null;
  apiAvailable: boolean;
  originalUrl: string;
}

function absoluteUrl(path: string, config: BundleConfig): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${config.dataGoKr.baseUrl}${path}`;
}

function decodeHtml(input: string): string {
  return stripXmlTags(input)
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function extractListBlocks(html: string): string[] {
  return [...html.matchAll(/<li\s*>([\s\S]*?)<\/li>/g)].map((match) => match[1]);
}

function normalizeFormat(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = decodeHtml(raw).replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function parseSearchBlock(block: string, config: BundleConfig): DatasetSearchHit | null {
  const linkMatch = block.match(/<a href="(\/data\/(\d+)\/(openapi|fileData)\.do)[^"]*">/);
  if (!linkMatch) return null;

  const titleMatch = block.match(/<span class="title">([\s\S]*?)<\/span>\s*<\/a>/);
  const title = titleMatch ? decodeHtml(titleMatch[1]) : null;
  if (!title) return null;

  const providerMatch = block.match(/제공기관[\s\S]*?<span class="data">([\s\S]*?)<\/span>/);
  const formatMatches = [...block.matchAll(/<span class="(?:tagset|labelset)[^>]*">([^<]+)<\/span>/g)].map((m) => decodeHtml(m[1]));
  const format = normalizeFormat(formatMatches.filter((item) => /CSV|JSON|XML|XLSX|XLS|TXT|HWP|PDF|ZIP|REST|SOAP/i.test(item)).join(", "));
  const kind = linkMatch[3] as DatasetKind;

  return {
    datasetId: linkMatch[2],
    title,
    kind,
    provider: providerMatch ? decodeHtml(providerMatch[1]) : null,
    format,
    hasApi: kind === "openapi" || (format?.includes("JSON") ?? false) || (format?.includes("XML") ?? false),
    originalUrl: absoluteUrl(linkMatch[1], config)
  };
}

function searchPageUrl(keyword: string, config: BundleConfig): string {
  return `${config.dataGoKr.baseUrl}/tcs/dss/selectDataSetList.do?keyword=${encodeURIComponent(keyword)}&detailKeyword=&publicDataPk=&recmSe=N&detailText=`;
}

function catalogMetadataUrl(datasetId: string, kind: DatasetKind, config: BundleConfig): string {
  return `${config.dataGoKr.baseUrl}/catalog/${datasetId}/${kind}.json`;
}

function isMissingCatalogPayload(payload: DataGoKrCatalogJson): boolean {
  const sample = `${payload.name ?? ""} ${payload.description ?? ""}`;
  return /해당 데이터는 존재하지 않습니다/.test(sample);
}

function normalizeCatalogPayload(datasetId: string, kind: DatasetKind, payload: DataGoKrCatalogJson, config: BundleConfig): DatasetMetadataRecord {
  const title = payload.name?.trim();
  if (!title || isMissingCatalogPayload(payload)) {
    throw new ProviderError("could not resolve dataset metadata from catalog json", { datasetId, kind });
  }

  const format = normalizeFormat(payload.encodingFormat ?? null);
  const provider = payload.creator?.name?.trim() || null;
  const description = payload.description?.trim() || null;
  const originalUrl = payload.url?.trim() || absoluteUrl(`/data/${datasetId}/${kind}.do`, config);

  return {
    datasetId,
    kind,
    title,
    provider,
    description,
    format,
    apiAvailable: kind === "openapi" || /JSON|XML|REST|SOAP/i.test(format ?? ""),
    originalUrl
  };
}

async function fetchSearchHtml(url: string): Promise<string> {
  return fetchTextWithRetry(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    timeoutMs: 8000,
    retries: 2,
    retryDelayMs: 500,
    errorPrefix: "data.go.kr"
  });
}

async function fetchCatalogMetadata(datasetId: string, config: BundleConfig, preferredKind?: DatasetKind): Promise<DatasetMetadataRecord> {
  const fallbackKinds: DatasetKind[] = preferredKind === "openapi" ? ["fileData"] : ["openapi"];
  const candidateKinds: DatasetKind[] = preferredKind ? [preferredKind, ...fallbackKinds] : ["openapi", "fileData"];
  let lastError: unknown;

  for (const kind of candidateKinds) {
    const url = catalogMetadataUrl(datasetId, kind, config);

    try {
      const payload = await fetchJsonWithRetry<DataGoKrCatalogJson>(url, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        timeoutMs: 8000,
        retries: 2,
        retryDelayMs: 500,
        errorPrefix: "data.go.kr"
      });

      if (isMissingCatalogPayload(payload)) {
        continue;
      }

      return normalizeCatalogPayload(datasetId, kind, payload, config);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof ProviderError) {
    throw lastError;
  }

  throw new ProviderError("could not resolve dataset metadata from official catalog endpoints", { datasetId });
}

async function hydrateSearchHit(hit: DatasetSearchHit, config: BundleConfig): Promise<SearchPublicDatasetItem> {
  try {
    const metadata = await fetchCatalogMetadata(hit.datasetId, config, hit.kind);
    return {
      dataset_title: metadata.title,
      provider: metadata.provider,
      dataset_id: hit.datasetId,
      format: metadata.format,
      has_api: metadata.apiAvailable,
      original_url: metadata.originalUrl
    };
  } catch {
    return {
      dataset_title: hit.title,
      provider: hit.provider,
      dataset_id: hit.datasetId,
      format: hit.format,
      has_api: hit.hasApi,
      original_url: hit.originalUrl
    };
  }
}

function compact(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

export async function searchPublicDatasetProvider(
  input: SearchPublicDatasetInput,
  config: BundleConfig
): Promise<{ items: SearchPublicDatasetItem[]; originalUrl: string }> {
  const limit = clampLimit(input.limit, 10, 1, 20);
  const keyword = normalizeQueryText(input.query);
  const originalUrl = searchPageUrl(keyword, config);
  const html = await fetchSearchHtml(originalUrl);

  const keywordParts = keyword.split(" ").filter(Boolean);
  const compactKeyword = compact(keyword);
  const rawHits = extractListBlocks(html)
    .map((block) => parseSearchBlock(block, config))
    .filter((item): item is DatasetSearchHit => Boolean(item))
    .filter((item) => {
      const title = compact(item.title);
      const provider = compact(item.provider ?? "");
      return title.includes(compactKeyword) || keywordParts.every((word) => title.includes(compact(word)) || provider.includes(compact(word)));
    })
    .slice(0, Math.max(limit * 2, limit));

  const hydrated = await Promise.all(rawHits.map((hit) => hydrateSearchHit(hit, config)));
  const deduped = hydrated.filter((item, index, items) => items.findIndex((candidate) => candidate.dataset_id === item.dataset_id) === index);

  return {
    items: deduped.slice(0, limit),
    originalUrl
  };
}

export async function getDatasetMetadataProvider(
  input: GetDatasetMetadataInput,
  config: BundleConfig
): Promise<{ title: string; provider: string | null; description: string | null; format: string | null; apiAvailable: boolean; downloadCount: string | null; originalUrl: string }> {
  const datasetId = input.dataset_id?.trim() || input.service_id?.trim();
  if (!datasetId) {
    throw new ProviderError("get_dataset_metadata requires dataset_id or service_id");
  }

  const metadata = await fetchCatalogMetadata(datasetId, config);

  return {
    title: metadata.title,
    provider: metadata.provider,
    description: metadata.description,
    format: metadata.format,
    apiAvailable: metadata.apiAvailable,
    downloadCount: null,
    originalUrl: metadata.originalUrl
  };
}
