# 페이지 시퀀스 킥오프 스펙 v1 (2026-08-03) — 디자인 개편 시퀀스 5

> **성격: 킥오프.** 5개 페이지(Service·Studio·Product·Review·Blog)의 슬라이스 분할·순서·공통 결정을
> 확정하는 문서다. **페이지별 상세 스펙은 각 슬라이스 착수 시 별도 작성**한다(홈 시퀀스 4와 동일 사이클:
> 디자인 스냅샷 sha 고정 → 실측 덤프 → 스펙 → OPEN DECISION → 구현 → 게이트).
>
> 디자인 소스: claude.ai/design 프로젝트 `4823843e-9325-4bf9-8d38-4a409d5b59df`.
> 스냅샷은 `design/pages/` 에 커밋해 sha 를 고정한다(푸터 3-R 의 "스냅샷 부재" 미결을 본 시퀀스부터 해소).
> 현재 스냅샷: `Service.dc.html` = `a9405ef0da155b14d32438f0dd84908175547cc6d86a8dbb4d24fabf3c084e19`.
> 나머지 4개는 각 슬라이스 STEP 0 에서 DesignSync 로 취득·커밋·고정한다.

## 0. 레포 실측 (2026-08-03 @ 684fedb)

| 항목 | 상태 |
|---|---|
| nav 탭 | SERVICE·REVIEW·BLOG = `enabled:false` 비활성 span / STUDIOS→`/rental`(ko 게이트) / PRODUCT→`/experience` |
| `/reviews` `/blog` `/service` `/product` `/studios` | 전부 미존재 |
| 리뷰 백엔드 | **제출까지만 존재**(stage F: `lib/review/submit.ts`, `/api/review`, `Review` 모델 `status=published` 기본, 마스킹·rate limit). **목록 조회 쿼리·페이지 없음** |
| 블로그 백엔드 | 없음. 단, Ghost CMS 블로그 운영 정황(king-studio-blog 스킬 계열) — 사이트 내 통합 여부 미확정 |
| `/faq` | 존재(9키). Service 디자인이 자체 FAQ 섹션(5문항)을 포함 → IA 중복 |
| `/about` | 존재(7키). 유일 인바운드 = 푸터 About 링크 |

## 1. 슬라이스 분할·순서 (제안)

| 슬라이스 | 페이지 | 신설/변경 | 난이도 근거 | 선행 결정 |
|---|---|---|---|---|
| **5a** | Service → `/service` 신설, nav SERVICE 탭 켬 | 정적(DB 0) | 스냅샷 확보·순수 콘텐츠. 홈 프리미티브 재사용 | ②(FAQ/About IA) ⑤(카피 대조) |
| **5b** | Review → `/reviews` 신설, nav REVIEW 탭 켬 | 목록 쿼리 신설(읽기 전용) | 데이터 실재(stage F). moderation(published만)·마스킹 표시 | ④(노출 정책) |
| **5c** | Product → `/experience` 개편(+리네임?) | 기존 페이지 개편, booking 앵커 | 카탈로그·비교표 재사용. 리네임 시 redirect+sitemap+nav href | ①(리네임) |
| **5d** | Studio → `/rental` 개편(+리네임?) | 기존 페이지 개편, ko 전용 | 5c 패턴 재사용 + 로케일 게이트 유지 | ①(리네임) |
| **5e** | Blog | **미확정** | 데이터 소스 부재 | ③(범위) |

순서 근거: 5a·5b 는 신설이라 기존 URL 을 건드리지 않고 nav 비활성 탭을 하나씩 켠다(가시 성과·저위험).
5c·5d 는 리네임 결정이 걸려 있어 뒤로. 5e 는 데이터 소스 결정 전 착수 불가.

## 2. 공통 규칙 (홈 시퀀스에서 확립 — 재확인)

