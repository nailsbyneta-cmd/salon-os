import { NextResponse } from 'next/server';

/**
 * PWA-Manifest für die Public-Booking-Seite. Als route.ts (nicht
 * `manifest.ts`-Konvention), damit Next.js den Link NICHT automatisch
 * in ALLE Seiten injektet — die Mobile-Staff-App unter /m braucht
 * ein eigenes Manifest (/m/manifest.webmanifest).
 *
 * App-Store-Readiness (2026-04-28):
 * - theme_color + background_color = #0A0A0A (matched Dark-Theme der
 *   Booking-Page — verhindert weissen Splash-Blitz)
 * - Multi-Size Icon-Deklarationen für PWABuilder/Store-Submission
 *   (auch wenn /icon-Endpoint dieselbe 512×512 generiert, lesen
 *   Android/Apple die sizes-Attribute zur Hint-basierten Resize)
 * - shortcuts[] für Android Long-Press auf App-Icon
 */
export function GET(): NextResponse {
  return NextResponse.json({
    name: 'Beautycenter by Neta',
    short_name: 'Beautyneta',
    description: 'Termine online buchen bei Beautycenter by Neta',
    start_url: '/book/beautycenter-by-neta',
    scope: '/',
    display: 'standalone',
    background_color: '#0A0A0A',
    theme_color: '#0A0A0A',
    lang: 'de-CH',
    orientation: 'portrait',
    categories: ['lifestyle', 'beauty', 'shopping'],
    icons: [
      { src: '/icon', sizes: '48x48', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '72x72', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '96x96', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '128x128', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '144x144', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '152x152', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '256x256', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '384x384', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
    shortcuts: [
      {
        name: 'Termin buchen',
        short_name: 'Buchen',
        description: 'Direkt zum Booking-Flow',
        url: '/book/beautycenter-by-neta',
        icons: [{ src: '/icon', sizes: '96x96' }],
      },
      {
        name: 'Meine Termine',
        short_name: 'Mein Konto',
        description: 'Login zur Termin-Verwaltung',
        url: '/book/beautycenter-by-neta/me/login',
        icons: [{ src: '/icon', sizes: '96x96' }],
      },
    ],
    prefer_related_applications: false,
  });
}
