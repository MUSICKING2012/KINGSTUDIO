-- Widen team role allow-list for the owner-specified category structure (2026-08-07 fill-in):
-- producer → vocal directors → manager. Approved additive change; existing rows unaffected.
ALTER TABLE "team_members" DROP CONSTRAINT "team_members_role_key_check";
ALTER TABLE "team_members"
  ADD CONSTRAINT "team_members_role_key_check" CHECK ("role_key" IN ('producer', 'vocalDirector', 'manager'));
