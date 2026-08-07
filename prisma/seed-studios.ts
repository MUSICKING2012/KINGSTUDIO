import 'dotenv/config';
import { prisma } from '../lib/db/prisma';

// Idempotent. Run: pnpm seed:studios
// STUDIOS intro-page content (5d-3, `Studio_Slice_Spec.md` §4-A) — values are Aiden-provided
// fill-ins (2026-08-05 rooms/team, 2026-08-07 gear list), NEVER invented. Missing facts stay
// absent (no Size/Max-guests rows, no team bios) until provided.
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

  // Owner gear list 2026-08-07 (categories + models + units). Spelling normalized to official
  // brand/model style (approved 2026-08-07, same pattern as the 'PROTOOL → Avid Pro Tools'
  // confirmation); the duplicate 'MACKIE Big Knob' row under CORE System (no unit) was dropped
  // as an erratum (approved). category = slug key into studios.equipment.categories.* messages.
  const equipment: { name: string; category: string; quantity: number }[] = [
    { name: 'Avid Pro Tools HD', category: 'coreSystem', quantity: 1 },
    { name: 'Avid Pro Tools 192 I/O', category: 'coreSystem', quantity: 1 },
    { name: 'Manley Labs Dual Mono', category: 'outboards', quantity: 1 },
    { name: 'Avalon Design VT-737SP', category: 'outboards', quantity: 1 },
    { name: 'Retro Instruments 176', category: 'outboards', quantity: 1 },
    { name: 'dbx 166XL', category: 'outboards', quantity: 1 },
    { name: 'Denon DN-300Z', category: 'outboards', quantity: 1 },
    { name: 'Alesis RA-100', category: 'outboards', quantity: 1 },
    { name: 'Dangerous Music Monitor ST', category: 'monitorController', quantity: 1 },
    { name: 'Mackie Big Knob', category: 'monitorController', quantity: 1 },
    { name: 'Genelec 1031A', category: 'speaker', quantity: 1 },
    { name: 'Yamaha NS-10M', category: 'speaker', quantity: 1 },
    { name: 'Yamaha HS8', category: 'speaker', quantity: 1 },
    { name: 'Neumann U87 Ai', category: 'mic', quantity: 2 },
    { name: 'Neumann TLM 102', category: 'mic', quantity: 1 },
    { name: 'Electro-Voice RE20', category: 'mic', quantity: 1 },
    { name: 'Shure SM58', category: 'mic', quantity: 1 },
    { name: 'Shure SM57', category: 'mic', quantity: 1 },
    { name: 'Sony MDR-7506', category: 'headphone', quantity: 4 },
  ];
  // Full-list replacement: the 2026-08-05 provisional 5 rows used different (brand-only) names,
  // so name-keyed upserts would leave stale rows behind. Marketing-content table — safe to reset.
  // Single transaction: a partial failure must not leave the live table empty/half-seeded
  // (listStudioEquipment() feeds the public page directly — PR #42 review).
  await prisma.$transaction([
    prisma.studioEquipment.deleteMany({}),
    ...equipment.map((item, i) =>
      prisma.studioEquipment.create({ data: { ...item, displayOrder: i + 1 } }),
    ),
  ]);
  for (const item of equipment) {
    console.log(`Seeded equipment: ${item.name} (${item.category} ×${item.quantity})`);
  }

  // Names provided directly by the owner (provision = publication consent for name+role).
  // 2026-08-07 2차: 순서·카테고리 = 오너 지정(프로듀서 → 보컬 디렉터 Jiseon·Lucia·Yena → 매니저
  // Jinny). 포트레이트 = 오너 제공 2명분만(제공 = 게시 동의); 나머지는 공란(placeholder 카드).
  const team: {
    name: string;
    roleKey: string;
    displayOrder: number;
    photoPath: string | null;
  }[] = [
    {
      name: 'Aiden',
      roleKey: 'producer',
      displayOrder: 1,
      photoPath: '/images/studios/team-aiden.jpg',
    },
    {
      name: 'Jiseon',
      roleKey: 'vocalDirector',
      displayOrder: 2,
      photoPath: '/images/studios/team-jiseon.jpg',
    },
    { name: 'Lucia', roleKey: 'vocalDirector', displayOrder: 3, photoPath: null },
    { name: 'Yena', roleKey: 'vocalDirector', displayOrder: 4, photoPath: null },
    { name: 'Jinny', roleKey: 'manager', displayOrder: 5, photoPath: null },
  ];
  for (const member of team) {
    const existing = await prisma.teamMember.findFirst({ where: { name: member.name } });
    if (existing) {
      await prisma.teamMember.update({
        where: { id: existing.id },
        data: {
          roleKey: member.roleKey,
          displayOrder: member.displayOrder,
          photoPath: member.photoPath,
        },
      });
    } else {
      await prisma.teamMember.create({ data: member });
    }
    // 이름은 로그 생략 — 공개 게시 동의분이지만 §3.6 방어적 준수(역할·순번으로 충분히 식별).
    console.log(`Seeded team member #${member.displayOrder} (${member.roleKey})`);
  }
}

main().finally(() => prisma.$disconnect());
