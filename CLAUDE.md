# CLAUDE.md — KING STUDIO 개발 거버넌스

> 이 파일은 Claude Code가 **모든 작업 세션 시작 시 읽는 프로젝트 헌법**이다.
> 여기 적힌 규칙은 개별 작업 지시보다 우선한다. 작업 지시가 이 규칙과 충돌하면,
> 충돌을 사용자에게 알리고 확인을 받은 뒤 진행한다.

---

## 0. 프로젝트 한 줄 정의

KING STUDIO — 서울의 K-POP 녹음 체험을 외국인 관광객에게 파는 다국어 D2C 예약 웹사이트.
NYT 보도 자산 보유. kingstudio.co.kr 신규 구축(greenfield). 풀스택 1인(Aiden) 풀타임 개발.

상위 기획 문서:
- `KING_STUDIO_PRD_v0.2.md` — 제품 요구사항 (제품 결정의 단일 진실 공급원)
- `KING_STUDIO_DESIGN.md` — Stitch 화면 디자인 프롬프트 (21개 화면)
- `KING_STUDIO_Pricing_Model.xlsx` — 가격·단위경제 모델

PRD와 이 파일이 충돌하면 PRD가 우선한다. 단, 가격 정책은 가격 모델(C10·C11 정정 반영본)이 최신이다.

---

## 1. 기술 스택 — 잠금 (변경 금지)

> **인프라 = 단일 GCP (C13, v0.2 전환).** 호스팅 Cloud Run, DB Cloud SQL, 파일 Cloud Storage, CDN Cloud CDN, 트랜스코딩 Cloud Run Jobs, 시크릿 Secret Manager, 리전 asia-northeast3(Seoul). Redis만 Upstash 유지(저트래픽 비용), Cloudflare Free 유지(DNS·보안). PRD 원안 AWS+Vercel은 폐기. 자세한 매핑은 PRD §7.3·7.4·7.7.

아래는 PRD 7장에서 확정된 스택이다. **임의로 다른 라이브러리로 대체하지 말 것.**
대체가 필요하다고 판단되면 먼저 사용자에게 이유를 설명하고 승인을 받는다.

| 레이어 | 확정 기술 |
|---|---|
| 프레임워크 | Next.js 14 App Router + TypeScript 5.x |
| UI | shadcn/ui + Radix UI + Tailwind CSS |
| 폼·검증 | react-hook-form + Zod (프론트·백엔드 스키마 공유) |
| 상태 | Zustand (클라이언트) + TanStack Query (서버 상태) |
| 다국어 | next-intl (서브경로 /ko /en /ja /zh-TW /zh-HK) |
| ORM | **Prisma** + Prisma Migrate (Drizzle 아님) |
| DB | PostgreSQL 16 (GCP Cloud SQL, HA) |
| 캐시·락 | Upstash Redis (Serverless) |
| 인증 | Auth.js v5 + Prisma Adapter |
| 큐·cron | Inngest |
| 결제 | KG이니시스(국내) + PayPal(해외) |
| 이메일 | Resend (트랜잭션) — 발신 join@kingstudio.co.kr, 표시명 "KING STUDIO" |
| SMS·알림톡 | 솔라피(Coolsms) (NHN Toast 아님) |
| 해외 SMS | Twilio |
| 트랜스코딩 | GCP Cloud Run Jobs FFmpeg(음원) + Sharp(사진) |
| 파일 | GCP Cloud Storage(Seoul) + Cloud CDN Signed URL |
| 호스팅 | GCP Cloud Run + Cloud Build(배포) + Cloudflare Free(DNS·보안) |
| 모니터링 | Sentry + BetterStack + Axiom + PostHog + GA4 |
| CS | Channel Talk |
| 캘린더 연동 | Google Calendar API (어드민 운영 캘린더 제한적 양방향) + FullCalendar(어드민 UI) |

**개발 도구:** pnpm, Biome(린트·포맷), Vitest(단위), Playwright(E2E), GitHub Actions(CI), CodeRabbit(AI 리뷰), Linear(이슈).

---

