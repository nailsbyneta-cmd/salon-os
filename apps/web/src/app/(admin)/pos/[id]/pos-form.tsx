'use client';
import * as React from 'react';
import { Button, cn, Field, Input } from '@salon-os/ui';
import { applyPromoCode, checkoutAppointment } from './actions';

type Method = 'CASH' | 'CARD' | 'TWINT' | 'STRIPE_CHECKOUT';
type TipPreset = 0 | 10 | 15 | 20 | 'custom';

const methods: Array<{ id: Method; label: string; emoji: string; hint?: string }> = [
  { id: 'CASH', label: 'Bar', emoji: '💵' },
  { id: 'CARD', label: 'Karte', emoji: '💳', hint: 'Tap-to-Pay' },
  { id: 'TWINT', label: 'TWINT', emoji: '📲' },
  { id: 'STRIPE_CHECKOUT', label: 'Stripe-Link', emoji: '🔗' },
];

export function PosForm({
  appointmentId,
  subtotal,
}: {
  appointmentId: string;
  subtotal: number;
}): React.JSX.Element {
  const [tipPreset, setTipPreset] = React.useState<TipPreset>(15);
  const [customTip, setCustomTip] = React.useState<string>('');
  const [method, setMethod] = React.useState<Method>('CARD');
  const [pending, startTransition] = React.useTransition();

  // Promo code state
  const [promoInput, setPromoInput] = React.useState('');
  const [promoApplying, setPromoApplying] = React.useState(false);
  const [promoError, setPromoError] = React.useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = React.useState<{
    code: string;
    discountChf: number;
    label: string;
  } | null>(null);

  const tipAmount = React.useMemo(() => {
    if (tipPreset === 'custom') return Number(customTip) || 0;
    return +((subtotal * tipPreset) / 100).toFixed(2);
  }, [tipPreset, customTip, subtotal]);

  const discountChf = appliedDiscount?.discountChf ?? 0;
  const total = Math.max(0, subtotal - discountChf) + tipAmount;

  async function handleApplyPromo(): Promise<void> {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoError(null);
    setPromoApplying(true);
    try {
      const result = await applyPromoCode(code, subtotal);
      if (result.valid && result.discountChf !== undefined) {
        setAppliedDiscount({
          code,
          discountChf: result.discountChf,
          label:
            result.type === 'PERCENT'
              ? `${Number(result.value).toFixed(0)} %`
              : `CHF ${Number(result.value).toFixed(2)}`,
        });
        setPromoInput('');
      } else {
        setPromoError(result.reason ?? 'Code ungültig.');
        setAppliedDiscount(null);
      }
    } finally {
      setPromoApplying(false);
    }
  }

  return (
    <form
      action={(form) => {
        form.set('tipAmount', String(tipAmount));
        form.set('paymentMethod', method);
        if (appliedDiscount) {
          form.set('discountCode', appliedDiscount.code);
          form.set('discountChf', String(appliedDiscount.discountChf));
        }
        startTransition(async () => {
          await checkoutAppointment(appointmentId, form);
        });
      }}
      className="space-y-5"
    >
      {/* Rabatt-Code */}
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
          Rabatt-Code
        </p>
        {appliedDiscount ? (
          <div className="flex items-center justify-between rounded-md border border-success bg-success/5 px-4 py-3">
            <div className="text-sm">
              <span className="font-mono font-semibold text-text-primary">
                {appliedDiscount.code}
              </span>
              <span className="ml-2 text-text-secondary">
                ({appliedDiscount.label}) &minus;{appliedDiscount.discountChf.toFixed(2)} CHF
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAppliedDiscount(null)}
              className="ml-3 text-xs text-text-muted underline hover:text-text-primary"
            >
              Entfernen
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={promoInput}
              onChange={(e) => {
                setPromoInput(e.target.value.toUpperCase());
                setPromoError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleApplyPromo();
                }
              }}
              placeholder="SOMMER20"
              maxLength={20}
              className={cn(
                'flex-1 rounded-md border px-3 py-2 text-sm font-mono',
                'bg-surface text-text-primary placeholder:text-text-muted',
                'focus:outline-none focus:ring-2 focus:ring-accent/50',
                promoError ? 'border-danger' : 'border-border',
              )}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleApplyPromo()}
              loading={promoApplying}
              disabled={promoApplying || !promoInput.trim()}
            >
              Anwenden
            </Button>
          </div>
        )}
        {promoError ? (
          <p className="mt-1.5 text-xs text-danger">{promoError}</p>
        ) : null}
      </div>

      {/* Trinkgeld */}
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
          Trinkgeld
        </p>
        <div className="grid grid-cols-5 gap-2">
          {([0, 10, 15, 20, 'custom'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setTipPreset(p)}
              className={cn(
                'rounded-md border px-2 py-3 text-center text-sm font-medium transition-all',
                'active:scale-[0.98]',
                tipPreset === p
                  ? 'border-accent bg-accent/10 text-accent shadow-sm'
                  : 'border-border bg-surface text-text-secondary hover:border-border-strong',
              )}
            >
              {p === 'custom' ? 'Custom' : `${p}%`}
            </button>
          ))}
        </div>
        {tipPreset === 'custom' ? (
          <div className="mt-3">
            <Field label="Trinkgeld CHF">
              <Input
                type="number"
                min={0}
                step="0.50"
                value={customTip}
                onChange={(e) => setCustomTip(e.target.value)}
                placeholder="0.00"
              />
            </Field>
          </div>
        ) : null}
      </div>

      {/* Zahlungsart */}
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
          Zahlungsart
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {methods.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-md border px-2 py-3 text-xs transition-all',
                'active:scale-[0.98]',
                method === m.id
                  ? 'border-brand bg-brand/5 shadow-sm text-text-primary'
                  : 'border-border bg-surface text-text-secondary hover:border-border-strong',
              )}
            >
              <span className="text-lg">{m.emoji}</span>
              <span className="font-medium">{m.label}</span>
              {m.hint ? <span className="text-[9px] text-text-muted">{m.hint}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {/* Total breakdown */}
      <div className="rounded-md border border-border bg-background/50 p-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-text-secondary">Service</span>
          <span className="tabular-nums">{subtotal.toFixed(2)} CHF</span>
        </div>
        {appliedDiscount ? (
          <div className="mt-1 flex items-baseline justify-between text-sm">
            <span className="text-success">
              Rabattcode{' '}
              <span className="font-mono text-xs font-semibold">{appliedDiscount.code}</span>
            </span>
            <span className="tabular-nums text-success">
              &minus;{appliedDiscount.discountChf.toFixed(2)} CHF
            </span>
          </div>
        ) : null}
        <div className="mt-1 flex items-baseline justify-between text-sm">
          <span className="text-text-secondary">Trinkgeld</span>
          <span className="tabular-nums">{tipAmount.toFixed(2)} CHF</span>
        </div>
        <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
          <span className="text-base font-semibold text-text-primary">Total</span>
          <span className="text-xl font-bold tabular-nums">{total.toFixed(2)} CHF</span>
        </div>
      </div>

      <Button
        type="submit"
        variant="accent"
        size="lg"
        className="w-full"
        loading={pending}
        disabled={pending}
      >
        Kassieren · {total.toFixed(2)} CHF
      </Button>
    </form>
  );
}
