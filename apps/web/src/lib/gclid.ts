/**
 * Google-Ads GCLID-Capture (Frontend).
 *
 * Logik:
 *   1. Beim Page-Load `?gclid=…` aus URL lesen → in localStorage 90d.
 *   2. Beim Booking-Submit Wert auslesen (auch ohne URL-Param) und ans
 *      Backend schicken → server-side uploadClickConversion.
 *
 * Falls localStorage nicht verfügbar (Privacy-Mode, no-DOM) gracefully → null.
 */

const KEY = 'salonos_gclid';
const TS = 'salonos_gclid_ts';
const SOURCE = 'salonos_acq_source';
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

function safeStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    const ls = window.localStorage;
    // Trigger access to make sure it's not blocked
    ls.getItem('__probe__');
    return ls;
  } catch {
    return null;
  }
}

/** Detect Acquisition-Source aus utm_source / referrer / gclid. First-touch only. */
function detectSource(searchParams: URLSearchParams, referrer: string): string {
  if (searchParams.get('gclid')) return 'google_ads';
  const utm = searchParams.get('utm_source')?.toLowerCase();
  if (utm === 'google_ads' || utm === 'google' || utm === 'adwords') return 'google_ads';
  if (utm === 'instagram' || utm === 'ig') return 'instagram';
  if (utm === 'gbp' || utm === 'google_maps' || utm === 'gmb') return 'gbp';
  if (utm === 'facebook' || utm === 'fb') return 'referral';
  if (!referrer) return 'direct';
  if (referrer.includes('google.')) return 'organic';
  if (referrer.includes('instagram.com')) return 'instagram';
  if (referrer.includes('facebook.com') || referrer.includes('fb.com')) return 'referral';
  return 'referral';
}

/**
 * Bei Page-Load aufrufen (idempotent). Liest URL-Params, persistiert
 * GCLID + acquisitionSource in localStorage. Existing-Werte werden NICHT
 * überschrieben (first-touch attribution) — ausser ein neuer GCLID kommt
 * (wenn die Kundin nochmal klickt ist das ein neuer Touch).
 */
export function captureFromUrl(): void {
  const ls = safeStorage();
  if (!ls) return;
  const params = new URLSearchParams(window.location.search);
  const incoming = params.get('gclid');
  if (incoming) {
    ls.setItem(KEY, incoming);
    ls.setItem(TS, String(Date.now()));
  }
  // Source nur first-touch setzen (kein overwrite bei späteren Visits)
  if (!ls.getItem(SOURCE)) {
    ls.setItem(SOURCE, detectSource(params, document.referrer ?? ''));
  }
}

/** Liest gespeicherte GCLID (mit 90d-TTL) — null wenn abgelaufen oder fehlend. */
export function readStoredGclid(): string | null {
  const ls = safeStorage();
  if (!ls) return null;
  const v = ls.getItem(KEY);
  if (!v) return null;
  const ts = Number(ls.getItem(TS) ?? 0);
  if (!Number.isFinite(ts) || ts <= 0 || Date.now() - ts > NINETY_DAYS_MS) {
    ls.removeItem(KEY);
    ls.removeItem(TS);
    return null;
  }
  return v;
}

export function readStoredSource(): string | null {
  const ls = safeStorage();
  if (!ls) return null;
  return ls.getItem(SOURCE);
}
