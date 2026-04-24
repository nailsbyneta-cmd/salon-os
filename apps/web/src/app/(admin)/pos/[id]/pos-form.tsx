'use client';
import * as React from 'react';
import { Button, cn, Field, Input } from '@salon-os/ui';
import { checkoutAppointment } from './actions';

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

  const tipAmount = React.useMemo(() => {
    if (tipPreset === 'custom') return Number(customTip) || 0;
    return +((subtotal * tipPreset) / 100).toFixed(2);
  }, [tipPreset, customTip, subtotal]);

  const total = subtotal + tipAmount;

  return (
    <form
      action={(form) => {
        form.set('tipAmount', String(tipAmount));
        form.set('paymentMethod', method);
        startTransition(async () => {
          await checkoutAppointment(appointmentId, form);
        });
      }}
      className="space-y-5"
    >
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

      <div className="rounded-md border border-border bg-background/50 p-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-text-secondary">Service</span>
          <span className="tabular-nums">{subtotal.toFixed(2)} CHF</span>
        </div>
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
