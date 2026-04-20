import type { SearchStatSeriesItem } from "../../core/types.js";

export interface EcosSeriesCatalogItem extends SearchStatSeriesItem {
  source: "ecos";
  topic_keywords: string[];
}

export const ecosSeriesCatalog: EcosSeriesCatalogItem[] = [
  {
    source: "ecos",
    series_name: "한국은행 기준금리",
    table_id: "722Y001",
    item_code: "0101000",
    unit: "연%",
    frequency: "M",
    original_url: "https://ecos.bok.or.kr/",
    topic_keywords: ["기준금리", "금리", "한국은행 기준금리", "base rate"]
  },
  {
    source: "ecos",
    series_name: "주택담보대출금리",
    table_id: "121Y006",
    item_code: "BECBLA01",
    unit: "연%",
    frequency: "M",
    original_url: "https://ecos.bok.or.kr/",
    topic_keywords: ["주담대", "주택담보대출", "주택담보대출금리", "mortgage"]
  },
  {
    source: "ecos",
    series_name: "소비자물가지수",
    table_id: "901Y009",
    item_code: "0",
    unit: "2020=100",
    frequency: "M",
    original_url: "https://ecos.bok.or.kr/",
    topic_keywords: ["cpi", "소비자물가", "소비자물가지수", "물가"]
  },
  {
    source: "ecos",
    series_name: "통화량(M2)",
    table_id: "901Y014",
    item_code: "1020000",
    unit: "십억원",
    frequency: "M",
    original_url: "https://ecos.bok.or.kr/",
    topic_keywords: ["m2", "통화량", "광의통화"]
  }
];
