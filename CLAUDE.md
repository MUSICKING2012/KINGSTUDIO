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
- `KING_STUDIO_DESIGN.md` — 에디토리얼 디자인 시스템 명세 (디자인 SoT; 구 Stitch Cinematic 대체)
- `KING_STUDIO_Pricing_Model.xlsx` — 가격·단위경제 모델

PRD와 이 파일이 충돌하면 PRD가 우선한다. 단, 가격 정책은 가격 모델(C10·C11 정정 반영본)이 최신이다.

---

## 1. 기술 스택 — 잠금 (변경 금지)

> **인프라 = Supabase + Railway (2026-07-18 피벗 — `Infra_Pivot_Decision_v1.md` 정본).** DB Supabase Postgres, 파일 Supabase Storage(서명 URL), 호스팅·트랜스코딩 worker Railway, 시크릿 Railway 환경변수(서비스 스코프). Redis는 Upstash 유지(저트래픽 비용), Cloudflare Free 유지(DNS·보안). 리전은 프로비저닝 시 확정(Railway 앱 리전과 페어링 — D2). 구 GCP 단일(C13)·PRD 원안 AWS+Vercel은 폐기. **PRD §7.3·7.4·7.7·7.13의 GCP 세부는 피벗 미반영 구본 — 충돌 시 피벗 결정 문서가 우선.**

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
| DB | PostgreSQL 17 (Supabase) |
| 캐시·락 | Upstash Redis (Serverless) |
| 인증 | Auth.js v5 + Prisma Adapter |
| 큐·cron | Inngest |
| 결제 | KG이니시스(국내) + PayPal(해외) |
| 이메일 | Resend (트랜잭션) — 발신 join@kingstudio.co.kr, 표시명 "KING STUDIO" |
| SMS·알림톡 | 솔라피(Coolsms) (NHN Toast 아님) |
| 해외 SMS | Twilio |
| 트랜스코딩 | Railway worker FFmpeg(음원) + Sharp(사진) |
| 파일 | Supabase Storage + 서명 URL (비공개 버킷) |
| 호스팅 | Railway (Next.js) + Cloudflare Free(DNS·보안) |
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

