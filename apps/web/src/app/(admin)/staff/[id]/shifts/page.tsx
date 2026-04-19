import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { createShift, deleteShift } from './actions';

interface StaffRow {
  id: string;
  firstName: string;
  lastName: string;
  color: string | null;
}

interface Shift {
  id: string;
  startAt: string;
  endAt: string;
}

async function load(staffId: string): Promise<{
  staff: StaffRow | null;
  shifts: Shift[];
}> {
  const ctx = getCurrentTenant();
  const auth = { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role };

  const from = new Date();
  from.setDate(from.getDate() - 7);
  const to = new Date();
  to.setDate(to.getDate() + 60);

  try {
    const [staff, shifts] = await Promise.all([
      apiFetch<StaffRow>(`/v1/staff/${staffId}`, auth),
      apiFetch<{ shifts: Shift[] }>(
        `/v1/shifts?from=${from.toISOString()}&to=${to.toISOString()}&staffId=${staffId}`,
        auth,
      ),
    ]);
    return { staff, shifts: shifts.shifts };
  } catch (err) {
    if (err instanceof ApiError) return { staff: null, shifts: [] };
    throw err;
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function StaffShiftsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const { staff, shifts } = await load(id);
  if (!staff) notFound();

  const add = createShift.bind(null, id);

  // Gruppiere Shifts nach Datum
  const byDate = new Map<string, Shift[]>();
  for (const s of shifts) {
    const dateKey = s.startAt.slice(0, 10);
    const bucket = byDate.get(dateKey) ?? [];
    bucket.push(s);
    byDate.set(dateKey, bucket);
  }

  return (
    <div className="p-8 max-w-4xl">
      <Link href="/staff" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Team
      </Link>

      <header className="mt-4 mb-8 flex items-center gap-3">
        <span
          className="inline-block h-4 w-4 rounded-full"
          style={{ backgroundColor: staff.color ?? '#737373' }}
        />
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
            Arbeitszeiten
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {staff.firstName} {staff.lastName}
          </h1>
        </div>
      </header>

      <form
        action={add}
        className="mb-8 rounded-xl border border-neutral-200 bg-white p-5"
      >
        <p className="mb-4 text-sm font-medium">Neue Schicht hinzufügen</p>
        <div className="grid grid-cols-4 gap-3 items-end">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-neutral-600">Datum</span>
            <input
              type="date"
              name="date"
              defaultValue={todayIso()}
              required
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-neutral-600">Von</span>
            <input
              type="time"
              name="startTime"
              defaultValue="09:00"
              step="1800"
              required
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-neutral-600">Bis</span>
            <input
              type="time"
              name="endTime"
              defaultValue="18:00"
              step="1800"
              required
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Hinzufügen
          </button>
        </div>
      </form>

      {byDate.size === 0 ? (
        <section className="rounded-xl border border-neutral-200 bg-white p-10 text-center">
          <p className="text-sm text-neutral-500">
            Noch keine Schichten. Füge welche hinzu um die Verfügbarkeit zu
            steuern.
          </p>
        </section>
      ) : (
        <section className="space-y-4">
          {Array.from(byDate.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([dateKey, list]) => (
              <div
                key={dateKey}
                className="rounded-xl border border-neutral-200 bg-white"
              >
                <div className="border-b border-neutral-100 px-5 py-3">
                  <span className="text-sm font-medium">
                    {new Date(dateKey).toLocaleDateString('de-CH', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <ul className="divide-y divide-neutral-100">
                  {list.map((s) => {
                    const start = new Date(s.startAt).toLocaleTimeString('de-CH', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const end = new Date(s.endAt).toLocaleTimeString('de-CH', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const rm = deleteShift.bind(null, id, s.id);
                    return (
                      <li
                        key={s.id}
                        className="flex items-center justify-between px-5 py-3 text-sm"
                      >
                        <span className="tabular-nums">
                          {start} – {end}
                        </span>
                        <form action={rm}>
                          <button
                            type="submit"
                            className="text-xs text-red-600 hover:underline"
                          >
                            Entfernen
                          </button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
        </section>
      )}
    </div>
  );
}
