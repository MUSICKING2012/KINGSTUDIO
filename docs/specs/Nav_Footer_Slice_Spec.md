# 공용 Nav + Footer 슬라이스 스펙 v1 (2026-07-24) — 디자인 개편 시퀀스 3

> 실측 소스: ① `KING STUDIO Editorial.dc.html`(sha256 `48488e33…bed742a`) nav/footer 마크업 ② `ks-footer.js`
> (sha256 `83044405…aa44be2`) ③ 레포 07-24 실측(site-header/site-footer/locale·currency-selector/
> layout.tsx/globals.css/messages). 선행: 토큰 커밋 `eb96f2f`(edi-/ks- 토큰, §참조 = Tailwind_Token_Spec_v1 v1.2).

## 0. 범위 (엄격)
**수정 허용:**
- `components/header/site-header.tsx` — 전면 재작성(미니멀 바 → 디자인 nav).
- `lib/nav/items.ts` — 단일 nav config(nav 항목). 병합 후 유일한 nav config 모듈 — 구 중복 `components/header/nav-items.ts`는 병합에서 삭제됨.
- `components/header/my-page-nav-item.tsx` — **신규**(클라이언트 게이팅, §1-D).
- `components/footer/site-footer.tsx` — 전면 재작성(에디토리얼 footer).
- `messages/{ko,en,ja,zh-HK,zh-CN}.json` — `nav` 네임스페이스 신설 + `footer` 키 교체(§3). **파이썬
  splice/insert로 편집(포맷 보존, CLAUDE 규칙).**
**수정 금지:** `app/[locale]/layout.tsx`(이미 SiteHeader/SiteFooter 마운트 — 변경 불필요),
`locale-selector.tsx`/`currency-selector.tsx`(로직 재사용; className 문자열만 §1-C 스타일로 조정 허용),
라우트 파일 전부(리네임은 각 페이지 슬라이스 담당), tailwind.config.ts, globals.css.

## 1. Nav (Editorial.dc.html 헤더 실측)
### A. 컨테이너
`<header>` sticky top-0 z-50, `bg-paper/90` + `backdrop-blur-[8px]`, `border-b border-ink/[0.08]`.
내부 wrapper: `mx-auto max-w-[1280px] px-6 min-h-[66px] flex items-center gap-5 flex-wrap`.

### B. 로고 (→ `Link` href="/")
26×26 박스: `rounded-[7px] bg-ink text-paper grid place-items-center font-extrabold text-[14px]` 내용 "K"
(aria-hidden) + 워드마크 `font-black text-[16px] tracking-[.02em] text-ink` "KING STUDIO". gap 9px.

### C. 중앙 nav + 우측 컨트롤
- 중앙: `flex gap-6 flex-1 justify-center min-w-0 overflow-x-auto`(모바일 = 가로 스크롤, 디자인 그대로 —
  햄버거 없음). 링크: `text-[16px] font-semibold text-ink whitespace-nowrap` (en 카피 자체가 대문자).
- **NAV_ITEMS config(`lib/nav/items.ts` — 단일 nav config; 구 `components/header/nav-items.ts`는 병합에서 삭제됨)** — 항목별 `{ key, href, enabled }`:

| key | 라벨 키 | href(현재) | enabled | 비고 |
|---|---|---|---|---|
| service | nav.service | `/service` | **false** | SERVICE 슬라이스가 켬 |
| studios | nav.studios | `/rental` | true | STUDIOS 슬라이스가 `/studios`로 갱신 |
| product | nav.product | `/experience` | true | PRODUCT 슬라이스가 `/product`로 갱신 |
| review | nav.review | `/reviews` | **false** | REVIEW 슬라이스가 켬 |
| blog | nav.blog | `/blog` | **false** | BLOG 슬라이스가 켬 |

  `enabled: false` = 비활성 항목도 **렌더한다** — 링크가 아닌 비인터랙티브 `<span>`으로, `text-ink/40`(foreground/40)
  스타일 + sr-only "coming soon" 주석. 디자인이 5개 탭을 전부 노출하므로 숨기지 않는다(링크가 아니므로 죽은 링크도 아님).
  **라우트 리네임은 이 슬라이스에서 하지 않는다** — nav는 config만 소유, 각 페이지 슬라이스가 자기 항목의 href/enabled를
  갱신(결정 §7-①).
