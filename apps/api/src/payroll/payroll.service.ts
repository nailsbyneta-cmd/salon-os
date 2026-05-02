import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaClient, StaffCommission } from '@salon-os/db';
import { PRISMA } from '../db/db.module.js';
import { requireTenantContext } from '../tenant/tenant.context.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PayrollPeriodRow {
  id: string;
  tenantId: string;
  staffId: string | null;
  staffName: string | null;
  fromDate: Date;
  toDate: Date;
  status: 'OPEN' | 'CLOSED' | 'EXPORTED';
  totalRevenueChf: string;
  totalCommChf: string;
  commissionCount: number;
  exportedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
}

export interface CommissionRow {
  id: string;
  staffId: string;
  staffName: string;
  appointmentId: string;
  revenueChf: string;
  rate: string;
  commissionChf: string;
  recordedAt: Date;
  paidAt: Date | null;
}

export interface PayrollPeriodDetail extends PayrollPeriodRow {
  commissions: CommissionRow[];
}

export interface GenerateResult {
  period: PayrollPeriodRow;
  commissions: CommissionRow[];
}

export interface ExportResult {
  csv: string;
  filename: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toDateOnly(iso: string): Date {
  // Parse YYYY-MM-DD → midnight UTC — stored as @db.Date so time part is ignored.
  const d = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`Ungültiges Datum: ${iso}`);
  }
  return d;
}

