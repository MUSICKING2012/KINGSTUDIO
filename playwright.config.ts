import 'dotenv/config'; // load DATABASE_URL + ADMIN_TOTP_ENC_KEY into the test process (same key the dev server uses)
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  // Identity gate before any test: assert the server on :3100 is really kingstudio
  // (readiness probe below is HTTP-status-only and can't see the body). See e2e/global-setup.ts.
  globalSetup: './e2e/global-setup.ts',
  // Next.js dev compiles routes on first hit; the first test pays that cost.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  // Dedicated E2E port 3100 — :3000 is permanently held by a different local app (mk-artist-db).
  use: { baseURL: 'http://localhost:3100' },
  webServer: {
    command: 'pnpm dev --port 3100',
    // Probe /api/health (not '/') so readiness waits on a real route, and global-setup can
    // re-read its body to confirm identity.
    url: 'http://localhost:3100/api/health',
    // Local: reuse an already-running `pnpm dev --port 3100` (no double-spawn → no CPU contention,
    // which was the direct trigger of the webServer-startup timeout). CI: always fresh.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
