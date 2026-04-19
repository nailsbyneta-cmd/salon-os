import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface Appt {
  id: string;
  startAt: string;
  status: string;
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
  byDay: Map<string, { count: number; revenueCents: number }>;
}

async function loadAppointments(range: { from: Date; to: Date }): Promise<Appt[]> {
  const ctx = getCurrentTenant();
  try {
    const res = await apiFetch<{ appointments: Array<Appt & { bookedVia: string }> }>(
      `/v1/appointments?from=${range.from.toISOString()}&to=${range.to.toISOString()}`,
      { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role },
    );
    return res.appointments;
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}

function computeStats(appts: Array<Appt & { bookedVia?: string }>): PeriodStats {
  const byDay = new Map<string, { count: number; revenueCents: number }>();
  const topMap = new Map<string, { count: number; revenueCents: number }>();
  const bookedViaBreakdown = new Map<string, number>();

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
      bookedViaBreakdown.set(a.bookedVia, (bookedViaBreakdown.get(a.bookedVia) ?? 0) + 1);
    }

    if (a.status !== 'CANCELLED' && a.status !== 'NO_SHOW') {
      const apptRev = a.items.reduce(
        (s, i) => s + Math.round(Number(i.price) * 100),
        0,
      );
      revenueCents += apptRev;
      dayBucket.revenueCents += apptRev;

      for (const item of a.items) {
        const bucket = topMap.get(item.service.name) ?? {
          count: 0,
          revenueCents: 0,
        };
        bucket.count += 1;
        bucket.revenueCents += Math.round(Number(item.price) * 100);
        topMap.set(item.service.name, bucket);
      }
    }

    byDay.set(dayKey, dayBucket);
  }

  const topServices = Array.from(topMap.entries())
    .map(([name, v]) => ({ name, count: v.count, revenueCents: v.revenueCents }))
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 5);

  return {
    count: appts.length,
    revenueCents,
    completedCount: completed,
    noShowCount: noShow,
    cancelledCount: cancelled,
    bookedViaBreakdown,
    topServices,
    byDay,
  };
}

function fmtChf(cents: number): string {
  return (cents / 100).toLocaleString('de-CH', { minimumFractionDigits: 2 }) + ' CHF';
}

const channelLabels: Record<string, string> = {
  ONLINE_BRANDED: 'Online-Booking',
  STAFF_INTERNAL: 'Intern',
  PHONE_MANUAL: 'Telefon',
  WALK_IN: 'Walk-in',
  PHONE_AI: 'Phone-AI',
};

export default async function ReportsPage(): Promise<React.JSX.Element> {
  // Letzte 30 Tage
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);

  const appts = await loadAppointments({ from, to });
  const stats = computeStats(appts);

  const daysSorted = Array.from(stats.byDay.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  const maxDayRev = Math.max(1, ...daysSorted.map(([, v]) => v.revenueCents));

  return (
    <div className="p-8 max-w-5xl">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
          Reports
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Letzte 30 Tage
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {from.toLocaleDateString('de-CH', { day: '2-digit', month: 'short' })}{' '}
          – {to.toLocaleDateString('de-CH', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Termine" value={stats.count} />
        <Stat label="Umsatz" value={fmtChf(stats.revenueCents)} />
        <Stat label="Abgeschlossen" value={stats.completedCount} />
        <Stat
          label="No-Shows + Stornos"
          value={stats.noShowCount + stats.cancelledCount}
          hint={
            stats.count > 0
              ? `${Math.round(((stats.noShowCount + stats.cancelledCount) / stats.count) * 100)}% der Termine`
              : undefined
          }
        />
      </section>

      <section className="mb-8 rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Umsatz pro Tag
        </h2>
        {daysSorted.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-500">
            Keine Termine in diesem Zeitraum.
          </p>
        ) : (
          <div className="space-y-1">
            {daysSorted.map(([day, v]) => (
              <div key={day} className="flex items-center gap-3 text-xs">
                <span className="w-20 tabular-nums text-neutral-500">
                  {new Date(day).toLocaleDateString('de-CH', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </span>
                <div className="flex-1 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-4 rounded-full bg-neutral-800"
                    style={{
                      width: `${Math.max(2, (v.revenueCents / maxDayRev) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-28 text-right tabular-nums font-medium text-neutral-700">
                  {fmtChf(v.revenueCents)}
                </span>
                <span className="w-10 text-right text-neutral-400">
                  {v.count} T.
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Top Services
          </h2>
          {stats.topServices.length === 0 ? (
            <p className="py-4 text-sm text-neutral-500">Keine Daten.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {stats.topServices.map((s) => (
                <li key={s.name} className="flex items-baseline justify-between">
                  <span>{s.name}</span>
                  <span className="text-right text-neutral-500">
                    <span className="tabular-nums font-medium text-neutral-900">
                      {fmtChf(s.revenueCents)}
                    </span>
                    <span className="ml-2 text-xs">· {s.count}×</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Buchungskanäle
          </h2>
          {stats.bookedViaBreakdown.size === 0 ? (
            <p className="py-4 text-sm text-neutral-500">Keine Daten.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {Array.from(stats.bookedViaBreakdown.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([channel, count]) => (
                  <li
                    key={channel}
                    className="flex items-baseline justify-between"
                  >
                    <span>{channelLabels[channel] ?? channel}</span>
                    <span className="tabular-nums font-medium">{count}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}): React.JSX.Element {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-[10px] text-neutral-400">{hint}</p> : null}
    </div>
  );
}
