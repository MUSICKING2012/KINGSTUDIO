import { NextResponse } from 'next/server';

import { verifyMockDownload } from '@/lib/storage/mock';

// MOCK storage edge (Stage E1, dev/test ONLY). Stands in for the real storage backend's signed-URL
// endpoint so 하드제약 #5 is provable in E2E: a request without a valid, unexpired HMAC signature is
// rejected — there is no unsigned path to file bytes. Serves synthetic bytes (no real files exist
// before infra provisioning).
//
// ⚠ This route is a test double, not a product surface: it hard-refuses in production so it can
// never become an accidental public file endpoint after the Supabase adapter goes live.
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const url = new URL(request.url);
  const bucket = url.searchParams.get('bucket');
  const key = url.searchParams.get('key');
  const exp = url.searchParams.get('exp');
  const sig = url.searchParams.get('sig');
  const name = url.searchParams.get('name');

  if (!bucket || !key || !exp || !sig || !/^\d+$/.test(exp)) {
    return NextResponse.json({ error: 'unsigned_access_forbidden' }, { status: 403 });
  }

  const verdict = verifyMockDownload(bucket, key, Number(exp), sig, Date.now());
  if (!verdict.ok) {
    return NextResponse.json(
      { error: verdict.reason === 'expired' ? 'signed_url_expired' : 'invalid_signature' },
      { status: 403 },
    );
  }

  // Synthetic payload — enough for E2E to assert a successful, attributable download.
  const body = `KING STUDIO mock deliverable\nbucket=${bucket}\nkey=${key}\n`;
  const fileName = name && /^[\w.\- ]{1,120}$/.test(name) ? name : 'deliverable.bin';
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
