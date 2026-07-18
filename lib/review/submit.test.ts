import { Locale, ReviewTag } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  resolveMagicLink: vi.fn(),
  bookingFindUnique: vi.fn(),
  reviewCreate: vi.fn(),
}));

vi.mock('@/lib/download/verify', () => ({ resolveMagicLink: h.resolveMagicLink }));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    booking: { findUnique: h.bookingFindUnique },
    review: { create: h.reviewCreate },
  },
}));

import { ReviewSubmitSchema, submitReview } from './submit';

const TOKEN = 'tok_secret_do_not_leak_0123456789';
const SNAPSHOT = { name: 'DIAMOND', priceKrw: 330000 };

function validInput(over: Record<string, unknown> = {}) {
  return {
    rating: 5,
    tags: [ReviewTag.vocal_directing],
    body: '  great session  ',
    locale: Locale.en,
    token: TOKEN,
    ...over,
  };
}

function resolvedOk() {
  return {
    ok: true,
    magicLinkId: 'ml_1',
    expiresAt: new Date(),
    booking: { id: 'bk_1' },
    items: [],
  };
}

beforeEach(() => {
  h.resolveMagicLink.mockReset();
  h.bookingFindUnique.mockReset();
  h.reviewCreate.mockReset();
});

describe('ReviewSubmitSchema', () => {
  it('accepts a valid payload', () => {
    expect(ReviewSubmitSchema.safeParse(validInput()).success).toBe(true);
  });

  it('rejects rating outside 1–5 and non-integers', () => {
    for (const rating of [0, 6, 4.5]) {
      expect(ReviewSubmitSchema.safeParse(validInput({ rating })).success).toBe(false);
    }
  });

  it('requires 1–5 tags from the enum', () => {
    expect(ReviewSubmitSchema.safeParse(validInput({ tags: [] })).success).toBe(false);
    expect(ReviewSubmitSchema.safeParse(validInput({ tags: ['not_a_tag'] })).success).toBe(false);
    const six = [
      ReviewTag.vocal_directing,
      ReviewTag.audio_quality,
      ReviewTag.photo_video,
      ReviewTag.facility,
      ReviewTag.staff_friendliness,
      ReviewTag.value_for_money,
    ];
    expect(ReviewSubmitSchema.safeParse(validInput({ tags: six })).success).toBe(false);
  });

  it('caps body at 500 chars and allows omitting it', () => {
    expect(ReviewSubmitSchema.safeParse(validInput({ body: 'x'.repeat(500) })).success).toBe(true);
    expect(ReviewSubmitSchema.safeParse(validInput({ body: 'x'.repeat(501) })).success).toBe(false);
    const { body: _drop, ...noBody } = validInput();
    expect(ReviewSubmitSchema.safeParse(noBody).success).toBe(true);
  });

  it('rejects a locale outside the Locale enum', () => {
    expect(ReviewSubmitSchema.safeParse(validInput({ locale: 'de' })).success).toBe(false);
  });

  // 하드제약 #6: the raw token must never surface in validation diagnostics.
  it('never echoes the token in validation errors', () => {
    const result = ReviewSubmitSchema.safeParse(validInput({ rating: 99 }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(JSON.stringify(result.error.issues)).not.toContain(TOKEN);
    }
  });
});

describe('submitReview', () => {
  it('creates the review and returns its id', async () => {
    h.resolveMagicLink.mockResolvedValue(resolvedOk());
    h.bookingFindUnique.mockResolvedValue({ customerName: '김민수', packageSnapshot: SNAPSHOT });
    h.reviewCreate.mockResolvedValue({ id: 'rv_1' });

    await expect(submitReview(validInput() as never)).resolves.toEqual({
      ok: true,
      reviewId: 'rv_1',
    });

    const { data } = h.reviewCreate.mock.calls[0][0];
    expect(data.bookingId).toBe('bk_1');
    expect(data.authorDisplay).toBe('김*수');
    expect(data.authorNameSnapshot).toBe('김민수');
    expect(data.packageSnapshot).toEqual(SNAPSHOT);
    expect(data.language).toBe(Locale.en);
    expect(data.body).toBe('great session');
  });

  // The download page already touched the link on entry; submitting must not double-count.
  it('resolves the link without touching access stats', async () => {
    h.resolveMagicLink.mockResolvedValue(resolvedOk());
    h.bookingFindUnique.mockResolvedValue({ customerName: 'Jane Doe', packageSnapshot: SNAPSHOT });
    h.reviewCreate.mockResolvedValue({ id: 'rv_2' });

    await submitReview(validInput() as never);
    expect(h.resolveMagicLink).toHaveBeenCalledWith(TOKEN, { touch: false });
  });

  it('passes through link rejections untouched', async () => {
    for (const reason of ['not_found', 'revoked', 'expired'] as const) {
      h.resolveMagicLink.mockResolvedValue({ ok: false, reason });
      await expect(submitReview(validInput() as never)).resolves.toEqual({ ok: false, reason });
      expect(h.reviewCreate).not.toHaveBeenCalled();
    }
  });

  it('reports not_found when the booking vanished under a live link', async () => {
    h.resolveMagicLink.mockResolvedValue(resolvedOk());
    h.bookingFindUnique.mockResolvedValue(null);
    await expect(submitReview(validInput() as never)).resolves.toEqual({
      ok: false,
      reason: 'not_found',
    });
    expect(h.reviewCreate).not.toHaveBeenCalled();
  });

  it('falls back to Guest when the booking has no customer name', async () => {
    h.resolveMagicLink.mockResolvedValue(resolvedOk());
    h.bookingFindUnique.mockResolvedValue({ customerName: null, packageSnapshot: SNAPSHOT });
    h.reviewCreate.mockResolvedValue({ id: 'rv_3' });

    await submitReview(validInput() as never);
    const { data } = h.reviewCreate.mock.calls[0][0];
    expect(data.authorDisplay).toBe('Guest');
    expect(data.authorNameSnapshot).toBeNull();
  });

  it('normalizes a whitespace-only body to null', async () => {
    h.resolveMagicLink.mockResolvedValue(resolvedOk());
    h.bookingFindUnique.mockResolvedValue({ customerName: 'Jane Doe', packageSnapshot: SNAPSHOT });
    h.reviewCreate.mockResolvedValue({ id: 'rv_4' });

    await submitReview(validInput({ body: '   ' }) as never);
    expect(h.reviewCreate.mock.calls[0][0].data.body).toBeNull();
  });

  it('maps the unique violation to already_reviewed', async () => {
    h.resolveMagicLink.mockResolvedValue(resolvedOk());
    h.bookingFindUnique.mockResolvedValue({ customerName: 'Jane Doe', packageSnapshot: SNAPSHOT });
    h.reviewCreate.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));

    await expect(submitReview(validInput() as never)).resolves.toEqual({
      ok: false,
      reason: 'already_reviewed',
    });
  });

  // Only P2002 is a business outcome; every other failure must stay a failure.
  it('rethrows database errors that are not unique violations', async () => {
    h.resolveMagicLink.mockResolvedValue(resolvedOk());
    h.bookingFindUnique.mockResolvedValue({ customerName: 'Jane Doe', packageSnapshot: SNAPSHOT });
    h.reviewCreate.mockRejectedValue(
      Object.assign(new Error('connection lost'), { code: 'P1001' }),
    );

    await expect(submitReview(validInput() as never)).rejects.toThrow('connection lost');
  });
});
