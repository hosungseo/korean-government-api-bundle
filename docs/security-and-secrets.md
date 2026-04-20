# 보안 / 시크릿 정책

`korean-government-api-bundle`는 여러 공공 API를 다루므로, key/secret 관리 원칙이 중요합니다.

## 기본 원칙
- key를 README나 문서 예시에 직접 넣지 않는다.
- 커밋 가능한 파일에 secret를 저장하지 않는다.
- tool output에 secret 값을 노출하지 않는다.
- 가능하면 user-facing 응답에는 original URL과 identifier만 남기고 인증정보는 숨긴다.

## 구분

### 공개 가능
- endpoint URL
- 공개 문서 링크
- dataset id / bill no / MST 같은 공개 식별자
- source/provider 이름

### 비공개
- API key
- serviceKey 원문
- access token
- refresh token
- session cookie

## 로깅 원칙
- 요청 로그에는 provider / endpoint alias / identifier만 남긴다.
- full URL에 secret query parameter가 포함되면 마스킹한다.

## 문서화 원칙
예시는 아래처럼 placeholder를 쓴다.
```bash
ASSEMBLY_API_KEY=your_key_here
ECOS_API_KEY=your_key_here
```

## 향후 확장 시 주의
사용자 로그인형 provider가 들어오면,
- operator secret
- user secret
- session artifact
를 분리 관리해야 합니다.
