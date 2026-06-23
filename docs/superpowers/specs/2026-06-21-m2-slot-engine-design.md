# M2 Slice 2 — Slot / Availability Engine Design

> Status: **APPROVED** (4 OPEN DECISIONS confirmed by Aiden 2026-06-21) · Date: 2026-06-21 · Milestone: M2 (예약·슬롯 엔진)
> Second slice of M2. Builds the availability + booking-confirm engine on the Slice-1 catalog (`Package.slotMinutes`) and the C19 lock model. Decisions (a)–(d) below are design-level under existing PRD §5.3 contracts (grids / 10–22 window / auto-assign / KST D+1..D+90) — they decide HOW, not new/changed contract, so **no PRD/C-changelog change** (unlike C19, which changed the lock-key contract). Code/schema/migration = 0 at this design stage.

## Goal

Given a package + date, compute which time slots are bookable for an active studio room, and confirm a booking without double-booking — under the C19 two-layer lock model (room+date Redis lock + DB exclusion constraint). Availability SSOT = our DB (§3.3).

## Confirmed inputs (already decided — do NOT re-open)

- **Lock model = C19 (confirmed).** Redis lock key `slot_lock:{room_id}:{date}` (room+date, serialized) → acquire → overlap-check `(room_id, date, [start,end))` over bookings+blackouts → confirm → release (TTL 900s / 15-min hold). Final guard = Postgres `EXCLUDE USING gist` (btree_gist) rejecting overlaps. See PRD §5.3 동시성 처리.
- **Schema ready (Stage 2).** `Room`, `Booking`, `Blackout`, `Package` exist; `Booking @@index([roomId, date])` for the overlap scan; `Blackout` supports 3 modes (slot/full_day/recurring + RRULE, roomId null = all rooms).
- **Pricing connection (Slice 1).** `computePackageTotal()` → `basis` freezes into `Booking.pricingSnapshot` (§3.2) at confirm. Slot engine consumes `Package.slotMinutes` for slot end-time.
- **Operating window (PRD §5.3).** 10:00–22:00 KST, daily, no weekday difference. Holidays = admin blackouts. Booking window D+1..D+90, KST.

## Architecture (subject to OPEN DECISIONS)

| Unit | Responsibility |
|---|---|
| `lib/redis/client.ts` + `lib/redis/lock.ts` | Upstash client + `withSlotLock(roomId, date, fn)` distributed-lock primitive (acquire/release/TTL 900s). Greenfield (`lib/redis/` is empty today). |
| `lib/slots/grid.ts` | Fixed per-package candidate-slot start-time grid (see OPEN DECISION (a)). |
| `lib/slots/availability.ts` | `getAvailability({ packageId, date, locale })` — enumerate grid → subtract bookings+blackouts overlap → filter operating window + D+1..D+90 → aggregate across active rooms. Read-only, no lock. |
| `lib/settings/operating-hours.ts` | Operating-window read helper (see OPEN DECISION (b)), mirrors `license-display.ts`. |
| `lib/slots/confirm.ts` | `confirmBooking(...)` — inside `withSlotLock`: pick room (OPEN DECISION (c)) → re-check overlap → insert Booking (DB exclusion = final guard). |
| migration | `btree_gist` + `EXCLUDE USING gist` on bookings — **separate §4/§7-A.5 danger-zone slice**. |
| `prisma/seed-rooms.ts` | Seed STUDIO A (active) + STUDIO B (inactive). `rooms` table is currently empty (0 rows). |

## Slice decomposition (APPROVED — Aiden 2026-06-21)

| Sub-slice | Scope | Depends on |
|---|---|---|
| **S2.1 Redis foundation** | `lib/redis` client + `withSlotLock` primitive (no booking logic). Unit-test lock acquire/release/TTL. | — |
| **S2.2 Availability read** | rooms seed (STUDIO A/B), slot grid, operating-hours helper, `getAvailability` (overlap over bookings+blackouts, multi-room aggregate). Read-only. | — (parallel to S2.1) |
| **S2.3 DB exclusion migration** | `btree_gist` + `EXCLUDE` constraint (§4/§7-A.5 danger zone). | — (independent start; **MUST complete before S2.4**) |
| **S2.4 Booking confirm + lock** | `confirmBooking` inside lock + room auto-assign + overlap re-check + pricing snapshot. | S2.1 + S2.2 + **S2.3 (hard prerequisite)** |
| **S2.5 Admin blackout (3 modes)** | admin create/manage slot/full_day/recurring blackouts (feeds availability). | S2.2 |
| **S2.6 Concurrency E2E (§4 gate)** | Vitest 통합 테스트(실 DB + 실 Redis) — two concurrent `confirmBooking()` calls on overlapping slots → exactly one wins. | S2.4 (+S2.3) |

