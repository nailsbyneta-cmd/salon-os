import Link from 'next/link';
import { notFound } from 'next/navigation';

const API_URL = process.env['PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface Location {
  id: string;
  name: string;
  city: string | null;
  slug: string;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  basePrice: string; // Decimal serialized as string
}

async function loadTenantData(slug: string): Promise<{
  locations: Location[];
  services: Service[];
} | null> {
  try {
    const [locRes, svcRes] = await Promise.all([
      fetch(`${API_URL}/v1/public/${slug}/locations`, { cache: 'no-store' }),
      fetch(`${API_URL}/v1/public/${slug}/services`, { cache: 'no-store' }),
    ]);
    if (!locRes.ok || !svcRes.ok) return null;
    const locData = (await locRes.json()) as { locations: Location[] };
    const svcData = (await svcRes.json()) as { services: Service[] };
    return { locations: locData.locations, services: svcData.services };
  } catch {
    return null;
  }
}

export default async function BookingStart({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const data = await loadTenantData(slug);
  if (!data) notFound();
  const { locations, services } = data;

  return (
    <main className="space-y-8">
      <header className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
          Online buchen
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Termin bei {slug.replace(/-/g, ' ')}
        </h1>
      </header>

      {locations.length > 1 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Standort wählen
          </h2>
          <div className="grid gap-2">
            {locations.map((loc) => (
              <Link
                key={loc.id}
                href={`/book/${slug}/${loc.slug}`}
                className="rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-400"
              >
                <div className="font-medium">{loc.name}</div>
                {loc.city ? <div className="text-sm text-neutral-500">{loc.city}</div> : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Dienstleistung wählen
        </h2>
        <div className="grid gap-2">
          {services.map((s) => (
            <Link
              key={s.id}
              href={`/book/${slug}/service/${s.id}?location=${locations[0]?.id ?? ''}`}
              className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-400"
            >
              <div>
                <div className="font-medium">{s.name}</div>
                {s.description ? (
                  <div className="mt-0.5 text-sm text-neutral-500">{s.description}</div>
                ) : null}
                <div className="mt-1 text-xs text-neutral-400">{s.durationMinutes} Min</div>
              </div>
              <div className="text-sm font-medium tabular-nums">
                {Number(s.basePrice).toFixed(2)} CHF
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="pt-8 text-center text-xs text-neutral-400">
        Powered by SALON OS
      </footer>
    </main>
  );
}
