import { NextResponse } from 'next/server';

// Liveness probe for uptime monitoring (BetterStack, PRD §7.9) + E2E identity gate
// (e2e/global-setup.ts asserts `app === 'kingstudio'` so a foreign app on the dev port
// can't be mistaken for us). No PII, no DB hit, no raw env exposure.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET() {
  // Production: minimize surface to liveness only.
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ status: 'ok' });
  }
  // Dev/test: expose identity so the E2E gate can verify it's really kingstudio.
  return NextResponse.json({
    status: 'ok',
    app: 'kingstudio',
    nodeEnv: process.env.NODE_ENV,
  });
}
