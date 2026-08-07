# KG이니시스 테스트 연동 슬라이스 스펙 v1 (2026-08-07) — Gate 1b 트랙 ①

> 목적: **다음 주 가맹 심사 신청 시점에 사이트에서 결제 흐름이 작동**(오너 요건 2026-08-07)하도록
> 이니시스 표준결제 sandbox 연동을 선행한다. 실 키 교체는 심사 통과 후(§7-B 시크릿 정책).
> 읽은 문서: CLAUDE.md §3(하드제약 2·3·6·7)·§4(위험 구역: 결제 webhook), PRD §5.5(결제 흐름·
> 수수료·동의)·§5.3(동시성 C19), `lib/payment/types.ts`(어댑터 심), booking confirm 흐름.

## 1. 현 구조 실측

- 결제 심 = `PaymentGateway.capture/refund` 단일 서버 호출(`lib/payment/index.ts` → Mock).
- 체크아웃: `/booking/checkout` → `POST /api/booking/confirm` → `gateway.capture()` 성공 시
  `confirmBooking`(Booking confirmed + Payment paid 단일 트랜잭션, C19 락+EXCLUDE).
- Gate 1a 통과(2026-08-07): 이 경로로 한·영 Diamond 처음~끝 확인.

## 2. 이니시스 표준결제(INIStdPay)와의 구조 차이

이니시스 웹표준 결제는 3단이다: ① 브라우저에서 결제창 호출(SDK, mid·oid·price·signature)
② 고객 인증 완료 → **returnUrl 로 POST**(authToken·authUrl) ③ 서버가 authUrl 로 **승인 API**
호출 → 실제 청구 발생. 즉 "capture" = ③ 승인이며, 단일 서버 호출로 시작할 수 없다.

## 3. 설계 — OPEN DECISION 확정 (2026-08-07 Aiden)

- **범위 = 동기 수단만**: 카드·네이버페이·카카오페이(표준창 동기 승인) + 망취소. 가상계좌·노티 이연.
- **계약 = 2단 신설**: `prepareCheckout` + `approve`. Mock·PayPal 은 기존 capture 유지.

- **어댑터 계약 확장**: `PaymentGateway` 에 redirect 계열 2단 계약 추가 —
  `prepareCheckout(bookingDraft) → {form fields|redirect params}` + `approve(authParams) →
  CaptureResult`. Mock·(향후) PayPal 은 기존 capture 경로 유지(호출측 분기 없음 — pg 별
  capability 로 라우팅).
- **신규 라우트**: `POST /api/payment/inicis/return`(인증 결과 수신 → 승인 → confirmBooking →
  결제 완료 화면 redirect), `POST /api/payment/inicis/close`(창 닫힘). 승인 실패·오류 시
  **망취소(netCancel)** 로 청구 원복.
- **위험 구역 체크(§4) — 사람 검증 필수**:
  1. 금액 위변조: 승인 응답 `price` == 서버 보관 예약 스냅샷 금액(클라이언트 값 불신).
  2. 중복 방지: oid = 예약 draft 키(idempotency) — 재승인·재전송 시 기존 결과 반환,
     confirmBooking 경합 패배(23P01) 시 자동 환불(기존 경로 재사용).
  3. signature 검증(SHA256, signKey 서버 전용 — 클라이언트 번들 유입 금지 §3.7).
- **시크릿**: 공개 테스트 상점(INIpayTest — mid/signKey 는 이니시스 공개 문서 값)으로 개발.
  `.env`(gitignore) 주입, 실 키는 심사 통과 후 Railway env 로만.
- **범위 밖(이연)**: 가상계좌·휴대폰 등 비동기 수단 + 정산 노티 webhook(PRD §5.5 — "수단별
  분류는 연동 시 확정"이나 MVP 동기 수단만 슬롯 확정), 현금영수증, PayPal 실 어댑터(트랙 ②),
  영수증 PDF(별도 슬라이스).
- **게이트**: tsc·lint·vitest(승인 흐름 단위 — 서명·금액 검증)·e2e(표준창은 외부 도메인이라
  자동화 한계 → return 라우트 위변조·중복 케이스는 request 레벨 e2e)·build. 수동 검증:
  테스트 카드로 결제창 처음~끝 1회(오너 또는 개발자 실기).
