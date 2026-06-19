import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// 🔒 Encrypts the TOTP secret at rest. Key from ADMIN_TOTP_ENC_KEY (GCP Secret Manager in prod —
// separate store from the DB so a DB-only leak can't decrypt). Format: v1:<iv>:<ct>:<tag> (base64).
// The v1 prefix is the key version, for future rotation.
function key(): Buffer {
  const raw = process.env.ADMIN_TOTP_ENC_KEY;
  if (!raw) throw new Error('ADMIN_TOTP_ENC_KEY is not set');
  const k = Buffer.from(raw, 'base64');
  if (k.length !== 32) throw new Error('ADMIN_TOTP_ENC_KEY must be 32 bytes (base64)');
  return k;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${ct.toString('base64')}:${tag.toString('base64')}`;
}

export function decryptSecret(payload: string): string {
  const [version, ivB64, ctB64, tagB64] = payload.split(':');
  if (version !== 'v1') throw new Error(`unsupported key version: ${version}`);
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
}
