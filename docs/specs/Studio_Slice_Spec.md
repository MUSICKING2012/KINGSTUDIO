# Studio 슬라이스 스펙 v1 (2026-08-05) — 시퀀스 5d-2

> 실측 소스: `design/pages/Studio.dc.html` (sha256 `cd65f13a4e31b666ae43ec914737b0a5498e563c752e425fc81feccb447fad97`, 64,711 bytes).
> 취득 경로: Claude Design "Hand off to Claude Code" 표준 standalone 번들(4,142,127 bytes, sha256
> `3747bce093af537aa0f8609d2a5f44cab1d18e0817c85b00d59eb734869d22fa`)에서 `__bundler/template`
> 블록을 추출한 것 — DesignSync 원격 인증 불가 우회(Pages_Sequence_Spec §6 실측). 형식은 기존
> `.dc.html` 스냅샷과 동일하며 폰트 URL만 번들 리소스 UUID 로 치환돼 있다(실측에 영향 0).
> 선행: 5d-1 리네임 머지 완료(PR #36) — `/studios` = 기존 `CategoryCatalog(rental)`, ko 전용.

## 0. 실측 요약 (디자인 섹션 구성)

1. **Hero** — 메타 스트립 `STUDIOS · SEOUL · SEONGSU · TWO ROOMS · KST 2026`, h1 "Inside the
   studios", 서브 카피, 21/9 히어로 이미지 슬롯(placeholder).
2. **Rooms** — STUDIO A/B 카드 2장(교차 배치). 각: 메인+디테일 2 이미지 슬롯, 이름, 용도 문장,
   스펙 4행(Size·Booth·Control room·Max guests = 전부 `[—]`), 태그(`[Solo packages — TBC]` 등).
3. **Equipment** — 아코디언 5카테고리(Console & Interface / Microphones / Outboard & Monitoring /
   Headphones & Cue / Instruments & Software), 행 전부 `[모델명]`/`[n]`.
4. **Team** — 4인 카드(노광균 Engineer · 박준호 Vocal Director · 이소연 Producer · 김민지 Manager),
   bio 전부 `[한 줄 소개 — fill-in]`. 디자인 주석: "Admin Console v3 → 팀 관리에서 렌더,
   얼굴·이름은 동의 시에만".
5. **Studio Rental (KO)** — 다크 패널, 한국어 전용 배지. "온라인 예약 없이 문의로 진행" 카피 +
   표(대상/룸/시간/요금/장비 = 뒤 3개 "문의 시 안내") + `문의하기 →`(#reach 앵커).
6. **CTA** — "Ready to record?" + See packages/Book a session → Product.
7. 나브·푸터·EN/₩ 스위처 — 디자인 자체 데모(기존 컴포넌트가 정본, 이식 0).

디자인 스스로 선언한 사실 제약(스크립트 주석): **"two rooms only (A/B). All specs/gear/rental
terms are CLIENT FILL-INS — placeholders rendered as [—]/[모델명], never invented."**

## 1. 디자인 대비 델타 (판정)

| # | 디자인 | 판정 | 근거 |
|---|---|---|---|
| D1 | 페이지 성격 = 스튜디오 소개(룸·장비·팀) 중심, 대여는 하단 패널 1개. 카피는 영어 우선 | **OPEN ①** | 현행 `/studios` = ko 전용 대여 카탈로그(5d-1). 소개 페이지로 바꾸면 로케일 노출·nav 게이트·sitemap 포함 여부가 전부 재결정 대상 |
| D2 | 대여 패널 "온라인 예약 없이 문의로 진행", 요금·시간 "문의 시 안내" | **PRD 충돌 확정 — 이식 금지** | PRD §5.2: 1Hour(5슬롯)·1Pro(3슬롯) 슬롯 그리드 + DB `bookingFlow=instant_payment` + DB 가격. b2b_quote 전환은 단체 3종뿐(2026-07-17 오너 결정). 표기 정합은 **OPEN ②** |
| D3 | 룸 스펙 4행 `[—]` + room↔product 매핑 fill-in | **데이터 부재 — 스펙 표 이연** | 디자인 자체가 client fill-in 선언. 발명 금지 |
| D4 | 장비 리스트 전행 `[모델명]` | **섹션째 이연** (5c D6 선례 — placeholder 진열은 정보가치 0) | 동일 |
| D5 | 팀 4인 실명 표기 | **이연 + Aiden 확인 필수** | 실명·동의 여부 미확인(디자인 주석도 consent 전제). 어드민 "팀 관리" 모듈도 미구현 — 하드코딩 실명 게시는 불가 |
| D6 | 이미지 슬롯 7개(히어로 1 + 룸당 3) | 실사진 pre-flight 미해소(CLAUDE §9) — 채택 시 `EditorialImage` placeholder(홈 패턴) | 4b 확립 패턴 |
| D7 | 소형 텍스트 알파 `.4/.55/.6/.65` | 라이트 `/70`·다크 `/65` 상향 | §11-W |
| D8 | CTA·크로스링크 → Product | 채택(기존 라우트·5a CTA 패턴) | — |

## 2. OPEN DECISION — **전건 확정 (2026-08-05 Aiden 회신)**

- **① = C (단계 분할)**: 현행 ko 전용 유지 + 데이터 실재 섹션(히어로·룸 카드 뼈대·대여 카드·CTA)만
  구현. fill-in 도착 후 5d-3 에서 소개 페이지로 확장.
- **② = 즉시결제가 정본**: PRD §5.2·DB 유지. 디자인 "문의제" 카피 이식 금지.
  **후속 백로그: 홈 Categories 의 INQUIRY ONLY 필도 같은 사유로 정정 대상**(별도 슬라이스).

### ① STUDIOS 페이지 성격·로케일 노출
- **A. 현행 유지 + 부분 채택**: `/studios` 는 ko 전용 대여 카탈로그로 남기고, 디자인 섹션 중
  데이터 있는 것(히어로·룸 이름/용도·CTA)만 카탈로그 위에 얹는다. 로케일 게이트·sitemap·nav 불변.
  작업 최소, 5d-1 의미 유지. 단 디자인 의도(소개 페이지)와 어긋남.
- **B. 디자인대로 소개 페이지 전환**: `/studios` = 전 로케일 스튜디오 소개 페이지(룸·장비·팀),
  대여 패널만 ko 조건부 + 1Hour/1Pro 카드(현 카탈로그)를 패널 자리에 통합. 나브 게이트 해제
  (전 로케일 링크), sitemap 포함 가능(200 불변식 충족하게 됨). fill-in 데이터 도착 전엔 빈 페이지
  위험 — D3·D4·D5 채워질 때까지 사실상 착수 불가.
- **C. B 로 가되 단계 분할**: 지금은 A 로 출시하고, fill-in 데이터가 모이면 B 로 확장(5d-3).
- **추천 = C.** 근거: B 가 디자인 의도지만 콘텐츠(스펙·장비·팀·사진)가 전부 미확보라 지금 B 는
  placeholder 페이지가 된다. A 만 하면 디자인 반영이 사실상 0. C 는 지금 가능한 것(히어로·룸
  카드 뼈대·CTA)을 얹고 확장 여지를 남긴다.

### ② 대여 판매 방식 표기 정합 (사이트 전역)
- 디자인(이 페이지 + 홈 INQUIRY ONLY 필)은 대여 = 문의제. PRD·DB·예약 플로우는 즉시결제.
- **A. PRD·DB 가 정본**: 대여 패널/카드에 DB 가격·슬롯·예약 진입 유지. 홈 INQUIRY ONLY 필은
  후속 정정 대상(별도 슬라이스— 홈 카피 수정).
- **B. 문의제로 정책 변경**: 1Hour·1Pro `bookingFlow` 를 b2b_quote 계열로 전환. **스키마·예약
  플로우·PRD 개정이 걸린 오너 결정** — 이 슬라이스 범위 밖.
- **추천 = A.** B 는 근거 문서가 없다(2026-07-17 결정은 단체 3종만 전환). 단, 홈 필과 디자인이
  같은 방향(문의제)을 가리키는 건 우연으로 보기 어려우므로 **Aiden 의 명시 확인 필요** —
  실제 운영 의도가 문의제라면 PRD 개정부터.

### ③ fill-in 데이터 제공 시점
- 룸 스펙 4행×2 / room↔product 매핑 / 장비 리스트 / 팀 명단·역할·bio·동의 / 실사진.
- 제공 전: D3·D4·D5 섹션 미구현(①-A/C 범위로 출시). 제공 후: 5d-3 확장. 데이터는 코드 하드코딩
  대신 어떤 저장소(DB 신규 테이블? messages? 어드민 모듈?)에 둘지도 그때 결정.

## 3. 구현 범위 (결정 ① = C 반영, 2026-08-05 구현)

**수정:** `app/[locale]/(public)/studios/page.tsx`(카탈로그 단순 이관 → 5d-2 레이아웃) ·
`messages ×5`(`studios` ns 신설: meta·hero·rooms a/b·cta — python splice) ·
`e2e/studios-page.spec.ts`(레이아웃 단언 추가). **수정 금지 유지:** `CategoryCatalog`(/group 공유,
자체 main+h1 이라 임베드 불가 → 카드 자체 렌더, 5c 선례) · nav·sitemap·리다이렉트(5d-1 그대로).

구성: 히어로(메타 스트립·h1·sub·21/9 EditorialImage) → 룸 A/B 카드(이름·용도·이미지 3슬롯,
B 는 `md:order` 교차 — 스펙 표·태그 이연) → 대여 패키지 카드(DB listPackages·formatKrw/≈·
`/packages/{slug}`) → CTA(accent 패널 → /product·/product#bookbar). 렌더 = force-dynamic,
비-ko 404 게이트는 rental 0건 notFound() 로 5d-1 과 동일.

게이트: tsc·biome·i18n:check(5로케일 `studios` ns)·vitest·build(프리렌더 수 기록, 5d-1 시점
43)·`e2e/studios-page.spec.ts`·가격 하드코딩 스캔. §11-W 알파 하한. 죽은 링크 0.

**5d-3 백로그 (fill-in 도착 후):** 룸 스펙 표·room↔product 매핑·장비 리스트·팀 섹션(동의 확인
필수)·실사진 교체·소개 페이지 전환 여부(로케일 노출·sitemap 재검토). ~~홈 INQUIRY ONLY 필 정정~~
→ **완료(2026-08-05 소슬라이스)**: `home.categories.inquiryOnly` → `koreanOnly`("한국어 전용" 계열
×5), 필 의미 = 문의제(오표기) → 한국어 전용(실제 제약).

## 4. 5d-3 — fill-in 도착·확정 (2026-08-05 Aiden 회신)

### 4-A. 접수 데이터 (발명 0 — 이대로만 게시)

| 항목 | 값 | 비고 |
|---|---|---|
| STUDIO A 스펙 | 컨트롤룸 10평 · 부스 10평 | Size 총면적·Max guests 미제공 → **행 생략**(확정: "받은 2행만 표기") |
| STUDIO B 스펙 | 컨트롤룸 6평 · 부스 6평 | 동일 |
| room↔product | STUDIO A 에서 **전 패키지** 진행 | B 의 운영 용도는 미제공 — 5d-2 카피 유지, 태그 미부여 |
| 장비 | Avid Pro Tools · Manley · Avalon · Genelec 1031 · Yamaha NS-10 | 원문 "PROTOOL·맥리·아발론·제네릭 1031·야마하 ns10" 브랜드 추정 → **Aiden 확정**. "등"의 추가 목록은 후속 제공 예정 — 상세 모델·수량 도착 시 갱신. **카테고리 5분할(디자인)은 미적용** — 접수 데이터가 무분류라 임의 분류는 발명 |
| 팀 | 프로듀서 Aiden · 보컬 디렉터 Jiseon·Yena·Lucia | 명단 = 오너 직접 제공(게시 승인으로 간주). bio·사진 미제공 → 이름·역할만. 원문 "JIseon" 은 표기 정규화(Jiseon) — 오표기 시 정정 요 |
| 실사진 | "첨부 가능" — 미첨부 | 도착 전 `EditorialImage` placeholder 유지 |

### 4-B. 확정 결정 (2026-08-05 AskUserQuestion 회신)

- **저장 위치 = DB 신규 테이블.** 단 운영 `Room` 테이블(예약·슬롯 FK)은 **불변** — 마케팅
  콘텐츠 전용 테이블(`studio_room_profiles`·`studio_equipment`·`team_members`)을 분리 신설한다.
  근거: PRD §5.3 "고객 화면에 룸 선택 미노출(자동 배정)" — 운영 룸과 소개 콘텐츠는 결합할
  이유가 없고, 운영 테이블에 B 행을 추가하면 슬롯·가용성 로직에 영향 리스크(위험 구역 인접).
  어드민 콘텐츠 관리 모듈은 후속(백로그).
- **페이지 성격 = 전 로케일 소개 페이지 전환(①-B).** `/studios` notFound 게이트 제거,
  대여 패널만 rental 노출 로케일(현 ko) 조건부. nav `localeGatedCategory` 해제, sitemap
  `STATIC_PATHS` 에 `/studios` 포함(200 불변식 충족), service·product·홈 크로스링크 게이트
  해제. 구 URL 308 은 불변(비-ko 최종 상태 404 → 200 으로 변경 — e2e 개정).
- **단위 표기:** DB 는 평(정수) 저장, 렌더는 ko "N평 (M㎡)" / 비-ko "M㎡" (1평=3.3058㎡,
  정수 반올림 — 결정적 환산이라 발명 아님).
- **팀 역할 라벨**은 messages(`studios.team.roles.*`), 이름·수치·모델명은 DB(언어 중립).

### 4-C. 5d-3 fill-in 2차 — 실사진·장비 상세 도착 (2026-08-07, `feat/studios-5d3-photos`)

- **실사진 반영**: 오너 제공 원본(A 4장·B 4장·세션 현장 1장)을 `scripts/optimize-studio-images.ts`
  (max 2400px·q82·EXIF 제거)로 최적화, 7슬롯 배치. **배치 순서 = 오너 지정(2차 지시)**:
  히어로 = 세션 현장 컷(인물 포함 — 오너 직접 제공 = 게시 승인 간주) / A = 컨트롤룸·부스·부스 2앵글 /
  B = 컨트롤룸·부스 2앵글·부스. 미사용 스페어: A CR 2앵글·B CR 2앵글(원본 폴더 보존, 미커밋).
  `EditorialImage`에 `src` 옵션 추가(placeholder 호출처 무변경, fill+비율 박스 CLS 0).
  alt 는 실제 사진 내용 기술로 갱신(슬롯 키 main/booth/desk 는 레이아웃 위치명일 뿐).
  중간 사고 1건: A/B 폴더 간 동일 파일 중복(md5 일치) → 오너 확인으로 A CR2 재업로드·해소.
- **장비 상세 반영**: 오너 리스트(카테고리 6종·모델·수량) 도착 → `quantity` 컬럼 추가
  (마이그레이션 `add_studio_equipment_quantity`, §7-B 수동 승인), 19항목 전량 교체 시드.
  오너 승인 3건: ① additive 마이그레이션 ② CORE System 'MACKIE Big Knob'(수량 빈칸) 행 =
  중복 오기로 제외 ③ 표기 공식 정규화(Protools→Pro Tools 등, 제품 사실 불변).
  카테고리 라벨 = messages `studios.equipment.categories.*`(slug 키), 렌더 = 룸 스펙 dl 과 같은
  행 패턴(220px 카테고리 레일 + 필, 행 구분선 — 오너 피드백 "정렬" 반영). 수량 ×N 은 2 이상만.
- **잔여(§4-A 유지)**: 룸 Size 총면적·Max guests, 팀 bio·프로필 사진, B 운영 용도 카피.
- **신규 ja·zh 기계번역 감수 대상**: `studios.equipment.categories.*` 6키 + alt 7키 (Aiden 몫).
