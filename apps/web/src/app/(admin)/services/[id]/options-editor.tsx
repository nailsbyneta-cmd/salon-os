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
 * Jede Option hat Preis-/Dauer-/Processing-Delta. Der Kunde klickt sich durch
 * die Gruppen, das System rechnet Endpreis + End-Dauer.
 */
export function OptionsEditor({
  serviceId,
  initialGroups,
}: {
  serviceId: string;
  initialGroups: Group[];
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
              <GroupRow key={g.id} serviceId={serviceId} group={g} />
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

function GroupRow({ serviceId, group }: { serviceId: string; group: Group }): React.JSX.Element {
  const [pending, startTransition] = React.useTransition();
  const [newOptionLabel, setNewOptionLabel] = React.useState('');
  const [newOptionPrice, setNewOptionPrice] = React.useState('0');
  const [newOptionDuration, setNewOptionDuration] = React.useState('0');
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
        await createOption(serviceId, {
          groupId: group.id,
          label,
          priceDelta: Number(newOptionPrice) || 0,
          durationDeltaMin: Number(newOptionDuration) || 0,
          processingDeltaMin: Number(newOptionProcessing) || 0,
          isDefault: group.options.length === 0,
          sortOrder: group.options.length,
        });
        setNewOptionLabel('');
        setNewOptionPrice('0');
        setNewOptionDuration('0');
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
          <Field label="Preis Δ" hint="CHF ±">
            <Input
              type="number"
              step="0.01"
              value={newOptionPrice}
              onChange={(e) => setNewOptionPrice(e.target.value)}
              disabled={pending}
              className="w-24"
            />
          </Field>
          <Field label="Dauer Δ" hint="Min ±">
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
  onRemove,
  disabled,
}: {
  serviceId: string;
  option: Option;
  onRemove: () => void;
  disabled: boolean;
}): React.JSX.Element {
  const [editing, setEditing] = React.useState(false);
  const [label, setLabel] = React.useState(option.label);
  const [price, setPrice] = React.useState(String(option.priceDelta));
  const [duration, setDuration] = React.useState(String(option.durationDeltaMin));
  const [processing, setProcessing] = React.useState(String(option.processingDeltaMin));
  const [pending, startTransition] = React.useTransition();

  const save = (): void => {
    startTransition(async () => {
      await updateOption(serviceId, option.id, {
        label: label.trim(),
        priceDelta: Number(price) || 0,
        durationDeltaMin: Number(duration) || 0,
        processingDeltaMin: Number(processing) || 0,
      });
      setEditing(false);
    });
  };

  const fmt = (n: number): string => (n > 0 ? `+${n}` : String(n));
  const priceNum = Number(option.priceDelta);
  const priceLabel =
    priceNum === 0 ? '±0 CHF' : priceNum > 0 ? `+${priceNum} CHF` : `${priceNum} CHF`;

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
      <Badge tone="neutral">{fmt(option.durationDeltaMin)} Min</Badge>
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
