import 'dotenv/config';
import { prisma } from '../lib/db/prisma';

// Idempotent. Run: pnpm seed:rooms
// Seeds Room A (single active room at launch — PRD §5.3) + operating_hours Setting (PRD C19 fail-safe).
// Studio B is absent (not seeded as inactive) — activate via admin toggle when ready.
async function main() {
  const room = await prisma.room.upsert({
    where: { name: 'Room A' },
    update: {},
    create: { name: 'Room A', isActive: true, displayOrder: 1 },
  });
  console.log(`Seeded room: ${room.name} (id=${room.id}, active=${room.isActive})`);

  const setting = await prisma.setting.upsert({
    where: { key: 'operating_hours' },
    update: {},
    create: { key: 'operating_hours', value: { open: '10:00', close: '22:00' } },
  });
  console.log(`Seeded setting: ${setting.key} = ${JSON.stringify(setting.value)}`);
}

main().finally(() => prisma.$disconnect());
