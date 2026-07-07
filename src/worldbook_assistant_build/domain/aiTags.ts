import type { ExtractedTag } from './types';

export function extractAiTags(text: string, ignoreTags?: Set<string>): ExtractedTag[] {
  const regex = /<([^/<>\s]+)>([\s\S]*?)<\/\1>/g;
  const results: ExtractedTag[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const tagName = match[1];
    const innerContent = match[2];
    if (ignoreTags && ignoreTags.has(tagName.toLowerCase())) {
      results.push(...extractAiTags(innerContent, ignoreTags));
    } else {
      results.push({
        tag: tagName,
        content: innerContent.trim(),
        selected: true,
      });
    }
  }
  return results;
}

export function normalizeExtractedTagContent(content: string): string {
  return String(content ?? '').replace(/\s+/g, ' ').trim();
}

export function dedupeExtractedTags(tags: ExtractedTag[]): ExtractedTag[] {
  const tagNameMap = new Map<string, ExtractedTag>();
  for (const tag of tags) {
    tagNameMap.set(tag.tag.toLowerCase(), tag);
  }

  const seenContent = new Set<string>();
  return [...tagNameMap.values()].filter(tag => {
    const contentKey = normalizeExtractedTagContent(tag.content);
    if (seenContent.has(contentKey)) {
      return false;
    }
    seenContent.add(contentKey);
    return true;
  });
}

export function buildExistingEntryContentMap(entries: WorldbookEntry[]): Map<string, string> {
  const existingMap = new Map<string, string>();
  for (const entry of entries) {
    existingMap.set(entry.name.toLowerCase(), normalizeExtractedTagContent(entry.content));
  }
  return existingMap;
}

export function markExtractedTagDuplicates(tags: ExtractedTag[], existingEntries: WorldbookEntry[]): ExtractedTag[] {
  const existingMap = buildExistingEntryContentMap(existingEntries);
  return tags.map(tag => {
    const existingNorm = existingMap.get(tag.tag.toLowerCase());
    const tagNorm = normalizeExtractedTagContent(tag.content);
    if (existingNorm === undefined) {
      return { ...tag, duplicate: false, updated: false };
    }
    if (existingNorm === tagNorm) {
      return { ...tag, duplicate: true, updated: false, selected: false };
    }
    return { ...tag, duplicate: false, updated: true };
  });
}