- 신규 Tailwind 토큰 0. 디스플레이는 `.ks-display` + arbitrary clamp(CJK 보정 경로).
- accent 채움 위 라벨 = 잉크(§11-W). 라이트 소형 텍스트 알파 하한 `/70`, 다크 `/65`.
- 가격·시간·인원·전달물 하드코딩 금지 — DB(`packages`)·PRD §5.2/§5.6 이 정본. i18n 은 ICU `{max}` 패턴.
- `.dc.html` href 이식 금지. 죽은 링크 0(미존재 라우트는 비링크).
- messages 편집은 python splice, 5로케일 동시.
- 각 슬라이스 게이트: tsc·biome·i18n:check·런타임 키체크·vitest·build(프리렌더 28 유지)·해당 E2E.
- 리네임 슬라이스(5c·5d)는 308 redirect(`permanentRedirect` — 5c·5d 구현 실측) + sitemap + `lib/nav/items.ts` href + 홈 Categories href 동시 갱신.

## 3. Service 카피 사전 플래그 (5a STEP 1-A 대조 목록 — 스냅샷 실측)

디자인 원문에서 **PRD 와 충돌이 확인/의심되는 문구**. 5a 스펙에서 판정·대체한다.

| # | 디자인 문구 | 판정 | 근거 |
|---|---|---|---|
| F1 | Making Class "from 2 people" (크로스링크·FAQ, 2회) | **stale 확정** | C12 = 최소 3 (`seed-packages.ts` headcountMin 3). 홈 §11-D 와 동일 함정 |
| F2 | "Solo packages take up to 5 guests" (FAQ) | **오류 확정** | Gold headcountMax = 2. ICU `{max}` 패턴으로 |
| F3 | "unedited recording (MP3)" / steps 전반 mp3-only 서술 | **오류 확정** | PRD §5.6: WAV 16/44.1 + MP3 둘 다 ● + Gold 는 간이 믹스(1절+후렴)도 ● |
| F4 | "personal vocal report" (pillar·deliverables, Gold 전용 서술) | **실재 확정 (2026-08-03 Aiden)** | 코드는 이미 알고 있었음(`comparison.ts:31` gold:true·비교표 5로케일 라벨 존재). **PRD §5.6 매트릭스에 행 추가 + `gold.includes` 5로케일 동기화 완료** — 3자 정합(PRD·코드·카피) 회복 |
| F5 | "Guided in English, Korean & Japanese" / 히어로 메타 "EN · KO · JA" | **불완전 확정 (2026-08-03 Aiden: zh 지원함)** | 5a 카피는 **EN·KO·JA·ZH 4개 언어**로 표기(en: "English, Korean, Japanese & Chinese"). 디자인의 3개 언어 표기는 이식 금지 |
| F6 | 딜리버러블 "secure link — version history and an expiry date" | 통과 | 매직링크·서명 URL 정책(§3.5)과 정합 |
| F7 | pillar 02 "vocal report is Gold-only" | F4 종속 | F4 판정에 따름 |
| F8 | NYT 인용문 ""Dreams of Being a K-Pop Star?…"" | **일치 확정 (2026-08-03 Aiden)** | 인용 사용 가능. URL 은 레포 정본과 동일 |

## 4. OPEN DECISION (A/B/C + 추천 — 확정 전 해당 슬라이스 착수 금지)

