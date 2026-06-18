# Customer Authentication — Design Spec

**Date:** 2026-06-18 · **Milestone:** M1 (auth base) · **Slice:** Customer auth vertical slice
**Status:** Approved (brainstorming) → next: implementation plan

## 1. Goal & Scope

Deliver a working, clickable customer-authentication vertical slice for KING STUDIO: a member can sign up, verify email, log in (credentials or Google), stay logged in across requests, and log out — including per-device and global ("log out all devices") logout. Full i18n UI (5 locales) in the `(auth)` route group.

This establishes the Auth.js v5 **hybrid** wiring (standard adapter for OAuth + custom revocable JWT sessions) that later slices (admin auth, password reset, Apple, guest→member) extend.

### In scope
- Credentials signup / login / logout (email + password).
- Google OAuth (wired, **env-gated** on `AUTH_GOOGLE_ID/SECRET`).
- Email verification (token flow; **env-gated** delivery: dev logs the link, prod uses Resend).
- Revocable JWT sessions backed by `user_sessions` (per-device + global logout, unfamiliar-country record).
- Full i18n auth UI: shadcn forms, react-hook-form + Zod, zxcvbn strength meter, unverified-email banner.
- `/my` route protection via middleware.
- Unit (Vitest) + E2E (Playwright) tests.

### Out of scope (deferred, with home)
- Apple Sign-in, password reset, guest→member booking linking — later customer slices.
- Account lockout / login rate-limit (5 fails/5 min → 30 min) — **Redis (Upstash) security slice** (Upstash not yet configured).
- Customer TOTP/2FA — v1.1.
- Admin auth + RBAC + re-auth — **separate slice**.
- Polished visual design (DESIGN.md prompts) — frontend design stage.
- True device fingerprinting (FingerprintJS) — later.

## 2. Key Decisions

