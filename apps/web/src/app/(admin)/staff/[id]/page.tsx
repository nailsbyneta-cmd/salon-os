import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  Field,
  Input,
  Select,
  Textarea,
} from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { todayInZone, toLocalIso } from '@salon-os/utils';
import { getCurrentTenant } from '@/lib/tenant';
import { updateStaff } from '../actions';

interface StaffFull {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  email: string;
  phone: string | null;
  role: string;
  employmentType: string;
  color: string | null;
  photoUrl: string | null;
  bio: string | null;
  active: boolean;
  serviceIds: string[];
}

interface ServiceRow {
  id: string;
  name: string;
  durationMinutes: number;
  basePrice: string;
}

interface WeekStats {
  bookedMinutes: number;
  completedMinutes: number;
  apptCount: number;
  revenueChf: number;
  daysCovered: number; // Arbeitstage dieser Woche mit ≥1 Termin
}

function mondayOfCurrentZurichWeek(): {
  fromIso: string;
  toIso: string;
  mondayIso: string;
  sundayIso: string;
} {
  // Parse heutiges CH-Datum, rechne zurück auf Montag. toLocalIso() gibt den
  // echten DST-aware Offset zurück (+01:00 Winter / +02:00 Sommer) — vorher
  // war der Offset hardcoded und kippte zwischen Oktober und März.
  const todayCh = todayInZone();
  const [y, m, d] = todayCh.split('-').map(Number);
  const pivot = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1));
  const weekday = pivot.getUTCDay();
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  const monday = new Date(pivot);
  monday.setUTCDate(pivot.getUTCDate() - daysSinceMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const mondayIso = `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, '0')}-${String(monday.getUTCDate()).padStart(2, '0')}`;
  const sundayIso = `${sunday.getUTCFullYear()}-${String(sunday.getUTCMonth() + 1).padStart(2, '0')}-${String(sunday.getUTCDate()).padStart(2, '0')}`;
  return {
    fromIso: toLocalIso(mondayIso, '00:00', 'Europe/Zurich'),
    // toLocalIso liefert HH:MM:00 — für die Upper-Bound akzeptieren wir
    // die Minute, ein Termin mit exakt 23:59:00 CH Start ist erlaubt.
    toIso: toLocalIso(sundayIso, '23:59', 'Europe/Zurich'),
    mondayIso,
    sundayIso,
  };
}

function zurichDayKey(iso: string): string {
  // YYYY-MM-DD in Europe/Zurich (damit Montag 00:30 CH als Montag zählt,
  // nicht als Sonntag wie beim naiven slice(0,10) auf UTC-ISO).
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich',
  }).format(new Date(iso));
}

// Whitelist statt Blacklist — defensiv gegen zukünftige Status-Werte
// (WAITLIST/DRAFT/REQUESTED etc.). Nur diese 4 zählen als 'gebuchter Slot'.
const BOOKED_STATUSES = new Set(['BOOKED', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE', 'COMPLETED']);

async function loadWeekStats(staffId: string): Promise<WeekStats> {
  const ctx = getCurrentTenant();
  const { fromIso, toIso } = mondayOfCurrentZurichWeek();
  const qs = new URLSearchParams({ staffId, from: fromIso, to: toIso });
  try {
    const res = await apiFetch<{
      appointments: Array<{
        id: string;
        startAt: string;
        status: string;
        items: Array<{ duration: number; price: string }>;
      }>;
    }>(`/v1/appointments?${qs.toString()}`, {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
    let bookedMinutes = 0;
    let completedMinutes = 0;
    let apptCount = 0;
    let revenueChf = 0;
    const activeDays = new Set<string>();
    for (const a of res.appointments) {
      if (!BOOKED_STATUSES.has(a.status)) continue;
      const min = a.items.reduce((s, i) => s + (i.duration ?? 0), 0);
      const ch = a.items.reduce((s, i) => s + Number(i.price), 0);
      bookedMinutes += min;
      apptCount += 1;
      // Zurich-Day-Key statt UTC-slice, sonst kippen Randzeiten
      // (Mo 00:30 CH = So 23:30 UTC) in den falschen Tag.
      activeDays.add(zurichDayKey(a.startAt));
      if (a.status === 'COMPLETED') {
        completedMinutes += min;
        revenueChf += ch;
      }
    }
    return {
      bookedMinutes,
      completedMinutes,
      apptCount,
      revenueChf,
      daysCovered: activeDays.size,
    };
  } catch (err) {
    // Auth-Fehler (401/403) sollten den Admin auf Login leiten, nicht als
    // 'Null-Daten' maskiert werden.
    if (err instanceof ApiError) {
      if (err.status === 401 || err.status === 403) throw err;
      return {
        bookedMinutes: 0,
        completedMinutes: 0,
        apptCount: 0,
        revenueChf: 0,
        daysCovered: 0,
      };
    }
    throw err;
  }
}

function fmtDateRange(mondayIso: string, sundayIso: string): string {
  const mon = new Date(`${mondayIso}T12:00:00Z`);
  const sun = new Date(`${sundayIso}T12:00:00Z`);
  const sameMonth = mondayIso.slice(0, 7) === sundayIso.slice(0, 7);
  const monFmt = mon.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: sameMonth ? undefined : 'short',
    timeZone: 'Europe/Zurich',
  });
  const sunFmt = sun.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: 'short',
    timeZone: 'Europe/Zurich',
  });
  return `${monFmt} – ${sunFmt}`;
}

