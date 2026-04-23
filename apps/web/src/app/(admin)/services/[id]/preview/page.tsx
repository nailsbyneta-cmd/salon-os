import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardBody } from '@salon-os/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';
import { ServiceWizardPreview } from './wizard-preview';

interface Service {
  id: string;
  name: string;
  basePrice: string;
  durationMinutes: number;
  processingTimeMin: number;
}

interface Group {
  id: string;
  name: string;
  required: boolean;
  multi: boolean;
  sortOrder: number;
  options: Array<{
    id: string;
    label: string;
    priceDelta: string | number;
    durationDeltaMin: number;
    processingDeltaMin: number;
    isDefault: boolean;
    sortOrder: number;
  }>;
}

interface AddOn {
  id: string;
  name: string;
  priceDelta: string | number;
  durationDeltaMin: number;
  sortOrder: number;
}

async function load(id: string): Promise<{
  service: Service;
  groups: Group[];
  addOns: AddOn[];
} | null> {
  const ctx = getCurrentTenant();
  const auth = { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role };
  try {
    const [svc, groupsRes, addOnsRes] = await Promise.all([
      apiFetch<Service>(`/v1/services/${id}`, auth),
      apiFetch<{ groups: Group[] }>(`/v1/services/${id}/option-groups`, auth),
      apiFetch<{ addOns: AddOn[] }>(`/v1/services/${id}/add-ons`, auth),
    ]);
    return { service: svc, groups: groupsRes.groups, addOns: addOnsRes.addOns };
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
}

export default async function ServicePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const data = await load(id);
  if (!data) notFound();
  const { service, groups, addOns } = data;

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8">
      <Link
        href={`/services/${id}`}
        className="text-xs text-text-muted transition-colors hover:text-text-primary"
      >
        ← Zurück zum Editor
      </Link>

      <header className="mb-6 mt-4">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
          Kunden-Ansicht (Simulation)
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl tracking-tight">
          So sieht {service.name} für deine Kundinnen aus
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Das ist der Booking-Wizard der im Online-Booking und im Kalender erscheint. Klick dich
          durch — alle Preise und Dauern rechnen sich live mit.
        </p>
      </header>

      <Card>
        <CardBody className="p-6">
          <ServiceWizardPreview
            serviceName={service.name}
            basePrice={Number(service.basePrice)}
            baseDuration={service.durationMinutes}
            groups={groups.map((g) => ({
              ...g,
              options: g.options.map((o) => ({
                ...o,
                priceDelta: Number(o.priceDelta),
              })),
            }))}
            addOns={addOns.map((a) => ({
              ...a,
              priceDelta: Number(a.priceDelta),
            }))}
          />
        </CardBody>
      </Card>
    </div>
  );
}
