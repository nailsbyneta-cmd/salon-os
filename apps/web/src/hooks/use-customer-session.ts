'use client';
import * as React from 'react';

/**
 * Lightweight Customer-Session-Hook für HeroWelcome.
 *
 * Persistiert minimale Daten in localStorage nach erfolgreicher
 * Buchung — KEIN Login, KEINE PII über firstName + Buchungs-
 * Kategorien hinaus. Pro tenantSlug separate Session damit Multi-
 * Tenant-Use auf demselben Browser klar getrennt bleibt.
 *
 * SSR-safe: liest erst nach Hydration via useEffect, gibt vorher
 * null zurück (kein Hydration-Mismatch beim ersten Render).
 *
 * Wichtig: Das ist NICHT der Auth-Magic-Link-Cookie (der heisst
 * salon_customer_session und ist HTTP-only sealed). Das hier ist
 * Pure-Client-Personalisierungs-Cache fuer den HeroWelcome-Flow.
 */

/**
 * Key-Convention: `salon_customer_session_<tenantSlug>` (matched UX-Brief
 * Spec). Nicht zu verwechseln mit dem HTTP-Only-Cookie 'salon_customer_session'
 * (sealed Magic-Link-Auth) — localStorage und Cookie sind getrennte
 * Storages, keine Kollision.
 */
const KEY_PREFIX = 'salon_customer_session_';
/** Legacy-Prefix aus der ersten HeroWelcome-Iteration, lesen für
 *  Sessions die schon vor dem Key-Rename geschrieben wurden. */
const LEGACY_KEY_PREFIX = 'salon-os::welcome::';

export interface CustomerSession {
  firstName: string;
  /** ISO date des letzten Termins. */
  lastVisitDate?: string;
  lastService?: string;
  /** Service-Kategorien die schon mal gebucht wurden (lowercase). */
  bookingHistory?: string[];
  totalVisits?: number;
}

function key(tenantSlug: string): string {
  return `${KEY_PREFIX}${tenantSlug}`;
}

function legacyKey(tenantSlug: string): string {
  return `${LEGACY_KEY_PREFIX}${tenantSlug}`;
}

export function useCustomerSession(tenantSlug: string): {
  session: CustomerSession | null;
  /** Hydrated = useEffect ist gelaufen, wir wissen dass localStorage gelesen wurde. */
  hydrated: boolean;
} {
  const [session, setSession] = React.useState<CustomerSession | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // Read canonical key first; fall back to legacy key for sessions
      // written before the 2026-04-28 rename.
      let raw = window.localStorage.getItem(key(tenantSlug));
      if (!raw) raw = window.localStorage.getItem(legacyKey(tenantSlug));
      if (raw) {
        const parsed = JSON.parse(raw) as CustomerSession;
        if (parsed && typeof parsed.firstName === 'string') {
          setSession(parsed);
        }
      }
    } catch {
      /* ignore corrupt values */
    } finally {
      setHydrated(true);
    }
  }, [tenantSlug]);

  return { session, hydrated };
}

/**
 * Setzt die Session — wird nach erfolgreichem Booking-Submit gerufen.
 * Idempotent: merged Booking-History (kein Doppel-Eintrag), updated
 * lastVisitDate + totalVisits inkrementell.
 */
export function recordBooking(args: {
  tenantSlug: string;
  firstName: string;
  serviceCategory?: string;
  serviceName?: string;
}): void {
  if (typeof window === 'undefined') return;
  const k = key(args.tenantSlug);
  let existing: CustomerSession | null = null;
  try {
    const raw = window.localStorage.getItem(k);
    if (raw) existing = JSON.parse(raw) as CustomerSession;
  } catch {
    /* fall through */
  }
  const cat = args.serviceCategory?.toLowerCase().trim();
  const history = existing?.bookingHistory ?? [];
  const merged = cat && !history.includes(cat) ? [...history, cat] : history;
  const next: CustomerSession = {
    firstName: args.firstName,
    lastVisitDate: new Date().toISOString(),
    lastService: args.serviceName ?? existing?.lastService,
    bookingHistory: merged,
    totalVisits: (existing?.totalVisits ?? 0) + 1,
  };
  try {
    window.localStorage.setItem(k, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}
