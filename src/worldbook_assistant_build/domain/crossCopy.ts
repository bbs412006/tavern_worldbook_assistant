import { diffLines } from 'diff';
import { klona } from 'klona';
import { normalizeEntry, normalizeEntryList, toStringSafe } from './persistedState';
import type {
  CrossCopyAction,
  CrossCopyFieldDiffRow,
  CrossCopyRow,
  CrossCopyRowStatus,
  CrossCopyTextDiffLine,
  CrossCopyTextDiffResult,
  EntryFieldDiffOptions,
  PositionType,
  RoleType,
  SecondaryLogic,
  StrategyType,
} from './types';

export const CROSS_COPY_STATUS_LABELS: Record<CrossCopyRowStatus, string> = {
  new: '新增',
  duplicate_exact: '同名同内容',
  same_name_changed: '同名内容不同',
  content_duplicate_other_name: '异名同内容',
  invalid_same_source_target: '来源与目标相同',
};

export const CROSS_COPY_ACTION_LABELS: Record<CrossCopyAction, string> = {
  skip: '跳过',
  overwrite: '覆盖同名',
  rename_create: '另存新名',
  create: '直接创建',
};

export function normalizeCrossCopyNameKey(name: string): string {
  return String(name ?? '').trim().toLowerCase();
}

export function normalizeCrossCopyContentKey(content: string): string {
  return String(content ?? '').replace(/\s+/g, ' ').trim();
}

export function getCrossCopyStatusLabel(status: CrossCopyRowStatus): string {
  return CROSS_COPY_STATUS_LABELS[status];
}

export function getCrossCopyActionLabel(action: CrossCopyAction): string {
  return CROSS_COPY_ACTION_LABELS[action];
}

export function getCrossCopyStatusBadgeClass(status: CrossCopyRowStatus): string {
  return {
    new: 'new',
    same_name_changed: 'changed',
    duplicate_exact: 'duplicate',
    content_duplicate_other_name: 'content-duplicate',
    invalid_same_source_target: 'invalid',
  }[status];
}

export function getCrossCopyEntryProfile(entry: WorldbookEntry): string {
  const position = entry.position.type === 'at_depth'
    ? `${entry.position.type}/${entry.position.role ?? 'system'}`
    : entry.position.type;
  return `${entry.enabled ? '启用' : '禁用'} · ${entry.strategy.type} · ${position}`;
}

export function getCrossCopyPreviewText(content: unknown, limit = 160): string {
  const normalized = String(content ?? '').replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, Math.max(0, limit)) : '(空内容)';
}

function stringifyKeyword(value: unknown): string {
  return value instanceof RegExp ? value.toString() : String(value ?? '');
}

function getStrategyTypeLabel(type: StrategyType): string {
  if (type === 'constant') {
    return '🔵 常驻 (constant)';
  }
  if (type === 'vectorized') {
    return '📎 向量化 (vectorized)';
  }
  return '🟢 关键词 (selective)';
}

function getSecondaryLogicLabel(logic: SecondaryLogic): string {
  const map: Record<SecondaryLogic, string> = {
    and_any: '任一命中 (and_any)',
    and_all: '全部命中 (and_all)',
    not_all: '不全命中 (not_all)',
    not_any: '全部不命中 (not_any)',
  };
  return map[logic];
}

function getPositionTypeLabel(type: PositionType, role: RoleType = 'system'): string {
  const map: Record<Exclude<PositionType, 'at_depth'>, string> = {
    before_character_definition: '角色定义之前',
    after_character_definition: '角色定义之后',
    before_example_messages: '示例消息前（↑EM）',
    after_example_messages: '示例消息后（↓EM）',
    before_author_note: '作者注释之前',
    after_author_note: '作者注释之后',
  };
  if (type !== 'at_depth') {
    return map[type];
  }
  if (role === 'assistant') {
    return '@D 🤖 [AI]在深度';
  }
  if (role === 'user') {
    return '@D 👤 [用户]在深度';
  }
  return '@D ⚙ [系统]在深度';
}

function formatCrossCopyDiffScalar(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  const rendered = String(value).trim();
  return rendered || '(空)';
}

function formatCrossCopyDiffKeywords(list: unknown[]): string {
  if (!Array.isArray(list) || !list.length) {
    return '(空)';
  }
  return list.map(item => stringifyKeyword(item)).join(' , ');
}

