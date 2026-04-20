import Link from 'next/link';
import { Button, Card, CardBody, Field, Input, Select, Textarea } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { createService, createCategory } from '../actions';

interface CategoryRow {
  id: string;
  name: string;
}

async function loadCategories(): Promise<CategoryRow[]> {
  const ctx = getCurrentTenant();
  try {
    const res = await apiFetch<{ categories: CategoryRow[] }>(
      '/v1/service-categories',
      { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role },
    );
    return res.categories;
  } catch (err) {
    if (err instanceof ApiError) return [];
    throw err;
  }
}

export default async function NewServicePage(): Promise<React.JSX.Element> {
  const categories = await loadCategories();

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link
        href="/services"
        className="text-xs text-text-muted transition-colors hover:text-text-primary"
      >
        ← Services
      </Link>
      <header className="mb-6 mt-4">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
          Katalog
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Neuer Service
        </h1>
      </header>

      {categories.length === 0 ? (
        <Card className="mb-6 border-l-4 border-l-warning bg-warning/5">
          <CardBody>
            <form action={createCategory} className="space-y-3">
              <p className="text-sm font-medium text-text-primary">
                Noch keine Kategorie — leg erst eine an.
              </p>
              <div className="flex gap-2">
                <Input name="name" required placeholder="z. B. Nägel, Wimpern, Brauen" className="flex-1" />
                <Button type="submit" variant="accent">
                  Kategorie anlegen
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody>
          <form action={createService} className="space-y-5">
            <Field label="Name" required>
              <Input name="name" required placeholder="Nagel-Modellage Gel" />
            </Field>

            <Field label="Kategorie" required>
              <Select name="categoryId" required defaultValue="">
                <option value="">— wählen —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Beschreibung" hint="Optional — wird auf der Booking-Seite angezeigt.">
              <Textarea name="description" rows={3} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Dauer (Minuten)" required>
                <Input
                  type="number"
                  name="durationMinutes"
                  min={5}
                  max={600}
                  step={5}
                  defaultValue={60}
                  required
                />
              </Field>
              <Field label="Preis (CHF)" required>
                <Input
                  type="number"
                  name="basePrice"
                  min={0}
                  step="0.01"
                  defaultValue={80}
                  required
                />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" name="bookable" defaultChecked className="h-4 w-4" />
              <span>Online buchbar</span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Link href="/services">
                <Button type="button" variant="ghost">
                  Abbrechen
                </Button>
              </Link>
              <Button type="submit" variant="primary" disabled={categories.length === 0}>
                Service anlegen
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
