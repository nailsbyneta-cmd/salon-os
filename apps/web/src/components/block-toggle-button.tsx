'use client';
import * as React from 'react';
import { toggleClientBlocked } from '@/app/(admin)/clients/actions';

interface Props {
  clientId: string;
  currentBlocked: boolean;
  clientName: string;
}

/**
 * Toggle-Button für Client.blocked mit Confirm-Dialog beim Sperren.
 * Entsperren läuft ohne Nachfrage (nicht destruktiv).
 */
export function BlockToggleButton({
  clientId,
  currentBlocked,
  clientName,
}: Props): React.JSX.Element {
  const [pending, startTransition] = React.useTransition();

  const handleClick = (): void => {
    // Nur beim Sperren nachfragen — Entsperren ist unkritisch.
    if (!currentBlocked) {
      const ok = window.confirm(
        `${clientName} sperren?\n\nSie bekommt keine automatischen Geburtstags-Gratulationen, Win-Back-Aktionen oder Waitlist-Slot-Angebote mehr.\n\nRückgängig machen: jederzeit hier.`,
      );
      if (!ok) return;
    }
    startTransition(async () => {
      await toggleClientBlocked(clientId, !currentBlocked);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={
        currentBlocked
          ? 'inline-flex h-9 items-center rounded-md border border-warning/30 bg-warning/10 px-3 text-xs font-medium text-warning transition-colors hover:bg-warning/20 disabled:opacity-60'
          : 'inline-flex h-9 items-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-text-secondary transition-colors hover:border-danger/30 hover:bg-surface-raised hover:text-danger disabled:opacity-60'
      }
      aria-label={
        currentBlocked
          ? `${clientName} entsperren`
          : `${clientName} sperren (keine Gratulationen, Win-Back, Waitlist-Match)`
      }
      aria-busy={pending}
    >
      {currentBlocked ? '🔓 Entsperren' : '🔒 Sperren'}
    </button>
  );
}
