import Link from 'next/link';
import { Badge } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface Appt {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  client: { firstName: string; lastName: string } | null;
  staff: { firstName: string; lastName: string; color: string | null };
  items: Array<{ service: { name: string } }>;
}

async function load(days: number): Promise<Appt[]> {
  const ctx = getCurrentTenant();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setDate(end.getDate() + days);
  end.setHours(23, 59, 59, 999);
  try {
    const res = await apiFetch<{ appointments: Appt[] }>(
      `/v1/appointments?from=${start.toISOString()}&to=${end.toISOString()}`,
      { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role },
    );
    return res.appointments;
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}

const statusTone: Record<string, 'neutral' | 'success' | 'info' | 'warning' | 'danger' | 'accent'> =
  {
    BOOKED: 'info',
    CONFIRMED: 'success',
    CHECKED_IN: 'warning',
    IN_SERVICE: 'accent',
    COMPLETED: 'neutral',
    CANCELLED: 'danger',
    NO_SHOW: 'danger',
  };

export default async function MobileCalendar(): Promise<React.JSX.Element> {
  const appts = await load(14);

  const byDate = new Map<string, Appt[]>();
  for (const a of appts) {
    const key = a.startAt.slice(0, 10);
    const bucket = byDate.get(key) ?? [];
    bucket.push(a);
    byDate.set(key, bucket);
  }
  const days = Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div>
      <header className="px-5 pt-8 pb-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-muted">
          Kalender
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">Nächste 14 Tage</h1>
      </header>

      <div className="space-y-5 px-5 pb-5">
        {days.length === 0 ? (
          <div className="mt-4 rounded-lg border border-border bg-surface p-6 text-center text-sm text-text-muted">
            Keine Termine in den nächsten 14 Tagen.
          </div>
        ) : (
          days.map(([dateKey, list]) => {
            const d = new Date(dateKey);
            const isToday = new Date().toDateString() === d.toDateString();
            return (
              <section key={dateKey}>
                <div className="sticky top-0 z-10 -mx-5 mb-2 border-b border-border bg-background/80 px-5 py-2 backdrop-blur">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider">
                    {isToday ? (
                      <span className="text-accent">Heute</span>
                    ) : (
                      <span className="text-text-muted">
                        {d.toLocaleDateString('de-CH', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    )}
                  </h2>
                </div>
                <ul className="space-y-2">
                  {list.map((a) => {
                    const name = a.client
                      ? `${a.client.firstName} ${a.client.lastName}`
                      : 'Blockzeit';
                    const service = a.items.map((i) => i.service.name).join(', ') || '—';
                    return (
                      <li key={a.id}>
                        <Link
                          href={`/calendar/${a.id}`}
                          className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 active:scale-[0.99] transition-transform"
                        >
                          <div className="w-14 shrink-0 text-center">
                            <div className="text-sm font-bold tabular-nums">
                              {new Date(a.startAt).toLocaleTimeString('de-CH', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                            <div className="text-[9px] text-text-muted tabular-nums">
                              {new Date(a.endAt).toLocaleTimeString('de-CH', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                          <div
                            className="h-10 w-1 rounded-full shrink-0"
                            style={{
                              backgroundColor: a.staff.color ?? 'hsl(var(--border-strong))',
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-medium">{name}</div>
                            <div className="truncate text-xs text-text-muted">{service}</div>
                          </div>
                          <Badge tone={statusTone[a.status] ?? 'neutral'} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
