'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@salon-os/ui';
import { rescheduleAppointment } from '../reschedule-action';

interface Props {
  appointmentId: string;
  currentStartIso: string;
  durationMinutes: number;
}

export function AppointmentEditForm({
  appointmentId,
  currentStartIso,
  durationMinutes,
}: Props): React.JSX.Element {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const initDate = currentStartIso.slice(0, 10);
  const initTime = currentStartIso.slice(11, 16);

  const [date, setDate] = React.useState(initDate);
  const [time, setTime] = React.useState(initTime);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const newStart = new Date(`${date}T${time}:00`);
      const newEnd = new Date(newStart.getTime() + durationMinutes * 60_000);
      const result = await rescheduleAppointment(
        appointmentId,
        newStart.toISOString(),
        newEnd.toISOString(),
      );
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
