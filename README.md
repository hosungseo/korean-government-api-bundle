# korean-government-api-bundle

`korean-government-api-bundle`는 `ai-readable-government`의 3축 중 **government API bundle**을 담당하는 실행 표면입니다.

- `ai-readable-government` = discovery / framing hub
- `korean-government-api-bundle` = MCP + CLI execution surface

이 저장소의 목적은 공공 API를 기관별 목록으로 늘어놓는 것이 아니라, **질문 중심 도구**로 재구성해 사람과 에이전트가 바로 호출할 수 있게 만드는 것입니다.

## Scope
- 법제처 국가법령정보 API
- 열린국회정보 API
- 한국은행 ECOS API
- KOSIS 국가통계포털 API
- 공공데이터포털 metadata / dataset API

## Interface
### MCP
- Claude Desktop
- Cursor
- OpenClaw
- 기타 MCP 호환 클라이언트

### CLI
```bash
kgab search-law "행정사무 민간위탁"
kgab get-bill-detail 2207018
kgab get-stat-series --source ecos --table 722Y001 --item 0101000
kgab search-public-dataset "주민등록 인구"
```

## MVP tools
1. `search_law`
2. `get_law_text`
3. `search_bill`
4. `get_bill_detail`
5. `search_stat_series`
6. `get_stat_series`
7. `search_public_dataset`
8. `get_dataset_metadata`

## Design principles
- provider-first가 아니라 **question-first tools**
- 모든 응답은 **source-first**
- 자연어 요약 + structured payload 동시 제공
- 원문 URL, identifier, fetched_at 포함
- 추후 verify / compare 계열 도구 확장 가능

## Docs
- `docs/MVP.md`
- `docs/TOOL-SCHEMA.md`
- `docs/SOURCE-MAP.md`

## Suggested structure
```txt
src/
  mcp/
    server.ts
    tools/
  cli/
  providers/
  core/
```

## Status
초기 설계 및 문서화 단계입니다.
구현 우선순위는 다음과 같습니다.
1. 법제처
2. 열린국회정보
3. ECOS
4. KOSIS
5. 공공데이터포털
