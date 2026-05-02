'use client';
import * as React from 'react';
import { Button, cn, Field, Input } from '@salon-os/ui';
import { issueRefund } from './actions';

type PaymentMethod = 'CASH' | 'CARD' | 'TWINT';
type RefundReason = 'DUPLICATE' | 'CUSTOMER_DISSATISFIED' | 'SERVICE_NOT_DELIVERED' | 'OTHER';

interface ExistingRefund {
  id: string;
  amount: string | number;
  paymentMethod: string;
  reason: string | null;
  refundedAt: string;
}

interface RefundFormProps {
  appointmentId: string;
  maxRefundable: number;
  currency: string;
  existingRefunds: ExistingRefund[];
}

const paymentMethods: Array<{ id: PaymentMethod; label: string }> = [
  { id: 'CASH', label: 'Bar' },
  { id: 'CARD', label: 'Karte' },
  { id: 'TWINT', label: 'TWINT' },
];

const reasonLabels: Record<RefundReason, string> = {
  DUPLICATE: 'Doppelzahlung',
  CUSTOMER_DISSATISFIED: 'Kundin nicht zufrieden',
  SERVICE_NOT_DELIVERED: 'Leistung nicht erbracht',
  OTHER: 'Sonstiges',
};

export function RefundForm({
  appointmentId,
  maxRefundable,
  currency,
  existingRefunds,
}: RefundFormProps): React.JSX.Element {
  const [amount, setAmount] = React.useState<string>('');
  const [method, setMethod] = React.useState<PaymentMethod>('CASH');
  const [reason, setReason] = React.useState<RefundReason | ''>('');
  const [notes, setNotes] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const parsedAmount = Number(amount);
  const isAmountValid =
    Number.isFinite(parsedAmount) && parsedAmount > 0 && parsedAmount <= maxRefundable;
  const isSubmitDisabled = pending || !isAmountValid;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (!isAmountValid) return;
    setError(null);

    const form = new FormData();
    form.set('amount', String(parsedAmount));
    form.set('paymentMethod', method);
    if (reason) form.set('reason', reason);
    if (notes.trim()) form.set('notes', notes.trim());

    startTransition(async () => {
      try {
        await issueRefund(appointmentId, form);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      }
    });
  }

  return (
    <div className="space-y-4">
      {existingRefunds.length > 0 ? (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
            Bisherige Rückerstattungen
          </p>
          <ul className="space-y-1.5">
            {existingRefunds.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm"
              >
                <span className="text-text-secondary">
                  {new Date(r.refundedAt).toLocaleString('de-CH', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}{' '}
                  · {r.paymentMethod}
                  {r.reason ? ` · ${reasonLabels[r.reason as RefundReason] ?? r.reason}` : ''}
                </span>
                <span className="font-semibold tabular-nums text-text-primary">
                  -{Number(r.amount).toFixed(2)} {currency}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {maxRefundable <= 0 ? (
        <p className="rounded-md border border-border bg-surface-raised px-4 py-3 text-sm text-text-muted">
          Kein erstattbarer Betrag mehr vorhanden.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md border border-border bg-background/50 px-4 py-3 text-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-text-secondary">Verfügbar für Rückerstattung</span>
              <span className="font-semibold tabular-nums text-text-primary">
                {maxRefundable.toFixed(2)} {currency}
              </span>
            </div>
          </div>

          <Field label="Betrag (CHF)">
            <Input
              type="number"
              min={0.01}
              max={maxRefundable}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`max. ${maxRefundable.toFixed(2)}`}
              required
            />
            {parsedAmount > maxRefundable && amount !== '' ? (
              <p className="mt-1 text-xs text-danger">
                Betrag darf {maxRefundable.toFixed(2)} {currency} nicht überschreiten.
              </p>
            ) : null}
          </Field>

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              Zahlungsart
            </p>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={cn(
                    'rounded-md border px-3 py-2.5 text-center text-sm font-medium transition-all',
                    'active:scale-[0.98]',
                    method === m.id
                      ? 'border-accent bg-accent/10 text-accent shadow-sm'
                      : 'border-border bg-surface text-text-secondary hover:border-border-strong',
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              Grund (optional)
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as RefundReason | '')}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Kein Grund angegeben</option>
              {(Object.entries(reasonLabels) as [RefundReason, string][]).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <Field label="Notiz (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Interne Notiz zur Rückerstattung…"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </Field>

          {error ? (
            <p className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="danger"
            size="lg"
            className="w-full"
            loading={pending}
            disabled={isSubmitDisabled}
          >
            Rückerstattung ausstellen
            {isAmountValid ? ` · ${parsedAmount.toFixed(2)} ${currency}` : ''}
          </Button>
        </form>
      )}
    </div>
  );
}
