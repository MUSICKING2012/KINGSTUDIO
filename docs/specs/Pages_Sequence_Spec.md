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
- 리네임 슬라이스(5c·5d)는 301 redirect + sitemap + `lib/nav/items.ts` href + 홈 Categories href 동시 갱신.

## 3. Service 카피 사전 플래그 (5a STEP 1-A 대조 목록 — 스냅샷 실측)

디자인 원문에서 **PRD 와 충돌이 확인/의심되는 문구**. 5a 스펙에서 판정·대체한다.

| # | 디자인 문구 | 판정 | 근거 |
|---|---|---|---|
| F1 | Making Class "from 2 people" (크로스링크·FAQ, 2회) | **stale 확정** | C12 = 최소 3 (`seed-packages.ts` headcountMin 3). 홈 §11-D 와 동일 함정 |
| F2 | "Solo packages take up to 5 guests" (FAQ) | **오류 확정** | Gold headcountMax = 2. ICU `{max}` 패턴으로 |
| F3 | "unedited recording (MP3)" / steps 전반 mp3-only 서술 | **오류 확정** | PRD §5.6: WAV 16/44.1 + MP3 둘 다 ● + Gold 는 간이 믹스(1절+후렴)도 ● |
| F4 | "personal vocal report" (pillar·deliverables, Gold 전용 서술) | **실재 미확인** | PRD §5.6 전달물 매트릭스에 없음. `packages.items.gold.includes` 에도 없음. **Aiden 확인 필요** — 실재하면 PRD 정정, 아니면 카피 제거 |
| F5 | "Guided in English, Korean & Japanese" / 히어로 메타 "EN · KO · JA" | **사실 미확인** | 세션 진행 언어(직원 역량) 주장 — 사이트 로케일(5개)과 별개. zh 고객 응대 불가 단정이 되므로 **Aiden 확인 필요** |
| F6 | 딜리버러블 "secure link — version history and an expiry date" | 통과 | 매직링크·서명 URL 정책(§3.5)과 정합 |
| F7 | pillar 02 "vocal report is Gold-only" | F4 종속 | F4 판정에 따름 |
| F8 | NYT 인용문 ""Dreams of Being a K-Pop Star?…"" | **검증 필요** | 실제 기사 제목과 일치 여부 — 허위 인용 방지. URL 은 레포 정본과 동일 |

## 4. OPEN DECISION (A/B/C + 추천 — 확정 전 해당 슬라이스 착수 금지)

### ① 라우트 리네임 — `/experience`→`/product`, `/rental`→`/studios` (5c·5d 선행)
- **A. 리네임 실행**: nav 라벨(PRODUCT·STUDIOS)과 URL 일치. 301 redirect 영구 유지 + sitemap 갱신.
  기존 URL 인바운드(홈 Categories·푸터·booking 백링크) 동시 갱신. SEO 리스크는 301 로 흡수.
- **B. 현행 URL 유지**: nav 라벨만 PRODUCT/STUDIOS, URL 은 /experience·/rental. 작업 최소.
  라벨↔URL 불일치가 영구화.
- **추천 = A.** 출시 전 greenfield 라 301 비용이 사실상 0 인 지금이 마지막 싼 시점. 출시 후엔 비싸진다.

### ② Service ↔ 기존 /faq·/about IA (5a 선행)
- **A. Service 신설 + /faq·/about 존치**: Service 의 FAQ 섹션은 대표 5문항 + "전체 FAQ →" 링크.
  기존 페이지 무변경, 죽는 URL 0.
- **B. Service 가 흡수**: /faq·/about → /service 301. 콘텐츠 통합·유지 페이지 감소. 단 /faq 9문항 vs
  디자인 5문항 — 정보 손실 또는 Service 비대화.
- **추천 = A.** 5a 를 정적 신설로 유지(리네임·redirect 무관). 통합은 콘텐츠가 안정된 뒤 별도 판단.

### ③ Blog 범위 (5e 선행)
- **A. 이연**: nav BLOG 탭 비활성 유지. 데이터 소스(Ghost 연동? 자체 CMS?) 확정 후 착수.
- **B. Ghost 외부 링크**: nav BLOG 를 외부 블로그 URL 로. 사이트 이탈 발생, 최소 작업.
- **C. Ghost Content API 연동 목록 페이지**: 사이트 내 통합. API 키·인프라 결정 필요(M 범위 검토).
- **추천 = A.** Ghost 운영 여부·URL·통합 수준은 Aiden 만 아는 사실. 확인 전 착수 불가.

### ④ Review 노출 정책 (5b 선행)
- 표시 = `status=published` 만 + `authorDisplay`(마스킹) + `packageSnapshot` + rating + body.
- 결정 필요: (a) 정렬·페이지네이션(최신순 N개? 더보기?), (b) 평균 평점 노출 여부, (c) 로케일 필터
  (리뷰 `language` 필드 존재 — 현재 로케일 우선? 전체?). PRD §5.9 대조는 5b 스펙에서.
- **추천**: 최신순 + 커서 페이지네이션, 평균 노출(집계 쿼리), 전체 언어 표시(양 부족 초기라 필터 시 빈 화면 위험).

### ⑤ F4·F5·F8 사실 확인 (5a 선행, Aiden 전용)
- F4 보컬 리포트: 실제 제공물인가? (실재 시 PRD §5.6 매트릭스 정정 필요)
- F5 세션 진행 언어: EN·KO·JA 가 맞는가? zh 는?
- F8 NYT 기사 제목 원문 확인.

## 5. 진행 현황

| 슬라이스 | 상태 |
|---|---|
| 5a Service | 스냅샷·플래그 완료. **결정 ②·⑤ 대기** |
| 5b Review | **결정 ④ 대기** |
| 5c Product / 5d Studio | **결정 ① 대기** |
| 5e Blog | **결정 ③ 대기** |
