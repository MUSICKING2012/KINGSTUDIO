import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { type ConfirmRequestBody, prepareBookingConfirm } from '@/lib/booking/confirmRequest';
import { inicisGateway } from '@/lib/payment';
import { putPendingInicisOrder } from '@/lib/payment/inicisPending';

// KG이니시스 표준결제 1단 — 결제창 진입 준비 (⚠ 위험 구역 작업 중 — 검증 필요, Inicis_Slice_Spec §3).
// /api/booking/confirm 과 동일한 payload 를 받아 동일한 검증·가격 재계산(공유 파이프라인)을 수행하되
// 캡처 대신: oid 발급 → Redis pending 저장(payload+서버 재계산 금액, TTL 900s) → 결제창 폼 파라미터
// (서명 포함, signKey 는 서버 전용 §3.7) 반환. 실청구는 return 라우트의 승인 단계에서만 발생한다.
// 금액의 진실은 여기 저장된 서버 재계산값 — 클라이언트가 보낸 금액은 어디에도 쓰지 않는다(§4).
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  let body: ConfirmRequestBody;
  try {
    body = (await request.json()) as ConfirmRequestBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // 이 라우트는 이니시스 전용 — 다른 pg 로 결제창 파라미터를 만들 이유가 없다.
  if (body.pg !== 'inicis') {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 });
  }

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

  const prep = await prepareBookingConfirm(body, userId);
  if (!prep.ok) {
    return NextResponse.json(prep.body, { status: prep.status });
  }
  const { ctx } = prep;

  // oid = 주문번호(이니시스 왕복 식별자). 매 시도 새로 발급 — 재시도는 새 prepare 로 시작한다.
  const oid = randomUUID();

  // return/close 는 이니시스가 브라우저 최상위 내비게이션으로 POST 하는 절대 URL. 쿼리에 locale·
  // package 를 실어 pending 이 만료된 실패 경로에서도 사용자를 제 화면으로 돌려보낸다(값은 이미 검증됨).
  const origin = new URL(request.url).origin;
  const ret = new URL('/api/payment/inicis/return', origin);
  ret.searchParams.set('locale', ctx.locale);
  ret.searchParams.set('package', ctx.packageSlug);
  const close = new URL('/api/payment/inicis/close', origin);
  close.searchParams.set('locale', ctx.locale);
  close.searchParams.set('package', ctx.packageSlug);

  await putPendingInicisOrder(oid, {
    payload: body,
    finalTotalKrw: ctx.finalTotalKrw,
    userId,
  });

  const prepared = inicisGateway.prepareCheckout({
    oid,
    amountKrw: ctx.finalTotalKrw,
    goodName: `KING STUDIO ${ctx.pkg.name}`,
    buyerName: ctx.reservant.name || ctx.reservant.email,
    buyerEmail: ctx.reservant.email,
    returnUrl: ret.toString(),
    closeUrl: close.toString(),
  });

  // formFields 에는 서버 전용 키가 없다(서명·mKey 는 해시 산출물 — PreparedCheckout 계약 §3.7).
  return NextResponse.json({
    ok: true,
    oid,
    scriptUrl: prepared.scriptUrl,
    formFields: prepared.formFields,
  });
}
