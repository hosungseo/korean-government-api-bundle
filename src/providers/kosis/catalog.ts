import type { SearchStatSeriesItem } from "../../core/types.js";

export interface KosisSeriesCatalogItem extends SearchStatSeriesItem {
  source: "kosis";
  org_id: string;
  topic_keywords: string[];
  user_stats_id?: string;
}

export const kosisSeriesCatalog: KosisSeriesCatalogItem[] = [
  {
    source: "kosis",
    series_name: "인구총조사 총인구",
    table_id: "DT_1IN1502",
    item_code: null,
    unit: "명",
    frequency: "Y",
    original_url: "https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1IN1502",
    org_id: "101",
    topic_keywords: ["총인구", "인구총조사", "전국 인구", "인구"],
    user_stats_id: "openapisample/101/DT_1IN1502/2/1/20191106094026_1"
  }
];
