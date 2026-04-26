import * as React from 'react';

/**
 * Hook für verzögerte Wertaktualisierung.
 * Hilfreich für Search-Inputs, wo jeder Keystroke zu Spam-API-Calls führen kann.
 *
 * @param value - Der aktuelle Wert (z.B. aus state oder input)
 * @param delay - Verzögerung in ms (default: 300)
 * @returns Der verzögerte Wert
 *
 * @example
 * const [query, setQuery] = useState('');
 * const debouncedQuery = useDebouncedValue(query, 300);
 *
 * useEffect(() => {
 *   if (debouncedQuery !== query) {
 *     // Nur fetchem wenn der debounced Wert sich ändert
 *     searchAPI(debouncedQuery);
 *   }
 * }, [debouncedQuery]);
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
