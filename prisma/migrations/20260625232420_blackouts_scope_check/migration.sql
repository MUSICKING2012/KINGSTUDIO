ALTER TABLE "blackouts" ADD CONSTRAINT "blackouts_scope_cols_check" CHECK (
  (scope = 'slot' AND recurring_rule IS NULL AND time_start IS NOT NULL AND time_end IS NOT NULL AND date_start = date_end)
  OR (scope = 'full_day' AND recurring_rule IS NULL AND time_start IS NULL AND time_end IS NULL AND date_start <= date_end)
  OR (scope = 'recurring' AND recurring_rule IS NOT NULL AND recurring_rule LIKE 'FREQ=%' AND time_start IS NOT NULL AND time_end IS NOT NULL AND date_start <= date_end)
);
