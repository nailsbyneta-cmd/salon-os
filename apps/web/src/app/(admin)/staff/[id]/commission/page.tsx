import * as React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar, Card, CardBody } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface StaffRow {
  id: string;
  firstName: string;
  lastName: string;
  color: string | null;
  commissionRate: string | null;
  employmentType: string;
}

interface PeriodStats {
  completedCount: number;
  revenueChf: number;
  from: string;
  to: string;
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

async function load(
  staffId: string,
  days: number,
): Promise<{ staff: StaffRow | null; stats: PeriodStats | null }> {
  const ctx = await getCurrentTenant();
  const auth = { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role };
  const { from, to } = rangeFromTo(days);

  try {
    const [staff, reports] = await Promise.all([
      apiFetch<StaffRow>(`/v1/staff/${staffId}`, auth),
      apiFetch<{
        staffUtilization: Array<{
          staffId: string;
          completedCount: number;
          revenueChf: number;
        }>;
        kpis: { from: string; to: string };
      }>(`/v1/reports/dashboard?from=${from}&to=${to}`, auth),
    ]);

    const staffStats = reports.staffUtilization.find((s) => s.staffId === staffId);
    return {
      staff,
      stats: staffStats
        ? {
            completedCount: staffStats.completedCount,
            revenueChf: staffStats.revenueChf,
            from: reports.kpis.from,
            to: reports.kpis.to,
          }
        : { completedCount: 0, revenueChf: 0, from: reports.kpis.from, to: reports.kpis.to },
    };
  } catch (err) {
    if (err instanceof ApiError) return { staff: null, stats: null };
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

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: 'short', year: 'numeric' });
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
  const { staff, stats } = await load(id, range);

  if (!staff) notFound();

  const commissionRate = staff.commissionRate ? Number(staff.commissionRate) / 100 : null;
  const commissionAmount = commissionRate !== null && stats ? stats.revenueChf * commissionRate : null;

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8">
      <Link href={`/staff/${id}`} className="text-xs text-text-muted hover:text-text-primary">
        ← {staff.firstName} {staff.lastName}
      </Link>

      <header className="mt-4 mb-6 flex items-center gap-4">
        <Avatar name={`${staff.firstName} ${staff.lastName}`} color={staff.color} size="lg" />
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">Provision</p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
            {staff.firstName} {staff.lastName}
          </h1>
          {commissionRate !== null ? (
            <p className="text-sm text-text-secondary">
              Provisionssatz: <span className="font-semibold text-accent">{(commissionRate * 100).toFixed(0)}%</span>
            </p>
          ) : (
            <p className="text-sm text-text-muted">Kein Provisionssatz hinterlegt.</p>
          )}
        </div>
      </header>

      {/* Period Selector */}
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

      {stats ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardBody className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  Umsatz
                </p>
                <p className="font-display text-2xl font-semibold tabular-nums text-text-primary">
                  {fmtChf(stats.revenueChf)}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  Abgeschlossen
                </p>
                <p className="font-display text-2xl font-semibold tabular-nums text-text-primary">
                  {stats.completedCount}
                </p>
                <p className="text-xs text-text-muted">Termine</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  Provisionssatz
                </p>
                <p className="font-display text-2xl font-semibold tabular-nums text-text-primary">
                  {commissionRate !== null ? `${(commissionRate * 100).toFixed(0)}%` : '—'}
                </p>
              </CardBody>
            </Card>
            <Card className={commissionAmount !== null ? 'border-accent/30 bg-accent/5' : ''}>
              <CardBody className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  Provision fällig
                </p>
                <p className="font-display text-2xl font-semibold tabular-nums text-accent">
                  {commissionAmount !== null ? fmtChf(commissionAmount) : '—'}
                </p>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardBody>
              <h2 className="mb-3 text-sm font-semibold text-text-primary">Berechnung</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Zeitraum</span>
                  <span className="tabular-nums text-text-primary">
                    {fmtDate(stats.from)} – {fmtDate(stats.to)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Umsatz (abgeschlossene Termine)</span>
                  <span className="tabular-nums text-text-primary">{fmtChf(stats.revenueChf)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">× Provisionssatz</span>
                  <span className="tabular-nums text-text-primary">
                    {commissionRate !== null ? `${(commissionRate * 100).toFixed(0)}%` : 'nicht gesetzt'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-semibold">
                  <span className="text-text-primary">= Provision fällig</span>
                  <span className="tabular-nums text-accent">
                    {commissionAmount !== null ? fmtChf(commissionAmount) : '—'}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>

          {commissionRate === null ? (
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
          ) : null}
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
