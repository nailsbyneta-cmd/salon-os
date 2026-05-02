import Link from 'next/link';
import { Card, CardBody } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface LocationSummary {
  locationId: string;
  locationName: string;
  city: string | null;
  totalRevenueCHF: number;
  appointmentCount: number;
  avgTicketCHF: number | null;
  staffCount: number;
}

async function loadLocationSummaries(days: number): Promise<LocationSummary[] | null> {
  const ctx = await getCurrentTenant();
  try {
    return await apiFetch<LocationSummary[]>(`/v1/reports/locations?days=${days}`, {
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

const PERIODS = [
  { key: 7, label: '7 Tage' },
  { key: 30, label: '30 Tage' },
  { key: 90, label: '90 Tage' },
  { key: 365, label: '1 Jahr' },
] as const;

export default async function LocationsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}): Promise<React.JSX.Element> {
  const sp = await searchParams;
  const days = ['7', '30', '90', '365'].includes(sp.days ?? '') ? Number(sp.days) : 30;
  const data = await loadLocationSummaries(days);

  const totalRevenue = data?.reduce((s, l) => s + l.totalRevenueCHF, 0) ?? 0;
  const totalAppointments = data?.reduce((s, l) => s + l.appointmentCount, 0) ?? 0;
  const totalStaff = data?.reduce((s, l) => s + l.staffCount, 0) ?? 0;
  const overallAvgTicket =
    totalAppointments > 0 ? Math.round((totalRevenue / totalAppointments) * 100) / 100 : null;

  return (
    <div className="w-full p-4 md:p-8">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <Link
            href="/reports"
            className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-muted hover:text-accent"
          >
            Reports
          </Link>
          <span className="text-[10px] text-text-muted">/</span>
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">
            Standorte
          </p>
        </div>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Standort-Vergleich
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Umsatz, Termine und Mitarbeiter — aggregiert pro Standort.
        </p>
      </header>

      {/* Period tabs */}
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Zeitraum">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/reports/locations?days=${p.key}`}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              days === p.key
                ? 'border-accent bg-accent text-accent-foreground'
                : 'border-border bg-surface text-text-secondary hover:border-accent/50'
            }`}
          >
            {p.label}
          </Link>
        ))}
      </nav>

      {/* Error / empty state */}
      {data === null ? (
        <Card>
          <CardBody>
            <p className="text-sm text-text-secondary">
              Standort-Daten konnten nicht geladen werden. Prüfe die API-Verbindung.
            </p>
          </CardBody>
        </Card>
      ) : data.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-text-secondary">
              Keine Standorte gefunden. Lege zuerst einen Standort an.
            </p>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Main table */}
          <Card>
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-text-muted">
                      <th className="py-3 pr-4">Standort</th>
                      <th className="py-3 pr-4">Stadt</th>
                      <th className="py-3 pr-4 text-right">Umsatz (CHF)</th>
                      <th className="py-3 pr-4 text-right">Termine</th>
                      <th className="py-3 pr-4 text-right">Durchschnittsumsatz</th>
                      <th className="py-3 text-right">Mitarbeiter</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((loc, idx) => (
                      <tr
                        key={loc.locationId}
                        className="border-b border-border/50 transition-colors last:border-b-0 hover:bg-surface/60"
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            {/* Rank badge */}
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-semibold tabular-nums text-accent">
                              {idx + 1}
                            </span>
                            <span className="font-medium text-text-primary">
                              {loc.locationName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-text-secondary">{loc.city ?? '—'}</td>
                        <td className="py-3 pr-4 text-right tabular-nums font-medium text-text-primary">
                          {fmtChf(loc.totalRevenueCHF)}
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums text-text-secondary">
                          {fmtNum(loc.appointmentCount)}
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums text-text-secondary">
                          {fmtChf(loc.avgTicketCHF)}
                        </td>
                        <td className="py-3 text-right tabular-nums text-text-secondary">
                          {fmtNum(loc.staffCount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Totals row */}
                  <tfoot>
                    <tr className="border-t-2 border-border bg-surface/40 text-[11px] font-semibold text-text-primary">
                      <td className="py-3 pr-4" colSpan={2}>
                        Total ({data.length} {data.length === 1 ? 'Standort' : 'Standorte'})
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums">{fmtChf(totalRevenue)}</td>
                      <td className="py-3 pr-4 text-right tabular-nums">
                        {fmtNum(totalAppointments)}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums">
                        {fmtChf(overallAvgTicket)}
                      </td>
                      <td className="py-3 text-right tabular-nums">{fmtNum(totalStaff)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardBody>
          </Card>

          {/* Revenue share bar chart per location */}
          {totalRevenue > 0 ? (
            <Card className="mt-6">
              <CardBody>
                <h2 className="mb-4 text-base font-semibold">Umsatzanteil pro Standort</h2>
                <div className="space-y-3">
                  {data.map((loc) => {
                    const pct =
                      totalRevenue > 0
                        ? Math.round((loc.totalRevenueCHF / totalRevenue) * 1000) / 10
                        : 0;
                    return (
                      <div key={loc.locationId}>
                        <div className="mb-1 flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium text-text-primary">
                            {loc.locationName}
                            {loc.city ? (
                              <span className="ml-1 text-xs font-normal text-text-muted">
                                {loc.city}
                              </span>
                            ) : null}
                          </span>
                          <span className="text-xs tabular-nums text-text-muted">
                            {pct}% · {fmtChf(loc.totalRevenueCHF)}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-border/40">
                          <div
                            className="h-full bg-accent transition-all"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
