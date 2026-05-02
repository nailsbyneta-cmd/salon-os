'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@salon-os/ui';
import { rescheduleAppointment } from '../reschedule-action';

interface Props {
  appointmentId: string;
  currentStartIso: string;
  durationMinutes: number;
  timezone: string;
}

function toWallTime(isoUtc: string, tz: string): { date: string; time: string } {
  const dt = new Date(isoUtc);
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dt);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(dt);
  return { date, time };
}

function wallTimeToUtcIso(date: string, time: string, tz: string): string {
  // Build a wall-clock string and interpret it in the given timezone
  const wallStr = `${date}T${time}:00`;
  // Use Intl to find the UTC offset for that wall time in the given timezone
  const localDt = new Date(wallStr);
  // Get what "this wall time in tz" corresponds to in UTC via offset computation
  const utcMs = localDt.getTime();
  // Compute offset: format localDt as if it were in tz and compare with UTC string
  const utcString = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(localDt);
  // Parse the tz-formatted string back
  const [datePart, timePart] = utcString.replace(', ', 'T').split('T');
  const tzAsUtc = new Date(`${datePart}T${timePart}Z`);
  const offsetMs = tzAsUtc.getTime() - utcMs;
  // The wall time in tz as UTC = treat wallStr as UTC then subtract offset
  const wallAsUtcMs = new Date(`${wallStr}Z`).getTime();
  return new Date(wallAsUtcMs - offsetMs).toISOString();
}

export function AppointmentEditForm({
  appointmentId,
  currentStartIso,
  durationMinutes,
  timezone,
}: Props): React.JSX.Element {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const { date: initDate, time: initTime } = toWallTime(currentStartIso, timezone);

  const [date, setDate] = React.useState(initDate);
  const [time, setTime] = React.useState(initTime);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const todayIso = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const newStartIso = wallTimeToUtcIso(date, time, timezone);
      const newEndIso = new Date(
        new Date(newStartIso).getTime() + durationMinutes * 60_000,
      ).toISOString();
      const result = await rescheduleAppointment(appointmentId, newStartIso, newEndIso);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-surface px-2.5 text-[11px] font-medium text-text-secondary transition-colors hover:border-accent/50 hover:bg-surface-raised hover:text-accent"
      >
        ✎ Datum / Zeit ändern
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-accent/30 bg-accent/5 p-4"
    >
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Datum
        </label>
        <Input
          type="date"
          value={date}
          min={todayIso}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-40"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Uhrzeit
        </label>
        <Input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
          className="w-32"
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Dauer
        </span>
        <span className="flex h-10 items-center text-sm tabular-nums text-text-secondary">
          {durationMinutes} Min
        </span>
      </div>
      <div className="flex items-end gap-2">
        <Button type="submit" variant="accent" disabled={saving}>
          {saving ? 'Speichern…' : 'Speichern'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setDate(initDate);
            setTime(initTime);
            setError(null);
          }}
        >
          Abbrechen
        </Button>
      </div>
      {error ? (
        <p role="alert" className="w-full text-xs text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}
