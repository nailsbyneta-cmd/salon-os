'use client';

import { useEffect } from 'react';

interface Props {
  /** AW-XXXXXX/Label (send_to) — wenn null, kein Ads-Conversion-Event. */
  conversionSendTo: string | null;
  /** Brutto-Wert in CHF (variant + add-ons + bundles enthalten). */
  valueChf: number;
  /** Salon-Os Appointment-ID = transaction_id (verhindert dedup). */
  appointmentId: string;
  currency?: string;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    __salonosConvFired?: Set<string>;
  }
}

/**
 * Feuert ein Google-Ads-Conversion + GA4-Booking-Event, wenn die /success-
 * Page geladen wird. Idempotent pro appointmentId (Set in window) — bei
 * Reload oder Hot-Refresh wird NICHT doppelt geschossen.
 */
export function ConversionFire({
  conversionSendTo,
  valueChf,
  appointmentId,
  currency = 'CHF',
}: Props): null {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.gtag) return;
    window.__salonosConvFired = window.__salonosConvFired ?? new Set();
    if (window.__salonosConvFired.has(appointmentId)) return;
    window.__salonosConvFired.add(appointmentId);

    if (conversionSendTo) {
      window.gtag('event', 'conversion', {
        send_to: conversionSendTo,
        value: valueChf,
        currency,
        transaction_id: appointmentId,
      });
    }
    // GA4 + Brand-Event 'terminbuchung' (Custom-Event für Audience-Building
    // auf GA4-Seite — selbst wenn Ads-Integration nicht aktiv ist).
    window.gtag('event', 'terminbuchung', {
      value: valueChf,
      currency,
      transaction_id: appointmentId,
    });
    window.gtag('event', 'purchase', {
      transaction_id: appointmentId,
      value: valueChf,
      currency,
    });
  }, [conversionSendTo, valueChf, appointmentId, currency]);

  return null;
}
