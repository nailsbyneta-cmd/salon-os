import { NextResponse } from 'next/server';

/**
 * PWA-Manifest für die Public-Booking-Seite. Als route.ts (nicht
 * `manifest.ts`-Konvention), damit Next.js den Link NICHT automatisch
 * in ALLE Seiten injektet — die Mobile-Staff-App unter /m braucht
 * ein eigenes Manifest (/m/manifest.webmanifest).
 */
export function GET(): NextResponse {
  return NextResponse.json({
    name: 'Beautycenter by Neta',
    short_name: 'Beautyneta',
    description: 'Termine online buchen bei Beautycenter by Neta',
    start_url: '/book/beautycenter-by-neta',
    scope: '/book',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#171717',
    lang: 'de-CH',
    orientation: 'portrait',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  });
}
