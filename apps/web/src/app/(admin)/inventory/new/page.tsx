import Link from 'next/link';
import { Button, Card, CardBody, Field, Input, Select } from '@salon-os/ui';
import { createProduct } from '../actions';

export default function NewProductPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link
        href="/inventory"
        className="text-xs text-text-muted transition-colors hover:text-text-primary"
      >
        ← Inventar
      </Link>
      <header className="mb-6 mt-4">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
          Inventar
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Neues Produkt
        </h1>
      </header>

      <Card>
        <CardBody>
          <form action={createProduct} className="space-y-5">
            <Field label="Name" required>
              <Input name="name" required placeholder="z. B. Wella Blondor 400 g" />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Marke">
                <Input name="brand" placeholder="Wella" />
              </Field>
              <Field label="SKU / Artikelnummer">
                <Input name="sku" placeholder="WB-400" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Typ">
                <Select name="type" defaultValue="RETAIL">
                  <option value="RETAIL">Retail (Verkauf)</option>
                  <option value="BACKBAR">Backbar (Arbeitsmittel)</option>
                  <option value="BOTH">Beides</option>
                </Select>
              </Field>
              <Field label="Einheit">
                <Input name="unit" placeholder="g, ml, Stk" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Einkaufspreis (CHF)">
                <Input type="number" name="costCHF" min={0} step="0.01" defaultValue={0} />
              </Field>
              <Field label="Verkaufspreis (CHF)">
                <Input type="number" name="retailCHF" min={0} step="0.01" defaultValue={0} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Aktueller Bestand" required>
                <Input type="number" name="stockLevel" min={0} step="1" defaultValue={1} required />
              </Field>
              <Field
                label="Warn-Schwelle"
                hint="Bei diesem Bestand oder weniger: Nachbestellen-Alert."
              >
                <Input type="number" name="reorderAt" min={0} step="1" defaultValue={1} />
              </Field>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Link href="/inventory">
                <Button type="button" variant="ghost">
                  Abbrechen
                </Button>
              </Link>
              <Button type="submit" variant="primary">
                Anlegen
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
