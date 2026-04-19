/**
 * SALON OS — Shared Zod schemas.
 * Jede externe API-Grenze validiert mit einem dieser Schemas
 * BEVOR die Service-Schicht läuft (siehe CLAUDE.md — Coding-Standards).
 */
import { z } from 'zod';

// ─── Primitives ────────────────────────────────────────────────

export const uuidSchema = z.string().uuid();
export const isoDateTimeSchema = z.string().datetime({ offset: true });
export const currencyCodeSchema = z.string().length(3).toUpperCase();
export const countryCodeSchema = z.string().length(2).toUpperCase();
export const timezoneSchema = z.string().min(1);

/** ISO 4217-normed money. Betrag in "minor units" (Rappen / Cent). */
export const moneySchema = z.object({
  amount: z.number().int(), // in minor units; 100 CHF = 10000
  currency: currencyCodeSchema,
});
export type Money = z.infer<typeof moneySchema>;

// ─── RFC 7807 Problem Details ──────────────────────────────────

export const problemDetailsSchema = z.object({
  type: z.string().url().or(z.string().startsWith('about:blank')),
  title: z.string(),
  status: z.number().int().min(100).max(599),
  detail: z.string().optional(),
  instance: z.string().optional(),
  errors: z.array(z.object({ path: z.string(), code: z.string() })).optional(),
});
export type ProblemDetails = z.infer<typeof problemDetailsSchema>;

// ─── Pagination ────────────────────────────────────────────────

export const paginationInputSchema = z.object({
  after: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

export const pageInfoSchema = z.object({
  endCursor: z.string().nullable(),
  hasNextPage: z.boolean(),
});
