import { ProviderError } from "../../core/errors.js";
import { clampLimit, normalizeQueryText, stripXmlTags } from "../../core/normalize.js";
import type {
  BundleConfig,
  GetDatasetMetadataInput,
  SearchPublicDatasetInput,
  SearchPublicDatasetItem
} from "../../core/types.js";
import type { DatasetSearchHit } from "./catalog.js";

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
  const linkMatch = block.match(/<a href="(\/data\/(\d+)\/(openapi|fileData)\.do)">/);
  if (!linkMatch) return null;

  const titleMatch = block.match(/<span class="title">([\s\S]*?)<\/span>\s*<\/a>/);
  const title = titleMatch ? decodeHtml(titleMatch[1]) : null;
  if (!title) return null;

  const providerMatch = block.match(/제공기관[\s\S]*?<span class="data">([\s\S]*?)<\/span>/);
  const formatMatches = [...block.matchAll(/<span class="(?:tagset|labelset)[^>]*">([^<]+)<\/span>/g)].map((m) => decodeHtml(m[1]));
  const format = normalizeFormat(formatMatches.filter((item) => /CSV|JSON|XML|XLSX|XLS|TXT|HWP|PDF|ZIP|REST|SOAP/i.test(item)).join(", "));
  const kind = linkMatch[3] as "openapi" | "fileData";

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

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  if (!response.ok) {
    throw new ProviderError(`data.go.kr request failed with status ${response.status}`, { url });
  }
  return response.text();
}

export async function searchPublicDatasetProvider(
  input: SearchPublicDatasetInput,
  config: BundleConfig
): Promise<{ items: SearchPublicDatasetItem[]; originalUrl: string }> {
  const limit = clampLimit(input.limit, 10, 1, 20);
  const keyword = normalizeQueryText(input.query);
  const originalUrl = `${config.dataGoKr.baseUrl}/tcs/dss/selectDataSetList.do?keyword=${encodeURIComponent(keyword)}&detailKeyword=&publicDataPk=&recmSe=N&detailText=`;
  const html = await fetchHtml(originalUrl);

  const keywordParts = keyword.split(" ").filter(Boolean);
  const compact = (value: string) => value.replace(/\s+/g, "").toLowerCase();
  const compactKeyword = compact(keyword);
  const items = extractListBlocks(html)
    .map((block) => parseSearchBlock(block, config))
    .filter((item): item is DatasetSearchHit => Boolean(item))
    .filter((item) => {
      const title = compact(item.title);
      const provider = compact(item.provider ?? "");
      return title.includes(compactKeyword) || keywordParts.every((word) => title.includes(compact(word)) || provider.includes(compact(word)));
    })
    .slice(0, limit)
    .map((item) => ({
      dataset_title: item.title,
      provider: item.provider,
      dataset_id: item.datasetId,
      format: item.format,
      has_api: item.hasApi,
      original_url: item.originalUrl
    }));

  return { items, originalUrl };
}

function extractMetaCell(html: string, label: string): string | null {
  const pattern = new RegExp(`<th[^>]*>${label}<\\/th>[\\s\\S]*?<td[^>]*>([\\s\\S]*?)<\\/td>`);
  const match = html.match(pattern);
  return match ? decodeHtml(match[1]) : null;
}

function extractDescription(html: string): string | null {
  const metaDesc = html.match(/<meta name="description"[^>]*content="([^"]+)"/i);
  if (metaDesc) return decodeHtml(metaDesc[1]);
  const p = html.match(/<div class="cont-box[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/);
  return p ? decodeHtml(p[1]) : null;
}

export async function getDatasetMetadataProvider(
  input: GetDatasetMetadataInput,
  config: BundleConfig
): Promise<{ title: string; provider: string | null; description: string | null; format: string | null; apiAvailable: boolean; downloadCount: string | null; originalUrl: string }> {
  const datasetId = input.dataset_id?.trim() || input.service_id?.trim();
  if (!datasetId) {
    throw new ProviderError("get_dataset_metadata requires dataset_id or service_id");
  }

  const candidatePaths = [
    `/data/${datasetId}/openapi.do`,
    `/data/${datasetId}/fileData.do`
  ];

  let html: string | null = null;
  let originalUrl: string | null = null;
  for (const path of candidatePaths) {
    const url = absoluteUrl(path, config);
    try {
      const fetched = await fetchHtml(url);
      if (fetched.includes("dataset-table") || fetched.includes("공공데이터포털")) {
        html = fetched;
        originalUrl = url;
        break;
      }
    } catch {
      // try next path
    }
  }

  if (!html || !originalUrl) {
    throw new ProviderError("could not resolve dataset detail page", { datasetId });
  }

  const titleMatch = html.match(/<caption>([\s\S]*?)로 오픈 API 정보 표|<title>([\s\S]*?)<\/title>/);
  const rawTitle = titleMatch ? decodeHtml(titleMatch[1] || titleMatch[2]) : `dataset ${datasetId}`;
  const title = rawTitle.replace(/로 오픈 API 정보 표.*/, "").replace(/\s+\|\s*공공데이터포털.*/, "").trim();
  const provider = extractMetaCell(html, "제공기관");
  const format = extractMetaCell(html, "데이터포맷");
  const description = extractDescription(html);
  const traffic = extractMetaCell(html, "활용신청") ?? extractMetaCell(html, "다운로드");
  const apiType = extractMetaCell(html, "API 유형");

  return {
    title,
    provider,
    description,
    format,
    apiAvailable: Boolean(apiType || originalUrl.endsWith("openapi.do")),
    downloadCount: traffic,
    originalUrl
  };
}
