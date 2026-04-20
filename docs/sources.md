# 출처 / 참고 표면

이 저장소는 여러 공공 source를 한 질문 중심 도구 표면으로 묶는 것을 목표로 합니다.

## 핵심 provider
- 법제처 국가법령정보
- 열린국회정보
- 행정안전부 관보 API
- 한국은행 ECOS
- KOSIS 국가통계포털
- 공공데이터포털

## 참고 문서
- `docs/SOURCE-REGISTRY.md` — 연결된 provider registry
- `docs/MATCHING-RULES.md` — 질문 → source 매칭 규칙
- `docs/TOOL-PROVIDER-MAPPING.md` — MCP tool ↔ raw endpoint 매핑
- `docs/TOOL-SCHEMA.md` — 도구 입력/출력 contract

## 설계 참고 방향
이 저장소는 단순 API list보다 아래 철학을 따릅니다.
- question-first tools
- source-first responses
- verification-friendly payloads
- provider orchestration behind a small tool surface

## external inspiration
- `NomaDamas/k-skill`
  - 기능별 문서 분리
  - setup / security / sources 문서 구조
  - 에이전트 친화적 기능 카탈로그 방식

단, `korean-government-api-bundle`은 breadth보다 government/public-data precision을 우선합니다.
