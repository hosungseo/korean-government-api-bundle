# TOOL-SCHEMA

## Principles
- 질문 중심 도구로 설계한다.
- 기관별 raw API 호출기는 숨긴다.
- 모든 도구는 `original_url`, `source`, `provider`, `fetched_at`를 반환한다.

---

## 1. resolve_source_bundle
### input
- `query: string`

### output
- `intent`
- `recommended_provider_id`
- `recommended_provider`
- `recommended_tool`
- `reasoning`
- `entities[]`
- `suggested_input`
- `missing_required_fields[]`
- `suggested_cli`
- `alternatives[]`

---

## 2. search_law
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

## 3. get_law_text
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

## 4. search_bill
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

## 5. get_bill_detail
### input
- `bill_no?: string`
- `bill_id?: string`

### output
- `bill_no`
- `bill_id`
- `bill_name`
- `summary_text`
- `timeline`
- `plenary_result`
- `original_url`

---

## 6. search_lawmaking_items
### input
- `category: "gov-status" | "plan" | "notice" | "notice-mod" | "admin-notice" | "interpretation" | "example"`
- `agency_code?: string`
- `agency_name?: string`
- `law_kind_code?: string`
- `status_code?: string`
- `year?: string`
- `start_date?: string`
- `end_date?: string`
- `query?: string`
- `query_field?: string`
- `limit?: number`

### output
- `items[].category`
- `items[].item_id`
- `items[].title`
- `items[].agency_name`
- `items[].department_name`
- `items[].law_kind`
- `items[].revision_type`
- `items[].status`
- `items[].date`
- `items[].notice_no`
- `items[].mapping_id`
- `items[].announce_type`
- `items[].attachment_name`
- `items[].attachment_url`
- `items[].original_url`

---

## 7. get_lawmaking_item_detail
### input
- `category: "gov-status" | "plan" | "notice" | "notice-mod" | "admin-notice" | "interpretation" | "example"`
- `item_id: string`
- `mapping_id?: string`
- `announce_type?: string`

### output
- `category`
- `item_id`
- `mapping_id`
- `announce_type`
- `title`
- `agency_name`
- `department_name`
- `law_kind`
- `revision_type`
- `status`
- `date`
- `summary_text`
- `body_text`
- `fields[]`
- `attachments[]`
- `original_url`

---

## 8. search_gazette_items
### input
- `query?: string`
- `agency_name?: string`
- `law_name?: string`
- `start_date?: string`
- `end_date?: string`
- `limit?: number`

### output
- `items[].item_id`
- `items[].title`
- `items[].publication_date`
- `items[].publication_agency`
- `items[].gazette_book`
- `items[].document_type`
- `items[].basis_law`
- `items[].is_correction`
- `items[].pdf_url`
- `items[].original_url`

---

## 9. search_stat_series
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

## 10. get_stat_series
### input
- `source: "ecos" | "kosis"`
- `table_id: string`
- `item_code?: string`
- `org_id?: string`
- `obj_l1?: string`
- `obj_l2?: string`
- `obj_l3?: string`
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

## 11. compare_stat_series
### input
- `series_a_identifier: string`
- `series_b_identifier: string`
- `series_a_label?: string`
- `series_b_label?: string`
- `series_a_org_id?: string`
- `series_b_org_id?: string`
- `start: string`
- `end: string`

### output
- `series_a_identifier`
- `series_b_identifier`
- `series_a_label`
- `series_b_label`
- `series_a_original_url`
- `series_b_original_url`
- `series_a_unit`
- `series_b_unit`
- `series_a_frequency`
- `series_b_frequency`
- `overlap_count`
- `latest_time`
- `latest_difference`
- `latest_ratio`
- `points[]`

---

## 12. search_public_dataset
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

## 13. get_dataset_metadata
### input
- `dataset_id?: string`
- `service_id?: string`

### output
- `title`
- `dataset_provider`
- `description`
- `format`
- `api_available`
- `download_count`
- `original_url`
