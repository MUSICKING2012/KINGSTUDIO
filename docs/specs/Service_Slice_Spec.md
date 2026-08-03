# Service 슬라이스 스펙 v1 (2026-08-03) — 시퀀스 5a

> 실측 소스: `design/pages/Service.dc.html` (sha256 `a9405ef0da155b14d32438f0dd84908175547cc6d86a8dbb4d24fabf3c084e19`).
> 선행: `Pages_Sequence_Spec.md` v1 — 결정 ② = A(FAQ/About 존치), ⑤ = 사실 확인 3건 확정.
> 카피 정본은 이 문서가 아니라 **messages 커밋**이다(5로케일 × ~60키 — 문서 중복 배제).
> 정정 원칙(F1~F8)은 Pages_Sequence_Spec §3 판정을 따른다.

## 0. 범위

**수정 허용:** `app/[locale]/(public)/service/page.tsx`(신규) · `lib/nav/items.ts`(service `enabled:true` 만) ·
`messages/{5}.json`(`service` 네임스페이스 신설) · `e2e/service-page.spec.ts`(신규).
**수정 금지:** 기존 `/faq`·`/about`(결정 ②-A 존치) · 헤더/푸터 · tailwind·globals · `lib/review|slots|catalog`(읽기 재사용만).

## 1. 섹션 매핑 (디자인 → 구현)

| 디자인 섹션 | 구현 | 델타(전부 기확립 규칙) |
|---|---|---|
| Hero (메타행 + h1 + 서브) | `.ks-display text-[clamp(46px,9vw,110px)]` + `leading-[0.9]`, 메타행 `/40→/70` | F5: 메타 `EN · KO · JA · ZH` |
| Trust strip | 홈 TrustStrip 과 별개(인용문 포함 변형). NYT URL = 레포 정본 상수, 인용문 = F8 확정 원문 | `/.4·/.5→/70`, "traveler reviews" 링크는 `/reviews` 미존재 → **비링크 + 준비 중**(5b 가 켬) |
| Three pillars ×3 | light(`paper-raise`)/accent(`primary`)/dark(`foreground`) 카드 — 홈 §5-B 스킴 재사용 | accent 카드 본문 잉크(§11-W). desc 는 F3·F4 정정 반영 신규 카피 |
| How a session works ×5 | `border-t-2` + accent 번호(24px w800 = large 3:1 통과, 장식 병기 번호라 §3.9 비해당) | step 3·5 의 mp3-only 서술 → WAV·MP3(F3) |
| What you take home | 다크 패널 `bg-foreground`(단일 패널 — 홈 다크 섹션과 달리 카드형이라 footer 와 동일 계열) + 5행 | 행 라벨에 조건 명기: 리포트 = Gold, MV = Premium (색·배치 아닌 텍스트) |
| Cross-links ×2 | 그룹 → `/group`(실존) · 렌탈 → `isCategoryVisibleForLocale('rental')` 게이트(비-ko 비링크) — 헤더와 동일 함수 재사용(unstable_cache 라 정적 유지) | F1: "from 2 people" 문구 **제거** — 인원 숫자는 카피에 두지 않고 상세는 `/group` 위임 |
| FAQ ×5 + 전체 링크 | 네이티브 `<details>`(JS 0) + `+` 회전 아이콘(장식 `aria-hidden`) + **"전체 FAQ → /faq"**(결정 ②-A) | F1·F2·F3 반영 재작성. 인원 정액 숫자 금지 — 그룹/게스트 답변은 카탈로그로 위임 |
| CTA | accent 패널, 흰 대형 헤드라인(≥34px w800 = AA-large 3.4:1 통과) + 버튼 2(white/ink 채움 — 채움 위 라벨 각각 잉크/paper) | 버튼 href: See packages → `/experience`(리네임 전 현행), Book → `/booking` |

**렌더 모드:** 정적 프리렌더(+5로케일 = 28→33). DB 직접 조회 없음 — 렌탈 게이트는 `unstable_cache` 경유라
정적 생성과 공존(헤더에서 검증된 경로). **가격·시간·인원 하드코딩 0** — 구체 수치가 필요한 서술은 전부
카탈로그(`/experience`·`/group`)로 링크 위임한다. 소요시간 "2~3시간"은 PRD §5.2 slotMinutes(120·180)의
범위 서술이라 허용하되 "약(about)" 한정어 필수.

## 2. 게이트

tsc·biome·i18n:check(+런타임 키체크)·vitest·build(프리렌더 **33**)·`e2e/service-page.spec.ts`
(5로케일 200 + nav SERVICE 링크 활성 + 렌탈 크로스링크 ko만 링크) + 하드코딩 스캔
(`400,000|₩|minG|2–15|2~15|up to 5|from 2`) 히트 0.

## 3. i18n

`service` 네임스페이스 신설(메타 2 + hero 3 + 메타행 5 + trust 4 + pillars 3×4 + steps 5×2 + takehome 2+5×2 +
crosslinks 6 + faq 5×2 + cta 3 ≈ 60키). ja·zh 값은 기계번역 초안 — **Aiden 감수 대상**(CLAUDE §5, 감수 전
출시 카피 아님). nav 는 기존 `nav.service` 재사용(이미 5로케일 존재).
