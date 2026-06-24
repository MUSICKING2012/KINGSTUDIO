-- M3: payment schema additions (PRD §5.5)
-- payments/refunds/checkins/dispute_evidences tables were created in init migration.
-- This migration upgrades pg_transaction_id from a plain index to a UNIQUE constraint
-- to enforce PG-level idempotency on webhook callbacks (duplicate-payment prevention).

-- DropIndex
DROP INDEX "payments_pg_transaction_id_idx";

-- CreateIndex
CREATE UNIQUE INDEX "payments_pg_transaction_id_key" ON "payments"("pg_transaction_id");
