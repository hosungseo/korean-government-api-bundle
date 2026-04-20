import { ProviderError } from "../../core/errors.js";
import { clampLimit, decodeXmlEntities, normalizeDate, normalizeQueryText, stripXmlTags } from "../../core/normalize.js";
import type {
  BundleConfig,
  GetLawmakingItemDetailInput,
  LawmakingAttachment,
  LawmakingCategory,
  LawmakingDetailField,
  LawmakingListItem,
  SearchLawmakingItemsInput
} from "../../core/types.js";

const categoryEndpointMap: Record<LawmakingCategory, string> = {
  "gov-status": "govLmSts",
  plan: "lmPln",
  notice: "ogLmPp",
  "notice-mod": "ogLmPpMod",
  "admin-notice": "ptcpAdmPp",
  interpretation: "lsItptEmp",
  example: "loLsExample"
};

const listTagMap: Record<LawmakingCategory, string> = {
  "gov-status": "ApiList01Vo",
  plan: "ApiList02Vo",
  notice: "ApiList04Vo",
  "notice-mod": "ApiList13Vo",
  "admin-notice": "ApiList05Vo",
  interpretation: "ApiList09Vo",
  example: "ApiList11Vo"
};

const detailTagMap: Record<LawmakingCategory, string> = {
  "gov-status": "ApiDetile01Vo",
  plan: "ApiDetile02Vo",
  notice: "ApiDetile04Vo",
  "notice-mod": "ApiDetile13Vo",
  "admin-notice": "ApiDetile05Vo",
  interpretation: "ApiDetile9Vo",
  example: "ApiDetile11Vo"
};

interface LawmakingDetailResult {
  category: LawmakingCategory;
  itemId: string;
  mappingId: string | null;
  announceType: string | null;
  title: string;
  agencyName: string | null;
  departmentName: string | null;
  lawKind: string | null;
  revisionType: string | null;
  status: string | null;
  date: string | null;
  summaryText: string | null;
  bodyText: string | null;
  fields: LawmakingDetailField[];
  attachments: LawmakingAttachment[];
}

function ensureLawmakingOc(config: BundleConfig): string {
  if (!config.lawmaking.oc.trim()) {
    throw new ProviderError("LAWMAKING_OC is required for lawmaking tools");
  }
  return config.lawmaking.oc.trim();
}

function extractTag(block: string, tagName: string): string | null {
  const pattern = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`);
  const match = block.match(pattern);
  return match ? decodeXmlEntities(match[1]) : null;
}

function extractBlocks(xml: string, tagName: string): string[] {
  return [...xml.matchAll(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)</${tagName}>`, "g"))].map((match) => match[1]);
}

function stripMarkup(input: string | null | undefined): string | null {
  if (!input) return null;
  const normalized = stripXmlTags(input.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<\/div>/gi, "\n"));
  return normalized || null;
}

function normalizeDateParam(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return normalizeQueryText(value);
  const year = digits.slice(0, 4);
  const month = String(Number(digits.slice(4, 6)));
  const day = String(Number(digits.slice(6, 8)));
  return `${year}. ${month}. ${day}.`;
}

