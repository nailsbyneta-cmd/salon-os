'use client';
import * as React from 'react';
import { Badge, Button } from '@salon-os/ui';

/**
 * Service-Booking-Wizard — reusable für Kunden-Online-Booking UND Staff-Kalender.
 *
 * UX-Prinzipien:
 * - Live-Preis-Calculator: Preis + Dauer aktualisieren beim Klicken.
 * - Smart-Default: erste Option pro Gruppe ist vorausgewählt (mit Badge "Beliebt").
 * - Add-Ons als visuelle Cards — upsell-optimiert, 0-Min Add-Ons = nur Preis.
 * - Alle Gruppen werden auf einem Screen gezeigt (nicht step-by-step) —
 *   weniger Reibung, Kunde sieht die Gesamt-Kalkulation live mitdenken.
 */

type Option = {
  id: string;
  label: string;
  priceDelta: number | string;
  durationDeltaMin: number;
  processingDeltaMin: number;
  isDefault: boolean;
  sortOrder: number;
};

type Group = {
  id: string;
  name: string;
  required: boolean;
  multi: boolean;
  sortOrder: number;
  options: Option[];
};

type AddOn = {
  id: string;
  name: string;
  priceDelta: number | string;
  durationDeltaMin: number;
  sortOrder: number;
};

export type WizardSelection = {
  optionIds: string[];
  addOnIds: string[];
  totalPrice: number;
  totalDurationMin: number;
};