### ① 라우트 리네임 — `/experience`→`/product`, `/rental`→`/studios` (5c·5d 선행) — **확정 A (2026-08-04 Aiden "리네임 A 진행")**
- **A. 리네임 실행**: nav 라벨(PRODUCT·STUDIOS)과 URL 일치. 308 redirect 영구 유지 + sitemap 갱신.
  기존 URL 인바운드(홈 Categories·푸터·booking 백링크) 동시 갱신. SEO 리스크는 308 로 흡수.
  (구 표기 301 은 308 로 정정 — 실제 구현은 `permanentRedirect` = 308, 5c·5d 동일. PR #36 리뷰 반영.)
- **B. 현행 URL 유지**: nav 라벨만 PRODUCT/STUDIOS, URL 은 /experience·/rental. 작업 최소.
  라벨↔URL 불일치가 영구화.
- **추천 = A.** 출시 전 greenfield 라 308 비용이 사실상 0 인 지금이 마지막 싼 시점. 출시 후엔 비싸진다.

### ② Service ↔ 기존 /faq·/about IA (5a 선행)
- **A. Service 신설 + /faq·/about 존치**: Service 의 FAQ 섹션은 대표 5문항 + "전체 FAQ →" 링크.
  기존 페이지 무변경, 죽는 URL 0.
- **B. Service 가 흡수**: /faq·/about → /service 301. 콘텐츠 통합·유지 페이지 감소. 단 /faq 9문항 vs
  디자인 5문항 — 정보 손실 또는 Service 비대화.
- **추천 = A.** 5a 를 정적 신설로 유지(리네임·redirect 무관). 통합은 콘텐츠가 안정된 뒤 별도 판단.

### ③ Blog 범위 (5e 선행) — **확정 = D(신규안): 자체 운영, Ghost 배제 (2026-08-05 Aiden)**
- ~~A. 이연~~ / ~~B. Ghost 외부 링크~~ / ~~C. Ghost Content API 연동~~ — 전부 기각.
- **D. 자체 블로그**: 사이트 내 /blog 신설, Ghost 미사용. 세부(기존 글 이관·저장소·로케일·
  뉴스레터)는 `Blog_Slice_Spec.md` §2 OPEN ⓐ~ⓓ.

### ④ Review 노출 정책 (5b 선행)
- 표시 = `status=published` 만 + `authorDisplay`(마스킹) + `packageSnapshot` + rating + body.
- 결정 필요: (a) 정렬·페이지네이션(최신순 N개? 더보기?), (b) 평균 평점 노출 여부, (c) 로케일 필터
  (리뷰 `language` 필드 존재 — 현재 로케일 우선? 전체?). PRD §5.9 대조는 5b 스펙에서.
- **추천**: 최신순 + 커서 페이지네이션, 평균 노출(집계 쿼리), 전체 언어 표시(양 부족 초기라 필터 시 빈 화면 위험).

### ⑤ F4·F5·F8 사실 확인 — **전건 확정 (2026-08-03 Aiden 회신)**
- F4 보컬 리포트 = **실재(Gold 전용)** → PRD §5.6 행 추가·`gold.includes` 5로케일 반영 완료(이 커밋).
- F5 세션 진행 언어 = **EN·KO·JA·ZH** → 5a 카피 4개 언어 표기.
- F8 NYT 제목 = **일치** → 인용 사용 가능.

부수 발견·정정(이 커밋): 기존 카탈로그 카피 `packages.items.making-class.concept` 이 5로케일 전부
"(2~15명)" 으로 **C12(최소 3) stale** 이었음 → "(3~15명)" 계열로 정정(F1 과 동일 계열, 시퀀스 5 이전부터 존재).

## 5. 진행 현황

| 슬라이스 | 상태 |
|---|---|
| 5a Service | ✅ 머지(PR #33) — /service 라이브, nav 탭 활성 |
| 5b Review | ✅ 머지(PR #34) — /reviews + nav 탭 + Service 링크 활성 |
| 5c Product | ✅ 머지(PR #35, 2026-08-04) — /product 신설 + /experience·/packages 308 직결 + nav·sitemap·인바운드 7곳 전환 (`Product_Slice_Spec.md`) |
| 5d Studio | **5d-1 리네임 ✅ 머지(PR #36)** / **5d-2 레이아웃 ✅ 머지(PR #37, 2026-08-05)** / **5d-3 fill-in ✅ 구현(2026-08-05 — 룸 스펙·장비·팀 DB 3테이블 + 전 로케일 소개 전환, `Studio_Slice_Spec.md` §4)**. 잔여 = 5d-3 PR 머지 + ja·zh 감수 + 실사진·장비 상세·bio 후속 fill-in |
| 5e Blog | **결정 ③ ✅ 확정(2026-08-05): 자체 운영, Ghost 배제(신규 D안)** — 스냅샷 2종 sha 고정 + `Blog_Slice_Spec.md` 신설. 5e 전용 OPEN ⓐ~ⓓ(이관·저장소·로케일·뉴스레터) 회신 대기 |

## 6. 다음 착수 가이드 (머신 무관 — 새 세션 킥오프용)

> **2026-08-05 갱신:** 5d 는 5d-3(fill-in·전 로케일 전환)까지 구현 완료 — 아래 5d 킥오프 절차는
> **이력 보존용**이다. 현재 잔여 = ① 5e Blog(결정 ③ 대기) ② 후속 fill-in 소슬라이스(실사진·
> 장비 상세·팀 bio — `Studio_Slice_Spec.md` §4-A) ③ ja·zh 감수(Aiden).

~~다음 작업 = **5d Studio**~~ (완료): `/rental` → `/studios` 리네임(결정 ① A 기확정) + STUDIOS 페이지 신설.

킥오프 절차 (5c 와 동일 사이클):
1. `git pull` 후 STEP 0 (worktree clean · main=origin/main 확인).
2. `Studio.dc.html` 을 DesignSync 로 가져와 `design/pages/` 에 sha 고정 커밋. **주의: DesignSync 는
   서브에이전트에 전파되지 않음 — 메인 세션에서 직접 호출**(5c 실측).
   **추가 실측(2026-08-05, 원격 세션): DesignSync 는 원격(claude.ai/code) 환경에서 인증 불가**
   (/design-login 이 대화형 터미널 전용). 원격에서 스냅샷이 필요하면 Claude Design 의
   "Send to Claude Code Web" 으로 시드하거나 파일을 직접 커밋해 제공해야 한다. 이 때문에 5d 는
   5d-1(리네임 — 디자인 무관, 결정 ① 만으로 진행 가능)과 5d-2(디자인 레이아웃 — 스냅샷 필요)로
   분할 진행됐다.
3. `Product_Slice_Spec.md` §2 리네임 메커니즘 재사용 — 단, `/rental` 은 **ko 전용**이라 다름:
   nav localeGatedCategory('rental') 게이트 유지, 리다이렉트·sitemap 처리 시 비-ko 404 동작 검증 필수.
4. 디자인 자체 데이터(가격·슬롯·문구)는 이식 0 — DB·PRD 정본 대체(5c 델타표 패턴).
5. 게이트: tsc·biome·i18n:check·vitest·build(정적 라우트 수 기록, 현재 38)·e2e(리다이렉트 단언 포함)·
   가격 하드코딩 스캔.

보류·백로그: 5e Blog 는 결정 ③(Ghost 운영 여부) 대기. ja·zh 기계번역 감수(service 76 + reviews 17 +
product 신규 + **studios 20**)는 Aiden 몫. OPENEXCHANGERATES_APP_ID 미발급 → 환율 표시는 KRW 단독 강등 중(정상 동작).

### 6-A. 다산 인수인계 (2026-08-05 원격 세션 → 로컬)

~~5d-2 는 구현·게이트·푸시까지 완료, PR 만 미생성.~~ **인수인계 완료(2026-08-05 다산):
PR #37 생성 + 로컬 게이트 재검증 통과**(실 PG17 + Upstash REST — vitest 447/447 · e2e 71/71 ·
build 정적 104 · 가격 하드코딩 0). 원격 세션 시점 기록은 아래에 보존:
1. ~~PR 생성~~ → **PR #37** (제목 = feat 커밋 1행). 잔여 = CodeRabbit 반영 후 **머지**.
2. 잔여 작업: ① ~~PR 생성~~ → 머지. ② studios ns ja·zh 감수(Aiden).
   ③ 5d-3 은 fill-in(룸 스펙·room↔product 매핑·장비·팀 명단+동의·실사진) 도착 후 —
   범위·백로그는 `Studio_Slice_Spec.md` §3 하단.
3. 게이트 재검증 시 로컬 실 DB·Redis 필요(vitest 통합·e2e). 원격 세션은 스크래치 PG16(:5433)+
   Redis+Upstash REST 셔임으로 통과함(447/447·71/71) — 로컬 재검증도 동일 결과로 재현됨.
4. ~~홈 Categories INQUIRY ONLY 필 정정(결정 ② 후속)은 별도 소슬라이스~~ → **완료(2026-08-05,
   `fix/home-rental-pill-decision2`)** — `koreanOnly` 카피로 정정, `Studio_Slice_Spec.md` §3 하단.
