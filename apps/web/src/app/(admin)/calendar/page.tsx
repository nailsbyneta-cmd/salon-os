import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { transitionAppointment, cancelAppointment } from './actions';

interface Appt {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  staffId: string;
  clientId: string | null;
  notes: string | null;
  client: { firstName: string; lastName: string } | null;
  staff: { firstName: string; lastName: string; color: string | null };
  items: Array<{ service: { name: string } }>;
}

function dayRange(dateIso: string): { from: string; to: string } {
  const d = new Date(dateIso);
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

async function loadAppointments(date: string): Promise<Appt[]> {
  const ctx = getCurrentTenant();
  const { from, to } = dayRange(date);
  try {
    const res = await apiFetch<{ appointments: Appt[] }>(
      `/v1/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role },
    );
    return res.appointments;
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 08 - 18
const ROW_HEIGHT = 60; // px per hour
const CAL_START = 8 * 60; // minutes from midnight

function minutesFromStart(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes() - CAL_START;
}

function durationMinutes(startIso: string, endIso: string): number {
  return (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}): Promise<React.JSX.Element> {
  const { date } = await searchParams;
  const day = date ?? todayIso();
  const appts = await loadAppointments(day);

  return (
    <div className="p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
            Kalender
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {new Date(day).toLocaleDateString('de-CH', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {appts.length} Termine · Studio 1, St. Gallen Winkeln
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form method="get" className="flex items-center gap-2">
            <input
              type="date"
              name="date"
              defaultValue={day}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Anzeigen
            </button>
          </form>
          <Link
            href={`/calendar/new?date=${day}`}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            + Neuer Termin
          </Link>
        </div>
      </header>

      <section className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <div className="relative grid grid-cols-[60px_1fr]">
          {/* Stunden-Spalte */}
          <div className="border-r border-neutral-200 bg-neutral-50">
            {HOURS.map((h) => (
              <div
                key={h}
                className="border-b border-neutral-100 px-2 py-1 text-right text-xs font-medium text-neutral-500"
                style={{ height: ROW_HEIGHT }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          {/* Termin-Spalte */}
          <div className="relative">
            {HOURS.map((h) => (
              <div
                key={h}
                className="border-b border-neutral-100"
                style={{ height: ROW_HEIGHT }}
              />
            ))}
            {appts.map((a) => {
              const offset = minutesFromStart(a.startAt);
              const dur = durationMinutes(a.startAt, a.endAt);
              if (offset < 0 || offset >= HOURS.length * 60) return null;
              const clientName = a.client
                ? `${a.client.firstName} ${a.client.lastName}`
                : 'Blockzeit';
              const serviceNames = a.items.map((i) => i.service.name).join(', ') || '—';
              const staffName = `${a.staff.firstName} ${a.staff.lastName[0]}.`;
              return (
                <Link
                  key={a.id}
                  href={`/calendar/${a.id}`}
                  className={`absolute left-1 right-2 block rounded-md border px-2 py-1 text-xs shadow-sm transition hover:shadow-md ${statusStyle(a.status)}`}
                  style={{
                    top: (offset / 60) * ROW_HEIGHT,
                    height: Math.max((dur / 60) * ROW_HEIGHT - 2, 24),
                    borderLeft: `4px solid ${a.staff.color ?? '#737373'}`,
                  }}
                >
                  <div className="font-medium truncate">{clientName}</div>
                  <div className="text-neutral-600 truncate">{serviceNames}</div>
                  <div className="text-[10px] text-neutral-500 truncate">
                    {new Date(a.startAt).toLocaleTimeString('de-CH', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    ·{' '}
                    {staffName}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {appts.length === 0 ? (
        <p className="mt-4 text-center text-sm text-neutral-400">
          Keine Termine heute.
        </p>
      ) : (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Termin-Details
          </h2>
          <div className="rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100">
            {appts.map((a) => (
              <ApptActions key={a.id} a={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ApptActions({ a }: { a: Appt }): React.JSX.Element {
  const clientName = a.client
    ? `${a.client.firstName} ${a.client.lastName}`
    : 'Blockzeit';
  const services = a.items.map((i) => i.service.name).join(', ') || '—';
  const start = new Date(a.startAt).toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const transition = transitionAppointment.bind(null, a.id);
  const cancel = cancelAppointment.bind(null, a.id);

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
      <span className="w-16 tabular-nums font-medium text-neutral-700">{start}</span>
      <div className="flex-1 min-w-[200px]">
        <Link href={`/calendar/${a.id}`} className="block hover:underline">
          <div className="font-medium">{clientName}</div>
          <div className="text-xs text-neutral-500">
            {services} · {a.staff.firstName} {a.staff.lastName[0]}.
          </div>
        </Link>
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle(a.status)}`}
      >
        {statusLabelShort(a.status)}
      </span>
      <div className="flex gap-1">
        {a.status === 'BOOKED' ? (
          <form action={transition.bind(null, 'confirm')}>
            <ActionBtn>Bestätigen</ActionBtn>
          </form>
        ) : null}
        {(a.status === 'BOOKED' || a.status === 'CONFIRMED') ? (
          <form action={transition.bind(null, 'check-in')}>
            <ActionBtn>Eingecheckt</ActionBtn>
          </form>
        ) : null}
        {a.status === 'CHECKED_IN' ? (
          <form action={transition.bind(null, 'start')}>
            <ActionBtn>Starten</ActionBtn>
          </form>
        ) : null}
        {a.status === 'IN_SERVICE' ? (
          <form action={transition.bind(null, 'complete')}>
            <ActionBtn primary>Abschliessen</ActionBtn>
          </form>
        ) : null}
        {a.status !== 'COMPLETED' && a.status !== 'CANCELLED' ? (
          <form action={cancel.bind(null, 'Auf Kundenwunsch')}>
            <ActionBtn danger>Stornieren</ActionBtn>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function ActionBtn({
  children,
  primary,
  danger,
}: {
  children: React.ReactNode;
  primary?: boolean;
  danger?: boolean;
}): React.JSX.Element {
  const base =
    'rounded-md px-3 py-1.5 text-xs font-medium transition hover:opacity-90 ';
  const variant = danger
    ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
    : primary
      ? 'bg-emerald-600 text-white'
      : 'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50';
  return (
    <button type="submit" className={base + variant}>
      {children}
    </button>
  );
}

function statusLabelShort(s: string): string {
  const m: Record<string, string> = {
    BOOKED: 'Gebucht',
    CONFIRMED: 'Bestätigt',
    CHECKED_IN: 'Eingecheckt',
    IN_SERVICE: 'Läuft',
    COMPLETED: 'Fertig',
    CANCELLED: 'Storniert',
    NO_SHOW: 'No-Show',
    WAITLIST: 'Warteliste',
  };
  return m[s] ?? s;
}

function statusStyle(status: string): string {
  switch (status) {
    case 'BOOKED':
      return 'bg-blue-50 text-blue-900 border-blue-200';
    case 'CONFIRMED':
      return 'bg-emerald-50 text-emerald-900 border-emerald-200';
    case 'CHECKED_IN':
      return 'bg-amber-50 text-amber-900 border-amber-200';
    case 'IN_SERVICE':
      return 'bg-purple-50 text-purple-900 border-purple-200';
    case 'COMPLETED':
      return 'bg-neutral-50 text-neutral-700 border-neutral-200';
    case 'CANCELLED':
    case 'NO_SHOW':
      return 'bg-red-50 text-red-900 border-red-200 opacity-70';
    default:
      return 'bg-neutral-50 text-neutral-700 border-neutral-200';
  }
}
