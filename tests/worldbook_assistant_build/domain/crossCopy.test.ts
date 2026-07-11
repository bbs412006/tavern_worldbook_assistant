import { describe, expect, it } from 'vitest';

import {
  applyCrossCopyRowsToEntries,
  buildCrossCopyFieldDiffRows,
  buildCrossCopyTextDiff,
  createCrossCopyApplyStats,
  formatCrossCopyApplySummary,
  generateCrossCopyUniqueName,
  normalizeCrossCopyContentKey,
  normalizeCrossCopyNameKey,
} from '../../../src/worldbook_assistant_build/domain/crossCopy';
import { normalizeEntry } from '../../../src/worldbook_assistant_build/domain/persistedState';
import type { CrossCopyAction, CrossCopyRow, CrossCopyRowStatus } from '../../../src/worldbook_assistant_build/domain/types';

function entry(uid: number, name: string, content: string, extra: Record<string, unknown> = {}): WorldbookEntry {
  return normalizeEntry({ uid, name, content, ...extra }, uid);
}

function row(
  source: WorldbookEntry,
  action: CrossCopyAction,
  status: CrossCopyRowStatus = 'new',
  renameName = '',
): CrossCopyRow {
  return {
    id: `row-${source.uid}`,
    source_entry: source,
    source_index: 0,
    source_name_key: normalizeCrossCopyNameKey(source.name),
    source_content_key: normalizeCrossCopyContentKey(source.content),
    status,
    selected: true,
    action,
    rename_name: renameName,
    note: '',
    details_open: false,
    target_summary: {
      same_name_matches: [],
      same_name_exact_count: 0,
      content_duplicate_other_name_matches: [],
    },
  };
}

describe('cross-copy domain', () => {
  it('normalizes names and collapses content whitespace', () => {
    expect(normalizeCrossCopyNameKey('  Lore ENTRY ')).toBe('lore entry');
    expect(normalizeCrossCopyContentKey(' alpha\n\t beta  gamma ')).toBe('alpha beta gamma');
  });

  it('counts changed, added, and removed text lines and handles empty content', () => {
    const diff = buildCrossCopyTextDiff('same\nold\nremoved', 'same\nnew\nadded\nextra');

    expect(diff.changed).toBe(2);
    expect(diff.added).toBe(1);
    expect(diff.removed).toBe(0);
    expect(buildCrossCopyTextDiff('', '').left[0]).toMatchObject({ type: 'same', text: '(空内容)' });
  });

  it('marks only changed entry fields', () => {
    const left = entry(1, 'Lore', 'left', { probability: 100 });
    const right = entry(2, 'Lore', 'right', { probability: 50 });
    const rows = buildCrossCopyFieldDiffRows(left, right);

    expect(rows.find(item => item.key === 'name')?.changed).toBe(false);
    expect(rows.find(item => item.key === 'probability')?.changed).toBe(true);
  });

  it('generates the first available deterministic copy name', () => {
    const occupied = new Set(['lore (复制)', 'lore (复制2)']);
    expect(generateCrossCopyUniqueName('Lore', occupied)).toBe('Lore (复制3)');
    expect(generateCrossCopyUniqueName('', new Set())).toBe('未命名条目 (复制)');
  });

  it('applies create, rename, overwrite, and skip rows while preserving overwritten UIDs', () => {
    const target = [entry(10, 'Existing', 'old'), entry(11, 'Taken', 'keep')];
    const rows = [
      row(entry(1, 'Fresh', 'fresh'), 'create'),
      row(entry(2, 'RenameMe', 'renamed'), 'rename_create', 'new', 'Taken'),
      row(entry(3, 'Existing', 'replacement'), 'overwrite', 'same_name_changed'),
      row(entry(4, 'Skipped', 'ignored'), 'skip', 'duplicate_exact'),
    ];
    const stats = createCrossCopyApplyStats(rows);
    const result = applyCrossCopyRowsToEntries(target, rows, stats);

    expect(result.find(item => item.name === 'Existing')).toMatchObject({ uid: 10, content: 'replacement' });
    expect(result.some(item => item.name === 'Fresh')).toBe(true);
    expect(result.some(item => item.name === 'Taken (复制)')).toBe(true);
    expect(result.some(item => item.name === 'Skipped')).toBe(false);
    expect(stats).toEqual({ created: 1, renamedCreated: 1, overwritten: 1, skipped: 1, duplicateDetected: 1 });
    expect(formatCrossCopyApplySummary(stats)).toContain('新增 1 | 另存新增 1 | 覆盖 1 | 跳过 1 | 检测重复 1');
  });
});
