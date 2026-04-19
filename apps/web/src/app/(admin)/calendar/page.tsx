import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

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
                <article
                  key={a.id}
                  className={`absolute left-1 right-2 rounded-md border px-2 py-1 text-xs shadow-sm ${statusStyle(a.status)}`}
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
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {appts.length === 0 ? (
        <p className="mt-4 text-center text-sm text-neutral-400">
          Keine Termine heute.
        </p>
      ) : null}
    </div>
  );
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
