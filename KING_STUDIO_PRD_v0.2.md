# KING STUDIO — K-POP Recording Experience 예약 플랫폼

## Product Requirements Document (PRD) v0.2

| 항목 | 내용 |
|---|---|
| 문서 버전 | v0.2 (통합·정합 검증본) |
| 작성일 | 2026-05-16 |
| Owner | Aiden (뮤직킹 프로듀서) |
| 상태 | 전 장(1–10) Lock 완료 |
| 다음 개정 | v0.3 — MVP 출시 +3개월 baseline 데이터 반영 예정 |

> **이 문서에 대하여**
> 본 문서는 v0.1·v0.2 단계의 다회 논의에서 합의된 모든 결정을 단일 문서로 통합하고, 장 간 교차 참조 충돌 13건(C1–C13)을 정정한 정합 검증본이다. "완결"은 설계 합의가 끝났음을 의미하며, 개발 착수 전 가격 모델링(미해결 이슈 O3) 완료가 선행되어야 한다.

---

## 정합 검증 정정 이력 (v0.1 → v0.2)

다회 논의 과정에서 후속 결정이 선행 결정을 덮은 9개 지점을 최신 확정값으로 통일하였다.

| # | 정정 대상 | 정정 후 확정값 |
|---|---|---|
| C1 | SMS·알림톡 도구 | 솔라피(Coolsms) — 7장 초기 "NHN Toast" 폐기 |
| C2 | 보안 WAF | Cloudflare Free 기본 보호 + Upstash Ratelimit + Next.js Middleware 자체 검증 — "Cloudflare Pro WAF" 폐기 |
| C3 | 트랜스코딩 엔진 | Lambda FFmpeg(음원) + Lambda Sharp(사진), Premium MV는 외부팀 사양 납품 + 어드민 수동 업로드 — "AWS MediaConvert" 폐기 |
| C4 | ORM | Prisma + Prisma Migrate — 7장 초기 "Drizzle" 추천 폐기 |
| C5 | 발신 이메일 | join@kingstudio.co.kr (발신 표시명 "KING STUDIO" 전부 대문자 고정) — "studio@" 안 폐기 |
| C6 | 매직링크·보관 기간 | 매직링크 60일 / 파일 보관 게스트 3개월·회원 12개월 — 초기 "30일·6개월·24개월" 폐기 |
| C7 | v1.1 일정 | v1.1 5개월(2027-04-01~08-31), v1.2 ~2027-12-31 — 초기 "+2개월" 폐기 |
| C8 | 패키지 명칭 | Gold (구 Personal Vocal) — 명칭 3회 변경 후 최종 확정 |
| C9 | Premium MV 처리 | 트랜스코딩만 수동(외부팀 납품·어드민 업로드, 후속 처리는 전부 자동) — "MV 자동화" 폐기 |
| C10 | 체험 2인 과금 | 2인 = 1인 정가 × 1.5 (50% 추가, 총액 표기) — 구 "2인 1인당 반값" 폐기 (v0.2 가격 모델링 후 확정) |
| C11 | 단체 과금·인원 | 단체 3종 인원당 정액 과금(인원 × 정액), 꿈길 최대 20→15명, 노출 분리(다국어=Making Class만 / 한국어=꿈길·워크샵) |
| C12 | 인증 아키텍처 | Auth.js 하이브리드 — OAuth는 표준 어댑터(Account·VerificationToken), 세션은 커스텀 user_sessions. user_social_connections → 표준 Account 대체 (v0.2 Stage 1 확정) |
| C13 | 인프라 전환 | AWS+Vercel → 단일 GCP(Cloud Run·Cloud SQL·Cloud Storage·Cloud CDN). 사유=장기 비용·단일 클라우드. Redis만 Upstash 유지, Cloudflare 유지. 운영비 GCP 실측 후 재산정 (v0.2) |

---

# 1. 배경 (Background)

KING STUDIO는 2017년부터 외국인 관광객을 대상으로 K-POP 녹음 체험을 운영해 온 D2C 스튜디오로, KLOOK·KKday·Airbnb Experience를 통해 누적 운영 이력을 보유하며 2024년 11월 The New York Times에 단독 보도되었다(K-pop recording sessions in Seoul, NYT 2024-11-29).

서울을 방문하는 외국인 관광객 중 K-POP 관련 체험 수요는 명동·홍대 일대에서 지속 증가하고 있으나, 대부분의 K-POP 체험 상품은 (a) 안무·메이크업 위주이고, (b) 예약이 OTA(Online Travel Agency)에 종속되어 마진과 고객 데이터를 빼앗긴다. KING STUDIO는 "실제 녹음실에서 K-POP 보컬을 녹음하고, 본인 음원과 사진을 가져간다"는 차별화된 경험을 직접 운영하는 D2C 채널로 판매한다.

OTA 채널 의존이 심화되면서 (a) 저가 경쟁 노출로 객단가 하락, (b) 고객 데이터 미보유, (c) 재방문·CRM 불가 문제가 누적되었다. 동시에 ChatGPT·Perplexity 등 LLM 채널을 통한 직접 예약 문의가 빠르게 증가하고 있어, 자체 D2C 예약 사이트의 ROI가 어느 때보다 높다.

**기존 채널 레퍼런스**

| 채널 | 링크 |
|---|---|
| KLOOK | klook.com/activity/3252-king-studio-kpop-recording-experience-seoul |
| KKday | kkday.com/en/product/11154-seoul-king-studio-music-recording-album-creation-experience |
| NYT 보도 | nytimes.com/2024/11/29/fashion/k-pop-recording-sessions-seoul.html |

---

# 2. 12개월 목표 (Goals)

출시 후 12개월 시점의 목표는 다음과 같다. N2·N3·N7은 출시 후 3개월 baseline 측정 기간을 거쳐 v0.3에서 목표값을 재확정한다(미해결 이슈 O1 참조).

| 목표 | 지표 |
|---|---|
| 자체 채널 예약 비중 | ≥ 60% |
| 방문→결제 전환율 | 잠정 ≥ 4% (v0.3 재확정) |
| NPS | ≥ 60 |
| 다운로드 페이지 도달률 | ≥ 95% |
| 평균 객단가(AOV) | 잠정 OTA 대비 130%+ (v0.3 재확정) |
| 재방문·추천 예약 비중 | 잠정 ≥ 15% (v0.3 재확정) |

---

# 3. 타겟 사용자 (Target Users)

타겟별 결제 주체·언어·결제수단·동의 요건이 다르므로, 시스템은 "예약자 ≠ 이용자"를 1급 객체(first-class object)로 분리하여 모델링한다.

**1차 타겟** — 20~50세 K-POP 팬, 서울 단기 체류(2~5일) 외국인 관광객. 대상 국가: 미국, 싱가포르, 홍콩, 호주, 대만, 캐나다, 독일, 프랑스, 영국, 일본.

**2차 타겟** — 7~19세 K-POP 팬을 동반한 외국인 가족 관광객. 부모가 결제 주체, 미성년자가 이용 주체. (만 16세 미만 보호자 동의 필수 — 5.7 참조)

**3차 타겟** — 한국 내 B2C(커플 프로포즈, 친구 그룹) 및 B2B(꿈길·강남중 진로체험, 기업 워크샵). 결제 주체(학교/교육청/기업)와 이용 주체(학생/직원)가 분리되므로 별도 B2B 견적·인보이스 흐름을 적용한다.

---

# 4. 핵심 사용자 시나리오 (Core Scenarios)

**시나리오 A — 외국인 개인** (예: 도쿄 24세 여성)
인스타그램 광고 → 모바일 사이트 진입 → 일본어 자동 감지 → 패키지 선택 → 날짜·시간·룸 슬롯 선택 → 곡 선택 → 예약자 정보·동의 입력 → PayPal 결제(KRW 청구) → 예약 확인 메일 → 방문·녹음 → 24~72시간 내 매직링크 → 음원·사진 다운로드 → 후기 작성 → (선택) 수정본 매직링크 추가 발송.

**시나리오 B — 외국인 가족** (부모 결제 + 미성년 자녀 이용)
시나리오 A와 동일한 흐름에 결제자/이용자 분리 입력 + 보호자 디지털 동의 서명이 추가된다. 이용자 중 만 16세 미만이 1명이라도 포함되면 보호자 동의 섹션이 자동 노출되고, 미완료 시 결제가 차단된다.

**시나리오 C — B2B 단체** (학교/기업)
단체 문의 폼 → 어드민 견적서(PDF) 발행 → 학교·기업 측 일괄 동의서 송부 → 인보이스 결제(계좌이체 또는 카드결제 링크) → 참가자 명단 CSV 업로드 → 단체 대표 매직링크 + 개별 매직링크 동시 발급.
---

# 5. 기능 요구사항 (Functional Requirements)

## 5.1 다국어 (i18n)

런칭 시점 5개 언어를 모두 지원한다: 한국어, 영어, 일본어, 중국어 간체, 중국어 번체.

| 항목 | 사양 |
|---|---|
| 언어 감지 | 브라우저 언어·IP 기반 자동 감지 + 수동 전환 |
| URL 구조 | 서브경로 방식 — /ko, /en, /ja, /zh-Hans, /zh-Hant |
| 통화 표시 | KRW 메인 표시 + 외화(JPY/USD/EUR 등) 참고 환산 병기 |
| SEO | hreflang 5개 언어 + x-default 매핑 |
| 번역 관리 | 카피 단위 CMS(어드민 직접 수정) + GitHub 번역 파일 관리 |

번역 파일은 5개 언어 × 약 250개 키 규모로 자체 관리한다. 누락 키 검증 CI 스크립트를 추가한다.

## 5.2 패키지 & 가격

### 상품 카테고리 구조

상품은 성격이 다른 3개 카테고리로 분리하며, 카테고리는 IA(5.4)에서 별도 진입점으로 노출된다.

**① K-POP 체험 카테고리** (전 언어 노출)

| 항목 | Gold | Diamond | Premium |
|---|---|---|---|
| 컨셉 | K-POP 보컬 트레이닝 입문 | 본격 K-POP 녹음 체험 | 녹음 + 뮤직비디오 풀패키지 |
| 가격 (1인) | 400,000 KRW | 500,000 KRW | 1,500,000 KRW |
| 가격 (2인, 총액) | 600,000 KRW | 750,000 KRW | 2,250,000 KRW |
| 소요 시간 | 2시간 | 2시간 | 3시간 |
| 인원 | 1~2명 | 1~5명 | 1~5명 |
| 곡 선택 | 입문자 큐레이션(20~30곡) | 전체 카탈로그 자유 선택 | 전체 카탈로그 + MV용 곡 추천 |
| 녹음 분량 | 1절 + 후렴 (~2분 완결 편집) | 풀 곡 | 풀 곡 |
| 1:1 보컬 코칭 | 집중 트레이닝 포함 | 기본 디렉팅 | 기본 디렉팅 |
| 후반 믹싱/마스터링 | 간이 믹스 (1절+후렴) | 정식 (풀곡) | 정식 (풀곡) |
| 사진 (무보정) | 30컷 내외 | 30컷 내외 | 30컷 내외 |
| 보정본 | 미포함 | 미포함 | 미포함 |
| 뮤직비디오 | — | — | 포함 (외부 전문팀) |
| 헤어/메이크업 | 미포함 | 미포함 | 미포함 |
| 통역·외국어 | 지원 | 지원 | 지원 |

> **Gold 명칭 주석 (C8)**: Gold는 구 "Personal Vocal"이 통합·개명된 패키지다. 기존 "Personal Vocal" URL은 /packages/gold로 301 리다이렉트한다.

> **2인 과금 정책 (C10 정정)**: 체험 패키지(Gold·Diamond·Premium)는 2인 예약 시 1인 정가에 **50%를 추가**한다(2인 총액 = 1인 정가 × 1.5). 예: Diamond 1인 500,000 → 2인 총액 750,000. 인건비(엔지니어·디렉터·통역)는 2인을 1팀이 함께 진행하므로 매출 1.5배 대비 원가 증분이 작아 2인 예약의 마진율이 1인보다 높다. 3인 이상 정책은 추후 확정(현재 모델은 1·2인 기준). 구 정책 "2인 1인당 반값(Diamond 250,000/인)"은 폐기.

**② 스튜디오 대여 카테고리** (한국어 사이트 전용)

| 항목 | 1Hour | 1Pro |
|---|---|---|
| 가격 (1인) | 100,000 KRW | 300,000 KRW |
| 소요 시간 | 1시간 | 3시간 30분 |
| 컨셉 | 스튜디오 시간 대여 + 엔지니어 | 동일, 본격 녹음용 |
| 곡 선택 | 고객 본인 MR 지참 | 고객 본인 MR 지참 |
| 디렉팅 | 미포함 | 미포함 |
| 믹싱/마스터링 | 미포함 (raw 파일만) | 미포함 (raw 파일만) |
| 사진 | 미포함 | 미포함 |
| 통역·외국어 | 미지원 (한국어 전용) | 미지원 (한국어 전용) |
| 결제 전 필수 동의 | 한국어 의사소통 가능 확인 | 한국어 의사소통 가능 확인 |

1Hour·1Pro는 외국어(영·일·중간·중번) 사이트에 완전 미노출된다.

**③ 단체 카테고리**

| 항목 | K-Pop Making Class | 꿈길 | 워크샵 |
|---|---|---|---|
| 노출 | 전 언어 | 한국어 전용 | 한국어 전용 |
| 가격 (1인당 정액) | 150,000 KRW | 30,000 KRW | 50,000 KRW |
| 과금 방식 | 인원 × 정액 | 인원 × 정액 | 인원 × 정액 |
| 소요 시간 | 2시간 | 2시간 | 2시간 |
| 인원 | 2~15명 | 10~15명 | 5~15명 |
| 처리 흐름 | 일반 결제 | B2B 견적·인보이스 | B2B 견적·인보이스 |

> **단체 과금·노출 정책 (C11 정정)**: 단체 3종은 순수 인원당 정액 과금이다(총액 = 1인당 정액 × 참가 인원). 인건비는 회당 1팀 고정이므로 참가 인원이 많을수록 마진율이 상승한다. 노출은 분리된다 — 다국어(영·일·중간·중번) 사이트에는 **K-Pop Making Class만**, 한국어 사이트에는 **꿈길·워크샵만** 노출한다(K-Pop Making Class는 전 언어 노출이므로 한국어 사이트에도 표시). 꿈길 최대 인원은 20명에서 15명으로 정정.

**Premium 상품 페이지 필수 콘텐츠** — 샘플 MV 2편 이상 임베드, MV 제작팀 크레딧·포트폴리오 링크, MV 사양 명세서(길이·해상도·편집 기간·후반작업), Diamond 대비 결과물 비교.

**KPI 게이트** — Gold의 Diamond 대비 판매 비율을 어드민 대시보드에서 추적한다. 출시 후 3개월 시점 10% 미만이면 가격·포지셔닝을 재검토한다(8.5 게이트 참조).

### 사진 정책

| 항목 | 정책 |
|---|---|
| 기본 제공 | 무보정 30컷 내외, 매직링크 자동 제공, 조건 없음 |
| 보정본 | 기본 패키지 미포함 |
| 추가 보정 옵션 | 다운로드 페이지에서 컷당 옵션 구매 — v1.2 이후 도입, MVP 제외 |

## 5.3 예약·슬롯 엔진

### 영업시간 및 슬롯 구조

매일 10:00~22:00 (KST), 요일별 차이 없음. 휴무일은 어드민에서 개별 지정한다.

