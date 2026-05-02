import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

const API_URL = process.env['PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface PublicProduct {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  description: string | null;
  retailCents: number;
  stockLevel: number;
  inStock: boolean;
}

async function loadProducts(slug: string): Promise<PublicProduct[] | null> {
  try {
    const res = await fetch(`${API_URL}/v1/store/${slug}/products`, {
      cache: 'no-store',
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = (await res.json()) as { products: PublicProduct[] };
    return data.products;
  } catch (err) {
    console.error('[store/loadProducts]', slug, err);
    return null;
  }
}

function formatChf(cents: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Shop — ${slug}`,
    description: 'Retail-Produkte direkt beim Salon bestellen.',
  };
}

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const products = await loadProducts(slug);

  if (products === null) notFound();

  // Group by brand for a nicer layout — ungrouped products go under null key
  const byBrand = new Map<string, PublicProduct[]>();
  for (const p of products) {
    const key = p.brand ?? '';
    const bucket = byBrand.get(key) ?? [];
    bucket.push(p);
    byBrand.set(key, bucket);
  }
  const brands = Array.from(byBrand.entries()).sort(([a], [b]) =>
    a === '' ? 1 : b === '' ? -1 : a.localeCompare(b),
  );

  return (
    <main className="space-y-10">
      {/* Header */}
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-accent">
          Online Shop
        </p>
        <h1 className="font-display text-3xl font-light tracking-tight text-text-primary md:text-4xl">
          Unsere Produkte
        </h1>
        <p className="text-sm text-text-secondary">Professionelle Salon-Produkte zum Mitnehmen.</p>
      </header>

      {/* Empty state */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface py-20 text-center">
          <span className="mb-3 text-4xl" aria-hidden>
            🛍️
          </span>
          <p className="text-base font-medium text-text-primary">Noch keine Produkte verfügbar</p>
          <p className="mt-1 text-sm text-text-secondary">
            Schau bald wieder vorbei — unser Shop wird laufend erweitert.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {brands.map(([brand, items]) => (
            <section key={brand || '__ungrouped'}>
              {brand ? (
                <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-accent">
                  {brand}
                </h2>
              ) : null}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {items.map((product) => (
                  <article
                    key={product.id}
                    className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
                  >
                    {/* Placeholder image area — Phase 3 will add real product images */}
                    <div
                      className="flex h-36 items-center justify-center bg-surface-raised text-3xl"
                      aria-hidden
                    >
                      🧴
                    </div>

                    <div className="flex flex-1 flex-col gap-1.5 p-3">
                      {/* Brand label inside card (when not grouped) */}
                      {product.brand && brand === '' ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                          {product.brand}
                        </span>
                      ) : null}

                      <h3 className="line-clamp-2 text-sm font-medium leading-snug text-text-primary">
                        {product.name}
                      </h3>

                      {product.sku ? (
                        <p className="text-[10px] text-text-muted">SKU: {product.sku}</p>
                      ) : null}

                      <div className="mt-auto flex items-end justify-between pt-2">
                        <span className="font-display text-base font-semibold text-text-primary">
                          {formatChf(product.retailCents)}
                        </span>
                        <span
                          className={[
                            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            product.inStock
                              ? 'bg-success/15 text-success'
                              : 'bg-error/10 text-error',
                          ].join(' ')}
                        >
                          {product.inStock ? 'Auf Lager' : 'Ausverkauft'}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <footer className="pt-4 text-center text-[11px] tracking-wider text-text-muted">
        Powered by <span className="font-semibold">SALON OS</span>
      </footer>
    </main>
  );
}
