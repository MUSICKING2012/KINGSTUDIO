import 'dotenv/config'; // tsx does NOT auto-load .env — load DATABASE_URL + ADMIN_TOTP_ENC_KEY (same key the dev server uses)
import { prisma } from '../lib/db/prisma';
import { ROLE_PERMISSIONS } from '../lib/admin-auth/roles'; // relative + pure module: no '@/' chain for tsx
import { hashPassword } from '../lib/auth/password';
import { encryptSecret } from '../lib/admin-auth/crypto';

// Idempotent. Secrets/passwords come from env — NEVER hardcode (§3.6).
// Required env: SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD (≥12), SEED_ADMIN_TOTP_SECRET (base32).
async function main() {
  for (const [name, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    await prisma.adminRole.upsert({ where: { name }, update: { permissions }, create: { name, permissions } });
  }
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const totp = process.env.SEED_ADMIN_TOTP_SECRET;
  if (!email || !password || !totp) { console.log('Roles seeded. Set SEED_ADMIN_* to seed a Super Admin.'); return; }
  const superRole = await prisma.adminRole.findUniqueOrThrow({ where: { name: 'Super Admin' } });
  const admin = await prisma.adminUser.upsert({
    where: { email: email.toLowerCase() },
    update: {},
    create: { email: email.toLowerCase(), name: 'Super Admin', passwordHash: await hashPassword(password), totpSecret: encryptSecret(totp), totpEnabled: true, status: 'active' },
  });
  await prisma.adminUserRole.upsert({
    where: { adminUserId_adminRoleId: { adminUserId: admin.id, adminRoleId: superRole.id } },
    update: {}, create: { adminUserId: admin.id, adminRoleId: superRole.id },
  });
  console.log(`Seeded Super Admin ${email} + 7 roles.`);
}
main().finally(() => prisma.$disconnect());
