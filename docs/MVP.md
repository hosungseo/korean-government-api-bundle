# MVP

## Repository name
`korean-government-api-bundle`

## Positioning
- `ai-readable-government` = discovery / framing hub
- `korean-government-api-bundle` = MCP + CLI execution surface

## Goal
기관별 API endpoint를 그대로 노출하는 대신, 사람이 실제로 묻는 질문 단위로 도구를 묶는다.

## MVP tools
### 1. search_law
- input: `query`
- output: law list with law name, mst/id, ministry, promulgation date, effective date, original_url

### 2. get_law_text
- input: `law_name | mst`, optional `article_ref`
- output: full law text or article text, citation, original_url

### 3. search_bill
- input: `bill_no | bill_name | proposer | committee`
- output: bill list with bill_no, bill_id, proposer, committee, status, original_url

### 4. get_bill_detail
- input: `bill_no | bill_id`
- output: summary, timeline, plenary result, original_url

### 5. search_stat_series
- input: `query`, optional `source=ecos|kosis`
- output: matching series/table candidates

### 6. get_stat_series
- input: series/table identifiers + period range
- output: values, unit, frequency, updated_at, original_url

### 7. search_public_dataset
- input: `query`
- output: dataset metadata candidates, provider, format, api availability, original_url

### 8. get_dataset_metadata
- input: dataset/service identifier
- output: title, provider, description, format, download/API status, original_url

## Recommended response contract
```json
{
  "source": "ecos",
  "provider": "한국은행",
  "tool": "get_stat_series",
  "query": {},
  "identifier": "ecos:722Y001:0101000",
  "summary": "기준금리 시계열",
  "data": [],
  "original_url": "https://ecos.bok.or.kr/...",
  "fetched_at": "2026-04-20T00:00:00Z"
}
```

## Build order
1. 법제처
2. 열린국회정보
3. ECOS
4. KOSIS
5. 공공데이터포털 metadata
