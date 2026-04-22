/**
 * Primitive Zod schemas used across multiple files.
 * Separate to avoid circular imports between index.ts and domain.ts.
 */
import { z } from 'zod';

export const uuidSchema = z.string().uuid();
export const isoDateTimeSchema = z.string().datetime({ offset: true });
// Akzeptiert 'chf' + 'CHF' (case-insensitiv), normalisiert auf Uppercase.
// Regex mit /i, dann transform statt reines toUpperCase() damit die
// length-Validation vor der Normalisierung greift.
export const currencyCodeSchema = z
  .string()
  .length(3)
  .regex(/^[A-Z]{3}$/i, 'Currency must be a 3-letter ISO 4217 code')
  .transform((s) => s.toUpperCase());
export const countryCodeSchema = z.string().length(2).toUpperCase();
export const timezoneSchema = z.string().min(1);

export type CurrencyCode = z.infer<typeof currencyCodeSchema>;