| 패키지 | 슬롯 단위 | 슬롯 |
|---|---|---|
| Gold | 2시간 / 6슬롯 | 10–12, 12–14, 14–16, 16–18, 18–20, 20–22 |
| Diamond | 2시간 / 6슬롯 | 10–12, 12–14, 14–16, 16–18, 18–20, 20–22 |
| Premium | 3시간 / 3슬롯 (고정) | 10–13, 14–17, 18–21 |
| 1Hour (한국어 전용) | 1시간 / 5슬롯 | 10–11, 12–13, 14–15, 16–17, 18–19 |
| 1Pro (한국어 전용) | 3.5시간 / 3슬롯 | 10–13:30, 14–17:30, 18–21:30 |

**버퍼**: 0분. 슬롯 간 즉시 전환하며, 운영 SOP("직전 팀 종료 10분 전 마무리 안내 + 다음 팀 입장 후 5분 내 룸 정리")로 흡수한다.

**룸 구조**: 물리적으로 STUDIO A·STUDIO B 2개 존재. 런칭 시점 STUDIO A만 운영. 데이터 모델·UI·슬롯 가용성 계산 로직은 처음부터 멀티룸 전제로 설계하며, 어드민의 "STUDIO B 활성화" 토글만으로 즉시 2룸 운영 전환이 가능하다. 고객 화면에는 룸 선택 UI를 노출하지 않으며(시스템 자동 배정), 어드민에서는 룸별 뷰를 항상 노출한다.

**패키지 간 충돌 처리**: 같은 룸·같은 날의 시간 점유 매트릭스로 계산한다. Premium(3시간)·1Pro(3.5시간) 예약은 해당 시간대와 겹치는 모든 Gold/Diamond/1Hour 슬롯을 자동 마감한다. 한국어 사이트와 외국어 사이트는 분리 표시되지만, 동일 룸의 시간 점유는 통합 관리된다.

**예약 흐름 (4단계)**: Step 1 상품 선택 → Step 2 날짜·시간 선택 → Step 3 옵션 입력(곡·인원·예약자 정보·동의) → Step 4 결제. 각 단계는 별도 페이지(모바일 풀스크린)이며, 진행률 표시 바를 상단 고정하고 입력값은 sessionStorage에 임시 저장한다. D+1부터 D+90까지 예약 가능, 표시 시간대는 KST 고정.

**동시성 처리**: 결제 시도 시 Redis 분산락으로 해당 슬롯을 15분 임시 홀드한다(키: `slot_lock:{room_id}:{date}:{start_time}`, TTL 900초). 결제 성공 시 슬롯 확정, 실패·이탈·타임아웃 시 락 자동 만료.

### 어드민 슬롯 관리 — 3가지 차단 모드

(1) **슬롯 단위 차단** — 특정 날짜·시간·룸의 단일 슬롯 마감. (2) **종일 차단** — 특정 날짜 전체 마감(내부 행사 등). (3) **휴무일 설정** — 반복 패턴(매주 X요일·매월 X일·공휴일 일괄) 또는 기간 지정.

모든 차단은 사유 필수(내부 사용·점검·휴무·외부 채널 예약·기타)이며 어드민 로그에 자동 기록된다.

**외부 채널 예약 수기 등록** — KLOOK·KKday·Airbnb·전화·DM 등에서 들어온 예약을 어드민에서 등록하면 자체 사이트의 해당 슬롯이 즉시 마감되고, 매출 대시보드에 채널별로 분리 집계된다. CSV 일괄 업로드를 지원한다(컬럼: date, start_time, package, headcount, customer_name, channel, external_id, email, song, memo).

### 환불 정책 (3구간 분리)

**A. 고객 변심 취소**

| 시점 | 환불율 | PG 수수료 |
|---|---|---|
| 4일 전 이상 / 3일 전 | 100% | 공제 |
| 2일 전 | 80% | 공제 |
| 1일 전 | 50% | 공제 |
| 당일·노쇼 | 0% | — |

**B. 사업자 귀책 취소** (장비 고장·엔지니어 부재·룸 사용 불가·화재·누수 등) — 100% 환불, PG 수수료 공제 없음(사업자 흡수). 또는 고객 선택 시 무료 일정 변경 + 보상(다음 예약 10% 할인 쿠폰).

**C. 천재지변·국가 비상사태** — 100% 환불 또는 무기한 일정 변경(고객 선택), PG 수수료 공제 없음. 증빙 자료(항공편 결항 확인서 등) 요청 가능, 케이스별 어드민 판단.

PG 수수료 공제 여부는 결제 직전 약관 동의 화면에 명시한다. 어드민에서 정책 수정이 가능하되, 결제 시점의 정책을 예약 레코드에 스냅샷으로 저장하여 소급 적용을 방지한다. 다운로드가 1회 이상 발생한 예약은 환불 최대 50%로 제한한다(사업자 귀책·천재지변 제외).

### 데이터 모델 (요약)

```
bookings
├─ id
├─ source         enum: 'website' | 'klook' | 'kkday' | 'airbnb' | 'manual' | 'phone'
├─ status         enum: 'pending' | 'paid' | 'confirmed' | 'cancelled' | 'completed'
├─ package_id, room_id, engineer_id (nullable)
├─ date, start_time, end_time (자동 계산)
├─ headcount, customer_*, song_id (nullable)
├─ payment_*, external_ref, created_by

blackouts
├─ id, date_start, date_end
├─ time_start (nullable=종일), time_end
├─ reason, recurring_rule (RRULE), room_id (nullable=전 룸)
├─ scope  enum: 'slot' | 'full_day' | 'recurring'

rooms
├─ id, name ('STUDIO A' | 'STUDIO B')
├─ is_active (false면 슬롯 계산 제외), display_order
```

## 5.4 사이트 정보 구조 (IA)

홈 페이지 상단에 카테고리별 진입 CTA를 분리 배치한다.

```
한국어 사이트
├─ K-POP 체험 (Experience)  → Gold / Diamond / Premium
├─ 스튜디오 대여 (Rental)    → 1Hour / 1Pro
├─ 단체 프로그램            → K-Pop Making Class / 꿈길 / 워크샵
├─ About / NYT
├─ FAQ
└─ 문의

외국어 사이트 (영·일·중간·중번)
├─ K-POP Experience  → Gold / Diamond / Premium
├─ Group Programs    → K-Pop Making Class
├─ About / NYT
├─ FAQ
└─ Contact
```

체험·대여·단체 카탈로그는 완전히 분리된 진입점으로 운영하며, 검색·필터·정렬도 카테고리 단위로 격리한다. 패키지의 `languages_available` 필드(예: `['ko']` 또는 `['ko','en','ja','zh-Hans','zh-Hant']`)로 언어별 사이트 카탈로그 노출을 자동 필터링한다. 1Hour·1Pro·꿈길·워크샵은 `['ko']`만 가지므로 외국어 사이트 빌드 시 자동 제외된다.

### 공개 페이지 목록 (최소 화면 정의)

홈 / 패키지 상세(패키지별) / 곡 카탈로그 + 미리듣기 / 예약(슬롯 캘린더) / 체크아웃 / 예약 확인·마이 예약 / 다운로드 페이지(매직링크) + 후기 / About·NYT·미디어 키트 / FAQ / 단체·B2B 문의 / 약관·개인정보·환불정책 / 로그인·회원가입 / 어드민(별도 도메인). 공개 페이지는 약 11~13개로 자연 산출된다.
## 5.5 결제 흐름

### 결제 수단 구조

모든 언어 사이트에서 결제 직전 두 옵션을 노출한다.

| 결제 수단 | 처리 PG | 지원 결제 방식 |
|---|---|---|
| 한국 결제 | KG이니시스 | 국내 신용/체크카드, 네이버페이, 카카오페이, 계좌이체, 휴대폰 결제 |
| 해외 결제 | PayPal | PayPal 계정, 게스트 카드 결제(Visa/Master/Amex/JCB) |

언어별 기본 선택값: 한국어 사이트 → KG이니시스, 영·일·중 사이트 → PayPal. 고객이 토글로 변경 가능하다.

### 통화 정책 — KRW 단일

모든 사이트에서 KRW 가격이 메인으로 표시되며, 외화는 참고용 환산으로 괄호 병기한다(예: `₩500,000 (≈ ¥56,800 / ≈ $370 / ≈ €340)`). 환율은 일 1회 자동 갱신(OpenExchangeRates) 후 Redis 24h TTL 캐시 + DB 백업한다. 모든 표시 통화에 "approximate / 참고용" 라벨을 강제한다. 전 채널 KRW 단일 청구이며, KG이니시스·PayPal 모두 KRW로 정산하여 환전 수수료가 발생하지 않는다. 고객 카드사의 자국 통화 환산은 카드사 환율에 따르며 사이트 책임 범위 밖임을 결제 직전 약관에 명시한다.

### 결제 직전 동의 화면

필수 체크박스: 결제 약관(KRW 청구·카드사 환율 차이·PG 수수료 공제 명시), 환불 규정, 본인 음원의 SNS·개인 사용, 한국어 의사소통 가능 확인(1Hour·1Pro 한정), 만 16세 미만 동반 시 보호자 동의. 선택 체크박스: 스튜디오 마케팅용 사진/영상 사용. 모든 체크박스에 타임스탬프·IP·UA를 자동 저장하고 PDF export가 가능하다.

### PG 수수료 (환불 계산 기준)

KG이니시스 약 3.0%, PayPal 약 4.4% + ₩560. 결제 직전 약관에 정확 수치를 명시한다.

### 결제 진행 중 슬롯 락

결제 페이지 진입 시 Redis에 슬롯 15분 임시 락(TTL 900초). 결제 성공 시 락 해제 + DB 예약 확정, 실패·이탈·타임아웃 시 락 자동 만료. 동일 슬롯에 락이 이미 존재하면 다른 고객은 결제 페이지 진입 불가, "잠시 후 다시 시도" 안내.

### 영수증·세금 처리

결제 성공 시 PDF 영수증 자동 이메일 발송(다국어). KG이니시스 결제 건은 현금영수증 발급 옵션 및 세금계산서 발급(B2B), PayPal 결제 건은 영문 Invoice PDF(Tax included). 회계 정산용 데이터는 어드민 매출 대시보드에서 월별·채널별·통화별 export.

### PayPal 분쟁 대응 (Dispute Evidence Pack)

PayPal 분쟁 발생 시 즉시 export 가능한 데이터 패키지를 자동 생성한다: 예약 정보, 고객 정보·동의 타임스탬프·IP·UA, 약관 동의 기록, 체크인 기록, 엔지니어 업로드 시각·파일 리스트, 다운로드 로그, 후기 작성 기록, 이메일·SMS 발송 로그. 어드민의 "Dispute Evidence 생성" 원클릭으로 PDF를 생성하여 PayPal Resolution Center에 업로드한다. 체크인 기능: 엔지니어가 고객 도착 시 어드민에서 "체크인" 클릭 → 시각·담당자 기록.

### 데이터 모델 (요약)

```
payments
├─ id, booking_id, pg ('inicis'|'paypal'), pg_transaction_id
├─ amount_krw, pg_fee_krw
├─ display_currency, display_amount, exchange_rate_at_payment
├─ status enum: 'pending'|'paid'|'refunded'|'partial_refunded'|'failed'
├─ paid_at

refunds
├─ id, payment_id
├─ reason_category enum: 'customer_change_of_mind'|'business_fault'|'force_majeure'|'post_download'
├─ refund_amount_krw, pg_fee_deducted, admin_user_id, admin_memo, refunded_at

checkins ├─ booking_id, checked_in_at, checked_in_by, memo
download_logs ├─ booking_id, file_id, downloaded_at, ip, user_agent
dispute_evidences ├─ booking_id, generated_at, pdf_url, generated_by
```

## 5.6 콘텐츠 전달 (음원·사진·영상)

### 패키지별 전달물 매트릭스 (O2 확정)

| 항목 | Gold | Diamond | Premium | 1Hour | 1Pro | Making Class | 꿈길 | 워크샵 |
|---|---|---|---|---|---|---|---|---|
| Raw 음원 (WAV 16/44.1) | ● | ● | ● | ● | ● | △ 공유 | △ 공유 | △ 공유 |
| Raw 음원 (MP3 320k) | ● | ● | ● | ● | ● | △ 공유 | △ 공유 | △ 공유 |
| 간이 믹스 (1절+후렴 ~2분) | ● | — | — | — | — | — | — | — |
| 정식 믹스·마스터링 (풀곡) | — | ● | ● | — | — | △ 공유 | △ 공유 | △ 공유 |
| 사진 무보정 30컷 | ● | ● | ● | — | — | △ 공유 | △ 공유 | △ 공유 |
| 가로형 MV (1080p) | — | — | ● | — | — | — | — | — |
| 세로형 하이라이트 (9:16) | — | — | ● | — | — | — | — | — |

범례: ● 제공 / — 미제공 / △ 단체 공유본 1세트(단체 대표 매직링크로 제공).

**전달물 정책 주석 (O2 확정):**
- **사진은 전 체험 패키지 동일 30컷(무보정).** Gold·Diamond·Premium 간 사진 수량 차이는 없으며, 패키지 차별화는 믹싱·MV·녹음 분량으로 구현한다(사진은 공통 기본 제공물).
- **믹싱은 2단계로 구분.** Gold는 간이 믹스(1절+후렴 ~2분 완결 편집, PRD 5.2 녹음 분량과 연동), Diamond·Premium은 풀곡 정식 믹싱·마스터링. 작업량·품질이 다르므로 매트릭스에서 별도 행으로 분리한다.
- **세로형 하이라이트는 Premium 전용.** Diamond는 세로 영상을 제공하지 않는다(구 5.6 매트릭스에서 Diamond·Making Class에 부여했던 세로형 ●를 폐기 — PRD 5.2 "Diamond 뮤직비디오 —"와 정합).
- **단체 결과물은 전 단체 패키지 공유본 1세트로 통일.** Making Class·꿈길·워크샵 모두 raw 음원·정식 믹스·사진 각 1세트를 단체 대표 매직링크로 제공한다(참가자 개인별 분배는 단체 측 자율). 개인별 풀세트 제공 시 1인당 마진으로 원가를 감당할 수 없기 때문이다.
- **⚠ Making Class 공유본 리스크 (관찰 필요):** Making Class는 다국어 단체(1인당 150,000)로 외국인 참가자가 본인 음원을 개인 소장하지 못하고 팀 공유본만 받는 구조다. 1인당 단가가 꿈길·워크샵의 3~5배인데 결과물 제공 방식이 같아, 외국인 고객의 기대와 어긋날 수 있다. 출시 후 Making Class 후기·CS 문의를 모니터링하여, 불만이 누적되면 v0.3에서 "개인별 raw 음원 제공" 옵션 추가를 검토한다.

### 발송 SLA

**1차 발송 (raw 음원 + 사진)** — 세션 종료 후 24시간 이내(영업일 기준). 금요일 18시 이후·주말·공휴일 종료 세션은 다음 영업일 18시까지. 사이트 예약 화면에서 해당 시간대 슬롯 선택 시 예상 발송일 안내 문구가 자동 표시된다.

**2차 발송 (믹스·마스터·MV)**

| 항목 | SLA (달력일 기준) |
|---|---|
| Diamond 믹싱·마스터링 | 세션일 + 21일 |
| Premium 믹싱·마스터링 | 세션일 + 21일 |
| Premium MV (외부팀 납품) | 세션일 + 24일 (내부 검수 4일 버퍼) |
| Premium MV (고객 발송) | 세션일 + 28일 |
| 단체 패키지 결과물 | 세션일 + 7일 |

