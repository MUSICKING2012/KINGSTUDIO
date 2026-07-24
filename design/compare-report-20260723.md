# 보고

## 1. STEP 0 출력 원문 + MCP 도구 목록

```
git rev-parse HEAD    → 757bc21702a0c08dc7634a101f3fe1f14f36775b
git rev-parse origin/main → 757bc21702a0c08dc7634a101f3fe1f14f36775b
git status --porcelain → (빈 출력)
git tag --list 'stable-nav-footer-*' → (빈 출력, 삭제됨)
```

MCP 디자인 도구 = `DesignSync` (유일):
```
method (enum, required): list_projects | get_project | list_files | get_file |
  finalize_plan | write_files | delete_files | register_assets |
  unregister_assets | create_project | report_validate
projectId: string (required except list_projects/create_project)
path: string (get_file)
paths: string[] (delete_files/unregister_assets)
writes/deletes: string[] (finalize_plan)
localDir: string (finalize_plan)
files: object[] {path, localPath|data, encoding, mimeType} (write_files)
assets: object[] (register_assets)
name: string (create_project)
planId: string (write/delete/register/unregister)
counts: object (report_validate)
```

정지 조건 전부 미해당. 진행.

## 2. STEP 1 출력 원문

`get_project(4823843e-9325-4bf9-8d38-4a409d5b59df)` → `{"name":"King Studio V3","type":"PROJECT_TYPE_PROJECT","ownerDisplayName":"Aiden ROH","canEdit":true}`
`list_files` → 목표 파일 2개 원문 그대로 존재 확인(`KING STUDIO Editorial.dc.html`, `ks-footer.js`), 파일명 추정 재시도 불필요(1차 조회 성공).

```
ls -la /tmp/ks-design/
-rw-r--r--@ 1 aidenroh wheel 55474 Editorial.dc.html
-rw-r--r--@ 1 aidenroh wheel  2742 ks-footer.js

wc -l
     645 Editorial.dc.html
      35 ks-footer.js
     680 total

shasum -a 256
48488e33f3005b2ecb0004763523215b8ba57008d2afe8f5cd0416211bed742a  Editorial.dc.html
83044405a10a0634ed6708ecb00cc4beb24efecf3d54f5073ef926060aa44be2  ks-footer.js
```

## 3. STEP 2 덤프 원문

**D1/D2/D3** — grep 결과는 위 도구 호출에 그대로 출력됨(header 24행 시작, 49행 `</header>`; style 14–18행; nav 관련 라인 다수).

