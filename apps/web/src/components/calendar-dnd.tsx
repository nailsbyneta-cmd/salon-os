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
import { AppointmentCard, type AppointmentStatus, Avatar, Button } from '@salon-os/ui';
import { toLocalIso } from '@salon-os/utils/timezone';
import { rescheduleAppointment } from '@/app/(admin)/calendar/reschedule-action';
import { CalendarZoomControls } from './calendar-zoom-controls';
import { useCalendarZoom } from './use-calendar-zoom';
import { useIsMobile } from './use-is-mobile';
import { useOnlyActiveStaff } from './use-only-active-staff';
import { usePanScroll } from './use-pan-scroll';
import { useViewportSize } from './use-viewport-size';

export interface DndAppt {
  id: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  clientId: string | null;
  staffId: string;
  client: {
    id?: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    // E.164-Format (+41791234567) wird serverseitig aus `phone` normalisiert
    // und ist die autoritative Quelle für wa.me + tel:-Links.
    phoneE164?: string | null;
    // Prisma-Decimal-Spalten kommen als string ('42.50') im JSON, Number()
    // toleriert beide Formate. UI nutzt lifetimeValue für VIP-Heuristik
    // (analog zu /clients?filter=vip: lifetimeValue >= 2000).
    noShowRisk?: string | number | null;
    lifetimeValue?: string | number | null;
  } | null;
  staff: { firstName: string; lastName: string; color: string | null };
  items: Array<{ service: { name: string }; optionLabels?: string[] }>;
}

export interface DndStaff {
  id: string;
  firstName: string;
  lastName: string;
  color: string | null;
}

// Anzeigebereich 07:00-20:00 (13 Stunden). 07:00 als Start damit früh-
// Morgen-Termine + auto-scroll-zu-jetzt bei Salon-Öffnung vor 08:00
// funktionieren; 20:00 als Ende für späte Abendkundinnen.
const CAL_START_HOUR = 7;
const HOURS = Array.from({ length: 13 }, (_, i) => i + CAL_START_HOUR);
const SLOT_MINUTES = 15;
const SLOTS_PER_HOUR = 60 / SLOT_MINUTES;
const CAL_START_MIN = CAL_START_HOUR * 60;
const CAL_END_MIN = (CAL_START_HOUR + HOURS.length) * 60;
// Responsive base. colMinWidth: untere Grenze in minmax() — verhindert
// unleserlich schmale Spalten und erlaubt Stretching via 1fr. Bei 5+
// Staff auf Laptop (1024×) würde 180 horizontalen Scroll auslösen, 110
// passt. pxPerMin wird zusätzlich dynamisch hochskaliert (s.u.), damit
// 11h auf tall screens vertikal füllen.
const DESKTOP = { pxPerMin: 72 / 60, colMinWidth: 110, timeColWidth: 72 };
const MOBILE = { pxPerMin: 96 / 60, colMinWidth: 96, timeColWidth: 48 };

// Header/Padding-Abzug für die calc(100vh - X)-Logik. Wenn Admin-Shell
// die Top-Bar/Page-Header ändert, hier nachziehen.
const CAL_VERTICAL_OFFSET = 220;

function minutesFromStart(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes() - CAL_START_MIN;
}

