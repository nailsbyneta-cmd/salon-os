import Link from 'next/link';
import { AppointmentCard, type AppointmentStatus } from '@salon-os/ui';

interface WeekAppt {
  id: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  client: { firstName: string; lastName: string } | null;
  staff: { firstName: string; lastName: string; color: string | null };
  items: Array<{ service: { name: string } }>;
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8);
const PX_PER_MINUTE = 48 / 60;
const CAL_START = 8 * 60;

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
}: {
  appts: WeekAppt[];
  weekStart: Date;
}): React.JSX.Element {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const todayStr = new Date().toDateString();

  const byDate = new Map<string, WeekAppt[]>();
  for (const a of appts) {
    const key = a.startAt.slice(0, 10);
    const bucket = byDate.get(key) ?? [];
    bucket.push(a);
    byDate.set(key, bucket);
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <div className="grid min-w-[900px] grid-cols-[64px_repeat(7,1fr)]">
        {/* Header row */}
        <div className="border-b border-r border-border bg-background/40 p-2" />
        {days.map((d) => {
          const isToday = d.toDateString() === todayStr;
          return (
            <Link
              key={d.toISOString()}
              href={`/calendar?view=day&date=${isoDay(d)}`}
              className="border-b border-r border-border p-2 text-center transition-colors hover:bg-surface-raised last:border-r-0"
            >
              <div className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                {d.toLocaleDateString('de-CH', { weekday: 'short' })}
              </div>
              <div
                className={`mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
                  isToday ? 'bg-accent text-accent-foreground' : 'text-text-primary'
                }`}
              >
                {d.getDate()}
              </div>
            </Link>
          );
        })}

        {/* Time grid */}
        <div className="border-r border-border bg-background/30">
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

        {days.map((d) => {
          const dayKey = isoDay(d);
          const dayAppts = byDate.get(dayKey) ?? [];
          return (
            <div
              key={dayKey}
              className="relative border-r border-border last:border-r-0"
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
                const staff = `${a.staff.firstName} ${a.staff.lastName[0]}.`;
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
                      staffLabel={staff}
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
        })}
      </div>
    </div>
  );
}
