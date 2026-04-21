# 공통 설정 가이드

이 문서는 `korean-government-api-bundle`에서 provider별 키와 설정을 어떻게 다룰지 정리합니다.

## 원칙
- 사용자 질문 중심 tool을 노출한다.
- provider별 raw key는 내부 설정층에서 처리한다.
- user-facing tool은 가능하면 provider 차이를 숨긴다.

## 설정 레벨

### 1. operator-managed secrets
운영자가 관리하는 키/식별자
- ECOS key
- 국회 API key
- 공공데이터포털 service key
- 기타 운영 키

### 2. user-supplied secrets
향후 사용자별 로그인이 필요한 provider가 들어올 경우에만 사용
- 현재 MVP 8도구의 core provider는 user login이 필수는 아님

### 3. static config
- provider 우선순위
- fallback 규칙
- endpoint alias
- source labels

## 권장 환경 변수 예시
```bash
ASSEMBLY_API_KEY=...
ECOS_API_KEY=...
DATA_GO_KR_SERVICE_KEY=...
LAW_OC=your_oc_here
LAWMAKING_OC=your_oc_here
KOSIS_API_KEY=...
```

## 권장 config 분리
- `.env` = 로컬 개발용
- `src/core/` = 코드상 static mapping
- `docs/SOURCE-REGISTRY.md` = 사람용 source registry

## 구현 방향
초기에는 provider adapter가 각 환경 변수를 직접 읽기보다,
중앙 config loader를 통해 주입받는 구조가 좋습니다.
