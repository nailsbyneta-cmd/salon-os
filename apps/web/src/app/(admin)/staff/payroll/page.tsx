import * as React from 'react';
import Link from 'next/link';
import { Badge, Card, EmptyState } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { GenerateForm } from './generate-form';
import { closePeriod } from './actions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PayrollPeriodRow {
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
}

interface StaffRow {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
}

// ─── Data loaders ─────────────────────────────────────────────────────────────

async function loadPeriods(): Promise<PayrollPeriodRow[]> {
  const ctx = await getCurrentTenant();
  try {
    const res = await apiFetch<{ periods: PayrollPeriodRow[] }>('/v1/payroll', {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
    return res.periods;
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}

async function loadStaff(): Promise<StaffRow[]> {
  const ctx = await getCurrentTenant();
  try {
    const res = await apiFetch<{ staff: StaffRow[] }>('/v1/staff', {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
    return res.staff;
  } catch (err) {
    if (err instanceof ApiError) return [];
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

export default async function PayrollPage(): Promise<React.JSX.Element> {
  const [periods, staff] = await Promise.all([loadPeriods(), loadStaff()]);

  return (
    <div className="w-full p-4 md:p-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">Team</p>
          <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
            Lohnabrechnung
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {periods.length} {periods.length === 1 ? 'Periode' : 'Perioden'}
          </p>
        </div>
        <GenerateForm staff={staff} />
      </header>

      <div className="mb-4">
        <Link
          href="/staff"
          className="text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          ← Zurück zum Team
        </Link>
      </div>

      {periods.length === 0 ? (
        <Card>
          <EmptyState
            title="Keine Abrechnungsperioden"
            description="Generiere die erste Periode, um Provisionen abzurechnen."
          />
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-raised">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                  Zeitraum
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                  Mitarbeiterin
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-text-muted">
                  Umsatz CHF
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-text-muted">
                  Provision CHF
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-text-muted">
                  Positionen
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-text-muted">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {periods.map((p) => (
                <tr key={p.id} className="hover:bg-surface-raised transition-colors">
                  <td className="px-4 py-3 text-text-primary">
                    <span className="font-medium tabular-nums">
                      {fmtDate(p.fromDate)} – {fmtDate(p.toDate)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {p.staffName ?? <span className="italic text-text-muted">Alle</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-primary">
                    {fmtChf(p.totalRevenueChf)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-accent">
                    {fmtChf(p.totalCommChf)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-secondary">
                    {p.commissionCount}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone[p.status] ?? 'neutral'}>
                      {statusLabel[p.status] ?? p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/staff/payroll/${p.id}`}
                        className="text-xs text-text-secondary hover:text-text-primary transition-colors"
                      >
                        Details
                      </Link>
                      {p.status === 'OPEN' ? (
                        <form action={closePeriod.bind(null, p.id)} className="inline">
                          <button
                            type="submit"
                            className="text-xs font-medium text-warning hover:underline"
                          >
                            Abschliessen
                          </button>
                        </form>
                      ) : null}
                      <a
                        href={`/api/payroll/${p.id}/export`}
                        download
                        className="text-xs font-medium text-accent hover:underline"
                      >
                        CSV exportieren
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