SLA 지연이 예상되는 시점에 어드민이 지연 안내 이메일을 발송할 수 있다. 약관에 "불가항력적 사유로 SLA가 지연될 수 있으며 그 경우 사전 안내한다"를 명시한다.

### 업로드 워크플로우 및 역할 분리

| 역할 | 권한 |
|---|---|
| 엔지니어 | raw 음원·사진 업로드 (본인 배정 세션 한정) |
| 콘텐츠 매니저 | 믹스·마스터·MV 업로드, 외부 MV팀 납품 수령·업로드 |
| 어드민 | 전 권한 + 권한 관리 |

외부 MV 제작팀에는 어드민 계정을 발급하지 않는다. 콘텐츠 매니저가 외부팀에서 납품받아 어드민에 업로드한다.

**Premium MV 처리 (C9 정정)** — Premium MV는 트랜스코딩만 수동이다. 외부 MV팀이 다음 사양으로 최종본을 납품한다: 가로 MV는 MP4 H.264 1920×1080 30fps ≤8Mbps(음성 AAC 320kbps), 세로 하이라이트는 MP4 H.264 1080×1920 30fps 30초 ≤6Mbps. 파일명 규칙은 `{booking_id}_main.mp4`, `{booking_id}_short.mp4`. 어드민 업로드 시 ffprobe로 메타데이터(해상도·코덱·길이·비트레이트)를 추출하여 자동 사양 검증하고, 미달 시 업로드 차단 + Slack #content 알림. 사양 미달 시 반려·재납품은 콘텐츠 매니저가 케이스별 수동 검토. **업로드 이후 후속 처리(S3 저장 → 매직링크 발송 → 다운로드 로그 → 후기 요청 → 만료 알림)는 모두 자동**이다.

**사진 셀렉트** — 촬영 담당이 세션 중 100~200컷을 촬영하고, 세션 종료 후 15분 이내에 30컷을 셀렉트하여 어드민에 업로드한다. 셀렉트 기준은 운영 매뉴얼에 명시한다(인물 OK, 흐림·눈 감음 제외, 동일 구도 1컷, 다양한 앵글 골고루).

### 자동 트랜스코딩 사양 (C3 정정)

음원·사진은 GCP Cloud Run Jobs에서 처리한다(Premium MV는 외부팀 납품으로 트랜스코딩 없음).

| 출력 | 사양 | 처리 |
|---|---|---|
| WAV 마스터 | 16bit 44.1kHz Stereo | Cloud Run Jobs FFmpeg (녹음 원본 24bit/48kHz → 다운컨버트) |
| MP3 | 320kbps CBR Stereo | Cloud Run Jobs FFmpeg |
| 사진 | JPG 원본 무보정, EXIF 보존 | Cloud Run Jobs Sharp (썸네일 WebP 400px 자동 생성) |

녹음 원본 24bit/48kHz는 스튜디오 내부 아카이브에 보관하고, 고객 전달용으로 16bit/44.1kHz로 다운컨버트한다.

### 매직링크 정책 (C6 정정)

| 항목 | 정책 |
|---|---|
| 매직링크 유효기간 | 60일 |
| Cloud Storage 파일 보관 | 게스트 3개월 / 회원 12개월 |
| 만료 링크 재발급 | 어드민에서 가능 (고객 CS 요청 시) |
| 만료 사전 안내 | 파일 보관 종료 30일 전 이메일 자동 발송 |

서명 URL 기반(Cloud Storage + Cloud CDN, TTL 10분, 페이지 새로고침 시 자동 갱신). 다운로드 시 IP·시각·UA·파일명 로그 기록. 동일 IP에서 비정상 다운로드 빈도(5분 내 50회) 감지 시 자동 일시 차단 + 어드민 알림.

**발송**: 1차는 이메일(필수) + SMS(선택), 2차는 이메일만. 예약 시 선택한 언어로 다국어 자동 발송. 발송 실패 시 어드민 알림 + 24시간 후 자동 재시도. 발신자 표시명은 "KING STUDIO"로 고정하며, 영수증·매직링크 메일은 제목에 용도를 명시한다(예: "KING STUDIO – Your Booking Confirmation").

### 수정본·버전 관리

같은 예약에 대해 v1, v2, v3… 버전을 관리한다. 무료 수정 1회(오디오 트랙 교체 또는 믹스 미세조정), 추가 수정은 유료 옵션(v1.2 이후 자동 결제 연동, MVP는 수기 결제 링크). 모든 버전은 다운로드 페이지에서 이력을 노출하되 최신만 다운로드 가능하며, 어드민은 전체 버전을 보관한다.

### 데이터 모델 (요약)

```
deliverables
├─ id, booking_id
├─ type enum: 'raw_wav'|'raw_mp3'|'master_wav'|'master_mp3'|'photos'|'mv_horizontal'|'highlight_vertical'
├─ version, status enum: 'pending'|'uploading'|'transcoding'|'ready'|'delivered'|'superseded'|'archived'
├─ s3_key, file_size_bytes, uploaded_by, uploaded_at, released_at
├─ supersedes_id, retention_until

magic_links ├─ token(UUID), booking_id, generated_at, expires_at(+60일), last_accessed_at, access_count, status
download_logs ├─ id, magic_link_token, deliverable_id, downloaded_at, ip, user_agent, bytes_transferred
notifications_log ├─ booking_id, type, channel('email'|'sms'), sent_at, delivered, provider_message_id
```

## 5.7 동의·라이선스 모듈

### 동의 항목 전체 구조

예약 흐름 Step 3~4에 표시하며, 묶음 동의를 금지하고 항목별 개별 체크한다.

**필수 동의** (미체크 시 결제 불가): ① 서비스 이용약관, ② 개인정보 수집·이용(수집 항목·목적·보유 기간 명시), ③ 결제 약관, ④ 결과물 사용 범위 확인("개인적·비상업적 SNS 공유는 자유롭게 가능하나 상업적 사용(광고·수익화·재판매 등)은 원곡 저작권자의 별도 라이선스가 필요하며 KING STUDIO는 이를 보장하지 않는다"), ⑤ 한국어 의사소통 가능 확인(1Hour·1Pro 한정).

**조건부 필수 동의** — 이용자 만 16세 미만 시 보호자 동의: 보호자 성명·관계·연락처·이메일 + "법정대리인으로서 동의" 체크 + IP·타임스탬프·UA 자동 기록.

**선택 동의** — 마케팅 사용 동의(채널 단위 세분화): 기본 사용(자사 웹사이트·공식 SNS·보도자료), 확장 사용(유료 디지털 광고 / 옥외광고·인쇄물 / TV·OTT·방송, 각각 별도 체크). 사용 기간 동의일로부터 3년. 마케팅 정보 수신 동의(이메일·SMS 각각).

### 미성년자 동의 흐름

Step 3에서 이용자 생년월일 입력 필수(이용자 2명 이상이면 전원 입력). 만 16세 미만이 1명이라도 포함되면 보호자 동의 섹션 자동 노출, 미완료 시 결제 차단. MVP는 입력 기반 검증(보호자 이름·관계·연락처·이메일 + 체크박스 + IP)을 적용하며, 동의 완료 후 보호자 이메일로 별도 확인 메일을 자동 발송한다. 24시간 내 보호자 이의 제기 시 자동 환불 + 동의 무효 처리.

만 16세 기준은 한국·미국(COPPA 13)·EU(GDPR 13~16)·일본(15) 중 가장 보수적인 기준으로 통일한 것이다. 한국법(14세)보다 엄격하므로 약관에 정책으로 명시한다.

### 학교 단체 분리 흐름

학교 단체(꿈길·강남중·기타 진로체험)는 일반 결제가 아닌 B2B 견적·인보이스 흐름으로 분리한다: 단체 문의 폼 → 어드민 견적서(PDF) → 학교 측 일괄 동의서 송부(학교장 직인 또는 인솔교사 서명 + 학부모 동의서 일괄) → 인보이스 결제 → 참가자 명단 CSV 업로드(학생 본인 동의 체크 포함) → 학교 대표 매직링크 + 학생 개별 매직링크 발급. KING STUDIO는 표준 동의서 템플릿을 학교에 배포한다.

### MR 라이선스 표기 (어드민 토글)

MVP에서 곡 카탈로그·다운로드 페이지의 라이선스 출처 표기 박스는 **UI에서 미노출(비활성)**한다. 증빙(한음저협 납부 영수증·함저협 계약서·음반제작자 권리 처리 증빙) 없이 표기하면 허위 표시 분쟁 위험이 있기 때문이다. 어드민의 "라이선스 표기 전역 활성화" 토글로 향후 활성화할 수 있으며, 활성화 시 곡 카탈로그·다운로드 페이지·패키지 상세·FAQ 4개 위치에 동시 노출된다. 곡별 `license_verified` 플래그가 켜진 곡만 표기되어 부분 활성이 가능하다. 단, 결과물 사용 범위 안내(개인 SNS 허용 / 상업 사용 금지)는 라이선스 출처 표기와 분리하여 동의 모듈 ④로 상시 고지한다.

1Hour·1Pro는 고객이 직접 MR을 지참하므로 라이선스 책임이 고객에게 전가된다("본인이 지참한 MR·음원의 사용권은 본인에게 있으며, 사용 과정에서 발생하는 저작권 분쟁의 책임은 본인에게 있다" 별도 체크박스).

### 동의 기록 불변성

동의 기록은 append-only 테이블로 저장한다(UPDATE/DELETE를 DB 트리거로 차단). 철회는 같은 타입의 새 row를 `consented=false`로 삽입한다. 약관 개정 시 새 버전을 발행하고 동의 시점의 약관 버전 + SHA-256 해시를 함께 저장한다. 결제 완료 시 동의서 PDF를 자동 생성하여 Cloud Storage Bucket Lock(보존 정책)으로 저장하며, 어드민·루트 사용자도 보존 기간 내 삭제할 수 없다.

### GDPR·한국 개인정보보호법 대응 (MVP 필수)

동의 항목 분리(달성), 동의 철회(마이페이지·매직링크 페이지에서 채널별 토글), 열람·이전 권리(JSON/CSV export, 요청 후 48시간 내 발송), 삭제 권리(계정 삭제 요청 → 보존 의무 데이터는 익명화 후 보관 → 30일 내 처리), EU Representative 외부 위탁(연 €300~500), 처리방침 5개 언어(EU용 GDPR·일본용 APPI·중국용 PIPL 조항 포함).

### 데이터 모델 (요약)

```
consents (append-only, UPDATE 금지)
├─ id(UUID), booking_id, user_id
├─ consent_type enum: 'tos'|'privacy'|'payment'|'usage_scope'|'korean_only'|'guardian'
│                     |'marketing_basic'|'marketing_ads'|'marketing_outdoor'|'marketing_broadcast'
│                     |'marketing_email'|'marketing_sms'|'license_self_brought'
├─ consent_version, consented, consented_at, ip, user_agent, language
├─ extra_data(JSONB), revoked_at, revocation_reason

consent_documents ├─ id, type, version, language, content_md, content_hash(SHA-256), effective_from
settings ├─ key('license_display_enabled'), value, updated_by, updated_at
songs ├─ ..., license_verified, license_evidence_s3_key, license_notes, license_verified_at
```
## 5.8 어드민 전체 구조

### 역할·권한 매트릭스

| 역할 | 권한 범위 |
|---|---|
| Super Admin (Aiden) | 전 권한 (최대 2명) |
| Manager | 환불·권한 부여·약관 발행 제외 전 권한 |
| Operator | 예약 조회·수정·블랙아웃·CS 응대 |
| Content Manager | 모든 콘텐츠 업로드·매직링크 재발급·외부 MV팀 납품 수령 |
| Engineer | 본인 배정 세션 한정: 체크인·콘텐츠 업로드·셀렉트 |
| Accountant | 매출 대시보드 조회·export·환불 처리·세금계산서 |
| Marketer | 후기·UGC·프로모션 코드·이메일·SMS 캠페인 |

한 사용자에게 다중 역할 부여가 가능하며, 권한은 OR 합산된다.

**민감 액션 (재인증 강제)** — 환불 처리, 권한 부여·회수, 계정 삭제·비활성화, 대량 데이터 export(100건 이상), 약관·처리방침 신규 버전 발행, Cloud Storage Bucket Lock 보존 기간 변경. 비밀번호 재입력 + TOTP 재확인을 강제한다.

### 어드민 보안 구조

| 항목 | 정책 |
|---|---|
| 2FA | 모든 계정 필수, TOTP (otplib) |
| 비밀번호 | 최소 12자, 영문 대소·숫자·특수문자 혼합, 90일 변경 권장 |
| 세션 만료 | 8시간 비활동 시 자동 로그아웃 |
| 동시 세션 | 최대 3개, 초과 시 가장 오래된 세션 자동 종료 |
| 미접속 비활성화 | 30일 미접속 시 자동 비활성, 재활성화는 Super Admin 승인 |
| 낯선 환경 감지 | 새 IP·디바이스·국가 로그인 시 본인에게 이메일 + 카카오 알림 |
| 의심 행동 | 5분 내 5회 이상 로그인 실패 → 30분 자동 잠금 + Super Admin 알림 |
| IP 제한 | 강제 화이트리스트 없음 (어디서든 접속 가능) |

**감사 로그 (audit_logs)** — append-only(UPDATE/DELETE 차단). 기록 대상: 로그인·로그아웃·로그인 실패, 환불 처리, 권한 변경, 동의 조회·export, 개인정보(PII) 조회, 예약 수정·삭제, 콘텐츠 업로드·다운로드, 데이터 export, 매직링크 재발급, 블랙아웃 생성, 가격 변경, 약관 발행, 민감 액션 재인증. 보관 3년 이상(전자상거래법 기준 5년 권장), PostgreSQL 월별 파티셔닝 + 월간 Cloud Storage 아카이브(Bucket Lock 보존). Super Admin은 조회만 가능.

### 어드민 IA (사이드바)

Dashboard / 예약 관리(캘린더·리스트·외부 채널 등록·블랙아웃·체크인·구글 캘린더 동기화) / 고객 관리(CRM·PII 조회·DSR) / 콘텐츠 관리(업로드 큐·매직링크·버전·곡 카탈로그 CMS·MV 납품 추적) / 결제·환불(내역·환불·Dispute Evidence·세금계산서·견적·인보이스) / 패키지·가격 / 후기·마케팅 / 매출·분석(매출 분석·고객 분석) / 법무·동의(약관 버전·동의 기록·라이선스 토글·DSR 큐) / 시스템 설정(사용자·권한·알림·감사 로그·룸 토글·영업시간·SEO/AEO/GEO).

### 어드민 확장 모듈 4종 (v0.2 추가 — §5.8-A)

PRD 5.8 기본 어드민 위에 4개 모듈을 정식 추가한다. 상세 화면·데이터 모델은 아래 5.8-A 참조.

| 모듈 | 위치 | 핵심 |
|---|---|---|
| ① SEO 입력 모듈 | 시스템 설정 > SEO/AEO/GEO | Ghost식 페이지별 SEO 편집 UI(자체 구축), Code Injection 화이트리스트 제한 |
| ② 예약 확정 자동화 | 예약 관리 (Inngest 백그라운드) | 구글 캘린더 제한적 양방향 + D-7/D-1/D+3 알림 시퀀스 |
| ③ 견적서 발행 | 결제·환불 > 견적·인보이스 | B2B 단체 견적 PDF 발행·상태 추적 |
| ④ 매출·고객 분석 | 매출·분석 | 8장 KPI 시각화(매출 분석·고객 분석 2탭, Tremor) |

### 5.8-A. 어드민 확장 모듈 상세

