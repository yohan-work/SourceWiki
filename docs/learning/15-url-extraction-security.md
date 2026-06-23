# 15. URL 본문 추출과 SSRF 방어

## Phase 4에서 추가된 기능

Phase 4의 핵심은 사용자가 URL만 입력해도 서버가 원문 페이지에서 제목과 본문을 미리 가져와 주는 기능입니다.

```text
사용자 URL 입력
  ↓
Web이 API에 preview 요청
  ↓
API가 URL 보안 검증
  ↓
HTML 또는 plain text 다운로드
  ↓
본문 정제
  ↓
등록 폼에 제목·본문 자동 채움
```

중요한 점은 이 기능이 자료를 바로 저장하지 않는다는 것입니다. `POST /api/tools/extract-url`은 저장 전 preview 전용 API이고, 실제 저장은 기존 `POST /api/sources`가 담당합니다.

## 왜 URL 검증이 까다로운가

서버가 사용자가 입력한 URL로 직접 요청을 보내면 SSRF 위험이 생깁니다.

SSRF는 Server-Side Request Forgery의 약자입니다. 쉽게 말하면 사용자가 외부 URL처럼 보이는 값을 넣어 서버가 내부망이나 민감한 주소에 대신 접속하게 만드는 공격입니다.

예를 들어 이런 주소는 외부 공개 문서가 아닙니다.

```text
http://localhost:4000
http://127.0.0.1:5432
http://10.0.0.5/admin
http://169.254.169.254/latest/meta-data
```

브라우저에서 사용자가 직접 접속하는 것과 서버가 접속하는 것은 다릅니다. 서버는 DB, 내부 API, cloud metadata 같은 민감한 네트워크에 접근할 수 있기 때문에 URL 추출 기능은 반드시 보안 검증을 먼저 해야 합니다.

## 새 API 위치

새 endpoint는 다음 위치에 있습니다.

```text
POST /api/tools/extract-url
```

구현 파일은 다음과 같습니다.

```text
apps/api/src/modules/tools/tools.routes.ts
apps/api/src/modules/tools/url-extractor.ts
```

요청 body는 단순합니다.

```json
{
  "url": "https://example.com/article"
}
```

성공 응답은 등록 폼에 채울 수 있는 preview 데이터입니다.

```json
{
  "data": {
    "finalUrl": "https://example.com/article",
    "title": "문서 제목",
    "domain": "example.com",
    "sourceType": "article",
    "rawText": "정제된 본문...",
    "preview": "목록 또는 화면에 보여줄 짧은 미리보기...",
    "truncated": false
  },
  "meta": {
    "requestId": "..."
  }
}
```

## shared schema가 먼저 막는 것

Web과 API가 함께 쓰는 URL 입력 schema는 `packages/shared/src/index.ts`에 있습니다.

```text
extractUrlRequestSchema
extractUrlResponseSchema
publicHttpUrlSchema
```

`publicHttpUrlSchema`는 빠른 1차 검증을 담당합니다.

```text
빈 URL 거부
2,048자 초과 거부
http/https 외 protocol 거부
username/password 포함 URL 거부
localhost, 127.x, 10.x, 192.168.x 같은 명백한 내부 host 거부
```

하지만 이것만으로 SSRF 방어가 끝나지는 않습니다. 도메인이 겉으로는 `example.com`처럼 보여도 DNS 조회 결과가 내부 IP일 수 있기 때문입니다.

그래서 API 내부 extractor가 더 강한 2차 검증을 합니다.

## extractor가 실제로 하는 보안 검증

`url-extractor.ts`는 URL을 요청하기 전에 다음 순서로 검증합니다.

```text
1. WHATWG URL parser로 URL 파싱
2. http 또는 https만 허용
3. username, password, fragment 거부
4. 비표준 port 거부
5. DNS resolve
6. resolve된 모든 A/AAAA 주소가 public IP인지 확인
7. 검증한 IP로 연결
8. redirect가 있으면 Location을 다시 1번부터 검증
```

여기서 `모든 A/AAAA 주소`가 중요합니다.

DNS는 하나의 hostname에 여러 IP를 반환할 수 있습니다. 그중 하나라도 private IP라면 안전하지 않다고 보고 차단합니다.

## IP 검증에 ipaddr.js를 쓰는 이유

