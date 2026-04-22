'use client';
import * as React from 'react';

/**
 * Hook für Viewport-Dimensionen (width, height). SSR-sicher (Default
 * {w:1280,h:800} auf Server, echter Wert nach Mount). Triggert
 * Re-Render bei Resize — wird vom Kalender genutzt um pxPerMin und
 * Zellen-Höhen an den verfügbaren Platz anzupassen.
 */
export interface ViewportSize {
  w: number;
  h: number;
}

export function useViewportSize(): ViewportSize {
  const [size, setSize] = React.useState<ViewportSize>({ w: 1280, h: 800 });
  React.useEffect(() => {
    const update = (): void =>
      setSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return size;
}
