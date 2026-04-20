import Link from 'next/link';
import { Badge, Button, Card, CardBody, EmptyState } from '@salon-os/ui';
import { CalendarDnd, type DndAppt } from '@/components/calendar-dnd';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { transitionAppointment, cancelAppointment } from './actions';

type Status = DndAppt['status'];

interface Appt extends DndAppt {
  notes: string | null;
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

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}): Promise<React.JSX.Element> {
  const { date } = await searchParams;
  const day = date ?? todayIso();
  const appts = await loadAppointments(day);

  return (
    <div className="mx-auto max-w-6xl p-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
            Kalender
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            {new Date(day).toLocaleDateString('de-CH', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {appts.length} Termine · Studio 1, St. Gallen Winkeln · Ziehen zum Umbuchen
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form method="get" className="flex items-center gap-2">
            <input
              type="date"
              name="date"
              defaultValue={day}
              className="h-10 rounded-sm border border-border bg-surface px-3 text-sm text-text-primary focus:border-accent"
            />
            <Button type="submit" variant="secondary" size="md">
              Anzeigen
            </Button>
          </form>
          <Link href={`/calendar/new?date=${day}`}>
            <Button variant="primary" iconLeft={<span className="text-base leading-none">+</span>}>
              Neuer Termin
            </Button>
          </Link>
        </div>
      </header>

      <CalendarDnd appts={appts} day={day} />

      {appts.length === 0 ? (
        <Card className="mt-6">
          <EmptyState
            title="Heute frei"
            description="Keine Termine gebucht. Neue Kundin im Telefon? Lege direkt einen Termin an."
            action={
              <Link href={`/calendar/new?date=${day}`}>
                <Button variant="accent">+ Neuer Termin</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Termin-Details
          </h2>
          <Card>
            <CardBody className="p-0">
              <ul className="divide-y divide-border">
                {appts.map((a) => (
                  <ApptActions key={a.id} a={a} />
                ))}
              </ul>
            </CardBody>
          </Card>
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
    <li className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
      <span className="w-16 tabular-nums font-semibold text-text-primary">
        {start}
      </span>
      <div className="flex-1 min-w-[200px]">
        <Link href={`/calendar/${a.id}`} className="block hover:underline">
          <div className="font-medium text-text-primary">{clientName}</div>
          <div className="text-xs text-text-muted">
            {services} · {a.staff.firstName} {a.staff.lastName[0]}.
          </div>
        </Link>
      </div>
      <StatusBadge status={a.status} />
      <div className="flex gap-1.5">
        {a.status === 'BOOKED' ? (
          <form action={transition.bind(null, 'confirm')}>
            <Button type="submit" variant="secondary" size="sm">
              Bestätigen
            </Button>
          </form>
        ) : null}
        {(a.status === 'BOOKED' || a.status === 'CONFIRMED') ? (
          <form action={transition.bind(null, 'check-in')}>
            <Button type="submit" variant="secondary" size="sm">
              Eingecheckt
            </Button>
          </form>
        ) : null}
        {a.status === 'CHECKED_IN' ? (
          <form action={transition.bind(null, 'start')}>
            <Button type="submit" variant="secondary" size="sm">
              Starten
            </Button>
          </form>
        ) : null}
        {a.status === 'IN_SERVICE' ? (
          <form action={transition.bind(null, 'complete')}>
            <Button type="submit" variant="accent" size="sm">
              Abschliessen
            </Button>
          </form>
        ) : null}
        {a.status !== 'COMPLETED' && a.status !== 'CANCELLED' ? (
          <form action={cancel.bind(null, 'Auf Kundenwunsch')}>
            <Button type="submit" variant="danger" size="sm">
              Stornieren
            </Button>
          </form>
        ) : null}
      </div>
    </li>
  );
}

function StatusBadge({ status }: { status: Status }): React.JSX.Element {
  const labels: Record<Status, string> = {
    BOOKED: 'Gebucht',
    CONFIRMED: 'Bestätigt',
    CHECKED_IN: 'Eingecheckt',
    IN_SERVICE: 'Läuft',
    COMPLETED: 'Fertig',
    CANCELLED: 'Storniert',
    NO_SHOW: 'No-Show',
    WAITLIST: 'Warteliste',
  };
  const tones: Record<Status, 'neutral' | 'success' | 'info' | 'warning' | 'danger' | 'accent'> = {
    BOOKED: 'info',
    CONFIRMED: 'success',
    CHECKED_IN: 'warning',
    IN_SERVICE: 'accent',
    COMPLETED: 'neutral',
    CANCELLED: 'danger',
    NO_SHOW: 'danger',
    WAITLIST: 'neutral',
  };
  return (
    <Badge tone={tones[status]} dot>
      {labels[status]}
    </Badge>
  );
}
