import * as React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Card, CardBody } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { closePeriod } from '../actions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommissionRow {
  id: string;
  staffId: string;
  staffName: string;
  appointmentId: string;
  revenueChf: string;
  rate: string;
  commissionChf: string;
  recordedAt: string;
  paidAt: string | null;
}

interface PayrollPeriodDetail {
  id: string;
  staffId: string | null;
  staffName: string | null;
  fromDate: string;
  toDate: string;
  status: 'OPEN' | 'CLOSED' | 'EXPORTED';
  totalRevenueChf: string;
  totalCommChf: string;
  commissionCount: number;
  exportedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  commissions: CommissionRow[];
}

// ─── Loader ───────────────────────────────────────────────────────────────────

async function loadDetail(id: string): Promise<PayrollPeriodDetail | null> {
  const ctx = await getCurrentTenant();
  try {
    return await apiFetch<PayrollPeriodDetail>(`/v1/payroll/${id}`, {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function fmtChf(s: string): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 2,
  }).format(Number(s));
}

const statusLabel: Record<string, string> = {
  OPEN: 'Offen',
  CLOSED: 'Abgeschlossen',
  EXPORTED: 'Exportiert',
};

const statusTone: Record<string, 'warning' | 'success' | 'neutral'> = {
  OPEN: 'warning',
  CLOSED: 'success',
  EXPORTED: 'neutral',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PayrollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const detail = await loadDetail(id);
  if (!detail) notFound();

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <Link
        href="/staff/payroll"
        className="text-xs text-text-muted hover:text-text-primary transition-colors"
      >
        ← Lohnabrechnung
      </Link>

      <header className="mt-4 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">
            Abrechnungsperiode
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
            {fmtDate(detail.fromDate)} – {fmtDate(detail.toDate)}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {detail.staffName ?? 'Alle Mitarbeiterinnen'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={statusTone[detail.status] ?? 'neutral'}>
            {statusLabel[detail.status] ?? detail.status}
          </Badge>
          {detail.status === 'OPEN' ? (
            <form action={closePeriod.bind(null, detail.id)}>
              <button
                type="submit"
                className="rounded-md border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning hover:bg-warning/20 transition-colors"
              >
                Abschliessen
              </button>
            </form>
          ) : null}
          <a
            href={`/api/payroll/${detail.id}/export`}
            download
            className="rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 transition-colors"
          >
            CSV exportieren
          </a>
        </div>
      </header>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        <Card>
          <CardBody className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Umsatz
            </p>
            <p className="font-display text-2xl font-semibold tabular-nums text-text-primary">
              {fmtChf(detail.totalRevenueChf)}
            </p>
          </CardBody>
        </Card>
        <Card className="border-accent/30 bg-accent/5">
          <CardBody className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Provision
            </p>
            <p className="font-display text-2xl font-semibold tabular-nums text-accent">
              {fmtChf(detail.totalCommChf)}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Positionen
            </p>
            <p className="font-display text-2xl font-semibold tabular-nums text-text-primary">
              {detail.commissionCount}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Commission rows table */}
      {detail.commissions.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-text-secondary">
              Keine offenen Provisionen in diesem Zeitraum gefunden.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-raised">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                  Datum
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                  Mitarbeiterin
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                  Termin-ID
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-text-muted">
                  Umsatz CHF
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-text-muted">
                  Satz %
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-text-muted">
                  Provision CHF
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {detail.commissions.map((c) => (
                <tr key={c.id} className="hover:bg-surface-raised transition-colors">
                  <td className="px-4 py-3 tabular-nums text-text-secondary">
                    {fmtDate(c.recordedAt)}
                  </td>
                  <td className="px-4 py-3 text-text-primary">{c.staffName}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-text-muted">
                    {c.appointmentId.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-primary">
                    {fmtChf(c.revenueChf)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-secondary">
                    {(Number(c.rate) * 100).toFixed(0)} %
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-accent">
                    {fmtChf(c.commissionChf)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border bg-surface-raised">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-xs font-medium text-text-muted">
                  Summe
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-text-primary">
                  {fmtChf(detail.totalRevenueChf)}
                </td>
                <td />
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-accent">
                  {fmtChf(detail.totalCommChf)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {detail.closedAt ? (
        <p className="mt-4 text-xs text-text-muted">
          Abgeschlossen: {fmtDate(detail.closedAt)}
          {detail.exportedAt ? ` · Exportiert: ${fmtDate(detail.exportedAt)}` : null}
        </p>
      ) : null}
    </div>
  );
}
