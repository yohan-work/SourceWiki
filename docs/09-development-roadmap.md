# 개발 로드맵

## 완료 원칙

각 Phase는 코드 작성뿐 아니라 테스트, 문서, 실행 가능한 demo를 완료해야 끝난다. Core MVP가 배포되기 전 Advanced 기능을 시작하지 않는다. 모든 PR은 lint, typecheck, unit/integration test, build를 통과해야 한다.

## Phase 1 — 프로젝트 기반

- pnpm workspace에 `apps/web`, `apps/api`, `packages/shared`를 구성한다.
- Next.js App Router, Express, Prisma/PostgreSQL, 공유 TypeScript·Zod 설정을 만든다.
- Docker Compose에 reverse proxy, web, api, db를 구성하고 health check를 추가한다.
- `.env.example`에 변수명·용도·필수 여부를 기록하고 실제 secret은 제외한다.
- request ID, 구조화 로그, 공통 오류, `/health/live`, `/health/ready`를 먼저 만든다.

완료 기준: 한 명령으로 로컬 stack이 실행되고 web → API → DB health 흐름과 CI 기본 검사가 통과한다.

## Phase 2 — 인증

- users, email verification tokens, refresh sessions migration을 작성한다.
- 가입, 중복 확인, 이메일 인증·재발송, 로그인·로그아웃·refresh·me를 구현한다.
- SMTP adapter와 개발용 Mailpit/console adapter를 분리한다.
- 프론트 가입·인증·로그인 화면, 공통 API client, auth query와 보호 route를 구현한다.
- rotation, reuse detection, cookie, Origin 검증, rate limit을 통합 테스트한다.

완료 기준: 실제 이메일로 인증한 사용자만 로그인하며, 새로고침·access 만료·로그아웃·refresh 재사용 시나리오가 E2E에서 통과한다.

## Phase 3 — Core CRUD

- sources, comments, tags, source_tags migration과 seed를 작성한다.
- 자료 공개 목록·상세, 인증 생성, 작성자 수정·삭제와 서버 페이징을 구현한다.
- 댓글 공개 조회, 인증 생성, 작성자 수정·삭제를 구현한다.
- 목록·등록·상세·수정 UI와 댓글 UI를 완성한다.
- Swagger schema와 endpoint별 오류 예제를 실제 handler와 맞춘다.

완료 기준: 두 사용자와 비회원으로 모든 권한 경계를 검증하고 13개 이상의 seed 자료로 2페이지 이상 이동한다.

## Phase 4 — URL 차별화

- SSRF 방어가 포함된 URL validator와 extractor adapter를 구현한다.
- 본문 가져오기 API와 등록 화면 preview·실패 fallback을 연결한다.
- raw text 길이·body 크기·MIME·redirect·timeout 제한을 테스트한다.
- 자료 카드와 상세를 출처·요약 중심으로 다듬고 접근성 검사를 수행한다.

완료 기준: 일반 공개 HTML은 추출되고 차단 URL·JS/paywall·실패 URL에서는 입력을 잃지 않은 채 수동 저장할 수 있다.

## Phase 5 — 로컬 AI 요약

- Ollama adapter, prompt, 출력 Zod schema, timeout, repair 1회를 구현한다.
- 상세 화면의 요청·검토·수정·적용 UI를 구현한다.
- `ollama`, `disabled`, `demo` 실행 모드를 분리하고 demo 표시를 강제한다.
- 장애·잘못된 JSON·기존 요약 보존을 테스트한다.

완료 기준: 로컬 Ollama로 초안을 생성·검토·저장하고, Ollama 중단과 배포 disabled/demo에서도 CRUD가 정상 동작한다.

## Phase 6 — 배포·제출

- 새 AWS EC2에 Docker, Compose plugin, Caddy reverse proxy와 HTTPS 인증서를 구성한다.
- DB volume과 백업 경로는 외부 비공개로 유지하고 보안 그룹은 22(관리자 IP 제한), 80, 443만 연다.
- GHCR에 Web/API image를 git sha tag로 push하고 EC2는 immutable tag를 pull한다.
- 운영 Compose에서는 Mailpit을 제외하고 실제 SMTP를 사용한다.
- 운영 AI 기본값은 `AI_MODE=demo`로 두며 demo 표시를 강제한다. 실제 Ollama는 로컬 smoke로 분리한다.
- GitHub Actions에서 test/build 후 image build, GHCR push, EC2 deploy를 수행한다.
- 배포는 `pull → migrate deploy → compose up -d → readiness smoke` 순서로 진행한다.
- 실패 시 이전 image tag로 되돌리는 runbook과 DB migration 호환 원칙을 기록한다.
- README에 로컬 실행, 배포 URL, Swagger URL, 환경변수, 시연 계정, 배포 workflow를 정리한다.

완료 기준: 기본 브랜치 merge 후 자동 배포되고 HTTPS 환경에서 Web, API readiness, Swagger, 실제 SMTP 가입 메일, 자료·댓글 CRUD, AI demo 요약 smoke가 통과한다.

## CI/CD 품질 게이트

```text
PR: install → lint → typecheck → unit/integration → web/api build → OpenAPI validate
main: PR gate → image build/tag → registry push → EC2 deploy → migrate → smoke test
```

운영 migration은 destructive 변경을 한 배포에 포함하지 않는다. 컬럼 추가 → 코드 전환 → 후속 정리의 expand/contract 순서를 따른다. 배포 secret은 GitHub Environment secrets와 EC2 환경 파일로 관리한다.

## 리스크 Top 5와 대응

| 리스크 | 신호 | 대응 |
| --- | --- | --- |
| 인증 범위 과대 | refresh·쿠키 디버깅 지연 | Phase 2를 독립 milestone로 완료하고 E2E 우선 작성 |
| SSRF 취약점 | private 주소 우회 테스트 실패 | DNS/redirect 매 단계 검증, extractor를 공개 전에 security test |
| Ollama 자원·지연 | timeout/OOM | 로컬 전용, 배포 disabled/demo, AI를 readiness에서 제외 |
| 이메일 deliverability | spam·SMTP 거부 | 검증된 발신 도메인, Mailpit 개발, 배포 전 실제 수신 smoke |
| 단일 VM 장애·DB 손실 | disk/volume 장애 | persistent volume, 정기 pg_dump, restore runbook과 최소 모니터링 |

## 제출 최소 범위 차단선

일정이 부족하면 UI 장식 → 대시보드 통계 → demo AI 순서로 줄인다. 실제 인증, 자료·댓글 CRUD, 페이징, 권한, Swagger, Docker, 배포 자동화는 줄이지 않는다. URL 추출과 로컬 AI는 Core가 배포된 뒤에만 포함한다.
