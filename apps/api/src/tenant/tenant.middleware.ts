import { Injectable, type NestMiddleware, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { runWithTenant } from './tenant.context.js';

/**
 * Löst Session aus dem Request (Cookie oder Bearer-Token) auf und legt den
 * Tenant-Context in AsyncLocalStorage — alle nachgelagerten DB-Calls
 * sehen ihn via `getTenantContext()`.
 *
 * Aktuell (Phase 0): minimaler Platzhalter — liest `x-tenant-id` +
 * `x-user-id` + `x-role` Headers. Sobald WorkOS-Session integriert ist,
 * ersetzen wir das durch echte Cookie-Verifikation.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  // Fastify-style next callback
  use(req: FastifyRequest['raw'], _res: unknown, next: (err?: unknown) => void): void {
    const headers = req.headers;
    const tenantId = readHeader(headers, 'x-tenant-id');
    const userId = readHeader(headers, 'x-user-id');
    const role = readHeader(headers, 'x-role');

    // Health/Ready-Endpoints dürfen ohne Tenant passieren.
    if (req.url?.startsWith('/health')) {
      next();
      return;
    }

    if (!tenantId) {
      next(new UnauthorizedException('Missing tenant context'));
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