| # | Decision |
|---|---|
| Session strategy | **Revocable JWT** — JWT carries `{userId, sessionId}`; the source of truth is the `user_sessions` row, validated every request. (Auth.js JWT strategy is stateless; we back it with `user_sessions` to support per-device + global logout + unfamiliar-country, per PRD §5.10.) |
| UI scope | Full functional i18n UI (not bare). |
| External creds | Build everything, **env-gated**: email dev-stub ↔ Resend; Google provider active only when `AUTH_GOOGLE_*` present. No code change when keys arrive. |
| Unverified login | **Allowed** + persistent "verify your email" banner; `status=inactive` after 7 days unverified (PRD §5.10 grace). |
| Post-signup | **Auto-login** + banner (not redirect to login). |
| HIBP outage | **Fail-open** (don't block signup if HIBP unreachable) + log the outage. |
| Lockout/rate-limit | **Deferred** to the Redis security slice. Generic, non-enumerating error messages applied now. |
| Unfamiliar country | Compare + record on login now; alert email wired behind Resend gate (dev logs). |
| Device fingerprint | Store UA + ip + country + server session id this slice; precise fingerprinting later. |
| Session lifetime | 30 days, sliding (activity renews `lastActiveAt`/`expiresAt`); Remember-Me default on (PRD §5.10). |

## 3. Architecture — Component Units

Auth.js v5 (`session: 'jwt'`) + PrismaAdapter (OAuth `Account`/`VerificationToken` only) + custom `user_sessions`. Combined with the existing next-intl middleware. Domain logic in `/lib`, route handlers/server actions kept thin (CLAUDE.md §2).

| Unit | Location | Responsibility |
|---|---|---|
| Auth config | `lib/auth/config.ts` + root `auth.ts` | providers (Credentials + Google env-gated), callbacks (`jwt`/`session`/`signIn`), session strategy |
| Session store | `lib/auth/session.ts` | `createSession` · `validateSession` · `revokeSession` · `revokeAllSessions` over `user_sessions` (pure functions) |
| Password | `lib/auth/password.ts` | bcrypt(12) hash/verify, zxcvbn strength, HIBP (k-anonymity) breach check |
| Signup | `lib/auth/signup.ts` | server action: validate → HIBP → hash → `User` → `EmailVerification` token → send email |
| Email verify | `lib/auth/verify.ts` | validate token (hash + 24h expiry) → `emailVerified = now()` |
| Request meta | `lib/auth/device.ts` | extract ip / country / user-agent (session + unfamiliar-country) |
| Email send | `lib/email/send.ts` | abstraction: dev = console log ↔ `RESEND_API_KEY` → Resend |
| Validation | `lib/validations/auth.ts` | Zod schemas (shared front/back): signup, login |
| UI | `app/[locale]/(auth)/{login,signup,verify}/`, `components/auth/` | shadcn forms, i18n, zxcvbn meter, unverified banner |
| Middleware | `middleware.ts` | next-intl + `/my` protection (session required) |
| shadcn | `components/ui/` | form, input, button, label, card, alert |

**Token security (CLAUDE.md §3.6):** passwords bcrypt(12); email-verification token is crypto-random, sent in the URL, stored only as SHA-256 (`email_verifications.token_hash`); session token hash in `user_sessions.token_hash`. No password/PII/token in logs.

## 4. Data Flows

1. **Signup (credentials):** form → `signup` action → Zod validate → HIBP → bcrypt(12) → `User`(status=active, emailVerified=null) → `EmailVerification` token → send email (stub/Resend) → **auto-login** (`createSession` + JWT) → `/my` + verify banner.
2. **Login (credentials):** form → `signIn('credentials')` → authorize (find by email + bcrypt compare; failure = generic error) → `jwt` callback: `device.ts` → `createSession` → unfamiliar-country alert (gated) → JWT `{userId, sessionId}`.
3. **Login (Google, env-gated):** `signIn('google')` → adapter creates/links `Account` + `User` (emailVerified from Google profile) → `createSession`.
4. **Per-request validation:** `auth()` / middleware → `jwt` callback → `validateSession(sessionId)` (exists · not expired · not revoked). Invalid → session invalidated (logout). Valid → refresh `lastActiveAt` (sliding 30d) → expose `{userId, emailVerified}` on session.
5. **Logout:** single → `revokeSession(current)`; global → `revokeAllSessions(userId)` (other devices invalid on next request).
6. **Email verify:** link → `/[locale]/(auth)/verify/[token]` → validate (hash + 24h) → `emailVerified = now()`, mark token used → banner gone.

## 5. Error Handling

- **Signup:** duplicate email → "already registered" (enumeration acceptable on signup); zxcvbn weak → reject with feedback; HIBP breached → "password found in a breach"; HIBP outage → fail-open + log.
- **Login:** wrong credentials → **generic** "email or password is incorrect" (no enumeration); inactive account → guidance message.
- **Session invalid** → redirect to login.
- **Never** log password / PII / tokens (§3.6).

## 6. Testing

**Unit (Vitest)**
- `password.ts`: bcrypt hash/verify roundtrip; zxcvbn rejects weak; HIBP (mocked fetch) detects breach + fail-open on error.
- `validations/auth.ts`: Zod accepts valid / rejects invalid (email, ≥10 chars, alnum).
- `session.ts`: `createSession` persists; `validateSession` true for valid / false for expired+revoked; `revokeSession`/`revokeAllSessions` delete (local test DB).
- `signup.ts`: creates user + token, hashes password, rejects duplicate email (email send mocked).

**E2E (Playwright — local DB + dev server available)**
- signup → auto-login → `/my` reachable → banner shown.
- verify link → banner gone.
- logout → `/my` redirects to login.
- global logout → second session invalidated.
- Google button hidden when env absent.
- wrong password → generic error (no enumeration).

## 7. Migration & i18n

- **Migration:** none. Schema already has all auth tables (`users`, `Account`, `VerificationToken`, `user_sessions`, `email_verifications`).
- **i18n:** all auth copy → `messages/{locale}.json` (ko/en/ja/zh-TW/zh-HK); missing-key check passes.