1. **동의 기록은 append-only.** `consents` 테이블에 UPDATE/DELETE 금지(DB 트리거로 차단). 철회는 새 row 삽입. 동의 PDF는 비공개 버킷(service-role 전용 쓰기) + **PDF SHA-256 해시를 append-only 동의 레코드에 기록**(무결성 증명) + 접근 audit_log — 구 S3 Object Lock COMPLIANCE 대체(피벗 D1, 법무 감수 시 증거 충분성 확인 단서).
2. **결제는 KRW 단일 청구.** 외화는 참고 표시(approximate)만. 결제 금액·정책은 결제 시점 스냅샷으로 예약 레코드에 저장(소급 변경 금지).
3. **슬롯 동시성은 Redis 분산락 필수.** 결제 진입 시 `slot_lock:{room_id}:{date}:{start_time}` TTL 900초. 락 없이 슬롯 확정하는 코드 금지.
4. **미성년자(만 16세 미만) 보호자 동의 없이는 결제 차단.** 우회 경로 만들지 말 것.
5. **매직링크·다운로드는 서명 URL(TTL 10분)로만.** 스토리지 직접 노출 금지 — 공개 버킷·영구 public URL·storage key 응답 노출 전부 금지(벤더 불문).
6. **PII·비밀번호·결제정보를 로그·에러 메시지에 남기지 말 것.** 비밀번호 bcrypt(12), 결제정보 MVP 미저장.
7. **환경변수는 Railway 환경변수(서비스별 스코프)로만 주입.** Git에 커밋 금지. `.env`는 `.gitignore`. Supabase `service_role` 키는 **서버 전용** — 클라이언트 번들 유입 금지(`NEXT_PUBLIC_` 접두 금지).
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
- **Redis 슬롯 락** — 동시 결제 시 더블부킹이 실제로 차단되는지 (Vitest 통합 테스트 — 실 DB + 실 Redis).
- **매직링크 토큰** — 만료·재발급·서명 URL 위변조.
- **구글 캘린더 제한적 양방향** (어드민 모듈 ②) — 예약은 push만, 운영 블록은 pull만. **양방향이 SSOT(우리 DB)를 깨지 않는지 반드시 검증.** 구글에서 수정한 고객 예약이 우리 DB를 덮어쓰면 안 됨. pull된 블록이 중복 blackout을 만들지 않는지 멱등성 확인.
- **연습용 MR·가사 사전 배포 게이트** (어드민 모듈 ②) — `settings.mr_predelivery_enabled` 기본 false. 라이선스 미확보 상태에서 MR/가사 파일이 절대 배포되지 않아야 함(R2 직결). 게이트 우회 경로 금지.
- **견적·인보이스 금액 계산** (어드민 모듈 ③) — 인원당 정액 × 인원(C11)이 가격 모델과 일치하는지. 부가세·할인 계산 오류는 금전 사고.
- **SEO Code Injection 화이트리스트** (어드민 모듈 ①) — 자유 스크립트 주입 차단(XSS). 정의된 슬롯(GA4·GTM·인증 메타)만. custom_script는 Super Admin+재인증+로그.
- **Engineer 행 스코프 (본인 세션 한정)** — Engineer 역할은 PRD 5.8상 "본인 배정 세션만" 접근 가능(booking.engineerId === adminId). RBAC 권한 플래그만으론 행 단위 스코프가 표현 안 되므로, 체크인·콘텐츠 업로드·셀렉트 기능을 구현할 때 반드시 owner 체크를 건다. 이를 빠뜨리면 Engineer가 남의 세션에 접근하는 보안 구멍이 된다. (어드민 인증 슬라이스에서는 거친 권한만, 행 스코프는 booking 기능 슬라이스에서 적용)
- **어드민 화면(권한-보호 라우트) RBAC 적용 + 라우트 레벨 거부 E2E** — 어드민 기능 화면을 만들 때, 해당 보호 라우트에 **`requirePermission` 적용** + **저권한 역할(예: Engineer)이 라우트 레벨에서 거부되는지 E2E를 그 슬라이스에서 반드시 추가**한다. 현재 어드민 인증 슬라이스는 RBAC **단위 테스트**(hasPermission·getAdminPermissions)까지만 검증됨 — `app/admin`에 `requirePermission`이 걸린 보호 라우트가 없어 **라우트 레벨 거부는 미검증(설계상 정상)**. 첫 권한-보호 어드민 기능에서 이 E2E 추가를 빠뜨리면 권한 우회 구멍을 검증 없이 출시하게 된다.
- **권한-보호 admin 라우트 표준 (S2.5b-0 확립):** `adminAuth()` → `session.sessionId` → `validateAdminSession(sessionId)` → `adminUserId`; `prisma.adminUser.findUnique` → `status === 'active'`; `requirePermission(adminUserId, token)`; `ForbiddenError instanceof` → 403 `{error:'forbidden'}`. **세션 판정은 AdminSession(DB)이 SoT, JWT auth() 아님.** `validateAdminSession`은 만료만 체크하므로 status(active/inactive/locked)는 라우트에서 직접 확인 필수.
- **가격 모델 무결성** — `KING_STUDIO_Pricing_Model.xlsx`의 단위마진·BEP recalc 결과가 모델 기대값과 일치하는지 검증(절차 §6-A). 입력값이 바뀌면 재검증. xlsx 수식 구조(반올림·참조·시트 레이아웃)가 바뀌면 §6-A 절차 자체의 유효성부터 재검토.

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
- 친구초대 10%·상한 5만, Diamond·Premium·단체만(Gold·대여 제외).
- **재방문 회원 10%·상한 5만, 체험만(Gold·Diamond·Premium — 대여·단체 제외).** 자격 = 로그인 회원 + 직전 완료·결제완료(환불 제외) 예약 1건 이상(게스트 미적용). 체크아웃 자동 적용(코드 불필요), 무기한. 인원 과금 총액 기준 10%.
- **고객 할인 채널 = 재방문·친구초대 둘로 한정(오너 확정 2026-07-17).** 프로모션 코드는 어드민 마케팅 수단(고객 셀프-획득 할인 아님). 모든 할인 상호 배타 — 최대 1개만 자동 적용, 가장 유리한 금액, 동률이면 재방문 우선. 시스템 자동 검증.

---

## 6-A. 가격 모델(xlsx) 검증 절차

