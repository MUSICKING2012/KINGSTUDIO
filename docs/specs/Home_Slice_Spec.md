# 홈 슬라이스 스펙 v1 (2026-07-30) — 디자인 개편 시퀀스 4

> 실측 소스: ① `design/KING STUDIO Editorial.dc.html`(sha256 `48488e33f3005b2ecb0004763523215b8ba57008d2afe8f5cd0416211bed742a`)
> 8개 섹션 마크업·`static T` 카피 맵 ② 레포 07-30 실측 @ `719feca`(clean) — `app/[locale]/(public)/page.tsx`,
> `app/[locale]/layout.tsx`, `app/globals.css`, `tailwind.config.ts`, `messages/{en,ko,ja,zh-HK,zh-CN}.json`,
> `components/catalog/*`, `components/booking/*`, `lib/slots/*`, `lib/nav/items.ts`, `prisma/seed-packages.ts`.
> 선행 스펙: `Tailwind_Token_Spec.md` v1.2(토큰) · `Nav_Footer_Slice_Spec.md` v1(공용 셸, shipped).

**이 문서는 스펙이다. 코드 변경은 후속 구현 슬라이스(§0-C 4a~4f)에서 한다.**

---

## 0. 범위

### 0-A. 수정 허용 / 금지

**수정 허용 (구현 슬라이스에서):**
- `app/[locale]/(public)/page.tsx` — 전면 재작성(현행 5섹션 → 에디토리얼 8섹션 구성).
- `components/home/*` — **신규 디렉터리.** 섹션별 컴포넌트 + 이미지 플레이스홀더 프리미티브.
- `messages/{en,ko,ja,zh-HK,zh-CN}.json` — `home` 네임스페이스 재구성(§9). **5파일 동시 편집**(parity).

**수정 금지:**
- `tailwind.config.ts`, `app/globals.css` — 시퀀스 2 산출물. **이 슬라이스는 신규 토큰을 추가하지 않는다**(§0-B).
- `app/[locale]/layout.tsx`, `components/header/*`, `components/footer/*` — 시퀀스 3 shipped.
- `lib/nav/items.ts` — nav config는 nav 슬라이스 소유.
- `lib/slots/*`, `app/api/availability/route.ts`, `components/booking/*` — 예약 도메인(§4 위험 구역). 홈은 **읽기 소비자**일 뿐.
- `lib/catalog/*`, `components/price/price.tsx` — 재사용만.
- 라우트 파일 전부(`/experience`·`/rental`·`/group`·`/packages`) — 리네임·정합은 각 페이지 슬라이스 담당(Nav 스펙 §7-①).
- `prisma/*` — 스키마·시드 변경 없음.

### 0-B. 토큰 사용 원칙 (신규 토큰 0)

이 슬라이스가 요구하는 모든 시각 값은 **기존 토큰 + arbitrary value**로 표현 가능하다. 신규 토큰 추가 제안 없음.

- **디스플레이 헤드라인은 전부 `.ks-display`(+`.ks-display-strong`) + arbitrary `text-[clamp(...)]`** 로 쓴다.
  `edi-*` fontSize 토큰(`text-edi-hero` 등)은 **이 슬라이스에서 사용하지 않는다.**
  근거: CJK line-height/letter-spacing 보정(`globals.css:92-97`)이 `.ks-display` 셀렉터에만 걸려 있다. `edi-hero`는
  `lineHeight 0.86` / `letterSpacing 0.01em`을 fontSize 튜플로 직접 주입하므로(`tailwind.config.ts:101-104`) CJK에서
  어센더가 잘린다. 홈의 모든 대형 헤드라인은 5로케일 CJK 카피를 받으므로 예외 없이 `.ks-display` 경로를 쓴다.
  (shipped 선례: `components/header/site-header.tsx:47`, `components/footer/site-footer.tsx:34`.)
  → `edi-*` 스케일 미소비 상태에 대한 처분은 §12 미결.
- 색: paper `bg-paper`/`text-paper`, ink `text-foreground`, 다크 서피스 `bg-ink-deep`·`bg-ink-raise`,
  이미지 placeholder `bg-paper-dim`, 카드 라이트 variant `bg-paper-raise`, accent = **`bg-primary`**
  (Nav 스펙 §1-C 확정: 브랜드 레드 = shadcn `--primary`. shadcn `accent`는 웜 뉴트럴).
- radius `rounded-ks-{field,card,img,panel,bar}` · shadow `shadow-edi-{photo,caption}` · 모션 `animate-edi-marquee`.
- 알파는 slash opacity(`text-foreground/70`, `text-paper/45`)로. 토큰화하지 않는다.

### 0-C. 구현 슬라이스 분할안

| 슬라이스 | 내용 | 파일 | 검증 단위 |
|---|---|---|---|
| **4a** ✅ | 홈 셸 + 이미지 플레이스홀더 프리미티브 + **Hero**(§1) | `page.tsx`(hero 섹션만 교체), `components/home/editorial-image.tsx`, `components/home/hero-section.tsx`, messages ×5 | tsc·biome·i18n:check·build compile / 5로케일 CJK 클리핑 / hero 대비 감사 |
| **4b** | **Trust strip**(§2) + **Provide 다크**(§3) + **Boost**(§7) — 전부 정적, DB 무관 | `components/home/trust-strip.tsx`, `provide-section.tsx`, `boost-section.tsx`, messages ×5 | 게이트 전항 / 마퀴 `prefers-reduced-motion` 정지 확인 / 다크 대비 체크리스트(§10-4) |
| **4c** | **Categories**(§4) — 결정 ④ 반영, `/rental` 로케일 게이팅 | `components/home/categories-section.tsx`, messages ×5 | 게이트 전항 / 5로케일에서 죽은 링크 0(비-ko `/rental` 비링크 렌더) |
| **4d** | **Bolder + 패키지 카드**(§5) — **DB 배선**, 렌더 모드 전환(결정 ⑦) | `components/home/package-cards.tsx`(서버), `bolder-section.tsx`, `page.tsx`(렌더 모드), messages ×5 | 게이트 전항 + **가격·인원·시간 하드코딩 0 스캔**(§10-6) / 5로케일 통화 표기 |
| **4e** | **Booking bar**(§6) — 결정 ① = **C(실 슬롯 배선) 확정** | `components/home/booking-bar.tsx`, messages ×5 | 게이트 전항 + **§4 위험 구역 → Vitest + Playwright E2E 필수**(§14-①) |
| ~~4f~~ | ~~Subscribe(§8)~~ — **취소.** 결정 ⑤ = A(제외), M5 동의 모듈로 이연 | — | M5 백로그 |

의존 순서: 4a → 4b/4c(병렬 가능) → 4d → 4e. 4d가 `page.tsx` 렌더 모드를 바꾸므로 4e보다 먼저 착지해야 한다.

---

## 1. Hero (디자인 52–82행)

`<section id="top">` `mx-auto max-w-container-max px-gutter pt-[34px]` (52행: `padding:34px 24px 0`).

### 1-A. 상단 행 (53–64행)
`flex flex-wrap items-start justify-between gap-5`

- **좌 키커 열** (54–57행) `flex max-w-[220px] flex-col gap-0.5`
  - kicker1 (55행) `text-[12px] font-semibold leading-[1.4] text-foreground/70`
    (⚠ 디자인 `rgba(20,18,16,.5)` 미채택 — 12px 소형 텍스트는 §11-W 하한 `/70`. 실측 6.54:1)
  - kicker2 (56행) `.ks-display text-[clamp(22px,2.4vw,30px)]` — 원문 `font-weight:800; line-height:1.02; uppercase`.
    `.ks-display`가 w800·uppercase를 제공하고 lh는 .86로 덮이나 CJK에서는 1로 보정된다. 라틴에서 .86이 과하면
    `leading-[1.02]` 유틸을 병기(유틸이 components 레이어를 이긴다).
- **우 NYT 카드** (58–63행, `showHeroCard`) `flex items-center gap-3 rounded-ks-card border border-foreground/10 bg-white py-2 pl-[14px] pr-2`
  - title `text-[12px] font-bold` / sub `text-[11px] text-foreground/70`
    (⚠ 디자인 `.55` 미채택 — 동일 사유. 실측 6.97:1)
  - CTA `rounded-[9px] bg-primary px-[15px] py-[9px] text-[12px] font-bold` → **`text-foreground`**
    (⚠ 디자인 `color:#fff` 미채택 — 12px 볼드 흰 글자/accent ≈ 3.4:1, AA 4.5 미달. §11-W. Nav `Book now` 선례와 동일.)
  - 링크 대상 = `/booking`. **NYT 기사 링크는 여기 두지 않는다** — 트러스트 스트립(§2)이 유일 진입점(중복 링크 금지).

### 1-B. 메타 행 (68–70행)
`flex flex-wrap items-center justify-between gap-1.5 pb-1.5 pt-[14px] text-[10.5px] font-bold uppercase tracking-[0.08em] text-foreground/40`
6항목: `K-POP` / `2026` / `SEOUL` / `SESSION` / `(UNLIMITED)` / `(D2C)`. 뒤 2개는 원문 `rgba(...,.25)`.

⚠ 대비 델타: `/40`·`/25`는 10.5px 소형 텍스트에서 AA 미달(계산값 각 ≈2.3:1·1.6:1). → **`text-foreground/70`, 뒤 2개
`text-foreground/55`**로 상향(계산값 6.2:1·3.8:1 — /55는 소형 텍스트 4.5 미달이므로 뒤 2개도 `/70` 권장,
시각적 위계는 `font-normal`로 표현). 최종: 전 항목 `/70`, 뒤 2개만 `font-semibold`(나머지 `font-bold`).

