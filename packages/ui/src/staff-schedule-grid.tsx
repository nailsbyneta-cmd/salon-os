import * as React from 'react';

import { cn } from './cn.js';

// ─── StaffScheduleGrid ────────────────────────────────────────
//
// Week × Staff-Grid mit Shift-Blöcken. Konsumenten liefern:
//   - `days`: Liste der sichtbaren Tage (Date-Objekte, meist Mo-So)
//   - `staff`: Liste der Personen (mit id + Display-Namen)
//   - `shifts`: jede Shift verweist auf staffId + day (YYYY-MM-DD)
//     + startMin/endMin (Minuten seit Mitternacht)
//   - `openingHoursMin/Max`: sichtbares Zeit-Fenster, typ. 9:00-20:00
//
// Das Grid ist rein visuell/read-only in v1; Drag/Resize kommen separat
// über `@dnd-kit`.

export interface StaffScheduleStaffRow {
  id: string;
  name: string;
  avatarUrl?: string | null;
  color?: string;
}

export interface StaffScheduleShift {
  id: string;
  staffId: string;
  dayISO: string; // YYYY-MM-DD
  startMin: number;
  endMin: number;
  label?: string;
  tone?: 'default' | 'time-off' | 'break' | 'fully-booked';
}

export interface StaffScheduleGridProps {
  days: Date[];
  staff: StaffScheduleStaffRow[];
  shifts: StaffScheduleShift[];
  openingHoursMin?: number;
  openingHoursMax?: number;
  dayLabelFormat?: Intl.DateTimeFormatOptions;
  onShiftClick?: (shift: StaffScheduleShift) => void;
  className?: string;
}

const DEFAULT_MIN = 9 * 60;
const DEFAULT_MAX = 20 * 60;

const toneClass: Record<NonNullable<StaffScheduleShift['tone']>, string> = {
  default: 'bg-brand/15 border-brand/40 text-brand',
  break: 'bg-surface-raised border-border text-text-secondary',
  'time-off': 'bg-warning/15 border-warning/40 text-warning',
  'fully-booked': 'bg-accent/15 border-accent/40 text-accent',
};

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function StaffScheduleGrid({
  days,
  staff,
  shifts,
  openingHoursMin = DEFAULT_MIN,
  openingHoursMax = DEFAULT_MAX,
  dayLabelFormat = { weekday: 'short', day: '2-digit' },
  onShiftClick,
  className,
}: StaffScheduleGridProps): React.JSX.Element {
  const totalMin = Math.max(1, openingHoursMax - openingHoursMin);

  return (
    <div
      className={cn(
        'overflow-auto rounded-md border border-border bg-surface',
        className,
      )}
    >
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 bg-surface-raised text-text-muted">
          <tr>
            <th className="w-32 border-b border-border px-3 py-2 text-left font-semibold">
              Staff
            </th>
            {days.map((d) => (
              <th
                key={isoDay(d)}
                className="border-b border-border px-2 py-2 text-center font-semibold"
              >
                {d.toLocaleDateString('de-CH', dayLabelFormat)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {staff.map((person) => (
            <tr key={person.id} className="border-b border-border last:border-0">
              <td className="whitespace-nowrap px-3 py-2 font-medium text-text-primary">
                <span
                  aria-hidden
                  className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                  style={{ backgroundColor: person.color ?? '#737373' }}
                />
                {person.name}
              </td>
              {days.map((d) => {
                const iso = isoDay(d);
                const cellShifts = shifts.filter(
                  (s) => s.staffId === person.id && s.dayISO === iso,
                );
                return (
                  <td
                    key={iso}
                    className="relative h-16 border-l border-border align-top"
                  >
                    {cellShifts.map((s) => {
                      const from = Math.max(s.startMin, openingHoursMin);
                      const to = Math.min(s.endMin, openingHoursMax);
                      if (to <= from) return null;
                      const leftPct = ((from - openingHoursMin) / totalMin) * 100;
                      const widthPct = ((to - from) / totalMin) * 100;
                      const tone = s.tone ?? 'default';
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => onShiftClick?.(s)}
                          className={cn(
                            'absolute top-1 bottom-1 overflow-hidden rounded px-1.5 py-0.5 text-left',
                            'border text-[11px] leading-tight',
                            'transition-transform hover:-translate-y-[1px] hover:shadow-sm',
                            toneClass[tone],
                          )}
                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                          title={`${formatMin(from)}–${formatMin(to)}${s.label ? ` · ${s.label}` : ''}`}
                        >
                          <span className="block truncate font-medium">
                            {s.label ?? `${formatMin(from)}–${formatMin(to)}`}
                          </span>
                          {s.label ? (
                            <span className="block text-[10px] opacity-70">
                              {formatMin(from)}–{formatMin(to)}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
