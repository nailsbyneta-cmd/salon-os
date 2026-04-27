'use client';
import * as React from 'react';
import Link from 'next/link';
import { useCart } from './cart-store';

/**
 * Sticky-Cart-Footer (oder Bottom-Pill auf Mobile).
 * - 1 Service ausgewählt → "1 Service · CHF X — Termin wählen →" → direkt
 *   zur Configure-Seite. Verhindert dass die Stylistin denkt "+" ist
 *   eine Sackgasse (Audit-Befund Pass 9).
 * - 2+ Services → Multi-Service-Cart-Flow, /cart-Seite.
 */
export function CartPill({ slug }: { slug: string }): React.JSX.Element | null {
  const { items } = useCart(slug);
  if (items.length === 0) return null;

  const totalCents = items.reduce((s, i) => s + i.priceMinor, 0);
  const totalMin = items.reduce((s, i) => s + i.durationMinutes, 0);
  const single = items.length === 1;
  const firstItem = items[0]!;

  // Single → Configure-URL (mit location aus localStorage o. ä. nicht
  // verfügbar im Client-State, deshalb /configure ohne location-Query —
  // die Configure-Page hat einen Fallback der die erste Location lädt).
  const href = single
    ? `/book/${slug}/service/${firstItem.serviceId}/configure`
    : `/book/${slug}/cart`;

  const labelMain = single
    ? `${firstItem.serviceName} · CHF ${(totalCents / 100).toFixed(0)}`
    : `${items.length} Services · CHF ${(totalCents / 100).toFixed(0)} · ${totalMin} Min`;
  const labelCta = single ? 'Termin wählen' : 'Termine finden';

  return (
    <div className="sticky bottom-0 z-40 -mx-4 mt-6 border-t border-accent/30 bg-surface/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur-md md:mx-0 md:rounded-2xl md:border md:px-5">
      <Link
        href={href}
        className="flex items-center justify-between gap-3 rounded-xl bg-accent px-5 py-3 text-accent-foreground shadow-glow transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.99]"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-accent-foreground/15 text-xs font-bold tabular-nums">
            {items.length}
          </span>
          <span className="truncate text-sm font-semibold tabular-nums">{labelMain}</span>
        </div>
        <span className="flex flex-none items-center gap-1 text-sm font-semibold">
          {labelCta}
          <span aria-hidden>→</span>
        </span>
      </Link>
    </div>
  );
}
