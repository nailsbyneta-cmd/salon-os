'use client';
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { useToast } from '@salon-os/ui';

const MESSAGES: Record<string, { title: string; description: string; intensity: number }> = {
  complete: {
    title: 'Termin abgeschlossen',
    description: 'Schön, dass du es geschafft hast 🎉',
    intensity: 1,
  },
  'big-tip': {
    title: 'Grosses Trinkgeld!',
    description: 'Bravo — deine Kundin ist begeistert.',
    intensity: 2,
  },
  'day-goal': {
    title: 'Tages-Ziel erreicht',
    description: 'Du hast dein Tages-Umsatz-Ziel geknackt.',
    intensity: 3,
  },
  booking: {
    title: 'Gebucht',
    description: 'Der Termin ist im Kalender.',
    intensity: 0,
  },
};

/**
 * Launcht Konfetti + Toast wenn ?celebrate=<key> in der URL ist.
 * Räumt den Query-Param direkt danach auf (replaceState), damit ein
 * Reload nicht nochmal feuert.
 */
export function Celebrate(): React.JSX.Element | null {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const fired = React.useRef<string | null>(null);

  React.useEffect(() => {
    const key = params.get('celebrate');
    if (!key || fired.current === key) return;
    const spec = MESSAGES[key];
    if (!spec) return;
    fired.current = key;

    toast.push({
      tone: 'success',
      title: spec.title,
      description: spec.description,
    });

    if (spec.intensity > 0) {
      const count = 120 * spec.intensity;
      const defaults = {
        origin: { y: 0.3 },
        colors: ['#D4A574', '#E91E63', '#9C27B0', '#16A34A', '#0F172A'],
      };
      void confetti({ ...defaults, particleCount: count, spread: 80, startVelocity: 45 });
      // 2. Welle für höhere Intensität
      if (spec.intensity >= 2) {
        setTimeout(() => {
          void confetti({
            ...defaults,
            particleCount: count / 2,
            spread: 120,
            origin: { y: 0.5 },
          });
        }, 220);
      }
    }

    if ('vibrate' in navigator) navigator.vibrate?.([10, 40, 10]);

    // Param aus URL entfernen
    const sp = new URLSearchParams(params.toString());
    sp.delete('celebrate');
    const query = sp.toString();
    const url =
      typeof window !== 'undefined'
        ? window.location.pathname + (query ? `?${query}` : '')
        : '/';
    router.replace(url, { scroll: false });
  }, [params, router, toast]);

  return null;
}