- 우측(`flex items-center gap-2`): 기존 LocaleSelector·CurrencySelector 재사용 — className만 pill로:
  `rounded-full border border-ink/[0.16] bg-white px-2.5 py-2 text-[12px] font-semibold text-ink`.
  Book now 버튼: `Link` href="/booking" → `rounded-full bg-primary px-[18px] py-2.5 text-[13px] font-bold
  text-primary-foreground hover:brightness-[.92]`. 라벨 = `nav.bookNow`.
- **accent 소비 확정(토큰 스펙 §1a 보류 종결):** 브랜드 레드 #F5461E = 기존 `--primary`(globals.css 실측
  `11 91% 54%`). shadcn `--accent`는 웜 뉴트럴(브랜드 레드 아님). **레드 = `bg-primary`/`text-primary`.**

### D. My Page 게이팅 (디자인 주석 실측)
`ks_returning=1` 쿠키(비HttpOnly·SameSite=Lax·Secure — My Page 매직링크 로그인 성공 시 세팅, **세팅 로직은
이 슬라이스 범위 아님**) 존재 시에만 nav 끝에 `nav.myPage` → `/my` 렌더. **클라이언트 서브컴포넌트**
(`my-page-nav-item.tsx`, 'use client', `document.cookie` 파싱 + useEffect)로 구현 — 서버 `cookies()` 사용
금지(레이아웃 전체가 dynamic으로 강등돼 generateStaticParams 정적 렌더가 깨짐). 신규 방문자 미노출,
hydration 후 나타나는 지연은 허용.

## 2. Footer (ks-footer.js 실측)
`<footer>` `bg-ink-footer text-paper/70`. wrapper `mx-auto max-w-[1280px] px-6 py-[34px] flex flex-col gap-5`.
- 상단 행(`flex justify-between gap-5 flex-wrap items-start`):
  - 브랜드 컬럼: "KING STUDIO" `font-black text-[18px] text-paper` + 연락처 1줄 `text-[12px]`
    (**placeholder 유지**: `hello@kingstudio.co.kr · +82 2 000 0000` — 실값 Aiden 확인 전 변경 금지, §6).
  - 링크 행 `flex gap-5 text-[12px] font-bold tracking-[.04em] text-paper/80`:
    About → `/about`, Contacts → `/about`(임시 — 디자인은 Service로, Service 슬라이스에서 갱신).
    **Terms/Privacy/Refund는 렌더하지 않음**(대상 페이지 미존재 + C15 법무 대기 — legal 슬라이스가 켬, §7-④).
    링크도 NAV_ITEMS처럼 config 배열로(FOOTER_LINKS, 같은 파일 or footer 내 상수).
- 하단 법정 블록(`border-t border-paper/[0.12] pt-4 flex flex-col gap-[5px] text-[11.5px] leading-[1.7]
  text-paper/50`):
  1. `footer.businessInfo`(기존 placeholder 문자열 재사용 — 전자상거래법 표시 채움은 별도 follow-up)
  2. `footer.krwNotice`(신규 키 — KRW 결제 고지, §3 카피)
  3. `© 2026 KING STUDIO. {footer.rights}` `text-paper/[0.32]`
- 기존 footer의 Explore(packages/songs)/Company 2컬럼 구조는 **제거**(디자인 SoT — 디자인 footer에 없음, §7-③).

## 3. i18n 키 (5로케일 전체 카피 — Editorial.dc.html T 맵 실측 이식)
**신규 `nav` 네임스페이스** (en 값은 디자인 원문이 이미 대문자):

| 키 | en | ko | ja | zh-HK | zh-CN |
|---|---|---|---|---|---|
| nav.service | SERVICE | 서비스 | サービス | 服務 | 服务 |
| nav.studios | STUDIOS | 스튜디오 | スタジオ | 錄音室 | 录音室 |
| nav.product | PRODUCT | 상품 | 商品 | 產品 | 产品 |
| nav.review | REVIEW | 후기 | レビュー | 評價 | 评价 |
| nav.blog | BLOG | 블로그 | ブログ | 網誌 | 博客 |
| nav.myPage | My Page | 마이페이지 | マイページ | 我的頁面 | 我的页面 |
| nav.bookNow | Book now | 바로 예약 | 今すぐ予約 | 立即預約 | 立即预约 |

