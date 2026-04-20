import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar, Badge, Card, CardBody, PriceDisplay, Stat } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

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
}

interface Appt {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  staff: { firstName: string; lastName: string };
  items: Array<{ service: { name: string } }>;
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
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
            Kundin
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            {client.firstName} {client.lastName}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {client.email ?? '—'}
            {client.phone ? ` · ${client.phone}` : ''}
          </p>
          {client.tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1">
              {client.tags.map((t) => (
                <Badge key={t} tone="accent">
                  {t}
                </Badge>
              ))}
            </div>
          ) : null}
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

      {upcoming.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Bevorstehende Termine
          </h2>
          <Card>
            <CardBody className="p-0">
              <ul className="divide-y divide-border">
                {upcoming.map((a) => (
                  <ApptRow key={a.id} a={a} />
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
                  <ApptRow key={a.id} a={a} />
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
    </div>
  );
}

function ApptRow({ a }: { a: Appt }): React.JSX.Element {
  const service = a.items.map((i) => i.service.name).join(', ') || '—';
  const staff = `${a.staff.firstName} ${a.staff.lastName[0]}.`;
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
        <div className="font-medium text-text-primary">{service}</div>
        <div className="text-xs text-text-muted">{staff}</div>
      </div>
      <Badge tone={statusTone[a.status] ?? 'neutral'}>
        {statusLabel[a.status] ?? a.status}
      </Badge>
    </li>
  );
}
