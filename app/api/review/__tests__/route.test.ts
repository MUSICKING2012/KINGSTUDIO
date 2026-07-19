import { beforeEach, describe, expect, it, vi } from 'vitest';

// Stage F review route unit tests (mirrors the E2 reissue route.test.ts pattern).
// submitReview is replaced but ReviewSubmitSchema is NOT: the 400 cases must exercise the real
// Zod schema, otherwise this file would only be testing its own mock.

const { mockCheckRateLimit, mockSubmitReview } = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn(),
  mockSubmitReview: vi.fn(),
}));

vi.mock('@/lib/review/rateLimit', () => ({ checkReviewRateLimit: mockCheckRateLimit }));
vi.mock('@/lib/review/submit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/review/submit')>();
  return { ...actual, submitReview: mockSubmitReview };
});
// submit.ts is loaded for real (schema), so its prisma import must not build a live client.
vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));

import { POST } from '../route';

const TOKEN = 'magic-token-must-never-be-echoed-42';

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    rating: 5,
    tags: ['vocal_directing'],
    body: 'great',
    locale: 'ko',
    token: TOKEN,
    ...overrides,
  };
}

function makeReq(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/review', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  // Re-armed every test: vi.resetAllMocks() strips implementations set at module init.
  mockCheckRateLimit.mockResolvedValue({ allowed: true, count: 1 });
  mockSubmitReview.mockResolvedValue({ ok: true, reviewId: 'rv_1' });
});

describe('POST /api/review — throttle + input', () => {
  it('429 when the per-IP limit is exceeded, before any submission', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, count: 6 });
    const res = await POST(makeReq(validBody()));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'rate_limited' });
    expect(mockSubmitReview).not.toHaveBeenCalled();
  });

  it('400 on a non-JSON body', async () => {
    const res = await POST(makeReq('not-json'));
    expect(res.status).toBe(400);
    expect(mockSubmitReview).not.toHaveBeenCalled();
  });

  it('400 on every schema violation (real ReviewSubmitSchema)', async () => {
    const bad = [
      {},
      validBody({ rating: 0 }),
      validBody({ rating: 6 }),
      validBody({ rating: 4.5 }),
      validBody({ tags: [] }),
      validBody({ tags: ['not_a_tag'] }),
      validBody({ tags: ['a', 'b', 'c', 'd', 'e', 'f'] }),
      validBody({ body: 'x'.repeat(501) }),
      validBody({ locale: 'fr' }),
      validBody({ token: 42 }),
    ];
    for (const body of bad) {
      const res = await POST(makeReq(body));
      expect(res.status).toBe(400);
    }
    expect(mockSubmitReview).not.toHaveBeenCalled();
  });
});

// Prisma enum members are zh_HK / zh_CN (@map to the hyphenated DB values). A form that posts
// the next-intl URL locale verbatim would be rejected — the client must convert - to _.
describe('POST /api/review — locale enum contract', () => {
  it('rejects the hyphenated locale and accepts the enum member', async () => {
    expect((await POST(makeReq(validBody({ locale: 'zh-CN' })))).status).toBe(400);
    expect((await POST(makeReq(validBody({ locale: 'zh_CN' })))).status).toBe(201);
  });

  it('never echoes the token in a validation failure (하드제약 #6)', async () => {
    const res = await POST(makeReq(validBody({ rating: 99 })));
    expect(await res.text()).not.toContain(TOKEN);
  });
});

describe('POST /api/review — client IP resolution', () => {
  it('uses the first x-forwarded-for entry', async () => {
    await POST(makeReq(validBody(), { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }));
    expect(mockCheckRateLimit).toHaveBeenCalledWith('203.0.113.9');
  });

  it('falls back to x-real-ip', async () => {
    await POST(makeReq(validBody(), { 'x-real-ip': '198.51.100.7' }));
    expect(mockCheckRateLimit).toHaveBeenCalledWith('198.51.100.7');
  });

  it('passes null when no IP header is present', async () => {
    await POST(makeReq(validBody()));
    expect(mockCheckRateLimit).toHaveBeenCalledWith(null);
  });
});

describe('POST /api/review — outcome mapping', () => {
  it('404 not_found / 410 revoked / 410 expired / 409 already_reviewed', async () => {
    const cases = [
      ['not_found', 404],
      ['revoked', 410],
      ['expired', 410],
      ['already_reviewed', 409],
    ] as const;
    for (const [reason, status] of cases) {
      mockSubmitReview.mockResolvedValue({ ok: false, reason });
      const res = await POST(makeReq(validBody()));
      expect(res.status).toBe(status);
      expect(await res.json()).toEqual({ error: reason });
    }
  });

  it('201 happy path — returns the review id and no token', async () => {
    const res = await POST(makeReq(validBody()));
    expect(res.status).toBe(201);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ ok: true, reviewId: 'rv_1' });
    expect(text).not.toContain(TOKEN);
    expect(mockSubmitReview).toHaveBeenCalledWith(expect.objectContaining({ token: TOKEN }));
  });

  it('propagates unexpected submitReview failures instead of masking them as a 4xx', async () => {
    mockSubmitReview.mockRejectedValue(new Error('connection lost'));
    await expect(POST(makeReq(validBody()))).rejects.toThrow('connection lost');
  });
});
