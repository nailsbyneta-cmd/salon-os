import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button, Card, CardBody, Input, cn } from '@salon-os/ui';
import { BookingSteps } from '../../booking-steps';

const API_URL = process.env['PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface Slot {
  startAt: string;
  endAt: string;
  staffId: string;
  staffDisplayName: string;
  priceMinor: number;
  currency: string;
}

type OpeningDay =
  | { open?: string; close?: string; closed?: boolean }
  | Array<{ open: string; close: string }>;

const WEEKDAY_KEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

async function loadInfo(slug: string): Promise<{
  locations: Array<{ id: string; openingHours: unknown }>;
} | null> {
  try {
    const res = await fetch(`${API_URL}/v1/public/${slug}/info`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      locations: Array<{ id: string; openingHours: unknown }>;
    };
  } catch {
    return null;
  }
}

async function loadSlots(
  slug: string,
  serviceId: string,
  date: string,
  locationId: string,
  durationMinutes?: number,
): Promise<Slot[] | null> {
  try {
    const qs = new URLSearchParams({ date, locationId });
    if (durationMinutes) qs.set('durationMinutes', String(durationMinutes));
    const res = await fetch(
      `${API_URL}/v1/public/${slug}/services/${serviceId}/slots?${qs.toString()}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { slots: Slot[] };
    return data.slots;
  } catch {
    return null;
  }
}

/**
 * Sucht den ersten verfügbaren Slot ab `fromDate` (max 14 Tage Look-Ahead).
 * Wird gerufen wenn der ausgewählte Tag leer ist und der Customer einen
 * Quick-Jump zu nächster Verfügbarkeit braucht (Audit Pass-13 Top-3).
 */
async function loadNextSlot(
  slug: string,
  serviceId: string,
  locationId: string,
  fromDate: string,
  durationMinutes?: number,
): Promise<Slot | null> {
  try {
    const qs = new URLSearchParams({ locationId, fromDate });
    if (durationMinutes) qs.set('durationMinutes', String(durationMinutes));
    const res = await fetch(
      `${API_URL}/v1/public/${slug}/services/${serviceId}/next-slot?${qs.toString()}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { slot: Slot | null };
    return data.slot;
  } catch {
    return null;
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function nextDays(
  count: number,
): Array<{ iso: string; weekday: string; day: string; weekdayKey: string }> {
  const out: Array<{
    iso: string;
    weekday: string;
    day: string;
    weekdayKey: string;
  }> = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push({
      iso: d.toISOString().slice(0, 10),
      weekday: d.toLocaleDateString('de-CH', { weekday: 'short' }),
      day: d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' }),
      weekdayKey: WEEKDAY_KEY[d.getDay()]!,
    });
  }
  return out;
}

function isDayOpen(openingHours: unknown, weekdayKey: string): boolean {
  if (!openingHours || typeof openingHours !== 'object') return true; // unknown → annehmen offen
  const map = openingHours as Record<string, OpeningDay>;
  const e = map[weekdayKey];
  if (!e) return false;
  if (Array.isArray(e)) return e.some((i) => i.open && i.close);
  return !e.closed && !!e.open && !!e.close;
}

/** Nächster offener Tag in den nächsten 14 Tagen. ISO-String oder null. */
function findNextOpenDay(openingHours: unknown, fromIso: string): string | null {
  if (!openingHours || typeof openingHours !== 'object') return null;
  const start = new Date(`${fromIso}T00:00:00Z`);
  for (let i = 1; i <= 14; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const key = WEEKDAY_KEY[d.getUTCDay()]!;
    if (isDayOpen(openingHours, key)) return d.toISOString().slice(0, 10);
  }
  return null;
}

export default async function BookingSlots({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; serviceId: string }>;
  searchParams: Promise<{
    date?: string;
    location?: string;
    duration?: string;
    price?: string;
    options?: string;
    addons?: string;
    bundles?: string;
    staffId?: string;
  }>;
}): Promise<React.JSX.Element> {
  const { slug, serviceId } = await params;
  const sp = await searchParams;
  const { date, duration, price, staffId } = sp;

  // Falls kein location im Query: hol die erste verfügbare aus /info.
  // Vermeidet 404 wenn User von /configure ohne location-Query kommt.
  const info = await loadInfo(slug);
  const location = sp.location && sp.location.length > 0 ? sp.location : info?.locations[0]?.id;
  if (!location) notFound();

  const selectedDate = date ?? today();
  const durationMin = duration ? Number(duration) : undefined;
  const allSlots = await loadSlots(slug, serviceId, selectedDate, location, durationMin);
  if (allSlots === null) notFound();

  // Staff-Filter: wenn staffId gesetzt → nur Slots dieser Mitarbeiterin zeigen.
  // Sonst alle (Phorest-Pattern: "Egal" → alle Slots gezeigt).
  const slots = staffId ? allSlots.filter((s) => s.staffId === staffId) : allSlots;

  // Date-Navigation Suffix: erhält staffId-Filter beim Tagwechsel.
  const dateNavParams = new URLSearchParams();
  if (duration) dateNavParams.set('duration', duration);
  if (price) dateNavParams.set('price', price);
  if (staffId) dateNavParams.set('staffId', staffId);
  if (sp.options) dateNavParams.set('options', sp.options);
  if (sp.addons) dateNavParams.set('addons', sp.addons);
  if (sp.bundles) dateNavParams.set('bundles', sp.bundles);
  const dateNavSuffix = dateNavParams.toString() ? `&${dateNavParams.toString()}` : '';

  // Slot-Click Suffix: KEIN staffId — der Slot bringt seine eigene mit.
  // Sonst entstand `?staffId=A&staffId=B` Duplikat → Validation-Fehler beim Submit.
  const confirmParams = new URLSearchParams();
  if (duration) confirmParams.set('duration', duration);
  if (price) confirmParams.set('price', price);
  if (sp.options) confirmParams.set('options', sp.options);
  if (sp.addons) confirmParams.set('addons', sp.addons);
  if (sp.bundles) confirmParams.set('bundles', sp.bundles);
  const confirmSuffix = confirmParams.toString() ? `&${confirmParams.toString()}` : '';

  const openingHours = info?.locations.find((l) => l.id === location)?.openingHours ?? null;

  const selectedWeekdayKey = WEEKDAY_KEY[new Date(selectedDate).getDay()]!;
  const selectedDayOpen = isDayOpen(openingHours, selectedWeekdayKey);
  const nextOpen =
    !selectedDayOpen || slots.length === 0 ? findNextOpenDay(openingHours, selectedDate) : null;

  // Wenn keine Slots heute: such proaktiv den ersten echt verfügbaren Slot
  // (look-ahead 14 Tage). Audit Pass-13 Customer-UX-Top-3.
  const nextAvailableSlot =
    slots.length === 0
      ? await loadNextSlot(slug, serviceId, location, selectedDate, durationMin)
      : null;

  const grouped = new Map<string, Slot[]>();
  for (const s of slots) {
    const hour = new Date(s.startAt).getHours();
    const bucket = hour < 12 ? 'Vormittag' : hour < 17 ? 'Nachmittag' : 'Abend';
    if (!grouped.has(bucket)) grouped.set(bucket, []);
    grouped.get(bucket)!.push(s);
  }

  // UX-Brief Aufgabe 4.1: Single-Staff-Dedup. Wenn alle Slots derselben
  // Stylistin gehören (häufig bei Beautyneta wo Neta die einzige Nagel-
  // Designerin ist) zeigen wir den Namen 1× oben statt 9× unter jedem Slot.
  const uniqueStaff = new Map<string, string>();
  for (const s of slots) uniqueStaff.set(s.staffId, s.staffDisplayName);
  const singleStaff = uniqueStaff.size === 1 ? Array.from(uniqueStaff.values())[0]! : null;

  // UX-Brief Aufgabe 4.3: Scarcity-Signal. ≤ 3 Slots heute = Verlustangst
  // triggern (Cialdini). Nicht spammig — erst wenn wirklich knapp.
  const scarcity = slots.length > 0 && slots.length <= 3 ? slots.length : 0;

  return (
    <main className="space-y-6">
      <BookingSteps current="slot" />

      <Link
        href={`/book/${slug}`}
        className="inline-flex text-sm text-text-muted transition-colors hover:text-text-primary"
      >
        ← Zurück
      </Link>

      <header>
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
          Termin wählen
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-text-primary">
          Freie Zeiten am{' '}
          {new Date(selectedDate).toLocaleDateString('de-CH', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
          })}
        </h1>
        {price || durationMin ? (
          <p className="mt-2 text-sm tabular-nums text-text-secondary">
            Deine Auswahl: {price ? `CHF ${Number(price).toFixed(2).replace(/\.00$/, '')}` : ''}
            {price && durationMin ? ' · ' : ''}
            {durationMin ? `${durationMin} Min` : ''}
          </p>
        ) : null}
        {/* Single-Staff Dedup: Stylistin namentlich (Audit-Pass-Erfahrung —
            wenn 9× derselbe Name unter den Slots steht, ist das visuelles
            Rauschen ohne Signal). */}
        {singleStaff ? (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">
            <span aria-hidden>✦</span>
            Bei {singleStaff}
          </p>
        ) : null}
        {/* Scarcity-Signal — Loss-Aversion-Trigger. Nicht spammig: nur ≤3. */}
        {scarcity > 0 ? (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning animate-[scarcityPulse_2s_ease-in-out_infinite]">
            <span aria-hidden>🔥</span>
            Nur noch {scarcity} {scarcity === 1 ? 'Platz' : 'Plätze'} heute frei
          </p>
        ) : null}
      </header>

      <div className="space-y-3">
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex gap-2">
            {nextDays(7).map((d) => {
              const active = d.iso === selectedDate;
              const open = isDayOpen(openingHours, d.weekdayKey);
              return (
                <Link
                  key={d.iso}
                  href={`/book/${slug}/service/${serviceId}?location=${location}&date=${d.iso}${dateNavSuffix}`}
                  aria-disabled={!open}
                  className={cn(
                    'flex min-w-[44px] flex-col items-center rounded-md border px-2 py-2 text-center transition-all duration-200 sm:min-w-[68px] sm:px-3',
                    active
                      ? 'border-accent bg-accent text-accent-foreground shadow-glow'
                      : open
                        ? 'border-border bg-surface text-text-secondary hover:-translate-y-0.5 hover:border-accent hover:text-text-primary hover:shadow-md active:translate-y-0 active:scale-[0.97]'
                        : 'border-border bg-surface/50 text-text-muted opacity-60',
                  )}
                >
                  <span className="text-[10px] font-medium uppercase tracking-wider">
                    {d.weekday}
                  </span>
                  <span className="mt-0.5 text-sm font-semibold tabular-nums">{d.day}</span>
                  <span className="text-[9px] font-medium uppercase tracking-wider opacity-75">
                    {open ? '' : 'Zu'}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
        <form method="get" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="location" value={location} />
          <Input
            type="date"
            name="date"
            defaultValue={selectedDate}
            className="w-44"
            aria-label="Anderes Datum wählen"
          />
          <Button type="submit" variant="secondary" size="sm">
            Anderes Datum
          </Button>
        </form>
      </div>

      {slots.length === 0 ? (
        <Card elevation="flat" className="bg-accent/5">
          <CardBody className="space-y-4 py-10 text-center">
            <div
              aria-hidden
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-2xl"
            >
              {selectedDayOpen ? '📅' : '🌙'}
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-text-primary">
                {selectedDayOpen ? 'Alles ausgebucht' : 'Heute geschlossen'}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {selectedDayOpen
                  ? 'An diesem Tag sind keine Termine mehr frei.'
                  : 'Wähl einen anderen Tag oder schau morgen vorbei.'}
              </p>
            </div>
            {nextAvailableSlot ? (
              <Link
                href={`/book/${slug}/service/${serviceId}?location=${location}&date=${nextAvailableSlot.startAt.slice(0, 10)}${dateNavSuffix}`}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.98]"
              >
                ⚡ Nächster freier Termin:{' '}
                {new Date(nextAvailableSlot.startAt).toLocaleDateString('de-CH', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                })}{' '}
                ·{' '}
                {new Date(nextAvailableSlot.startAt).toLocaleTimeString('de-CH', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {' →'}
              </Link>
            ) : nextOpen ? (
              <Link
                href={`/book/${slug}/service/${serviceId}?location=${location}&date=${nextOpen}${dateNavSuffix}`}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.98]"
              >
                Nächster offener Tag:{' '}
                {new Date(nextOpen).toLocaleDateString('de-CH', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                })}{' '}
                →
              </Link>
            ) : null}
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([label, list]) => (
            <section key={label}>
              <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                {label}
              </h2>
              <div className="grid grid-cols-2 gap-2 min-[380px]:grid-cols-3 sm:grid-cols-4">
                {list.map((s) => (
                  <Link
                    key={`${s.staffId}-${s.startAt}`}
                    href={`/book/${slug}/confirm?serviceId=${serviceId}&locationId=${location}&staffId=${s.staffId}&startAt=${encodeURIComponent(s.startAt)}${confirmSuffix}`}
                    className="group flex flex-col items-center rounded-lg border border-border bg-surface px-3 py-3 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:bg-accent/5 hover:shadow-md active:scale-[0.98] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <div className="font-display text-base font-semibold tabular-nums text-text-primary group-hover:text-accent">
                      {new Date(s.startAt).toLocaleTimeString('de-CH', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    {/* Bei Single-Staff zeigen wir den Namen 1× oben in der
                        Header-Pill und sparen visuelles Rauschen. */}
                    {singleStaff ? null : (
                      <div className="mt-0.5 w-full truncate text-[11px] text-text-secondary">
                        {s.staffDisplayName}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <style>{`
        @keyframes scarcityPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.02); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[scarcityPulse_2s_ease-in-out_infinite\\] {
            animation: none !important;
          }
        }
      `}</style>
    </main>
  );
}
