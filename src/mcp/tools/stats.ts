import { buildStatCompareIdentifier, buildStatIdentifier, nowIso } from "../../core/citations.js";
import { loadConfig } from "../../core/config.js";
import { InputError } from "../../core/errors.js";
import { resolveSearchStatIntent } from "../../core/resolve.js";
import type {
  CompareStatSeriesInput,
  CompareStatSeriesPoint,
  CompareStatSeriesResponse,
  GetStatSeriesInput,
  GetStatSeriesResponse,
  SearchStatSeriesInput,
  SearchStatSeriesResponse
} from "../../core/types.js";
import { ecosSeriesCatalog } from "../../providers/ecos/catalog.js";
import { getStatSeriesProvider, searchStatSeriesProvider } from "../../providers/ecos/api.js";
import { kosisSeriesCatalog } from "../../providers/kosis/catalog.js";
import { getKosisSeriesProvider, searchKosisSeriesProvider } from "../../providers/kosis/api.js";

export const statTools = [
  {
    name: "search_stat_series",
    description: "통계 주제로 시계열 후보를 찾습니다. ECOS 전체와 KOSIS 초기 demographic slice를 지원합니다.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "통계 검색어" },
        source: { type: "string", description: "ecos | kosis | all" },
        limit: { type: "number", description: "최대 결과 수" }
      },
      required: ["query"]
    }
  },
  {
    name: "get_stat_series",
    description: "특정 통계 시계열 값을 가져옵니다. ECOS와 KOSIS 등록 slice를 지원합니다.",
    inputSchema: {
      type: "object",
      properties: {
        source: { type: "string", description: "ecos | kosis" },
        table_id: { type: "string", description: "통계표 코드" },
        item_code: { type: "string", description: "항목 코드" },
        org_id: { type: "string", description: "KOSIS 기관 코드" },
        obj_l1: { type: "string", description: "KOSIS 1차 분류 코드" },
        obj_l2: { type: "string", description: "KOSIS 2차 분류 코드" },
        obj_l3: { type: "string", description: "KOSIS 3차 분류 코드" },
        start: { type: "string", description: "시작 시점 YYYYMM 또는 YYYY" },
        end: { type: "string", description: "종료 시점 YYYYMM 또는 YYYY" }
      },
      required: ["source", "table_id", "start", "end"]
    }
  },
  {
    name: "compare_stat_series",
    description: "두 통계 시계열을 같은 기간으로 정렬해 차이와 비율을 비교합니다.",
    inputSchema: {
      type: "object",
      properties: {
        series_a_identifier: { type: "string", description: "첫 번째 시계열 identifier" },
        series_b_identifier: { type: "string", description: "두 번째 시계열 identifier" },
        series_a_label: { type: "string", description: "첫 번째 시계열 표시 이름" },
        series_b_label: { type: "string", description: "두 번째 시계열 표시 이름" },
        series_a_org_id: { type: "string", description: "첫 번째 KOSIS 기관 코드 override" },
        series_b_org_id: { type: "string", description: "두 번째 KOSIS 기관 코드 override" },
        start: { type: "string", description: "시작 시점 YYYYMM 또는 YYYY" },
        end: { type: "string", description: "종료 시점 YYYYMM 또는 YYYY" }
      },
      required: ["series_a_identifier", "series_b_identifier", "start", "end"]
    }
  }
] as const;

type ParsedSeriesIdentifier = Pick<GetStatSeriesInput, "source" | "table_id" | "item_code" | "org_id" | "obj_l1" | "obj_l2" | "obj_l3">;

type LoadedSeries = {
  identifier: string;
  label: string;
  originalUrl: string;
  unit: string | null;
  frequency: string | null;
  values: Array<{ time: string; value: string }>;
};

function parseSeriesIdentifier(identifier: string, orgOverride?: string): ParsedSeriesIdentifier {
  const raw = identifier?.trim();
  if (!raw) {
    throw new InputError("series identifier is required for compare_stat_series");
  }

  const parts = raw.split(":").filter(Boolean);
  if (parts.length < 2) {
    throw new InputError(`invalid stat series identifier: ${identifier}`);
  }

  const source = parts[0];
  const tableId = parts[1];
  if (source !== "ecos" && source !== "kosis") {
    throw new InputError(`unsupported stat source in identifier: ${identifier}`);
  }

  if (source === "ecos") {
    return {
      source,
      table_id: tableId,
      item_code: parts[2] === "_" ? undefined : parts[2]
    };
  }

  return {
    source,
    table_id: tableId,
    item_code: parts[2] === "_" ? undefined : parts[2],
    org_id: orgOverride ?? parts[3],
    obj_l1: parts[4],
    obj_l2: parts[5],
    obj_l3: parts[6]
  };
}

