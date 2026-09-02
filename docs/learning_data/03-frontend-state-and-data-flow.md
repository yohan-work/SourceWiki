# 03. Frontend 상태관리와 데이터 흐름

## 이 장에서 답할 수 있게 되는 것

- 상태 관리 라이브러리로 무엇을 왜 골랐는가
- 어떤 데이터를 어디에 두는가
- 자료를 저장하면 목록이 어떻게 저절로 갱신되는가

## 먼저 생각해 보기

로그인 사용자 정보와 “현재 열려 있는 입력창의 닉네임”은 둘 다 상태다. 그런데 왜 같은 도구에 넣지 않을까?

## 핵심 결론

이 프로젝트는 Redux나 Zustand 같은 별도 전역 Store를 사용하지 않는다. **서버에서 온 데이터는 TanStack Query**, **화면 안에서만 잠깐 필요한 값은 React `useState` 또는 React Hook Form**으로 나눈다.

```mermaid
flowchart LR
  API[API의 최신 데이터] --> Q[TanStack Query 캐시]
  Q --> H[useMeQuery / useQuery]
  H --> UI[헤더·폼·목록]
  UI --> M[useMutation]
  M --> API
  M -->|성공| I[캐시 갱신·무효화]
  L[입력값·로딩 버튼·미리보기] --> R[useState / React Hook Form]
```

## 어떤 데이터를 어디에 두는가?

| 데이터 | 위치 | 이유 |
| --- | --- | --- |
| 현재 로그인 사용자 | Query key `['auth', 'me']` | 서버의 `/api/auth/me`가 진실의 원천 |
| 자료 목록/상세/파일 | feature별 Query key | 여러 화면이 재사용하고 최신화가 필요 |
| 폼 입력값·필드 오류 | React Hook Form | 현재 화면에서만 의미 있고 검증과 연결됨 |
| 로그아웃 진행 중 여부 | `useState` | 버튼 UI만 위한 짧은 상태 |
| URL 추출 미리보기·선택 파일 | `useState` | 저장 전 임시 데이터 |

`QueryProvider`는 `apps/web/src/lib/query/query-provider.tsx`에서 루트 layout에 한 번 등록된다. 기본 query는 한 번 재시도하고, 창에 다시 포커스되어도 자동 재요청하지 않는다. mutation은 자동 재시도하지 않는다. 사용자가 의도하지 않은 자료 생성·수정을 반복하지 않기 위해서다.

## 로그인 상태가 화면에 전달되는 과정

`useMeQuery`는 `/api/auth/me`를 조회하고 성공한 사용자 데이터를 캐시한다. 401은 예외 화면이 아니라 “현재 로그인하지 않음”으로 해석해 `null`을 반환한다. 헤더의 `AuthActions`, 프로필 폼, 자료 작성 폼이 같은 query key를 읽으므로 서로 같은 로그인 상태를 본다.

로그인 성공 시 `login-form.tsx`는 응답의 사용자 데이터를 `['auth', 'me']`에 바로 저장한다. 로그아웃은 서버에 요청한 다음 그 캐시를 `null`로 바꾼다. 따라서 전체 페이지를 새로 고치지 않아도 헤더가 즉시 변한다.

## 자료 변경 후 왜 invalidate하는가?

자료 생성/수정 성공 뒤 `source-form.tsx`는 자료 목록과 파일 query를 무효화한다. 이전 목록을 그대로 보여 주면 방금 만든 자료가 없거나 오래된 제목이 보일 수 있기 때문이다. TanStack Query는 “서버 데이터가 바뀌었다”는 사실을 캐시에 알리고 필요한 화면에서 다시 가져오게 한다.

### 캐시를 구분하는 이름표 — query key

TanStack Query는 데이터를 **key**로 구분해 보관한다. 이 프로젝트가 쓰는 key는 다음과 같다.

