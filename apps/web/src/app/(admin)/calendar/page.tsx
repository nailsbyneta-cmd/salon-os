import Link from 'next/link';
import { Badge, Button, Card, CardBody, EmptyState, cn } from '@salon-os/ui';
import { todayInZone } from '@salon-os/utils';
import { CalendarDnd, type DndAppt, type DndStaff } from '@/components/calendar-dnd';
import { CalendarDateJumper } from '@/components/calendar-date-jumper';
import { CalendarWeek } from '@/components/calendar-week';
import { CalendarMonth } from '@/components/calendar-month';
import { CalendarShortcuts } from '@/components/calendar-shortcuts';
import { JumpToNowButton } from '@/components/jump-to-now-button';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { transitionAppointment, cancelAppointment, markNoShow } from './actions';

type Status = DndAppt['status'];
type View = 'day' | 'week' | 'month';

interface Appt extends DndAppt {
  notes: string | null;
}

function dayRange(dateIso: string): { from: Date; to: Date } {
  const d = new Date(dateIso);
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { from: start, to: end };
}

function weekRange(dateIso: string): { from: Date; to: Date; weekStart: Date } {
  const d = new Date(dateIso);
  d.setHours(0, 0, 0, 0);
  // Woche startet Montag (ISO)
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() + diffToMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return { from: weekStart, to: weekEnd, weekStart };
}

