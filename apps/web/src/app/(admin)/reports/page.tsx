import Link from 'next/link';
import { Card, CardBody, Stat as StatCard } from '@salon-os/ui';
import { Sparkline } from '@/components/sparkline';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface ReportsData {
  kpis: {
    appointments: number;
    completed: number;
    cancelled: number;
    noShow: number;
    revenueChf: number;
    avgTicketChf: number | null;
    rebookingRate: number;
    noShowRate: number;
    uniqueClients: number;
    newClients: number;
    from: string;
    to: string;
  };
  trend: Array<{ date: string; count: number; revenueChf: number }>;
  topServices: Array<{ serviceId: string; name: string; count: number; revenueChf: number }>;
  topClients: Array<{ clientId: string; name: string; visits: number; revenueChf: number }>;
  staffUtilization: Array<{
    staffId: string;
    name: string;
    color: string | null;
    count: number;
    completedCount: number;
    revenueChf: number;
    utilizationPct: number | null;
  }>;
  channels: Array<{ channel: string; count: number; revenueChf: number }>;
}

const PERIODS = [
  { key: '7', label: '7 Tage' },
  { key: '30', label: '30 Tage' },
  { key: '90', label: '90 Tage' },
  { key: '365', label: '1 Jahr' },
] as const;

function rangeFromTo(daysParam: string | undefined): { from: string; to: string } {
  const days = ['7', '30', '90', '365'].includes(daysParam ?? '') ? Number(daysParam) : 30;
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const from = new Date(today.getTime() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return { from, to };
}

async function loadReports(daysParam: string | undefined): Promise<ReportsData | null> {
  const ctx = await getCurrentTenant();
  const { from, to } = rangeFromTo(daysParam);
  try {
    return await apiFetch<ReportsData>(`/v1/reports/dashboard?from=${from}&to=${to}`, {
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

const CHANNEL_LABELS: Record<string, string> = {
  ONLINE_BRANDED: 'Branded Booking',
  ONLINE_WIDGET: 'Widget',
  MARKETPLACE: 'Marktplatz',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  GOOGLE_RESERVE: 'Google Reserve',
  TIKTOK: 'TikTok',
  WHATSAPP: 'WhatsApp',
  PHONE_AI: 'Telefon-KI',
  PHONE_MANUAL: 'Telefon manuell',
  SMS: 'SMS',
  WALK_IN: 'Walk-in',
  STAFF_INTERNAL: 'Salon-intern',
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}): Promise<React.JSX.Element> {
  const sp = await searchParams;
  const range = sp.range ?? '30';
  const data = await loadReports(range);

  if (!data) {
    return (
      <div className="w-full p-4 md:p-8">
        <header className="mb-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">Reports</p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
            Übersicht
          </h1>
        </header>
        <Card>
          <CardBody>
            <p className="text-sm text-text-secondary">
              Reports konnten nicht geladen werden. Prüfe die API-Verbindung.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const { kpis, trend, topServices, topClients, staffUtilization, channels } = data;
  const sparkPoints = trend.map((t) => t.revenueChf);

  return (
    <div className="w-full p-4 md:p-8">
      <header className="mb-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">Reports</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Übersicht
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Umsatz, Auslastung, Top-Kundinnen, Service-Popularität — server-seitig aggregiert.
        </p>
      </header>

      {/* Range-Tabs */}
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Zeitraum">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/reports?range=${p.key}`}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              range === p.key
                ? 'border-accent bg-accent text-accent-foreground'
                : 'border-border bg-surface text-text-secondary hover:border-accent/50'
            }`}
          >
            {p.label}
          </Link>
        ))}
        <Link
          href="/api/reports/export"
          className="ml-auto rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-accent/50"
        >
          ↓ CSV-Export
        </Link>
      </nav>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
        <StatCard label="Umsatz" value={fmtChf(kpis.revenueChf)} />
        <StatCard label="Termine" value={fmtNum(kpis.appointments)} />
        <StatCard label="Avg. Ticket" value={fmtChf(kpis.avgTicketChf)} />
        <StatCard label="No-Show-Rate" value={`${kpis.noShowRate}%`} />
        <StatCard label="Rebooking-Rate" value={`${kpis.rebookingRate}%`} />
        <StatCard
          label="Neue Kundinnen"
          value={`${fmtNum(kpis.newClients)} / ${fmtNum(kpis.uniqueClients)}`}
          sub="im Range / total aktiv"
        />
      </div>

      {/* Trend Chart */}
      <Card className="mt-6">
        <CardBody>
          <h2 className="mb-4 text-base font-semibold">Tagesumsatz</h2>
          {sparkPoints.length === 0 ? (
            <p className="text-sm text-text-muted">Keine Daten im Zeitraum.</p>
          ) : (
            <div>
              <Sparkline data={sparkPoints} height={80} />
              <div className="mt-2 flex items-center justify-between text-[10px] text-text-muted">
                <span>{trend[0]?.date.slice(5)}</span>
                <span>{trend[trend.length - 1]?.date.slice(5)}</span>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Top Services + Top Clients */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h2 className="mb-4 text-base font-semibold">Top-Services</h2>
            {topServices.length === 0 ? (
              <p className="text-sm text-text-muted">Keine Services im Zeitraum.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-text-muted">
                    <th className="py-2">Service</th>
                    <th className="py-2 text-right">Anzahl</th>
                    <th className="py-2 text-right">Umsatz</th>
                  </tr>
                </thead>
                <tbody>
                  {topServices.map((s) => (
                    <tr key={s.serviceId} className="border-b border-border/50 last:border-b-0">
                      <td className="py-2 font-medium text-text-primary">{s.name}</td>
                      <td className="py-2 text-right tabular-nums">{fmtNum(s.count)}</td>
                      <td className="py-2 text-right tabular-nums">{fmtChf(s.revenueChf)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="mb-4 text-base font-semibold">Top-Kundinnen</h2>
            {topClients.length === 0 ? (
              <p className="text-sm text-text-muted">Keine Kundinnen im Zeitraum.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-text-muted">
                    <th className="py-2">Kundin</th>
                    <th className="py-2 text-right">Besuche</th>
                    <th className="py-2 text-right">Umsatz</th>
                  </tr>
                </thead>
                <tbody>
                  {topClients.map((c) => (
                    <tr key={c.clientId} className="border-b border-border/50 last:border-b-0">
                      <td className="py-2 font-medium text-text-primary">
                        <Link href={`/clients/${c.clientId}`} className="hover:text-accent">
                          {c.name}
                        </Link>
                      </td>
                      <td className="py-2 text-right tabular-nums">{fmtNum(c.visits)}</td>
                      <td className="py-2 text-right tabular-nums">{fmtChf(c.revenueChf)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Staff Utilization */}
      <Card className="mt-6">
        <CardBody>
          <h2 className="mb-4 text-base font-semibold">Auslastung pro Mitarbeiterin</h2>
          {staffUtilization.length === 0 ? (
            <p className="text-sm text-text-muted">Keine Mitarbeiter-Daten.</p>
          ) : (
            <div className="space-y-3">
              {staffUtilization.map((s) => (
                <div key={s.staffId}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-medium text-text-primary">
                      {s.color ? (
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: s.color }}
                          aria-hidden
                        />
                      ) : null}
                      {s.name}
                    </span>
                    <span className="text-xs tabular-nums text-text-muted">
                      {s.completedCount}/{s.count} Termine ·{' '}
                      {s.utilizationPct !== null ? `${s.utilizationPct}%` : 'keine Schichten'} ·{' '}
                      {fmtChf(s.revenueChf)}
                    </span>
                  </div>
                  {s.utilizationPct !== null ? (
                    <div className="h-2 w-full overflow-hidden rounded-full bg-border/40">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${Math.min(100, s.utilizationPct)}%` }}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Channels */}
      <Card className="mt-6">
        <CardBody>
          <h2 className="mb-4 text-base font-semibold">Buchungs-Kanäle</h2>
          {channels.length === 0 ? (
            <p className="text-sm text-text-muted">Keine Kanal-Daten.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {channels.map((c) => (
                <div
                  key={c.channel}
                  className="flex items-baseline justify-between rounded-md border border-border bg-surface p-3"
                >
                  <span className="text-sm font-medium text-text-primary">
                    {CHANNEL_LABELS[c.channel] ?? c.channel}
                  </span>
                  <span className="text-xs tabular-nums text-text-muted">
                    {fmtNum(c.count)} · {fmtChf(c.revenueChf)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
