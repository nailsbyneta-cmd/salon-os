import Link from 'next/link';
import { Button, Card, CardBody, Field, Input, Select } from '@salon-os/ui';
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
  searchParams: Promise<{ date?: string; time?: string }>;
}): Promise<React.JSX.Element> {
  const { date, time } = await searchParams;
  const { services, staff, clients } = await loadFormData();
  const day = date ?? todayIso();
  const defaultTime = time ?? '10:00';

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link
        href={`/calendar?date=${day}`}
        className="text-xs text-text-muted transition-colors hover:text-text-primary"
      >
        ← Zum Tagesplan
      </Link>
      <header className="mb-6 mt-4">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
          Kalender
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Neuer Termin
        </h1>
      </header>

      <Card>
        <CardBody>
          <form action={createAppointment} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Datum" required>
                <Input type="date" name="date" defaultValue={day} required />
              </Field>
              <Field label="Uhrzeit" required>
                <Input
                  type="time"
                  name="time"
                  defaultValue={defaultTime}
                  step="900"
                  required
                />
              </Field>
            </div>

            <Field label="Service" required>
              <Select name="serviceId" required defaultValue="">
                <option value="">— wählen —</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.durationMinutes} Min · {Number(s.basePrice).toFixed(2)} CHF)
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Mitarbeiterin" required>
              <Select name="staffId" required defaultValue="">
                <option value="">— wählen —</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </option>
                ))}
              </Select>
            </Field>

            <fieldset className="rounded-md border border-border p-4">
              <legend className="px-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Kundin
              </legend>
              <Field label="Bestehende Kundin">
                <Select name="clientId" defaultValue="">
                  <option value="">— neue Kundin anlegen —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Input type="text" name="clientFirstName" placeholder="Vorname" />
                <Input type="text" name="clientLastName" placeholder="Nachname" />
                <Input type="email" name="clientEmail" placeholder="E-Mail (optional)" />
                <Input type="tel" name="clientPhone" placeholder="Telefon (optional)" />
              </div>
              <p className="mt-2 text-xs text-text-muted">
                Wähle eine bestehende Kundin ODER fülle Vor-/Nachname unten aus.
              </p>
            </fieldset>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Link href={`/calendar?date=${day}`}>
                <Button type="button" variant="ghost">
                  Abbrechen
                </Button>
              </Link>
              <Button type="submit" variant="primary">
                Termin buchen
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
