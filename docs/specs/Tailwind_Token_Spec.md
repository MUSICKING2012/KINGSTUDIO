# Tailwind 토큰 확장 스펙 v1 (2026-07-23) — 디자인 개편 시퀀스 2

> 실측 소스: `KING STUDIO Editorial.dc.html` (sha256 `48488e33f3005b2ecb0004763523215b8ba57008d2afe8f5cd0416211bed742a`, 55,474B)
> + `ks-footer.js` (sha256 `83044405a10a0634ed6708ecb00cc4beb24efecf3d54f5073ef926060aa44be2`, 2,742B).
> 2026-07-23 claude.ai/design "King Studio V3"에서 다운로드(브라우저 경로). 이 스펙은 **토큰/유틸만** 추가한다 —
> 페이지·컴포넌트 변경 없음(후속 슬라이스가 소비). 변경 파일: `tailwind.config.ts`, `app/globals.css` 2개뿐.

## 0. 구현 에이전트 지시 요약
1. `tailwind.config.ts`의 기존 fontSize 토큰 목록을 먼저 확인할 것. **기존 `display-*` 토큰(최대 72px)은 건드리지
   않는다** — 신규 스케일은 전부 `edi-` 접두(에디토리얼)로 추가해 충돌을 원천 차단.
2. 기존 컬러 `paper #F0EEE9 / ink #141210 / accent #F5461E`는 그대로. 신규 컬러만 추가.
3. 알파 변형(rgba(20,18,16,.045) 등)은 토큰화하지 않는다 — Tailwind slash opacity(`ink/40`, `paper/70`,
   `border-ink/[0.08]`)로 소비. 토큰 수 최소 유지.
4. 완료 게이트: `pnpm tsc --noEmit` + biome + `pnpm build` 통과. 렌더 검증은 홈 슬라이스에서(토큰 단독은 화면 없음).

## 1. 컬러 토큰 추가 (tailwind.config.ts `extend.colors`)
```ts
'ink-deep': '#111010',    // 다크 섹션 bg (Provide·Booking bar·Subscribe·toast)
'ink-raise': '#1c1a19',   // 다크 섹션 내 elevated 필드(예약바 input/select, 다크 이미지 bg)
'ink-footer': '#0b0a0a',  // 푸터 bg (ks-footer 실측)
'paper-raise': '#F5F3EE', // 라이트 카드 bg (패키지 카드 light variant)
'paper-dim': '#e6e3dc',   // 이미지 플레이스홀더 bg
```
다크 섹션 위 텍스트는 `text-paper` + slash opacity(디자인 실측: .35/.4/.5/.55/.6/.7/.8/.85), 다크 보더는
`border-paper/[0.12~0.25]`, 라이트 보더는 `border-ink/[0.08~0.25]`.