**① SEO 입력 모듈 (Ghost식 UI, 자체 구축)**

페이지 목록 + 편집 폼 2단 레이아웃. 로케일별 탭(5개 언어). 편집 필드: Post/Page URL(slug, 중복·예약어 검증), Excerpt, Meta title(50~60자 카운터, 미입력 시 H1 fallback), Meta description(120~158자 카운터, 미입력 시 Excerpt fallback), Canonical URL(미입력 시 자기 URL), OG 이미지, Code Injection(제한형). 실시간 미리보기(구글 검색 결과·OG 카드 형태).

**Code Injection은 화이트리스트 슬롯만 허용**(자유 HTML/JS 금지 — 6.2 XSS 방어): GA4 Measurement ID, GTM Container ID(값만 입력, 태그는 시스템 생성), 검색엔진 인증 메타태그(Google·Naver·Bing, 정해진 키만). 자유 스크립트는 Super Admin 한정 + 재인증 + audit_logs 기록 + 미리보기 필수. 일반 어드민 불가.

```
page_seo (6.3 기존 확장) ├─ ..., excerpt(추가)
seo_code_slots (신규)
├─ id, page_path(nullable=전역), slot_type('ga4'|'gtm'|'verify_google'
│  |'verify_naver'|'verify_bing'|'custom_script'), value, enabled,
│  created_by, requires_reauth(custom_script=true), updated_at
```

**② 예약 확정 자동화 (구글 캘린더 제한적 양방향 + 알림 시퀀스)**

예약 상태가 `confirmed`로 전환되는 순간 Inngest(7.2)가 자동화 체인 실행. 어드민은 예약 상세에서 각 단계 발송 현황 확인.

*구글 캘린더 — 제한적 양방향 (SSOT 보호):*
- **예약 = push만.** 우리 DB가 예약의 단일 진실 공급원(SSOT). 예약 확정 시 뮤직킹 운영 구글 캘린더에 이벤트 생성(룸·시간·고객·패키지). 구글에서 고객 예약을 수정·삭제해도 우리 DB는 불변.
- **운영 블록 = pull만.** 운영자가 구글 캘린더에 직접 넣은 외부 행사·휴무 일정을 우리 시스템이 가져와 `blackouts`(슬롯 마감)로 반영. 어드민 블랙아웃(5.3)과 동일 효과.
- 방향을 데이터 종류로 분리하여 충돌·더블부킹(R3 유형)을 원천 차단. 어드민 캘린더 UI는 FullCalendar(7.1) 기반, 구글 동기화 상태 표시.
- 고객 캘린더: 확인 메일에 .ics 첨부 + "Add to Google/Apple Calendar" 버튼(딥링크). 고객이 직접 추가(API 불요).

*알림 시퀀스 (5.9 자동 캠페인에 통합):*
- 즉시: 예약 확정 메일 + .ics + 구글 캘린더 push
- D-7: 사전 안내 메일(예약 재확인 + 연습용 MR·가사 접근 안내 — **라이선스 게이트로 기본 비활성**, 아래 참조)
- D-1: 재안내 메일(시간·위치·준비물·교통)
- D+3: 후기 작성 요청(5.9 기존 캠페인과 동일 — 중복 발송 방지 통합)

*연습용 MR·가사 사전 제공 (라이선스 게이트):*
- 방식: MP3 다운로드 + 가사 제공. **단 라이선스 미확보 상태에선 기본 비활성**(전역 `settings.mr_predelivery_enabled=false`).
- MR·가사 파일 배포는 복제·전송이 발생하므로 한음저협·함저협 등 배포 라이선스 확보(R2 해소) 전까지 활성 금지. 비활성 시 D-7 메일에서 MR·가사 섹션 자체가 숨겨짐.
- 라이선스 확보 후 Super Admin이 토글로 활성. R2 라이선스 표기 토글과 동일한 게이트 패턴.

```
booking_automations (신규)
├─ id, booking_id, gcal_admin_event_id, gcal_admin_synced_at,
│  ics_generated_at, mail_d7_sent_at, mail_d1_sent_at,
│  review_request_sent_at, mr_access_enabled
settings ├─ 'mr_predelivery_enabled'(전역 게이트, 기본 false)
gcal_pulled_blocks (신규 — pull된 운영 블록 추적)
├─ id, gcal_event_id, date, time_start, time_end, room_id(nullable),
│  synced_at, blackout_id(생성된 blackouts FK)
```

**③ 견적서 발행 (B2B)**

단체 문의(P2-09 inquiry)를 견적으로 전환. 항목: 단체 패키지(Making/꿈길/워크샵) → 인원 → 자동 금액(인원당 정액 × 인원, C11) → 할인·부가세 → 총액. 견적서 PDF(다국어, @react-pdf/renderer 7.5, 로고·사업자정보). 상태 추적: 발송 → 수락 → 인보이스 전환 → 결제 확인. 유효기간 설정·만료 자동 처리. 외국 단체는 KRW 견적 + 참고 외화. B2B 세금계산서는 팝빌 API(7.5).

```
quotes (신규)
├─ id, inquiry_id, group_type, package_id, headcount, unit_price,
│  subtotal, discount, vat, total_krw, currency_display, valid_until,
│  language, status('draft'|'sent'|'accepted'|'invoiced'|'paid'|'expired'),
│  pdf_s3_key, issued_by, issued_at, accepted_at
```

**④ 매출·고객 분석 대시보드**

5.8 매출 대시보드 8지표 + 8장 KPI를 Tremor(7.1) 차트로 시각화. 2탭.

*매출 분석:* 기간 선택, 매출 추이(일·주·월)·채널별 분리, 패키지별 매출·건수·비중(Gold 게이트 8.5), AOV·결제 실패율·환불율, 언어·국가별 분포, 결제수단 믹스(KG/PayPal).

*고객 분석:* 신규 vs 재방문(N7), 게스트→회원 전환(8.2), 국가·언어별 분포, 방문 자료(GA4 유입·디바이스·전환 퍼널 N2), NPS 추이(N5)·후기 작성률(N6), 친구 초대 성과(전환율·CAC).

신규 테이블 불요(bookings·payments·users·reviews·nps_responses·referrals 집계). 무거운 집계는 Materialized View 또는 Inngest cron 일배치. 매출은 실시간, 방문 분석은 일배치.

### 매출 대시보드 (MVP 핵심 8지표)

오늘·이번 주·이번 달 예약 수·매출·AOV, 채널별 매출(자체/KLOOK/KKday/Airbnb), 패키지별 판매 비율, 언어·국가별 매출 분포, 1차 매직링크 SLA 준수율, 결제 실패율, 후기 작성률·평균 평점. (상세 KPI는 8장 참조, 시각화는 위 5.8-A ④)


### 알림 시스템

| 알림 유형 | 채널 | 수신자 |
|---|---|---|
| 신규 예약·결제 성공 | Slack #ops | 운영 전원 |
| 결제 실패 | Slack #ops + 이메일 | 담당자 |
| CS 신규 문의 | Slack #cs | — |
| 1차 매직링크 SLA 임박 | Slack #content | Content Manager + Engineer |
| 1차 매직링크 SLA 초과 | Slack #urgent + 카카오 | Manager |
| 환불 누락 (24h 미처리) | Slack #urgent + 카카오 | Accountant + Manager |
| PayPal Dispute 접수 | Slack #urgent + 카카오 | Accountant + Manager |
| DSR 요청 | Slack #legal + 이메일 | Manager + Super Admin |
| 시스템 다운 | Slack #urgent + 카카오 + SMS | Super Admin |
| 보안 이상 | Slack #urgent + 카카오 | Super Admin |
| 낯선 환경 로그인 | 이메일 + 카카오 | 본인 |
| Gold KPI 게이트 경고 | Slack #ops | Manager |

개인별 알림 옵션(어드민 시스템 설정)에서 알림 유형별 채널 선택, 방해 금지 시간(22:00~08:00, 시스템 다운·보안 이상은 예외), 휴가·부재 모드(대체 수신자 라우팅)를 설정한다. Super Admin은 전역 정책(알림 유형별 기본 수신자 그룹·활성/비활성 토글·새 알림 유형 추가·발송 이력 조회)을 관리한다.

### CS 통합 — Channel Talk

웹 라이브 채팅, 카카오톡 비즈니스, 라인 비즈니스(일본·대만), 왓츠앱(영어권), 이메일, Instagram DM을 단일 인박스로 통합한다. CS 응대는 Channel Talk 인박스에서 진행하고, 어드민에는 고객별 예약 이력 조회 패널 + Channel Talk 채널 링크만 둔다. 언어 자동 라우팅: 영어권 채널 → 영어 응대 그룹, 라인 → 일본어·중국어 그룹, 카카오톡 → 한국어 그룹.

### 운영 SOP (부속 문서)

PRD 본문 외 별도 SOP 문서로 관리: 버퍼 0 운영, 사진 셀렉트, 외부 채널 예약 수기 등록, 2차 결과물 진행 관리, 환불 처리(3구간 분류), PayPal Dispute 대응, DSR 대응, 약관 개정, 보안 사고 대응, 2FA 디바이스 분실 복구.

### 데이터 모델 (요약)

```
admin_users ├─ id, email, password_hash(bcrypt 12), name, phone, slack_user_id,
            │  totp_secret(encrypted), totp_enabled, status, last_login_*, failed_login_count, locked_until
admin_roles ├─ id, name, permissions(JSONB), description
admin_user_roles ├─ admin_user_id, admin_role_id  (다대다, 겸직)
admin_sessions ├─ id, admin_user_id, token_hash, ip, user_agent, device_fingerprint, country, *_at
reauth_challenges ├─ id, admin_user_id, action_type, target_id, challenge_at, verified_at, verification_method
notification_preferences ├─ admin_user_id, notification_type, channel, enabled, quiet_hours_*, override_quiet_for_urgent
notification_global_policy ├─ notification_type, default_recipients_role, default_channels, enabled, disabled_*
notification_logs ├─ id, notification_type, recipient_admin_user_id, channel, payload, sent_at, delivered, provider_message_id
mv_deliveries ├─ id, booking_id, mv_team_id, status, expected_delivery_date, actual_delivery_date,
              │  spec_check_result(JSONB), spec_passed, rejection_count, rejection_reasons,
              │  main_file_s3_key, short_file_s3_key, uploaded_by, uploaded_at, sent_to_customer_at
mv_teams ├─ id, name, contact_email, contact_phone, is_active, notes
```

## 5.9 마케팅·재방문 자동화

### 후기 시스템

다운로드 페이지(매직링크 진입)에 인라인 후기 양식을 둔다. 별점 1~5(필수), 좋았던 점 태그 1~5개 선택(보컬 디렉팅·결과물 음원 품질·사진/영상·시설·직원 친절도·가성비·곡 다양성), 자유 텍스트(최대 500자), 작성자 이름(기본 이니셜 마스킹), 이용 서비스·일자 자동 표시. 후기 작성은 선택이며, 다운로드는 조건 없이 가능하다.

**노출 정책** — 즉시 노출 + 사후 모더레이션. 욕설·개인정보·스팸·명백한 허위만 어드민이 사후 삭제 가능(삭제 사유 audit_logs 기록 + 작성자 통보). 부정 후기(낮은 별점·비판 텍스트)는 한국 표시광고법상 "선별 노출" 금지에 따라 삭제 불가. **별점 ≤2 작성 시** 즉시 Slack #urgent + Manager·Operator 카카오 알림, 24시간 내 1차 응대 SLA. 어드민은 후기에 공식 답글을 작성할 수 있다.

**외부 리뷰 통합** — 자체 사이트 후기 + Google·Trustpilot·KLOOK·KKday 위젯 임베드(각 채널별 선택 가능). 외부 리뷰에는 어떠한 인센티브도 제공하지 않는다(Google 리뷰 정책 위반 방지). 다운로드 페이지에 유도 문구만 허용한다.

### UGC 인스타 리포스트 워크플로우

MVP는 반자동: Instagram Graph API로 멘션·해시태그 자동 수집 → 어드민 마케팅 큐 적재(5.7 마케팅 동의 여부 자동 매칭) → Marketer 검토(동의 OK → 리포스트 / 미확인 → DM 동의 요청) → 리포스트 실행 + audit_logs 기록. v1.2 이후 외부 SaaS(TINT 등) 도입 검토.

### 친구 초대 프로그램

| 항목 | 정책 |
|---|---|
| 할인율 | 10% 정률, 양쪽(초대자·친구) 적용 |
| 할인 상한 | ₩50,000 (Premium 결제 시에도 ₩50,000) |
| 적용 패키지 | Diamond·Premium·단체 한정 |
| 미적용 패키지 | Gold·1Hour·1Pro (어뷰즈 차단) |
| 친구 조건 | 완전 신규 고객 (이메일·휴대폰 미등록) |
| 쿠폰 만료 | 발급 후 6개월 |
| 초대 한도 | 1인당 최대 10명 (누적 한도 ₩500,000) |
| 어뷰즈 차단 | 동일 IP·디바이스 핑거프린트·카드 BIN 셀프 초대 자동 차단 |
| 쿠폰 발급 시점 | 친구 결제 완료 + 세션 완료 시점에 초대자 쿠폰 발급 |

게스트도 초대 코드를 발급받을 수 있으나, 초대자 쿠폰을 사용하려면 회원 전환이 필수다.

### 프로모션 코드

정률(기본 10%)·정액 지원, 할인율 범위 1~50%, 15% 초과 발급 시 Manager·Super Admin 승인 강제(재인증). 사용 방식(1회용/다회/1인 1회), 만료일 필수, 적용 패키지·언어 토글, 최소 결제액·전체 한도 설정, 발급 채널 태그 필수(효과 측정). 프로모션 코드와 친구 초대 코드의 동시 사용은 불가(택 1, 시스템 자동 검증).

### 이메일·SMS 캠페인

| 유형 | 동의 필요 | 빈도 제한 |
|---|---|---|
| 트랜잭션 (예약 확인·매직링크·SLA·환불) | 불필요 | 무제한 |
| 마케팅 (프로모션·뉴스레터·재방문) | 필수 | 주 1회 이하 |

자동 캠페인: D+3 후기 요청(트랜잭션) + NPS 문항 연계, D+30 재방문, D+60 매직링크 만료 안내, D+90 파일 보관 종료, D+180 6개월 재방문 유도, D+365 1주년 쿠폰. 정기 캠페인: 월간 뉴스레터, 시즌 프로모션, 신규 곡·패키지 출시 안내. A/B 테스트는 v1.1 이후.

### 데이터 모델 (요약)

```
reviews ├─ id, booking_id, rating, tags[], body, author_display, author_name_snapshot,
        │  package_snapshot, language, status, moderation_reason, moderated_by, moderated_at, ip
review_replies ├─ review_id, body, replied_by, created_at
nps_responses ├─ id, booking_id, score(0~10), category('detractor'|'passive'|'promoter'), responded_at, language
referral_codes ├─ id, code, inviter_user_id, inviter_email, created_at, expires_at(+6개월),
               │  usage_count, max_usage, status
referrals ├─ id, referral_code_id, invitee_booking_id, invitee_payment_id,
          │  status('pending'|'qualified'|'rewarded'|'rejected'),
          │  invitee_discount_krw, inviter_coupon_id, rejection_reason, created_at, qualified_at
```

## 5.10 고객 계정

### 게스트 vs 회원 매트릭스