function commissionToRow(
  c: StaffCommission & { staff: { firstName: string; lastName: string } },
): CommissionRow {
  return {
    id: c.id,
    staffId: c.staffId,
    staffName: `${c.staff.firstName} ${c.staff.lastName}`,
    appointmentId: c.appointmentId,
    revenueChf: c.revenueChf.toString(),
    rate: c.rate.toString(),
    commissionChf: c.commissionChf.toString(),
    recordedAt: c.recordedAt,
    paidAt: c.paidAt,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class PayrollService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  /** Builds the WhereInput clause shared by generate / detail / close / export. */
  private commissionWhere(
    tenantId: string,
    fromDate: Date,
    toDate: Date,
    staffId?: string | null,
  ): { tenantId: string; staffId?: string; paidAt: null; recordedAt: { gte: Date; lte: Date } } {
    return {
      tenantId,
      ...(staffId ? { staffId } : {}),
      paidAt: null,
      recordedAt: {
        gte: fromDate,
        lte: new Date(`${toDate.toISOString().slice(0, 10)}T23:59:59.999Z`),
      },
    };
  }

  // ─── generate ────────────────────────────────────────────────────────────

  async generate(input: {
    fromDate: string;
    toDate: string;
    staffId?: string | null;
  }): Promise<GenerateResult> {
    const ctx = requireTenantContext();
    const from = toDateOnly(input.fromDate);
    const to = toDateOnly(input.toDate);

    if (from > to) {
      throw new BadRequestException('fromDate muss vor oder gleich toDate liegen.');
    }

    const commissions = await this.prisma.staffCommission.findMany({
      where: this.commissionWhere(ctx.tenantId, from, to, input.staffId),
      include: { staff: { select: { firstName: true, lastName: true } } },
      orderBy: { recordedAt: 'asc' },
    });

    const totalRevenueChf = commissions.reduce((s, c) => s + Number(c.revenueChf), 0);
    const totalCommChf = commissions.reduce((s, c) => s + Number(c.commissionChf), 0);

    const period = await this.prisma.payrollPeriod.create({
      data: {
        tenantId: ctx.tenantId,
        staffId: input.staffId ?? null,
        fromDate: from,
        toDate: to,
        status: 'OPEN',
        totalRevenueChf,
        totalCommChf,
        commissionCount: commissions.length,
        createdAt: new Date(),
      },
      include: { staff: { select: { firstName: true, lastName: true } } },
    });

    const periodRow = this.toPeriodRow(period);

    return {
      period: periodRow,
      commissions: commissions.map(commissionToRow),
    };
  }

  // ─── list ─────────────────────────────────────────────────────────────────

  async list(): Promise<PayrollPeriodRow[]> {
    const ctx = requireTenantContext();
    const rows = await this.prisma.payrollPeriod.findMany({
      where: { tenantId: ctx.tenantId },
      include: { staff: { select: { firstName: true, lastName: true } } },
      orderBy: { fromDate: 'desc' },
    });
    return rows.map((r) => this.toPeriodRow(r));
  }

  // ─── detail ───────────────────────────────────────────────────────────────

  async detail(id: string): Promise<PayrollPeriodDetail> {
    const ctx = requireTenantContext();
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: { staff: { select: { firstName: true, lastName: true } } },
    });
    if (!period) throw new NotFoundException('Abrechnungsperiode nicht gefunden.');

    const commissions = await this.prisma.staffCommission.findMany({
      where: this.commissionWhere(ctx.tenantId, period.fromDate, period.toDate, period.staffId),
      include: { staff: { select: { firstName: true, lastName: true } } },
      orderBy: { recordedAt: 'asc' },
    });

    return {
      ...this.toPeriodRow(period),
      commissions: commissions.map(commissionToRow),
    };
  }

  // ─── close ────────────────────────────────────────────────────────────────

  async close(id: string): Promise<PayrollPeriodRow> {
    const ctx = requireTenantContext();
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });
    if (!period) throw new NotFoundException('Abrechnungsperiode nicht gefunden.');
    if (period.status !== 'OPEN') {
      throw new ConflictException(
        `Periode ist bereits ${period.status === 'CLOSED' ? 'abgeschlossen' : 'exportiert'} und kann nicht erneut abgeschlossen werden.`,
      );
    }

    const now = new Date();

    // Mark all matching unpaid commissions as paid in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.staffCommission.updateMany({
        where: this.commissionWhere(ctx.tenantId, period.fromDate, period.toDate, period.staffId),
        data: { paidAt: now },
      });
      await tx.payrollPeriod.update({
        where: { id },
        data: { status: 'CLOSED', closedAt: now },
      });
    });

    const updated = await this.prisma.payrollPeriod.findUniqueOrThrow({
      where: { id },
      include: { staff: { select: { firstName: true, lastName: true } } },
    });
    return this.toPeriodRow(updated);
  }

  // ─── exportCsv ────────────────────────────────────────────────────────────

  async exportCsv(id: string): Promise<ExportResult> {
    const ctx = requireTenantContext();
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });
    if (!period) throw new NotFoundException('Abrechnungsperiode nicht gefunden.');

    // Fetch commissions — for CLOSED/EXPORTED we query already-paid rows in
    // this period window; for OPEN we query unpaid ones.
    const commissions = await this.prisma.staffCommission.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(period.staffId ? { staffId: period.staffId } : {}),
        recordedAt: {
          gte: period.fromDate,
          lte: new Date(`${period.toDate.toISOString().slice(0, 10)}T23:59:59.999Z`),
        },
      },
      include: {
        staff: { select: { firstName: true, lastName: true } },
        appointment: { select: { startAt: true } },
      },
      orderBy: { recordedAt: 'asc' },
    });

    const headers = [
      'Datum',
      'Termin-ID',
      'Mitarbeiterin',
      'Umsatz CHF',
      'Kommissions-%',
      'Kommission CHF',
    ];

    const rows = commissions.map((c) => {
      const date = new Date(c.appointment.startAt).toLocaleDateString('de-CH');
      const staffName = `${c.staff.firstName} ${c.staff.lastName}`;
      const ratePct = (Number(c.rate) * 100).toFixed(2);
      return [
        date,
        c.appointmentId,
        staffName,
        Number(c.revenueChf).toFixed(2),
        ratePct,
        Number(c.commissionChf).toFixed(2),
      ]
        .map(csvEscape)
        .join(',');
    });

    const csv = '﻿' + [headers.join(','), ...rows].join('\n');

    const fromStr = period.fromDate.toISOString().slice(0, 10);
    const toStr = period.toDate.toISOString().slice(0, 10);
    const filename = `lohnabrechnung-${fromStr}-${toStr}.csv`;

    // Mark as EXPORTED (idempotent: EXPORTED stays EXPORTED)
    if (period.status !== 'EXPORTED') {
      await this.prisma.payrollPeriod.update({
        where: { id },
        data: { status: 'EXPORTED', exportedAt: new Date() },
      });
    }

    return { csv, filename };
  }

  // ─── Mapper ───────────────────────────────────────────────────────────────

  private toPeriodRow(period: {
    id: string;
    tenantId: string;
    staffId: string | null;
    fromDate: Date;
    toDate: Date;
    status: string;
    totalRevenueChf: { toString(): string };
    totalCommChf: { toString(): string };
    commissionCount: number;
    exportedAt: Date | null;
    closedAt: Date | null;
    createdAt: Date;
    staff: { firstName: string; lastName: string } | null;
  }): PayrollPeriodRow {
    return {
      id: period.id,
      tenantId: period.tenantId,
      staffId: period.staffId,
      staffName: period.staff ? `${period.staff.firstName} ${period.staff.lastName}` : null,
      fromDate: period.fromDate,
      toDate: period.toDate,
      status: period.status as 'OPEN' | 'CLOSED' | 'EXPORTED',
      totalRevenueChf: period.totalRevenueChf.toString(),
      totalCommChf: period.totalCommChf.toString(),
      commissionCount: period.commissionCount,
      exportedAt: period.exportedAt,
      closedAt: period.closedAt,
      createdAt: period.createdAt,
    };
  }
}
