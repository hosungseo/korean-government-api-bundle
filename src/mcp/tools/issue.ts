import { nowIso } from "../../core/citations.js";
import { searchBillTool } from "./assembly.js";
import { InputError } from "../../core/errors.js";
import { searchPublicDatasetTool } from "./dataset.js";
import { searchGazetteItemsTool } from "./gazette.js";
import { searchLawTool } from "./law.js";
import { searchLawmakingItemsTool } from "./lawmaking.js";
import { searchStatSeriesTool } from "./stats.js";

type IssueInput = {
  topic: string;
  law_query?: string;
  gazette_query?: string;
  stat_query?: string;
  dataset_query?: string;
  bill_query?: string;
  lawmaking_query?: string;
  lawmaking_category?: "gov-status" | "plan" | "notice" | "notice-mod" | "admin-notice" | "interpretation" | "example";
  policy_query?: string;
  limit?: number;
};

type EvidenceRow = {
  role: string;
  source: string;
  title: string;
  strength: "high" | "medium" | "low";
  use: string;
  caveat: string;
  original_url?: string;
};

export const issueTools = [
  {
    name: "compose_issue_packet",
    description: "정책 이슈별 법령·관보·통계·공공데이터 후보를 하나의 근거 packet으로 묶습니다.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "이슈 주제" },
        law_query: { type: "string", description: "법령 검색어. 기본값은 topic" },
        gazette_query: { type: "string", description: "관보 검색어. 기본값은 topic" },
        stat_query: { type: "string", description: "통계 검색어. 기본값은 topic" },
        dataset_query: { type: "string", description: "공공데이터 검색어. 기본값은 topic" },
        bill_query: { type: "string", description: "국회 의안 검색어. 기본값은 topic" },
        lawmaking_query: { type: "string", description: "국민참여입법센터 검색어. 기본값은 topic" },
        lawmaking_category: { type: "string", description: "gov-status | plan | notice | notice-mod | admin-notice | interpretation | example. 기본값 notice" },
        policy_query: { type: "string", description: "정책브리핑 검색어(현재는 날짜 범위 API 후보). 기본값은 topic" },
        limit: { type: "number", description: "source별 최대 후보 수" }
      },
      required: ["topic"]
    }
  },
  {
    name: "render_issue_onepager",
    description: "compose_issue_packet 결과를 바탕으로 1쪽 보고서형 요약을 생성합니다.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "이슈 주제" },
        law_query: { type: "string", description: "법령 검색어. 기본값은 topic" },
        gazette_query: { type: "string", description: "관보 검색어. 기본값은 topic" },
        stat_query: { type: "string", description: "통계 검색어. 기본값은 topic" },
        dataset_query: { type: "string", description: "공공데이터 검색어. 기본값은 topic" },
        bill_query: { type: "string", description: "국회 의안 검색어. 기본값은 topic" },
        lawmaking_query: { type: "string", description: "국민참여입법센터 검색어. 기본값은 topic" },
        lawmaking_category: { type: "string", description: "gov-status | plan | notice | notice-mod | admin-notice | interpretation | example. 기본값 notice" },
        policy_query: { type: "string", description: "정책브리핑 검색어(현재는 날짜 범위 API 후보). 기본값은 topic" },
        limit: { type: "number", description: "source별 최대 후보 수" }
      },
      required: ["topic"]
    }
  }
  ,
  {
    name: "render_issue_timeline",
    description: "issue packet을 source별 시간순 맥락으로 정리합니다.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "이슈 주제" },
        law_query: { type: "string", description: "법령 검색어. 기본값은 topic" },
        gazette_query: { type: "string", description: "관보 검색어. 기본값은 topic" },
        stat_query: { type: "string", description: "통계 검색어. 기본값은 topic" },
        dataset_query: { type: "string", description: "공공데이터 검색어. 기본값은 topic" },
        bill_query: { type: "string", description: "국회 의안 검색어. 기본값은 topic" },
        lawmaking_query: { type: "string", description: "국민참여입법센터 검색어. 기본값은 topic" },
        lawmaking_category: { type: "string", description: "gov-status | plan | notice | notice-mod | admin-notice | interpretation | example. 기본값 notice" },
        policy_query: { type: "string", description: "정책브리핑 검색어(현재는 날짜 범위 API 후보). 기본값은 topic" },
        limit: { type: "number", description: "source별 최대 후보 수" }
      },
      required: ["topic"]
    }
  },
  {
    name: "check_issue_gaps",
    description: "issue packet의 source 공백과 브리핑 준비도를 판정합니다.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "이슈 주제" },
        law_query: { type: "string", description: "법령 검색어. 기본값은 topic" },
        gazette_query: { type: "string", description: "관보 검색어. 기본값은 topic" },
        stat_query: { type: "string", description: "통계 검색어. 기본값은 topic" },
        dataset_query: { type: "string", description: "공공데이터 검색어. 기본값은 topic" },
        bill_query: { type: "string", description: "국회 의안 검색어. 기본값은 topic" },
        lawmaking_query: { type: "string", description: "국민참여입법센터 검색어. 기본값은 topic" },
        lawmaking_category: { type: "string", description: "gov-status | plan | notice | notice-mod | admin-notice | interpretation | example. 기본값 notice" },
        policy_query: { type: "string", description: "정책브리핑 검색어(현재는 날짜 범위 API 후보). 기본값은 topic" },
        limit: { type: "number", description: "source별 최대 후보 수" }
      },
      required: ["topic"]
    }
  },
  {
    name: "route_issue_next_action",
    description: "issue gap/evidence 상태를 바탕으로 다음 작업 경로를 추천합니다.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "이슈 주제" },
        law_query: { type: "string", description: "법령 검색어. 기본값은 topic" },
        gazette_query: { type: "string", description: "관보 검색어. 기본값은 topic" },
        stat_query: { type: "string", description: "통계 검색어. 기본값은 topic" },
        dataset_query: { type: "string", description: "공공데이터 검색어. 기본값은 topic" },
        bill_query: { type: "string", description: "국회 의안 검색어. 기본값은 topic" },
        lawmaking_query: { type: "string", description: "국민참여입법센터 검색어. 기본값은 topic" },
        lawmaking_category: { type: "string", description: "gov-status | plan | notice | notice-mod | admin-notice | interpretation | example. 기본값 notice" },
        policy_query: { type: "string", description: "정책브리핑 검색어(현재는 날짜 범위 API 후보). 기본값은 topic" },
        limit: { type: "number", description: "source별 최대 후보 수" }
      },
      required: ["topic"]
    }
  }
  ,
  {
    name: "render_issue_scenario_lab",
    description: "issue packet/gap/router를 행정 리스크·질문 playbook·실행 패키지·반대논리로 합성합니다.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "이슈 주제" },
        law_query: { type: "string", description: "법령 검색어. 기본값은 topic" },
        gazette_query: { type: "string", description: "관보 검색어. 기본값은 topic" },
        stat_query: { type: "string", description: "통계 검색어. 기본값은 topic" },
        dataset_query: { type: "string", description: "공공데이터 검색어. 기본값은 topic" },
        bill_query: { type: "string", description: "국회 의안 검색어. 기본값은 topic" },
        lawmaking_query: { type: "string", description: "국민참여입법센터 검색어. 기본값은 topic" },
        lawmaking_category: { type: "string", description: "gov-status | plan | notice | notice-mod | admin-notice | interpretation | example. 기본값 notice" },
        policy_query: { type: "string", description: "정책브리핑 검색어(현재는 날짜 범위 API 후보). 기본값은 topic" },
        limit: { type: "number", description: "source별 최대 후보 수" }
      },
      required: ["topic"]
    }
  }
  ,
  {
    name: "render_issue_brief",
    description: "issue packet을 실무 브리핑 구조(lead/legal/official/stat/data/questions/actions)로 렌더링합니다.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "이슈 주제" },
        law_query: { type: "string", description: "법령 검색어. 기본값은 topic" },
        gazette_query: { type: "string", description: "관보 검색어. 기본값은 topic" },
        stat_query: { type: "string", description: "통계 검색어. 기본값은 topic" },
        dataset_query: { type: "string", description: "공공데이터 검색어. 기본값은 topic" },
        bill_query: { type: "string", description: "국회 의안 검색어. 기본값은 topic" },
        lawmaking_query: { type: "string", description: "국민참여입법센터 검색어. 기본값은 topic" },
        lawmaking_category: { type: "string", description: "gov-status | plan | notice | notice-mod | admin-notice | interpretation | example. 기본값 notice" },
        policy_query: { type: "string", description: "정책브리핑 검색어(현재는 날짜 범위 API 후보). 기본값은 topic" },
        limit: { type: "number", description: "source별 최대 후보 수" }
      },
      required: ["topic"]
    }
  },
  {
    name: "render_issue_evidence_matrix",
    description: "issue packet의 source별 근거 역할·강도·용도·주의점을 독립 evidence matrix로 반환합니다.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "이슈 주제" },
        law_query: { type: "string", description: "법령 검색어. 기본값은 topic" },
        gazette_query: { type: "string", description: "관보 검색어. 기본값은 topic" },
        stat_query: { type: "string", description: "통계 검색어. 기본값은 topic" },
        dataset_query: { type: "string", description: "공공데이터 검색어. 기본값은 topic" },
        bill_query: { type: "string", description: "국회 의안 검색어. 기본값은 topic" },
        lawmaking_query: { type: "string", description: "국민참여입법센터 검색어. 기본값은 topic" },
        lawmaking_category: { type: "string", description: "gov-status | plan | notice | notice-mod | admin-notice | interpretation | example. 기본값 notice" },
        policy_query: { type: "string", description: "정책브리핑 검색어(현재는 날짜 범위 API 후보). 기본값은 topic" },
        limit: { type: "number", description: "source별 최대 후보 수" }
      },
      required: ["topic"]
    }
  }
  ,
  {
    name: "build_issue_dossier",
    description: "issue intelligence 전체 체인(packet/brief/onepager/timeline/matrix/gap/router/scenario)을 한 번에 묶은 dossier를 생성합니다.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "이슈 주제" },
        law_query: { type: "string", description: "법령 검색어. 기본값은 topic" },
        gazette_query: { type: "string", description: "관보 검색어. 기본값은 topic" },
        stat_query: { type: "string", description: "통계 검색어. 기본값은 topic" },
        dataset_query: { type: "string", description: "공공데이터 검색어. 기본값은 topic" },
        bill_query: { type: "string", description: "국회 의안 검색어. 기본값은 topic" },
        lawmaking_query: { type: "string", description: "국민참여입법센터 검색어. 기본값은 topic" },
        lawmaking_category: { type: "string", description: "gov-status | plan | notice | notice-mod | admin-notice | interpretation | example. 기본값 notice" },
        policy_query: { type: "string", description: "정책브리핑 검색어(현재는 날짜 범위 API 후보). 기본값은 topic" },
        limit: { type: "number", description: "source별 최대 후보 수" }
      },
      required: ["topic"]
    }
  }
] as const;

