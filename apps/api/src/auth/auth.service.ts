import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import {
  authenticateWithMagicLink,
  sendMagicLink,
  signSessionToken,
  type Session,
} from '@salon-os/auth';
import { prisma } from '@salon-os/db';

const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12h — Admin-Panel-typisch
const MIN_SECRET_LEN = 32;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private get secret(): string {
    const s = process.env['WORKOS_COOKIE_PASSWORD'];
    if (!s || s.length < MIN_SECRET_LEN) {
      throw new Error(
        `WORKOS_COOKIE_PASSWORD fehlt oder < ${MIN_SECRET_LEN} Zeichen — Session-Token können nicht signiert werden.`,
      );
    }
    return s;
  }

  async requestMagicLink(email: string): Promise<{ dispatched: boolean }> {
    const { id } = await sendMagicLink({ email });
    this.logger.log(`Magic-Link dispatched für ${email} (workos-id=${id})`);
    return { dispatched: true };
  }

  /**
   * Tauscht Magic-Code gegen signiertes Session-Token. Erwartet, dass
   * der User + eine TenantMembership vorhanden sind.
   *
   * Test-Bypass: Wenn `AUTH_DEV_BYPASS_CODE` gesetzt ist UND der
   * übergebene `code` exakt damit übereinstimmt, wird der WorkOS-
   * Exchange übersprungen — der User wird direkt per Email aufgelöst.
   * Gedacht für E2E-Tests und lokale Dev ohne WorkOS-Account.
   * Darf NIE in Production gesetzt sein; `main.ts` prüft das.
   */
  async authenticate(args: {
    email: string;
    code: string;
    tenantSlug?: string;
  }): Promise<{ token: string; session: Session }> {
    const bypassCode = process.env['AUTH_DEV_BYPASS_CODE'];
    const useBypass = bypassCode && args.code === bypassCode;

    const authenticated = useBypass
      ? { id: `dev-${args.email}`, email: args.email }
      : await authenticateWithMagicLink({
          email: args.email,
          code: args.code,
        });

    const user = await prisma.user.findUnique({
      where: { email: args.email.toLowerCase() },
      include: {
        memberships: {
          where: args.tenantSlug ? { tenant: { slug: args.tenantSlug } } : undefined,
          take: 1,
          include: { tenant: { select: { id: true, slug: true } } },
        },
      },
    });

    if (!user || user.memberships.length === 0) {
      throw new UnauthorizedException(
        'Kein Mandat für diese E-Mail — User wird zuerst in einen Salon eingeladen.',
      );
    }

    const [membership] = user.memberships;
    if (!membership) throw new UnauthorizedException('Membership fehlt');

    const now = Math.floor(Date.now() / 1000);
    const session: Session = {
      userId: user.id,
      tenantId: membership.tenantId,
      role: membership.role,
      email: authenticated.email,
      issuedAt: now,
      expiresAt: now + SESSION_TTL_SECONDS,
    };

    const token = signSessionToken(session, this.secret);
    return { token, session };
  }
}
