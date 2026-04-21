import * as React from 'react';

import { cn } from './cn.js';

// ─── SyncBanner ───────────────────────────────────────────────
//
// Schmale Leiste am oberen/unteren Viewport-Rand, die den
// Netzwerk-/Sync-Zustand kommuniziert. Drei Zustände:
//
//   - 'online'    → nicht gerendert (null)
//   - 'syncing'   → blaues Info-Band mit Spinner
//   - 'offline'   → gelbes Warn-Band mit Retry-Hinweis
//   - 'error'     → rotes Danger-Band mit Beschreibung
//
// `position` wählt top vs. bottom — Staff-PWA nutzt typ. `bottom` über
// der Tab-Bar, Admin-Desktop `top`.

export type SyncState = 'online' | 'syncing' | 'offline' | 'error';

export interface SyncBannerProps {
  state: SyncState;
  message?: string;
  position?: 'top' | 'bottom';
  onRetry?: () => void;
  className?: string;
}

const stateStyle: Record<Exclude<SyncState, 'online'>, string> = {
  syncing: 'bg-info/90 text-white',
  offline: 'bg-warning/90 text-white',
  error: 'bg-danger/90 text-white',
};

const defaultMessage: Record<Exclude<SyncState, 'online'>, string> = {
  syncing: 'Synchronisiere…',
  offline: 'Offline — Änderungen werden gespeichert und nachgezogen.',
  error: 'Sync fehlgeschlagen.',
};

export function SyncBanner({
  state,
  message,
  position = 'top',
  onRetry,
  className,
}: SyncBannerProps): React.JSX.Element | null {
  if (state === 'online') return null;

  const text = message ?? defaultMessage[state];

  return (
    <div
      role="status"
      aria-live={state === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'fixed inset-x-0 z-40 flex items-center justify-between gap-3 px-4 py-2 text-xs font-medium',
        'shadow-sm backdrop-blur-sm',
        position === 'top' ? 'top-0' : 'bottom-0',
        stateStyle[state],
        className,
      )}
    >
      <span className="flex items-center gap-2">
        {state === 'syncing' ? (
          <span
            aria-hidden
            className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        ) : (
          <span aria-hidden>{state === 'offline' ? '◯' : '!'}</span>
        )}
        {text}
      </span>
      {onRetry && state !== 'syncing' ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-sm border border-white/30 px-2 py-0.5 hover:bg-white/10"
        >
          Erneut versuchen
        </button>
      ) : null}
    </div>
  );
}
