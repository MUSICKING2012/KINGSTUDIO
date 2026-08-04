# Product 슬라이스 스펙 v1 (2026-08-04) — 시퀀스 5c

> 실측 소스: `design/pages/Product.dc.html` (sha256 `188e85fc7a6cfbd1f67511c67ac27b9c118b5d5c07a5f8b54a51d237a90b120d`, 38,948 bytes).
> 선행: `Pages_Sequence_Spec.md` — **결정 ① 확정(2026-08-04 Aiden): A 리네임** — `/experience` → `/product`
> (nav PRODUCT 탭과 URL 일치, 구 URL 308 보존).

## 0. 범위

**수정 허용:** `app/[locale]/(public)/product/page.tsx`(신규) · `app/[locale]/(public)/experience/page.tsx`
(카탈로그 → 308 리다이렉트로 교체) · `app/[locale]/(public)/packages/page.tsx`(308 타깃 `/experience`→`/product`,
체인 방지) · `app/sitemap.ts`(STATIC_PATHS) · `lib/nav/items.ts`(product href 확정) ·
`components/home/categories-section.tsx`(vocal href) · `app/[locale]/(public)/page.tsx`(finalCta) ·
`app/[locale]/(public)/service/page.tsx`(×3 링크) · `messages ×5`(`product` 네임스페이스) ·
`e2e/product-page.spec.ts`.
**수정 금지:** `CategoryCatalog`(rental·group 이 계속 사용) · `PackageComparison`·`buildComparison` ·
`BookingBarSection`·`booking-bar.tsx` · `packages.items` 메시지 · 예약 플로우 일체.

## 1. 디자인 대비 델타 (전부 데이터 정합 사유)

| # | 디자인 | 채택 | 근거 |
|---|---|---|---|
| D1 | 카드 포함 목록 `incGold/incDia/incPre` — Gold 에 CD·사진·간이믹스 누락, "MP3 only", "personal vocal report is Gold-only" 문구, Melodyne 언급 | **이식 0.** 카드 목록 = `packages.items.{slug}.includes`(PRD §5.6 O2 매트릭스 정합본 — Gold: 곡 셀렉션·verse+chorus 마스터 편집·보컬 리포트·사진 ~30·CD·다국어) | 디자인 자체 데이터는 PRD 충돌. 레포 messages 가 정본 |
| D2 | 카드 가격 `PKG.gold.price=400000` 등 하드코딩 + 자체 환율표 `RATES` | **DB**(`listPackages`+`computePackageTotal`) + `formatKrw`/`formatApprox`(실환율 캐시). 정액 하드코딩 0 (§6) | CLAUDE §6 "가격 DB 관리, 코드 하드코딩 금지" |
| D3 | 가격 주 표기 = 외화 ≈, KRW 는 참고 줄 | **뒤집어 채택**: KRW 주 표기 + ≈ 외화 참고 | §3.2 KRW 단일 청구 — 사이트 전 화면 규약(Price 컴포넌트와 동일) |
| D4 | Making minG=2, "From 2 · Max 15", guests 기본 3 | **DB `headcountMin/Max`**(C12 = 3~15). 칩·총액 문구 전부 `{min}~{max}` 파라미터 | 5 킥오프에서 정정 완료된 stale 값 |
| D5 | 자체 비교표 12행 — **CD 행 Gold '—'**(PRD 는 Gold ●), Songs recorded 행 등 미검증 행 포함 | **이식 0.** `PackageComparison` + `buildComparison`(O2 매트릭스 기반 검증 컴포넌트) 재사용 | 비교표는 단일 진실 공급원 유지 — 화면별 사본 금지 |
| D6 | 결과물 갤러리 6슬롯("leave empty until client provides") | **섹션 미구현(이연).** 실사진 pre-flight(§9) 해소 후 별도 추가 | 빈 회색 타일 6개는 정보가치 0. 디자인 주석 자체가 client-provides 전제 |
| D7 | 환불 스트립·FAQ 취소 답 = "[PROVIDE POLICY]" placeholder | **PRD §5.3 A 구간으로 충전**: ≥3일 100% / 2일 80% / 1일 50% / 당일·노쇼 0%, PG 수수료 공제. "전체 정책" 링크는 legal 페이지(M5) 전까지 미노출(죽은 링크 0) | `lib/booking/refundPolicy.ts` 스냅샷과 동일 값 확인 |
| D8 | FAQ q5 전달 답 — "~2–3 wks" 러프 | **PRD §5.6 SLA 로 정밀화**: raw+사진 24h(영업일)·CD 당일 현장 전달·믹스마스터 세션일+21일(Dia·Prem)·Premium MV +28일 | SLA 표가 정본. Gold verse+chorus 편집의 SLA 는 PRD 미규정 → 언급 생략 |
| D9 | 단체 결과물 "Everyone takes home the group track" | **공유본 1세트**(단체 대표 수령)로 정정 | PRD §5.6 "단체 결과물은 공유본 1세트로 통일" — 개인별 분배는 단체 자율 |
| D10 | Making "weekdays only 10:00–12:00 / 14:00–16:00", 각 패키지 자체 슬롯표 | **이식 0.** 슬롯·시간대는 예약바(`BookingBarSection` → 실 availability API)가 정본 | §6-E 디자인 슬롯 로직 이식 금지(4e 확립) |
| D11 | 예약바 = 디자인 자체 데모(guests 셀렉트 포함) | **4e 검증본 `BookingBarSection` 재사용**(읽기 전용·draft 공유·위험 구역 통과본). guests 필드는 기존 예약 플로우 Stage C 소유 — 예약바에 추가하지 않음 | 위험 구역 재구현 금지. 디자인 goBook 앵커(`#bookbar`)는 기존 컴포넌트에 이미 존재 |
| D12 | 히어로 메타 스트립 `/40`, 그룹 패널 보조 텍스트 `.5~.6` | 라이트 `/70`·다크 `/65` 로 상향 | §11-W WCAG 소형 텍스트 대비 규칙 |
| D13 | Gold 카드 sub "Personal Vocal" 하드코딩 | `packages.items.gold.tagline` 재사용 | 카피 정본 일원화 |
| D14 | POPULAR 배지 = Diamond | 유지(순수 장식, 데이터 주장 아님) | 디자인 실측 그대로 |

