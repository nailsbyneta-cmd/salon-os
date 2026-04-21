import * as React from 'react';

import { cn } from './cn.js';

// ─── TreatmentTimer ───────────────────────────────────────────
//
// Countdown für Behandlungen mit festen Stufen (Einwirkzeit Color,
// Keratin, etc.). Props-Kontrolliert über `endsAt` — die Komponente
// tickt nur das UI. Kein eigener Persistenz-Layer.
//
// Farb-Stufen:
//   - grün: > 25% Restzeit
//   - gelb: 10–25%
//   - rot:  < 10% oder überfällig
// Optional `pulseWhenDone` lässt den Ring blinken.

export interface TreatmentTimerProps {
  endsAt: Date;
  totalDurationMin: number;
  label?: string;
  onComplete?: () => void;
  pulseWhenDone?: boolean;
  className?: string;
}

function format(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function TreatmentTimer({
  endsAt,
  totalDurationMin,
  label,
  onComplete,
  pulseWhenDone = true,
  className,
}: TreatmentTimerProps): React.JSX.Element {
  const [now, setNow] = React.useState(() => Date.now());
  const calledDone = React.useRef(false);

  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remainingMs = endsAt.getTime() - now;
  const totalMs = totalDurationMin * 60 * 1000;
  const pct = Math.max(0, Math.min(1, remainingMs / totalMs));
  const overdue = remainingMs < 0;

  React.useEffect(() => {
    if (remainingMs <= 0 && !calledDone.current) {
      calledDone.current = true;
      onComplete?.();
    }
  }, [remainingMs, onComplete]);

  const color =
    pct > 0.25 ? 'text-success' : pct > 0.1 ? 'text-warning' : 'text-danger';

  return (
    <div
      role="timer"
      aria-live={overdue ? 'assertive' : 'polite'}
      className={cn(
        'inline-flex flex-col items-center gap-1 rounded-lg bg-surface border border-border p-4',
        overdue && pulseWhenDone && 'animate-pulse border-danger',
        className,
      )}
    >
      {label ? (
        <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
          {label}
        </span>
      ) : null}
      <span className={cn('font-mono text-3xl font-semibold tabular-nums', color)}>
        {format(Math.abs(remainingMs) / 1000)}
      </span>
      <div className="h-1 w-full overflow-hidden rounded-full bg-surface-raised">
        <div
          className={cn('h-full transition-all', color, 'bg-current')}
          style={{ width: `${pct * 100}%` }}
          aria-hidden
        />
      </div>
      {overdue ? (
        <span className="text-xs text-danger">Überfällig</span>
      ) : null}
    </div>
  );
}
