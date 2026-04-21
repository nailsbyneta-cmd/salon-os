import * as React from 'react';

import { cn } from './cn.js';

// ─── TimePicker (native-backed) ───────────────────────────────
//
// `<input type="time">` mit Design-Token-Styling. Optional `step` in
// Sekunden — z.B. 900 = 15-Minuten-Raster für Kalender-Slots.
// Value-Format: `HH:mm` (24h, ISO). Ergänzung `snapToStep` erzwingt,
// dass der manuelle Input auf das Raster rundet.

export interface TimePickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'step'> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Step in Sekunden. Default: 60 (1 min). 900 = 15-Min-Raster. */
  step?: number;
  /** Erzwingt das Runden manuell eingegebener Werte aufs nächste Step-Intervall. */
  snapToStep?: boolean;
}

function snapTimeToStep(hhmm: string, stepSeconds: number): string {
  if (!hhmm || !hhmm.includes(':')) return hhmm;
  const [hStr, mStr] = hhmm.split(':');
  const h = Number.parseInt(hStr ?? '0', 10);
  const m = Number.parseInt(mStr ?? '0', 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const totalSec = h * 3600 + m * 60;
  const stepped = Math.round(totalSec / stepSeconds) * stepSeconds;
  const clamped = Math.max(0, Math.min(stepped, 24 * 3600 - 60));
  const hh = Math.floor(clamped / 3600);
  const mm = Math.floor((clamped % 3600) / 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export const TimePicker = React.forwardRef<HTMLInputElement, TimePickerProps>(
  function TimePicker(
    { value, defaultValue, onValueChange, step = 60, snapToStep, className, onChange, ...rest },
    ref,
  ) {
    const [internal, setInternal] = React.useState(defaultValue ?? '');
    const current = value ?? internal;

    const handle = (e: React.ChangeEvent<HTMLInputElement>): void => {
      const raw = e.target.value;
      const next = snapToStep && step > 60 ? snapTimeToStep(raw, step) : raw;
      setInternal(next);
      onValueChange?.(next);
      onChange?.(e);
    };

    return (
      <input
        ref={ref}
        type="time"
        value={current}
        onChange={handle}
        step={step}
        className={cn(
          'h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm',
          'text-text-primary placeholder:text-text-muted',
          'focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        {...rest}
      />
    );
  },
);
