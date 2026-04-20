import { ProviderError } from "../../core/errors.js";
import { clampLimit, normalizeAgeLabel, normalizeDate, normalizeQueryText } from "../../core/normalize.js";
import type {
  BillTimelineStep,
  BundleConfig,
  GetBillDetailInput,
  SearchBillInput,
  SearchBillItem
} from "../../core/types.js";

interface OpenApiRowContainer<T> {
  head?: unknown[];
  row?: T[];
}

interface AllBillRow {
  BILL_ID?: string;
  BILL_NO?: string;
  BILL_NM?: string;
  PPSR_NM?: string;
  PPSR?: string;
  JRCMIT_NM?: string;
  PPSL_DT?: string;
  ERACO?: string;
  RGS_CONF_RSLT?: string;
  PROC_RESULT?: string;
  PASSGUBN?: string;
  LINK_URL?: string;
}

interface BillSummaryRow {
  BILL_NO?: string;
  BILL_NAME?: string;
  BILL_ID?: string;
  SUMMARY?: string;
}

interface BillDetailRow {
  BILL_ID?: string;
  BILL_NO?: string;
  BILL_NM?: string;
  RGS_CONF_RSLT?: string;
  JRCMIT_NM?: string;
  JRCMIT_CMMT_DT?: string;
  JRCMIT_PRSNT_DT?: string;
  JRCMIT_PROC_DT?: string;
  JRCMIT_PROC_RSLT?: string;
  LAW_CMMT_DT?: string;
  LAW_PRSNT_DT?: string;
  LAW_PROC_DT?: string;
  LAW_PROC_RSLT?: string;
  RGS_PRSNT_DT?: string;
  RGS_RSLN_DT?: string;
  RGS_CONF_NM?: string;
  GVRN_TRSF_DT?: string;
  PROM_LAW_NM?: string;
  PROM_DT?: string;
  PROM_NO?: string;
}

function ensureAssemblyKey(config: BundleConfig): string {
  if (!config.assembly.apiKey) {
    throw new ProviderError("ASSEMBLY_API_KEY is required for assembly tools");
  }
  return config.assembly.apiKey;
}

