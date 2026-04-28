import { Controller, Get, Query } from '@nestjs/common';
import { requireTenantContext } from '../tenant/tenant.context.js';
import { AdsDashboardService } from './ads-dashboard.service.js';

/**
 * Tenant-scoped Dashboard-Endpoint für /admin/ads-dashboard.
 * Auth via TenantMiddleware (Cookie in Prod, x-tenant-id Header in Dev).
 */
@Controller('v1/ads/dashboard')
export class AdsDashboardController {
  constructor(private readonly svc: AdsDashboardService) {}

  @Get()
  async dashboard(
    @Query('from') fromIso?: string,
    @Query('to') toIso?: string,
  ): Promise<Awaited<ReturnType<AdsDashboardService['getDashboard']>>> {
    const ctx = requireTenantContext();
    const today = new Date();
    const defaultTo = today.toISOString().slice(0, 10);
    const defaultFrom = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const from = fromIso && /^\d{4}-\d{2}-\d{2}$/.test(fromIso) ? fromIso : defaultFrom;
    const to = toIso && /^\d{4}-\d{2}-\d{2}$/.test(toIso) ? toIso : defaultTo;
    return this.svc.getDashboard(ctx.tenantId, ctx.userId, ctx.role, {
      fromIso: `${from}T00:00:00.000Z`,
      toIso: `${to}T23:59:59.999Z`,
    });
  }
}
