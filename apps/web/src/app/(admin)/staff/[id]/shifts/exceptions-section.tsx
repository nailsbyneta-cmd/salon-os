'use client';
import * as React from 'react';
import { Badge, Button, Card, CardBody, Field, Input } from '@salon-os/ui';
import { saveScheduleExceptions } from './actions';

type Interval = { open: string; close: string };
type Exception = { closed: true } | { intervals: Interval[] };
type ExceptionMap = Record<string, Exception>;

/**
 * Ausnahme-Tage — ein spezifisches Datum abweichend vom Weekly-Schedule.
 * Beispiele: 'Am 15.05. nur 09-15 Uhr (Arzttermin)' oder 'Am Samstag
 * 18.05. ausnahmsweise arbeiten'.
 *
 * UI: Liste kommender Ausnahmen + Formular zum Hinzufügen. Pro Eintrag
 * entweder 'geschlossen' oder 'von X bis Y' + optionale Mittagspause.
 *
 * Backend: JSON-Map auf Staff.scheduleExceptions. PUT übermittelt die
 * ganze Map (einfaches Replace-Replace — kein partieller Update-Sync,
 * reicht für <50 Einträge pro Person).
 */
export function ExceptionsSection({
  staffId,
  initialExceptions,
}: {
  staffId: string;
  initialExceptions: ExceptionMap;
}): React.JSX.Element {
  const [exceptions, setExceptions] = React.useState<ExceptionMap>(initialExceptions);
  const [date, setDate] = React.useState('');
  const [closed, setClosed] = React.useState(false);
  const [open, setOpen] = React.useState('09:00');
  const [close, setClose] = React.useState('18:00');
  const [hasLunch, setHasLunch] = React.useState(false);
  const [lunchStart, setLunchStart] = React.useState('12:00');
  const [lunchEnd, setLunchEnd] = React.useState('13:00');
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const persist = (next: ExceptionMap): void => {
    setError(null);
    startTransition(async () => {
      try {
        await saveScheduleExceptions(staffId, next);
        setExceptions(next);
        setSaved(true);
        setTimeout(() => setSaved(false), 3500);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
      }
    });
  };

  const add = (): void => {
    setError(null);
    if (!date) {
      setError('Datum ist Pflicht');
      return;
    }
    let entry: Exception;
    if (closed) {
      entry = { closed: true };
    } else {
      if (!open || !close || close <= open) {
        setError('Arbeitszeit Von/Bis ungültig');
        return;
      }
      const intervals: Interval[] = hasLunch
        ? [
            { open, close: lunchStart },
            { open: lunchEnd, close },
          ]
        : [{ open, close }];
      entry = { intervals };
    }
    const next = { ...exceptions, [date]: entry };
    persist(next);
    // Inputs zurücksetzen
    setDate('');
    setClosed(false);
    setHasLunch(false);
  };

  const remove = (key: string): void => {
    const next = { ...exceptions };
    delete next[key];
    persist(next);
  };

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const sortedEntries = Object.entries(exceptions).sort(([a], [b]) => a.localeCompare(b));
  const upcoming = sortedEntries.filter(([k]) => k >= todayKey);
  const past = sortedEntries.filter(([k]) => k < todayKey);

  return (
    <Card className="mb-4">
      <CardBody className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-text-primary">Ausnahme-Tage</p>
          <p className="mt-0.5 text-xs text-text-secondary">
            Ein spezifisches Datum abweichend — z.B. kürzere Schicht wegen Arzt, oder ausnahmsweise
            einen freien Tag arbeiten.
          </p>
        </div>

        {saved ? (
          <div className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm font-medium text-success">
            ✓ Ausnahme gespeichert.
          </div>
        ) : null}

        {upcoming.length > 0 ? (
          <ul className="space-y-2">
            {upcoming.map(([dateKey, exc]) => (
              <ExceptionRow
                key={dateKey}
                dateKey={dateKey}
                exception={exc}
                onRemove={() => remove(dateKey)}
                disabled={pending}
              />
            ))}
          </ul>
        ) : (
          <p className="text-xs text-text-muted">Keine kommenden Ausnahme-Tage.</p>
        )}

        <div className="rounded-md border border-border bg-surface/50 p-3">
          <p className="mb-3 text-xs font-semibold text-text-primary">+ Neue Ausnahme</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.2fr_2fr_auto]">
            <Field label="Datum">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={pending}
                min={todayKey}
              />
            </Field>
            <div className="flex flex-col gap-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={closed}
                  onChange={(e) => setClosed(e.target.checked)}
                  className="h-4 w-4 accent-accent"
                  disabled={pending}
                />
                <span>An diesem Tag frei</span>
              </label>
              {!closed ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-text-muted">Von</span>
                  <Input
                    type="time"
                    value={open}
                    onChange={(e) => setOpen(e.target.value)}
                    className="w-[6.5rem]"
                    disabled={pending}
                  />
                  <span className="text-xs text-text-muted">Bis</span>
                  <Input
                    type="time"
                    value={close}
                    onChange={(e) => setClose(e.target.value)}
                    className="w-[6.5rem]"
                    disabled={pending}
                  />
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={hasLunch}
                      onChange={(e) => setHasLunch(e.target.checked)}
                      className="h-3.5 w-3.5 accent-accent"
                      disabled={pending}
                    />
                    <span className="text-xs">Mittagspause</span>
                  </label>
                  {hasLunch ? (
                    <>
                      <Input
                        type="time"
                        value={lunchStart}
                        onChange={(e) => setLunchStart(e.target.value)}
                        className="w-[6.5rem]"
                        disabled={pending}
                      />
                      <span className="text-xs text-text-muted">–</span>
                      <Input
                        type="time"
                        value={lunchEnd}
                        onChange={(e) => setLunchEnd(e.target.value)}
                        className="w-[6.5rem]"
                        disabled={pending}
                      />
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="flex items-end">
              <Button type="button" variant="primary" onClick={add} disabled={pending || !date}>
                Hinzufügen
              </Button>
            </div>
          </div>
          {error ? <p className="mt-2 text-xs font-medium text-danger">{error}</p> : null}
        </div>

        {past.length > 0 ? (
          <details className="text-xs">
            <summary className="cursor-pointer text-text-muted">
              Vergangene Ausnahmen ({past.length})
            </summary>
            <ul className="mt-2 space-y-1">
              {past.map(([dateKey, exc]) => (
                <ExceptionRow
                  key={dateKey}
                  dateKey={dateKey}
                  exception={exc}
                  onRemove={() => remove(dateKey)}
                  disabled={pending}
                />
              ))}
            </ul>
          </details>
        ) : null}
      </CardBody>
    </Card>
  );
}

function ExceptionRow({
  dateKey,
  exception,
  onRemove,
  disabled,
}: {
  dateKey: string;
  exception: Exception;
  onRemove: () => void;
  disabled: boolean;
}): React.JSX.Element {
  const d = new Date(`${dateKey}T12:00:00Z`);
  const dateLabel = d.toLocaleDateString('de-CH', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const desc =
    'closed' in exception
      ? 'geschlossen'
      : exception.intervals.map((iv) => `${iv.open}–${iv.close}`).join(' + ');
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm">
      <span className="font-medium text-text-primary tabular-nums">{dateLabel}</span>
      <Badge tone={'closed' in exception ? 'danger' : 'accent'}>{desc}</Badge>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="ml-auto text-xs text-danger hover:underline disabled:opacity-50"
        aria-label="Ausnahme entfernen"
      >
        Entfernen
      </button>
    </li>
  );
}