function queryOf(input: IssueInput, key: keyof Pick<IssueInput, "law_query" | "gazette_query" | "stat_query" | "dataset_query" | "bill_query" | "lawmaking_query" | "policy_query">): string {
  return input[key]?.trim() || input.topic.trim();
}


function cleanXmlText(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}
function xmlTag(block: string, name: string): string {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\/${name}>`, "i"));
  return match ? cleanXmlText(match[1]) : "";
}
function xmlBlocks(xml: string, name: string): string[] {
  return [...xml.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\/${name}>`, "gi"))].map((match) => match[1]);
}
async function searchPolicyNews(input: IssueInput, limit: number) {
  const key = process.env.DATA_GO_KR_SERVICE_KEY ?? process.env.POLICY_NEWS_SERVICE_KEY ?? "";
  if (!key) throw new InputError("DATA_GO_KR_SERVICE_KEY or POLICY_NEWS_SERVICE_KEY is required for policy news search");
  const url = new URL("https://apis.data.go.kr/1371000/policyNewsService/policyNewsList");
  url.searchParams.set("serviceKey", key);
  url.searchParams.set("startDate", process.env.POLICY_NEWS_START_DATE ?? "20260515");
  url.searchParams.set("endDate", process.env.POLICY_NEWS_END_DATE ?? "20260517");
  url.searchParams.set("numOfRows", String(limit));
  url.searchParams.set("pageNo", "1");
  const response = await fetch(url, { headers: { "user-agent": "korean-government-api-bundle" } });
  const xml = await response.text();
  const blocks = (xmlBlocks(xml, "NewsItem").length ? xmlBlocks(xml, "NewsItem") : xmlBlocks(xml, "item")).slice(0, limit);
  const items = blocks.map((block) => ({
    title: xmlTag(block, "Title") || xmlTag(block, "title"),
    date: xmlTag(block, "ApproveDate") || xmlTag(block, "regDate"),
    agency: xmlTag(block, "MinisterCode") || xmlTag(block, "deptName"),
    summary: xmlTag(block, "SubTitle1") || xmlTag(block, "DataContents").slice(0, 240),
    original_url: xmlTag(block, "OriginalUrl") || xmlTag(block, "OriginUrl") || xmlTag(block, "link"),
  })).filter((item) => item.title);
  return { items, original_url: url.toString().replace(/(serviceKey=)[^&]+/, "$1***") };
}