function buildListUrl(input: SearchLawmakingItemsInput, config: BundleConfig): string {
  const oc = ensureLawmakingOc(config);
  const endpoint = categoryEndpointMap[input.category];
  const url = new URL(`${config.lawmaking.baseUrl}/${endpoint}.xml`);
  url.searchParams.set("OC", oc);

  if (input.category === "gov-status") {
    if (input.agency_code) url.searchParams.set("cptOfiOrgCd", input.agency_code);
    if (input.law_kind_code) url.searchParams.set("lsKndCd", input.law_kind_code);
    if (input.status_code) url.searchParams.set("lbPrcStsCdGrp", input.status_code);
    if (input.query) url.searchParams.set("lsNmKo", normalizeQueryText(input.query));
    const startDate = normalizeDateParam(input.start_date);
    const endDate = normalizeDateParam(input.end_date);
    if (startDate) url.searchParams.set("stDtFmt", startDate);
    if (endDate) url.searchParams.set("edDtFmt", endDate);
  }

  if (input.category === "plan") {
    if (input.agency_code) url.searchParams.set("cptOfiOrgCd", input.agency_code);
    if (input.year) url.searchParams.set("lmPlnYy", input.year);
    if (input.query) {
      url.searchParams.set("search", "schLsNm");
      url.searchParams.set("srchTxt", normalizeQueryText(input.query));
    }
  }

  if (input.category === "notice") {
    if (input.agency_code) url.searchParams.set("cptOfiOrgCd", input.agency_code);
    if (input.law_kind_code) url.searchParams.set("lsClsCd", input.law_kind_code);
    if (input.status_code) url.searchParams.set("diff", input.status_code);
    if (input.query) url.searchParams.set("lsNm", normalizeQueryText(input.query));
  }

  if (input.category === "notice-mod") {
    if (input.agency_code) url.searchParams.set("cptOfiOrgCd", input.agency_code);
    if (input.law_kind_code) url.searchParams.set("lsClsCd", input.law_kind_code);
    if (input.status_code) url.searchParams.set("diff", input.status_code);
    if (input.query) url.searchParams.set("lsNm", normalizeQueryText(input.query));
  }

  if (input.category === "admin-notice") {
    if (input.agency_name) url.searchParams.set("asndOfiNm", normalizeQueryText(input.agency_name));
    if (input.law_kind_code) url.searchParams.set("lsClsCd", input.law_kind_code);
    if (input.status_code) url.searchParams.set("closing", input.status_code);
    if (input.query) url.searchParams.set("admRulNm", normalizeQueryText(input.query));
  }

  if (input.category === "interpretation") {
    if (input.agency_code) url.searchParams.set("lsCptOrg", input.agency_code);
    const startDate = normalizeDateParam(input.start_date);
    const endDate = normalizeDateParam(input.end_date);
    if (startDate) url.searchParams.set("prdFrDay", startDate);
    if (endDate) url.searchParams.set("prdToDay", endDate);
    if (input.query) url.searchParams.set("schKeyword", normalizeQueryText(input.query));
  }

  if (input.category === "example") {
    const startDate = normalizeDateParam(input.start_date);
    const endDate = normalizeDateParam(input.end_date);
    if (startDate) url.searchParams.set("scFmDt", startDate);
    if (endDate) url.searchParams.set("scToDt", endDate);
    if (input.query) {
      url.searchParams.set("scTextType", input.query_field ?? "caseNm");
      url.searchParams.set("scText", normalizeQueryText(input.query));
    }
  }

  return url.toString();
}

function buildDetailUrl(input: GetLawmakingItemDetailInput, config: BundleConfig): string {
  const oc = ensureLawmakingOc(config);
  const endpoint = categoryEndpointMap[input.category];

  let path = `${config.lawmaking.baseUrl}/${endpoint}`;
  if (["notice", "notice-mod", "admin-notice"].includes(input.category)) {
    path += `/${input.item_id}/${input.mapping_id}/${input.announce_type}`;
  } else {
    path += `/${input.item_id}`;
  }

  const url = new URL(`${path}.xml`);
  url.searchParams.set("OC", oc);
  return url.toString();
}

function parseNoticeStatus(title: string | null): string | null {
  if (!title) return null;
  const match = title.match(/^\[([^\]]+)\]/);
  return match ? match[1] : null;
}

function cleanNoticeTitle(title: string | null): string {
  if (!title) return "";
  return title.replace(/^\[[^\]]+\]/, "").trim();
}

function makeField(label: string, value: string | null | undefined): LawmakingDetailField | null {
  if (!value) return null;
  const normalized = normalizeQueryText(value);
  if (!normalized) return null;
  return { label, value: normalized };
}