Dependency order (APPROVED): S2.1, S2.2, S2.3 may start independently, **but S2.3 → S2.4 is a hard ordering — booking-confirm (S2.4) MUST run on top of the DB exclusion safety net, so S2.3 lands first (NOT parallel with S2.4).** Then **S2.4 → S2.6**; S2.5 after S2.2. Booking-flow UI (4-step) and payment (KG이니시스/PayPal) are **M3 / Stage 3**, out of this slice.

---

## Decisions (a)–(d) — APPROVED (Aiden 2026-06-21)

### (a) Availability algorithm — concrete shape — ✅ APPROVED

> ⚠️ **Key finding:** the PRD slot grids are **non-uniform** — 1Hour = 10–11, 12–13, 14–15, 16–17, 18–19 (gaps at 11–12, 13–14, …) and Premium = 10–13, 14–17, 18–21 (gaps at 13–14, 17–18). They are **NOT** "back-to-back `slotMinutes` from 10:00". So the grid cannot be derived from `slotMinutes` alone.

**Recommended:** candidate-slot grid = a **fixed per-package start-time list** (data), `slotMinutes` only gives duration (`end = start + slotMinutes`). Store the grid as a **TS constant** `SLOT_GRID` keyed by package slug/category:
```
gold/diamond → [10:00,12:00,14:00,16:00,18:00,20:00]  (2h)
premium      → [10:00,14:00,18:00]                      (3h)
1hour        → [10:00,12:00,14:00,16:00,18:00]          (1h)
1pro         → [10:00,14:00,18:00]                      (3.5h)
```
Availability for `(packageId, date)`:
1. `date` inside [KST today+1, KST today+90] and not before today? else empty.
2. For each grid start `s`: candidate `[s, s+slotMinutes)`; keep only those within the operating window (b).
3. A candidate is **available on a room** iff NO `booking` and NO `blackout` on that `(room, date)` overlaps it. Overlap (half-open) = `cand.start < other.end AND other.start < cand.end`. Blackout: `full_day`(time null)=blocks all; `slot`=time-range overlap; `recurring`=expand RRULE to the date then time-range; `roomId null`=all rooms.
4. **Multi-room aggregate:** a slot is OFFERED to the customer iff **≥1 active room** has it available (customer sees slots, not rooms; the room is chosen at confirm per (c)). Admin view = per-room.

**Alternatives:** (A2) derive grid from `slotMinutes` contiguously — **rejected**, doesn't reproduce PRD grids (1Hour would be 12 slots, Premium 4). (A3) store grid in DB (`Package.slotStartTimes Int[]`) — admin-editable but YAGNI (grids are fixed PRD rules); revisit only if per-room/seasonal grids ever needed. **Rationale for constant:** fixed business rule tied to package identity, rarely changes, code-reviewed (same principle as code-managed config); no schema change.

> ✅ **Reinforcement (Aiden) — grid ⟂ operating hours (decouple, do NOT derive one from the other).** The `SLOT_GRID` start-time constant (a) is its **own independent source**, NOT derived from the operating-hours Setting (b). Operating hours are only a **filter** (step 2: drop candidates outside [open, close)); they never *generate* the grid. Reason: the PRD grids are non-uniform with gaps, so they cannot be regenerated from open/close; coupling them would make a hours edit silently corrupt the grid. Two independent inputs: grid = constant (a); window = Setting (b); availability intersects them.

### (b) Operating-hours storage — ✅ APPROVED

**Recommended:** a **`Setting` row `operating_hours`** = Json `{ "open": "10:00", "close": "22:00" }`, read via `lib/settings/operating-hours.ts` (mirrors `license-display.ts`: `findUnique({key})` + pure parser + **fail-safe default 10–22** when the row is absent). **Rationale:** the `Setting` key-value model already exists and is the established pattern (`license_display_enabled`, `studio_b_active`); operating hours are plausibly admin-tunable later; no schema change; holidays are already blackouts so this only stores the daily open/close window.

**Alternatives:** (B1) hardcoded constant — simplest, but a change needs a redeploy; (B2) dedicated per-weekday table — over-engineered (PRD: 요일 무차별, YAGNI). Recommend the Setting row (B-rec).

### (c) Room auto-assignment — ✅ APPROVED

