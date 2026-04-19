import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { createAppointment } from './actions';

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  basePrice: string;
  categoryId: string;
}
interface StaffRow {
  id: string;
  firstName: string;
  lastName: string;
}
interface ClientRow {
  id: string;
  firstName: string;
  lastName: string;
}

async function loadFormData(): Promise<{
  services: Service[];
  staff: StaffRow[];
  clients: ClientRow[];
}> {
  const ctx = getCurrentTenant();
  try {
    const [svc, stf, cli] = await Promise.all([
      apiFetch<{ services: Service[] }>('/v1/services', {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        role: ctx.role,
      }),
      apiFetch<{ staff: StaffRow[] }>('/v1/staff', {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        role: ctx.role,
      }),
      apiFetch<{ clients: ClientRow[] }>('/v1/clients', {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        role: ctx.role,
      }),
    ]);
    return { services: svc.services, staff: stf.staff, clients: cli.clients };
  } catch (err) {
    if (err instanceof ApiError) return { services: [], staff: [], clients: [] };
    throw err;
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}): Promise<React.JSX.Element> {
  const { date } = await searchParams;
  const { services, staff, clients } = await loadFormData();
  const day = date ?? todayIso();

  return (
    <div className="p-8 max-w-2xl">
      <Link
        href={`/calendar?date=${day}`}
        className="text-sm text-neutral-500 hover:text-neutral-900"
      >
        ← Zurück zum Kalender
      </Link>
      <header className="mt-4 mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
          Kalender
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Neuer Termin</h1>
      </header>

      <form action={createAppointment} className="space-y-5 rounded-xl border border-neutral-200 bg-white p-6">
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Datum</span>
            <input
              type="date"
              name="date"
              defaultValue={day}
              required
              className="rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Uhrzeit</span>
            <input
              type="time"
              name="time"
              defaultValue="10:00"
              step="900"
              required
              className="rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Service</span>
          <select
            name="serviceId"
            required
            className="rounded-md border border-neutral-300 px-3 py-2"
          >
            <option value="">— wählen —</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.durationMinutes} Min · {Number(s.basePrice).toFixed(2)} CHF)
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Mitarbeiterin</span>
          <select
            name="staffId"
            required
            className="rounded-md border border-neutral-300 px-3 py-2"
          >
            <option value="">— wählen —</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="rounded-md border border-neutral-200 p-4">
          <legend className="px-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
            Kundin
          </legend>
          <label className="mt-2 flex flex-col gap-1 text-sm">
            <span className="font-medium">Bestehende Kundin</span>
            <select
              name="clientId"
              className="rounded-md border border-neutral-300 px-3 py-2"
            >
              <option value="">— neue Kundin anlegen —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <input
              type="text"
              name="clientFirstName"
              placeholder="Vorname"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              name="clientLastName"
              placeholder="Nachname"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <input
              type="email"
              name="clientEmail"
              placeholder="E-Mail (optional)"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <input
              type="tel"
              name="clientPhone"
              placeholder="Telefon (optional)"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Wähle eine bestehende Kundin ODER fülle Vor-/Nachname unten aus.
          </p>
        </fieldset>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Link
            href={`/calendar?date=${day}`}
            className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Termin buchen
          </button>
        </div>
      </form>
    </div>
  );
}
