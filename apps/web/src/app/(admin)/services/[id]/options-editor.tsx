'use client';
import * as React from 'react';
import { Badge, Button, Card, CardBody, Field, Input } from '@salon-os/ui';
import {
  createOption,
  createOptionGroup,
  deleteOption,
  deleteOptionGroup,
  updateOption,
  updateOptionGroup,
} from '../actions';

export type Option = {
  id: string;
  label: string;
  priceDelta: string | number;
  durationDeltaMin: number;
  processingDeltaMin: number;
  isDefault: boolean;
  sortOrder: number;
};

export type Group = {
  id: string;
  name: string;
  required: boolean;
  multi: boolean;
  sortOrder: number;
  options: Option[];
};

/**
 * Options-Editor — Mangomint-Stil Varianten.
 * Beispiel Nägel: Gruppen = Typ (Gel/Acryl), Modus (Neu/Auffüllen), Länge (Kurz/Mittel/Lang).
 *
 * UX: User trägt ENDPREISE + ENDDAUER pro Option ein (z.B. "Kurz 69 CHF, 60 Min";
 * "Mittel 79 CHF, 75 Min"). Intern werden delta-Werte gespeichert (Schema-Vertrag),
 * aber der Salon-Owner muss nie selbst rechnen.
 */
export function OptionsEditor({
  serviceId,
  initialGroups,
  basePrice,
  baseDuration,
}: {
  serviceId: string;
  initialGroups: Group[];
  basePrice: number;
  baseDuration: number;
}): React.JSX.Element {
  const [groups, setGroups] = React.useState<Group[]>(initialGroups);
  const [newGroupName, setNewGroupName] = React.useState('');
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const addGroup = (): void => {
    setError(null);
    const name = newGroupName.trim();
    if (!name) {
      setError('Gruppen-Name ist Pflicht.');
      return;
    }
    startTransition(async () => {
      try {
        await createOptionGroup(serviceId, {
          name,
          required: true,
          multi: false,
          sortOrder: groups.length,
        });
        setNewGroupName('');
        // Reload via server-revalidation happens — wir pushen optimistisch:
        setGroups((g) => [
          ...g,
          {
            id: `tmp-${Date.now()}`,
            name,
            required: true,
            multi: false,
            sortOrder: g.length,
            options: [],
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler');
      }
    });
  };

  return (
    <Card className="mb-4">
      <CardBody className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-text-primary">Varianten</p>
          <p className="mt-0.5 text-xs text-text-secondary">
            Gruppen wie <em>Typ</em>, <em>Länge</em>, <em>Modus</em>. Jede Option hat optional einen
            Preis- und Dauer-Aufschlag. Kunde wählt pro Gruppe genau eine Option.
          </p>
        </div>

        {groups.length === 0 ? (
          <p className="text-xs text-text-muted">
            Noch keine Varianten — Service ist ein fester Preis/eine feste Dauer.
          </p>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => (
              <GroupRow
                key={g.id}
                serviceId={serviceId}
                group={g}
                basePrice={basePrice}
                baseDuration={baseDuration}
              />
            ))}
          </div>
        )}

        <div className="rounded-md border border-border bg-surface/50 p-3">
          <p className="mb-2 text-xs font-semibold text-text-primary">+ Neue Gruppe</p>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Name" hint="z.B. Typ, Länge, Modus">
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Typ"
                disabled={pending}
                className="w-48"
              />
            </Field>
            <Button type="button" variant="primary" onClick={addGroup} disabled={pending}>
              Hinzufügen
            </Button>
          </div>
          {error ? <p className="mt-2 text-xs font-medium text-danger">{error}</p> : null}
        </div>
      </CardBody>
    </Card>
  );
}

function GroupRow({
  serviceId,
  group,
  basePrice,
  baseDuration,
}: {
  serviceId: string;
  group: Group;
  basePrice: number;
  baseDuration: number;
}): React.JSX.Element {
  const [pending, startTransition] = React.useTransition();
  const [newOptionLabel, setNewOptionLabel] = React.useState('');
  // ENDPREIS + ENDDAUER (User-facing). Default = Service-Basispreis/Dauer.
  const [newOptionPrice, setNewOptionPrice] = React.useState(String(basePrice));
  const [newOptionDuration, setNewOptionDuration] = React.useState(String(baseDuration));
  const [newOptionProcessing, setNewOptionProcessing] = React.useState('0');
  const [error, setError] = React.useState<string | null>(null);

  const addOption = (): void => {
    setError(null);
    const label = newOptionLabel.trim();
    if (!label) {
      setError('Label ist Pflicht.');
      return;
    }
    startTransition(async () => {
      try {
        // Convert User-Input (Endpreis/Enddauer) zurück in Delta für die API.
        const endPrice = Number(newOptionPrice);
        const endDuration = Number(newOptionDuration);
        await createOption(serviceId, {
          groupId: group.id,
          label,
          priceDelta: Number.isFinite(endPrice) ? endPrice - basePrice : 0,
          durationDeltaMin: Number.isFinite(endDuration) ? endDuration - baseDuration : 0,
          processingDeltaMin: Number(newOptionProcessing) || 0,
          isDefault: group.options.length === 0,
          sortOrder: group.options.length,
        });
        setNewOptionLabel('');
        setNewOptionPrice(String(basePrice));
        setNewOptionDuration(String(baseDuration));
        setNewOptionProcessing('0');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler');
      }
    });
  };

  const removeGroup = (): void => {
    if (!confirm(`Gruppe "${group.name}" inkl. aller Optionen entfernen?`)) return;
    startTransition(async () => {
      await deleteOptionGroup(serviceId, group.id);
    });
  };

  const removeOption = (optionId: string, label: string): void => {
    if (!confirm(`Option "${label}" entfernen?`)) return;
    startTransition(async () => {
      await deleteOption(serviceId, optionId);
    });
  };

  const toggleRequired = (): void => {
    startTransition(async () => {
      await updateOptionGroup(serviceId, group.id, { required: !group.required });
    });
  };

  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-text-primary">{group.name}</span>
        <Badge tone={group.required ? 'accent' : 'neutral'}>
          {group.required ? 'Pflicht' : 'Optional'}
        </Badge>
        <button
          type="button"
          onClick={toggleRequired}
          disabled={pending}
          className="text-xs text-text-muted hover:underline"
        >
          {group.required ? 'optional machen' : 'Pflicht machen'}
        </button>
        <button
          type="button"
          onClick={removeGroup}
          disabled={pending}
          className="ml-auto text-xs text-danger hover:underline"
        >
          Gruppe entfernen
        </button>
      </div>

      {group.options.length > 0 ? (
        <ul className="mb-3 space-y-1">
          {group.options.map((o) => (
            <OptionRow
              key={o.id}
              serviceId={serviceId}
              option={o}
              basePrice={basePrice}
              baseDuration={baseDuration}
              onRemove={() => removeOption(o.id, o.label)}
              disabled={pending}
            />
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-xs text-text-muted">Noch keine Optionen in dieser Gruppe.</p>
      )}

      <div className="rounded-md border border-border bg-surface-raised/40 p-2">
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Option" hint="z.B. Gel, Kurz">
            <Input
              value={newOptionLabel}
              onChange={(e) => setNewOptionLabel(e.target.value)}
              placeholder="Gel"
              disabled={pending}
              className="w-32"
            />
          </Field>
          <Field label="Endpreis CHF" hint={`Basis: ${basePrice}`}>
            <Input
              type="number"
              step="1"
              value={newOptionPrice}
              onChange={(e) => setNewOptionPrice(e.target.value)}
              disabled={pending}
              className="w-24"
            />
          </Field>
          <Field label="Dauer Min" hint={`Basis: ${baseDuration}`}>
            <Input
              type="number"
              step="5"
              value={newOptionDuration}
              onChange={(e) => setNewOptionDuration(e.target.value)}
              disabled={pending}
              className="w-24"
            />
          </Field>
          <Field label="Processing Δ" hint="Min ±">
            <Input
              type="number"
              step="5"
              value={newOptionProcessing}
              onChange={(e) => setNewOptionProcessing(e.target.value)}
              disabled={pending}
              className="w-28"
            />
          </Field>
          <Button type="button" variant="ghost" onClick={addOption} disabled={pending}>
            + Option
          </Button>
        </div>
        {error ? <p className="mt-1 text-xs font-medium text-danger">{error}</p> : null}
      </div>
    </div>
  );
}

function OptionRow({
  serviceId,
  option,
  basePrice,
  baseDuration,
  onRemove,
  disabled,
}: {
  serviceId: string;
  option: Option;
  basePrice: number;
  baseDuration: number;
  onRemove: () => void;
  disabled: boolean;
}): React.JSX.Element {
  const [editing, setEditing] = React.useState(false);
  const [label, setLabel] = React.useState(option.label);
  // Endpreis/Enddauer (User-facing) statt Delta. Delta wird beim Save berechnet.
  const endPrice = Number(option.priceDelta) + basePrice;
  const endDuration = option.durationDeltaMin + baseDuration;
  const [price, setPrice] = React.useState(String(endPrice));
  const [duration, setDuration] = React.useState(String(endDuration));
  const [processing, setProcessing] = React.useState(String(option.processingDeltaMin));
  const [pending, startTransition] = React.useTransition();

  const save = (): void => {
    startTransition(async () => {
      const newEndPrice = Number(price);
      const newEndDuration = Number(duration);
      await updateOption(serviceId, option.id, {
        label: label.trim(),
        priceDelta: Number.isFinite(newEndPrice) ? newEndPrice - basePrice : 0,
        durationDeltaMin: Number.isFinite(newEndDuration) ? newEndDuration - baseDuration : 0,
        processingDeltaMin: Number(processing) || 0,
      });
      setEditing(false);
    });
  };

  const fmt = (n: number): string => (n > 0 ? `+${n}` : String(n));
  const priceLabel = `CHF ${endPrice}`;
  const durationLabel = `${endDuration} Min`;

  if (editing) {
    return (
      <li className="flex flex-wrap items-end gap-2 rounded-md bg-surface-raised/60 px-2 py-1.5">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} className="w-28" />
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
        <Input
          type="number"
          step="5"
          value={processing}
          onChange={(e) => setProcessing(e.target.value)}
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

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-md bg-surface-raised/40 px-2 py-1.5 text-sm">
      <span className="font-medium text-text-primary">{option.label}</span>
      <Badge tone="neutral">{priceLabel}</Badge>
      <Badge tone="neutral">{durationLabel}</Badge>
      {option.processingDeltaMin !== 0 ? (
        <Badge tone="neutral">Processing {fmt(option.processingDeltaMin)} Min</Badge>
      ) : null}
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
