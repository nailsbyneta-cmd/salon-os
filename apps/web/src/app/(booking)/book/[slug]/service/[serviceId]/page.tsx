import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button, Card, CardBody, Input, cn } from '@salon-os/ui';

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
): Promise<Slot[] | null> {
  try {
    const res = await fetch(
      `${API_URL}/v1/public/${slug}/services/${serviceId}/slots?date=${date}&locationId=${locationId}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { slots: Slot[] };
    return data.slots;
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
function findNextOpenDay(
  openingHours: unknown,
  fromIso: string,
): string | null {
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
  searchParams: Promise<{ date?: string; location?: string }>;
}): Promise<React.JSX.Element> {
  const { slug, serviceId } = await params;
  const { date, location } = await searchParams;
  if (!location) notFound();

  const selectedDate = date ?? today();
  const [slots, info] = await Promise.all([
    loadSlots(slug, serviceId, selectedDate, location),
    loadInfo(slug),
  ]);
  if (slots === null) notFound();

  const openingHours =
    info?.locations.find((l) => l.id === location)?.openingHours ?? null;

  const selectedWeekdayKey = WEEKDAY_KEY[new Date(selectedDate).getDay()]!;
  const selectedDayOpen = isDayOpen(openingHours, selectedWeekdayKey);
  const nextOpen = !selectedDayOpen || slots.length === 0
    ? findNextOpenDay(openingHours, selectedDate)
    : null;

  const grouped = new Map<string, Slot[]>();
  for (const s of slots) {
    const hour = new Date(s.startAt).getHours();
    const bucket = hour < 12 ? 'Vormittag' : hour < 17 ? 'Nachmittag' : 'Abend';
    if (!grouped.has(bucket)) grouped.set(bucket, []);
    grouped.get(bucket)!.push(s);
  }

  return (
    <main className="space-y-6">
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
                  href={`/book/${slug}/service/${serviceId}?location=${location}&date=${d.iso}`}
                  aria-disabled={!open}
                  className={cn(
                    'flex min-w-[68px] flex-col items-center rounded-md border px-3 py-2 text-center transition-colors',
                    active
                      ? 'border-accent bg-accent text-accent-foreground shadow-sm'
                      : open
                        ? 'border-border bg-surface text-text-secondary hover:border-accent hover:text-text-primary'
                        : 'border-border bg-surface/50 text-text-muted opacity-60',
                  )}
                >
                  <span className="text-[10px] font-medium uppercase tracking-wider">
                    {d.weekday}
                  </span>
                  <span className="mt-0.5 text-sm font-semibold tabular-nums">
                    {d.day}
                  </span>
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
        <Card>
          <CardBody className="space-y-3 py-8 text-center">
            <p className="text-sm text-text-secondary">
              {selectedDayOpen
                ? 'An diesem Tag sind keine Termine frei.'
                : 'An diesem Tag geschlossen.'}
            </p>
            {nextOpen ? (
              <Link
                href={`/book/${slug}/service/${serviceId}?location=${location}&date=${nextOpen}`}
                className="inline-flex text-sm font-medium text-accent hover:underline"
              >
                → Nächster freier Tag:{' '}
                {new Date(nextOpen).toLocaleDateString('de-CH', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                })}
              </Link>
            ) : null}
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([label, list]) => (
            <section key={label}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                {label}
              </h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {list.map((s) => (
                  <Link
                    key={`${s.staffId}-${s.startAt}`}
                    href={`/book/${slug}/confirm?serviceId=${serviceId}&locationId=${location}&staffId=${s.staffId}&startAt=${encodeURIComponent(s.startAt)}`}
                    className="group flex flex-col items-center rounded-lg border border-border bg-surface px-3 py-3 text-center shadow-sm transition-all hover:-translate-y-[1px] hover:border-accent hover:bg-accent/5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <div className="text-base font-semibold tabular-nums text-text-primary group-hover:text-accent">
                      {new Date(s.startAt).toLocaleTimeString('de-CH', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <div className="mt-0.5 w-full truncate text-[11px] text-text-secondary">
                      {s.staffDisplayName}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
