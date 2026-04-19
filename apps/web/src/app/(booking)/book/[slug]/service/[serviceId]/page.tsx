import Link from 'next/link';
import { notFound } from 'next/navigation';

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
    const hour = new Date(s.startAt).toISOString().slice(11, 13);
    const bucket = hour < '12' ? 'Vormittag' : hour < '17' ? 'Nachmittag' : 'Abend';
    if (!grouped.has(bucket)) grouped.set(bucket, []);
    grouped.get(bucket)!.push(s);
  }

  return (
    <main className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/book/${slug}`}
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          ← Zurück
        </Link>
      </div>

      <header>
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
          Termin wählen
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Freie Zeiten am {new Date(selectedDate).toLocaleDateString('de-CH', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
          })}
        </h1>
      </header>

      <form method="get" className="flex items-center gap-2">
        <input type="hidden" name="location" value={location} />
        <input
          type="date"
          name="date"
          defaultValue={selectedDate}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Anzeigen
        </button>
      </form>

      {slots.length === 0 ? (
        <p className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500">
          An diesem Tag sind keine Termine frei. Wähle ein anderes Datum.
        </p>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([label, list]) => (
            <section key={label}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-neutral-500">
                {label}
              </h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {list.map((s) => (
                  <Link
                    key={`${s.staffId}-${s.startAt}`}
                    href={`/book/${slug}/confirm?serviceId=${serviceId}&locationId=${location}&staffId=${s.staffId}&startAt=${encodeURIComponent(s.startAt)}`}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-center text-sm hover:border-neutral-900"
                  >
                    <div className="font-medium tabular-nums">
                      {new Date(s.startAt).toLocaleTimeString('de-CH', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-neutral-500">
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