**Recommended:** at confirm, **iterate active rooms by `displayOrder` (tie-break `room_id` asc); first room that is free for the candidate interval (under its own `slot_lock:{room_id}:{date}` + overlap re-check) wins.** Deterministic "fill STUDIO A first, overflow to B". **Rationale:** deterministic (reproducible/testable, consistent with the project's determinism principle, e.g. slug suffixing), simple ops mental model, trivial at launch (A only). Integrates cleanly with the C19 per-room lock.

**Alternative:** (C1) load-balance (pick the room with fewer bookings that day) — spreads utilization but non-deterministic and harder to reason about; no PRD need. Recommend deterministic (C-rec).

> 🔴 **DEBT (Aiden) — multiroom (B active): auto-assign ↔ per-room-lock atomicity is UNDESIGNED.** At launch (STUDIO A only) this is trivial: the lock is always `slot_lock:{A}:{date}`, single critical section, no ambiguity. **When STUDIO B is activated**, the confirm path would iterate rooms and acquire a *different* per-room lock per candidate — the **ordering/atomicity of "choose room → lock that room → re-check → maybe fall through to next room"** is NOT designed here and is a real concurrency surface (two customers could each lock a different room for the same interval, fine; but fall-through + release ordering needs care). **Resolution deferred to a dedicated B-activation slice**, which must re-examine lock granularity — e.g. a coarser **`slot_lock:{date}` day-level lock across all rooms** (simpler, serializes the whole day) vs the per-room scheme. Do NOT activate STUDIO B without that slice. This is a caveat to C19's "멀티룸 전환 시 락은 룸별이라 룸 수만큼 병렬" — that parallelism assumption needs the atomicity design before it's safe.

### (d) Timezone / "now" computation — ✅ APPROVED

**Recommended:** treat all booking `date`/`startTime`/`endTime` as **KST wall-clock** (already the schema convention: `@db.Date`/`@db.Time`, "Time is KST fixed"), and compute **"today" explicitly in Asia/Seoul** in code — NOT from the server clock. The booking window = `[KST_today + 1d, KST_today + 90d]`. A single date util (`lib/slots/kst.ts` or similar) is the sole source of "KST today". **Rationale:** Cloud Run runs UTC; a UTC "today" can be a day off from KST around midnight → off-by-one in the D+1..D+90 window. Korea has no DST (fixed UTC+9), so explicit conversion is simple and stable.

**Alternative:** (D1) set server `TZ=Asia/Seoul` env and use local time — fragile (depends on an env var being set on every runtime; a missing/forgotten TZ silently shifts the window). Recommend explicit-in-code KST (D-rec).

---

## Testing (plan)

- **availability.ts** (DB integration, owns its read; mock or owner-file per the one-DB-file-per-table race rule): grid enumeration per package; overlap subtraction vs a seeded booking (a Premium 10–13 booking closes Gold 10–12 & 12–14); blackout modes (full_day blocks all; slot blocks overlap; roomId null = all rooms); operating-window + D+1..D+90 boundary; multi-room OR aggregate.
- **lock.ts** (S2.1): acquire blocks a second acquire on the same key; release frees it; TTL expiry.
- **confirm.ts** (S2.4): room auto-assign order; overlap re-check inside lock; pricing snapshot frozen.
- **🔴 Concurrency E2E (S2.6, §4 MANDATE):** Vitest 통합 테스트(실 DB + 실 Redis) — two concurrent `confirmBooking()` calls on overlapping slots → exactly one Booking row, the other rejected (lock OR DB exclusion). This is the §4 danger-zone gate; **human-verified before merge.**

## Out of scope (deferred — do NOT build here)

Booking-flow UI (4-step Step 1–4 pages) and payment integration (KG이니시스/PayPal, slot lock *during checkout*) = **M3 / Stage 3**; external-channel CSV bulk import; refund computation (Stage 3); Google Calendar push/pull (later admin module); customer slot-calendar UI polish.

## §4 / risk notes

- **§4 danger zones touched:** Redis slot lock (double-booking — Vitest 통합 테스트(실 DB + 실 Redis) mandatory) + DB exclusion migration (`btree_gist`, §7-A.5 — human-verified migration). Both human-verified before merge.
- **Lock granularity vs overlap (resolved by C19):** room+date lock serializes the whole room-day so the overlap check is always inside one critical section; DB exclusion is the physical backstop ("don't trust code alone").
- **`pricingMode` enum naming** (Slice-1 tracking #6) unaffected here.

## Decision status — ALL CONFIRMED (Aiden 2026-06-21)

| # | Decision | Confirmed | Status |
|---|---|---|---|
| (a) | Availability algorithm / slot grid | fixed per-package start-time constant + half-open overlap + multi-room OR; grid ⟂ operating hours (decoupled) | ✅ |
| (b) | Operating-hours storage | `Setting` row `operating_hours` (+ fail-safe default) | ✅ |
| (c) | Room auto-assignment | deterministic by `displayOrder`/`room_id`; multiroom assign↔lock atomicity = DEBT (B-activation slice) | ✅ |
| (d) | TZ / now | explicit KST-in-code window (server-clock independent) | ✅ |
| — | Slice cut (S2.1–S2.6) | as tabled; **S2.3 → S2.4 hard ordering** (DB exclusion before confirm) | ✅ |

## Debt registered (do NOT lose)

1. **Multiroom lock atomicity** — auto-assign ↔ per-room lock ordering undesigned; resolve in a dedicated **STUDIO B-activation slice** (re-examine lock granularity, e.g. day-level `slot_lock:{date}`). Do not activate B without it. (See (c).)
2. **`btree_gist` + EXCLUDE migration** = §4/§7-A.5 danger-zone slice (S2.3), human-verified.
3. **Concurrency E2E fresh-run** caveat (single dev server / build+start) for the S2.6 harness.
