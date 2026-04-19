import {
  Injectable,
  Logger,
  type NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { runWithTenant } from './tenant.context.js';

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

    // Health/Ready-Endpoints dürfen ohne Tenant passieren.
    if (req.url?.startsWith('/health')) {
      next();
      return;
    }

    const tenantId = readHeader(headers, 'x-tenant-id');
    const userId = readHeader(headers, 'x-user-id');
    const role = readHeader(headers, 'x-role');

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
}

function readHeader(
  headers: NodeJS.Dict<string | string[]>,
  name: string,
): string | undefined {
  const v = headers[name];
  if (Array.isArray(v)) return v[0];
  return v;
}