function uniqueFields(fields: Array<LawmakingDetailField | null>): LawmakingDetailField[] {
  const seen = new Set<string>();
  return fields.filter((field): field is LawmakingDetailField => {
    if (!field) return false;
    const key = `${field.label}:${field.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseAttachmentsFromHtml(html: string | null | undefined): LawmakingAttachment[] {
  if (!html) return [];
  return [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => ({
      url: decodeXmlEntities(match[1]),
      name: stripXmlTags(match[2]) || decodeXmlEntities(match[1])
    }))
    .filter((item) => item.url);
}

function mapGovStatusListItem(block: string, config: BundleConfig): LawmakingListItem {
  const itemId = extractTag(block, "lbicId") ?? "";
  return {
    category: "gov-status",
    item_id: itemId,
    title: extractTag(block, "lsNmKo") ?? "",
    agency_name: extractTag(block, "cptOfiOrgNm"),
    department_name: null,
    law_kind: extractTag(block, "lsKndNm"),
    revision_type: extractTag(block, "rrFrNm"),
    status: extractTag(block, "lbPrcStsNm"),
    date: normalizeDate(extractTag(block, "lbPrcStsDt")),
    notice_no: null,
    mapping_id: null,
    announce_type: null,
    attachment_name: null,
    attachment_url: null,
    original_url: buildDetailUrl({ category: "gov-status", item_id: itemId }, config)
  };
}

function mapPlanListItem(block: string, config: BundleConfig): LawmakingListItem {
  const itemId = extractTag(block, "lmPlnSeq") ?? "";
  return {
    category: "plan",
    item_id: itemId,
    title: extractTag(block, "lsNm") ?? "",
    agency_name: extractTag(block, "cptOfiOrgNm"),
    department_name: extractTag(block, "cptDptOrgNm"),
    law_kind: null,
    revision_type: null,
    status: extractTag(block, "lbPrcStsNm"),
    date: normalizeDate(extractTag(block, "mgtDt")),
    notice_no: null,
    mapping_id: null,
    announce_type: null,
    attachment_name: null,
    attachment_url: null,
    original_url: buildDetailUrl({ category: "plan", item_id: itemId }, config)
  };
}

function mapNoticeListItem(block: string, config: BundleConfig): LawmakingListItem {
  const itemId = extractTag(block, "ogLmPpSeq") ?? "";
  const mappingId = extractTag(block, "mappingLbicId");
  const announceType = extractTag(block, "announceType");
  const rawTitle = extractTag(block, "lsNm");
  return {
    category: "notice",
    item_id: itemId,
    title: cleanNoticeTitle(rawTitle),
    agency_name: extractTag(block, "asndOfiNm"),
    department_name: null,
    law_kind: extractTag(block, "lsClsNm"),
    revision_type: null,
    status: parseNoticeStatus(rawTitle),
    date: normalizeDate(extractTag(block, "pntcDt")),
    notice_no: extractTag(block, "pntcNo"),
    mapping_id: mappingId,
    announce_type: announceType,
    attachment_name: extractTag(block, "FileName"),
    attachment_url: extractTag(block, "FileDownLink"),
    original_url: buildDetailUrl({ category: "notice", item_id: itemId, mapping_id: mappingId ?? "0", announce_type: announceType ?? "TYPE5" }, config)
  };
}

function mapNoticeModListItem(block: string, config: BundleConfig): LawmakingListItem {
  const itemId = extractTag(block, "ogLmPpSeq") ?? "";
  const mappingId = extractTag(block, "mappingLbicId");
  const announceType = extractTag(block, "announceType");
  const rawTitle = extractTag(block, "lsNm");
  return {
    category: "notice-mod",
    item_id: itemId,
    title: cleanNoticeTitle(rawTitle),
    agency_name: extractTag(block, "asndOfiNm"),
    department_name: null,
    law_kind: extractTag(block, "lsClsNm"),
    revision_type: null,
    status: parseNoticeStatus(rawTitle) ?? extractTag(block, "status"),
    date: normalizeDate(extractTag(block, "modDt") ?? extractTag(block, "pntcDt")),
    notice_no: extractTag(block, "pntcNo"),
    mapping_id: mappingId,
    announce_type: announceType,
    attachment_name: extractTag(block, "FileName"),
    attachment_url: extractTag(block, "FileDownLink"),
    original_url: buildDetailUrl({ category: "notice-mod", item_id: itemId, mapping_id: mappingId ?? "0", announce_type: announceType ?? "TYPE5" }, config)
  };
}

function mapAdminNoticeListItem(block: string, config: BundleConfig): LawmakingListItem {
  const itemId = extractTag(block, "ogAdmPpSeq") ?? "";
  const mappingId = extractTag(block, "mappingAdmRulSeq");
  const announceType = extractTag(block, "announceType");
  return {
    category: "admin-notice",
    item_id: itemId,
    title: extractTag(block, "admRulNm") ?? "",
    agency_name: extractTag(block, "asndOfiNm"),
    department_name: null,
    law_kind: extractTag(block, "lsClsNm"),
    revision_type: null,
    status: null,
    date: normalizeDate(extractTag(block, "pntcDt")),
    notice_no: extractTag(block, "pntcNo"),
    mapping_id: mappingId,
    announce_type: announceType,
    attachment_name: extractTag(block, "FileName"),
    attachment_url: extractTag(block, "FileDownLink"),
    original_url: buildDetailUrl({ category: "admin-notice", item_id: itemId, mapping_id: mappingId ?? "0", announce_type: announceType ?? "TYPE6" }, config)
  };
}

function mapInterpretationListItem(block: string, config: BundleConfig): LawmakingListItem {
  const itemId = extractTag(block, "itmSeq") ?? "";
  return {
    category: "interpretation",
    item_id: itemId,
    title: extractTag(block, "itmNm") ?? "",
    agency_name: extractTag(block, "lsCptOrgNm"),
    department_name: null,
    law_kind: null,
    revision_type: null,
    status: extractTag(block, "tgLsNm"),
    date: null,
    notice_no: extractTag(block, "itmNo"),
    mapping_id: null,
    announce_type: null,
    attachment_name: null,
    attachment_url: null,
    original_url: buildDetailUrl({ category: "interpretation", item_id: itemId }, config)
  };
}

function mapExampleListItem(block: string, config: BundleConfig): LawmakingListItem {
  const itemId = extractTag(block, "caseSeq") ?? "";
  return {
    category: "example",
    item_id: itemId,
    title: extractTag(block, "caseNm") ?? "",
    agency_name: extractTag(block, "reqOrgNm"),
    department_name: extractTag(block, "reqOrgAsndofiNm"),
    law_kind: null,
    revision_type: null,
    status: null,
    date: normalizeDate(extractTag(block, "cdtDt")),
    notice_no: extractTag(block, "caseNo"),
    mapping_id: null,
    announce_type: null,
    attachment_name: null,
    attachment_url: null,
    original_url: buildDetailUrl({ category: "example", item_id: itemId }, config)
  };
}

function filterItems(items: LawmakingListItem[], input: SearchLawmakingItemsInput): LawmakingListItem[] {
  return items
    .filter((item) => !input.query || normalizeQueryText(item.title).includes(normalizeQueryText(input.query)))
    .slice(0, clampLimit(input.limit, 10, 1, 20));
}

async function fetchXml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  if (!response.ok) {
    throw new ProviderError(`lawmaking request failed with status ${response.status}`, { url });
  }

  const xml = await response.text();
  const retMsg = extractTag(xml, "retMsg");
  if (retMsg && retMsg !== "200") {
    throw new ProviderError(`lawmaking API returned retMsg=${retMsg}`, { url, xml: xml.slice(0, 2000) });
  }

  return xml;
}

function parseGovStatusDetail(block: string): LawmakingDetailResult {
  const dsSteps = extractBlocks(block, "dsvo")
    .map((step) => `${extractTag(step, "lbPrcStsCdGrpNm") ?? "절차"}: ${extractTag(step, "lbPrcStst") ?? ""}`.trim())
    .filter((value) => value && !value.endsWith(":"));
  const lawSteps = extractBlocks(block, "RecbFlVo")
    .map((step) => `${extractTag(step, "rcvbFlClsCdNm") ?? "법제처"}: ${extractTag(step, "lbSts") ?? ""}`.trim())
    .filter((value) => value && !value.endsWith(":"));
  const summaryParts = [stripMarkup(extractTag(block, "rrRsn")), stripMarkup(extractTag(block, "essCts"))].filter(Boolean) as string[];

  return {
    category: "gov-status",
    itemId: extractTag(block, "lbicId") ?? "",
    mappingId: null,
    announceType: null,
    title: extractTag(block, "lsNmKo") ?? "",
    agencyName: extractTag(block, "asndOfiCdNm"),
    departmentName: extractTag(block, "asndDptCdNm"),
    lawKind: extractTag(block, "lsKndCdNm"),
    revisionType: extractTag(block, "rrFrCdNm"),
    status: lawSteps[lawSteps.length - 1] ?? dsSteps[dsSteps.length - 1] ?? null,
    date: null,
    summaryText: summaryParts.length > 0 ? summaryParts.join("\n\n") : null,
    bodyText: [...dsSteps, ...lawSteps].join("\n"),
    fields: uniqueFields([
      makeField("제개정구분", extractTag(block, "rrFrCdNm")),
      makeField("소관부처", extractTag(block, "asndOfiCdNm")),
      makeField("소관부서", extractTag(block, "asndDptCdNm")),
      makeField("입안자", extractTag(block, "MgrUsrNm")),
      makeField("전화", extractTag(block, "MgrUsrTelNo1")),
      makeField("이메일", extractTag(block, "MgrUsrEmail")),
      makeField("정부입법계획 반영", extractTag(block, "lmPlnIncludeYn")),
      ...dsSteps.map((value, index) => makeField(`추진현황 ${index + 1}`, value)),
      ...lawSteps.map((value, index) => makeField(`법제처 단계 ${index + 1}`, value))
    ]),
    attachments: []
  };
}

function parsePlanDetail(block: string): LawmakingDetailResult {
  const currentLaw = extractBlocks(block, "string").map((value) => stripMarkup(value)).filter(Boolean) as string[];
  return {
    category: "plan",
    itemId: extractTag(block, "lmPlnSeq") ?? "",
    mappingId: null,
    announceType: null,
    title: extractTag(block, "lsNm") ?? "",
    agencyName: extractTag(block, "cptOfiOrgNm"),
    departmentName: extractTag(block, "cptNm"),
    lawKind: extractTag(block, "lsKndNm"),
    revisionType: extractTag(block, "rrFrNm"),
    status: extractTag(block, "lbPrcStsNm2") ?? extractTag(block, "pmtClsNm"),
    date: normalizeDate(extractTag(block, "mgtDt")),
    summaryText: stripMarkup(extractTag(block, "srcRsn")),
    bodyText: stripMarkup(extractTag(block, "essCts")),
    fields: uniqueFields([
      makeField("입법계획년도", extractTag(block, "lmPlnYear")),
      makeField("법령종류", extractTag(block, "lsKndNm")),
      makeField("제개정구분", extractTag(block, "rrFrNm")),
      makeField("소관부처", extractTag(block, "cptOfiOrgNm")),
      makeField("담당부서", extractTag(block, "cptNm")),
      makeField("추진유형", extractTag(block, "pmtClsNm")),
      makeField("입법계획구분", extractTag(block, "lmPlnClsNm")),
      makeField("입법사유 구분", extractTag(block, "srcNm")),
      ...currentLaw.map((value, index) => makeField(`현행법령 ${index + 1}`, value))
    ]),
    attachments: []
  };
}

function parseNoticeDetail(block: string): LawmakingDetailResult {
  const rawBody = extractTag(block, "lmPpCts");
  const bodyText = stripMarkup(rawBody);
  return {
    category: "notice",
    itemId: extractTag(block, "ogLmPpSeq") ?? "",
    mappingId: null,
    announceType: null,
    title: extractTag(block, "lsNm") ?? "",
    agencyName: extractTag(block, "asndOfiNm"),
    departmentName: extractTag(block, "asndDptNm"),
    lawKind: extractTag(block, "lsClsNm"),
    revisionType: extractTag(block, "lmTpNm"),
    status: null,
    date: normalizeDate(extractTag(block, "stYd")),
    summaryText: bodyText ? bodyText.slice(0, 500) : null,
    bodyText,
    fields: uniqueFields([
      makeField("공고기관", extractTag(block, "asndOfiNm")),
      makeField("담당부서", extractTag(block, "asndDptNm")),
      makeField("입법형태", extractTag(block, "lmTpNm")),
      makeField("법령종류", extractTag(block, "lsClsNm")),
      makeField("예고시작", extractTag(block, "stYd")),
      makeField("예고종료", extractTag(block, "edYd")),
      makeField("전화", extractTag(block, "telNo")),
      makeField("팩스", extractTag(block, "faxNo")),
      makeField("이메일", extractTag(block, "email")),
      makeField("조회수", extractTag(block, "readCnt"))
    ]),
    attachments: parseAttachmentsFromHtml(rawBody)
  };
}

function parseNoticeModDetail(block: string): LawmakingDetailResult {
  const parsed = parseNoticeDetail(block);
  return {
    ...parsed,
    category: "notice-mod",
    date: normalizeDate(extractTag(block, "modDt") ?? extractTag(block, "stYd"))
  };
}

function parseAdminNoticeDetail(block: string): LawmakingDetailResult {
  const rawBody = extractTag(block, "admPpCts");
  const bodyText = stripMarkup(rawBody);
  return {
    category: "admin-notice",
    itemId: extractTag(block, "ogAdmPpSeq") ?? "",
    mappingId: null,
    announceType: null,
    title: extractTag(block, "admRulNm") ?? "",
    agencyName: extractTag(block, "asndOfiNm"),
    departmentName: null,
    lawKind: extractTag(block, "lsClsNm"),
    revisionType: extractTag(block, "lmTpNm"),
    status: null,
    date: normalizeDate(extractTag(block, "stYd")),
    summaryText: bodyText ? bodyText.slice(0, 500) : null,
    bodyText,
    fields: uniqueFields([
      makeField("공고기관", extractTag(block, "asndOfiNm")),
      makeField("행정규칙형태", extractTag(block, "lmTpNm")),
      makeField("행정규칙종류", extractTag(block, "lsClsNm")),
      makeField("예고시작", extractTag(block, "stYd")),
      makeField("예고종료", extractTag(block, "edYd")),
      makeField("전화", extractTag(block, "telNo")),
      makeField("팩스", extractTag(block, "faxNo")),
      makeField("이메일", extractTag(block, "email")),
      makeField("조회수", extractTag(block, "readCnt"))
    ]),
    attachments: parseAttachmentsFromHtml(rawBody)
  };
}

function parseInterpretationDetail(block: string): LawmakingDetailResult {
  const sections = extractBlocks(block, "LsItptEmpDetailVo")
    .map((section) => ({
      title: extractTag(section, "atcCtsNm") ?? "내용",
      content: stripMarkup(extractTag(section, "cts"))
    }))
    .filter((section) => section.content);
  const answer = sections.find((section) => section.title === "회답")?.content ?? null;
  return {
    category: "interpretation",
    itemId: "",
    mappingId: null,
    announceType: null,
    title: extractTag(block, "itmNm") ?? "",
    agencyName: extractTag(block, "reqrOrgNm"),
    departmentName: null,
    lawKind: null,
    revisionType: null,
    status: extractTag(block, "tgLsNm"),
    date: normalizeDate(extractTag(block, "rpldocSndDay")),
    summaryText: answer,
    bodyText: sections.map((section) => `${section.title}\n${section.content}`).join("\n\n"),
    fields: uniqueFields([
      makeField("해석례 번호", extractTag(block, "itmNo")),
      makeField("요청기관", extractTag(block, "reqrOrgNm")),
      makeField("대상법령", extractTag(block, "tgLsNm")),
      makeField("관련조문", extractTag(block, "joCts")),
      makeField("회답일", extractTag(block, "rpldocSndDay"))
    ]),
    attachments: []
  };
}

function parseExampleDetail(block: string): LawmakingDetailResult {
  const sections = extractBlocks(block, "LoLsOrdcasectsVo")
    .map((section) => ({
      title: extractTag(section, "ctsCls") ?? "내용",
      content: stripMarkup(extractTag(section, "cts"))
    }))
    .filter((section) => section.content);
  const answer = sections.find((section) => section.title === "의견")?.content ?? null;
  return {
    category: "example",
    itemId: "",
    mappingId: null,
    announceType: null,
    title: extractTag(block, "caseNm") ?? "",
    agencyName: extractTag(block, "reqOrgNm"),
    departmentName: extractTag(block, "reqOrgAsndofiNm"),
    lawKind: null,
    revisionType: null,
    status: null,
    date: normalizeDate(extractTag(block, "cdtDt")),
    summaryText: answer,
    bodyText: sections.map((section) => `${section.title}\n${section.content}`).join("\n\n"),
    fields: uniqueFields([
      makeField("사례번호", extractTag(block, "caseNo")),
      makeField("요청기관", extractTag(block, "reqOrgNm")),
      makeField("세부기관", extractTag(block, "reqOrgAsndofiNm")),
      makeField("작성일", extractTag(block, "cdtDt"))
    ]),
    attachments: []
  };
}

export async function searchLawmakingItemsProvider(input: SearchLawmakingItemsInput, config: BundleConfig): Promise<{ items: LawmakingListItem[]; originalUrl: string }> {
  const requestUrl = buildListUrl(input, config);
  const xml = await fetchXml(requestUrl);
  const tagName = listTagMap[input.category];
  const blocks = extractBlocks(xml, tagName);

  const items = blocks.map((block) => {
    switch (input.category) {
      case "gov-status":
        return mapGovStatusListItem(block, config);
      case "plan":
        return mapPlanListItem(block, config);
      case "notice":
        return mapNoticeListItem(block, config);
      case "notice-mod":
        return mapNoticeModListItem(block, config);
      case "admin-notice":
        return mapAdminNoticeListItem(block, config);
      case "interpretation":
        return mapInterpretationListItem(block, config);
      case "example":
        return mapExampleListItem(block, config);
    }
  });

  return {
    items: filterItems(items, input),
    originalUrl: requestUrl
  };
}

export async function getLawmakingItemDetailProvider(input: GetLawmakingItemDetailInput, config: BundleConfig): Promise<LawmakingDetailResult & { originalUrl: string }> {
  const requestUrl = buildDetailUrl(input, config);
  const xml = await fetchXml(requestUrl);
  const tagName = detailTagMap[input.category];
  const block = extractBlocks(xml, tagName)[0];

  if (!block) {
    throw new ProviderError("lawmaking detail response returned no matching detail block", { category: input.category, requestUrl });
  }

  const parsed = (() => {
    switch (input.category) {
      case "gov-status":
        return parseGovStatusDetail(block);
      case "plan":
        return parsePlanDetail(block);
      case "notice":
        return parseNoticeDetail(block);
      case "notice-mod":
        return parseNoticeModDetail(block);
      case "admin-notice":
        return parseAdminNoticeDetail(block);
      case "interpretation":
        return parseInterpretationDetail(block);
      case "example":
        return parseExampleDetail(block);
    }
  })();

  return {
    ...parsed,
    itemId: input.item_id,
    mappingId: input.mapping_id ?? parsed.mappingId,
    announceType: input.announce_type ?? parsed.announceType,
    originalUrl: requestUrl
  };
}
