# 로드맵

## 현재 단계
- repo bootstrap 완료
- MVP 문서화 완료
- source registry / matching rules / tool-provider mapping 정리 완료
- provider registry 코드화 완료
- config loader 추가 완료
- 법제처 adapter 기반 `search_law` 구현 완료
- `law_name → MST resolve → lawService` 흐름의 `get_law_text` 구현 완료
- 열린국회정보 기반 `search_bill` 구현 완료
- `bill_no → BILL_ID resolve → BILLINFODETAIL + BPMBILLSUMMARY` 흐름의 `get_bill_detail` 구현 완료
- ECOS 기반 `search_stat_series` 구현 완료
- ECOS 기반 `get_stat_series` 구현 완료
- KOSIS 초기 demographic slice 기반 `search_stat_series` 구현 완료
- KOSIS 초기 demographic slice 기반 `get_stat_series` 구현 완료
- 공공데이터포털 기반 `search_public_dataset` 구현 완료
- 공공데이터포털 기반 `get_dataset_metadata` 구현 완료

## 다음 구현 순서
### Phase 4
- KOSIS `userStatsId` catalog 확대
- KOSIS table-selection 방식(`orgId`/`tblId`/`objL*`/`itmId`) 지원

### Phase 5
- 공공데이터포털 상세 메타데이터 필드 구조화 강화
- dataset detail page parser 안정화 및 provider normalization

## 장기 확장
- member / committee / meeting records 계열 국회 tool 추가
- 법제처 판례 / 해석례 / 연혁법령 확장
- compare / verify 계열 cross-source tool 추가
- OpenClaw / Claude Desktop / Cursor 연결 가이드 정교화
