import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Card, CardBody, Field, Input, PriceDisplay, Textarea } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { adjustStockForm } from '../actions';

interface Product {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  category: string | null;
  type: string;
  unit: string | null;
  costCents: number;
  retailCents: number;
  stockLevel: number;
  reorderAt: number;
  reorderQty: number | null;
  supplier: string | null;
}

interface StockMutation {
  id: string;
  delta: number;
  stockAfter: number;
  reason: string;
  notes: string | null;
  createdAt: string;
}

const REASON_LABELS: Record<string, string> = {
  PURCHASE: 'Wareneingang',
  SALE: 'Verkauf',
  USAGE: 'Verbrauch',
  ADJUSTMENT: 'Inventur',
  RETURN: 'Retoure',
  INITIAL: 'Erstbestand',
};

async function loadProduct(id: string): Promise<Product | null> {
  const ctx = await getCurrentTenant();
  try {
    // /v1/products gibt list zurück — wir nehmen find aus der Liste
    const res = await apiFetch<{ products: Product[] }>('/v1/products', {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
    return res.products.find((p) => p.id === id) ?? null;
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
}

async function loadMutations(id: string): Promise<StockMutation[]> {
  const ctx = await getCurrentTenant();
  try {
    const res = await apiFetch<{ mutations: StockMutation[] }>(`/v1/products/${id}/mutations`, {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });
    return res.mutations;
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('de-CH', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ adjusted?: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const sp = await searchParams;
  const [product, mutations] = await Promise.all([loadProduct(id), loadMutations(id)]);

  if (!product) notFound();

  const adjustForId = adjustStockForm.bind(null, product.id);
  const lowStock = product.stockLevel <= product.reorderAt;

  return (
    <div className="w-full p-4 md:p-8">
      <Link
        href="/inventory"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary"
      >
        ← Zurück zum Inventar
      </Link>

      <header className="mt-3 mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">Produkt</p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
            {product.name}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {[product.brand, product.sku, product.unit, product.supplier]
              .filter(Boolean)
              .join(' · ') || '—'}
          </p>
        </div>
        <Badge tone={lowStock ? 'warning' : 'accent'}>
          {lowStock ? `Niedrig: ${product.stockLevel}` : `Bestand: ${product.stockLevel}`}
        </Badge>
      </header>

      {sp.adjusted ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          Stock angepasst.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stat Card */}
        <Card>
          <CardBody>
            <h2 className="mb-4 text-base font-semibold">Stammdaten</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-text-muted">Kategorie</dt>
                <dd className="mt-1 font-medium">{product.category ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Typ</dt>
                <dd className="mt-1 font-medium">{product.type}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Einkauf</dt>
                <dd className="mt-1 font-medium">
                  <PriceDisplay amount={product.costCents / 100} size="sm" />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Verkauf</dt>
                <dd className="mt-1 font-medium">
                  <PriceDisplay amount={product.retailCents / 100} size="sm" />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Bestand</dt>
                <dd className="mt-1 font-medium tabular-nums">{product.stockLevel}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Nachbestellen ab</dt>
                <dd className="mt-1 font-medium tabular-nums">{product.reorderAt}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        {/* Adjust-Form */}
        <Card>
          <CardBody>
            <h2 className="mb-4 text-base font-semibold">Bestand anpassen</h2>
            <form action={adjustForId} className="space-y-3">
              <Field label="Menge (positiv = Eingang, negativ = Abgang)" required>
                <Input required name="delta" type="number" step={1} placeholder="z.B. 5 oder -2" />
              </Field>
              <Field label="Grund" required>
                <select
                  name="reason"
                  required
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  defaultValue="PURCHASE"
                >
                  <option value="PURCHASE">Wareneingang (Bestellung kam an)</option>
                  <option value="SALE">Verkauf an Kundin</option>
                  <option value="USAGE">Verbrauch im Service (Backbar)</option>
                  <option value="ADJUSTMENT">Inventur-Korrektur</option>
                  <option value="RETURN">Retoure / Rückgabe</option>
                </select>
              </Field>
              <Field label="Notiz (optional)">
                <Textarea name="notes" rows={2} placeholder="z.B. Lieferung 27.04 von Wella" />
              </Field>
              <button
                type="submit"
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.98]"
              >
                Anpassen
              </button>
            </form>
          </CardBody>
        </Card>
      </div>

      {/* Mutations-History */}
      <Card className="mt-6">
        <CardBody>
          <h2 className="mb-4 text-base font-semibold">Verlauf (letzte {mutations.length})</h2>
          {mutations.length === 0 ? (
            <p className="text-sm text-text-muted">Noch keine Bestands-Änderungen.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-text-muted">
                    <th className="py-2">Datum</th>
                    <th className="py-2">Grund</th>
                    <th className="py-2 text-right">Δ</th>
                    <th className="py-2 text-right">Bestand danach</th>
                    <th className="py-2">Notiz</th>
                  </tr>
                </thead>
                <tbody>
                  {mutations.map((m) => (
                    <tr key={m.id} className="border-b border-border/50 last:border-b-0">
                      <td className="py-2 text-xs tabular-nums text-text-muted">
                        {fmtDate(m.createdAt)}
                      </td>
                      <td className="py-2">
                        <Badge tone={m.delta > 0 ? 'accent' : 'neutral'}>
                          {REASON_LABELS[m.reason] ?? m.reason}
                        </Badge>
                      </td>
                      <td
                        className={`py-2 text-right font-medium tabular-nums ${
                          m.delta > 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {m.delta > 0 ? '+' : ''}
                        {m.delta}
                      </td>
                      <td className="py-2 text-right tabular-nums">{m.stockAfter}</td>
                      <td className="py-2 text-xs text-text-secondary">{m.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
