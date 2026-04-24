'use client';
import * as React from 'react';
import { ServiceWizard, type BundleOffer, type WizardSelection } from '@/components/service-wizard';

export function ServiceWizardPreview(props: {
  serviceId: string;
  serviceName: string;
  basePrice: number;
  baseDuration: number;
  groups: Array<{
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
  const [result, setResult] = React.useState<WizardSelection | null>(null);

  const handleConfirm = (selection: WizardSelection): void => {
    setResult(selection);
  };

  return (
    <div className="space-y-4">
      <ServiceWizard
        serviceId={props.serviceId}
        serviceName={props.serviceName}
        basePrice={props.basePrice}
        baseDuration={props.baseDuration}
        groups={props.groups}
        addOns={props.addOns}
        bundles={props.bundles}
        onConfirm={handleConfirm}
        ctaLabel="Termin wählen →"
      />
      {result ? (
        <div className="rounded-md border border-success/40 bg-success/10 p-4 text-sm">
          <p className="font-semibold text-success">✓ Auswahl bestätigt (Preview)</p>
          <div className="mt-1 tabular-nums text-text-primary">
            CHF {result.totalPrice.toFixed(0)} · {result.totalDurationMin} Min
            {result.bundleIds.length > 0 ? (
              <span className="ml-2 text-xs font-medium text-success">
                inkl. {result.bundleIds.length} Bundle
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-text-muted">
            Im echten Flow würde jetzt der Slot-Picker kommen (Staff + Zeit).
          </p>
        </div>
      ) : null}
    </div>
  );
}
