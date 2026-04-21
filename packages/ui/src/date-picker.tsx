import * as React from 'react';

import { cn } from './cn.js';

// ─── DatePicker (native-backed) ───────────────────────────────
//
// Baut auf `<input type="date">` auf — Browser bringen das Overlay
// kostenlos mit (inkl. Keyboard-Navi und Locale-Formatierung).
// Wir ergänzen: konsistentes Styling via Design-Tokens, `min`/`max`,
// optional `weekendDisabled`-Guard.
//
// Format: ISO-Datum `YYYY-MM-DD`. Wer ein Date-Objekt will, nutzt
// `new Date(value)` — das bleibt Caller-Sache, um Timezone-Fallen
// nicht zu verschleiern.

export interface DatePickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  min?: string;
  max?: string;
  /** Verhindert Samstag + Sonntag. Für Staff-Scheduling nützlich. */
  weekendDisabled?: boolean;
}

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  function DatePicker(
    { value, defaultValue, onValueChange, min, max, weekendDisabled, className, onChange, ...rest },
    ref,
  ) {
    const [internal, setInternal] = React.useState(defaultValue ?? '');
    const current = value ?? internal;

    const handle = (e: React.ChangeEvent<HTMLInputElement>): void => {
      const next = e.target.value;
      if (weekendDisabled && next) {
        const day = new Date(`${next}T00:00:00`).getDay();
        if (day === 0 || day === 6) return; // Sonntag/Samstag blockieren
      }
      setInternal(next);
      onValueChange?.(next);
      onChange?.(e);
    };

    return (
      <input
        ref={ref}
        type="date"
        value={current}
        onChange={handle}
        min={min}
        max={max}
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
