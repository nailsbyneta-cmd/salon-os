import { NextResponse } from 'next/server';

/**
 * PWA-Manifest für die Staff-Mobile-App. Wird unter /m/manifest.webmanifest
 * ausgeliefert. iPhone Safari + Android Chrome können das auf dem
 * Home-Screen installieren.
 */
export function GET(): NextResponse {
  return NextResponse.json({
    name: 'SALON OS Staff',
    short_name: 'SALON OS',
    description: 'Dein Salon in der Tasche — Termine, Kundinnen, Kasse.',
    start_url: '/m',
    scope: '/',
    display: 'standalone',
    background_color: '#FAFAF9',
    theme_color: '#0F172A',
    lang: 'de-CH',
    orientation: 'portrait',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  });
}
