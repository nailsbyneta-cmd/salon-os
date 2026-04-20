import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button, Card, CardBody, Input } from '@salon-os/ui';

const API_URL = process.env['PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface Slot {
  startAt: string;
  endAt: string;
  staffId: string;
  staffDisplayName: string;
  priceMinor: number;
  currency: string;
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
  const slots = await loadSlots(slug, serviceId, selectedDate, location);
  if (slots === null) notFound();

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

      <form method="get" className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="location" value={location} />
        <Input
          type="date"
          name="date"
          defaultValue={selectedDate}
          className="w-44"
        />
        <Button type="submit" variant="secondary">
          Anzeigen
        </Button>
      </form>

      {slots.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center text-sm text-text-secondary">
            An diesem Tag sind keine Termine frei. Wähle ein anderes Datum.
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
