import { describe, expect, it } from 'vitest';
import { formatNumber } from '@/utils/formatNumber';

describe('formatNumber', () => {
  it('rounds to two decimals by default', () => {
    expect(formatNumber(123.456, undefined, 'en-US')).toBe('123.46');
    expect(formatNumber(10.1, undefined, 'en-US')).toBe('10.1');
  });

  it('respects custom fraction digit overrides', () => {
    expect(formatNumber(1234.567, { maximumFractionDigits: 0 }, 'en-US')).toBe('1,235');
    expect(formatNumber(1.2, { minimumFractionDigits: 2, maximumFractionDigits: 2 }, 'en-US')).toBe(
      '1.20',
    );
  });
});
