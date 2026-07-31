# 푸터 슬라이스 스펙 v2 (2026-07-31) — 디자인 개편 시퀀스 3-R

> **`Nav_Footer_Slice_Spec.md` v1 §2(푸터)를 supersede 한다.** 같은 문서의 §1(nav)은 그대로 유효.
>
> 실측 소스: claude.ai/design 프로젝트 `4823843e-9325-4bf9-8d38-4a409d5b59df` / `KING STUDIO Footer.dc.html`
> — 2026-07-31 `DesignSync get_file` 로 취득(브라우저 다운로드 아님). 구 소스 `ks-footer.js` 는 폐기.
> 레포 실측 @ `719feca` + 슬라이스 4a 워킹트리.

⚠ **로컬 스냅샷 없음.** `design/KING STUDIO Editorial.dc.html` 과 달리 이 푸터 원본은 레포에 저장하지 않았다
(수동 전사 시 SVG path 훼손 위험). 재현이 필요하면 위 projectId + 경로로 다시 취득하거나, Editorial 과 같은
브라우저 경로로 `design/KING STUDIO Footer.dc.html` 을 내려받아 커밋할 것 — §4 미결.

## 0. 범위

**수정 허용 (전부 반영 완료):**
- `components/footer/site-footer.tsx` — 전면 재작성(3밴드 구조).
- `components/footer/footer-social.tsx` — **신규**. 소셜 5링크 + inline SVG 글리프.
- `components/footer/footer-locale-pills.tsx` — **신규**. 클라이언트 로케일 pill(`usePathname` 필요).
- `lib/nav/footer-links.ts` — **신규**. 푸터 링크 config(`NAV_ITEMS` 패턴).
- `messages/{ko,en,ja,zh-HK,zh-CN}.json` — `footer` 네임스페이스 재구성.

**수정 금지:** `lib/legal/business-info.ts`(값은 신고·등기 정본 — 코드가 아니라 값 확인으로만 바뀐다),
`components/header/*`, `app/[locale]/layout.tsx`(이미 `SiteFooter` 마운트), `tailwind.config.ts`, `app/globals.css`.

## 1. 구조 (디자인 3밴드)

| 밴드 | 내용 | 컨테이너 |
|---|---|---|
| ① CTA | h2 `.ks-display text-[clamp(34px,5.5vw,68px)] leading-[0.96] max-w-[14ch]` + Book your slot CTA + mailto | `max-w-container-max px-gutter py-[clamp(44px,6vw,80px)]`, `border-b border-primary/[0.28]` |
| ② 3컬럼 | 브랜드(로고+태그라인+위치) / Explore 링크 / Follow 소셜 + Language pill | `grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-10 py-[clamp(38px,4.5vw,60px)]` |
| ③ 법정 바 | © + 전자상거래법 §10 표시사항 + KRW 고지 | `border-t border-paper/10 py-5` |

서피스: `bg-ink-footer` + `text-paper`. accent = `bg-primary`.

## 2. 디자인 대비 델타 (전부 의도적 — 근거 병기)