## 2. 폴더 구조 (Next.js App Router 기준)

```
/app
  /[locale]              # next-intl 로케일 세그먼트
    /(public)            # 공개 화면 그룹
      /page.tsx          # 홈
      /packages/[slug]   # 패키지 상세
      /booking           # 예약 4단계
      /download/[token]  # 매직링크 다운로드
      ...
    /(auth)              # 로그인·회원가입·비번재설정
    /my                  # 마이페이지 (인증 필요)
  /admin                 # 어드민 (별도 레이아웃, 인증+RBAC)
  /api                   # Route Handlers
/components
  /ui                    # shadcn 컴포넌트
  /booking, /package ... # 도메인별 컴포넌트
/lib
  /db (prisma), /auth, /payment, /redis, /email, /i18n
/messages                # next-intl 번역 파일 (ko.json, en.json, ...)
/prisma                  # schema.prisma, migrations
/inngest                 # 큐·cron 함수
```

규칙: 도메인 로직은 `/lib`에, UI는 `/components`에. Route Handler는 얇게 유지하고 로직은 `/lib`로 위임.

---

## 3. 절대 위반 금지 제약 (Hard Constraints)

아래는 법적·금전적 사고로 직결되므로 **어떤 경우에도 어기지 않는다.**

1. **동의 기록은 append-only.** `consents` 테이블에 UPDATE/DELETE 금지(DB 트리거로 차단). 철회는 새 row 삽입. 동의 PDF는 S3 Object Lock COMPLIANCE.
2. **결제는 KRW 단일 청구.** 외화는 참고 표시(approximate)만. 결제 금액·정책은 결제 시점 스냅샷으로 예약 레코드에 저장(소급 변경 금지).
3. **슬롯 동시성은 Redis 분산락 필수.** 결제 진입 시 `slot_lock:{room_id}:{date}:{start_time}` TTL 900초. 락 없이 슬롯 확정하는 코드 금지.
4. **미성년자(만 16세 미만) 보호자 동의 없이는 결제 차단.** 우회 경로 만들지 말 것.
5. **매직링크·다운로드는 서명 URL(CloudFront Signed URL, TTL 10분)로만.** S3 직접 노출 금지.
6. **PII·비밀번호·결제정보를 로그·에러 메시지에 남기지 말 것.** 비밀번호 bcrypt(12), 결제정보 MVP 미저장.
7. **환경변수는 GCP Secret Manager로만(Cloud Run 런타임 주입).** Git에 커밋 금지. `.env`는 `.gitignore`.
8. **어드민 민감 액션은 재인증(비번+TOTP) 강제.** 환불·권한변경·대량export·약관발행·계정삭제.
9. **색상만으로 정보 전달 금지(WCAG AA).** 슬롯 가능/마감은 색+텍스트+아이콘 병기.
10. **악성·우회 코드 작성 금지.** 친구초대 어뷰즈 차단(IP·디바이스·BIN), 재가입 쿨다운 등 PRD 방어 로직을 무력화하지 말 것.

---

## 4. 위험 구역 (Danger Zones) — 사람 검증 필수

아래 영역은 Claude가 코드를 작성하되, **머지 전 Aiden이 반드시 직접 검증**한다.
Claude는 이 영역 작업 시 "위험 구역 작업 중 — 검증 필요" 라고 명시하고, 테스트 코드를 함께 작성한다.

