'use client';
import * as React from 'react';
import { Badge, Button, Card, CardBody, Field, Input } from '@salon-os/ui';
import { createTimeOff, deleteTimeOff } from './actions';

export interface TimeOffEntry {
  id: string;
  startAt: string;
  endAt: string;
  reason: string | null;
  status: string;
}

/**
 * Ferien & Abwesenheiten — pro Stylistin. Zeigt vergangene + zukünftige
 * Einträge, erlaubt Hinzufügen (startDate, endDate, reason) und Löschen.
 *
 * Backend: /v1/staff/:id/time-off (POST/DELETE), status wird automatisch
 * APPROVED bei MVP (Approval-Flow kommt später).
 *
 * Date-Inputs werden als lokales Datum (YYYY-MM-DD) ins Formular, vor
 * dem Submit mit 00:00/23:59 in lokaler Zeit zum ISO umgewandelt (so
 * deckt eine Ferien vom 15.-22.05. die ganzen Tage ab).
 */
export function TimeOffSection({
  staffId,
  initialEntries,
}: {
  staffId: string;
  initialEntries: TimeOffEntry[];
}): React.JSX.Element {
  const [entries, setEntries] = React.useState(initialEntries);
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const add = (): void => {
    setError(null);
    if (!startDate || !endDate) {
      setError('Start- und End-Datum sind Pflicht');
      return;
    }
    if (endDate < startDate) {
      setError('End-Datum muss ≥ Start-Datum sein');
      return;
    }
    const startIso = new Date(`${startDate}T00:00:00`).toISOString();
    const endIso = new Date(`${endDate}T23:59:59`).toISOString();
    startTransition(async () => {
      try {
        const created = await createTimeOff(staffId, {
          startAt: startIso,
          endAt: endIso,
          reason: reason.trim() || undefined,
        });
        setEntries((es) => [...es, created].sort(byStart));
        setStartDate('');
        setEndDate('');
        setReason('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
      }
    });
  };

  const remove = (id: string): void => {
    startTransition(async () => {
      try {
        await deleteTimeOff(staffId, id);
        setEntries((es) => es.filter((e) => e.id !== id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
      }
    });
  };

  const now = Date.now();
  const active = entries.filter((e) => new Date(e.endAt).getTime() >= now);
  const past = entries.filter((e) => new Date(e.endAt).getTime() < now);

  return (
    <Card className="mb-4">
      <CardBody className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-text-primary">Ferien & Abwesenheiten</p>
          <p className="mt-0.5 text-xs text-text-secondary">
            An diesen Tagen wird die Stylistin nicht für Online-Buchungen angezeigt. Bestehende
            Termine in diesem Zeitraum bleiben (musst du manuell umbuchen).
          </p>
        </div>

        {active.length > 0 ? (
          <ul className="space-y-2">
            {active.map((e) => (
              <TimeOffRow key={e.id} entry={e} onRemove={() => remove(e.id)} disabled={pending} />
            ))}
          </ul>
        ) : (
          <p className="text-xs text-text-muted">Keine aktiven oder kommenden Ferien geplant.</p>
        )}

        <div className="rounded-md border border-border bg-surface/50 p-3">
          <p className="mb-2 text-xs font-semibold text-text-primary">+ Neuer Eintrag</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_2fr_auto]">
            <Field label="Von">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={pending}
              />
            </Field>
            <Field label="Bis">
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={pending}
              />
            </Field>
            <Field label="Grund (optional)">
              <Input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ferien / krank / Weiterbildung"
                disabled={pending}
              />
            </Field>
            <div className="flex items-end">
              <Button
                type="button"
                variant="primary"
                onClick={add}
                disabled={pending || !startDate || !endDate}
              >
                Hinzufügen
              </Button>
            </div>
          </div>
          {error ? <p className="mt-2 text-xs font-medium text-danger">{error}</p> : null}
        </div>

        {past.length > 0 ? (
          <details className="text-xs">
            <summary className="cursor-pointer text-text-muted">
              Vergangene Abwesenheiten ({past.length})
            </summary>
            <ul className="mt-2 space-y-1">
              {past.map((e) => (
                <TimeOffRow key={e.id} entry={e} onRemove={() => remove(e.id)} disabled={pending} />
              ))}
            </ul>
          </details>
        ) : null}
      </CardBody>
    </Card>
  );
}

function TimeOffRow({
  entry,
  onRemove,
  disabled,
}: {
  entry: TimeOffEntry;
  onRemove: () => void;
  disabled: boolean;
}): React.JSX.Element {
  const start = new Date(entry.startAt);
  const end = new Date(entry.endAt);
  const fmt = (d: Date): string =>
    d.toLocaleDateString('de-CH', { day: '2-digit', month: 'short', year: 'numeric' });
  const isActive = Date.now() >= start.getTime() && Date.now() <= end.getTime();
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm">
      <span className="font-medium text-text-primary tabular-nums">
        {fmt(start)} – {fmt(end)}
      </span>
      {isActive ? <Badge tone="warning">gerade aktiv</Badge> : null}
      {entry.reason ? <span className="text-xs text-text-muted">· {entry.reason}</span> : null}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="ml-auto text-xs text-danger hover:underline disabled:opacity-50"
        aria-label="Abwesenheit entfernen"
      >
        Entfernen
      </button>
    </li>
  );
}

function byStart(a: TimeOffEntry, b: TimeOffEntry): number {
  return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
}