async function safe<T>(name: string, fn: () => Promise<T>): Promise<{ ok: true; result: T } | { ok: false; error: string; source: string }> {
  try {
    return { ok: true, result: await fn() };
  } catch (error) {
    return { ok: false, source: name, error: error instanceof Error ? error.message : String(error) };
  }
}

function firstTitle(value: unknown): string | undefined {
  const items = (value as { items?: Array<Record<string, unknown>> }).items ?? [];
  const first = items[0];
  if (!first) return undefined;
  return String(first.law_name ?? first.bill_name ?? first.title ?? first.series_name ?? first.dataset_name ?? first.name ?? "").trim() || undefined;
}

function firstUrl(value: unknown): string | undefined {
  const items = (value as { items?: Array<Record<string, unknown>> }).items ?? [];
  const first = items[0];
  return String(first?.original_url ?? (value as { original_url?: string }).original_url ?? "").trim() || undefined;
}

function itemCount(value: unknown): number {
  return ((value as { items?: unknown[] }).items ?? []).length;
}

function sourceGapEntries(sources: Record<string, { ok: boolean; result?: unknown } | { ok: false; error: string; source: string }>): Array<{ source: string; error: string; next_action: string }> {
  return Object.entries(sources)
    .filter(([, value]) => !value.ok)
    .map(([key, value]) => {
      const error = "error" in value ? String(value.error) : "unknown error";
      const nextAction = error.includes("LAWMAKING_OC")
        ? "LAWMAKING_OC를 env에 설정하거나 --lawmaking-category/query를 조정합니다."
        : error.includes("API_KEY") || error.includes("SERVICE_KEY") || error.includes("OC is required")
          ? "필수 API key/OC 환경변수를 설정합니다."
          : "query/date/category를 조정하거나 provider parser를 점검합니다.";
      return { source: key, error, next_action: nextAction };
    });
}

