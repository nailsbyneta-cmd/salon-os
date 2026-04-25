'use client';
/**
 * Booking-Cart-Store: minimaler Client-State für Multi-Service-Buchung.
 * Persistiert in localStorage damit Reload + Navigation den Cart behält.
 *
 * Pro Service merken wir uns: serviceId, durationMinutes (vom Wizard
 * nach Optionen+AddOns berechnet), priceMinor (für Total-Anzeige),
 * displayName, optionIds[] (für die finale Buchung).
 */
import * as React from 'react';

export interface CartItem {
  serviceId: string;
  serviceName: string;
  priceMinor: number;
  durationMinutes: number;
  optionIds?: string[];
  addOnIds?: string[];
  bundleIds?: string[];
}

const KEY_PREFIX = 'salon-os-cart::';

function storageKey(slug: string): string {
  return `${KEY_PREFIX}${slug}`;
}

function readCart(slug: string): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as CartItem[];
  } catch {
    return [];
  }
}

function writeCart(slug: string, items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(slug), JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(`cart-changed:${slug}`));
  } catch {
    /* quota or serialization failure — silently drop */
  }
}

export function useCart(slug: string): {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (serviceId: string) => void;
  clear: () => void;
  has: (serviceId: string) => boolean;
} {
  const [items, setItems] = React.useState<CartItem[]>([]);

  React.useEffect(() => {
    setItems(readCart(slug));
    const handler = (): void => setItems(readCart(slug));
    window.addEventListener(`cart-changed:${slug}`, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(`cart-changed:${slug}`, handler);
      window.removeEventListener('storage', handler);
    };
  }, [slug]);

  const add = React.useCallback(
    (item: CartItem): void => {
      const next = [...readCart(slug).filter((i) => i.serviceId !== item.serviceId), item];
      writeCart(slug, next);
    },
    [slug],
  );

  const remove = React.useCallback(
    (serviceId: string): void => {
      const next = readCart(slug).filter((i) => i.serviceId !== serviceId);
      writeCart(slug, next);
    },
    [slug],
  );

  const clear = React.useCallback((): void => {
    writeCart(slug, []);
  }, [slug]);

  const has = React.useCallback(
    (serviceId: string): boolean => items.some((i) => i.serviceId === serviceId),
    [items],
  );

  return { items, add, remove, clear, has };
}
