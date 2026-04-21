'use client';
import * as React from 'react';
import Link from 'next/link';
import { Button } from '@salon-os/ui';

const STORAGE_KEY = 'salon-os:cookie-consent';
const CONSENT_VERSION = '1';

/**
 * DSG/DSGVO-konformer Cookie-Banner. Wir setzen sowieso nur
 * technisch notwendige Cookies (Session, Theme). Der Banner
 * informiert darüber und speichert die Bestätigung. Ablehnen tut
 * nichts (weil wir nichts Trackbares haben).
 */
export function CookieConsent({
  privacyHref,
}: {
  privacyHref: string;
}): React.JSX.Element | null {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== CONSENT_VERSION) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const accept = (): void => {
    try {
      localStorage.setItem(STORAGE_KEY, CONSENT_VERSION);
    } catch {
      /* noop */
    }
    setVisible(false);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
      <div className="pointer-events-auto mx-auto flex max-w-3xl flex-col gap-3 rounded-lg border border-border bg-surface/95 p-4 shadow-lg backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-text-secondary sm:text-sm">
          <p className="font-medium text-text-primary">Cookies? Nur die nötigen.</p>
          <p className="mt-1">
            Wir nutzen ausschliesslich technisch notwendige Cookies (Session,
            dein Theme-Präferenz). Kein Tracking, kein Analytics, kein
            Marketing.{' '}
            <Link href={privacyHref} className="text-accent hover:underline">
              Details
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 justify-end">
          <Button onClick={accept} variant="primary" size="sm">
            Verstanden
          </Button>
        </div>
      </div>
    </div>
  );
}