function buildRowsFromSources(sources: Record<string, { ok: boolean; result?: unknown }>): EvidenceRow[] {
  const rows: EvidenceRow[] = [];
  if (sources.law?.ok) rows.push({ role: "legal basis", source: "law.go.kr", title: firstTitle(sources.law.result) ?? "법령 후보 없음", strength: "high", use: "소관·권한·제도 근거 후보를 확인합니다.", caveat: "정확한 조문 확인 전에는 후보 근거입니다.", original_url: firstUrl(sources.law.result) });
  if (sources.gazette?.ok) rows.push({ role: "official notice", source: "mois-gazette", title: firstTitle(sources.gazette.result) ?? "관보 후보 없음", strength: "medium", use: "고시·공고·처분 등 공식 신호를 확인합니다.", caveat: "검색어가 넓으면 직접 관련성이 약할 수 있습니다.", original_url: firstUrl(sources.gazette.result) });
  if (sources.stats?.ok) rows.push({ role: "background condition", source: "stats", title: firstTitle(sources.stats.result) ?? "통계 후보 없음", strength: "low", use: "배경 지표 후보를 찾습니다.", caveat: "통계 후보는 직접 인과 근거가 아닙니다.", original_url: firstUrl(sources.stats.result) });
  if (sources.dataset?.ok) rows.push({ role: "data asset", source: "data.go.kr", title: firstTitle(sources.dataset.result) ?? "데이터셋 후보 없음", strength: "medium", use: "후속 분석에 쓸 공개 데이터 자산을 찾습니다.", caveat: "실제 API 제공 여부와 갱신주기를 별도 확인해야 합니다.", original_url: firstUrl(sources.dataset.result) });
  if (sources.bill?.ok) rows.push({ role: "legislative agenda", source: "open.assembly.go.kr", title: firstTitle(sources.bill.result) ?? "의안 후보 없음", strength: "medium", use: "국회 의안·상임위 관심 신호를 확인합니다.", caveat: "의안 후보는 정책 집행 근거가 아니라 정치/입법 agenda 신호입니다.", original_url: firstUrl(sources.bill.result) });
  if (sources.lawmaking?.ok) rows.push({ role: "lawmaking pipeline", source: "lawmaking.go.kr", title: firstTitle(sources.lawmaking.result) ?? "입법센터 후보 없음", strength: "medium", use: "입법예고·입법현황 등 제도화 pipeline 신호를 확인합니다.", caveat: "category와 단계에 따라 실제 효력/진행상태가 다릅니다.", original_url: firstUrl(sources.lawmaking.result) });
  if (sources.policy?.ok) rows.push({ role: "policy narrative", source: "korea.kr", title: firstTitle(sources.policy.result) ?? "정책브리핑 후보 없음", strength: "medium", use: "정부 발표 서사와 정책 목적을 확인합니다.", caveat: "정책자료는 법적 근거가 아니라 설명자료입니다.", original_url: firstUrl(sources.policy.result) });
  for (const [key, value] of Object.entries(sources)) {
    if (!value.ok) rows.push({ role: "source gap", source: key, title: `${key} source error`, strength: "low", use: "해당 source를 실행했지만 실패했습니다.", caveat: "error" in value ? String(value.error) : "unknown error" });
  }
  return rows;
}

export async function composeIssuePacketTool(input: IssueInput): Promise<Record<string, unknown> & { evidence_matrix: EvidenceRow[]; counts: Record<string, number>; original_url: string }> {
  if (!input.topic?.trim()) throw new InputError("topic is required for compose_issue_packet");
  const limit = input.limit ?? 3;
  const [law, gazette, stats, dataset, bill, lawmaking, policy] = await Promise.all([
    safe("law", () => searchLawTool({ query: queryOf(input, "law_query"), limit })),
    safe("gazette", () => searchGazetteItemsTool({ query: queryOf(input, "gazette_query"), limit })),
    safe("stats", () => searchStatSeriesTool({ query: queryOf(input, "stat_query"), source: "all", limit })),
    safe("dataset", () => searchPublicDatasetTool({ query: queryOf(input, "dataset_query"), limit })),
    safe("bill", () => searchBillTool({ bill_name: queryOf(input, "bill_query"), limit })),
    safe("lawmaking", () => searchLawmakingItemsTool({ category: input.lawmaking_category ?? "notice", query: queryOf(input, "lawmaking_query"), limit })),
    safe("policy", () => searchPolicyNews(input, limit))
  ]);

  const sources = { law, gazette, stats, dataset, bill, lawmaking, policy };
  const packet = {
    source: "issue-composer",
    provider: "korean-government-api-bundle",
    tool: "compose_issue_packet",
    query: input,
    identifier: `issue:${input.topic}`,
    summary: `${input.topic} 이슈의 source packet을 구성했습니다.`,
    original_url: "https://github.com/hosungseo/korean-government-api-bundle",
    fetched_at: nowIso(),
    sources,
    source_health: Object.fromEntries(Object.entries(sources).map(([key, value]) => [key, value.ok ? "ok" : "error"])),
    source_gaps: sourceGapEntries(sources),
    counts: Object.fromEntries(Object.entries(sources).map(([key, value]) => [key, value.ok ? itemCount(value.result) : 0]))
  };
  return { ...packet, evidence_matrix: buildRowsFromSources(sources) };
}

