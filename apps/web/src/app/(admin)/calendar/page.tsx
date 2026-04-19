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
}

function dayRange(dateIso: string): { from: string; to: string } {
  // Der Tag in Europe/Zurich beginnt um 00:00 und endet 23:59:59.
  // Für MVP nehmen wir den UTC-Offset des lokalen `Date` her — solange
  // der Browser in CH läuft, passt das. Phase 2: serverseitig via
  // Intl.DateTimeFormat + timezone.
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
        </div>
        <form method="get" className="flex items-center gap-2">
          <input
            type="date"
            name="date"
            defaultValue={day}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Anzeigen
          </button>
        </form>
      </header>

      <section className="rounded-xl border border-neutral-200">
        {appts.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-neutral-500">
              Heute keine Termine. Neue Termine legst du via API an (UI folgt in
              Woche 5).
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {appts.map((a) => (
              <li key={a.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                <span className="w-28 tabular-nums text-neutral-500">
                  {new Date(a.startAt).toLocaleTimeString('de-CH', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {' – '}
                  {new Date(a.endAt).toLocaleTimeString('de-CH', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="flex-1">
                  {a.clientId ? `Kundin ${a.clientId.slice(0, 8)}` : 'Blockzeit'}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(a.status)}`}
                >
                  {a.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function statusColor(status: string): string {
  switch (status) {
    case 'BOOKED':
      return 'bg-blue-100 text-blue-800';
    case 'CONFIRMED':
      return 'bg-emerald-100 text-emerald-800';
    case 'CHECKED_IN':
      return 'bg-amber-100 text-amber-800';
    case 'IN_SERVICE':
      return 'bg-purple-100 text-purple-800';
    case 'COMPLETED':
      return 'bg-neutral-100 text-neutral-700';
    case 'CANCELLED':
    case 'NO_SHOW':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-neutral-100 text-neutral-700';
  }
}
