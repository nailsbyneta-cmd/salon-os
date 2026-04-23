import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button, Card, CardBody, Field, Input, Select, Textarea } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { updateService } from '../actions';
import { OptionsEditor, type Group } from './options-editor';
import { AddOnsEditor, type AddOn } from './addons-editor';

interface Service {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  durationMinutes: number;
  basePrice: string;
  bookable: boolean;
  categoryId: string;
  processingTimeMin: number;
  activeTimeBefore: number;
  activeTimeAfter: number;
}

interface Category {
  id: string;
  name: string;
}

async function load(id: string): Promise<{
  service: Service;
  categories: Category[];
  groups: Group[];
  addOns: AddOn[];
} | null> {
  const ctx = getCurrentTenant();
  const auth = { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role };
  try {
    const [svc, cat, groupsRes, addOnsRes] = await Promise.all([
      apiFetch<Service>(`/v1/services/${id}`, auth),
      apiFetch<{ categories: Category[] }>('/v1/service-categories', auth),
      apiFetch<{ groups: Group[] }>(`/v1/services/${id}/option-groups`, auth),
      apiFetch<{ addOns: AddOn[] }>(`/v1/services/${id}/add-ons`, auth),
    ]);
    return {
      service: svc,
      categories: cat.categories,
      groups: groupsRes.groups,
      addOns: addOnsRes.addOns,
    };
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
  const { service, categories, groups, addOns } = data;
  const action = updateService.bind(null, id);

  // Wenn Processing-Time gesetzt ist, ist der aktive Anteil = before + after.
  // Sonst ist die Standard-Dauer die aktive Zeit.
  const hasProcessing = service.processingTimeMin > 0;

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      <Link
        href="/services"
        className="text-xs text-text-muted transition-colors hover:text-text-primary"
      >
        ← Services
      </Link>
      <header className="mb-6 mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
            Service bearbeiten
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
            {service.name}
          </h1>
        </div>
        <Link href={`/services/${id}/preview`}>
          <Button type="button" variant="ghost">
            👁 Kunden-Preview
          </Button>
        </Link>
      </header>

      <Card className="mb-4">
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
              <Textarea name="description" rows={3} defaultValue={service.description ?? ''} />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Basis-Dauer (Min)" required hint="Gesamte aktive Zeit ohne Varianten">
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
              <Field label="Basis-Preis (CHF)" required>
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

            {/* Processing-Time — für Services mit Einwirkzeit (Färben etc.) */}
            <details
              open={hasProcessing}
              className="rounded-md border border-border bg-surface/50 p-3"
            >
              <summary className="cursor-pointer text-sm font-semibold text-text-primary">
                Processing-Time (Einwirkzeit)
              </summary>
              <p className="mt-1 text-xs text-text-secondary">
                Für Services wo der Stylist zwischendrin frei ist — z.B. Färben: 20 Min auftragen →
                30 Min einwirken (frei) → 20 Min ausspülen. Während der Processing-Time kann der
                Stylist einen anderen Kurz-Termin nehmen.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Aktiv davor (Min)">
                  <Input
                    type="number"
                    name="activeTimeBefore"
                    min={0}
                    max={240}
                    step={5}
                    defaultValue={service.activeTimeBefore}
                  />
                </Field>
                <Field label="Einwirkzeit (Min)" hint="Stylist frei">
                  <Input
                    type="number"
                    name="processingTimeMin"
                    min={0}
                    max={240}
                    step={5}
                    defaultValue={service.processingTimeMin}
                  />
                </Field>
                <Field label="Aktiv danach (Min)">
                  <Input
                    type="number"
                    name="activeTimeAfter"
                    min={0}
                    max={240}
                    step={5}
                    defaultValue={service.activeTimeAfter}
                  />
                </Field>
              </div>
            </details>

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

      <OptionsEditor serviceId={id} initialGroups={groups} />
      <AddOnsEditor serviceId={id} initialAddOns={addOns} />
    </div>
  );
}
