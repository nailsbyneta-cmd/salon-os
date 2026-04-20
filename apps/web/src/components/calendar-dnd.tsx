'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { AppointmentCard, type AppointmentStatus, Avatar, Button } from '@salon-os/ui';
import { rescheduleAppointment } from '@/app/(admin)/calendar/reschedule-action';

export interface DndAppt {
  id: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  clientId: string | null;
  staffId: string;
  client: { firstName: string; lastName: string } | null;
  staff: { firstName: string; lastName: string; color: string | null };
  items: Array<{ service: { name: string } }>;
}

export interface DndStaff {
  id: string;
  firstName: string;
  lastName: string;
  color: string | null;
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8);
const SLOT_MINUTES = 15;
const PX_PER_MINUTE = 72 / 60;
const SLOTS_PER_HOUR = 60 / SLOT_MINUTES;
const CAL_START_MIN = 8 * 60;
const CAL_END_MIN = (8 + HOURS.length) * 60;
const COL_MIN_WIDTH = 180;

function minutesFromStart(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes() - CAL_START_MIN;
}

function durationMinutes(startIso: string, endIso: string): number {
  return (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000;
}

function parseDropId(
  raw: string,
): { staffId: string; minute: number } | null {
  if (!raw.startsWith('slot:')) return null;
  const rest = raw.slice('slot:'.length);
  const sep = rest.lastIndexOf(':');
  if (sep === -1) return null;
  const staffId = rest.slice(0, sep);
  const minute = Number(rest.slice(sep + 1));
  if (!Number.isFinite(minute)) return null;
  return { staffId, minute };
}

interface UndoBanner {
  appointmentId: string;
  previousStart: string;
  previousEnd: string;
  previousStaffId: string;
  newStartLabel: string;
}

export function CalendarDnd({
  appts: initialAppts,
  day,
  staff: staffList,
}: {
  appts: DndAppt[];
  day: string;
  staff: DndStaff[];
}): React.JSX.Element {
  const router = useRouter();
  const [appts, setAppts] = React.useState(initialAppts);
  const [undo, setUndo] = React.useState<UndoBanner | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setAppts(initialAppts);
  }, [initialAppts]);

  const handleSlotClick = (staffId: string, minute: number): void => {
    const hours = Math.floor((CAL_START_MIN + minute) / 60);
    const mins = (CAL_START_MIN + minute) % 60;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    router.push(
      `/calendar/new?date=${day}&time=${timeStr}&staffId=${encodeURIComponent(staffId)}`,
    );
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

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

    const base = new Date(current.startAt);
    const newStart = new Date(base);
    newStart.setHours(Math.floor((CAL_START_MIN + newStartMin) / 60));
    newStart.setMinutes((CAL_START_MIN + newStartMin) % 60);
    newStart.setSeconds(0);
    newStart.setMilliseconds(0);
    const newEnd = new Date(newStart.getTime() + dur * 60_000);

    const targetStaff = staffList.find((s) => s.id === parsed.staffId);
    const staffChanged = parsed.staffId !== current.staffId;
    if (newStart.toISOString() === current.startAt && !staffChanged) return;

    if ('vibrate' in navigator) navigator.vibrate?.(8);

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
      setUndo({
        appointmentId: apptId,
        previousStart: previous.start,
        previousEnd: previous.end,
        previousStaffId: previous.staffId,
        newStartLabel: newStart.toLocaleTimeString('de-CH', {
          hour: '2-digit',
          minute: '2-digit',
        }),
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
    const prevStaff = staffList.find((s) => s.id === target.previousStaffId);
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
  const totalHeight = HOURS.length * 60 * PX_PER_MINUTE;

  if (staffList.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-12 text-center text-sm text-text-muted">
        Keine Mitarbeiterinnen angelegt. Lege unter{' '}
        <Link href="/staff" className="text-accent hover:underline">
          Team
        </Link>{' '}
        jemanden an.
      </div>
    );
  }

  const gridCols = `72px repeat(${staffList.length}, minmax(${COL_MIN_WIDTH}px, 1fr))`;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="relative overflow-x-auto rounded-lg border border-border bg-surface">
        <div
          className="grid"
          style={{ gridTemplateColumns: gridCols, minWidth: 'fit-content' }}
        >
          {/* Header-Zeile */}
          <div className="sticky top-0 z-20 border-b border-border bg-surface" />
          {staffList.map((s) => (
            <div
              key={`h-${s.id}`}
              className="sticky top-0 z-20 flex items-center gap-2 border-b border-l border-border bg-surface px-3 py-2"
            >
              <Avatar
                name={`${s.firstName} ${s.lastName}`}
                color={s.color}
                size="sm"
              />
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-text-primary">
                  {s.firstName}
                </div>
                <div className="truncate text-[10px] text-text-muted">
                  {s.lastName}
                </div>
              </div>
            </div>
          ))}

          {/* Stunden-Spalte */}
          <div className="relative border-r border-border bg-background/50">
            {HOURS.map((h) => (
              <div
                key={h}
                className="border-b border-border/60 px-3 pt-1 text-right text-[10px] font-medium tabular-nums text-text-muted"
                style={{ height: 60 * PX_PER_MINUTE }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Eine Spalte pro Staff */}
          {staffList.map((s) => {
            const staffAppts = appts.filter((a) => a.staffId === s.id);
            return (
              <div
                key={`c-${s.id}`}
                className="relative border-l border-border"
                style={{ height: totalHeight }}
              >
                {slots.map((m) => (
                  <Slot
                    key={`${s.id}-${m}`}
                    staffId={s.id}
                    minute={m}
                    topPx={m * PX_PER_MINUTE}
                    isHourBoundary={m % 60 === 0 && m > 0}
                    onClick={handleSlotClick}
                  />
                ))}
                <NowLine day={day} />
                {staffAppts.map((a) => {
                  const offset = minutesFromStart(a.startAt);
                  const dur = durationMinutes(a.startAt, a.endAt);
                  if (offset < 0 || offset >= HOURS.length * 60) return null;
                  return (
                    <DraggableAppt
                      key={a.id}
                      appt={a}
                      topPx={offset * PX_PER_MINUTE}
                      heightPx={Math.max(dur * PX_PER_MINUTE - 4, 28)}
                      compact={dur < 45}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {undo ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2 animate-fade-in">
          <div className="pointer-events-auto flex items-center gap-4 rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-sm shadow-lg">
            <span className="text-text-secondary">
              Termin auf{' '}
              <span className="font-medium text-text-primary">
                {undo.newStartLabel}
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
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2 animate-fade-in">
          <div className="pointer-events-auto rounded-lg border border-danger bg-danger/10 px-4 py-2.5 text-sm text-danger shadow-lg">
            {error}
          </div>
        </div>
      ) : null}
    </DndContext>
  );
}

function Slot({
  staffId,
  minute,
  topPx,
  isHourBoundary,
  onClick,
}: {
  staffId: string;
  minute: number;
  topPx: number;
  isHourBoundary: boolean;
  onClick: (staffId: string, minute: number) => void;
}): React.JSX.Element {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot:${staffId}:${minute}`,
  });
  const hh = Math.floor((CAL_START_MIN + minute) / 60)
    .toString()
    .padStart(2, '0');
  const mm = ((CAL_START_MIN + minute) % 60).toString().padStart(2, '0');
  const timeLabel = `${hh}:${mm}`;
  return (
    <>
      <button
        type="button"
        ref={setNodeRef}
        onClick={() => onClick(staffId, minute)}
        className={`absolute left-0 right-0 text-left transition-colors cursor-pointer ${
          isOver ? 'bg-danger/10' : 'hover:bg-accent/5'
        } ${isHourBoundary ? 'border-t border-border/60' : 'border-t border-border/20'}`}
        style={{
          top: topPx,
          height: SLOT_MINUTES * PX_PER_MINUTE,
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

function DraggableAppt({
  appt,
  topPx,
  heightPx,
  compact,
}: {
  appt: DndAppt;
  topPx: number;
  heightPx: number;
  compact: boolean;
}): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: appt.id });
  const style: React.CSSProperties = {
    position: 'absolute',
    top: topPx,
    left: 4,
    right: 6,
    height: heightPx,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 20 : 1,
    touchAction: 'none',
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
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className="group h-full [&>button]:h-full">
        <AppointmentCard
          clientName={clientName}
          serviceLabel={services}
          staffLabel=""
          timeLabel={timeLabel}
          status={appt.status}
          staffColor={appt.staff.color}
          compact={compact}
          className={`h-full ${isDragging ? 'shadow-lg ring-2 ring-accent' : ''}`}
        />
        {!isDragging ? (
          <Link
            href={`/calendar/${appt.id}`}
            className="absolute right-1 top-1 rounded-sm bg-surface/80 px-1.5 py-0.5 text-[9px] font-medium text-text-muted opacity-0 transition-opacity hover:text-text-primary group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            öffnen
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function NowLine({ day }: { day: string }): React.JSX.Element | null {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);
  const todayStr = new Date().toISOString().slice(0, 10);
  if (day !== todayStr) return null;

  const minutes = now.getHours() * 60 + now.getMinutes() - CAL_START_MIN;
  if (minutes < 0 || minutes > HOURS.length * 60) return null;

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-10"
      style={{ top: minutes * PX_PER_MINUTE }}
    >
      <div className="relative">
        <div className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-danger" />
        <div className="h-[2px] bg-danger" />
      </div>
    </div>
  );
}
