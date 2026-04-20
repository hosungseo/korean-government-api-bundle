# TOOL-PROVIDER-MAPPING

이 문서는 MCP tool과 내부 provider/endpoint 연결 관계를 정리한 매핑표입니다.

---

## 1. `search_law`

### external tool purpose
- 법령명 / 키워드로 법령 검색

### internal providers
- 법제처 국가법령정보

### internal endpoints
- `lawSearch.do`

### notes
- `query` 기준 검색
- 결과에서 MST, 법령명, 공포/시행일, 소관부처 추출

---

## 2. `get_law_text`

### external tool purpose
- 특정 법령 원문 또는 특정 조문 조회

### internal providers
- 법제처 국가법령정보

### internal endpoints
- `lawSearch.do`
- `lawService.do`
- 필요 시 `target=eflaw`

### orchestration
1. 입력이 법령명인 경우 검색
2. MST resolve
3. 본문 조회
4. `article_ref` 있으면 조문만 절단

---

## 3. `search_bill`

### external tool purpose
- 의안번호 / 의안명 / 제안자 / 위원회 기준 법안 검색

### internal providers
- 열린국회정보

### internal endpoints
- `ALLBILL`
- 필요 시 `ALLBILLV2`

### notes
- 의안번호 direct hit 우선
- 처리구분이 더 필요하면 V2 보강

---

## 4. `get_bill_detail`

### external tool purpose
- 특정 법안의 상태, 타임라인, 요약 조회

### internal providers
- 열린국회정보

### internal endpoints
- `BILLINFODETAIL`
- `BPMBILLSUMMARY`
- `ALLBILL`

### orchestration
1. bill_no → bill_id resolve
2. `BILLINFODETAIL`로 단계별 처리상황
3. `BPMBILLSUMMARY`로 제안이유/주요내용
4. 필요 시 `ALLBILL`로 상태 보강

---

## 5. `search_stat_series`

### external tool purpose
- 통계 시계열 후보 검색

### internal providers
- ECOS
- KOSIS

### routing rule
- 경제지표 중심 → ECOS 우선
- 국가통계/인구/지역통계 중심 → KOSIS 우선
- 애매하면 병렬 후보 반환

---

## 6. `get_stat_series`

### external tool purpose
- 특정 통계 시계열 값 조회

### internal providers
- ECOS
- KOSIS

### internal endpoints
- ECOS StatisticSearch
- KOSIS OpenAPI series endpoints

### orchestration
- explicit source 있으면 고정
- source 없으면 identifier pattern으로 provider 추정

---

## 7. `search_public_dataset`

### external tool purpose
- 공공데이터포털 데이터셋 검색

### internal providers
- 공공데이터포털

### internal endpoints
- dataset metadata / catalog 계열 API

### notes
- dataset title, provider, format, has_api 중심 반환

---

## 8. `get_dataset_metadata`

### external tool purpose
- 특정 데이터셋 메타데이터 상세 조회

### internal providers
- 공공데이터포털

### internal endpoints
- dataset detail / service detail 계열 API

### notes
- description, provider, format, api availability, original url 반환

---

## 9. Future tool expansion candidates

### assembly extension
- `search_member`
- `get_member_profile`
- `get_committee_schedule`
- `get_bill_meeting_records`

### law extension
- `search_case`
- `search_interpretation`
- `get_historical_law_text`

### cross-source extension
- `compare_stat_series`
- `resolve_source_bundle`
- `verify_citation`

---

## 10. Design conclusion

MCP tool은 적게 유지하고,
내부에서는 여러 endpoint를 조합해 richer result를 반환하는 방향이 기본 원칙이다.