⚠ `2026` = 연도 스탬프 하드코딩. §12 미결(연 1회 갱신 의무).

### 1-C. 대형 디스플레이 + 오버랩 사진 (71–80행)
`relative flex flex-col items-center`

- big1 (72행) `.ks-display text-[clamp(58px,14.5vw,200px)] w-full text-center` — 색 `text-foreground`.
- **사진** (74–78행) `relative z-[2] my-[-4vw] flex w-[min(340px,72vw)] aspect-[3/3.4] overflow-hidden rounded-ks-panel shadow-edi-photo`
  - 내용물 = §1-E 플레이스홀더 프리미티브. `x-import image-slot`은 이식 금지(§11).
  - rotBadge (76행) `absolute left-[-30px] top-[32%] rotate-[-90deg] rounded-[6px] bg-primary px-[14px] py-1.5 text-[10px] font-extrabold tracking-[0.1em]` → **`text-foreground`**(디자인 `#fff` 미채택, 10px/accent = AA 대폭 미달).
  - caption (77행) `absolute bottom-[14px] left-1/2 w-[78%] -translate-x-1/2 rounded-[10px] bg-white px-[14px] py-[9px] text-center text-[11.5px] font-semibold shadow-edi-caption`
- big2 (79행) 동일 스펙, 색 = `text-foreground`. 디자인 prop `secondWordAccent` 기본 false(543행) → **accent 미적용**으로 고정
  (accent 대형 헤드라인 스팟은 §5 Bolder가 담당 — 한 화면에 accent 대형 헤드라인 2개는 절제 원칙 위반).

### 1-D. 카피 CJK 설계
big1/big2는 `uppercase`가 의미를 지는 라틴 카피(`RECORD` / `IN SEOUL`)다. CJK는 대문자가 무효이므로
**대문자 없이 그 자체로 대형 헤드라인이 성립하는 어휘**를 쓴다(디자인 T 맵 실측값 그대로 — ko `녹음하다`/`서울에서`,
ja `ろくおん`/`ソウルで`, zh-HK `錄製`/`喺首爾`, zh-CN `录制`/`在首尔`). §9 표 참조.

### 1-E. 이미지 플레이스홀더 프리미티브 (`components/home/editorial-image.tsx`)
실 스튜디오 사진 미확보(CLAUDE §9) + `public/` 비어 있음(07-30 실측). → 결정 ③.

```
props: { alt: string; className?: string }   // alt = i18n 문자열(호출측이 t()로 주입)
렌더: <div aria-hidden="true" data-placeholder-alt={alt} className={cn('w-full bg-paper-dim', className)} />
```
- **비율은 호출측이 `className`으로 준다**(`aspect-[3/3.4]`). ⚠ v1 초안의 `ratio: string` prop 안은 **폐기**
  (4a 구현 시 정정): Tailwind JIT는 arbitrary 값을 소스에서 리터럴로 스캔하므로, prop으로 넘긴 비율 문자열은
  클래스가 생성되지 않는다. inline `style`로 우회할 수도 있으나 토큰 경로를 벗어나므로 className 방식을 택한다.
- ⚠ **접근성:** 사진이 실제로 없는 동안은 `aria-hidden` 장식 박스다. 빈 박스에 `role="img"` + `aria-label`을
  붙이면 스크린리더가 존재하지 않는 사진을 읽어 준다(허위 안내). `alt`는 필수 prop으로 남겨 호출처가 i18n 키를
  미리 배선하도록 강제하고, 실사진 도입 시 그대로 활성화한다.
- 비율 고정 박스라 실사진 주입 전후로 **CLS 0**.
- `src`가 생기면 이 컴포넌트 내부만 `next/image`로 교체 — 호출처 무변경.
- 사용처(비율은 디자인 실측): hero `3/3.4`(74행) · dark `16/11`(117행) · cat1/cat2 `3/3.6`(139·156행) · boost `3/3.2`(235행).

---

## 2. Trust strip (디자인 86–92행)

`<section>` `mx-auto mt-[26px] max-w-container-max border-y border-foreground/10 px-gutter py-[26px]`

디자인 원문(88–89행)은 `press` 5개(591–594행)를 `flex justify-between`으로 나열하고, 각 항목이
`font-extrabold text-[15px]` + `color:rgba(20,18,16,.32)`.

**실 자산은 NYT 1건뿐**(593행 4개는 데모 문자열, `#nyt-article-url`은 placeholder). → 결정 ②.

**결정 ② 권고안(A) 기준 스펙:**
```
flex flex-wrap items-center justify-between gap-5
├ <p> home.nyt.label   text-[10.5px] font-bold uppercase tracking-[0.08em] text-foreground/70
└ <a href={NYT_URL} target="_blank" rel="noopener noreferrer">
     home.nyt.source   text-[15px] font-extrabold text-foreground
     home.nyt.cta + ↗(aria-hidden)  text-[12px] font-semibold text-foreground/70 underline-offset-4 hover:underline
```
- `NYT_URL` = `https://www.nytimes.com/2024/11/29/fashion/k-pop-recording-sessions-seoul.html`
  (실측: `app/[locale]/(public)/page.tsx:15`, `app/[locale]/(public)/about/page.tsx:12` 동일 상수 2중 정의).
  → 홈 재작성 시 `components/home/trust-strip.tsx`에 상수를 두고, about의 중복은 **건드리지 않는다**(범위 밖, §12 기록).
- ⚠ 대비 델타: 디자인 `ink/.32`(계산값 ≈1.9:1) 미채택 — 15px 볼드는 WCAG large 임계(18.66px 볼드) 미만이라 4.5:1 필요.
  `text-foreground` 또는 최소 `/70`(계산값 6.2:1) 사용.
- 결정 ②가 B(실 자산 추가)로 확정되면 `sc-for` 구조를 되살리되, **항목은 배열 상수 + i18n 키 쌍**으로 두고
  각 항목에 실 URL이 없으면 `<a>` 대신 `<span>`으로 렌더(죽은 링크 0 원칙, Nav 스펙 §7-②와 동일 패턴).

---

## 3. Provide — 다크 섹션 (디자인 96–133행)

`<section id="about">` `relative overflow-hidden bg-ink-deep text-paper`
내부 `mx-auto max-w-container-max px-gutter py-[clamp(40px,6vw,72px)]` (97행)

⚠ `id="about"`은 `/about` **라우트와 무관한 in-page 앵커**다. 라우트 충돌 없음(앵커는 URL 프래그먼트).

### 3-A. 헤딩 블록 (98–104행)
`flex flex-wrap items-start justify-between gap-10`
- h2 (99행) `.ks-display text-[clamp(30px,4.6vw,60px)] max-w-[680px]` — 원문 lh 1.02 → `leading-[1.02]` 병기.
  구조: `{titlePre} <span class="text-primary">—</span> {titlePost}`.
  accent `—`는 최소 30px 볼드 = WCAG large(3:1 요구, accent 3.4:1 통과) + 순수 장식 구두점이라 §3.9 "색만으로 정보 전달" 비해당.
- 우측 열 `flex max-w-[300px] flex-col gap-4`
  - body (101행) `text-[14px] leading-[1.7] text-paper/70` (계산값 8.4:1 — 통과)
  - learnMore (102행) `flex items-center gap-2 text-[13px] font-extrabold tracking-[0.06em] text-paper` + `↗`(aria-hidden) `text-primary`
    → **href = `#sessions`**(§4 섹션의 in-page 앵커). 디자인과 동일. 외부 라우트로 바꾸지 않는다.

### 3-B. 마퀴 (107–113행)
`overflow-hidden border-y border-paper/[0.14] py-[14px] my-[34px]`
내부 `flex w-max animate-edi-marquee whitespace-nowrap` × 콘텐츠 4벌(110행), 각 `px-[22px]`
`.ks-display text-[19px] text-paper/45`

- ⚠ 대비 델타: 디자인 `/.35`는 계산값 ≈3.03:1로 large 임계(3:1) 경계. 19px w800은 large(≥18.66px 볼드) 통과이나
  마진이 없어 **`/45`(계산값 ≈4.1:1)** 로 상향.
- `prefers-reduced-motion: reduce` 정지는 `globals.css:99-103`에 **이미 존재**(`.animate-edi-marquee{animation:none}`).
  추가 작업 없음. 정지 시 첫 벌만 보이는 것이 정상.
- 카피(`home.provide.marquee`)는 **패키지 이름만** 담는다. 디자인 `darkTags`의 `Gold ₩400K` 류 가격 문자열은 이식 금지(§11).

### 3-C. 이미지 + 태그 + LOVE 블록 (115–131행)
`flex flex-wrap items-center justify-between gap-[34px]`

