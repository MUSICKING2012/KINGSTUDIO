-- =============================================================================
-- KING STUDIO — hard-constraint DB objects NOT expressible in the Prisma schema.
-- =============================================================================
-- These enforce CLAUDE.md §3 hard constraints / §4 danger zones at the DB layer
-- (triggers, exclusion + check constraints). Prisma's schema CREATE TABLEs cannot
-- express them, so they are applied as raw SQL inside a migration.
--
-- HOW TO APPLY (run by maintainer — `migrate` is NOT auto-run, CLAUDE.md §7-A.5):
--   1) Set DATABASE_URL (local Postgres 16 or Cloud SQL).
--   2) pnpm prisma migrate dev --create-only --name init        # generates CREATE TABLEs
--   3) Append the contents of THIS file to the generated
--      prisma/migrations/<ts>_init/migration.sql
--      (or create a dedicated follow-up migration and paste it there).
--   4) pnpm prisma migrate dev                                   # applies the migration
--
-- ⚠ §4 DANGER ZONE — every block below MUST be covered by a test that proves the
--    constraint actually fires (UPDATE/DELETE rejected; overlapping insert rejected)
--    BEFORE trusting it in production. See notes per block.
-- =============================================================================


-- ── Extensions ───────────────────────────────────────────────────────────────
-- btree_gist lets a GiST EXCLUDE constraint mix equality (room_id) with range (&&).
CREATE EXTENSION IF NOT EXISTS btree_gist;


-- ── §3.1  consents APPEND-ONLY  (block UPDATE + DELETE) ───────────────────────
-- Consent records are immutable. Withdrawal = INSERT a new row (consented=false),
-- never an UPDATE. Admin/root cannot mutate or delete. Test: UPDATE and DELETE on
-- consents must both raise.
CREATE OR REPLACE FUNCTION consents_block_mutation() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'consents is append-only: % is not allowed (CLAUDE.md §3.1)', TG_OP;
END $$;

DROP TRIGGER IF EXISTS consents_no_update ON consents;
CREATE TRIGGER consents_no_update BEFORE UPDATE ON consents
  FOR EACH ROW EXECUTE FUNCTION consents_block_mutation();

DROP TRIGGER IF EXISTS consents_no_delete ON consents;
CREATE TRIGGER consents_no_delete BEFORE DELETE ON consents
  FOR EACH ROW EXECUTE FUNCTION consents_block_mutation();


-- ── §5.8  audit_logs APPEND-ONLY  (block UPDATE + DELETE) ─────────────────────
-- Super Admin is read-only; no one mutates the audit trail. Test as above.
CREATE OR REPLACE FUNCTION audit_logs_block_mutation() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only: % is not allowed (CLAUDE.md §3 / §5.8)', TG_OP;
END $$;

DROP TRIGGER IF EXISTS audit_logs_no_update ON audit_logs;
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_block_mutation();

DROP TRIGGER IF EXISTS audit_logs_no_delete ON audit_logs;
CREATE TRIGGER audit_logs_no_delete BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_block_mutation();


-- ── §3.3 / §4 / R3  double-booking backstop (defense-in-depth) ────────────────
-- The PRIMARY guard is the Redis distributed lock + the app-level overlap query
-- (CLAUDE.md §3.3). This EXCLUDE constraint is a DB-level SECOND line of defense:
-- two ACTIVE bookings can never overlap in the same room+time interval. pending
-- bookings are excluded (held by the Redis lock, not yet committed); cancelled is
-- excluded too. Interval = (date + start_time, date + end_time], half-open so back-
-- to-back slots (…-12:00 and 12:00-…) do NOT collide.
-- ⚠ TEST the reschedule/refund flows: moving a booking must not trip this; verify a
--    concurrent double-book of the same paid slot is rejected (Playwright concurrency).
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    room_id WITH =,
    tsrange(("date" + start_time)::timestamp, ("date" + end_time)::timestamp, '[)') WITH &&
  ) WHERE (status IN ('paid', 'confirmed', 'completed'));


-- ── Data-quality CHECKs (cheap insurance; feed schema.org AggregateRating) ────
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_rating_range;
ALTER TABLE reviews ADD CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5);

ALTER TABLE nps_responses DROP CONSTRAINT IF EXISTS nps_score_range;
ALTER TABLE nps_responses ADD CONSTRAINT nps_score_range CHECK (score BETWEEN 0 AND 10);


-- =============================================================================
-- DEFERRED (not in this file — scale/ops, revisit before high volume):
--   • audit_logs MONTHLY PARTITIONING (§5.8). Postgres cannot ALTER a normal table
--     into a partitioned one; it must be created as `PARTITION BY RANGE (created_at)`
--     up front. That conflicts with Prisma's plain CREATE TABLE, so it needs either a
--     manual table recreate or a dedicated partition-management migration. Plain table
--     is fine for MVP volume; partition when audit_logs growth warrants it. Pair with
--     the monthly private-bucket archive job (Supabase Storage — infra pivot 2026-07-18).
--   • Consent-PDF / audit-archive retention lives on the STORAGE side (private bucket,
--     service-role-only writes + SHA-256 hash recorded in append-only rows — pivot D1),
--     not in SQL. (Formerly S3/GCS Object-Lock / Bucket-Lock.)
-- =============================================================================
