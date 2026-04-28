import Link from 'next/link';
import { Card, CardBody, Stat as StatCard, cn } from '@salon-os/ui';
import { Sparkline } from '@/components/sparkline';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface Appt {
  id: string;
  startAt: string;
  status: string;
  bookedVia?: string;
  staffId: string;
  clientId: string | null;
  staff: { firstName: string; lastName: string; color: string | null };
  client: { firstName: string; lastName: string } | null;
  items: Array<{ price: string; service: { name: string } }>;
}

interface PeriodStats {
  count: number;
  revenueCents: number;
  completedCount: number;
  noShowCount: number;
  cancelledCount: number;
  bookedViaBreakdown: Map<string, number>;
  topServices: Array<{ name: string; count: number; revenueCents: number }>;
  topClients: Array<{ name: string; visits: number; revenueCents: number }>;
  perStaff: Array<{
    id: string;
    name: string;
    color: string | null;
    count: number;
    revenueCents: number;
  }>;
  byDay: Map<string, { count: number; revenueCents: number }>;
  byWeek: Array<{
    weekStart: string; // YYYY-MM-DD (Monday UTC)
    total: number;
    noShow: number;
    cancelled: number;
  }>;
}

function mondayKeyUtc(iso: string): string {
  // Week-key = Montag-UTC der ISO-Woche. Klein genug dass DST-Wackler die
  // Wochenzuordnung nicht verschieben; für Rate-Trends über 12+ Wochen
  // sind UTC-Buckets stabil genug.
  const d = new Date(iso);
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function fillWeekGaps(
  byWeek: Array<{ weekStart: string; total: number; noShow: number; cancelled: number }>,
): typeof byWeek {
  if (byWeek.length <= 1) return byWeek;
  const out: typeof byWeek = [];
  const first = new Date(byWeek[0]!.weekStart + 'T00:00:00Z');
  const last = new Date(byWeek[byWeek.length - 1]!.weekStart + 'T00:00:00Z');
  const existing = new Map(byWeek.map((w) => [w.weekStart, w]));
  for (let t = first.getTime(); t <= last.getTime(); t += 7 * 24 * 60 * 60 * 1000) {
    const d = new Date(t);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    out.push(
      existing.get(key) ?? {
        weekStart: key,
        total: 0,
        noShow: 0,
        cancelled: 0,
      },
    );
  }
  return out;
}

function isoWeek(isoDate: string): number {
  // ISO 8601 Wochen-Nummer für Montag YYYY-MM-DD.
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

type PeriodKey = 'today' | '7d' | '30d' | '90d' | '1y';

const PERIODS: Record<PeriodKey, { label: string; days: number }> = {
  today: { label: 'Heute', days: 1 },
  '7d': { label: '7 Tage', days: 7 },
  '30d': { label: '30 Tage', days: 30 },
  '90d': { label: '90 Tage', days: 90 },
  '1y': { label: '1 Jahr', days: 365 },
};

function periodRange(key: PeriodKey): { from: Date; to: Date; days: number } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const days = PERIODS[key].days;
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - (days - 1));
  return { from, to, days };
}

