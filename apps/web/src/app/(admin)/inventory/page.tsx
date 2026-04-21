import Link from 'next/link';
import { Badge, Button, Card, CardBody, EmptyState, PriceDisplay } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { adjustStock, deleteProduct } from './actions';

interface Product {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  type: string;
  unit: string | null;
  costCents: number;
  retailCents: number;
  stockLevel: number;
  reorderAt: number;
}

async function load(): Promise<Product[]> {
  const ctx = getCurrentTenant();
  try {
    const res = await apiFetch<{ products: Product[] }>('/v1/products', {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
    return res.products;
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}

export default async function InventoryPage(): Promise<React.JSX.Element> {
  const products = await load();
  const lowStock = products.filter((p) => p.stockLevel <= p.reorderAt);
  const stockValue = products.reduce(
    (s, p) => s + (p.costCents / 100) * p.stockLevel,
    0,
  );

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
            Inventar
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
            Produkte
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {products.length} aktiv · {lowStock.length} niedriger Bestand ·
            Lagerwert {stockValue.toFixed(2)} CHF
          </p>
        </div>
        <Link href="/inventory/new">
          <Button variant="primary" iconLeft={<span className="text-base leading-none">+</span>}>
            Neues Produkt
          </Button>
        </Link>
      </header>

      {lowStock.length > 0 ? (
        <Card className="mb-6 border-l-4 border-l-warning bg-warning/5">
          <CardBody>
            <p className="text-xs font-semibold uppercase tracking-wider text-warning">
              Low-Stock-Alert · {lowStock.length} Produkte nachbestellen
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {lowStock
                .slice(0, 5)
                .map((p) => p.name)
                .join(', ')}
              {lowStock.length > 5 ? ` … +${lowStock.length - 5} weitere` : ''}
            </p>
          </CardBody>
        </Card>
      ) : null}

      {products.length === 0 ? (
        <Card>
          <EmptyState
            title="Noch keine Produkte"
            description="Lege Backbar-Artikel und Retail-Produkte an. Bei niedrigem Bestand erscheint hier eine Warnung."
            action={
              <Link href="/inventory/new">
                <Button variant="accent">+ Erstes Produkt</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <Card>
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="px-4 py-3 sm:px-5">Produkt</th>
                  <th className="hidden px-4 py-3 md:table-cell md:w-24 md:px-5">
                    Typ
                  </th>
                  <th className="hidden px-4 py-3 text-right lg:table-cell lg:w-24 lg:px-5">
                    Kosten
                  </th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell sm:w-24 sm:px-5">
                    Verkauf
                  </th>
                  <th className="px-4 py-3 text-center sm:w-32 sm:px-5">
                    Bestand
                  </th>
                  <th className="hidden px-4 py-3 md:table-cell md:w-24 md:px-5"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const low = p.stockLevel <= p.reorderAt;
                  const minus = adjustStock.bind(null, p.id, -1);
                  const plus = adjustStock.bind(null, p.id, +1);
                  const rm = deleteProduct.bind(null, p.id);
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-border last:border-0 transition-colors hover:bg-surface-raised/60"
                    >
                      <td className="px-4 py-3 sm:px-5">
                        <div className="font-medium text-text-primary">
                          {p.name}
                        </div>
                        <div className="text-xs text-text-muted">
                          {[p.brand, p.sku, p.unit].filter(Boolean).join(' · ') || '—'}
                        </div>
                        {/* Mobile-only: Verkaufspreis unter Name */}
                        <div className="mt-1 text-[11px] text-text-secondary sm:hidden">
                          <PriceDisplay amount={p.retailCents / 100} size="sm" />
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell md:px-5">
                        <Badge tone={p.type === 'RETAIL' ? 'accent' : 'neutral'}>
                          {p.type === 'BOTH'
                            ? 'Beides'
                            : p.type === 'RETAIL'
                              ? 'Retail'
                              : 'Backbar'}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 text-right lg:table-cell lg:px-5">
                        <PriceDisplay amount={p.costCents / 100} size="sm" />
                      </td>
                      <td className="hidden px-4 py-3 text-right sm:table-cell sm:px-5">
                        <PriceDisplay amount={p.retailCents / 100} size="sm" />
                      </td>
                      <td className="px-4 py-3 sm:px-5">
                        <div className="flex items-center justify-center gap-2">
                          <form action={minus}>
                            <button
                              type="submit"
                              className="h-8 w-8 rounded-sm border border-border text-text-secondary hover:bg-surface-raised"
                              aria-label="Bestand senken"
                            >
                              −
                            </button>
                          </form>
                          <span
                            className={`min-w-[2.5rem] text-center text-sm font-semibold tabular-nums ${
                              low ? 'text-warning' : 'text-text-primary'
                            }`}
                          >
                            {p.stockLevel}
                          </span>
                          <form action={plus}>
                            <button
                              type="submit"
                              className="h-8 w-8 rounded-sm border border-border text-text-secondary hover:bg-surface-raised"
                              aria-label="Bestand erhöhen"
                            >
                              +
                            </button>
                          </form>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-right md:table-cell md:px-5">
                        <form action={rm}>
                          <button
                            type="submit"
                            className="text-xs text-danger hover:underline"
                          >
                            Löschen
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