### 1a. 보완 (v1.1, 07-24 구현 실측 반영)
현행 레포의 `paper`/`ink`는 Tailwind 리터럴 색 토큰이 아니라 shadcn CSS 변수(`--background`/`--foreground`)로만
존재 → 위 slash opacity 소비 가이드가 해석 불가. 따라서 `extend.colors`에 리터럴 2개를 **추가**한다:
```ts
'paper': '#F0EEE9', // = --background 실값. SoT는 globals.css :root — 값 변경 시 양쪽 동기 필수
'ink': '#141210',   // = --foreground 실값. 동일
```
`accent` 리터럴은 **추가 금지** — 기존 shadcn `accent` 토큰과 충돌. 에디토리얼 accent(#F5461E)의 소비 방식은
시퀀스 3에서 기존 accent 변수 실값 검증 후 확정.

## 2. 타입 스케일 (`extend.fontSize`, 전부 `edi-` 접두)
| 토큰 | 값 | lh | ls | weight | 실측 위치 |
|---|---|---|---|---|---|
| `edi-hero` | clamp(58px,14.5vw,200px) | .86 | .01em | 800 | 히어로 RECORD / IN SEOUL |
| `edi-shout` | clamp(60px,15vw,210px) | .86 | -.01em | 900 | FEELING BOLDER (accent색) |
| `edi-xl` | clamp(34px,6.4vw,84px) | .98 | — | 900 | Subscribe h2 |
| `edi-lg` | clamp(34px,5.4vw,74px) | .98 | — | 800 | LOVE WHAT WE MAKE |
| `edi-md` | clamp(30px,5.2vw,68px) | 1 | — | 800 | Boost 라인 |
| `edi-sm` | clamp(30px,4.6vw,60px) | 1.02 | — | 800 | 다크 섹션 h2 |
| `edi-cat` | clamp(26px,3.8vw,46px) | 1.08 | — | 900 | 카테고리 리스트 항목 |
| `edi-kicker` | clamp(22px,2.4vw,30px) | 1.02 | — | 800 | 히어로 키커 |
| `edi-book` | clamp(18px,2.2vw,26px) | — | — | 800 | 예약바 타이틀 |

fontSize 튜플 형식으로 lineHeight/letterSpacing/fontWeight 동봉(`['clamp(...)', {lineHeight:'0.86', ...}]`).
전부 uppercase로 쓰이지만 uppercase는 토큰이 아니라 사용처 클래스(`uppercase`)로. 보조 실측(토큰화 안 함,
arbitrary로): 브래킷 글리프 clamp(50px,9vw,120px) w400, 마퀴 19px w800.

**타이포 공존 노트:** 컴포넌트는 C17 arbitrary 값 + `.ks-display`/`.ks-display-strong` 티어를 사용하고, `edi-*`
fontSize 스케일은 페이지 슬라이스용으로 계속 제공된다(둘은 병존). 단, 한 요소가 `clamp()`를 inline arbitrary와
스케일 토큰으로 **이중 지정하면 안 된다** — 둘 중 하나만.

## 3. 격자 배경 유틸 (`app/globals.css`)
```css
.bg-grid-ink {
  background-image:
    linear-gradient(rgba(20, 18, 16, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(20, 18, 16, 0.045) 1px, transparent 1px);
  background-size: 46px 46px;
}
```
실측 = 46px(기존 문서의 "44–46px"는 46으로 확정, Editorial 기준). paper 배경 전체 래퍼에 적용(디자인은
body 레벨). 다크 섹션은 격자 없음.

**구현 실측(supersede):** 실제 사용 중인 격자 헬퍼는 `app/globals.css`의 `.ks-grid-bg`이며, 이 스펙의
`.bg-grid-ink` 이름을 대체한다. 소비처는 `.ks-grid-bg`를 사용할 것.

## 4. 라운드 토큰 (`extend.borderRadius`)
```ts
'ks-field': '11px', // 예약바 필드·CTA·toast
'ks-card': '14px',  // 히어로 NYT 카드
'ks-img': '16px',   // 카테고리·Boost 이미지
'ks-panel': '18px', // 히어로 사진·패키지 카드·다크 이미지
'ks-bar': '20px',   // 예약바 컨테이너
```
pill은 기존 `rounded-full`(999px) 사용. 6/7/9/10px 단발 사용처는 arbitrary(`rounded-[7px]`)로 — 토큰 남발 금지.

## 5. 그림자 (`extend.boxShadow`)
```ts
'edi-photo': '0 24px 60px rgba(20, 18, 16, 0.22)',   // 히어로 오버랩 사진
'edi-caption': '0 6px 18px rgba(20, 18, 16, 0.16)',  // 사진 위 캡션 카드
```

## 6. 키프레임·애니메이션 (tailwind `extend.keyframes/animation` 또는 globals.css)
```ts
keyframes: {
  'edi-marquee': { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
  'edi-toast': { from: { opacity: '0', transform: 'translate(-50%, 12px)' },
                 to: { opacity: '1', transform: 'translate(-50%, 0)' } },
},
animation: {
  'edi-marquee': 'edi-marquee 24s linear infinite',
  'edi-toast': 'edi-toast 0.25s ease-out',
},
```
마퀴 구조(width:max-content + 콘텐츠 4벌 복제 + -50% 이동)는 컴포넌트 구현 사항(시퀀스 3 이후). 구현 시
`prefers-reduced-motion: reduce`에서 마퀴 정지 가드 추가(디자인엔 없음 — 접근성 보강, 제품 규칙 아님).

**shipped 확정:** 적용된 애니메이션 이름은 `edi-marquee` / `edi-toast`이다(`ks-marquee` 아님).

## 7. 기타 실측 (토큰 아님 — 후속 슬라이스 참고)
- 컨테이너: max-width 1280px / px-24px. 섹션 세로 패딩 clamp(40px,6vw,72px), Subscribe만 clamp(44px,6vw,80px).
- nav: sticky, `bg-paper/90` + backdrop-blur 8px + border-b `ink/[0.08]`, min-height 66px → 시퀀스 3 nav 스펙에서.
- My Page nav 게이팅: 디자인 주석 실측 — `ks_returning=1` 마커(비HttpOnly·SameSite=Lax·Secure, 매직링크 로그인
  성공 시 세팅), 신규 방문자에겐 nav 미노출 → 시퀀스 3 nav 스펙에 반영.
- footer(ks-footer.js): bg `ink-footer`, 법정 표기 5행 구조, About/Contacts→Service, Terms/Privacy/Refund 링크,
  KRW 결제 고지 문구 → 시퀀스 3 footer 스펙에서. 사업자 정보는 placeholder(기존 businessInfo follow-up).

## 8. 이식 금지 (디자인 데모 값 — DB/PRD 정본, 절대 하드코딩 금지)
- 가격(400K/500K/1.5M/150K)·시간(2H/3H)·슬롯 목록·D+1→D+90 윈도우 — 전부 데모 상수. DB read.
- **Making minG:2는 stale — C12 확정값 3** (maxG 15는 일치). 게스트 +50%·최대 5인 규칙은 PRD 대조 후 사용.
- `RATES`(USD 1385 등) 고정 환율·통화 심볼 — 이식 금지. 통화 표시 정책은 별도(§9 C17과 연동).
- `isFull()` = 데모용 가짜 해시. 실제 슬롯 API 사용.
- NYT 링크 placeholder(`#nyt-article-url`) — 실제 기사 URL 필요(기존 follow-up).

## 9. C17 — 로케일 세트 (⚠ v1.2 정정: 허위 충돌로 판명 — 마이그레이션 불필요, 시퀀스 2.5 취소)
- 07-24 레포 실측: `lib/i18n/routing.ts` = `['ko','en','ja','zh-HK','zh-CN']`(PRD §5.1/CLAUDE §5 명시),
  `messages/zh-CN.json` = 실제 간체 / `zh-HK.json` = 번체, zh-TW.json 부존재,
  `lib/currency/config.ts` LOCALE_DEFAULT_CURRENCY = ko KRW/en USD/ja JPY/zh-CN CNY/zh-HK HKD.
  → **디자인의 로케일·통화 매핑과 완전 일치. 작업 없음.** (화해문서 row 10 통화 대조도 이걸로 종결.)
- v1.0~1.1 §9의 "충돌"은 구 Session_Handoff의 로케일 오기("zh-TW/zh-HK 모두 번체")를 레포 검증 없이
  인용해 생긴 허위였다. 이에 근거했던 07-23 "zh-TW→zh-CN 교체 결정"도 무의미(이미 그 상태).
- 교훈: 로케일·라우팅 등 구조 사실은 문서 인용이 아니라 **레포 실측**으로 검증 후 스펙에 쓴다.
