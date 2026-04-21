# 설치 방법

`korean-government-api-bundle`는 MCP + CLI 실행 표면을 목표로 하는 저장소입니다.

이제 초기 scaffold를 넘어서 **법령 + 국회 축 working tools** 가 구현된 상태입니다.

## 현재 상태
- repo bootstrap 완료
- 문서화 완료
- provider registry 코드화 완료
- config loader 추가 완료
- 법제처 adapter 기반 `search_law`, `get_law_text` 구현 및 CLI 검증 완료
- 열린국회정보 기반 `search_bill`, `get_bill_detail` 구현 및 CLI 검증 완료
- 국민참여입법센터 기반 `search_lawmaking_items`, `get_lawmaking_item_detail` 구현 및 CLI 검증 완료
- ECOS 기반 `search_stat_series`, `get_stat_series` 구현 및 CLI 검증 완료
- KOSIS demographic slice 확장 기반 `search_stat_series`, `get_stat_series` 구현 및 CLI 검증 완료
- 공공데이터포털 기반 `search_public_dataset`, `get_dataset_metadata` 구현 및 CLI 검증 완료

## 목표 설치 흐름
향후에는 아래 순서를 기본으로 합니다.

1. 저장소 clone
2. 의존성 설치
3. `.env` 또는 시크릿 경로 준비
4. CLI 로컬 테스트
5. MCP 서버 stdio 실행
6. Claude Desktop / Cursor / OpenClaw 연결

## 예상 명령 흐름
```bash
git clone https://github.com/hosungseo/korean-government-api-bundle.git
cd korean-government-api-bundle
npm install
npm run build
LAW_OC=your_oc_here node dist/cli/index.js search-law "행정기본법" --limit 3
LAW_OC=your_oc_here node dist/cli/index.js get-law-text --law-name 행정기본법 --article 제1조
ASSEMBLY_API_KEY=your_key_here node dist/cli/index.js search-bill --bill-no 2207018
ASSEMBLY_API_KEY=your_key_here node dist/cli/index.js get-bill-detail --bill-no 2207018
LAWMAKING_OC=your_oc_here node dist/cli/index.js search-lawmaking-items --category gov-status --agency-code 1741000 --status-code EA02 --limit 5
LAWMAKING_OC=your_oc_here node dist/cli/index.js get-lawmaking-item-detail --category gov-status --item-id 2000000324302
LAWMAKING_OC=your_oc_here node dist/cli/index.js search-lawmaking-items --category plan --year 2026 --agency-code 1741000 --limit 5
LAWMAKING_OC=your_oc_here node dist/cli/index.js search-lawmaking-items --category notice --agency-code 1741000 --limit 5
LAWMAKING_OC=your_oc_here node dist/cli/index.js get-lawmaking-item-detail --category notice --item-id 86344 --mapping-id 2000000319636 --announce-type TYPE5
LAWMAKING_OC=your_oc_here node dist/cli/index.js search-lawmaking-items --category notice-mod --agency-code 1741000 --limit 5
LAWMAKING_OC=your_oc_here node dist/cli/index.js search-lawmaking-items --category admin-notice --agency-name 행정안전부 --limit 5
LAWMAKING_OC=your_oc_here node dist/cli/index.js get-lawmaking-item-detail --category admin-notice --item-id 46444 --mapping-id 2000000325462 --announce-type TYPE6
LAWMAKING_OC=your_oc_here node dist/cli/index.js search-lawmaking-items --category interpretation --agency-code 1741000 --limit 5
LAWMAKING_OC=your_oc_here node dist/cli/index.js get-lawmaking-item-detail --category interpretation --item-id 444468
LAWMAKING_OC=your_oc_here node dist/cli/index.js search-lawmaking-items --category example --query 지방자치 --limit 5
LAWMAKING_OC=your_oc_here node dist/cli/index.js get-lawmaking-item-detail --category example --item-id 2026000014
node dist/cli/index.js search-stat-series 기준금리 --source ecos --limit 3
ECOS_API_KEY=your_key_here node dist/cli/index.js get-stat-series --source ecos --table 722Y001 --item 0101000 --start 202501 --end 202504
node dist/cli/index.js search-stat-series 총인구 --source kosis --limit 3
node dist/cli/index.js get-stat-series --source kosis --table DT_1IN1502 --start 2022 --end 2024
KOSIS_API_KEY=your_key_here node dist/cli/index.js get-stat-series --source kosis --table DT_1B040A3 --item T20 --obj-l1 36 --start 202401 --end 202403
node dist/cli/index.js search-public-dataset 주민등록 인구 --limit 5
node dist/cli/index.js get-dataset-metadata --dataset-id 15108065
```

## MCP 실행 목표 예시
```bash
npm run mcp
```

실제 MCP 연결 확인은 stdio client에서 `tools/list`, `tools/call` handshake가 되어야 합니다.
개발용으로는 아래 catalog 확인 스크립트를 함께 둡니다.

```bash
npm run mcp:list-tools
```

## 현재 구현 범위 주의
지금은 `search_law`, `get_law_text`, `search_bill`, `get_bill_detail`, `search_lawmaking_items`, `get_lawmaking_item_detail`, `search_stat_series`, `get_stat_series`, `search_public_dataset`, `get_dataset_metadata`가 실제 동작합니다.
통계 축은 ECOS 전체와 KOSIS demographic slice 확장본까지 동작합니다. KOSIS table-selection 조회는 `KOSIS_API_KEY`가 있어야 합니다.
국민참여입법센터 축은 현재 `gov-status`, `plan`, `notice`, `notice-mod`, `admin-notice`, `interpretation`, `example` category를 지원합니다.
