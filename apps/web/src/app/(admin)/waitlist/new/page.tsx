import Link from 'next/link';
import { Button, Card, CardBody, Field, Input, Select, Textarea } from '@salon-os/ui';
import { todayInZone } from '@salon-os/utils';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { createWaitlistEntry } from '../actions';

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  basePrice: string;
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
interface Loc {
  id: string;
  name: string;
}

async function loadFormData(): Promise<{
  services: Service[];
  staff: StaffRow[];
  clients: ClientRow[];
  locations: Loc[];
}> {
  const ctx = getCurrentTenant();
  const auth = { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role };
  try {
    const [svc, stf, cli, loc] = await Promise.all([
      apiFetch<{ services: Service[] }>('/v1/services', auth),
      apiFetch<{ staff: StaffRow[] }>('/v1/staff', auth),
      apiFetch<{ clients: ClientRow[] }>('/v1/clients?limit=200', auth),
      apiFetch<{ locations: Loc[] }>('/v1/locations', auth),
    ]);
    return {
      services: svc.services,
      staff: stf.staff,
      clients: cli.clients,
      locations: loc.locations,
    };
  } catch (err) {
    if (err instanceof ApiError) {
      return { services: [], staff: [], clients: [], locations: [] };
    }
    throw err;
  }
}

function inNDays(n: number): string {
  const today = todayInZone();
  const [y, m, d] = today.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(
    dt.getUTCDate(),
  ).padStart(2, '0')}`;
}

export default async function NewWaitlistPage(): Promise<React.JSX.Element> {
  const { services, staff, clients, locations } = await loadFormData();

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8">
      <Link
        href="/waitlist"
        className="text-xs text-text-muted transition-colors hover:text-text-primary"
      >
        ← Warteliste
      </Link>
      <header className="mb-6 mt-4">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
          Warteliste
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
          Neuer Eintrag
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Kundin hat angerufen und möchte benachrichtigt werden, sobald ein
          Slot frei wird.
        </p>
      </header>

      <Card>
        <CardBody>
          <form action={createWaitlistEntry} className="space-y-5">
            <Field label="Service" required>
              <Select name="serviceId" required defaultValue="">
                <option value="">— wählen —</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.durationMinutes} Min)
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Standort" required>
              <Select
                name="locationId"
                required
                defaultValue={locations[0]?.id ?? ''}
              >
                <option value="">— wählen —</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Bevorzugte Mitarbeiterin (optional)">
              <Select name="preferredStaffId" defaultValue="">
                <option value="">— keine Präferenz —</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </option>
                ))}
              </Select>
            </Field>

            <fieldset className="rounded-md border border-border p-4">
              <legend className="px-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Zeitfenster
              </legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Frühestens — Datum" required>
                  <Input
                    type="date"
                    name="earliestDate"
                    defaultValue={todayInZone()}
                    required
                  />
                </Field>
                <Field label="Uhrzeit">
                  <Input
                    type="time"
                    name="earliestTime"
                    defaultValue="09:00"
                  />
                </Field>
                <Field label="Spätestens — Datum" required>
                  <Input
                    type="date"
                    name="latestDate"
                    defaultValue={inNDays(14)}
                    required
                  />
                </Field>
                <Field label="Uhrzeit">
                  <Input
                    type="time"
                    name="latestTime"
                    defaultValue="18:00"
                  />
                </Field>
              </div>
            </fieldset>

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
                <Input type="text" name="newFirstName" placeholder="Vorname" />
                <Input type="text" name="newLastName" placeholder="Nachname" />
                <Input type="email" name="newEmail" placeholder="E-Mail (optional)" />
                <Input type="tel" name="newPhone" placeholder="Telefon (optional)" />
              </div>
              <p className="mt-2 text-xs text-text-muted">
                Wähle eine bestehende Kundin ODER fülle Vor-/Nachname unten aus.
              </p>
            </fieldset>

            <Field label="Notiz (optional)">
              <Textarea
                name="notes"
                rows={2}
                placeholder='z.B. „wünscht Neta, eher nachmittags"'
              />
            </Field>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Link href="/waitlist">
                <Button type="button" variant="ghost">
                  Abbrechen
                </Button>
              </Link>
              <Button type="submit" variant="primary">
                Auf Warteliste setzen
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
