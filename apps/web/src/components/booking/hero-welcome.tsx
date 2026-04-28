'use client';

import * as React from 'react';
import {
  selectWelcomeMessage,
  getSeason,
  getDayOfYear,
  type WelcomeContext,
} from '@/lib/welcome-logic';
import { fetchWeather } from '@/lib/weather-service';
import { useCustomerSession } from '@/hooks/use-customer-session';

interface Props {
  tenantSlug: string;
  tenantName: string;
  tenantCity?: string | null;
  /** Service-Kategorien als lowercase-Keywords für Cross-Sell-Match. */
  serviceCategories: string[];
  /** Optional Salon-Koordinaten für Wetter-Kontext. */
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * HeroWelcome — personalisierte Begrüssungszeile unter der Tagline.
 *
 * Priority-Waterfall in lib/welcome-logic.ts (pure functions, testbar).
 * Hier nur: Kontext zusammenstellen, Wetter optional async laden,
 * Render mit fade-in nach Hydration.
 *
 * SSR-Safe: rendert NICHTS bis useEffect gelaufen ist — verhindert
 * Hydration-Mismatch (Server kennt weder localStorage noch Wetter).
 * Der subtile fadeIn nach Hydration ist gewollt: wirkt wie eine
 * "merkt-sich-mich"-Animation, nicht wie ein Flash.
 */
export function HeroWelcome({
  tenantSlug,
  tenantName,
  tenantCity,
  serviceCategories,
  latitude,
  longitude,
}: Props): React.JSX.Element | null {
  const { session, hydrated } = useCustomerSession(tenantSlug);
  const [weather, setWeather] = React.useState<WelcomeContext['weather']>(undefined);
  const [weatherChecked, setWeatherChecked] = React.useState(false);

  // Wetter optional + non-blocking. Wenn keine Koordinaten → skip.
  React.useEffect(() => {
    if (!hydrated) return;
    if (latitude == null || longitude == null) {
      setWeatherChecked(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      const w = await fetchWeather({ latitude, longitude, cacheKey: tenantSlug });
      if (cancelled) return;
      if (w) setWeather(w);
      setWeatherChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, latitude, longitude, tenantSlug]);

  // Bis Hydration durch ist + Wetter-Versuch erledigt: nichts rendern.
  // Verhindert (a) SSR-Mismatch, (b) Flash mit Saison-Fallback bevor
  // Wetter-Wert ankommt.
  if (!hydrated || !weatherChecked) return null;

  const now = new Date();
  const ctx: WelcomeContext = {
    customer: session ?? undefined,
    tenant: {
      name: tenantName,
      ...(tenantCity ? { city: tenantCity } : {}),
      serviceCategories,
    },
    currentHour: now.getHours(),
    weather,
    isWeekend: now.getDay() === 0 || now.getDay() === 6,
    season: getSeason(now.getMonth() + 1),
    dayOfYear: getDayOfYear(now),
  };

  const msg = selectWelcomeMessage(ctx);
  if (!msg) return null;

  // Highlight-Name in goldener Vollfarbe gegenüber dem Rest in 70% gold.
  const renderText = (): React.ReactNode => {
    if (!msg.highlightName) return msg.text;
    const idx = msg.text.indexOf(msg.highlightName);
    if (idx === -1) return msg.text;
    const before = msg.text.slice(0, idx);
    const after = msg.text.slice(idx + msg.highlightName.length);
    return (
      <>
        {before}
        <span className="text-accent">{msg.highlightName}</span>
        {after}
      </>
    );
  };

  return (
    <p
      data-source={msg.source}
      className="mx-auto mt-3 max-w-xs animate-[heroWelcomeFadeIn_700ms_cubic-bezier(0.16,1,0.3,1)_both] text-center text-sm italic tracking-wide text-accent/70"
      style={{ animationDelay: '600ms' }}
    >
      {renderText()}
      <style>{`
        @keyframes heroWelcomeFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[heroWelcomeFadeIn_700ms_cubic-bezier\\(0\\.16\\,1\\,0\\.3\\,1\\)_both\\] {
            animation: none;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </p>
  );
}
