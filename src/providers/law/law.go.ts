import { ProviderError } from "../../core/errors.js";
import { clampLimit, decodeXmlEntities, normalizeDate, normalizeQueryText } from "../../core/normalize.js";
import type { BundleConfig, SearchLawInput, SearchLawItem } from "../../core/types.js";

function extractTag(block: string, tagName: string): string | null {
  const pattern = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`);
  const match = block.match(pattern);
  return match ? decodeXmlEntities(match[1]) : null;
}

function extractLawBlocks(xml: string): string[] {
  return [...xml.matchAll(/<law\b[^>]*>([\s\S]*?)<\/law>/g)].map((match) => match[1]);
}

function buildDetailUrl(detailPath: string | null, config: BundleConfig): string {
  if (!detailPath) return config.law.detailBaseUrl;
  if (detailPath.startsWith("http://") || detailPath.startsWith("https://")) return decodeXmlEntities(detailPath);
  return `${config.law.detailBaseUrl}${decodeXmlEntities(detailPath)}`;
}

export async function searchLawProvider(input: SearchLawInput, config: BundleConfig): Promise<{ items: SearchLawItem[]; originalUrl: string }> {
  const query = normalizeQueryText(input.query);
  const limit = clampLimit(input.limit, 10, 1, 20);

  if (!query) {
    throw new ProviderError("search_law requires a non-empty query");
  }

  const url = new URL(config.law.searchBaseUrl);
  url.searchParams.set("OC", config.law.oc);
  url.searchParams.set("target", "law");
  url.searchParams.set("type", "XML");
  url.searchParams.set("query", query);
  url.searchParams.set("display", String(limit));

  const response = await fetch(url, {
    headers: {
      "User-Agent": "korean-government-api-bundle/0.1.0"
    }
  });

  if (!response.ok) {
    throw new ProviderError(`law.go.kr request failed with status ${response.status}`, { url: url.toString() });
  }

  const xml = await response.text();
  const items = extractLawBlocks(xml).map((block) => {
    const mst = extractTag(block, "법령일련번호");
    const lawId = extractTag(block, "법령ID");
    const detailPath = extractTag(block, "법령상세링크");

    return {
      law_name: extractTag(block, "법령명한글") ?? "",
      law_id: lawId,
      mst,
      ministry: extractTag(block, "소관부처명"),
      promulgation_date: normalizeDate(extractTag(block, "공포일자")),
      effective_date: normalizeDate(extractTag(block, "시행일자")),
      law_type: extractTag(block, "법령구분명"),
      original_url: buildDetailUrl(detailPath, config)
    } satisfies SearchLawItem;
  });

  return {
    items,
    originalUrl: url.toString()
  };
}
