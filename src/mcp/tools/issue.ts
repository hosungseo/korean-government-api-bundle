import { nowIso } from "../../core/citations.js";
import { InputError } from "../../core/errors.js";
import { searchPublicDatasetTool } from "./dataset.js";
import { searchGazetteItemsTool } from "./gazette.js";
import { searchLawTool } from "./law.js";
import { searchStatSeriesTool } from "./stats.js";

type IssueInput = {
  topic: string;
  law_query?: string;
  gazette_query?: string;
  stat_query?: string;
  dataset_query?: string;
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
        limit: { type: "number", description: "source별 최대 후보 수" }
      },
      required: ["topic"]
    }
  }
] as const;

function queryOf(input: IssueInput, key: keyof Pick<IssueInput, "law_query" | "gazette_query" | "stat_query" | "dataset_query">): string {
  return input[key]?.trim() || input.topic.trim();
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
  return String(first.law_name ?? first.title ?? first.series_name ?? first.dataset_name ?? first.name ?? "").trim() || undefined;
}

function firstUrl(value: unknown): string | undefined {
  const items = (value as { items?: Array<Record<string, unknown>> }).items ?? [];
  const first = items[0];
  return String(first?.original_url ?? (value as { original_url?: string }).original_url ?? "").trim() || undefined;
}

function itemCount(value: unknown): number {
  return ((value as { items?: unknown[] }).items ?? []).length;
}

function buildRowsFromSources(sources: Record<string, { ok: boolean; result?: unknown }>): EvidenceRow[] {
  const rows: EvidenceRow[] = [];
  if (sources.law?.ok) rows.push({ role: "legal basis", source: "law.go.kr", title: firstTitle(sources.law.result) ?? "법령 후보 없음", strength: "high", use: "소관·권한·제도 근거 후보를 확인합니다.", caveat: "정확한 조문 확인 전에는 후보 근거입니다.", original_url: firstUrl(sources.law.result) });
  if (sources.gazette?.ok) rows.push({ role: "official notice", source: "mois-gazette", title: firstTitle(sources.gazette.result) ?? "관보 후보 없음", strength: "medium", use: "고시·공고·처분 등 공식 신호를 확인합니다.", caveat: "검색어가 넓으면 직접 관련성이 약할 수 있습니다.", original_url: firstUrl(sources.gazette.result) });
  if (sources.stats?.ok) rows.push({ role: "background condition", source: "stats", title: firstTitle(sources.stats.result) ?? "통계 후보 없음", strength: "low", use: "배경 지표 후보를 찾습니다.", caveat: "통계 후보는 직접 인과 근거가 아닙니다.", original_url: firstUrl(sources.stats.result) });
  if (sources.dataset?.ok) rows.push({ role: "data asset", source: "data.go.kr", title: firstTitle(sources.dataset.result) ?? "데이터셋 후보 없음", strength: "medium", use: "후속 분석에 쓸 공개 데이터 자산을 찾습니다.", caveat: "실제 API 제공 여부와 갱신주기를 별도 확인해야 합니다.", original_url: firstUrl(sources.dataset.result) });
  return rows;
}

export async function composeIssuePacketTool(input: IssueInput): Promise<Record<string, unknown> & { evidence_matrix: EvidenceRow[]; counts: Record<string, number>; original_url: string }> {
  if (!input.topic?.trim()) throw new InputError("topic is required for compose_issue_packet");
  const limit = input.limit ?? 3;
  const [law, gazette, stats, dataset] = await Promise.all([
    safe("law", () => searchLawTool({ query: queryOf(input, "law_query"), limit })),
    safe("gazette", () => searchGazetteItemsTool({ query: queryOf(input, "gazette_query"), limit })),
    safe("stats", () => searchStatSeriesTool({ query: queryOf(input, "stat_query"), source: "all", limit })),
    safe("dataset", () => searchPublicDatasetTool({ query: queryOf(input, "dataset_query"), limit }))
  ]);

  const sources = { law, gazette, stats, dataset };
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
      `데이터셋 후보: ${top("data asset")?.title ?? "확인 필요"}`
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
