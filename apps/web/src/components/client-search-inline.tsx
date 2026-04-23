'use client';
import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@salon-os/ui';

/**
 * Live-Filter für die Kundenliste. Debounced 180ms — jeder Tastenanschlag
 * triggert ein router.replace mit aktuellem `?q=…&filter=…`, wodurch die
 * Server-Component-Liste automatisch neu gerendert wird und die Tabelle
 * darunter sich live verkürzt.
 *
 * Kein separates Dropdown — die Tabelle IST die Vorschau. Simpler, ein-
 * deutiger: "ich tippe 'lor' → Liste zeigt genau die passenden Kundinnen".
 */
export function ClientSearchInline({ initialQ }: { initialQ: string }): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = React.useState(initialQ);
  const [, startTransition] = React.useTransition();

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(sp.toString());
      const trimmed = q.trim();
      if (trimmed.length === 0) {
        params.delete('q');
      } else {
        params.set('q', trimmed);
      }
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    }, 180);
    return () => clearTimeout(timer);
  }, [q, pathname, router, sp]);

  return (
    <Input
      name="q"
      value={q}
      onChange={(e) => setQ(e.target.value)}
      placeholder="Suchen…"
      className="w-56"
      autoComplete="off"
    />
  );
}
