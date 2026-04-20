'use client';
import * as React from 'react';
import Link from 'next/link';
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { AppointmentCard, type AppointmentStatus, Button } from '@salon-os/ui';
import { rescheduleAppointment } from '@/app/(admin)/calendar/reschedule-action';

export interface DndAppt {
  id: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  clientId: string | null;
  client: { firstName: string; lastName: string } | null;
  staff: { firstName: string; lastName: string; color: string | null };
  items: Array<{ service: { name: string } }>;
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8);
const SLOT_MINUTES = 15;
const PX_PER_MINUTE = 72 / 60;
const SLOTS_PER_HOUR = 60 / SLOT_MINUTES;
const CAL_START_MIN = 8 * 60;
const CAL_END_MIN = (8 + HOURS.length) * 60;

function minutesFromStart(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes() - CAL_START_MIN;
}

function durationMinutes(startIso: string, endIso: string): number {
  return (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000;
}

interface UndoBanner {
  appointmentId: string;
  previousStart: string;
  previousEnd: string;
  newStartLabel: string;
}

export function CalendarDnd({
  appts: initialAppts,
  day,
}: {
  appts: DndAppt[];
  day: string;
}): React.JSX.Element {
  const [appts, setAppts] = React.useState(initialAppts);
  const [undo, setUndo] = React.useState<UndoBanner | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setAppts(initialAppts);
  }, [initialAppts]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragEnd = (ev: DragEndEvent): void => {
    const apptId = String(ev.active.id);
    const dropId = ev.over?.id ? String(ev.over.id) : null;
    if (!dropId || !dropId.startsWith('slot:')) return;
    const targetMin = Number(dropId.slice('slot:'.length));

    const current = appts.find((a) => a.id === apptId);
    if (!current) return;
    const dur = durationMinutes(current.startAt, current.endAt);
    const newStartMin = targetMin;
    const newEndMin = newStartMin + dur;
    if (newStartMin < 0 || newEndMin > CAL_END_MIN - CAL_START_MIN) return;

    const base = new Date(current.startAt);
    const newStart = new Date(base);
    newStart.setHours(Math.floor((CAL_START_MIN + newStartMin) / 60));
    newStart.setMinutes((CAL_START_MIN + newStartMin) % 60);
    newStart.setSeconds(0);
    newStart.setMilliseconds(0);
    const newEnd = new Date(newStart.getTime() + dur * 60_000);

    if (newStart.toISOString() === current.startAt) return;

    // Haptics (falls Browser es kann)
    if ('vibrate' in navigator) navigator.vibrate?.(8);

    // Optimistic update
    const previous = { start: current.startAt, end: current.endAt };
    setAppts((prev) =>
      prev.map((a) =>
        a.id === apptId
          ? { ...a, startAt: newStart.toISOString(), endAt: newEnd.toISOString() }
          : a,
      ),
    );

    startTransition(async () => {
      const result = await rescheduleAppointment(
        apptId,
        newStart.toISOString(),
        newEnd.toISOString(),
      );
      if (!result.ok) {
        // Rollback
        setAppts((prev) =>
          prev.map((a) =>
            a.id === apptId
              ? { ...a, startAt: previous.start, endAt: previous.end }
              : a,
          ),
        );
        setError(result.error);
        setTimeout(() => setError(null), 4000);
        return;
      }
      // Undo-Banner zeigen (5 s)
      setUndo({
        appointmentId: apptId,
        previousStart: previous.start,
        previousEnd: previous.end,
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

    setAppts((prev) =>
      prev.map((a) =>
        a.id === target.appointmentId
          ? { ...a, startAt: target.previousStart, endAt: target.previousEnd }
          : a,
      ),
    );
    setUndo(null);

    startTransition(async () => {
      await rescheduleAppointment(
        target.appointmentId,
        target.previousStart,
        target.previousEnd,
      );
    });
  };

  // Render: 44 Slots à 15 min = 11 h * 4
  const slots = Array.from(
    { length: HOURS.length * SLOTS_PER_HOUR },
    (_, i) => i * SLOT_MINUTES,
  );

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="relative rounded-lg border border-border bg-surface overflow-hidden">
        <div className="grid grid-cols-[72px_1fr]">
          <div className="border-r border-border bg-background/50">
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
          <div className="relative">
            {/* Drop-Slots (15-min Raster) */}
            {slots.map((m) => (
              <Slot
                key={m}
                minute={m}
                topPx={m * PX_PER_MINUTE}
                isHourBoundary={m % 60 === 0 && m > 0}
              />
            ))}
            {/* Aktuelle Zeit-Linie, wenn Tag = heute */}
            <NowLine day={day} />
            {/* Termine */}
            {appts.map((a) => {
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
        </div>
      </div>

      {undo ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2 animate-fade-in">
          <div className="pointer-events-auto flex items-center gap-4 rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-sm shadow-lg">
            <span className="text-text-secondary">
              Termin auf <span className="font-medium text-text-primary">{undo.newStartLabel}</span> verschoben.
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
  minute,
  topPx,
  isHourBoundary,
}: {
  minute: number;
  topPx: number;
  isHourBoundary: boolean;
}): React.JSX.Element {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot:${minute}`,
  });
  return (
    <div
      ref={setNodeRef}
      className={`absolute left-0 right-0 transition-colors ${
        isOver ? 'bg-accent/15' : ''
      } ${isHourBoundary ? 'border-t border-border/60' : 'border-t border-border/20'}`}
      style={{
        top: topPx,
        height: SLOT_MINUTES * PX_PER_MINUTE,
      }}
    />
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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appt.id,
  });
  const style: React.CSSProperties = {
    position: 'absolute',
    top: topPx,
    left: 6,
    right: 8,
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
  const services =
    appt.items.map((i) => i.service.name).join(', ') || '—';
  const staff = `${appt.staff.firstName} ${appt.staff.lastName[0]}.`;
  const timeLabel = new Date(appt.startAt).toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className="h-full [&>button]:h-full">
        <AppointmentCard
          clientName={clientName}
          serviceLabel={services}
          staffLabel={staff}
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
