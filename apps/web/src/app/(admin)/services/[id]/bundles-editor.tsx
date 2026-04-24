'use client';
import * as React from 'react';
import { Badge, Button, Card, CardBody, Field, Input, Select } from '@salon-os/ui';
import { createBundle, deleteBundle } from '../actions';

function fmtPrice(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

export type Bundle = {
  id: string;
  bundledServiceId: string;
  label: string;
  discountAmount: string | number | null;
  discountPct: string | number | null;
  active: boolean;
  sortOrder: number;
  bundledService: {
    id: string;
    name: string;
    basePrice: string | number;
    durationMinutes: number;
  };
};

export type ServiceOpt = {
  id: string;
  name: string;
  basePrice: string | number;
};

/**
 * Bundle-Editor: Cross-Sell-Upsell. Wenn Kundin den aktuellen Service
 * bucht, schlägt der Wizard einen Zweit-Service mit Rabatt vor.
 * Beispiel: Kunde bucht "Nails — Neues Set", Wizard zeigt
 * "+ Pediküre Basis dazu — für nur CHF 34 statt 39".
 */
export function BundlesEditor({
  serviceId,
  initialBundles,
  allServices,
}: {
  serviceId: string;
  initialBundles: Bundle[];
  allServices: ServiceOpt[];
}): React.JSX.Element {
  const [bundles, setBundles] = React.useState<Bundle[]>(initialBundles);
  const [bundledServiceId, setBundledServiceId] = React.useState('');
  const [discountAmount, setDiscountAmount] = React.useState('5');
  const [label, setLabel] = React.useState('');
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  // Label-Vorschlag generieren wenn Kunde Service + Rabatt wählt
  React.useEffect(() => {
    if (!bundledServiceId) {
      setLabel('');
      return;
    }
    const svc = allServices.find((s) => s.id === bundledServiceId);
    if (!svc) return;
    const base = Number(svc.basePrice);
    const disc = Number(discountAmount) || 0;
    const final = Math.max(0, base - disc);
    setLabel(`+ ${svc.name} dazu — für nur CHF ${fmtPrice(final)} (statt ${fmtPrice(base)})`);
  }, [bundledServiceId, discountAmount, allServices]);

  const addBundle = (): void => {
    setError(null);
    if (!bundledServiceId) {
      setError('Bitte Zweit-Service wählen.');
      return;
    }
    if (!label.trim()) {
      setError('Bitte Label erfassen.');
      return;
    }
    const amount = Number(discountAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Rabatt muss >= 0 sein.');
      return;
    }
    startTransition(async () => {
      try {
        await createBundle(serviceId, {
          bundledServiceId,
          label: label.trim(),
          discountAmount: amount,
          active: true,
          sortOrder: bundles.length,
        });
        setBundledServiceId('');
        setDiscountAmount('5');
        setLabel('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler');
      }
    });
  };

  const remove = (id: string, svcName: string): void => {
    if (!confirm(`Bundle "${svcName}" entfernen?`)) return;
    startTransition(async () => {
      await deleteBundle(serviceId, id);
      setBundles((b) => b.filter((x) => x.id !== id));
    });
  };

  // Nur Services die NICHT der aktuelle sind (als Bundle-Target verfügbar)
  const availableTargets = allServices.filter((s) => s.id !== serviceId);

  return (
    <Card className="mb-4">
      <CardBody className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-text-primary">Bundle-Angebote</p>
          <p className="mt-0.5 text-xs text-text-secondary">
            Cross-Sell-Upsell: wenn Kundin diesen Service bucht, schlägt der Wizard einen
            Zweit-Service mit Rabatt vor. Beispiel: <em>Nails + Pediküre Basis</em> = −5 CHF.
            Passiert 60% aller Upsells online.
          </p>
        </div>

        {bundles.length > 0 ? (
          <ul className="space-y-1">
            {bundles.map((b) => {
              const disc = Number(b.discountAmount ?? 0);
              const base = Number(b.bundledService.basePrice);
              const final = Math.max(0, base - disc);
              return (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm"
                >
                  <span className="font-medium text-text-primary">+ {b.bundledService.name}</span>
                  <Badge tone="success">
                    −{fmtPrice(disc)} CHF → statt {fmtPrice(base)} nur {fmtPrice(final)}
                  </Badge>
                  <span className="text-xs text-text-muted">„{b.label}"</span>
                  <button
                    type="button"
                    onClick={() => remove(b.id, b.bundledService.name)}
                    disabled={pending}
                    className="ml-auto text-xs text-danger hover:underline"
                  >
                    Entfernen
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-text-muted">Noch keine Bundle-Angebote.</p>
        )}

        {availableTargets.length > 0 ? (
          <div className="rounded-md border border-border bg-surface/50 p-3">
            <p className="mb-2 text-xs font-semibold text-text-primary">+ Neues Bundle</p>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
                <Field label="Zweit-Service">
                  <Select
                    value={bundledServiceId}
                    onChange={(e) => setBundledServiceId(e.target.value)}
                    disabled={pending}
                  >
                    <option value="">— wählen —</option>
                    {availableTargets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (CHF {fmtPrice(Number(s.basePrice))})
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Rabatt (CHF)" hint="Flat-Rabatt beim Dazu-Buchen">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    disabled={pending}
                  />
                </Field>
              </div>
              <Field label="Label" hint="Text im Wizard — auto-vorgeschlagen, editierbar">
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  disabled={pending}
                />
              </Field>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="primary"
                  onClick={addBundle}
                  disabled={pending || !bundledServiceId}
                >
                  Bundle anlegen
                </Button>
              </div>
            </div>
            {error ? <p className="mt-2 text-xs font-medium text-danger">{error}</p> : null}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
