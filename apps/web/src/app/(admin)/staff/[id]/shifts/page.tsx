import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar, Button, Card, CardBody, EmptyState, Input } from '@salon-os/ui';
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

  const byDate = new Map<string, Shift[]>();
  for (const s of shifts) {
    const dateKey = s.startAt.slice(0, 10);
    const bucket = byDate.get(dateKey) ?? [];
    bucket.push(s);
    byDate.set(dateKey, bucket);
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <Link
        href="/staff"
        className="text-xs text-text-muted transition-colors hover:text-text-primary"
      >
        ← Team
      </Link>

      <header className="mb-8 mt-4 flex items-center gap-4">
        <Avatar
          name={`${staff.firstName} ${staff.lastName}`}
          color={staff.color}
          size="lg"
        />
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
            Arbeitszeiten
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            {staff.firstName} {staff.lastName}
          </h1>
        </div>
      </header>

      <Card className="mb-8">
        <CardBody>
          <form action={add}>
            <p className="mb-4 text-sm font-medium text-text-primary">
              Neue Schicht hinzufügen
            </p>
            <div className="grid grid-cols-[1.2fr_1fr_1fr_auto] items-end gap-3">
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-text-secondary">Datum</span>
                <Input
                  type="date"
                  name="date"
                  defaultValue={todayIso()}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-text-secondary">Von</span>
                <Input
                  type="time"
                  name="startTime"
                  defaultValue="09:00"
                  step="1800"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-text-secondary">Bis</span>
                <Input
                  type="time"
                  name="endTime"
                  defaultValue="18:00"
                  step="1800"
                  required
                />
              </label>
              <Button type="submit" variant="primary">
                Hinzufügen
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {byDate.size === 0 ? (
        <Card>
          <EmptyState
            title="Noch keine Schichten"
            description="Füge Schichten hinzu, damit die Verfügbarkeit im Online-Booking sauber berechnet wird."
          />
        </Card>
      ) : (
        <section className="space-y-4">
          {Array.from(byDate.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([dateKey, list]) => (
              <Card key={dateKey}>
                <div className="border-b border-border px-5 py-3">
                  <span className="text-sm font-medium text-text-primary">
                    {new Date(dateKey).toLocaleDateString('de-CH', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <ul>
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
                        className="flex items-center justify-between border-b border-border px-5 py-3 text-sm last:border-0"
                      >
                        <span className="tabular-nums text-text-primary">
                          {start} – {end}
                        </span>
                        <form action={rm}>
                          <button
                            type="submit"
                            className="text-xs text-danger transition-colors hover:underline"
                          >
                            Entfernen
                          </button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ))}
        </section>
      )}
    </div>
  );
}
