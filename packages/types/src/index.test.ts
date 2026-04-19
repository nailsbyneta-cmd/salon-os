import { describe, expect, it } from 'vitest';
import {
  currencyCodeSchema,
  moneySchema,
  problemDetailsSchema,
  paginationInputSchema,
} from './index.js';

describe('currencyCodeSchema', () => {
  it('accepts 3-letter ISO codes and normalises to upper', () => {
    expect(currencyCodeSchema.parse('chf')).toBe('CHF');
    expect(currencyCodeSchema.parse('EUR')).toBe('EUR');
  });

  it('rejects non-3-letter', () => {
    expect(() => currencyCodeSchema.parse('CHFX')).toThrow();
    expect(() => currencyCodeSchema.parse('CH')).toThrow();
  });
});

describe('moneySchema', () => {
  it('accepts integer amount + upper currency', () => {
    const m = moneySchema.parse({ amount: 10000, currency: 'chf' });
    expect(m.amount).toBe(10000);
    expect(m.currency).toBe('CHF');
  });

  it('rejects float amount', () => {
    expect(() => moneySchema.parse({ amount: 100.5, currency: 'CHF' })).toThrow();
  });
});

describe('problemDetailsSchema', () => {
  it('accepts RFC 7807 shape', () => {
    const p = problemDetailsSchema.parse({
      type: 'about:blank',
      title: 'Not found',
      status: 404,
    });
    expect(p.status).toBe(404);
  });
});

describe('paginationInputSchema', () => {
  it('defaults limit to 50', () => {
    expect(paginationInputSchema.parse({}).limit).toBe(50);
  });

  it('caps limit at 200', () => {
    expect(() => paginationInputSchema.parse({ limit: 500 })).toThrow();
  });
});