`KING_STUDIO_Pricing_Model.xlsx`는 계산 캐시 없이 저장된다(openpyxl `data_only`로 읽으면 계산 셀 전부 공란). 따라서 **원본을 직접 읽어 값을 신뢰하지 않는다.** 반드시 아래 강제 recalc를 거친 결과만 검증에 쓴다.

**표준 절차 (macOS·Windows 공통, LibreOffice 26.2.4.2 고정 — 경로는 §6-B):**
1. SoT 고정 — 워킹트리 아닌 커밋된 blob을 검증: `git show HEAD:KING_STUDIO_Pricing_Model.xlsx > /tmp/ksv/model.xlsx`
2. 강제 recalc 프로파일 — `registrymodifications.xcu`에 `OOXMLRecalcMode=0`(+`ODFRecalcMode=0`) 설정. 문법: `<profile>/user/registrymodifications.xcu`에 `<item oor:path="/org.openoffice.Office.Calc/Formula/Load"><prop oor:name="OOXMLRecalcMode" oor:op="fuse"><value>0</value></prop></item>`(+ODFRecalcMode 동일 구조). Windows 2026-07-02 recalc 작동 raw 확인.
3. xlsx 라운드트립 — `soffice --headless -env:UserInstallation=<profile> --convert-to xlsx:"Calc MS Excel 2007 XML"`
4. 캐시 읽기 — 산출된 xlsx를 openpyxl `data_only=True`로 읽음

**검증 대상 셀 (기대값은 매번 recalc로 재생성 — 하드코딩 금지):**
- `2.단위마진` C17(Gold)·D17(Diamond)·E17(Premium) = 단위 마진
- `1.입력값` C41 = 월 고정비 합계
- `4.손익분기` C9 = BEP

**금지:**
- `--convert-to csv` — CSV는 단일 시트만 내보내 `0.안내`만 나온다.
- 원본 xlsx를 openpyxl로 직접 읽기 — 캐시 공란이라 계산값이 안 나온다.
- 문서·prose·memory에 기록된 기대값을 검증 근거로 재사용 — 입력값 변경 시 stale. 반드시 그 시점 recalc로 재생성.

soffice 경로: 맥 `/Applications/LibreOffice.app/Contents/MacOS/soffice`. Windows 경로·플랫폼 편집 정책은 §6-B 참조.

**§6-A 부록 — xlsx 소비처 감사 (2026-07-01 raw, grep at fbd9194)**

- 소비처 감사 fbd9194: 트리 전수 `git grep`(리더 API 토큰 포함) 결과, `KING_STUDIO_Pricing_Model.xlsx`를 값으로 읽는 프로그래매틱 소비처 **0건**. 히트는 `.gitattributes`(binary 속성)와 본 문서(§6-A 서술)뿐, 코드 파일(.py/.ts/.js/.yml) 0. 따라서 캐시리스 저장은 **무해 확정** — 커밋 blob에 계산 캐시가 없어도 그 값을 소비하는 코드가 없어 잠복버그가 아니다. 사각: 커밋 안 된 로컬 스크립트·repo 밖 파이프라인(외부 CI·서버 cron)은 감사 범위 밖.
- 커밋 전 recalc-save는 **불필요**. 유일한 읽기 경로인 §6-A 절차가 이미 recalc-on-load(soffice convert-to)를 강제하므로 읽기 시점 recalc가 보장된다.
- Forward guard: 향후 xlsx를 openpyxl `data_only`·pandas `read_excel`·SheetJS `XLSX.read` 등으로 값을 읽는 소비처를 추가하는 순간 캐시리스가 잠복버그로 전환된다. 소비처를 추가하면 **커밋 전 recalc-save를 워크플로에 편입**할 것.
- canonical 5 실주소(recalc 확정): Gold = 시트 2.단위마진 셀 C17 / Dia = 2.단위마진 D17 / Prem = 2.단위마진 E17 / 고정비 = 1.입력값 C41 (→ 4.손익분기 C4) / BEP = 4.손익분기 C9 = ROUNDUP(3452000 / 267440) = 13.

