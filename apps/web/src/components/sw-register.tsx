'use client';

import { useEffect } from 'react';

/**
 * Registriert den Service-Worker /sw.js (App-Store-Readiness).
 *
 * Bewusst nur auf Public-Booking-Pages — Admin-UI braucht keinen Offline-
 * Modus, ein cached Login-Screen wäre verwirrend wenn die Session
 * eigentlich abgelaufen ist.
 *
 * Idempotent: navigator.serviceWorker.register() ist no-op wenn der
 * gleiche SW-URL schon registriert ist.
 */
export function SwRegister(): null {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    // Erst nach load-Event, damit der initial-Render nicht blockiert
    const onLoad = (): void => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        /* silently ignore — SW ist nice-to-have, kein Booking-Blocker */
      });
    };
    if (document.readyState === 'complete') {
      onLoad();
    } else {
      window.addEventListener('load', onLoad, { once: true });
    }
  }, []);
  return null;
}