- 좌 `flex min-w-[260px] flex-1 flex-col gap-[14px]`
  - 이미지 (117–123행) `relative flex w-[min(360px,80vw)] aspect-[16/11] overflow-hidden rounded-ks-panel bg-ink-raise`
    - 오버레이 (119–122행) `absolute bottom-[14px] left-[14px] rounded-[10px] bg-ink-deep/60 px-[14px] py-[10px] backdrop-blur-[6px]`
      - 라벨 (120행) `text-[11px] font-bold tracking-[0.06em] text-paper/70` — 카피 = "예약 가능 D+1 → 90".
        **이 D+1→D+90은 데모 값이 아니다** — `lib/slots/window.ts:11-12`(`BOOKING_MIN_OFFSET=1`,`BOOKING_MAX_OFFSET=90`)와
        일치하는 실 정책이므로 정적 카피로 허용. 단 숫자는 §9 카피에만 존재하고 코드는 `bookingWindow()`를 쓴다.
      - 버튼 (121행) `rounded-full bg-primary px-4 py-2 text-[12px] font-bold` → **`text-foreground`**(§11-W), href `/booking`.
  - 태그 칩 (124–128행) `flex flex-wrap gap-2`, 각 `rounded-full border border-paper/25 px-[15px] py-2 text-[11.5px] font-semibold text-paper/80`
    - **가격 제거.** 칩 라벨 = 패키지 표시명 4종. 소스 = 기존 i18n `packages.items.{gold,diamond,premium,making-class}.name`
      (5로케일 존재 실측). 신규 카피 불필요, DB 조회 불필요.
    - 강조 칩 1개(디자인은 index 1 = Diamond)는 `bg-primary text-foreground border-transparent`.
      강조는 순수 장식(정보 전달 아님) → §3.9 비해당.
- 우 LOVE 블록 (130행) `.ks-display text-[clamp(34px,5.4vw,74px)] flex-none text-right` + `leading-[0.98]`
  구조: `{love1}<br><span class="text-primary">—</span> {love2}<br>{love3}`

---

## 4. Categories (디자인 136–162행)

`<section id="sessions">` `mx-auto max-w-container-max px-gutter py-[clamp(40px,6vw,72px)]`
`flex flex-wrap items-center justify-between gap-[30px]`

### 4-A. 좌·우 이미지 열 (138–143행 / 155–160행)
각 `order-1`/`order-3` `flex w-[min(240px,42vw)] flex-none flex-col gap-[14px]`
- 이미지 `aspect-[3/3.6] overflow-hidden rounded-ks-img bg-paper-dim` → §1-E 프리미티브
- 캡션 `text-[14px] font-bold` + `text-[12px] text-foreground/55` → ⚠ `/55`는 12px 소형에서 계산값 ≈3.8:1(AA 미달)
  → **`text-foreground/70`** 로 상향(계산값 6.2:1).

### 4-B. 중앙 카테고리 리스트 (145–153행)
`order-2 flex min-w-[280px] flex-1 list-none flex-col gap-1 text-center`
각 `<li>` `flex items-center justify-center gap-3`
- 라벨 `.ks-display .ks-display-strong text-[clamp(26px,3.8vw,46px)]` + `leading-[1.08]`
- 인덱스 배지 `grid h-[26px] w-[26px] flex-none place-items-center rounded-full text-[11px] font-extrabold` `aria-hidden="true"`
  (디자인 581행 주석 실측: "badge numbers are decorative indices (01–05), never performance counts")

⚠ **활성/비활성 색 스킴 미채택.** 디자인(585–587행)은 비활성 항목을 `rgba(20,18,16,.22)`(계산값 ≈1.5:1)로 흐리고
활성만 잉크로 둔다. AA 대폭 미달 + 상태를 색만으로 전달(§3.9 위반). →
- **모든 라벨 `text-foreground`.** 흐림 없음.
- 강조는 **배지 1개의 accent 채움**으로만(`bg-primary text-foreground`), 나머지 배지 `bg-foreground/10 text-foreground/70`.
  배지가 `aria-hidden` 장식이므로 색 단독 전달 문제 자체가 성립하지 않는다.

### 4-C. 항목 ↔ 라우트 (결정 ④)
디자인 4항목(322–325행): `VOCAL SESSION` / `MUSIC VIDEO` / `MAKING CLASS` / `STUDIO RENTAL`.
`isRental`(150행)만 링크 + `INQUIRY ONLY` pill.

**권고안(A) 매핑 — 실측 라우트 기준:**

| 항목 | href | 로케일 노출 | 근거 |
|---|---|---|---|
| VOCAL SESSION | `/experience` | 전 로케일 | gold/diamond/premium `languagesAvailable = ALL`(`seed-packages.ts:22,38,54`) |
| MUSIC VIDEO | `/packages/premium` | 전 로케일 | Premium = MV 포함 패키지, 상세 라우트 실존 |
| MAKING CLASS | `/group` | 전 로케일 | making-class `ALL`(`:102`) → `CategoryCatalog` notFound 미발동 |
| STUDIO RENTAL | `/rental` + `INQUIRY ONLY` pill | **ko 전용** | 1hour·1pro 둘 다 `KO`(`:70,86`) → 비-ko에서 `pkgs.length===0` → `notFound()`(`category-catalog.tsx:39`) |

- 비-ko 로케일에서 STUDIO RENTAL은 **`<span>`(비링크) + `sr-only` 안내**로 렌더. Nav 슬라이스 `enabled:false` 패턴 재사용
  (`site-header.tsx:65-73`). 죽은 링크·오답 404 방지.
- 판정은 **하드코딩 로케일 allow-list가 아니라** `listPackages({locale}).some(p => p.category==='rental')` 데이터 기반으로
  한다(`category-catalog.tsx:38` 주석의 동일 원칙). → 이 섹션은 서버 컴포넌트이며 DB read가 필요 → 4d의 렌더 모드 전환(결정 ⑦)에 동승.
- `INQUIRY ONLY` pill `rounded-full border border-foreground/25 px-2.5 py-1 text-[10px] font-extrabold tracking-[0.06em] text-foreground/70`
  (디자인 `/.55` → 10px 소형 AA 미달로 `/70` 상향).

---

## 5. Bolder + 패키지 카드 (디자인 165–186행)

`<section>` `mx-auto max-w-container-max px-gutter pb-[clamp(30px,4vw,52px)]`

### 5-A. FEELING BOLDER (166행)
`.ks-display .ks-display-strong text-[clamp(60px,15vw,210px)] text-primary` + `tracking-[-0.01em]`
구조: `{line1}<br><span class="inline-block pl-[18vw]">{line2}</span>`
- accent 텍스트색이 허용되는 **유일한 자리**(DESIGN.md "대형 헤드라인 스팟"). 최소 60px w900 → AA-large 3:1 대비 3.4:1 통과.
- ⚠ `.ks-display`가 `letter-spacing:.01em`을 주므로 `tracking-[-0.01em]` 유틸로 덮는다(유틸 우선). CJK에서는
  `globals.css:92-97`이 `letter-spacing:0`으로 재차 덮으므로 라틴에서만 -.01em이 적용된다 — 의도된 동작.

### 5-B. 패키지 카드 (167–184행)
`grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[18px] pt-[30px]`
각 카드 `flex min-h-[230px] flex-col gap-[14px] rounded-ks-panel p-6`

**데이터는 전부 DB.** 하드코딩 절대 금지(§11).

| 표시 | 소스 |
|---|---|
| 카드 대상 | `listPackages({locale})` → `category==='experience'` (Nav·catalog와 동일 경로) |
| 이름 | i18n `packages.items.{slug}.name` |
| 설명 | i18n `packages.items.{slug}.tagline` |
| 가격 | `computePackageTotal(pkg, pkg.headcountMin).totalKrw` → `<Price>` 컴포넌트(KRW + approx 괄호) |
| 소요시간 | `pkg.slotMinutes` → i18n `packages.catalog.durationLabel` 재사용 |
| 인원 상한 | `pkg.headcountMax` → §5-C 주석의 ICU 파라미터 |
| VAT 표기 | 신규 키 `home.packages.vatIncluded` |
| 통화 | 쿠키(`CURRENCY_COOKIE`) ?? `LOCALE_DEFAULT_CURRENCY[locale]`, 환율 `getExchangeRates()` (실패 시 `null` → KRW 단독 강등) |