function previousRange(current: { from: Date; to: Date; days: number }): { from: Date; to: Date } {
  const to = new Date(current.from);
  to.setMilliseconds(to.getMilliseconds() - 1);
  const from = new Date(to);
  from.setDate(from.getDate() - (current.days - 1));
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

async function loadAppointments(range: { from: Date; to: Date }): Promise<Appt[]> {
  const ctx = await getCurrentTenant();
  try {
    const res = await apiFetch<{ appointments: Appt[] }>(
      `/v1/appointments?from=${range.from.toISOString()}&to=${range.to.toISOString()}`,
      { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role },
    );
    return res.appointments;
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}

function computeStats(appts: Appt[]): PeriodStats {
  const byDay = new Map<string, { count: number; revenueCents: number }>();
  const topSvc = new Map<string, { count: number; revenueCents: number }>();
  const bookedViaBreakdown = new Map<string, number>();
  const perStaffMap = new Map<
    string,
    {
      id: string;
      name: string;
      color: string | null;
      count: number;
      revenueCents: number;
    }
  >();
  const topCliMap = new Map<string, { name: string; visits: number; revenueCents: number }>();

  let completed = 0;
  let noShow = 0;
  let cancelled = 0;
  let revenueCents = 0;

  const weekMap = new Map<string, { total: number; noShow: number; cancelled: number }>();

  for (const a of appts) {
    const dayKey = a.startAt.slice(0, 10);
    const dayBucket = byDay.get(dayKey) ?? { count: 0, revenueCents: 0 };
    dayBucket.count += 1;

    const wk = mondayKeyUtc(a.startAt);
    const wkBucket = weekMap.get(wk) ?? { total: 0, noShow: 0, cancelled: 0 };
    wkBucket.total += 1;
    if (a.status === 'NO_SHOW') wkBucket.noShow += 1;
    if (a.status === 'CANCELLED') wkBucket.cancelled += 1;
    weekMap.set(wk, wkBucket);

    if (a.status === 'COMPLETED') completed += 1;
    if (a.status === 'NO_SHOW') noShow += 1;
    if (a.status === 'CANCELLED') cancelled += 1;

    if (a.bookedVia) {
      bookedViaBreakdown.set(a.bookedVia, (bookedViaBreakdown.get(a.bookedVia) ?? 0) + 1);
    }

    if (a.status !== 'CANCELLED' && a.status !== 'NO_SHOW') {
      const apptRev = a.items.reduce((s, i) => s + Math.round(Number(i.price) * 100), 0);
      revenueCents += apptRev;
      dayBucket.revenueCents += apptRev;

      for (const item of a.items) {
        const bucket = topSvc.get(item.service.name) ?? {
          count: 0,
          revenueCents: 0,
        };
        bucket.count += 1;
        bucket.revenueCents += Math.round(Number(item.price) * 100);
        topSvc.set(item.service.name, bucket);
      }

      const staffName = `${a.staff.firstName} ${a.staff.lastName}`;
      const staffBucket = perStaffMap.get(a.staffId) ?? {
        id: a.staffId,
        name: staffName,
        color: a.staff.color,
        count: 0,
        revenueCents: 0,
      };
      staffBucket.count += 1;
      staffBucket.revenueCents += apptRev;
      perStaffMap.set(a.staffId, staffBucket);

      if (a.clientId && a.client) {
        const cliName = `${a.client.firstName} ${a.client.lastName}`;
        const cliBucket = topCliMap.get(a.clientId) ?? {
          name: cliName,
          visits: 0,
          revenueCents: 0,
        };
        cliBucket.visits += 1;
        cliBucket.revenueCents += apptRev;
        topCliMap.set(a.clientId, cliBucket);
      }
    }

    byDay.set(dayKey, dayBucket);
  }

  const topServices = Array.from(topSvc.entries())
    .map(([name, v]) => ({ name, count: v.count, revenueCents: v.revenueCents }))
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 5);
  const topClients = Array.from(topCliMap.values())
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 5);
  const perStaff = Array.from(perStaffMap.values()).sort((a, b) => b.revenueCents - a.revenueCents);

  const byWeek = fillWeekGaps(
    Array.from(weekMap.entries())
      .map(([weekStart, v]) => ({ weekStart, ...v }))
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
  );

  return {
    count: appts.length,
    revenueCents,
    completedCount: completed,
    noShowCount: noShow,
    cancelledCount: cancelled,
    bookedViaBreakdown,
    topServices,
    topClients,
    perStaff,
    byDay,
    byWeek,
  };
}

function fmtChf(cents: number): string {
  return (cents / 100).toLocaleString('de-CH', { minimumFractionDigits: 2 }) + ' CHF';
}

function trendFor(
  current: number,
  previous: number,
): { value: string; direction: 'up' | 'down' | 'flat' } | undefined {
  if (previous === 0) {
    return current === 0 ? undefined : { value: 'neu', direction: 'up' };
  }
  const diff = current - previous;
  const pct = Math.round((diff / previous) * 100);
  if (pct === 0) return undefined;
  return {
    value: `${Math.abs(pct)}%`,
    direction: pct > 0 ? 'up' : 'down',
  };
}

