import 'dotenv/config';

// Identity gate (runs once, after webServer is ready, before any test).
//
// Why here and not in webServer config: Playwright's webServer `url` readiness probe only checks
// the HTTP status — it can't inspect the response body. So a *different* app squatting on :3100
// would pass readiness and the whole suite would silently run against the wrong server (this is
// exactly what happened on :3000 with mk-artist-db). We read /api/health's body and assert it's
// kingstudio. This is strictly stronger than the TCP/HTTP-status readiness check.
const HEALTH_URL = 'http://localhost:3100/api/health';
const EXPECTED_APP = 'kingstudio';

export default async function globalSetup() {
  const res = await fetch(HEALTH_URL);
  const body = await res.json().catch(() => ({}) as Record<string, unknown>);

  if (body.app !== EXPECTED_APP) {
    throw new Error(
      `E2E identity gate FAILED: GET ${HEALTH_URL} returned app=${JSON.stringify(body.app)} (full body: ${JSON.stringify(body)}). Expected app='${EXPECTED_APP}'. Port 3100 may be occupied by a different app (cross-app misconnect) — check what is listening on :3100 before running E2E.`,
    );
  }
}
