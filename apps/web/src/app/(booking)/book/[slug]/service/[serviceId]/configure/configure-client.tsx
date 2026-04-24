'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ServiceWizard, type BundleOffer, type WizardSelection } from '@/components/service-wizard';

/**
 * Client-Wrapper für den Booking-Wizard: nimmt die User-Auswahl entgegen
 * und leitet zum Slot-Picker weiter mit allen Option-/AddOn-/Bundle-IDs
 * in der URL, damit der Slot-Picker die effektive Dauer kennt.
 */
export function ServiceConfigure({
  slug,
  serviceId,
  serviceName,
  description,
  basePrice,
  baseDuration,
  locationId,
  optionGroups,
  addOns,
  bundles,
}: {
  slug: string;
  serviceId: string;
  serviceName: string;
  description: string | null;
  basePrice: number;
  baseDuration: number;
  locationId: string | null;
  optionGroups: Array<{
    id: string;
    name: string;
    required: boolean;
    multi: boolean;
    sortOrder: number;
    options: Array<{
      id: string;
      label: string;
      priceDelta: number;
      durationDeltaMin: number;
      processingDeltaMin: number;
      isDefault: boolean;
      sortOrder: number;
    }>;
  }>;
  addOns: Array<{
    id: string;
    name: string;
    priceDelta: number;
    durationDeltaMin: number;
    sortOrder: number;
  }>;
  bundles: BundleOffer[];
}): React.JSX.Element {
  const router = useRouter();

  const handleConfirm = (sel: WizardSelection): void => {
    const params = new URLSearchParams();
    if (locationId) params.set('location', locationId);
    params.set('duration', String(sel.totalDurationMin));
    params.set('price', String(sel.totalPrice));
    if (sel.optionIds.length > 0) params.set('options', sel.optionIds.join(','));
    if (sel.addOnIds.length > 0) params.set('addons', sel.addOnIds.join(','));
    if (sel.bundleIds.length > 0) params.set('bundles', sel.bundleIds.join(','));
    router.push(`/book/${slug}/service/${serviceId}?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          {serviceName}
        </h1>
        {description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
      </div>
      <ServiceWizard
        serviceId={serviceId}
        serviceName={serviceName}
        basePrice={basePrice}
        baseDuration={baseDuration}
        groups={optionGroups}
        addOns={addOns}
        bundles={bundles}
        onConfirm={handleConfirm}
        ctaLabel="Weiter → Termin"
        showHeader={false}
      />
    </div>
  );
}
