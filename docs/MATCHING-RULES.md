# MATCHING-RULES

이 문서는 `korean-government-api-bundle`의 핵심인 **질문 → provider/tool 매칭 규칙**을 정의합니다.

핵심 원칙:
- API 개수대로 tool을 노출하지 않는다.
- 먼저 사용자의 **intent**를 분류한다.
- 그 다음 적합한 provider 후보를 점수화한다.
- 가능하면 한 tool 내부에서 여러 provider를 orchestration 한다.

---

## 1. Matching pipeline

### step 1. query normalization
입력 질문에서 불필요한 표현을 제거하고 핵심 엔티티를 추출한다.

예:
- "2207018 법안 상태" → bill_no=`2207018`
- "기준금리 시계열" → stat-topic=`기준금리`
- "행정사무의 민간위탁 법률안" → law/bill ambiguity

### step 2. intent classification
질문을 우선 아래 intent 중 하나 이상으로 분류한다.

- `law-search`
- `law-text`
- `bill-search`
- `bill-detail`
- `lawmaking-search`
- `lawmaking-detail`
- `member-search`
- `stat-search`
- `stat-series`
- `stat-compare`
- `dataset-search`
- `dataset-metadata`
- `policy-news`
- `weather`
- `real-estate-series`

### step 3. entity resolution
질문에서 의미 있는 식별자를 잡는다.

예:
- 법령명
- MST / 법령 ID
- 의안번호 / BILL_ID
- 국민참여입법센터 category / item_id / mapping_id / announce_type
- 의원명 / 위원회명
- 통계표코드 / 항목코드
- stat series identifier 2개 이상
- dataset id / service id
- 기관명 / 지역명 / 날짜 범위

### step 4. provider scoring
intent와 entity를 바탕으로 provider 후보를 점수화한다.

예:
- bill_no가 있으면 `열린국회정보` 점수 최상위
- lawmaking category + item_id가 있으면 `국민참여입법센터` 점수 최상위
- MST가 있으면 `법제처` 점수 최상위
- table_id + item_code면 `ECOS` 또는 `KOSIS`
- stat series identifier가 2개 있으면 `compare_stat_series`
- dataset/service id면 `공공데이터포털`

### step 5. orchestration
필요하면 1개 tool 안에서 여러 provider/endpoint를 함께 호출한다.

예:
- `get_bill_detail`
  - `ALLBILL`
  - `BILLINFODETAIL`
  - `BPMBILLSUMMARY`
- `get_law_text`
  - `lawSearch.do`
  - `lawService.do`
  - 필요 시 `eflaw`

### step 6. normalization
최종 반환은 provider별 raw 응답이 아니라 공통 형식으로 바꾼다.

---

## 2. Scoring heuristics

### identifier direct hit
명시적 identifier가 있으면 최고 우선순위
- `2207018` → bill
- `722Y001` → stat table
- `MST=...` → law

### domain keyword hit
질문 안의 단어로 domain 가중치 부여
- 법령, 조문, 시행령 → law
- 법안, 의안, 위원회 → assembly
- 입법현황, 입법예고, 행정예고, 법령해석례, 의견제시사례 → lawmaking
- 통계, 시계열, 금리, CPI → stats
- 비교, 격차, 차이, 비율 + 통계 → stat-compare
- 데이터셋, 공공데이터포털 → dataset

### provider-specific vocabulary
provider 고유 어휘를 보면 추가 가중치
- `본회의`, `행안위`, `의안번호` → assembly
- `법제처심사`, `입법예고`, `행정예고`, `의견제시`, `해석례` → lawmaking
- `공포`, `시행`, `조문` → law
- `통계표코드`, `항목코드` → ecos/kosis
- `비교`, `격차`, `차이`, `ratio`, `spread` → stat-compare

### ambiguity resolution
하나의 질문이 여러 domain에 걸리면 다음 순서로 정리
1. explicit identifier
2. explicit source keyword
3. user-facing tool priority
4. fallback suggestion

---

## 3. Tool-level routing rules

### `search_law`
- primary provider: 법제처
- trigger:
  - 법령명
  - 조문/시행령/법률/부칙 관련 질의

### `get_law_text`
- primary provider: 법제처
- route:
  - law name → search → MST resolve → lawService
  - article_ref 있으면 조문 단위 반환

### `search_bill`
- primary provider: 열린국회정보
- route:
  - bill_no direct hit → `ALLBILL`
  - title/proposer/committee → `ALLBILL`, 필요 시 `ALLBILLV2`

### `get_bill_detail`
- primary provider: 열린국회정보
- route:
  - `BILLINFODETAIL` + `BPMBILLSUMMARY`
  - 필요 시 `ALLBILL`로 상태 보강

### `search_lawmaking_items`
- primary provider: 국민참여입법센터 정보공개활용
- route:
  - explicit `category`가 있으면 해당 endpoint 고정
  - `입법현황`, `법제처심사`, `추진현황` → `gov-status`
  - `입법계획`, `정부입법계획` → `plan`
  - `입법예고` → `notice` 또는 `notice-mod`
  - `행정예고` → `admin-notice`
  - `법령해석례` → `interpretation`
  - `의견제시사례` → `example`

### `get_lawmaking_item_detail`
- primary provider: 국민참여입법센터 정보공개활용
- route:
  - `category + item_id` direct hit
  - notice / admin-notice 계열은 `mapping_id + announce_type`까지 함께 사용
  - rich HTML 본문은 readable text + section-aware summary로 정규화

### `search_stat_series`
- primary providers: ECOS, KOSIS
- route:
  - macro/economic keywords → ECOS 우선
  - demographic/regional/national-stat keywords → KOSIS 우선
  - 애매하면 두 곳 모두 후보 반환

### `get_stat_series`
- primary providers: ECOS, KOSIS
- route:
  - explicit source 있으면 고정
  - source 없으면 identifier pattern으로 판별

### `compare_stat_series`
- primary providers: ECOS, KOSIS, bundle compare layer
- route:
  - `series_a_identifier`, `series_b_identifier` direct hit
  - 각 identifier를 `get_stat_series` 입력 shape로 복원
  - 공통 시점 inner join으로 비교
  - `difference = B - A`, `ratio = B / A`

### `search_public_dataset`
- primary provider: 공공데이터포털
- route:
  - dataset query 기반 metadata 검색
  - 필요 시 format / API 제공 여부 가중치 반영

### `get_dataset_metadata`
- primary provider: 공공데이터포털
- route:
  - dataset_id / service_id direct hit

---

## 4. Response normalization rules

모든 tool 응답은 최소 아래 필드를 포함한다.

- `source`
- `provider`
- `tool`
- `query`
- `identifier`
- `summary`
- `original_url`
- `fetched_at`

가능하면 아래도 포함한다.
- `confidence`
- `matched_by` (identifier / keyword / fallback)
- `alternatives`

---

## 5. Ambiguous query policy

애매한 질문은 억지로 하나로 단정하지 않는다.

예:
- "민간위탁 현황" → 법령 / 법안 / 데이터셋 모두 가능

정책:
1. 가장 가능성 높은 1개를 대표 결과로 반환
2. 나머지는 `alternatives`로 함께 제시
3. 원하면 비교 질의로 이어갈 수 있게 한다

---

## 6. Long-term direction

이 저장소의 장기적 경쟁력은 provider 수보다,
**질문을 적절한 source에 연결하는 matching precision**에 있다.

즉, 구현의 중심은
- adapter 수집
- routing
- normalization
- fallback orchestration
에 놓인다.
