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
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
