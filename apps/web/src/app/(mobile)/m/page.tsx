import Link from 'next/link';
import { Avatar, Badge, PriceDisplay } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface Appt {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  client: { firstName: string; lastName: string } | null;
  staff: { firstName: string; lastName: string; color: string | null };
  items: Array<{ service: { name: string }; price: string }>;
}

async function loadToday(): Promise<Appt[]> {
  const ctx = getCurrentTenant();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
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

const statusTone: Record<
  string,
  'neutral' | 'success' | 'info' | 'warning' | 'danger' | 'accent'
> = {
  BOOKED: 'info',
  CONFIRMED: 'success',
  CHECKED_IN: 'warning',
  IN_SERVICE: 'accent',
  COMPLETED: 'neutral',
  CANCELLED: 'danger',
  NO_SHOW: 'danger',
  WAITLIST: 'neutral',
};

const statusShort: Record<string, string> = {
  BOOKED: 'Gebucht',
  CONFIRMED: 'OK',
  CHECKED_IN: 'Da',
  IN_SERVICE: 'Läuft',
  COMPLETED: 'Fertig',
  CANCELLED: 'Storno',
  NO_SHOW: 'No-Show',
  WAITLIST: 'Warte',
};

export default async function MobileToday(): Promise<React.JSX.Element> {
  const appts = await loadToday();
  const now = new Date();
  const active = appts.filter(
    (a) => a.status !== 'CANCELLED' && a.status !== 'NO_SHOW',
  );
  const upcoming = active.filter((a) => new Date(a.startAt) >= now);
  const done = active.filter((a) => a.status === 'COMPLETED');
  const revenueCents = active.reduce(
    (s, a) => s + a.items.reduce((x, i) => x + Math.round(Number(i.price) * 100), 0),
    0,
  );

  return (
    <div>
      <header className="px-5 pt-8 pb-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-muted">
          Heute
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">
          {now.toLocaleDateString('de-CH', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
          })}
        </h1>
      </header>

      <section className="mx-5 mb-4 grid grid-cols-3 gap-2">
        <Stat label="Termine" value={active.length} />
        <Stat label="Fertig" value={done.length} />
        <Stat label="Umsatz" value={`${Math.round(revenueCents / 100)}`} unit="CHF" />
      </section>

      {upcoming.length === 0 ? (
        <div className="mx-5 mt-6 rounded-lg border border-border bg-surface p-6 text-center">
          <div className="text-4xl">☕</div>
          <p className="mt-2 text-sm font-medium">Keine weiteren Termine</p>
          <p className="mt-1 text-xs text-text-muted">
            Zeit für eine Pause — oder Walk-in willkommen.
          </p>
        </div>
      ) : (
        <section className="px-5">
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Nächste {upcoming.length}
          </h2>
          <ul className="space-y-2">
            {upcoming.map((a) => {
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
                    <div
                      className="h-12 w-1 rounded-full shrink-0"
                      style={{
                        backgroundColor: a.staff.color ?? 'hsl(var(--border-strong))',
                      }}
                    />
                    <Avatar name={name} size="md" color="hsl(var(--brand-accent))" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium truncate">{name}</span>
                        <span className="text-xs tabular-nums text-text-muted shrink-0">
                          {new Date(a.startAt).toLocaleTimeString('de-CH', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="text-xs text-text-muted truncate">
                        {service}
                      </div>
                    </div>
                    <Badge tone={statusTone[a.status] ?? 'neutral'}>
                      {statusShort[a.status] ?? a.status}
                    </Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | string;
  unit?: string;
}): React.JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-3 text-center">
      <div className="text-[9px] font-medium uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      {unit ? (
        <div className="text-[9px] font-medium text-text-muted">{unit}</div>
      ) : null}
    </div>
  );
}
