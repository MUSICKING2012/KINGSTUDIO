// Storage adapter boundary (Stage E1 — 다운로드 위험구역). Mirrors the Stage D payment-gateway
// pattern (lib/payment): the app depends only on THIS interface; the concrete backend (mock today,
// Supabase Storage after provisioning — Infra_Pivot_Decision_v1) plugs in behind it.
//
// 하드제약 #5: files are NEVER served from storage directly — every customer download goes through a
// short-lived signed URL minted here. storage object keys stay server-side; they must never appear
// in an API response or client bundle.

// TTL for customer-facing signed download URLs (하드제약 #5 — 10 minutes, no override upward).
export const SIGNED_URL_TTL_SECONDS = 600;

export type StorageBucket = 'content' | 'consent';

export type SignedDownloadInput = {
  bucket: StorageBucket;
  key: string; // storage object key (server-side only — never expose to clients)
  ttlSeconds: number; // must be <= SIGNED_URL_TTL_SECONDS for customer downloads
  downloadFileName?: string; // Content-Disposition filename presented to the customer
};

// The single seam every storage backend implements. `getStorageAdapter` (./index) returns the
// active one — mock today, SupabaseStorageAdapter after provisioning — so callers never branch
// on vendor themselves.
export interface StorageAdapter {
  createSignedDownloadUrl(input: SignedDownloadInput): Promise<string>;
}
