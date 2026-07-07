import { asRecord, normalizeEntryList, toStringSafe } from './persistedState';
import type { ImportedPayload } from './types';

export const POSITION_TYPE_SORT_ORDER: Record<string, number> = {
  before_character_definition: 0,
  after_character_definition: 1,
  before_example_messages: 2,
  after_example_messages: 3,
  before_author_note: 4,
  after_author_note: 5,
  at_depth: 6,
};

export function compareEntriesByPositionThenOrder(a: WorldbookEntry, b: WorldbookEntry): number {
  const posA = POSITION_TYPE_SORT_ORDER[a.position.type] ?? 99;
  const posB = POSITION_TYPE_SORT_ORDER[b.position.type] ?? 99;
  if (posA !== posB) return posA - posB;
  if (a.position.type === 'at_depth' && b.position.type === 'at_depth') {
    if (a.position.depth !== b.position.depth) return a.position.depth - b.position.depth;
  }
  return a.position.order - b.position.order;
}

export function collectRawEntries(root: Record<string, unknown>): unknown[] {
  if (Array.isArray(root.entries)) {
    return root.entries;
  }
  const entriesMap = asRecord(root.entries);
  if (entriesMap) {
    return Object.values(entriesMap);
  }
  const dataRoot = asRecord(root.data);
  if (dataRoot) {
    if (Array.isArray(dataRoot.entries)) {
      return dataRoot.entries;
    }
    const dataEntriesMap = asRecord(dataRoot.entries);
    if (dataEntriesMap) {
      return Object.values(dataEntriesMap);
    }
  }
  return [];
}

export function parseImportedPayload(fileName: string, text: string): ImportedPayload {
  const parsed = JSON.parse(text) as unknown;
  const fallbackName = fileName.replace(/\.[^/.]+$/, '') || '导入世界书';

  if (Array.isArray(parsed)) {
    return {
      name: fallbackName,
      entries: normalizeEntryList(parsed),
    };
  }

  const root = asRecord(parsed);
  if (!root) {
    throw new Error('导入内容必须是 JSON 对象或数组');
  }

  const entries = collectRawEntries(root);
  if (!entries.length) {
    throw new Error('未识别到有效的 entries');
  }

  const dataRoot = asRecord(root.data);
  const nameCandidate = toStringSafe(root.name ?? dataRoot?.name, fallbackName).trim();

  return {
    name: nameCandidate || fallbackName,
    entries: normalizeEntryList(entries),
  };
}
