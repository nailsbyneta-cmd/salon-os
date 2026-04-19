import Link from 'next/link';
import { AppointmentCard, Badge, Button, Card, CardBody, EmptyState } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { transitionAppointment, cancelAppointment } from './actions';

interface Appt {
  id: string;
  startAt: string;
  endAt: string;
  status:
    | 'BOOKED'
    | 'CONFIRMED'
    | 'CHECKED_IN'
    | 'IN_SERVICE'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'NO_SHOW'
    | 'WAITLIST';
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

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8);
const ROW_HEIGHT = 72;
const CAL_START = 8 * 60;

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
            {appts.length} Termine · Studio 1, St. Gallen Winkeln
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

      <Card className="overflow-hidden">
        <div className="relative grid grid-cols-[72px_1fr]">
          <div className="border-r border-border bg-background/50">
            {HOURS.map((h) => (
              <div
                key={h}
                className="border-b border-border/60 px-3 pt-1 text-right text-[10px] font-medium text-text-muted tabular-nums"
                style={{ height: ROW_HEIGHT }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          <div className="relative">
            {HOURS.map((h) => (
              <div
                key={h}
                className="border-b border-border/60"
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
              const services = a.items.map((i) => i.service.name).join(', ') || '—';
              const staff = `${a.staff.firstName} ${a.staff.lastName[0]}.`;
              const timeLabel = new Date(a.startAt).toLocaleTimeString('de-CH', {
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <div
                  key={a.id}
                  className="absolute left-1.5 right-2"
                  style={{
                    top: (offset / 60) * ROW_HEIGHT + 2,
                    height: Math.max((dur / 60) * ROW_HEIGHT - 4, 28),
                  }}
                >
                  <Link href={`/calendar/${a.id}`} className="block h-full">
                    <AppointmentCard
                      clientName={clientName}
                      serviceLabel={services}
                      staffLabel={staff}
                      timeLabel={timeLabel}
                      status={a.status}
                      staffColor={a.staff.color}
                      compact={dur < 45}
                      className="h-full"
                    />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {appts.length === 0 ? (
        <Card className="mt-6">
          <EmptyState
            title="Heute frei"
            description="Keine Termine gebucht. Neue Kundin eingetragen? Lege sofort einen Termin an."
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

function StatusBadge({ status }: { status: Appt['status'] }): React.JSX.Element {
  const labels: Record<Appt['status'], string> = {
    BOOKED: 'Gebucht',
    CONFIRMED: 'Bestätigt',
    CHECKED_IN: 'Eingecheckt',
    IN_SERVICE: 'Läuft',
    COMPLETED: 'Fertig',
    CANCELLED: 'Storniert',
    NO_SHOW: 'No-Show',
    WAITLIST: 'Warteliste',
  };
  const tones: Record<Appt['status'], 'neutral' | 'success' | 'info' | 'warning' | 'danger' | 'accent'> = {
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
