import { ProviderError } from "../../core/errors.js";
import { clampLimit, normalizeDate, normalizeQueryText } from "../../core/normalize.js";
import type { BundleConfig, GazetteListItem, SearchGazetteItemsInput } from "../../core/types.js";

interface GazetteApiItem {
  pdfFilePath?: string;
  rvsnRsnMainCn?: string;
  cntntSj?: string;
  crtnYn?: string;
  hopePblictDt?: string;
  cmplatSeNm?: string;
  cntntSeqNo?: string;
  pblcnInstNm?: string;
  basisLawNm?: string;
  ofcttBookNm?: string;
  themaSe?: string;
}

interface GazetteApiResponse {
  response?: {
    pageNo?: string;
    resultCode?: string;
    pageSize?: string;
    totalCount?: string;
    items?: { item?: GazetteApiItem[] | GazetteApiItem };
    resultMsg?: string;
  };
  pageNo?: string;
  resultCode?: string;
  pageSize?: string;
  totalCount?: string;
  items?: { item?: GazetteApiItem[] | GazetteApiItem };
  resultMsg?: string;
}

function ensureGazetteKey(config: BundleConfig): string {
  if (!config.gazette.apiKey?.trim()) {
    throw new ProviderError("GAZETTE_SERVICE_KEY is required for gazette tools");
  }
  return config.gazette.apiKey.trim();
}

function maskGazetteKey(url: string, apiKey: string): string {
  const encodedKey = encodeURIComponent(apiKey);
  return url.replace(apiKey, "{apiKey}").replace(encodedKey, "{apiKey}");
}

function toApiDate(value: string | undefined, fallback: Date): string {
  if (!value?.trim()) {
    const year = fallback.getFullYear();
    const month = String(fallback.getMonth() + 1).padStart(2, "0");
    const day = String(fallback.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  }

  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) {
    throw new ProviderError(`invalid gazette date: ${value}`);
  }
  return digits;
}

function buildGazetteDocumentUrl(path: string | undefined, config: BundleConfig): string | null {
  if (!path?.trim()) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${config.gazette.siteBaseUrl}${path}`;
}

function normalizeGazetteItem(item: GazetteApiItem, requestUrl: string, config: BundleConfig): GazetteListItem {
  const documentUrl = buildGazetteDocumentUrl(item.pdfFilePath, config);

  return {
    item_id: item.cntntSeqNo?.trim() || documentUrl || requestUrl,
    title: item.cntntSj?.trim() || "제목 없음",
    publication_date: normalizeDate(item.hopePblictDt ?? null),
    publication_agency: item.pblcnInstNm?.trim() || null,
    gazette_book: item.ofcttBookNm?.trim() || null,
    document_type: item.cmplatSeNm?.trim() || null,
    basis_law: item.basisLawNm?.trim() || null,
    is_correction: item.crtnYn === "예" || item.crtnYn === "Y",
    pdf_url: documentUrl,
    original_url: documentUrl ?? requestUrl
  };
}

function collectItems(payload: GazetteApiResponse): GazetteApiItem[] {
  const body = payload.response ?? payload;
  const raw = body.items?.item;
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export async function searchGazetteItemsProvider(
  input: SearchGazetteItemsInput,
  config: BundleConfig
): Promise<{ items: GazetteListItem[]; originalUrl: string; totalCount: number | null }> {
  const apiKey = ensureGazetteKey(config);
  const limit = clampLimit(input.limit, 10, 1, 20);
  const end = toApiDate(input.end_date, new Date());
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 30);
  const start = toApiDate(input.start_date, defaultStart);

  const params = new URLSearchParams({
    serviceKey: apiKey,
    pageNo: "1",
    pageSize: String(limit),
    reqFrom: start,
    reqTo: end,
    type: "1"
  });

  const keyword = input.query ? normalizeQueryText(input.query) : "";
  if (keyword) params.set("search", keyword);
  if (input.agency_name?.trim()) params.set("pblcnSearch", normalizeQueryText(input.agency_name));
  if (input.law_name?.trim()) params.set("lawNmSearch", normalizeQueryText(input.law_name));

  const requestUrl = `${config.gazette.baseUrl}?${params.toString()}`;
  const maskedRequestUrl = maskGazetteKey(requestUrl, apiKey);
  const response = await fetch(requestUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  if (!response.ok) {
    throw new ProviderError(`gazette request failed with status ${response.status}`, { originalUrl: maskedRequestUrl });
  }

  const payload = (await response.json()) as GazetteApiResponse;
  const body = payload.response ?? payload;
  if (body.resultCode && body.resultCode !== "0") {
    throw new ProviderError(`gazette API returned resultCode ${body.resultCode}`, { originalUrl: maskedRequestUrl, resultMsg: body.resultMsg });
  }

  let items = collectItems(payload).map((item) => normalizeGazetteItem(item, maskedRequestUrl, config));

  if (keyword) {
    const compactQuery = keyword.replace(/\s+/g, "").toLowerCase();
    items = items.filter((item) => {
      const title = item.title.replace(/\s+/g, "").toLowerCase();
      const agency = (item.publication_agency ?? "").replace(/\s+/g, "").toLowerCase();
      const basisLaw = (item.basis_law ?? "").replace(/\s+/g, "").toLowerCase();
      return title.includes(compactQuery) || agency.includes(compactQuery) || basisLaw.includes(compactQuery);
    });
  }

  return {
    items,
    originalUrl: maskedRequestUrl,
    totalCount: body.totalCount ? Number(body.totalCount) : null
  };
}
