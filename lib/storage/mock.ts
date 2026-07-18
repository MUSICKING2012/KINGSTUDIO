// MOCK storage adapter (Stage E1). Completes the download flow without real Supabase Storage:
// signed URLs point at an app-local route (/api/mock-storage/download) that VERIFIES the HMAC
// signature + expiry before serving bytes. The signature check is real, so 하드제약 #5's
// "un-bypassable" property (unsigned/tampered/expired direct access → 403) is provable in E2E even
// against the mock. When Supabase Storage is provisioned (Infra_Pivot_Decision_v1 D2), add
// supabase.ts implementing StorageAdapter and switch getStorageAdapter (./index) — nothing else
// changes.

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SignedDownloadInput, StorageAdapter, StorageBucket } from './types';

// Dev/test-only secret. The mock serving route refuses to run in production regardless, so a
// baked-in fallback is acceptable here (never do this for a real backend).
function signingSecret(): string {
  return process.env.MOCK_STORAGE_SECRET ?? 'kingstudio-mock-storage-dev';
}

function payload(bucket: string, key: string, expiresAtSec: number): string {
  return `${bucket}\n${key}\n${expiresAtSec}`;
}

export function signMockDownload(bucket: string, key: string, expiresAtSec: number): string {
  return createHmac('sha256', signingSecret())
    .update(payload(bucket, key, expiresAtSec))
    .digest('hex');
}

// Constant-time verification: signature must match AND the URL must not be past its expiry.
export function verifyMockDownload(
  bucket: string,
  key: string,
  expiresAtSec: number,
  signature: string,
  nowMs: number,
): { ok: true } | { ok: false; reason: 'expired' | 'bad_signature' } {
  const expected = signMockDownload(bucket, key, expiresAtSec);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(/^[0-9a-f]*$/i.test(signature) ? signature : '00', 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b))
    return { ok: false, reason: 'bad_signature' };
  if (nowMs > expiresAtSec * 1000) return { ok: false, reason: 'expired' };
  return { ok: true };
}

export class MockStorageAdapter implements StorageAdapter {
  async createSignedDownloadUrl(input: SignedDownloadInput): Promise<string> {
    const expiresAtSec = Math.floor(Date.now() / 1000) + input.ttlSeconds;
    const sig = signMockDownload(input.bucket, input.key, expiresAtSec);
    const params = new URLSearchParams({
      bucket: input.bucket satisfies StorageBucket,
      key: input.key,
      exp: String(expiresAtSec),
      sig,
    });
    if (input.downloadFileName) params.set('name', input.downloadFileName);
    return `/api/mock-storage/download?${params.toString()}`;
  }
}
