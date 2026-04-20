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
- ECOS 기반 `search_stat_series`, `get_stat_series` 구현 및 CLI 검증 완료

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
node dist/cli/index.js search-law "행정기본법" --limit 3
node dist/cli/index.js get-law-text --law-name 행정기본법 --article 제1조
ASSEMBLY_API_KEY=your_key_here node dist/cli/index.js search-bill --bill-no 2207018
ASSEMBLY_API_KEY=your_key_here node dist/cli/index.js get-bill-detail --bill-no 2207018
node dist/cli/index.js search-stat-series 기준금리 --source ecos --limit 3
ECOS_API_KEY=your_key_here node dist/cli/index.js get-stat-series --source ecos --table 722Y001 --item 0101000 --start 202501 --end 202504
```

## MCP 실행 목표 예시
```bash
npm run mcp
```

## 현재 구현 범위 주의
지금은 `search_law`, `get_law_text`, `search_bill`, `get_bill_detail`, `search_stat_series`, `get_stat_series`가 실제 동작합니다.
다만 통계 축은 현재 ECOS 중심 working slice이며, KOSIS와 공공데이터 tool은 다음 단계 구현이 이어져야 합니다.
