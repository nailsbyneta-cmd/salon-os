import * as React from 'react';

import { cn } from './cn.js';

// ─── ServiceBadge ─────────────────────────────────────────────
//
// Chip mit Kategorie-Farbe und optionalem Dauer-Suffix.
// Farb-Präferenz kommt aus der Service-Kategorie; ohne explizite Farbe
// wird der Hash des Labels auf eine stabile Palette gemappt.

const PALETTE = [
  { bg: 'rgba(192, 38, 211, 0.12)', fg: '#9a1fa7' },  // fuchsia
  { bg: 'rgba(124, 58, 237, 0.12)', fg: '#5b21b6' },  // violet
  { bg: 'rgba(14, 165, 233, 0.12)', fg: '#0369a1' },  // sky
  { bg: 'rgba(20, 184, 166, 0.12)', fg: '#0f766e' },  // teal
  { bg: 'rgba(245, 158, 11, 0.12)', fg: '#92400e' },  // amber
  { bg: 'rgba(239, 68, 68, 0.12)',  fg: '#991b1b' },  // red
  { bg: 'rgba(16, 185, 129, 0.12)', fg: '#065f46' },  // emerald
];

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export interface ServiceBadgeProps {
  name: string;
  durationMin?: number;
  color?: string;
  className?: string;
}

export function ServiceBadge({
  name,
  durationMin,
  color,
  className,
}: ServiceBadgeProps): React.JSX.Element {
  const fallback = PALETTE[hashString(name) % PALETTE.length] ?? PALETTE[0]!;
  const picked = color ? { bg: color, fg: '#111' } : fallback;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        className,
      )}
      style={{ backgroundColor: picked.bg, color: picked.fg }}
    >
      <span>{name}</span>
      {durationMin ? <span className="opacity-70">· {durationMin} min</span> : null}
    </span>
  );
}