function formatCrossCopyDiffExtra(extra: WorldbookEntry['extra']): string {
  if (!extra || typeof extra !== 'object') {
    return '无';
  }
  const keys = Object.keys(extra);
  if (!keys.length) {
    return '无';
  }
  const preview = keys.slice(0, 6).join(', ');
  return keys.length > 6 ? `${keys.length} 项: ${preview} ...` : `${keys.length} 项: ${preview}`;
}

export function buildEntryFieldDiffRows(
  leftEntry: WorldbookEntry | null,
  rightEntry: WorldbookEntry | null,
  options: EntryFieldDiffOptions = {},
): CrossCopyFieldDiffRow[] {
  if (!leftEntry && !rightEntry) {
    return [];
  }
  const leftFallback = options.left_fallback ?? '（无命中）';
  const rightFallback = options.right_fallback ?? '（无命中）';
  const rows: CrossCopyFieldDiffRow[] = [];
  const pushRow = (key: string, label: string, left: string, right: string): void => {
    rows.push({ key, label, left, right, changed: left !== right });
  };

  pushRow('name', '名称', leftEntry ? (leftEntry.name || '(空)') : leftFallback, rightEntry ? (rightEntry.name || '(空)') : rightFallback);
  pushRow('enabled', '启用', leftEntry ? (leftEntry.enabled ? '启用' : '禁用') : leftFallback, rightEntry ? (rightEntry.enabled ? '启用' : '禁用') : rightFallback);
  pushRow('strategy_type', '触发模式', leftEntry ? getStrategyTypeLabel(leftEntry.strategy.type) : leftFallback, rightEntry ? getStrategyTypeLabel(rightEntry.strategy.type) : rightFallback);
  pushRow('probability', '概率', leftEntry ? `${leftEntry.probability}%` : leftFallback, rightEntry ? `${rightEntry.probability}%` : rightFallback);
  pushRow('keys', '主要关键词', leftEntry ? formatCrossCopyDiffKeywords(leftEntry.strategy.keys) : leftFallback, rightEntry ? formatCrossCopyDiffKeywords(rightEntry.strategy.keys) : rightFallback);
  pushRow('secondary_keys', '次要关键词', leftEntry ? formatCrossCopyDiffKeywords(leftEntry.strategy.keys_secondary.keys) : leftFallback, rightEntry ? formatCrossCopyDiffKeywords(rightEntry.strategy.keys_secondary.keys) : rightFallback);
  pushRow('secondary_logic', '次要逻辑', leftEntry ? getSecondaryLogicLabel(leftEntry.strategy.keys_secondary.logic) : leftFallback, rightEntry ? getSecondaryLogicLabel(rightEntry.strategy.keys_secondary.logic) : rightFallback);
  pushRow('position_type', '插入位置', leftEntry ? getPositionTypeLabel(leftEntry.position.type, leftEntry.position.role) : leftFallback, rightEntry ? getPositionTypeLabel(rightEntry.position.type, rightEntry.position.role) : rightFallback);
  pushRow('position_order', '插入权重', leftEntry ? String(leftEntry.position.order) : leftFallback, rightEntry ? String(rightEntry.position.order) : rightFallback);
  pushRow('at_depth_role', '深度角色', leftEntry ? (leftEntry.position.type === 'at_depth' ? leftEntry.position.role : '-') : leftFallback, rightEntry ? (rightEntry.position.type === 'at_depth' ? rightEntry.position.role : '-') : rightFallback);
  pushRow('at_depth_depth', '深度层级', leftEntry ? (leftEntry.position.type === 'at_depth' ? String(leftEntry.position.depth) : '-') : leftFallback, rightEntry ? (rightEntry.position.type === 'at_depth' ? String(rightEntry.position.depth) : '-') : rightFallback);
  pushRow('recursion_in', '不可递归命中', leftEntry ? (leftEntry.recursion.prevent_incoming ? '是' : '否') : leftFallback, rightEntry ? (rightEntry.recursion.prevent_incoming ? '是' : '否') : rightFallback);
  pushRow('recursion_out', '阻止后续递归', leftEntry ? (leftEntry.recursion.prevent_outgoing ? '是' : '否') : leftFallback, rightEntry ? (rightEntry.recursion.prevent_outgoing ? '是' : '否') : rightFallback);
  pushRow('recursion_delay_until', '递归 delay_until', leftEntry ? formatCrossCopyDiffScalar(leftEntry.recursion.delay_until) : leftFallback, rightEntry ? formatCrossCopyDiffScalar(rightEntry.recursion.delay_until) : rightFallback);
  pushRow('effect_sticky', 'sticky', leftEntry ? formatCrossCopyDiffScalar(leftEntry.effect.sticky) : leftFallback, rightEntry ? formatCrossCopyDiffScalar(rightEntry.effect.sticky) : rightFallback);
  pushRow('effect_cooldown', 'cooldown', leftEntry ? formatCrossCopyDiffScalar(leftEntry.effect.cooldown) : leftFallback, rightEntry ? formatCrossCopyDiffScalar(rightEntry.effect.cooldown) : rightFallback);
  pushRow('effect_delay', 'delay', leftEntry ? formatCrossCopyDiffScalar(leftEntry.effect.delay) : leftFallback, rightEntry ? formatCrossCopyDiffScalar(rightEntry.effect.delay) : rightFallback);
  pushRow('extra', 'extra 字段', leftEntry ? formatCrossCopyDiffExtra(leftEntry.extra) : leftFallback, rightEntry ? formatCrossCopyDiffExtra(rightEntry.extra) : rightFallback);
  return rows;
}