function buildOpenApiUrl(endpoint: string, params: Record<string, string>, config: BundleConfig): string {
  const url = new URL(`${config.assembly.baseUrl}/${endpoint}`);
  const apiKey = ensureAssemblyKey(config);
  url.searchParams.set("KEY", apiKey);
  url.searchParams.set("Type", "json");
  url.searchParams.set("pIndex", params.pIndex ?? "1");
  url.searchParams.set("pSize", params.pSize ?? "10");

  Object.entries(params).forEach(([key, value]) => {
    if (value && !["KEY", "Type", "pIndex", "pSize"].includes(key)) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

function sanitizeOpenApiUrl(input: string): string {
  const url = new URL(input);
  url.searchParams.delete("KEY");
  return url.toString();
}

async function fetchOpenApiRows<T>(endpoint: string, params: Record<string, string>, config: BundleConfig): Promise<{ rows: T[]; originalUrl: string }> {
  const requestUrl = buildOpenApiUrl(endpoint, params, config);
  const originalUrl = sanitizeOpenApiUrl(requestUrl);
  const response = await fetch(requestUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  if (!response.ok) {
    throw new ProviderError(`assembly endpoint ${endpoint} failed with status ${response.status}`, { originalUrl });
  }

  const payload = (await response.json()) as Record<string, OpenApiRowContainer<T>[]> & {
    RESULT?: { CODE?: string; MESSAGE?: string };
  };

  if (payload.RESULT?.CODE && payload.RESULT.CODE !== "INFO-000") {
    throw new ProviderError(payload.RESULT.MESSAGE ?? `assembly endpoint ${endpoint} returned an error`, { originalUrl, payload });
  }

  const container = payload[endpoint];
  if (!Array.isArray(container)) {
    return { rows: [], originalUrl };
  }

  const rowBlock = container.find((item) => Array.isArray(item.row));
  return {
    rows: rowBlock?.row ?? [],
    originalUrl
  };
}

function buildBillUrl(billId: string | null, fallbackUrl: string | undefined): string {
  if (fallbackUrl) return fallbackUrl;
  if (!billId) return "https://likms.assembly.go.kr/bill/main.do";
  return `https://likms.assembly.go.kr/bill/billDetail.do?billId=${billId}`;
}

function normalizeBillRow(row: AllBillRow): SearchBillItem {
  return {
    bill_no: row.BILL_NO ?? "",
    bill_id: row.BILL_ID ?? null,
    bill_name: row.BILL_NM ?? "",
    proposer: row.PPSR_NM ?? row.PPSR ?? null,
    committee: row.JRCMIT_NM ?? null,
    status: row.PASSGUBN ?? row.PROC_RESULT ?? row.RGS_CONF_RSLT ?? null,
    proposed_date: normalizeDate(row.PPSL_DT ?? null),
    age: row.ERACO ?? null,
    original_url: buildBillUrl(row.BILL_ID ?? null, row.LINK_URL)
  };
}

function filterBillItems(items: SearchBillItem[], input: SearchBillInput): SearchBillItem[] {
  return items.filter((item) => {
    if (input.bill_name && !normalizeQueryText(item.bill_name).includes(normalizeQueryText(input.bill_name))) return false;
    if (input.committee && !normalizeQueryText(item.committee ?? "").includes(normalizeQueryText(input.committee))) return false;
    if (input.proposer && !normalizeQueryText(item.proposer ?? "").includes(normalizeQueryText(input.proposer))) return false;
    return true;
  });
}

function normalizeNote(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = normalizeQueryText(value);
  return normalized || null;
}

function buildTimeline(detail: BillDetailRow): BillTimelineStep[] {
  return [
    {
      stage: "소관위 회부",
      date: normalizeDate(detail.JRCMIT_CMMT_DT ?? null),
      result: null,
      note: normalizeNote(detail.JRCMIT_NM ?? null)
    },
    {
      stage: "소관위 상정",
      date: normalizeDate(detail.JRCMIT_PRSNT_DT ?? null),
      result: null,
      note: normalizeNote(detail.JRCMIT_NM ?? null)
    },
    {
      stage: "소관위 처리",
      date: normalizeDate(detail.JRCMIT_PROC_DT ?? null),
      result: normalizeNote(detail.JRCMIT_PROC_RSLT ?? null),
      note: normalizeNote(detail.JRCMIT_NM ?? null)
    },
    {
      stage: "법사위 회부/상정",
      date: normalizeDate(detail.LAW_CMMT_DT ?? detail.LAW_PRSNT_DT ?? null),
      result: null,
      note: "법제사법위원회"
    },
    {
      stage: "법사위 처리",
      date: normalizeDate(detail.LAW_PROC_DT ?? null),
      result: normalizeNote(detail.LAW_PROC_RSLT ?? null),
      note: "법제사법위원회"
    },
    {
      stage: "본회의 상정",
      date: normalizeDate(detail.RGS_PRSNT_DT ?? null),
      result: null,
      note: normalizeNote(detail.RGS_CONF_NM ?? null)
    },
    {
      stage: "본회의 의결",
      date: normalizeDate(detail.RGS_RSLN_DT ?? null),
      result: normalizeNote(detail.RGS_CONF_RSLT ?? null),
      note: normalizeNote(detail.RGS_CONF_NM ?? null)
    },
    {
      stage: "정부 이송",
      date: normalizeDate(detail.GVRN_TRSF_DT ?? null),
      result: null,
      note: null
    },
    {
      stage: "공포",
      date: normalizeDate(detail.PROM_DT ?? null),
      result: normalizeNote(detail.PROM_LAW_NM ?? null),
      note: detail.PROM_NO ? `공포번호 ${detail.PROM_NO}` : null
    }
  ].filter((step) => step.date || step.result);
}

function normalizeAgeForQuery(age: string | undefined, config: BundleConfig): string {
  return normalizeAgeLabel(age) ?? config.assembly.defaultAge;
}

export async function searchBillProvider(input: SearchBillInput, config: BundleConfig): Promise<{ items: SearchBillItem[]; originalUrl: string }> {
  const limit = clampLimit(input.limit, 10, 1, 20);

  if (input.bill_no?.trim()) {
    const { rows, originalUrl } = await fetchOpenApiRows<AllBillRow>(
      "ALLBILL",
      {
        pIndex: "1",
        pSize: String(limit),
        BILL_NO: normalizeQueryText(input.bill_no)
      },
      config
    );

    return {
      items: filterBillItems(rows.map(normalizeBillRow), input),
      originalUrl
    };
  }

  const { rows, originalUrl } = await fetchOpenApiRows<AllBillRow>(
    "ALLBILLV2",
    {
      pIndex: "1",
      pSize: String(limit),
      ERACO: normalizeAgeForQuery(input.age, config),
      BILL_NM: input.bill_name ? normalizeQueryText(input.bill_name) : "",
      PPSR_NM: input.proposer ? normalizeQueryText(input.proposer) : "",
      JRCMIT_NM: input.committee ? normalizeQueryText(input.committee) : ""
    },
    config
  );

  return {
    items: filterBillItems(rows.map(normalizeBillRow), input),
    originalUrl
  };
}

export async function getBillDetailProvider(
  input: GetBillDetailInput,
  config: BundleConfig
): Promise<{ billNo: string; billId: string; billName: string; summaryText: string | null; timeline: BillTimelineStep[]; plenaryResult: string | null; originalUrl: string }> {
  let billId = input.bill_id?.trim() || null;
  let billNo = input.bill_no?.trim() || null;
  let resolvedOriginalUrl: string | null = null;

  if (!billId && !billNo) {
    throw new ProviderError("get_bill_detail requires bill_id or bill_no");
  }

  if (!billId && billNo) {
    const searchResult = await searchBillProvider({ bill_no: billNo, limit: 1 }, config);
    const first = searchResult.items[0];
    if (!first?.bill_id) {
      throw new ProviderError("could not resolve BILL_ID from BILL_NO", { billNo });
    }
    billId = first.bill_id;
    billNo = first.bill_no;
    resolvedOriginalUrl = first.original_url;
  }

  if (!billId) {
    throw new ProviderError("could not resolve bill_id", { input });
  }

  const detailResult = await fetchOpenApiRows<BillDetailRow>(
    "BILLINFODETAIL",
    {
      pIndex: "1",
      pSize: "1",
      BILL_ID: billId
    },
    config
  );

  const detail = detailResult.rows[0];
  if (!detail?.BILL_ID || !detail.BILL_NO || !detail.BILL_NM) {
    throw new ProviderError("BILLINFODETAIL returned no bill detail rows", { billId });
  }

  const summaryResult = await fetchOpenApiRows<BillSummaryRow>(
    "BPMBILLSUMMARY",
    {
      pIndex: "1",
      pSize: "1",
      BILL_NO: detail.BILL_NO
    },
    config
  );

  const summaryRow = summaryResult.rows[0];
  return {
    billNo: detail.BILL_NO,
    billId: detail.BILL_ID,
    billName: detail.BILL_NM,
    summaryText: summaryRow?.SUMMARY ? normalizeQueryText(summaryRow.SUMMARY.replace(/\n+/g, " ")) : null,
    timeline: buildTimeline(detail),
    plenaryResult: detail.RGS_CONF_RSLT ?? null,
    originalUrl: resolvedOriginalUrl ?? buildBillUrl(detail.BILL_ID, undefined)
  };
}
