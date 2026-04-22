'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  AppointmentCard,
  type AppointmentStatus,
  Button,
  cn,
} from '@salon-os/ui';
import { toLocalIso } from '@salon-os/utils/timezone';
import { rescheduleAppointment } from '@/app/(admin)/calendar/reschedule-action';
import { CalendarZoomControls } from './calendar-zoom-controls';
import { useCalendarZoom } from './use-calendar-zoom';
import { useIsMobile } from './use-is-mobile';
import { useOnlyActiveStaff } from './use-only-active-staff';

interface WeekAppt {
  id: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  staffId: string;
  client: {
    firstName: string;
    lastName: string;
    noShowRisk?: string | number | null;
    lifetimeValue?: string | number | null;
  } | null;
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
const SLOT_MINUTES = 15;
const SLOTS_PER_HOUR = 60 / SLOT_MINUTES;
const CAL_START_MIN = 8 * 60;
const CAL_END_MIN = (8 + HOURS.length) * 60;
const DESKTOP = { pxPerMin: 48 / 60, colMinWidth: 96, timeColWidth: 64 };
const MOBILE = { pxPerMin: 72 / 60, colMinWidth: 68, timeColWidth: 40 };

function minutesFromStart(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes() - CAL_START_MIN;
}

function durationMinutes(startIso: string, endIso: string): number {
  return (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000;
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseDropId(
  raw: string,
): { day: string; staffId: string; minute: number } | null {
  if (!raw.startsWith('wslot:')) return null;
  const parts = raw.slice('wslot:'.length).split('|');
  if (parts.length !== 3) return null;
  const [day, staffId, minStr] = parts;
  const minute = Number(minStr);
  if (!day || !staffId || !Number.isFinite(minute)) return null;
  return { day, staffId, minute };
}

function timeLabelFromMinute(minute: number): string {
  const hh = Math.floor((CAL_START_MIN + minute) / 60)
    .toString()
    .padStart(2, '0');
  const mm = ((CAL_START_MIN + minute) % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

interface UndoBanner {
  appointmentId: string;
  previousStart: string;
  previousEnd: string;
  previousStaffId: string;
  newLabel: string;
}

export function CalendarWeek({
  appts: initialAppts,
  weekStart,
  staff,
}: {
  appts: WeekAppt[];
  weekStart: Date;
  staff: WeekStaff[];
}): React.JSX.Element {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [zoom, , zoomControls] = useCalendarZoom();
  const [onlyActive, setOnlyActive] = useOnlyActiveStaff();
  const base = isMobile ? MOBILE : DESKTOP;
  const cfg = {
    pxPerMin: base.pxPerMin,
    colWidth: Math.max(40, Math.round(base.colMinWidth * zoom)),
    timeColWidth: base.timeColWidth,
  };
  const totalHeight = HOURS.length * 60 * cfg.pxPerMin;
  const [appts, setAppts] = React.useState(initialAppts);
  const [undo, setUndo] = React.useState<UndoBanner | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setAppts(initialAppts);
  }, [initialAppts]);

  const days = React.useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
      }),
    [weekStart],
  );
  const todayStr = new Date().toDateString();

  const activeStaffIds = new Set(initialAppts.map((a) => a.staffId));
  const visibleStaff = onlyActive
    ? staff.filter((s) => activeStaffIds.has(s.id))
    : staff;
  const shownStaff = visibleStaff.length === 0 ? staff : visibleStaff;
  const hiddenCount = staff.length - shownStaff.length;

  const hasStaffColumns = shownStaff.length > 0;
  const cols = hasStaffColumns ? shownStaff.length : 1;
  const totalCols = days.length * cols;
  const gridTemplate = `${cfg.timeColWidth}px repeat(${totalCols}, minmax(${cfg.colWidth}px, 1fr))`;
  const minWidth = cfg.timeColWidth + totalCols * cfg.colWidth;

