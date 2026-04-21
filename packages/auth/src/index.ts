/**
 * SALON OS Auth package.
 *
 * Dünner Wrapper um das WorkOS Node-SDK + signiertes Session-Token-Handling.
 * Strategie laut Q-004 (ANSWERS.md 2026-04-21):
 *   - MVP nutzt NUR Magic-Link (kein SAML/SSO)
 *   - SSO-Hook hinter Feature-Flag vorbereitet für Enterprise-Tier
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

import { WorkOS } from '@workos-inc/node';
import { z } from 'zod';

// ─── Session-Schema ─────────────────────────────────────────────

export const sessionSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  role: z.enum([
    'OWNER',
    'MANAGER',
    'FRONT_DESK',
    'STYLIST',
    'BOOTH_RENTER',
    'TRAINEE',
    'ASSISTANT',
  ]),
  email: z.string().email(),
  issuedAt: z.number().int(),
  expiresAt: z.number().int(),
});

export type Session = z.infer<typeof sessionSchema>;

export function isManager(role: Session['role']): boolean {
  return role === 'OWNER' || role === 'MANAGER';
}

export function isOwner(role: Session['role']): boolean {
  return role === 'OWNER';
}

// ─── WorkOS-Client (lazy, env-driven) ───────────────────────────

let cachedClient: WorkOS | null = null;

export function getWorkOSClient(): WorkOS | null {
  const apiKey = process.env['WORKOS_API_KEY'];
  if (!apiKey) return null;
  if (!cachedClient) {
    cachedClient = new WorkOS(apiKey);
  }
  return cachedClient;
}

export interface MagicLinkRequest {
  email: string;
}

export interface MagicLinkResponse {
  /** WorkOS-seitige ID; kann geloggt werden, aber enthält kein Secret. */
  id: string;
}

/**
 * Sendet einen Magic-Link an die angegebene Adresse. Im Dry-Run-Mode
 * (ohne WORKOS_API_KEY) wird kein Mail verschickt und ein synthetischer
 * Code zurückgegeben — gut für lokale Dev und Tests.
 */
export async function sendMagicLink(
  req: MagicLinkRequest,
  client: WorkOS | null = getWorkOSClient(),
): Promise<MagicLinkResponse> {
  if (!client) {
    return { id: `dry-run-${Date.now()}` };
  }
  const result = await client.userManagement.createMagicAuth({
    email: req.email,
  });
  return { id: result.id };
}

export interface MagicAuthExchange {
  code: string;
  email: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Tauscht einen Magic-Link-Code gegen ein WorkOS-User-Objekt. Mappt
 * NICHT auf Tenant/Role — das passiert in der API-Schicht gegen die
 * `TenantMembership`-Tabelle.
 */
export async function authenticateWithMagicLink(
  args: MagicAuthExchange,
  client: WorkOS | null = getWorkOSClient(),
): Promise<AuthenticatedUser> {
  if (!client) {
    throw new Error(
      'authenticateWithMagicLink: WORKOS_API_KEY fehlt — Dry-Run-Exchange nicht unterstützt.',
    );
  }
  const clientId = process.env['WORKOS_CLIENT_ID'];
  if (!clientId) {
    throw new Error('WORKOS_CLIENT_ID fehlt');
  }
  const result = await client.userManagement.authenticateWithMagicAuth({
    clientId,
    code: args.code,
    email: args.email,
  });
  return { id: result.user.id, email: result.user.email };
}

// ─── Session-Token (HMAC-signiertes JSON) ──────────────────────
//
// Stripped-down JWT-Variante. Kein Alg-Header, kein Drittbibliotheks-
// Risiko, aber kryptographisch äquivalent (HS256). Format:
//   base64url(JSON(payload)) + '.' + base64url(HMAC_SHA256(payload, secret))

function base64url(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlDecode(str: string): Buffer {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64, 'base64');
}

export function signSessionToken(session: Session, secret: string): string {
  if (!secret || secret.length < 32) {
    throw new Error('signSessionToken: secret too short (min 32 chars)');
  }
  const payload = base64url(Buffer.from(JSON.stringify(session), 'utf8'));
  const sig = base64url(createHmac('sha256', secret).update(payload).digest());
  return `${payload}.${sig}`;
}

export function verifySessionToken(
  token: string,
  secret: string,
): Session | null {
  if (!token || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = base64url(
    createHmac('sha256', secret).update(payload).digest(),
  );
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length) return null;
  if (!timingSafeEqual(expectedBuf, actualBuf)) return null;

  try {
    const json = base64urlDecode(payload).toString('utf8');
    const parsed = sessionSchema.safeParse(JSON.parse(json));
    if (!parsed.success) return null;
    if (parsed.data.expiresAt * 1000 < Date.now()) return null;
    return parsed.data;
  } catch {
    return null;
  }
}