- **결제 webhook** (KG이니시스·PayPal) — 결제 성공/실패/환불 콜백. 금액 위변조 검증, 중복 처리 방지.
- **PayPal 분쟁 Evidence Pack** — 자동 생성 데이터의 정확성.
- **동의 기록 불변성** — append-only 트리거가 실제로 UPDATE/DELETE를 막는지.
- **미성년자 검증 흐름** — 생년월일 → 보호자 동의 분기 → 결제 차단.
- **GDPR 삭제·익명화** — 보존 의무 데이터(결제·세금 5년)는 익명화, 나머지 30일 내 삭제.
- **Redis 슬롯 락** — 동시 결제 시 더블부킹이 실제로 차단되는지 (Playwright 동시성 테스트).
- **매직링크 토큰** — 만료·재발급·서명 URL 위변조.
- **구글 캘린더 제한적 양방향** (어드민 모듈 ②) — 예약은 push만, 운영 블록은 pull만. **양방향이 SSOT(우리 DB)를 깨지 않는지 반드시 검증.** 구글에서 수정한 고객 예약이 우리 DB를 덮어쓰면 안 됨. pull된 블록이 중복 blackout을 만들지 않는지 멱등성 확인.
- **연습용 MR·가사 사전 배포 게이트** (어드민 모듈 ②) — `settings.mr_predelivery_enabled` 기본 false. 라이선스 미확보 상태에서 MR/가사 파일이 절대 배포되지 않아야 함(R2 직결). 게이트 우회 경로 금지.
- **견적·인보이스 금액 계산** (어드민 모듈 ③) — 인원당 정액 × 인원(C11)이 가격 모델과 일치하는지. 부가세·할인 계산 오류는 금전 사고.
- **SEO Code Injection 화이트리스트** (어드민 모듈 ①) — 자유 스크립트 주입 차단(XSS). 정의된 슬롯(GA4·GTM·인증 메타)만. custom_script는 Super Admin+재인증+로그.
- **Engineer 행 스코프 (본인 세션 한정)** — Engineer 역할은 PRD 5.8상 "본인 배정 세션만" 접근 가능(booking.engineerId === adminId). RBAC 권한 플래그만으론 행 단위 스코프가 표현 안 되므로, 체크인·콘텐츠 업로드·셀렉트 기능을 구현할 때 반드시 owner 체크를 건다. 이를 빠뜨리면 Engineer가 남의 세션에 접근하는 보안 구멍이 된다. (어드민 인증 슬라이스에서는 거친 권한만, 행 스코프는 booking 기능 슬라이스에서 적용)

---

## 5. 다국어 (i18n) 규칙

- **모든 사용자 노출 텍스트는 `/messages/{locale}.json`에 키로 분리.** 컴포넌트에 하드코딩 금지.
- 5개 로케일: `ko, en, ja, zh-TW, zh-HK`. 중국어 2종은 모두 **번체**(zh-TW=대만, zh-HK=홍콩), 간체/본토 미지원(C14). **en이 필수 기본값(fallback).**
- **번역 2계층:**
  - UI·마케팅 카피 → 기계번역 + Aiden 감수 (개발 중 en 먼저 채우고 나머지는 순차)
  - **약관·개인정보·환불정책 → 법률 전문 번역/법무 검토 필수.** 기계번역 금지. M5 시점 별도 트랙.
- 누락 키 검증 CI 스크립트 필수(빌드 시 5개 로케일 키 일치 확인).
- 레이아웃은 **텍스트 길이 가변** 가정. 일본어·중국어가 영어보다 길거나 짧아도 안 깨지게.
- 패키지 노출 필터: `languages_available` 필드로 제어. 1Hour·1Pro·꿈길·워크샵은 `['ko']`만(외국어 사이트 자동 제외). K-Pop Making Class·Gold·Diamond·Premium은 전 언어.
- **중국 본토(간체) 미지원 (C14):** 타겟은 대만(zh-TW)·홍콩(zh-HK) 번체로 둘 다 GFW 밖이라 별도 GFW 대응(Google Fonts self-host·hCaptcha·GA 조건부 제외)은 **불필요**. 향후 본토(간체·CNY) 진출 시 재도입 검토.

---

## 6. 가격 정책 (가격 모델 C10·C11 반영 — 최신)

- **체험 정가(1인):** Gold 400,000 / Diamond 500,000 / Premium 1,500,000 KRW.
- **체험 인원별:** 인당 +50% 선형 — 총액 = 1인 정가 × (1 + 0.5×(인원−1)). 2인 1.5배·3인 2.0배·4인 2.5배·5인 3.0배. 최대 5인. 예: Diamond 5인 = 1,500,000 / Premium 5인 = 4,500,000.
- **대여(한국어 전용):** 1Hour 100,000 / 1Pro 300,000.
- **단체(인원당 정액 × 인원):** Making Class 150,000 / 꿈길 30,000 / 워크샵 50,000.
- 가격은 DB(`packages` 테이블)에서 관리. 코드에 하드코딩 금지(어드민 가격 변경 대응).
- 친구초대 10%·상한 5만, Diamond·Premium·단체만(Gold·대여 제외). 프로모션과 동시 사용 불가.

