import { describe, expect, it } from 'vitest';

import {
  buildExistingEntryContentMap,
  dedupeExtractedTags,
  extractAiTags,
  markExtractedTagDuplicates,
  normalizeExtractedTagContent,
} from '../../../src/worldbook_assistant_build/domain/aiTags';
import { normalizeEntry } from '../../../src/worldbook_assistant_build/domain/persistedState';
import type { ExtractedTag } from '../../../src/worldbook_assistant_build/domain/types';

function extracted(tag: string, content: string): ExtractedTag {
  return { tag, content, selected: true };
}

describe('AI tags domain', () => {
  it('extracts tags and recursively unwraps ignored wrapper tags', () => {
    const result = extractAiTags(
      '<thinking><Lore> hidden lore </Lore></thinking><Character> Alice </Character>',
      new Set(['thinking']),
    );

    expect(result).toEqual([
      { tag: 'Lore', content: 'hidden lore', selected: true },
      { tag: 'Character', content: 'Alice', selected: true },
    ]);
  });

  it('normalizes content whitespace', () => {
    expect(normalizeExtractedTagContent('  alpha\n   beta\t gamma ')).toBe('alpha beta gamma');
  });

  it('keeps the last tag with a case-insensitive name and removes duplicate content', () => {
    const result = dedupeExtractedTags([
      extracted('Lore', 'old'),
      extracted('lore', 'new'),
      extracted('Character', ' new '),
      extracted('Place', 'unique'),
    ]);

    expect(result).toEqual([extracted('lore', 'new'), extracted('Place', 'unique')]);
  });

  it('builds a case-insensitive map of normalized existing contents', () => {
    const map = buildExistingEntryContentMap([
      normalizeEntry({ uid: 1, name: 'Lore', content: ' alpha\n beta ' }, 1),
    ]);

    expect(map.get('lore')).toBe('alpha beta');
  });

  it('marks exact duplicates, updated names, and new tags distinctly', () => {
    const entries = [
      normalizeEntry({ uid: 1, name: 'Lore', content: 'same content' }, 1),
      normalizeEntry({ uid: 2, name: 'Character', content: 'old content' }, 2),
    ];
    const result = markExtractedTagDuplicates(
      [
        extracted('lore', ' same   content '),
        extracted('CHARACTER', 'new content'),
        extracted('Place', 'new place'),
      ],
      entries,
    );

    expect(result[0]).toMatchObject({ duplicate: true, updated: false, selected: false });
    expect(result[1]).toMatchObject({ duplicate: false, updated: true, selected: true });
    expect(result[2]).toMatchObject({ duplicate: false, updated: false, selected: true });
  });
});
