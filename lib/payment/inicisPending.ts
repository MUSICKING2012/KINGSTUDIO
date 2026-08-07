// 이니시스 표준결제 진행중(pending)·완료(done) 주문 레코드 — Upstash Redis (Inicis_Slice_Spec §3).
//
// prepare 시점에 서버가 검증·재계산한 요청 payload + 최종 금액을 oid(주문번호) 키로 저장하고,
// return(인증 결과 수신) 시점에 **원자적으로 claim(GETDEL)** 해 소비한다 — 동일 oid 의 동시
// 재전송이 이중 승인으로 이어지지 않게 하는 1차 방벽. 승인·예약 기록까지 끝나면 done 레코드를
// 남겨 이니시스의 returnUrl 재전송(브라우저 새로고침 포함)을 멱등 성공 redirect 로 흡수한다.
//
// TTL: pending 900초(슬롯 락 §3.3 과 동일 15분 — 결제창 체류 상한), done 24시간(재전송 흡수용).
// 저장 payload 는 서버가 이미 형태 검증한 값이며, 금액 진실은 어차피 return 재검증 + 승인 응답
// 대조(expectedAmountKrw)로 다시 확인한다. PII 는 Redis 에 15분 한정 보관(목적 제한, §3.6 로그 아님).

import type { ConfirmRequestBody } from '@/lib/booking/confirmRequest';
import { getRedis } from '@/lib/redis/client';

const PENDING_TTL_S = 900; // 15 min — 결제창 진입~인증 완료 허용 시간
const DONE_TTL_S = 86_400; // 24 h — returnUrl 중복 재전송 멱등 흡수 창

export type InicisPendingOrder = {
  payload: ConfirmRequestBody;
  finalTotalKrw: number; // 서버 재계산 최종 청구액(KRW) — 승인 금액 대조 기준(§4 금액 위변조)
  userId: string | null; // prepare 시점 세션의 userId — return 은 크로스사이트 POST 라 세션 부재
};

export type InicisCompletedOrder = { bookingId: string; totalKrw: number };

const pendingKey = (oid: string) => `inicis_pending:${oid}`;
const doneKey = (oid: string) => `inicis_done:${oid}`;

export async function putPendingInicisOrder(
  oid: string,
  record: InicisPendingOrder,
): Promise<void> {
  await getRedis().set(pendingKey(oid), record, { ex: PENDING_TTL_S });
}

/** 원자 claim — 첫 호출만 레코드를 받고 이후 호출은 null (동시 재전송 직렬화). */
export async function claimPendingInicisOrder(oid: string): Promise<InicisPendingOrder | null> {
  return await getRedis().getdel<InicisPendingOrder>(pendingKey(oid));
}

export async function putCompletedInicisOrder(
  oid: string,
  record: InicisCompletedOrder,
): Promise<void> {
  await getRedis().set(doneKey(oid), record, { ex: DONE_TTL_S });
}

export async function getCompletedInicisOrder(oid: string): Promise<InicisCompletedOrder | null> {
  return await getRedis().get<InicisCompletedOrder>(doneKey(oid));
}
