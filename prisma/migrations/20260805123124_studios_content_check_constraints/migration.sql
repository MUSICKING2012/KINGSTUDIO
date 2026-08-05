-- Hand-written (PR #39 review): studio_room_profiles.slug and team_members.role_key are resolved
-- into next-intl message keys (`studios.rooms.{slug}` / `studios.team.roles.{roleKey}`) at render
-- time — an out-of-contract value would throw MISSING_MESSAGE and 500 the page. Enforce the
-- contract at the DB (§4 "코드만 믿지 않는다"). Prisma cannot model CHECK constraints, so this
-- migration is custom SQL (precedent: 20260718203000_locale_zhcn_currency_cny).
-- Extending the sets (e.g. a new team role) = new message keys ×5 locales + widening migration.
ALTER TABLE "studio_room_profiles"
  ADD CONSTRAINT "studio_room_profiles_slug_check" CHECK ("slug" IN ('a', 'b'));

ALTER TABLE "team_members"
  ADD CONSTRAINT "team_members_role_key_check" CHECK ("role_key" IN ('producer', 'vocalDirector'));
