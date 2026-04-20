import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar, Badge, Button, Card, CardBody, PriceDisplay, Stat } from '@salon-os/ui';
import { computeLoyalty } from '@salon-os/utils';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { forgetClient } from './actions';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  birthday: string | null;
  notes: string | null;
  tags: string[];
  totalVisits: number;
  totalSpent: string;
  lastVisitAt: string | null;
  createdAt: string;
  noShowRisk: string | null;
}

interface Appt {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  staffId: string;
  staff: { firstName: string; lastName: string };
  items: Array<{ serviceId: string; service: { name: string } }>;
}

async function loadClient(id: string): Promise<Client | null> {
  const ctx = getCurrentTenant();
  try {
    return await apiFetch<Client>(`/v1/clients/${id}`, {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
}

async function loadClientAppointments(clientId: string): Promise<Appt[]> {
  const ctx = getCurrentTenant();
  const from = new Date();
  from.setFullYear(from.getFullYear() - 2);
  const to = new Date();
  to.setFullYear(to.getFullYear() + 1);
  try {
    const res = await apiFetch<{ appointments: Appt[] }>(
      `/v1/appointments?from=${from.toISOString()}&to=${to.toISOString()}&clientId=${clientId}`,
      { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role },
    );
    return res.appointments.sort(
      (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
    );
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}

const statusTone: Record<string, 'neutral' | 'success' | 'info' | 'warning' | 'danger' | 'accent'> = {
  BOOKED: 'info',
  CONFIRMED: 'success',
  CHECKED_IN: 'warning',
  IN_SERVICE: 'accent',
  COMPLETED: 'neutral',
  CANCELLED: 'danger',
  NO_SHOW: 'danger',
  WAITLIST: 'neutral',
};

const statusLabel: Record<string, string> = {
  BOOKED: 'Gebucht',
  CONFIRMED: 'Bestätigt',
  CHECKED_IN: 'Eingecheckt',
  IN_SERVICE: 'Läuft',
  COMPLETED: 'Abgeschlossen',
  CANCELLED: 'Storniert',
  NO_SHOW: 'Nicht erschienen',
  WAITLIST: 'Warteliste',
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const [client, appts] = await Promise.all([loadClient(id), loadClientAppointments(id)]);
  if (!client) notFound();

  const upcoming = appts.filter((a) => new Date(a.startAt) >= new Date());
  const past = appts.filter((a) => new Date(a.startAt) < new Date());
  const loyalty = computeLoyalty(Number(client.totalSpent));

  return (
    <div className="mx-auto max-w-4xl p-8">
      <Link
        href="/clients"
        className="text-xs text-text-muted transition-colors hover:text-text-primary"
      >
        ← Alle Kundinnen
      </Link>

      <header className="mb-8 mt-4 flex items-start gap-5">
        <Avatar
          name={`${client.firstName} ${client.lastName}`}
          size="xl"
          color="hsl(var(--brand-accent))"
          vip={client.totalVisits >= 10}
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
                Kundin
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
                {client.firstName} {client.lastName}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/calendar/new?clientId=${client.id}`}
                className="inline-flex h-9 items-center rounded-md bg-brand px-3 text-xs font-medium text-brand-foreground transition-colors hover:bg-brand/90"
              >
                + Neuer Termin
              </Link>
              <Link
                href={`/clients/${client.id}/edit`}
                className="inline-flex h-9 items-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-text-secondary hover:bg-surface-raised"
              >
                Bearbeiten
              </Link>
            </div>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {client.email ?? '—'}
            {client.phone ? ` · ${client.phone}` : ''}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Badge
              tone={
                loyalty.tier.id === 'PLATIN' || loyalty.tier.id === 'GOLD'
                  ? 'accent'
                  : loyalty.tier.id === 'SILBER'
                    ? 'info'
                    : 'neutral'
              }
              dot
            >
              {loyalty.tier.label} · {loyalty.points} Pkt
            </Badge>
            {client.noShowRisk !== null && Number(client.noShowRisk) >= 40 ? (
              <Badge tone="warning" dot>
                ⚠ No-Show-Risiko {Math.round(Number(client.noShowRisk))}%
              </Badge>
            ) : null}
            {client.tags.map((t) => (
              <Badge key={t} tone="accent">
                {t}
              </Badge>
            ))}
          </div>
        </div>
      </header>

      <section className="mb-8 grid grid-cols-3 gap-4">
        <Stat label="Besuche" value={client.totalVisits} />
        <Stat
          label="Umsatz total"
          value={`${Number(client.totalSpent).toLocaleString('de-CH', { minimumFractionDigits: 2 })} CHF`}
        />
        <Stat
          label="Letzter Besuch"
          value={
            client.lastVisitAt
              ? new Date(client.lastVisitAt).toLocaleDateString('de-CH', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '—'
          }
        />
      </section>

      <Card className="mb-8 overflow-hidden">
        <div className="bg-gradient-to-r from-accent/10 via-accent/5 to-transparent px-5 py-4">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                Treue-Status
              </p>
              <p className="mt-1 text-2xl font-display font-semibold">
                {loyalty.tier.label}
              </p>
              <p className="mt-0.5 text-xs text-text-secondary">
                {loyalty.tier.benefitHint}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold tabular-nums text-text-primary">
                {loyalty.points}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                Punkte
              </p>
            </div>
          </div>
        </div>
        {loyalty.nextTier ? (
          <CardBody className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">
                {loyalty.tier.label} → {loyalty.nextTier.label}
              </span>
              <span className="tabular-nums font-medium text-text-primary">
                noch {loyalty.toNextCHF?.toFixed(0) ?? '—'} CHF
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-raised">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent/70 transition-all duration-slow ease-out-expo"
                style={{ width: `${Math.round(loyalty.progressInTier * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-text-muted">
              Nächster Vorteil: {loyalty.nextTier.benefitHint}
            </p>
          </CardBody>
        ) : (
          <CardBody className="text-center text-xs text-text-muted">
            Höchster Tier erreicht — danke für die Treue 💛
          </CardBody>
        )}
      </Card>

      {upcoming.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Bevorstehende Termine
          </h2>
          <Card>
            <CardBody className="p-0">
              <ul className="divide-y divide-border">
                {upcoming.map((a) => (
                  <ApptRow key={a.id} a={a} clientId={client.id} />
                ))}
              </ul>
            </CardBody>
          </Card>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Verlauf
        </h2>
        {past.length === 0 ? (
          <Card>
            <CardBody className="py-10 text-center text-sm text-text-muted">
              Noch keine vergangenen Termine.
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody className="p-0">
              <ul className="divide-y divide-border">
                {past.map((a) => (
                  <ApptRow key={a.id} a={a} clientId={client.id} showRebook />
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </section>

      {client.notes ? (
        <Card className="mt-8 border-l-4 border-l-warning bg-warning/5">
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wider text-warning">
              Interne Notiz
            </p>
            <p className="mt-2 whitespace-pre-line text-sm text-text-primary">
              {client.notes}
            </p>
          </CardBody>
        </Card>
      ) : null}

      <section className="mt-10 rounded-lg border border-border bg-surface/50 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          DSGVO · Datenschutz
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Kundin fragt nach ihren Daten oder möchte gelöscht werden? Ein Klick.
          Export enthält Profil + alle Termine, Löschung markiert zur
          30-Tage-Entfernung.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={`/api/clients/${client.id}/export`}
            download={`client-${client.id}-export.json`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-text-primary transition-colors hover:bg-surface-raised"
          >
            ↓ Daten exportieren (JSON)
          </a>
          <form action={forgetClient.bind(null, client.id)}>
            <Button type="submit" variant="danger">
              Kundin löschen (DSGVO)
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}

function ApptRow({
  a,
  clientId,
  showRebook,
}: {
  a: Appt;
  clientId: string;
  showRebook?: boolean;
}): React.JSX.Element {
  const service = a.items.map((i) => i.service.name).join(', ') || '—';
  const staff = `${a.staff.firstName} ${a.staff.lastName[0]}.`;
  const primaryServiceId = a.items[0]?.serviceId;
  const rebookHref = primaryServiceId
    ? `/calendar/new?clientId=${clientId}&serviceId=${primaryServiceId}&staffId=${a.staffId}`
    : `/calendar/new?clientId=${clientId}&staffId=${a.staffId}`;

  return (
    <li className="flex items-center gap-4 px-5 py-3 text-sm">
      <div className="w-32 tabular-nums text-text-secondary">
        {new Date(a.startAt).toLocaleDateString('de-CH', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}
        <span className="ml-2 text-xs text-text-muted">
          {new Date(a.startAt).toLocaleTimeString('de-CH', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
      <div className="flex-1">
        <Link
          href={`/calendar/${a.id}`}
          className="block hover:underline"
        >
          <div className="font-medium text-text-primary">{service}</div>
          <div className="text-xs text-text-muted">{staff}</div>
        </Link>
      </div>
      <Badge tone={statusTone[a.status] ?? 'neutral'}>
        {statusLabel[a.status] ?? a.status}
      </Badge>
      {showRebook && a.status !== 'CANCELLED' && a.status !== 'NO_SHOW' ? (
        <Link
          href={rebookHref}
          className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
          title="Gleichen Service erneut buchen"
        >
          ↻ Rebook
        </Link>
      ) : null}
    </li>
  );
}
