import type { SearchStatSeriesItem } from "../../core/types.js";

export interface KosisSeriesCatalogItem extends SearchStatSeriesItem {
  source: "kosis";
  org_id: string;
  topic_keywords: string[];
  retrieval_mode: "user-stats" | "table-parameter";
  user_stats_id?: string;
  default_selection?: boolean;
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
    retrieval_mode: "user-stats",
    user_stats_id: "openapisample/101/DT_1IN1502/2/1/20191106094026_1",
    default_selection: true
  },
  {
    source: "kosis",
    series_name: "주민등록인구 전국 총인구수",
    table_id: "DT_1B040A3",
    item_code: "T20",
    org_id: "101",
    obj_l1: "00",
    unit: "명",
    frequency: "M",
    original_url: "https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1B040A3",
    topic_keywords: ["주민등록인구", "총인구", "전국 인구", "월별 인구", "인구"],
    retrieval_mode: "table-parameter",
    default_selection: true
  },
  {
    source: "kosis",
    series_name: "주민등록인구 서울 총인구수",
    table_id: "DT_1B040A3",
    item_code: "T20",
    org_id: "101",
    obj_l1: "11",
    unit: "명",
    frequency: "M",
    original_url: "https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1B040A3",
    topic_keywords: ["서울 인구", "주민등록인구", "총인구", "서울특별시"],
    retrieval_mode: "table-parameter"
  },
  {
    source: "kosis",
    series_name: "주민등록인구 세종 총인구수",
    table_id: "DT_1B040A3",
    item_code: "T20",
    org_id: "101",
    obj_l1: "36",
    unit: "명",
    frequency: "M",
    original_url: "https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1B040A3",
    topic_keywords: ["세종 인구", "세종특별자치시", "주민등록인구", "총인구"],
    retrieval_mode: "table-parameter"
  },
  {
    source: "kosis",
    series_name: "주민등록인구 전국 남자인구수",
    table_id: "DT_1B040A3",
    item_code: "T21",
    org_id: "101",
    obj_l1: "00",
    unit: "명",
    frequency: "M",
    original_url: "https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1B040A3",
    topic_keywords: ["남자인구", "남성 인구", "주민등록인구", "전국"],
    retrieval_mode: "table-parameter"
  },
  {
    source: "kosis",
    series_name: "주민등록인구 전국 여자인구수",
    table_id: "DT_1B040A3",
    item_code: "T22",
    org_id: "101",
    obj_l1: "00",
    unit: "명",
    frequency: "M",
    original_url: "https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1B040A3",
    topic_keywords: ["여자인구", "여성 인구", "주민등록인구", "전국"],
    retrieval_mode: "table-parameter"
  },
  {
    source: "kosis",
    series_name: "주민등록세대수 전국",
    table_id: "DT_1B040B3",
    item_code: "T1",
    org_id: "101",
    obj_l1: "00",
    unit: "세대",
    frequency: "M",
    original_url: "https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1B040B3",
    topic_keywords: ["세대수", "주민등록세대수", "전국 세대수", "가구"],
    retrieval_mode: "table-parameter",
    default_selection: true
  },
  {
    source: "kosis",
    series_name: "주민등록세대수 서울",
    table_id: "DT_1B040B3",
    item_code: "T1",
    org_id: "101",
    obj_l1: "11",
    unit: "세대",
    frequency: "M",
    original_url: "https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1B040B3",
    topic_keywords: ["서울 세대수", "주민등록세대수", "세대수", "서울특별시"],
    retrieval_mode: "table-parameter"
  },
  {
    source: "kosis",
    series_name: "주민등록세대수 세종",
    table_id: "DT_1B040B3",
    item_code: "T1",
    org_id: "101",
    obj_l1: "36",
    unit: "세대",
    frequency: "M",
    original_url: "https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1B040B3",
    topic_keywords: ["세종 세대수", "주민등록세대수", "세대수", "세종특별자치시"],
    retrieval_mode: "table-parameter"
  },
  {
    source: "kosis",
    series_name: "주민등록연앙인구 전국(5세) 총계",
    table_id: "DT_1B040M5",
    item_code: "T10",
    org_id: "101",
    obj_l1: "00",
    obj_l2: "0",
    obj_l3: "000",
    unit: "명",
    frequency: "Y",
    original_url: "https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1B040M5",
    topic_keywords: ["연앙인구", "5세별", "주민등록연앙인구", "전국 인구", "연령별 인구"],
    retrieval_mode: "table-parameter",
    default_selection: true
  },
  {
    source: "kosis",
    series_name: "주민등록인구 전국(1세별) 총계",
    table_id: "DT_1B04006",
    item_code: "T2",
    org_id: "101",
    obj_l1: "00",
    obj_l2: "000",
    unit: "명",
    frequency: "M",
    original_url: "https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1B04006",
    topic_keywords: ["1세별", "주민등록인구", "연령별 인구", "전국 인구"],
    retrieval_mode: "table-parameter",
    default_selection: true
  }
];
