'use client';

import { useEffect } from 'react';
import { recordBooking } from '@/hooks/use-customer-session';

interface Props {
  tenantSlug: string;
  firstName: string;
  serviceCategory?: string;
  serviceName?: string;
  bookingRef: string;
}

/**
 * Schreibt nach erfolgreicher Buchung die Customer-Session in
 * localStorage damit HeroWelcome bei der naechsten Visit personalisiert
 * begruesst. Idempotent per bookingRef (sessionStorage flag) — Reload
 * zaehlt nicht doppelt.
 */
export function RecordBookingClient({
  tenantSlug,
  firstName,
  serviceCategory,
  serviceName,
  bookingRef,
}: Props): null {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const flag = `salon-os::recorded::${bookingRef}`;
    if (window.sessionStorage.getItem(flag)) return;
    window.sessionStorage.setItem(flag, '1');
    recordBooking({ tenantSlug, firstName, serviceCategory, serviceName });
  }, [tenantSlug, firstName, serviceCategory, serviceName, bookingRef]);
  return null;
}