**header 전체 (24–49행, 원문 그대로):**
```
1  <header data-screen-label="Nav" style="position:sticky;top:0;z-index:50;background:rgba(240,238,233,.9);backdrop-filter:blur(8px);border-bottom:1px solid rgba(20,18,16,.08)">
2    <div style="max-width:1280px;margin:0 auto;padding:0 24px;min-height:66px;display:flex;align-items:center;gap:20px;flex-wrap:wrap">
3      <a href="#top" style="display:flex;align-items:center;gap:9px;text-decoration:none;flex:none">
4        <span aria-hidden="true" style="width:26px;height:26px;border-radius:7px;background:#141210;color:#F0EEE9;display:grid;place-items:center;font-family:'Pretendard Variable',Pretendard,Inter,sans-serif;font-weight:800;font-size:14px">K</span>
5        <span style="font-family:'Pretendard Variable',Pretendard,Inter,sans-serif;font-weight:900;font-size:16px;letter-spacing:.02em;color:#141210">KING STUDIO</span>
6      </a>
7      <nav style="display:flex;gap:24px;flex:1 1 auto;justify-content:center;min-width:0;overflow-x:auto">
8        <a href="Service.dc.html" style="font-size: 16px; font-weight: 600; color: #141210; text-decoration: none; white-space: nowrap">{{ t.navService }}</a>
9        <a href="Studio.dc.html" style="font-size: 16px; font-weight: 600; color: #141210; text-decoration: none; white-space: nowrap">{{ t.navStudio }}</a>
10       <a href="Product.dc.html" style="font-size: 16px; font-weight: 600; color: #141210; text-decoration: none; white-space: nowrap">{{ t.navSessions }}</a>
11       <a href="Review.dc.html" style="font-size: 16px; font-weight: 600; color: #141210; text-decoration: none; white-space: nowrap">{{ t.navReview }}</a>
12       <a href="Blog.dc.html" style="font-size: 16px; font-weight: 600; color: #141210; text-decoration: none; white-space: nowrap">{{ t.navBlog }}</a>
13       <!-- My Page = returning-customer only. Shown when ks_returning=1 marker exists (set on successful My Page magic-link login; non-HttpOnly, SameSite=Lax, Secure). New visitors never see it. -->
14       <sc-if value="{{ isReturning }}" hint-placeholder-val="{{ false }}"><a href="./My Page v2.dc.html" style="font-size: 16px; font-weight: 600; color: #141210; text-decoration: none; white-space: nowrap">{{ t.navMyPage }}</a></sc-if>
15     </nav>
16     <div style="display:flex;align-items:center;gap:8px;flex:none">
17       <select value="{{ locale }}" onChange="{{ setLocale }}" aria-label="Language" style="font-family:inherit;font-size:12px;font-weight:600;color:#141210;background:#fff;border:1px solid rgba(20,18,16,.16);border-radius:999px;padding:8px 10px;cursor:pointer">
18         <option value="ko">한국어</option><option value="en">EN</option><option value="ja">日本語</option><option value="zh-HK">繁體中文（香港）</option><option value="zh-CN">简体中文</option>
19       </select>
20       <select value="{{ currency }}" onChange="{{ setCurrency }}" aria-label="Currency" style="font-family:inherit;font-size:12px;font-weight:600;color:#141210;background:#fff;border:1px solid rgba(20,18,16,.16);border-radius:999px;padding:8px 10px;cursor:pointer">
21         <option value="KRW">₩</option><option value="USD">$</option><option value="JPY">¥</option><option value="HKD">HK$</option><option value="CNY">CN¥</option>
22       </select>
23       <button type="button" onClick="{{ goBook }}" style="font-family:inherit;background:{{ accent }};color:#fff;border:none;border-radius:999px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap" style-hover="filter:brightness(.92)">{{ t.bookNow }}</button>
24     </div>
25   </div>
26 </header>
```

**style 블록 전체 (14–18행, 300줄 미만이라 전체 덤프):**
```
1 <style>
2 body{margin:0;background:#F0EEE9;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
3 @keyframes ksMarquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
4 @keyframes ksToast{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}
5 </style>
```

nav 라벨 소스(5로케일, i18n 테이블에서 발췌, 원문):
```
en(307행): navService:'SERVICE', navSessions:'PRODUCT', navStudio:'STUDIOS', navReview:'REVIEW', navBlog:'BLOG', bookNow:'Book now'
ko(351행): navService:'서비스', navSessions:'상품', navStudio:'스튜디오', navReview:'후기', navBlog:'블로그', bookNow:'바로 예약'
ja(394행): navService:'サービス', navSessions:'商品', navStudio:'スタジオ', navReview:'レビュー', navBlog:'ブログ', bookNow:'今すぐ予約'
zh-HK(437행): navService:'服務', navSessions:'產品', navStudio:'錄音室', navReview:'評價', navBlog:'網誌', bookNow:'立即預約'
zh-CN(481행): navService:'服务', navSessions:'产品', navStudio:'录音室', navReview:'评价', navBlog:'博客', bookNow:'立即预约'
```

accent 값(542행): `const accent = this.props.accentColor ?? '#F5461E';` (279행 옵션 default도 `#F5461E`)