| # | 디자인 | 채택 | 근거 |
|---|---|---|---|
| D1 | accent `#E8622C` | **`primary` (#F5461E)** | 브랜드 accent 정본은 #F5461E(CLAUDE §1 / DESIGN.md / `globals.css --primary`). `#E8622C` 는 Editorial 원본 `accentColor` prop의 대체 옵션(279행)일 뿐 정본이 아니다 |
| D2 | bg `#181214` / text `#EDEAE6` | **`ink-footer` #0b0a0a / `paper` #F0EEE9** | 신규 토큰 추가 금지. `ink-footer` 는 푸터 배경 용도로 정의된 기존 토큰(Tailwind_Token_Spec §1) |
| D3 | accent 채움 위 라벨 `#181214`(잉크) | **유지 = `text-foreground`** | 실측 5.11:1 통과. (흰 라벨이었다면 3.63:1 AA 미달) |
| D4 | 소형 텍스트 알파 `.4`·`.5` | **`/60`** | ink-footer 위 `.4` = 계산 3.41:1(AA 미달). `/60` = 6.43:1 |
| D5 | 뉴스레터 이메일 캡처 | **제외** | 마케팅 수신 동의 = PRD 동의 모듈(M5) + Gate 2 법무. `consents` append-only 하드 제약(§3.1) 우회 금지. Home_Slice_Spec 결정 ⑤ 확정과 동일 근거 |
| D6 | CTA `#book-your-slot` 앵커 | **`/booking`** | 실존 라우트. 인페이지 앵커는 푸터가 모든 화면에 붙으므로 대부분 대상이 없다 |
| D7 | 사업자정보 하드코딩 문자열 | **`BUSINESS_INFO`** | 전자상거래법 §10 표시사항 단일 출처. 디자인 누락분(개인정보책임자) + KRW 고지(§3.2)를 v1에서 승계 |
| D8 | 전화 `+82-2-6338-2428` | **레포 값 `+82-2-6349-2429` 유지** | **불일치.** 신고·등기 대조 대상이라 코드가 아니라 값 확인으로 해소 — §4 미결 |
| D9 | 컨테이너 1200px / padding 28px | **`max-w-container-max`(1280) / `px-gutter`(24)** | 헤더·본문과 좌우 정렬이 어긋나면 안 된다 |
| D10 | 링크 5개 전부 활성 | **`enabled` 플래그** | `/policy/*`·`/info/*` 미존재 → `[...rest]` catch-all 오답 페이지. 비활성은 `<span>` + `sr-only`(Nav 슬라이스 §7-② 패턴) |
| D11 | about 링크 없음 | **추가(enabled)** | 07-31 실측: `/about`·`/faq` 의 유일 인바운드 링크가 푸터. 디자인대로 지우면 `/about` 이 도달 불가가 된다 |
| D12 | 언어 `<button>` + 상태 | **`<a>` + `hrefLang` + `aria-current`** | 5개 로케일 대체 URL을 크롤러가 따라가야 한다(PRD §5.1 hreflang). 활성 상태를 색만으로 전달하지 않는다(§3.9) |
| D13 | 소셜 `aria-label` | **링크 내부 `sr-only` 텍스트** | biome `a11y/useAnchorContent` 요구 형태이며, aria-label 이 무시되는 환경에서도 이름이 남는다 |
| D14 | zh-CN 카피가 **번체** | **간체로 교정** | 디자인 T맵의 `'zh-CN'` 블록이 `使用條款`·`隱私政策`·`追蹤` 등 번체다(CLAUDE §5: zh-CN=간체, zh-HK=번체) |
| D15 | 디자인 tagline | **레포 기존 tagline 유지** | 레포 값이 이미 5로케일 정확·의미 동등. 교체 시 D14 의 번체 혼입 위험만 늘어난다. Aiden 이 디자인 카피를 선호하면 교체 가능 |

`inquery` 철자는 **교정하지 않았다** — 디자인 파일 상단 개발자 노트가 명시적으로 유지를 요구(`lib/nav/footer-links.ts` 주석).

## 3. i18n (`footer` 네임스페이스)

**신규:** `ctaHeading`, `ctaButton`, `orEmail`, `locationLine`, `followHeading`, `languageHeading`,
`socialAria`(ICU `{network}`), `comingSoon`, `links.{terms,privacy,partners,about,faq,contact}`.
**존치:** `tagline`, `exploreHeading`, `rights`, `legal.*`(7키 전부).
**제거(5로케일 동시):** `packages`, `songs`, `companyHeading`, `about`, `faq`, `operatedBy` — 소비처가 이 슬라이스에서 사라짐.
로케일 pill 라벨(`KO`·`EN`·…)은 언어 태그라 번역 대상이 아니다. 접근 이름은 `LOCALE_LABEL` 자기표기.

## 4. 미결

1. **소셜 계정 URL 5건 검증** — instagram `kingstudio_official` / youtube `@kingstudio.official` / x `kingstudio_X` /
   tiktok `@kingstudio` / facebook `id=61578761635395`. 디자인 파일 제공값 그대로다. **실존·정확성 Aiden 확인 필요**
   (죽은 소셜 링크는 신뢰 훼손). 확인 전까지는 디자인 신뢰로 렌더 중.
2. **전화번호 불일치(D8)** — 디자인 `+82-2-6338-2428` vs `BUSINESS_INFO.tel +82-2-6349-2429`. 어느 쪽이 정본인지 확인 필요.
3. **`/policy/service`·`/policy/privacy`·`/info/partners`·`/info/inquery` 라우트** — 미존재. legal(C15 법무) ·
   partners · contact 슬라이스가 각자 켠다. 켤 때 `lib/nav/footer-links.ts` 의 `enabled` 만 true 로 바꾸면 된다.
4. **디자인 원본 로컬 스냅샷** — 위 ⚠ 참조.
5. **호스팅서비스 제공자 표시** — 전자상거래법 §10 필수인데 `business-info.ts:8` 기준 여전히 결손. 인프라 확정 후 추가.
6. **`mailOrderNo` 관할 불일치** — `business-info.ts:6` 기존 경고(종로구청 발급 / 강남 영업소) 그대로 유효.

## 5. 게이트 (2026-07-31 전항 통과)

```
pnpm tsc --noEmit  → exit 0
pnpm lint          → Checked 244 files. No fixes applied.
pnpm i18n:check    → ✅ 5 locales in sync
런타임 키체크        → 24 keys × 5 locales, 제거 6키 부재, ICU {network} 존재
pnpm build         → ✓ Compiled successfully / ✓ Generating static pages (84/84)
                     (/sitemap.xml DATABASE_URL 실패는 기존 이슈)
렌더 대비 감사       → footer 텍스트 노드 21개 전부 AA 통과, fails: []
                     accent 채움 라벨 5.11:1
링크 감사           → 활성 링크는 실존 라우트만(/booking·/about·/faq·mailto·소셜 5),
                     비활성 4건은 <span>+sr-only, hreflang 대체 URL 5개
오버플로            → 375px 뷰포트에서 footer 오버플로 0
                     (header 4건은 별건 — Home_Slice_Spec §12-10)
```
