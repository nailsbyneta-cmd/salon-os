import { Injectable, Logger, type NestMiddleware, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { unsealSession, COOKIE_NAME } from '@salon-os/auth';
import { runWithTenant } from './tenant.context.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-7][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_ROLES = new Set([
  'OWNER',
  'MANAGER',
  'FRONT_DESK',
  'STYLIST',
  'BOOTH_RENTER',
  'TRAINEE',
  'ASSISTANT',
]);

const IS_PRODUCTION = process.env['NODE_ENV'] === 'production';

/**
 * Löst Session aus dem Request auf und legt den Tenant-Context in
 * AsyncLocalStorage.
 *
 * - Production: liest `salon_session` Cookie (iron-session sealed).
 *   Schlägt fehl wenn WORKOS_COOKIE_PASSWORD nicht gesetzt ist.
 * - Dev/Test: liest x-tenant-id / x-user-id / x-role Header.
 *   Wird in Production durch assertProductionSafety() in main.ts geblockt.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  async use(
    req: FastifyRequest['raw'],
    _res: unknown,
    next: (err?: unknown) => void,
  ): Promise<void> {
    const originalUrl = (req as unknown as { originalUrl?: string }).originalUrl ?? '';
    const path = originalUrl || req.url || '';

    if (
      path.startsWith('/health') ||
      path.startsWith('/v1/public/') ||
      path.startsWith('/public/') ||
      // Cron-Endpoints sind über x-cron-secret im Controller geguardet —
      // brauchen kein Tenant-Context (laufen cross-tenant per PRISMA bypass).
      path.includes('/cron/')
    ) {
      next();
      return;
    }

    try {
      if (IS_PRODUCTION) {
        await this.handleProductionAuth(req, next);
      } else {
        this.handleDevAuth(req, next);
      }
    } catch (err) {
      next(err);
    }
  }

  private async handleProductionAuth(
    req: FastifyRequest['raw'],
    next: (err?: unknown) => void,
  ): Promise<void> {
    const cookieHeader = req.headers['cookie'] ?? '';
    const sealedCookie = parseCookie(cookieHeader, COOKIE_NAME);

    if (!sealedCookie) {
      next(new UnauthorizedException('Not authenticated'));
      return;
    }

    const session = await unsealSession(sealedCookie);
    if (!session) {
      next(new UnauthorizedException('Invalid or expired session'));
      return;
    }

    runWithTenant({ tenantId: session.tenantId, userId: session.userId, role: session.role }, () =>
      next(),
    );
  }

  private handleDevAuth(req: FastifyRequest['raw'], next: (err?: unknown) => void): void {
    const headers = req.headers;
    const tenantId = readHeader(headers, 'x-tenant-id');
    const userId = readHeader(headers, 'x-user-id');
    const role = readHeader(headers, 'x-role');

    if (!tenantId) {
      next(new UnauthorizedException('Missing tenant context'));
      return;
    }
    if (!UUID_REGEX.test(tenantId)) {
      this.logger.warn(`Rejected malformed x-tenant-id: ${tenantId.slice(0, 40)}`);
      next(new UnauthorizedException('Invalid tenant id format'));
      return;
    }
    if (userId && !UUID_REGEX.test(userId)) {
      next(new UnauthorizedException('Invalid user id format'));
      return;
    }
    if (role && !ALLOWED_ROLES.has(role)) {
      next(new UnauthorizedException('Invalid role'));
      return;
    }

    runWithTenant({ tenantId, userId: userId ?? null, role: role ?? null }, () => next());
  }
}

function readHeader(headers: NodeJS.Dict<string | string[]>, name: string): string | undefined {
  const v = headers[name];
  if (Array.isArray(v)) return v[0];
  return v;
}

function parseCookie(cookieHeader: string, name: string): string | undefined {
  for (const part of cookieHeader.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k?.trim() === name) return rest.join('=').trim();
  }
  return undefined;
}