---

## 7. 작업 진행 규칙 (Claude Code 운영)

1. **한 번에 한 마일스톤.** PRD 9.3의 M1~M11 순서를 따른다. 현재 마일스톤의 게이트를 통과하기 전 다음으로 넘어가지 않는다. (번아웃·범위 폭주 방지 — PRD R1·R6)
2. **작업 시작 전 PRD 관련 절을 읽는다.** 예: 예약 엔진 작업 → PRD 5.3. 화면 작업 → DESIGN.md 해당 프롬프트. 컨텍스트를 추측하지 말고 문서에서 확인.
3. **마이그레이션은 Prisma Migrate로만.** 스키마 변경 시 마이그레이션 파일 생성, 직접 SQL로 프로덕션 변경 금지.
4. **커밋은 작고 의미 단위로.** Conventional Commits (`feat:`, `fix:`, `chore:` ...). 한 커밋에 여러 기능 섞지 말 것.
5. **테스트:** 위험 구역(§4)은 테스트 필수. 결제·예약·동의는 Playwright E2E 포함.
6. **PR마다 CodeRabbit 리뷰를 거친다.** 1인 개발의 리뷰어 공백을 메우는 1차 안전망.
7. **막히거나 PRD에 없는 결정이 필요하면 추측하지 말고 묻는다.** 임의 결정으로 진행 후 되돌리는 것이 가장 비싸다.
8. **MVP 범위를 벗어나는 기능 제안 금지.** PRD 9.2 MVP 범위 밖이면 "v1.1 백로그" 라고만 메모. 지금 만들지 말 것.

## 7-A. Stage 워크플로우 (Claude Code 작업 사이클)

마일스톤(M1~M11)보다 작은 **Stage 단위**로 작업한다. Stage 1(Prisma 스키마)에서 검증된 사이클을 모든 작업에 적용한다.

1. **작업 단위 = Stage.** 마일스톤을 한 번에 처리하지 않고, Aiden이 한 번에 검토 가능한 크기의 Stage로 쪼갠다. (예: Stage 1 스키마를 7개 도메인 그룹으로 분할.) 큰 작업일수록 더 잘게.
2. **Stage 시작 전 컨텍스트 로드.** CLAUDE.md + 관련 PRD 절을 먼저 읽고 시작한다. 추측 금지. 무엇을 읽었는지 밝힌다.
3. **막히면 OPEN DECISION으로 멈춤.** PRD에 없거나·모호하거나·충돌하는 결정이 나오면 추측하지 않는다. `OPEN DECISION`으로 명시하고, 선택지(A/B/C)와 각 트레이드오프·추천을 제시한 뒤 Aiden 확인을 기다린다. (Auth.js 어댑터·PK 타입·enum 결정이 이 패턴으로 처리됨.)
4. **Stage 종료 시 PRD 대조 요약.** ① 무엇을 했는지 ② PRD와 대조해 누락·모호점 ③ 다음 Stage가 무엇인지를 요약하고 멈춘다. 확인 전 다음 Stage로 넘어가지 않는다.
5. **파괴적 작업은 검토 후.** `prisma migrate dev`, 프로덕션 변경 등 되돌리기 비싼 작업은 Aiden 검토 전까지 실행 금지. validate까지만 자동.
6. **문서 정합 동기화.** 스키마·구현이 PRD와 갈리는 결정을 하면(예: user_social_connections → 표준 Account), 즉시 PRD·CLAUDE.md를 정정해 **세 문서(PRD·CLAUDE·코드)가 어긋나지 않게** 한다. 정정을 미루지 않는다 — 미룬 정정은 다음 Stage에서 혼란을 만든다.

