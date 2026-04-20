'use client';
import { cn } from '@salon-os/ui';
import type { ZoomControls } from './use-calendar-zoom';

export function CalendarZoomControls({
  controls,
  className,
}: {
  controls: ZoomControls;
  className?: string;
}): React.JSX.Element {
  const pct = Math.round(controls.zoom * 100);
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border border-border bg-surface p-0.5 text-text-secondary',
        className,
      )}
    >
      <button
        type="button"
        onClick={controls.zoomOut}
        disabled={!controls.canZoomOut}
        aria-label="Herauszoomen"
        className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-lg leading-none transition-colors hover:bg-surface-raised disabled:opacity-40"
      >
        −
      </button>
      <button
        type="button"
        onClick={controls.reset}
        aria-label="Zoom zurücksetzen"
        className="min-w-[3rem] px-1 text-[11px] font-semibold tabular-nums hover:text-text-primary"
        title="Klick = auf 100% zurücksetzen"
      >
        {pct}%
      </button>
      <button
        type="button"
        onClick={controls.zoomIn}
        disabled={!controls.canZoomIn}
        aria-label="Hineinzoomen"
        className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-base leading-none transition-colors hover:bg-surface-raised disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
