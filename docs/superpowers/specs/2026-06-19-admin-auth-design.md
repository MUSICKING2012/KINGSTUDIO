# Admin Authentication — Design Spec

**Date:** 2026-06-19 · **Milestone:** M1 (auth base, admin) · **Slice:** Admin auth + RBAC + reauth base
**Status:** Approved (brainstorming) → next: implementation plan
**⚠ §4 DANGER ZONE** (auth · session · reauth) — Aiden verification required after implementation.

## 1. Goal & Scope

Stand up authentication and role-based authorization for KING STUDIO **studio operators (admins)** — fully separated from the already-merged customer auth (different table, cookie, path). An admin signs in with **email + password + TOTP** (mandatory 2FA), gets a **revocable** admin session, and is gated by **RBAC** (PRD 5.8's 7 roles). This slice also builds the **re-auth foundation** (challenge create/verify) that future sensitive actions plug into.

### In scope
- **Admin login**: email + password (bcrypt 12) + **TOTP** (mandatory 2FA, PRD 5.8). TOTP secret is **seeded** (no enrollment UI this slice).
- **TOTP**: otplib verification helper (shared by login + reauth); secret stored **AES-256-GCM encrypted**.
- **Revocable admin session**: `admin_sessions` row, JWT carries `{adminUserId, sessionId}`, validated each request. **8h sliding inactivity** expiry; **max 3 concurrent** (oldest evicted). Separate cookie (`authjs.admin-session-token`) + path (`/api/admin/auth`).
- **RBAC**: PRD 5.8's 7 roles, permission vocabulary, `requirePermission` route/action guard (→ 403). Multi-role OR-combined.
- **Re-auth base**: `createReauthChallenge` / `verifyReauth(password + TOTP)` writing `reauth_challenges`. (Applying it to each sensitive action = later, per that feature.)
- **DB-based login lockout**: 5 fails / 5 min → 30 min lock (PRD 5.8), using existing `admin_users.failedLoginCount` / `lockedUntil` (no Redis).
- **Admin seed**: the 7 roles (with permission sets) + a Super Admin (email/password/TOTP from env; secret encrypted, never in git/log).
- **`/admin` login UI** + protected layout guard (Node runtime).
- Unit (Vitest) + E2E (Playwright) tests — including **session separation** (customer ↔ admin cookies don't mix) and **permission-deny**.
- **CLAUDE.md §4 update**: add the "Engineer row-scope (own assigned sessions only)" danger-zone note.

### Out of scope (deferred — see §9 Tracking List)
- TOTP enrollment UI (QR / enable) — admins are few in MVP; secrets seeded manually.
- Applying re-auth to actual sensitive actions (refund / role-change / etc.).
- **Engineer row-scope** (`booking.engineerId === adminId`) — no booking-feature route to scope yet.
- Unfamiliar-environment alert (email + Kakao — needs Resend/Solapi).
- 30-day dormancy auto-deactivation; admin password reset; polished admin UI.
- AuthMethod enum-ification; TOTP key-rotation logic; admin-auth → `audit_logs` writes.

## 2. Key Decisions

| # | Decision |
|---|---|
| Roles | **PRD 5.8 exactly** — Super Admin / Manager / Operator / Content Manager / Engineer / Accountant / Marketer. (Prompt's Booking/Viewer were wrong, retracted. PRD is SSOT.) |
| Auth surface | **Second Auth.js v5 instance** (`adminAuth.ts`), Credentials-only (no OAuth/Adapter), separate cookie + basePath. §1 stack kept. **Fallback:** if v5 multi-instance has unresolvable cookie/basePath friction → STOP & report; reconsider a custom admin session (§1 deviation, justified). No preemptive deviation. |
| 2FA | **Login = email + pw + TOTP (3-factor), real** — TOTP secret **seeded** (no enrollment UI). Rationale: deferring login-2FA would let a stolen password read customer PII/payments (GDPR risk); PRD 5.8 "login 2FA mandatory" must not be deferred. |
| TOTP secret | **AES-256-GCM encrypted** at rest (schema `totpSecret` = "encrypted"). Key `ADMIN_TOTP_ENC_KEY` via GCP Secret Manager (separate store from Cloud SQL — DB-only leak stays safe; §3.6). Ciphertext carries a **key-version prefix** (rotation later). Column stays `String` — no schema change. |
| Reauth method type | Use the existing `reauth_challenges.verificationMethod` **String** (no schema change, §7-B). Values defined as **code constants** in one place (`lib/admin-auth/constants.ts`) and referenced only there (partial enum "closing"). **Tech debt:** AuthMethod enum-ification tracked (§9.1). |
| Session | Revocable JWT ↔ `admin_sessions`; **8h sliding inactivity**; **max 3 concurrent** (oldest evicted). **No absolute timeout** — PRD 5.8 specifies inactivity only (verified). |
| Lockout | **In scope**, DB-based (`failedLoginCount`/`lockedUntil`, 5/5min → 30min). Admin is a high-value target → brute-force defense alongside 2FA (defense in depth). |
| Engineer row-scope | **Not implemented this slice** (no booking route to scope; an untestable abstract scope mechanism is unsafe). Tracked with a code marker + CLAUDE.md §4 note (§9.2). |
| Password | **Reuse** customer `lib/auth/password.ts` (`hashPassword`/`verifyPassword`, bcrypt 12). New: admin Zod schema (12-char min, PRD 5.8). |
| Migration | **None** — all admin tables exist. If a schema change is found necessary → STOP and ask (§7-B). |

## 3. Architecture — Component Units

Second Auth.js v5 instance (`session: 'jwt'`), Credentials provider, **no PrismaAdapter** (admin has no OAuth). Separate cookie + basePath. Reuses the customer revocable-JWT pattern over a separate `admin_sessions` table. Domain logic in `/lib/admin-auth`, thin route handlers / server actions.

| Unit | Location | Responsibility |
|---|---|---|
| Admin Auth config | `lib/admin-auth/config.ts` + `adminAuth.ts` (root) | Credentials `authorize()` = email + pw + TOTP (+ lockout); jwt/session callbacks (admin_sessions); cookie name + basePath separation |
| Route handler | `app/api/admin/auth/[...nextauth]/route.ts` | `adminHandlers` |
| Admin session store | `lib/admin-auth/session.ts` | `admin_sessions` CRUD: `createAdminSession` (8h, evict oldest if >3), `validateAdminSession` (sliding 8h), `revokeAdminSession`, `revokeAllAdminSessions` |
| TOTP | `lib/admin-auth/totp.ts` | otplib `verifyTotp(secret, code)` — login + reauth |
| TOTP crypto | `lib/admin-auth/crypto.ts` | AES-256-GCM `encryptSecret`/`decryptSecret`, key-version prefix, key from `ADMIN_TOTP_ENC_KEY` |
| RBAC | `lib/admin-auth/rbac.ts` | permission vocabulary + role→permission seed map + `getAdminPermissions` (union/OR) + `hasPermission` + `requirePermission` guard (403) |
| Re-auth base | `lib/admin-auth/reauth.ts` | `createReauthChallenge(adminUserId, actionType, targetId)`, `verifyReauth(adminUserId, password, totpCode)` → `reauth_challenges` row |
| Constants | `lib/admin-auth/constants.ts` | `AUTH_METHOD.PASSWORD_TOTP = 'password+totp'` etc. (single source for the String values) |
| Lockout | (in `config.ts authorize`) | `failedLoginCount`++ on fail; lock 30min after 5/5min; reset on success |
| Password | (reuse) `lib/auth/password.ts` | bcrypt 12 hash/verify |
| Admin validation | `lib/validations/admin-auth.ts` | Zod: admin login (email, pw ≥12, TOTP code) |
| Admin guard | `app/admin/(protected)/layout.tsx` | Node-runtime `adminAuth()` session guard; `/admin/login` lives OUTSIDE the group (public) |
| Login UI | `app/admin/login/page.tsx` + `components/admin/login-form.tsx` | email + pw + TOTP form (functional, admin-only styling) |
| Seed | `prisma/seed-admin.ts` | seed 7 roles (permission sets) + Super Admin (email/pw/TOTP from env, secret encrypted) |

**Principle:** JWT `{adminUserId, sessionId}`; source of truth is the `admin_sessions` row (validated every request → revocable). Completely separate cookie / path / table from customer auth.

## 4. RBAC Permission Model

**Permission vocabulary** (`resource:action`), derived from PRD 5.8 + 5.8-A:
`booking:read` · `booking:write` · `blackout:manage` · `cs:respond` · `content:upload` · `magiclink:reissue` · `mv:receive` · `photo:select` · `checkin:write` · `refund:process` · `revenue:read` · `revenue:export` · `taxinvoice:issue` · `review:manage` · `ugc:manage` · `promo:manage` · `campaign:send` · `settings:manage` · **(sensitive — reauth-gated)** `role:grant` · `terms:publish` · `account:manage` · `export:bulk` · `bucketlock:retention` · `gate:mr_predelivery` · `gate:license_display` · `seo:custom_script`

**Conflict rule (decided):** when §5.8 and §5.8-A disagree, the **more restrictive** rule wins (fail-safe). The three gates (`gate:mr_predelivery`, `gate:license_display`, `seo:custom_script`) are **Super Admin only + reauth** per §5.8-A (R2 licensing / XSS risk).

**Role → permissions seed map** (`admin_roles.permissions` JSONB = string array):
| Role | Permissions |
|---|---|
| **Super Admin** | `['*']` (all) |
| **Manager** | all **EXCEPT** {`refund:process`, `role:grant`, `terms:publish`, `gate:mr_predelivery`, `gate:license_display`, `seo:custom_script`} (PRD 5.8 "all except 3" ∪ the 3 §5.8-A gates) |
| **Operator** | `booking:read`, `booking:write`, `blackout:manage`, `cs:respond` |
| **Content Manager** | `content:upload`, `magiclink:reissue`, `mv:receive` |
| **Engineer** | `checkin:write`, `content:upload`, `photo:select` — ⚠ **ROW-SCOPE REQUIRED** (own assigned bookings only; not enforced this slice — §9.2) |
| **Accountant** | `revenue:read`, `revenue:export`, `refund:process`, `taxinvoice:issue` |
| **Marketer** | `review:manage`, `ugc:manage`, `promo:manage`, `campaign:send` |

**Mechanism:** `getAdminPermissions(adminUserId)` = union of the admin's roles' permission arrays (`*` expands to all). `hasPermission(perms, required)` = `perms` includes `*` or `required`. `requirePermission(required)` guard → 403 when missing.

## 5. Data Flow

1. **Login** (`/admin/login`, email + pw + TOTP) → `adminSignIn('credentials')` → `authorize()`: find admin by email → check lockout → `verifyPassword` (bcrypt) → `decryptSecret(totpSecret)` → `verifyTotp` → all pass → reset `failedLoginCount`, return `{id}`; any fail → increment/lock, return `null` (generic). jwt callback → `createAdminSession` (8h; evict oldest if >3) → JWT `{adminUserId, sessionId}` in the **admin cookie**.
2. **Per-request** → `adminAuth()` → jwt callback `validateAdminSession(sessionId)` (exists · not 8h-expired, sliding) → invalid ⇒ logged out.
3. **RBAC** → protected route/action → `requirePermission(perm)` → `getAdminPermissions` → `hasPermission` → **403** if missing.
4. **Re-auth (base)** → sensitive action calls `verifyReauth(adminUserId, password, totpCode)` → verify pw + TOTP → write `reauth_challenges` row (`actionType`, `verifiedAt`, `verificationMethod = AUTH_METHOD.PASSWORD_TOTP`) → ok. (Wired into each sensitive action later.)
5. **Logout** → `revokeAdminSession(current)` (single) / `revokeAllAdminSessions(adminUserId)`.

## 6. Error Handling

- **Login:** wrong email / password / TOTP → **generic** error (never reveal which factor or whether the email exists). Locked / inactive account → appropriate message. 🔒 never log password / TOTP / secret / decryption key.
- **Lockout:** 5 failures within 5 min → `lockedUntil = now + 30min`; subsequent attempts rejected until then; a success resets `failedLoginCount`.
- **Session invalid** → redirect `/admin/login`.
- **RBAC denial** → 403 (route) / thrown authorization error (action).

## 7. Testing (§4 — required)

**Unit (Vitest, local DB)**
- `totp.ts`: `verifyTotp` accepts a freshly-generated otplib code, rejects a wrong one.
- `crypto.ts`: `encryptSecret` → `decryptSecret` round-trip; ciphertext carries the key-version prefix; ciphertext ≠ plaintext.
- `session.ts`: create/validate/revoke/revokeAll; **8h sliding expiry**; **max-3 eviction** (4th create removes the oldest).
- `rbac.ts`: `getAdminPermissions` union across roles; `hasPermission` for `*` / specific / deny; seed map (Manager lacks the 6; Engineer has checkin/content/photo).
- `reauth.ts`: `verifyReauth` ok with correct pw+TOTP, rejects wrong; writes a `reauth_challenges` row with the constant method.
- lockout: 5 fails → locked; success resets.

**E2E (Playwright)**
- admin login (email + pw + TOTP, seeded secret) → `/admin` dashboard.
- wrong TOTP → generic error.
- **permission-deny**: a low-privilege admin (e.g., Marketer) hitting a route requiring a permission they lack → blocked (403 / redirect).
- **🔑 session separation**: a customer session cookie does NOT grant `/admin` access (and an admin cookie does not grant `/my`). Cookies/CSRF cleanly separated.
- logout → `/admin/login`.

Tests seed admins with known TOTP secrets + roles.

## 8. Migration & §7-B

**No migration** — `admin_users`, `admin_roles`, `admin_user_roles`, `admin_sessions`, `reauth_challenges` already exist and are applied. If implementation reveals a needed schema change → **STOP and ask** (§7-B). No `prisma migrate dev` / gcloud / payment auto-execution.

## 9. Tracking List (technical debt / required follow-ups — DO NOT DROP)

These are preserved here (not only in chat). **1 and 2 are security holes if forgotten.**

1. **AuthMethod enum-ification** — `reauth_challenges.verificationMethod` should become a closed enum (restore the Stage-1 intent). Separate migration. Until then, values are confined to `lib/admin-auth/constants.ts`.
2. **Engineer row-scope** — `booking.engineerId === adminId` ownership check for `checkin:write` / `content:upload`, enforced **when the booking/checkin feature is built**. Marked in `rbac.ts` (code marker) and added to **CLAUDE.md §4 danger zones** in this slice.
3. **TOTP key rotation** — ciphertext key-version prefix is in place this slice; the rotation logic (decrypt-with-old, re-encrypt-with-new) is later.
4. **Re-auth application** — wire `verifyReauth` into each actual sensitive action (refund / role-change / account delete / bulk export / terms publish / Bucket-Lock retention / the 3 gates) when that feature is built.
5. **TOTP enrollment UI** (QR / enable) + **unfamiliar-environment alert** (email + Kakao) + **admin-auth → `audit_logs`** writes (login / logout / login-fail / reauth per §5.8) — follow-up slices.
