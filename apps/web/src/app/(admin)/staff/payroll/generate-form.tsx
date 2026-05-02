'use client';
import * as React from 'react';
import { Button, Field, Input, Select } from '@salon-os/ui';
import { generatePeriod } from './actions';

interface StaffOption {
  id: string;
  displayName: string | null;
  firstName: string;
  lastName: string;
}

interface Props {
  staff: StaffOption[];
}

function prevMonthRange(): { from: string; to: string } {
  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastOfPrevMonth = new Date(firstOfThisMonth.getTime() - 1);
  const firstOfPrevMonth = new Date(lastOfPrevMonth.getFullYear(), lastOfPrevMonth.getMonth(), 1);
  const fmt = (d: Date): string => d.toISOString().slice(0, 10);
  return { from: fmt(firstOfPrevMonth), to: fmt(lastOfPrevMonth) };
}

export function GenerateForm({ staff }: Props): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const { from, to } = prevMonthRange();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      await generatePeriod(fd);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Neue Abrechnungsperiode
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="generate-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
            <h2
              id="generate-dialog-title"
              className="mb-5 font-display text-lg font-semibold text-text-primary"
            >
              Abrechnungsperiode generieren
            </h2>

            <form
              onSubmit={(e) => {
                void handleSubmit(e);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <Field label="Von">
                  <Input type="date" name="fromDate" defaultValue={from} required max={to} />
                </Field>
                <Field label="Bis">
                  <Input type="date" name="toDate" defaultValue={to} required />
                </Field>
              </div>

              <Field label="Mitarbeiterin (optional — leer = alle)">
                <Select name="staffId" defaultValue="">
                  <option value="">Alle Mitarbeiterinnen</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.displayName ?? `${s.firstName} ${s.lastName}`}
                    </option>
                  ))}
                </Select>
              </Field>

              {error ? (
                <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
              ) : null}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setOpen(false);
                    setError(null);
                  }}
                >
                  Abbrechen
                </Button>
                <Button type="submit" variant="primary" disabled={pending}>
                  {pending ? 'Wird generiert…' : 'Generieren'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