IP 주소에는 IPv4만 있는 것이 아닙니다. IPv6도 있고, private, loopback, link-local, multicast, reserved 같은 범위가 많습니다.

이걸 문자열 비교로 직접 처리하면 우회가 생기기 쉽습니다.

그래서 Phase 4에서는 `ipaddr.js`를 사용해 IP를 파싱하고 range를 판단합니다.

```text
ipaddr.js
  ↓
주소 문자열을 실제 IP로 파싱
  ↓
range()로 unicast/public 여부 확인
```

추가로 carrier-grade NAT 대역인 `100.64.0.0/10`도 직접 차단합니다.

## redirect를 자동으로 따라가지 않는 이유

HTTP client가 redirect를 자동으로 따라가게 두면 처음 URL만 검증하고 두 번째 URL은 검증하지 못할 수 있습니다.

공격자는 이런 식으로 우회할 수 있습니다.

```text
https://public.example/start
  ↓ redirect
http://127.0.0.1:4000/private
```

그래서 extractor는 redirect를 자동 추적하지 않습니다.

```text
응답이 3xx이고 Location이 있음
  ↓
Location URL을 다시 파싱
  ↓
DNS와 public IP를 다시 검증
  ↓
최대 3회까지만 이동
```

## 다운로드 제한

본문 추출은 외부 서버에 의존하므로 반드시 제한값이 필요합니다.

현재 제한은 다음과 같습니다.

```text
timeout: 10초
body size: 2MB
redirect: 최대 3회
raw text: 최대 100,000자
minimum text: 200자
Content-Type: text/html 또는 text/plain
```

이 제한은 서버 자원을 보호하고, 너무 큰 파일이나 바이너리 응답을 막기 위한 것입니다.

## HTML 정제 방식

HTML은 그대로 저장하지 않습니다.

```text
HTML 다운로드
  ↓
script, style, nav, form, hidden content 제거
  ↓
Readability로 주 본문 추출
  ↓
연속 공백 정리
  ↓
text만 반환
```

사용한 라이브러리는 다음과 같습니다.

```text
jsdom
@mozilla/readability
```

`jsdom`은 HTML을 DOM처럼 다룰 수 있게 해주고, `Readability`는 기사나 문서의 주 본문을 찾는 데 도움을 줍니다.

## sourceType 추정

추출 API는 URL의 hostname과 path를 보고 `sourceType`을 대략 추정합니다.

```text
github.com          → github
/docs, docs.*       → docs
arxiv.org, .pdf     → paper
/blog, /article     → article
그 외               → other
```

이 값은 자동 분류의 힌트일 뿐입니다. 등록 화면에서 사용자가 직접 바꿀 수 있습니다.

## 실패 code 이해하기

프론트엔드는 HTTP status뿐 아니라 안정적인 error code도 봅니다.

```text
URL_INVALID                 URL 형식이 잘못됨
URL_BLOCKED                 내부망, private IP, 위험한 주소
CONTENT_TYPE_UNSUPPORTED    HTML/plain text가 아님
RESPONSE_TOO_LARGE          2MB 초과
EXTRACTION_TIMEOUT          10초 초과
EXTRACTION_FAILED           본문 추출 실패
```

사용자에게는 너무 기술적인 이유를 그대로 보여주기보다, 입력을 유지한 상태로 직접 붙여넣기나 수동 저장을 할 수 있게 하는 것이 중요합니다.

## 이 기능이 하지 않는 것

MVP에서는 일부러 지원하지 않는 것이 있습니다.

```text
JavaScript 렌더링 페이지
로그인이 필요한 페이지
CAPTCHA
paywall 문서
PDF 본문 파싱
headless browser fallback
```

headless browser를 붙이면 더 많은 사이트를 읽을 수 있지만 공격 표면과 운영 비용이 커집니다. 그래서 Phase 4에서는 안전한 HTML/plain text 추출까지만 구현했습니다.

## 기억할 것

- URL 추출 API는 저장 전 preview 전용입니다.
- shared schema 검증은 1차 방어이고, DNS/IP 검증은 API extractor가 담당합니다.
- redirect는 매 단계 다시 검증해야 합니다.
- 외부 응답은 timeout, body size, Content-Type 제한이 있어야 합니다.
- HTML 원문은 저장하지 않고 정제된 text만 사용합니다.
- 실패해도 사용자는 수동으로 제목과 본문을 입력해 저장할 수 있어야 합니다.
