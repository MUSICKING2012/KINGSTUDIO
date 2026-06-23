-- S2.3: DB exclusion safety net (PRD §5.3 동시성 처리 ②)
-- btree_gist required to mix btree (=) and gist (&&) operators in one EXCLUDE.
-- The partial WHERE clause limits the constraint to live bookings only —
-- pending/cancelled rows do not participate (cancelled = no longer occupying a slot).

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    room_id WITH =,
    tsrange(date + start_time, date + end_time, '[)') WITH &&
  )
  WHERE (status = ANY (ARRAY['paid', 'confirmed', 'completed']));
