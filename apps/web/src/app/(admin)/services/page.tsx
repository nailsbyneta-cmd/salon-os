import Link from 'next/link';
import { Badge, Button, Card, CardBody, EmptyState, PriceDisplay } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { deleteService } from './actions';

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
  const catById = new Map(categories.map((c) => [c.id, c.name]));

  const byCategory = new Map<string, ServiceRow[]>();
  for (const s of services) {
    const key = catById.get(s.categoryId) ?? 'Weitere';
    const bucket = byCategory.get(key) ?? [];
    bucket.push(s);
    byCategory.set(key, bucket);
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
            Katalog
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Services
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {services.length} Services in {categories.length} Kategorien
          </p>
        </div>
        <Link href="/services/new">
          <Button variant="primary" iconLeft={<span className="text-base leading-none">+</span>}>
            Neuer Service
          </Button>
        </Link>
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
          {Array.from(byCategory.entries()).map(([catName, items]) => (
            <section key={catName}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                {catName}
              </h2>
              <Card>
                <CardBody className="p-0">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                      <tr>
                        <th className="px-5 py-3">Service</th>
                        <th className="w-24 px-5 py-3">Dauer</th>
                        <th className="w-28 px-5 py-3 text-right">Preis</th>
                        <th className="w-24 px-5 py-3">Status</th>
                        <th className="w-20 px-5 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((s) => (
                        <tr
                          key={s.id}
                          className="border-b border-border last:border-0 transition-colors hover:bg-surface-raised/60"
                        >
                          <td className="px-5 py-3">
                            <Link
                              href={`/services/${s.id}`}
                              className="font-medium text-text-primary hover:underline"
                            >
                              {s.name}
                            </Link>
                            {s.description ? (
                              <div className="mt-0.5 text-xs text-text-muted">
                                {s.description}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-5 py-3 tabular-nums text-text-secondary">
                            {s.durationMinutes} Min
                          </td>
                          <td className="px-5 py-3 text-right">
                            <PriceDisplay amount={s.basePrice} size="sm" />
                          </td>
                          <td className="px-5 py-3">
                            {s.bookable ? (
                              <Badge tone="success" dot>
                                Buchbar
                              </Badge>
                            ) : (
                              <Badge tone="neutral">Inaktiv</Badge>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right">
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
