import { describe, expect, it } from 'vitest';

import {
  asRecord,
  clampNumber,
  normalizeKeywordList,
  parseNullableInteger,
  toNumberSafe,
  toStringSafe,
} from '../../../src/worldbook_assistant_build/domain/persistedState';

describe('persisted-state helpers', () => {
  it('accepts plain records and rejects arrays or null', () => {
    expect(asRecord({ value: 1 })).toEqual({ value: 1 });
    expect(asRecord([])).toBeNull();
    expect(asRecord(null)).toBeNull();
  });

  it('normalizes string and number values with fallbacks', () => {
    expect(toStringSafe(42)).toBe('42');
    expect(toStringSafe(undefined, 'fallback')).toBe('fallback');
    expect(toNumberSafe('12.5', 0)).toBe(12.5);
    expect(toNumberSafe('invalid', 7)).toBe(7);
  });

  it('clamps numbers and converts nullable integers safely', () => {
    expect(clampNumber(120, 0, 100)).toBe(100);
    expect(clampNumber(-1, 0, 100)).toBe(0);
    expect(parseNullableInteger('4.9')).toBe(4);
    expect(parseNullableInteger(-3)).toBe(0);
    expect(parseNullableInteger('')).toBeNull();
    expect(parseNullableInteger('not-a-number')).toBeNull();
  });

  it('parses regex keywords, removes blanks, and deduplicates case-insensitively', () => {
    const result = normalizeKeywordList(['Alpha', 'alpha', '', '/foo/gi', /bar/m]);

    expect(result).toHaveLength(3);
    expect(result[0]).toBe('Alpha');
    expect(result[1]).toEqual(/foo/gi);
    expect(result[2]).toEqual(/bar/m);
  });

  it('preserves invalid regex text as a normal keyword', () => {
    expect(normalizeKeywordList('/[/g')).toEqual(['/[/g']);
  });
});
