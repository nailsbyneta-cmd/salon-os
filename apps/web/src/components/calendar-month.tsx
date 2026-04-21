import Link from 'next/link';
import { cn } from '@salon-os/ui';

interface MonthAppt {
  id: string;
  startAt: string;
  status: string;
  staff: { color: string | null };
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/**
 * Monatsansicht: 7 Spalten (Mo–So, ISO), 5–6 Zeilen.
 * Cell zeigt Tag-Nummer + Punkte pro Termin (staff-farbig),
 * bei > 4 Terminen: "+ N mehr".
 */
export function CalendarMonth({
  appts,
  anchor,
}: {
  appts: MonthAppt[];
  anchor: Date;
}): React.JSX.Element {
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const weekday = (monthStart.getDay() + 6) % 7; // Mo = 0
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - weekday);
  const weeks = Math.ceil((monthEnd.getDate() + weekday) / 7);
  const totalCells = weeks * 7;

  const byDate = new Map<string, MonthAppt[]>();
  for (const a of appts) {
    const key = a.startAt.slice(0, 10);
    const bucket = byDate.get(key) ?? [];
    bucket.push(a);
    byDate.set(key, bucket);
  }

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  const todayStr = new Date().toDateString();
  const weekdayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="grid grid-cols-7 border-b border-border">
        {weekdayLabels.map((w) => (
          <div
            key={w}
            className="border-r border-border px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-text-muted last:border-r-0"
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, idx) => {
          const inMonth = d.getMonth() === anchor.getMonth();
          const dayKey = isoDay(d);
          const dayAppts = (byDate.get(dayKey) ?? []).filter(
            (a) => a.status !== 'CANCELLED' && a.status !== 'NO_SHOW',
          );
          const isToday = d.toDateString() === todayStr;
          const isLastRow = idx >= cells.length - 7;
          return (
            <Link
              key={dayKey}
              href={`/calendar?view=day&date=${dayKey}`}
              className={cn(
                'relative border-r border-border p-1 transition-colors last:border-r-0 min-h-[90px] hover:bg-surface-raised/60 sm:p-2 sm:min-h-[110px]',
                !isLastRow && 'border-b',
                !inMonth && 'bg-background/40',
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                    isToday && 'bg-accent text-accent-foreground',
                    !isToday && inMonth && 'text-text-primary',
                    !inMonth && 'text-text-muted/60',
                  )}
                >
                  {d.getDate()}
                </span>
                {dayAppts.length > 0 ? (
                  <span className="text-[10px] font-medium text-text-muted">
                    {dayAppts.length}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 space-y-1">
                {dayAppts.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-1.5 text-[10px] text-text-secondary"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          a.staff.color ?? 'hsl(var(--border-strong))',
                      }}
                    />
                    <span className="tabular-nums">
                      {new Date(a.startAt).toLocaleTimeString('de-CH', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
                {dayAppts.length > 3 ? (
                  <div className="text-[10px] text-text-muted">
                    + {dayAppts.length - 3} mehr
                  </div>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
