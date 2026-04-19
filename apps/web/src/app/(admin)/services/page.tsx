import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

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
    <div className="p-8">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
          Katalog
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Services</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {services.length} Services in {categories.length} Kategorien
        </p>
      </header>

      {services.length === 0 ? (
        <section className="rounded-xl border border-neutral-200 p-10 text-center">
          <p className="text-sm text-neutral-500">Noch keine Services angelegt.</p>
        </section>
      ) : (
        <div className="space-y-8">
          {Array.from(byCategory.entries()).map(([catName, items]) => (
            <section key={catName}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
                {catName}
              </h2>
              <div className="rounded-xl border border-neutral-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wider text-neutral-500">
                    <tr>
                      <th className="px-4 py-3">Service</th>
                      <th className="px-4 py-3 w-24">Dauer</th>
                      <th className="px-4 py-3 w-28 text-right">Preis</th>
                      <th className="px-4 py-3 w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((s) => (
                      <tr key={s.id} className="border-b border-neutral-100 last:border-0">
                        <td className="px-4 py-3">
                          <div className="font-medium">{s.name}</div>
                          {s.description ? (
                            <div className="mt-0.5 text-xs text-neutral-500">
                              {s.description}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-neutral-600">
                          {s.durationMinutes} Min
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">
                          {Number(s.basePrice).toFixed(2)} CHF
                        </td>
                        <td className="px-4 py-3">
                          {s.bookable ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                              Buchbar
                            </span>
                          ) : (
                            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                              Inaktiv
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
