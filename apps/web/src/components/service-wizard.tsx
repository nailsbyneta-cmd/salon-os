'use client';
import * as React from 'react';
import { Button } from '@salon-os/ui';

/**
 * Service-Booking-Wizard — Phorest-grade Step-by-Step UX.
 *
 * Designprinzipien (5-Spezialisten-Konsens):
 * - 1 Designer: 1 Frage pro Screen, max 3-4 Karten, big tap targets, mobile-first
 * - 2 UX: Progress-Dots oben, Smooth-Transitions, Sticky-Total mit Back/Next
 * - 3 Psychologie: Default + Beliebt-Badge biased Auswahl, "Nein danke"-Option
 *   für optionale Steps (negative Framing reduziert Decision-Burden)
 * - 4 Programmer: state-machine über currentStep + selections-Map, alle Daten
 *   bleiben erhalten beim Zurück-Navigieren, kein Local-Storage nötig (Server-
 *   Action sammelt am Schluss alles)
 * - 5 Architect: Steps = OptionGroups (sortOrder) + virtuelle Add-On-Step +
 *   virtuelle Bundle-Step. Skip Add-On/Bundle-Steps wenn leer.
 *
 * Endpreis-First: jede Option zeigt CHF X (Basispreis + Delta), nicht "+10 CHF".
 */

function fmtPrice(n: number): string {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
}

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

const SKIP_TOKEN = '__skip__';

