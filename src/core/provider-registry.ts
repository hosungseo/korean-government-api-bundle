import type { ProviderRegistryEntry } from "./types.js";

export const providerRegistry: ProviderRegistryEntry[] = [
  {
    providerId: "law_go_kr",
    providerName: "법제처 국가법령정보",
    domain: "law",
    sourceType: "law",
    supportedIntents: ["law-search", "law-text"],
    keyEndpoints: ["lawSearch.do", "lawService.do", "target=eflaw"],
    inputEntities: ["law_name", "mst", "law_id", "article_ref"],
    responseShape: "law list / law text / law history",
    freshnessModel: "official service response at request time",
    originalUrlPattern: "https://www.law.go.kr/DRF/*",
    priority: 100,
    status: "mvp"
  },
  {
    providerId: "assembly_openapi",
    providerName: "열린국회정보",
    domain: "assembly",
    sourceType: "bill",
    supportedIntents: ["bill-search", "bill-detail"],
    keyEndpoints: ["ALLBILL", "ALLBILLV2", "BILLINFODETAIL", "BPMBILLSUMMARY"],
    inputEntities: ["bill_no", "bill_id", "bill_name", "committee", "proposer"],
    responseShape: "bill list / bill detail / bill timeline",
    freshnessModel: "official assembly API response at request time",
    originalUrlPattern: "https://open.assembly.go.kr/portal/openapi/*",
    priority: 100,
    status: "mvp"
  },
  {
    providerId: "lawmaking_center",
    providerName: "국민참여입법센터 정보공개활용",
    domain: "lawmaking",
    sourceType: "lawmaking",
    supportedIntents: ["lawmaking-search", "lawmaking-detail"],
    keyEndpoints: ["govLmSts", "lmPln", "ogLmPp"],
    inputEntities: ["category", "item_id", "mapping_id", "announce_type", "agency_code", "query"],
    responseShape: "lawmaking list / detail",
    freshnessModel: "official lawmaking portal response at request time",
    originalUrlPattern: "https://www.lawmaking.go.kr/rest/*",
    priority: 95,
    status: "mvp"
  },
  {
    providerId: "ecos",
    providerName: "한국은행 ECOS",
    domain: "stats",
    sourceType: "stats",
    supportedIntents: ["stat-search", "stat-series"],
    keyEndpoints: ["StatisticSearch"],
    inputEntities: ["table_id", "item_code", "period", "topic_keyword"],
    responseShape: "time series values",
    freshnessModel: "official statistical update cycle",
    originalUrlPattern: "https://ecos.bok.or.kr/api/*",
    priority: 90,
    status: "mvp"
  },
  {
    providerId: "kosis",
    providerName: "KOSIS 국가통계포털",
    domain: "stats",
    sourceType: "stats",
    supportedIntents: ["stat-search", "stat-series"],
    keyEndpoints: ["KOSIS OpenAPI"],
    inputEntities: ["table_id", "item_code", "org_id", "topic_keyword"],
    responseShape: "time series values",
    freshnessModel: "official statistical update cycle",
    originalUrlPattern: "https://kosis.kr/openapi/*",
    priority: 80,
    status: "mvp"
  },
  {
    providerId: "data_go_kr",
    providerName: "공공데이터포털",
    domain: "dataset",
    sourceType: "dataset",
    supportedIntents: ["dataset-search", "dataset-metadata"],
    keyEndpoints: ["metadata", "catalog"],
    inputEntities: ["dataset_id", "service_id", "query"],
    responseShape: "dataset metadata / availability",
    freshnessModel: "portal metadata refresh cycle",
    originalUrlPattern: "https://www.data.go.kr/*",
    priority: 100,
    status: "mvp"
  }
];

export function getProviderById(providerId: string): ProviderRegistryEntry | undefined {
  return providerRegistry.find((entry) => entry.providerId === providerId);
}
