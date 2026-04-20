# SOURCE-REGISTRY

`korean-government-api-bundle`가 장기적으로 다룰 수 있는 연결 API를 **provider registry** 관점에서 정리한 문서입니다.

핵심 원칙은 다음과 같습니다.
- 연결된 API 수와 MCP 도구 수는 다르다.
- provider는 많이 연결할 수 있어도, tool은 질문 중심으로 압축한다.
- 이 문서는 "무엇이 연결되어 있고, 어떤 intent를 맡을 수 있는가"를 관리하기 위한 registry다.

---

## A. Core bundle providers (1차 본체)

### 1. 법제처 국가법령정보
- role: 법령 검색 / 법령 본문 / 연혁법령 조회
- connected scope:
  - `lawSearch.do`
  - `lawService.do`
  - `target=eflaw` 기반 연혁 검색
- primary intents:
  - law-search
  - law-text
  - law-history
- planned tools:
  - `search_law`
  - `get_law_text`
- future expansion:
  - 판례 / 해석례 / 행정규칙 / 자치법규 / 조약

### 2. 열린국회정보
- role: 의안 / 의원 / 일정 / 회의록 / 위원회 / 보도자료
- connected scope (대표군):
  - `ALLBILL`, `ALLBILLV2`
  - `BPMBILLSUMMARY`, `BILLINFODETAIL`, `BILLRCPV2`
  - `ALLNAMEMBER`, `nwvrqwxyaytdsfvhu`
  - `ALLSCHEDULE`, `NAMEMBERCMITSCHEDULE`, `nttmdfdcaakvibdar`
  - `VCONFBILLCONFLIST`, `VCONFDETAIL`
  - `ninnagrlaelvtzfnt`
  - `OPENSRVAPI`
- primary intents:
  - bill-search
  - bill-detail
  - member-search
  - committee-schedule
  - meeting-records
- planned tools:
  - `search_bill`
  - `get_bill_detail`
- future expansion:
  - `search_member`
  - `get_member_profile`
  - `get_committee_schedule`
  - `get_bill_meeting_records`
  - 표결 / 청원 / 국정감사 / 예결 / 인사청문 계열

### 3. 한국은행 ECOS
- role: 경제통계 시계열 조회
- connected scope:
  - `StatisticSearch`
  - 기준금리 / 주담대금리 / CPI / M2 등 주요 시계열
- primary intents:
  - stat-search
  - stat-series
- planned tools:
  - `search_stat_series`
  - `get_stat_series`

### 4. KOSIS 국가통계포털
- role: 국가통계 시계열 / 항목 기반 조회
- connected scope:
  - 국가통계포털 OpenAPI 전반
- primary intents:
  - stat-search
  - stat-series
- planned tools:
  - `search_stat_series`
  - `get_stat_series`

### 5. 공공데이터포털
- role: 데이터셋 메타데이터 / API 제공 여부 / 형식 식별
- connected scope:
  - dataset metadata / catalog 계열
  - 개별 data.go.kr 서비스와 연결되는 검색/메타 레이어
- primary intents:
  - dataset-search
  - dataset-metadata
- planned tools:
  - `search_public_dataset`
  - `get_dataset_metadata`

---

## B. Connected expansion providers (2차 확장 후보)

이 그룹은 이미 연결 정보나 운영 메모가 있지만, 1차 MVP 8도구에는 직접 포함하지 않을 수 있습니다.

### 정책/뉴스
- 네이버 검색 API
- 정책브리핑 정책뉴스 API

### 행안부 / 정부24 / 분류체계
- 행안부 관보 API
- 행안부 관보 인사 API
- 행안부 주민등록 인구 및 세대현황 API
- 행안부 정부 목적별 분류체계 API
- 행안부 지방자치단체 기능분류체계 API
- 행안부 정부기능별분류체계 API
- 정부24 공공서비스(혜택) 정보 API

### 통계/부동산/국토
- 국토부 아파트 매매 실거래가 API
- 국토부 아파트 전월세 실거래가 API
- 한국부동산원 R-ONE OpenAPI

### 교육/노동/기록
- 학교알리미 API
- 고용24 직업사전 API
- 국가기록원 나라기록물정보 서비스

### 날씨
- 기상청 단기예보 API
- 기상청 중기예보 API

### 기타 운영 메모상 연결
- 경기도 행정기구 및 정원 집계 현황 API

---

## C. Registry dimensions

각 provider는 최소 다음 필드로 관리한다.

- `provider_id`
- `provider_name`
- `domain`
- `source_type` (law / bill / stats / dataset / records / weather ...)
- `supported_intents`
- `key_endpoints`
- `input_entities`
- `response_shape`
- `freshness_model`
- `original_url_pattern`
- `priority`
- `status` (mvp / expansion / experimental)

---

## D. Why this registry matters

이 저장소는 단순 API 모음집이 아니라,
**질문을 가장 적절한 공공 source에 연결하는 resolver**가 되어야 합니다.

따라서 registry는
- 어떤 provider가 어떤 질문을 맡을 수 있는지
- 어떤 도구가 내부적으로 어떤 provider들을 호출하는지
- fallback이 가능한지
를 구조적으로 관리하는 기준점입니다.
