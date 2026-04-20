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

## 어떤 일을 하게 될까
| Tool | 설명 | 사용자 로그인 |
| --- | --- | --- |
| `search_law` | 법령명/키워드로 법령 검색 | 불필요 |
| `get_law_text` | 법령 원문 또는 조문 조회 | 불필요 |
| `search_bill` | 의안번호/의안명/제안자/위원회 기준 법안 검색 | 불필요 |
| `get_bill_detail` | 특정 법안의 상태, 타임라인, 제안이유/주요내용 조회 | 불필요 |
| `search_stat_series` | ECOS/KOSIS 통계 시계열 후보 검색 | 불필요 |
| `get_stat_series` | 특정 통계 시계열 값 조회 | 불필요 |
| `search_public_dataset` | 공공데이터포털 데이터셋 검색 | 불필요 |
| `get_dataset_metadata` | 데이터셋 메타데이터 상세 조회 | 불필요 |

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

## 시작 순서
1. 저장소 구조와 문서를 먼저 읽습니다.
2. `docs/setup.md`와 `docs/security-and-secrets.md`를 확인합니다.
3. provider registry와 matching 구조를 고정합니다.
4. 첫 working tool(`search_law`)부터 구현합니다.

## Design principles
- provider-first가 아니라 **question-first tools**
- 모든 응답은 **source-first**
- 자연어 요약 + structured payload 동시 제공
- 원문 URL, identifier, fetched_at 포함
- 추후 verify / compare 계열 도구 확장 가능

## Docs
| 문서 | 설명 |
| --- | --- |
| `docs/install.md` | 설치/실행 흐름 초안 |
| `docs/setup.md` | 공통 설정 가이드 |
| `docs/security-and-secrets.md` | 시크릿/로깅/보안 원칙 |
| `docs/sources.md` | 출처 및 참고 표면 |
| `docs/roadmap.md` | 구현 로드맵 |
| `docs/MVP.md` | MVP 범위와 도구 정의 |
| `docs/TOOL-SCHEMA.md` | 도구 입력/출력 contract |
| `docs/SOURCE-MAP.md` | provider 역할 요약 |
| `docs/SOURCE-REGISTRY.md` | core/expansion provider registry |
| `docs/MATCHING-RULES.md` | 질문 → provider 매칭 규칙 |
| `docs/TOOL-PROVIDER-MAPPING.md` | tool ↔ raw endpoint 매핑 |

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

현재는 아래 3층 구조를 기준으로 설계 중입니다.
1. raw provider adapters
2. matching / routing / normalization layer
3. MCP + CLI tool surface

구현 우선순위는 다음과 같습니다.
1. 법제처
2. 열린국회정보
3. ECOS
4. KOSIS
5. 공공데이터포털
