import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PrismaClient } from '@salon-os/db';
import {
  COOKIE_NAME,
  COOKIE_MAX_AGE_S,
  getWorkOS,
  type Role,
  type Session,
  sealSession,
} from '@salon-os/auth';
import { PRISMA } from '../db/db.module.js';

/**
 * Login-Flow:
 *   1. GET /v1/auth/login → Generate WorkOS-AuthKit URL, redirect.
 *   2. WorkOS redirected zurück → GET /v1/auth/callback?code=…
 *   3. Backend tauscht code gegen User-Profile, mappt Email auf
 *      TenantMembership (resolveTenant), seal'd Cookie, setzt ihn.
 *   4. GET /v1/auth/logout → cookie clearen, optional WorkOS-Logout.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  /** True wenn WORKOS_* envs alle gesetzt sind. Sonst Dev-Mode aktiv. */
  isEnabled(): boolean {
    return Boolean(
      process.env['WORKOS_API_KEY'] &&
      process.env['WORKOS_CLIENT_ID'] &&
      process.env['WORKOS_COOKIE_PASSWORD'],
    );
  }

  getAuthorizationUrl(redirectAfterLogin?: string): string {
    const workos = getWorkOS();
    const redirectUri = process.env['WORKOS_REDIRECT_URI'];
    if (!redirectUri) throw new Error('WORKOS_REDIRECT_URI not set');
    const url = workos.userManagement.getAuthorizationUrl({
      provider: 'authkit',
      clientId: process.env['WORKOS_CLIENT_ID'] ?? '',
      redirectUri,
      state: redirectAfterLogin ? encodeURIComponent(redirectAfterLogin) : undefined,
    });
    return url;
  }

  /**
   * Tauscht Code → User-Profile, mappt Email auf DB-Membership, seal'd
   * Cookie. Wirft mit klarer Message wenn:
   *   - keine User-Row in DB existiert (= unauthorized email)
   *   - keine aktive Membership existiert (= eingeladen aber nicht aktiviert)
   */
  async handleCallback(code: string): Promise<{
    sealed: string;
    session: Session;
    redirectTo: string;
  }> {
    const workos = getWorkOS();
    const result = await workos.userManagement.authenticateWithCode({
      clientId: process.env['WORKOS_CLIENT_ID'] ?? '',
      code,
    });
    const wuser = result.user;

    // User in DB suchen — entweder via workosUserId (zweiter Login) oder Email
    let user = await this.prisma.user.findUnique({
      where: { workosUserId: wuser.id },
    });
    if (!user) {
      user = await this.prisma.user.findUnique({ where: { email: wuser.email } });
      if (user && !user.workosUserId) {
        // Erstes Login: workosUserId verknüpfen
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { workosUserId: wuser.id, lastLoginAt: new Date() },
        });
      }
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }
    if (!user) {
      throw new Error(`Kein DB-User für ${wuser.email}. Wende dich an deinen Admin.`);
    }
    if (user.status !== 'ACTIVE') {
      throw new Error(`User ${wuser.email} ist ${user.status} — Login nicht erlaubt.`);
    }

    // Primäre Membership lesen — falls mehrere, nimm isPrimary, sonst erste
    const memberships = await this.prisma.tenantMembership.findMany({
      where: { userId: user.id },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
    if (memberships.length === 0) {
      throw new Error(`User ${wuser.email} hat keine Tenant-Membership.`);
    }
    const m = memberships[0]!;

    const now = Math.floor(Date.now() / 1000);
    const session: Session = {
      userId: user.id,
      tenantId: m.tenantId,
      role: m.role as Role,
      email: wuser.email,
      issuedAt: now,
      expiresAt: now + COOKIE_MAX_AGE_S,
    };
    const sealed = await sealSession(session);

    return { sealed, session, redirectTo: '/' };
  }

  /** Cookie-String für Set-Cookie-Header */
  buildCookie(sealed: string): string {
    const isProd = process.env['NODE_ENV'] === 'production';
    const parts = [
      `${COOKIE_NAME}=${sealed}`,
      'Path=/',
      `Max-Age=${COOKIE_MAX_AGE_S}`,
      'HttpOnly',
      'SameSite=Lax',
    ];
    if (isProd) parts.push('Secure');
    return parts.join('; ');
  }

  buildLogoutCookie(): string {
    const isProd = process.env['NODE_ENV'] === 'production';
    const parts = [`${COOKIE_NAME}=`, 'Path=/', 'Max-Age=0', 'HttpOnly', 'SameSite=Lax'];
    if (isProd) parts.push('Secure');
    return parts.join('; ');
  }
}
