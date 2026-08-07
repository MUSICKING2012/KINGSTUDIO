// KG이니시스 표준결제(INIStdPay) 어댑터 — sandbox (Payment_Inicis_Slice_Spec §3).
// ⚠ 위험 구역(§4 결제 webhook 계열): 금액 위변조 검증·중복 방지·서명 — 머지 전 사람 검증 필수.
//
// 키: 공개 테스트 상점(INIpayTest — 이니시스 공개 문서 값)을 기본값으로 두되 env 로 오버라이드.
// 실 키는 가맹 심사 통과 후 Railway env 로만 주입(§3.7 — signKey 는 서버 전용, 클라 번들 금지).
import { createHash } from 'node:crypto';
import type {
  ApproveInput,
  CaptureResult,
  PrepareCheckoutInput,
  PreparedCheckout,
  RedirectPaymentGateway,
  RefundInput,
  RefundResult,
} from './types';

const MID = process.env.INICIS_MID ?? 'INIpayTest';
const SIGN_KEY = process.env.INICIS_SIGN_KEY ?? 'SU5JTElURV9UUklQTEVERVNfS0VZU1RS'; // 공개 테스트 키
const STDPAY_JS = process.env.INICIS_STDPAY_JS ?? 'https://stgstdpay.inicis.com/stdjs/INIStdPay.js';

const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

/** 망취소에 필요한 최소 입력 — ApproveInput 의 부분집합(구조적 호환). */
export type NetCancelInput = { authToken: string; netCancelUrl: string; oid: string };

/** 이니시스 승인/망취소 공통 페이로드 (문서 규격 — timestamp·signature 재계산). */
function authPayload(authToken: string) {
  const timestamp = String(Date.now());
  return {
    mid: MID,
    authToken,
    timestamp,
    signature: sha256(`authToken=${authToken}&timestamp=${timestamp}`),
    charset: 'UTF-8',
    format: 'JSON',
  };
}

async function postForm(url: string, fields: Record<string, string>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
  });
  if (!res.ok) throw new Error(`inicis http ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

export class InicisGateway implements RedirectPaymentGateway {
  prepareCheckout(input: PrepareCheckoutInput): PreparedCheckout {
    const timestamp = String(Date.now());
    const price = String(input.amountKrw);
    return {
      kind: 'inicis-stdpay',
      scriptUrl: STDPAY_JS,
      formFields: {
        version: '1.0',
        gopaymethod: '', // 표준창이 동기 수단(카드·간편결제) 노출 — 범위 결정(동기만)
        mid: MID,
        oid: input.oid,
        price,
        timestamp,
        use_chkfake: 'Y',
        signature: sha256(`oid=${input.oid}&price=${price}&timestamp=${timestamp}`),
        verification: sha256(
          `oid=${input.oid}&price=${price}&signKey=${SIGN_KEY}&timestamp=${timestamp}`,
        ),
        mKey: sha256(SIGN_KEY),
        currency: 'WON', // KRW 단일 청구(하드제약 #2)
        goodname: input.goodName,
        buyername: input.buyerName,
        buyeremail: input.buyerEmail,
        returnUrl: input.returnUrl,
        closeUrl: input.closeUrl,
        acceptmethod: 'below1000', // 테스트 소액 허용(sandbox 전용 편의)
      },
    };
  }

  async approve(input: ApproveInput): Promise<CaptureResult> {
    let data: Record<string, unknown>;
    try {
      data = await postForm(input.authUrl, authPayload(input.authToken));
    } catch {
      // 승인 요청 자체가 실패 — 청구 상태 불명이므로 망취소로 원복 시도(중복 청구 방지).
      await this.netCancel(input);
      return { ok: false, reason: 'approve_request_failed' };
    }
    const resultCode = String(data.resultCode ?? '');
    const totPrice = Number(data.TotPrice ?? data.price ?? Number.NaN);
    const tid = String(data.tid ?? '');
    if (resultCode !== '0000') {
      return { ok: false, reason: `inicis_${resultCode || 'unknown'}` };
    }
    // 금액 위변조 검증(§4): 승인 응답 금액 ≠ 서버 스냅샷이면 즉시 망취소.
    if (!Number.isInteger(totPrice) || totPrice !== input.expectedAmountKrw || !tid) {
      await this.netCancel(input);
      return { ok: false, reason: 'amount_mismatch' };
    }
    // PG 수수료는 실 정산과 무관하게 §5.5 고지 수수료율로 스냅샷(기존 fees 테이블 재사용).
    const { computePgFeeKrw } = await import('./fees');
    return { ok: true, pgTransactionId: tid, pgFeeKrw: computePgFeeKrw('inicis', totPrice) };
  }

  // public: 승인 성공 後 예약 기록 실패(슬롯 경합 패배·동의 가드 등) 시 호출부가 청구를 원복하는
  // 경로(§5.5-D의 이니시스 판 — 환불 API 대신 망취소). 실패해도 던지지 않는다(수동 대사 대상).
  async netCancel(input: NetCancelInput): Promise<void> {
    try {
      await postForm(input.netCancelUrl, authPayload(input.authToken));
    } catch {
      // 망취소 실패는 로깅 대상(금액·PII 없이) — 후속 수동 대사 필요.
      console.error(`[inicis] netCancel failed (oid=${input.oid})`);
    }
  }

  // 환불(취소 API)은 별도 키(INIAPI key) 규격 — 이번 범위 밖. 인터페이스 정합용 스텁.
  async refund(_input: RefundInput): Promise<RefundResult> {
    return { ok: false, reason: 'inicis_refund_not_implemented_in_sandbox_slice' };
  }
}

export const inicisGateway = new InicisGateway();
