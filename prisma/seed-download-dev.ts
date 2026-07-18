import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { prisma } from '../lib/db/prisma';
import { issueMagicLink } from '../lib/download/magicLink';

// Dev-only seed (Stage E1): creates one completed booking with ready deliverables and prints a
// fresh magic-link URL for manual QA of /download/[token]. Idempotent-ish: reuses the same
// customer email and reissues the link on every run. NEVER run against production data.
//
// Usage: pnpm tsx prisma/seed-download-dev.ts

const DEV_EMAIL = 'download-dev@kingstudio.test';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('seed-download-dev is a dev fixture — refusing to run in production');
  }

  const room =
    (await prisma.room.findFirst({ where: { isActive: true } })) ??
    (await prisma.room.upsert({
      where: { name: 'STUDIO A' },
      update: {},
      create: { name: 'STUDIO A', isActive: true },
    }));
  const pkg = await prisma.package.findUniqueOrThrow({ where: { slug: 'gold' } });

  const existing = await prisma.booking.findFirst({ where: { customerEmail: DEV_EMAIL } });
  const booking =
    existing ??
    (await prisma.booking.create({
      data: {
        packageId: pkg.id,
        roomId: room.id,
        status: 'completed',
        // Fixed far-past date: a finished session, and never colliding with live availability.
        date: new Date('2026-01-05'),
        startTime: new Date('1970-01-01T10:00:00Z'),
        endTime: new Date('1970-01-01T12:00:00Z'),
        headcount: 1,
        customerEmail: DEV_EMAIL,
        priceTotalKrw: pkg.basePriceKrw,
        unitPriceKrw: pkg.basePriceKrw,
        pricingSnapshot: { note: 'dev fixture' },
        refundPolicySnapshot: { note: 'dev fixture' },
        packageSnapshot: { name: pkg.name },
      },
    }));

  const existingDeliverables = await prisma.deliverable.count({ where: { bookingId: booking.id } });
  if (existingDeliverables === 0) {
    await prisma.deliverable.createMany({
      data: [
        {
          bookingId: booking.id,
          type: 'raw_wav',
          status: 'ready',
          storageKey: `bookings/${booking.id}/raw_v1.wav`,
          fileSizeBytes: 52_428_800n,
        },
        {
          bookingId: booking.id,
          type: 'raw_mp3',
          status: 'ready',
          storageKey: `bookings/${booking.id}/raw_v1.mp3`,
          fileSizeBytes: 9_437_184n,
        },
        {
          bookingId: booking.id,
          type: 'photos',
          status: 'ready',
          storageKey: `bookings/${booking.id}/photos_v1.zip`,
          fileSizeBytes: 209_715_200n,
        },
      ],
    });
  }

  const { rawToken } = await issueMagicLink(booking.id);
  // Raw token printed ON PURPOSE (dev QA seed — the whole point is a usable link). Dev-only.
  console.log(`booking: ${booking.id}`);
  console.log(`download URL: http://localhost:3100/en/download/${rawToken}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().finally(() => prisma.$disconnect());
}
