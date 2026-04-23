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

/**
 * Wöchentlicher Schicht-Plan. Pro Tag explizit:
 * - geschlossen-Toggle
 * - Arbeitszeit Von/Bis
 * - optional: Mittagspause Von/Bis (splittet den Tag in 2 Intervalle)
 *
 * Interne Darstellung bleibt Array<{open, close}> (kompatibel mit
 * bestehender API). Bei Mittagspause = 2 Einträge: [Vormittag, Nachmittag].
 * Ohne Mittagspause = 1 Eintrag. Geschlossen = leeres Array.
 *
 * Alte Schedules mit 3+ Intervallen werden beim Laden auf die ersten
 * zwei eingedampft (selten bis nie benutzt, vereinfacht die UI).
 */
export function ScheduleEditor({
  initial,
  onSave,
  title = 'Wöchentliche Arbeitszeiten',
  subtitle = 'Einmal einstellen — gilt bis auf weiteres.',
}: {
  initial: Schedule | null;
  onSave: (schedule: Schedule) => Promise<void>;
  title?: string;
  subtitle?: string;
  emptyHint?: string;
}): React.JSX.Element {
  const router = useRouter();
  const [schedule, setSchedule] = React.useState<Schedule>(() => normalize(initial));
  const [isPending, startTransition] = React.useTransition();
  const [saved, setSaved] = React.useState(false);

  const update = (day: DayKey, parts: DaySchedule): void => {
    setSchedule((s) => ({ ...s, [day]: fromDaySchedule(parts) }));
    setSaved(false);
  };

  const handleSave = (): void => {
    startTransition(async () => {
      await onSave(schedule);
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 4000);
    });
  };

  return (
    <Card className="mb-4">
      <CardBody className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>
        </div>

        {saved ? (
          <div className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm font-medium text-success">
            ✓ Arbeitszeiten gespeichert — gilt ab sofort für jeden kommenden Tag.
          </div>
        ) : null}

        <div className="space-y-2">
          {WEEKDAYS.map(({ key, label }) => (
            <DayRow
              key={key}
              label={label}
              day={toDaySchedule(schedule[key])}
              onChange={(d) => update(key, d)}
            />
          ))}
        </div>

        <div className="flex items-center justify-end pt-2">
          <Button onClick={handleSave} variant="primary" size="sm" disabled={isPending}>
            {isPending ? 'Speichere…' : 'Speichern'}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

// — DayRow = ein Wochentag mit explizitem Closed-Toggle + Zeit-Felder —

interface DaySchedule {
  closed: boolean;
  open: string;
  close: string;
  hasLunch: boolean;
  lunchStart: string;
  lunchEnd: string;
}

function DayRow({
  label,
  day,
  onChange,
}: {
  label: string;
  day: DaySchedule;
  onChange: (d: DaySchedule) => void;
}): React.JSX.Element {
  const disabled = day.closed;
  return (
    <div className="rounded-md border border-border bg-surface/50 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-[7rem] items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={!day.closed}
              onChange={(e) => onChange({ ...day, closed: !e.target.checked })}
              className="h-4 w-4 accent-accent"
              aria-label={`${label} offen`}
            />
            <span className="text-sm font-medium text-text-primary">{label}</span>
          </label>
        </div>

        {day.closed ? (
          <span className="text-xs text-text-muted">geschlossen</span>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-text-muted">Von</span>
              <Input
                type="time"
                value={day.open}
                onChange={(e) => onChange({ ...day, open: e.target.value })}
                className="w-[6.5rem]"
                disabled={disabled}
              />
              <span className="text-xs text-text-muted">Bis</span>
              <Input
                type="time"
                value={day.close}
                onChange={(e) => onChange({ ...day, close: e.target.value })}
                className="w-[6.5rem]"
                disabled={disabled}
              />
            </div>

            <label className="inline-flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={day.hasLunch}
                onChange={(e) => onChange({ ...day, hasLunch: e.target.checked })}
                className="h-3.5 w-3.5 accent-accent"
                disabled={disabled}
              />
              <span className="text-xs text-text-secondary">Mittagspause</span>
            </label>

            {day.hasLunch ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-muted">Von</span>
                <Input
                  type="time"
                  value={day.lunchStart}
                  onChange={(e) => onChange({ ...day, lunchStart: e.target.value })}
                  className="w-[6.5rem]"
                  disabled={disabled}
                />
                <span className="text-xs text-text-muted">Bis</span>
                <Input
                  type="time"
                  value={day.lunchEnd}
                  onChange={(e) => onChange({ ...day, lunchEnd: e.target.value })}
                  className="w-[6.5rem]"
                  disabled={disabled}
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

// — Mappers zwischen Interval[] (Speicher-Format) und DaySchedule (UI-Model) —

function toDaySchedule(intervals: Interval[]): DaySchedule {
  if (intervals.length === 0) {
    return {
      closed: true,
      open: '09:00',
      close: '18:00',
      hasLunch: false,
      lunchStart: '12:00',
      lunchEnd: '13:00',
    };
  }
  if (intervals.length === 1) {
    return {
      closed: false,
      open: intervals[0]!.open,
      close: intervals[0]!.close,
      hasLunch: false,
      lunchStart: '12:00',
      lunchEnd: '13:00',
    };
  }
  // 2+ Intervalle: nimm erstes + letztes; die Zeit dazwischen ist die
  // Mittagspause (close_1 bis open_last).
  const first = intervals[0]!;
  const last = intervals[intervals.length - 1]!;
  return {
    closed: false,
    open: first.open,
    close: last.close,
    hasLunch: true,
    lunchStart: first.close,
    lunchEnd: last.open,
  };
}

function fromDaySchedule(d: DaySchedule): Interval[] {
  if (d.closed) return [];
  if (!d.hasLunch) return [{ open: d.open, close: d.close }];
  return [
    { open: d.open, close: d.lunchStart },
    { open: d.lunchEnd, close: d.close },
  ];
}

function normalize(raw: Schedule | null): Schedule {
  const out: Schedule = { ...EMPTY };
  if (!raw) return out;
  for (const k of Object.keys(EMPTY) as DayKey[]) {
    out[k] = raw[k] ?? [];
  }
  return out;
}

export type { Schedule, Interval, DayKey };
