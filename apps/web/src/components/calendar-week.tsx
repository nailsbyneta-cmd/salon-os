import Link from 'next/link';
import { AppointmentCard, type AppointmentStatus, cn } from '@salon-os/ui';

interface WeekAppt {
  id: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  staffId: string;
  client: { firstName: string; lastName: string } | null;
  staff: { firstName: string; lastName: string; color: string | null };
  items: Array<{ service: { name: string } }>;
}

interface WeekStaff {
  id: string;
  firstName: string;
  lastName: string;
  color: string | null;
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8);
const PX_PER_MINUTE = 48 / 60;
const CAL_START = 8 * 60;
const TOTAL_HEIGHT = HOURS.length * 60 * PX_PER_MINUTE;
const COL_MIN_WIDTH = 96;

function minutesFromStart(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes() - CAL_START;
}

function durationMinutes(startIso: string, endIso: string): number {
  return (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000;
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function CalendarWeek({
  appts,
  weekStart,
  staff,
}: {
  appts: WeekAppt[];
  weekStart: Date;
  staff: WeekStaff[];
}): React.JSX.Element {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const todayStr = new Date().toDateString();
  const hasStaffColumns = staff.length > 0;
  const cols = hasStaffColumns ? staff.length : 1;

  const totalCols = days.length * cols;
  const gridTemplate = `64px repeat(${totalCols}, minmax(${COL_MIN_WIDTH}px, 1fr))`;
  const minWidth = 64 + totalCols * COL_MIN_WIDTH;

  const byDay = new Map<string, WeekAppt[]>();
  for (const a of appts) {
    const key = a.startAt.slice(0, 10);
    const bucket = byDay.get(key) ?? [];
    bucket.push(a);
    byDay.set(key, bucket);
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <div
        className="grid"
        style={{ gridTemplateColumns: gridTemplate, minWidth }}
      >
        {/* Day-Header-Zeile (jede Zelle spannt die Staff-Unter-Spalten) */}
        <div className="sticky left-0 z-10 border-b border-r border-border bg-surface" />
        {days.map((d) => {
          const isToday = d.toDateString() === todayStr;
          return (
            <Link
              key={`dh-${d.toISOString()}`}
              href={`/calendar?view=day&date=${isoDay(d)}`}
              className={cn(
                'border-b border-border bg-surface p-2 text-center transition-colors hover:bg-surface-raised',
                'border-l-2 border-l-border-strong',
              )}
              style={{ gridColumn: `span ${cols}` }}
            >
              <div className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                {d.toLocaleDateString('de-CH', { weekday: 'short' })}
              </div>
              <div
                className={cn(
                  'mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
                  isToday
                    ? 'bg-accent text-accent-foreground'
                    : 'text-text-primary',
                )}
              >
                {d.getDate()}
              </div>
            </Link>
          );
        })}

        {/* Staff-Sub-Header (nur wenn Staff-Spalten aktiv) */}
        {hasStaffColumns ? (
          <>
            <div className="sticky left-0 z-10 border-b border-r border-border bg-surface/90" />
            {days.map((d) =>
              staff.map((s, si) => (
                <div
                  key={`sh-${d.toISOString()}-${s.id}`}
                  className={cn(
                    'border-b border-border px-1.5 py-1',
                    si === 0 && 'border-l-2 border-l-border-strong',
                    si > 0 && 'border-l border-border',
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          s.color ?? 'hsl(var(--border-strong))',
                      }}
                    />
                    <span className="truncate text-[10px] font-semibold text-text-secondary">
                      {s.firstName}
                    </span>
                  </div>
                </div>
              )),
            )}
          </>
        ) : null}

        {/* Stunden-Spalte */}
        <div
          className="sticky left-0 z-10 border-r border-border bg-background/50"
          style={{ height: TOTAL_HEIGHT }}
        >
          {HOURS.map((h) => (
            <div
              key={h}
              className="border-b border-border/60 pr-1 pt-0.5 text-right text-[10px] font-medium tabular-nums text-text-muted"
              style={{ height: 60 * PX_PER_MINUTE }}
            >
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Body: eine Spalte pro Staff pro Tag (oder pro Tag wenn kein Staff) */}
        {days.map((d) => {
          const dayKey = isoDay(d);
          const dayAppts = byDay.get(dayKey) ?? [];
          if (!hasStaffColumns) {
            return (
              <DayColumn
                key={`body-${dayKey}`}
                dayAppts={dayAppts}
                dayLeftBorder
              />
            );
          }
          return staff.map((s, si) => {
            const staffAppts = dayAppts.filter((a) => a.staffId === s.id);
            return (
              <DayColumn
                key={`body-${dayKey}-${s.id}`}
                dayAppts={staffAppts}
                dayLeftBorder={si === 0}
              />
            );
          });
        })}
      </div>
    </div>
  );
}

function DayColumn({
  dayAppts,
  dayLeftBorder,
}: {
  dayAppts: WeekAppt[];
  dayLeftBorder: boolean;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'relative',
        dayLeftBorder
          ? 'border-l-2 border-l-border-strong'
          : 'border-l border-border',
      )}
      style={{ height: TOTAL_HEIGHT }}
    >
      {HOURS.map((h) => (
        <div
          key={h}
          className="border-b border-border/60"
          style={{ height: 60 * PX_PER_MINUTE }}
        />
      ))}
      {dayAppts.map((a) => {
        const offset = minutesFromStart(a.startAt);
        const dur = durationMinutes(a.startAt, a.endAt);
        if (offset < 0 || offset >= HOURS.length * 60) return null;
        const clientName = a.client
          ? `${a.client.firstName} ${a.client.lastName}`
          : 'Blockzeit';
        const services =
          a.items.map((i) => i.service.name).join(', ') || '—';
        const timeLabel = new Date(a.startAt).toLocaleTimeString('de-CH', {
          hour: '2-digit',
          minute: '2-digit',
        });
        return (
          <Link
            key={a.id}
            href={`/calendar/${a.id}`}
            className="absolute inset-x-1 block"
            style={{
              top: offset * PX_PER_MINUTE + 2,
              height: Math.max(dur * PX_PER_MINUTE - 4, 22),
            }}
          >
            <AppointmentCard
              clientName={clientName}
              serviceLabel={services}
              staffLabel=""
              timeLabel={timeLabel}
              status={a.status}
              staffColor={a.staff.color}
              compact={dur < 60}
              className="h-full"
            />
          </Link>
        );
      })}
    </div>
  );
}
