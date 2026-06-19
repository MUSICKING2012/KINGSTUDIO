# Admin Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin (studio operator) auth — email + password + TOTP login, revocable admin sessions, RBAC (PRD 5.8's 7 roles), and a re-auth foundation — fully separated from customer auth.

**Architecture:** A **second Auth.js v5 instance** (`adminAuth.ts`, Credentials-only, no adapter) with its own cookie (`authjs.admin-session-token`) and basePath (`/api/admin/auth`). JWT carries `{adminUserId, sessionId}`; the source of truth is an `admin_sessions` row validated each request (revocable, 8h sliding, max-3). RBAC via a permission vocabulary + role→permission seed map. Re-auth base writes `reauth_challenges`.

**Tech Stack:** Next.js 14, Auth.js v5 (`next-auth@5.0.0-beta.25`), Prisma 6 (Postgres 16, local DB migrated), `otplib`, Node `crypto` (AES-256-GCM), bcryptjs (reused), Zod, shadcn/ui, Vitest, Playwright.

**Preconditions:** Local Postgres running; `.env` has `DATABASE_URL` + `AUTH_SECRET`. **No migration** — `admin_users`, `admin_roles`, `admin_user_roles`, `admin_sessions`, `reauth_challenges` exist. If a schema change is found necessary → STOP and ask (§7-B).

**Conventions:** TDD. Never log password / TOTP code / TOTP secret / enc key (§3.6). `pnpm`. Reuse `lib/auth/password.ts` (`hashPassword`/`verifyPassword`) — do not duplicate. **Lockout:** "5 consecutive failures → 30-min lock" (the exact 5-min window needs a `lastFailedAt` field the schema lacks — tracked as follow-up).

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/admin-auth/constants.ts` | `AUTH_METHOD`, `ADMIN_SESSION_*` constants (single source for String values) |
| `lib/admin-auth/crypto.ts` | AES-256-GCM `encryptSecret`/`decryptSecret` (+ key-version prefix) |
| `lib/admin-auth/totp.ts` | otplib `verifyTotp` |
| `lib/admin-auth/session.ts` | `admin_sessions` CRUD (8h sliding, max-3 eviction) |
| `lib/admin-auth/rbac.ts` | permission vocabulary + role seed map + `getAdminPermissions`/`hasPermission`/`requirePermission` |
| `lib/admin-auth/authenticate.ts` | `authenticateAdmin(email,pw,totp)` — pw+TOTP+lockout (testable core) |
| `lib/admin-auth/reauth.ts` | `createReauthChallenge`/`verifyReauth` |
| `lib/admin-auth/config.ts`, `adminAuth.ts` | Auth.js admin instance (separate cookie/basePath) |
| `app/api/admin/auth/[...nextauth]/route.ts` | admin route handlers |
| `lib/validations/admin-auth.ts` | admin login Zod (pw ≥12) |
| `prisma/seed-admin.ts` | seed 7 roles + Super Admin (from env) |
| `app/admin/login/page.tsx`, `components/admin/login-form.tsx` | login UI |
| `app/admin/(protected)/layout.tsx`, `app/admin/(protected)/dashboard/page.tsx` | guarded area |
| `CLAUDE.md` | §4 Engineer row-scope note |
| `e2e/admin-auth.spec.ts` | E2E |

---

## Task 1: Deps, env, admin Zod, constants

**Files:** Modify `package.json`, `.env`; Create `lib/admin-auth/constants.ts`, `lib/validations/admin-auth.ts` (+ test)

- [ ] **Step 1: Install otplib + dotenv**

Run: `pnpm add otplib && pnpm add -D dotenv`
(`dotenv` is for the seed script and Playwright config, which run outside Next.js and don't auto-load `.env`.)

- [ ] **Step 2: Add ADMIN_TOTP_ENC_KEY to .env** (32 random bytes, base64; prod sources it from GCP Secret Manager)

Run:
```bash
printf '\nADMIN_TOTP_ENC_KEY=%s\n' "$(openssl rand -base64 32)" >> .env
grep -q '^ADMIN_TOTP_ENC_KEY=' .env && echo "key set"
```

- [ ] **Step 3: Constants**

`lib/admin-auth/constants.ts`:
```ts
// Single source for reauth method String values (until AuthMethod enum-ification — tracked).
export const AUTH_METHOD = { PASSWORD_TOTP: 'password+totp' } as const;
export type AuthMethod = (typeof AUTH_METHOD)[keyof typeof AUTH_METHOD];

export const ADMIN_SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8h sliding inactivity (PRD 5.8)
export const ADMIN_MAX_CONCURRENT_SESSIONS = 3; // PRD 5.8
export const ADMIN_LOCKOUT_THRESHOLD = 5; // consecutive fails
export const ADMIN_LOCKOUT_MS = 30 * 60 * 1000; // 30 min
```

- [ ] **Step 4: Admin login Zod + test**

`lib/validations/admin-auth.ts`:
```ts
import { z } from 'zod';
// PRD 5.8: admin password min 12. TOTP is a 6-digit code.
export const adminLoginSchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
  password: z.string().min(12),
  totp: z.string().regex(/^\d{6}$/),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
```

`lib/validations/admin-auth.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { adminLoginSchema } from './admin-auth';

