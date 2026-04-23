'use client';
import * as React from 'react';
import { Badge, Button, Card, CardBody, Field, Input } from '@salon-os/ui';
import { createAddOn, deleteAddOn, updateAddOn } from '../actions';

export type AddOn = {
  id: string;
  name: string;
  priceDelta: string | number;
  durationDeltaMin: number;
  sortOrder: number;
};

/**
 * Add-Ons (Phorest-Stil) — optionale Extras zum Primär-Service. Kunde hakt
 * 0-n Add-Ons an (French, Paraffin, LED-Therapie). 0-Minuten-Add-Ons möglich
 * (kosten nur Geld, keine Zeit).
 */
export function AddOnsEditor({
  serviceId,
  initialAddOns,
}: {
  serviceId: string;
  initialAddOns: AddOn[];
}): React.JSX.Element {
  const [addOns, setAddOns] = React.useState<AddOn[]>(initialAddOns);
  const [name, setName] = React.useState('');
  const [price, setPrice] = React.useState('0');
  const [duration, setDuration] = React.useState('0');
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const add = (): void => {
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name ist Pflicht.');
      return;
    }
    startTransition(async () => {
      try {
        await createAddOn(serviceId, {
          name: trimmedName,
          priceDelta: Number(price) || 0,
          durationDeltaMin: Number(duration) || 0,
          sortOrder: addOns.length,
        });
        setName('');
        setPrice('0');
        setDuration('0');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler');
      }
    });
  };

  const remove = (id: string, label: string): void => {
    if (!confirm(`Add-On "${label}" entfernen?`)) return;
    startTransition(async () => {
      await deleteAddOn(serviceId, id);
      setAddOns((a) => a.filter((x) => x.id !== id));
    });
  };

  return (
    <Card className="mb-4">
      <CardBody className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-text-primary">Add-Ons</p>
          <p className="mt-0.5 text-xs text-text-secondary">
            Optionale Extras die der Kunde zu diesem Service dazubuchen kann — z.B. French,
            Paraffin, LED. 0 Min = nur Preis-Aufschlag ohne Zeit.
          </p>
        </div>

        {addOns.length > 0 ? (
          <ul className="space-y-1">
            {addOns.map((a) => (
              <AddOnRow
                key={a.id}
                serviceId={serviceId}
                addOn={a}
                onRemove={() => remove(a.id, a.name)}
                disabled={pending}
              />
            ))}
          </ul>
        ) : (
          <p className="text-xs text-text-muted">Noch keine Add-Ons.</p>
        )}

        <div className="rounded-md border border-border bg-surface/50 p-3">
          <p className="mb-2 text-xs font-semibold text-text-primary">+ Neues Add-On</p>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="French"
                disabled={pending}
                className="w-40"
              />
            </Field>
            <Field label="Preis Δ" hint="CHF +">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={pending}
                className="w-24"
              />
            </Field>
            <Field label="Dauer Δ" hint="Min +">
              <Input
                type="number"
                step="5"
                min="0"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                disabled={pending}
                className="w-24"
              />
            </Field>
            <Button type="button" variant="primary" onClick={add} disabled={pending}>
              Hinzufügen
            </Button>
          </div>
          {error ? <p className="mt-2 text-xs font-medium text-danger">{error}</p> : null}
        </div>
      </CardBody>
    </Card>
  );
}

function AddOnRow({
  serviceId,
  addOn,
  onRemove,
  disabled,
}: {
  serviceId: string;
  addOn: AddOn;
  onRemove: () => void;
  disabled: boolean;
}): React.JSX.Element {
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(addOn.name);
  const [price, setPrice] = React.useState(String(addOn.priceDelta));
  const [duration, setDuration] = React.useState(String(addOn.durationDeltaMin));
  const [pending, startTransition] = React.useTransition();

  const save = (): void => {
    startTransition(async () => {
      await updateAddOn(serviceId, addOn.id, {
        name: name.trim(),
        priceDelta: Number(price) || 0,
        durationDeltaMin: Number(duration) || 0,
      });
      setEditing(false);
    });
  };

  if (editing) {
    return (
      <li className="flex flex-wrap items-end gap-2 rounded-md bg-surface-raised/60 px-2 py-1.5">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="w-32" />
        <Input
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-20"
        />
        <Input
          type="number"
          step="5"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-20"
        />
        <Button type="button" variant="primary" onClick={save} disabled={pending}>
          OK
        </Button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs text-text-muted hover:underline"
        >
          Abbrechen
        </button>
      </li>
    );
  }

  const priceNum = Number(addOn.priceDelta);
  const priceLabel = priceNum > 0 ? `+${priceNum} CHF` : `${priceNum} CHF`;

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-md bg-surface-raised/40 px-2 py-1.5 text-sm">
      <span className="font-medium text-text-primary">{addOn.name}</span>
      <Badge tone="neutral">{priceLabel}</Badge>
      <Badge tone="neutral">+{addOn.durationDeltaMin} Min</Badge>
      <button
        type="button"
        onClick={() => setEditing(true)}
        disabled={disabled}
        className="ml-auto text-xs text-text-muted hover:underline"
      >
        Bearbeiten
      </button>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="text-xs text-danger hover:underline"
      >
        Entfernen
      </button>
    </li>
  );
}
