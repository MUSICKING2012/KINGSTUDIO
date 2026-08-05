import 'dotenv/config';
import { prisma } from '../lib/db/prisma';

// Idempotent. Run: pnpm seed:studios
// STUDIOS intro-page content (5d-3, `Studio_Slice_Spec.md` §4-A) — values are Aiden-provided
// fill-ins (2026-08-05), NEVER invented. Missing facts stay absent (no Size/Max-guests rows,
// no equipment categories, no team bios) until provided.
async function main() {
  const rooms = [
    { slug: 'a', controlRoomPyeong: 10, boothPyeong: 10, allPackages: true, displayOrder: 1 },
    { slug: 'b', controlRoomPyeong: 6, boothPyeong: 6, allPackages: false, displayOrder: 2 },
  ];
  for (const room of rooms) {
    await prisma.studioRoomProfile.upsert({
      where: { slug: room.slug },
      update: {
        controlRoomPyeong: room.controlRoomPyeong,
        boothPyeong: room.boothPyeong,
        allPackages: room.allPackages,
        displayOrder: room.displayOrder,
      },
      create: room,
    });
    console.log(`Seeded studio room profile: ${room.slug}`);
  }

  // Flat, uncategorized — the received list has no categories and no model/quantity detail yet.
  const equipment = ['Avid Pro Tools', 'Manley', 'Avalon', 'Genelec 1031', 'Yamaha NS-10'];
  for (const [i, name] of equipment.entries()) {
    const existing = await prisma.studioEquipment.findFirst({ where: { name } });
    if (existing) {
      await prisma.studioEquipment.update({
        where: { id: existing.id },
        data: { displayOrder: i + 1 },
      });
    } else {
      await prisma.studioEquipment.create({ data: { name, displayOrder: i + 1 } });
    }
    console.log(`Seeded equipment: ${name}`);
  }

  // Names provided directly by the owner (provision = publication consent for name+role).
  const team = [
    { name: 'Aiden', roleKey: 'producer', displayOrder: 1 },
    { name: 'Jiseon', roleKey: 'vocalDirector', displayOrder: 2 },
    { name: 'Yena', roleKey: 'vocalDirector', displayOrder: 3 },
    { name: 'Lucia', roleKey: 'vocalDirector', displayOrder: 4 },
  ];
  for (const member of team) {
    const existing = await prisma.teamMember.findFirst({ where: { name: member.name } });
    if (existing) {
      await prisma.teamMember.update({
        where: { id: existing.id },
        data: { roleKey: member.roleKey, displayOrder: member.displayOrder },
      });
    } else {
      await prisma.teamMember.create({ data: member });
    }
    console.log(`Seeded team member: ${member.name} (${member.roleKey})`);
  }
}

main().finally(() => prisma.$disconnect());