| 기능 | 게스트 | 회원 |
|---|---|---|
| 예약·결제 | ● | ● |
| 매직링크 다운로드 | ● (60일) | ● (60일) |
| 파일 보관 기간 | 3개월 | 12개월 |
| 예약 이력 조회 | 매직링크·이메일 검색 | 마이페이지 통합 |
| 재예약 정보 자동 채움 | — | ● (인적 정보만) |
| 친구 초대 코드 발급 | ● | ● |
| 친구 초대 쿠폰 사용 | — (회원 전환 필수) | ● |
| 동의 이력 조회·철회 | 매직링크 페이지 | 마이페이지 |
| 데이터 export (GDPR) | 매직링크 페이지 요청 | 마이페이지 원클릭 |

### 회원 전환 유도 지점

결제 완료 페이지(혜택 안내 + 가입 옵션), 매직링크 다운로드 페이지 상단 상시 배너, 게스트 파일 보관 만료 30일 전 이메일.

### 인증 방식

MVP: 이메일+비밀번호, Google OAuth, Apple Sign-in. v1.1: LINE Login, Kakao Login. 비밀번호 최소 10자(영문+숫자, 특수문자 권장), bcrypt cost 12, HIBP API 침해 비밀번호 차단, 재사용 방지(직전 3개). 이메일 인증 24시간 내 클릭, 미인증 계정 7일 후 자동 비활성화. 비밀번호 재설정은 이메일 매직링크(1시간 유효). 게스트→회원 1클릭 가입 시 이미 입력된 정보(이메일·이름·연락처·국적)가 자동 반영되고 비밀번호만 입력하며, 이전 게스트 예약이 이메일 매칭으로 신규 계정에 자동 연결된다.

Apple Private Email Relay 사용자(@privaterelay.appleid.com)는 발송 도구에서 별도 화이트리스트 처리한다.

> **인증 아키텍처 결정 (C12 — Auth.js 하이브리드, v0.2 Stage 1 확정):** Auth.js v5의 OAuth 계정 링크·검증은 표준 `@auth/prisma-adapter` 모델(`Account`, `VerificationToken`)을 표준 규약 그대로 사용한다(검증된 표준에 위임). 세션은 표준 Session 모델을 쓰지 않고 PRD 커스텀 `user_sessions`(JWT 전략)로 구현한다 — 표준 Session은 `sessionToken·userId·expires` 3필드뿐이라 본 PRD의 세션 보안 요구(device_fingerprint·country·낯선 환경 감지·전체 기기 로그아웃)를 담을 수 없기 때문이다. 따라서 기존 `user_social_connections` 커스텀 테이블은 **표준 `Account` 모델로 대체**한다. 스키마에는 표준 어댑터 모델(camelCase)과 PRD 커스텀 테이블(snake_case)이 공존하며, 각각 해당 규약을 따른다.

### 마이페이지 구조

프로필(이메일·이름·연락처·국적·여권명·비밀번호·연결 소셜 계정·선호 언어) / 내 예약(예정·완료·취소) / 콘텐츠 라이브러리(매직링크 통합·카테고리 필터·보관 만료 D-day·일괄 다운로드) / 친구 초대(코드·공유 링크·초대 현황·받은 쿠폰) / 후기(작성 후기 수정·삭제) / 동의·개인정보(동의 이력·마케팅 동의 채널별 토글·데이터 다운로드·계정 삭제 요청) / 알림 설정 / 로그아웃·전체 기기 로그아웃.

### 자동 채움 정책

재예약 시 인적 정보(이름·이메일·연락처·국적·여권명·선호 언어)만 자동 채움한다. 동의 항목(이용약관·개인정보·결제·SNS·마케팅·미성년자 보호자 정보)은 자동 채움을 금지하며 매번 신규로 받되, 직전 동의 내역을 회색 톤 참고 표시로만 노출한다(GDPR·개인정보보호법 사전 체크 금지 원칙). 결제 카드는 MVP 미저장, v1.1 이후 PG 토큰만 저장한다.

### 탈퇴·재가입

계정 삭제 요청 시 보존 의무 데이터(결제·환불 5년, 세금 기록 5년, 동의 기록 3년)는 익명화 후 보관하고 나머지는 30일 내 삭제한다. 이메일·휴대폰 SHA-256 해시를 `deleted_users_blacklist`에 보관하여, 재가입 시도 시 해시 매칭으로 탈퇴 후 7일 쿨다운을 안내한다(강제 차단 아님 — 예약·결제는 게스트로 가능).

### 보안 정책

세션 만료 30일(활동 시 자동 갱신), Remember Me 기본 활성, 동시 세션 무제한, HttpOnly+Secure+SameSite=Lax 쿠키. 5분 내 5회 로그인 실패 시 30분 자동 잠금 + 이메일 알림. 낯선 국가 로그인 시 이메일 알림. 고객 2FA는 v1.1 이후 선택 도입.

### 데이터 모델 (요약)

```
# 표준 Auth.js 어댑터 모델 (@auth/prisma-adapter 규약, camelCase 표준 필드)
Account ├─ id, userId, type, provider('google'|'apple'|...), providerAccountId,
        │  refresh_token, access_token, expires_at, token_type, scope, id_token
        │  # OAuth 계정 링크 — 구 user_social_connections 대체 (C12)
VerificationToken ├─ identifier, token, expires   # OAuth 이메일 검증 표준

# PRD 커스텀 모델 (snake_case @@map, Stage 1 확정)
users ├─ id(cuid), email(unique, 앱 단일지점 lowercase 정규화), emailVerified,
      │  emailVerifiedAt, passwordHash(nullable), name, phone, nationality,
      │  passportName, preferredLanguage, status(active|inactive), deletedAt
      │  # 삭제 판정 단일 기준 = deletedAt IS NOT NULL (status에 deleted 없음)
      │  # 미인증 = emailVerified=false, 7일 후 inactive
user_sessions ├─ id(cuid), userId, tokenHash, deviceFingerprint, ip, country,
      │  userAgent, createdAt, expiresAt, lastActiveAt
      │  # 표준 Session 미사용 — 낯선 환경 감지·전체기기 로그아웃 위해 커스텀(C12)
deleted_users_blacklist ├─ id(cuid), emailHash(SHA-256), phoneHash(SHA-256), deletedAt, cooldownUntil(+7일)
password_resets / email_verifications ├─ id(cuid), userId, tokenHash(crypto 난수), createdAt, expiresAt, usedAt|verifiedAt
booking_user_links ├─ bookingId, userId, guestEmail, linkedAt
```

> **Stage 1 스키마 확정 사항 (v0.2):** PK는 `cuid()` 통일(단 `consents`만 법적 증빙 표준 참조용 UUID — §5.7). 토큰 컬럼(매직링크·비번재설정·이메일검증)은 PK와 별도 crypto 난수(cuid는 예측 가능하므로 토큰 부적합). 재인증 검증 방식은 enum `AuthMethod{PASSWORD_ONLY,TOTP_ONLY,PASSWORD_TOTP}`(보안 필드는 값을 닫음). email은 `@unique` + 앱 단일 지점 lowercase 정규화(분산 정규화 금지, citext 미도입). m:n 조인(`admin_user_roles`)은 복합 PK.
---

# 6. 비기능 요구사항 (Non-Functional Requirements)

## 6.1 성능 (Performance)

**용량 기준** — 평상시 CCU 50 / RPS 5–10 / 동시 결제 1–3, 피크 CCU 500 / RPS 50–100 / 동시 결제 10–20. 피크 시즌은 3~5월(벚꽃·졸업여행), 9~11월(가을 단풍), 12월(연말). 피크 트리거는 외신 보도, K-POP 아티스트 컴백 연계 캠페인.

**응답 SLA** — LCP ≤ 2.5초(모바일 4G), FID ≤ 100ms, CLS ≤ 0.1, API p95 ≤ 500ms·p99 ≤ 1s, 매직링크 페이지 로드 ≤ 2초.

**가용성** — 월 99.5%(월간 다운타임 ≤ 3시간 36분), 결제·예약 엔진 단독 99.9%(월 ≤ 43분). 계획 점검은 KST 03:00~05:00, 7일 전 사전 공지.

**용량 검증** — M9 단계 k6 부하 테스트(평상시 30분 + 피크 10분 시나리오), 결제 엔드포인트 별도 부하 테스트(Redis 락 경합 검증).

## 6.2 보안 (Security)

**기본 보안 (상시)** — HTTPS 강제(TLS 1.3), HSTS 1년, HTTP→HTTPS 301. 모든 입력 검증(Zod), SQL 인젝션·XSS·CSRF 방어. 비밀번호 bcrypt cost 12, 어드민 2FA 필수. 환경변수는 GCP Secret Manager(Git 금지). Rate limit: 로그인 5회/5분, API 100req/분/IP, 결제 3회/10분/사용자. CSP 헤더, X-Frame-Options DENY, Referrer-Policy strict-origin.

> **WAF 정책 (C2 정정)**: Cloudflare는 Free 플랜을 사용하므로 Pro WAF Managed Rules는 미적용된다. OWASP Top 10 방어는 **Cloudflare Free 기본 보호 + Upstash Ratelimit + Next.js Middleware 자체 검증**으로 대응한다. 연 1회 외부 펜테스트에서 WAF 부재가 지적될 경우 Cloudflare Pro 또는 AWS WAF 도입을 검토한다.

**분기 자체 스캔 (3·6·9·12월)** — npm audit, OWASP ZAP, Snyk 의존성 스캔, GCP Cloud Audit Logs 이상 행위 검토. 결과 보고서를 어드민에 PDF로 3년 보관.

**연 1회 외부 펜테스트** — 매년 1월(연간 운영 데이터 누적 후), 범위는 웹·어드민·API·결제·매직링크, 예산 ₩5,000,000~10,000,000/회. Critical·High 이슈는 30일 내, Medium은 90일 내 패치.

**보안 사고 대응 SOP** — 발견 후 30분 내 Slack #urgent + Aiden 카카오톡. Critical(개인정보 유출)은 24시간 내 KISA 신고, 5일 내 이용자 통지(개인정보보호법). 사고 사후 보고서 3년 보관.

## 6.3 SEO / AEO / GEO

### 목표

| 영역 | 목표 |
|---|---|
| 메인 키워드 (영·일·중) | Google 검색 상위 5위 |
| 브랜드 키워드 ("king studio seoul") | 1위 |
| LLM 검색 노출 (ChatGPT·Perplexity·Claude) | 답변 인용 상위 3개 이내 |

메인 키워드 예시: 영어 "k-pop recording experience seoul", "kpop studio seoul tourist"; 일본어 "韓国 K-POP 録音体験"; 중국어 간체 "首尔 K-POP 录音体验"; 중국어 번체 "首爾 K-POP 錄音體驗".

### 기술 SEO

hreflang 5개 언어 + x-default 매핑. 구조화 데이터(JSON-LD): Organization, LocalBusiness, Product+Offer, AggregateRating, Review, FAQPage, BreadcrumbList. 사이트맵 자동 생성(언어별 분리), canonical URL 통일, Open Graph + Twitter Card(언어별 이미지).

### LLM 검색 노출 (GEO)

robots.txt에 AI 크롤러 허용 정책을 명시한다. FAQ·About 페이지를 자연어 Q&A 형식으로 작성하고, 외부 인용 자산(NYT 기사 백링크, Wikipedia 등재)을 확보한다.

**AI 크롤러 정책 (robots.txt 기본값)**

| 분류 | 크롤러 | 정책 |
|---|---|---|
| 검색엔진 | Googlebot, Bingbot, NaverBot, Yeti, DaumBot | Allow |
| AI 검색·답변 | GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, anthropic-ai, Claude-Web, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, Amazonbot, Bytespider | Allow |
| 학습 데이터셋 | CCBot, Diffbot, Omgilibot | **Disallow** |

CCBot(Common Crawl) 등 학습 데이터셋 크롤러는 차단하여 콘텐츠가 경쟁사 AI 학습에 무단 활용되는 것을 방지한다. AI 검색·답변 엔진은 실시간 인용 가치가 있으므로 허용한다. 어드민에서 개별 토글이 가능하며 모든 변경은 audit_logs에 기록된다.

### 어드민 SEO/AEO/GEO 관리 모듈

용어 구분: **SEO**(Google·Naver 등 전통 검색엔진), **AEO**(Answer Engine Optimization — AI Overviews·음성 검색·Featured Snippet), **GEO**(Generative Engine Optimization — ChatGPT·Perplexity·Claude 등 생성형 AI 답변 노출). 세 가지는 최적화 기법이 다르므로 어드민에서 분리된 탭으로 관리한다.

**모듈 릴리스 매트릭스**

| 기능 | MVP | v1.1 | v1.2 | v2.0 |
|---|:--:|:--:|:--:|:--:|
| 전역 메타 설정 (5언어) | ● | | | |
| 페이지별 SEO 관리 (수동) | ● | | | |
| SEO 키워드 + GSC API | ● | | | |
| 스키마 템플릿 7종 자동 적용 | ● | | | |
| 사이트맵·robots.txt·llms.txt | ● | | | |
| AEO 키워드 탭 | | ● | | |
| AEO 모듈 (FAQ·Featured Snippet 추적) | | ● | | |
| GEO 키워드 탭 (수동 등록) | | ● | | |
| AI 크롤러 토글 UI | | ● | | |
| 인용 가능성 점수 | | ● | | |
| AI 생성 보조 (메타·답글 초안) | | ● | | |
| GEO 자동 테스트 cron | | | ● | |
| 외부 언급 모니터링 | | | ● | |
| 커스텀 스키마 에디터 | | | ● | |
| 통합 성과 측정 대시보드 | | | ● | |
| 외부 백링크 모니터링 (Ahrefs 등) | | | | ● |

**구조화 데이터 관리** — 자유 입력을 금지하고 템플릿 선택 방식을 사용한다. 잘못된 JSON-LD는 리치 결과 자격을 박탈당하기 때문이다. MVP는 7종 자동 적용(Organization, LocalBusiness, Product+Offer, AggregateRating, Review, FAQPage, BreadcrumbList), 커스텀 스키마 에디터는 v1.2(Super Admin·Manager만, Google Rich Results Test 통과 필수). 검증 실패 시 저장이 차단된다.

**llms.txt** — MVP에 포함한다(단순 마크다운 파일, 구현 부담 1~2일). 사이트 핵심 정보·패키지·연락처를 LLM 친화 마크다운으로 자동 생성하여 `/llms.txt`, `/llms-full.txt`로 배포한다.

**API 비용 통제** — OpenAI 월 하드 캡 $200(v1.1부터 AI 생성 보조, v1.2부터 GEO 테스트), Perplexity $200(v1.2부터), Anthropic $100(v1.2부터, GEO 검증). 한도 80% 도달 시 Slack #urgent + Aiden 카카오톡, 100% 도달 시 자동 일시정지(Manager 수동 재개). 월별 사용량을 어드민 대시보드에 실시간 표시한다.

**데이터 모델 (요약)**

```
keywords ├─ id, type('seo'|'aeo'|'geo'), keyword, language, priority,
         │  target_page_id, search_volume, current_rank, target_rank
geo_test_results ├─ id, keyword_id, engine, tested_at, mentioned, rank_position, citation_sources(JSONB)
page_seo ├─ id, page_path, language, title, description, h1, canonical_url, noindex, nofollow, og_image_url
page_schemas ├─ id, page_path, schema_type, schema_template_id, custom_json(JSONB), validated, validated_at
schema_templates ├─ id, type, name, json_template, required_fields(JSONB), version
```

## 6.4 접근성 (WCAG 2.1 Level AA)

키보드 전체 탐색(Tab·Enter·Esc), focus visible 명확, 명도 대비 4.5:1(텍스트)·3:1(대형 텍스트·UI), 모든 이미지 alt 속성, 폼 라벨 명시(placeholder 단독 금지), 동영상 자막(Premium MV 샘플 등), 색상만으로 정보 전달 금지(슬롯 가능/마감을 색+텍스트 병기), ARIA 랜드마크, 다국어 lang 속성.

