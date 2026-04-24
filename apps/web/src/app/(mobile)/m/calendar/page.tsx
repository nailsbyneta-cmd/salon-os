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
          <div className="mt-4 rounded-lg border border-border bg-accent/5 p-8 text-center">
            <div
              aria-hidden
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-2xl"
            >
              📅
            </div>
            <p className="font-display text-lg font-semibold text-text-primary">
              Keine Termine geplant
            </p>
            <p className="mt-1 text-sm text-text-secondary">Die nächsten 14 Tage sind frei.</p>
          </div>
        ) : (
          days.map(([dateKey, list]) => {
            const d = new Date(dateKey);
            const isToday = new Date().toDateString() === d.toDateString();
            return (
              <section key={dateKey}>
                <div className="sticky top-0 z-10 -mx-5 mb-2 border-b border-border bg-background/85 px-5 py-2.5 backdrop-blur">
                  <h2
                    className={[
                      'font-display text-sm font-semibold tracking-tight',
                      isToday ? 'text-accent' : 'text-text-secondary',
                    ].join(' ')}
                  >
                    {isToday ? (
                      <>
                        <span className="mr-2 text-[10px] uppercase tracking-[0.2em]">Heute</span>
                        <span className="font-normal text-text-muted">
                          {d.toLocaleDateString('de-CH', {
                            day: '2-digit',
                            month: 'long',
                          })}
                        </span>
                      </>
                    ) : (
                      d.toLocaleDateString('de-CH', {
                        weekday: 'long',
                        day: '2-digit',
                        month: 'long',
                      })
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
                          href={`/m/calendar/${a.id}`}
                          className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
                        >
                          <div className="w-14 shrink-0 text-center">
                            <div className="font-display text-base font-semibold tabular-nums text-text-primary">
                              {new Date(a.startAt).toLocaleTimeString('de-CH', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                            <div className="text-[10px] tabular-nums text-text-muted">
                              bis{' '}
                              {new Date(a.endAt).toLocaleTimeString('de-CH', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                          <div
                            className="h-12 w-1 shrink-0 rounded-full"
                            style={{
                              backgroundColor: a.staff.color ?? 'hsl(var(--border-strong))',
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium text-text-primary">{name}</div>
                            <div className="truncate text-xs text-text-secondary">{service}</div>
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
