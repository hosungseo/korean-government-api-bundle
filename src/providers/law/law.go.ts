import { ProviderError } from "../../core/errors.js";
import { fetchTextWithRetry } from "../../core/http.js";
import { clampLimit, decodeXmlEntities, normalizeArticleRef, normalizeDate, normalizeQueryText, stripXmlTags } from "../../core/normalize.js";
import type { BundleConfig, GetLawTextInput, SearchLawInput, SearchLawItem } from "../../core/types.js";

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

function buildServiceUrl(mst: string, config: BundleConfig): string {
  const url = new URL(config.law.serviceBaseUrl);
  url.searchParams.set("OC", config.law.oc);
  url.searchParams.set("target", "law");
  url.searchParams.set("type", "XML");
  url.searchParams.set("MST", mst);
  return url.toString();
}

function extractSections(xml: string, tagName: string): string[] {
  return [...xml.matchAll(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "g"))].map((match) => match[1]);
}

function selectBestLawMatch(items: SearchLawItem[], requestedLawName: string): SearchLawItem | null {
  const normalizedRequested = normalizeQueryText(requestedLawName);
  const exact = items.find((item) => normalizeQueryText(item.law_name) === normalizedRequested);
  if (exact) return exact;

  const contains = items.find((item) => normalizeQueryText(item.law_name).includes(normalizedRequested));
  return contains ?? items[0] ?? null;
}

function extractLawNameFromXml(xml: string): string | null {
  return extractTag(xml, "법령명_한글") ?? extractTag(xml, "법령명한글");
}

function buildArticleText(articleBlock: string): string {
  const main = extractTag(articleBlock, "조문내용");
  const clauses = extractSections(articleBlock, "항").map((clauseBlock) => {
    const clauseNumber = extractTag(clauseBlock, "항번호") ?? "";
    const clauseContent = extractTag(clauseBlock, "항내용") ?? "";
    const subItems = extractSections(clauseBlock, "호").map((subItemBlock) => {
      const number = extractTag(subItemBlock, "호번호") ?? "";
      const content = extractTag(subItemBlock, "호내용") ?? "";
      return `${number} ${content}`.trim();
    });

    return [
      `${clauseNumber} ${clauseContent}`.trim(),
      ...subItems
    ].filter(Boolean).join("\n");
  });

  return [main, ...clauses]
    .filter(Boolean)
    .map((part) => stripXmlTags(part ?? ""))
    .filter(Boolean)
    .join("\n");
}

export async function searchLawProvider(input: SearchLawInput, config: BundleConfig): Promise<{ items: SearchLawItem[]; originalUrl: string }> {
  const query = normalizeQueryText(input.query);
  const limit = clampLimit(input.limit, 10, 1, 20);

  if (!config.law.oc.trim()) {
    throw new ProviderError("LAW_OC is required for law.go.kr tools");
  }

  if (!query) {
    throw new ProviderError("search_law requires a non-empty query");
  }

  const url = new URL(config.law.searchBaseUrl);
  url.searchParams.set("OC", config.law.oc);
  url.searchParams.set("target", "law");
  url.searchParams.set("type", "XML");
  url.searchParams.set("query", query);
  url.searchParams.set("display", String(limit));

  const xml = await fetchTextWithRetry(url.toString(), {
    headers: {
      "User-Agent": "korean-government-api-bundle/0.1.0"
    },
    timeoutMs: 8000,
    retries: 2,
    retryDelayMs: 400,
    errorPrefix: "law.go.kr"
  });
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

export async function getLawTextProvider(
  input: GetLawTextInput,
  config: BundleConfig
): Promise<{ lawName: string; mst: string; articleRef: string | null; text: string; originalUrl: string }> {
  let mst = input.mst?.trim() || null;
  let lawName = input.law_name?.trim() || null;

  if (!mst && !lawName) {
    throw new ProviderError("get_law_text requires mst or law_name");
  }

  if (!mst && lawName) {
    const { items } = await searchLawProvider({ query: lawName, limit: 20 }, config);
    const best = selectBestLawMatch(items, lawName);
    if (!best?.mst) {
      throw new ProviderError("could not resolve MST from law_name", { lawName });
    }
    mst = best.mst;
    lawName = best.law_name;
  }

  if (!mst) {
    throw new ProviderError("could not resolve mst for get_law_text", { input });
  }

  const originalUrl = buildServiceUrl(mst, config);
  const xml = await fetchTextWithRetry(originalUrl, {
    headers: {
      "User-Agent": "korean-government-api-bundle/0.1.0"
    },
    timeoutMs: 8000,
    retries: 2,
    retryDelayMs: 400,
    errorPrefix: "lawService"
  });
  const resolvedLawName = lawName ?? extractLawNameFromXml(xml);
  if (!resolvedLawName) {
    throw new ProviderError("could not extract law name from lawService response", { mst });
  }

  const normalizedArticleRef = normalizeArticleRef(input.article_ref);
  const articleBlocks = extractSections(xml, "조문단위").filter((block) => extractTag(block, "조문여부") === "조문");

  if (normalizedArticleRef) {
    const matchedBlock = articleBlocks.find((block) => {
      const articleNumber = extractTag(block, "조문번호");
      return articleNumber ? `제${articleNumber}조` === normalizedArticleRef : false;
    });

    if (!matchedBlock) {
      throw new ProviderError("requested article was not found", { mst, articleRef: normalizedArticleRef });
    }

    return {
      lawName: resolvedLawName,
      mst,
      articleRef: normalizedArticleRef,
      text: buildArticleText(matchedBlock),
      originalUrl
    };
  }

  const fullText = articleBlocks
    .map((block) => buildArticleText(block))
    .filter(Boolean)
    .join("\n\n");

  return {
    lawName: resolvedLawName,
    mst,
    articleRef: null,
    text: fullText,
    originalUrl
  };
}