describe('adminLoginSchema', () => {
  it('accepts a valid admin login', () => {
    expect(adminLoginSchema.safeParse({ email: 'a@b.com', password: 'abcdefghij12', totp: '123456' }).success).toBe(true);
  });
  it('rejects password shorter than 12', () => {
    expect(adminLoginSchema.safeParse({ email: 'a@b.com', password: 'short1', totp: '123456' }).success).toBe(false);
  });
  it('rejects non-6-digit TOTP', () => {
    expect(adminLoginSchema.safeParse({ email: 'a@b.com', password: 'abcdefghij12', totp: '12ab' }).success).toBe(false);
  });
});
```

- [ ] **Step 5: Verify + commit**

Run: `pnpm test lib/validations/admin-auth.test.ts` (PASS) and `pnpm exec tsc --noEmit`.
```bash
git add package.json pnpm-lock.yaml lib/admin-auth/constants.ts lib/validations/admin-auth.ts lib/validations/admin-auth.test.ts
git commit -m "chore(admin-auth): otplib, enc key env, constants, admin login schema"
```
(Do NOT commit `.env` — gitignored.)

---

## Task 2: TOTP secret encryption (AES-256-GCM)

**Files:** Create `lib/admin-auth/crypto.ts`; Test `lib/admin-auth/crypto.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it, beforeAll } from 'vitest';
import { encryptSecret, decryptSecret } from './crypto';

beforeAll(() => { process.env.ADMIN_TOTP_ENC_KEY = Buffer.alloc(32, 7).toString('base64'); });

