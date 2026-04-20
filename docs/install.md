# 설치 방법

`korean-government-api-bundle`는 MCP + CLI 실행 표면을 목표로 하는 저장소입니다.

이제 초기 scaffold를 넘어서 **첫 working tool(`search_law`)** 이 구현된 상태입니다.

## 현재 상태
- repo bootstrap 완료
- 문서화 완료
- provider registry 코드화 완료
- config loader 추가 완료
- 법제처 adapter 기반 `search_law` 구현 및 CLI 검증 완료

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
```

## MCP 실행 목표 예시
```bash
npm run mcp
```

## 현재 구현 범위 주의
지금은 `search_law`만 실제 동작합니다.
나머지 tool은 문서와 골격만 존재하므로, 다음 단계 구현이 이어져야 합니다.
