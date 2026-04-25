'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useCart, type CartItem } from './cart-store';

/**
 * Service-Card-Wrapper mit Cart-Toggle.
 * - Klick auf Card-Body: → /configure (Single-Buchung-Flow wie vorher)
 * - Klick auf "+ Cart" Button: in Cart aufnehmen (Multi-Buchung)
 *
 * Cart bekommt minimale Service-Daten (id, name, basePrice,
 * durationMinutes). Wenn der Kunde später aus dem Cart bucht,
 * wird der Wizard nicht durchlaufen — Default-Optionen werden
 * verwendet. Falls jemand komplette Konfig will, geht er direkt
 * zur Configure-Page (nicht via Cart).
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
  const { has, add, remove } = useCart(slug);
  const router = useRouter();
  const inCart = has(serviceId);

  const toggle = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (inCart) {
      remove(serviceId);
    } else {
      const item: CartItem = {
        serviceId,
        serviceName,
        priceMinor: Math.round(Number(basePrice) * 100),
        durationMinutes,
      };
      add(item);
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
        onClick={toggle}
        aria-pressed={inCart}
        aria-label={inCart ? `${serviceName} aus Cart entfernen` : `${serviceName} in Cart legen`}
        className={[
          'absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-200',
          inCart
            ? 'border-accent bg-accent text-accent-foreground shadow-glow'
            : 'border-border bg-surface text-text-muted hover:border-accent hover:text-accent',
        ].join(' ')}
      >
        {inCart ? '✓' : '+'}
      </button>
    </div>
  );
}
