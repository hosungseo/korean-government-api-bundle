export type BundleIntent =
  | "law-search"
  | "law-text"
  | "bill-search"
  | "bill-detail"
  | "stat-search"
  | "stat-series"
  | "dataset-search"
  | "dataset-metadata";

export type ProviderStatus = "mvp" | "expansion" | "experimental";

export interface ProviderRegistryEntry {
  providerId: string;
  providerName: string;
  domain: "law" | "assembly" | "stats" | "dataset" | "records" | "weather";
  sourceType: string;
  supportedIntents: BundleIntent[];
  keyEndpoints: string[];
  inputEntities: string[];
  responseShape: string;
  freshnessModel: string;
  originalUrlPattern: string;
  priority: number;
  status: ProviderStatus;
}

export interface SearchLawInput {
  query: string;
  limit?: number;
}

export interface SearchLawItem {
  law_name: string;
  law_id: string | null;
  mst: string | null;
  ministry: string | null;
  promulgation_date: string | null;
  effective_date: string | null;
  law_type: string | null;
  original_url: string;
}

export interface ToolAlternative {
  provider: string;
  tool: string;
  reason: string;
}

export interface ToolResponseBase<TQuery> {
  source: string;
  provider: string;
  tool: string;
  query: TQuery;
  identifier: string;
  summary: string;
  original_url: string;
  fetched_at: string;
  confidence?: number;
  matched_by?: "identifier" | "keyword" | "fallback";
  alternatives?: ToolAlternative[];
}

export interface SearchLawResponse extends ToolResponseBase<SearchLawInput> {
  items: SearchLawItem[];
}

export interface GetLawTextInput {
  law_name?: string;
  mst?: string;
  article_ref?: string;
}

export interface GetLawTextResponse extends ToolResponseBase<GetLawTextInput> {
  law_name: string;
  article_ref: string | null;
  text: string;
  citation: string;
}

export interface SearchBillInput {
  bill_no?: string;
  bill_name?: string;
  proposer?: string;
  committee?: string;
  age?: string;
  limit?: number;
}

export interface SearchBillItem {
  bill_no: string;
  bill_id: string | null;
  bill_name: string;
  proposer: string | null;
  committee: string | null;
  status: string | null;
  proposed_date: string | null;
  age: string | null;
  original_url: string;
}

export interface SearchBillResponse extends ToolResponseBase<SearchBillInput> {
  items: SearchBillItem[];
}

export interface GetBillDetailInput {
  bill_no?: string;
  bill_id?: string;
}

export interface BillTimelineStep {
  stage: string;
  date: string | null;
  result: string | null;
  note?: string | null;
}

export interface GetBillDetailResponse extends ToolResponseBase<GetBillDetailInput> {
  bill_no: string;
  bill_id: string;
  bill_name: string;
  summary_text: string | null;
  timeline: BillTimelineStep[];
  plenary_result: string | null;
}

export interface SearchStatSeriesInput {
  query: string;
  source?: "ecos" | "kosis" | "all";
  limit?: number;
}

export interface SearchStatSeriesItem {
  source: "ecos" | "kosis";
  series_name: string;
  table_id: string;
  item_code: string | null;
  org_id?: string | null;
  obj_l1?: string | null;
  obj_l2?: string | null;
  obj_l3?: string | null;
  unit: string | null;
  frequency: string | null;
  original_url: string;
}

export interface SearchStatSeriesResponse extends ToolResponseBase<SearchStatSeriesInput> {
  items: SearchStatSeriesItem[];
}

export interface GetStatSeriesInput {
  source: "ecos" | "kosis";
  table_id: string;
  item_code?: string;
  org_id?: string;
  obj_l1?: string;
  obj_l2?: string;
  obj_l3?: string;
  start: string;
  end: string;
}

export interface StatSeriesValue {
  time: string;
  value: string;
}

export interface GetStatSeriesResponse extends ToolResponseBase<GetStatSeriesInput> {
  unit: string | null;
  frequency: string | null;
  values: StatSeriesValue[];
  updated_at: string | null;
}

export interface SearchPublicDatasetInput {
  query: string;
  limit?: number;
}

export interface SearchPublicDatasetItem {
  dataset_title: string;
  provider: string | null;
  dataset_id: string;
  format: string | null;
  has_api: boolean;
  original_url: string;
}

export interface SearchPublicDatasetResponse extends ToolResponseBase<SearchPublicDatasetInput> {
  items: SearchPublicDatasetItem[];
}

export interface GetDatasetMetadataInput {
  dataset_id?: string;
  service_id?: string;
}

export interface GetDatasetMetadataResponse extends ToolResponseBase<GetDatasetMetadataInput> {
  title: string;
  dataset_provider: string | null;
  description: string | null;
  format: string | null;
  api_available: boolean;
  download_count: string | null;
}

export interface BundleConfig {
  law: {
    oc: string;
    searchBaseUrl: string;
    serviceBaseUrl: string;
    detailBaseUrl: string;
  };
  assembly: {
    apiKey: string;
    baseUrl: string;
    defaultAge: string;
  };
  ecos: {
    apiKey: string;
    baseUrl: string;
    language: string;
  };
  kosis: {
    apiKey: string;
    baseUrl: string;
  };
  dataGoKr: {
    baseUrl: string;
  };
}

export interface IntentResolution {
  intent: BundleIntent;
  providerId: string;
  matchedBy: "identifier" | "keyword" | "fallback";
  confidence: number;
  alternatives?: ToolAlternative[];
}
