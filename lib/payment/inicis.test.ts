// InicisGateway 단위 — §4 위험 구역 핵심 3종: 서명 규격·금액 위변조 망취소·승인 실패 처리.
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InicisGateway } from './inicis';

const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
const gw = new InicisGateway();

const approveInput = {
  authToken: 'tok',
  authUrl: 'https://stg.inicis.test/approve',
  netCancelUrl: 'https://stg.inicis.test/netcancel',
  oid: 'draft_1',
  expectedAmountKrw: 500000,
};

afterEach(() => vi.restoreAllMocks());

describe('prepareCheckout', () => {
  it('서명 = sha256(oid&price&timestamp), signKey 는 폼에 원문 노출 금지', () => {
    const p = gw.prepareCheckout({
      oid: 'draft_1',
      amountKrw: 500000,
      goodName: 'Diamond',
      buyerName: 'Test',
      buyerEmail: 't@t.local',
      returnUrl: 'https://x/return',
      closeUrl: 'https://x/close',
    });
    const f = p.formFields;
    expect(f.signature).toBe(sha256(`oid=draft_1&price=500000&timestamp=${f.timestamp}`));
    expect(f.currency).toBe('WON');
    expect(Object.values(f)).not.toContain('SU5JTElURV9UUklQTEVERVNfS0VZU1RS');
  });
});

describe('approve', () => {
  it('금액 불일치 → 망취소 호출 + amount_mismatch', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        calls.push(String(url));
        return {
          ok: true,
          json: async () =>
            String(url).includes('approve')
              ? { resultCode: '0000', TotPrice: 400000, tid: 'tid1' }
              : { resultCode: '0000' },
        };
      }),
    );
    const r = await gw.approve(approveInput);
    expect(r).toEqual({ ok: false, reason: 'amount_mismatch' });
    expect(calls.some((u) => u.includes('netcancel'))).toBe(true);
  });

  it('정상 승인 → tid·수수료 스냅샷', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ resultCode: '0000', TotPrice: 500000, tid: 'tid_ok' }),
      })),
    );
    const r = await gw.approve(approveInput);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.pgTransactionId).toBe('tid_ok');
  });

  it('승인 요청 실패 → 망취소 시도 + approve_request_failed', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        calls.push(String(url));
        if (String(url).includes('approve')) throw new Error('down');
        return { ok: true, json: async () => ({}) };
      }),
    );
    const r = await gw.approve(approveInput);
    expect(r).toEqual({ ok: false, reason: 'approve_request_failed' });
    expect(calls.some((u) => u.includes('netcancel'))).toBe(true);
  });
});
