# Assembly smoke checklist

`ASSEMBLY_API_KEY`를 확보한 직후, `korean-government-api-bundle`에서 열린국회 축이 실제로 살아 있는지 최소 비용으로 검증하는 체크리스트다.

## 목적

- 구현 여부가 아니라 **실키 환경에서 실제 응답**을 확인한다.
- `search_bill` → `get_bill_detail` 기본 축이 끊기지 않았는지 확인한다.
- 실패 시 다음 행동을 바로 남긴다.

## 사전 조건

- 저장소 위치: `/Users/seohoseong/.openclaw/workspace/korean-government-api-bundle`
- 환경변수: `ASSEMBLY_API_KEY`
- 기본 빌드 통과 상태

## 0) 기본 확인

```bash
cd /Users/seohoseong/.openclaw/workspace/korean-government-api-bundle
npm run build
```

## 1) 법안 검색 스모크

```bash
ASSEMBLY_API_KEY=*** kgab search-bill --bill-no 2207018
```

성공 기준(최소):
- JSON 응답이 내려온다.
- 최소 1건 이상의 후보가 나온다(또는 no-match 구조가 정상적으로 내려온다).
- `bill_no`/`bill_id`/status 계열 핵심 필드가 비어 있지 않다.

## 2) 법안 상세 스모크

1단계 결과의 `bill_no` 또는 `bill_id`를 사용한다.

```bash
ASSEMBLY_API_KEY=*** kgab get-bill-detail --bill-no 2207018
```

성공 기준(최소):
- JSON 응답이 내려온다.
- 상태/타임라인/요약 계열 필드가 구조적으로 존재한다.
- source URL 또는 식별자가 비어 있지 않다.

## 3) 번들 라우팅 스모크(질문 중심)

```bash
ASSEMBLY_API_KEY=*** kgab resolve-source-bundle "2207018 법안 상태"
ASSEMBLY_API_KEY=*** kgab run-resolved-bundle "2207018 법안 상태"
```

성공 기준(최소):
- resolve 결과가 열린국회 축으로 라우팅된다.
- run-resolved가 추가 입력 없이 실행 가능하거나, 필요한 입력을 명확히 제시한다.

## 실패 시 로그 템플릿

아래 형식으로 `inbox/korean-government-api-bundle-next-step.md` 또는 daily memory에 남긴다.

- command:
- observed error:
- likely cause:
- next action (one line):

예시:
- command: `ASSEMBLY_API_KEY=*** kgab search-bill --bill-no 2207018`
- observed error: 401 Unauthorized
- likely cause: 키 권한 범위/발급 상태 문제
- next action: 열린국회 키 발급 계정에서 API 이용승인 상태와 IP 제한 여부 확인

## 완료 판정

아래 3개가 모두 충족되면 열린국회 축 스모크는 완료로 본다.

1. `search-bill` 정상 응답
2. `get-bill-detail` 정상 응답
3. `resolve-source-bundle`/`run-resolved-bundle` 질문 중심 경로 정상 확인
