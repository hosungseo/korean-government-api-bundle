# TOOL-SCHEMA

## Principles
- 질문 중심 도구로 설계한다.
- 기관별 raw API 호출기는 숨긴다.
- 모든 도구는 `original_url`, `source`, `provider`, `fetched_at`를 반환한다.

---

## 1. search_law
### input
- `query: string`
- `limit?: number`

### output
- `items[].law_name`
- `items[].law_id`
- `items[].mst`
- `items[].ministry`
- `items[].promulgation_date`
- `items[].effective_date`
- `items[].original_url`

---

## 2. get_law_text
### input
- `law_name?: string`
- `mst?: string`
- `article_ref?: string`

### output
- `law_name`
- `article_ref`
- `text`
- `citation`
- `original_url`

---

## 3. search_bill
### input
- `bill_no?: string`
- `bill_name?: string`
- `proposer?: string`
- `committee?: string`
- `age?: string`

### output
- `items[].bill_no`
- `items[].bill_id`
- `items[].bill_name`
- `items[].proposer`
- `items[].committee`
- `items[].status`
- `items[].original_url`

---

## 4. get_bill_detail
### input
- `bill_no?: string`
- `bill_id?: string`

### output
- `bill_no`
- `bill_id`
- `bill_name`
- `summary`
- `timeline`
- `plenary_result`
- `original_url`

---

## 5. search_stat_series
### input
- `query: string`
- `source?: "ecos" | "kosis" | "all"`
- `limit?: number`

### output
- `items[].source`
- `items[].series_name`
- `items[].table_id`
- `items[].item_code`
- `items[].unit`
- `items[].frequency`
- `items[].original_url`

---

## 6. get_stat_series
### input
- `source: "ecos" | "kosis"`
- `table_id: string`
- `item_code?: string`
- `start: string`
- `end: string`

### output
- `source`
- `identifier`
- `unit`
- `frequency`
- `values[]`
- `updated_at`
- `original_url`

---

## 7. search_public_dataset
### input
- `query: string`
- `limit?: number`

### output
- `items[].dataset_title`
- `items[].provider`
- `items[].dataset_id`
- `items[].format`
- `items[].has_api`
- `items[].original_url`

---

## 8. get_dataset_metadata
### input
- `dataset_id?: string`
- `service_id?: string`

### output
- `title`
- `provider`
- `description`
- `format`
- `api_available`
- `download_count`
- `original_url`
