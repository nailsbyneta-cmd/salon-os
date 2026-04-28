/**
 * AES-256-GCM Encryption für sensible Per-Tenant-Secrets in DB
 * (z.B. OAuth-Refresh-Tokens für Google-Ads / Meta / TikTok).
 *
 * Format: base64(iv) . base64(ciphertext+tag)
 *   - iv: 12 Byte random (Standard für GCM)
 *   - tag: 16 Byte angehängt an ciphertext
 *
 * Master-Key kommt aus env `APP_ENCRYPTION_KEY` (32 Byte, base64-encoded).
 *   - Prod ohne Key → werfen.
 *   - Dev/Test → fester Fallback mit einmaliger Warnung.
 */
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';

const ALG = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

function getKey(): Buffer {
  const raw = process.env['APP_ENCRYPTION_KEY'];
  if (raw && raw.length > 0) {
    let key: Buffer;
    try {
      key = Buffer.from(raw, 'base64');
    } catch {
      throw new Error('APP_ENCRYPTION_KEY ist kein gültiges base64.');
    }
    if (key.length !== KEY_BYTES) {
      throw new Error(
        `APP_ENCRYPTION_KEY hat falsche Länge ${key.length}, erwartet ${KEY_BYTES} Byte (=> 44 Zeichen base64).`,
      );
    }
    return key;
  }
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error(
      'APP_ENCRYPTION_KEY fehlt — Pflicht in Produktion (32 Byte base64-encoded).',
    );
  }
  if (!process.env['__APP_ENCRYPTION_WARNED']) {
    console.warn('[crypto] APP_ENCRYPTION_KEY nicht gesetzt — dev-fallback aktiv. NICHT in Prod.');
    process.env['__APP_ENCRYPTION_WARNED'] = '1';
  }
  // Deterministischer 32-Byte dev-key (aus konstantem string), niemals Prod
  return Buffer.alloc(KEY_BYTES, 0x01);
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALG, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: base64(iv) "." base64(ct+tag)
  return `${iv.toString('base64')}.${Buffer.concat([ct, tag]).toString('base64')}`;
}

export function decryptSecret(envelope: string): string {
  const parts = envelope.split('.');
  if (parts.length !== 2) {
    throw new Error('decryptSecret: ungültiges Format (erwarte iv.ciphertext).');
  }
  const [ivB64, ctB64] = parts;
  if (!ivB64 || !ctB64) {
    throw new Error('decryptSecret: leere Komponenten.');
  }
  const iv = Buffer.from(ivB64, 'base64');
  const blob = Buffer.from(ctB64, 'base64');
  if (iv.length !== IV_BYTES) {
    throw new Error(`decryptSecret: IV-Länge ${iv.length} (erwartet ${IV_BYTES}).`);
  }
  if (blob.length < TAG_BYTES + 1) {
    throw new Error('decryptSecret: ciphertext zu kurz.');
  }
  const ct = blob.subarray(0, blob.length - TAG_BYTES);
  const tag = blob.subarray(blob.length - TAG_BYTES);

  const key = getKey();
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

/**
 * Constant-time Vergleich für secrets/hashes (z.B. webhook-signaturen).
 * Wirft wenn Längen abweichen — das ist gewollt (verhindert dass Caller
 * vergisst, beide auf gleiche Länge zu padden).
 */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
