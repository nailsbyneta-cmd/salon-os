import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar, Badge, Button, Card, CardBody } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import {
  cancelAppointment,
  markNoShow,
  transitionAppointment,
} from '../../../../(admin)/calendar/actions';

interface Appt {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  notes: string | null;
  internalNotes: string | null;
  depositAmount: string | null;
  depositPaid: boolean;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    phoneE164?: string | null;
  } | null;
  staff: { firstName: string; lastName: string; color: string | null };
  location: { name: string };
  items: Array<{
    id: string;
    price: string;
    duration: number;
    serviceId: string;
    service: { name: string };
  }>;
}

async function load(id: string): Promise<Appt | null> {
  const ctx = await getCurrentTenant();
  try {
    return await apiFetch<Appt>(`/v1/appointments/${id}`, {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
}

interface WaitlistMatch {
  id: string;
  notes: string | null;
  client: {
    firstName: string;
    lastName: string;
    phone: string | null;
    phoneE164?: string | null;
  };
  service: { name: string };
  staff: { firstName: string; lastName: string } | null;
}

async function loadWaitlistMatches(
  appt: Appt,
): Promise<{ entries: WaitlistMatch[]; total: number; tenantName: string | null }> {
  const ctx = await getCurrentTenant();
  // Slot-Range: 4h vor Start bis 4h nach End — Match-Window
  const slotStart = new Date(appt.startAt);
  slotStart.setHours(slotStart.getHours() - 4);
  const slotEnd = new Date(appt.endAt);
  slotEnd.setHours(slotEnd.getHours() + 4);
  const serviceIds = appt.items.map((i) => i.serviceId).join(',');
  if (!serviceIds) return { entries: [], total: 0, tenantName: null };
  try {
    const qs = new URLSearchParams({
      serviceIds,
      from: slotStart.toISOString(),
      to: slotEnd.toISOString(),
    });
    const [matches, tenantInfo] = await Promise.all([
      apiFetch<{ entries: WaitlistMatch[]; total: number }>(
        `/v1/waitlist/matches?${qs.toString()}`,
        { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role },
      ),
      apiFetch<{ name: string }>('/v1/salon/tenant', {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        role: ctx.role,
      }).catch(() => ({ name: '' })),
    ]);
    return { ...matches, tenantName: tenantInfo.name || null };
  } catch (err) {
    if (err instanceof ApiError) return { entries: [], total: 0, tenantName: null };
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
  };

const statusLabel: Record<string, string> = {
  BOOKED: 'Gebucht',
  CONFIRMED: 'Bestätigt',
  CHECKED_IN: 'Eingecheckt',
  IN_SERVICE: 'Läuft',
  COMPLETED: 'Abgeschlossen',
  CANCELLED: 'Storniert',
  NO_SHOW: 'Nicht erschienen',
};

/**
 * Mobile-Appointment-Detail — Single-Thumb-Reach, optimiert für das
 * Staff-Handy während des Tages. Schnelle Aktionen oben, Details
 * darunter, Gefahr-Aktionen (Stornieren/No-Show) ganz unten.
 */
export default async function MobileAppointmentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const appt = await load(id);
  if (!appt) notFound();

  const clientName = appt.client ? `${appt.client.firstName} ${appt.client.lastName}` : 'Blockzeit';
  const start = new Date(appt.startAt);
  const end = new Date(appt.endAt);
  const isTerminal =
    appt.status === 'CANCELLED' || appt.status === 'NO_SHOW' || appt.status === 'COMPLETED';
  const isFreed = appt.status === 'CANCELLED' || appt.status === 'NO_SHOW';
  const matchesData = isFreed
    ? await loadWaitlistMatches(appt)
    : { entries: [], total: 0, tenantName: null };
  const total = appt.items.reduce((sum, i) => sum + Number(i.price), 0);
  const telHref = appt.client?.phoneE164 ?? appt.client?.phone ?? null;
  const waDigits = appt.client?.phoneE164
    ? appt.client.phoneE164.replace(/^\+/, '')
    : appt.client?.phone
      ? appt.client.phone.replace(/[^+\d]/g, '').replace(/^\+/, '')
      : null;
  const hasPhone = telHref && waDigits && waDigits.length >= 7;

  return (
    <div className="pb-20">
      <header className="px-5 pt-8 pb-5">
        <Link
          href="/m/calendar"
          className="inline-flex text-xs text-text-muted transition-colors hover:text-text-primary"
        >
          ← Kalender
        </Link>
        <div className="mt-3 flex items-center gap-2">
          <Badge tone={statusTone[appt.status] ?? 'neutral'} dot>
            {statusLabel[appt.status] ?? appt.status}
          </Badge>
        </div>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-text-primary">
          {clientName}
        </h1>
        <p className="mt-1 font-display text-sm tabular-nums text-accent">
          {start.toLocaleDateString('de-CH', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
          })}{' '}
          · {start.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}–
          {end.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </header>

      {/* Quick-Actions */}
      {!isTerminal && appt.client ? (
        <section className="mx-5 mb-4 grid grid-cols-2 gap-2">
          {hasPhone ? (
            <>
              <a
                href={`tel:${telHref}`}
                className="flex h-12 items-center justify-center gap-2 rounded-lg border border-border bg-surface text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-sm active:scale-[0.98] active:translate-y-0"
              >
                📞 Anrufen
              </a>
              <a
                href={`https://wa.me/${waDigits}`}
                target="_blank"
                rel="noopener"
                className="flex h-12 items-center justify-center gap-2 rounded-lg border border-success/30 bg-success/10 text-sm font-medium text-success transition-all duration-200 hover:-translate-y-0.5 hover:border-success/50 hover:shadow-sm active:scale-[0.98] active:translate-y-0"
              >
                💬 WhatsApp
              </a>
            </>
          ) : null}
        </section>
      ) : null}

      {/* Status-Transitions */}
      {!isTerminal ? (
        <section className="mx-5 mb-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
            Nächster Schritt
          </p>
          <div className="flex flex-wrap gap-2">
            {appt.status === 'BOOKED' ? (
              <form action={transitionAppointment.bind(null, appt.id, 'confirm')}>
                <Button type="submit" variant="accent" size="sm">
                  ✓ Bestätigen
                </Button>
              </form>
            ) : null}
            {appt.status === 'CONFIRMED' || appt.status === 'BOOKED' ? (
              <form action={transitionAppointment.bind(null, appt.id, 'check-in')}>
                <Button type="submit" variant="primary" size="sm">
                  👋 Eingecheckt
                </Button>
              </form>
            ) : null}
            {appt.status === 'CHECKED_IN' ? (
              <form action={transitionAppointment.bind(null, appt.id, 'start')}>
                <Button type="submit" variant="primary" size="sm">
                  ▶ Läuft
                </Button>
              </form>
            ) : null}
            {appt.status === 'IN_SERVICE' ? (
              <form action={transitionAppointment.bind(null, appt.id, 'complete')}>
                <Button type="submit" variant="accent" size="sm">
                  ✓ Fertig
                </Button>
              </form>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="space-y-4 px-5">
        {/* Waitlist-Match-Card wenn Termin freigeworden */}
        {isFreed && matchesData.entries.length > 0 ? (
          <Card elevation="flat" className="border-l-4 border-l-accent bg-accent/5">
            <CardBody>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                🎯 Passende Warteliste · {matchesData.entries.length}{' '}
                {matchesData.entries.length === 1 ? 'Kundin' : 'Kundinnen'}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Slot frei — diese Kundinnen wollen genau diesen Service. Ein WhatsApp-Tipp reicht.
              </p>
              <ul className="mt-3 space-y-2">
                {matchesData.entries.slice(0, 5).map((m) => {
                  const name = `${m.client.firstName} ${m.client.lastName}`;
                  const waDigits = m.client.phoneE164
                    ? m.client.phoneE164.replace(/^\+/, '')
                    : m.client.phone
                      ? m.client.phone.replace(/[^+\d]/g, '').replace(/^\+/, '')
                      : null;
                  const waUsable = waDigits != null && waDigits.length >= 7;
                  const when = new Date(appt.startAt).toLocaleString('de-CH', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Europe/Zurich',
                  });
                  const tenantName = matchesData.tenantName ?? '';
                  const waMsg = tenantName
                    ? `Hallo ${m.client.firstName}, hier ist das Team vom ${tenantName} — gerade ist ein Slot frei: ${when} für ${m.service.name}. Hättest du Zeit? ✨`
                    : `Hallo ${m.client.firstName}, gerade ist ein Slot frei: ${when} für ${m.service.name}. Hättest du Zeit? ✨`;
                  return (
                    <li
                      key={m.id}
                      className="flex items-center gap-2 rounded-md bg-surface px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-text-primary">{name}</div>
                        <div className="truncate text-xs text-text-muted">{m.service.name}</div>
                      </div>
                      {waUsable ? (
                        <a
                          href={`https://wa.me/${waDigits}?text=${encodeURIComponent(waMsg)}`}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex h-9 items-center gap-1 rounded-md border border-success/30 bg-success/10 px-3 text-xs font-medium text-success transition-all duration-200 active:scale-[0.97]"
                        >
                          💬 WA
                        </a>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              {matchesData.total > 5 ? (
                <p className="mt-2 text-xs text-text-muted">
                  +{matchesData.total - 5} weitere auf der{' '}
                  <Link href="/waitlist" className="underline">
                    Warteliste
                  </Link>
                </p>
              ) : null}
            </CardBody>
          </Card>
        ) : null}

        {/* Staff + Location */}
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar
                name={`${appt.staff.firstName} ${appt.staff.lastName}`}
                color={appt.staff.color ?? 'hsl(var(--brand-accent))'}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  Stylistin
                </div>
                <div className="text-sm font-medium text-text-primary">
                  {appt.staff.firstName} {appt.staff.lastName}
                </div>
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                Location
              </div>
              <div className="mt-0.5 text-sm text-text-primary">{appt.location.name}</div>
            </div>
          </CardBody>
        </Card>

        {/* Services */}
        <Card>
          <CardBody>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              Leistungen
            </p>
            <ul className="mt-2 divide-y divide-border">
              {appt.items.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-text-primary">{i.service.name}</div>
                    <div className="text-xs text-text-muted">{i.duration} Min</div>
                  </div>
                  <div className="font-display font-semibold tabular-nums text-text-primary">
                    CHF {Number(i.price).toFixed(0)}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                Gesamt
              </span>
              <span className="font-display text-xl font-semibold tabular-nums text-text-primary">
                CHF {total.toFixed(0)}
              </span>
            </div>
            {appt.depositAmount != null && Number(appt.depositAmount) > 0 ? (
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-text-muted">Anzahlung</span>
                <span
                  className={[
                    'tabular-nums font-medium',
                    appt.depositPaid ? 'text-success' : 'text-warning',
                  ].join(' ')}
                >
                  CHF {Number(appt.depositAmount).toFixed(0)}
                  {appt.depositPaid ? ' ✓ bezahlt' : ' · offen'}
                </span>
              </div>
            ) : null}
          </CardBody>
        </Card>

        {/* Notes */}
        {appt.notes || appt.internalNotes ? (
          <Card>
            <CardBody className="space-y-3">
              {appt.notes ? (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                    Kundinnen-Notiz
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-text-primary">{appt.notes}</p>
                </div>
              ) : null}
              {appt.internalNotes ? (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-warning">
                    Interne Notiz
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-text-primary">
                    {appt.internalNotes}
                  </p>
                </div>
              ) : null}
            </CardBody>
          </Card>
        ) : null}

        {/* POS-Shortcut wenn Termin fertig oder läuft */}
        {(appt.status === 'COMPLETED' || appt.status === 'IN_SERVICE') && appt.client ? (
          <Link
            href={`/pos/${appt.id}`}
            className="flex items-center justify-center gap-2 rounded-lg bg-accent py-3 text-base font-semibold text-accent-foreground shadow-glow transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.98]"
          >
            💳 Zur Kasse
          </Link>
        ) : null}

        {/* Links zur Vollversion */}
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Link href={`/calendar/${appt.id}`}>
            <Button variant="ghost" size="sm">
              ⚙ Vollständig bearbeiten
            </Button>
          </Link>
          {appt.client ? (
            <Link href={`/m/clients/${appt.client.id}`}>
              <Button variant="ghost" size="sm">
                → Kundin öffnen
              </Button>
            </Link>
          ) : null}
        </div>

        {/* Gefahr-Zone */}
        {!isTerminal ? (
          <details className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3">
            <summary className="cursor-pointer text-xs font-medium text-danger">
              Termin stornieren / No-Show markieren
            </summary>
            <div className="mt-3 flex flex-col gap-2">
              <form action={cancelAppointment.bind(null, appt.id, 'Storniert über Mobile-App')}>
                <Button type="submit" variant="danger" size="sm" className="w-full">
                  Stornieren
                </Button>
              </form>
              <form action={markNoShow.bind(null, appt.id)}>
                <Button type="submit" variant="ghost" size="sm" className="w-full">
                  No-Show markieren
                </Button>
              </form>
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}