  const byDay = React.useMemo(() => {
    const m = new Map<string, WeekAppt[]>();
    for (const a of appts) {
      const key = a.startAt.slice(0, 10);
      const bucket = m.get(key) ?? [];
      bucket.push(a);
      m.set(key, bucket);
    }
    return m;
  }, [appts]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  const handleSlotClick = (day: string, staffId: string, minute: number): void => {
    const timeStr = timeLabelFromMinute(minute);
    const staffQuery = hasStaffColumns
      ? `&staffId=${encodeURIComponent(staffId)}`
      : '';
    router.push(`/calendar/new?date=${day}&time=${timeStr}${staffQuery}`);
  };

  const handleDragEnd = (ev: DragEndEvent): void => {
    const apptId = String(ev.active.id);
    const dropId = ev.over?.id ? String(ev.over.id) : null;
    const parsed = dropId ? parseDropId(dropId) : null;
    if (!parsed) return;

    const current = appts.find((a) => a.id === apptId);
    if (!current) return;
    const dur = durationMinutes(current.startAt, current.endAt);
    const newStartMin = parsed.minute;
    const newEndMin = newStartMin + dur;
    if (newStartMin < 0 || newEndMin > CAL_END_MIN - CAL_START_MIN) return;

    // parsed.day ist bereits YYYY-MM-DD (Zurich-Tag der Spalte).
    const totalMin = CAL_START_MIN + newStartMin;
    const hh = String(Math.floor(totalMin / 60)).padStart(2, '0');
    const mm = String(totalMin % 60).padStart(2, '0');
    const newStart = new Date(toLocalIso(parsed.day, `${hh}:${mm}`, 'Europe/Zurich'));
    const newEnd = new Date(newStart.getTime() + dur * 60_000);

    const staffChanged = parsed.staffId !== current.staffId;
    const startUnchanged = newStart.toISOString() === current.startAt;
    if (startUnchanged && !staffChanged) return;

    if ('vibrate' in navigator) navigator.vibrate?.(8);

    const targetStaff = staff.find((s) => s.id === parsed.staffId);
    const previous = {
      start: current.startAt,
      end: current.endAt,
      staffId: current.staffId,
    };
    setAppts((prev) =>
      prev.map((a) =>
        a.id === apptId
          ? {
              ...a,
              startAt: newStart.toISOString(),
              endAt: newEnd.toISOString(),
              staffId: parsed.staffId,
              staff: targetStaff
                ? {
                    firstName: targetStaff.firstName,
                    lastName: targetStaff.lastName,
                    color: targetStaff.color,
                  }
                : a.staff,
            }
          : a,
      ),
    );

    startTransition(async () => {
      const result = await rescheduleAppointment(
        apptId,
        newStart.toISOString(),
        newEnd.toISOString(),
        staffChanged ? parsed.staffId : undefined,
      );
      if (!result.ok) {
        setAppts((prev) =>
          prev.map((a) =>
            a.id === apptId
              ? {
                  ...a,
                  startAt: previous.start,
                  endAt: previous.end,
                  staffId: previous.staffId,
                }
              : a,
          ),
        );
        setError(result.error);
        setTimeout(() => setError(null), 4000);
        return;
      }
      const dayLabel = newStart.toLocaleDateString('de-CH', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      });
      const timeLabel = newStart.toLocaleTimeString('de-CH', {
        hour: '2-digit',
        minute: '2-digit',
      });
      setUndo({
        appointmentId: apptId,
        previousStart: previous.start,
        previousEnd: previous.end,
        previousStaffId: previous.staffId,
        newLabel: `${dayLabel} · ${timeLabel}`,
      });
      setTimeout(() => {
        setUndo((u) => (u?.appointmentId === apptId ? null : u));
      }, 5000);
    });
  };

  const handleUndo = (): void => {
    if (!undo) return;
    const target = undo;
    const current = appts.find((a) => a.id === target.appointmentId);
    if (!current) return;
    const prevStaff = staff.find((s) => s.id === target.previousStaffId);
    const staffChanged = target.previousStaffId !== current.staffId;

    setAppts((prev) =>
      prev.map((a) =>
        a.id === target.appointmentId
          ? {
              ...a,
              startAt: target.previousStart,
              endAt: target.previousEnd,
              staffId: target.previousStaffId,
              staff: prevStaff
                ? {
                    firstName: prevStaff.firstName,
                    lastName: prevStaff.lastName,
                    color: prevStaff.color,
                  }
                : a.staff,
            }
          : a,
      ),
    );
    setUndo(null);

    startTransition(async () => {
      await rescheduleAppointment(
        target.appointmentId,
        target.previousStart,
        target.previousEnd,
        staffChanged ? target.previousStaffId : undefined,
      );
    });
  };

