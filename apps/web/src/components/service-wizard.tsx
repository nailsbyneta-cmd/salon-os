'use client';
import * as React from 'react';
import { Badge, Button } from '@salon-os/ui';

/** Formatiert einen Preis — ganze Zahlen ohne Dezimal, sonst 2 Nachkommastellen. */
function fmtPrice(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

/**
 * Service-Booking-Wizard — reusable für Kunden-Online-Booking UND Staff-Kalender.
 *
 * UX-Prinzipien:
 * - Live-Preis-Calculator: Preis + Dauer aktualisieren beim Klicken.
 * - Smart-Default: erste Option pro Gruppe ist vorausgewählt (mit Badge "Beliebt").
 * - Add-Ons als visuelle Cards — upsell-optimiert, 0-Min Add-Ons = nur Preis.
 * - Bundle-Cross-Sell: "Pediküre dazu für -5 CHF" als Card vor dem CTA.
 * - Alle Gruppen werden auf einem Screen gezeigt — weniger Reibung.
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

export type BundleOffer = {
  id: string;
  label: string;
  discountAmount: number | string | null;
  discountPct: number | string | null;
  bundledService: {
    id: string;
    name: string;
    basePrice: number | string;
    durationMinutes: number;
  };
};

export type WizardSelection = {
  primaryServiceId?: string;
  optionIds: string[];
  addOnIds: string[];
  bundleIds: string[];
  totalPrice: number;
  totalDurationMin: number;
};

export function ServiceWizard({
  serviceId,
  serviceName,
  basePrice,
  baseDuration,
  groups,
  addOns,
  bundles = [],
  currency = 'CHF',
  onConfirm,
  ctaLabel = 'Weiter',
  showHeader = true,
}: {
  serviceId?: string;
  serviceName: string;
  basePrice: number;
  baseDuration: number;
  groups: Group[];
  addOns: AddOn[];
  bundles?: BundleOffer[];
  currency?: string;
  onConfirm?: (selection: WizardSelection) => void;
  ctaLabel?: string;
  showHeader?: boolean;
}): React.JSX.Element {
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
  const [bundleSelection, setBundleSelection] = React.useState<Set<string>>(new Set());

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

  const selectedAddOns = React.useMemo(
    () => addOns.filter((a) => addOnSelection.has(a.id)),
    [addOns, addOnSelection],
  );

  const selectedBundles = React.useMemo(
    () => bundles.filter((b) => bundleSelection.has(b.id)),
    [bundles, bundleSelection],
  );

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
    for (const b of selectedBundles) {
      // Bundle: + Zweit-Service-Preis + Zeit, minus Rabatt
      const bundledPrice = Number(b.bundledService.basePrice);
      const discountAmount = Number(b.discountAmount ?? 0);
      const discountPct = Number(b.discountPct ?? 0);
      let net = bundledPrice;
      if (discountAmount > 0) net -= discountAmount;
      if (discountPct > 0) net = net * (1 - discountPct / 100);
      price += Math.max(0, net);
      duration += b.bundledService.durationMinutes;
    }
    return { price: Math.max(0, price), duration: Math.max(0, duration) };
  }, [basePrice, baseDuration, selectedOptions, selectedAddOns, selectedBundles]);

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

  const toggleBundle = (bundleId: string): void => {
    setBundleSelection((s) => {
      const next = new Set(s);
      if (next.has(bundleId)) next.delete(bundleId);
      else next.add(bundleId);
      return next;
    });
  };

  const missingGroup = groups.find((g) => g.required && !selections[g.id]);

  const handleConfirm = (): void => {
    if (missingGroup) return;
    onConfirm?.({
      primaryServiceId: serviceId,
      optionIds: Object.values(selections),
      addOnIds: Array.from(addOnSelection),
      bundleIds: Array.from(bundleSelection),
      totalPrice: totals.price,
      totalDurationMin: totals.duration,
    });
  };

  return (
    <div className="space-y-6">
      {showHeader ? (
        <header>
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">
            Deine Auswahl
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">{serviceName}</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Wähle deine Variante — Preis rechnet sich live mit.
          </p>
        </header>
      ) : null}

      {groups.length === 0
        ? null
        : groups.map((g) => {
            const selectedOpt = selections[g.id];
            const defaultId = g.options.find((o) => o.isDefault)?.id ?? g.options[0]?.id;
            return (
              <section key={g.id}>
                <div className="mb-3 flex items-baseline justify-between">
                  <h3 className="font-display text-lg font-semibold tracking-tight text-text-primary">
                    {g.name}
                  </h3>
                  {!g.required ? (
                    <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
                      Optional
                    </span>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:grid-cols-3">
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
                          'group relative flex min-h-[4.5rem] flex-col items-start gap-1 rounded-md border p-3 text-left transition-all duration-200',
                          'hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0',
                          active
                            ? 'border-accent bg-accent/10 ring-2 ring-accent shadow-glow'
                            : 'border-border bg-surface hover:border-accent/50 hover:bg-surface-raised/40 hover:shadow-md',
                        ].join(' ')}
                      >
                        {isPopular ? (
                          <span className="absolute right-2 top-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-accent">
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
          })}

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
                    'flex items-center justify-between gap-3 rounded-md border p-3 text-left transition-all duration-200',
                    'hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0',
                    active
                      ? 'border-accent bg-accent/5 ring-1 ring-accent shadow-glow'
                      : 'border-border bg-surface hover:border-accent/50 hover:bg-surface-raised/40 hover:shadow-md',
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

      {bundles.length > 0 ? (
        <section>
          <div className="mb-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">
              Passt dazu
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold tracking-tight text-text-primary">
              Nimm es gleich dazu — spar beim Kombi
            </h3>
          </div>
          <div className="space-y-2">
            {bundles.map((b) => {
              const active = bundleSelection.has(b.id);
              const basePrice = Number(b.bundledService.basePrice);
              const discountAmount = Number(b.discountAmount ?? 0);
              const discountPct = Number(b.discountPct ?? 0);
              let finalPrice = basePrice;
              if (discountAmount > 0) finalPrice -= discountAmount;
              if (discountPct > 0) finalPrice = finalPrice * (1 - discountPct / 100);
              finalPrice = Math.max(0, finalPrice);
              const saved = basePrice - finalPrice;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggleBundle(b.id)}
                  className={[
                    'flex w-full items-center justify-between gap-3 rounded-lg border p-4 text-left transition-all duration-200',
                    'hover:-translate-y-0.5 active:scale-[0.99] active:translate-y-0',
                    active
                      ? 'border-accent bg-accent/10 shadow-glow'
                      : 'border-accent/30 bg-accent/[0.03] hover:border-accent/60 hover:bg-accent/5 hover:shadow-md',
                  ].join(' ')}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-base font-semibold tracking-tight text-text-primary">
                        + {b.bundledService.name}
                      </span>
                      <Badge tone="accent">
                        − {fmtPrice(saved)} {currency}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-text-secondary">
                      <span>{b.label}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] tabular-nums text-text-muted">
                      <span>
                        statt {fmtPrice(basePrice)} {currency} nur{' '}
                        <span className="font-semibold text-accent">
                          {fmtPrice(finalPrice)} {currency}
                        </span>
                      </span>
                      <span>+{b.bundledService.durationMinutes} Min</span>
                    </div>
                  </div>
                  <div
                    className={[
                      'flex h-8 w-8 items-center justify-center rounded-full border text-sm font-bold transition-all',
                      active
                        ? 'border-accent bg-accent text-accent-foreground shadow-glow'
                        : 'border-accent/50 bg-transparent text-accent',
                    ].join(' ')}
                    aria-hidden
                  >
                    {active ? '✓' : '+'}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="sticky bottom-0 -mx-1 flex items-center justify-between gap-4 rounded-lg border border-border bg-surface/95 px-5 py-4 shadow-lg backdrop-blur-md">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-accent">
            Gesamt
            {selectedBundles.length > 0 ? (
              <span className="ml-2 tracking-normal text-text-secondary">· inkl. Bundle</span>
            ) : null}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold tabular-nums text-text-primary md:text-3xl">
              {fmtPrice(totals.price)} {currency}
            </span>
            <span className="text-xs tabular-nums text-text-muted">· {totals.duration} Min</span>
          </div>
        </div>
        <Button
          type="button"
          variant="accent"
          size="lg"
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
