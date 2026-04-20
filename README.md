# korean-government-api-bundle

`korean-government-api-bundle`는 `ai-readable-government`의 3축 중 **government API bundle**을 담당하는 실행 표면입니다.

- `ai-readable-government` = discovery / framing hub
- `korean-government-api-bundle` = MCP + CLI execution surface

이 저장소의 목적은 공공 API를 기관별 목록으로 늘어놓는 것이 아니라, **질문 중심 도구**로 재구성해 사람과 에이전트가 바로 호출할 수 있게 만드는 것입니다.

## Scope
- 법제처 국가법령정보 API
- 열린국회정보 API
- 국민참여입법센터 정보공개활용 API
- 행정안전부 관보 API
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
| `search_lawmaking_items` | 입법현황/입법계획/입법예고 목록 검색 | `LAWMAKING_OC` 필요 |
| `get_lawmaking_item_detail` | 입법현황/입법계획/입법예고 상세 조회 | `LAWMAKING_OC` 필요 |
| `search_gazette_items` | 관보 공고/고시/입법예고 항목 검색 | `GAZETTE_SERVICE_KEY` 필요 |
| `search_stat_series` | ECOS/KOSIS 통계 시계열 후보 검색 | 불필요 |
| `get_stat_series` | 특정 통계 시계열 값 조회 | 불필요 |
| `compare_stat_series` | 두 통계 시계열을 같은 기간으로 정렬해 비교 | 불필요 |
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
kgab search-law "행정기본법" --limit 3
kgab get-law-text --law-name 행정기본법 --article 제1조
kgab search-bill --bill-no 2207018
kgab get-bill-detail --bill-no 2207018
LAWMAKING_OC=hosung91 kgab search-lawmaking-items --category gov-status --agency-code 1741000 --status-code EA02 --limit 5
LAWMAKING_OC=hosung91 kgab get-lawmaking-item-detail --category gov-status --item-id 2000000324302
LAWMAKING_OC=hosung91 kgab search-lawmaking-items --category plan --year 2026 --agency-code 1741000 --limit 5
LAWMAKING_OC=hosung91 kgab search-lawmaking-items --category notice --agency-code 1741000 --limit 5
LAWMAKING_OC=hosung91 kgab get-lawmaking-item-detail --category notice --item-id 86344 --mapping-id 2000000319636 --announce-type TYPE5
LAWMAKING_OC=hosung91 kgab search-lawmaking-items --category notice-mod --agency-code 1741000 --limit 5
LAWMAKING_OC=hosung91 kgab search-lawmaking-items --category admin-notice --agency-name 행정안전부 --limit 5
LAWMAKING_OC=hosung91 kgab get-lawmaking-item-detail --category admin-notice --item-id 46444 --mapping-id 2000000325462 --announce-type TYPE6
LAWMAKING_OC=hosung91 kgab search-lawmaking-items --category interpretation --agency-code 1741000 --limit 5
LAWMAKING_OC=hosung91 kgab get-lawmaking-item-detail --category interpretation --item-id 444468
LAWMAKING_OC=hosung91 kgab search-lawmaking-items --category example --query 지방자치 --limit 5
LAWMAKING_OC=hosung91 kgab get-lawmaking-item-detail --category example --item-id 2026000014
GAZETTE_SERVICE_KEY=your_key_here kgab search-gazette-items --agency-name 행정안전부 --start-date 2026-04-01 --end-date 2026-04-21 --limit 5
GAZETTE_SERVICE_KEY=your_key_here kgab search-gazette-items --query 입법예고 --agency-name 행정안전부 --limit 5
kgab search-stat-series 기준금리 --source ecos --limit 3
kgab get-stat-series --source ecos --table 722Y001 --item 0101000 --start 202501 --end 202504
kgab compare-stat-series --id-a ecos:722Y001:0101000 --label-a 기준금리 --id-b ecos:121Y006:BECBLA01 --label-b 주택담보대출금리 --start 202401 --end 202404
kgab search-stat-series 총인구 --source kosis --limit 3
kgab get-stat-series --source kosis --table DT_1IN1502 --start 2022 --end 2024
KOSIS_API_KEY=your_key_here kgab get-stat-series --source kosis --table DT_1B040A3 --item T20 --obj-l1 36 --start 202401 --end 202403
kgab search-public-dataset 주민등록 인구 --limit 5
kgab get-dataset-metadata --dataset-id 15108065
```

## 시작 순서
1. 저장소 구조와 문서를 먼저 읽습니다.
2. `docs/setup.md`와 `docs/security-and-secrets.md`를 확인합니다.
3. provider registry와 matching 구조를 확인합니다.
4. `kgab search-law "행정기본법" --limit 3`, `kgab get-law-text --law-name 행정기본법 --article 제1조`, `kgab search-bill --bill-no 2207018`, `kgab search-stat-series 기준금리 --source ecos --limit 3`, `kgab search-public-dataset 주민등록 인구 --limit 5`로 working tool을 테스트합니다.

## Design principles
- provider-first가 아니라 **question-first tools**
- 모든 응답은 **source-first**
- 자연어 요약 + structured payload 동시 제공
- 원문 URL, identifier, fetched_at 포함
- compare / verify 계열 도구로 확장 가능, 현재 `compare_stat_series` 1차 구현 포함

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
초기 설계 단계에서 **첫 working slice**까지 진입했습니다.

현재 구현된 것:
1. provider registry 코드화
2. config loader 추가
3. law/bill/stat resolver 골격 추가
4. 법제처 adapter 기반 `search_law` CLI/MCP 진입점 구현
5. `law_name → MST resolve → lawService` 흐름의 `get_law_text` 구현
6. 열린국회정보 기반 `search_bill` 구현
7. `bill_no → BILL_ID resolve → BILLINFODETAIL + BPMBILLSUMMARY` 흐름의 `get_bill_detail` 구현
8. 국민참여입법센터 기반 `search_lawmaking_items`, `get_lawmaking_item_detail` 구현
9. 행정안전부 관보 API 기반 `search_gazette_items` 구현
10. ECOS 기반 `search_stat_series` 구현
11. ECOS 기반 `get_stat_series` 구현
12. KOSIS demographic slice 확장 기반 `search_stat_series`, `get_stat_series` 구현
13. `compare_stat_series` 구현
14. 공공데이터포털 기반 `search_public_dataset`, `get_dataset_metadata` 구현

현재 구조는 아래 3층을 기준으로 움직입니다.
1. raw provider adapters
2. matching / routing / normalization layer
3. MCP + CLI tool surface

현재 남은 우선순위는 다음과 같습니다.
1. KOSIS coverage를 curated catalog에서 자동 catalog/metadata 기반으로 더 넓히기
2. 공공데이터포털 상세 메타데이터 필드를 더 구조화
3. 국민참여입법센터 detail parser를 section-aware summary/attachment 중심으로 더 정교화
4. 관보 source를 detail / personnel 특화 API까지 확장
5. compare / verify 계열을 lawmaking / dataset 쪽으로 확장
6. provider별 catalog 자동 생성/동기화
