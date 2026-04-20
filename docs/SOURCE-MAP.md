# SOURCE-MAP

## Providers

### 법제처 국가법령정보
- role: 법령 검색 / 본문 조회
- planned tools: `search_law`, `get_law_text`

### 열린국회정보
- role: 의안 검색 / 상세 타임라인 / 제안이유 요약
- planned tools: `search_bill`, `get_bill_detail`

### 국민참여입법센터 정보공개활용
- role: 입법현황 / 입법계획 / 입법예고 / 행정예고 / 법령해석례 / 의견제시사례 조회
- planned tools: `search_lawmaking_items`, `get_lawmaking_item_detail`
- current categories:
  - `gov-status`
  - `plan`
  - `notice`
  - `notice-mod`
  - `admin-notice`
  - `interpretation`
  - `example`

### 행정안전부 관보 API
- role: 관보 공고/고시/입법예고 metadata 검색
- planned tools: `search_gazette_items`

### ECOS
- role: 경제통계 시계열 조회 및 비교 입력 후보 제공
- planned tools: `search_stat_series`, `get_stat_series`

### KOSIS
- role: 국가통계 시계열 및 항목 조회, 비교 입력 후보 제공
- planned tools: `search_stat_series`, `get_stat_series`

### bundle compare layer
- role: 두 stat series를 공통 시점으로 정렬하고 차이/비율 계산
- planned tools: `compare_stat_series`

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
