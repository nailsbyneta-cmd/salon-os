'use client';
import * as React from 'react';

const STORAGE_KEY = 'salon-os:cal-only-active';

/**
 * Toggle ob nur Mitarbeiter:innen mit Terminen im aktuellen View
 * sichtbar sein sollen. Persistiert in localStorage.
 */
export function useOnlyActiveStaff(): [boolean, (v: boolean) => void] {
  const [value, setValue] = React.useState(false);

  React.useEffect(() => {
    try {
      setValue(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      /* SSR / disabled */
    }
  }, []);

  const update = React.useCallback((v: boolean) => {
    setValue(v);
    try {
      localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
    } catch {
      /* noop */
    }
  }, []);

  return [value, update];
}
