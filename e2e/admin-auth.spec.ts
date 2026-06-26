import { expect, test } from '@playwright/test';
import { authenticator } from 'otplib';
import { encryptSecret } from '../lib/admin-auth/crypto';
import { hashPassword } from '../lib/auth/password';
import { prisma } from '../lib/db/prisma';

const SECRET = authenticator.generateSecret();
const SUPER = `e2e_super_${Date.now()}@test.local`;

const ACCT_SECRET = authenticator.generateSecret();
const ACCT = `e2e_acct_${Date.now()}@test.local`;

test.beforeAll(async () => {
  // ADMIN_TOTP_ENC_KEY comes from .env (loaded by playwright.config) — SAME key the dev server uses.
  // ['*'] inlined (only datum needed); avoids importing rbac.ts (which chains to the '@/' alias).
  await prisma.adminRole.upsert({
    where: { name: 'Super Admin' },
    update: { permissions: ['*'] },
    create: { name: 'Super Admin', permissions: ['*'] },
  });
  await prisma.adminUser.upsert({
    where: { email: SUPER },
    update: {},
    create: {
      email: SUPER,
      name: 'E2E',
      passwordHash: await hashPassword('correcthorse12'),
      totpSecret: encryptSecret(SECRET),
      totpEnabled: true,
      status: 'active',
    },
  });
  // assign the Super Admin role so the dashboard's permission count is non-zero
  const role = await prisma.adminRole.findUniqueOrThrow({ where: { name: 'Super Admin' } });
  const admin = await prisma.adminUser.findUniqueOrThrow({ where: { email: SUPER } });
  await prisma.adminUserRole.upsert({
    where: { adminUserId_adminRoleId: { adminUserId: admin.id, adminRoleId: role.id } },
    update: {},
    create: { adminUserId: admin.id, adminRoleId: role.id },
  });
  // Seed Accountant role + user (deny guard for blackout:manage)
  await prisma.adminRole.upsert({
    where: { name: 'Accountant' },
    update: { permissions: ['revenue:read', 'revenue:export', 'refund:process', 'taxinvoice:issue'] },
    create: { name: 'Accountant', permissions: ['revenue:read', 'revenue:export', 'refund:process', 'taxinvoice:issue'] },
  });
  await prisma.adminUser.upsert({
    where: { email: ACCT },
    update: {},
    create: {
      email: ACCT,
      name: 'E2E Accountant',
      passwordHash: await hashPassword('correcthorse12'),
      totpSecret: encryptSecret(ACCT_SECRET),
      totpEnabled: true,
      status: 'active',
    },
  });
  const acctRole = await prisma.adminRole.findUniqueOrThrow({ where: { name: 'Accountant' } });
  const acctAdmin = await prisma.adminUser.findUniqueOrThrow({ where: { email: ACCT } });
  await prisma.adminUserRole.upsert({
    where: { adminUserId_adminRoleId: { adminUserId: acctAdmin.id, adminRoleId: acctRole.id } },
    update: {},
    create: { adminUserId: acctAdmin.id, adminRoleId: acctRole.id },
  });

  await prisma.$disconnect();
});

async function login(
  page: import('@playwright/test').Page,
  email: string,
  secret = SECRET,
) {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('correcthorse12');
  await page.getByLabel('2FA code').fill(authenticator.generate(secret));
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test('admin login (pw+TOTP) reaches the dashboard', async ({ page }) => {
  await login(page, SUPER);
  await expect(page).toHaveURL(/\/admin\/dashboard/);
});

test('wrong TOTP shows a generic error', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(SUPER);
  await page.getByLabel('Password').fill('correcthorse12');
  await page.getByLabel('2FA code').fill('000000');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Invalid credentials.')).toBeVisible();
});

test('protected /admin redirects to login when logged out', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('🔑 customer session does NOT grant admin access (session separation)', async ({ page }) => {
  // Sign up as a customer (steps mirror e2e/auth.spec.ts), then try /admin — must be bounced.
  await page.goto('/en/signup');
  await page.getByLabel('Name').fill('Cust');
  await page.getByLabel('Email').fill(`cust_${Date.now()}@test.local`);
  await page.getByLabel('Password').fill('xK9!mq2vRt7wZ');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page).toHaveURL(/\/en\/my/); // customer logged in
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/admin\/login/); // admin guard rejects the customer cookie
});

test('logout returns to admin login', async ({ page }) => {
  await login(page, SUPER);
  await expect(page).toHaveURL(/\/admin\/dashboard/);
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('🚫 Accountant (no blackout:manage) → POST /api/admin/blackouts returns 403', async ({ page }) => {
  await login(page, ACCT, ACCT_SECRET);
  await expect(page).toHaveURL(/\/admin\/dashboard/);
  const res = await page.context().request.post('/api/admin/blackouts', { data: {} });
  expect(res.status()).toBe(403);
  const body = await res.json();
  expect(body).toEqual({ error: 'forbidden' });
});
