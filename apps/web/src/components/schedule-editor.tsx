'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardBody, Input } from '@salon-os/ui';

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type Interval = { open: string; close: string };
type Schedule = Record<DayKey, Interval[]>;

const WEEKDAYS: Array<{ key: DayKey; label: string }> = [
  { key: 'mon', label: 'Montag' },
  { key: 'tue', label: 'Dienstag' },
  { key: 'wed', label: 'Mittwoch' },
  { key: 'thu', label: 'Donnerstag' },
  { key: 'fri', label: 'Freitag' },
  { key: 'sat', label: 'Samstag' },
  { key: 'sun', label: 'Sonntag' },
];

const EMPTY: Schedule = {
  mon: [],
  tue: [],
  wed: [],
  thu: [],
  fri: [],
  sat: [],
  sun: [],
};

function defaultIntervalFor(existing: Interval[]): Interval {
  if (existing.length === 0) return { open: '09:00', close: '18:00' };
  const last = existing[existing.length - 1]!;
  return { open: last.close, close: '18:00' };
}

/**
 * Wiederverwendbarer Schedule-Editor. Wird vom Staff-Weekly-Schedule
 * und Location-OpeningHours benutzt. Beide haben gleichen
 * Array-of-Intervals-Shape.
 */
export function ScheduleEditor({
  initial,
  onSave,
  title = 'Arbeitszeiten',
  subtitle = 'Einmal einstellen — gilt bis auf weiteres.',
  emptyHint = 'Leere Vorlage = Fallback auf Location-Öffnungszeiten.',
}: {
  initial: Schedule | null;
  onSave: (schedule: Schedule) => Promise<void>;
  title?: string;
  subtitle?: string;
  emptyHint?: string;
}): React.JSX.Element {
  const router = useRouter();
  const [schedule, setSchedule] = React.useState<Schedule>(() => ({
    ...EMPTY,
    ...(initial ?? {}),
  }));
  const [isPending, startTransition] = React.useTransition();
  const [saved, setSaved] = React.useState(false);

  const updateInterval = (
    day: DayKey,
    index: number,
    field: 'open' | 'close',
    value: string,
  ): void => {
    setSchedule((s) => ({
      ...s,
      [day]: s[day].map((iv, i) => (i === index ? { ...iv, [field]: value } : iv)),
    }));
    setSaved(false);
  };

  const addInterval = (day: DayKey): void => {
    setSchedule((s) => ({ ...s, [day]: [...s[day], defaultIntervalFor(s[day])] }));
    setSaved(false);
  };

  const removeInterval = (day: DayKey, index: number): void => {
    setSchedule((s) => ({ ...s, [day]: s[day].filter((_, i) => i !== index) }));
    setSaved(false);
  };

  const handleSave = (): void => {
    startTransition(async () => {
      await onSave(schedule);
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    });
  };

  const isEmpty = WEEKDAYS.every((d) => schedule[d.key].length === 0);

  return (
    <Card className="mb-4">
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-text-primary">{title}</p>
            <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>
          </div>
          {saved ? <span className="text-xs font-medium text-success">✓ Gespeichert</span> : null}
        </div>

        <div className="space-y-2">
          {WEEKDAYS.map(({ key, label }) => (
            <div
              key={key}
              className="flex flex-wrap items-start gap-3 rounded-md border border-border bg-surface/50 p-3"
            >
              <div className="w-24 shrink-0 pt-2 text-sm font-medium text-text-primary">
                {label}
              </div>
              <div className="flex flex-1 flex-wrap items-center gap-2">
                {schedule[key].length === 0 ? (
                  <span className="text-xs text-text-muted">geschlossen</span>
                ) : (
                  schedule[key].map((iv, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <Input
                        type="time"
                        value={iv.open}
                        onChange={(e) => updateInterval(key, i, 'open', e.target.value)}
                        className="w-[7rem]"
                        aria-label={`${label} Intervall ${i + 1} Start`}
                      />
                      <span className="text-text-muted">–</span>
                      <Input
                        type="time"
                        value={iv.close}
                        onChange={(e) => updateInterval(key, i, 'close', e.target.value)}
                        className="w-[7rem]"
                        aria-label={`${label} Intervall ${i + 1} Ende`}
                      />
                      <button
                        type="button"
                        onClick={() => removeInterval(key, i)}
                        className="ml-1 h-6 w-6 rounded-sm text-text-muted hover:bg-danger/10 hover:text-danger"
                        aria-label="Intervall entfernen"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
                <button
                  type="button"
                  onClick={() => addInterval(key)}
                  className="h-8 rounded-md border border-dashed border-border px-2.5 text-xs text-text-secondary transition-colors hover:border-accent hover:text-accent"
                >
                  + Intervall
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <p className="text-xs text-text-muted">
            {isEmpty ? emptyHint : 'Änderungen werden sofort live wirksam.'}
          </p>
          <Button onClick={handleSave} variant="primary" size="sm" disabled={isPending}>
            {isPending ? 'Speichere…' : 'Speichern'}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

export type { Schedule, Interval, DayKey };
