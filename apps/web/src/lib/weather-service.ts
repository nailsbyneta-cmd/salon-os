import type { WeatherCondition } from './welcome-logic';

/**
 * Open-Meteo Wrapper für HeroWelcome. Free-Tier, kein API-Key nötig.
 * Cached pro Salon-Standort 30 Min in sessionStorage. Graceful
 * degradation: bei API-Fail oder fehlenden Koordinaten → null
 * (Welcome-Logic fällt dann auf Saison/Wochenende zurück).
 *
 * Privacy: Keine User-Geolocation — wir nutzen die Salon-Koordinaten
 * (steht eh public im Map-Link auf der Booking-Page).
 */

const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_KEY_PREFIX = 'salon-weather:';

interface WeatherResult {
  condition: WeatherCondition;
  tempC: number;
}

interface CachedWeather extends WeatherResult {
  fetchedAt: number;
}

/** WMO Weather codes -> Bucket. https://open-meteo.com/en/docs */
function bucketFromWmo(code: number, tempC: number): WeatherCondition {
  if (tempC >= 28) return 'hot';
  if (tempC < 5) return 'cold';
  if (code === 0) return 'sunny';
  if (code >= 1 && code <= 3) return 'cloudy';
  // 51-67 drizzle/rain, 80-82 showers, 95-99 thunderstorms
  if ((code >= 51 && code <= 82) || (code >= 95 && code <= 99)) return 'rainy';
  return 'cloudy';
}

export async function fetchWeather(args: {
  latitude: number;
  longitude: number;
  cacheKey?: string;
}): Promise<WeatherResult | null> {
  if (typeof window === 'undefined') return null;
  const cacheKey = args.cacheKey ?? `${args.latitude},${args.longitude}`;
  const storage = safeSession();
  if (storage) {
    const raw = storage.getItem(`${CACHE_KEY_PREFIX}${cacheKey}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as CachedWeather;
        if (Date.now() - parsed.fetchedAt < CACHE_TTL_MS) {
          return { condition: parsed.condition, tempC: parsed.tempC };
        }
      } catch {
        /* fall through */
      }
    }
  }

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(args.latitude));
    url.searchParams.set('longitude', String(args.longitude));
    url.searchParams.set('current', 'temperature_2m,weathercode');
    url.searchParams.set('timezone', 'auto');
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return null;
    const data = (await r.json()) as {
      current?: { temperature_2m?: number; weathercode?: number };
    };
    const t = data.current?.temperature_2m;
    const code = data.current?.weathercode ?? 0;
    if (typeof t !== 'number') return null;
    const result: WeatherResult = { condition: bucketFromWmo(code, t), tempC: t };
    if (storage) {
      const cached: CachedWeather = { ...result, fetchedAt: Date.now() };
      try {
        storage.setItem(`${CACHE_KEY_PREFIX}${cacheKey}`, JSON.stringify(cached));
      } catch {
        /* quota exceeded or private mode — silently drop */
      }
    }
    return result;
  } catch {
    return null;
  }
}

function safeSession(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
