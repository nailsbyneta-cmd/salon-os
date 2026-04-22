/**
 * SALON OS Auth — WorkOS + iron-session wrapper.
 *
 * Zwei Modi:
 * - Production: WorkOS AuthKit → sealed Session-Cookie (iron-session)
 * - Dev/Test: Header-Fallback (x-tenant-id / x-user-id / x-role)
 *
 * Session wird als sealed Cookie `salon_session` gespeichert.
 * WORKOS_COOKIE_PASSWORD (min 32 chars) ist das Seal-Secret.
 */
import { WorkOS } from '@workos-inc/node';
import { sealData, unsealData } from 'iron-session';
import { z } from 'zod';

export const sessionSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  role: z.enum(['OWNER', 'MANAGER', 'FRONT_DESK', 'STYLIST', 'BOOTH_RENTER', 'TRAINEE', 'ASSISTANT']),
  email: z.string().email(),
  issuedAt: z.number().int(),
  expiresAt: z.number().int(),
});

export type Session = z.infer<typeof sessionSchema>;
export type Role = Session['role'];

export const COOKIE_NAME = 'salon_session';
export const COOKIE_MAX_AGE_S = 60 * 60 * 8; // 8h

export function isManager(role: Role): boolean {
  return role === 'OWNER' || role === 'MANAGER';
}

export function isOwner(role: Role): boolean {
  return role === 'OWNER';
}

// ─── WorkOS client (singleton, lazy) ─────────────────────────

let _workos: WorkOS | null = null;

export function getWorkOS(): WorkOS {
  if (!_workos) {
    const key = process.env['WORKOS_API_KEY'];
    if (!key) throw new Error('WORKOS_API_KEY not set');
    _workos = new WorkOS(key);
  }
  return _workos;
}

// ─── Session sealing / unsealing ─────────────────────────────

function getCookiePassword(): string {
  const pw = process.env['WORKOS_COOKIE_PASSWORD'];
  if (!pw || pw.length < 32) {
    throw new Error('WORKOS_COOKIE_PASSWORD must be set and at least 32 characters');
  }
  return pw;
}

export async function sealSession(session: Session): Promise<string> {
  return sealData(session, {
    password: getCookiePassword(),
    ttl: COOKIE_MAX_AGE_S,
  });
}

export async function unsealSession(sealed: string): Promise<Session | null> {
  try {
    const raw = await unsealData<Session>(sealed, {
      password: getCookiePassword(),
      ttl: COOKIE_MAX_AGE_S,
    });
    const parsed = sessionSchema.safeParse(raw);
    if (!parsed.success) return null;
    const now = Math.floor(Date.now() / 1000);
    if (parsed.data.expiresAt < now) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

// ─── WorkOS AuthKit callback handler ─────────────────────────

export interface AuthCallbackResult {
  session: Session;
  sealed: string;
}

/**
 * Tauscht den WorkOS-AuthKit-Code gegen eine User-Session.
 * Caller muss tenantId + role aus dem WorkOS-User-Profil ableiten
 * (z. B. aus organisation_id → tenant lookup).
 */
export async function handleAuthCallback(
  code: string,
  resolveTenant: (workosUser: {
    id: string;
    email: string;
    organizationId?: string | null;
  }) => Promise<{ tenantId: string; role: Role }>,
): Promise<AuthCallbackResult> {
  const workos = getWorkOS();
  const { user } = await workos.userManagement.authenticateWithCode({
    clientId: process.env['WORKOS_CLIENT_ID'] ?? '',
    code,
  });

  const { tenantId, role } = await resolveTenant({
    id: user.id,
    email: user.email,
    organizationId: null,
  });

  const now = Math.floor(Date.now() / 1000);
  const session: Session = {
    userId: user.id,
    tenantId,
    role,
    email: user.email,
    issuedAt: now,
    expiresAt: now + COOKIE_MAX_AGE_S,
  };

  const sealed = await sealSession(session);
  return { session, sealed };
}
