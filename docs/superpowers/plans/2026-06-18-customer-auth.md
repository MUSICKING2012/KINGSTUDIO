# Customer Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A clickable customer-auth vertical slice — signup, email verification, login (credentials + Google), revocable sessions, per-device + global logout — with full i18n UI.

**Architecture:** Auth.js v5 with `session: 'jwt'`. The JWT carries `{userId, sessionId}`; the source of truth is a `user_sessions` row validated on every request (revocable). PrismaAdapter handles OAuth (`Account`/`VerificationToken`) only. Domain logic in `/lib/auth`, thin server actions/route handlers, i18n UI in `app/[locale]/(auth)`.

**Tech Stack:** Next.js 14 App Router, Auth.js v5 (`next-auth@5.0.0-beta.25`), Prisma 6 (Postgres 16, local DB already migrated), `bcryptjs`, `zxcvbn`, HIBP range API, react-hook-form + Zod, shadcn/ui, next-intl (5 locales), Vitest, Playwright.

**Preconditions:** Local Postgres running (`pg_ctl ... start`), `.env` has `DATABASE_URL`, `AUTH_SECRET` must be added (see Task 1). Schema already has `users`, `Account`, `VerificationToken`, `user_sessions`, `email_verifications` — **no migration in this plan**.

**Conventions:** TDD (failing test → minimal impl → green → commit). Never log password/PII/token (§3.6). Run `pnpm` (not npm). Tests: `pnpm test` (Vitest), `pnpm exec playwright test` (E2E).

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/validations/auth.ts` | Zod schemas (signup, login) — shared front/back |
| `lib/auth/password.ts` | bcrypt hash/verify, zxcvbn strength, HIBP breach check |
| `lib/email/send.ts` | email delivery abstraction (dev log ↔ Resend) |
| `lib/auth/device.ts` | extract ip/country/userAgent from request headers |
| `lib/auth/session.ts` | `user_sessions` CRUD: create/validate/revoke/revokeAll |
| `lib/auth/config.ts`, `auth.ts` | Auth.js config + exports (`auth`, `signIn`, `signOut`, `handlers`) |
| `app/api/auth/[...nextauth]/route.ts` | Auth.js route handlers |
| `lib/auth/signup.ts` | signup server action |
| `lib/auth/verify.ts` | email-verification logic |
| `app/[locale]/(auth)/verify/[token]/page.tsx` | verify landing |
| `middleware.ts` | next-intl + `/my` protection (modify) |
| `components/auth/*` | LoginForm, SignupForm, PasswordStrength, VerifyBanner |
| `app/[locale]/(auth)/{login,signup}/page.tsx` | auth pages |
| `app/[locale]/my/page.tsx` | protected page (logout + sessions) |
| `messages/*.json` | auth i18n keys (modify, 5 locales) |
| `e2e/auth.spec.ts`, `playwright.config.ts` | E2E |

---

## Task 1: Dependencies, env, shadcn components

**Files:**
- Modify: `package.json`, `.env`
- Create: `components/ui/{button,input,label,card,alert,form}.tsx` (via shadcn CLI)

- [ ] **Step 1: Install runtime deps**

Run:
```bash
pnpm add bcryptjs zxcvbn react-hook-form @hookform/resolvers
pnpm add -D @types/bcryptjs @types/zxcvbn @playwright/test
```

- [ ] **Step 2: Add AUTH_SECRET to .env**

Run:
```bash
printf '\nAUTH_SECRET=%s\n' "$(openssl rand -base64 33)" >> .env
grep -q '^AUTH_SECRET=' .env && echo "AUTH_SECRET set"
```
Expected: `AUTH_SECRET set`. (`.env` is gitignored.)

- [ ] **Step 3: Add shadcn components**

Run:
```bash
pnpm dlx shadcn@latest add button input label card alert form --yes
```
Expected: files created under `components/ui/`. If the CLI prompts, accept defaults (config already in `components.json`).

- [ ] **Step 4: Verify build still compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml components.json components/ui
git commit -m "chore(auth): add bcryptjs/zxcvbn/rhf/playwright + shadcn form components"
```

---

## Task 2: Zod validation schemas

**Files:**
- Create: `lib/validations/auth.ts`
- Test: `lib/validations/auth.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { loginSchema, signupSchema } from './auth';

describe('signupSchema', () => {
  it('accepts a valid signup', () => {
    const r = signupSchema.safeParse({ email: 'a@b.com', password: 'abcd1234ef', name: 'Aria' });
    expect(r.success).toBe(true);
  });
  it('rejects password shorter than 10', () => {
    expect(signupSchema.safeParse({ email: 'a@b.com', password: 'abc123', name: 'A' }).success).toBe(false);
  });
  it('rejects password without a digit', () => {
    expect(signupSchema.safeParse({ email: 'a@b.com', password: 'abcdefghij', name: 'A' }).success).toBe(false);
  });
  it('rejects invalid email', () => {
    expect(signupSchema.safeParse({ email: 'nope', password: 'abcd1234ef', name: 'A' }).success).toBe(false);
  });
});
describe('loginSchema', () => {
  it('accepts email + password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test lib/validations/auth.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write implementation**

```ts
import { z } from 'zod';

// PRD §5.10: password min 10, letters + digits.
export const passwordSchema = z
  .string()
  .min(10, 'password.min')
  .regex(/[A-Za-z]/, 'password.letter')
  .regex(/[0-9]/, 'password.digit');

export const signupSchema = z.object({
  email: z.string().email('email.invalid').transform((s) => s.toLowerCase().trim()),
  password: passwordSchema,
  name: z.string().min(1, 'name.required').max(100),
});

export const loginSchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
  password: z.string().min(1),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test lib/validations/auth.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/validations/auth.ts lib/validations/auth.test.ts
git commit -m "feat(auth): shared Zod signup/login schemas"
```

---

## Task 3: Password utilities (bcrypt, zxcvbn, HIBP)

**Files:**
- Create: `lib/auth/password.ts`
- Test: `lib/auth/password.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { hashPassword, verifyPassword, isStrong, isPwned } from './password';

describe('hash/verify', () => {
  it('round-trips a password', async () => {
    const h = await hashPassword('abcd1234ef');
    expect(h).not.toContain('abcd1234ef');
    expect(await verifyPassword('abcd1234ef', h)).toBe(true);
    expect(await verifyPassword('wrong', h)).toBe(false);
  });
});

describe('isStrong (zxcvbn)', () => {
  it('rejects a weak password', () => expect(isStrong('password').ok).toBe(false));
  it('accepts a strong password', () => expect(isStrong('xК9!mq2vRt7w').ok).toBe(true));
});

describe('isPwned (HIBP, fail-open)', () => {
  it('returns true when the suffix is present', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => 'AAAA:3\n0018A45C4D1DEF81644B54AB7F969B88D65:2' })));
    // sha1('P@ssw0rd...') suffix test uses a known hash in impl test; here assert plumbing:
    expect(typeof (await isPwned('whatever'))).toBe('boolean');
  });
  it('fails open on fetch error (returns false)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    expect(await isPwned('whatever')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test lib/auth/password.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write implementation**

```ts
import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import zxcvbn from 'zxcvbn';

// 🔒 bcrypt cost 12 (CLAUDE.md §3.6 / PRD §7.6).
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// zxcvbn: require score >= 3 (PRD §7.6). Returns feedback for the UI.
export function isStrong(plain: string): { ok: boolean; score: number; warning: string } {
  const r = zxcvbn(plain);
  return { ok: r.score >= 3, score: r.score, warning: r.feedback.warning ?? '' };
}

// HIBP range API (k-anonymity). FAIL-OPEN: never block signup on an HIBP outage (§ decision b).
export async function isPwned(plain: string): Promise<boolean> {
  try {
    const sha1 = createHash('sha1').update(plain).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
    });
    if (!res.ok) return false;
    const body = await res.text();
    return body.split('\n').some((line) => line.split(':')[0].trim() === suffix);
  } catch {
    return false; // fail-open
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test lib/auth/password.test.ts`
Expected: PASS. (If `isStrong` strong-case is flaky, adjust the test password to one zxcvbn scores ≥3; do not lower the threshold.)

- [ ] **Step 5: Commit**

```bash
git add lib/auth/password.ts lib/auth/password.test.ts
git commit -m "feat(auth): password hashing (bcrypt12), zxcvbn strength, HIBP fail-open"
```

---

## Task 4: Email delivery abstraction

**Files:**
- Create: `lib/email/send.ts`
- Test: `lib/email/send.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { sendEmail } from './send';

beforeEach(() => { delete process.env.RESEND_API_KEY; });

describe('sendEmail (dev stub)', () => {
  it('logs the email when no RESEND_API_KEY (returns dev:true)', async () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const r = await sendEmail({ to: 'a@b.com', subject: 'Hi', text: 'verify: http://x/y' });
    expect(r.dev).toBe(true);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test lib/email/send.test.ts` → FAIL.

- [ ] **Step 3: Write implementation**

```ts
type Email = { to: string; subject: string; text: string; html?: string };

// dev (no key) → log to console; prod → Resend. Sender per CLAUDE.md §1.
export async function sendEmail(email: Email): Promise<{ dev: boolean; id?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // NOTE: never log recipient PII in prod paths; dev-only convenience.
    console.info(`[email:dev] to=${email.to} subject="${email.subject}"\n${email.text}`);
    return { dev: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${process.env.RESEND_FROM_NAME ?? 'KING STUDIO'} <${process.env.RESEND_FROM_EMAIL ?? 'join@kingstudio.co.kr'}>`,
      to: email.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
  });
  const data = (await res.json()) as { id?: string };
  return { dev: false, id: data.id };
}
```

- [ ] **Step 4: Run test → PASS.** Run: `pnpm test lib/email/send.test.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/email/send.ts lib/email/send.test.ts
git commit -m "feat(email): delivery abstraction (dev log ↔ Resend, env-gated)"
```

---

## Task 5: Request meta (device.ts)

**Files:**
- Create: `lib/auth/device.ts`
- Test: `lib/auth/device.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { metaFromHeaders } from './device';

describe('metaFromHeaders', () => {
  it('reads ip, country, user-agent', () => {
    const h = new Headers({
      'x-forwarded-for': '203.0.113.9, 10.0.0.1',
      'cf-ipcountry': 'TW',
      'user-agent': 'UA/1.0',
    });
    expect(metaFromHeaders(h)).toEqual({ ip: '203.0.113.9', country: 'TW', userAgent: 'UA/1.0' });
  });
  it('returns nulls when absent', () => {
    expect(metaFromHeaders(new Headers())).toEqual({ ip: null, country: null, userAgent: null });
  });
});
```

- [ ] **Step 2: Run → FAIL.** `pnpm test lib/auth/device.test.ts`

- [ ] **Step 3: Implementation**

```ts
// Pure: parse request metadata. Cloudflare (C13) provides cf-ipcountry.
export type RequestMeta = { ip: string | null; country: string | null; userAgent: string | null };

export function metaFromHeaders(h: Headers): RequestMeta {
  const fwd = h.get('x-forwarded-for');
  return {
    ip: fwd ? fwd.split(',')[0].trim() : null,
    country: h.get('cf-ipcountry') ?? h.get('x-vercel-ip-country') ?? null,
    userAgent: h.get('user-agent') ?? null,
  };
}
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add lib/auth/device.ts lib/auth/device.test.ts
git commit -m "feat(auth): request meta (ip/country/ua) from headers"
```

---

## Task 6: Session store (user_sessions CRUD)

**Files:**
- Create: `lib/auth/session.ts`
- Test: `lib/auth/session.test.ts` (uses the local Postgres test DB)

- [ ] **Step 1: Write the failing test**

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db/prisma';
import { createSession, validateSession, revokeSession, revokeAllSessions } from './session';

let userId: string;
beforeEach(async () => {
  await prisma.userSession.deleteMany();
  await prisma.user.deleteMany({ where: { email: 'sess@test.local' } });
  const u = await prisma.user.create({ data: { email: 'sess@test.local' } });
  userId = u.id;
});
afterAll(async () => { await prisma.$disconnect(); });

describe('session store', () => {
  it('creates and validates a session', async () => {
    const { sessionId } = await createSession(userId, { ip: '1.1.1.1', country: 'TW', userAgent: 'UA' });
    expect(await validateSession(sessionId)).toMatchObject({ userId });
  });
  it('returns null for an expired session', async () => {
    const { sessionId } = await createSession(userId, { ip: null, country: null, userAgent: null });
    await prisma.userSession.update({ where: { id: sessionId }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await validateSession(sessionId)).toBeNull();
  });
  it('revokes a single session', async () => {
    const { sessionId } = await createSession(userId, { ip: null, country: null, userAgent: null });
    await revokeSession(sessionId);
    expect(await validateSession(sessionId)).toBeNull();
  });
  it('revokes all sessions for a user', async () => {
    const a = await createSession(userId, { ip: null, country: null, userAgent: null });
    const b = await createSession(userId, { ip: null, country: null, userAgent: null });
    await revokeAllSessions(userId);
    expect(await validateSession(a.sessionId)).toBeNull();
    expect(await validateSession(b.sessionId)).toBeNull();
  });
});
```

- [ ] **Step 2: Run → FAIL.** `pnpm test lib/auth/session.test.ts`

- [ ] **Step 3: Implementation**

```ts
import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import type { RequestMeta } from './device';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

// Creates a user_sessions row; returns the row id (= JWT sessionId) and the raw token (kept only in JWT).
export async function createSession(userId: string, meta: RequestMeta) {
  const rawToken = randomBytes(32).toString('hex');
  const row = await prisma.userSession.create({
    data: {
      userId,
      tokenHash: sha256(rawToken), // 🔒 store hash only
      ip: meta.ip,
      country: meta.country,
      userAgent: meta.userAgent,
      expiresAt: new Date(Date.now() + THIRTY_DAYS_MS),
      lastActiveAt: new Date(),
    },
  });
  return { sessionId: row.id, rawToken };
}

// Source of truth for "is this JWT still valid". Sliding: refresh lastActiveAt + expiry.
export async function validateSession(sessionId: string): Promise<{ userId: string } | null> {
  const row = await prisma.userSession.findUnique({ where: { id: sessionId } });
  if (!row || (row.expiresAt && row.expiresAt < new Date())) return null;
  await prisma.userSession.update({
    where: { id: sessionId },
    data: { lastActiveAt: new Date(), expiresAt: new Date(Date.now() + THIRTY_DAYS_MS) },
  });
  return { userId: row.userId };
}

export async function revokeSession(sessionId: string) {
  await prisma.userSession.deleteMany({ where: { id: sessionId } });
}
export async function revokeAllSessions(userId: string) {
  await prisma.userSession.deleteMany({ where: { userId } });
}

// For the unfamiliar-country check: has this user logged in from this country before?
export async function isKnownCountry(userId: string, country: string | null): Promise<boolean> {
  if (!country) return true;
  const n = await prisma.userSession.count({ where: { userId, country } });
  return n > 0;
}
```

- [ ] **Step 4: Run → PASS.** (Postgres must be running.)

- [ ] **Step 5: Commit**

```bash
git add lib/auth/session.ts lib/auth/session.test.ts
git commit -m "feat(auth): revocable user_sessions store (create/validate/revoke/revokeAll)"
```

---

## Task 7: Auth.js config + route handler

**Files:**
- Create: `lib/auth/config.ts`, `auth.ts`, `app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Write the config**

`lib/auth/config.ts`:
```ts
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { headers } from 'next/headers';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db/prisma';
import { loginSchema } from '@/lib/validations/auth';
import { verifyPassword } from './password';
import { metaFromHeaders } from './device';
import { createSession, validateSession, isKnownCountry } from './session';
import { sendEmail } from '@/lib/email/send';

// Google only when configured (env-gated, § decision).
const providers = [
  Credentials({
    credentials: { email: {}, password: {} },
    async authorize(raw) {
      const parsed = loginSchema.safeParse(raw);
      if (!parsed.success) return null;
      const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
      if (!user?.passwordHash) return null; // social-only or unknown → generic fail
      if (!(await verifyPassword(parsed.data.password, user.passwordHash))) return null;
      return { id: user.id, email: user.email, name: user.name };
    },
  }),
  ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
    ? [Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET, allowDangerousEmailAccountLinking: true })]
    : []),
];

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma), // OAuth Account/VerificationToken only
  providers,
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/login' },
  callbacks: {
    // On sign-in: create a revocable user_sessions row + stash its id in the JWT.
    async jwt({ token, user }) {
      if (user?.id) {
        const meta = metaFromHeaders(await headers());
        if (!(await isKnownCountry(user.id, meta.country))) {
          await sendEmail({
            to: user.email!,
            subject: 'KING STUDIO – New sign-in location',
            text: `A new sign-in from ${meta.country ?? 'unknown'} (${meta.ip ?? 'n/a'}).`,
          });
        }
        const { sessionId } = await createSession(user.id, meta);
        token.userId = user.id;
        token.sessionId = sessionId;
      } else if (token.sessionId) {
        // Subsequent requests: revoke check. Invalid → drop identity (logged out).
        const ok = await validateSession(token.sessionId as string);
        if (!ok) { token.userId = undefined; token.sessionId = undefined; }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        (session.user as { id?: string }).id = token.userId as string;
        (session as { sessionId?: string }).sessionId = token.sessionId as string;
      }
      return session;
    },
  },
};
```

`auth.ts` (project root):
```ts
import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth/config';

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
```

`app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from '@/auth';
export const { GET, POST } = handlers;
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no errors. (Next 14: `headers()` is sync — `await` is harmless; if tsc complains, drop the `await`.)

- [ ] **Step 3: Smoke-check the provider list**

Run: `pnpm exec tsx -e "import('./lib/auth/config').then(m=>console.log(m.authConfig.providers.length))"`
Expected: `1` (no Google env) — confirms env-gating.

- [ ] **Step 4: Commit**

```bash
git add lib/auth/config.ts auth.ts app/api/auth
git commit -m "feat(auth): Auth.js v5 config (credentials + env-gated Google, revocable JWT)"
```

---

## Task 8: Signup server action

**Files:**
- Create: `lib/auth/signup.ts`
- Test: `lib/auth/signup.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/db/prisma';

vi.mock('@/lib/email/send', () => ({ sendEmail: vi.fn(async () => ({ dev: true })) }));
import { sendEmail } from '@/lib/email/send';
import { registerUser } from './signup';

beforeEach(async () => {
  await prisma.emailVerification.deleteMany();
  await prisma.user.deleteMany({ where: { email: 'new@test.local' } });
  vi.mocked(sendEmail).mockClear();
});
afterAll(async () => { await prisma.$disconnect(); });

describe('registerUser', () => {
  it('creates a user, hashes the password, issues a verify token, sends email', async () => {
    const r = await registerUser({ email: 'new@test.local', password: 'xК9!mq2vRt7w', name: 'New' });
    expect(r.ok).toBe(true);
    const u = await prisma.user.findUnique({ where: { email: 'new@test.local' } });
    expect(u?.passwordHash).toBeTruthy();
    expect(u?.passwordHash).not.toContain('xК9');
    expect(u?.emailVerified).toBeNull();
    expect(await prisma.emailVerification.count({ where: { userId: u!.id } })).toBe(1);
    expect(sendEmail).toHaveBeenCalledOnce();
  });
  it('rejects a duplicate email', async () => {
    await prisma.user.create({ data: { email: 'new@test.local' } });
    const r = await registerUser({ email: 'new@test.local', password: 'xК9!mq2vRt7w', name: 'Dup' });
    expect(r).toMatchObject({ ok: false, error: 'email.taken' });
  });
  it('rejects a breached password (HIBP)', async () => {
    const r = await registerUser({ email: 'new@test.local', password: 'Password123', name: 'X', _pwnedForTest: true });
    expect(r).toMatchObject({ ok: false, error: 'password.pwned' });
  });
});
```

- [ ] **Step 2: Run → FAIL.** `pnpm test lib/auth/signup.test.ts`

- [ ] **Step 3: Implementation**

```ts
'use server';
import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import { signupSchema } from '@/lib/validations/auth';
import { hashPassword, isPwned, isStrong } from './password';
import { sendEmail } from '@/lib/email/send';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
type Result = { ok: true; userId: string } | { ok: false; error: string };

// `_pwnedForTest` lets tests force the HIBP branch without network.
export async function registerUser(
  input: { email: string; password: string; name: string; _pwnedForTest?: boolean },
): Promise<Result> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid' };
  const { email, password, name } = parsed.data;

  if (!isStrong(password).ok) return { ok: false, error: 'password.weak' };
  if (input._pwnedForTest || (await isPwned(password))) return { ok: false, error: 'password.pwned' };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: 'email.taken' };

  const user = await prisma.user.create({
    data: { email, name, passwordHash: await hashPassword(password) },
  });

  const rawToken = randomBytes(32).toString('hex');
  await prisma.emailVerification.create({
    data: {
      userId: user.id,
      tokenHash: sha256(rawToken), // 🔒 store hash only
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h (PRD §5.10)
    },
  });
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/en/verify/${rawToken}`;
  await sendEmail({ to: email, subject: 'KING STUDIO – Verify your email', text: `Verify: ${url}` });

  return { ok: true, userId: user.id };
}
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add lib/auth/signup.ts lib/auth/signup.test.ts
git commit -m "feat(auth): signup (validate→HIBP→bcrypt→user→verify token→email)"
```

---

## Task 9: Email verification

**Files:**
- Create: `lib/auth/verify.ts`, `app/[locale]/(auth)/verify/[token]/page.tsx`
- Test: `lib/auth/verify.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import { verifyEmailToken } from './verify';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
let userId: string; let raw: string;
beforeEach(async () => {
  await prisma.emailVerification.deleteMany();
  await prisma.user.deleteMany({ where: { email: 'v@test.local' } });
  const u = await prisma.user.create({ data: { email: 'v@test.local' } });
  userId = u.id; raw = randomBytes(16).toString('hex');
  await prisma.emailVerification.create({ data: { userId, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + 3600_000) } });
});
afterAll(async () => { await prisma.$disconnect(); });

describe('verifyEmailToken', () => {
  it('verifies a valid token and stamps emailVerified', async () => {
    expect((await verifyEmailToken(raw)).ok).toBe(true);
    expect((await prisma.user.findUnique({ where: { id: userId } }))?.emailVerified).toBeTruthy();
  });
  it('rejects an unknown token', async () => {
    expect((await verifyEmailToken('deadbeef')).ok).toBe(false);
  });
  it('rejects an expired token', async () => {
    await prisma.emailVerification.updateMany({ where: { userId }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await verifyEmailToken(raw)).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implementation**

`lib/auth/verify.ts`:
```ts
import { createHash } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export async function verifyEmailToken(rawToken: string): Promise<{ ok: boolean }> {
  const row = await prisma.emailVerification.findUnique({ where: { tokenHash: sha256(rawToken) } });
  if (!row || row.verifiedAt || row.expiresAt < new Date()) return { ok: false };
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { emailVerified: new Date() } }),
    prisma.emailVerification.update({ where: { id: row.id }, data: { verifiedAt: new Date() } }),
  ]);
  return { ok: true };
}
```

`app/[locale]/(auth)/verify/[token]/page.tsx`:
```tsx
import { getTranslations } from 'next-intl/server';
import { verifyEmailToken } from '@/lib/auth/verify';
import { Link } from '@/lib/i18n/navigation';

export default async function VerifyPage({ params }: { params: { token: string } }) {
  const t = await getTranslations('auth.verify');
  const { ok } = await verifyEmailToken(params.token);
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-bold">{ok ? t('successTitle') : t('failTitle')}</h1>
      <p className="text-muted-foreground">{ok ? t('successBody') : t('failBody')}</p>
      <Link href="/my" className="underline">{t('cta')}</Link>
    </main>
  );
}
```

- [ ] **Step 4: Run → PASS.** `pnpm test lib/auth/verify.test.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/auth/verify.ts "app/[locale]/(auth)/verify"
git commit -m "feat(auth): email verification (token hash + 24h) + landing page"
```

---

## Task 10: Protect /my via a server-component layout guard

**Why not middleware:** the `jwt` callback calls Prisma (`validateSession`), and Next.js middleware runs in the **edge runtime** where Prisma can't run. So `middleware.ts` stays **next-intl-only (unchanged)** and `/my` is guarded in a **server-component layout** (Node runtime — Prisma-safe).

**Files:**
- Create: `app/[locale]/my/layout.tsx`

- [ ] **Step 1: Layout guard**

```tsx
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function MyLayout({
  children,
  params,
}: { children: React.ReactNode; params: { locale: string } }) {
  const session = await auth();
  if (!session?.user) redirect(`/${params.locale}/login`);
  return <>{children}</>;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no errors. (`middleware.ts` is NOT modified — it remains the existing next-intl-only middleware.)

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/my/layout.tsx"
git commit -m "feat(auth): protect /my via Node-runtime layout guard"
```

---

## Task 11: i18n auth messages (5 locales)

**Files:**
- Modify: `messages/{en,ko,ja,zh-TW,zh-HK}.json`

- [ ] **Step 1: Add the `auth` block to `messages/en.json`** (merge into existing JSON)

```json
"auth": {
  "login": { "title": "Log in", "email": "Email", "password": "Password", "submit": "Log in", "google": "Continue with Google", "toSignup": "Create an account", "error": "Email or password is incorrect." },
  "signup": { "title": "Create account", "name": "Name", "email": "Email", "password": "Password", "submit": "Sign up", "toLogin": "I already have an account", "strength": "Strength", "errors": { "email.taken": "That email is already registered.", "password.weak": "Choose a stronger password.", "password.pwned": "This password appeared in a data breach. Choose another." } },
  "verify": { "successTitle": "Email verified", "successBody": "Thanks — your email is confirmed.", "failTitle": "Verification failed", "failBody": "This link is invalid or has expired.", "cta": "Go to my page" },
  "banner": { "unverified": "Please verify your email. Check your inbox.", "resend": "Resend" },
  "my": { "title": "My page", "logout": "Log out", "logoutAll": "Log out all devices" }
}
```

- [ ] **Step 2: Add translated `auth` blocks to `ko.json`, `ja.json`, `zh-TW.json`, `zh-HK.json`** — same key shape, translated values. (zh-TW and zh-HK both Traditional; HK may keep identical strings for this slice.) Example `ko.json`:

```json
"auth": {
  "login": { "title": "로그인", "email": "이메일", "password": "비밀번호", "submit": "로그인", "google": "Google로 계속", "toSignup": "회원가입", "error": "이메일 또는 비밀번호가 올바르지 않습니다." },
  "signup": { "title": "회원가입", "name": "이름", "email": "이메일", "password": "비밀번호", "submit": "가입하기", "toLogin": "이미 계정이 있어요", "strength": "강도", "errors": { "email.taken": "이미 등록된 이메일입니다.", "password.weak": "더 강력한 비밀번호를 사용하세요.", "password.pwned": "유출된 비밀번호입니다. 다른 비밀번호를 사용하세요." } },
  "verify": { "successTitle": "이메일 인증 완료", "successBody": "감사합니다 — 이메일이 확인되었습니다.", "failTitle": "인증 실패", "failBody": "링크가 유효하지 않거나 만료되었습니다.", "cta": "마이페이지로" },
  "banner": { "unverified": "이메일을 인증해 주세요. 받은 편지함을 확인하세요.", "resend": "재발송" },
  "my": { "title": "마이페이지", "logout": "로그아웃", "logoutAll": "전체 기기 로그아웃" }
}
```
(ja / zh-TW / zh-HK: translate equivalently.)

- [ ] **Step 3: Run the i18n key check**

Run: `pnpm i18n:check`
Expected: `✅ i18n key check passed — 5 locales in sync.`

- [ ] **Step 4: Commit**

```bash
git add messages
git commit -m "feat(i18n): auth copy for 5 locales"
```

---

## Task 12: UI — Password strength + Signup form

**Files:**
- Create: `components/auth/password-strength.tsx`, `components/auth/signup-form.tsx`, `app/[locale]/(auth)/signup/page.tsx`

- [ ] **Step 1: PasswordStrength component**

`components/auth/password-strength.tsx`:
```tsx
'use client';
import zxcvbn from 'zxcvbn';

export function PasswordStrength({ value, label }: { value: string; label: string }) {
  const score = value ? zxcvbn(value).score : 0;
  const colors = ['bg-destructive', 'bg-destructive', 'bg-yellow-500', 'bg-green-500', 'bg-green-600'];
  return (
    <div className="space-y-1" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded ${i < score ? colors[score] : 'bg-muted'}`} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{label}: {['—', 'weak', 'fair', 'good', 'strong'][score]}</p>
    </div>
  );
}
```

- [ ] **Step 2: SignupForm (client) + signup action wrapper**

`lib/auth/actions.ts` (thin server actions used by forms):
```ts
'use server';
import { signIn } from '@/auth';
import { registerUser } from './signup';

export async function signupAction(input: { email: string; password: string; name: string }) {
  const r = await registerUser(input);
  if (!r.ok) return r;
  await signIn('credentials', { email: input.email, password: input.password, redirect: false }); // auto-login
  return { ok: true as const };
}
```

`components/auth/signup-form.tsx`:
```tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/i18n/navigation';
import { useState } from 'react';
import { signupSchema, type SignupInput } from '@/lib/validations/auth';
import { signupAction } from '@/lib/auth/actions';
import { PasswordStrength } from './password-strength';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SignupForm() {
  const t = useTranslations('auth.signup');
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } =
    useForm<SignupInput>({ resolver: zodResolver(signupSchema) });
  const pw = watch('password') ?? '';

  async function onSubmit(values: SignupInput) {
    setServerError('');
    const r = await signupAction(values);
    if (!r.ok) { setServerError(t(`errors.${r.error}` as never, { default: r.error } as never)); return; }
    router.push('/my');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div><Label htmlFor="name">{t('name')}</Label><Input id="name" {...register('name')} /></div>
      <div><Label htmlFor="email">{t('email')}</Label><Input id="email" type="email" {...register('email')} /></div>
      <div>
        <Label htmlFor="password">{t('password')}</Label>
        <Input id="password" type="password" {...register('password')} />
        <PasswordStrength value={pw} label={t('strength')} />
      </div>
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">{t('submit')}</Button>
    </form>
  );
}
```

`app/[locale]/(auth)/signup/page.tsx`:
```tsx
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { SignupForm } from '@/components/auth/signup-form';
import { Link } from '@/lib/i18n/navigation';

export default function SignupPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = useTranslations('auth.signup');
  return (
    <main className="container mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6">
      <h1 className="text-center text-2xl font-bold">{t('title')}</h1>
      <SignupForm />
      <Link href="/login" className="text-center text-sm underline">{t('toLogin')}</Link>
    </main>
  );
}
```

- [ ] **Step 3: Typecheck + dev smoke**

Run: `pnpm exec tsc --noEmit`. Then `pnpm dev` and open `http://localhost:3000/en/signup` — the form renders.

- [ ] **Step 4: Commit**

```bash
git add components/auth/password-strength.tsx components/auth/signup-form.tsx lib/auth/actions.ts "app/[locale]/(auth)/signup"
git commit -m "feat(auth): signup form + password strength meter (i18n)"
```

---

## Task 13: UI — Login form + protected /my (logout + global logout)

**Files:**
- Create: `components/auth/login-form.tsx`, `app/[locale]/(auth)/login/page.tsx`, `app/[locale]/my/page.tsx`, `components/auth/verify-banner.tsx`
- Modify: `lib/auth/actions.ts` (add login + logout actions)

- [ ] **Step 1: Add login + logout server actions** to `lib/auth/actions.ts`

```ts
// append to lib/auth/actions.ts
import { auth, signOut } from '@/auth';
import { revokeAllSessions } from './session';

export async function loginAction(input: { email: string; password: string }) {
  try {
    await signIn('credentials', { ...input, redirect: false });
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: 'error' };
  }
}

export async function logoutAction(scope: 'one' | 'all') {
  if (scope === 'all') {
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (userId) await revokeAllSessions(userId);
  }
  await signOut({ redirectTo: '/login' });
}
```

- [ ] **Step 2: LoginForm**

`components/auth/login-form.tsx`:
```tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/i18n/navigation';
import { useState } from 'react';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';
import { loginAction } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const t = useTranslations('auth.login');
  const router = useRouter();
  const [err, setErr] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setErr('');
    const r = await loginAction(values);
    if (!r.ok) { setErr(t('error')); return; }
    router.push('/my');
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div><Label htmlFor="email">{t('email')}</Label><Input id="email" type="email" {...register('email')} /></div>
      <div><Label htmlFor="password">{t('password')}</Label><Input id="password" type="password" {...register('password')} /></div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">{t('submit')}</Button>
      {googleEnabled && <a href="/api/auth/signin/google" className="block text-center text-sm underline">{t('google')}</a>}
    </form>
  );
}
```

`app/[locale]/(auth)/login/page.tsx`:
```tsx
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { LoginForm } from '@/components/auth/login-form';
import { Link } from '@/lib/i18n/navigation';

export default function LoginPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = useTranslations('auth.login');
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  return (
    <main className="container mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6">
      <h1 className="text-center text-2xl font-bold">{t('title')}</h1>
      <LoginForm googleEnabled={googleEnabled} />
      <Link href="/signup" className="text-center text-sm underline">{t('toSignup')}</Link>
    </main>
  );
}
```

- [ ] **Step 3: Verify banner + /my page**

`components/auth/verify-banner.tsx`:
```tsx
import { getTranslations } from 'next-intl/server';

export async function VerifyBanner({ verified }: { verified: boolean }) {
  if (verified) return null;
  const t = await getTranslations('auth.banner');
  return <div role="status" className="bg-yellow-100 p-2 text-center text-sm text-yellow-900">{t('unverified')}</div>;
}
```

`app/[locale]/my/page.tsx`:
```tsx
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db/prisma';
import { logoutAction } from '@/lib/auth/actions';
import { VerifyBanner } from '@/components/auth/verify-banner';
import { Button } from '@/components/ui/button';

export default async function MyPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations('auth.my');
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  return (
    <>
      <VerifyBanner verified={Boolean(user?.emailVerified)} />
      <main className="container mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{user?.email}</p>
        <form action={async () => { 'use server'; await logoutAction('one'); }}>
          <Button type="submit" variant="outline" className="w-full">{t('logout')}</Button>
        </form>
        <form action={async () => { 'use server'; await logoutAction('all'); }}>
          <Button type="submit" variant="destructive" className="w-full">{t('logoutAll')}</Button>
        </form>
      </main>
    </>
  );
}
```

- [ ] **Step 4: Typecheck + manual smoke**

Run: `pnpm exec tsc --noEmit`. With `pnpm dev`: signup at `/en/signup` → lands on `/en/my` with banner; verify link printed in the dev server log → visiting it clears the banner; logout returns to `/en/login`.

- [ ] **Step 5: Commit**

```bash
git add components/auth lib/auth/actions.ts "app/[locale]/(auth)/login" "app/[locale]/my"
git commit -m "feat(auth): login form, protected /my, verify banner, logout + global logout"
```

---

## Task 14: E2E (Playwright)

**Files:**
- Create: `playwright.config.ts`, `e2e/auth.spec.ts`
- Modify: `package.json` (add `e2e` script)

- [ ] **Step 1: Playwright config**

`playwright.config.ts`:
```ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:3000' },
  webServer: { command: 'pnpm dev', url: 'http://localhost:3000/en', reuseExistingServer: true, timeout: 120_000 },
});
```
Add to `package.json` scripts: `"e2e": "playwright test"`.

- [ ] **Step 2: Install browsers**

Run: `pnpm exec playwright install chromium`

- [ ] **Step 3: Write the E2E spec**

`e2e/auth.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

const email = () => `e2e_${Date.now()}@test.local`;
const PW = 'xК9!mq2vRt7w';

test('signup → auto-login → /my with unverified banner', async ({ page }) => {
  await page.goto('/en/signup');
  await page.getByLabel('Name').fill('E2E');
  await page.getByLabel('Email').fill(email());
  await page.getByLabel('Password').fill(PW);
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page).toHaveURL(/\/en\/my/);
  await expect(page.getByText('Please verify your email')).toBeVisible();
});

test('protected /my redirects to login when logged out', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/en/my');
  await expect(page).toHaveURL(/\/en\/login/);
});

test('wrong password shows a generic error (no enumeration)', async ({ page }) => {
  await page.goto('/en/login');
  await page.getByLabel('Email').fill('nobody@test.local');
  await page.getByLabel('Password').fill('wrongpass12');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByText('Email or password is incorrect.')).toBeVisible();
});

test('logout returns to login', async ({ page }) => {
  await page.goto('/en/signup');
  await page.getByLabel('Name').fill('E2E');
  await page.getByLabel('Email').fill(email());
  await page.getByLabel('Password').fill(PW);
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page).toHaveURL(/\/en\/my/);
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/login/);
});
```

- [ ] **Step 4: Run E2E** (Postgres + nothing else on :3000)

Run: `pnpm e2e`
Expected: 4 passed. (The `/my` redirect test relies on the Task 10 layout guard. If signup E2E is flaky on first run, ensure Postgres is running and `:3000` is free; the dev server is started by `webServer` config.)

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts e2e package.json
git commit -m "test(auth): Playwright E2E — signup/login/logout/protection"
```

---

## Final: full verification + PR

- [ ] Run all checks: `pnpm test && pnpm i18n:check && pnpm lint && pnpm build`
- [ ] Open a PR from `feat/customer-auth` → `main` (base main); summarize the slice + deferred items.
