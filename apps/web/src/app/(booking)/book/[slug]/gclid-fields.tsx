'use client';

import { useEffect, useState } from 'react';
import { captureFromUrl, readStoredGclid, readStoredSource } from '@/lib/gclid';

/**
 * Client-Component die beim Mount die GCLID-Capture-Logik anstößt und
 * danach gclid + acquisitionSource als hidden inputs in das Server-Action-
 * Form rendert. Server-Action liest sie via formData.get('gclid').
 *
 * Bewusst auf Confirm-Page eingebunden (nicht im Layout) — Capture
 * läuft auf jeder /book-Page schon, aber das Form steht nur hier.
 */
export function GclidFields(): React.JSX.Element {
  const [gclid, setGclid] = useState<string>('');
  const [source, setSource] = useState<string>('');

  useEffect(() => {
    captureFromUrl();
    setGclid(readStoredGclid() ?? '');
    setSource(readStoredSource() ?? '');
  }, []);

  return (
    <>
      <input type="hidden" name="gclid" value={gclid} />
      <input type="hidden" name="acquisitionSource" value={source} />
    </>
  );
}
