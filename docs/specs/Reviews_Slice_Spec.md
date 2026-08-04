# Reviews 슬라이스 스펙 v1 (2026-08-04) — 시퀀스 5b

> 실측 소스: `design/pages/Review.dc.html` (sha256 `ba82f15c9a41452f0cb6b264eedfce1d1602055bafd5ca43256b42778e58ee07`).
> 선행: `Pages_Sequence_Spec.md` — **결정 ④ 확정(2026-08-04 Aiden)**: published 만 + 마스킹 표시명 +
> 최신순 커서 페이지네이션 + 평균 평점 노출 + 전체 언어 표시.

## 0. 범위

**수정 허용:** `lib/review/list.ts`(신규 — 목록·집계 쿼리) · `app/[locale]/(public)/reviews/page.tsx`(신규) ·
`lib/nav/items.ts`(reviews `enabled:true`) · `messages ×5`(`reviews` 네임스페이스) ·
`app/[locale]/(public)/service/page.tsx` + `service.trust.*`("준비 중" → `/reviews` 링크) ·
`lib/review/list.test.ts` · `e2e/reviews-page.spec.ts`.
**수정 금지:** `Review` 스키마 · `lib/review/{submit,mask,rateLimit}.ts` · 어드민 모더레이션(M8).

## 1. 디자인 대비 델타 (전부 데이터 정합 사유)

| # | 디자인 | 채택 | 근거 |
|---|---|---|---|
| D1 | 히어로 통계 4.9 · 3,650+ · 40+ COUNTRIES | **DB 집계만**(avg 소수1 + published count). 0건이면 통계 카드 미렌더. "40+ 개국" 메타는 데이터 없음 → 제거 | 디자인 자체 주석 "no fabricated ratings". 허위 표시 금지 |
| D2 | 리뷰 8건 샘플(국가·국기 포함) | 이식 0. 목록 = DB. **국가/국기 미표시**(스키마에 필드 없음) — 서브라인은 `createdAt` 날짜 | 스키마 실측: `authorDisplay`·`rating`·`body`·`packageSnapshot`·`language`·`createdAt` 뿐 |
| D3 | 영상 리뷰 카드(썸네일·▶·길이) | **미구현** — 텍스트 카드만. 영상은 어드민/CMS 소관(M8) + 스키마 부재 | PRD 9.3 M8(후기 모더레이션·UGC 큐) |
| D4 | 필터 6종(4패키지 + All + With video) | 패키지 필터 + All. **With video 제외**(D3). 칩 라벨은 `listPackages`(DB) — 하드코딩 0. 서버사이드 `?package=` 링크(JS 0). 리뷰 0건이면 필터 바 미렌더 | `packageSnapshot.name` 경로 필터(canonical 형태 = confirm route 실측 `{name, category, slotMinutes, cdIncluded}`) |
| D5 | "Write a review" → My Page | `/my` 링크(실존). 디자인 노트 "returning-customer flow (My Page)" 그대로 | 리뷰 제출은 매직링크 검증 고객 전용(stage F) |
| D6 | 페이지네이션 없음(전량 렌더) | **최신순 커서**(createdAt desc, id desc 타이브레이크) + "더 보기" 링크(`?cursor=`) | 결정 ④ |
| D7 | 별점 ★ 색 `#E8A94B` | 유지하되 **텍스트 병기**(sr-only `{rating}/5`) — 색·기호 단독 전달 금지(§3.9). 아바타 이니셜 원은 장식(aria-hidden), 색은 `authorDisplay` 해시 고정 팔레트 | |
| D8 | PII | 조회 select 에서 `authorNameSnapshot`·`ip` **제외**(🔒 필드 — 목록 페이지가 만질 이유 없음) | §3.6 |

렌더 모드: **force-dynamic**(리뷰는 제출 즉시 노출 — `status=published` 기본). 언어 필터 없음(결정 ④ — 전체 언어 표시).

## 2. 게이트

tsc·biome·i18n:check·vitest(신규 list 단위 포함)·build(프리렌더 33 유지 — reviews 는 dynamic)·
`e2e/reviews-page.spec.ts`(5로케일 200 + nav REVIEW 활성 + 빈 상태 렌더) + Service "준비 중" → 링크 전환 확인 +
하드코딩 스캔(`4.9|3,650|3650|40+|★★★★★` 리터럴 0).