**검증** — Axe DevTools 자동 검사 + Lighthouse Accessibility ≥ 95, M9 단계 수동 검증(NVDA·VoiceOver 스크린리더 1회), 분기 자동 스캔. **법적 근거** — 미국 ADA 소송 리스크 회피(외국인 관광객 타깃, US 트래픽 다수), EU EAA(European Accessibility Act, 2025-06 시행) 대응.

## 6.5 백업 및 재해복구 (DR)

| 자산 | 백업 방식 | 보관 | RTO | RPO |
|---|---|---|---|---|
| PostgreSQL | 일일 자동 + PITR | 30일 | 4시간 | 1시간 |
| Cloud Storage 콘텐츠 (음원·사진·MV) | 객체 버전 관리 + 멀티리전/이중리전 버킷 | 보관 정책 준수 | 1시간 | 즉시 |
| Redis | 휘발성 (백업 없음) | — | 즉시 재시작 | 손실 허용 |
| 동의 PDF | Cloud Storage Bucket Lock(보존 정책) | 3년 이상 | 4시간 | 즉시 |
| 감사 로그 | PostgreSQL + 월간 Cloud Storage 아카이브 | 3년 | 4시간 | 1시간 |
| 환경변수·시크릿 | GCP Secret Manager + 분기 오프라인 백업 | 영구 | 1시간 | — |

**DR 훈련** — 연 1회(1월) 복구 시뮬레이션(Cloud SQL 복원, Cloud Storage 리전 페일오버, 어드민 재로그인까지 측정), 결과 보고서 보관. **리전 전략** — 주: GCP Seoul(asia-northeast3), DR: Cloud Storage 멀티리전(asia) + Cloud SQL 크로스리전 복제본 검토. v2.0에서 멀티리전 액티브-액티브 검토.

## 6.6 모니터링

**에러 트래킹** — Sentry(프론트·백엔드 통합, 환경별 분리). Critical 즉시 Slack #urgent + Aiden 카카오톡, High 30분 누적, Medium 일일 다이제스트.

**Uptime 모니터링** — BetterStack, `/api/health` 30초 간격(Cloud SQL·Redis·Cloud Storage 연결 확인), 결제·매직링크 페이지 별도 모니터. 1분 이상 다운 시 발화. BetterStack 자체 알림은 Slack #urgent로만 발화하고, 카카오 알림은 Slack→솔라피 워크플로우로 단일 라우팅하여 중복 알림을 방지한다.

**외부 의존성 헬스체크 (5분 간격)** — KG이니시스, PayPal, Cloud Storage, Cloud CDN, Channel Talk, Resend, Twilio, 솔라피. 의존성 다운 시 사용자에게 점진적 안내 배너 자동 노출(어드민 토글).

**비즈니스 알림 임계값** — 결제 실패율 일간 5% 초과, 1차 매직링크 SLA 임박(잔여 4h), 다운로드 503 에러 누적 10건/시간, 별점 ≤2 후기 작성.

**로그** — 애플리케이션: Axiom(무료 500GB/월, 30일 보관). 감사 로그: PostgreSQL append-only(3년). 인프라: GCP Cloud Logging(Cloud Run·Cloud SQL, 보존 정책 설정).

## 6.7 환경 분리

| 환경 | 인프라 | DB | PG | 데이터 |
|---|---|---|---|---|
| Local | Docker Compose | 로컬 PG | 모의 응답 | 시드 더미 |
| Staging | Cloud Run(스테이징 서비스) + GCP 별도 프로젝트 | Cloud SQL(소형) | KG이니시스·PayPal 샌드박스 | 익명화 복제 |
| Production | Cloud Run(프로덕션) + GCP Prod 프로젝트 | Cloud SQL HA | 실제 PG | 실데이터 |

**배포 흐름** — GitHub Actions CI(푸시 시 lint·type-check·test) → Cloud Build → Staging Cloud Run 자동 배포. Production 배포는 PR 머지 + 수동 승인(Aiden 또는 Manager), 롤백은 Cloud Run 이전 리비전으로 즉시 전환.

**데이터 보호** — Production→Staging 복제 시 PII 마스킹(이메일·휴대폰·이름·여권 해시화), Staging 데이터 30일 후 자동 삭제, Local에서 실데이터 접근 금지.

## 6장 운영 측정 KPI

가용성 ≥ 99.5%(결제 ≥ 99.9%), LCP p75 ≤ 2.5초, API p95 ≤ 500ms, Critical 보안 이슈 30일 내 패치 100%, Lighthouse 성능 ≥ 90·접근성 ≥ 95·SEO ≥ 95·Best Practices ≥ 95, DR 훈련 연 1회 100%, 외부 펜테스트 연 1회 100%, 메인 키워드 5개 중 3개 이상 Google 상위 5위(12개월 내).
---

# 7. 기술 스택 (Tech Stack)

선택 원칙: ① 러닝커브 최소화, ② 한국 + 글로벌 동시 대응, ③ 운영비 ≤ ₩500K/월(MVP), ④ 풀스택 1명 유지보수 가능, ⑤ GCP 단일 클라우드 생태계 우선(Cloud Run·Cloud SQL·Cloud Storage).

## 7.1 프론트엔드

| 항목 | 선택 |
|---|---|
| 프레임워크 | Next.js 14 App Router + TypeScript 5.x |
| UI 컴포넌트 | shadcn/ui + Radix UI + Tailwind CSS |
| 폼 | react-hook-form + Zod |
| 상태관리 | Zustand (클라이언트) + TanStack Query (서버 상태) |
| 다국어 | next-intl (번역 파일 GitHub 관리) |
| 이미지 | Next.js Image + Cloud Storage + Cloud CDN + Sharp(빌드 시 썸네일) |
| 캘린더 | 고객 = react-day-picker + 자체 시간 슬롯 / 어드민 = FullCalendar(무료) |
| 차트 | Recharts + Tremor(KPI 카드) |
| 파일 업로드 | Uppy + Tus (재개 가능 업로드) |
| 아이콘 | Lucide React |

## 7.2 백엔드 / 데이터 계층

| 항목 | 선택 | 비고 |
|---|---|---|
| 런타임 | Next.js Route Handlers + Node.js 20 LTS | 풀스택 1명 — 백엔드 미분리 통합 운영 |
| ORM | **Prisma** + Prisma Migrate | C4 정정 — 초기 "Drizzle" 추천 폐기 |
| 검증 | Zod | 프론트·백엔드 스키마 공유 |
| 검색 | PostgreSQL Full-Text Search | 곡 카탈로그 200~500곡 규모, v1.2에 1,000곡 초과 시 Meilisearch 검토 |
| 큐 | Inngest | 트랜스코딩·매직링크 발송·GEO cron 통합 |
| cron | Inngest Scheduled Functions | 큐와 단일 도구 통합 |

Prisma Accelerate는 무료 티어(10M 쿼리/월) 사용, 피크 시 Cloud SQL 커넥션 풀러(PgBouncer/Cloud SQL Proxy) 전환 옵션 보유. Prisma Pulse는 미사용.

## 7.3 데이터베이스 / 캐시

| 항목 | 선택 |
|---|---|
| 메인 DB | GCP Cloud SQL for PostgreSQL 16 (HA: 다중 영역), MVP 인스턴스 db-custom-2-7680 (2 vCPU·7.5GB 급) |
| 캐시·락 | Upstash Redis (Serverless) — Memorystore 대비 저트래픽 비용 우위로 유지 |
| 백업 | Cloud SQL 자동 백업 + PITR + 주간 스냅샷 (서울 리전, DR은 멀티리전 버킷) |
| 마이그레이션 | Prisma Migrate |

## 7.4 인프라 / 호스팅

| 항목 | 선택 |
|---|---|
| 호스팅 | GCP Cloud Run (Next.js 컨테이너, scale-to-zero) |
| 빌드·배포 | Cloud Build (GitHub 푸시 → 자동 빌드 → Cloud Run 배포) |
| 리전 | GCP Seoul (asia-northeast3) — 호스팅·DB·스토리지 동일 리전(크로스클라우드 지연 제거) |
| DNS·CDN | Cloudflare Free (DNS·기본 보안, Cloud Run 앞단) + Cloud CDN(콘텐츠 전송) |
| 도메인 | kingstudio.co.kr — Cafe24 등록 유지, DNS만 Cloudflare 위임, 만료 2028-07-12 |
| 파일 저장 | GCP Cloud Storage(서울) + DR 멀티리전 버킷 |
| 콘텐츠 CDN | Cloud CDN + Signed URL (매직링크) |
| 시크릿 | GCP Secret Manager (Cloud Run 런타임 주입) |
| 환경 분리 | Local / Staging / Production 3단 (Cloud Run 서비스·Cloud SQL 인스턴스 분리) |

> **C2 정정 (GCP 갱신)**: Cloudflare는 Free 플랜(WAF Managed Rules 부재). OWASP Top10 방어는 Upstash Ratelimit + Next.js Middleware 자체 검증으로 대응(6.2). GCP Cloud Armor는 펜테스트 결과에 따라 도입 검토.
> **C13 정정 (인프라 GCP 전환, v0.2)**: PRD 원안 AWS+Vercel → 단일 GCP(Cloud Run)로 전환. 사유 = 장기 비용 효율 + 단일 클라우드 운영. Vercel 편의(자동 배포·프리뷰)는 Cloud Build/Cloud Run으로 재현, 초기 셋업은 Claude Code가 담당. Next.js 네이티브 최적화(ISR·이미지)는 수동 구성.

## 7.5 결제 / 환율

| 항목 | 선택 |
|---|---|
| 국내 PG | KG이니시스 (한국어 사이트 기본) |
| 해외 PG | PayPal (Smart Payment Buttons) |
| 환율 표시 | OpenExchangeRates Free (일 1회 fetch → Redis 24h TTL → DB 백업) |
| 영수증 PDF | @react-pdf/renderer (다국어 폰트 임베드) |
| 세금계산서 (B2B) | 팝빌 API (건당 약 ₩200) |

## 7.6 인증 / 보안

| 항목 | 선택 |
|---|---|
| 인증 | Auth.js v5 (NextAuth) + Prisma Adapter |
| 2FA | otplib (TOTP) + qrcode (어드민 필수, 회원은 v1.1 옵션) |
| RBAC | 자체 미들웨어 + DB 정책 테이블 (7개 역할) |
| 매직링크 | 자체 구현 (콘텐츠 다운로드용 별도 토큰 60일, 인증용과 분리) |
| Rate Limit | Upstash Ratelimit |
| 비밀번호 | bcrypt(12) + zxcvbn + HIBP API |

소셜 로그인은 MVP에 Google·Apple, v1.1에 LINE·Kakao(커뮤니티 어댑터 안정성 재검증, 대안 Lucia 보유).

## 7.7 콘텐츠 / 미디어 (C3 정정)

| 항목 | 선택 |
|---|---|
| 음원 트랜스코딩 | Cloud Run Jobs FFmpeg (WAV 24/48 → 16/44.1 + MP3 320k) |
| 사진 처리 | Cloud Run Jobs Sharp (EXIF 유지, WebP 썸네일) |
| Premium MV | 외부팀 사양 납품 + 어드민 수동 업로드 (트랜스코딩 없음) |
| 서명 URL | Cloud CDN Signed URL, TTL 10분 |
| 불변 보관 | Cloud Storage Bucket Lock(보존 정책) — 동의 PDF 3년 |

> **C3 정정 (GCP 갱신)**: AWS MediaConvert·Lambda 폐기. 음원·사진은 Cloud Run Jobs로 트랜스코딩(Inngest가 잡 트리거), MV는 외부팀이 완성본을 사양에 맞춰 납품(5.6). S3 Object Lock → Cloud Storage Bucket Lock으로 대체.

## 7.8 알림 / CS (C1 정정)

| 항목 | 선택 |
|---|---|
| 트랜잭션 이메일 | Resend (React Email 5언어 템플릿) |
| 마케팅 이메일 | Resend Audiences + Broadcasts (v1.2 자동화 요구 시 Customer.io 재검토) |
| 국내 SMS·알림톡 | **솔라피(Coolsms)** |
| 해외 SMS | Twilio |
| 어드민 내부 알림 | Slack Free (3개월 후 Pro 검토) |
| 카카오 긴급 알림 | 솔라피 알림톡 + SMS 자동 폴백 |
| CS | Channel Talk (웹챗·카카오·라인·왓츠앱·이메일·Instagram DM) |

> **C1 정정**: 7장 초기 "NHN Toast"는 폐기, 솔라피로 통일.
>
> **이메일 발신 도메인 분리** — 트랜잭션 메일과 마케팅 메일은 발신 평판 격리를 위해 서브도메인을 분리한다. 트랜잭션은 `join@kingstudio.co.kr`, 마케팅은 별도 서브도메인(예: `news@mkt.kingstudio.co.kr`). 마케팅 메일 스팸 신고가 트랜잭션(매직링크) 도달률을 오염시키는 것을 방지한다. 비용 0, DNS 레코드 추가만 필요.

## 7.9 모니터링 / 분석

| 항목 | 선택 |
|---|---|
| 에러 트래킹 | Sentry Team |
| Uptime | BetterStack |
| 로그 | Axiom (무료 500GB/월) |
| 제품 분석 | PostHog Cloud (무료 1M 이벤트/월) |
| 웹 분석 | GA4 + GTM |
| 검색 콘솔 | Google Search Console + Naver Search Advisor |

## 7.10 AI / GEO

| 항목 | 선택 | 도입 시점 |
|---|---|---|
| OpenAI | GPT-4o-mini (메타·답글 초안), 월 캡 $200 | v1.1 |
| Perplexity | Sonar API (GEO 테스트), 월 캡 $200 | v1.2 |
| Anthropic | Claude 3.5 Haiku (GEO 검증), 월 캡 $100 | v1.2 |

## 7.11 개발·배포 도구

| 항목 | 선택 |
|---|---|
| 패키지 매니저 | pnpm |
| Linter·Formatter | Biome (ESLint+Prettier 통합) |
| 테스트 (Unit) | Vitest |
| 테스트 (E2E) | Playwright (5언어 × 2 PG 결제 플로우 검증) |
| CI/CD | GitHub Actions |
| AI 코드 리뷰 | CodeRabbit (1인 개발 1차 안전망) |
| 이슈 관리 | Linear (9장 마일스톤 사이클 운용) |
| 문서 | Notion(PRD·SOP) + GitHub Wiki(기술 문서) |

> Biome는 Tailwind 클래스 정렬·next-intl 키 검증 등 일부 ESLint 플러그인 기능을 대체하지 못한다. 플러그인 의존이 커질 경우 표준 ESLint+Prettier 회귀 가능.

## 7.12 환경변수 마스터 리스트

