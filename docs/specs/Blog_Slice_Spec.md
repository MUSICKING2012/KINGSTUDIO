# Blog 슬라이스 스펙 v1 (2026-08-05) — 시퀀스 5e

> 실측 소스: `design/pages/Blog.dc.html` (sha256 `203d1a9cc100362f0a241cefa63ab058a7de76eb899a692298bed6ae50f87265`, 15,796 bytes) +
> `design/pages/Blog Post.dc.html` (sha256 `696089212babc8b737f24b3cdb0a7d787bab86d9d72c7990fe7af087037fa3fd`, 17,573 bytes).
> 취득: DesignSync get_file(로컬 다산 세션 — 메인 세션 직접 호출, 5c 실측 규칙).
> **선행 결정 ③ 확정(2026-08-05 Aiden): Blog = 자체 운영, Ghost 배제** — Pages_Sequence_Spec §7-③의
> A(이연)/B(외부 링크)/C(Ghost API) 어느 것도 아닌 신규 D안. 사이트 내 자체 블로그.

## 0. 실측 요약

**Blog.dc.html (목록 = /blog):**
1. Hero — 메타 스트립 `BLOG · NOTES FROM THE STUDIO · SEOUL`, h1 "Journal".
2. 카테고리 탭 — All / Story / Press / Behind / Seoul travel (클라이언트 필터, 선택=잉크 채움).
3. Featured — 다크(#111010) 대형 카드, `all` 탭에서만. feat 플래그 글 1건.
4. 포스트 그리드 — white 카드(16/10 커버·cat·read·title·excerpt·date), 6개/페이지 Load more.
5. 뉴스레터 — accent 패널, Mailchimp 임베드 전제(디자인 주석 "set form action to your
   embedded-form URL (fill-in)"), 이메일 입력 + 수신 동의 체크 + privacy policy 링크(#reach 데모).
6. 푸터/nav = 디자인 데모(이식 0). nav BLOG 탭 활성 표시.

**Blog Post.dc.html (상세 = /blog/[slug]):**
1. per-post SEO — title/description/canonical/OG/twitter + JSON-LD `@graph`(BlogPosting +
   Organization + BreadcrumbList). 주석: "Audited exclusions kept: NO Review, AggregateRating,
   FAQPage, or HowTo"(king-studio-blog-schema 감사 정책 계승).
2. 브레드크럼(Blog / {cat}) → 헤더(cat·date·read) → h1 → 저자 배지(KING STUDIO) → 16/8 커버.
3. 본문(720px) — p·h2·blockquote(accent 보더)·중간 다크 CTA 패널(Book a session → Product#book).
4. Related stories 3카드(동일 cat 우선) → END CTA(다크) → 뉴스레터(목록과 동일).

디자인 자체 선언(스크립트 주석): 글 9건은 **"PLACEHOLDER samples pending the Ghost export
migration + 301 redirect map"** — 샘플이며, 카피는 정정된 제품 모델 준수(사진 촬영 언급 없음,
Gold ≠ 믹스, Diamond = 믹스/마스터+CD, Premium = 스튜디오 MV).

## 1. 디자인 대비 델타 (판정)

| # | 디자인 | 판정 | 근거 |
|---|---|---|---|
| D1 | 글 데이터 = 인라인 placeholder 9건(Ghost 이관 대기 주석) | **이식 금지 — 발명 0** | 고객 스토리(Mia·Daniel·학교 단체)는 실존 미확인 인물·사례. 실제 글은 Aiden 제공/작성만 게시. NYT Press 글만 사실 검증됨(F8 확정 원문·URL 레포 실존 `NYT_URL`) |
| D2 | Ghost export 이관 + 301 redirect map 전제 | **OPEN ⓐ** | 기존 Ghost 운영 글의 이관 여부·수량·URL 구조는 Aiden만 아는 사실 |
| D3 | 뉴스레터 = Mailchimp 임베드 | **OPEN ⓓ — 이연 추천** | §1 스택 잠금에 Mailchimp 없음(이메일 = Resend 트랜잭션). 마케팅 수신 동의 수집은 동의 기록·개인정보 정책(법무 M5 트랙) 결합 — 무단 도입 금지 |
| D4 | 글 저장소·작성 경로 미정(디자인은 "CMS record" 언급만) | **OPEN ⓑ** | 어드민 콘텐츠 모듈 미구현. DB/MDX/어드민 중 결정 필요 |
| D5 | 영어 단일 카피 | **OPEN ⓒ** | 블로그 글의 로케일 정책(en 단일? 글별 언어?) — next-intl 서브경로와의 관계 |
| D6 | per-post SEO/JSON-LD(BlogPosting·Breadcrumb, 감사 제외 유지) | **채택** | 2b SEO 인프라(JSON-LD·canonical·hreflang) 패턴 재사용. 감사 정책(No Review/AggregateRating/FAQPage/HowTo) 준수 |
| D7 | 커버 이미지 슬롯(목록 16/10·상세 16/8) | 실사진 pre-flight 미해소 — `EditorialImage` placeholder(4b 패턴) | 홈·5d 동일 |
| D8 | 소형 텍스트 알파 `.4/.45/.5/.6/.68` | 라이트 `/70`·다크 `/65` 상향 | §11-W |
| D9 | CTA → `Product.dc.html#book` | `/product`·`/product#bookbar`(5a·5d CTA 패턴) | 기존 라우트 정본 |
| D10 | 카테고리 4종(Story·Press·Behind·Seoul travel) | 채택(초기 세트) — 글 데이터의 속성으로 저장, 하드코딩 탭 금지 | 데이터 주도 원칙(§4-C 계열) |

## 2. OPEN DECISION — **전건 확정 (2026-08-05 Aiden 회신)**

- **ⓐ = 기존 글 있음, 이관 필요.** Ghost export(JSON/마크다운) 제공 대기 → 이관 + 구 URL 301
  맵은 **5e-2**(export 도착 후). 그 전까지 nav BLOG 탭 비활성 유지 + sitemap 미포함(빈 목록
  페이지를 링크·색인하지 않는다 — 5d-2 "빈 페이지 회피" 계열).
- **ⓑ = DB `BlogPost` 테이블 + 스크립트 게시.** 게시 파이프라인 = `content/blog/*.md`
  (frontmatter) → `pnpm seed:blog` upsert. 어드민 에디터는 후속 모듈.
- **ⓒ = en 단일.** 글 본문·제목 en 고정, UI 크롬만 5로케일(`blog` ns). 전 로케일 동일 본문.
- **ⓓ = 뉴스레터 이연.** 섹션 미구현(Mailchimp §1 스택 변경 + 수신 동의 법무 M5 이후 별도 결정).

**분할:** 5e-1(이 슬라이스) = 모델·게시 파이프라인·/blog·/blog/[slug]·JSON-LD·e2e — nav 탭은
비활성 유지. 5e-2(export 도착 후) = 이관·301 맵·nav 탭 켬·sitemap 포함.

### (기록용 — 확정 전 선택지)

### ⓐ 기존 Ghost 글 이관
- 기존 Ghost 블로그에 발행 글이 있는가? 있다면: export(JSON/마크다운) 제공 → 이관 + 구 URL 301 맵.
  없다면: 빈 상태로 시작(신규 글부터).

### ⓑ 글 저장소·작성 경로
- **A. DB `BlogPost` 테이블 + 시드/스크립트 게시(추천)**: 어드민 편집 화면은 후속(어드민 콘텐츠
  모듈). 게시는 당분간 마크다운 → 스크립트 변환(개발 플로우). 5d-3 DB 패턴과 정합.
- **B. 레포 MDX 파일**: 커밋 = 게시. 어드민 불필요·최속이나 비개발 편집 불가, DB 이관 2중 작업.
- **C. DB + 간이 어드민 에디터 동시 구축**: 완결적이나 슬라이스가 커지고 어드민 인증·RBAC·
  재인증 결합 — MVP 범위 재검토 필요(§7-8).

### ⓒ 로케일 정책
- **A. en 단일(추천)**: 글은 영어로 작성(주 타겟 = 외국인 관광객, king-studio-blog 계열 정책).
  전 로케일에서 동일 en 본문 노출(목록 UI 크롬만 5로케일). hreflang 처리 주의.
- **B. 글별 언어 필드**: 글마다 language 저장, 로케일별 필터 노출. ko 글도 가능하나 복잡도 상승.

### ⓓ 뉴스레터 섹션
- **A. 이연(추천)**: 섹션 미구현. Mailchimp 도입(§1 스택 변경)과 마케팅 수신 동의(법무)는
  별도 오너 결정 + M5 법무 트랙 이후.
- **B. 지금 도입**: Mailchimp 계정·임베드 URL·개인정보 고지 문구 필요 — 스택 변경 승인 필수.

## 3. 구현 범위 — 5e-1 확정 (2026-08-05 구현, PR #40)

**5e-1 구성:** `/blog`(목록 — 데이터 주도 카테고리 탭·featured·서버 페이지네이션) +
`/blog/[slug]`(상세 — markdown 본문·related·CTA) + per-post JSON-LD(BlogPosting·Breadcrumb) +
`BlogPost` 모델(category CHECK) + `pnpm seed:blog` 게시 파이프라인 + 초기 글 1건(NYT 보도, F8
검증분). **nav BLOG 탭 활성·sitemap 편입은 5e-1 범위 밖 — §2-ⓐ대로 5e-2 전속**(e2e 가 비활성
탭·sitemap 미포함을 단언해 조기 활성화를 회귀로 잡는다).
게이트: tsc·biome·i18n:check·vitest·build·e2e(blog spec 신설)·가격 하드코딩 스캔·§11-W
(소형 카테고리 라벨 = 중립 토큰, accent 텍스트 금지 — PR #40 리뷰 반영).

**5e-2 (Ghost export 도착 후):** 이관 + 구 URL 301 맵 + nav 탭 켬 + sitemap 편입(목록 + 글별 URL,
W4 불변식 계열).

**미구현(결정과 무관하게 이연):** 뉴스레터(ⓓ), 커버 실사진, 댓글·검색 (전부 백로그).