describe('crypto (AES-256-GCM)', () => {
  it('round-trips a secret', () => {
    const enc = encryptSecret('JBSWY3DPEHPK3PXP');
    expect(enc).not.toContain('JBSWY3DPEHPK3PXP');
    expect(enc.startsWith('v1:')).toBe(true); // key-version prefix
    expect(decryptSecret(enc)).toBe('JBSWY3DPEHPK3PXP');
  });
  it('produces different ciphertext each time (random IV)', () => {
    expect(encryptSecret('x')).not.toBe(encryptSecret('x'));
  });
});
```

- [ ] **Step 2: Run → FAIL.** `pnpm test lib/admin-auth/crypto.test.ts`

- [ ] **Step 3: Implementation**

```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// 🔒 Encrypts the TOTP secret at rest. Key from ADMIN_TOTP_ENC_KEY (GCP Secret Manager in prod —
// separate store from the DB so a DB-only leak can't decrypt). Format: v1:<iv>:<ct>:<tag> (base64).
// The v1 prefix is the key version, for future rotation.
function key(): Buffer {
  const raw = process.env.ADMIN_TOTP_ENC_KEY;
  if (!raw) throw new Error('ADMIN_TOTP_ENC_KEY is not set');
  const k = Buffer.from(raw, 'base64');
  if (k.length !== 32) throw new Error('ADMIN_TOTP_ENC_KEY must be 32 bytes (base64)');
  return k;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${ct.toString('base64')}:${tag.toString('base64')}`;
}

export function decryptSecret(payload: string): string {
  const [version, ivB64, ctB64, tagB64] = payload.split(':');
  if (version !== 'v1') throw new Error(`unsupported key version: ${version}`);
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
}
```

- [ ] **Step 4: Run → PASS.** Then commit:
```bash
git add lib/admin-auth/crypto.ts lib/admin-auth/crypto.test.ts
git commit -m "feat(admin-auth): AES-256-GCM TOTP secret encryption (key-versioned)"
```

---

## Task 3: TOTP verify (otplib)

**Files:** Create `lib/admin-auth/totp.ts`; Test `lib/admin-auth/totp.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from 'vitest';
import { authenticator } from 'otplib';
import { verifyTotp } from './totp';

describe('verifyTotp', () => {
  it('accepts a current code', () => {
    const secret = authenticator.generateSecret();
    expect(verifyTotp(secret, authenticator.generate(secret))).toBe(true);
  });
  it('rejects a wrong code', () => {
    const secret = authenticator.generateSecret();
    expect(verifyTotp(secret, '000000')).toBe(false);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implementation**

```ts
import { authenticator } from 'otplib';

// otplib default 30s step, ±1 window tolerance. Returns false on any malformed input (never throws).
export function verifyTotp(secret: string, token: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run → PASS.** Commit:
```bash
git add lib/admin-auth/totp.ts lib/admin-auth/totp.test.ts
git commit -m "feat(admin-auth): TOTP verification (otplib)"
```

---

## Task 4: Admin session store

**Files:** Create `lib/admin-auth/session.ts`; Test `lib/admin-auth/session.test.ts` (local DB)

- [ ] **Step 1: Failing test**

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db/prisma';
import { createAdminSession, validateAdminSession, revokeAdminSession, revokeAllAdminSessions } from './session';

let adminId: string;
beforeEach(async () => {
  await prisma.adminSession.deleteMany();
  await prisma.adminUser.deleteMany({ where: { email: 'asess@test.local' } });
  const a = await prisma.adminUser.create({ data: { email: 'asess@test.local', passwordHash: 'x', name: 'A' } });
  adminId = a.id;
});
afterAll(async () => { await prisma.$disconnect(); });

describe('admin session store', () => {
  it('creates and validates', async () => {
    const { sessionId } = await createAdminSession(adminId, { ip: null, country: null, userAgent: null });
    expect(await validateAdminSession(sessionId)).toMatchObject({ adminUserId: adminId });
  });
  it('expires after 8h (sliding)', async () => {
    const { sessionId } = await createAdminSession(adminId, { ip: null, country: null, userAgent: null });
    await prisma.adminSession.update({ where: { id: sessionId }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await validateAdminSession(sessionId)).toBeNull();
  });
  it('keeps at most 3 concurrent (evicts oldest)', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) ids.push((await createAdminSession(adminId, { ip: null, country: null, userAgent: null })).sessionId);
    expect(await prisma.adminSession.count({ where: { adminUserId: adminId } })).toBe(3);
    expect(await validateAdminSession(ids[0])).toBeNull(); // first (oldest) evicted
  });
  it('revokes single and all', async () => {
    const a = await createAdminSession(adminId, { ip: null, country: null, userAgent: null });
    await revokeAdminSession(a.sessionId);
    expect(await validateAdminSession(a.sessionId)).toBeNull();
    const b = await createAdminSession(adminId, { ip: null, country: null, userAgent: null });
    await revokeAllAdminSessions(adminId);
    expect(await validateAdminSession(b.sessionId)).toBeNull();
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implementation**

```ts
import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import type { RequestMeta } from '@/lib/auth/device';
import { ADMIN_SESSION_MAX_AGE_MS, ADMIN_MAX_CONCURRENT_SESSIONS } from './constants';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export async function createAdminSession(adminUserId: string, meta: RequestMeta) {
  const rawToken = randomBytes(32).toString('hex');
  const row = await prisma.adminSession.create({
    data: {
      adminUserId,
      tokenHash: sha256(rawToken), // 🔒 hash only
      ip: meta.ip,
      country: meta.country,
      userAgent: meta.userAgent,
      expiresAt: new Date(Date.now() + ADMIN_SESSION_MAX_AGE_MS),
      lastActiveAt: new Date(),
    },
  });
  // Enforce max concurrent: keep the N newest, delete the rest (PRD 5.8 "oldest evicted").
  const sessions = await prisma.adminSession.findMany({
    where: { adminUserId }, orderBy: { lastActiveAt: 'desc' }, select: { id: true },
  });
  const stale = sessions.slice(ADMIN_MAX_CONCURRENT_SESSIONS).map((s) => s.id);
  if (stale.length) await prisma.adminSession.deleteMany({ where: { id: { in: stale } } });
  return { sessionId: row.id, rawToken };
}

export async function validateAdminSession(sessionId: string): Promise<{ adminUserId: string } | null> {
  const row = await prisma.adminSession.findUnique({ where: { id: sessionId } });
  if (!row || (row.expiresAt && row.expiresAt < new Date())) return null;
  await prisma.adminSession.update({
    where: { id: sessionId },
    data: { lastActiveAt: new Date(), expiresAt: new Date(Date.now() + ADMIN_SESSION_MAX_AGE_MS) },
  });
  return { adminUserId: row.adminUserId };
}

export async function revokeAdminSession(sessionId: string) {
  await prisma.adminSession.deleteMany({ where: { id: sessionId } });
}
export async function revokeAllAdminSessions(adminUserId: string) {
  await prisma.adminSession.deleteMany({ where: { adminUserId } });
}
```

- [ ] **Step 4: Run → PASS.** Commit:
```bash
git add lib/admin-auth/session.ts lib/admin-auth/session.test.ts
git commit -m "feat(admin-auth): revocable admin sessions (8h sliding, max-3 eviction)"
```

---

## Task 5: RBAC

**Files:** Create `lib/admin-auth/roles.ts` (pure data — no imports, so `tsx`/Playwright can import it without the `@/` chain) + `lib/admin-auth/rbac.ts` (DB-backed); Test `lib/admin-auth/rbac.test.ts` (local DB)

- [ ] **Step 1: Failing test**

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db/prisma';
import { ROLE_PERMISSIONS, ALL_PERMISSIONS, hasPermission } from './roles';
import { getAdminPermissions } from './rbac';

let adminId: string;
beforeEach(async () => {
  await prisma.adminUserRole.deleteMany();
  await prisma.adminUser.deleteMany({ where: { email: 'rbac@test.local' } });
  for (const name of ['Marketer', 'Operator']) {
    await prisma.adminRole.upsert({ where: { name }, update: { permissions: ROLE_PERMISSIONS[name] }, create: { name, permissions: ROLE_PERMISSIONS[name] } });
  }
  const a = await prisma.adminUser.create({ data: { email: 'rbac@test.local', passwordHash: 'x', name: 'R' } });
  adminId = a.id;
});
afterAll(async () => { await prisma.$disconnect(); });

describe('rbac map', () => {
  it('Super Admin is wildcard', () => expect(ROLE_PERMISSIONS['Super Admin']).toEqual(['*']));
  it('Manager excludes the 6 sensitive perms', () => {
    for (const p of ['refund:process', 'role:grant', 'terms:publish', 'gate:mr_predelivery', 'gate:license_display', 'seo:custom_script'])
      expect(ROLE_PERMISSIONS['Manager']).not.toContain(p);
    expect(ROLE_PERMISSIONS['Manager']).toContain('booking:write');
  });
});

describe('hasPermission', () => {
  it('wildcard grants anything', () => expect(hasPermission(['*'], 'refund:process')).toBe(true));
  it('grants only listed', () => { expect(hasPermission(['booking:read'], 'booking:read')).toBe(true); expect(hasPermission(['booking:read'], 'refund:process')).toBe(false); });
});

describe('getAdminPermissions (union)', () => {
  it('OR-combines roles', async () => {
    const mk = await prisma.adminRole.findUniqueOrThrow({ where: { name: 'Marketer' } });
    const op = await prisma.adminRole.findUniqueOrThrow({ where: { name: 'Operator' } });
    await prisma.adminUserRole.createMany({ data: [{ adminUserId: adminId, adminRoleId: mk.id }, { adminUserId: adminId, adminRoleId: op.id }] });
    const perms = await getAdminPermissions(adminId);
    expect(perms).toContain('promo:manage'); // Marketer
    expect(perms).toContain('blackout:manage'); // Operator
    expect(perms).not.toContain('refund:process');
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3a: Pure data module** — `lib/admin-auth/roles.ts` (NO imports — safe for `tsx`/Playwright):

```ts
// Permission vocabulary (PRD 5.8 + 5.8-A). Sensitive (reauth-gated) ones noted in comments.
// This file has NO imports so the seed script (tsx) and E2E (Playwright) can import it
// without dragging in the '@/' alias chain (which only Next.js + Vitest resolve).
export const ALL_PERMISSIONS = [
  'booking:read', 'booking:write', 'blackout:manage', 'cs:respond',
  'content:upload', 'magiclink:reissue', 'mv:receive', 'photo:select', 'checkin:write',
  'refund:process', 'revenue:read', 'revenue:export', 'taxinvoice:issue',
  'review:manage', 'ugc:manage', 'promo:manage', 'campaign:send',
  'settings:manage',
  // sensitive — reauth-gated:
  'role:grant', 'terms:publish', 'account:manage', 'export:bulk', 'bucketlock:retention',
  'gate:mr_predelivery', 'gate:license_display', 'seo:custom_script',
] as const;
export type Permission = (typeof ALL_PERMISSIONS)[number];

// §5.8-A is more restrictive than §5.8 → fail-safe: the 3 gates are Super Admin only.
const MANAGER_EXCLUDED = ['refund:process', 'role:grant', 'terms:publish', 'gate:mr_predelivery', 'gate:license_display', 'seo:custom_script'];

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  'Super Admin': ['*'],
  Manager: ALL_PERMISSIONS.filter((p) => !MANAGER_EXCLUDED.includes(p)),
  Operator: ['booking:read', 'booking:write', 'blackout:manage', 'cs:respond'],
  'Content Manager': ['content:upload', 'magiclink:reissue', 'mv:receive'],
  // ⚠ ROW-SCOPE REQUIRED: Engineer's checkin/upload/select must be limited to own assigned
  // bookings (booking.engineerId === adminId) when those features are built. NOT enforced here.
  Engineer: ['checkin:write', 'content:upload', 'photo:select'],
  Accountant: ['revenue:read', 'revenue:export', 'refund:process', 'taxinvoice:issue'],
  Marketer: ['review:manage', 'ugc:manage', 'promo:manage', 'campaign:send'],
};

export function hasPermission(perms: string[], required: string): boolean {
  return perms.includes('*') || perms.includes(required);
}
```

- [ ] **Step 3b: DB-backed module** — `lib/admin-auth/rbac.ts`:

```ts
import { prisma } from '@/lib/db/prisma';
import { hasPermission } from './roles';

export { ALL_PERMISSIONS, ROLE_PERMISSIONS, hasPermission } from './roles';
export type { Permission } from './roles';

export async function getAdminPermissions(adminUserId: string): Promise<string[]> {
  const roles = await prisma.adminUserRole.findMany({
    where: { adminUserId }, include: { adminRole: { select: { permissions: true } } },
  });
  const set = new Set<string>();
  for (const r of roles) for (const p of (r.adminRole.permissions as string[])) set.add(p);
  return [...set];
}

// Guard for server actions / route handlers. Throws on denial (caller maps to 403/redirect).
export async function requirePermission(adminUserId: string, required: string): Promise<void> {
  if (!hasPermission(await getAdminPermissions(adminUserId), required)) {
    throw new Error(`FORBIDDEN: missing ${required}`);
  }
}
```

- [ ] **Step 4: Run → PASS.** Commit:
```bash
git add lib/admin-auth/roles.ts lib/admin-auth/rbac.ts lib/admin-auth/rbac.test.ts
git commit -m "feat(admin-auth): RBAC (roles data + DB-backed guard) — fail-safe gates"
```

---

## Task 6: authenticateAdmin (pw + TOTP + lockout)

**Files:** Create `lib/admin-auth/authenticate.ts`; Test `lib/admin-auth/authenticate.test.ts` (local DB)

- [ ] **Step 1: Failing test**

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { authenticator } from 'otplib';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { encryptSecret } from './crypto';
import { authenticateAdmin } from './authenticate';
import { ADMIN_LOCKOUT_THRESHOLD } from './constants';

process.env.ADMIN_TOTP_ENC_KEY = Buffer.alloc(32, 7).toString('base64');
const SECRET = authenticator.generateSecret();
let email: string;
beforeEach(async () => {
  email = `auth_${Date.now()}@test.local`;
  await prisma.adminUser.create({
    data: { email, name: 'A', passwordHash: await hashPassword('correcthorse12'), totpSecret: encryptSecret(SECRET), totpEnabled: true, status: 'active' },
  });
});
afterAll(async () => { await prisma.$disconnect(); });

describe('authenticateAdmin', () => {
  it('succeeds with pw + valid TOTP', async () => {
    const r = await authenticateAdmin(email, 'correcthorse12', authenticator.generate(SECRET));
    expect(r.ok).toBe(true);
  });
  it('fails on wrong password (generic)', async () => {
    expect((await authenticateAdmin(email, 'wrongwrong12', authenticator.generate(SECRET))).ok).toBe(false);
  });
  it('fails on wrong TOTP', async () => {
    expect((await authenticateAdmin(email, 'correcthorse12', '000000')).ok).toBe(false);
  });
  it('locks after threshold consecutive fails', async () => {
    for (let i = 0; i < ADMIN_LOCKOUT_THRESHOLD; i++) await authenticateAdmin(email, 'wrongwrong12', '000000');
    // even a correct attempt is now rejected (locked)
    const r = await authenticateAdmin(email, 'correcthorse12', authenticator.generate(SECRET));
    expect(r.ok).toBe(false);
    const u = await prisma.adminUser.findUniqueOrThrow({ where: { email } });
    expect(u.lockedUntil).toBeTruthy();
  });
  it('resets failure count on success', async () => {
    await authenticateAdmin(email, 'wrongwrong12', '000000');
    await authenticateAdmin(email, 'correcthorse12', authenticator.generate(SECRET));
    const u = await prisma.adminUser.findUniqueOrThrow({ where: { email } });
    expect(u.failedLoginCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implementation**

```ts
import { prisma } from '@/lib/db/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { decryptSecret } from './crypto';
import { verifyTotp } from './totp';
import { ADMIN_LOCKOUT_THRESHOLD, ADMIN_LOCKOUT_MS } from './constants';

type Result = { ok: true; adminUserId: string } | { ok: false };

// Security-critical core (unit-tested). Generic failure — never reveals which factor failed
// or whether the email exists. Lockout: 5 consecutive fails → 30-min lock; success resets.
export async function authenticateAdmin(email: string, password: string, totp: string): Promise<Result> {
  const admin = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!admin || admin.status !== 'active') return { ok: false };
  if (admin.lockedUntil && admin.lockedUntil > new Date()) return { ok: false };

  const pwOk = admin.passwordHash ? await verifyPassword(password, admin.passwordHash) : false;
  const totpOk = pwOk && admin.totpSecret ? verifyTotp(decryptSecret(admin.totpSecret), totp) : false;

  if (!pwOk || !totpOk) {
    const count = admin.failedLoginCount + 1;
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        failedLoginCount: count,
        lockedUntil: count >= ADMIN_LOCKOUT_THRESHOLD ? new Date(Date.now() + ADMIN_LOCKOUT_MS) : admin.lockedUntil,
      },
    });
    return { ok: false };
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  return { ok: true, adminUserId: admin.id };
}
```

- [ ] **Step 4: Run → PASS.** Commit:
```bash
git add lib/admin-auth/authenticate.ts lib/admin-auth/authenticate.test.ts
git commit -m "feat(admin-auth): authenticateAdmin (pw+TOTP+lockout, generic failure)"
```

---

## Task 7: Re-auth base

**Files:** Create `lib/admin-auth/reauth.ts`; Test `lib/admin-auth/reauth.test.ts` (local DB)

- [ ] **Step 1: Failing test**

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { authenticator } from 'otplib';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { encryptSecret } from './crypto';
import { verifyReauth } from './reauth';

process.env.ADMIN_TOTP_ENC_KEY = Buffer.alloc(32, 7).toString('base64');
const SECRET = authenticator.generateSecret();
let adminId: string;
beforeEach(async () => {
  await prisma.reauthChallenge.deleteMany();
  await prisma.adminUser.deleteMany({ where: { email: 'reauth@test.local' } });
  const a = await prisma.adminUser.create({
    data: { email: 'reauth@test.local', name: 'A', passwordHash: await hashPassword('correcthorse12'), totpSecret: encryptSecret(SECRET), totpEnabled: true },
  });
  adminId = a.id;
});
afterAll(async () => { await prisma.$disconnect(); });

describe('verifyReauth', () => {
  it('verifies pw + TOTP and writes a challenge row', async () => {
    const r = await verifyReauth(adminId, 'refund', 'correcthorse12', authenticator.generate(SECRET));
    expect(r.ok).toBe(true);
    const row = await prisma.reauthChallenge.findFirstOrThrow({ where: { adminUserId: adminId } });
    expect(row.verifiedAt).toBeTruthy();
    expect(row.verificationMethod).toBe('password+totp');
    expect(row.actionType).toBe('refund');
  });
  it('rejects wrong TOTP (no verified row)', async () => {
    const r = await verifyReauth(adminId, 'refund', 'correcthorse12', '000000');
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implementation**

```ts
import { prisma } from '@/lib/db/prisma';
import type { ReauthActionType } from '@prisma/client';
import { verifyPassword } from '@/lib/auth/password';
import { decryptSecret } from './crypto';
import { verifyTotp } from './totp';
import { AUTH_METHOD } from './constants';

// Re-auth foundation (CLAUDE.md §3.8). Sensitive actions call this; on success a verified
// reauth_challenges row is written. Wiring into each action happens with that feature.
export async function createReauthChallenge(adminUserId: string, actionType: ReauthActionType, targetId?: string) {
  return prisma.reauthChallenge.create({ data: { adminUserId, actionType, targetId: targetId ?? null } });
}

export async function verifyReauth(
  adminUserId: string, actionType: ReauthActionType, password: string, totp: string, targetId?: string,
): Promise<{ ok: boolean }> {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminUserId } });
  if (!admin?.passwordHash || !admin.totpSecret) return { ok: false };
  if (!(await verifyPassword(password, admin.passwordHash))) return { ok: false };
  if (!verifyTotp(decryptSecret(admin.totpSecret), totp)) return { ok: false };
  await prisma.reauthChallenge.create({
    data: { adminUserId, actionType, targetId: targetId ?? null, verifiedAt: new Date(), verificationMethod: AUTH_METHOD.PASSWORD_TOTP },
  });
  return { ok: true };
}
```

- [ ] **Step 4: Run → PASS.** Commit:
```bash
git add lib/admin-auth/reauth.ts lib/admin-auth/reauth.test.ts
git commit -m "feat(admin-auth): re-auth base (pw+TOTP challenge create/verify)"
```

---

## Task 8: Admin Auth.js instance (config + route)

**Files:** Create `lib/admin-auth/config.ts`, `adminAuth.ts`, `app/api/admin/auth/[...nextauth]/route.ts`

- [ ] **Step 1: config**

`lib/admin-auth/config.ts`:
```ts
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { headers } from 'next/headers';
import { adminLoginSchema } from '@/lib/validations/admin-auth';
import { authenticateAdmin } from './authenticate';
import { metaFromHeaders } from '@/lib/auth/device';
import { createAdminSession, validateAdminSession } from './session';
import { ADMIN_SESSION_MAX_AGE_MS } from './constants';

const isProd = process.env.NODE_ENV === 'production';

export const adminAuthConfig: NextAuthConfig = {
  basePath: '/api/admin/auth',
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, totp: {} },
      async authorize(raw) {
        const parsed = adminLoginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const r = await authenticateAdmin(parsed.data.email, parsed.data.password, parsed.data.totp);
        return r.ok ? { id: r.adminUserId } : null;
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: ADMIN_SESSION_MAX_AGE_MS / 1000 },
  pages: { signIn: '/admin/login' },
  // Separate cookies so customer & admin sessions NEVER mix.
  cookies: {
    sessionToken: { name: 'authjs.admin-session-token', options: { httpOnly: true, sameSite: 'lax', path: '/', secure: isProd } },
    csrfToken: { name: 'authjs.admin-csrf-token', options: { httpOnly: true, sameSite: 'lax', path: '/', secure: isProd } },
    callbackUrl: { name: 'authjs.admin-callback-url', options: { sameSite: 'lax', path: '/', secure: isProd } },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        const meta = metaFromHeaders(await headers());
        const { sessionId } = await createAdminSession(user.id, meta);
        token.adminUserId = user.id;
        token.sessionId = sessionId;
      } else if (token.sessionId) {
        const ok = await validateAdminSession(token.sessionId as string);
        if (!ok) { token.adminUserId = undefined; token.sessionId = undefined; }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.adminUserId) {
        (session.user as { id?: string }).id = token.adminUserId as string;
        (session as { sessionId?: string }).sessionId = token.sessionId as string;
      }
      return session;
    },
  },
};
```

`adminAuth.ts` (root):
```ts
import NextAuth from 'next-auth';
import { adminAuthConfig } from '@/lib/admin-auth/config';

export const { handlers: adminHandlers, auth: adminAuth, signIn: adminSignIn, signOut: adminSignOut } = NextAuth(adminAuthConfig);
```

`app/api/admin/auth/[...nextauth]/route.ts`:
```ts
import { adminHandlers } from '@/adminAuth';
export const { GET, POST } = adminHandlers;
```

- [ ] **Step 2: Typecheck + smoke**

Run: `pnpm exec tsc --noEmit` (no errors). Then `pnpm exec tsx -e "import('./adminAuth').then(m=>console.log(typeof m.adminAuth))"` → `function`.

- [ ] **Step 3: Commit**
```bash
git add lib/admin-auth/config.ts adminAuth.ts app/api/admin/auth
git commit -m "feat(admin-auth): second Auth.js instance (separate cookie/basePath)"
```

---

## Task 9: Admin seed (roles + Super Admin)

**Files:** Create `prisma/seed-admin.ts`; Modify `package.json` (add `seed:admin` script)

- [ ] **Step 1: Seed script**

`prisma/seed-admin.ts`:
```ts
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
```

Add to `package.json` scripts: `"seed:admin": "tsx prisma/seed-admin.ts"`.

- [ ] **Step 2: Run roles-only seed (no Super Admin env) to verify**

Run: `pnpm seed:admin` → expect "Roles seeded...". Verify: `pnpm exec tsx -e "import('@/lib/db/prisma').then(async ({prisma})=>{console.log(await prisma.adminRole.count()); await prisma.\$disconnect()})"` → `7`.

- [ ] **Step 3: Commit**
```bash
git add prisma/seed-admin.ts package.json
git commit -m "feat(admin-auth): seed script (7 roles + env-driven Super Admin)"
```

---

## Task 10: Admin guard layout + login UI + dashboard

**Files:** Create `app/admin/(protected)/layout.tsx`, `app/admin/(protected)/dashboard/page.tsx`, `app/admin/login/page.tsx`, `components/admin/login-form.tsx`, `lib/admin-auth/actions.ts`

- [ ] **Step 1: Login action**

`lib/admin-auth/actions.ts`:
```ts
'use server';
import { adminSignIn, adminSignOut } from '@/adminAuth';

export async function adminLoginAction(input: { email: string; password: string; totp: string }) {
  try {
    await adminSignIn('credentials', { ...input, redirect: false });
    return { ok: true as const };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err && String((err as { digest?: unknown }).digest).startsWith('NEXT_REDIRECT')) throw err;
    return { ok: false as const };
  }
}
export async function adminLogoutAction() {
  await adminSignOut({ redirectTo: '/admin/login' });
}
```

- [ ] **Step 2: Login form (client)**

`components/admin/login-form.tsx`:
```tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { adminLoginSchema, type AdminLoginInput } from '@/lib/validations/admin-auth';
import { adminLoginAction } from '@/lib/admin-auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AdminLoginForm() {
  const router = useRouter();
  const [err, setErr] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<AdminLoginInput>({ resolver: zodResolver(adminLoginSchema) });
  async function onSubmit(values: AdminLoginInput) {
    setErr('');
    const r = await adminLoginAction(values);
    if (!r.ok) { setErr('Invalid credentials.'); return; }
    router.push('/admin/dashboard');
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div><Label htmlFor="email">Email</Label><Input id="email" type="email" {...register('email')} /></div>
      <div><Label htmlFor="password">Password</Label><Input id="password" type="password" {...register('password')} /></div>
      <div><Label htmlFor="totp">2FA code</Label><Input id="totp" inputMode="numeric" {...register('totp')} /></div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">Sign in</Button>
    </form>
  );
}
```

`app/admin/login/page.tsx`:
```tsx
import { AdminLoginForm } from '@/components/admin/login-form';
export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6">
      <h1 className="text-center text-2xl font-bold">KING STUDIO Admin</h1>
      <AdminLoginForm />
    </main>
  );
}
```

- [ ] **Step 3: Guard layout + dashboard**

`app/admin/(protected)/layout.tsx`:
```tsx
import { redirect } from 'next/navigation';
import { adminAuth } from '@/adminAuth';

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await adminAuth();
  if (!(session?.user as { id?: string } | undefined)?.id) redirect('/admin/login');
  return <>{children}</>;
}
```

`app/admin/(protected)/dashboard/page.tsx`:
```tsx
import { adminAuth } from '@/adminAuth';
import { prisma } from '@/lib/db/prisma';
import { getAdminPermissions } from '@/lib/admin-auth/rbac';
import { adminLogoutAction } from '@/lib/admin-auth/actions';
import { Button } from '@/components/ui/button';

export default async function AdminDashboard() {
  const session = await adminAuth();
  const adminId = (session?.user as { id?: string } | undefined)?.id;
  const admin = adminId ? await prisma.adminUser.findUnique({ where: { id: adminId } }) : null;
  const perms = adminId ? await getAdminPermissions(adminId) : [];
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4">
      <h1 className="text-2xl font-bold">Admin dashboard</h1>
      <p className="text-muted-foreground">{admin?.email}</p>
      <p className="text-xs text-muted-foreground">permissions: {perms.length}</p>
      <form action={async () => { 'use server'; await adminLogoutAction(); }}>
        <Button type="submit" variant="outline" className="w-full">Log out</Button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: Typecheck + commit**

Run: `pnpm exec tsc --noEmit`.
```bash
git add "app/admin" components/admin lib/admin-auth/actions.ts
git commit -m "feat(admin-auth): /admin login UI, protected layout guard, dashboard, logout"
```

---

## Task 11: CLAUDE.md §4 — Engineer row-scope danger-zone note (VERIFY)

**Files:** `CLAUDE.md` (likely already present — do NOT duplicate)

> This note was already added to CLAUDE.md §4 in a prior session and committed before implementation began. This task is a **verification**, not a new edit.

- [ ] **Step 1: Verify the §4 Engineer row-scope bullet exists**

Run: `grep -n "Engineer 행 스코프" CLAUDE.md`
Expected: one match in the §4 danger-zone list stating Engineer's checkin/upload/select are limited to own assigned bookings (`booking.engineerId === adminId`) and that an owner check must be added when those features are built.

- [ ] **Step 2: If — and only if — the grep returns nothing**, add this bullet to the §4 list and commit:

```markdown
- **Engineer 행 스코프(본인 세션 한정)** — Engineer 역할은 체크인·콘텐츠 업로드·셀렉트를 **본인에게 배정된 예약(booking.engineerId === adminId)만** 수행할 수 있다. RBAC 권한(`checkin:write`·`content:upload`·`photo:select`)은 거친 레벨이므로, 해당 기능(체크인·콘텐츠 업로드) 구현 시 **owner 체크를 반드시 추가**한다(미적용 시 다른 엔지니어의 세션 접근 = 권한 우회).
```
```bash
git add CLAUDE.md && git commit -m "docs(claude): §4 Engineer row-scope danger zone (owner check at feature time)"
```
(If the note already exists, this task is complete — no commit.)

---

## Task 12: E2E (Playwright)

**Files:** Create `e2e/admin-auth.spec.ts`; Modify `playwright.config.ts` (load `.env`). The spec seeds its own admins via Prisma in `test.beforeAll`.

**⚠ Why .env must load in the Playwright process:** the seeded TOTP secret is encrypted in the test process and decrypted by the **dev server** at login — they MUST share `ADMIN_TOTP_ENC_KEY`. So the test process loads `.env` (same key + `DATABASE_URL` as the dev server). And the spec uses **relative imports only** (no `@/` alias — Playwright won't resolve it) and **inlines** role perms (importing `rbac.ts` would pull the `@/` chain).

- [ ] **Step 0: Load .env in playwright.config.ts** (`dotenv` already installed in Task 1)

Add to the TOP of `playwright.config.ts`:
```ts
import 'dotenv/config';
```
(`lib/db/prisma.ts`, `lib/auth/password.ts`, `lib/admin-auth/crypto.ts` import only node_modules/builtins — relative imports of them resolve under Playwright. `rbac.ts` imports `@/lib/db/prisma`, so do NOT import it here.)

- [ ] **Step 1: Spec**

`e2e/admin-auth.spec.ts`:
```ts
import { test, expect } from '@playwright/test';
import { authenticator } from 'otplib';
import { prisma } from '../lib/db/prisma';
import { hashPassword } from '../lib/auth/password';
import { encryptSecret } from '../lib/admin-auth/crypto';

const SECRET = authenticator.generateSecret();
const SUPER = `e2e_super_${Date.now()}@test.local`;

test.beforeAll(async () => {
  // ADMIN_TOTP_ENC_KEY comes from .env (loaded by playwright.config) — SAME key the dev server uses.
  // ['*'] inlined (only datum needed); avoids importing rbac.ts (which chains to the '@/' alias).
  await prisma.adminRole.upsert({ where: { name: 'Super Admin' }, update: { permissions: ['*'] }, create: { name: 'Super Admin', permissions: ['*'] } });
  await prisma.adminUser.upsert({
    where: { email: SUPER }, update: {},
    create: { email: SUPER, name: 'E2E', passwordHash: await hashPassword('correcthorse12'), totpSecret: encryptSecret(SECRET), totpEnabled: true, status: 'active' },
  });
  // assign the Super Admin role so the dashboard's permission count is non-zero
  const role = await prisma.adminRole.findUniqueOrThrow({ where: { name: 'Super Admin' } });
  const admin = await prisma.adminUser.findUniqueOrThrow({ where: { email: SUPER } });
  await prisma.adminUserRole.upsert({
    where: { adminUserId_adminRoleId: { adminUserId: admin.id, adminRoleId: role.id } },
    update: {}, create: { adminUserId: admin.id, adminRoleId: role.id },
  });
  await prisma.$disconnect();
});

async function login(page: import('@playwright/test').Page, email: string) {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('correcthorse12');
  await page.getByLabel('2FA code').fill(authenticator.generate(SECRET));
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
  // Sign up as a customer, then try /admin — must be bounced to admin login.
  // ⚠ IMPLEMENTER: match the selectors + post-signup redirect to the EXISTING customer signup
  //   E2E (e2e/auth.spec.ts) — copy its working signup steps verbatim rather than guessing.
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
```

> NOTE on permission-deny E2E: this slice has no permission-gated admin route yet (the dashboard only needs a session). A full route-level `requirePermission` deny is unit-tested in Task 5 (`hasPermission`/`getAdminPermissions`). The first permission-gated admin route (a later feature) adds its own deny E2E. Flag this to Aiden at verification.

- [ ] **Step 2: Run E2E** — kill :3000 first.

Run: `lsof -ti tcp:3000 | xargs kill 2>/dev/null; sleep 1; pnpm e2e e2e/admin-auth.spec.ts`
Expected: all admin-auth tests pass. (If the second Auth.js instance leaks cookies / shares CSRF with the customer instance, the "session separation" test fails — that is the §4 signal the spec's fallback refers to. If unresolvable, STOP and report per the spec.)

- [ ] **Step 3: Commit**
```bash
git add e2e/admin-auth.spec.ts
git commit -m "test(admin-auth): E2E — login, wrong-TOTP, guard, session separation, logout"
```

---

## Final: full verification

- [ ] `pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build`
- [ ] `pnpm e2e` (customer + admin specs) all green.
- [ ] Hand to Aiden: §4 verification of the two critical E2E — **session separation** and (unit-level) **permission deny** — plus a manual check that the admin cookie name differs from the customer one in devtools.