| 데이터 | query key | 정의 위치 |
| --- | --- | --- |
| 로그인 사용자 | `['auth', 'me']` | `apps/web/src/features/auth/use-me-query.ts` |
| 자료 목록(전체) | `['sources']` | `apps/web/src/features/sources/source-api.ts` |
| 조건별 목록 | `['sources', { page, limit, q, tag, type }]` | 위와 같음 |
| 자료 상세 | `['source', id]` | 위와 같음 |
| 자료의 파일 | `['source', id, 'files']` | 위와 같음 |
| 자료의 댓글 | `['comments', id]` | 위와 같음 |
| 사용자 프로필 | `['user', id]` | `apps/web/src/features/users/user-api.ts` |

**무효화는 앞에서부터 일치하면 함께 적용된다.** `['sources']`를 무효화하면 어떤 페이지·필터의 목록이 열려 있든 모두 갱신 대상이 된다. 그래서 자료를 저장할 때 지금 보고 있는 필터 조건을 몰라도 목록을 갱신할 수 있다. 자세한 규칙과 예외는 [09b장](./09b-source-crud-complete-trace.md)에서 다룬다.

### 다시 가져오기와 즉시 덮어쓰기

| | `invalidateQueries` | `setQueryData` |
| --- | --- | --- |
| 하는 일 | 낡았다고 표시해 **다시 가져오게** 함 | 캐시 값을 **즉시 덮어씀** |
| 서버 요청 | 발생함 | 발생하지 않음 |
| 예 | 자료 저장·삭제 후 목록 | 로그인 직후 `['auth', 'me']` |

로그인 직후 헤더 닉네임이 깜빡임 없이 바뀌는 이유가 후자다. 로그인 응답에 사용자 정보가 이미 들어 있어 다시 물어볼 필요가 없다.

## 발표 답변 카드

### 상태 관리는 어떤 라이브러리를 사용했나요?

**30초 답변:** “전역 Store 라이브러리 대신 TanStack Query를 서버 상태 관리에 사용했습니다. 로그인 사용자, 자료 목록·상세처럼 API가 진실의 원천인 데이터는 Query cache에 두고, 폼 입력값이나 버튼 로딩 상태처럼 화면에만 필요한 값은 React Hook Form과 `useState`로 분리했습니다.”

**코드 근거:** `QueryProvider`, `useMeQuery`, `source-form.tsx`의 `useQuery`/`useMutation`.

### 왜 Redux/Zustand가 아니라 TanStack Query인가요?

**답변:** “이 프로젝트의 공유 상태 대부분은 서버 데이터입니다. TanStack Query는 fetch, caching, loading/error 상태, mutation 뒤 재검증을 한 흐름으로 제공하므로 별도 전역 Store에 API 결과를 중복 보관할 필요가 없었습니다. 복잡한 전역 UI 상태가 추가되면 그때 Zustand 같은 도구를 검토할 수 있습니다.”

### 꼬리 질문: 로그인 토큰도 Query에 저장하나요?

**답변:** “아닙니다. 토큰 원문은 JavaScript 메모리나 Query cache에 저장하지 않습니다. 서버가 `httpOnly` 쿠키로 관리하고, Query에는 `/me` 응답의 사용자 정보만 저장합니다.”

## 이해 점검

**Q. `['auth', 'me']`를 로그아웃 때 null로 바꾸는 이유는?**  
**A.** 서버 쿠키 삭제가 성공한 직후 화면도 즉시 비로그인 상태로 맞추기 위해서다. 다음 `/me` 조회도 서버의 쿠키 상태를 다시 확인한다.

## 현재 구현의 한계와 개선 방향

목록 query는 feature별로 관리되며, 전역 UI 상태가 복잡하지 않아 별도 client store는 없다. 알림 큐, 다중 탭 편집 상태, 오프라인 동기화가 커지면 UI store 도입 기준을 다시 세워야 한다.

---

다음 장 → [03b. 서버 렌더링과 화면 이어받기(hydration)](./03b-server-rendering-and-hydration.md)
