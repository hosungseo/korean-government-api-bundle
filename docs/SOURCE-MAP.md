# SOURCE-MAP

## Providers

### 법제처 국가법령정보
- role: 법령 검색 / 본문 조회
- planned tools: `search_law`, `get_law_text`

### 열린국회정보
- role: 의안 검색 / 상세 타임라인 / 제안이유 요약
- planned tools: `search_bill`, `get_bill_detail`

### ECOS
- role: 경제통계 시계열 조회
- planned tools: `search_stat_series`, `get_stat_series`

### KOSIS
- role: 국가통계 시계열 및 항목 조회
- planned tools: `search_stat_series`, `get_stat_series`

### 공공데이터포털
- role: 데이터셋 메타데이터 / API 제공 여부 / 형식 확인
- planned tools: `search_public_dataset`, `get_dataset_metadata`

## Cross-cutting response fields
- `source`
- `provider`
- `query`
- `identifier`
- `summary`
- `original_url`
- `fetched_at`