**버전 drift 상태:** cross-version recalc drift는 known·unmonitored. 현 모델 수식은 산술 + `{SUM, IF, MIN, ROUNDUP}`뿐이라 volatile/locale/버전 발산 함수가 없다(2026-07-01 committed blob raw 확인). 따라서 drift 위험은 `4.손익분기` ROUNDUP 기반 BEP 정수 경계 1개로 한정되고, 이는 버전이 아니라 아키텍처 의존이며 IEEE-754 결정성상 ARM↔x86 간에도 비트 동일. detection tripwire는 미도입 — recalc 실행 harness 없이 §6-A에 값만 박으면 inert이고 위 하드코딩 금지 원칙과 충돌하기 때문. 위 함수 집합을 벗어나는 수식이 추가되면 이 판정은 무효이고 drift 감지 수단을 재검토한다.

## 6-B. xlsx 편집 플랫폼 정책 (dual, version-pinned)

- 편집 허용: xlsx 편집은 macOS·Windows 양쪽 허용(결정 2026-07-01). 전제 = LibreOffice soffice 버전 pin 26.2.4.2, 양 플랫폼 동일(확인됨). 버전이 갈리면 편집 중단, 버전 정합부터.
- soffice 경로(PATH 미등록, 풀경로 호출): 맥 `/Applications/LibreOffice.app/Contents/MacOS/soffice` / Windows `/c/Program Files/LibreOffice/program/soffice.com`.
- 편집 게이트(플랫폼 불문): 편집·저장 후 커밋 전 §6-A recalc 게이트를 돌려 canonical 5(값 241840·267440·723440·3452000·13, 주소 §6-A 부록)가 recalc로 재현되는지 확인. 통과분만 커밋.
- 검증 상태: macOS·Windows 양측 recalc parity 확인(mac 2026-07-01 / win 2026-07-02, blob 5b5f3ec, canonical 5 전항 일치). Windows 재현은 재구성 xcu(§6-A step 2 문법)로 수행 — macOS 프로파일 byte 복제 아님, 설정 등가 재현.
- parity 범위: 보증 범위는 버전 pin 정합 + 편집 후 recalc 강제까지. mac-authored blob의 Windows recalc, Windows-authored blob의 mac recalc — 전 조합 영구 일치는 보증 대상 아님. 편집이 발생한 플랫폼 조합에서 그때 §6-A로 확인.
- 캐시 상태: 저장 플랫폼에 따라 committed blob이 계산 캐시를 포함할 수도/안 할 수도 있음. 소비처 0이라 무해(§6-A 부록). 어느 경우든 캐시 의존 금지, 항상 recalc.

---

## 7. 작업 진행 규칙 (Claude Code 운영)

