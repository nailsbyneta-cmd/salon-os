import type { Metadata, Viewport } from 'next';
import { GtagSnippet } from '@/components/gtag-snippet';
import { SwRegister } from '@/components/sw-register';

/**
 * Public-Booking-Layout. Kein Admin-Sidebar, kein Auth.
 * Dark-Mode forced via data-theme="dark" — matched die Beautyneta-Brand
 * (#0A0A0A dominant, Gold-Akzente). Admin-Shell bleibt Light Mode.
 *
 * gtag.js wird hier injectet — NUR auf Booking-Seiten (Privacy: Admin-
 * UI darf nicht in Google-Ads-Audiences landen). IDs kommen aus
 * env-Vars: PUBLIC_DEFAULT_GOOGLE_ADS_ID + PUBLIC_DEFAULT_GA4_ID. Pro
 * Tenant overrides via tenant_ads_integration.conversionActions._meta —
 * die Page-Level Tenants übersteuern die ENV-Defaults.
 *
 * App-Store-Readiness: viewport.themeColor erzwingt #0A0A0A für Status-
 * Bar / Browser-Chrome auf der Booking-Page (matched Manifest +
 * Splash-Screen — kein weisser Blitz beim PWA-Launch).
 */
export const metadata: Metadata = {
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Beautyneta',
  },
};

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const adsId = process.env['PUBLIC_DEFAULT_GOOGLE_ADS_ID'] ?? null;
  const ga4Id = process.env['PUBLIC_DEFAULT_GA4_ID'] ?? null;
  return (
    <div data-theme="dark" className="min-h-screen bg-background text-text-primary">
      <GtagSnippet googleAdsId={adsId} ga4MeasurementId={ga4Id} />
      <SwRegister />
      <div className="mx-auto max-w-2xl px-4 pb-12 pt-10">{children}</div>
    </div>
  );
}
