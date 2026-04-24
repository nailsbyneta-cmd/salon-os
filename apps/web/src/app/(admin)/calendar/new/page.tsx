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

function zurichNowParts(): { date: string; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const pick = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';
  return {
    date: `${pick('year')}-${pick('month')}-${pick('day')}`,
    hour: Number(pick('hour')),
    minute: Number(pick('minute')),
  };
}

function nextQuarterHour(h: number, m: number): { time: string; dayOffset: number } {
  // Rundet auf nächsten 15-Min-Slot auf. 10:03 → 10:15, 10:14 → 10:15,
  // 10:15 → 10:30 (nicht zurück auf 10:15, sonst kein Vorlauf).
  // 23:46-23:59 → 00:00/nächster Tag, dayOffset=1 damit das Datum mitwandert
  // und die Buchung nicht in der Vergangenheit landet.
  const minutesTotal = h * 60 + m + 1;
  const rounded = Math.ceil(minutesTotal / 15) * 15;
  const dayOffset = Math.floor(rounded / (24 * 60));
  const hh = Math.floor(rounded / 60) % 24;
  const mm = rounded % 60;
  return {
    time: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
    dayOffset,
  };
}

function addDays(isoDate: string, days: number): string {
  if (days === 0) return isoDate;
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(
    dt.getUTCDate(),
  ).padStart(2, '0')}`;
}

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    time?: string;
    staffId?: string;
    clientId?: string;
    serviceId?: string;
    walkin?: string;
  }>;
}): Promise<React.JSX.Element> {
  const {
    date,
    time,
    staffId: preselectedStaff,
    clientId: preselectedClient,
    serviceId: preselectedService,
    walkin,
  } = await searchParams;
  const { services, staff, clients } = await loadFormData();
  const isWalkin = walkin === '1' || walkin === 'true';
  const zurich = zurichNowParts();
  // Walk-in: nächster Viertelstunden-Slot in Zurich-Zeit. Sonst (wenn kein
  // ?time=) derselbe Default — war bisher hardcoded '10:00'.
  const nextSlot = nextQuarterHour(zurich.hour, zurich.minute);
  const day = date ?? addDays(zurich.date, nextSlot.dayOffset);
  const defaultTime = time ?? nextSlot.time;

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8">
      <Link
        href={`/calendar?date=${day}`}
        className="text-xs text-text-muted transition-colors hover:text-text-primary"
      >
        ← Zum Tagesplan
      </Link>
      <header className="mb-6 mt-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">Kalender</p>
        <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
          {isWalkin ? 'Walk-in' : 'Neuer Termin'}
        </h1>
        {isWalkin ? (
          <p className="mt-1 text-sm text-text-secondary">
            Startzeit auf {defaultTime} vorbelegt (nächste Viertelstunde). Service + Kundin wählen,
            fertig.
          </p>
        ) : null}
      </header>

      <Card>
        <CardBody>
          <form action={createAppointment} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Datum" required>
                <Input type="date" name="date" defaultValue={day} required />
              </Field>
              <Field label="Uhrzeit" required>
                <Input type="time" name="time" defaultValue={defaultTime} step="900" required />
              </Field>
            </div>

            <Field label="Service" required>
              <Select name="serviceId" required defaultValue={preselectedService ?? ''}>
                <option value="">— wählen —</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.durationMinutes} Min · {Number(s.basePrice).toFixed(2)} CHF)
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Mitarbeiterin" required>
              <Select name="staffId" required defaultValue={preselectedStaff ?? ''}>
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
                <Select name="clientId" defaultValue={preselectedClient ?? ''}>
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
