import type { BundleConfig } from "./types.js";

export function loadConfig(): BundleConfig {
  return {
    law: {
      oc: process.env.LAW_OC ?? "ghtjd10855",
      searchBaseUrl: process.env.LAW_SEARCH_BASE_URL ?? "http://www.law.go.kr/DRF/lawSearch.do",
      serviceBaseUrl: process.env.LAW_SERVICE_BASE_URL ?? "http://www.law.go.kr/DRF/lawService.do",
      detailBaseUrl: process.env.LAW_DETAIL_BASE_URL ?? "https://www.law.go.kr"
    }
  };
}
