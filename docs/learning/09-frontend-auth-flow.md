# 09. 프론트엔드 인증 상태와 화면

## 인증 화면 구조

Phase 2에서 추가한 route는 다음과 같습니다.

```text
/signup                  회원가입
/verify-email/pending    인증 메일 발송 안내와 재전송
/verify-email            token 처리 결과
/login                   로그인
```

화면 route와 동작 코드를 분리했습니다.

```text
apps/web/src/app/...
  route와 화면 배치

apps/web/src/features/auth/...
  form, API 호출, auth query

apps/web/src/lib/api/...
  공통 fetch와 오류·refresh 처리
```

## React Hook Form과 Zod

회원가입과 로그인 form은 React Hook Form으로 입력 상태와 submit 상태를 관리합니다. Zod resolver는 API와 공유하는 schema를 form 검증에 연결합니다.

```text
사용자 입력
  ↓ React Hook Form
공유 Zod schema 검사
  ↓
성공: API 요청
실패: field 아래 오류 표시
```

회원가입 화면만 필요한 `passwordConfirm`은 프론트 form schema에서 추가합니다. API에는 확인값을 보내지 않고 실제 `password`만 보냅니다.

## 공통 API client

`apiFetch`는 인증 화면마다 반복될 수 있는 처리를 한곳에 둡니다.

```text
JSON 직렬화
credentials: include
10초 timeout
공통 오류 parsing
401 refresh와 원 요청 재시도
```

API 오류는 `ApiError`로 변환합니다.

```text
status
code
message
fieldErrors
requestId
```

`fieldErrors.email` 같은 값은 form의 해당 field에 연결하고, 일반 오류는 form 상단에 유지합니다.

## TanStack Query와 `/auth/me`

로그인 사용자의 기준은 `useMeQuery`입니다.

```text
useMeQuery
  ↓
GET /api/auth/me
  ↓
사용자 응답: 로그인 상태
401 응답: 비로그인 상태
```

상태는 세 단계로 생각해야 합니다.

```text
loading        아직 /me 확인 중
authenticated 사용자 정보 있음
anonymous     사용자 정보 없음
```

확인 중에 로그인 버튼을 먼저 보여주면 잠시 후 닉네임으로 바뀌는 깜빡임이 생깁니다. 그래서 header는 loading 동안 skeleton을 표시합니다.

## 로그인 후 query 갱신

로그인 성공 응답에는 사용자 요약이 들어 있습니다. 이를 `['auth', 'me']` cache에 바로 넣습니다.

```text
로그인 성공
  ↓
Query cache에 사용자 저장
  ↓
header가 닉네임·로그아웃 상태로 변경
```

로그아웃 성공 시 같은 cache를 `null`로 바꿉니다.

JWT 원문은 Query cache, Zustand, localStorage 어디에도 저장하지 않습니다.

## access 만료와 single-flight refresh

access token이 만료되면 여러 API가 동시에 401을 받을 수 있습니다.

잘못 구현하면 요청 수만큼 refresh가 실행됩니다.

```text
요청 A 401 ─→ refresh
요청 B 401 ─→ refresh
요청 C 401 ─→ refresh
```

refresh token은 매번 회전하므로 동시 refresh는 이전 token 재사용으로 오해될 수 있습니다. 그래서 공통 promise 하나만 사용합니다.

```text
요청 A 401 ─┐
요청 B 401 ─┼→ 하나의 refresh promise → 각 원 요청 1회 재시도
요청 C 401 ─┘
```

이를 single-flight refresh라고 합니다.

## 안전한 returnTo

보호 화면에서 로그인으로 이동했다면 로그인 후 원래 경로로 돌아갈 수 있습니다. 단, 외부 사이트로 보내는 open redirect를 막기 위해 `/`로 시작하고 `//`로 시작하지 않는 내부 경로만 허용합니다.

```text
/sources/new       허용
https://evil.test  거부
//evil.test        거부
```

## Server Component와 Client Component

route page는 가능한 Server Component로 유지하고, form·query·button처럼 브라우저 interaction이 필요한 부분만 `'use client'` component로 분리했습니다.

이렇게 하면 전체 화면을 불필요하게 Client Component로 만들지 않고 client bundle 경계를 줄일 수 있습니다.

## 기억할 것

- 서버 상태인 로그인 사용자는 TanStack Query로 관리합니다.
- JWT 원문은 프론트 상태에 저장하지 않습니다.
- `/auth/me`가 로그인 상태의 기준입니다.
- 동시 401은 refresh 하나로 합쳐야 합니다.
- form 오류는 사라지는 toast만 쓰지 않고 field와 form에 유지합니다.
