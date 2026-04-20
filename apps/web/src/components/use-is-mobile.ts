'use client';
import * as React from 'react';

/**
 * Hook für Mobile-Breakpoint (< 768px = Tailwind md). Nutzt
 * matchMedia, ist SSR-sicher (Default false beim Server-Render;
 * flippt nach Mount auf echten Wert).
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const q = window.matchMedia('(max-width: 767px)');
    const update = (): void => setIsMobile(q.matches);
    update();
    q.addEventListener('change', update);
    return () => q.removeEventListener('change', update);
  }, []);
  return isMobile;
}
