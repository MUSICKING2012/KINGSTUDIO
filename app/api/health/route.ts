import { NextResponse } from 'next/server';

// Lightweight liveness probe for uptime monitoring (BetterStack, PRD §7.9). No PII, no DB hit.
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ status: 'ok', service: 'kingstudio' });
}
