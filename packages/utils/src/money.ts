/**
 * Money-Arithmetik immer in "minor units" (Rappen / Cent) als Integer —
 * kein Float, damit keine Rundungsfehler entstehen.
 */

export function minor(amount: number): number {
  return Math.round(amount);
}

export function toMajor(amount: number): number {
  return amount / 100;
}

/** Currency-aware Formatter. */
export function formatMoney(amountMinor: number, currency: string, locale = 'de-CH'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amountMinor / 100);
}
