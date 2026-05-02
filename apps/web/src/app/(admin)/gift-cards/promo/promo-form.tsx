'use client';
import * as React from 'react';
import { Button, cn, Field, Input, Select, Textarea } from '@salon-os/ui';
import { createPromoCode } from './actions';

interface Props {
  onSuccess: () => void;
}

export function PromoForm({ onSuccess }: Props): React.JSX.Element {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await createPromoCode(data);
      if (result.error) {
        setError(result.error);
      } else {
        formRef.current?.reset();
        onSuccess();
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div className="rounded-md border border-danger bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Code" required hint="Max 20 Zeichen, wird als Grossbuchstaben gespeichert.">
          <Input
            name="code"
            placeholder="z. B. SOMMER20"
            maxLength={20}
            required
            onChange={(e) => {
              e.currentTarget.value = e.currentTarget.value.toUpperCase();
            }}
          />
        </Field>
        <Field label="Typ" required>
          <Select name="type" defaultValue="PERCENT" required>
            <option value="PERCENT">Prozent (%)</option>
            <option value="FIXED">Fixbetrag (CHF)</option>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Wert" required hint="Prozent (0–100) oder CHF-Betrag.">
          <Input type="number" name="value" min={0.01} step="0.01" placeholder="10" required />
        </Field>
        <Field label="Mindestbetrag (CHF)" hint="Optional">
          <Input type="number" name="minOrderChf" min={0} step="0.50" placeholder="0" />
        </Field>
        <Field label="Max. Einlösungen" hint="Leer = unbegrenzt">
          <Input type="number" name="maxUsages" min={1} step="1" placeholder="—" />
        </Field>
      </div>

      <Field label="Ablaufdatum" hint="Optional — leer lassen für unbefristet.">
        <Input type="datetime-local" name="expiresAt" />
      </Field>

      <Field label="Notiz (intern)" hint="Nicht für Kunden sichtbar.">
        <Textarea name="note" rows={2} placeholder="z. B. Sommerkampagne 2026" maxLength={500} />
      </Field>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="submit" variant="primary" loading={pending} disabled={pending}>
          Erstellen
        </Button>
      </div>
    </form>
  );
}

// ─── Modal wrapper ───────────────────────────────────────────────────────────

export function PromoFormModal(): React.JSX.Element {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="primary"
        iconLeft={<span className="text-base leading-none">+</span>}
        onClick={() => setOpen(true)}
      >
        Neu erstellen
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className={cn(
              'w-full max-w-lg rounded-xl border border-border bg-background shadow-2xl',
              'divide-y divide-border overflow-hidden',
            )}
          >
            <div className="flex items-center justify-between px-6 py-4">
              <h2 className="font-display text-lg font-semibold tracking-tight text-text-primary">
                Rabatt-Code erstellen
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary"
                aria-label="Schliessen"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <PromoForm onSuccess={() => setOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
