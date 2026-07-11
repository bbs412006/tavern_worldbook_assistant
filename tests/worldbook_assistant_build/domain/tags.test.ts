import { describe, expect, it } from 'vitest';

import {
  collectTagSubtreeIds,
  hasSiblingTagNameConflict,
  isTagDescendantOf,
  normalizeTagNameKey,
} from '../../../src/worldbook_assistant_build/domain/tags';
import type { WorldbookTagDefinition } from '../../../src/worldbook_assistant_build/domain/types';

function tag(id: string, name: string, parentId: string | null = null): WorldbookTagDefinition {
  return { id, name, color: '#ffffff', parent_id: parentId, sort: 0 };
}

describe('tags domain', () => {
  it('normalizes names for case-insensitive comparisons', () => {
    expect(normalizeTagNameKey('  Lore TAG  ')).toBe('lore tag');
  });

  it('detects descendants and terminates safely when the parent chain cycles', () => {
    const definitions = [tag('root', 'Root'), tag('child', 'Child', 'root'), tag('leaf', 'Leaf', 'child')];
    const map = new Map(definitions.map(item => [item.id, item]));

    expect(isTagDescendantOf(map, 'leaf', 'root')).toBe(true);
    expect(isTagDescendantOf(map, 'root', 'leaf')).toBe(false);

    map.set('root', tag('root', 'Root', 'leaf'));
    expect(isTagDescendantOf(map, 'missing', 'root')).toBe(false);
  });

  it('collects a subtree breadth-first without repeating cyclic nodes', () => {
    const root = tag('root', 'Root');
    const first = tag('first', 'First', 'root');
    const second = tag('second', 'Second', 'root');
    const leaf = tag('leaf', 'Leaf', 'first');
    const children = new Map<string, WorldbookTagDefinition[]>([
      ['root', [first, second]],
      ['first', [leaf]],
      ['leaf', [root]],
    ]);

    expect(collectTagSubtreeIds('root', children)).toEqual(['root', 'first', 'second', 'leaf']);
  });

  it('limits name conflicts to siblings and supports excluding the edited tag', () => {
    const definitions = [
      tag('a', 'Lore', null),
      tag('b', 'Other', null),
      tag('c', ' lore ', 'a'),
    ];

    expect(hasSiblingTagNameConflict(definitions, ' LORE ', null)).toBe(true);
    expect(hasSiblingTagNameConflict(definitions, 'Lore', 'a')).toBe(true);
    expect(hasSiblingTagNameConflict(definitions, 'Lore', null, 'a')).toBe(false);
    expect(hasSiblingTagNameConflict(definitions, 'Lore', 'b')).toBe(false);
  });
});