export function ServiceWizard({
  serviceName,
  basePrice,
  baseDuration,
  groups,
  addOns,
  currency = 'CHF',
  onConfirm,
  ctaLabel = 'Weiter',
  showHeader = true,
}: {
  serviceName: string;
  basePrice: number;
  baseDuration: number;
  groups: Group[];
  addOns: AddOn[];
  currency?: string;
  onConfirm?: (selection: WizardSelection) => void;
  ctaLabel?: string;
  showHeader?: boolean;
}): React.JSX.Element {
  // Smart-Default: erste Option (oder isDefault) pro Gruppe vorausgewählt.
  const initialSelection = React.useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const g of groups) {
      if (g.options.length === 0) continue;
      const def = g.options.find((o) => o.isDefault) ?? g.options[0];
      if (def) out[g.id] = def.id;
    }
    return out;
  }, [groups]);

  const [selections, setSelections] = React.useState<Record<string, string>>(initialSelection);
  const [addOnSelection, setAddOnSelection] = React.useState<Set<string>>(new Set());

  const selectedOptions = React.useMemo(() => {
    const out: Option[] = [];
    for (const g of groups) {
      const sel = selections[g.id];
      if (!sel) continue;
      const opt = g.options.find((o) => o.id === sel);
      if (opt) out.push(opt);
    }
    return out;
  }, [groups, selections]);

  const selectedAddOns = React.useMemo(() => {
    return addOns.filter((a) => addOnSelection.has(a.id));
  }, [addOns, addOnSelection]);

  const totals = React.useMemo(() => {
    let price = Number(basePrice);
    let duration = Number(baseDuration);
    for (const o of selectedOptions) {
      price += Number(o.priceDelta);
      duration += Number(o.durationDeltaMin);
    }
    for (const a of selectedAddOns) {
      price += Number(a.priceDelta);
      duration += Number(a.durationDeltaMin);
    }
    return { price: Math.max(0, price), duration: Math.max(0, duration) };
  }, [basePrice, baseDuration, selectedOptions, selectedAddOns]);

  const pickOption = (groupId: string, optionId: string): void => {
    setSelections((s) => ({ ...s, [groupId]: optionId }));
  };

  const toggleAddOn = (addOnId: string): void => {
    setAddOnSelection((s) => {
      const next = new Set(s);
      if (next.has(addOnId)) next.delete(addOnId);
      else next.add(addOnId);
      return next;
    });
  };

  const missingGroup = groups.find((g) => g.required && !selections[g.id]);

  const handleConfirm = (): void => {
    if (missingGroup) return;
    onConfirm?.({
      optionIds: Object.values(selections),
      addOnIds: Array.from(addOnSelection),
      totalPrice: totals.price,
      totalDurationMin: totals.duration,
    });
  };

  return (
    <div className="space-y-6">
      {showHeader ? (
        <header>
          <h2 className="font-display text-2xl font-semibold tracking-tight">{serviceName}</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Wähle deine Variante — Preis rechnet sich live mit.
          </p>
        </header>
      ) : null}

      {groups.length === 0 ? (
        <p className="text-sm text-text-muted">Keine Varianten — fester Preis.</p>
      ) : (
        groups.map((g) => {
          const selectedOpt = selections[g.id];
          const defaultId = g.options.find((o) => o.isDefault)?.id ?? g.options[0]?.id;
          return (
            <section key={g.id}>
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-text-primary">{g.name}</h3>
                {!g.required ? <span className="text-xs text-text-muted">Optional</span> : null}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {g.options.map((o) => {
                  const active = selectedOpt === o.id;
                  const isPopular = o.id === defaultId;
                  const priceN = Number(o.priceDelta);
                  const priceTxt =
                    priceN === 0
                      ? ''
                      : priceN > 0
                        ? `+${priceN} ${currency}`
                        : `${priceN} ${currency}`;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => pickOption(g.id, o.id)}
                      className={[
                        'relative flex min-h-[4.5rem] flex-col items-start gap-1 rounded-md border p-3 text-left transition-all',
                        active
                          ? 'border-accent bg-accent/10 ring-2 ring-accent'
                          : 'border-border bg-surface hover:border-accent/50 hover:bg-surface-raised/40',
                      ].join(' ')}
                    >
                      {isPopular && !active ? (
                        <span className="absolute right-2 top-2 text-[10px] font-semibold uppercase tracking-wider text-success">
                          ★ Beliebt
                        </span>
                      ) : null}
                      <span className="text-sm font-medium text-text-primary">{o.label}</span>
                      <span className="flex flex-wrap gap-1 text-[11px] tabular-nums text-text-muted">
                        {priceTxt ? <span>{priceTxt}</span> : null}
                        {o.durationDeltaMin !== 0 ? (
                          <span>
                            {o.durationDeltaMin > 0 ? '+' : ''}
                            {o.durationDeltaMin} Min
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      {addOns.length > 0 ? (
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-text-primary">
              Add-Ons <span className="text-xs font-normal text-text-muted">(optional)</span>
            </h3>
            {addOnSelection.size > 0 ? (
              <button
                type="button"
                onClick={() => setAddOnSelection(new Set())}
                className="text-xs text-text-muted hover:underline"
              >
                Alle abwählen
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {addOns.map((a) => {
              const active = addOnSelection.has(a.id);
              const priceN = Number(a.priceDelta);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleAddOn(a.id)}
                  className={[
                    'flex items-center justify-between gap-3 rounded-md border p-3 text-left transition-all',
                    active
                      ? 'border-accent bg-accent/5 ring-1 ring-accent'
                      : 'border-border bg-surface hover:border-accent/50 hover:bg-surface-raised/40',
                  ].join(' ')}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">{a.name}</span>
                      {a.durationDeltaMin === 0 ? (
                        <Badge tone="neutral">keine Extra-Zeit</Badge>
                      ) : null}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] tabular-nums text-text-muted">
                      <span className="font-semibold text-accent">
                        +{priceN} {currency}
                      </span>
                      {a.durationDeltaMin > 0 ? <span>+{a.durationDeltaMin} Min</span> : null}
                    </div>
                  </div>
                  <div
                    className={[
                      'flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold',
                      active
                        ? 'border-accent bg-accent text-white'
                        : 'border-border bg-surface text-transparent',
                    ].join(' ')}
                    aria-hidden
                  >
                    ✓
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="sticky bottom-0 -mx-1 flex items-center justify-between gap-3 rounded-md border border-border bg-surface/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex flex-col">
          <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
            Gesamt
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-xl font-semibold tabular-nums text-text-primary">
              {totals.price.toFixed(0)} {currency}
            </span>
            <span className="text-xs tabular-nums text-text-muted">· {totals.duration} Min</span>
          </div>
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={handleConfirm}
          disabled={!!missingGroup}
          title={missingGroup ? `Bitte ${missingGroup.name} wählen` : undefined}
        >
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
