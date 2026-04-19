import Link from 'next/link';
import { notFound } from 'next/navigation';
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
  // Range: letzte 2 Jahre bis 1 Jahr in die Zukunft.
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
    <div className="p-8 max-w-4xl">
      <Link
        href="/clients"
        className="text-sm text-neutral-500 hover:text-neutral-900"
      >
        ← Alle Kundinnen
      </Link>

      <header className="mt-4 mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
            Kundin
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {client.firstName} {client.lastName}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            {client.email ?? '—'}
            {client.phone ? ` · ${client.phone}` : ''}
          </p>
        </div>
      </header>

      <section className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Besuche
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {client.totalVisits}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Umsatz
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {Number(client.totalSpent).toFixed(2)} CHF
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Letzter Besuch
          </p>
          <p className="mt-1 text-sm text-neutral-700">
            {client.lastVisitAt
              ? new Date(client.lastVisitAt).toLocaleDateString('de-CH')
              : '—'}
          </p>
        </div>
      </section>

      {upcoming.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Bevorstehende Termine
          </h2>
          <div className="rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100">
            {upcoming.map((a) => (
              <ApptRow key={a.id} a={a} />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Verlauf
        </h2>
        {past.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
            Noch keine vergangenen Termine.
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100">
            {past.map((a) => (
              <ApptRow key={a.id} a={a} />
            ))}
          </div>
        )}
      </section>

      {client.notes ? (
        <section className="mt-8 rounded-xl border border-neutral-200 bg-amber-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-800">
            Notizen
          </p>
          <p className="mt-1 text-sm text-neutral-700 whitespace-pre-line">
            {client.notes}
          </p>
        </section>
      ) : null}
    </div>
  );
}

function ApptRow({ a }: { a: Appt }): React.JSX.Element {
  const service = a.items.map((i) => i.service.name).join(', ') || '—';
  const staff = `${a.staff.firstName} ${a.staff.lastName[0]}.`;
  return (
    <div className="flex items-center gap-4 px-4 py-3 text-sm">
      <div className="w-32 text-neutral-600 tabular-nums">
        {new Date(a.startAt).toLocaleDateString('de-CH', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}
        <span className="ml-2 text-xs text-neutral-400">
          {new Date(a.startAt).toLocaleTimeString('de-CH', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
      <div className="flex-1">
        <div className="font-medium">{service}</div>
        <div className="text-xs text-neutral-500">{staff}</div>
      </div>
      <div className="text-xs text-neutral-500">{statusLabel[a.status] ?? a.status}</div>
    </div>
  );
}
