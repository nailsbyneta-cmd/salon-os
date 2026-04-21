import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { getTenantContext } from '../../tenant/tenant.context.js';

import {
  ROLES_METADATA_KEY,
  type StaffRoleName,
} from './roles.decorator.js';

/**
 * RolesGuard — liest `@RequireRole(...)` von Handler und/oder Klasse und
 * vergleicht mit der Rolle aus dem Tenant-Context. Ohne Metadata → pass.
 *
 * Registriert werden kann:
 *   - Global via `APP_GUARD`-Provider (empfohlen), dann greift `@RequireRole`
 *     überall automatisch.
 *   - Lokal via `@UseGuards(RolesGuard)` am Controller/Handler.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<StaffRoleName[] | undefined>(
      ROLES_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const ctx = getTenantContext();
    if (!ctx) {
      throw new UnauthorizedException('RBAC: kein Tenant-Context — Middleware verpasst?');
    }
    if (!ctx.role) {
      throw new ForbiddenException('RBAC: Rolle fehlt im Session-Token.');
    }
    if (!required.includes(ctx.role as StaffRoleName)) {
      throw new ForbiddenException(
        `RBAC: Rolle ${ctx.role} darf diese Operation nicht ausführen.`,
      );
    }
    return true;
  }
}
