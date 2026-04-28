/* Salon-OS Service Worker — Minimal Offline-Fallback (App-Store-Readiness).
 *
 * Strategie:
 *   - Install: precachet die Offline-Page
 *   - Fetch (HTML-Navigation only): network-first, fallback Offline-Page
 *   - Andere Requests (assets, API): pass-through (kein aggressives Caching,
 *     damit Buchungs-State + tenant-Daten frisch bleiben)
 *
 * Bewusst kein full PWA-Cache: Booking-Daten sind dynamisch, Stale-Cache
 * würde "Termin gerade gebucht aber zeigt noch frei" verursachen. Wir
 * cachen nur den Offline-Fallback damit Railway-Cold-Starts oder
 * Network-Glitches nicht zu weissem Bildschirm führen.
 */
const CACHE_NAME = 'salon-os-offline-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
    })(),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Alte Caches putzen
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  // Nur HTML-Navigation behandeln (keine API-Calls, keine Assets cachen)
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    (async () => {
      try {
        // Network-first — versuche live, sonst offline-Fallback
        const fresh = await fetch(event.request);
        return fresh;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(OFFLINE_URL);
        return cached ?? new Response('Offline', { status: 503 });
      }
    })(),
  );
});
