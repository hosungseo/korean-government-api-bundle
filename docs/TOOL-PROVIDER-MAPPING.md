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

## 5. `search_lawmaking_items`

### external tool purpose
- 국민참여입법센터 정보공개활용 목록 검색

### internal providers
- 국민참여입법센터 정보공개활용

### internal endpoints
- `govLmSts`
- `lmPln`
- `ogLmPp`
- `ogLmPpMod`
- `ptcpAdmPp`
- `lsItptEmp`
- `loLsExample`

### routing rule
- `category`에 따라 endpoint 고정
- `gov-status` → 입법현황
- `plan` → 입법계획
- `notice` / `notice-mod` → 입법예고
- `admin-notice` → 행정예고
- `interpretation` → 법령해석례
- `example` → 의견제시사례

### notes
- category별로 허용 필터가 다르므로 provider 내부에서 query param 조합
- `agency_code`와 `agency_name`을 category에 따라 다르게 사용

---

## 6. `get_lawmaking_item_detail`

### external tool purpose
- 국민참여입법센터 정보공개활용 상세 조회

### internal providers
- 국민참여입법센터 정보공개활용

### internal endpoints
- `govLmSts/{lbicId}`
- `lmPln/{lmPlnSeq}`
- `ogLmPp/{ogLmPpSeq}/{mappingLbicId}/{announceType}`
- `ogLmPpMod/{ogLmPpSeq}/{mappingLbicId}/{announceType}`
- `ptcpAdmPp/{ogAdmPpSeq}/{mappingAdmRulSeq}/{announceType}`
- `lsItptEmp/{itmSeq}`
- `loLsExample/{caseSeq}`

### orchestration
1. `category`에 따라 상세 path shape 결정
2. notice / admin-notice 계열은 `mapping_id`, `announce_type`가 추가로 필요
3. rich HTML detail body는 readable text + section-aware summary로 정규화
4. generic portal root link는 attachment에서 제거

---

## 7. `search_gazette_items`

### external tool purpose
- 관보 공고/고시/입법예고 항목 검색

### internal providers
- 행정안전부 관보 API

### internal endpoints
- `ApiTotalService/getApiTotalList`

### orchestration
1. `query`, `agency_name`, `law_name`, `start_date`, `end_date`를 관보 검색 파라미터로 변환
2. `search` / `pblcnSearch` / `lawNmSearch` 조합으로 official metadata 조회
3. `pdfFilePath`를 `https://gwanbo.go.kr` 기준 absolute URL로 정규화

### notes
- 현 단계는 metadata search slice 우선
- detail/personal-appointment 특화 API는 다음 확장 범위

---

## 8. `search_stat_series`

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

## 9. `get_stat_series`

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

## 10. `compare_stat_series`

### external tool purpose
- 두 통계 시계열을 공통 시점으로 정렬해 차이와 비율을 비교

### internal providers
- ECOS
- KOSIS
- bundle compare layer

### orchestration
1. `series_a_identifier`, `series_b_identifier`를 파싱
2. 각 identifier를 `get_stat_series` 입력 shape로 복원
3. 각 source에서 시계열을 가져온 뒤 공통 시점으로 inner join
4. `difference = B - A`, `ratio = B / A` 계산

### notes
- compare 계열 1차 구현은 stat surface부터 시작
- KOSIS identifier만으로 `org_id`가 부족한 경우 override 필드 허용

---

## 11. `search_public_dataset`

### external tool purpose
- 공공데이터포털 데이터셋 검색

### internal providers
- 공공데이터포털

### internal endpoints
- dataset metadata / catalog 계열 API

### notes
- dataset title, provider, format, has_api 중심 반환

---

## 12. `get_dataset_metadata`

### external tool purpose
- 특정 데이터셋 메타데이터 상세 조회

### internal providers
- 공공데이터포털

### internal endpoints
- dataset detail / service detail 계열 API

### notes
- description, provider, format, api availability, original url 반환

---

## 12. Future tool expansion candidates

### assembly extension
- `search_member`
- `get_member_profile`
- `get_committee_schedule`
- `get_bill_meeting_records`

### law extension
- `search_case`
- `search_interpretation`
- `get_historical_law_text`

### lawmaking extension
- category-specific compare / watch tools
- attachment-first parser for 예고문 원문 파일
- notice/example summarization hardening

### gazette extension
- `get_gazette_item_detail`
- 관보 인사발령 특화 search tool
- PDF/HTML readable extraction layer

### cross-source extension
- `resolve_source_bundle`
- `verify_citation`

---

## 13. Design conclusion

MCP tool은 적게 유지하고,
내부에서는 여러 endpoint를 조합해 richer result를 반환하는 방향이 기본 원칙이다.