async function loadAppointments(from: Date, to: Date): Promise<Appt[]> {
  const ctx = getCurrentTenant();
  try {
    const res = await apiFetch<{ appointments: Appt[] }>(
      `/v1/appointments?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
      { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role },
    );
    return res.appointments;
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}

async function loadStaff(): Promise<DndStaff[]> {
  const ctx = getCurrentTenant();
  try {
    const res = await apiFetch<{
      staff: Array<{
        id: string;
        firstName: string;
        lastName: string;
        color: string | null;
        active: boolean;
      }>;
    }>('/v1/staff', {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
    return res.staff
      .filter((s) => s.active !== false)
      .map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        color: s.color,
      }));
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekNumber(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / 604800000);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}): Promise<React.JSX.Element> {
  const { date, view: viewParam } = await searchParams;
  const view: View = viewParam === 'week' ? 'week' : viewParam === 'month' ? 'month' : 'day';
  const day = date ?? todayInZone();

  let from: Date;
  let to: Date;
  let weekStart: Date | null = null;
  let monthAnchor: Date | null = null;
  if (view === 'week') {
    const r = weekRange(day);
    from = r.from;
    to = r.to;
    weekStart = r.weekStart;
  } else if (view === 'month') {
    monthAnchor = new Date(day);
    monthAnchor.setHours(0, 0, 0, 0);
    // Grid reicht ggf. in Vor- und Folgemonat → wir laden einen Monat
    // gepuffert mit je 7 Tagen oben und unten.
    const monthStart = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
    const monthEnd = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0);
    from = new Date(monthStart);
    from.setDate(from.getDate() - 7);
    from.setHours(0, 0, 0, 0);
    to = new Date(monthEnd);
    to.setDate(to.getDate() + 7);
    to.setHours(23, 59, 59, 999);
  } else {
    const r = dayRange(day);
    from = r.from;
    to = r.to;
  }
  const [appts, staff] = await Promise.all([
    loadAppointments(from, to),
    view === 'day' || view === 'week' ? loadStaff() : Promise.resolve([] as DndStaff[]),
  ]);

  const title =
    view === 'month' && monthAnchor
      ? monthAnchor.toLocaleDateString('de-CH', {
          month: 'long',
          year: 'numeric',
        })
      : view === 'week' && weekStart
        ? `KW ${weekNumber(weekStart)} · ${weekStart.toLocaleDateString('de-CH', { day: '2-digit', month: 'short' })} – ${new Date(weekStart.getTime() + 6 * 86_400_000).toLocaleDateString('de-CH', { day: '2-digit', month: 'short', year: 'numeric' })}`
        : new Date(day).toLocaleDateString('de-CH', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          });

  const deltaDays = view === 'month' ? 0 : view === 'week' ? 7 : 1;
  let prevDate: string;
  let nextDate: string;
  if (view === 'month' && monthAnchor) {
    const prev = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1);
    const next = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1);
    prevDate = prev.toISOString().slice(0, 10);
    nextDate = next.toISOString().slice(0, 10);
  } else {
    prevDate = addDays(day, -deltaDays);
    nextDate = addDays(day, deltaDays);
  }

  return (
    <div className="w-full p-4 md:p-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">Kalender</p>
          <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
            {title}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {appts.length} Termine · Studio 1{view === 'day' ? ' · Ziehen zum Umbuchen' : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle current={view} day={day} />
          <div className="flex items-center gap-1">
            <Link href={`/calendar?view=${view}&date=${prevDate}`}>
              <Button variant="secondary" size="sm" aria-label="Vorherige">
                ←
              </Button>
            </Link>
            <Link href={`/calendar?view=${view}&date=${todayInZone()}`}>
              <Button variant="secondary" size="sm">
                Heute
              </Button>
            </Link>
            <Link href={`/calendar?view=${view}&date=${nextDate}`}>
              <Button variant="secondary" size="sm" aria-label="Nächste">
                →
              </Button>
            </Link>
            <JumpToNowButton />
          </div>
          <div className="hidden sm:block">
            <CalendarDateJumper currentDate={day} view={view} />
          </div>
          <Link href={`/calendar/new?date=${day}`}>
            <Button variant="primary" iconLeft={<span className="text-base leading-none">+</span>}>
              <span className="hidden sm:inline">Neuer Termin</span>
              <span className="sm:hidden">Neu</span>
            </Button>
          </Link>
        </div>
      </header>

      <CalendarShortcuts
        view={view}
        day={day}
        prevDate={prevDate}
        nextDate={nextDate}
        todayDate={todayInZone()}
      />

      {view === 'month' && monthAnchor ? (
        <CalendarMonth appts={appts} anchor={monthAnchor} />
      ) : view === 'week' && weekStart ? (
        <CalendarWeek appts={appts} weekStart={weekStart} staff={staff} />
      ) : (
        <CalendarDnd appts={appts} day={day} staff={staff} />
      )}

      {view === 'day' && appts.length === 0 ? (
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
      ) : null}

      {view === 'day' && appts.length > 0 ? (
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
      ) : null}
    </div>
  );
}

function ViewToggle({ current, day }: { current: View; day: string }): React.JSX.Element {
  const opts: Array<{ id: View; label: string }> = [
    { id: 'day', label: 'Tag' },
    { id: 'week', label: 'Woche' },
    { id: 'month', label: 'Monat' },
  ];
  return (
    <div className="inline-flex items-center rounded-md border border-border bg-surface p-1">
      {opts.map((o) => (
        <Link
          key={o.id}
          href={`/calendar?view=${o.id}&date=${day}`}
          className={cn(
            'inline-flex min-h-[40px] items-center rounded-sm px-3 text-xs font-medium transition-colors',
            current === o.id
              ? 'bg-brand text-brand-foreground'
              : 'text-text-secondary hover:text-text-primary',
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

function ApptActions({ a }: { a: Appt }): React.JSX.Element {
  const clientName = a.client ? `${a.client.firstName} ${a.client.lastName}` : 'Blockzeit';
  const services = a.items.map((i) => i.service.name).join(', ') || '—';
  const start = new Date(a.startAt).toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const transition = transitionAppointment.bind(null, a.id);
  const cancel = cancelAppointment.bind(null, a.id);
  const noShow = markNoShow.bind(null, a.id);
  // „Nicht da" ist erst sinnvoll wenn der Service-Slot zu Ende ist — laufende
  // Behandlungen von langen Services (Balayage 4h) dürfen nicht vorzeitig
  // als no-show flaggbar sein. Plus 10 Min Karenz.
  const noShowEligible =
    Date.now() - new Date(a.endAt).getTime() > 10 * 60_000 &&
    (a.status === 'BOOKED' || a.status === 'CONFIRMED' || a.status === 'CHECKED_IN');

  // Risiko-Stufen analog ClientBrief: mittel 25-39 (amber), hoch >=40 (rot).
  // Terminale Status (CANCELLED, NO_SHOW, COMPLETED) zeigen kein Badge.
  const riskRaw = a.client?.noShowRisk != null ? Number(a.client.noShowRisk) : null;
  const isTerminal = a.status === 'CANCELLED' || a.status === 'NO_SHOW' || a.status === 'COMPLETED';
  const riskTier: 'hoch' | 'mittel' | null =
    isTerminal || riskRaw == null || !Number.isFinite(riskRaw)
      ? null
      : riskRaw >= 40
        ? 'hoch'
        : riskRaw >= 25
          ? 'mittel'
          : null;
  const vip = a.client?.lifetimeValue != null && Number(a.client.lifetimeValue) >= 2000;

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
      <span className="w-16 tabular-nums font-semibold text-text-primary">{start}</span>
      <div className="min-w-0 flex-1">
        <Link
          href={`/calendar/${a.id}`}
          className="block hover:underline"
          aria-label={[
            clientName,
            riskTier === 'hoch' ? 'hohes No-Show-Risiko' : null,
            riskTier === 'mittel' ? 'mittleres No-Show-Risiko' : null,
            vip ? 'VIP-Kundin' : null,
          ]
            .filter(Boolean)
            .join(' — ')}
        >
          <div className="flex min-w-0 items-center gap-1.5 font-medium text-text-primary">
            {riskTier === 'hoch' ? (
              <span
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-danger text-[10px] font-bold leading-none text-white"
                title={`No-Show-Risiko ${Math.round(Number(a.client?.noShowRisk))}%`}
                aria-hidden="true"
              >
                !
              </span>
            ) : riskTier === 'mittel' ? (
              <span
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-warning text-[10px] font-bold leading-none text-white"
                title={`No-Show-Risiko ${Math.round(Number(a.client?.noShowRisk))}%`}
                aria-hidden="true"
              >
                !
              </span>
            ) : null}
            {vip ? (
              <span
                className="shrink-0 text-xs leading-none text-accent"
                title="VIP (Lifetime &gt;= 2000 CHF)"
                aria-hidden="true"
              >
                ★
              </span>
            ) : null}
            <span className="min-w-0 truncate">{clientName}</span>
          </div>
          <div className="truncate text-xs text-text-muted">
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
        {a.status === 'BOOKED' || a.status === 'CONFIRMED' ? (
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
          <Link href={`/pos/${a.id}`}>
            <Button variant="accent" size="sm">
              Kassieren →
            </Button>
          </Link>
        ) : null}
        {noShowEligible ? (
          <form action={noShow}>
            <Button type="submit" variant="danger" size="sm">
              Nicht da
            </Button>
          </form>
        ) : null}
        {a.status !== 'COMPLETED' && a.status !== 'CANCELLED' && a.status !== 'NO_SHOW' ? (
          <form action={cancel.bind(null, 'Auf Kundenwunsch')}>
            <Button type="submit" variant="ghost" size="sm">
              Storno
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