function fmtHoursMin(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} Min`;
  if (m === 0) return `${h} Std`;
  return `${h} Std ${m} Min`;
}

async function load(id: string): Promise<{
  staff: StaffFull | null;
  allServices: ServiceRow[];
}> {
  const ctx = getCurrentTenant();
  const auth = { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role };
  try {
    const [staff, services] = await Promise.all([
      apiFetch<StaffFull>(`/v1/staff/${id}`, auth),
      apiFetch<{ services: ServiceRow[] }>('/v1/services', auth),
    ]);
    return { staff, allServices: services.services };
  } catch (err) {
    if (err instanceof ApiError) {
      return { staff: null, allServices: [] };
    }
    throw err;
  }
}

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const [{ staff: s, allServices }, weekStats] = await Promise.all([load(id), loadWeekStats(id)]);
  if (!s) notFound();

  const save = updateStaff.bind(null, id);
  const displayName = s.displayName ?? `${s.firstName} ${s.lastName}`;
  const assignedSet = new Set(s.serviceIds);

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      <Link
        href="/staff"
        className="text-xs text-text-muted transition-colors hover:text-text-primary"
      >
        ← Team
      </Link>

      <header className="mb-6 mt-4 flex flex-wrap items-center gap-4">
        <Avatar name={displayName} color={s.color} size="xl" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">Profil</p>
          <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
            {displayName}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Badge tone={s.active ? 'success' : 'neutral'} dot>
              {s.active ? 'Aktiv' : 'Inaktiv'}
            </Badge>
            <Badge tone="neutral">{s.role}</Badge>
          </div>
        </div>
        <Link href={`/staff/${s.id}/shifts`}>
          <Button variant="secondary" size="sm">
            Arbeitszeiten →
          </Button>
        </Link>
      </header>

      {weekStats.apptCount > 0
        ? (() => {
            const { mondayIso, sundayIso } = mondayOfCurrentZurichWeek();
            const dateRange = fmtDateRange(mondayIso, sundayIso);
            const n = Math.max(weekStats.daysCovered, 1);
            const avgBookedMin = Math.round(weekStats.bookedMinutes / n);
            const avgCompletedMin = Math.round(weekStats.completedMinutes / n);
            const avgRevenue = Math.round(weekStats.revenueChf / n);
            return (
              <Card className="mb-6" elevation="flat">
                <CardBody>
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Diese Woche{' '}
                    <span className="text-[11px] font-normal normal-case text-text-muted">
                      · {dateRange}
                    </span>
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-text-muted">
                        Termine
                      </div>
                      <div className="mt-0.5 text-2xl font-display font-semibold tabular-nums">
                        {weekStats.apptCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-text-muted">
                        Gebucht
                      </div>
                      <div className="mt-0.5 text-2xl font-display font-semibold tabular-nums">
                        {fmtHoursMin(weekStats.bookedMinutes)}
                      </div>
                      <div className="mt-0.5 text-[10px] text-text-muted">
                        Ø {fmtHoursMin(avgBookedMin)}/Tag
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-text-muted">
                        Abgeschlossen
                      </div>
                      <div className="mt-0.5 text-2xl font-display font-semibold tabular-nums">
                        {fmtHoursMin(weekStats.completedMinutes)}
                      </div>
                      <div className="mt-0.5 text-[10px] text-text-muted">
                        Ø {fmtHoursMin(avgCompletedMin)}/Tag
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-text-muted">
                        Umsatz
                      </div>
                      <div className="mt-0.5 text-2xl font-display font-semibold tabular-nums">
                        {weekStats.revenueChf.toLocaleString('de-CH', {
                          maximumFractionDigits: 0,
                        })}
                        <span className="ml-1 text-sm font-normal text-text-muted">CHF</span>
                      </div>
                      <div className="mt-0.5 text-[10px] text-text-muted">
                        erledigt · Ø{' '}
                        {avgRevenue.toLocaleString('de-CH', {
                          maximumFractionDigits: 0,
                        })}{' '}
                        CHF/Tag
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })()
        : null}

      <Card>
        <CardBody>
          <form action={save} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Vorname" required>
                <Input name="firstName" defaultValue={s.firstName} required />
              </Field>
              <Field label="Nachname" required>
                <Input name="lastName" defaultValue={s.lastName} required />
              </Field>
            </div>

            <Field label="Anzeigename (optional)" hint="Fällt zurück auf Vor + Nachname wenn leer">
              <Input
                name="displayName"
                defaultValue={s.displayName ?? ''}
                placeholder={`${s.firstName} ${s.lastName}`}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="E-Mail" required>
                <Input type="email" name="email" defaultValue={s.email} required />
              </Field>
              <Field label="Telefon">
                <Input type="tel" name="phone" defaultValue={s.phone ?? ''} />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Rolle" required>
                <Select name="role" defaultValue={s.role} required>
                  <option value="OWNER">Inhaberin</option>
                  <option value="MANAGER">Managerin</option>
                  <option value="FRONT_DESK">Empfang</option>
                  <option value="STYLIST">Stylistin</option>
                  <option value="BOOTH_RENTER">Mieterin</option>
                  <option value="ASSISTANT">Assistentin</option>
                  <option value="TRAINEE">Auszubildende</option>
                </Select>
              </Field>
              <Field label="Anstellung" required>
                <Select name="employmentType" defaultValue={s.employmentType} required>
                  <option value="EMPLOYEE">Angestellt</option>
                  <option value="CONTRACTOR">Freelance</option>
                  <option value="BOOTH_RENTER">Stuhlmiete</option>
                  <option value="COMMISSION">Provision</option>
                  <option value="OWNER">Inhaberin</option>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Kalender-Farbe"
                hint="HEX wie #e91e63 — Farbstreifen in Kalender-Karten"
              >
                <Input name="color" defaultValue={s.color ?? ''} placeholder="#e91e63" />
              </Field>
              <Field label="Foto-URL" hint="Erscheint auf Public-Buchungs-Seite">
                <Input
                  name="photoUrl"
                  type="url"
                  defaultValue={s.photoUrl ?? ''}
                  placeholder="https://…/foto.jpg"
                />
              </Field>
            </div>

            <Field label="Kurz-Bio" hint="Zeigt auf Public-Buchungs-Seite unter ‚Unser Team'">
              <Textarea
                name="bio"
                rows={3}
                defaultValue={s.bio ?? ''}
                placeholder="Seit 2019 bei Beautycenter, Expertin für Brauen-Laminierung…"
              />
            </Field>

            <fieldset className="rounded-md border border-border p-4">
              <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                Kann diese Services ausführen
              </legend>
              {allServices.length === 0 ? (
                <p className="text-xs text-text-muted">
                  Keine Services angelegt. Gehe zu{' '}
                  <Link href="/services/new" className="text-accent hover:underline">
                    /services
                  </Link>{' '}
                  um welche anzulegen.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {allServices.map((svc) => (
                    <label
                      key={svc.id}
                      className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm text-text-secondary hover:bg-surface-raised"
                    >
                      <input
                        type="checkbox"
                        name="serviceIds"
                        value={svc.id}
                        defaultChecked={assignedSet.has(svc.id)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block truncate text-text-primary">{svc.name}</span>
                        <span className="block text-[11px] text-text-muted">
                          {svc.durationMinutes} Min · {Number(svc.basePrice).toFixed(2)} CHF
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                name="active"
                defaultChecked={s.active}
                className="h-4 w-4 accent-accent"
              />
              <span>Aktiv — erscheint in Kalender-Spalten + Online-Booking</span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Link href="/staff">
                <Button type="button" variant="ghost">
                  Abbrechen
                </Button>
              </Link>
              <Button type="submit" variant="primary">
                Speichern
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
