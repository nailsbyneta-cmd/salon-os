import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  PriceDisplay,
  Textarea,
} from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { ClientBrief } from '@/components/client-brief';
import { transitionAppointment, cancelAppointment } from '../actions';
import { updateAppointmentNotes } from './actions';

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
  notes: string | null;
  internalNotes: string | null;
  depositAmount: string | null;
  depositPaid: boolean;
  bookedVia: string;
  bookedAt: string;
  clientId: string | null;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  } | null;
  staffId: string;
  staff: { firstName: string; lastName: string; color: string | null };
  location: { name: string };
  items: Array<{
    id: string;
    price: string;
    duration: number;
    service: { name: string };
  }>;
}

async function loadAppointment(id: string): Promise<Appt | null> {
  const ctx = getCurrentTenant();
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

const statusTone: Record<
  Appt['status'],
  'neutral' | 'success' | 'info' | 'warning' | 'danger' | 'accent'
> = {
  BOOKED: 'info',
  CONFIRMED: 'success',
  CHECKED_IN: 'warning',
  IN_SERVICE: 'accent',
  COMPLETED: 'neutral',
  CANCELLED: 'danger',
  NO_SHOW: 'danger',
  WAITLIST: 'neutral',
};

const statusLabel: Record<Appt['status'], string> = {
  BOOKED: 'Gebucht',
  CONFIRMED: 'Bestätigt',
  CHECKED_IN: 'Eingecheckt',
  IN_SERVICE: 'Läuft',
  COMPLETED: 'Abgeschlossen',
  CANCELLED: 'Storniert',
  NO_SHOW: 'Nicht erschienen',
  WAITLIST: 'Warteliste',
};

const channelLabel: Record<string, string> = {
  ONLINE_BRANDED: 'Online-Booking',
  STAFF_INTERNAL: 'Intern angelegt',
  PHONE_MANUAL: 'Telefon',
  WALK_IN: 'Walk-in',
};

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const a = await loadAppointment(id);
  if (!a) notFound();

  const day = a.startAt.slice(0, 10);
  const total = a.items.reduce((sum, i) => sum + Number(i.price), 0);
  const start = new Date(a.startAt).toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const end = new Date(a.endAt).toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const transition = transitionAppointment.bind(null, a.id);
  const cancel = cancelAppointment.bind(null, a.id);
  const saveNotes = updateAppointmentNotes.bind(null, a.id);

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <Link
        href={`/calendar?date=${day}`}
        className="text-xs text-text-muted transition-colors hover:text-text-primary"
      >
        ← Zum Tagesplan
      </Link>

      <header className="mb-8 mt-4 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
            Termin
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
            {a.client ? (
              <Link
                href={`/clients/${a.client.id}`}
                className="transition-colors hover:text-accent"
              >
                {a.client.firstName} {a.client.lastName}
              </Link>
            ) : (
              'Blockzeit'
            )}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {new Date(a.startAt).toLocaleDateString('de-CH', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}{' '}
            · <span className="tabular-nums">{start}–{end}</span>
          </p>
        </div>
        <Badge tone={statusTone[a.status]} dot>
          {statusLabel[a.status]}
        </Badge>
      </header>

      {a.client ? (
        <ClientBrief
          clientId={a.client.id}
          appointmentStaffId={a.staffId}
        />
      ) : null}

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Kontakt
            </p>
            {a.client ? (
              <>
                <p className="mt-2 text-sm text-text-primary">
                  {a.client.email ? (
                    <a
                      href={`mailto:${a.client.email}`}
                      className="hover:text-accent hover:underline"
                    >
                      {a.client.email}
                    </a>
                  ) : (
                    '—'
                  )}
                </p>
                {a.client.phone ? (
                  <p className="text-sm text-text-muted">
                    <a
                      href={`tel:${a.client.phone}`}
                      className="hover:text-accent hover:underline"
                    >
                      {a.client.phone}
                    </a>
                  </p>
                ) : null}
                {a.client.phone || a.client.email ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {a.client.phone ? (
                      <>
                        <a
                          href={`tel:${a.client.phone}`}
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-surface px-2.5 text-[11px] font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
                        >
                          📞 Anrufen
                        </a>
                        <a
                          href={`sms:${a.client.phone}`}
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-surface px-2.5 text-[11px] font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
                        >
                          💬 SMS
                        </a>
                        <a
                          href={`https://wa.me/${a.client.phone.replace(/[^+\d]/g, '').replace(/^\+/, '')}`}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-success/30 bg-success/10 px-2.5 text-[11px] font-medium text-success transition-colors hover:bg-success/20"
                        >
                          WhatsApp
                        </a>
                      </>
                    ) : null}
                    {a.client.email ? (
                      <a
                        href={`mailto:${a.client.email}`}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-surface px-2.5 text-[11px] font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
                      >
                        ✉ E-Mail
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="mt-2 text-sm text-text-muted">Keine Kundinnendaten.</p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Bei
            </p>
            <div className="mt-2 flex items-center gap-3">
              <Avatar
                name={`${a.staff.firstName} ${a.staff.lastName}`}
                color={a.staff.color}
                size="md"
              />
              <div>
                <div className="text-sm font-medium text-text-primary">
                  {a.staff.firstName} {a.staff.lastName}
                </div>
                <div className="text-xs text-text-muted">{a.location.name}</div>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>

      <Card className="mb-6">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Leistungen
          </h2>
        </div>
        <ul>
          {a.items.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between border-b border-border px-5 py-3 text-sm last:border-0"
            >
              <div>
                <div className="font-medium text-text-primary">{i.service.name}</div>
                <div className="text-xs text-text-muted">{i.duration} Min</div>
              </div>
              <PriceDisplay amount={i.price} />
            </li>
          ))}
          <li className="flex items-center justify-between bg-background/40 px-5 py-3 text-sm">
            <span className="font-semibold text-text-primary">Total</span>
            <PriceDisplay amount={total} size="lg" />
          </li>
        </ul>
      </Card>

      {a.status !== 'COMPLETED' && a.status !== 'CANCELLED' ? (
        <section className="mb-6 flex flex-wrap gap-2">
          {a.status === 'BOOKED' ? (
            <form action={transition.bind(null, 'confirm')}>
              <Button type="submit" variant="secondary">
                Bestätigen
              </Button>
            </form>
          ) : null}
          {(a.status === 'BOOKED' || a.status === 'CONFIRMED') ? (
            <form action={transition.bind(null, 'check-in')}>
              <Button type="submit" variant="secondary">
                Einchecken
              </Button>
            </form>
          ) : null}
          {a.status === 'CHECKED_IN' ? (
            <form action={transition.bind(null, 'start')}>
              <Button type="submit" variant="secondary">
                Behandlung starten
              </Button>
            </form>
          ) : null}
          {a.status === 'IN_SERVICE' ? (
            <Link href={`/pos/${a.id}`}>
              <Button variant="accent">Kassieren →</Button>
            </Link>
          ) : null}
          {(a.status === 'CHECKED_IN' || a.status === 'IN_SERVICE') ? (
            <form action={transition.bind(null, 'complete')}>
              <Button type="submit" variant="secondary">
                Ohne Kasse abschliessen
              </Button>
            </form>
          ) : null}
          <form action={cancel.bind(null, 'Auf Kundenwunsch')}>
            <Button type="submit" variant="danger">
              Stornieren
            </Button>
          </form>
        </section>
      ) : null}

      <Card>
        <CardBody>
          <form action={saveNotes} className="space-y-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Notiz für die Kundin
              </label>
              <Textarea
                name="notes"
                rows={2}
                defaultValue={a.notes ?? ''}
                className="mt-2"
                placeholder="z. B. gewünschte Farbe, Allergien…"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Interne Notiz (nur Team)
              </label>
              <Textarea
                name="internalNotes"
                rows={2}
                defaultValue={a.internalNotes ?? ''}
                className="mt-2"
                placeholder="z. B. Storno-Historie, Kundin bitte anrufen…"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="primary">
                Notizen speichern
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <p className="mt-6 text-xs text-text-muted">
        Gebucht am{' '}
        <span className="tabular-nums">
          {new Date(a.bookedAt).toLocaleString('de-CH', {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </span>{' '}
        · via {channelLabel[a.bookedVia] ?? a.bookedVia}
      </p>
    </div>
  );
}
