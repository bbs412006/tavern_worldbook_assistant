import { describe, expect, it } from 'vitest';

import {
  collectRawEntries,
  compareEntriesByPositionThenOrder,
  parseImportedPayload,
} from '../../../src/worldbook_assistant_build/domain/worldbook';
import { normalizeEntry } from '../../../src/worldbook_assistant_build/domain/persistedState';

describe('worldbook domain', () => {
  it('collects entries from arrays and nested entry maps', () => {
    expect(collectRawEntries({ entries: [{ uid: 1 }] })).toEqual([{ uid: 1 }]);
    expect(
      collectRawEntries({
        data: {
          entries: {
            first: { uid: 2 },
            second: { uid: 3 },
          },
        },
      }),
    ).toEqual([{ uid: 2 }, { uid: 3 }]);
  });

  it('imports an entry array and derives the name from the file', () => {
    const imported = parseImportedPayload('sample.book.json', JSON.stringify([{ uid: 7, comment: 'Alpha' }]));

    expect(imported.name).toBe('sample.book');
    expect(imported.entries).toHaveLength(1);
    expect(imported.entries[0].name).toBe('Alpha');
  });

  it('prefers an embedded worldbook name and preserves unknown entry fields', () => {
    const imported = parseImportedPayload(
      'fallback.json',
      JSON.stringify({
        data: {
          name: 'Embedded Book',
          entries: [{ uid: 1, comment: 'Entry', custom_flag: 'keep-me' }],
        },
      }),
    );

    expect(imported.name).toBe('Embedded Book');
    expect(imported.entries[0].extra).toEqual({ custom_flag: 'keep-me' });
  });

  it('rejects primitive roots and objects without entries', () => {
    expect(() => parseImportedPayload('bad.json', '42')).toThrow('导入内容必须是 JSON 对象或数组');
    expect(() => parseImportedPayload('empty.json', JSON.stringify({ name: 'Empty' }))).toThrow(
      '未识别到有效的 entries',
    );
  });

  it('sorts by position type, then depth for at-depth entries, then order', () => {
    const afterDefinition = normalizeEntry(
      { uid: 1, position: { type: 'after_character_definition', order: 1 } },
      1,
    );
    const depthFive = normalizeEntry(
      { uid: 2, position: { type: 'at_depth', depth: 5, order: 1 } },
      2,
    );
    const depthTwoLate = normalizeEntry(
      { uid: 3, position: { type: 'at_depth', depth: 2, order: 50 } },
      3,
    );
    const depthTwoEarly = normalizeEntry(
      { uid: 4, position: { type: 'at_depth', depth: 2, order: 10 } },
      4,
    );

    const sorted = [depthFive, depthTwoLate, afterDefinition, depthTwoEarly].sort(compareEntriesByPositionThenOrder);

    expect(sorted.map(entry => entry.uid)).toEqual([1, 4, 3, 2]);
  });
});