1. **한 번에 한 마일스톤.** PRD 9.3의 M1~M11 순서를 따른다. 현재 마일스톤의 게이트를 통과하기 전 다음으로 넘어가지 않는다. (번아웃·범위 폭주 방지 — PRD R1·R6)
2. **작업 시작 전 PRD 관련 절을 읽는다.** 예: 예약 엔진 작업 → PRD 5.3. 컨텍스트를 추측하지 말고 문서에서 확인.
   - 화면 작업의 디자인 소스 = 두 가지를 함께 본다: (a) `KING_STUDIO_DESIGN.md`(에디토리얼) — 색상·타이포·spacing·radius·서피스·컴포넌트 규칙(시스템 명세), (b) 코드에 이식된 토큰 — `app/globals.css`의 `:root` shadcn CSS 변수(에디토리얼 팔레트로 재설정: primary=accent #F5461E, background=paper #F0EEE9, foreground=ink #141210 등) + `tailwind.config.ts`의 유틸리티 스케일. 이 둘이 합쳐져 "DESIGN.md를 읽어라"가 코드상 실행 가능해진다.
   - 토큰 위치·규칙: 색상의 단일 출처는 `app/globals.css` `:root` shadcn 변수다(컴포넌트가 자동 반영). Stitch B-namespace(`brand-primary`·`surface-cinematic`·`on-surface` 등)·Anton·듀얼 서피스는 폐기한다. 유지 토큰: tailwind `spacing`(gutter·stack·section-gap 80px)·`maxWidth.container-max`(1280)·`fontSize` 스케일(display-lg 등)·`radius`(brand-card 18px). 서체는 Pretendard 단일(`font-sans`), 헤드라인도 Pretendard 대형·라이트.
   - accent #F5461E 텍스트 대비 제약 (§3.9 WCAG AA): #F5461E + 흰 텍스트 ≈ 3.4:1 → AA(4.5) 미달, AA-large(3:1)만 통과. 규칙: ① 소형 본문/라벨 텍스트·아이콘은 잉크(#141210) 사용(accent를 텍스트색으로 금지); ② #F5461E는 fill(버튼·배지 배경)·보더·포커스 링·대형 헤드라인 스팟에만; ③ 버튼 라벨 white-on-#F5461E는 대형/볼드(≥16px 볼드 또는 ≥18.66px)만. 색만으로 정보 전달 금지(§3.9)는 별개로 항상 적용.
   - 서피스: 라이트 단일 서피스 — paper(#F0EEE9) 배경 + white 카드 2층. Stitch 시네마틱 다크·전역 다크 토글은 폐기, 다크모드는 현재 범위 밖.
   - DESIGN.md에 전용 레이아웃이 없는 화면은 에디토리얼 비주얼 프리미티브로 구성한다 — 타이포 스케일 + white 카드(radius 18px, soft shadow) + paper 배경 + `gap-gutter` 그리드 + accent 스팟. 입력은 white·border·focus 링 accent, 섹션 간 `section-gap`(80px), 배지는 `rounded-full`. 새 레이아웃을 임의 창작하지 말고 DESIGN.md 프리미티브·기존 화면 패턴을 재사용.
3. **마이그레이션은 Prisma Migrate로만.** 스키마 변경 시 마이그레이션 파일 생성, 직접 SQL로 프로덕션 변경 금지.
4. **커밋은 작고 의미 단위로.** Conventional Commits (`feat:`, `fix:`, `chore:` ...). 한 커밋에 여러 기능 섞지 말 것.
5. **테스트:** 위험 구역(§4)은 테스트 필수. 결제·예약·동의는 Playwright E2E 포함.
   - **E2E 예약 포트 = 3100** (로컬 :3000은 별개 앱 mk-artist-db가 상시 점유 → 분리). webServer는 `pnpm dev --port 3100`로 띄우고, `e2e/global-setup.ts`가 `/api/health` 응답 body의 `app === 'kingstudio'`를 단언해 **크로스앱 오접속을 차단**(HTTP-status readiness보다 강함). `reuseExistingServer:!CI` 유지(cold-compile fix 보존).
   - **`/api/health` 노출 필드 계약:** dev/test = `{ status:'ok', app:'kingstudio', nodeEnv }`, **prod = `{ status:'ok' }`만**(노출면 최소화·env 원문 비노출). `app` 필드는 E2E 신원 게이트가 의존하므로 비-prod에서 제거 금지.
   - **예약 포트 3100은 musicking(mk-artist-db) 측과 합의 필요** — 양 프로젝트가 같은 머신에서 포트가 겹치지 않도록. (현재는 우리 쪽 단독 회피이며, 상호 합의는 미확정 — 단정 금지.)
   - **Vitest `fileParallelism: false` + `testTimeout: 10000` (임시 안전판):** real DB·Redis를 공유하는 통합 테스트 간 전역 시드 race를 직렬화로 회피한다. 직렬 실행 + bcrypt cost12 조합에서 기본 5s timeout이 빠듯하므로 10s로 함께 상향한다. 근본 해법은 각 통합 테스트가 전용 데이터를 자가 생성·삭제하는 격리이며, 그 전까지는 이 두 설정을 제거하지 않는다.
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
7. **문서 편집은 레포 git 위에서만 (단일 출처).** PRD·CLAUDE 편집의 유일 경로 = "채팅에서 무엇을·어떻게 바꿀지 결정 → Antigravity가 레포 워킹트리 위에서 직접 편집·**커밋·태그·푸시까지 수행**(2026-07-18 정정 — 구 'Aiden 터미널 전담' 폐기)". 코드 동반 변경은 브랜치/PR 경유(§10 main 직접 수정 금지). 채팅 측 outputs 복사본은 **참조 스냅샷일 뿐 편집 출처가 아니다**(옛 버전 위 편집 = 클로버링 재발). 외부 에디터 직접 편집 지양("편집 전 수동 동기화"는 기억 의존이라 깨진다). 출처를 레포 하나로 수렴시켜 옛 버전 위 편집을 구조적으로 차단한다. (실제 사고: zh-TW/zh-HK 로케일 정정이 옛 복사본 기반 편집으로 2회 퇴행 — a26c45f·04aaded.)

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
- Supabase·Railway 인프라 변경 (배포·DB 인스턴스·Storage 버킷·보존 정책)
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
