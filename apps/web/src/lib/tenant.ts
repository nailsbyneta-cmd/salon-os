import { cookies } from 'next/headers';
import { COOKIE_NAME, unsealSession, type Role } from '@salon-os/auth';

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: Role;
  email?: string;
}

/**
 * Resolved Tenant-Context für Server-Components + Server-Actions.
 *
 * Verhalten:
 *   1. Wenn `salon_session` Cookie existiert + valid → Session-Werte
 *   2. Sonst: Dev-Fallback aus DEMO_TENANT_ID / DEMO_USER_ID env vars
 *      (nur wenn AUTH_DEV_FALLBACK !== 'false' UND nicht NODE_ENV=production)
 *   3. Sonst: redirect-marker (UnauthenticatedError) — Middleware fängt ab
 *
 * Migration: vor 2026-04-28 sync, jetzt async wegen cookies()-Async-API
 * in Next 15. Alle Caller `await getCurrentTenant()`.
 */
export async function getCurrentTenant(): Promise<TenantContext> {
  const ctx = await tryReadCookie();
  if (ctx) return ctx;

  // DEMO-Fallback. Auf Production-Build aktiv solange keine Cookie da ist —
  // die Edge-Middleware fängt unauthenticated Requests ab und redirected
  // (wenn WORKOS_AUTH_ENABLED=true). Server-Components werden dann gar nicht
  // erst evaluiert. SSG-Build-Phase ruft das hier ohne Cookie auf — wir
  // dürfen nicht werfen, sonst bricht der Build.
  if (process.env['AUTH_DEV_FALLBACK'] === 'false') {
    throw new UnauthenticatedError();
  }
  const tenantId = process.env['DEMO_TENANT_ID'] ?? '00000000-0000-0000-0000-000000000000';
  const userId = process.env['DEMO_USER_ID'] ?? '00000000-0000-0000-0000-000000000000';
  return { tenantId, userId, role: 'OWNER' };
}

async function tryReadCookie(): Promise<TenantContext | null> {
  try {
    const cookieStore = await cookies();
    const sealed = cookieStore.get(COOKIE_NAME)?.value;
    if (!sealed) return null;
    const session = await unsealSession(sealed);
    if (!session) return null;
    return {
      tenantId: session.tenantId,
      userId: session.userId,
      role: session.role,
      email: session.email,
    };
  } catch {
    return null;
  }
}

export class UnauthenticatedError extends Error {
  constructor() {
    super('not authenticated');
    this.name = 'UnauthenticatedError';
  }
}
