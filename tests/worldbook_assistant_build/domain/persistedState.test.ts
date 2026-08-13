import { describe, expect, it } from 'vitest';

import type { WorldbookSnapshot } from '../../../src/worldbook_assistant_build/domain/types';
import {
  asRecord,
  estimatePersistedValueBytes,
  enforceHistoryByteBudget,
  clampNumber,
  createDefaultPersistedState,
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

  it('evicts the oldest worldbook and entry snapshots until the byte budget is met', () => {
    const state = createDefaultPersistedState();
    const entry = {
      uid: 1,
      name: 'large',
      content: 'x'.repeat(600),
    } as WorldbookSnapshot['entries'][number];
    state.history.A = [
      { id: 'new', label: 'new', ts: 20, entries: [entry] },
      { id: 'old', label: 'old', ts: 10, entries: [entry] },
    ];
    state.entry_history.A = {
      '1': [
        { id: 'entry-new', label: 'new', ts: 30, uid: 1, name: 'large', entry },
        { id: 'entry-old', label: 'old', ts: 5, uid: 1, name: 'large', entry },
      ],
    };
    const initialBytes = estimatePersistedValueBytes({ history: state.history, entry_history: state.entry_history });

    const result = enforceHistoryByteBudget(state, initialBytes - 500);

    expect(result.evicted).toBeGreaterThan(0);
    expect(result.bytes).toBeLessThanOrEqual(initialBytes - 500);
    expect(state.entry_history.A?.['1']?.some(snapshot => snapshot.id === 'entry-old')).toBe(false);
    expect(state.history.A?.some(snapshot => snapshot.id === 'new')).toBe(true);
  });
});