Subscribe 섹션(245–269행, footer 컴포넌트 자체는 아니지만 ks-footer 바로 위에 마운트, `showSubscribe` 기본 true):
```
1  <sc-if value="{{ showSubscribe }}" hint-placeholder-val="{{ true }}">
2    <section data-screen-label="Subscribe" style="background:#111010;color:#F0EEE9">
...
21   </sc-if>
22
23 <!-- ============ FOOTER (shared component — single source of truth) ============ -->
24 <div id="reach"><x-import component-from-global-scope="ks-footer" from="./ks-footer.js" hint-size="100%,260px"></x-import></div>
```

**D4. ks-footer.js 전문 (35줄, 원문 그대로):**
```
 1 // Shared KING STUDIO editorial footer — vanilla web component.
 2 // Mounted via <x-import component-from-global-scope="ks-footer" from="./ks-footer.js">.
 3 (function () {
 4   if (customElements.get('ks-footer')) return;
 5   class KSFooter extends HTMLElement {
 6     connectedCallback() {
 7       this.style.display = 'block';
 8       this.innerHTML = `
 9       <footer style="background:#0b0a0a;color:rgba(240,238,233,.7);font-family:'Pretendard Variable',Pretendard,-apple-system,sans-serif">
10         <div style="max-width:1280px;margin:0 auto;padding:34px 24px;box-sizing:border-box;display:flex;flex-direction:column;gap:20px">
11           <div style="display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;align-items:flex-start">
12             <div style="display:flex;flex-direction:column;gap:6px">
13               <span style="font-family:'Pretendard Variable',Pretendard,Inter,sans-serif;font-weight:900;font-size:18px;color:#F0EEE9">KING STUDIO</span>
14               <span style="font-size:12px">hello@kingstudio.co.kr · +82 2 000 0000</span>
15             </div>
16             <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:12px;font-weight:700;letter-spacing:.04em">
17               <a href="Service.dc.html" style="color:rgba(240,238,233,.8);text-decoration:none">About</a>
18               <a href="Service.dc.html" style="color:rgba(240,238,233,.8);text-decoration:none">Contacts</a>
19               <a href="#" style="color:rgba(240,238,233,.8);text-decoration:none">Terms</a>
20               <a href="#" style="color:rgba(240,238,233,.8);text-decoration:none">Privacy</a>
21               <a href="#" style="color:rgba(240,238,233,.8);text-decoration:none">Refund</a>
22             </div>
23           </div>
24           <div style="border-top:1px solid rgba(240,238,233,.12);padding-top:16px;display:flex;flex-direction:column;gap:5px;font-size:11.5px;line-height:1.7;color:rgba(240,238,233,.5)">
25             <span>KING STUDIO (킹스튜디오) · CEO: <span style="font-family:ui-monospace,Menlo,monospace">[대표자명]</span> · Business reg. no.: <span style="font-family:ui-monospace,Menlo,monospace">[000-00-00000]</span> · Privacy officer: <span style="font-family:ui-monospace,Menlo,monospace">[담당자명]</span></span>
26             <span>Address: <span style="font-family:ui-monospace,Menlo,monospace">[서울특별시 성동구 ○○로 00, 0층]</span></span>
27             <span>All payments are charged in KRW. Other currencies are shown for reference only; the final rate is set by your card issuer.</span>
28             <span style="color:rgba(240,238,233,.32)">© 2026 KING STUDIO. All rights reserved.</span>
29           </div>
30         </div>
31       </footer>`;
32     }
33   }
34   customElements.define('ks-footer', KSFooter);
35 })();
```

## 4. STEP 3 덤프 원문

(위 도구 호출 결과 6개 파일 `nl -ba` 전문, `app/globals.css` 두 구간, `tailwind.config.ts` grep, 5로케일 `nav` JSON — 전부 위 대화의 도구 결과에 원문 그대로 출력됨. `lib/currency/config.ts`는 STEP 3 지정 스크립트 범위에 없어 이번 슬라이스에서 덤프되지 않음.)