렌더 모드: **force-dynamic** (DB 가격 + 표시 환율 + 통화 쿠키 — CategoryCatalog 계열과 동일).
체험 0개 로케일은 `notFound()` (CategoryCatalog 데이터 주도 게이트 동일 적용).

## 2. 리네임 A 메커니즘 (죽은 링크 0 · 체인 0)

| 경로 | 처리 |
|---|---|
| `/product` | 신규 본 페이지 (이 스펙) |
| `/experience` | route-level `permanentRedirect('/{locale}/product')` — 308 (next.config redirect 를 두지 않는 기존 원칙, `/packages` 선례) |
| `/packages` | 308 타깃을 `/experience` → `/product` 로 직결 재지정 (**308 체인 방지**) |
| `/packages/[slug]` | 유지 (상세 페이지는 리네임 대상 아님) |

인바운드 링크 전환(7곳): sitemap STATIC_PATHS · nav `lib/nav/items.ts` product href · 홈 finalCta
(`page.tsx:98`) · 홈 categories vocal(`categories-section.tsx`) · service ×3. e2e 는 URL 미고정 확인
(`grep experience e2e/` → download.spec 의 category 값뿐).

## 3. 게이트

tsc·biome·i18n:check(5로케일 `product` ns)·vitest·build(정적 라우트 수 기록 — `/experience` 리다이렉트가
정적 프리렌더로 잡히면 33 에서 변동 가능, 실측치를 PR 에 기록)·`e2e/product-page.spec.ts`
(5로케일 200 + nav PRODUCT 활성 + **/experience·/packages 308 → /product 검증** + 카드 3장 = DB 체험 수 +
단체 패널 인원 = DB `{min}~{max}` + 예약바 렌더) + 하드코딩 스캔(`400,000|500,000|1,500,000|150,000`
리터럴 0 — DB 외 출처 금지).
