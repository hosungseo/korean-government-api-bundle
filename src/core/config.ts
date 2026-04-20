import type { BundleConfig } from "./types.js";

export function loadConfig(): BundleConfig {
  return {
    law: {
      oc: process.env.LAW_OC ?? "ghtjd10855",
      searchBaseUrl: process.env.LAW_SEARCH_BASE_URL ?? "http://www.law.go.kr/DRF/lawSearch.do",
      serviceBaseUrl: process.env.LAW_SERVICE_BASE_URL ?? "http://www.law.go.kr/DRF/lawService.do",
      detailBaseUrl: process.env.LAW_DETAIL_BASE_URL ?? "https://www.law.go.kr"
    },
    assembly: {
      apiKey: process.env.ASSEMBLY_API_KEY ?? "",
      baseUrl: process.env.ASSEMBLY_API_BASE_URL ?? "https://open.assembly.go.kr/portal/openapi",
      defaultAge: process.env.ASSEMBLY_DEFAULT_AGE ?? "제22대"
    }
  };
}
