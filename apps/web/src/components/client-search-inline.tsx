'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, Badge, Input } from '@salon-os/ui';
import { searchClientsInline, type ClientHit } from '@/app/(admin)/clients/search-action';

/**
 * Type-Ahead-Suche auf der Kundenliste. Debounced (180ms) Server-Action-
 * Call, zeigt Dropdown mit bis zu 8 Treffern. Enter submitted weiterhin
 * den klassischen Form-Query (URL-Param `?q=…`), Pfeiltasten navigieren
 * die Liste, Esc schliesst.
 *
 * Ersetzt das bisherige reine Form-Input auf /clients — die Suche war
 * Server-round-trip-only und hatte keine Live-Preview.
 */
export function ClientSearchInline({ initialQ }: { initialQ: string }): React.JSX.Element {
  const router = useRouter();
  const [q, setQ] = React.useState(initialQ);
  const [results, setResults] = React.useState<ClientHit[]>([]);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const [pending, startTransition] = React.useTransition();
  const seqRef = React.useRef(0);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    const mine = ++seqRef.current;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const hits = await searchClientsInline(trimmed);
        // Race-Guard: nur die jüngste Anfrage darf Ergebnisse setzen.
        if (mine !== seqRef.current) return;
        setResults(hits);
        setOpen(hits.length > 0);
        setActive(-1);
      });
    }, 180);
    return () => clearTimeout(timer);
  }, [q]);

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent): void => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (!open || results.length === 0) {
      if (e.key === 'Enter') return; // Form-Submit läuft normal durch
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (active >= 0 && active < results.length) {
        e.preventDefault();
        const hit = results[active];
        if (hit) {
          setOpen(false);
          router.push(`/clients/${hit.id}`);
        }
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <Input
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => {
          if (results.length > 0) setOpen(true);
        }}
        onKeyDown={onKey}
        placeholder="Suchen…"
        className="w-56"
        autoComplete="off"
      />
      {open && results.length > 0 ? (
        <div
          className="absolute left-0 right-0 top-full z-40 mt-1 max-h-80 overflow-y-auto rounded-md border border-border bg-surface shadow-lg"
          role="listbox"
        >
          {results.map((c, idx) => {
            const isVip = Number(c.lifetimeValue) >= 2000;
            return (
              <Link
                key={c.id}
                href={`/clients/${c.id}`}
                onClick={() => setOpen(false)}
                onMouseEnter={() => setActive(idx)}
                role="option"
                aria-selected={idx === active}
                className={
                  idx === active
                    ? 'flex items-center gap-3 px-3 py-2 text-sm bg-surface-raised'
                    : 'flex items-center gap-3 px-3 py-2 text-sm hover:bg-surface-raised'
                }
              >
                <Avatar
                  name={`${c.firstName} ${c.lastName}`}
                  size="sm"
                  color="hsl(var(--brand-accent))"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-text-primary">
                    {isVip ? '★ ' : ''}
                    {c.firstName} {c.lastName}
                  </span>
                  <span className="block truncate text-xs text-text-muted">
                    {c.email ?? c.phone ?? '—'}
                  </span>
                </span>
                {c.totalVisits > 0 ? <Badge tone="neutral">{c.totalVisits}×</Badge> : null}
              </Link>
            );
          })}
          {pending ? (
            <div className="px-3 py-1.5 text-[10px] text-text-muted">Suche läuft…</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
