'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@salon-os/ui';
import { useCart, type CartItem } from './cart-store';

/**
 * Service-Card-Wrapper mit Cart-Toggle.
 *
 * UX-Brief QW2 (2026-04-28): Doppelbuchungs-Schutz.
 *  - Service NICHT im Cart: "+" → fügt hinzu, kurze Pop-Animation,
 *    optional haptic feedback (navigator.vibrate).
 *  - Service IM Cart: "✓" wird DISABLED visuell + Klick zeigt Toast
 *    "Bereits im Warenkorb". Removal erfolgt im Cart-Pill / Drawer,
 *    NICHT mehr direkt am Card-Toggle (Doppel-Click-Confusion).
 *
 * Cart bekommt minimale Service-Daten (id, name, basePrice,
 * durationMinutes). Wenn der Kunde später aus dem Cart bucht, wird
 * der Wizard nicht durchlaufen — Default-Optionen werden verwendet.
 * Falls komplette Konfig gewünscht: direkt zur /configure (Card-Body).
 */
export function ServiceCardToggle({
  slug,
  serviceId,
  serviceName,
  basePrice,
  durationMinutes,
  configureHref,
  children,
}: {
  slug: string;
  serviceId: string;
  serviceName: string;
  basePrice: string | number;
  durationMinutes: number;
  configureHref: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const { has, add } = useCart(slug);
  const router = useRouter();
  const toast = useToast();
  const [popping, setPopping] = React.useState(false);
  const inCart = has(serviceId);

  const onToggleClick = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (inCart) {
      // Doppelbuchungs-Schutz: kein Re-Add, kein Remove. Nur sanfter
      // Hinweis, was zu tun ist (im Cart unten).
      toast.push({
        tone: 'success',
        title: 'Bereits im Warenkorb',
        description: 'Du kannst diesen Service unten im Warenkorb anpassen.',
        duration: 2500,
      });
      return;
    }
    const item: CartItem = {
      serviceId,
      serviceName,
      priceMinor: Math.round(Number(basePrice) * 100),
      durationMinutes,
    };
    add(item);
    setPopping(true);
    window.setTimeout(() => setPopping(false), 200);
    // Mobile haptic feedback (no-op auf Desktop / unsupported Browsers)
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(10);
    }
  };

  const openConfigure = (): void => {
    router.push(configureHref);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={openConfigure}
        className="group block w-full rounded-lg border border-border bg-surface text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md active:translate-y-0 active:scale-[0.99]"
        aria-label={`${serviceName} konfigurieren`}
      >
        {children}
      </button>
      <button
        type="button"
        onClick={onToggleClick}
        aria-pressed={inCart}
        aria-label={
          inCart ? `${serviceName} bereits im Warenkorb` : `${serviceName} in Warenkorb legen`
        }
        title={inCart ? 'Bereits im Warenkorb' : 'Hinzufügen'}
        className={[
          'absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-200',
          inCart
            ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400 cursor-default'
            : 'border-border bg-surface text-text-muted hover:border-accent hover:text-accent',
          popping ? 'scale-125' : 'scale-100',
        ].join(' ')}
      >
        {inCart ? '✓' : '+'}
      </button>
    </div>
  );
}
