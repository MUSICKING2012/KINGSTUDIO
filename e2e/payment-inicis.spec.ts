import { expect, test } from '@playwright/test';

/**
 * 이니시스 return 라우트 방어선 (request 레벨 — 위험 구역 §4 / Inicis_Slice_Spec §3).
 * 표준결제창 자체는 외부 도메인이라 자동화 범위 밖 — 여기서는 인증 결과 수신부의
 * 거부·멱등 경로만 고정한다. 세 경로 모두 승인 API 호출 前 차단이라 실 청구가 없다.
 */

const RETURN_PATH = '/api/payment/inicis/return?locale=en&package=diamond';

function form(fields: Record<string, string>) {
  return { form: fields, maxRedirects: 0 };
}

test('인증 실패(resultCode≠0000) → 303 fail redirect (청구 없음)', async ({ request }) => {
  const res = await request.post(RETURN_PATH, {
    ...form({ resultCode: '9999', authToken: 't', authUrl: 'https://x', netCancelUrl: 'https://x' }),
  });
  expect(res.status()).toBe(303);
  expect(res.headers().location).toContain('inicis=fail');
  expect(res.headers().location).toContain('code=payment_auth_failed');
});

test('위조 authUrl(비 inicis 도메인) → 승인·망취소 호출 없이 거부', async ({ request }) => {
  const res = await request.post(RETURN_PATH, {
    ...form({
      resultCode: '0000',
      authToken: 'tok',
      orderNumber: 'e2e-forged-oid',
      authUrl: 'https://evil.example.com/approve',
      netCancelUrl: 'https://evil.example.com/netcancel',
    }),
  });
  expect(res.status()).toBe(303);
  expect(res.headers().location).toContain('code=payment_failed');
});

test('미존재 oid(pending 만료·위조) → payment_expired (청구 없음)', async ({ request }) => {
  const res = await request.post(RETURN_PATH, {
    ...form({
      resultCode: '0000',
      authToken: 'tok',
      orderNumber: `e2e-nonexistent-${Date.now()}`,
      authUrl: 'https://stgstdpay.inicis.com/approve',
      netCancelUrl: 'https://stgstdpay.inicis.com/netcancel',
    }),
  });
  expect(res.status()).toBe(303);
  expect(res.headers().location).toContain('code=payment_expired');
});
