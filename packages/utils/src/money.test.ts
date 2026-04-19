import { describe, expect, it } from 'vitest';
import { formatMoney, minor, toMajor } from './money.js';

describe('money', () => {
  it('rounds to integer minor units', () => {
    expect(minor(1234.5)).toBe(1235);
    expect(minor(1234.4)).toBe(1234);
  });

  it('converts minor to major', () => {
    expect(toMajor(10000)).toBe(100);
    expect(toMajor(1)).toBe(0.01);
  });

  it('formats CHF for de-CH', () => {
    // 100.00 CHF = 10000 Rappen
    const s = formatMoney(10000, 'CHF', 'de-CH');
    // exact format varies by ICU build; assert key parts
    expect(s).toContain('CHF');
    expect(s).toContain('100');
  });

  it('formats EUR for de-DE', () => {
    const s = formatMoney(999, 'EUR', 'de-DE');
    expect(s).toContain('€');
    expect(s).toMatch(/9,99|9\.99/);
  });
});
