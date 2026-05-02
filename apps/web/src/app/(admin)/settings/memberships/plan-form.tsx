'use client';
import { Card, CardBody, Field, Input } from '@salon-os/ui';
import { createPlan } from './actions';

export function PlanForm(): React.JSX.Element {
  return (
    <Card>
      <CardBody>
        <h3 className="mb-4 text-sm font-semibold text-text-primary">Neuer Mitgliedschafts-Plan</h3>
        <form action={createPlan} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Plan-Name" required>
              <Input name="name" placeholder="z.B. Monats-Flatrate" required maxLength={120} />
            </Field>
            <Field label="Preis (CHF)" required>
              <Input
                name="priceChf"
                type="number"
                min={0}
                step="0.01"
                placeholder="49.00"
                required
              />
            </Field>
          </div>

          <Field label="Beschreibung (optional)">
            <Input
              name="description"
              placeholder="Enthält 4 Behandlungen pro Monat…"
              maxLength={500}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Abrechnungszyklus" required>
              <select
                name="billingCycle"
                required
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="MONTHLY">Monatlich</option>
                <option value="QUARTERLY">Vierteljährlich</option>
                <option value="ANNUAL">Jährlich</option>
              </select>
            </Field>
            <Field label="Session-Credits" hint="Leer lassen = unbegrenzt">
              <Input
                name="sessionCredits"
                type="number"
                min={1}
                max={9999}
                placeholder="4"
              />
            </Field>
            <Field label="Rabatt %" hint="0–100, für alle Services">
              <Input
                name="discountPct"
                type="number"
                min={0}
                max={100}
                placeholder="10"
              />
            </Field>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.98]"
            >
              Plan erstellen
            </button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
