# 로드맵

## 현재 단계
- repo bootstrap 완료
- MVP 문서화 완료
- source registry / matching rules / tool-provider mapping 정리 완료
- provider registry 코드화 완료
- config loader 추가 완료
- 법제처 adapter 기반 `search_law` 구현 완료
- `law_name → MST resolve → lawService` 흐름의 `get_law_text` 구현 완료

## 다음 구현 순서
### Phase 2
- `search_bill`
- `get_bill_detail`

### Phase 3
- `search_stat_series`
- `get_stat_series`

### Phase 4
- `search_public_dataset`
- `get_dataset_metadata`

## 장기 확장
- member / committee / meeting records 계열 국회 tool 추가
- 법제처 판례 / 해석례 / 연혁법령 확장
- compare / verify 계열 cross-source tool 추가
- OpenClaw / Claude Desktop / Cursor 연결 가이드 정교화