const channelLabels: Record<string, string> = {
  ONLINE_BRANDED: 'Online-Booking',
  STAFF_INTERNAL: 'Intern',
  PHONE_MANUAL: 'Telefon',
  WALK_IN: 'Walk-in',
  PHONE_AI: 'Phone-AI',
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}): Promise<React.JSX.Element> {
  const { period } = await searchParams;
  const periodKey: PeriodKey = ['today', '7d', '30d', '90d', '1y'].includes(period ?? '')
    ? (period as PeriodKey)
    : '30d';
  const range = periodRange(periodKey);
  const prevRange = previousRange(range);

  const [apptsCurrent, apptsPrev] = await Promise.all([
    loadAppointments(range),
    loadAppointments(prevRange),
  ]);
  const stats = computeStats(apptsCurrent);
  const prev = computeStats(apptsPrev);

  const daysSorted = Array.from(stats.byDay.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const maxDayRev = Math.max(1, ...daysSorted.map(([, v]) => v.revenueCents));
  const maxStaffRev = Math.max(1, ...stats.perStaff.map((s) => s.revenueCents));

  return (
    <div className="w-full p-4 md:p-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">Reports</p>
          <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
            {PERIODS[periodKey].label}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {range.from.toLocaleDateString('de-CH', {
              day: '2-digit',
              month: 'short',
            })}{' '}
            –{' '}
            {range.to.toLocaleDateString('de-CH', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
            {' · vs. '}
            {prevRange.from.toLocaleDateString('de-CH', {
              day: '2-digit',
              month: 'short',
            })}{' '}
            –{' '}
            {prevRange.to.toLocaleDateString('de-CH', {
              day: '2-digit',
              month: 'short',
            })}
          </p>
        </div>
        <a
          href={`/api/reports/export?period=${periodKey}`}
          download
          className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-text-secondary hover:bg-surface-raised"
        >
          ↓ CSV Export
        </a>
      </header>

      <div className="mb-6 inline-flex items-center rounded-md border border-border bg-surface p-1">
        {(Object.keys(PERIODS) as PeriodKey[]).map((k) => (
          <Link
            key={k}
            href={`/reports?period=${k}`}
            className={cn(
              'inline-flex min-h-[40px] items-center rounded-sm px-3 text-xs font-medium transition-colors',
              periodKey === k
                ? 'bg-brand text-brand-foreground'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {PERIODS[k].label}
          </Link>
        ))}
      </div>

      <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Termine" value={stats.count} trend={trendFor(stats.count, prev.count)} />
        <StatCard
          label="Umsatz"
          value={fmtChf(stats.revenueCents)}
          trend={trendFor(stats.revenueCents, prev.revenueCents)}
        />
        <StatCard
          label="Abgeschlossen"
          value={stats.completedCount}
          trend={trendFor(stats.completedCount, prev.completedCount)}
        />
        <StatCard
          label="No-Shows + Stornos"
          value={stats.noShowCount + stats.cancelledCount}
          sub={
            stats.count > 0
              ? `${Math.round(
                  ((stats.noShowCount + stats.cancelledCount) / stats.count) * 100,
                )}% der Termine`
              : undefined
          }
        />
      </section>

      {/* No-Show + Storno-Rate-Trend: nur anzeigen wenn >= 4 Wochen Daten. */}
      {stats.byWeek.length >= 4
        ? (() => {
            // Konsistent: Sparkline + Chips zeigen beide die gleichen letzten
            // 12 Wochen (oder weniger wenn Daten kürzer).
            const displayWeeks = stats.byWeek.slice(-12);
            const rates = displayWeeks.map((w) =>
              w.total > 0 ? Math.round(((w.noShow + w.cancelled) / w.total) * 100) : 0,
            );
            const overallRate = Math.round(
              ((stats.noShowCount + stats.cancelledCount) / Math.max(stats.count, 1)) * 100,
            );
            const latestRate = rates.at(-1) ?? 0;
            const priorAvg =
              rates.length > 1
                ? rates.slice(0, -1).reduce((s, r) => s + r, 0) / (rates.length - 1)
                : 0;
            const trending = latestRate - priorAvg;
            const tone: 'accent' | 'warning' =
              latestRate >= 15 || trending >= 5 ? 'warning' : 'accent';
            const fixedMax = Math.max(30, Math.max(...rates));
            return (
              <Card className="mb-8">
                <CardBody>
                  <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                    <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                      No-Show + Storno-Rate · pro Woche
                    </h2>
                    <p className="text-[11px] text-text-muted">
                      {displayWeeks.length} Wochen · {overallRate}% Gesamt-Rate ·{' '}
                      <span
                        className={cn(
                          tone === 'warning' ? 'font-semibold text-warning' : 'text-text-secondary',
                        )}
                      >
                        aktuell {latestRate}%
                      </span>
                    </p>
                  </div>
                  <Sparkline
                    data={rates}
                    width={Math.min(480, displayWeeks.length * 36)}
                    height={56}
                    min={0}
                    max={fixedMax}
                    tone={tone}
                    ariaLabel={`No-Show- und Storno-Rate über ${displayWeeks.length} Wochen, aktuell ${latestRate}%, Ø zuvor ${Math.round(
                      priorAvg,
                    )}%`}
                  />
                  <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                    {displayWeeks.map((w, i) => {
                      const rate = rates[i] ?? 0;
                      const isEmpty = w.total === 0;
                      const kw = isoWeek(w.weekStart);
                      return (
                        <span
                          key={w.weekStart}
                          tabIndex={0}
                          className={cn(
                            'inline-flex min-w-[62px] flex-1 flex-col items-center gap-0.5 rounded px-1 py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-accent',
                            isEmpty
                              ? 'bg-surface/50 text-text-muted'
                              : rate >= 15
                                ? 'bg-warning/10 text-warning'
                                : 'bg-surface text-text-muted',
                          )}
                          title={
                            isEmpty
                              ? 'Keine Termine in dieser Woche'
                              : `${w.total} Termine · ${w.noShow} No-Show · ${w.cancelled} Storno`
                          }
                          aria-label={`KW ${kw}, ${isEmpty ? 'keine Termine' : `${rate} Prozent No-Show und Storno`}`}
                        >
                          <span className="tabular-nums font-medium">
                            {isEmpty ? '—' : `${rate}%`}
                          </span>
                          <span className="tabular-nums">KW {kw}</span>
                          <span className="tabular-nums text-[9px] opacity-70">
                            {new Date(`${w.weekStart}T12:00:00Z`).toLocaleDateString('de-CH', {
                              day: '2-digit',
                              month: '2-digit',
                            })}
                          </span>
                          {!isEmpty ? (
                            <span className="text-[9px] opacity-70">
                              {w.total}T · {w.noShow + w.cancelled} aus
                            </span>
                          ) : null}
                        </span>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>
            );
          })()
        : null}

      {/* Umsatz pro Tag */}
      <Card className="mb-8">
        <CardBody>
          <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
            Umsatz pro Tag
          </h2>
          {daysSorted.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">
              Keine Termine in diesem Zeitraum.
            </p>
          ) : (
            <div className="space-y-1.5">
              {daysSorted.map(([day, v]) => (
                <div key={day} className="flex items-center gap-3 text-xs">
                  <span className="w-20 tabular-nums text-text-muted">
                    {new Date(day).toLocaleDateString('de-CH', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                  <div className="flex-1 overflow-hidden rounded-full bg-surface-raised">
                    <div
                      className="h-4 rounded-full bg-gradient-to-r from-accent to-accent/80"
                      style={{
                        width: `${Math.max(2, (v.revenueCents / maxDayRev) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="w-28 text-right tabular-nums font-medium text-text-primary">
                    {fmtChf(v.revenueCents)}
                  </span>
                  <span className="w-10 text-right text-text-muted">{v.count} T.</span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Per-Staff */}
      <Card className="mb-8">
        <CardBody>
          <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
            Pro Mitarbeiterin
          </h2>
          {stats.perStaff.length === 0 ? (
            <p className="py-4 text-sm text-text-muted">Keine Daten.</p>
          ) : (
            <div className="space-y-2">
              {stats.perStaff.map((s) => (
                <div key={s.id} className="flex items-center gap-3 text-xs">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: s.color ?? 'hsl(var(--border-strong))',
                    }}
                  />
                  <span className="w-36 truncate font-medium text-text-primary">{s.name}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-surface-raised">
                    <div
                      className="h-4 rounded-full"
                      style={{
                        width: `${Math.max(2, (s.revenueCents / maxStaffRev) * 100)}%`,
                        backgroundColor: s.color ?? 'hsl(var(--brand-accent))',
                      }}
                    />
                  </div>
                  <span className="w-28 text-right tabular-nums font-medium text-text-primary">
                    {fmtChf(s.revenueCents)}
                  </span>
                  <span className="w-14 text-right text-text-muted tabular-nums">{s.count} T.</span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardBody>
            <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              Top Services
            </h2>
            {stats.topServices.length === 0 ? (
              <p className="py-4 text-sm text-text-muted">Keine Daten.</p>
            ) : (
              <ul className="space-y-2.5 text-sm">
                {stats.topServices.map((s) => (
                  <li key={s.name} className="flex items-baseline justify-between">
                    <span className="truncate text-text-primary">{s.name}</span>
                    <span className="text-right">
                      <span className="tabular-nums font-medium text-text-primary">
                        {fmtChf(s.revenueCents)}
                      </span>
                      <span className="ml-2 text-xs text-text-muted">· {s.count}×</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              Top Kundinnen
            </h2>
            {stats.topClients.length === 0 ? (
              <p className="py-4 text-sm text-text-muted">Keine Daten.</p>
            ) : (
              <ul className="space-y-2.5 text-sm">
                {stats.topClients.map((c) => (
                  <li key={c.name} className="flex items-baseline justify-between">
                    <span className="truncate text-text-primary">{c.name}</span>
                    <span className="text-right">
                      <span className="tabular-nums font-medium text-text-primary">
                        {fmtChf(c.revenueCents)}
                      </span>
                      <span className="ml-2 text-xs text-text-muted">· {c.visits}×</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card className="md:col-span-2">
          <CardBody>
            <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              Buchungskanäle
            </h2>
            {stats.bookedViaBreakdown.size === 0 ? (
              <p className="py-4 text-sm text-text-muted">Keine Daten.</p>
            ) : (
              <ul className="space-y-2.5 text-sm">
                {Array.from(stats.bookedViaBreakdown.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([channel, count]) => (
                    <li key={channel} className="flex items-baseline justify-between">
                      <span className="text-text-primary">{channelLabels[channel] ?? channel}</span>
                      <span className="tabular-nums font-medium text-text-primary">{count}</span>
                    </li>
                  ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
