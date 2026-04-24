import Link from 'next/link';
import { Avatar, Badge } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface Appt {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  client: {
    firstName: string;
    lastName: string;
    noShowRisk?: string | number | null;
    lifetimeValue?: string | number | null;
  } | null;
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

interface Birthday {
  id: string;
  firstName: string;
  lastName: string;
}

async function loadBirthdays(): Promise<Birthday[]> {
  const ctx = getCurrentTenant();
  // MM-DD in Europe/Zurich — analog Admin-Dashboard-Heuristik.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const mm = parts.find((p) => p.type === 'month')?.value ?? '';
  const dd = parts.find((p) => p.type === 'day')?.value ?? '';
  const mmdd = `${mm}-${dd}`;
  try {
    const res = await apiFetch<{
      clients: Array<{
        id: string;
        firstName: string;
        lastName: string;
        birthday: string | null;
        blocked: boolean;
      }>;
    }>('/v1/clients?limit=5000', {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
    return res.clients
      .filter(
        (c) => !c.blocked && typeof c.birthday === 'string' && c.birthday.slice(5, 10) === mmdd,
      )
      .map((c) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName }));
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
  const [appts, birthdays] = await Promise.all([loadToday(), loadBirthdays()]);
  const now = new Date();
  const active = appts.filter((a) => a.status !== 'CANCELLED' && a.status !== 'NO_SHOW');
  const upcoming = active.filter((a) => new Date(a.startAt) >= now);
  const done = active.filter((a) => a.status === 'COMPLETED');
  const riskToConfirm = upcoming.filter((a) => {
    if (a.status !== 'BOOKED') return false;
    const risk = a.client?.noShowRisk != null ? Number(a.client.noShowRisk) : NaN;
    return Number.isFinite(risk) && risk >= 25;
  });
  const revenueCents = active.reduce(
    (s, a) => s + a.items.reduce((x, i) => x + Math.round(Number(i.price) * 100), 0),
    0,
  );

  return (
    <div>
      <header className="px-5 pt-8 pb-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-muted">Heute</p>
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

      {birthdays.length > 0 ? (
        <div className="mx-5 mb-4 rounded-lg border-l-4 border-l-accent bg-accent/5 px-4 py-3">
          <p className="text-xs font-semibold text-accent">
            🎂 Heute Geburtstag · {birthdays.length}{' '}
            {birthdays.length === 1 ? 'Kundin' : 'Kundinnen'}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="Geburtstage heute">
            {birthdays.slice(0, 6).map((b) => (
              <li key={b.id}>
                <Link
                  href={`/m/clients/${b.id}`}
                  className="inline-flex min-h-[44px] items-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-sm active:translate-y-0 active:scale-[0.98]"
                  aria-label={`${b.firstName} ${b.lastName} — heute Geburtstag`}
                >
                  {b.firstName} {b.lastName}
                </Link>
              </li>
            ))}
            {birthdays.length > 6 ? (
              <li className="self-center text-[11px] text-text-muted">+{birthdays.length - 6}</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {riskToConfirm.length > 0 ? (
        <a
          href="#upcoming"
          className="mx-5 mb-4 block rounded-lg border-l-4 border-l-warning bg-warning/5 px-4 py-3 active:scale-[0.99] transition-transform"
        >
          <p className="text-xs font-semibold text-warning">
            ⚠ {riskToConfirm.length} {riskToConfirm.length === 1 ? 'Termin' : 'Termine'} zu
            bestätigen
          </p>
          <p className="mt-0.5 text-[11px] text-text-secondary">
            Kurz anrufen — No-Show-Risiko &ge; 25%. Zur Liste ↓
          </p>
        </a>
      ) : null}

      {upcoming.length === 0 ? (
        <div className="mx-5 mt-6 rounded-lg border border-border bg-accent/5 p-8 text-center">
          <div
            aria-hidden
            className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-3xl"
          >
            ☕
          </div>
          <p className="font-display text-lg font-semibold text-text-primary">
            Keine weiteren Termine
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Zeit für eine Pause — oder Walk-in willkommen.
          </p>
        </div>
      ) : (
        <section id="upcoming" className="scroll-mt-4 px-5">
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Nächste {upcoming.length}
          </h2>
          <ul className="space-y-2">
            {upcoming.map((a) => {
              const name = a.client ? `${a.client.firstName} ${a.client.lastName}` : 'Blockzeit';
              const service = a.items.map((i) => i.service.name).join(', ') || '—';
              const isTerminal =
                a.status === 'CANCELLED' || a.status === 'NO_SHOW' || a.status === 'COMPLETED';
              const riskRaw = a.client?.noShowRisk != null ? Number(a.client.noShowRisk) : null;
              const riskTier: 'hoch' | 'mittel' | null =
                isTerminal || riskRaw == null || !Number.isFinite(riskRaw)
                  ? null
                  : riskRaw >= 40
                    ? 'hoch'
                    : riskRaw >= 25
                      ? 'mittel'
                      : null;
              const vip =
                !isTerminal &&
                a.client?.lifetimeValue != null &&
                Number(a.client.lifetimeValue) >= 2000;
              const a11y = [
                riskTier === 'hoch' ? 'hohes No-Show-Risiko' : null,
                riskTier === 'mittel' ? 'mittleres No-Show-Risiko' : null,
                vip ? 'VIP-Kundin' : null,
              ]
                .filter(Boolean)
                .join(', ');
              return (
                <li key={a.id}>
                  <Link
                    href={`/m/calendar/${a.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
                    aria-label={a11y ? `${name} — ${a11y}` : undefined}
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
                        <span className="flex min-w-0 items-center gap-1">
                          {riskTier === 'hoch' ? (
                            <span
                              className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-danger text-[10px] font-bold leading-none text-white"
                              aria-hidden="true"
                              title={`No-Show-Risiko ${Math.round(riskRaw!)}%`}
                            >
                              !
                            </span>
                          ) : riskTier === 'mittel' ? (
                            <span
                              className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-warning text-[10px] font-bold leading-none text-white"
                              aria-hidden="true"
                              title={`No-Show-Risiko ${Math.round(riskRaw!)}%`}
                            >
                              !
                            </span>
                          ) : null}
                          {vip ? (
                            <span
                              className="shrink-0 text-xs leading-none text-accent"
                              aria-hidden="true"
                              title="VIP (Lifetime >= 2000 CHF)"
                            >
                              ★
                            </span>
                          ) : null}
                          <span className="min-w-0 truncate font-medium">{name}</span>
                        </span>
                        <span className="text-xs tabular-nums text-text-muted shrink-0">
                          {new Date(a.startAt).toLocaleTimeString('de-CH', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="text-xs text-text-muted truncate">{service}</div>
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
      <div className="text-[9px] font-medium uppercase tracking-wider text-text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      {unit ? <div className="text-[9px] font-medium text-text-muted">{unit}</div> : null}
    </div>
  );
}
