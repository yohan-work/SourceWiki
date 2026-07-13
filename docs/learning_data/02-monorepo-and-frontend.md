# 02. 모노레포와 프론트엔드

## 먼저 생각해 보기

Web과 API가 서로 다른 앱이라면, 이메일 형식 같은 규칙은 어디에 한 번만 적어야 할까?

## 핵심 해설

이 저장소는 `pnpm workspace` 기반 모노레포다. 하나의 Git 저장소 안에 독립 실행 앱과 공용 패키지를 둔다.

```text
apps/web       Next.js + React: 사용자가 보는 화면
apps/api       Express + Prisma: HTTP API와 업무 규칙
packages/shared Zod schema + TypeScript type: 두 앱의 공용 약속
```

`packages/shared`의 Zod schema는 “올바른 이메일, 비밀번호 길이, 요청 형태”를 한 번 정의하고 Web과 API가 함께 쓰게 한다. Web의 검증은 빠른 안내이고, API의 검증은 신뢰 경계에서의 최종 확인이다.

| Web 기술 | 이 프로젝트에서의 쓰임 |
| --- | --- |
| Next.js | 페이지와 서버 측 처리, 개발 중 API rewrite |
| React | 입력값과 화면 상태 표현 |
| React Hook Form | 가입·로그인·자료 작성 폼 관리 |
| React Query | 현재 사용자 같은 서버 데이터를 캐시·갱신 |

개발 중에는 Next.js가 `/api/*`를 `localhost:4000` API로 전달한다. 운영에서는 Caddy가 같은 역할을 한다. 그래서 브라우저는 한 도메인만 상대한다.

## 이해 점검

**Q. Web에서 이미 이메일을 검사하는데 API도 검사하는 이유는?**  
**A.** 브라우저 검사는 사용자가 우회할 수 있다. API 검사가 실제 데이터 저장의 기준이다.

## 흔한 오해

모노레포는 앱을 하나로 합치는 방식이 아니다. 실행 책임은 Web과 API에 남기고, 변경을 함께 관리하는 방식이다.

## 코드 따라가기

- `apps/web/src/app/layout.tsx`: 모든 화면을 `QueryProvider`로 감싼다. 즉, 페이지마다 따로 상태 저장소를 만들지 않고 하나의 QueryClient를 공유한다.
- `apps/web/src/features/auth/login-form.tsx`: React Hook Form과 shared Zod schema로 입력을 확인하고, 로그인 성공 시 `['auth', 'me']` 캐시를 즉시 갱신한다.
- `apps/web/src/features/sources/source-form.tsx`: 자료 생성·수정 뒤 목록/파일 query를 무효화해 오래된 화면을 다시 가져오게 한다.

다음 장 [13. Frontend 상태관리와 데이터 흐름](./13-frontend-state-and-data-flow.md)에서 이 선택을 발표 질문 기준으로 자세히 다룬다.