type Step =
  | { kind: 'group'; group: Group }
  | { kind: 'addons'; addOns: AddOn[] }
  | { kind: 'bundles'; bundles: BundleOffer[] };

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
  ctaLabel = 'Weiter zum Termin',
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
  // Steps assemblieren — Group-Steps in sortOrder, dann optional Add-Ons + Bundles
  const steps = React.useMemo<Step[]>(() => {
    const out: Step[] = [];
    for (const g of [...groups].sort((a, b) => a.sortOrder - b.sortOrder)) {
      if (g.options.length === 0) continue;
      out.push({ kind: 'group', group: g });
    }
    if (addOns.length > 0) out.push({ kind: 'addons', addOns });
    if (bundles.length > 0) out.push({ kind: 'bundles', bundles });
    return out;
  }, [groups, addOns, bundles]);

  const [currentStep, setCurrentStep] = React.useState(0);
  const [selections, setSelections] = React.useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const g of groups) {
      if (g.options.length === 0) continue;
      // Pflicht-Gruppen: default vorausgewählt. Optionale: leer → User entscheidet.
      if (g.required) {
        const def = g.options.find((o) => o.isDefault) ?? g.options[0];
        if (def) out[g.id] = def.id;
      }
    }
    return out;
  });
  const [addOnSelection, setAddOnSelection] = React.useState<Set<string>>(new Set());
  const [bundleSelection, setBundleSelection] = React.useState<Set<string>>(new Set());

  const totals = React.useMemo(() => {
    let price = Number(basePrice);
    let duration = Number(baseDuration);
    for (const g of groups) {
      const sel = selections[g.id];
      if (!sel || sel === SKIP_TOKEN) continue;
      const opt = g.options.find((o) => o.id === sel);
      if (opt) {
        price += Number(opt.priceDelta);
        duration += Number(opt.durationDeltaMin);
      }
    }
    for (const a of addOns) {
      if (!addOnSelection.has(a.id)) continue;
      price += Number(a.priceDelta);
      duration += Number(a.durationDeltaMin);
    }
    for (const b of bundles) {
      if (!bundleSelection.has(b.id)) continue;
      const bp = Number(b.bundledService.basePrice);
      const da = Number(b.discountAmount ?? 0);
      const dp = Number(b.discountPct ?? 0);
      let net = bp;
      if (da > 0) net -= da;
      if (dp > 0) net = net * (1 - dp / 100);
      price += Math.max(0, net);
      duration += b.bundledService.durationMinutes;
    }
    return { price: Math.max(0, price), duration: Math.max(0, duration) };
  }, [
    basePrice,
    baseDuration,
    groups,
    addOns,
    bundles,
    selections,
    addOnSelection,
    bundleSelection,
  ]);

  // Wenn keine Steps (Service ohne Varianten/Add-Ons): direkter CTA
  if (steps.length === 0) {
    return (
      <div className="space-y-6">
        {showHeader ? <Header name={serviceName} /> : null}
        <Summary price={totals.price} duration={totals.duration} currency={currency} />
        <Button
          type="button"
          variant="accent"
          size="lg"
          className="w-full"
          onClick={() =>
            onConfirm?.({
              primaryServiceId: serviceId,
              optionIds: [],
              addOnIds: [],
              bundleIds: [],
              totalPrice: totals.price,
              totalDurationMin: totals.duration,
            })
          }
        >
          {ctaLabel}
        </Button>
      </div>
    );
  }

  const safeStep = Math.min(currentStep, steps.length - 1);
  const step = steps[safeStep]!;
  const isLast = safeStep === steps.length - 1;

  const canAdvance = ((): boolean => {
    if (step.kind !== 'group') return true;
    if (step.group.required) {
      const sel = selections[step.group.id];
      return Boolean(sel && sel !== SKIP_TOKEN);
    }
    return true; // optionaler Step → immer weiterklickbar (auch ohne Auswahl)
  })();

  const advance = (): void => {
    if (!canAdvance) return;
    if (isLast) {
      // Confirm
      const optionIds: string[] = [];
      for (const v of Object.values(selections)) {
        if (v && v !== SKIP_TOKEN) optionIds.push(v);
      }
      onConfirm?.({
        primaryServiceId: serviceId,
        optionIds,
        addOnIds: Array.from(addOnSelection),
        bundleIds: Array.from(bundleSelection),
        totalPrice: totals.price,
        totalDurationMin: totals.duration,
      });
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const goBack = (): void => setCurrentStep((s) => Math.max(s - 1, 0));

  const pick = (groupId: string, optionId: string): void => {
    setSelections((s) => ({ ...s, [groupId]: optionId }));
  };

  return (
    <div className="space-y-6">
      {showHeader ? <Header name={serviceName} /> : null}

      <ProgressDots total={steps.length} current={safeStep} steps={steps} />

      {/* Step-Content */}
      <div key={safeStep} className="transition-opacity duration-200">
        {step.kind === 'group' ? (
          <GroupStep
            group={step.group}
            basePrice={basePrice}
            currency={currency}
            selectedId={selections[step.group.id]}
            onPick={(optId) => pick(step.group.id, optId)}
          />
        ) : null}
        {step.kind === 'addons' ? (
          <AddOnsStep
            addOns={step.addOns}
            currency={currency}
            selected={addOnSelection}
            onToggle={(id) => {
              setAddOnSelection((s) => {
                const next = new Set(s);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
          />
        ) : null}
        {step.kind === 'bundles' ? (
          <BundlesStep
            bundles={step.bundles}
            currency={currency}
            selected={bundleSelection}
            onToggle={(id) => {
              setBundleSelection((s) => {
                const next = new Set(s);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
          />
        ) : null}
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 -mx-1 flex items-center justify-between gap-4 rounded-lg border border-border bg-surface/95 px-5 py-4 shadow-lg backdrop-blur-md">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-accent">
            Schritt {safeStep + 1} von {steps.length}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold tabular-nums text-text-primary md:text-3xl">
              {fmtPrice(totals.price)} {currency}
            </span>
            <span className="text-xs tabular-nums text-text-muted">· {totals.duration} Min</span>
          </div>
        </div>
        <div className="flex gap-2">
          {safeStep > 0 ? (
            <Button type="button" variant="ghost" size="lg" onClick={goBack}>
              ← Zurück
            </Button>
          ) : null}
          <Button type="button" variant="accent" size="lg" onClick={advance} disabled={!canAdvance}>
            {isLast ? ctaLabel : 'Weiter →'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Header({ name }: { name: string }): React.JSX.Element {
  return (
    <header>
      <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-accent">
        Deine Auswahl
      </p>
      <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">{name}</h2>
    </header>
  );
}

function Summary({
  price,
  duration,
  currency,
}: {
  price: number;
  duration: number;
  currency: string;
}): React.JSX.Element {
  return (
    <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 text-center">
      <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-accent">Gesamt</p>
      <div className="mt-1 flex items-baseline justify-center gap-2">
        <span className="font-display text-3xl font-semibold tabular-nums">
          {fmtPrice(price)} {currency}
        </span>
        <span className="text-sm tabular-nums text-text-muted">· {duration} Min</span>
      </div>
    </div>
  );
}

function ProgressDots({
  total,
  current,
  steps,
}: {
  total: number;
  current: number;
  steps: Step[];
}): React.JSX.Element {
  const labels = steps.map((s) => {
    if (s.kind === 'group') return s.group.name;
    if (s.kind === 'addons') return 'Extras';
    return 'Kombi-Angebote';
  });
  return (
    <nav aria-label="Wizard-Fortschritt" className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i === current;
        const isDone = i < current;
        return (
          <span
            key={i}
            aria-label={`Schritt ${i + 1}: ${labels[i]}${isActive ? ' (aktiv)' : isDone ? ' (erledigt)' : ''}`}
            className={[
              'h-1.5 rounded-full transition-all duration-300',
              isActive ? 'w-8 bg-accent' : isDone ? 'w-4 bg-accent/60' : 'w-4 bg-border',
            ].join(' ')}
          />
        );
      })}
    </nav>
  );
}

function GroupStep({
  group,
  basePrice,
  currency,
  selectedId,
  onPick,
}: {
  group: Group;
  basePrice: number;
  currency: string;
  selectedId: string | undefined;
  onPick: (optionId: string) => void;
}): React.JSX.Element {
  const sortedOptions = React.useMemo(
    () => [...group.options].sort((a, b) => a.sortOrder - b.sortOrder),
    [group.options],
  );

  return (
    <section>
      <div className="mb-4 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
          {group.required ? 'Pflicht-Auswahl' : 'Optional'}
        </p>
        <h3 className="mt-1 font-display text-xl font-semibold tracking-tight text-text-primary md:text-2xl">
          {group.name}
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {sortedOptions.map((o) => {
          const active = selectedId === o.id;
          const endPrice = basePrice + Number(o.priceDelta);
          const totalDur = Number(o.durationDeltaMin); // delta only — total computed elsewhere
          const showPopular = o.isDefault;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onPick(o.id)}
              className={[
                'group relative flex min-h-[68px] items-center justify-between gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200',
                'hover:-translate-y-0.5 active:scale-[0.99] active:translate-y-0',
                active
                  ? 'border-accent bg-accent/10 shadow-glow ring-2 ring-accent/30'
                  : 'border-border bg-surface hover:border-accent/50 hover:bg-surface-elevated hover:shadow-md',
              ].join(' ')}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-base font-semibold text-text-primary">
                    {o.label}
                  </span>
                  {showPopular ? (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                      ★ Beliebt
                    </span>
                  ) : null}
                </div>
                {totalDur !== 0 ? (
                  <div className="mt-1 text-xs tabular-nums text-text-muted">
                    {totalDur > 0 ? `+${totalDur}` : totalDur} Min Extra-Zeit
                  </div>
                ) : null}
              </div>
              <div className="text-right">
                <div className="font-display text-lg font-semibold tabular-nums text-text-primary">
                  CHF {fmtPrice(endPrice)}
                </div>
              </div>
              <div
                className={[
                  'flex h-7 w-7 flex-none items-center justify-center rounded-full border-2 text-sm font-bold',
                  active
                    ? 'border-accent bg-accent text-accent-foreground'
                    : 'border-border bg-surface text-transparent',
                ].join(' ')}
                aria-hidden
              >
                ✓
              </div>
            </button>
          );
        })}
        {!group.required ? (
          <button
            type="button"
            onClick={() => onPick(SKIP_TOKEN)}
            className={[
              'flex min-h-[60px] items-center justify-between gap-4 rounded-xl border-2 border-dashed p-4 text-left text-text-secondary transition-all duration-200',
              'hover:bg-surface-elevated active:scale-[0.99]',
              selectedId === SKIP_TOKEN ? 'border-text-muted bg-surface-elevated' : 'border-border',
            ].join(' ')}
          >
            <span className="flex-1">
              <span className="font-medium">Nein danke</span>
              <span className="ml-2 text-xs text-text-muted">— diesmal nicht</span>
            </span>
            <span className="text-xs tabular-nums text-text-muted">+0 {currency}</span>
          </button>
        ) : null}
      </div>
    </section>
  );
}

function AddOnsStep({
  addOns,
  currency,
  selected,
  onToggle,
}: {
  addOns: AddOn[];
  currency: string;
  selected: Set<string>;
  onToggle: (id: string) => void;
}): React.JSX.Element {
  return (
    <section>
      <div className="mb-4 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">Optional</p>
        <h3 className="mt-1 font-display text-xl font-semibold tracking-tight text-text-primary md:text-2xl">
          Extras dazu?
        </h3>
        <p className="mt-1 text-sm text-text-secondary">Wähle so viele wie Du magst</p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {addOns.map((a) => {
          const active = selected.has(a.id);
          const price = Number(a.priceDelta);
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onToggle(a.id)}
              className={[
                'flex min-h-[60px] items-center justify-between gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200',
                'hover:-translate-y-0.5 active:scale-[0.99]',
                active
                  ? 'border-accent bg-accent/10 shadow-glow'
                  : 'border-border bg-surface hover:border-accent/50',
              ].join(' ')}
            >
              <div className="min-w-0 flex-1">
                <div className="font-display text-base font-semibold text-text-primary">
                  {a.name}
                </div>
                <div className="mt-1 text-xs tabular-nums text-text-muted">
                  +{price} {currency}
                  {a.durationDeltaMin > 0 ? ` · +${a.durationDeltaMin} Min` : ''}
                </div>
              </div>
              <div
                className={[
                  'flex h-7 w-7 flex-none items-center justify-center rounded-full border-2 text-sm font-bold',
                  active
                    ? 'border-accent bg-accent text-accent-foreground'
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
  );
}

function BundlesStep({
  bundles,
  currency,
  selected,
  onToggle,
}: {
  bundles: BundleOffer[];
  currency: string;
  selected: Set<string>;
  onToggle: (id: string) => void;
}): React.JSX.Element {
  return (
    <section>
      <div className="mb-4 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
          Spar beim Kombi
        </p>
        <h3 className="mt-1 font-display text-xl font-semibold tracking-tight text-text-primary md:text-2xl">
          Passt dazu
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {bundles.map((b) => {
          const active = selected.has(b.id);
          const bp = Number(b.bundledService.basePrice);
          const da = Number(b.discountAmount ?? 0);
          const dp = Number(b.discountPct ?? 0);
          let final = bp;
          if (da > 0) final -= da;
          if (dp > 0) final = final * (1 - dp / 100);
          final = Math.max(0, final);
          const saved = bp - final;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => onToggle(b.id)}
              className={[
                'flex w-full items-center justify-between gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200',
                'hover:-translate-y-0.5 active:scale-[0.99]',
                active
                  ? 'border-accent bg-accent/10 shadow-glow'
                  : 'border-accent/40 bg-accent/[0.03] hover:border-accent/70 hover:bg-accent/5',
              ].join(' ')}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-base font-semibold text-text-primary">
                    + {b.bundledService.name}
                  </span>
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                    − {fmtPrice(saved)} {currency}
                  </span>
                </div>
                <div className="mt-1 text-xs text-text-secondary">{b.label}</div>
                <div className="mt-1 text-[11px] tabular-nums text-text-muted">
                  statt {fmtPrice(bp)} {currency} nur{' '}
                  <span className="font-semibold text-accent">
                    {fmtPrice(final)} {currency}
                  </span>{' '}
                  · +{b.bundledService.durationMinutes} Min
                </div>
              </div>
              <div
                className={[
                  'flex h-8 w-8 flex-none items-center justify-center rounded-full border-2 text-sm font-bold',
                  active
                    ? 'border-accent bg-accent text-accent-foreground'
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
      <p className="mt-3 text-center text-xs text-text-muted">
        Oder einfach weiter — Du kannst Kombis später noch hinzufügen.
      </p>
    </section>
  );
}