export function buildCrossCopyFieldDiffRows(source: WorldbookEntry | null, target: WorldbookEntry | null): CrossCopyFieldDiffRow[] {
  return buildEntryFieldDiffRows(source, target, { left_fallback: '（无命中）', right_fallback: '（无命中）' });
}

export function buildCrossCopyTextDiff(leftText: string, rightText: string): CrossCopyTextDiffResult {
  const left: CrossCopyTextDiffLine[] = [];
  const right: CrossCopyTextDiffLine[] = [];
  let leftLineNo = 1;
  let rightLineNo = 1;
  let addLines = 0;
  let delLines = 0;
  const parts = diffLines(leftText, rightText);

  for (const part of parts as Array<{ value: string; added?: boolean; removed?: boolean }>) {
    const lines = part.value.split('\n');
    if (lines.length && lines[lines.length - 1] === '') {
      lines.pop();
    }
    if (!lines.length) {
      continue;
    }

    if (part.added) {
      for (const line of lines) {
        left.push({ type: 'empty', line_no: null, text: '' });
        right.push({ type: 'add', line_no: rightLineNo, text: line });
        rightLineNo += 1;
        addLines += 1;
      }
      continue;
    }

    if (part.removed) {
      for (const line of lines) {
        left.push({ type: 'del', line_no: leftLineNo, text: line });
        right.push({ type: 'empty', line_no: null, text: '' });
        leftLineNo += 1;
        delLines += 1;
      }
      continue;
    }

    for (const line of lines) {
      left.push({ type: 'same', line_no: leftLineNo, text: line });
      right.push({ type: 'same', line_no: rightLineNo, text: line });
      leftLineNo += 1;
      rightLineNo += 1;
    }
  }

  if (!left.length && !right.length) {
    left.push({ type: 'same', line_no: 1, text: '(空内容)' });
    right.push({ type: 'same', line_no: 1, text: '(空内容)' });
  }

  const changed = Math.min(addLines, delLines);
  return {
    left,
    right,
    added: Math.max(0, addLines - changed),
    removed: Math.max(0, delLines - changed),
    changed,
  };
}

export function getCrossCopyPrimaryTargetMatch(row: CrossCopyRow): WorldbookEntry | null {
  return row.target_summary.same_name_matches[0]
    ?? row.target_summary.content_duplicate_other_name_matches[0]
    ?? null;
}

export function getCrossCopyRowDiffSummary(row: CrossCopyRow): string {
  const target = getCrossCopyPrimaryTargetMatch(row);
  if (!target) {
    return '目标无直接命中，右侧为空';
  }
  const fieldRows = buildCrossCopyFieldDiffRows(row.source_entry, target);
  const fieldChanged = fieldRows.filter(item => item.changed).length;
  const content = buildCrossCopyTextDiff(String(row.source_entry.content ?? ''), String(target.content ?? ''));
  return `字段 ${fieldChanged}/${fieldRows.length} 不同 · 新增行 ${content.added} / 修改行 ${content.changed} / 删除行 ${content.removed}`;
}

