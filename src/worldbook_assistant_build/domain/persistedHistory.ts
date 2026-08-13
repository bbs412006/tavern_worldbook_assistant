import type { EntrySnapshot, WorldbookSnapshot } from './types';

interface PersistedHistorySharedDependencies {
  asRecord(value: unknown): Record<string, unknown> | null;
  createId(prefix: string): string;
  toNumberSafe(value: unknown, fallback: number): number;
  toStringSafe(value: unknown, fallback?: string): string;
}

export interface PersistedWorldbookHistoryNormalizationDependencies extends PersistedHistorySharedDependencies {
  historyLimit: number;
  normalizeEntryList(value: unknown[]): WorldbookSnapshot['entries'];
}

export interface PersistedEntryHistoryNormalizationDependencies extends PersistedHistorySharedDependencies {
  entryHistoryLimit: number;
  normalizeEntry(value: unknown, fallbackUid: number): WorldbookSnapshot['entries'][number];
}

export function normalizePersistedWorldbookHistory(
  input: unknown,
  dependencies: PersistedWorldbookHistoryNormalizationDependencies,
): Record<string, WorldbookSnapshot[]> {
  const {
    asRecord,
    createId,
    historyLimit,
    normalizeEntryList,
    toNumberSafe,
    toStringSafe,
  } = dependencies;
  const historyRoot = asRecord(input) ?? {};
  const history: Record<string, WorldbookSnapshot[]> = {};

  for (const [name, rawSnapshots] of Object.entries(historyRoot)) {
    if (!Array.isArray(rawSnapshots)) {
      continue;
    }
    history[name] = rawSnapshots
      .map(item => {
        const record = asRecord(item);
        if (!record) {
          return null;
        }
        const entriesRaw = Array.isArray(record.entries) ? record.entries : [];
        return {
          id: toStringSafe(record.id, createId('snapshot')),
          label: toStringSafe(record.label, '快照'),
          ts: toNumberSafe(record.ts, Date.now()),
          entries: normalizeEntryList(entriesRaw),
        } satisfies WorldbookSnapshot;
      })
      .filter((item): item is WorldbookSnapshot => item !== null)
      .slice(0, historyLimit);
  }

  return history;
}

export function normalizePersistedEntryHistory(
  input: unknown,
  dependencies: PersistedEntryHistoryNormalizationDependencies,
): Record<string, Record<string, EntrySnapshot[]>> {
  const {
    asRecord,
    createId,
    entryHistoryLimit,
    normalizeEntry,
    toNumberSafe,
    toStringSafe,
  } = dependencies;
  const entryHistoryRoot = asRecord(input) ?? {};
  const entryHistory: Record<string, Record<string, EntrySnapshot[]>> = {};

  for (const [worldbookName, rawByUid] of Object.entries(entryHistoryRoot)) {
    const uidRecord = asRecord(rawByUid);
    if (!uidRecord) {
      continue;
    }
    const normalizedByUid: Record<string, EntrySnapshot[]> = {};
    for (const [uidKey, rawItems] of Object.entries(uidRecord)) {
      if (!Array.isArray(rawItems)) {
        continue;
      }
      const uidNumber = Math.max(0, Math.floor(toNumberSafe(uidKey, 0)));
      normalizedByUid[uidKey] = rawItems
        .map(item => {
          const record = asRecord(item);
          if (!record) {
            return null;
          }
          return {
            id: toStringSafe(record.id, createId('entry-snapshot')),
            label: toStringSafe(record.label, '条目快照'),
            ts: toNumberSafe(record.ts, Date.now()),
            uid: uidNumber,
            name: toStringSafe(record.name, `条目 ${uidNumber}`),
            entry: normalizeEntry(record.entry, uidNumber),
          } satisfies EntrySnapshot;
        })
        .filter((item): item is EntrySnapshot => item !== null)
        .slice(0, entryHistoryLimit);
    }
    if (Object.keys(normalizedByUid).length > 0) {
      entryHistory[worldbookName] = normalizedByUid;
    }
  }

  return entryHistory;
}
