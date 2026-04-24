'use client';
import * as React from 'react';
import { Button } from '@salon-os/ui';

/**
 * Globaler Error-Boundary für unerwartete Crashes.
 * Next.js ruft das hier auf wenn eine Server-Component oder Client
 * Component einen unbehandelten Fehler wirft. Muss Client-Component
 * sein weil Reset-Logik clientseitig läuft.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  React.useEffect(() => {
    console.error('GlobalError:', error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-4 text-center">
      <div
        aria-hidden
        className="flex h-20 w-20 items-center justify-center rounded-full bg-danger/10 text-4xl"
      >
        ⚠️
      </div>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-danger">
          Unerwarteter Fehler
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Da ist etwas schiefgelaufen
        </h1>
        <p className="mt-3 text-sm text-text-secondary">
          Wir haben das Problem erfasst. Versuch es nochmal — oder kontaktier uns wenn's weiter
          passiert.
        </p>
        {error.digest ? (
          <p className="mt-2 text-[11px] font-mono text-text-muted">Ref: {error.digest}</p>
        ) : null}
      </div>
      <Button onClick={() => reset()} variant="accent">
        Nochmal versuchen
      </Button>
    </main>
  );
}
