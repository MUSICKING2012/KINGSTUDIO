// Storage-adapter resolver — the ONE place that decides which concrete backend is live. Today it is
// the mock (flow completion before infra provisioning). After the Supabase project exists
// (Infra_Pivot_Decision_v1 D2), add supabase.ts and return it here — callers never change.

import { MockStorageAdapter } from './mock';
import type { StorageAdapter } from './types';

const mock = new MockStorageAdapter();

export function getStorageAdapter(): StorageAdapter {
  // TODO(피벗 D2): return SupabaseStorageAdapter once the project/buckets are provisioned and
  // SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_BUCKET_* are set (server-only env).
  return mock;
}

export { SIGNED_URL_TTL_SECONDS } from './types';
export type { SignedDownloadInput, StorageAdapter, StorageBucket } from './types';
