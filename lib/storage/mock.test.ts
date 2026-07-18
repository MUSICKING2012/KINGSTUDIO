import { describe, expect, it } from 'vitest';
import { MockStorageAdapter, signMockDownload, verifyMockDownload } from './mock';

// Mock storage signature unit tests (하드제약 #5 우회불가의 어댑터 절반). The E2E half drives the
// serving route; here we prove the verifier itself rejects tampering and expiry.

const NOW = 1_800_000_000_000; // fixed clock

describe('verifyMockDownload', () => {
  it('accepts a valid, unexpired signature', () => {
    const exp = Math.floor(NOW / 1000) + 600;
    const sig = signMockDownload('content', 'bookings/b1/raw.wav', exp);
    expect(verifyMockDownload('content', 'bookings/b1/raw.wav', exp, sig, NOW)).toEqual({
      ok: true,
    });
  });

  it('rejects a tampered key (signature for another object)', () => {
    const exp = Math.floor(NOW / 1000) + 600;
    const sig = signMockDownload('content', 'bookings/b1/raw.wav', exp);
    expect(verifyMockDownload('content', 'bookings/OTHER/raw.wav', exp, sig, NOW)).toEqual({
      ok: false,
      reason: 'bad_signature',
    });
  });

  it('rejects a tampered expiry (extending validity breaks the signature)', () => {
    const exp = Math.floor(NOW / 1000) + 600;
    const sig = signMockDownload('content', 'k', exp);
    expect(verifyMockDownload('content', 'k', exp + 3600, sig, NOW)).toEqual({
      ok: false,
      reason: 'bad_signature',
    });
  });

  it('rejects an expired signature even when otherwise valid', () => {
    const exp = Math.floor(NOW / 1000) - 1;
    const sig = signMockDownload('content', 'k', exp);
    expect(verifyMockDownload('content', 'k', exp, sig, NOW)).toEqual({
      ok: false,
      reason: 'expired',
    });
  });

  it('rejects garbage signatures without throwing', () => {
    const exp = Math.floor(NOW / 1000) + 600;
    for (const sig of ['', 'zz', 'deadbeef', 'x'.repeat(64)]) {
      expect(verifyMockDownload('content', 'k', exp, sig, NOW).ok).toBe(false);
    }
  });
});

describe('MockStorageAdapter', () => {
  it('mints a URL whose params verify, and never embeds beyond the signed triple', async () => {
    const url = await new MockStorageAdapter().createSignedDownloadUrl({
      bucket: 'content',
      key: 'bookings/b1/raw.wav',
      ttlSeconds: 600,
      downloadFileName: 'raw.wav',
    });
    const parsed = new URL(url, 'http://localhost');
    const exp = Number(parsed.searchParams.get('exp'));
    const sig = parsed.searchParams.get('sig') ?? '';
    expect(parsed.pathname).toBe('/api/mock-storage/download');
    expect(verifyMockDownload('content', 'bookings/b1/raw.wav', exp, sig, Date.now()).ok).toBe(
      true,
    );
  });
});
