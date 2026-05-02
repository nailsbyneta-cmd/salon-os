import * as React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar, Card, CardBody } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface StaffKpi {
  staffId: string;
  name: string;
  color: string | null;
  commissionRate: number | null;
  revenueChf: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  avgTicketChf: number | null;
  rebookingRate: number;
  noShowRate: number;
  utilizationPct: number | null;
  commissionChf: number;
  trend: Array<{ date: string; count: number; revenueChf: number }>;
  topServices: Array<{ serviceId: string; name: string; count: number; revenueChf: number }>;
}

interface StaffRow {
  id: string;
  firstName: string;
  lastName: string;
  color: string | null;
}

const PERIODS = [
  { key: '7', label: '7 Tage' },
  { key: '30', label: '30 Tage' },
  { key: '90', label: '90 Tage' },
] as const;

function rangeFromTo(days: number): { from: string; to: string } {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const from = new Date(today.getTime() - days * 86_400_000).toISOString().slice(0, 10);
  return { from, to };
}

async function loadKpi(
  staffId: string,
  days: number,
): Promise<{ kpi: StaffKpi | null; staff: StaffRow | null }> {
  const ctx = await getCurrentTenant();
  const auth = { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role };
  const { from, to } = rangeFromTo(days);
  try {
    const [staff, kpi] = await Promise.all([
      apiFetch<StaffRow>(`/v1/staff/${staffId}`, auth),
      apiFetch<StaffKpi>(`/v1/reports/staff/${staffId}?from=${from}&to=${to}`, auth),
    ]);
    return { kpi, staff };
  } catch (err) {
    if (err instanceof ApiError) return { kpi: null, staff: null };
    throw err;
  }
}

function fmtChf(n: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)} %`;
}

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? 'border-accent/30 bg-accent/5' : ''}>
      <CardBody className="space-y-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{label}</p>
        <p
          className={`font-display text-2xl font-semibold tabular-nums ${accent ? 'text-accent' : 'text-text-primary'}`}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-text-muted">{sub}</p>}
      </CardBody>
    </Card>
  );
}

export default async function CommissionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const sp = await searchParams;
  const range = ['7', '30', '90'].includes(sp.range ?? '') ? Number(sp.range) : 30;
  const { kpi, staff } = await loadKpi(id, range);

  if (!staff) notFound();

  const maxTrendRevenue = kpi ? Math.max(...kpi.trend.map((t) => t.revenueChf), 1) : 1;

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      <Link href={`/staff/${id}`} className="text-xs text-text-muted hover:text-text-primary">
        ← {staff.firstName} {staff.lastName}
      </Link>

      <header className="mt-4 mb-6 flex items-center gap-4">
        <Avatar name={`${staff.firstName} ${staff.lastName}`} color={staff.color} size="lg" />
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">
            Provision &amp; KPIs
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
            {staff.firstName} {staff.lastName}
          </h1>
          {kpi?.commissionRate != null ? (
            <p className="text-sm text-text-secondary">
              Provisionssatz:{' '}
              <span className="font-semibold text-accent">{kpi.commissionRate.toFixed(0)} %</span>
            </p>
          ) : (
            <p className="text-sm text-text-muted">Kein Provisionssatz hinterlegt</p>
          )}
        </div>
      </header>

      <nav className="mb-6 flex gap-2" aria-label="Zeitraum">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/staff/${id}/commission?range=${p.key}`}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              range === Number(p.key)
                ? 'border-accent bg-accent text-accent-foreground'
                : 'border-border bg-surface text-text-secondary hover:border-accent/50'
            }`}
          >
            {p.label}
          </Link>
        ))}
      </nav>

      {kpi ? (
        <div className="space-y-6">
          {/* Revenue + Commission row */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <KpiCard label="Umsatz" value={fmtChf(kpi.revenueChf)} />
            <KpiCard label="Provision fällig" value={fmtChf(kpi.commissionChf)} accent />
            <KpiCard label="Abgeschlossen" value={String(kpi.completedCount)} sub="Termine" />
            <KpiCard
              label="Ø Ticket"
              value={kpi.avgTicketChf != null ? fmtChf(kpi.avgTicketChf) : '—'}
            />
          </div>

          {/* Performance row */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <KpiCard
              label="Rebooking-Rate"
              value={fmtPct(kpi.rebookingRate)}
              sub="Kundinnen mit ≥2 Terminen"
            />
            <KpiCard label="No-Show-Rate" value={fmtPct(kpi.noShowRate)} />
            <KpiCard
              label="Auslastung"
              value={kpi.utilizationPct != null ? fmtPct(kpi.utilizationPct) : '—'}
              sub="Terminmin / Shiftmin"
            />
          </div>

          {/* Revenue trend sparkline */}
          {kpi.trend.length > 0 && (
            <Card>
              <CardBody>
                <h2 className="mb-4 text-sm font-semibold text-text-primary">Umsatz-Trend</h2>
                <div className="flex items-end gap-0.5 h-20">
                  {kpi.trend.map((t) => {
                    const pct = Math.round((t.revenueChf / maxTrendRevenue) * 100);
                    return (
                      <div
                        key={t.date}
                        className="group relative flex-1 min-w-[4px]"
                        title={`${t.date}: ${fmtChf(t.revenueChf)}`}
                      >
                        <div
                          className="bg-accent/70 rounded-t-sm w-full transition-all group-hover:bg-accent"
                          style={{ height: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-text-muted">
                  <span>{kpi.trend[0]?.date}</span>
                  <span>{kpi.trend[kpi.trend.length - 1]?.date}</span>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Top services */}
          {kpi.topServices.length > 0 && (
            <Card>
              <CardBody>
                <h2 className="mb-3 text-sm font-semibold text-text-primary">Top Services</h2>
                <ul className="space-y-2">
                  {kpi.topServices.map((s) => (
                    <li key={s.serviceId} className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">{s.name}</span>
                      <span className="tabular-nums text-text-primary">
                        {s.count}× · {fmtChf(s.revenueChf)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          {/* Calculation breakdown */}
          <Card>
            <CardBody>
              <h2 className="mb-3 text-sm font-semibold text-text-primary">Berechnung</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Umsatz (abgeschlossene Termine)</span>
                  <span className="tabular-nums text-text-primary">{fmtChf(kpi.revenueChf)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">× Provisionssatz</span>
                  <span className="tabular-nums text-text-primary">
                    {kpi.commissionRate != null
                      ? `${kpi.commissionRate.toFixed(0)} %`
                      : 'nicht gesetzt'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-semibold">
                  <span className="text-text-primary">= Provision fällig</span>
                  <span className="tabular-nums text-accent">{fmtChf(kpi.commissionChf)}</span>
                </div>
              </div>
            </CardBody>
          </Card>

          {kpi.commissionRate == null && (
            <Card className="border-warning/30 bg-warning/5">
              <CardBody>
                <p className="text-sm text-text-primary">
                  Kein Provisionssatz hinterlegt.{' '}
                  <Link href={`/staff/${id}`} className="text-accent hover:underline">
                    Profil bearbeiten →
                  </Link>
                </p>
              </CardBody>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardBody>
            <p className="text-sm text-text-secondary">Daten konnten nicht geladen werden.</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