## 7-B. IDE 자동승인 정책 (Antigravity)

개발 IDE는 Google Antigravity(에이전트형, VS Code 포크). 자동승인은 **위험도별로만** 켠다. 전체 자동승인(Always proceed 전역)은 §4 위험 구역 검증을 무력화하므로 금지.

**기본값 (항상):**
- Terminal Execution Policy = **Request review** (Always proceed 전역 금지)
- **Terminal Sandbox = ON** (워크스페이스 밖 파일 보호)
- Non-Workspace File Access = **OFF**

**자동승인 허용 (Allow List에 추가 가능 — 위험 낮음):**
- `pnpm install`, 빌드, `vitest`, `playwright`, `biome` (테스트·린트·포맷)
- UI 컴포넌트·번역(messages/*.json)·문서 작성

**자동승인 금지 (어떤 모드에서도 수동 검토 — §4 위험 구역 연동):**
- `prisma migrate` (스키마 변경 — §7-A 5번, 되돌리기 가장 비쌈)
- `gcloud` 및 모든 GCP 인프라 변경 (Cloud Run 배포·Cloud SQL·Storage)
- 결제·webhook·환불 / 동의 기록·트리거 / 인증·세션·미성년자 검증
- 슬롯 락·캘린더 동기화 / `rm`·파일 삭제·덮어쓰기

**서드파티 자동승인 확장 금지.** "모든 승인 자동 클릭" 류 확장(CDP 기반 등)은 위험 구역 보호를 통째로 무력화하므로 사용하지 않는다. 공식 Terminal Execution Policy + Allow List로만 제어.

**원칙:** 신뢰가 쌓인 워크플로우만 점진적으로 Allow List에 추가. 첫날부터 무인 실행 금지. Stage 2~7(스키마)은 전 기간 Request review 유지.

---

## 8. 마일스톤 게이트 (PRD 9.4)

| 게이트 | 시점 | 통과 기준 |
|---|---|---|
| Gate 1 | M3 종료 | 한·영 + Diamond 결제 처음~끝 작동. **진척 80% 미만 시 전체 일정 재산정** |
| Gate 2 | M5 종료 | 동의·라이선스·GDPR 모듈 외부 법무 자문 통과 |
| Gate 3 | M9 종료 | 5언어 카피 검수·SEO·성능·접근성 합격 (Lighthouse 성능≥90·접근성≥95) |
| Gate 4 | M10 종료 | 베타 30명 시나리오 95%+ 무결점 |

---

## 9. 개발 착수 전 잔여 항목 (Pre-flight)

개발 시작 전 또는 병행으로 처리해야 하는 비개발 항목:

- [x] **O2 — 패키지별 사진·영상 포함물 매트릭스 확정** (✅ 해소, PRD §5.6)
- [ ] KG이니시스 가맹 심사 신청 (2~4주, M1 병행)
- [ ] PayPal Business 계정 (사업자등록증+통신판매업 신고)
- [ ] 카카오 비즈채널 발급 + 솔라피 알림톡 템플릿 검수 (영업일 2~3일)
- [ ] 로고 SVG 벡터 원본 확보 (PNG는 확대 시 깨짐, 정확 HEX 추출)
- [ ] 실제 스튜디오 사진 확보 (Stitch 생성 이미지는 임시)
- [ ] 약관·개인정보·환불정책 법률 번역/검토 트랙 가동 (M5 전)
- [ ] EU Representative 위탁 (GDPR, EU 고객 처리 시)
- [ ] 구글 캘린더 서비스 계정 발급 + 뮤직킹 운영 캘린더 공유 설정 (어드민 모듈 ②, M2~M3)

---

## 10. 이 파일의 유지보수

- 결정이 바뀌면 이 파일을 먼저 갱신하고, 그 다음 코드를 바꾼다.
- PRD가 v0.3으로 개정되면 §6 가격·§1 스택 등 해당 부분을 동기화한다.
- 이 파일과 PRD가 충돌하는 것을 발견하면 작업을 멈추고 사용자에게 알린다.
