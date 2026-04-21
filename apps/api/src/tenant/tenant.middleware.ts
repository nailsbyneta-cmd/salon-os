import {
  Injectable,
  Logger,
  type NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { verifySessionToken } from '@salon-os/auth';
import type { FastifyRequest } from 'fastify';
import { runWithTenant } from './tenant.context.js';

const SESSION_COOKIE_NAME = 'salon_session';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-7][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_ROLES = new Set([
  'OWNER',
  'MANAGER',
  'FRONT_DESK',
  'STYLIST',
  'BOOTH_RENTER',
  'TRAINEE',
  'ASSISTANT',
]);

/**
 * Löst Session aus dem Request (Cookie oder Bearer-Token) auf und legt den
 * Tenant-Context in AsyncLocalStorage — alle nachgelagerten DB-Calls
 * sehen ihn via `getTenantContext()`.
 *
 * PHASE-0-WARNUNG: Diese Middleware liest `x-tenant-id`/`x-user-id`/`x-role`
 * direkt aus dem Request-Header. Das ist NUR für lokale Entwicklung sicher.
 * In Production MUSS WorkOS-Session-Verifikation aktiv sein (assertProductionSafety()
 * in main.ts verhindert sonst den Start). Headers werden nach WorkOS-Integration
 * durch Cookie-Reads ersetzt.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  use(req: FastifyRequest['raw'], _res: unknown, next: (err?: unknown) => void): void {
    const headers = req.headers;

    // Health/Ready- und Public-Endpoints dürfen ohne Tenant passieren.
    // Public-Bookings lösen Tenant selbst über den URL-Slug auf.
    // `/v1/auth/*` muss ohne Session passieren, damit Login-Flow klappt.
    const originalUrl = (req as unknown as { originalUrl?: string }).originalUrl ?? '';
    const path = originalUrl || req.url || '';
    if (
      path.startsWith('/health') ||
      path.startsWith('/v1/public/') ||
      path.startsWith('/public/') ||
      path.startsWith('/v1/auth/')
    ) {
      next();
      return;
    }

    // Primärer Pfad: signiertes Session-Cookie. Fallback auf x-tenant-id-
    // Header (Phase-0-Dev-Mode) nur, solange NODE_ENV !== 'production'.
    const cookieSession = this.readSessionFromCookie(req);
    let tenantId: string | undefined;
    let userId: string | undefined;
    let role: string | undefined;

    if (cookieSession) {
      tenantId = cookieSession.tenantId;
      userId = cookieSession.userId;
      role = cookieSession.role;
    } else {
      if (process.env['NODE_ENV'] === 'production') {
        next(new UnauthorizedException('Missing session cookie'));
        return;
      }
      tenantId = readHeader(headers, 'x-tenant-id');
      userId = readHeader(headers, 'x-user-id');
      role = readHeader(headers, 'x-role');
    }

    if (!tenantId) {
      next(new UnauthorizedException('Missing tenant context'));
      return;
    }

    // Striktes Format — schützt nachgelagerten withTenant()-Call gegen
    // SQL-Injection via Postgres-SET-LOCAL-Interpolation (Defense in Depth;
    // withTenant() validiert nochmal).
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

    runWithTenant({ tenantId, userId: userId ?? null, role: role ?? null }, () => {
      next();
    });
  }

  private readSessionFromCookie(
    req: FastifyRequest['raw'],
  ): { tenantId: string; userId: string; role: string } | null {
    const secret = process.env['WORKOS_COOKIE_PASSWORD'];
    if (!secret) return null;

    const cookieHeader = req.headers['cookie'];
    if (!cookieHeader || typeof cookieHeader !== 'string') return null;

    const token = parseCookie(cookieHeader, SESSION_COOKIE_NAME);
    if (!token) return null;

    const session = verifySessionToken(token, secret);
    if (!session) return null;

    return {
      tenantId: session.tenantId,
      userId: session.userId,
      role: session.role,
    };
  }
}

function parseCookie(header: string, name: string): string | undefined {
  for (const segment of header.split(';')) {
    const [rawKey, ...rest] = segment.split('=');
    if (!rawKey) continue;
    if (rawKey.trim() === name) {
      return rest.join('=').trim();
    }
  }
  return undefined;
}

function readHeader(
  headers: NodeJS.Dict<string | string[]>,
  name: string,
): string | undefined {
  const v = headers[name];
  if (Array.isArray(v)) return v[0];
  return v;
}
