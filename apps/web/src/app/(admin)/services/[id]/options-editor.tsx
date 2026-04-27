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
  // Optimistic-Pending: Optionen die im UI schon stehen aber noch nicht
  // server-bestätigt sind. Verhindert dass die Stylistin Enter zweimal drückt
  // weil "nichts passiert ist".
  const [optimistic, setOptimistic] = React.useState<
    Array<{ tmpId: string; label: string; endPrice: number; endDuration: number }>
  >([]);

  const addOption = (): void => {
    setError(null);
    const label = newOptionLabel.trim();
    if (!label) {
      setError('Label ist Pflicht.');
      return;
    }
    if (pending) return; // Doppelklick / Doppel-Enter schlucken
    const endPrice = Number(newOptionPrice);
    const endDuration = Number(newOptionDuration);
    const tmpId = `tmp-${Date.now()}`;
    // Sofort ins UI rendern — User sieht Feedback noch im selben Tick.
    setOptimistic((prev) => [
      ...prev,
      {
        tmpId,
        label,
        endPrice: Number.isFinite(endPrice) ? endPrice : basePrice,
        endDuration: Number.isFinite(endDuration) ? endDuration : baseDuration,
      },
    ]);
    setNewOptionLabel('');
    setNewOptionPrice(String(basePrice));
    setNewOptionDuration(String(baseDuration));
    setNewOptionProcessing('0');
    startTransition(async () => {
      try {
        await createOption(serviceId, {
          groupId: group.id,
          label,
          priceDelta: Number.isFinite(endPrice) ? endPrice - basePrice : 0,
          durationDeltaMin: Number.isFinite(endDuration) ? endDuration - baseDuration : 0,
          processingDeltaMin: Number(newOptionProcessing) || 0,
          isDefault: group.options.length + optimistic.length === 0,
          sortOrder: group.options.length + optimistic.length,
        });
        // Optimistic-Eintrag wird durch den server-revalidierten Re-Render
        // ersetzt — sobald der echte Eintrag in group.options auftaucht
        // verschwindet der tmp.
        setOptimistic((prev) => prev.filter((o) => o.tmpId !== tmpId));
      } catch (err) {
        setOptimistic((prev) => prev.filter((o) => o.tmpId !== tmpId));
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

      {/* Tabellen-Editor — Phorest/Excel-Stil. Kopfzeile + Datenzeilen + leere
          Zeile am Ende für neue Option. Enter im letzten Feld committet. */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-elevated text-xs uppercase tracking-[0.15em] text-text-muted">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Option</th>
              <th className="px-3 py-2 text-right font-semibold">Preis (CHF)</th>
              <th className="px-3 py-2 text-right font-semibold">Dauer (Min)</th>
              <th className="w-12 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
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
            {optimistic.map((o) => (
              <tr key={o.tmpId} className="border-t border-border bg-accent/5">
                <td className="px-3 py-2 text-text-primary">
                  {o.label}
                  <span className="ml-2 text-[11px] italic text-text-muted">speichert…</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                  CHF {o.endPrice}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                  {o.endDuration} Min
                </td>
                <td className="px-2 py-2 text-center text-text-muted">⏳</td>
              </tr>
            ))}
            <tr className="border-t border-border bg-surface-raised/40">
              <td className="px-3 py-2">
                <Input
                  value={newOptionLabel}
                  onChange={(e) => setNewOptionLabel(e.target.value)}
                  placeholder="z.B. Kurz, Gel, Damen…"
                  disabled={pending}
                  className="w-full"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addOption();
                    }
                  }}
                />
              </td>
              <td className="px-3 py-2">
                <Input
                  type="number"
                  step="1"
                  value={newOptionPrice}
                  onChange={(e) => setNewOptionPrice(e.target.value)}
                  disabled={pending}
                  className="w-24 text-right tabular-nums"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addOption();
                    }
                  }}
                />
              </td>
              <td className="px-3 py-2">
                <Input
                  type="number"
                  step="5"
                  value={newOptionDuration}
                  onChange={(e) => setNewOptionDuration(e.target.value)}
                  disabled={pending}
                  className="w-24 text-right tabular-nums"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addOption();
                    }
                  }}
                />
              </td>
              <td className="px-2 py-2 text-center">
                <button
                  type="button"
                  onClick={addOption}
                  disabled={pending || !newOptionLabel.trim()}
                  aria-label="Option hinzufügen"
                  className="text-lg text-accent transition-colors hover:text-accent-foreground disabled:cursor-not-allowed disabled:text-text-muted"
                >
                  +
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {error ? <p className="mt-2 text-xs font-medium text-danger">{error}</p> : null}
      <p className="mt-2 text-[11px] text-text-muted">
        Tipp: Name eingeben, Preis &amp; Dauer setzen, Enter zum Speichern.
      </p>
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
  const [pending, startTransition] = React.useTransition();

  const save = (): void => {
    startTransition(async () => {
      const newEndPrice = Number(price);
      const newEndDuration = Number(duration);
      await updateOption(serviceId, option.id, {
        label: label.trim(),
        priceDelta: Number.isFinite(newEndPrice) ? newEndPrice - basePrice : 0,
        durationDeltaMin: Number.isFinite(newEndDuration) ? newEndDuration - baseDuration : 0,
        processingDeltaMin: option.processingDeltaMin,
      });
      setEditing(false);
    });
  };

  const fmt = (n: number): string => (n > 0 ? `+${n}` : String(n));
  const priceLabel = `CHF ${endPrice}`;
  const durationLabel = `${endDuration} Min`;

  if (editing) {
    const onKey = (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === 'Enter') {
        e.preventDefault();
        save();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setEditing(false);
      }
    };
    return (
      <tr className="border-t border-border bg-surface-raised/60">
        <td className="px-3 py-2">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={onKey}
            autoFocus
            className="w-full"
          />
        </td>
        <td className="px-3 py-2">
          <Input
            type="number"
            step="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onKeyDown={onKey}
            className="w-24 text-right tabular-nums"
          />
        </td>
        <td className="px-3 py-2">
          <Input
            type="number"
            step="5"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            onKeyDown={onKey}
            className="w-24 text-right tabular-nums"
          />
        </td>
        <td className="px-2 py-2 text-center">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            aria-label="Speichern"
            className="text-lg text-accent transition-colors hover:text-accent-foreground"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={pending}
            aria-label="Abbrechen"
            className="ml-1 text-text-muted hover:text-text-primary"
          >
            ✕
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr
      className="cursor-pointer border-t border-border transition-colors hover:bg-surface-raised/40"
      onClick={() => !disabled && setEditing(true)}
    >
      <td className="px-3 py-2 font-medium text-text-primary">
        {option.label}
        {option.isDefault ? (
          <span className="ml-2 text-[10px] uppercase tracking-wider text-accent">★ Default</span>
        ) : null}
        {option.processingDeltaMin !== 0 ? (
          <span className="ml-2 text-[11px] text-text-muted">
            Einwirkzeit {fmt(option.processingDeltaMin)} Min
          </span>
        ) : null}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{priceLabel}</td>
      <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{durationLabel}</td>
      <td className="px-2 py-2 text-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          disabled={disabled}
          aria-label="Option entfernen"
          className="text-text-muted hover:text-danger"
        >
          ×
        </button>
      </td>
    </tr>
  );
}
