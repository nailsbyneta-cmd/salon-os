import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardBody, PriceDisplay } from '@salon-os/ui';

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
  basePrice: string;
  categoryId: string;
}

interface Category {
  id: string;
  name: string;
}

async function loadTenantData(slug: string): Promise<{
  locations: Location[];
  services: Service[];
  categories: Category[];
} | null> {
  try {
    const [locRes, svcRes, catRes] = await Promise.all([
      fetch(`${API_URL}/v1/public/${slug}/locations`, { cache: 'no-store' }),
      fetch(`${API_URL}/v1/public/${slug}/services`, { cache: 'no-store' }),
      fetch(`${API_URL}/v1/public/${slug}/service-categories`, {
        cache: 'no-store',
      }).catch(() => null),
    ]);
    if (!locRes.ok || !svcRes.ok) return null;
    const locData = (await locRes.json()) as { locations: Location[] };
    const svcData = (await svcRes.json()) as { services: Service[] };
    const catData = catRes && catRes.ok
      ? ((await catRes.json()) as { categories: Category[] })
      : { categories: [] };
    return {
      locations: locData.locations,
      services: svcData.services,
      categories: catData.categories,
    };
  } catch {
    return null;
  }
}

function formatSalonName(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function BookingStart({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const data = await loadTenantData(slug);
  if (!data) notFound();
  const { locations, services, categories } = data;

  const catById = new Map(categories.map((c) => [c.id, c.name]));
  const byCategory = new Map<string, Service[]>();
  for (const s of services) {
    const key = catById.get(s.categoryId) ?? 'Services';
    const bucket = byCategory.get(key) ?? [];
    bucket.push(s);
    byCategory.set(key, bucket);
  }

  return (
    <main className="space-y-8">
      <header className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
          Online buchen
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
          {formatSalonName(slug)}
        </h1>
        {locations[0] ? (
          <p className="mt-2 text-sm text-text-secondary">
            {locations[0].name}
            {locations[0].city ? ` · ${locations[0].city}` : ''}
          </p>
        ) : null}
      </header>

      {locations.length > 1 ? (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Standort wählen
          </h2>
          <div className="grid gap-2">
            {locations.map((loc) => (
              <Link key={loc.id} href={`/book/${slug}/${loc.slug}`}>
                <Card elevation="hoverable">
                  <CardBody>
                    <div className="font-medium text-text-primary">{loc.name}</div>
                    {loc.city ? (
                      <div className="mt-0.5 text-sm text-text-muted">{loc.city}</div>
                    ) : null}
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {Array.from(byCategory.entries()).map(([catName, items]) => (
        <section key={catName}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            {catName}
          </h2>
          <div className="grid gap-2">
            {items.map((s) => (
              <Link
                key={s.id}
                href={`/book/${slug}/service/${s.id}?location=${locations[0]?.id ?? ''}`}
                className="group"
              >
                <Card elevation="hoverable">
                  <CardBody className="flex items-center justify-between gap-4 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-text-primary">{s.name}</div>
                      {s.description ? (
                        <div className="mt-0.5 text-sm text-text-secondary">
                          {s.description}
                        </div>
                      ) : null}
                      <div className="mt-1.5 text-xs text-text-muted">
                        {s.durationMinutes} Min
                      </div>
                    </div>
                    <PriceDisplay amount={s.basePrice} size="lg" />
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <footer className="pt-8 text-center text-[11px] tracking-wider text-text-muted">
        Powered by <span className="font-semibold">SALON OS</span>
      </footer>
    </main>
  );
}
