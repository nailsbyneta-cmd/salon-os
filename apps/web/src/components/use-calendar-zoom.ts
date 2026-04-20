'use client';
import * as React from 'react';

const STORAGE_KEY = 'salon-os:cal-zoom';
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const STEP = 0.1;
const DEFAULT = 1;

export interface ZoomControls {
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
}

function clamp(z: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(z * 10) / 10));
}

/**
 * Kalender-Zoom mit localStorage-Persistenz. 0.5× bis 2.5×,
 * 0.1-Schritte. Multipliziert col-width + px-per-minute gemeinsam,
 * damit Termin-Proportionen stimmen.
 */
export function useCalendarZoom(): [number, (z: number) => void, ZoomControls] {
  const [zoom, setZoomState] = React.useState<number>(DEFAULT);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const n = raw ? Number(raw) : NaN;
      if (Number.isFinite(n)) setZoomState(clamp(n));
    } catch {
      /* SSR / disabled storage */
    }
  }, []);

  const setZoom = React.useCallback((z: number) => {
    const next = clamp(z);
    setZoomState(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      /* noop */
    }
  }, []);

  const controls: ZoomControls = React.useMemo(
    () => ({
      zoom,
      zoomIn: () => setZoom(zoom + STEP),
      zoomOut: () => setZoom(zoom - STEP),
      reset: () => setZoom(DEFAULT),
      canZoomIn: zoom < MAX_ZOOM,
      canZoomOut: zoom > MIN_ZOOM,
    }),
    [zoom, setZoom],
  );

  return [zoom, setZoom, controls];
}
