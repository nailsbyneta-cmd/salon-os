'use client';
import * as React from 'react';
import Link from 'next/link';
import { useCart } from './cart-store';

/**
 * Sticky-Cart-Pill mit Bottom-Sheet-Drawer (UX-Brief Aufgabe 3).
 *
 * Zwei States:
 *  - Collapsed: Pill am unteren Rand mit "N · CHF X · CTA" — wie vorher.
 *  - Expanded: Tap auf den Items-Badge öffnet ein Bottom-Sheet (Mobile)
 *    bzw. Side-Panel (Desktop). Zeigt jedes Item mit Preis + Dauer +
 *    Entfernen-Button. Total + CTA bleibt im Footer des Drawers.
 *
 * Endowment-Effect: sobald die Kundin den Cart sehen kann, fühlt es sich
 * "ihres" an und sie zögert mehr beim Schliessen des Tabs (UX-Brief).
 *
 * Doppelbuchungs-Schutz: das Entfernen passiert hier — die Service-Card
 * lässt sich nicht mehr toggeln (verhindert Doppel-Click-Confusion).
 */
export function CartPill({ slug }: { slug: string }): React.JSX.Element | null {
  const { items, remove, clear } = useCart(slug);
  const [open, setOpen] = React.useState(false);

  // ESC-Key schliesst Drawer (a11y) + Body-Scroll-Lock während offen
  React.useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (items.length === 0) return null;

  const totalCents = items.reduce((s, i) => s + i.priceMinor, 0);
  const totalMin = items.reduce((s, i) => s + i.durationMinutes, 0);
  const single = items.length === 1;
  const firstItem = items[0]!;
  const totalChf = (totalCents / 100).toFixed(0);

  const ctaHref = single
    ? `/book/${slug}/service/${firstItem.serviceId}/configure`
    : `/book/${slug}/cart`;

  const labelMain = single
    ? `${firstItem.serviceName} · CHF ${totalChf}`
    : `${items.length} Services · CHF ${totalChf} · ${totalMin} Min`;
  const labelCta = single ? 'Termin wählen' : 'Termine finden';

  return (
    <>
      <div className="sticky bottom-0 z-40 -mx-4 mt-6 border-t border-accent/30 bg-surface/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur-md md:mx-0 md:rounded-2xl md:border md:px-5">
        <div className="flex items-center gap-2">
          {/* Items-Badge — Klick öffnet Drawer */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Warenkorb anzeigen"
            aria-expanded={open}
            className="group flex h-12 flex-none items-center justify-center gap-1.5 rounded-xl border border-accent/40 bg-surface px-3 text-sm font-semibold text-accent transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:bg-accent/5 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
          >
            <span aria-hidden>🛒</span>
            <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-xs tabular-nums">
              {items.length}
            </span>
          </button>
          {/* CTA */}
          <Link
            href={ctaHref}
            className="flex flex-1 items-center justify-between gap-3 rounded-xl bg-accent px-4 py-3 text-accent-foreground shadow-glow transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.99]"
          >
            <span className="truncate text-sm font-semibold tabular-nums">{labelMain}</span>
            <span className="flex flex-none items-center gap-1 text-sm font-semibold">
              {labelCta}
              <span aria-hidden>→</span>
            </span>
          </Link>
        </div>
      </div>

      {/* Drawer */}
      {open ? (
        <CartDrawer
          items={items}
          totalCents={totalCents}
          totalMin={totalMin}
          ctaHref={ctaHref}
          ctaLabel={labelCta}
          onClose={() => setOpen(false)}
          onRemove={remove}
          onClear={clear}
        />
      ) : null}
    </>
  );
}

interface DrawerProps {
  items: ReturnType<typeof useCart>['items'];
  totalCents: number;
  totalMin: number;
  ctaHref: string;
  ctaLabel: string;
  onClose: () => void;
  onRemove: (serviceId: string) => void;
  onClear: () => void;
}

function CartDrawer({
  items,
  totalCents,
  totalMin,
  ctaHref,
  ctaLabel,
  onClose,
  onRemove,
  onClear,
}: DrawerProps): React.JSX.Element {
  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Schliessen"
        onClick={onClose}
        className="fixed inset-0 z-50 animate-[fadeIn_180ms_ease-out] bg-black/55 backdrop-blur-sm"
      />
      {/* Sheet — Bottom auf Mobile, rechts auf Desktop */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[80vh] animate-[slideUp_240ms_cubic-bezier(0.16,1,0.3,1)] flex-col overflow-hidden border-t border-accent/30 bg-[#141008] text-white shadow-[0_-12px_40px_rgba(0,0,0,0.55)] md:bottom-auto md:left-auto md:right-6 md:top-6 md:max-h-[calc(100vh-3rem)] md:max-w-md md:animate-[slideInRight_240ms_cubic-bezier(0.16,1,0.3,1)] md:rounded-2xl md:border"
        style={{ borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}
      >
        {/* Drag-Handle (Mobile only — Visual cue) */}
        <div className="flex justify-center py-2 md:hidden">
          <div className="h-1 w-10 rounded-full bg-white/25" aria-hidden />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h2 id="cart-drawer-title" className="font-display text-lg font-semibold">
            Dein Warenkorb
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-m-2 rounded-md p-2 text-white/60 hover:text-white"
            aria-label="Schliessen"
          >
            ✕
          </button>
        </div>

        {/* Item-Liste — scrollable */}
        <ul className="flex-1 divide-y divide-white/10 overflow-y-auto px-5">
          {items.map((it) => (
            <li key={it.serviceId} className="flex items-start justify-between gap-3 py-4">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-white">{it.serviceName}</div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-white/55">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 tabular-nums">
                    <span aria-hidden>⏱</span>
                    {it.durationMinutes} Min
                  </span>
                  <span className="tabular-nums">
                    <span className="mr-0.5 text-[9px] text-white/45">CHF</span>
                    {(it.priceMinor / 100).toFixed(0)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(it.serviceId)}
                aria-label={`${it.serviceName} entfernen`}
                className="-m-2 p-2 text-xs text-rose-400 hover:text-rose-300"
              >
                × Entfernen
              </button>
            </li>
          ))}
        </ul>

        {/* Footer */}
        <div className="space-y-3 border-t border-white/10 bg-[#141008] px-5 py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-white/60">Gesamt</span>
            <span className="font-display text-2xl font-semibold tabular-nums text-accent">
              <span className="mr-1 text-[11px] text-white/45">CHF</span>
              {(totalCents / 100).toFixed(0)}
            </span>
          </div>
          {items.length >= 2 ? (
            <p className="text-[11px] text-white/45">
              Du buchst {items.length} Services · {totalMin} Min — wir finden den nächsten freien
              Slot für alle.
            </p>
          ) : null}
          <Link
            href={ctaHref}
            onClick={onClose}
            className="flex w-full items-center justify-center gap-1 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.99]"
          >
            {ctaLabel} <span aria-hidden>→</span>
          </Link>
          {items.length >= 2 ? (
            <button
              type="button"
              onClick={() => {
                onClear();
                onClose();
              }}
              className="w-full text-center text-xs text-white/40 hover:text-white/60"
            >
              Warenkorb leeren
            </button>
          ) : null}
        </div>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0.5; }
            to { transform: translateX(0); opacity: 1; }
          }
          @media (prefers-reduced-motion: reduce) {
            .animate-\\[fadeIn_180ms_ease-out\\],
            .animate-\\[slideUp_240ms_cubic-bezier\\(0\\.16\\,1\\,0\\.3\\,1\\)\\],
            .animate-\\[slideInRight_240ms_cubic-bezier\\(0\\.16\\,1\\,0\\.3\\,1\\)\\] {
              animation: none !important;
            }
          }
        `}</style>
      </aside>
    </>
  );
}
