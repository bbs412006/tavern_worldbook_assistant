import { describe, expect, it } from 'vitest';

import type { WorldbookSnapshot } from '../../../src/worldbook_assistant_build/domain/types';
import {
  normalizePersistedEntryHistory,
  normalizePersistedWorldbookHistory,
} from '../../../src/worldbook_assistant_build/domain/persistedHistory';
import {
  asRecord,
  estimatePersistedValueBytes,
  enforceHistoryByteBudget,
  clampNumber,
  createDefaultPersistedState,
  normalizeEntry,
  normalizeEntryList,
  normalizeKeywordList,
  normalizePersistedState,
  parseNullableInteger,
  toNumberSafe,
  toStringSafe,
} from '../../../src/worldbook_assistant_build/domain/persistedState';

const persistedHistorySharedDependencies = {
  asRecord,
  createId: (prefix: string) => `${prefix}-fallback`,
  toNumberSafe,
  toStringSafe,
};

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

  it('normalizes worldbook history in its dedicated schema module while preserving legacy entries', () => {
    const unknownTopLevel = { future_schema_flag: { enabled: true } };
    const normalized = normalizePersistedWorldbookHistory({
      Alpha: [
        {
          id: 'snapshot-1',
          label: 'legacy',
          ts: '42',
          entries: [{ uid: 7, comment: '旧条目', disable: true, key: ['Alpha'] }],
        },
        null,
      ],
      Invalid: 'not-an-array',
    }, {
      ...persistedHistorySharedDependencies,
      historyLimit: 30,
      normalizeEntryList,
    });

    expect(Object.keys(normalized)).toEqual(['Alpha']);
    expect(normalized.Alpha).toHaveLength(1);
    expect(normalized.Alpha?.[0]).toMatchObject({ id: 'snapshot-1', label: 'legacy', ts: 42 });
    expect(normalized.Alpha?.[0]?.entries[0]).toMatchObject({ uid: 7, name: '旧条目', enabled: false });

    const roundTripped = normalizePersistedState({
      ...unknownTopLevel,
      history: normalized,
    });
    expect(roundTripped.future_schema_flag).toEqual(unknownTopLevel.future_schema_flag);
  });

  it('normalizes entry history in its dedicated schema module and drops malformed buckets', () => {
    const normalized = normalizePersistedEntryHistory({
      Alpha: {
        '9': [
          {
            id: 'entry-snapshot-1',
            label: 'legacy entry',
            ts: '84',
            name: '旧条目',
            entry: { uid: 9, comment: '旧条目', content: '正文' },
          },
        ],
        invalid: 'not-an-array',
      },
      Invalid: null,
    }, {
      ...persistedHistorySharedDependencies,
      entryHistoryLimit: 20,
      normalizeEntry,
    });

    expect(Object.keys(normalized)).toEqual(['Alpha']);
    expect(Object.keys(normalized.Alpha ?? {})).toEqual(['9']);
    expect(normalized.Alpha?.['9']?.[0]).toMatchObject({
      id: 'entry-snapshot-1',
      label: 'legacy entry',
      ts: 84,
      uid: 9,
      name: '旧条目',
      entry: { uid: 9, name: '旧条目', content: '正文' },
    });
  });
});
