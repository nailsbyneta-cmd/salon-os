import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar, Badge, Button, Card, CardBody, PriceDisplay, Textarea } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { ClientBrief } from '@/components/client-brief';
import { transitionAppointment, cancelAppointment, markNoShow } from '../actions';
import { updateAppointmentNotes } from './actions';
import { AppointmentEditForm } from './appointment-edit-form';

function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(
    dt.getUTCDate(),
  ).padStart(2, '0')}`;
}

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
    phoneE164?: string | null;
  } | null;
  staffId: string;
  staff: { firstName: string; lastName: string; color: string | null };
  location: { name: string };
  items: Array<{
    id: string;
    price: string;
    duration: number;
    serviceId: string;
    service: { name: string };
    optionLabels?: string[];
  }>;
}

interface WaitlistMatch {
  id: string;
  earliestAt: string;
  latestAt: string;
  notes: string | null;
  client: {
    firstName: string;
    lastName: string;
    phone: string | null;
    phoneE164: string | null;
  };
  service: { name: string };
  staff: { firstName: string; lastName: string } | null;
}

async function loadWaitlistMatches(
  serviceIds: string[],
  startAt: string,
  endAt: string,
  preferredStaffId: string,
): Promise<{ entries: WaitlistMatch[]; total: number }> {
  const ctx = await getCurrentTenant();
  const qs = new URLSearchParams({
    serviceIds: serviceIds.join(','),
    from: startAt,
    to: endAt,
    preferredStaffId,
  });
  try {
    const res = await apiFetch<{ entries: WaitlistMatch[]; total: number }>(
      `/v1/waitlist/matches?${qs.toString()}`,
      { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role },
    );
    return res;
  } catch (err) {
    if (err instanceof ApiError) return { entries: [], total: 0 };
    throw err;
  }
}

async function loadTenantName(): Promise<string> {
  const ctx = await getCurrentTenant();
  try {
    const res = await apiFetch<{ name: string }>('/v1/settings/tenant', {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
    return res.name || '';
  } catch (err) {
    if (err instanceof ApiError) return '';
    throw err;
  }
}

async function loadAppointment(id: string): Promise<Appt | null> {
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

  // Wenn der Termin gecancelled oder No-Show ist: suche matchende Waitlist-
  // Einträge damit der Slot nicht leer bleibt. Multi-Item-Termine matchen
  // auf alle Services. Parallel: Tenant-Name für pre-filled WA-Message.
  const isFreed = a.status === 'CANCELLED' || a.status === 'NO_SHOW';
  const allServiceIds = a.items.map((i) => i.serviceId).filter(Boolean);
  const [matchesRes, tenantName] =
    isFreed && allServiceIds.length > 0
      ? await Promise.all([
          loadWaitlistMatches(allServiceIds, a.startAt, a.endAt, a.staffId),
          loadTenantName(),
        ])
      : [{ entries: [] as WaitlistMatch[], total: 0 }, ''];
  const waitlistMatches = matchesRes.entries;
  const waitlistTotal = matchesRes.total;

  const day = a.startAt.slice(0, 10);
  const total = a.items.reduce((sum, i) => sum + Number(i.price), 0);
  const start = new Date(a.startAt).toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zurich',
  });
  const end = new Date(a.endAt).toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zurich',
  });
  const transition = transitionAppointment.bind(null, a.id);
  const cancel = cancelAppointment.bind(null, a.id);
  const noShow = markNoShow.bind(null, a.id);
  const saveNotes = updateAppointmentNotes.bind(null, a.id);

  return (
    <div className="mx-auto w-full max-w-[1400px] p-4 md:p-8">
      <Link
        href={`/calendar?date=${day}`}
        className="text-xs text-text-muted transition-colors hover:text-text-primary"
      >
        ← Zum Tagesplan
      </Link>

      <header className="mb-8 mt-4 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">Termin</p>
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
            ·{' '}
            <span className="tabular-nums">
              {start}–{end}
            </span>
          </p>
        </div>
        <Badge tone={statusTone[a.status]} dot>
          {statusLabel[a.status]}
        </Badge>
      </header>

      {a.client ? <ClientBrief clientId={a.client.id} appointmentStaffId={a.staffId} /> : null}

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Kontakt</p>
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
                    <a href={`tel:${a.client.phone}`} className="hover:text-accent hover:underline">
                      {a.client.phone}
                    </a>
                  </p>
                ) : null}
                {!a.client.phone && !a.client.email ? (
                  <div className="mt-2">
                    <Link
                      href={`/clients/${a.client.id}/edit`}
                      className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-2.5 text-[11px] font-medium text-accent hover:bg-surface-raised"
                    >
                      + Kontakt hinterlegen
                    </Link>
                  </div>
                ) : null}
                {a.client.phone || a.client.email ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {a.client.phone ? (
                      <>
                        <a
                          href={`tel:${a.client.phone}`}
                          className="inline-flex h-11 items-center gap-1 rounded-md border border-border bg-surface px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
                        >
                          📞 Anrufen
                        </a>
                        <a
                          href={`sms:${a.client.phone}`}
                          className="inline-flex h-11 items-center gap-1 rounded-md border border-border bg-surface px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
                        >
                          💬 SMS
                        </a>
                        <a
                          href={`https://wa.me/${(a.client.phoneE164 ?? a.client.phone).replace(/[^+\d]/g, '').replace(/^\+/, '')}`}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex h-11 items-center gap-1 rounded-md border border-success/30 bg-success/10 px-3 text-xs font-medium text-success transition-colors hover:bg-success/20"
                        >
                          WhatsApp
                        </a>
                      </>
                    ) : null}
                    {a.client.email ? (
                      <a
                        href={`mailto:${a.client.email}`}
                        className="inline-flex h-11 items-center gap-1 rounded-md border border-border bg-surface px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
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
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Bei</p>
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

      {a.client &&
      (a.client.phone || a.client.email) &&
      a.status !== 'CANCELLED' &&
      a.status !== 'NO_SHOW' &&
      a.status !== 'COMPLETED' ? (
        <Card className="mb-6 bg-surface-raised/50">
          <CardBody>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
              Reminder senden
            </p>
            <p className="mb-3 text-xs text-text-secondary">
              Vorformulierte Nachricht öffnet sich in SMS / WhatsApp / Mail — du kannst sie noch
              anpassen.
            </p>
            <div className="flex flex-wrap gap-2">
              {a.client.phone ? (
                <>
                  <a
                    href={`sms:${a.client.phone}?body=${encodeURIComponent(
                      `Hallo ${a.client.firstName}, erinnerung an deinen Termin am ${new Date(a.startAt).toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: 'long' })} um ${start}. Bis bald!`,
                    )}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-medium text-text-primary transition-colors hover:bg-surface-raised"
                  >
                    💬 SMS
                  </a>
                  <a
                    href={`https://wa.me/${a.client.phone.replace(/[^+\d]/g, '').replace(/^\+/, '')}?text=${encodeURIComponent(
                      `Hallo ${a.client.firstName}, erinnerung an deinen Termin am ${new Date(a.startAt).toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: 'long' })} um ${start}. Bis bald! 💛`,
                    )}`}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-3 text-xs font-medium text-success transition-colors hover:bg-success/20"
                  >
                    💬 WhatsApp
                  </a>
                </>
              ) : null}
              {a.client.email ? (
                <a
                  href={`mailto:${a.client.email}?subject=${encodeURIComponent(
                    `Termin-Erinnerung ${new Date(a.startAt).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
                  )}&body=${encodeURIComponent(
                    `Hallo ${a.client.firstName},\n\nnur eine kurze Erinnerung an deinen Termin am ${new Date(a.startAt).toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: 'long' })} um ${start}.\n\nFalls du verhindert bist, gib uns bitte rechtzeitig Bescheid.\n\nBis bald!`,
                  )}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-medium text-text-primary transition-colors hover:bg-surface-raised"
                >
                  ✉ E-Mail
                </a>
              ) : null}
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card className="mb-6">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
            Leistungen
          </h2>
        </div>
        <ul>
          {a.items.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between border-b border-border px-5 py-3 text-sm last:border-0"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-text-primary">{i.service.name}</div>
                {i.optionLabels && i.optionLabels.length > 0 ? (
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {i.optionLabels.map((l, idx) => (
                      <span
                        key={idx}
                        className="rounded-sm bg-accent/10 px-1.5 py-0.5 text-[11px] text-accent"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-0.5 text-xs text-text-muted">{i.duration} Min</div>
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

      {a.status !== 'COMPLETED' && a.status !== 'CANCELLED' && a.status !== 'NO_SHOW' ? (
        <div className="mb-6">
          <AppointmentEditForm
            appointmentId={a.id}
            currentStartIso={a.startAt}
            durationMinutes={a.items.reduce((s, i) => s + i.duration, 0)}
          />
        </div>
      ) : null}

      {a.status !== 'COMPLETED' && a.status !== 'CANCELLED' ? (
        <section className="mb-6 flex flex-wrap gap-2">
          {a.status === 'BOOKED' ? (
            <form action={transition.bind(null, 'confirm')}>
              <Button type="submit" variant="secondary">
                Bestätigen
              </Button>
            </form>
          ) : null}
          {a.status === 'BOOKED' || a.status === 'CONFIRMED' ? (
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
          {a.status === 'CHECKED_IN' || a.status === 'IN_SERVICE' ? (
            <form action={transition.bind(null, 'complete')}>
              <Button type="submit" variant="secondary">
                Ohne Kasse abschliessen
              </Button>
            </form>
          ) : null}
          {a.status === 'BOOKED' || a.status === 'CONFIRMED' || a.status === 'CHECKED_IN' ? (
            <form action={noShow}>
              <Button type="submit" variant="danger">
                Nicht erschienen
              </Button>
            </form>
          ) : null}
          <form action={cancel.bind(null, 'Auf Kundenwunsch')}>
            <Button type="submit" variant="ghost">
              Stornieren
            </Button>
          </form>
        </section>
      ) : null}

      {isFreed && waitlistMatches.length > 0 ? (
        <Card className="mb-6 border-l-4 border-l-accent bg-accent/5" elevation="flat">
          <CardBody>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                Passende Warteliste · {waitlistMatches.length}{' '}
                {waitlistMatches.length === 1 ? 'Kundin' : 'Kundinnen'}
              </span>
            </div>
            <p className="mb-3 text-xs text-text-secondary">
              Slot frei geworden — diese Kundinnen haben sich für diesen Service + Zeitraum
              vorgemerkt. Ein WhatsApp-Tipp reicht.
            </p>
            <ul className="space-y-2">
              {waitlistMatches.slice(0, 5).map((m) => {
                const name = `${m.client.firstName} ${m.client.lastName}`;
                const waDigits = m.client.phoneE164
                  ? m.client.phoneE164.replace(/^\+/, '')
                  : m.client.phone
                    ? m.client.phone.replace(/[^+\d]/g, '').replace(/^\+/, '')
                    : null;
                const waUsable = waDigits != null && waDigits.length >= 7;
                const telHref = m.client.phoneE164 ?? m.client.phone ?? null;
                const when = new Date(a.startAt).toLocaleString('de-CH', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Europe/Zurich',
                });
                const waMsg = tenantName
                  ? `Hallo ${m.client.firstName}, hier ist das Team vom ${tenantName} — es wurde gerade ein Slot frei: ${when} für ${m.service.name}. Hättest du Zeit? Liebe Grüsse ✨`
                  : `Hallo ${m.client.firstName}, es wurde gerade ein Slot frei: ${when} für ${m.service.name}. Hättest du Zeit? Liebe Grüsse ✨`;
                return (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center gap-3 rounded-md bg-surface px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-text-primary truncate">{name}</div>
                      <div className="text-xs text-text-muted truncate">
                        {m.service.name}
                        {m.staff ? ` · bei ${m.staff.firstName} ${m.staff.lastName[0]}.` : ''}
                        {m.notes ? ` · „${m.notes}"` : ''}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      {telHref ? (
                        <a
                          href={`tel:${telHref}`}
                          className="inline-flex h-10 items-center gap-1 rounded-md border border-border bg-surface px-3 text-xs font-medium text-text-secondary hover:bg-surface-raised hover:text-text-primary md:h-9"
                          aria-label={`${name} anrufen`}
                        >
                          📞
                        </a>
                      ) : null}
                      {waUsable ? (
                        <a
                          href={`https://wa.me/${waDigits}?text=${encodeURIComponent(waMsg)}`}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex h-10 items-center gap-1 rounded-md border border-success/30 bg-success/10 px-3 text-xs font-medium text-success hover:bg-success/20 md:h-9"
                          aria-label={`${name} auf WhatsApp anschreiben (öffnet WhatsApp)`}
                        >
                          WA Slot anbieten
                        </a>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            {waitlistTotal > 5 ? (
              <p className="mt-2 text-xs text-text-muted">
                +{waitlistTotal - 5} weitere auf der{' '}
                <Link href="/waitlist" className="underline hover:text-text-primary">
                  Warteliste
                </Link>
              </p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {a.status === 'COMPLETED' && a.client
        ? (() => {
            const client = a.client;
            return (
              <Card className="mb-6 border-l-4 border-l-accent bg-accent/5" elevation="flat">
                <CardBody>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                      Folgetermin vormerken
                    </span>
                  </div>
                  <p className="mb-3 text-xs text-text-secondary">
                    Ein Tap und {client.firstName} kriegt einen vorausgefüllten Termin in der
                    Zukunft — Zeit + Service noch editierbar.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[4, 6, 8].map((weeks) => {
                      const date = addDaysIso(day, weeks * 7);
                      const qs = new URLSearchParams({
                        clientId: client.id,
                        staffId: a.staffId,
                        date,
                      });
                      const niceDate = new Date(`${date}T12:00:00Z`).toLocaleDateString('de-CH', {
                        day: '2-digit',
                        month: 'short',
                        timeZone: 'Europe/Zurich',
                      });
                      return (
                        <Link
                          key={weeks}
                          href={`/calendar/new?${qs.toString()}`}
                          className="inline-flex h-10 items-center gap-1 rounded-md border border-border bg-surface px-4 text-xs font-medium text-text-secondary hover:border-accent hover:bg-accent/5 hover:text-text-primary md:h-9"
                          aria-label={`Folgetermin in ${weeks} Wochen am ${niceDate} vormerken`}
                        >
                          +{weeks} Wochen
                          <span className="ml-1 text-[10px] text-text-muted tabular-nums">
                            {niceDate}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>
            );
          })()
        : null}

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
