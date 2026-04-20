# 설치 방법

`korean-government-api-bundle`는 MCP + CLI 실행 표면을 목표로 하는 저장소입니다.

현재는 초기 scaffold 단계이므로, 설치보다 **문서 구조와 tool contract** 확인이 우선입니다.

## 현재 상태
- repo bootstrap 완료
- 문서화 완료
- 실제 provider adapter 구현은 진행 전

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
npm run dev
```

## MCP 실행 목표 예시
```bash
npm run mcp
```

## 구현 전 주의
현재는 placeholder 파일만 있으므로 실제 설치성 검증은 아직 끝나지 않았습니다.
설치 문서는 이후 첫 working tool(`search_law`) 구현 시점에 다시 구체화합니다.