function durationMinutes(startIso: string, endIso: string): number {
  return (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000;
}

function parseDropId(raw: string): { staffId: string; minute: number } | null {
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
  const isMobile = useIsMobile();
  const viewport = useViewportSize();
  const mounted = React.useSyncExternalStore(
    (cb) => {
      cb();
      return () => {};
    },
    () => true,
    () => false,
  );
  const scrollRef = React.useRef<HTMLDivElement>(null);
  usePanScroll(scrollRef);
  const [zoom, , zoomControls] = useCalendarZoom();
  const [onlyActive, setOnlyActive] = useOnlyActiveStaff();
  const base = isMobile ? MOBILE : DESKTOP;
  // SSR: Nur base.pxPerMin × zoom — kein Viewport-fit, damit Server-
  // und Client-Markup identisch sind (keine Hydration-Warnings).
  // Nach Mount wird fitPxPerMin als Floor dazu genommen.
  const availableHeight = Math.max(400, viewport.h - CAL_VERTICAL_OFFSET);
  const fitPxPerMin = availableHeight / (HOURS.length * 60);
  const pxPerMin = mounted ? Math.max(base.pxPerMin * zoom, fitPxPerMin) : base.pxPerMin * zoom;
  const cfg = {
    pxPerMin,
    colWidth: Math.max(50, Math.round(base.colMinWidth * zoom)),
    timeColWidth: base.timeColWidth,
  };
  const [appts, setAppts] = React.useState(initialAppts);
  const [undo, setUndo] = React.useState<UndoBanner | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setAppts(initialAppts);
  }, [initialAppts]);

  // Auto-Scroll zur aktuellen Uhrzeit beim Öffnen des heutigen Tag-
  // Views — Neta soll nicht manuell runterscrollen. Nur einmal, beim
  // ersten Paint mit korrektem pxPerMin. todayStr via Zurich-TZ damit
  // User vom Handy im Ausland nicht falsch landen.
  const scrolledToNowRef = React.useRef(false);
  React.useEffect(() => {
    if (scrolledToNowRef.current) return;
    if (!mounted) return;
    const todayZurich = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Zurich',
    }).format(new Date());
    if (day !== todayZurich) return;
    const now = new Date();
    const zurichHour = Number(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Zurich',
        hour: '2-digit',
        hour12: false,
      }).format(now),
    );
    const zurichMin = Number(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Zurich',
        minute: '2-digit',
      }).format(now),
    );
    const rawMinutes = zurichHour * 60 + zurichMin - CAL_START_MIN;
    // Vor 07:00 → Top zeigen, nach 20:00 → Bottom. Dazwischen: echte
    // Jetzt-Position. Clamp statt früh-return.
    const clamped = Math.max(0, Math.min(HOURS.length * 60, rawMinutes));
    const el = scrollRef.current;
    if (!el) return;
    const containerTopInPage = el.getBoundingClientRect().top + window.scrollY;
    const targetY = containerTopInPage + clamped * pxPerMin - window.innerHeight / 3;
    window.scrollTo({ top: Math.max(0, targetY), behavior: 'instant' as ScrollBehavior });
    scrolledToNowRef.current = true;
  }, [day, mounted, pxPerMin]);

  const handleSlotClick = (staffId: string, minute: number): void => {
    const hours = Math.floor((CAL_START_MIN + minute) / 60);
    const mins = (CAL_START_MIN + minute) % 60;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    router.push(`/calendar/new?date=${day}&time=${timeStr}&staffId=${encodeURIComponent(staffId)}`);
  };

  // Desktop: Maus startet Drag nach 6px. Mobile: Touch startet Drag
  // nach 250ms Long-Press (Tap geht normal durch zum Link).
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
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

    // Drop-Minute auf Europe/Zurich-Datum des Termins anwenden — damit
    // die Drag-Geste nicht an der Browser-TZ hängt (z. B. wenn Neta
    // vom Ferienort arbeitet).
    const base = new Date(current.startAt);
    const dateStr = base.toLocaleDateString('en-CA', {
      timeZone: 'Europe/Zurich',
    }); // YYYY-MM-DD in Zurich
    const totalMin = CAL_START_MIN + newStartMin;
    const hh = String(Math.floor(totalMin / 60)).padStart(2, '0');
    const mm = String(totalMin % 60).padStart(2, '0');
    const newStart = new Date(toLocalIso(dateStr, `${hh}:${mm}`, 'Europe/Zurich'));
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

  const slots = Array.from({ length: HOURS.length * SLOTS_PER_HOUR }, (_, i) => i * SLOT_MINUTES);
  const totalHeight = HOURS.length * 60 * cfg.pxPerMin;

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

  const activeStaffIds = new Set(appts.map((a) => a.staffId));
  const visibleStaff = onlyActive ? staffList.filter((s) => activeStaffIds.has(s.id)) : staffList;
  const shownStaff = visibleStaff.length === 0 ? staffList : visibleStaff;
  const hiddenCount = staffList.length - shownStaff.length;

  const gridCols = `${cfg.timeColWidth}px repeat(${shownStaff.length}, minmax(${cfg.colWidth}px, 1fr))`;

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
      <div
        ref={scrollRef}
        className="relative cursor-grab overflow-x-auto rounded-lg border border-border bg-surface"
      >
        <div
          className="grid w-full"
          style={{
            gridTemplateColumns: gridCols,
            // minWidth = Mindestbreite für horizontales Scrollen auf schmalen
            // Viewports. Auf grossen Monitoren stretched 1fr den Rest.
            minWidth: cfg.timeColWidth + shownStaff.length * cfg.colWidth,
          }}
        >
          {/* Header-Zeile */}
          <div className="sticky top-0 z-20 border-b border-border bg-surface" />
          {shownStaff.map((s) => (
            <div
              key={`h-${s.id}`}
              className="sticky top-0 z-20 flex items-center gap-2 border-b border-l border-border bg-surface px-3 py-2"
            >
              <Avatar name={`${s.firstName} ${s.lastName}`} color={s.color} size="sm" />
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-text-primary">
                  {s.firstName}
                </div>
                <div className="truncate text-[10px] text-text-muted">{s.lastName}</div>
              </div>
            </div>
          ))}

          {/* Stunden-Spalte */}
          <div className="relative border-r border-border bg-background/50">
            {HOURS.map((h) => (
              <div
                key={h}
                className="border-b border-border/60 px-3 pt-1 text-right text-[10px] font-medium tabular-nums text-text-muted"
                style={{ height: 60 * cfg.pxPerMin }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Eine Spalte pro Staff */}
          {shownStaff.map((s) => {
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
                    topPx={m * cfg.pxPerMin}
                    isHourBoundary={m % 60 === 0 && m > 0}
                    pxPerMin={cfg.pxPerMin}
                    onClick={handleSlotClick}
                  />
                ))}
                <NowLine day={day} pxPerMin={cfg.pxPerMin} />
                {staffAppts.map((a) => {
                  const offset = minutesFromStart(a.startAt);
                  const dur = durationMinutes(a.startAt, a.endAt);
                  if (offset < 0 || offset >= HOURS.length * 60) return null;
                  return (
                    <DraggableAppt
                      key={a.id}
                      appt={a}
                      topPx={offset * cfg.pxPerMin}
                      heightPx={Math.max(dur * cfg.pxPerMin - 4, 28)}
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
              Termin auf <span className="font-medium text-text-primary">{undo.newStartLabel}</span>{' '}
              verschoben.
            </span>
            <Button onClick={handleUndo} variant="secondary" size="sm" disabled={pending}>
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
  pxPerMin,
  onClick,
}: {
  staffId: string;
  minute: number;
  topPx: number;
  isHourBoundary: boolean;
  pxPerMin: number;
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
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appt.id,
  });
  const style: React.CSSProperties = {
    position: 'absolute',
    top: topPx,
    left: 4,
    right: 6,
    height: heightPx,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 20 : 1,
    // Mouse: 'none' damit Maus-Drag frei ziehen kann
    // Touch: 'manipulation' damit Tap sofort auslöst, Long-Press (TouchSensor)
    // Drag startet ohne Scroll-Konflikt
    touchAction: 'manipulation',
    cursor: isDragging ? 'grabbing' : 'grab',
  };
  const clientName = appt.client ? `${appt.client.firstName} ${appt.client.lastName}` : 'Blockzeit';
  // Service-Label inkl. Variant-Labels: "Premium Haarschnitt · Mittel"
  // Service-Name OHNE Klammer-Suffix damit der Block-Text kompakt bleibt
  // (Audit Pass 13: 'Premium Haarschnitt (Inklusive W...' war zu lang).
  const services =
    appt.items
      .map((i) => {
        const shortName = i.service.name.replace(/\s*\([^)]+\)\s*$/, '').trim();
        const labels = (i.optionLabels ?? []).filter(Boolean);
        return labels.length > 0 ? `${shortName} · ${labels.join(' · ')}` : shortName;
      })
      .join(', ') || '—';
  const timeLabel = new Date(appt.startAt).toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      ref={setNodeRef}
      data-dnd-drag
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (isDragging) return;
        // Click nach Drag-Release nicht auswerten (dnd-kit cancelt, aber
        // zur Sicherheit)
        const target = e.target as HTMLElement;
        if (target.closest('a[data-noclick]')) return;
        router.push(`/calendar/${appt.id}`);
      }}
    >
      <div className="group h-full [&>button]:h-full">
        <AppointmentCard
          clientName={clientName}
          serviceLabel={services}
          staffLabel=""
          timeLabel={timeLabel}
          status={appt.status}
          staffColor={appt.staff.color}
          compact={compact}
          noShowRisk={appt.client?.noShowRisk != null ? Number(appt.client.noShowRisk) : null}
          vip={appt.client?.lifetimeValue != null && Number(appt.client.lifetimeValue) >= 2000}
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

function NowLine({ day, pxPerMin }: { day: string; pxPerMin: number }): React.JSX.Element | null {
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
      data-now-line
      className="pointer-events-none absolute left-0 right-0 z-10"
      style={{ top: minutes * pxPerMin }}
    >
      <div className="relative">
        <div className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-danger" />
        <div className="h-[2px] bg-danger" />
      </div>
    </div>
  );
}
