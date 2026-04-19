import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import {
  transitionAppointment,
  cancelAppointment,
} from '../actions';
import { updateAppointmentNotes } from './actions';

interface Appt {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
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
    <div className="p-8 max-w-4xl">
      <Link
        href={`/calendar?date=${day}`}
        className="text-sm text-neutral-500 hover:text-neutral-900"
      >
        ← Zum Tagesplan
      </Link>

      <header className="mt-4 mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
            Termin
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {a.client ? (
              <Link
                href={`/clients/${a.client.id}`}
                className="hover:underline"
              >
                {a.client.firstName} {a.client.lastName}
              </Link>
            ) : (
              'Blockzeit'
            )}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {new Date(a.startAt).toLocaleDateString('de-CH', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}{' '}
            · {start}–{end}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${statusPill(a.status)}`}
        >
          {statusLabel[a.status] ?? a.status}
        </span>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Kontakt
          </p>
          {a.client ? (
            <>
              <p className="mt-2 text-sm">{a.client.email ?? '—'}</p>
              <p className="text-sm text-neutral-500">{a.client.phone ?? ''}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-neutral-400">
              Keine Kundinnendaten.
            </p>
          )}
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Bei
          </p>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: a.staff.color ?? '#737373' }}
            />
            {a.staff.firstName} {a.staff.lastName}
          </div>
          <p className="mt-1 text-xs text-neutral-500">{a.location.name}</p>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-neutral-200 bg-white">
        <h2 className="border-b border-neutral-100 px-5 py-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Leistungen
        </h2>
        <ul className="divide-y divide-neutral-100">
          {a.items.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between px-5 py-3 text-sm"
            >
              <div>
                <div className="font-medium">{i.service.name}</div>
                <div className="text-xs text-neutral-500">{i.duration} Min</div>
              </div>
              <div className="font-medium tabular-nums">
                {Number(i.price).toFixed(2)} CHF
              </div>
            </li>
          ))}
          <li className="flex items-center justify-between bg-neutral-50 px-5 py-3 text-sm">
            <span className="font-semibold">Total</span>
            <span className="font-semibold tabular-nums">
              {total.toFixed(2)} CHF
            </span>
          </li>
        </ul>
      </section>

      {a.status !== 'COMPLETED' && a.status !== 'CANCELLED' ? (
        <section className="mb-6 flex flex-wrap gap-2">
          {a.status === 'BOOKED' ? (
            <form action={transition.bind(null, 'confirm')}>
              <Btn>Bestätigen</Btn>
            </form>
          ) : null}
          {(a.status === 'BOOKED' || a.status === 'CONFIRMED') ? (
            <form action={transition.bind(null, 'check-in')}>
              <Btn>Einchecken</Btn>
            </form>
          ) : null}
          {a.status === 'CHECKED_IN' ? (
            <form action={transition.bind(null, 'start')}>
              <Btn>Behandlung starten</Btn>
            </form>
          ) : null}
          {a.status === 'IN_SERVICE' ? (
            <form action={transition.bind(null, 'complete')}>
              <Btn primary>Abschliessen</Btn>
            </form>
          ) : null}
          <form action={cancel.bind(null, 'Auf Kundenwunsch')}>
            <Btn danger>Stornieren</Btn>
          </form>
        </section>
      ) : null}

      <form
        action={saveNotes}
        className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5"
      >
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Notizen (sichtbar für Kundin)
          </label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={a.notes ?? ''}
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            placeholder="z. B. gewünschte Farbe, Allergien…"
          />
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Interne Notiz (nur Team)
          </label>
          <textarea
            name="internalNotes"
            rows={2}
            defaultValue={a.internalNotes ?? ''}
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            placeholder="z. B. stornierte schon 2×, bitte anrufen"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Notizen speichern
          </button>
        </div>
      </form>

      <p className="mt-6 text-xs text-neutral-400">
        Gebucht am{' '}
        {new Date(a.bookedAt).toLocaleString('de-CH', {
          dateStyle: 'short',
          timeStyle: 'short',
        })}{' '}
        · via {channelLabel[a.bookedVia] ?? a.bookedVia}
      </p>
    </div>
  );
}

function statusPill(s: string): string {
  switch (s) {
    case 'BOOKED':
      return 'bg-blue-100 text-blue-800';
    case 'CONFIRMED':
      return 'bg-emerald-100 text-emerald-800';
    case 'CHECKED_IN':
      return 'bg-amber-100 text-amber-800';
    case 'IN_SERVICE':
      return 'bg-purple-100 text-purple-800';
    case 'COMPLETED':
      return 'bg-neutral-200 text-neutral-700';
    case 'CANCELLED':
    case 'NO_SHOW':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-neutral-100 text-neutral-700';
  }
}

function Btn({
  children,
  primary,
  danger,
}: {
  children: React.ReactNode;
  primary?: boolean;
  danger?: boolean;
}): React.JSX.Element {
  const variant = danger
    ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
    : primary
      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
      : 'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50';
  return (
    <button
      type="submit"
      className={`rounded-md px-4 py-2 text-sm font-medium transition ${variant}`}
    >
      {children}
    </button>
  );
}