export async function renderIssueOnepagerTool(input: IssueInput) {
  const packet = await composeIssuePacketTool(input);
  const matrix = packet.evidence_matrix;
  const gaps = Object.entries(packet.counts).filter(([, count]) => Number(count) === 0).map(([key]) => key);
  const posture = gaps.length === 0 ? "ready-for-briefing" : gaps.length <= 1 ? "usable-with-caveat" : "needs-source-repair";
  const top = (role: string) => matrix.find((row: EvidenceRow) => row.role === role);
  return {
    source: "issue-composer",
    provider: "korean-government-api-bundle",
    tool: "render_issue_onepager",
    query: input,
    identifier: `issue-onepager:${input.topic}`,
    summary: `${input.topic} 이슈 1쪽 보고서 초안을 생성했습니다.`,
    original_url: packet.original_url,
    fetched_at: nowIso(),
    posture,
    bottom_line: gaps.length === 0
      ? "법령·관보·통계·공공데이터 후보가 모두 확인되어 브리핑 초안 작성이 가능합니다."
      : `다음 source 공백을 보강한 뒤 판단하는 편이 안전합니다: ${gaps.join(", ")}`,
    key_facts: [
      `법령 근거 후보: ${top("legal basis")?.title ?? "확인 필요"}`,
      `공식 신호 후보: ${top("official notice")?.title ?? "확인 필요"}`,
      `통계 후보: ${top("background condition")?.title ?? "확인 필요"}`,
      `데이터셋 후보: ${top("data asset")?.title ?? "확인 필요"}`,
      `국회 의안 후보: ${top("legislative agenda")?.title ?? "확인 필요"}`,
      `입법 pipeline 후보: ${top("lawmaking pipeline")?.title ?? "확인 필요"}`
    ],
    risks: matrix.map((row: EvidenceRow) => `${row.role}: ${row.caveat}`),
    next_actions: [
      "법령 후보에서 실제 조문·소관·권한을 확인한다.",
      "관보 검색어를 기관명/정책명/근거법령명으로 좁힌다.",
      "통계 후보 중 직접 지표와 배경 지표를 분리한다.",
      "공공데이터 후보의 API 제공 여부와 갱신주기를 확인한다."
    ],
    evidence_matrix: matrix,
    packet
  };
}


type TimelineEvent = {
  date: string;
  source: string;
  title: string;
  note: string;
  original_url?: string;
};

type GapCheck = {
  id: string;
  label: string;
  severity: "critical" | "warning" | "info";
  status: "ok" | "gap" | "weak";
  evidence: string;
  recommendation: string;
};

function sourceItems(packet: Record<string, unknown>, key: string): Array<Record<string, unknown>> {
  const source = (packet.sources as Record<string, { ok: boolean; result?: { items?: Array<Record<string, unknown>> } }>)[key];
  return source?.ok ? source.result?.items ?? [] : [];
}