카드 스킴(563–566행 실측, 3장 중 1장 accent):
- light: `bg-paper-raise text-foreground`, rule `border-foreground/[0.12]`, 버튼 `bg-foreground text-background`
- dark: `bg-foreground text-background`, rule `border-background/[0.18]`, 버튼 `bg-primary` + **`text-foreground`**(§11-W)
- accent: `bg-primary text-foreground`, rule `border-white/[0.28]`, 버튼 `bg-foreground text-background`
  ⚠ 디자인의 `lum()` 기반 자동 잉크 선택(563행)은 이식하지 않는다 — accent가 prop으로 안 바뀌므로 불필요.
  ⚠ accent 카드 본문은 **잉크 고정**(ink/#F5461E ≈ 5.1:1). 흰 소형 텍스트 금지 — `package-comparison.tsx:12-17` 선례와 동일.
- 우상단 `↗` 배지 `grid h-9 w-9 place-items-center rounded-full` `aria-hidden="true"`
- 하단 CTA `rounded-[10px] p-3 text-[13px] font-bold` → **`href={/booking/schedule?package=${slug}}`**
  (실존 진입점: `booking/page.tsx:122` 동일 패턴, `schedule/page.tsx:40` 가 `searchParams.package`를 읽음)

### 5-C. 인원 주석 (185행)
디자인 카피 `Up to 5 guests per booking · each additional guest +50%`는 **레포와 불일치**:
`gold.headcountMax = 2`(`seed-packages.ts:21`), diamond·premium만 5. → 정액 "5" 문구 이식 금지.

→ ICU 파라미터 키로 대체: `home.packages.guestNote` = `"예약당 최대 {max}인 · 추가 1인당 기본가의 +50%."`
카드별로 `pkg.headcountMax`를 주입하거나, 섹션 하단 1줄이면 `Math.max(...pkgs.map(p=>p.headcountMax))`를 주입한다.
`text-[12px] text-foreground/70 pt-[14px]` (디자인 `/.55` → AA 상향).

---

## 6. Booking bar (디자인 189–227행)

`<section id="bookbar">` `mx-auto max-w-container-max px-gutter pb-[clamp(40px,6vw,72px)]`
바 `rounded-ks-bar bg-ink-deep p-[14px] text-paper`

**⚠ 디자인의 슬롯 로직은 전부 가짜다** — `isFull()`(521행)은 데모 해시, `PKG.slots`(296–299행)는 실 그리드
(`lib/slots/constants.ts:18-24`)와 불일치, `RATES`(301행)는 고정 환율. 전부 이식 금지(§11). → **결정 ①**.

### 6-A. 헤더 행 (191–194행)
`flex flex-wrap items-center justify-between gap-3 px-2 pb-[14px] pt-1.5`
- 타이틀 `.ks-display text-[clamp(18px,2.2vw,26px)]`
- kstNote `text-[11.5px] text-paper/55` (계산값 5.6:1 — 통과, 유지)

### 6-B. 필드 행 (195–224행)
`flex flex-wrap items-stretch gap-[9px]`
필드 공통: `flex flex-col gap-1 rounded-ks-field bg-ink-raise px-[15px] py-[11px]`
- 라벨 `text-[9.5px] font-bold tracking-[0.12em] text-paper/65`
  (⚠ 디자인 `/.5`는 ink-raise 위 계산값 ≈4.66:1로 4.5 턱걸이 → `/65`(계산값 ≈7.1:1)로 상향. 9.5px 유지는 디자인 실측 존중이나 가독 하한 근접 — §12 기록.)
- 컨트롤 `w-full border-none bg-transparent py-0.5 text-[14.5px] font-bold text-paper`
- flex 비율 실측: 서비스 `flex-[1.3_1_210px] min-w-[190px]` / 날짜·시간 각 `flex-[0.7_1_160px] min-w-[150px]` / 인원 `flex-[0.6_1_130px] min-w-[120px]`
- `<input type="date">` 는 `color-scheme:dark` 필요(204행) → `[color-scheme:dark]`
- 인원 필드는 `showGuests`(212행) 조건 — 채택 시 `pkg.headcountMin..headcountMax`(DB)에서 생성. 디자인의 `minG:2`는
  **stale**(C12 확정 3, `seed-packages.ts:100` = `headcountMin: 3`).

### 6-C. CTA (220–223행)
`flex min-h-[62px] flex-[1_1_220px] min-w-[200px] items-center justify-between rounded-ks-field bg-primary px-[18px] py-2.5`
→ **`text-foreground`** (⚠ 디자인 `#fff` 미채택: cta 라벨 15px w800 < large 임계 18.66px 볼드 → 4.5:1 필요, 흰 글자 3.4:1 미달. §11-W)
- 좌: `.ks-display text-[15px]` 라벨 + `text-[11px] font-semibold` 총액
- 우: `→` `text-[18px]` `aria-hidden="true"`

### 6-D. 하단 주석 (225행)
`px-2 pb-1 pt-3 text-[11px] text-paper/65` (디자인 `/.5` → 상향)
카피는 §5-C와 동일 원칙 — `min 2`·`max 5`·`weekdays only 10:00–12:00 / 14:00–16:00` 전부 이식 금지(DB·PRD 불일치).

### 6-E. 날짜 범위
`min`/`max`는 **`bookingWindow()`**(`lib/slots/window.ts:22`) 산출값. 디자인의 `kstDate(1)/kstDate(90)`(520행) 이식 금지.
`bookingWindow()`는 서버 함수 → 서버 컴포넌트에서 계산해 prop으로 내린다(`schedule/page.tsx:51,102-103` 선례).

### 6-F. 결정 ① 미확정 상태의 최소 구현선
결정 ①이 확정될 때까지 4e는 착수하지 않는다. A안 채택 시 필드는 **패키지 select 1개 + CTA**로 축소되고,
날짜·시간 필드는 렌더하지 않는다(비활성 가짜 필드 금지 — 죽은 UI는 신뢰를 깎는다).

---

## 7. Boost (디자인 231–241행)

`<section>` `mx-auto max-w-container-max px-gutter pb-[clamp(30px,4vw,48px)]`
- 라인 (232행) `.ks-display text-[clamp(30px,5.2vw,68px)] text-center` + `leading-[1]`
- 브래킷 행 (233–239행) `flex items-center justify-center gap-[clamp(10px,3vw,40px)] pb-[22px] pt-[26px]`
  - `[` `]` `text-[clamp(50px,9vw,120px)] font-normal leading-[0.8] text-foreground/35` `aria-hidden="true"`
    (순수 장식 + aria-hidden → WCAG 1.4.3 비적용. `/35` 유지.)
  - 이미지 `flex w-[min(300px,60vw)] aspect-[3/3.2] overflow-hidden rounded-ks-img bg-paper-dim` → §1-E
- 본문 (240행) `mx-auto max-w-[720px] text-center text-[14px] leading-[1.7] text-foreground/70` + `text-wrap: pretty`
  (디자인 `/.7` 그대로 — 계산값 6.2:1 통과)

---

## 8. Subscribe (디자인 246–266행) — **결정 ⑤ 확정 전 구현 금지**

기술적으로는 아래 형태이나, **백엔드 미존재 + 마케팅 수신 동의가 PRD 동의 모듈(M5, Gate 2 법무 감수) 대상**이다.
`consents` append-only는 하드 제약(§3.1)이므로 임시 구현이 그 경로를 우회하면 안 된다. → 권고 = 섹션 제외.

참고 스펙(채택 시): `bg-ink-deep` 섹션, `py-[clamp(44px,6vw,80px)]`,
h2 `.ks-display .ks-display-strong text-[clamp(34px,6.4vw,84px)]` + `leading-[0.98]`, 2행 구조에서 2행은 `text-paper/40`
(84px 대형 → large 3:1 대비 계산값 3.52:1 통과).
입력 `rounded-full border border-paper/20 bg-ink-raise px-[18px] py-[13px] text-[14px] text-paper`,
버튼 `rounded-full bg-primary px-[26px] py-[13px] text-[14px] font-extrabold` → `text-foreground`.
동의 체크박스 라벨의 `href="#reach"`(257행)는 디자인 내부 앵커 — **이식 금지**(우리 앱에 `/privacy` 라우트 미존재,
Nav 스펙 §7-④에 따라 legal 링크는 legal 슬라이스가 켠다).

섹션 제외 시 페이지는 **Boost → SiteFooter**로 자연 종료한다(layout.tsx가 footer를 이미 마운트).

---

## 9. i18n 키표 (5로케일 전체 카피)

**네임스페이스 = `home`.** 편집은 5파일 동시(§0-A). 값 출처는 디자인 `static T` 맵(305–518행) 실측 —
**행 번호를 각 표에 표기**. `(신규)`는 디자인 T에 없어 이 스펙이 신설하는 키.

### 9-0. 존치 (변경 없음)
`home.metaTitle`, `home.metaDescription` — SEO 자산, 5로케일 현행 값 유지(실측 우수).
`home.nyt.label` / `.source` / `.cta` — §2 트러스트 스트립이 소비. 5로케일 현행 값 유지.

### 9-1. `home.hero.*`

| 키 | en | ko | ja | zh-HK | zh-CN | 원문행 |
|---|---|---|---|---|---|---|
| kicker1 | Record your own | 나만의 | 自分だけの | 屬於你嘅 | 属于你的 | 308·352·395·479·485 |
| kicker2 | K-pop track | K-POP 트랙 | K-POPトラック | K-POP 歌曲 | K-POP 歌曲 | 308·352·395·438·485 |
| big1 | RECORD | 녹음하다 | ろくおん | 錄製 | 录制 | 310·354·397·440·487 |
| big2 | IN SEOUL | 서울에서 | ソウルで | 喺首爾 | 在首尔 | 310·354·397·479·487 |
| rotBadge | CURRENT · KST 2026 | 현재 · KST 2026 | 現在 · KST 2026 | 現在 · KST 2026 | 现在 · KST 2026 | 310·354·397·440·487 |
| photoCaption | A real session that knows no borders | 국경 없는 진짜 스튜디오 세션 | 国境のない、本物のスタジオセッション | 沒有邊界的真實錄音室課程 | 没有边界的真实录音室课程 | 311·355·398·441·488 |
| photoAlt (신규) | Vocalist recording at the microphone in the studio | 스튜디오 마이크 앞에서 녹음하는 보컬 | スタジオのマイクで録音するボーカル | 在錄音室咪高峰前錄音的歌手 | 在录音室话筒前录音的歌手 | — |
| card.title | Featured in NYT | 뉴욕타임스 소개 | NYタイムズ掲載 | 《紐約時報》報導 | 《纽约时报》报道 | 309·353·396·439·486 |
| card.sub | 2024 | 2024 | 2024 | 2024 | 2024 | 동상 |
| card.cta | Book now | 바로 예약 | 今すぐ予約 | 立即預約 | 立即预约 | 동상 |
| meta.a (신규) | K-POP | K-POP | K-POP | K-POP | K-POP | 69 |
| meta.b (신규) | 2026 | 2026 | 2026 | 2026 | 2026 | 69 |
| meta.c (신규) | SEOUL | 서울 | ソウル | 首爾 | 首尔 | 69 |
| meta.d (신규) | SESSION | 세션 | セッション | 課程 | 课程 | 69 |
| meta.e (신규) | (UNLIMITED) | (무제한) | (アンリミテッド) | (無限) | (无限) | 69 |
| meta.f (신규) | (D2C) | (D2C) | (D2C) | (D2C) | (D2C) | 69 |

### 9-2. `home.provide.*`

| 키 | en | ko | ja | zh-HK | zh-CN | 원문행 |
|---|---|---|---|---|---|---|
| titlePre | We provide fresh | 신선한 세션을 | 新しいセッションを | 為你提供 | 为你提供 | 313·356·399·442·489 |
| titlePost | sessions for you | 제공합니다 | お届けします | 全新課程 | 全新课程 | 동상 |
| body | Discover producer-directed recording built to make your voice sound like the charts — vocals, mix, photos and a music video. | 차트처럼 들리게 만드는 프로듀서 디렉팅 녹음 — 보컬, 믹스, 사진, 뮤직비디오까지. | チャートのように響かせるプロデューサー指導の収録 — ボーカル、ミックス、写真、MVまで。 | 讓你的聲音像排行榜般動人的製作人指導錄音 — 主唱、混音、攝影與 MV。 | 让你的声音像排行榜一样动人的制作人指导录音 — 主唱、混音、摄影与 MV。 | 314·357·400·443·490 |
| learnMore | LEARN MORE | 자세히 보기 | 詳しく見る | 了解更多 | 了解更多 | 315·358·401·444·491 |
| marquee | GOLD · DIAMOND · PREMIUM · SEOUL · KST · NYT 2024 · | 골드 · 다이아 · 프리미엄 · 서울 · KST · NYT 2024 · | GOLD · DIAMOND · PREMIUM · ソウル · KST · NYT 2024 · | GOLD · DIAMOND · PREMIUM · 首爾 · KST · NYT 2024 · | GOLD · DIAMOND · PREMIUM · 首尔 · KST · NYT 2024 · | 316·359·402·445·492 |
| slotsLabel | Slots open D+1 → 90 | 예약 가능 D+1 → 90 | 予約可能 D+1 → 90 | 可預約 D+1 → 90 | 可预约 D+1 → 90 | 317·360·403·446·493 |
| bookCta | Book now | 바로 예약 | 今すぐ予約 | 立即預約 | 立即预约 | 309·353·396·439·486 |
| love1 | LOVE | 우리가 | 私たちの | 我們 | 我们 | 318·361·404·447·494 |
| love2 | WHAT | 만드는 | つくる | 打造的 | 打造的 | 동상 |
| love3 | WE MAKE | 결과물 | 成果物 | 成果 | 成果 | 동상 |
| imageAlt (신규) | Artist seated in the studio live room | 스튜디오 라이브룸에 앉은 아티스트 | スタジオのライブルームに座るアーティスト | 坐在錄音室錄音間的歌手 | 坐在录音室录音间的歌手 | 118 |

> 태그 칩 4개는 신규 카피 없음 — `packages.items.{gold,diamond,premium,making-class}.name` 재사용(§3-C).

### 9-3. `home.categories.*`

| 키 | en | ko | ja | zh-HK | zh-CN | 원문행 |
|---|---|---|---|---|---|---|
| items.vocal | VOCAL SESSION | 보컬 세션 | ボーカル収録 | 人聲錄音 | 人声录音 | 322·365·408·451·497 |
| items.mv | MUSIC VIDEO | 뮤직비디오 | ミュージックビデオ | 音樂錄影帶 | 音乐录影带 | 323·366·409·452·497 |
| items.making | MAKING CLASS | 메이킹클래스 | メイキングクラス | Making Class | Making Class | 324·367·410·453·497 |
| items.rental | STUDIO RENTAL | 스튜디오 대여 | スタジオ貸出 | 錄音室租借 | 录音室租借 | 325·368·411·454·497 |
| inquiryOnly | INQUIRY ONLY | 문의 전용 | お問い合わせのみ | 僅接受洽詢 | 仅接受咨询 | 344·387·430·473·483 |
| rentalKoOnly (신규) | Korean-language bookings only | 한국어 예약 전용 | 韓国語での予約のみ | 只接受韓語預約 | 仅接受韩语预约 | — |
| cap1Title | Producer-directed | 프로듀서 디렉팅 | プロデューサー指導 | 製作人指導 | 制作人指导 | 319·362·405·448·495 |
| cap1Sub | every take, guided | 모든 테이크 지도 | 全テイクをディレクション | 每次錄製都有指導 | 每次录制都有指导 | 동상 |
| cap2Title | Take it home | 집으로 | 持ち帰り | 帶回家 | 带回家 | 320·363·406·449·496 |
| cap2Sub | MP3 · CD · MV | MP3 · CD · MV | MP3 · CD · MV | MP3 · CD · MV | MP3 · CD · MV | 동상 |
| image1Alt (신규) | Studio look, take one | 스튜디오 룩 1 | スタジオルック 1 | 錄音室造型 1 | 录音室造型 1 | 140 |
| image2Alt (신규) | Studio look, take two | 스튜디오 룩 2 | スタジオルック 2 | 錄音室造型 2 | 录音室造型 2 | 157 |

> `rentalKoOnly`는 비-ko 로케일에서 STUDIO RENTAL이 비링크 `<span>`으로 렌더될 때의 `sr-only` 안내(§4-C).

### 9-4. `home.bolder.*` / `home.packages.*`

| 키 | en | ko | ja | zh-HK | zh-CN | 원문행 |
|---|---|---|---|---|---|---|
| bolder.line1 | FEELING | 더 대담하게 | もっと | 更加 | 更加 | 328·371·414·457·499 |
| bolder.line2 | BOLDER | 녹음하다 | 大胆に | 大膽 | 大胆 | 동상 |
| packages.selectCta | Select session | 세션 선택 | セッションを選ぶ | 選擇課程 | 选择课程 | 332·375·418·461·503 |
| packages.vatIncluded | VAT included | VAT 포함 | VAT込み | 含稅(VAT) | 含增值税 | 342·385·428·471·482 |
| packages.refOnly | Charged in KRW; other currencies are reference only. | KRW로 결제되며 다른 통화는 참고용입니다. | 請求はKRW。他通貨は参考表示です。 | 以韓元結算，其他幣別僅供參考。 | 以韩元结算，其他货币仅供参考。 | 342·385·428·471·482 |
| packages.guestNote (ICU) | Up to {max} guests per booking · each additional guest +50% of the base rate. | 예약당 최대 {max}인 · 추가 1인당 기본가의 +50%. | 1予約につき最大{max}名 · 追加1名ごとに基本料金の+50%。 | 每筆預約最多{max}人 · 每加一人加收基本價的50%。 | 每笔预约最多{max}人 · 每加一人加收基本价的50%。 | 343·386·429·472·483 (정액 5 → `{max}` 파라미터화) |

> 패키지 설명문(`descGold`/`descDia`/`descPre`, 329–331행 등)은 **이식하지 않는다** — 기존
> `packages.items.{slug}.tagline`이 5로케일에 이미 존재하고 그것이 단일 출처다(catalog·booking과 공유).

### 9-5. `home.booking.*` (결정 ①의 채택안에 따라 일부만 사용)

| 키 | en | ko | ja | zh-HK | zh-CN | 원문행 |
|---|---|---|---|---|---|---|
| title | Book your slot | 슬롯 예약 | 枠を予約 | 預約時段 | 预约时段 | 333·376·419·462·504 |
| kstNote | Seoul time (KST) · D+1 → D+90 | 서울 기준(KST) · D+1 → D+90 | ソウル時間(KST) · D+1 → D+90 | 首爾時間(KST) · D+1 → D+90 | 首尔时间(KST) · D+1 → D+90 | 333·376·419·462·504 |
| fService | EXPERIENCE | 체험 상품 | 体験プラン | 體驗方案 | 体验方案 | 334·377·420·463·505 |
| fDate | DATE | 날짜 | 日付 | 日期 | 日期 | 동상 |
| fTime | TIME · KST | 시간 · KST | 時間 · KST | 時間 · KST | 时间 · KST | 동상 |
| fGuests | GUESTS | 인원 | 人数 | 人數 | 人数 | 동상 |
| cta | Check availability | 예약 가능 확인 | 空き状況を確認 | 查詢空檔 | 查询空档 | 335·378·421·464·506 |
| full | FULL | 마감 | 満席 | 已滿 | 已满 | 335·378·421·464·506 |
| note (ICU) | Up to {max} guests · +50% per extra guest · charged in KRW; other currencies for reference only. | 최대 {max}인 · 1명 추가 시 +50% · KRW 결제, 다른 통화는 참고용. | 最大{max}名 · 1名追加ごとに+50% · KRW決済、他通貨は参考表示。 | 最多{max}人 · 每加一人 +50% · 以韓元結算，其他幣別僅供參考。 | 最多{max}人 · 每加一人 +50% · 以韩元结算，其他货币仅供参考。 | 336·379·422·465·507 (정액 5 → `{max}`) |

> `makingNote`(337행 등)의 `min 2`·평일 시간대는 **이식 금지** — DB `headcountMin: 3`(`seed-packages.ts:100`)와
> 불일치하고 영업시간은 `lib/slots/constants.ts:30` 소관. 단체 안내가 필요하면 `/group` 라우트로 링크한다.

### 9-6. `home.boost.*`

| 키 | en | ko | ja | zh-HK | zh-CN | 원문행 |
|---|---|---|---|---|---|---|
| line | Total boost of confidence with a perfect session | 완벽한 세션으로 자신감을 최대로 | 完璧なセッションで自信を最大に | 用完美課程把自信推到最高 | 用完美课程把自信推到最高 | 339·382·425·468·510 |
| body | Step into a new level of confidence with a session built around your voice. With every take you feel unstoppable — and you leave Seoul with a track that is entirely yours. | 나의 목소리를 중심으로 설계된 세션에서 새로운 자신감을 경험하세요. 모든 테이크마다 거침없어지고, 온전히 나만의 트랙을 손에 넣고 서울을 떠납니다. | 自分の声を中心に設計されたセッションで、新しい自信を。テイクごとに大胆になり、自分だけのトラックを手にソウルを後にします。 | 在為你的聲音打造的課程中體驗全新自信。每次錄製都無所畏懼，帶著完全屬於你的歌曲離開首爾。 | 在为你的声音打造的课程中体验全新自信。每次录制都无所畏惧，带着完全属于你的歌曲离开首尔。 | 340·383·426·469·511 |
| imageAlt (신규) | Artist portrait from a studio session | 스튜디오 세션 아티스트 포트레이트 | スタジオセッションのアーティストポートレート | 錄音室課程的歌手肖像 | 录音室课程的歌手肖像 | 236 |

### 9-7. `home.subscribe.*` — **결정 ⑤가 "포함"일 때만 생성.** 제외 시 키 자체를 만들지 않는다.
(참고 원문행: subT1/subT2 341·384·427·470·512 / subPh·subConsent·subBtn·subDone 345·388·431·474·484)

### 9-8. 제거 대상 (5로케일 동시)
`home.title`, `home.subtitle`(현행 소비처 0 — dead), `home.hero.eyebrow/title/subtitle/ctaPrimary/ctaSecondary`,
`home.steps.*`, `home.experience.*`, `home.songs.*`, `home.finalCta.*`.
소비처 검증 실측(07-30 `grep -rn "'home'" app components lib e2e`): `app/[locale]/(public)/page.tsx:25,31` **1파일뿐**.
컴포넌트·E2E 참조 0. → 결정 ⑥ 참조.

⚠ **제거 시점은 "슬라이스별 점진 이관"으로 정정(4a 구현 시 확정).** 최종 상태는 위와 동일하되, 각 슬라이스가
**자기 섹션을 교체하는 시점에** 그 섹션의 구 키만 5로케일 동시 제거한다. 한꺼번에 지우면 4b~4e 사이 홈이
히어로만 남은 반쪽 페이지가 되기 때문이다. 진행 상황:

| 구 키 | 제거 슬라이스 | 상태 |
|---|---|---|
| `home.title`·`home.subtitle`(dead) | 4a | ✅ 제거됨 |
| `home.hero.{eyebrow,title,subtitle,ctaPrimary,ctaSecondary}` | 4a | ✅ 제거됨 |
| `home.nyt.*` | — | **존치**(§2가 계속 소비) |
| `home.steps.*` | 4b | 대기 |
| `home.experience.*` | 4d | 대기 |
| `home.songs.*`·`home.finalCta.*` | 4e | 대기 |

---

## 10. 게이트 (전부 통과 + 원문 출력 보고)

각 구현 슬라이스(4a~4f)마다 전항을 돌린다.

1. `pnpm tsc --noEmit`
2. `pnpm lint` (biome)
3. `pnpm i18n:check` — 5로케일 키 parity
4. **런타임 키체크** — 1회성 node 스크립트로 5로케일 각각에서 해당 슬라이스 §9 키 존재 확인 후 출력(스크립트 미커밋).
   Nav 슬라이스 §4-4와 동일 절차.
5. `pnpm build` — compile 단계 통과 확인(sitemap prerender의 `DATABASE_URL` 실패는 기존 이슈, 무관).
6. **하드코딩 스캔(4d·4e 필수)** — `components/home/`·`messages/` 대상:
   `grep -rnE "400[,_ ]?000|500[,_ ]?000|1[,_ ]?500[,_ ]?000|150[,_ ]?000|₩[0-9]|1385|9\.2|177\.5|\b192\b|minG|isFull" components/home messages`
   → **히트 0**이어야 한다. 가격·환율·데모 슬롯이 코드/카피에 남지 않았음을 증명한다.
7. **대비 체크리스트** — 이 스펙이 델타 표기(⚠)를 붙인 전 항목이 반영됐는지 육안 대조.
   특히: accent 채움 위 라벨은 전부 `text-foreground`(흰 글자 0), `/.22`·`/.32`·`/.35`(라이트) 잔존 0.
8. **CJK 클리핑 육안 확인** — 5로케일 각각에서 §1-C big1/big2, §3-A h2, §5-A Bolder의 어센더·디센더 잘림 없음.
9. **모션** — `prefers-reduced-motion: reduce`에서 마퀴 정지(4b).
10. 렌더 검증(Claude in Chrome, localhost:3100)은 Aiden `.env` 셋업 후 별도 수행 — 에이전트 범위 아님(Nav 스펙 §4-6 동일).

---

## 11. 이식 금지

**§11-D — 데모 데이터 (토큰 스펙 §8 재확인 + 07-30 레포 대조)**
- 가격 `400000`/`500000`/`1500000`/`150000`(296–299행) — DB `packages.basePriceKrw`.
- 소요시간 `'2H'`/`'3H'`(296–299행) — DB `packages.slotMinutes`.
- 슬롯 목록 `['10:00','13:00','16:00','19:00']` 등(296–299행) — **레포 실 그리드와 불일치**
  (`lib/slots/constants.ts:19` Gold = `[10,12,14,16,18,20]`). `/api/availability`만이 진실.
- `isFull()`(521행) — 데모 해시. 실제 가용성은 `/api/availability`.
- `RATES`(301행) `USD 1385 / JPY 9.2 / HKD 177.5 / CNY 192` + `SYMS`(302행) — `getExchangeRates()` + `<Price>`.
- `kstDate(1)/kstDate(90)`(520행) — `bookingWindow()`(`lib/slots/window.ts:22`).
- `minG: 2`(297행) — **stale.** C12 확정 3 = `seed-packages.ts:100`.
- `max 5` 정액 문구(336·343행) — Gold는 `headcountMax: 2`(`seed-packages.ts:21`). ICU `{max}` 파라미터로.
- `makingNote`의 평일 10:00–12:00 / 14:00–16:00(337행) — `lib/slots/constants.ts:30` 소관, 홈이 단정하지 않는다.
- `press` 4개 데모 항목 `Seoul Beat / K-Culture / Visit Seoul / Soundmag`(592–593행) — 실 자산 아님(결정 ②).
- `#nyt-article-url` placeholder(592행) — 실 URL이 이미 레포에 있다(`page.tsx:15`).

**§11-S — 구조·링크**
- `.dc.html` href 전부(`Service.dc.html`·`Studio.dc.html`·`My Page v2.dc.html` 등) — 라우트는 §4-C 표만.
- `#reach` 앵커(257행) — 디자인 내부 footer 앵커. 우리 legal 라우트 미존재(Nav 스펙 §7-④).
- `<x-import image-slot>` / `<sc-if>` / `<sc-for>` — DC 런타임 전용. React로 재작성(§1-E).
- `x-dc` 헤드의 Pretendard CDN 링크(13행) — 레포는 self-host(`layout.tsx:14-19`). 외부 폰트 요청 추가 금지.
- 디자인의 nav·footer 마크업(24–49행, 269행) — 시퀀스 3 shipped 컴포넌트가 이미 담당.
- `lum()` 기반 자동 잉크 대비 선택(535·563행) — accent가 런타임 가변이 아니므로 불필요.

**§11-W — WCAG (CLAUDE §3.9 + DESIGN.md, 이식 시 반드시 델타 적용)**
- **accent 채움 위 흰 소형 텍스트 전부 금지.** 디자인의 `color:#fff` on `{{ accent }}`는 6곳
  (46·61·76·121·181·220행) — 전부 `text-foreground`로 대체. 흰 글자는 ≥18.66px 볼드에서만 검토.
- accent를 **텍스트 색**으로 쓰는 곳은 §5-A Bolder(≥60px w900)와 장식 글리프(`—`·`↗`)뿐.
- 라이트 서피스 알파 하한: 소형 텍스트 `text-foreground/70` 이상. 디자인의 `/.22`·`/.32`·`/.4`·`/.55`는 미채택.
- 다크 서피스 알파 하한: 소형 텍스트 `text-paper/65` 이상, 대형(≥24px 또는 ≥18.66px 볼드) `text-paper/45` 이상.
- 카테고리 활성/비활성을 **색만으로** 구분하지 않는다(§4-B).
- 위 대비 수치는 sRGB 상대휘도 + 알파 합성 **계산값**이다. 최종 확인은 렌더 후 실측 도구로(§10-7).

**§11-P — 프로세스**
- `git add`/`commit`/`push` 금지(승인 프롬프트 경유, CLAUDE §7-B).
- 의존성 추가 금지. 신규 Tailwind 토큰 추가 금지(§0-B).
- `prisma migrate`·`db push` 금지(이 슬라이스는 스키마 무관).

---

## 12. 미결 (이 슬라이스 밖, 기록용)

1. **실 스튜디오 사진** — `public/` 비어 있음(07-30 실측), CLAUDE §9 pre-flight 미해소. §1-E 프리미티브로 흡수.
2. **press 자산** — NYT 외 실 보유 자산(관광공사 인증·OTA 파트너십·수상 등) 목록 미확인. `king-studio-hk` 스킬 설명에
   유사 자산이 언급되나 **레포·PRD 근거 없음** → Aiden 확인 전 사용 금지(결정 ②).
3. **`edi-*` fontSize 스케일 미소비** — 시퀀스 2가 추가한 9개 토큰(`tailwind.config.ts:101-115`)을 이 슬라이스가
   쓰지 않는다(§0-B 근거). 시퀀스 2 스펙 §2와 실사용의 괴리. 처분(존치/삭제/CJK 안전 재정의)은 별도 판단 —
   **이 슬라이스에서 삭제하지 않는다**(다른 페이지 슬라이스가 라틴 전용 문맥에서 쓸 여지).
4. **다크 서피스 토큰 이원화** — footer는 `bg-foreground`(DESIGN.md 하드 규칙 인용), 이 스펙은 `bg-ink-deep`.
   실색 `#141210` vs `#111010` — 육안 차 미미하나 SoT가 둘. → 결정 ⑧.
5. **`NYT_URL` 상수 2중 정의** — `page.tsx:15` / `about/page.tsx:12`. 홈 재작성 시 홈 쪽만 이동하므로 중복 잔존.
   `lib/` 단일 상수화는 별도 정리 항목.
6. **9.5px 라벨**(§6-B) — 디자인 실측이나 가독 하한 근접. 10–11px 상향 여부 디자인 판단 필요.
7. **연도 스탬프 갱신 의무** — `home.hero.meta.b`(`2026`)·`home.hero.rotBadge`(`KST 2026`)는 연 1회 5로케일 갱신 필요.
8. **Lighthouse 성능 ≥90(Gate 3)** — 결정 ⑦에서 `force-dynamic` 채택 시 홈 TTFB 영향. Gate 3 시점 재측정 대상.
9. **뉴스레터 백엔드 + 마케팅 수신 동의** — M5 동의 모듈 트랙(결정 ⑤).
10. **⚠ 헤더 모바일 가로 오버플로 (신규 발견, 4a 검증 중 — 이 슬라이스 밖)** — 375px 뷰포트에서 `<html>`
    `scrollWidth 399 > clientWidth 375`. 원인은 전부 `components/header/site-header.tsx`(4a 미수정 확인):
    우측 컨트롤 그룹(`:78` `flex flex-none items-center gap-2`)이 371px를 요구하는데 가용폭은 327px
    (375 − `px-gutter` 48)이고 `flex-none`이라 줄지 않는다. 부수로 BLOG `<span>`(`:68`)과 그 `sr-only`가
    화면 밖으로 밀린다. 히어로 요소는 오버플로 0(`inHero: false` 4/4). **시퀀스 3 nav 슬라이스 후속 수정 대상.**

---

## 13. 결정 로그 (아키텍트 판단, Aiden 거부권)

① **디스플레이 타이포는 `.ks-display` + arbitrary clamp 단일 경로.** `edi-*` fontSize 토큰 미사용 — CJK 보정
   셀렉터가 `.ks-display`에만 걸려 있어 5로케일 클리핑을 막을 수 없기 때문(§0-B). shipped nav/footer와 동일 관용.
② **accent 채움 위 라벨은 예외 없이 잉크.** 디자인의 흰 글자 6곳 전부 미채택(§11-W). Nav `Book now`·
   `package-comparison` 선례와 일관. 시각적 손실보다 §3.9 하드 제약 우선.
③ **라이트/다크 서피스의 저알파 텍스트를 전면 상향.** 디자인의 에디토리얼 "흐림" 미학 일부를 희생한다.
   대상: 메타 행·트러스트 스트립·카테고리 캡션·인원 주석·마퀴·다크 필드 라벨.
④ **카테고리 활성 색 스킴 폐기.** 비활성 흐림(1.5:1)이 AA 미달 + 상태를 색만으로 전달. 강조는
   `aria-hidden` 배지의 accent 채움으로만 이전(§4-B).
⑤ **패키지 카드는 100% DB 배선.** 디자인의 정적 가격·시간·인원 문구를 카피에 남기지 않는다. 인원 상한은
   ICU `{max}` 파라미터 — Gold `headcountMax:2`가 "최대 5인" 문구와 충돌하기 때문(§5-C).
⑥ **`packages.items.*` 재사용.** 디자인의 `descGold/descDia/descPre`를 `home`에 복제하지 않는다 —
   catalog·booking·홈이 같은 문구를 쓰는 단일 출처 유지.
⑦ **NYT 링크는 트러스트 스트립 1곳.** hero 카드는 배지 + `/booking` CTA로만(중복 외부 링크 금지).
⑧ **big2에 accent 미적용.** 디자인 prop 기본값(false, 543행) 채택 — accent 대형 헤드라인은 §5 Bolder 1곳으로 절제.
⑨ **비활성 항목은 `<span>` + `sr-only`.** 비-ko `/rental`(§4-C). Nav 슬라이스 §7-② 패턴 재사용, 죽은 링크 0.
⑩ **가짜 UI 금지.** 결정 ①이 A안이면 booking bar의 날짜·시간 필드를 disabled로 남기지 않고 **렌더하지 않는다**(§6-F).

---

## 14. OPEN DECISION

> §7-A 3번 절차. 각 항목 A/B/C + 트레이드오프 + 추천.

### 14-0. 확정 현황 (2026-07-31 Aiden 회신)

| # | 쟁점 | 확정 | 추천과 일치 | 영향 |
|---|---|---|---|---|
| ① | Booking bar | **C — 실 슬롯 배선** | ✗ (추천 A) | **4e가 §4 위험 구역으로 편입.** 아래 §14-① 후속 조건 참조 |
| ② | Trust strip | **A — NYT 단독**, 실 URL 반영 | ✓ | 4b |
| ③ | 히어로 사진 | **A — 뉴트럴 프리미티브** | ✓ | 4a ✅ 반영 완료 |
| ④ | Categories ↔ 라우트 | **미확정** | — | 4c 착수 전 필요 |
| ⑤ | Subscribe / 마케팅 수신 동의 | **A — 제외, M5 동의 모듈 + Gate 2 법무로 이연** | ✓ | 4f 취소, M5 백로그. **푸터 이메일 캡처에도 동일 적용**(§14-⑤) |
| ⑥ | 기존 `home.*` 키 | **A — 교체**(슬라이스별 점진 이관, §9-8) | ✓ | 4a ✅ 부분 반영 |
| ⑦ | 홈 렌더 모드 | **A — `force-dynamic`** | ✓ | 4d |
| ⑧ | 다크 서피스 토큰 | **미확정** | — | 4b 착수 전 필요(홈 다크 섹션 한정) |

**§14-① 후속 조건 (실 슬롯 배선 채택의 대가 — 4e 착수 전 합의 필요).**
홈 booking bar가 `/api/availability`를 직접 호출하면 아래가 따라온다. 스펙 본문 §6은 이에 맞춰 4e에서 개정한다.
1. **§4 위험 구역 편입** — 4e는 "위험 구역 작업 중 — 검증 필요" 표기 + 테스트 동반이 의무(CLAUDE §4).
2. **테스트 의무** — 슬롯 표시 로직 Vitest + 홈에서 예약 진입까지의 Playwright E2E(포트 3100).
3. **홈 렌더 비용** — 결정 ⑦(force-dynamic)과 겹쳐 홈이 요청당 DB(패키지) + API(슬롯) 왕복. Gate 3
   Lighthouse 성능 ≥90 재측정 대상(§12-8). 완화책: 슬롯 fetch를 클라이언트 지연 로드(초기 HTML 제외)로.
4. **진실 이중화 방지** — 홈 bar와 `components/booking/slot-picker.tsx`가 같은 API를 두 UI로 소비하게 된다.
   4e는 **`SlotPicker`의 로직을 재사용**하거나(props로 프레젠테이션 분리), 최소한 draft 저장 키
   (`kingstudio.booking` sessionStorage, `slot-picker.tsx:27`)를 공유해 홈→schedule 이동 시 선택이 유지되게 한다.
   두 개의 독립 구현은 금지.
5. **하드 제약 불변** — 홈 bar는 **읽기 전용**이다. 슬롯 확정·Redis 락(§3.3)·결제 진입은 기존 예약 플로우가
   단독 소유한다. 홈에서 락을 잡지 않는다.

### 14-1. 원안 (A/B/C + 트레이드오프 — 확정 근거 보존용)

### ① Booking bar — 실 슬롯 배선 vs 진입 CTA (4e 규모 결정)

| 안 | 내용 | 트레이드오프 |
|---|---|---|
| **A** | 패키지 select + CTA만. 날짜·시간 필드 미렌더. CTA → `/booking/schedule?package={slug}` | 홈 정적성 보존, 슬롯 책임이 `SlotPicker` 1곳에 유지. 디자인 4필드 바가 2요소로 축소(시각 손실) |
| **B** | A + 날짜 필드(`bookingWindow()` min/max). 선택한 날짜를 쿼리로 전달 | UX 자연스러움 ↑. 단 `schedule/page.tsx:35`가 `{package}`만 받으므로 **`date` searchParam 추가 + `SlotPicker` 초기값 수용**이 필요 → 예약 도메인(§4 위험 구역) 파일 수정 = 이 슬라이스 범위 확대 |
| **C** | 풀 배선. 클라이언트 컴포넌트가 `/api/availability` 호출, 슬롯 표시·선택 후 draft 기록 | 디자인 100% 재현. 대가: 홈이 패키지×날짜마다 force-dynamic API 왕복(Gate 3 성능), 슬롯 UI가 홈·schedule 2곳으로 이중화(진실 2개), §4 위험 구역 편입 → Vitest+E2E 의무 |

**추천 = A.** 근거: 홈은 SEO·LCP 최우선 페이지이고, 슬롯 가용성은 `/api/availability` + `SlotPicker`가 이미 소유한
책임이다(`components/booking/slot-picker.tsx:99`). 홈에서 슬롯을 고르고 schedule에서 또 고르게 하면 상태 동기화
버그의 표면이 늘고, 더블부킹 방어(§3.3 Redis 락)와 무관한 UI가 예약 진실처럼 보인다. B는 예약 슬라이스 소유자
합의가 있으면 자연스러운 후속 단계로 승격.

### ② Trust strip — press 5칸 중 실 자산 1건

| 안 | 내용 | 트레이드오프 |
|---|---|---|
| **A** | NYT 단독. 좌측 라벨 + 우측 NYT 링크의 2요소 밴드 | 사실만 표시. 5칸 나열의 시각적 볼륨 상실 |
| **B** | NYT + Aiden이 확인해 준 실 자산으로 채움 | 디자인 볼륨 유지. Aiden 확인 대기(현재 레포·PRD 근거 0) |
| **C** | 섹션 제외 | NYT = 최대 마케팅 훅(PRD §1)인데 홈에서 사라짐. 비추천 |

**추천 = A**(B로 승격 가능한 구조로 구현). 근거: 존재하지 않는 매체를 로고 열처럼 나열하는 것은 허위 표시로
표시광고법 리스크이며 §11-D 이식 금지 대상이다. 실 URL은 이미 레포에 있다(`page.tsx:15`). B 승격 시에도 URL 없는
항목은 `<span>` 렌더(죽은 링크 0).

### ③ 히어로 사진 · image-slot — 실사진 미확보

| 안 | 내용 | 트레이드오프 |
|---|---|---|
| **A** | 뉴트럴 플레이스홀더 프리미티브(`bg-paper-dim` + 비율 고정 + `role="img"` + i18n alt) | CLS 0, 실사진 주입 시 컴포넌트 1곳만 교체. 초기 화면이 빈 색면 4곳 |
| **B** | 임시 이미지(스톡·Stitch 생성)를 `public/`에 커밋 | 데모 완성도 ↑. DESIGN.md "Stitch 생성 이미지는 임시·교체 대상" + 라이선스 미확인 자산이 레포·git 이력에 영구 잔류 |
| **C** | 사진 없이 타이포만으로 구성 | 에디토리얼 정체성 훼손(사진 오버랩이 히어로의 핵심 장치) |

**추천 = A.** 근거: `public/` 비어 있음(07-30 실측), CLAUDE §9 pre-flight 미해소. B는 라이선스 불명 바이너리를
git에 남기는 되돌리기 비싼 선택. A는 비율 박스가 레이아웃을 확정하므로 실사진 확보 후 시각 회귀가 없다.

### ④ Categories ↔ 라우트 정합

| 안 | 내용 | 트레이드오프 |
|---|---|---|
| **A** | 4항목 유지 → `/experience` · `/packages/premium` · `/group` · `/rental`(ko 전용 게이팅) | 디자인 유지 + 전 항목 실존 라우트. rental 게이팅 로직 필요(DB read) |
| **B** | 3항목으로 축소해 카테고리 = 라우트 1:1(`/experience`·`/group`·`/rental`) | 코드 단순. MUSIC VIDEO(Premium의 핵심 셀링 포인트)가 홈에서 사라짐 |
| **C** | 링크 없이 순수 타이포 리스트(디자인 원문도 rental만 링크) | 최소 변경. 홈 → 상품 동선이 §5 카드에만 의존 |

**추천 = A.** 근거: 4항목 전부 실존 라우트로 매핑된다(§4-C 표). 유일한 함정은 `/rental`이 비-ko에서
`notFound()`로 죽는다는 것(`category-catalog.tsx:38-39` 실측, 1hour·1pro 모두 `languagesAvailable = ['ko']`) —
`listPackages` 결과 기반 데이터 판정으로 비링크 렌더하면 해소된다. 라우트 리네임은 여전히 각 페이지 슬라이스 소관
(Nav 스펙 §7-①), 이 슬라이스는 현행 URL을 그대로 쓴다.

### ⑤ Subscribe(뉴스레터) — MVP 범위 판정

| 안 | 내용 | 트레이드오프 |
|---|---|---|
| **A** | 섹션 제외. Boost → Footer로 종료 | MVP 범위 준수(CLAUDE §7-8). 디자인 마지막 임팩트 블록 상실 |
| **B** | 렌더하되 비활성(입력 disabled + "곧 제공") | 시각 유지. 작동 안 하는 폼 = 신뢰 훼손, 결정 ⑩(가짜 UI 금지)과 충돌 |
| **C** | 지금 구현(Resend audience + 마케팅 수신 동의 기록) | 완성. 대가: 마케팅 수신 동의는 PRD 동의 모듈(M5, Gate 2 외부 법무 감수 대상)이고 `consents` append-only는 하드 제약(§3.1) — 우회 구현이 Gate 2에서 되돌려질 위험 |

**추천 = A.** 근거: PRD 9.2 MVP 범위 밖 + 동의 수집은 법무 감수 게이트 뒤에 있다. CLAUDE §7-8 "MVP 밖이면 v1.1
백로그로만 메모". 4f는 M5 이후 별도 슬라이스로 이관.

### ⑥ 기존 `home.*` 키 처분

| 안 | 내용 | 트레이드오프 |
|---|---|---|
| **A** | 전면 교체 — 구 키 5로케일 동시 제거 + 신규 삽입. `metaTitle`·`metaDescription`·`nyt.*`는 **존치** | 잔여 dead key 0. 5파일 동시 편집 필요(i18n:check가 강제) |
| **B** | 신규 키만 추가하고 구 키 존치, 후속 정리 | 편집 위험 ↓. dead key가 5파일 × 20여 개 남아 다음 슬라이스에서 혼란 |

**추천 = A.** 근거: 소비처 실측 결과 `app/[locale]/(public)/page.tsx:25,31` **1파일뿐**이며 컴포넌트·E2E 참조 0
(07-30 grep). 홈 재작성과 동시에 소비처가 사라지므로 즉시 제거가 안전하다. `nyt.*` 3키는 §2가 계속 소비하므로
제거 대상에서 뺀다(현행 5로케일 카피 품질 양호). 편집은 CLAUDE §7-A 관용대로 포맷 보존 방식으로.

### ⑦ (추가) 홈 렌더 모드 — 패키지 카드 DB 배선

§5·§4-C가 DB read를 요구한다. 현재 홈은 정적(`generateStaticParams`, `layout.tsx:27-29`).

| 안 | 내용 | 트레이드오프 |
|---|---|---|
| **A** | `export const dynamic = 'force-dynamic'` — catalog·booking과 동일 패턴 | 레포 일관성 최고, 통화 쿠키 개인화 정상 동작. 홈이 매 요청 DB+FX 왕복 → Gate 3 Lighthouse ≥90 압박 |
| **B** | 홈은 정적 유지, 카드는 이름·설명만(가격은 `/experience`로 유도) | 최고 성능. 디자인의 가격 표시 카드 상실, 전환 동선 1단계 증가 |
| **C** | ISR(`revalidate`) | 성능·신선도 절충. **통화 쿠키 개인화와 충돌**(정적 캐시는 쿠키별로 안 갈림) → 홈 KRW 단독 표기가 되어 nav 통화 셀렉터와 불일치 |

**추천 = A.** 근거: 가격 표시 페이지는 전부 이미 이 패턴이다(`category-catalog.tsx` 호출 라우트, `booking/page.tsx:25`).
통화 오버라이드 체인(쿠키 ?? 로케일 기본)이 홈에서만 깨지면 UX 불일치가 생긴다. Gate 3에서 성능이 미달하면
그때 C로 전환하며 통화 표기 정책을 함께 재검토한다(홈 KRW 단독은 §3.2 "결제 KRW 단일"과 모순되지 않음).

### ⑧ (추가) 다크 서피스 토큰 — `bg-ink-deep` vs `bg-foreground`

시퀀스 3 footer는 `bg-foreground`(#141210)를 썼고(`site-footer.tsx:30`, 주석에 DESIGN.md 하드 규칙 인용),
시퀀스 2 토큰 스펙과 이번 지시는 `bg-ink-deep`(#111010)이다.

| 안 | 내용 |
|---|---|
| **A** | 홈은 `bg-ink-deep`(디자인 실측 충실), footer는 현행 유지 → SoT 2개 잔존 |
| **B** | 홈도 `bg-foreground`로 통일 → DESIGN.md 문구와 일치, 디자인 실측과 2단계 어긋남 |
| **C** | footer를 `bg-ink-footer`(#0b0a0a)로 되돌리고 홈은 `ink-deep` → 디자인 3단 톤 복원, footer 슬라이스 재수정 필요 |

**추천 = A.** 근거: 이번 작업 지시가 `bg-ink-deep`을 명시했고, DESIGN.md 하드 규칙의 실제 의도는 "`.dark` 클래스
금지"(shadcn 기본 slate 잔존)이지 특정 잉크 값의 강제가 아니다 — `ink-deep`은 `.dark`를 쓰지 않으므로 취지에
저촉되지 않는다. 색차 `#141210` vs `#111010`은 육안 무시 가능. 단 SoT 이원화는 §12-4에 기록하고,
DESIGN.md 문구 정정 여부는 Aiden 판단.
