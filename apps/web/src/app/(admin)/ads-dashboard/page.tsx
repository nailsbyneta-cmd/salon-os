import Link from 'next/link';
import { Card, CardBody } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface AdsDashboardData {
  kpis: {
    spendChf: number;
    bookingRevenueChf: number;
    conversions: number;
    cpa: number | null;
    roas: number | null;
    from: string;
    to: string;
  };
  campaigns: Array<{
    campaignId: string | null;
    campaignName: string | null;
    spendChf: number;
    clicks: number;
    impressions: number;
    conversions: number;
    cpa: number | null;
  }>;
  sourceMix: Array<{ source: string; bookings: number; revenueChf: number }>;
  trend: Array<{ date: string; spendChf: number; revenueChf: number }>;
}

const RANGES = [
  { key: '7', label: '7 Tage' },
  { key: '30', label: '30 Tage' },
  { key: '90', label: '90 Tage' },
] as const;

function rangeToFromTo(daysParam: string | undefined): { from: string; to: string } {
  const days = daysParam === '7' || daysParam === '90' ? Number(daysParam) : 30;
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const from = new Date(today.getTime() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return { from, to };
}

async function loadDashboard(daysParam: string | undefined): Promise<AdsDashboardData | null> {
  const ctx = await getCurrentTenant();
  const { from, to } = rangeToFromTo(daysParam);
  try {
    return await apiFetch<AdsDashboardData>(`/v1/ads/dashboard?from=${from}&to=${to}`, {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
}

function fmtChf(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtNum(n: number): string {
  return new Intl.NumberFormat('de-CH').format(n);
}

const SOURCE_LABELS: Record<string, string> = {
  google_ads: 'Google Ads',
  gbp: 'Google Maps',
  organic: 'Organische Suche',
  direct: 'Direkt',
  instagram: 'Instagram',
  referral: 'Empfehlung',
  unknown: 'Unbekannt',
};

const SOURCE_COLORS: Record<string, string> = {
  google_ads: 'bg-accent',
  gbp: 'bg-emerald-500',
  organic: 'bg-blue-500',
  direct: 'bg-slate-400',
  instagram: 'bg-pink-500',
  referral: 'bg-violet-500',
  unknown: 'bg-zinc-400',
};

export default async function AdsDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}): Promise<React.JSX.Element> {
  const sp = await searchParams;
  const range = sp.range ?? '30';
  const data = await loadDashboard(range);

  if (!data) {
    return (
      <div className="w-full p-4 md:p-8">
        <header className="mb-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">
            Marketing
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
            Ads-Dashboard
          </h1>
        </header>
        <Card>
          <CardBody>
            <p className="text-sm text-text-secondary">
              Noch keine Google-Ads-Integration konfiguriert. Wende dich an den Admin um den
              OAuth-Refresh-Token + Conversion-Action-Mapping einzurichten.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const { kpis, campaigns, sourceMix, trend } = data;
  const totalBookings = sourceMix.reduce((s, m) => s + m.bookings, 0);

  return (
    <div className="w-full p-4 md:p-8">
      <header className="mb-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">Marketing</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Ads-Dashboard
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Spend vs Revenue, ROAS, CPA — pro Kampagne und Quelle. Daten werden täglich um 04:00 UTC
          frisch gepullt.
        </p>
      </header>

      {/* Range-Tabs */}
      <nav className="mb-6 flex gap-2" aria-label="Zeitraum">
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={`/ads-dashboard?range=${r.key}`}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              range === r.key
                ? 'border-accent bg-accent text-accent-foreground'
                : 'border-border bg-surface text-text-secondary hover:border-accent/50'
            }`}
          >
            {r.label}
          </Link>
        ))}
      </nav>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardBody className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Ad-Spend
            </p>
            <p className="font-display text-2xl font-semibold tabular-nums">
              {fmtChf(kpis.spendChf)}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Booking-Revenue
            </p>
            <p className="font-display text-2xl font-semibold tabular-nums">
              {fmtChf(kpis.bookingRevenueChf)}
            </p>
            <p className="text-xs text-text-muted">aus Google-Ads attribution</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">ROAS</p>
            <p className="font-display text-2xl font-semibold tabular-nums">
              {kpis.roas !== null ? `${kpis.roas.toFixed(1)}x` : '—'}
            </p>
            <p className="text-xs text-text-muted">
              {kpis.roas !== null && kpis.roas >= 3
                ? 'Profitabel'
                : kpis.roas !== null && kpis.roas >= 1.5
                  ? 'Knapp profitabel'
                  : 'Optimieren'}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">CPA</p>
            <p className="font-display text-2xl font-semibold tabular-nums">{fmtChf(kpis.cpa)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Conversions
            </p>
            <p className="font-display text-2xl font-semibold tabular-nums">
              {fmtNum(kpis.conversions)}
            </p>
            <p className="text-xs text-text-muted">Bookings via Google Ads</p>
          </CardBody>
        </Card>
      </div>

      {/* Per-Campaign Table */}
      <Card className="mt-6">
        <CardBody>
          <h2 className="mb-4 text-base font-semibold">Per Kampagne</h2>
          {campaigns.length === 0 ? (
            <p className="text-sm text-text-muted">
              Noch kein Spend-Snapshot. Cron läuft täglich 04:00 UTC. Erste Daten morgen.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-text-muted">
                    <th className="py-2">Kampagne</th>
                    <th className="py-2 text-right">Spend</th>
                    <th className="py-2 text-right">Conv.</th>
                    <th className="py-2 text-right">CPA</th>
                    <th className="py-2 text-right">Klicks</th>
                    <th className="py-2 text-right">Impr.</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c, i) => (
                    <tr
                      key={c.campaignId ?? i}
                      className="border-b border-border/50 last:border-b-0"
                    >
                      <td className="py-2 font-medium text-text-primary">
                        {c.campaignName ?? c.campaignId ?? '—'}
                      </td>
                      <td className="py-2 text-right tabular-nums">{fmtChf(c.spendChf)}</td>
                      <td className="py-2 text-right tabular-nums">{c.conversions.toFixed(0)}</td>
                      <td className="py-2 text-right tabular-nums">{fmtChf(c.cpa)}</td>
                      <td className="py-2 text-right tabular-nums">{fmtNum(c.clicks)}</td>
                      <td className="py-2 text-right tabular-nums">{fmtNum(c.impressions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Source Mix + Trend */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Acquisition-Mix */}
        <Card>
          <CardBody>
            <h2 className="mb-4 text-base font-semibold">Quellen-Mix</h2>
            {totalBookings === 0 ? (
              <p className="text-sm text-text-muted">Noch keine Bookings im Zeitraum.</p>
            ) : (
              <div className="space-y-3">
                {sourceMix.map((m) => {
                  const pct = totalBookings > 0 ? (m.bookings / totalBookings) * 100 : 0;
                  return (
                    <div key={m.source}>
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-text-primary">
                          {SOURCE_LABELS[m.source] ?? m.source}
                        </span>
                        <span className="text-xs tabular-nums text-text-muted">
                          {m.bookings} ({pct.toFixed(0)}%) · {fmtChf(m.revenueChf)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-border/40">
                        <div
                          className={`h-full ${SOURCE_COLORS[m.source] ?? 'bg-zinc-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Trend Bar-Chart (CSS only, kein chart.js dep) */}
        <Card>
          <CardBody>
            <h2 className="mb-4 text-base font-semibold">Spend vs Revenue (täglich)</h2>
            {trend.length === 0 ? (
              <p className="text-sm text-text-muted">Noch keine Trend-Daten.</p>
            ) : (
              <TrendChart points={trend} />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function TrendChart({
  points,
}: {
  points: Array<{ date: string; spendChf: number; revenueChf: number }>;
}): React.JSX.Element {
  const max = Math.max(...points.map((p) => Math.max(p.spendChf, p.revenueChf)), 1);
  return (
    <div className="space-y-1">
      <div className="flex h-40 items-end gap-1">
        {points.map((p) => {
          const spendH = (p.spendChf / max) * 100;
          const revH = (p.revenueChf / max) * 100;
          return (
            <div
              key={p.date}
              className="flex-1 min-w-0 flex items-end gap-px"
              title={`${p.date}\nSpend: ${fmtChf(p.spendChf)}\nRevenue: ${fmtChf(p.revenueChf)}`}
            >
              <div className="flex-1 bg-rose-500/80" style={{ height: `${spendH}%` }} />
              <div className="flex-1 bg-emerald-500/80" style={{ height: `${revH}%` }} />
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between pt-2 text-[10px] text-text-muted">
        <span>{points[0]?.date.slice(5)}</span>
        <span>{points[points.length - 1]?.date.slice(5)}</span>
      </div>
      <div className="flex items-center gap-3 pt-2 text-xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-rose-500/80" /> Spend
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-emerald-500/80" /> Revenue
        </span>
      </div>
    </div>
  );
}