export interface CrossCopyApplyStats {
  created: number;
  renamedCreated: number;
  overwritten: number;
  skipped: number;
  duplicateDetected: number;
}

function getNextCrossCopyUid(entries: WorldbookEntry[]): number {
  if (entries.length === 0) {
    return 1;
  }
  return Math.max(...entries.map(entry => entry.uid)) + 1;
}

export function createCrossCopyApplyStats(rows: CrossCopyRow[]): CrossCopyApplyStats {
  return {
    created: 0,
    renamedCreated: 0,
    overwritten: 0,
    skipped: 0,
    duplicateDetected: rows.filter(row => row.status === 'duplicate_exact' || row.status === 'content_duplicate_other_name').length,
  };
}

export function formatCrossCopyApplySummary(stats: CrossCopyApplyStats): string {
  return [
    '执行完成',
    `新增 ${stats.created}`,
    `另存新增 ${stats.renamedCreated}`,
    `覆盖 ${stats.overwritten}`,
    `跳过 ${stats.skipped}`,
    `检测重复 ${stats.duplicateDetected}`,
  ].join(' | ');
}

export function generateCrossCopyUniqueName(baseName: string, occupiedNameKeys: Set<string>): string {
  const base = String(baseName ?? '').trim() || '未命名条目';
  const first = `${base} (复制)`;
  if (!occupiedNameKeys.has(normalizeCrossCopyNameKey(first))) {
    return first;
  }
  for (let index = 2; index < 2000; index += 1) {
    const candidate = `${base} (复制${index})`;
    if (!occupiedNameKeys.has(normalizeCrossCopyNameKey(candidate))) {
      return candidate;
    }
  }
  return `${base} (复制${Date.now()})`;
}

export function applyCrossCopyRowsToEntries(targetEntries: WorldbookEntry[], rows: CrossCopyRow[], stats: CrossCopyApplyStats): WorldbookEntry[] {
  const next = normalizeEntryList(targetEntries.map(entry => klona(entry)));
  const occupied = new Set(next.map(entry => normalizeCrossCopyNameKey(entry.name)));
  let nextUid = getNextCrossCopyUid(next);

  for (const row of rows) {
    if (row.action === 'skip' || row.status === 'invalid_same_source_target') {
      stats.skipped += 1;
      continue;
    }
    const sourceEntry = normalizeEntry(klona(row.source_entry), row.source_entry.uid);

    if (row.action === 'overwrite') {
      let replaced = 0;
      for (let index = 0; index < next.length; index += 1) {
        if (normalizeCrossCopyNameKey(next[index].name) !== row.source_name_key) {
          continue;
        }
        const uid = next[index].uid;
        const replacement = normalizeEntry({ ...klona(sourceEntry), uid }, uid);
        replacement.uid = uid;
        next[index] = replacement;
        replaced += 1;
      }
      if (replaced === 0) {
        const uid = nextUid;
        nextUid += 1;
        const created = normalizeEntry({ ...klona(sourceEntry), uid }, uid);
        created.uid = uid;
        next.push(created);
        stats.created += 1;
        occupied.add(normalizeCrossCopyNameKey(created.name));
      } else {
        stats.overwritten += replaced;
        occupied.add(row.source_name_key);
      }
      continue;
    }

    let createdName = sourceEntry.name;
    if (row.action === 'rename_create') {
      const typed = toStringSafe(row.rename_name).trim();
      const typedKey = normalizeCrossCopyNameKey(typed);
      if (!typed) {
        createdName = generateCrossCopyUniqueName(sourceEntry.name, occupied);
      } else if (!occupied.has(typedKey)) {
        createdName = typed;
      } else {
        createdName = generateCrossCopyUniqueName(typed, occupied);
      }
      row.rename_name = createdName;
      stats.renamedCreated += 1;
    } else {
      stats.created += 1;
    }
    const uid = nextUid;
    nextUid += 1;
    const created = normalizeEntry({ ...klona(sourceEntry), uid, name: createdName }, uid);
    created.uid = uid;
    next.push(created);
    occupied.add(normalizeCrossCopyNameKey(createdName));
  }

  return next;
}
