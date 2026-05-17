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