```
# DB·캐시
DATABASE_URL / DATABASE_URL_REPLICA (v1.1)
UPSTASH_REDIS_URL / UPSTASH_REDIS_TOKEN

# 결제
KG_INICIS_MID / KG_INICIS_SIGN_KEY / KG_INICIS_API_KEY
PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET / PAYPAL_WEBHOOK_ID
OPENEXCHANGERATES_APP_ID
POPBILL_LINK_ID / POPBILL_SECRET_KEY / POPBILL_CORP_NUM

# 인증
AUTH_SECRET
AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET
AUTH_APPLE_ID / AUTH_APPLE_SECRET / AUTH_APPLE_TEAM_ID / AUTH_APPLE_KEY_ID / AUTH_APPLE_PRIVATE_KEY
AUTH_LINE_ID / AUTH_LINE_SECRET (v1.1)
AUTH_KAKAO_ID / AUTH_KAKAO_SECRET (v1.1)

# 파일·미디어 (GCP)
GCP_PROJECT_ID
GCP_REGION=asia-northeast3
GOOGLE_APPLICATION_CREDENTIALS   # 서비스 계정 키 (또는 Cloud Run 워크로드 아이덴티티)
GCS_BUCKET_CONTENT / GCS_BUCKET_CONSENT
CLOUD_CDN_DOMAIN / CLOUD_CDN_KEY_NAME / CLOUD_CDN_SIGNING_KEY

# 알림
RESEND_API_KEY
RESEND_FROM_EMAIL=join@kingstudio.co.kr
RESEND_FROM_NAME="KING STUDIO"
RESEND_MARKETING_FROM=news@mkt.kingstudio.co.kr
SOLAPI_API_KEY / SOLAPI_API_SECRET / SOLAPI_SENDER_PHONE / SOLAPI_KAKAO_PFID
TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_MESSAGING_SID
CHANNEL_TALK_PLUGIN_KEY
SLACK_WEBHOOK_OPS / URGENT / CONTENT / CS / LEGAL

# 모니터링
SENTRY_DSN / SENTRY_AUTH_TOKEN
BETTERSTACK_API_KEY / AXIOM_TOKEN
POSTHOG_KEY / GA4_MEASUREMENT_ID / GTM_ID

# AI (v1.1~v1.2)
OPENAI_API_KEY / OPENAI_MONTHLY_CAP_USD=200
PERPLEXITY_API_KEY / PERPLEXITY_MONTHLY_CAP_USD=200
ANTHROPIC_API_KEY / ANTHROPIC_MONTHLY_CAP_USD=100

# SEO
GSC_SERVICE_ACCOUNT_JSON / GOOGLE_RICH_RESULTS_API_KEY / NAVER_SEARCH_ADVISOR_KEY

# 큐·기타
INNGEST_EVENT_KEY / INNGEST_SIGNING_KEY
CRON_SECRET / NEXT_PUBLIC_SITE_URL / NODE_ENV

# 구글 캘린더 연동 (어드민 확장 모듈 ②, v0.2 추가)
GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON   # 운영 캘린더 push/pull용 서비스 계정
GOOGLE_CALENDAR_ID                      # 뮤직킹 운영 구글 캘린더 ID
GOOGLE_CALENDAR_WEBHOOK_TOKEN           # pull(블록 역동기화) watch 채널 검증
```

## 7.13 월 운영비 추정 (GCP 전환 — 재산정 필요)

> **C13 주의:** 인프라가 GCP로 전환되어 아래 인프라 항목은 **추정치**다. 정확한 단가는 Cloud Run 트래픽·Cloud SQL 인스턴스 사양·Cloud Storage 용량·egress 실측 후 확정한다(출시 후 baseline에서 재산정). SaaS 항목(Sentry·Resend 등)은 클라우드와 무관하여 그대로 유지.

| 항목 | MVP 월 비용 (KRW, 추정) |
|---|---|
| Cloud Run (Next.js, scale-to-zero, 저~중 트래픽) | 추정 20,000~40,000 |
| Cloud Build (빌드 분) | 추정 5,000 |
| Cloud SQL PostgreSQL (HA, 2vCPU급) | 추정 90,000~130,000 |
| Cloud Storage + Cloud CDN (트래픽 500GB) | 추정 50,000~70,000 |
| Cloud Run Jobs (트랜스코딩 배치) | 추정 5,000 |
| Cloudflare Free | 0 |
| Upstash Redis | 15,000 |
| Sentry Team | 36,000 |
| BetterStack | 40,000 |
| Resend | 28,000 |
| Channel Talk (Starter) | 70,000 |
| 솔라피 SMS·알림톡 (월 1,000건) | 9,000 |
| Twilio (월 500건 해외) | 25,000 |
| OpenExchangeRates Free | 0 |
| Axiom · PostHog · GA4 | 0 |
| 도메인 (.co.kr 갱신, 월 환산) | 2,000 |
| CodeRabbit | 21,000 |
| Linear (1 seat) | 11,000 |
| **MVP 운영 합계** | **추정 약 ₩430,000~510,000/월 (GCP 실측 후 확정)** |

GCP 신규 계정은 $300 무료 크레딧(90일)이 있어 초기 개발·스테이징 비용을 상쇄할 수 있다. 지속사용 할인(sustained-use discount)은 약정 없이 자동 적용된다.

**단계별 운영비 추이 (추정)**

| 단계 | 월 운영비 | 증분 사유 |
|---|---|---|
| MVP (2027-03) | 추정 ₩430,000~510,000 | GCP 실측 후 확정 |
| v1.1 (2027-08) | +약 ₩70,000 | OpenAI API |
| v1.2 (2027-12) | +약 ₩200,000 | Perplexity·Anthropic API |
| v2.0 (2028) | 변동 | Studio B 가동, 피크 시 Cloud Run·Cloud SQL·Storage 1.5~2배 |

**연간 별도 비용** — Apple Developer Program $99/년, 외부 펜테스트 ₩5~10M/년(2028-01부터), 격월 외부 코드 리뷰 ₩500K~1M/회.

## 7.14 라이선스·법적 검토 필요 의존성

Apple Developer Program 가입($99/년), PayPal Business Account(사업자 등록증 + 통신판매업 신고), KG이니시스 가맹점 심사(2~4주), GCP·Cloudflare GDPR DPA 체결(EU 고객 처리 시), Channel Talk·Sentry·PostHog·BetterStack 개인정보 위탁 동의서 보관.
---

# 8. KPI 통합 (Integrated KPI Dashboard)

KPI는 2계층으로 분리한다: 노스스타 지표(어드민 대시보드 상단, 의사결정용)와 운영·기술 KPI(진단용). 모든 지표에 데이터 소스·주기·측정 개시 시점을 명시한다.

## 8.1 노스스타 지표 (대시보드 상단, 주간 점검)

| # | 지표 | 목표 | 데이터 소스 | 주기 | 측정 개시 |
|---|---|---|---|---|---|
| N1 | 자체 채널 예약 비중 | ≥ 60% | bookings.source | 주간 | 출시 즉시 |
| N2 | 방문→결제 전환율 | 잠정 4% → v0.3 재확정 | GA4 ÷ paid bookings | 주간 | 출시 즉시 |
| N3 | 평균 객단가(AOV) | 잠정 OTA 130% → v0.3 재확정 | payments 평균 | 주간 | 출시 즉시 |
| N4 | 다운로드 도달률 | ≥ 95% | magic_links → download_logs | 주간 | 출시 즉시 |
| N5 | NPS | ≥ 60 (3개월 rolling) | 다운로드 페이지 NPS 문항 | 월간 | 출시 즉시 |
| N6 | 후기 작성률 | ≥ 25% | reviews ÷ 완료 bookings | 주간 | 출시 즉시 |
| N7 | 재방문·추천 예약 비중 | 잠정 15% → v0.3 재확정 | 회원 재예약 + referrals | 월간 | 출시 +3개월 |
| N8 | 결제 실패율 | ≤ 5% | payments.status='failed' | 일간 | 출시 즉시 |

N2·N3·N7은 출시 후 3개월을 baseline 측정 기간으로 운용하고 v0.3에서 목표값을 확정한다. 그 전까지 대시보드에 "잠정"으로 표기하며 미달 경보를 비활성화한다(미해결 이슈 O1).

**N5 NPS 측정 방식** — 다운로드 페이지 후기 양식 2단계에 NPS 단일 문항(0~10 추천 의향)을 배치한다. 후기 작성(별점·태그·텍스트)을 1단계로 받고, 제출 또는 건너뛰기 후 2단계로 NPS 문항을 노출한다. 후기를 안 쓴 고객에게도 NPS 단독 문항이 노출되어 표본을 최대화한다. booking당 1회 응답, 산출은 3개월 rolling(월 단위 변동성 흡수). NPS 응답은 reviews와 별도 `nps_responses` 테이블에 저장한다.

## 8.2 운영 KPI (월간 리뷰)

| 영역 | 지표 | 목표 | 소스 | 주기 | 측정 개시 |
|---|---|---|---|---|---|
| 콘텐츠 | 1차 매직링크 SLA 준수율 | ≥ 95% | deliverables 발송 vs 세션종료+24h | 일간 | 출시 즉시 |
| 콘텐츠 | 2차(믹스·MV) SLA 준수율 | ≥ 90% | deliverables.released_at vs 세션일+21/28d | 주간 | 출시 즉시 |
| 콘텐츠 | 사진 셀렉트 평균 소요 | ≤ 15분 | 어드민 셀렉트 타임스탬프 | 주간 | 출시 즉시 |
| 콘텐츠 | 매직링크 만료 전 재발급 비율 | ≤ 5% | magic_links 재발급 건수 | 월간 | 출시 즉시 |
| 콘텐츠 | 이메일 전달률 (delivered) | ≥ 98% | Resend delivered 이벤트 | 주간 | 출시 즉시 |
| 콘텐츠 | 이메일 반송률 (bounce) | ≤ 2% | Resend bounce 이벤트 | 주간 | 출시 즉시 |
| 콘텐츠 | 스팸 신고율 (complaint) | ≤ 0.1% | Resend complaint 이벤트 | 주간 | 출시 즉시 |
| 결제 | KG이니시스 / PayPal 실패율 | ≤ 5% 각각 | payments PG별 집계 | 일간 | 출시 즉시 |
| 결제 | 환불 처리 소요 | ≤ 영업일 3일 | refunds 요청~완료 | 주간 | 출시 즉시 |
| 마케팅 | 평균 별점 | ≥ 4.5 | reviews.rating 평균 | 주간 | 출시 즉시 |
| 마케팅 | 별점 ≤2 응대 SLA | 24h 100% | 알림~1차응대 타임스탬프 | 건별 | 출시 즉시 |
| 마케팅 | 외부 리뷰 신규(월) | Google +20 / Trustpilot +10 | GBP·Trustpilot API | 월간 | 출시 즉시 |
| 마케팅 | 친구 초대 전환율 | ≥ 5% | referrals qualified ÷ 코드 발급 | 월간 | 출시 즉시 |
| 마케팅 | 친구 초대 CAC | ≤ ₩50,000 | 쿠폰 발급액 ÷ 신규 고객 | 월간 | 출시 즉시 |
| 마케팅 | 프로모션 코드 사용률 | ≥ 30% | 사용 ÷ 발급 | 월간 | 출시 즉시 |
| 마케팅 | 이메일 오픈율 / 클릭률 | ≥ 25% / ≥ 5% | Resend 통계 | 캠페인별 | 출시 즉시 |
| 마케팅 | 마케팅 동의 철회율(월) | ≤ 2% | consents 철회 집계 | 월간 | 출시 즉시 |
| 계정 | 게스트→회원 전환율 | ≥ 30% | booking_user_links | 월간 | 출시 즉시 |
| 계정 | 마이페이지 MAU | 회원 중 ≥ 40% | PostHog | 월간 | 출시 즉시 |
| 동의 | DSR 처리 SLA | 열람 7일 / 삭제 30일 100% | DSR 큐 | 건별 | 출시 즉시 |

이메일 전달률·반송률·스팸 신고율 3개는 N4 다운로드 도달률 하락의 원인 분리용이다. N4가 95% 미만으로 떨어졌을 때 이메일이 안 닿은 것인지(전달률↓), 닿았는데 안 받은 것인지를 구분한다.

## 8.3 기술·비기능 KPI (자동 측정, 상시)

| 영역 | 지표 | 목표 | 소스 | 측정 개시 |
|---|---|---|---|---|
| 성능 | 가용성 | ≥ 99.5% (결제 99.9%) | BetterStack | 출시 즉시 |
| 성능 | LCP p75 | ≤ 2.5초 | Cloud Monitoring + 웹 바이탈 | 출시 즉시 |
| 성능 | API p95 / p99 | ≤ 500ms / ≤ 1s | Sentry Performance | 출시 즉시 |
| 보안 | Critical 이슈 패치 | 30일 내 100% | 펜테스트·스캔 리포트 | 첫 펜테스트 후 (2028-01) |
| 품질 | Lighthouse (성능/접근성/SEO/BP) | ≥ 90 / 95 / 95 / 95 | CI 자동 검사 | 출시 즉시 |
| DR | 복구 훈련 수행 | 연 1회 100% | DR 훈련 리포트 | 2028-01 |
| SEO | 메인 키워드 5개 중 상위 5위 | ≥ 3개 | Google Search Console | 출시 +6개월 |
| GEO | GEO 키워드 노출률 | 측정 시작 | 어드민 GEO 모듈 | v1.1 (2027-08) |
| GEO | GEO 자동 테스트 정확도 | 측정 시작 | GEO cron | v1.2 (2027-12) |
| API 비용 | OpenAI/Perplexity/Anthropic 캡 준수 | 하드 캡 내 100% | API 대시보드 | OpenAI v1.1 / 나머지 v1.2 |

SEO 키워드 순위는 도메인 권위 축적에 6개월이 소요되므로 측정 개시를 출시 +6개월로 둔다. GEO 관련 지표는 해당 모듈 출시 시점부터 측정한다.

## 8.4 모니터링 지표 (목표값 없음 — KPI에서 분리)

판정용 KPI가 아니라 추세 관찰용이며, 대시보드 별도 탭에 둔다.

| 지표 | 소스 | 용도 |
|---|---|---|
| PayPal 분쟁 발생률 | dispute_evidences | 추세 악화 시 대응 |
| 마케팅 확장 동의율 (광고·옥외) | consents | 분쟁 회피 우선, 목표 없음 |
| 패키지별 판매 비율 | bookings | Gold KPI 게이트 추적 |
| 언어·국가별 매출 분포 | payments | 시장 우선순위 판단 |
| 채널별 매출 (KLOOK/KKday/자체) | bookings.source | OTA 의존도 추세 |

## 8.5 KPI 게이트 (자동 경보 연동)

| 게이트 | 조건 | 트리거 시 |
|---|---|---|
| Gold SKU 게이트 | Gold 판매 비율 < Diamond의 10%, 3개월 연속 | Slack #ops + Aiden 카카오, 가격·포지셔닝 재검토 |
| N7 재방문 게이트 | baseline 확정 후 목표 미달 3개월 연속 | 마케팅 전략 재검토 |
| 결제 실패 게이트 | 일간 실패율 5% 초과 | Slack #urgent + Accountant·Manager |
| 스팸 신고 게이트 | complaint 0.1% 초과 | Slack #urgent, 발신 평판 점검 |
| 이메일 전달률 게이트 | delivered < 98% | Slack #content |

## 8.6 어드민 KPI 대시보드 화면 구성

대시보드 상단에 노스스타 8개 카드를 배치하고, 그 아래 경보 섹션(임계치 이탈 항목만 자동 노출), 운영 KPI·기술 KPI는 접이식으로 둔다. 노스스타 지표가 목표 미달이면 자동 배지를 표시하며, KPI 게이트 항목(8.5)은 조건 충족 시 Slack + 카카오톡 자동 발화한다.
---

# 9. 출시 단계 (Release Roadmap)

## 9.1 전체 일정