**`footer` 네임스페이스** — 유지: `businessInfo`, `rights`. 신규: `about`(있음—유지), `contacts`(신규),
`krwNotice`(신규). 제거: `tagline`/`exploreHeading`/`packages`/`songs`/`companyHeading`/`faq`(소비처가 이
슬라이스에서 사라짐 — 5로케일 동시 제거로 parity 유지). krwNotice 카피(디자인 ftKrw 실측):
- en: `All payments are charged in KRW. Other currencies are shown for reference only; the final rate is set by your card issuer.`
- ko: `모든 결제는 KRW로 청구됩니다. 다른 통화 표기는 참고용이며 최종 환율은 카드사 기준을 따릅니다.`
- ja: `すべての決済はKRWで請求されます。他通貨は参考表示です。`
- zh-HK: `所有付款均以韓元(KRW)結算，其他幣別僅供參考。`
- zh-CN: `所有付款均以韩元(KRW)结算，其他货币仅供参考。`
contacts: en `Contacts` / ko `연락처` / ja `連絡先` / zh-HK `聯絡` / zh-CN `联系`.

## 4. 게이트 (전부 통과 + 원문 출력 보고)
1. `pnpm tsc --noEmit` 2. biome lint 3. `pnpm i18n:check`(5로케일 parity)
4. **런타임 키체크**(게이트 한계 보완 — 핸드오프 §5): 1회성 node 스크립트로 5로케일 각각에서 이 스펙 §3의
   모든 키 존재를 확인해 출력(스크립트는 커밋하지 않음).
5. `pnpm build`는 compile 단계 통과 확인(sitemap prerender의 DATABASE_URL 실패는 기존 이슈 — 무관).
6. 렌더 검증(Claude in Chrome, localhost)은 **Aiden `.env` 셋업 후** 별도 수행 — 에이전트 범위 아님.

## 5. 이식 금지·주의
- 디자인 nav의 `Service.dc.html` 등 `.dc.html` href를 그대로 옮기지 말 것 — §1-C config의 라우트만.
- 마퀴·격자·히어로 등 홈 콘텐츠 구현 금지(홈 슬라이스). layout.tsx의 `.ks-grid-bg`(구 `.bg-grid-ink` — 토큰 스펙 §3에서 supersede) 적용도 홈 슬라이스에서.
- 연락처 실값·사업자 정보 임의 기입 금지(§2 placeholder 유지).
- git add/commit/push 금지(Aiden 전담). 의존성 추가 금지.

## 6. 미결(이 슬라이스 밖, 기록용)
- footer 연락처 실값(이메일·전화) — Aiden 확인 필요.
- `ks_returning` 쿠키 **세팅** 로직 — My Page/매직링크 슬라이스.
- Terms/Privacy/Refund 페이지(C15 법무) + footer 링크 활성화 — legal 슬라이스.
- 전자상거래법 businessInfo 실값 — 기존 follow-up.

## 7. 결정 로그 (아키텍트 판단, Aiden 거부권)
① **라우트 리네임 연기**: nav는 임시 href(`/experience`·`/rental`) — 리네임+redirect+sitemap은 각 페이지
  슬라이스로(diff 최소화, 죽은 링크 0 원칙). ② SERVICE/REVIEW/BLOG는 **비활성 `<span>`으로 렌더**(`text-ink/40`
  + sr-only "coming soon"; 디자인이 5탭 전부 노출 — 숨기지 않음). 링크 활성화는 해당 슬라이스가 함. ③ 기존 footer의 Explore/Company 컬럼 제거 — 디자인 SoT(단 /packages·/songs 내부 링크가
  일시적으로 footer에서 사라짐, 페이지 내 동선은 유지됨). ④ legal 링크 미렌더(죽은 링크 금지).
⑤ accent = `primary` 확정(§1-C). ⑥ My Page 게이팅 = 클라이언트 쿠키 read(정적 렌더 보존).