function normalizeDate(raw: unknown): string {
  const s = String(raw ?? "").trim();
  const m = s.match(/(\d{4})[-.](\d{1,2})[-.](\d{1,2})/) ?? s.match(/(\d{4})(\d{2})(\d{2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  const ym = s.match(/(\d{4})(\d{2})/);
  if (ym) return `${ym[1]}-${ym[2]}-01`;
  return s.slice(0, 10) || "undated";
}

function titleOf(item: Record<string, unknown>): string {
  return String(item.law_name ?? item.title ?? item.series_name ?? item.dataset_name ?? item.name ?? "untitled");
}

function dateOf(item: Record<string, unknown>): string {
  return normalizeDate(item.effective_date ?? item.publication_date ?? item.proposed_date ?? item.date ?? item.updated_at ?? item.time ?? "");
}

function addGap(checks: GapCheck[], id: string, label: string, severity: GapCheck["severity"], ok: boolean, evidence: string, recommendation: string): void {
  checks.push({ id, label, severity, status: ok ? "ok" : severity === "critical" ? "gap" : "weak", evidence, recommendation });
}

function buildGapAssessment(packet: Record<string, unknown>) {
  const counts = packet.counts as Record<string, number>;
  const checks: GapCheck[] = [];
  addGap(checks, "law", "법령 근거", "critical", counts.law > 0, `${counts.law ?? 0} rows`, "법령 검색어를 더 구체화하고 하위법령/조문 확인으로 이동합니다.");
  addGap(checks, "gazette", "관보/공식 신호", "warning", counts.gazette > 0, `${counts.gazette ?? 0} rows`, "기관명·정책명·근거법령명으로 관보 검색어를 좁힙니다.");
  addGap(checks, "stats", "통계 후보", "warning", counts.stats > 0, `${counts.stats ?? 0} rows`, "ECOS/KOSIS/R-ONE 등 직접 지표 후보를 보강합니다.");
  addGap(checks, "dataset", "공공데이터 후보", "info", counts.dataset > 0, `${counts.dataset ?? 0} rows`, "API 제공 여부와 갱신주기를 확인합니다.");
  addGap(checks, "bill", "국회 의안 후보", "warning", counts.bill > 0, `${counts.bill ?? 0} rows`, "의안명/위원회/대수를 조정해 입법 agenda 신호를 확인합니다.");
  addGap(checks, "lawmaking", "입법센터 pipeline", "warning", counts.lawmaking > 0, `${counts.lawmaking ?? 0} rows`, "입법예고/입법현황 category와 기관명을 조정합니다.");
  addGap(checks, "policy", "정책브리핑 발표자료", "info", counts.policy > 0, `${counts.policy ?? 0} rows`, "정책브리핑 API 키와 날짜 범위를 확인합니다.");
  const gaps = checks.filter((c) => c.status === "gap");
  const weak = checks.filter((c) => c.status === "weak");
  const score = Math.max(0, 100 - gaps.length * 30 - weak.length * 12);
  const posture = gaps.length > 0 ? "needs-source-repair" : weak.length > 0 ? "usable-with-caveat" : "ready-for-briefing";
  return { score, posture, checks, gaps, weak };
}

export async function renderIssueTimelineTool(input: IssueInput) {
  const packet = await composeIssuePacketTool(input);
  const events: TimelineEvent[] = [];
  for (const item of sourceItems(packet, "law")) events.push({ date: dateOf(item), source: "law.go.kr", title: titleOf(item), note: "법령 후보", original_url: String(item.original_url ?? "") });
  for (const item of sourceItems(packet, "gazette")) events.push({ date: dateOf(item), source: "mois-gazette", title: titleOf(item), note: "관보/공식 신호", original_url: String(item.original_url ?? "") });
  for (const item of sourceItems(packet, "stats")) events.push({ date: "undated", source: "stats", title: titleOf(item), note: "통계 후보", original_url: String(item.original_url ?? "") });
  for (const item of sourceItems(packet, "dataset")) events.push({ date: "undated", source: "data.go.kr", title: titleOf(item), note: "공공데이터 후보", original_url: String(item.original_url ?? "") });
  for (const item of sourceItems(packet, "bill")) events.push({ date: dateOf(item), source: "open.assembly.go.kr", title: titleOf(item), note: "국회 의안 후보", original_url: String(item.original_url ?? "") });
  for (const item of sourceItems(packet, "lawmaking")) events.push({ date: dateOf(item), source: "lawmaking.go.kr", title: titleOf(item), note: "입법센터 pipeline", original_url: String(item.original_url ?? "") });
  for (const item of sourceItems(packet, "policy")) events.push({ date: dateOf(item), source: "korea.kr", title: titleOf(item), note: "정책브리핑 발표자료", original_url: String(item.original_url ?? "") });
  events.sort((a, b) => a.date.localeCompare(b.date));
  return {
    source: "issue-composer",
    provider: "korean-government-api-bundle",
    tool: "render_issue_timeline",
    query: input,
    identifier: `issue-timeline:${input.topic}`,
    summary: `${input.topic} 이슈 timeline을 생성했습니다.`,
    original_url: packet.original_url,
    fetched_at: nowIso(),
    events,
    packet
  };
}

export async function checkIssueGapsTool(input: IssueInput) {
  const packet = await composeIssuePacketTool(input);
  const assessment = buildGapAssessment(packet);
  return {
    source: "issue-composer",
    provider: "korean-government-api-bundle",
    tool: "check_issue_gaps",
    query: input,
    identifier: `issue-gaps:${input.topic}`,
    summary: `${input.topic} 이슈 source gap을 점검했습니다: ${assessment.posture}`,
    original_url: packet.original_url,
    fetched_at: nowIso(),
    assessment,
    packet
  };
}

export async function routeIssueNextActionTool(input: IssueInput) {
  const packet = await composeIssuePacketTool(input);
  const assessment = buildGapAssessment(packet);
  const matrix = packet.evidence_matrix;
  const high = matrix.filter((r) => r.strength === "high").length;
  const medium = matrix.filter((r) => r.strength === "medium").length;
  const weakIds = new Set<string>(assessment.checks.filter((c) => c.status !== "ok").map((c) => c.id));
  const routes = [
    { id: "brief-now", label: "1쪽 보고서로 바로 전환", score: 45 + (assessment.posture === "ready-for-briefing" ? 35 : 0) + (high > 0 ? 10 : 0), next: "render_issue_onepager를 실행해 보고용 초안으로 전환합니다." },
    { id: "legal-deep-dive", label: "법령/조문 심화", score: 35 + (weakIds.has("law") ? 35 : 0) + (high === 0 ? 10 : 0), next: "법령 후보에서 조문·소관·권한 근거를 확인합니다." },
    { id: "official-signal-narrowing", label: "관보/공식신호 좁히기", score: 35 + (weakIds.has("gazette") ? 30 : 0) + (medium > 1 ? 10 : 0), next: "관보 검색어를 기관명·정책명·근거법령명으로 좁힙니다." },
    { id: "statistics-support", label: "통계 보강", score: 30 + (weakIds.has("stats") ? 30 : 0), next: "직접 지표와 배경 지표를 분리해 통계 후보를 보강합니다." },
    { id: "policy-read", label: "정책브리핑 발표자료 확인", score: 32 + (weakIds.has("policy") ? 20 : 0), next: "정책브리핑 발표자료를 정책 서사로만 쓰고 법적 근거와 분리합니다." },
    { id: "assembly-watch", label: "국회 의안/상임위 추적", score: 32 + (weakIds.has("bill") ? 30 : 0), next: "의안명·위원회·대수를 조정해 관련 법안과 상임위 신호를 추적합니다." },
    { id: "lawmaking-watch", label: "입법예고/입법현황 추적", score: 32 + (weakIds.has("lawmaking") ? 30 : 0), next: "국민참여입법센터 category를 조정해 제도화 pipeline을 확인합니다." },
    { id: "dataset-followup", label: "공공데이터 API 후속확인", score: 30 + (weakIds.has("dataset") ? 25 : 0), next: "데이터셋 API 제공 여부·갱신주기·원자료 다운로드 가능성을 확인합니다." }
  ].sort((a, b) => b.score - a.score);
  return {
    source: "issue-composer",
    provider: "korean-government-api-bundle",
    tool: "route_issue_next_action",
    query: input,
    identifier: `issue-router:${input.topic}`,
    summary: `${input.topic} 이슈의 다음 경로는 ${routes[0]?.id}입니다.`,
    original_url: packet.original_url,
    fetched_at: nowIso(),
    context: { posture: assessment.posture, score: assessment.score, evidence_strength: { high, medium, total: matrix.length }, weak_ids: [...weakIds] },
    recommendation: routes[0],
    alternatives: routes.slice(1, 4),
    routes,
    packet
  };
}


export async function renderIssueScenarioLabTool(input: IssueInput) {
  const packet = await composeIssuePacketTool(input);
  const gap = buildGapAssessment(packet);
  const router = await routeIssueNextActionTool(input);
  const matrix = packet.evidence_matrix;
  const top = (role: string) => matrix.find((row: EvidenceRow) => row.role === role);
  const legal = top("legal basis");
  const notice = top("official notice");
  const stat = top("background condition");
  const dataset = top("data asset");
  const risks = [
    {
      risk: "정책 서사와 법적 근거의 불일치",
      trigger: legal?.title ?? "법령 근거 후보 없음",
      evidence: legal?.use ?? "법령 source gap",
      mitigation: "정책 설명과 법령상 권한·소관 근거를 분리해 확인합니다."
    },
    {
      risk: "공식 신호의 직접 관련성 부족",
      trigger: notice?.title ?? "관보/공식 신호 후보 없음",
      evidence: notice?.caveat ?? "관보 source gap",
      mitigation: "기관명·정책명·근거법령명으로 관보 검색어를 좁힙니다."
    },
    {
      risk: "통계/데이터가 배경 설명에 머무를 가능성",
      trigger: `${stat?.title ?? "통계 후보 없음"} / ${dataset?.title ?? "데이터셋 후보 없음"}`,
      evidence: "통계·데이터는 직접 인과근거와 배경조건을 구분해야 합니다.",
      mitigation: "직접 지표 1개와 배경 지표 1개를 나누어 표시합니다."
    }
  ];
  const question_playbook = [
    {
      audience: "장관/차관 예상질문",
      question: `${input.topic} 이슈가 실제 집행권한과 예산·인력 배분까지 연결되어 있습니까?`,
      answer_frame: `${legal?.title ?? "관련 법령"} 후보를 근거로 소관·권한·집행수단을 분리해 답변합니다.`
    },
    {
      audience: "국회/상임위 예상질문",
      question: `공식 신호와 통계가 ${input.topic} 정책 필요성을 충분히 뒷받침합니까?`,
      answer_frame: "관보는 공식 조치, 법령은 권한, 통계는 배경조건, 데이터셋은 후속 분석 근거로 역할을 나눕니다."
    },
    {
      audience: "실무검토 질문",
      question: "지금 바로 보고해도 되는가, 아니면 source 보강이 필요한가?",
      answer_frame: `gap posture=${gap.posture}, router recommendation=${router.recommendation?.id ?? "unknown"} 기준으로 판단합니다.`
    }
  ];
  const action_packet = [
    { lane: "legal", action: "법령 후보에서 실제 조문·소관·권한 확인", output: "legal basis note" },
    { lane: "official", action: "관보 검색어를 기관명/정책명/근거법령명으로 재검색", output: "official signal shortlist" },
    { lane: "statistics", action: "직접 지표와 배경 지표 분리", output: "indicator pair" },
    { lane: "data", action: "공공데이터 API 제공 여부와 갱신주기 확인", output: "data asset note" }
  ];
  const counter_arguments = [
    { claim: "법령 후보만으로는 실제 권한 근거가 부족하다.", response: "맞습니다. 후보는 출발점이고, 실제 조문 확인을 next action으로 분리합니다." },
    { claim: "관보 검색결과가 이슈와 직접 관련 없을 수 있다.", response: "맞습니다. matrix caveat와 공식신호 좁히기 route로 표시합니다." },
    { claim: "통계·데이터는 정책 효과를 증명하지 않는다.", response: "맞습니다. 배경조건과 직접 인과근거를 구분해 사용합니다." }
  ];
  return {
    source: "issue-composer",
    provider: "korean-government-api-bundle",
    tool: "render_issue_scenario_lab",
    query: input,
    identifier: `issue-scenario:${input.topic}`,
    summary: `${input.topic} 이슈 scenario lab을 생성했습니다.`,
    original_url: packet.original_url,
    fetched_at: nowIso(),
    posture: gap.posture,
    recommendation: router.recommendation,
    risks,
    question_playbook,
    action_packet,
    counter_arguments,
    evidence_matrix: matrix,
    packet
  };
}


export async function renderIssueEvidenceMatrixTool(input: IssueInput) {
  const packet = await composeIssuePacketTool(input);
  return {
    source: "issue-composer",
    provider: "korean-government-api-bundle",
    tool: "render_issue_evidence_matrix",
    query: input,
    identifier: `issue-matrix:${input.topic}`,
    summary: `${input.topic} 이슈 evidence matrix를 생성했습니다.`,
    original_url: packet.original_url,
    fetched_at: nowIso(),
    rows: packet.evidence_matrix,
    source_health: packet.source_health,
    counts: packet.counts,
    packet
  };
}

export async function renderIssueBriefTool(input: IssueInput) {
  const packet = await composeIssuePacketTool(input);
  const gap = buildGapAssessment(packet);
  const matrix = packet.evidence_matrix;
  const top = (role: string) => matrix.find((row: EvidenceRow) => row.role === role);
  const legal = top("legal basis");
  const notice = top("official notice");
  const stat = top("background condition");
  const dataset = top("data asset");
  const questions = [
    `${input.topic} 이슈의 법령상 소관·권한 근거는 무엇인가?`,
    `관보/공식 신호가 ${input.topic}과 직접 연결되는가, 아니면 배경 신호인가?`,
    `통계와 공공데이터는 정책 필요성의 직접 근거인가, 배경 설명인가?`
  ];
  return {
    source: "issue-composer",
    provider: "korean-government-api-bundle",
    tool: "render_issue_brief",
    query: input,
    identifier: `issue-brief:${input.topic}`,
    summary: `${input.topic} 이슈 실무 브리핑을 생성했습니다.`,
    original_url: packet.original_url,
    fetched_at: nowIso(),
    posture: gap.posture,
    lead: {
      topic: input.topic,
      bottom_line: gap.posture === "ready-for-briefing"
        ? "핵심 source가 모두 살아 있어 브리핑 초안으로 전환 가능합니다."
        : "일부 source 공백이 있어 확인 과제를 먼저 제시하는 방식이 안전합니다."
    },
    legal_context: {
      title: legal?.title ?? "확인 필요",
      use: legal?.use ?? "법령 후보 확인 필요",
      caveat: legal?.caveat ?? "법령 source gap"
    },
    official_signals: {
      title: notice?.title ?? "확인 필요",
      use: notice?.use ?? "공식 신호 확인 필요",
      caveat: notice?.caveat ?? "관보 source gap"
    },
    statistics_context: {
      title: stat?.title ?? "확인 필요",
      use: stat?.use ?? "통계 후보 확인 필요",
      caveat: stat?.caveat ?? "통계 source gap"
    },
    data_context: {
      title: dataset?.title ?? "확인 필요",
      use: dataset?.use ?? "공공데이터 후보 확인 필요",
      caveat: dataset?.caveat ?? "데이터 source gap"
    },
    question_forecast: questions,
    next_actions: [
      "법령 후보에서 실제 조문·소관·권한을 확인한다.",
      "관보 후보를 기관명/정책명/근거법령명으로 좁힌다.",
      "통계 후보를 직접 지표와 배경 지표로 분류한다.",
      "공공데이터 후보의 API 제공 여부와 갱신주기를 확인한다."
    ],
    evidence_matrix: matrix,
    packet
  };
}


export async function buildIssueDossierTool(input: IssueInput) {
  const packet = await composeIssuePacketTool(input);
  const gapAssessment = buildGapAssessment(packet);
  const matrix = packet.evidence_matrix;
  const timelineEvents: TimelineEvent[] = [];
  for (const item of sourceItems(packet, "law")) timelineEvents.push({ date: dateOf(item), source: "law.go.kr", title: titleOf(item), note: "법령 후보", original_url: String(item.original_url ?? "") });
  for (const item of sourceItems(packet, "gazette")) timelineEvents.push({ date: dateOf(item), source: "mois-gazette", title: titleOf(item), note: "관보/공식 신호", original_url: String(item.original_url ?? "") });
  for (const item of sourceItems(packet, "stats")) timelineEvents.push({ date: "undated", source: "stats", title: titleOf(item), note: "통계 후보", original_url: String(item.original_url ?? "") });
  for (const item of sourceItems(packet, "dataset")) timelineEvents.push({ date: "undated", source: "data.go.kr", title: titleOf(item), note: "공공데이터 후보", original_url: String(item.original_url ?? "") });
  timelineEvents.sort((a, b) => a.date.localeCompare(b.date));
  const router = await routeIssueNextActionTool(input);
  const onepager = await renderIssueOnepagerTool(input);
  const brief = await renderIssueBriefTool(input);
  const scenario = await renderIssueScenarioLabTool(input);
  const dossierMarkdown = [
    `# Issue Dossier — ${input.topic}`,
    ``,
    `- Posture: ${gapAssessment.posture}`,
    `- Score: ${gapAssessment.score}`,
    `- Recommended route: ${router.recommendation?.id ?? "unknown"}`,
    ``,
    `## Bottom line`,
    String(onepager.bottom_line ?? ""),
    ``,
    `## Key facts`,
    ...((onepager.key_facts as string[] | undefined) ?? []).map((x) => `- ${x}`),
    ``,
    `## Evidence matrix`,
    ...matrix.map((r) => `- **${r.role} / ${r.source} / ${r.strength}:** ${r.title} — ${r.caveat}`),
    ``,
    `## Timeline`,
    ...timelineEvents.map((e) => `- **${e.date}** [${e.source}] ${e.title}`),
    ``,
    `## Scenario risks`,
    ...((scenario.risks as Array<{ risk: string; mitigation: string }> | undefined) ?? []).map((r) => `- **${r.risk}:** ${r.mitigation}`),
    ``,
    `## Source gaps`,
    ...(((packet.source_gaps as Array<{ source: string; error: string; next_action: string }> | undefined) ?? []).length ? ((packet.source_gaps as Array<{ source: string; error: string; next_action: string }>).map((g) => `- **${g.source}:** ${g.error} → ${g.next_action}`)) : ["- 없음"]),
    ``,
    `## Next actions`,
    ...((onepager.next_actions as string[] | undefined) ?? []).map((x) => `- ${x}`)
  ].join("\n");
  return {
    source: "issue-composer",
    provider: "korean-government-api-bundle",
    tool: "build_issue_dossier",
    query: input,
    identifier: `issue-dossier:${input.topic}`,
    summary: `${input.topic} 이슈 dossier를 생성했습니다.`,
    original_url: packet.original_url,
    fetched_at: nowIso(),
    posture: gapAssessment.posture,
    score: gapAssessment.score,
    recommendation: router.recommendation,
    packet,
    brief,
    onepager,
    timeline: { events: timelineEvents },
    evidence_matrix: matrix,
    gap: gapAssessment,
    router,
    scenario,
    dossier_markdown: dossierMarkdown
  };
}
