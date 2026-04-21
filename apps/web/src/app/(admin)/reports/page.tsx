import Link from 'next/link';
import { Card, CardBody, Stat as StatCard, cn } from '@salon-os/ui';
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
}

type PeriodKey = 'today' | '7d' | '30d' | '90d' | '1y';

const PERIODS: Record<
  PeriodKey,
  { label: string; days: number }
> = {
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

function previousRange(current: {
  from: Date;
  to: Date;
  days: number;
}): { from: Date; to: Date } {
  const to = new Date(current.from);
  to.setMilliseconds(to.getMilliseconds() - 1);
  const from = new Date(to);
  from.setDate(from.getDate() - (current.days - 1));
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

async function loadAppointments(range: {
  from: Date;
  to: Date;
}): Promise<Appt[]> {
  const ctx = getCurrentTenant();
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
  const topCliMap = new Map<
    string,
    { name: string; visits: number; revenueCents: number }
  >();

  let completed = 0;
  let noShow = 0;
  let cancelled = 0;
  let revenueCents = 0;

  for (const a of appts) {
    const dayKey = a.startAt.slice(0, 10);
    const dayBucket = byDay.get(dayKey) ?? { count: 0, revenueCents: 0 };
    dayBucket.count += 1;

    if (a.status === 'COMPLETED') completed += 1;
    if (a.status === 'NO_SHOW') noShow += 1;
    if (a.status === 'CANCELLED') cancelled += 1;

    if (a.bookedVia) {
      bookedViaBreakdown.set(
        a.bookedVia,
        (bookedViaBreakdown.get(a.bookedVia) ?? 0) + 1,
      );
    }

    if (a.status !== 'CANCELLED' && a.status !== 'NO_SHOW') {
      const apptRev = a.items.reduce(
        (s, i) => s + Math.round(Number(i.price) * 100),
        0,
      );
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
  const perStaff = Array.from(perStaffMap.values()).sort(
    (a, b) => b.revenueCents - a.revenueCents,
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
  const periodKey: PeriodKey = (
    ['today', '7d', '30d', '90d', '1y'].includes(period ?? '')
      ? (period as PeriodKey)
      : '30d'
  );
  const range = periodRange(periodKey);
  const prevRange = previousRange(range);

  const [apptsCurrent, apptsPrev] = await Promise.all([
    loadAppointments(range),
    loadAppointments(prevRange),
  ]);
  const stats = computeStats(apptsCurrent);
  const prev = computeStats(apptsPrev);

  const daysSorted = Array.from(stats.byDay.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  const maxDayRev = Math.max(1, ...daysSorted.map(([, v]) => v.revenueCents));
  const maxStaffRev = Math.max(1, ...stats.perStaff.map((s) => s.revenueCents));

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
          Reports
        </p>
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
      </header>

      <div className="mb-6 inline-flex items-center rounded-md border border-border bg-surface p-0.5">
        {(Object.keys(PERIODS) as PeriodKey[]).map((k) => (
          <Link
            key={k}
            href={`/reports?period=${k}`}
            className={cn(
              'rounded-sm px-3 py-1.5 text-xs font-medium transition-colors',
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
        <StatCard
          label="Termine"
          value={stats.count}
          trend={trendFor(stats.count, prev.count)}
        />
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
                  ((stats.noShowCount + stats.cancelledCount) / stats.count) *
                    100,
                )}% der Termine`
              : undefined
          }
        />
      </section>

      {/* Umsatz pro Tag */}
      <Card className="mb-8">
        <CardBody>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
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
                  <span className="w-10 text-right text-text-muted">
                    {v.count} T.
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Per-Staff */}
      <Card className="mb-8">
        <CardBody>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
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
                      backgroundColor:
                        s.color ?? 'hsl(var(--border-strong))',
                    }}
                  />
                  <span className="w-36 truncate font-medium text-text-primary">
                    {s.name}
                  </span>
                  <div className="flex-1 overflow-hidden rounded-full bg-surface-raised">
                    <div
                      className="h-4 rounded-full"
                      style={{
                        width: `${Math.max(2, (s.revenueCents / maxStaffRev) * 100)}%`,
                        backgroundColor:
                          s.color ?? 'hsl(var(--brand-accent))',
                      }}
                    />
                  </div>
                  <span className="w-28 text-right tabular-nums font-medium text-text-primary">
                    {fmtChf(s.revenueCents)}
                  </span>
                  <span className="w-14 text-right text-text-muted tabular-nums">
                    {s.count} T.
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardBody>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
              Top Services
            </h2>
            {stats.topServices.length === 0 ? (
              <p className="py-4 text-sm text-text-muted">Keine Daten.</p>
            ) : (
              <ul className="space-y-2.5 text-sm">
                {stats.topServices.map((s) => (
                  <li
                    key={s.name}
                    className="flex items-baseline justify-between"
                  >
                    <span className="truncate text-text-primary">{s.name}</span>
                    <span className="text-right">
                      <span className="tabular-nums font-medium text-text-primary">
                        {fmtChf(s.revenueCents)}
                      </span>
                      <span className="ml-2 text-xs text-text-muted">
                        · {s.count}×
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
              Top Kundinnen
            </h2>
            {stats.topClients.length === 0 ? (
              <p className="py-4 text-sm text-text-muted">Keine Daten.</p>
            ) : (
              <ul className="space-y-2.5 text-sm">
                {stats.topClients.map((c) => (
                  <li
                    key={c.name}
                    className="flex items-baseline justify-between"
                  >
                    <span className="truncate text-text-primary">{c.name}</span>
                    <span className="text-right">
                      <span className="tabular-nums font-medium text-text-primary">
                        {fmtChf(c.revenueCents)}
                      </span>
                      <span className="ml-2 text-xs text-text-muted">
                        · {c.visits}×
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card className="md:col-span-2">
          <CardBody>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
              Buchungskanäle
            </h2>
            {stats.bookedViaBreakdown.size === 0 ? (
              <p className="py-4 text-sm text-text-muted">Keine Daten.</p>
            ) : (
              <ul className="space-y-2.5 text-sm">
                {Array.from(stats.bookedViaBreakdown.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([channel, count]) => (
                    <li
                      key={channel}
                      className="flex items-baseline justify-between"
                    >
                      <span className="text-text-primary">
                        {channelLabels[channel] ?? channel}
                      </span>
                      <span className="tabular-nums font-medium text-text-primary">
                        {count}
                      </span>
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
