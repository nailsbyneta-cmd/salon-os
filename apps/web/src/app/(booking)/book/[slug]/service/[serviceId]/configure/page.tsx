import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardBody } from '@salon-os/ui';
import { BookingSteps } from '../../../booking-steps';
import { ServiceConfigure } from './configure-client';

const API_URL = process.env['PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface Service {
  id: string;
  name: string;
  description: string | null;
  basePrice: string | number;
  durationMinutes: number;
  processingTimeMin: number;
}

interface OptionGroup {
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

interface Bundle {
  id: string;
  label: string;
  discountAmount: string | number | null;
  discountPct: string | number | null;
  bundledService: {
    id: string;
    name: string;
    basePrice: string | number;
    durationMinutes: number;
  };
}

async function loadDetail(
  slug: string,
  serviceId: string,
): Promise<{
  service: Service;
  optionGroups: OptionGroup[];
  addOns: AddOn[];
  bundles: Bundle[];
} | null> {
  try {
    const res = await fetch(`${API_URL}/v1/public/${slug}/services/${serviceId}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      service: Service;
      optionGroups: OptionGroup[];
      addOns: AddOn[];
      bundles: Bundle[];
    };
  } catch {
    return null;
  }
}

/**
 * Fallback wenn ?location= im Query fehlt (z.B. weil Listing kein Location
 * mitgegeben hat oder User die URL direkt aufruft). Ohne locationId crasht
 * der Slot-Step downstream mit 404.
 */
async function loadFirstLocationId(slug: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/v1/public/${slug}/info`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { locations?: Array<{ id: string }> };
    return data.locations?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

export default async function ConfigureServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; serviceId: string }>;
  searchParams: Promise<{ location?: string }>;
}): Promise<React.JSX.Element> {
  const { slug, serviceId } = await params;
  const { location } = await searchParams;
  const data = await loadDetail(slug, serviceId);
  if (!data) notFound();
  const { service, optionGroups, addOns, bundles } = data;

  // Fallback: wenn kein location im Query, hole die erste verfügbare Location.
  // Verhindert dass der Slot-Step downstream wegen fehlendem ?location= 404t.
  const effectiveLocation =
    location && location.length > 0 ? location : await loadFirstLocationId(slug);

  return (
    <main className="space-y-6">
      <BookingSteps current="configure" />

      <Link
        href={`/book/${slug}`}
        className="inline-flex text-sm text-text-muted transition-colors hover:text-text-primary"
      >
        ← Zurück
      </Link>

      <Card>
        <CardBody className="p-6">
          <ServiceConfigure
            slug={slug}
            serviceId={service.id}
            serviceName={service.name}
            description={service.description}
            basePrice={Number(service.basePrice)}
            baseDuration={service.durationMinutes}
            locationId={effectiveLocation}
            optionGroups={optionGroups.map((g) => ({
              ...g,
              options: g.options.map((o) => ({ ...o, priceDelta: Number(o.priceDelta) })),
            }))}
            addOns={addOns.map((a) => ({ ...a, priceDelta: Number(a.priceDelta) }))}
            bundles={bundles.map((b) => ({
              id: b.id,
              label: b.label,
              discountAmount: b.discountAmount == null ? null : Number(b.discountAmount),
              discountPct: b.discountPct == null ? null : Number(b.discountPct),
              bundledService: {
                id: b.bundledService.id,
                name: b.bundledService.name,
                basePrice: Number(b.bundledService.basePrice),
                durationMinutes: b.bundledService.durationMinutes,
              },
            }))}
          />
        </CardBody>
      </Card>
    </main>
  );
}