function lookupSeriesLabel(parsed: ParsedSeriesIdentifier, fallbackIdentifier: string, explicitLabel?: string): string {
  if (explicitLabel?.trim()) return explicitLabel.trim();

  if (parsed.source === "ecos") {
    const catalogItem = ecosSeriesCatalog.find((item) => item.table_id === parsed.table_id && (parsed.item_code ? item.item_code === parsed.item_code : true));
    return catalogItem?.series_name ?? fallbackIdentifier;
  }

  const catalogItem = kosisSeriesCatalog.find((item) =>
    item.table_id === parsed.table_id &&
    (parsed.item_code ? item.item_code === parsed.item_code : true) &&
    (parsed.org_id ? item.org_id === parsed.org_id : true) &&
    (parsed.obj_l1 ? item.obj_l1 === parsed.obj_l1 : true) &&
    (parsed.obj_l2 ? item.obj_l2 === parsed.obj_l2 : true) &&
    (parsed.obj_l3 ? item.obj_l3 === parsed.obj_l3 : true)
  );

  return catalogItem?.series_name ?? fallbackIdentifier;
}

function toNumber(value: string): number | null {
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function roundMetric(value: number | null): number | null {
  return value === null ? null : Number(value.toFixed(6));
}

function buildComparisonPoints(seriesA: LoadedSeries, seriesB: LoadedSeries): CompareStatSeriesPoint[] {
  const valueMapB = new Map(seriesB.values.map((row) => [row.time, row.value]));

  return seriesA.values
    .filter((row) => valueMapB.has(row.time))
    .map((row) => {
      const valueB = valueMapB.get(row.time) ?? "";
      const numericA = toNumber(row.value);
      const numericB = toNumber(valueB);
      return {
        time: row.time,
        value_a: row.value,
        value_b: valueB,
        difference: numericA !== null && numericB !== null ? roundMetric(numericB - numericA) : null,
        ratio: numericA !== null && numericB !== null && numericA !== 0 ? roundMetric(numericB / numericA) : null
      };
    });
}

function buildCompareSummary(seriesA: LoadedSeries, seriesB: LoadedSeries, points: CompareStatSeriesPoint[]): string {
  if (points.length === 0) {
    return `${seriesA.label}와 ${seriesB.label} 사이에 겹치는 시점을 찾지 못했습니다.`;
  }

  const latest = points[points.length - 1];
  const latestDifference = latest.difference !== null ? `, 최신 차이(B-A)는 ${latest.difference}` : "";
  const frequencyNote = seriesA.frequency && seriesB.frequency && seriesA.frequency !== seriesB.frequency
    ? ` 주기가 ${seriesA.frequency}와 ${seriesB.frequency}로 달라 해석에 주의가 필요합니다.`
    : "";

  return `${seriesA.label}와 ${seriesB.label}의 공통 시점 ${points.length}개를 비교했습니다. 최신 비교 시점은 ${latest.time}${latestDifference}.${frequencyNote}`.trim();
}

async function loadSeries(parsed: ParsedSeriesIdentifier, start: string, end: string, label: string, identifier: string): Promise<LoadedSeries> {
  const config = loadConfig();
  const input: GetStatSeriesInput = {
    ...parsed,
    start,
    end
  };

  const result = parsed.source === "kosis"
    ? await getKosisSeriesProvider(input, config)
    : await getStatSeriesProvider(input, config);

  return {
    identifier,
    label,
    originalUrl: result.originalUrl,
    unit: result.unit,
    frequency: result.frequency,
    values: result.values
  };
}

export async function searchStatSeriesTool(input: SearchStatSeriesInput): Promise<SearchStatSeriesResponse> {
  if (!input.query?.trim()) {
    throw new InputError("query is required for search_stat_series");
  }

  const config = loadConfig();
  const resolution = resolveSearchStatIntent(input);
  const { items, originalUrl } = resolution.providerId === "kosis"
    ? await searchKosisSeriesProvider(input, config)
    : await searchStatSeriesProvider(input, config);

  return {
    source: resolution.providerId === "kosis" ? "kosis" : "ecos",
    provider: resolution.providerId === "kosis" ? "KOSIS 국가통계포털" : "한국은행 ECOS",
    tool: "search_stat_series",
    query: input,
    identifier: buildStatIdentifier(
      items[0]?.source ?? "ecos",
      items[0]?.table_id ?? "search",
      items[0]?.item_code,
      [items[0]?.org_id, items[0]?.obj_l1, items[0]?.obj_l2, items[0]?.obj_l3]
    ),
    summary: items.length > 0 ? `${items.length}개 통계 시계열 후보를 찾았습니다.` : "일치하는 통계 시계열 후보를 찾지 못했습니다.",
    original_url: originalUrl,
    fetched_at: nowIso(),
    confidence: resolution.confidence,
    matched_by: resolution.matchedBy,
    alternatives: resolution.alternatives,
    items
  };
}

export async function getStatSeriesTool(input: GetStatSeriesInput): Promise<GetStatSeriesResponse> {
  if (!input.source || !input.table_id?.trim() || !input.start?.trim() || !input.end?.trim()) {
    throw new InputError("source, table_id, start, end are required for get_stat_series");
  }

  const config = loadConfig();
  const result = input.source === "kosis"
    ? await getKosisSeriesProvider(input, config)
    : await getStatSeriesProvider(input, config);

  return {
    source: input.source,
    provider: input.source === "kosis" ? "KOSIS 국가통계포털" : "한국은행 ECOS",
    tool: "get_stat_series",
    query: input,
    identifier: buildStatIdentifier(input.source, input.table_id, input.item_code, [input.org_id, input.obj_l1, input.obj_l2, input.obj_l3]),
    summary: `${result.summary} 시계열을 가져왔습니다.`,
    original_url: result.originalUrl,
    fetched_at: nowIso(),
    confidence: input.source === "ecos" ? 0.95 : 0.7,
    matched_by: "identifier",
    unit: result.unit,
    frequency: result.frequency,
    values: result.values,
    updated_at: result.updatedAt
  };
}

export async function compareStatSeriesTool(input: CompareStatSeriesInput): Promise<CompareStatSeriesResponse> {
  if (!input.series_a_identifier?.trim() || !input.series_b_identifier?.trim() || !input.start?.trim() || !input.end?.trim()) {
    throw new InputError("series_a_identifier, series_b_identifier, start, end are required for compare_stat_series");
  }

  const parsedA = parseSeriesIdentifier(input.series_a_identifier, input.series_a_org_id);
  const parsedB = parseSeriesIdentifier(input.series_b_identifier, input.series_b_org_id);
  const labelA = lookupSeriesLabel(parsedA, input.series_a_identifier, input.series_a_label);
  const labelB = lookupSeriesLabel(parsedB, input.series_b_identifier, input.series_b_label);

  const [seriesA, seriesB] = await Promise.all([
    loadSeries(parsedA, input.start, input.end, labelA, input.series_a_identifier),
    loadSeries(parsedB, input.start, input.end, labelB, input.series_b_identifier)
  ]);

  const points = buildComparisonPoints(seriesA, seriesB);
  const latest = points[points.length - 1];

  return {
    source: "bundle",
    provider: "korean-government-api-bundle",
    tool: "compare_stat_series",
    query: input,
    identifier: buildStatCompareIdentifier(seriesA.identifier, seriesB.identifier),
    summary: buildCompareSummary(seriesA, seriesB, points),
    original_url: seriesA.originalUrl,
    fetched_at: nowIso(),
    confidence: 0.86,
    matched_by: "identifier",
    series_a_identifier: seriesA.identifier,
    series_b_identifier: seriesB.identifier,
    series_a_label: seriesA.label,
    series_b_label: seriesB.label,
    series_a_original_url: seriesA.originalUrl,
    series_b_original_url: seriesB.originalUrl,
    series_a_unit: seriesA.unit,
    series_b_unit: seriesB.unit,
    series_a_frequency: seriesA.frequency,
    series_b_frequency: seriesB.frequency,
    overlap_count: points.length,
    latest_time: latest?.time ?? null,
    latest_difference: latest?.difference ?? null,
    latest_ratio: latest?.ratio ?? null,
    points
  };
}