  const slots = Array.from(
    { length: HOURS.length * SLOTS_PER_HOUR },
    (_, i) => i * SLOT_MINUTES,
  );

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-raised">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={(e) => setOnlyActive(e.target.checked)}
            className="h-3.5 w-3.5 accent-accent"
          />
          Nur aktive {hiddenCount > 0 ? `(${hiddenCount} versteckt)` : ''}
        </label>
        <CalendarZoomControls controls={zoomControls} />
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <div
          className="grid w-full"
          style={{ gridTemplateColumns: gridTemplate, minWidth }}
        >
          {/* Day-Header */}
          <div className="sticky left-0 z-10 border-b border-r border-border bg-surface" />
          {days.map((d) => {
            const isToday = d.toDateString() === todayStr;
            return (
              <Link
                key={`dh-${d.toISOString()}`}
                href={`/calendar?view=day&date=${isoDay(d)}`}
                className="border-b border-border bg-surface p-2 text-center transition-colors hover:bg-surface-raised border-l-2 border-l-border-strong"
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

          {/* Staff-Sub-Header */}
          {hasStaffColumns ? (
            <>
              <div className="sticky left-0 z-10 border-b border-r border-border bg-surface/90" />
              {days.map((d) =>
                shownStaff.map((s, si) => (
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
            style={{ height: totalHeight }}
          >
            {HOURS.map((h) => (
              <div
                key={h}
                className="border-b border-border/60 pr-1 pt-0.5 text-right text-[10px] font-medium tabular-nums text-text-muted"
                style={{ height: 60 * cfg.pxPerMin }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Body */}
          {days.map((d) => {
            const dayKey = isoDay(d);
            const dayAppts = byDay.get(dayKey) ?? [];
            if (!hasStaffColumns) {
              return (
                <DayStaffColumn
                  key={`body-${dayKey}`}
                  dayKey={dayKey}
                  staffId=""
                  appts={dayAppts}
                  slots={slots}
                  pxPerMin={cfg.pxPerMin}
                  totalHeight={totalHeight}
                  onSlotClick={handleSlotClick}
                  dayLeftBorder
                />
              );
            }
            return shownStaff.map((s, si) => {
              const staffAppts = dayAppts.filter((a) => a.staffId === s.id);
              return (
                <DayStaffColumn
                  key={`body-${dayKey}-${s.id}`}
                  dayKey={dayKey}
                  staffId={s.id}
                  appts={staffAppts}
                  slots={slots}
                  pxPerMin={cfg.pxPerMin}
                  totalHeight={totalHeight}
                  onSlotClick={handleSlotClick}
                  dayLeftBorder={si === 0}
                />
              );
            });
          })}
        </div>
      </div>

      {undo ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
          <div className="pointer-events-auto flex items-center gap-4 rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-sm shadow-lg">
            <span className="text-text-secondary">
              Termin auf{' '}
              <span className="font-medium text-text-primary">
                {undo.newLabel}
              </span>{' '}
              verschoben.
            </span>
            <Button
              onClick={handleUndo}
              variant="secondary"
              size="sm"
              disabled={pending}
            >
              Rückgängig
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
          <div className="pointer-events-auto rounded-lg border border-danger bg-danger/10 px-4 py-2.5 text-sm text-danger shadow-lg">
            {error}
          </div>
        </div>
      ) : null}
    </DndContext>
  );
}

function DayStaffColumn({
  dayKey,
  staffId,
  appts,
  slots,
  pxPerMin,
  totalHeight,
  onSlotClick,
  dayLeftBorder,
}: {
  dayKey: string;
  staffId: string;
  appts: WeekAppt[];
  slots: number[];
  pxPerMin: number;
  totalHeight: number;
  onSlotClick: (day: string, staffId: string, minute: number) => void;
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
      style={{ height: totalHeight }}
    >
      {slots.map((m) => (
        <WeekSlot
          key={`${staffId}-${m}`}
          dayKey={dayKey}
          staffId={staffId}
          minute={m}
          topPx={m * pxPerMin}
          pxPerMin={pxPerMin}
          isHourBoundary={m % 60 === 0 && m > 0}
          onClick={onSlotClick}
        />
      ))}
      {appts.map((a) => {
        const offset = minutesFromStart(a.startAt);
        const dur = durationMinutes(a.startAt, a.endAt);
        if (offset < 0 || offset >= HOURS.length * 60) return null;
        return (
          <WeekDraggableAppt
            key={a.id}
            appt={a}
            topPx={offset * pxPerMin + 2}
            heightPx={Math.max(dur * pxPerMin - 4, 22)}
            compact={dur < 60}
          />
        );
      })}
    </div>
  );
}

function WeekSlot({
  dayKey,
  staffId,
  minute,
  topPx,
  pxPerMin,
  isHourBoundary,
  onClick,
}: {
  dayKey: string;
  staffId: string;
  minute: number;
  topPx: number;
  pxPerMin: number;
  isHourBoundary: boolean;
  onClick: (day: string, staffId: string, minute: number) => void;
}): React.JSX.Element {
  const { setNodeRef, isOver } = useDroppable({
    id: `wslot:${dayKey}|${staffId}|${minute}`,
  });
  const timeLabel = timeLabelFromMinute(minute);
  return (
    <>
      <button
        type="button"
        ref={setNodeRef}
        onClick={() => onClick(dayKey, staffId, minute)}
        className={cn(
          'absolute left-0 right-0 text-left transition-colors cursor-pointer',
          isOver ? 'bg-danger/10' : 'hover:bg-accent/5',
          isHourBoundary ? 'border-t border-border/60' : 'border-t border-border/20',
        )}
        style={{
          top: topPx,
          height: SLOT_MINUTES * pxPerMin,
        }}
        aria-label={`Neuer Termin um ${timeLabel}`}
      />
      {isOver ? (
        <div
          className="pointer-events-none absolute left-0 right-0 z-30"
          style={{ top: topPx - 1 }}
        >
          <div className="relative h-0.5 bg-danger shadow-[0_0_8px_rgba(239,68,68,0.6)]">
            <div className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-danger" />
            <span className="absolute -top-2.5 right-1 rounded-sm bg-danger px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white shadow-md">
              {timeLabel}
            </span>
          </div>
        </div>
      ) : null}
    </>
  );
}

function WeekDraggableAppt({
  appt,
  topPx,
  heightPx,
  compact,
}: {
  appt: WeekAppt;
  topPx: number;
  heightPx: number;
  compact: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: appt.id });
  const style: React.CSSProperties = {
    position: 'absolute',
    top: topPx,
    left: 4,
    right: 4,
    height: heightPx,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 20 : 1,
    touchAction: 'manipulation',
    cursor: isDragging ? 'grabbing' : 'grab',
  };
  const clientName = appt.client
    ? `${appt.client.firstName} ${appt.client.lastName}`
    : 'Blockzeit';
  const services = appt.items.map((i) => i.service.name).join(', ') || '—';
  const timeLabel = new Date(appt.startAt).toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!isDragging) router.push(`/calendar/${appt.id}`);
      }}
    >
      <div className="h-full [&>button]:h-full">
        <AppointmentCard
          clientName={clientName}
          serviceLabel={services}
          staffLabel=""
          timeLabel={timeLabel}
          status={appt.status}
          staffColor={appt.staff.color}
          compact={compact}
          noShowRisk={
            appt.client?.noShowRisk != null ? Number(appt.client.noShowRisk) : null
          }
          vip={
            appt.client?.lifetimeValue != null &&
            Number(appt.client.lifetimeValue) >= 2000
          }
          className={cn(
            'h-full',
            isDragging && 'shadow-lg ring-2 ring-accent',
          )}
        />
      </div>
    </div>
  );
}
