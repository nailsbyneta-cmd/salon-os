/**
 * Primitive Zod schemas used across multiple files.
 * Separate to avoid circular imports between index.ts and domain.ts.
 */
import { z } from 'zod';

export const uuidSchema = z.string().uuid();
export const isoDateTimeSchema = z.string().datetime({ offset: true });
export const currencyCodeSchema = z
  .string()
  .length(3)
  .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter ISO 4217 code');
export const countryCodeSchema = z.string().length(2).toUpperCase();
export const timezoneSchema = z.string().min(1);

export type CurrencyCode = z.infer<typeof currencyCodeSchema>;
