'use client';
import * as React from 'react';
import Link from 'next/link';
import { useCart } from './cart-store';

/**
 * Floating Cart-Pill bottom-right: zeigt Count + Total wenn ≥2 Services
 * im Cart sind. Single-Service nutzt direkten Configure-Flow ohne Cart.
 */
export function CartPill({ slug }: { slug: string }): React.JSX.Element | null {
  const { items } = useCart(slug);
  if (items.length < 2) return null;

  const totalCents = items.reduce((s, i) => s + i.priceMinor, 0);
  const totalMin = items.reduce((s, i) => s + i.durationMinutes, 0);

  return (
    <Link
      href={`/book/${slug}/cart`}
      className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-accent/40 bg-accent/95 px-5 py-3 text-sm font-semibold text-accent-foreground shadow-glow backdrop-blur transition-all duration-200 hover:-translate-x-1/2 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.98]"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-foreground/15 text-xs tabular-nums">
        {items.length}
      </span>
      <span>
        CHF {(totalCents / 100).toFixed(0)} · {totalMin} Min
      </span>
      <span className="opacity-75">→ Termine finden</span>
    </Link>
  );
}