| 단계 | 기간 | 비고 |
|---|---|---|
| MVP 개발 | 2026-05-19 ~ 2027-03-31 (10.5개월) | 풀스택 1명 |
| 베타 테스트 | 2027-02-15 ~ 2027-03-15 (4주) | M10 |
| MVP 정식 출시 | 2027-03-31 | |
| v1.1 | 2027-04-01 ~ 2027-08-31 (5개월) | C7 정정 — 초기 "+2개월" 폐기 |
| v1.2 | 2027-09-01 ~ 2027-12-31 (4개월) | |
| v2.0 | 2028 Q2~Q3 | 기능 확장 |

> 풀스택 1명 단독 개발이라는 제약에 따라 전체 범위를 유지하되 일정을 10.5개월로 산정한다(옵션 B). 전 범위(5언어·8패키지·결제 2종·GDPR)를 3개월에 완성하려면 시니어 3~4명이 필요하며, 1명으로는 비현실적이다.

## 9.2 MVP 범위 (2026-05-19 ~ 2027-03-31)

**포함** — 5개 언어(한·영·일·중간·중번), 8개 패키지(Gold·Diamond·Premium·1Hour·1Pro·Making Class·꿈길·워크샵), Premium MV(외부팀 사양 납품 + 어드민 업로드, 후속 자동 — C9), KG이니시스 + PayPal, KRW 단일 청구, 멀티룸 대비 슬롯 엔진(STUDIO A만 운영, Redis 락, 외부 채널 수기 등록), 자동 트랜스코딩 + 60일 매직링크, GDPR + 한국 PIPA + 미성년자 동의, 어드민 7개 역할·2FA·감사 로그·대시보드·알림, Channel Talk 5채널, 마케팅(후기·UGC 반자동·친구초대·프로모션·이메일 캠페인), 게스트 + 회원 + 마이페이지, Google·Apple 로그인, B2B 견적·인보이스·CSV·일괄 매직링크.

**MVP SEO/AEO/GEO** — 전역 메타·페이지별 SEO 관리(수동)·SEO 키워드 + GSC API·스키마 템플릿 7종·사이트맵·robots.txt·llms.txt.

**v1.1 이후 이연** — LINE·Kakao 로그인, 고객 2FA(선택), 결제 정보 저장(PG 토큰), AEO·GEO 모듈, AI 생성 보조, 이메일 A/B 테스트(이상 v1.1) / GEO 자동 테스트 cron, 외부 언급 모니터링, 커스텀 스키마 에디터, 통합 성과 대시보드, 모바일 월렛 패스, OTA API 양방향 동기화, 추가 보정 사진 옵션 결제(이상 v1.2) / 외부 백링크 모니터링(v2.0). 라이선스 표기 활성화는 증빙 확보 후 어드민 토글(시점 무관).

## 9.3 MVP 마일스톤 (월 단위)

| 마일스톤 | 기간 | 핵심 산출물 |
|---|---|---|
| M1 | 2026-05~06 | 인프라·도메인 모델, 어드민·사이트 인증 기반, i18n 프레임워크, GA4·PostHog·Sentry 연동 |
| M2 | 2026-06~07 | 패키지 모델(8종)·카탈로그 CMS, 곡 카탈로그, 슬롯 엔진, 어드민 캘린더, 블랙아웃, 예약 Step 1~2 |
| M3 | 2026-07~08 | 결제 통합(KG이니시스 + PayPal), Step 3~4, Redis 슬롯 락, webhook, 영수증 PDF, 환불 처리 |
| M4 | 2026-08~09 | 콘텐츠 업로드 UI, Cloud Storage 재개가능 업로드, Cloud Run Jobs 트랜스코딩, 사진 셀렉트, 매직링크, 다운로드 페이지·후기, 버전 관리 |
| M5 | 2026-09~10 | 동의 모듈, 미성년자 보호자 동의, 약관 버전 관리, 동의 PDF + Object Lock, DSR 큐, GDPR 처리방침 5언어, Dispute Evidence Pack |
| M6 | 2026-10~11 | 게스트→회원 전환, Google·Apple 로그인, 마이페이지, 친구 초대, 어뷰즈 검증, 프로모션 코드 |
| M7 | 2026-11~12 | 어드민 7역할·권한, 감사 로그, 매출 대시보드, 알림 시스템, Channel Talk 5채널 통합 |
| M8 | 2026-12~2027-01 | 후기 모더레이션, 별점 ≤2 알림, 외부 리뷰 통합, UGC 반자동 큐, 이메일 캠페인, B2B 모듈, MV 납품 추적 대시보드 |
| M9 | 2027-01~02 | 5언어 카피 검수, hreflang·구조화 데이터, llms.txt, 모바일 LCP 최적화, 접근성(WCAG AA) |
| M10 | 2027-02-15~03-15 | 베타 테스트 4주(내부 → 외부 30명 → 버그 픽스·SOP → 부하·보안 점검) |
| M11 | 2027-03-16~03-31 | 소프트 런칭, 첫 100건 모니터링, NYT 인용·SNS 출시 공지, 인플루언서 코드 발급 |

## 9.4 검증 게이트 (Quality Gate)

| 게이트 | 시점 | 통과 기준 | 미달 시 |
|---|---|---|---|
| Gate 1 | M3 종료 (2026-08-15) | 한·영 + Diamond 결제 처음~끝 작동 | **진척 80% 미만 시 전체 일정 전면 재산정** |
| Gate 2 | M5 종료 (2026-10-15) | 동의·라이선스·GDPR 모듈 외부 법무 자문 통과 | 일부 기능 v1.1 이연 |
| Gate 3 | M9 종료 (2027-02-14) | 5언어 카피 검수·SEO·성능·접근성 합격 | 언어 축소 또는 출시 지연 |
| Gate 4 | M10 종료 (2027-03-15) | 베타 30명 시나리오 95%+ 무결점 | 출시 2주 연기 (3-31 → 4-15) |

> **R6 조기 판단 규칙**: 일정 리스크는 종반에 터지면 복구 불가하다. Gate 1(M3) 시점에 진척이 계획 대비 80% 미만이면 그 시점에 전체 일정을 전면 재산정한다. M3 시점이면 아직 범위 조정이 가능하다.

## 9.5 v1.1 (2027-04-01 ~ 2027-08-31)

LINE·Kakao 로그인, 고객 2FA(선택), 결제 정보 저장(PG 토큰화), 이메일 A/B 테스트, 추가 보정 사진 옵션 결제, AEO 모듈, GEO 키워드 탭·AI 크롤러 토글·인용 가능성 점수, AI 생성 보조(OpenAI). KPI 게이트 1차 평가(Gold 판매 비율 / Premium MV ROI), 베타 운영 3개월 데이터로 PRD v0.3 개정.

## 9.6 v1.2 (2027-09-01 ~ 2027-12-31)

GEO 자동 테스트 cron(OpenAI·Perplexity·Anthropic API), 외부 언급 모니터링, 커스텀 스키마 에디터, 통합 성과 측정 대시보드, OTA API 양방향 동기화(KLOOK·KKday), 모바일 월렛 패스(Apple·Google Wallet), UGC 외부 SaaS, 세로 하이라이트 자동 생성, 다국어 LLM FAQ 봇.

## 9.7 v2.0 (2028 Q2~Q3)

STUDIO B 활성화(캐파 2배), 시즈널 한정 신규 패키지, 다중 도시 확장 검토(부산·제주), B2B 전용 포털, 외부 백링크 모니터링 도구, 모바일 앱(iOS·Android).

## 9.8 일정 외부 검증 권장 (M1 병행 착수)

KG이니시스 가맹 심사(2~4주)·PayPal Business 심사(1~2주)는 M1 착수와 동시 신청, 카카오 비즈채널 발급(사업자등록증)·솔라피 알림톡 템플릿 검수(영업일 2~3일)도 M1 병행. 법무 자문(GDPR·미성년자·라이선스)은 M5 시점 사전 컨택(자문 일정 2~4주 대기). 외부 코드 리뷰어·번역 검수사도 사전 컨택.

---

# 10. 리스크 통합 (Consolidated Risk Register)

## 10.1 우선순위 매트릭스

발생확률 × 영향도로 분류하며, 우상단(고확률·고영향)이 Critical 7개다.

```
영향도 高 │ R3 OTA더블부킹   │ R1 풀스택1명  R2 라이선스
         │                  │ R4 미성년자   R5 결제실패  R6 일정지연
─────────┼──────────────────┼────────────────────────────────
영향도 中 │ R8 Inngest종속   │ R7 PayPal분쟁  R9 WAF부재  R10 이메일도달  R11 알림피로
─────────┼──────────────────┼────────────────────────────────
영향도 低 │ R12~R24 (모니터링)│ R13 Auth어댑터  R14 MV납품
         └──────────────────┴────────────────────────────────
           발생확률 低         발생확률 中~高
```

## 10.2 Critical 리스크

출시 전 10.5개월 동안 모든 리스크의 실질 담당자는 Aiden 단독이다(Operator·Accountant 미채용). 이 사실 자체가 R1을 키우므로, 외부 코드 리뷰어·법무·번역 검수사를 M1·M5 시점에 사전 컨택하여 부하를 분산하는 것을 운영 원칙으로 한다.

| ID | 리스크 | 완화책 | 트리거 | 출시 전 담당 | 출시 후 담당 |
|---|---|---|---|---|---|
| R1 | 풀스택 1명 번아웃·이탈 | 월 1회 의무 휴가, 격월 외부 코드 리뷰, 게이트 진척 가시화, 핵심 모듈 문서화 강제 | 게이트 미달, 1주+ 커밋 공백 | Aiden | Aiden |
| R2 | MR 라이선스 미확보 (복제·전송권) | 표기 MVP 비활성, 권리 증빙 확보 후 토글 활성, 증빙 Cloud Storage Bucket Lock 5년 | 권리자 항의·내용증명 | Aiden + 법무 | Aiden + 법무 |
| R3 | OTA 더블부킹 (수동 동기화 충돌) | 어드민 수기 등록 + 즉시 마감, 매일 09:00 OTA 점검 SOP, v1.2 API 동기화 | 더블부킹 1건+ | Aiden | Operator |
| R4 | 미성년자 동의 법적 유효성 | 16세 미만 보호자 동의 통일, 이메일 검증, B2B 분리, M5 외부 법무 자문 | 법무 자문 미통과 | Aiden + 법무 | Aiden + 법무 |
| R5 | 외국 카드 결제 실패 (PayPal 단독) | 출시 첫 달 실패 로그 전수 모니터링, 5% 게이트, v1.1 결제수단 재검토 | 일간 결제 실패율 > 5% | Aiden | Accountant |
| R6 | 일정 지연 (이미 현실화된 제약) | M10 2주 버퍼, 게이트 미달 시 v1.1 이연, **M3 게이트 진척 80% 미만 시 전체 일정 재산정** | M3·M5·M9 게이트 미달 | Aiden | — |
| R7 | PayPal 분쟁 입증 곤란 (무형 서비스) | Dispute Evidence Pack 자동 생성, 베타 단계 분쟁 시뮬레이션 | 분쟁 패소율 추세 악화 | Aiden | Accountant |

## 10.3 Medium 리스크 (모니터링)

| ID | 리스크 | 완화책 |
|---|---|---|
| R8 | Inngest 클라우드 종속 (자체 호스팅 불가) | 무료 티어로 시작, BullMQ 마이그레이션 경로 문서화 |
| R9 | Cloudflare Free WAF 부재 | Upstash Ratelimit + Next.js Middleware 자체 검증, 펜테스트 결과 따라 Pro 승격 |
| R10 | 이메일 도달률 (join@ 발신·Resend 단일 ESP) | 트랜잭션/마케팅 발신 서브도메인 분리, 전달률·반송률·스팸신고율 KPI 모니터링 |
| R11 | 알림 피로 (초기 알림 빈도 과다) | 운영 1~2개월 빈도 모니터링, 임계치 조정, 방해금지 시간 설정 |
| R13 | Auth.js v5 LINE·Kakao 커뮤니티 어댑터 | v1.1 착수 시점 안정성 재검증, 대안 Lucia 보유 |
| R14 | 외부 MV팀 납품 지연·사양 미달 | 사양 강제, 납기 세션일+24일(검수 4일 버퍼), 납품 추적 대시보드 D-7/D-3/D-0 자동 알림 |

## 10.4 Low 리스크 (모니터링 목록)

R12 환율 API Free 한도 초과, R15 2FA 디바이스 분실, R16 감사 로그 양 증가(파티셔닝 필요), R17 Cloud Run/CDN 피크 트래픽 청구, R18 Cloud Run Jobs 트랜스코딩 콜드스타트, R19 Apple Relay 이메일 도달, R20 OpenAI/Perplexity API 비용 폭주(하드 캡으로 통제), R21 친구 초대 어뷰즈, R22 외부 리뷰 채널 정책 변동, R23 재가입 7일 쿨다운 우회, R24 Baidu·중국 본토 SEO 미커버. 각 항목은 해당 장의 완화책으로 1차 대응하며, 분기 리스크 리뷰에서 등급 상향 여부를 점검한다.

## 10.5 미해결 이슈 (Open Issues)

리스크("터질 수 있는 것")와 구분되는, 아직 결정되지 않은 항목이다. PRD v0.2 시점에 다음 3건이 열려 있다.

| # | 미해결 이슈 | 해소 예정 | 비고 |
|---|---|---|---|
| O1 | N2·N3·N7 KPI 목표값 (전환율·AOV·재방문) | v0.3 (출시 +3개월 baseline 후) | 8.1에서 "잠정" 표기 중 |
| O2 | 패키지별 사진·영상 포함물 세부 매트릭스 | ✅ 해소 (v0.2, §5.6 확정) | 사진 전 패키지 30컷 동일 / 믹싱 간이·정식 2단계 / 세로영상 Premium 전용 / 단체 결과물 전 단체 공유본 1세트 통일(Making Class 공유본 리스크는 출시 후 관찰) |
| O3 | 가격 모델링 (경쟁사 리서치 + 단위원가) | 별도 문서, 즉시 착수 권장 | v0.1부터 보류돼 온 최우선 미해결 항목 |

> **O3 경고**: 5.2의 패키지 가격(Gold 40만·Diamond 50만·Premium 150만)은 이미 확정값이나, 단위원가(엔지니어 인건비 + 룸 시간당 비용 + 라이선스료) 기반으로 검증된 숫자가 아니다. 친구 초대 10%·프로모션 코드·OTA 수수료를 모두 반영했을 때 패키지별 마진이 플러스인지 확인되지 않은 상태이므로, 개발 착수 전 가격 모델링을 완료해야 한다.

---

# 부록 A. 문서 상태 요약

| 장 | 내용 | 상태 |
|---|---|---|
| 1–4 | 배경·목표·타겟·시나리오 | ✅ Lock |
| 5.1–5.10 | 기능 요구사항 | ✅ Lock |
| 6 | 비기능 요구사항 | ✅ Lock |
| 7 | 기술 스택 | ✅ Lock |
| 8 | KPI 통합 | ✅ Lock |
| 9 | 출시 단계 | ✅ Lock |
| 10 | 리스크 통합 | ✅ Lock |

# 부록 B. 다음 단계 권장 순서

1. **PRD v0.2 정합 검증 완료** — 본 문서 (C1–C13 정정 반영 완료).
2. **O3 가격 모델링 착수** — 경쟁사 리서치 + 단위원가 분석, 별도 문서. 개발 착수 전 필수 선행.
3. **O2 포함물 매트릭스 확정** — M2 개발 착수 전.
4. **M1 개발 착수** — 2026-05-19. PG 가맹·카카오 비즈채널·법무·번역 검수사 사전 컨택 병행.
5. **v0.3 개정** — MVP 출시 +3개월 baseline 데이터로 O1(N2·N3·N7 목표값) 확정.

*— 문서 끝 —*
