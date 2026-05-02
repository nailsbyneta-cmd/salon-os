import { Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { requireTenantContext } from '../tenant/tenant.context.js';
import { ReportsService } from './reports.service.js';

function requireManagerOrOwner(role: string | null | undefined): void {
  if (role !== 'OWNER' && role !== 'MANAGER') {
    throw new ForbiddenException('Nur OWNER oder MANAGER dürfen Berichte einsehen.');
  }
}

/**
 * Reports v2 — server-side aggregation für /admin/reports.
 * Pre-computed KPIs, Trend-Series, Top-Listen, Staff-Utilization, Channels.
 *
 * Default-Range = letzte 30 Tage. Override via ?from=YYYY-MM-DD&to=YYYY-MM-DD.
 */
@Controller('v1/reports')
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Get('dashboard')
  async dashboard(
    @Query('from') fromIso?: string,
    @Query('to') toIso?: string,
  ): Promise<Awaited<ReturnType<ReportsService['getDashboard']>>> {
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

  @Get('locations')
  async locationSummaries(
    @Query('days') daysParam?: string,
  ): Promise<Awaited<ReturnType<ReportsService['getLocationSummaries']>>> {
    const ctx = requireTenantContext();
    requireManagerOrOwner(ctx.role);
    const days = daysParam && /^\d+$/.test(daysParam) ? parseInt(daysParam, 10) : 30;
    return this.svc.getLocationSummaries(ctx.tenantId, ctx.userId, ctx.role, days);
  }

  @Get('staff/:staffId')
  async staffKpi(
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Query('from') fromIso?: string,
    @Query('to') toIso?: string,
  ): Promise<Awaited<ReturnType<ReportsService['getStaffKpi']>>> {
    const ctx = requireTenantContext();
    requireManagerOrOwner(ctx.role);
    const today = new Date();
    const defaultTo = today.toISOString().slice(0, 10);
    const defaultFrom = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const from = fromIso && /^\d{4}-\d{2}-\d{2}$/.test(fromIso) ? fromIso : defaultFrom;
    const to = toIso && /^\d{4}-\d{2}-\d{2}$/.test(toIso) ? toIso : defaultTo;
    return this.svc.getStaffKpi(ctx.tenantId, ctx.userId, ctx.role, staffId, {
      fromIso: `${from}T00:00:00.000Z`,
      toIso: `${to}T23:59:59.999Z`,
    });
  }
}
