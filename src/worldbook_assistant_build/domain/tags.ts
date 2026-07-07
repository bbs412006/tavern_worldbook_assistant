import type { WorldbookTagDefinition } from './types';

export function normalizeTagNameKey(name: string): string {
  return String(name ?? '').trim().toLowerCase();
}

export function isTagDescendantOf(
  tagDefinitionMap: Map<string, WorldbookTagDefinition>,
  targetId: string,
  potentialAncestorId: string,
): boolean {
  if (!targetId || !potentialAncestorId) {
    return false;
  }
  let cursor = tagDefinitionMap.get(targetId)?.parent_id ?? null;
  const seen = new Set<string>();
  while (cursor && !seen.has(cursor)) {
    if (cursor === potentialAncestorId) {
      return true;
    }
    seen.add(cursor);
    cursor = tagDefinitionMap.get(cursor)?.parent_id ?? null;
  }
  return false;
}

export function collectTagSubtreeIds(
  rootId: string,
  tagChildrenMap: Map<string, WorldbookTagDefinition[]>,
): string[] {
  const ids: string[] = [];
  const queue: string[] = [rootId];
  const seen = new Set<string>();
  while (queue.length) {
    const current = queue.shift()!;
    if (seen.has(current)) {
      continue;
    }
    seen.add(current);
    ids.push(current);
    const children = tagChildrenMap.get(current) ?? [];
    for (const child of children) {
      queue.push(child.id);
    }
  }
  return ids;
}

export function hasSiblingTagNameConflict(
  definitions: WorldbookTagDefinition[],
  name: string,
  parentId: string | null,
  excludeId = '',
): boolean {
  const key = normalizeTagNameKey(name);
  return definitions.some(def => {
    if (excludeId && def.id === excludeId) {
      return false;
    }
    return (def.parent_id ?? null) === parentId && normalizeTagNameKey(def.name) === key;
  });
}
