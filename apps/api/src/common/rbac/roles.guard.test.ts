import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';

import { runWithTenant } from '../../tenant/tenant.context.js';

import { RolesGuard } from './roles.guard.js';

function makeReflector(required: string[] | undefined): Reflector {
  const r = new Reflector();
  r.getAllAndOverride = vi.fn(() => required);
  return r;
}

const dummyContext = {
  getHandler: () => () => null,
  getClass: () => class Dummy {},
} as unknown as ExecutionContext;

const ownerCtx = {
  tenantId: 't-1111111-1111-4111-8111-111111111111',
  userId: 'u-1111111-1111-4111-8111-111111111111',
  role: 'OWNER',
};

describe('RolesGuard', () => {
  it('lässt Requests ohne Metadata passieren (kein @RequireRole)', () => {
    const guard = new RolesGuard(makeReflector(undefined));
    expect(guard.canActivate(dummyContext)).toBe(true);
  });

  it('lässt Requests mit passender Rolle passieren', async () => {
    const guard = new RolesGuard(makeReflector(['OWNER', 'MANAGER']));
    const result = await runWithTenant(ownerCtx, () =>
      Promise.resolve(guard.canActivate(dummyContext)),
    );
    expect(result).toBe(true);
  });

  it('wirft 403, wenn Rolle nicht whitelisted ist', async () => {
    const guard = new RolesGuard(makeReflector(['OWNER']));
    await expect(
      runWithTenant({ ...ownerCtx, role: 'STYLIST' }, async () =>
        guard.canActivate(dummyContext),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('wirft 401, wenn Tenant-Context fehlt', () => {
    const guard = new RolesGuard(makeReflector(['OWNER']));
    expect(() => guard.canActivate(dummyContext)).toThrow(UnauthorizedException);
  });

  it('wirft 403, wenn Rolle im Context null ist (User ohne Staff-Role)', async () => {
    const guard = new RolesGuard(makeReflector(['OWNER']));
    await expect(
      runWithTenant({ ...ownerCtx, role: null }, async () =>
        guard.canActivate(dummyContext),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

});