## 5. STEP 4 대조표

### 4-A. 헤더 컨테이너

| # | 항목 | 디자인 값 | 디자인 근거(파일:줄) | 현재 구현 값 | 구현 근거(파일:줄) | 판정 |
|---|---|---|---|---|---|---|
| 1 | position | sticky | Editorial.dc.html:24 | sticky | site-header.tsx:32 | 일치 |
| 2 | top | 0 | Editorial.dc.html:24 | top-0 | site-header.tsx:32 | 일치 |
| 3 | z-index | 50 | Editorial.dc.html:24 | z-50 | site-header.tsx:32 | 일치 |
| 4 | background(알파) | rgba(240,238,233,.9) | Editorial.dc.html:24 | bg-background/90 (--background 43 19% 93%=#F0EEE9) | site-header.tsx:32 / globals.css:11 | 일치 |
| 5 | backdrop-filter | blur(8px) | Editorial.dc.html:24 | backdrop-blur-[8px] | site-header.tsx:32 | 일치 |
| 6 | border-bottom | 1px solid rgba(20,18,16,.08) | Editorial.dc.html:24 | border-b border-foreground/[0.08] | site-header.tsx:32 | 일치 |
| 7 | max-width | 1280px | Editorial.dc.html:25 | max-w-container-max(1280px) | site-header.tsx:33 / tailwind.config.ts:69 | 일치 |
| 8 | 좌우 padding | 0 24px | Editorial.dc.html:25 | px-gutter(24px) | site-header.tsx:33 / tailwind.config.ts:60 | 일치 |
| 9 | min-height | 66px | Editorial.dc.html:25 | min-h-[66px] | site-header.tsx:33 | 일치 |
| 10 | 내부 정렬 | flex;align-items:center;gap:20px;flex-wrap:wrap | Editorial.dc.html:25 | flex flex-wrap items-center gap-5(20px) | site-header.tsx:33 | 일치 |

### 4-B. 로고

| # | 항목 | 디자인 값 | 디자인 근거 | 현재 구현 값 | 구현 근거 | 판정 |
|---|---|---|---|---|---|---|
| 11 | 사각 크기 | 26×26px | Editorial.dc.html:28 | h-[26px] w-[26px] | site-header.tsx:41 | 일치 |
| 12 | border-radius | 7px | Editorial.dc.html:28 | rounded-[7px] | site-header.tsx:41 | 일치 |
| 13 | 사각 배경색 | #141210 | Editorial.dc.html:28 | bg-foreground(#141210) | site-header.tsx:41 / globals.css:12 | 일치 |
| 14 | "K" 글자색 | #F0EEE9 | Editorial.dc.html:28 | text-background(#F0EEE9) | site-header.tsx:41 / globals.css:11 | 일치 |
| 15 | "K" font-size | 14px | Editorial.dc.html:28 | text-[14px] | site-header.tsx:41 | 일치 |
| 16 | "K" weight | 800 | Editorial.dc.html:28 | font-extrabold(800) | site-header.tsx:41 | 일치 |
| 17 | 워드마크 텍스트 | "KING STUDIO" | Editorial.dc.html:29 | "KING STUDIO" | site-header.tsx:46 | 일치 |
| 18 | 워드마크 font-size | 16px | Editorial.dc.html:29 | text-[16px] | site-header.tsx:45 | 일치 |
| 19 | 워드마크 weight | 900 | Editorial.dc.html:29 | ks-display-strong(900) | site-header.tsx:45 / globals.css:75 | 일치 |
| 20 | 워드마크 letter-spacing | .02em | Editorial.dc.html:29 | tracking-[0.02em] | site-header.tsx:45 | 일치 |
| 21 | 워드마크 text-transform | 미지정(속성 없음) | Editorial.dc.html:29 | uppercase(.ks-display) | site-header.tsx:45 / globals.css:68 | 불일치 |
| 22 | 워드마크 line-height | 미지정(속성 없음) | Editorial.dc.html:29 | 0.86(.ks-display) | site-header.tsx:45 / globals.css:70 | 불일치 |
| 23 | 사각↔워드마크 간격 | 9px | Editorial.dc.html:27 | gap-[9px] | site-header.tsx:37 | 일치 |

### 4-C. nav 항목

| # | 항목 | 디자인 값 | 디자인 근거 | 현재 구현 값 | 구현 근거 | 판정 |
|---|---|---|---|---|---|---|
| 24 | 라벨 문자열·순서(전 5로케일) | SERVICE→STUDIOS→PRODUCT→REVIEW→BLOG(en, 대응 4로케일 동일 순서) | Editorial.dc.html:31–35 + i18n표(307/351/394/437/481행) | service→studios→product→reviews→blog(NAV_ITEMS 순서, 라벨 5로케일 messages/*.json) | lib/nav/items.ts:21–25 / messages/*.json nav.* | 일치 |
| 25 | 대소문자 처리 | 리터럴 문자열(en은 대문자 하드코딩, CSS text-transform 없음) | Editorial.dc.html:31–35 | 리터럴 문자열(en.json 값 자체가 대문자), CSS transform 없음 | messages/en.json nav.* | 일치 |
| 26 | font-size | 16px | Editorial.dc.html:31 | text-[16px] | site-header.tsx:59,66 | 일치 |
| 27 | weight | 600 | Editorial.dc.html:31 | font-semibold(600) | site-header.tsx:59,66 | 일치 |
| 28 | 색 | #141210 | Editorial.dc.html:31 | text-foreground(#141210, enabled 경로) / text-foreground/40(현재 전항목 렌더 경로) | site-header.tsx:59 / 66 | 일치(enabled 경로 색값 자체는), 단 현재 전 항목이 disabled span 렌더이므로 실제 표시색은 /40 |
| 29 | 항목 간 gap | 24px | Editorial.dc.html:30 | gap-6(24px) | site-header.tsx:52 | 일치 |
| 30 | 활성(현재 페이지) 상태 스타일 | 정의 없음(aria-current·클래스 분기 없음) | Editorial.dc.html:24–49 전체 확인 | 정의 없음 | site-header.tsx 전체 | 일치(둘 다 없음) |
| 31 | hover 상태(nav 링크) | 정의 없음(`<a>` 태그에 style-hover 속성 없음 — 버튼류만 있음) | Editorial.dc.html:31–35 | 정의 없음 | site-header.tsx:56–62 | 일치(둘 다 없음) |
| 32 | 비활성·미구현 항목 처리 방식 | 없음 — 5개 전부 실제 href로 렌더(대상 페이지 실재 여부와 무관하게 활성 링크) | Editorial.dc.html:31–35 | enabled:false → `<span>` + `text-foreground/40` + sr-only "comingSoon" | lib/nav/items.ts:21–25 / site-header.tsx:63–70 | 구현에만 있음 |
| 33 | My Page 항목 존재·노출 조건 | 존재. `isReturning`(ks_returning 마커) true일 때만 `<sc-if>`로 조건부 렌더 | Editorial.dc.html:36–37(주석 포함) | 없음(NavItem 타입에 'myPage' 키 자체가 없음) | lib/nav/items.ts:15 | 디자인에만 있음 |

### 4-D. 셀렉터 2종(언어·통화)

| # | 항목 | 디자인 값 | 디자인 근거 | 현재 구현 값 | 구현 근거 | 판정 |
|---|---|---|---|---|---|---|
| 34 | form 요소 | `<select>` | Editorial.dc.html:40,43 | `<select>` | locale-selector.tsx:17 / currency-selector.tsx:38 | 일치 |
| 35 | font-size | 12px | Editorial.dc.html:40 | text-[12px] | 두 파일 21행/47행 | 일치 |
| 36 | weight | 600 | Editorial.dc.html:40 | font-semibold(600) | 두 파일 동일행 | 일치 |
| 37 | 배경 | #fff | Editorial.dc.html:40 | bg-white | 두 파일 동일행 | 일치 |
| 38 | border 색·두께 | 1px solid rgba(20,18,16,.16) | Editorial.dc.html:40 | border border-foreground/[0.16] | 두 파일 동일행 | 일치 |
| 39 | border-radius | 999px | Editorial.dc.html:40 | rounded-full | 두 파일 동일행 | 일치 |
| 40 | padding | 8px 10px | Editorial.dc.html:40 | py-2(8px) px-2.5(10px) | 두 파일 동일행 | 일치 |
| 41 | 표시 형식(언어) | "한국어"/"EN"/"日本語"/"繁體中文（香港）"/"简体中文" | Editorial.dc.html:41 | 읽지 못함(lib/currency/config.ts LOCALE_LABEL — STEP 3 지정 범위 밖) | — | 판정불가 |
| 42 | 표시 형식(통화) | "₩"/"$"/"¥"/"HK$"/"CN¥"(기호만) | Editorial.dc.html:44 | 읽지 못함(lib/currency/config.ts CURRENCY_LABEL — STEP 3 지정 범위 밖) | — | 판정불가 |

### 4-E. Book now 버튼 — 가장 중요

| # | 항목 | 디자인 값 | 디자인 근거 | 현재 구현 값 | 구현 근거 | 판정 |
|---|---|---|---|---|---|---|
| 43 | 라벨 문자열(5로케일) | Book now/바로 예약/今すぐ予約/立即預約/立即预约 | Editorial.dc.html:46 + i18n표 | 동일(nav.bookNow, 5로케일) | site-header.tsx:82 / messages/*.json | 일치 |
| 44 | font-size | 13px | Editorial.dc.html:46 | text-[16px] | site-header.tsx:80 | 불일치 |
| 45 | weight | 700 | Editorial.dc.html:46 | font-bold(700) | site-header.tsx:80 | 일치 |
| 46 | 배경색 | {{accent}} = #F5461E(기본값) | Editorial.dc.html:46 / 279행,542행 | bg-primary(--primary 11 91% 54%=#F5461E) | site-header.tsx:80 / globals.css:15 | 일치 |
| 47 | 글자색 | #fff | Editorial.dc.html:46 | text-foreground(#141210) | site-header.tsx:80 | 불일치 |
| 48 | border-radius | 999px | Editorial.dc.html:46 | rounded-full | site-header.tsx:80 | 일치 |
| 49 | padding | 10px 18px | Editorial.dc.html:46 | py-2.5(10px) px-5(20px) | site-header.tsx:80 | 불일치(좌우 18px vs 20px) |
| 50 | 클릭 시 목적지 | `onClick={{goBook}}` → 같은 페이지 `#bookbar`로 스크롤(638–640행, `getElementById('bookbar')`) | Editorial.dc.html:46 / 638–640 | `<Link href="/booking">` → 별도 라우트로 페이지 이동 | site-header.tsx:78–83 | 불일치 |

### 4-F. 헤더 반응형

| # | 항목 | 디자인 값 | 디자인 근거 | 현재 구현 값 | 구현 근거 | 판정 |
|---|---|---|---|---|---|---|
| 51 | 모바일 breakpoint 정의(미디어쿼리) | 없음(이 파일에 @media 없음) | Editorial.dc.html 전체 style 블록(14–18행) + header 인라인 스타일 | 없음 | site-header.tsx 전체 | 일치(둘 다 없음) |
| 52 | 개행/스크롤 처리 | 상위 컨테이너 flex-wrap:wrap + nav overflow-x:auto | Editorial.dc.html:25,30 | flex-wrap + overflow-x-auto(nav) | site-header.tsx:33,52 | 일치 |
| 53 | 햄버거 메뉴 | 없음 | Editorial.dc.html 전체 | 없음 | site-header.tsx 전체 | 일치(둘 다 없음) |

### 4-G. 푸터

| # | 항목 | 디자인 값 | 디자인 근거 | 현재 구현 값 | 구현 근거 | 판정 |
|---|---|---|---|---|---|---|
| 54 | 배경색 | #0b0a0a | ks-footer.js:9 | bg-foreground(#141210) | site-footer.tsx:30 / globals.css:12 | 불일치 |
| 55 | max-width | 1280px | ks-footer.js:10 | max-w-container-max(1280px) | site-footer.tsx:31 | 일치 |
| 56 | padding | 34px 24px | ks-footer.js:10 | py-[34px] px-gutter(24px) | site-footer.tsx:31 | 일치 |
| 57 | 블록 간 gap | 20px | ks-footer.js:10 | gap-5(20px) | site-footer.tsx:31 | 일치 |
| 58 | 브랜드 텍스트 크기 | 18px | ks-footer.js:13 | text-[18px] | site-footer.tsx:34 | 일치 |
| 59 | 브랜드 텍스트 weight | 900 | ks-footer.js:13 | ks-display-strong(900) | site-footer.tsx:34 | 일치 |
| 60 | 연락처 표기 | "hello@kingstudio.co.kr · +82 2 000 0000"(더미) | ks-footer.js:14 | "studio@musicking.co.kr · +82-2-6349-2429"(실값, 포맷도 하이픈) | site-footer.tsx:38 / lib/legal/business-info.ts:18–19 | 불일치 |
| 61 | 링크: About | href="Service.dc.html"(더미) | ks-footer.js:17 | href="/about" | site-footer.tsx:49 | 불일치(대상 상이) |
| 62 | 링크: Contacts | href="Service.dc.html" | ks-footer.js:18 | 없음 | — | 디자인에만 있음 |
| 63 | 링크: Terms | href="#"(더미) | ks-footer.js:19 | 없음 | — | 디자인에만 있음 |
| 64 | 링크: Privacy | href="#"(더미) | ks-footer.js:20 | 없음 | — | 디자인에만 있음 |
| 65 | 링크: Refund | href="#"(더미) | ks-footer.js:21 | 없음 | — | 디자인에만 있음 |
| 66 | 링크: Packages | 없음 | ks-footer.js 17–22행 확인 | href="/experience" | site-footer.tsx:47 | 구현에만 있음 |
| 67 | 링크: Songs | 없음 | 상동 | href="/songs" | site-footer.tsx:48 | 구현에만 있음 |
| 68 | 링크: FAQ | 없음 | 상동 | href="/faq" | site-footer.tsx:50 | 구현에만 있음 |
| 69 | 링크 typography | font-size:12px weight:700 letter-spacing:.04em color:rgba(240,238,233,.8) | ks-footer.js:16 | text-[12px] font-bold(700) tracking-[0.04em] text-background/80 | site-footer.tsx:45 | 일치 |
| 70 | 구분선 색 | rgba(240,238,233,.12) | ks-footer.js:24 | border-background/[0.12] | site-footer.tsx:54 | 일치 |
| 71 | 구분선 두께 | 1px | ks-footer.js:24 | border-t(기본 1px) | site-footer.tsx:54 | 일치 |
| 72 | 구분선 위 여백 | padding-top:16px | ks-footer.js:24 | pt-4(16px) | site-footer.tsx:54 | 일치 |
| 73 | 법정고지 font-size | 11.5px | ks-footer.js:24 | text-[11.5px] | site-footer.tsx:54 | 일치 |
| 74 | 법정고지 line-height | 1.7 | ks-footer.js:24 | leading-[1.7] | site-footer.tsx:54 | 일치 |
| 75 | 법정고지 색(본문) | rgba(240,238,233,.5) | ks-footer.js:24 | text-background/60 | site-footer.tsx:54 | 불일치 |
| 76 | 법정고지 구성 필드 | company·CEO·bizNo·privacyOfficer (4개, mailOrderNo 없음) | ks-footer.js:25 | company·ceo·bizNo·mailOrderNo·privacyOfficer (5개) | site-footer.tsx:56–58 | 구현에만 있음(mailOrderNo 필드) |
| 77 | 저작권 줄 색(개별 오버라이드) | rgba(240,238,233,.32)(본문 .5보다 더 옅게 별도 지정) | ks-footer.js:28 | 별도 오버라이드 없음(부모 text-background/60 상속) | site-footer.tsx:64 | 불일치 |
| 78 | KRW 고지 문구(영문 원문) | "All payments are charged in KRW. Other currencies are shown for reference only; the final rate is set by your card issuer." | ks-footer.js:27 | 동일(en 로케일) | messages/en.json footer.legal.krwNotice | 일치(en) |
| 79 | 다국어(5로케일) 지원 | 없음(정적 영문 텍스트, `{{}}` 템플릿 미사용 — ko/ja/zh 버전 자체가 디자인에 없음) | ks-footer.js 전체(35줄, `{{`/`t.` 패턴 0건) | 5로케일 지원(next-intl) | messages/{ko,en,ja,zh-HK,zh-CN}.json footer.legal.* | 구현에만 있음 |
| 80 | 저작권 표기 | "© 2026 KING STUDIO. All rights reserved." | ks-footer.js:28 | "© 2026 KING STUDIO. " + rights(en="All rights reserved.") | site-footer.tsx:64 | 일치(en) |
| 81 | 뉴스레터·구독 영역이 ks-footer.js 안에 있는지 | 없음(footer 컴포넌트 자체엔 없음) | ks-footer.js 전체 | 없음 | site-footer.tsx 전체 | 일치(둘 다 없음) — 단, Editorial.dc.html에는 footer 바로 위(마운트 직전, 245–269행)에 별도 "Subscribe" 섹션이 `showSubscribe` 기본 true로 존재. ks-footer.js 자체 파일 범위 밖이라 이 표에는 "없음"으로만 판정하되 STEP 5에 기록 |

## 6. STEP 5 — 미확인·판정불가 목록

- **#41 언어 셀렉터 표시 형식(구현 값)**: `lib/currency/config.ts`의 `LOCALE_LABEL`을 확인해야 하나, STEP 3에 지정된 덤프 스크립트가 이 파일을 포함하지 않아 이번 슬라이스 증거 범위 밖. 추측하지 않고 판정불가로 둠.
- **#42 통화 셀렉터 표시 형식(구현 값)**: 동일 사유로 `CURRENCY_LABEL` 미확인. 판정불가.
- **#28 nav 항목 색(실제 표시 상태)**: enabled 경로 색상값 자체는 디자인과 일치하나, 현재 `NAV_ITEMS` 전항목이 `enabled:false`라 실제 렌더 경로는 항상 disabled(`text-foreground/40`) span임 — "일치" 판정은 코드에 존재하는 enabled 분기의 색상값 비교에 한정됨. 실제 화면 렌더 확인은 브라우저 검증이 필요하나 이 슬라이스는 읽기 전용이라 미수행.
- **#81 Subscribe 영역**: ks-footer.js 파일 자체에는 없어 표는 "일치(둘 다 없음)"로 판정했으나, Editorial.dc.html 245–269행에 footer 직전 마운트되는 별도 Subscribe 섹션이 `showSubscribe` 기본 true로 존재함을 확인. 이 섹션이 현재 구현(`components/footer` 또는 인접 컴포넌트)에 대응 요소가 있는지는 이번 슬라이스 STEP 3 파일 목록(footer/nav 6개 파일)에 Subscribe류 컴포넌트가 없어 확인 대상 자체가 없음 — "확인 안 함"이 아니라 "대상 부재 확인".

## 7. 최종 확인

```
git status --porcelain
(빈 출력)
```