import Link from 'next/link';
import { Badge, Button, Card, CardBody, EmptyState, PriceDisplay } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { applyNailsPreset, applyPedicurePreset, deleteService } from './actions';

interface ServiceRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  durationMinutes: number;
  basePrice: string;
  bookable: boolean;
  categoryId: string;
}

interface CategoryRow {
  id: string;
  name: string;
  order: number;
}

async function loadData(): Promise<{ services: ServiceRow[]; categories: CategoryRow[] }> {
  const ctx = getCurrentTenant();
  try {
    const [svcRes, catRes] = await Promise.all([
      apiFetch<{ services: ServiceRow[] }>('/v1/services', {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        role: ctx.role,
      }),
      apiFetch<{ categories: CategoryRow[] }>('/v1/service-categories', {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        role: ctx.role,
      }),
    ]);
    return { services: svcRes.services, categories: catRes.categories };
  } catch (err) {
    if (err instanceof ApiError) return { services: [], categories: [] };
    throw err;
  }
}

export default async function ServicesPage(): Promise<React.JSX.Element> {
  const { services, categories } = await loadData();
  // Kategorien nach expliziter order-Spalte sortieren, damit Gel/Acryl/
  // Gesicht etc. in der Reihenfolge erscheinen, die Neta in den Settings
  // festgelegt hat — nicht zufällig nach API-Order.
  const orderedCategories = [...categories].sort((a, b) => a.order - b.order);
  const catOrder = new Map(orderedCategories.map((c, i) => [c.id, i]));
  const catById = new Map(categories.map((c) => [c.id, c.name]));

  const byCategory = new Map<string, ServiceRow[]>();
  for (const s of services) {
    const key = catById.get(s.categoryId) ?? 'Weitere';
    const bucket = byCategory.get(key) ?? [];
    bucket.push(s);
    byCategory.set(key, bucket);
  }
  // Innerhalb einer Kategorie alphabetisch, Kategorie-Reihen in
  // order-Spalte-Reihenfolge (unbekannte 'Weitere' ans Ende).
  for (const [, bucket] of byCategory) {
    bucket.sort((a, b) => a.name.localeCompare(b.name, 'de-CH'));
  }
  const sortedCategoryEntries = Array.from(byCategory.entries()).sort(([aName], [bName]) => {
    const aId = categories.find((c) => c.name === aName)?.id;
    const bId = categories.find((c) => c.name === bName)?.id;
    const ao = aId ? (catOrder.get(aId) ?? 999) : 999;
    const bo = bId ? (catOrder.get(bId) ?? 999) : 999;
    return ao - bo;
  });

  return (
    <div className="w-full p-4 md:p-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">Katalog</p>
          <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
            Services
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {services.length} Services in {categories.length} Kategorien
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={applyNailsPreset}>
            <Button type="submit" variant="ghost" size="sm">
              ✨ Nails-Preset
            </Button>
          </form>
          <form action={applyPedicurePreset}>
            <Button type="submit" variant="ghost" size="sm">
              ✨ Pedi-Preset
            </Button>
          </form>
          <Link href="/services/new">
            <Button variant="primary" iconLeft={<span className="text-base leading-none">+</span>}>
              Neuer Service
            </Button>
          </Link>
        </div>
      </header>

      {services.length === 0 ? (
        <Card>
          <EmptyState
            title="Noch keine Services"
            description="Lege deinen ersten Service an — Name, Dauer und Preis reichen zum Start."
            action={
              <Link href="/services/new">
                <Button variant="accent">+ Neuer Service</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedCategoryEntries.map(([catName, items]) => (
            <section key={catName}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                {catName}
              </h2>
              <Card>
                <CardBody className="overflow-x-auto p-0">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                      <tr>
                        <th className="px-4 py-3 sm:px-5">Service</th>
                        <th className="hidden w-24 px-4 py-3 sm:table-cell sm:px-5">Dauer</th>
                        <th className="w-24 px-4 py-3 text-right sm:w-28 sm:px-5">Preis</th>
                        <th className="hidden w-24 px-4 py-3 md:table-cell md:px-5">Status</th>
                        <th className="hidden w-20 px-4 py-3 md:table-cell md:px-5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((s) => (
                        <tr
                          key={s.id}
                          className="border-b border-border last:border-0 transition-colors hover:bg-surface-raised/60"
                        >
                          <td className="px-4 py-3 sm:px-5">
                            <Link
                              href={`/services/${s.id}`}
                              className="block font-medium text-text-primary hover:underline"
                            >
                              {s.name}
                            </Link>
                            {s.description ? (
                              <div className="mt-0.5 text-xs text-text-muted line-clamp-1">
                                {s.description}
                              </div>
                            ) : null}
                            {/* Mobile-only: Dauer inline unter Namen */}
                            <div className="mt-0.5 text-[11px] text-text-muted sm:hidden">
                              {s.durationMinutes} Min
                              {!s.bookable ? ' · Inaktiv' : ''}
                            </div>
                          </td>
                          <td className="hidden px-4 py-3 tabular-nums text-text-secondary sm:table-cell sm:px-5">
                            {s.durationMinutes} Min
                          </td>
                          <td className="px-4 py-3 text-right sm:px-5">
                            <PriceDisplay amount={s.basePrice} size="sm" />
                          </td>
                          <td className="hidden px-4 py-3 md:table-cell md:px-5">
                            {s.bookable ? (
                              <Badge tone="success" dot>
                                Buchbar
                              </Badge>
                            ) : (
                              <Badge tone="neutral">Inaktiv</Badge>
                            )}
                          </td>
                          <td className="hidden px-4 py-3 text-right md:table-cell md:px-5">
                            <form action={deleteService.bind(null, s.id)}>
                              <button
                                type="submit"
                                className="text-xs text-danger transition-colors hover:underline"
                              >
                                Löschen
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardBody>
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
