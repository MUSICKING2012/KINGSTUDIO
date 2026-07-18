import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/db/prisma';
import {
  BookingNotFoundError,
  MAGIC_LINK_TTL_DAYS,
  issueMagicLink,
  reissueMagicLink,
} from './magicLink';
import { hashMagicToken } from './token';
import { resolveMagicLink } from './verify';

// Integration tests (real DB): issue/reissue invariants + resolve (C15/C6). Fully self-isolated —
// a dedicated room+package+bookings created here, scoped-deleted afterAll (no TRUNCATE, no shared
// seed dependency: the direction Handoff §5 asks new tests to take).

const RUN = randomUUID().slice(0, 8);

async function createFixtureBooking(opts: { withDeliverables?: boolean } = {}) {
  const room = await prisma.room.upsert({
    where: { name: `E1 TEST ROOM ${RUN}` },
    update: {},
    create: { name: `E1 TEST ROOM ${RUN}`, isActive: false },
  });
  const pkg = await prisma.package.upsert({
    where: { slug: `e1-test-${RUN}` },
    update: {},
    create: {
      slug: `e1-test-${RUN}`,
      category: 'experience',
      name: 'E1 Test Gold',
      basePriceKrw: 400_000,
      pricingMode: 'per_person_x1_5',
      slotMinutes: 120,
      headcountMax: 2,
      languagesAvailable: ['en'],
      isActive: false,
    },
  });
  // Far-future date, unique per booking → no overlap with anything (exclusion constraint safe).
  const day = 40_000 + Math.floor(Math.random() * 10_000);
  const date = new Date(Date.now() + day * 86_400_000);
  const booking = await prisma.booking.create({
    data: {
      packageId: pkg.id,
      roomId: room.id,
      status: 'completed',
      date,
      startTime: new Date('1970-01-01T10:00:00Z'),
      endTime: new Date('1970-01-01T12:00:00Z'),
      headcount: 1,
      customerEmail: `e1-${RUN}@test.invalid`,
      priceTotalKrw: 400_000,
      unitPriceKrw: 400_000,
      pricingSnapshot: {},
      refundPolicySnapshot: {},
      packageSnapshot: { name: 'E1 Test Gold' },
      deliverables: opts.withDeliverables
        ? {
            create: [
              { type: 'raw_wav', status: 'ready', storageKey: `bookings/${RUN}/raw.wav` },
              { type: 'photos', status: 'pending' }, // not customer-visible yet
            ],
          }
        : undefined,
    },
  });
  return booking;
}

afterAll(async () => {
  // Scoped teardown, dependency order. No consents/payments exist on these fixtures.
  const bookings = await prisma.booking.findMany({
    where: { customerEmail: { endsWith: `${RUN}@test.invalid` } },
    select: { id: true },
  });
  const ids = bookings.map((b) => b.id);
  await prisma.downloadLog.deleteMany({ where: { magicLink: { bookingId: { in: ids } } } });
  await prisma.magicLink.deleteMany({ where: { bookingId: { in: ids } } });
  await prisma.deliverable.deleteMany({ where: { bookingId: { in: ids } } });
  await prisma.booking.deleteMany({ where: { id: { in: ids } } });
  await prisma.package.deleteMany({ where: { slug: `e1-test-${RUN}` } });
  await prisma.room.deleteMany({ where: { name: `E1 TEST ROOM ${RUN}` } });
});

describe('issueMagicLink (C15)', () => {
  it('stores only the SHA-256 hash — never the raw token — with a +60d expiry', async () => {
    const booking = await createFixtureBooking();
    const { rawToken, magicLink } = await issueMagicLink(booking.id);

    expect(magicLink.tokenHash).toBe(hashMagicToken(rawToken));
    expect(magicLink.tokenHash).not.toBe(rawToken);
    const row = await prisma.magicLink.findUniqueOrThrow({ where: { id: magicLink.id } });
    expect(row.status).toBe('active');
    const days = (row.expiresAt.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(MAGIC_LINK_TTL_DAYS - 1);
    expect(days).toBeLessThanOrEqual(MAGIC_LINK_TTL_DAYS);
  });

  it('reissue revokes the previous link and keeps exactly one active', async () => {
    const booking = await createFixtureBooking();
    const first = await issueMagicLink(booking.id);
    const second = await reissueMagicLink(booking.id);

    const rows = await prisma.magicLink.findMany({ where: { bookingId: booking.id } });
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.id === first.magicLink.id)?.status).toBe('revoked');
    expect(rows.find((r) => r.id === second.magicLink.id)?.status).toBe('active');

    // The revoked token must stop resolving; the new one must resolve.
    expect((await resolveMagicLink(first.rawToken)).ok).toBe(false);
    expect((await resolveMagicLink(second.rawToken)).ok).toBe(true);
  });

  it('rejects unknown bookings', async () => {
    await expect(issueMagicLink('nonexistent-booking-id')).rejects.toBeInstanceOf(
      BookingNotFoundError,
    );
  });
});

describe('resolveMagicLink', () => {
  it('returns only customer-visible deliverables (ready/delivered), no storage keys in the DTO', async () => {
    const booking = await createFixtureBooking({ withDeliverables: true });
    const { rawToken } = await issueMagicLink(booking.id);

    const resolved = await resolveMagicLink(rawToken);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.items).toHaveLength(1); // pending photos excluded
    expect(resolved.items[0]?.type).toBe('raw_wav');
    expect(JSON.stringify(resolved)).not.toContain('storageKey');
    expect(JSON.stringify(resolved)).not.toContain(`bookings/${RUN}`);
    expect(resolved.booking.packageName).toBe('E1 Test Gold');
  });

  it('lazy-expires an active link past its expiresAt (no cron dependency)', async () => {
    const booking = await createFixtureBooking();
    const { rawToken, magicLink } = await issueMagicLink(booking.id);
    await prisma.magicLink.update({
      where: { id: magicLink.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    expect(await resolveMagicLink(rawToken)).toEqual({ ok: false, reason: 'expired' });
    const row = await prisma.magicLink.findUniqueOrThrow({ where: { id: magicLink.id } });
    expect(row.status).toBe('expired');
  });

  it('counts page accesses only when touch is set', async () => {
    const booking = await createFixtureBooking();
    const { rawToken, magicLink } = await issueMagicLink(booking.id);
    await resolveMagicLink(rawToken); // API-style resolve — no touch
    await resolveMagicLink(rawToken, { touch: true }); // page view
    const row = await prisma.magicLink.findUniqueOrThrow({ where: { id: magicLink.id } });
    expect(row.accessCount).toBe(1);
    expect(row.lastAccessedAt).not.toBeNull();
  });

  it('rejects unknown and implausible tokens identically (not_found)', async () => {
    expect(await resolveMagicLink('A'.repeat(43))).toEqual({ ok: false, reason: 'not_found' });
    expect(await resolveMagicLink('garbage')).toEqual({ ok: false, reason: 'not_found' });
  });
});
