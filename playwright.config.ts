import 'dotenv/config'; // load DATABASE_URL + ADMIN_TOTP_ENC_KEY into the test process (same key the dev server uses)
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  // Next.js dev compiles routes on first hit; the first test pays that cost.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000/en',
    // Local: reuse an already-running `pnpm dev` (no double-spawn → no CPU contention,
    // which was the direct trigger of the webServer-startup timeout). CI: always fresh.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
