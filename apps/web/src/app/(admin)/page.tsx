import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface Counts {
  services: number;
  staff: number;
  clients: number;
  todayAppointments: number;
  nextAppt: {
    startAt: string;
    client: { firstName: string; lastName: string } | null;
    items: Array<{ service: { name: string } }>;
  } | null;
  todayRevenueCents: number;
}

async function loadDashboard(): Promise<Counts> {
  const ctx = getCurrentTenant();
  const auth = {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
  };

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const from = start.toISOString();
  const to = end.toISOString();

  try {
    const [svc, stf, cli, appts] = await Promise.all([
      apiFetch<{ services: unknown[] }>('/v1/services', auth),
      apiFetch<{ staff: unknown[] }>('/v1/staff', auth),
      apiFetch<{ clients: unknown[] }>('/v1/clients?limit=200', auth),
      apiFetch<{
        appointments: Array<{
          id: string;
          startAt: string;
          status: string;
          client: { firstName: string; lastName: string } | null;
          items: Array<{ service: { name: string }; price: string }>;
        }>;
      }>(`/v1/appointments?from=${from}&to=${to}`, auth),
    ]);

    const future = appts.appointments
      .filter((a) => new Date(a.startAt) >= new Date())
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    const nextAppt = future[0] ?? null;

    const todayRevenueCents = appts.appointments
      .filter((a) => a.status !== 'CANCELLED' && a.status !== 'NO_SHOW')
      .reduce(
        (sum, a) =>
          sum +
          a.items.reduce((s, i) => s + Math.round(Number(i.price) * 100), 0),
        0,
      );

    return {
      services: svc.services.length,
      staff: stf.staff.length,
      clients: cli.clients.length,
      todayAppointments: appts.appointments.length,
      nextAppt: nextAppt
        ? {
            startAt: nextAppt.startAt,
            client: nextAppt.client,
            items: nextAppt.items.map((i) => ({ service: i.service })),
          }
        : null,
      todayRevenueCents,
    };
  } catch (err) {
    if (err instanceof ApiError) {
      return {
        services: 0,
        staff: 0,
        clients: 0,
        todayAppointments: 0,
        nextAppt: null,
        todayRevenueCents: 0,
      };
    }
    throw err;
  }
}

function fmtChf(cents: number): string {
  return (cents / 100).toFixed(2) + ' CHF';
}

export default async function Home(): Promise<React.JSX.Element> {
  const d = await loadDashboard();
  const today = new Date();

  return (
    <main className="mx-auto max-w-5xl p-8">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
          Dashboard
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Hallo, Neta 👋
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {today.toLocaleDateString('de-CH', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Termine heute" value={d.todayAppointments} href="/calendar" />
        <Stat
          label="Umsatz heute"
          value={fmtChf(d.todayRevenueCents)}
          hint="exkl. storniert"
        />
        <Stat label="Kundinnen" value={d.clients} href="/clients" />
        <Stat label="Services" value={d.services} href="/services" />
      </section>

      {d.nextAppt ? (
        <section className="mb-8 rounded-xl border border-neutral-200 bg-white p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Nächster Termin
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">
              {d.nextAppt.client
                ? `${d.nextAppt.client.firstName} ${d.nextAppt.client.lastName}`
                : 'Blockzeit'}
            </h2>
            <span className="text-sm font-medium tabular-nums text-neutral-700">
              {new Date(d.nextAppt.startAt).toLocaleTimeString('de-CH', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {d.nextAppt.items.map((i) => i.service.name).join(', ') || '—'}
          </p>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Link
          href="/calendar"
          className="rounded-xl border border-neutral-200 bg-white p-6 hover:border-neutral-400"
        >
          <p className="text-sm font-medium">Tagesplan ansehen</p>
          <p className="mt-1 text-xs text-neutral-500">
            Termine, Check-ins, Stornos im Kalender.
          </p>
        </Link>
        <Link
          href="/calendar/new"
          className="rounded-xl border border-neutral-200 bg-neutral-900 p-6 text-white hover:bg-neutral-800"
        >
          <p className="text-sm font-medium">+ Termin manuell anlegen</p>
          <p className="mt-1 text-xs text-neutral-300">
            Wenn jemand telefonisch bucht.
          </p>
        </Link>
      </section>

      <footer className="mt-12 flex flex-wrap gap-3 text-xs text-neutral-500">
        <Link href="/clients" className="underline underline-offset-4">
          Kundinnen
        </Link>
        <span className="text-neutral-300">·</span>
        <Link href="/services" className="underline underline-offset-4">
          Services
        </Link>
        <span className="text-neutral-300">·</span>
        <Link href="/staff" className="underline underline-offset-4">
          Team
        </Link>
        <span className="text-neutral-300">·</span>
        <Link href="/book/beautycenter-by-neta" className="underline underline-offset-4">
          Online-Booking-Seite
        </Link>
      </footer>
    </main>
  );
}

function Stat({
  label,
  value,
  href,
  hint,
}: {
  label: string;
  value: string | number;
  href?: string;
  hint?: string;
}): React.JSX.Element {
  const body = (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-[10px] text-neutral-400">{hint}</p> : null}
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:[&>div]:border-neutral-400">
      {body}
    </Link>
  ) : (
    body
  );
}
