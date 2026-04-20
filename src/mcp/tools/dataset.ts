import { buildDatasetIdentifier, nowIso } from "../../core/citations.js";
import { loadConfig } from "../../core/config.js";
import { InputError } from "../../core/errors.js";
import type {
  GetDatasetMetadataInput,
  GetDatasetMetadataResponse,
  SearchPublicDatasetInput,
  SearchPublicDatasetResponse
} from "../../core/types.js";
import { getDatasetMetadataProvider, searchPublicDatasetProvider } from "../../providers/data_go_kr/api.js";

export const datasetTools = [
  {
    name: "search_public_dataset",
    description: "공공데이터포털에서 데이터셋 후보를 검색합니다.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "검색어" },
        limit: { type: "number", description: "최대 결과 수" }
      },
      required: ["query"]
    }
  },
  {
    name: "get_dataset_metadata",
    description: "공공데이터포털 데이터셋 상세 메타데이터를 가져옵니다.",
    inputSchema: {
      type: "object",
      properties: {
        dataset_id: { type: "string", description: "dataset id" },
        service_id: { type: "string", description: "service/dataset id alias" }
      }
    }
  }
] as const;

export async function searchPublicDatasetTool(input: SearchPublicDatasetInput): Promise<SearchPublicDatasetResponse> {
  if (!input.query?.trim()) {
    throw new InputError("query is required for search_public_dataset");
  }

  const config = loadConfig();
  const { items, originalUrl } = await searchPublicDatasetProvider(input, config);

  return {
    source: "data.go.kr",
    provider: "공공데이터포털",
    tool: "search_public_dataset",
    query: input,
    identifier: buildDatasetIdentifier(items[0]?.dataset_id, null),
    summary: items.length > 0 ? `${items.length}개 데이터셋 후보를 찾았습니다.` : "일치하는 데이터셋 후보를 찾지 못했습니다.",
    original_url: originalUrl,
    fetched_at: nowIso(),
    confidence: 0.85,
    matched_by: "keyword",
    items
  };
}

export async function getDatasetMetadataTool(input: GetDatasetMetadataInput): Promise<GetDatasetMetadataResponse> {
  if (!input.dataset_id?.trim() && !input.service_id?.trim()) {
    throw new InputError("dataset_id or service_id is required for get_dataset_metadata");
  }

  const config = loadConfig();
  const result = await getDatasetMetadataProvider(input, config);

  return {
    source: "data.go.kr",
    provider: "공공데이터포털",
    tool: "get_dataset_metadata",
    query: input,
    identifier: buildDatasetIdentifier(input.dataset_id, input.service_id),
    summary: `${result.title} 메타데이터를 가져왔습니다.`,
    original_url: result.originalUrl,
    fetched_at: nowIso(),
    confidence: 0.88,
    matched_by: "identifier",
    title: result.title,
    dataset_provider: result.provider,
    description: result.description,
    format: result.format,
    api_available: result.apiAvailable,
    download_count: result.downloadCount
  };
}
