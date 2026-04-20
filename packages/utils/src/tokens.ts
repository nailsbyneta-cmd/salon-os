/**
 * HMAC-signierte URL-Tokens für Self-Service (Cancel / Reschedule).
 * Format: base64url(payload).base64url(hmacSha256(payload))
 * Payload: `${action}:${appointmentId}:${expiresAtUnix}`
 *
 * Secret kommt aus env SELF_SERVICE_SECRET. In Dev ohne Secret
 * fallback auf festen String (Warnung loggt wer auch immer den
 * Service initialisiert — NICHT in Prod einsetzen).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

type Action = 'cancel' | 'reschedule';

function getSecret(): string {
  return process.env['SELF_SERVICE_SECRET'] ?? 'dev-secret-do-not-use-in-prod';
}

function b64url(s: string | Buffer): string {
  const buf = typeof s === 'string' ? Buffer.from(s) : s;
  return buf.toString('base64url');
}

function b64urlDecode(s: string): Buffer {
  return Buffer.from(s, 'base64url');
}

export function signSelfServiceToken(args: {
  action: Action;
  appointmentId: string;
  expiresAt: Date;
}): string {
  const payload = `${args.action}:${args.appointmentId}:${Math.floor(args.expiresAt.getTime() / 1000)}`;
  const sig = createHmac('sha256', getSecret()).update(payload).digest();
  return `${b64url(payload)}.${b64url(sig)}`;
}

export function verifySelfServiceToken(token: string): {
  action: Action;
  appointmentId: string;
  expiresAt: Date;
} | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;

  let payload: string;
  try {
    payload = b64urlDecode(payloadB64).toString('utf8');
  } catch {
    return null;
  }

  const expected = createHmac('sha256', getSecret()).update(payload).digest();
  let provided: Buffer;
  try {
    provided = b64urlDecode(sigB64);
  } catch {
    return null;
  }
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  const payloadParts = payload.split(':');
  if (payloadParts.length !== 3) return null;
  const [action, appointmentId, expiresAtStr] = payloadParts as [Action, string, string];
  if (action !== 'cancel' && action !== 'reschedule') return null;
  const expiresAtSec = Number(expiresAtStr);
  if (!Number.isFinite(expiresAtSec)) return null;
  const expiresAt = new Date(expiresAtSec * 1000);
  if (expiresAt.getTime() < Date.now()) return null;

  return { action, appointmentId, expiresAt };
}
