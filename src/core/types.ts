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

export interface BundleConfig {
  law: {
    oc: string;
    searchBaseUrl: string;
    serviceBaseUrl: string;
    detailBaseUrl: string;
  };
}

export interface IntentResolution {
  intent: BundleIntent;
  providerId: string;
  matchedBy: "identifier" | "keyword" | "fallback";
  confidence: number;
  alternatives?: ToolAlternative[];
}
