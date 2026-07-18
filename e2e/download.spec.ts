import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

import { prisma } from '../lib/db/prisma';
import { issueMagicLink } from '../lib/download/magicLink';

// Stage E1 download E2E (⚠ §4 위험구역 — 매직링크). Proves the 하드제약 #5 un-bypassable property
// end-to-end against the running app: file bytes are reachable ONLY through a valid token → signed
// URL chain. Direct/unsigned/tampered storage access → 403; expired or revoked tokens → guidance
// page, no file API access. Fixtures are self-created + self-deleted (no shared seed dependency).

const RUN = randomUUID().slice(0, 8);

let bookingId: string;
let rawToken: string;
let deliverableId: string;

test.beforeAll(async () => {
  const room = await prisma.room.upsert({
    where: { name: `E2E DL ROOM ${RUN}` },
    update: {},
    create: { name: `E2E DL ROOM ${RUN}`, isActive: false },
  });
  const pkg = await prisma.package.upsert({
    where: { slug: `e2e-dl-${RUN}` },
    update: {},
    create: {
      slug: `e2e-dl-${RUN}`,
      category: 'experience',
      name: 'E2E DL Gold',
      basePriceKrw: 400_000,
      pricingMode: 'per_person_x1_5',
      slotMinutes: 120,
      headcountMax: 2,
      languagesAvailable: ['en'],
      isActive: false,
    },
  });
  const day = 50_000 + Math.floor(Math.random() * 10_000);
  const booking = await prisma.booking.create({
    data: {
      packageId: pkg.id,
      roomId: room.id,
      status: 'completed',
      date: new Date(Date.now() + day * 86_400_000),
      startTime: new Date('1970-01-01T10:00:00Z'),
      endTime: new Date('1970-01-01T12:00:00Z'),
      headcount: 1,
      customerEmail: `e2e-dl-${RUN}@test.invalid`,
      priceTotalKrw: 400_000,
      unitPriceKrw: 400_000,
      pricingSnapshot: {},
      refundPolicySnapshot: {},
      packageSnapshot: { name: 'E2E DL Gold' },
    },
  });
  bookingId = booking.id;
  const deliverable = await prisma.deliverable.create({
    data: {
      bookingId,
      type: 'raw_wav',
      status: 'ready',
      storageKey: `bookings/${bookingId}/raw_v1.wav`,
      fileSizeBytes: 1_048_576n,
    },
  });
  deliverableId = deliverable.id;
  rawToken = (await issueMagicLink(bookingId)).rawToken;
});

test.afterAll(async () => {
  await prisma.downloadLog.deleteMany({ where: { magicLink: { bookingId } } });
  await prisma.magicLink.deleteMany({ where: { bookingId } });
  await prisma.deliverable.deleteMany({ where: { bookingId } });
  await prisma.booking.deleteMany({ where: { id: bookingId } });
  await prisma.package.deleteMany({ where: { slug: `e2e-dl-${RUN}` } });
  await prisma.room.deleteMany({ where: { name: `E2E DL ROOM ${RUN}` } });
  await prisma.$disconnect();
});

test('valid token renders the deliverable list without leaking storage keys', async ({ page }) => {
  await page.goto(`/en/download/${rawToken}`);
  await expect(page.getByRole('heading', { name: 'Your recordings' })).toBeVisible();
  await expect(page.getByText('Raw recording (WAV)')).toBeVisible();
  const html = await page.content();
  expect(html).not.toContain(`bookings/${bookingId}`); // storage key never in markup (하드제약 #5)
});

test('file API issues a working signed URL and writes a download log', async ({ request }) => {
  const res = await request.post('/api/download/file', {
    data: { token: rawToken, deliverableId },
  });
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { url: string; expiresInSeconds: number };
  expect(body.url).toContain('/api/mock-storage/download?');
  expect(body.url).not.toContain('storageKey');
  expect(body.expiresInSeconds).toBeLessThanOrEqual(600); // TTL 10min ceiling (하드제약 #5)

  const file = await request.get(body.url);
  expect(file.status()).toBe(200);
  expect(file.headers()['content-disposition']).toContain('attachment');

  const log = await prisma.downloadLog.findFirst({ where: { deliverableId } });
  expect(log?.deliverableTypeSnapshot).toBe('raw_wav');
  expect(log?.fileNameSnapshot).toBe('raw_v1.wav');
});

test('unsigned, tampered, and expired storage access are all rejected (403)', async ({
  request,
}) => {
  const res = await request.post('/api/download/file', {
    data: { token: rawToken, deliverableId },
  });
  const { url } = (await res.json()) as { url: string };
  const parsed = new URL(url, 'http://localhost:3100');

  // 1) no signature at all
  const unsigned = new URL(parsed.toString());
  unsigned.searchParams.delete('sig');
  expect((await request.get(unsigned.toString())).status()).toBe(403);

  // 2) tampered key with the original signature
  const tampered = new URL(parsed.toString());
  tampered.searchParams.set('key', 'bookings/SOMEONE-ELSE/raw.wav');
  expect((await request.get(tampered.toString())).status()).toBe(403);

  // 3) forged expiry extension
  const extended = new URL(parsed.toString());
  extended.searchParams.set('exp', String(Number(extended.searchParams.get('exp')) + 86_400));
  expect((await request.get(extended.toString())).status()).toBe(403);
});

test('unknown token → guidance page + 404 from the file API', async ({ page, request }) => {
  await page.goto(`/en/download/${'A'.repeat(43)}`);
  await expect(page.getByRole('heading', { name: 'Link not found' })).toBeVisible();

  const res = await request.post('/api/download/file', {
    data: { token: 'A'.repeat(43), deliverableId },
  });
  expect(res.status()).toBe(404);
});

test('revoked-by-reissue token → guidance page + 410, new token still works', async ({
  page,
  request,
}) => {
  const oldToken = rawToken;
  rawToken = (await issueMagicLink(bookingId)).rawToken; // reissue revokes oldToken

  await page.goto(`/en/download/${oldToken}`);
  await expect(page.getByRole('heading', { name: 'Link replaced' })).toBeVisible();

  const gone = await request.post('/api/download/file', {
    data: { token: oldToken, deliverableId },
  });
  expect(gone.status()).toBe(410);

  const fresh = await request.post('/api/download/file', {
    data: { token: rawToken, deliverableId },
  });
  expect(fresh.status()).toBe(200);
});

test('expired token → guidance page + 410 (lazy expiry)', async ({ page, request }) => {
  const { rawToken: expiring, magicLink } = await issueMagicLink(bookingId);
  await prisma.magicLink.update({
    where: { id: magicLink.id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });

  await page.goto(`/en/download/${expiring}`);
  await expect(page.getByRole('heading', { name: 'Link expired' })).toBeVisible();

  const res = await request.post('/api/download/file', {
    data: { token: expiring, deliverableId },
  });
  expect(res.status()).toBe(410);
  // NOTE: this reissue-chain means rawToken (latest) remains the only active link afterAll.
});
