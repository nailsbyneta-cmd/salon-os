'use client';

import Script from 'next/script';

interface Props {
  googleAdsId: string | null;
  ga4MeasurementId: string | null;
}

/**
 * Lädt gtag.js + initialisiert sowohl Google-Ads als auch GA4 Configs.
 * Eine einzige Library + zwei `config`-Calls (gtag's empfohlenes Setup).
 *
 * IDs kommen aus tenant_ads_integration.conversionActions._meta — d.h.
 * pro Tenant individuell konfigurierbar. Wenn beide null → Component
 * rendert nichts (Performance-Win für Tenants ohne Ads).
 *
 * Nur auf Booking-Seiten eingebunden — niemals im Admin (Privacy).
 */
export function GtagSnippet({ googleAdsId, ga4MeasurementId }: Props): React.JSX.Element | null {
  if (!googleAdsId && !ga4MeasurementId) return null;
  // gtag.js akzeptiert beliebige Initialisierungs-ID — wir nehmen die
  // erste verfügbare als URL-Param. Beide Configs danach via window.gtag.
  const initId = googleAdsId ?? ga4MeasurementId!;
  const inline = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('js', new Date());
    ${googleAdsId ? `gtag('config', '${googleAdsId}');` : ''}
    ${ga4MeasurementId ? `gtag('config', '${ga4MeasurementId}');` : ''}
  `;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${initId}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {inline}
      </Script>
    </>
  );
}
