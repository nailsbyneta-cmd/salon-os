import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button, Card, CardBody, Field, Input, Select, Textarea } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { updateService } from '../actions';

interface Service {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  durationMinutes: number;
  basePrice: string;
  bookable: boolean;
  categoryId: string;
}

interface Category {
  id: string;
  name: string;
}

async function load(id: string): Promise<{ service: Service; categories: Category[] } | null> {
  const ctx = getCurrentTenant();
  const auth = { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role };
  try {
    const [svc, cat] = await Promise.all([
      apiFetch<Service>(`/v1/services/${id}`, auth),
      apiFetch<{ categories: Category[] }>('/v1/service-categories', auth),
    ]);
    return { service: svc, categories: cat.categories };
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
}

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const data = await load(id);
  if (!data) notFound();
  const { service, categories } = data;
  const action = updateService.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8">
      <Link
        href="/services"
        className="text-xs text-text-muted transition-colors hover:text-text-primary"
      >
        ← Services
      </Link>
      <header className="mb-6 mt-4">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
          Service bearbeiten
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          {service.name}
        </h1>
      </header>

      <Card>
        <CardBody>
          <form action={action} className="space-y-5">
            <Field label="Name" required>
              <Input name="name" required defaultValue={service.name} />
            </Field>

            <Field label="Kategorie" hint="Nicht änderbar — lege ggf. einen neuen Service an.">
              <Select name="categoryId" defaultValue={service.categoryId} disabled>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Beschreibung">
              <Textarea
                name="description"
                rows={3}
                defaultValue={service.description ?? ''}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Dauer (Minuten)" required>
                <Input
                  type="number"
                  name="durationMinutes"
                  min={5}
                  max={600}
                  step={5}
                  defaultValue={service.durationMinutes}
                  required
                />
              </Field>
              <Field label="Preis (CHF)" required>
                <Input
                  type="number"
                  name="basePrice"
                  min={0}
                  step="0.01"
                  defaultValue={service.basePrice}
                  required
                />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                name="bookable"
                defaultChecked={service.bookable}
                className="h-4 w-4"
              />
              <span>Online buchbar</span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Link href="/services">
                <Button type="button" variant="ghost">
                  Abbrechen
                </Button>
              </Link>
              <Button type="submit" variant="primary">
                Speichern
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
