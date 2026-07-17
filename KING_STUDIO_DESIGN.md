# KING STUDIO — DESIGN (Editorial) v1

> **디자인 단일 진실 공급원(SoT).** 구 Stitch Cinematic `DESIGN.md`를 대체한다. 모든 화면 작업은
> 이 문서 + 코드 토큰(`app/globals.css` `:root` + `tailwind.config.ts` 스케일)을 함께 본다.

---

## Brand & Style

페르소나 **"Editorial Warmth"** — NYT 피처 기사의 절제된 편집 미학 + 서울 성수의 따뜻한 아날로그 톤.
마케팅 훅 자체가 NYT 보도이므로, 고급스러움은 시네마틱 글로우가 아니라 **여백·타이포·종이 질감**으로
낸다. 밝은 **단일 라이트 서피스**, 넓은 여백, 큰 라이트-웨이트 헤드라인, 스팟 컬러 절제 사용.

폐기: Stitch의 다크 시네마틱 여정, 오렌지→바이올렛 "Signature Spectrum" 그라디언트, Material-3
depth layer, Anton 헤드라인, 듀얼 서피스 토글.

## Colors

**Surfaces**
| 이름 | Hex | HSL | 용도 |
|---|---|---|---|
| paper | `#F0EEE9` | `43 19% 93%` | 페이지 배경 |
| white | `#FFFFFF` | `0 0% 100%` | 카드·패널·입력 표면 |
| ink | `#141210` | `30 11% 7%` | 본문·헤드라인·다크 버튼·로고 사각 |

**Brand accent**
| accent | `#F5461E` | `11 91% 54%` | CTA 채움·링크·포커스 링·활성 상태·스팟 |

> 로고 사각은 **잉크(#141210)**, accent 아님.

**Neutrals**
| warm-neutral | `#E7E4DD` | `43 16% 88%` | secondary 버튼·hover 배경 |
| border | `#E2DED6` | `41 17% 86%` | 보더·구분선·입력 테두리 |
| muted-text | `#6B6460` | `22 5% 40%` | 보조 텍스트·메타 |

**Semantic**
| destructive | `#C0392B` | `6 63% 46%` | 환불·삭제·오류(accent와 구분) |
| success | `#2E9E5B` | — | 확정·완료(텍스트 대비 확인) |

**WCAG (하드 제약 §3.9)**
- `#F5461E` + 흰 텍스트 ≈ **3.4:1** → AA(4.5) 미달, AA-large(3:1)만 통과.
- 규칙: 소형 본문/라벨 텍스트·아이콘은 **잉크** 사용(accent를 텍스트색으로 금지); `#F5461E`는
  **fill·보더·포커스 링·대형 헤드라인 스팟**에만; accent 채움 버튼 라벨은 **≥16px 볼드(또는 ≥18.66px)**.
- 상태(슬롯 가능/마감 등)는 색만으로 전달 금지 — **색 + 텍스트 + 아이콘** 병기.

## Typography

서체 **Pretendard 단일**(로컬 self-host; KR·EN·JP·ZH 커버). Anton 폐기. 에디토리얼 임팩트는
**큰 사이즈 + 라이트/레귤러 웨이트 + 넓은 여백**으로 낸다(웨이트로 밀어붙이지 않는다).

스케일(tailwind 유지, 패밀리만 Pretendard):
- `display-lg` 72px / mobile 48px — 히어로 (weight 300–400)
- `headline-xl` 40px / `headline-lg` 32px — 섹션 타이틀 (400–500)
- `body-lg` 18px / `body-md` 16px — 본문 (400)
- `label-sm` 12px · letter-spacing .05em · 600 · 대문자 — 라벨·태그·nav

## Layout & Spacing (tailwind 유지)

`container-max` 1280px 중앙 정렬 · margin desktop 40px / mobile 16px · `section-gap` 80px ·
`gutter` 24px · stack sm/md/lg = 8/16/32px. **넓은 여백이 브랜드 시그니처** — 촘촘히 채우지 않는다.

## Radius

`--radius` 0.75rem(12px) 버튼·입력 · `brand-card` 1.125rem(18px) 대형 카드·패널 · `full` 칩·뱃지·아바타.

## Surfaces (단일 라이트)

paper 배경 위 white 카드 2층. 그림자는 soft·낮게(`0 1px 2px rgba(20,18,16,.06), 0 8px 24px
rgba(20,18,16,.04)`). `<Surface tone="cinematic|warm">` 듀얼 서피스·전역 다크 토글 폐기. **다크모드는
현재 범위 밖**(추후 잉크 배경 에디토리얼 다크 별도 설계).

## Components (shadcn `:root` 토큰 기반 — 변수 교체 시 자동 반영)

- **Button / primary**: bg accent · 흰 볼드 라벨(WCAG) · 대형 CTA.
- **Button / secondary**: bg warm-neutral · ink 텍스트.
- **Button / outline·ghost**: border · ink 텍스트 · hover warm-neutral.
- **Button / ink(에디토리얼 다크)**: bg ink · paper 텍스트 — 신문 톤 커스텀 variant.
- **Card**: white 표면 · border 또는 soft shadow · radius 18px · 넉넉한 패딩(24–32px).
- **Input**: white · border `#E2DED6` · focus ring accent · radius 12px.
- **Badge/Chip**: `rounded-full` · border accent 또는 warm-neutral · accent 채움 뱃지는 흰 대형/볼드만.
- **Nav**: 5-item ALL CAPS · `label-sm` · ink 텍스트 · 활성 = accent · 로고 사각 ink.
- **Footer**: 공용 컴포넌트 · paper/ink · 사업자정보.
- **Section header**: 잉크 대형 타이틀 + 얇은 accent 규칙선 절제 사용.

## 전용 레이아웃 없는 화면 구성 원칙

새 레이아웃을 임의 창작하지 말고 위 프리미티브로 구성: 타이포 스케일 + white 카드(18px, soft shadow)
+ paper 배경 + `gap-gutter` 그리드 + accent 스팟. 입력은 위 Input 스타일, 섹션 간 `section-gap`,
배지는 `rounded-full`. 기존 화면 패턴 재사용.

## 이미지·모션

- 이미지: 실제 스튜디오/세션 사진 우선(Stitch 생성 이미지는 임시·교체 대상 — CLAUDE.md §9). 따뜻한
  자연광, 과한 필터 지양.
- 모션: 절제. fade/slide 짧게(150–250ms). 큰 패럴럭스·글로우 지양.
