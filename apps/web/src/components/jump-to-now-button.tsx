'use client';
import * as React from 'react';
import { Button } from '@salon-os/ui';

/**
 * Scrollt die Seite zum NowLine-Element im Kalender. Findet das Element
 * über `[data-now-line]` — wenn Tag nicht heute oder NowLine ausserhalb
 * der Anzeigezeit (vor 08:00 / nach 19:00) ist, rendert NowLine nichts
 * und das Element existiert nicht → Button-Klick macht dann nichts.
 *
 * Beobachtet via MutationObserver ob das Element existiert — zeigt den
 * Button nur wenn Scroll-Ziel verfügbar (vermeidet toten Klick).
 */
export function JumpToNowButton(): React.JSX.Element | null {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const check = (): void => setVisible(!!document.querySelector('[data-now-line]'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const jump = (): void => {
    const el = document.querySelector('[data-now-line]');
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <Button variant="secondary" size="sm" onClick={jump} aria-label="Zur aktuellen Uhrzeit">
      Jetzt
    </Button>
  );
}
