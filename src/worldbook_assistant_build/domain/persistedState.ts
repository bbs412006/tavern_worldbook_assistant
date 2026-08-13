import { klona } from 'klona';
import {
  type ThemeKey,
  TAG_COLORS,
  HISTORY_LIMIT,
  ENTRY_HISTORY_LIMIT,
  HISTORY_BYTE_BUDGET,
  MAIN_PANE_DEFAULT,
  MAIN_PANE_MIN,
  FOCUS_MAIN_PANE_DEFAULT,
  FOCUS_MAIN_PANE_MIN,
  EDITOR_SIDE_DEFAULT,
  EDITOR_SIDE_MIN,
  FOCUS_EDITOR_SIDE_DEFAULT,
  FOCUS_EDITOR_SIDE_MIN,
  GLOBAL_PRESET_LIMIT,
  TAG_LIMIT,
  CROSS_COPY_DESKTOP_LEFT_DEFAULT,
  CROSS_COPY_DESKTOP_LEFT_MIN,
  CROSS_COPY_DESKTOP_LEFT_MAX,
  strategyTypeOptions,
  secondaryLogicOptions,
  positionTypeOptions,
} from './uiConstants';
import {
  normalizePersistedEntryHistory,
  normalizePersistedWorldbookHistory,
} from './persistedHistory';
import type {
  AIApiConfig,
  AIGeneratorState,
  AIChatMessage,
  AIChatSession,
  CrossCopyPersistState,

  GlobalWorldbookPreset,
  LayoutState,
  MultiEditPersistState,
  PersistedState,
  PositionType,
  PresetRoleBinding,
  RoleType,
  SecondaryLogic,
  StrategyType,
  TagEditorPersistState,
  TagFilterState,
  WorldbookTagDefinition,
} from './types';

const AI_CHAT_SESSION_LIMIT = 50;
const AI_CHAT_MESSAGE_LIMIT = 200;

export function estimatePersistedValueBytes(value: unknown): number {
  const serialized = JSON.stringify(value);
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(serialized).byteLength;
  }
  return serialized.length * 2;
}

type HistoryEvictionCandidate = {
  ts: number;
  remove: () => void;
};

export function enforceHistoryByteBudget(
  state: Pick<PersistedState, 'history' | 'entry_history'>,
  budget = HISTORY_BYTE_BUDGET,
): { bytes: number; evicted: number } {
  const measure = () => estimatePersistedValueBytes({ history: state.history, entry_history: state.entry_history });
  let bytes = measure();
  let evicted = 0;

  while (bytes > budget) {
    const candidates: HistoryEvictionCandidate[] = [];
    for (const [worldbookName, snapshots] of Object.entries(state.history)) {
      snapshots.forEach(snapshot => {
        candidates.push({
          ts: snapshot.ts,
          remove: () => {
            const current = state.history[worldbookName];
            if (!current) return;
            const index = current.findIndex(item => item.id === snapshot.id);
            if (index >= 0) current.splice(index, 1);
            if (!current.length) delete state.history[worldbookName];
          },
        });
      });
    }
    for (const [worldbookName, byUid] of Object.entries(state.entry_history)) {
      for (const [uidKey, snapshots] of Object.entries(byUid)) {
        snapshots.forEach(snapshot => {
          candidates.push({
            ts: snapshot.ts,
            remove: () => {
              const currentByUid = state.entry_history[worldbookName];
              const current = currentByUid?.[uidKey];
              if (!current) return;
              const index = current.findIndex(item => item.id === snapshot.id);
              if (index >= 0) current.splice(index, 1);
              if (!current.length) delete currentByUid[uidKey];
              if (!Object.keys(currentByUid).length) delete state.entry_history[worldbookName];
            },
          });
        });
      }
    }
    const oldest = candidates.sort((left, right) => left.ts - right.ts)[0];
    if (!oldest) break;
    oldest.remove();
    evicted += 1;
    bytes = measure();
  }

  return { bytes, evicted };
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function toStringSafe(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value);
}

export function toNumberSafe(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function parseNullableInteger(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string' && !value.trim()) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.max(0, Math.floor(parsed));
}

function stringifyKeyword(value: string | RegExp): string {
  return value instanceof RegExp ? value.toString() : value;
}

function parseKeywordToken(token: string): string | RegExp {
  const trimmed = token.trim();
  if (!trimmed) {
    return '';
  }
  const regexMatch = trimmed.match(/^\/(.+)\/([dgimsuy]*)$/);
  if (!regexMatch) {
    return trimmed;
  }
  try {
    return new RegExp(regexMatch[1], regexMatch[2]);
  } catch {
    return trimmed;
  }
}

export function normalizeKeywordList(value: unknown): (string | RegExp)[] {
  const sourceList = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[\n,]/g) : [];
  const normalized: (string | RegExp)[] = [];
  const seen = new Set<string>();

  for (const item of sourceList) {
    const token = item instanceof RegExp ? item : parseKeywordToken(toStringSafe(item).trim());
    const tokenString = stringifyKeyword(token);
    if (!tokenString) {
      continue;
    }
    const dedupeKey = tokenString.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    normalized.push(token);
  }

  return normalized;
}

function normalizePresetRoleBindings(rawList: unknown): PresetRoleBinding[] {
  if (!Array.isArray(rawList)) {
    return [];
  }
  const normalized: PresetRoleBinding[] = [];
  const seen = new Set<string>();
  for (const item of rawList) {
    const record = asRecord(item);
    if (!record) {
      continue;
    }
    const key = toStringSafe(record.key).trim();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push({
      key,
      name: toStringSafe(record.name, key),
      avatar: toStringSafe(record.avatar),
      updated_at: toNumberSafe(record.updated_at, Date.now()),
    });
  }
  return normalized;
}

function parseAtDepthRoleFromPositionValue(value: unknown): RoleType | null {
  if (typeof value !== 'string') {
    return null;
  }
  const depthMatch = value.match(/^at_depth_as_(system|assistant|user)$/);
  if (!depthMatch) {
    return null;
  }
  return depthMatch[1] as RoleType;
}

function normalizeSecondaryLogic(value: unknown): SecondaryLogic {
  if (typeof value === 'string' && secondaryLogicOptions.includes(value as SecondaryLogic)) {
    return value as SecondaryLogic;
  }
  if (typeof value === 'number') {
    const map: SecondaryLogic[] = ['and_any', 'and_all', 'not_all', 'not_any'];
    return map[value] ?? 'and_any';
  }
  return 'and_any';
}

function normalizeStrategyType(
  raw: Record<string, unknown>,
  strategyRecord: Record<string, unknown> | null,
): StrategyType {
  const directType = strategyRecord?.type;
  if (typeof directType === 'string' && strategyTypeOptions.includes(directType as StrategyType)) {
    return directType as StrategyType;
  }
  if (raw.constant) {
    return 'constant';
  }
  if (raw.vectorized) {
    return 'vectorized';
  }
  return 'selective';
}

function normalizePositionType(value: unknown): PositionType {
  if (typeof value === 'string') {
    if (positionTypeOptions.includes(value as PositionType)) {
      return value as PositionType;
    }
    if (parseAtDepthRoleFromPositionValue(value)) {
      return 'at_depth';
    }
  }
  if (typeof value === 'number') {
    const map: Record<number, PositionType> = {
      0: 'before_character_definition',
      1: 'after_character_definition',
      2: 'before_example_messages',
      3: 'after_example_messages',
      4: 'before_author_note',
      5: 'after_author_note',
      6: 'at_depth',
    };
    return map[value] ?? 'before_character_definition';
  }
  return 'before_character_definition';
}

function normalizeRole(value: unknown): RoleType {
  if (value === 'assistant' || value === 'user' || value === 'system') {
    return value;
  }
  if (typeof value === 'number') {
    const map: Record<number, RoleType> = {
      0: 'system',
      1: 'assistant',
      2: 'user',
    };
    return map[value] ?? 'system';
  }
  if (typeof value === 'string') {
    if (value.includes('assistant')) {
      return 'assistant';
    }
    if (value.includes('user')) {
      return 'user';
    }
  }
  return 'system';
}

function normalizeScanDepth(value: unknown): 'same_as_global' | number {
  if (value === 'same_as_global') {
    return 'same_as_global';
  }
  const numeric = Math.floor(toNumberSafe(value, NaN));
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }
  return 'same_as_global';
}

function createDefaultEntry(uid: number): WorldbookEntry {
  return {
    uid,
    name: `条目 ${uid}`,
    enabled: true,
    strategy: {
      type: 'selective',
      keys: [],
      keys_secondary: {
        logic: 'and_any',
        keys: [],
      },
      scan_depth: 'same_as_global',
    },
    position: {
      type: 'before_character_definition',
      role: 'system',
      depth: 4,
      order: 100,
    },
    content: '',
    probability: 100,
    recursion: {
      prevent_incoming: false,
      prevent_outgoing: false,
      delay_until: null,
    },
    effect: {
      sticky: null,
      cooldown: null,
      delay: null,
    },
  };
}

function collectExtraFields(raw: Record<string, unknown>): Record<string, unknown> | undefined {
  const known = new Set([
    'uid',
    'id',
    'name',
    'comment',
    'enabled',
    'disable',
    'strategy',
    'position',
    'content',
    'probability',
    'recursion',
    'effect',
    'extra',
    'keys',
    'key',
    'secondary_keys',
    'keysecondary',
    'filters',
    'logic',
    'selectiveLogic',
    'scan_depth',
    'constant',
    'vectorized',
    'selective',
    'insertion_order',
    'order',
    'role',
    'depth',
    'preventRecursion',
    'excludeRecursion',
    'delayUntilRecursion',
    'sticky',
    'cooldown',
    'delay',
    'useProbability',
  ]);

  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!known.has(key)) {
      extra[key] = value;
    }
  }
  if (Object.keys(extra).length === 0) {
    return undefined;
  }
  return extra;
}

export function normalizeEntry(rawInput: unknown, fallbackUid: number): WorldbookEntry {
  const raw = asRecord(rawInput) ?? {};
  const base = createDefaultEntry(fallbackUid);
  const strategyRecord = asRecord(raw.strategy);
  const positionRecord = asRecord(raw.position);
  const recursionRecord = asRecord(raw.recursion);
  const effectRecord = asRecord(raw.effect);
  const secondaryRecord = asRecord(strategyRecord?.keys_secondary);

  const uid = Math.max(0, Math.floor(toNumberSafe(raw.uid ?? raw.id, fallbackUid)));
  const name = toStringSafe(raw.name ?? raw.comment, `条目 ${uid}`).trim() || `条目 ${uid}`;
  const strategyType = normalizeStrategyType(raw, strategyRecord);
  const keys = normalizeKeywordList(strategyRecord?.keys ?? raw.keys ?? raw.key);
  const secondaryKeys = normalizeKeywordList(
    secondaryRecord?.keys ?? raw.secondary_keys ?? raw.keysecondary ?? raw.filters,
  );
  const secondaryLogic = normalizeSecondaryLogic(secondaryRecord?.logic ?? raw.logic ?? raw.selectiveLogic);
  const rawPositionType = positionRecord?.type ?? raw.position;
  const inferredDepthRole = parseAtDepthRoleFromPositionValue(rawPositionType);
  const positionType = normalizePositionType(rawPositionType);
  const role = normalizeRole(positionRecord?.role ?? raw.role ?? inferredDepthRole);
  const depth = Math.max(0, Math.floor(toNumberSafe(positionRecord?.depth ?? raw.depth, 4)));
  const order = Math.floor(toNumberSafe(positionRecord?.order ?? raw.insertion_order ?? raw.order, 100));
  const probability = clampNumber(toNumberSafe(raw.probability, 100), 0, 100);

  const preventIncoming = recursionRecord?.prevent_incoming ?? raw.preventRecursion;
  const preventOutgoing = recursionRecord?.prevent_outgoing ?? raw.excludeRecursion;

  const entry: WorldbookEntry = {
    ...base,
    uid,
    name,
    enabled: raw.enabled === undefined ? raw.disable !== true : Boolean(raw.enabled),
    strategy: {
      type: strategyType,
      keys,
      keys_secondary: {
        logic: secondaryLogic,
        keys: secondaryKeys,
      },
      scan_depth: normalizeScanDepth(strategyRecord?.scan_depth ?? raw.scan_depth),
    },
    position: {
      type: positionType,
      role: positionType === 'at_depth' ? role : 'system',
      depth: positionType === 'at_depth' ? depth : 4,
      order,
    },
    content: toStringSafe(raw.content),
    probability,
    recursion: {
      prevent_incoming: Boolean(preventIncoming),
      prevent_outgoing: Boolean(preventOutgoing),
      delay_until: parseNullableInteger(recursionRecord?.delay_until ?? raw.delayUntilRecursion),
    },
    effect: {
      sticky: parseNullableInteger(effectRecord?.sticky ?? raw.sticky),
      cooldown: parseNullableInteger(effectRecord?.cooldown ?? raw.cooldown),
      delay: parseNullableInteger(effectRecord?.delay ?? raw.delay),
    },
  };

  const directExtra = asRecord(raw.extra);
  if (directExtra && Object.keys(directExtra).length > 0) {
    entry.extra = klona(directExtra);
  } else {
    const extras = collectExtraFields(raw);
    if (extras) {
      entry.extra = klona(extras);
    }
  }

  return entry;
}

export function normalizeEntryList(rawEntries: unknown[]): WorldbookEntry[] {
  const result: WorldbookEntry[] = [];
  const uidSet = new Set<number>();

  for (let index = 0; index < rawEntries.length; index += 1) {
    const rawRecord = asRecord(rawEntries[index]);
    let uid = Math.max(0, Math.floor(toNumberSafe(rawRecord?.uid ?? rawRecord?.id, index)));
    while (uidSet.has(uid)) {
      uid += 1;
    }
    uidSet.add(uid);
    result.push(normalizeEntry(rawEntries[index], uid));
  }

  return result;
}

export function createDefaultLayoutState(): LayoutState {
  return {
    focus_mode: false,
    normal_left_width: MAIN_PANE_DEFAULT,
    normal_right_width: EDITOR_SIDE_DEFAULT,
    focus_left_width: FOCUS_MAIN_PANE_DEFAULT,
    focus_right_width: FOCUS_EDITOR_SIDE_DEFAULT,
  };
}

export function createDefaultMultiEditPersistState(): MultiEditPersistState {
  return {
    enabled: true,
    sync_extra_json: false,
  };
}

export function createDefaultTagEditorPersistState(): TagEditorPersistState {
  return {
    delete_parent_mode: 'promote',
  };
}

export function createDefaultCrossCopyPersistState(): CrossCopyPersistState {
  return {
    last_source_worldbook: '',
    last_target_worldbook: '',
    use_draft_source_when_current: true,
    snapshot_before_apply: true,
    desktop_left_width: CROSS_COPY_DESKTOP_LEFT_DEFAULT,
    controls_collapsed: true,
    workspace_tools_expanded: true,
  };
}

export function createDefaultTagFilterState(): TagFilterState {
  return {
    selected_ids: [],
    logic: 'or',
    match_mode: 'descendants',
  };
}

export function normalizeMultiEditPersistState(input: unknown): MultiEditPersistState {
  const fallback = createDefaultMultiEditPersistState();
  const raw = asRecord(input);
  if (!raw) {
    return fallback;
  }
  return {
    enabled: raw.enabled !== false,
    sync_extra_json: raw.sync_extra_json === true,
  };
}

export function normalizeCrossCopyPersistState(input: unknown): CrossCopyPersistState {
  const fallback = createDefaultCrossCopyPersistState();
  const raw = asRecord(input);
  if (!raw) {
    return fallback;
  }
  return {
    last_source_worldbook: toStringSafe(raw.last_source_worldbook).trim(),
    last_target_worldbook: toStringSafe(raw.last_target_worldbook).trim(),
    use_draft_source_when_current: raw.use_draft_source_when_current !== false,
    snapshot_before_apply: raw.snapshot_before_apply !== false,
    desktop_left_width: clampNumber(
      Math.floor(toNumberSafe(raw.desktop_left_width, fallback.desktop_left_width)),
      CROSS_COPY_DESKTOP_LEFT_MIN,
      CROSS_COPY_DESKTOP_LEFT_MAX,
    ),
    controls_collapsed: raw.controls_collapsed !== false,
    workspace_tools_expanded: raw.workspace_tools_expanded === undefined
      ? fallback.workspace_tools_expanded
      : raw.workspace_tools_expanded === true,
  };
}

export function normalizeTagEditorPersistState(input: unknown): TagEditorPersistState {
  const fallback = createDefaultTagEditorPersistState();
  const raw = asRecord(input);
  if (!raw) {
    return fallback;
  }
  return {
    delete_parent_mode: raw.delete_parent_mode === 'cascade' ? 'cascade' : fallback.delete_parent_mode,
  };
}

export function normalizeTagFilterState(input: unknown): TagFilterState {
  const fallback = createDefaultTagFilterState();
  const raw = asRecord(input);
  if (!raw) {
    return fallback;
  }
  const selected = Array.isArray(raw.selected_ids)
    ? raw.selected_ids.map(id => toStringSafe(id).trim()).filter(Boolean)
    : [];
  return {
    selected_ids: [...new Set(selected)],
    logic: raw.logic === 'and' ? 'and' : fallback.logic,
    match_mode: raw.match_mode === 'exact' ? 'exact' : fallback.match_mode,
  };
}

export function normalizeLayoutState(input: unknown): LayoutState {
  const fallback = createDefaultLayoutState();
  const raw = asRecord(input);
  if (!raw) {
    return fallback;
  }
  return {
    focus_mode: raw.focus_mode === true,
    normal_left_width: clampNumber(Math.floor(toNumberSafe(raw.normal_left_width, fallback.normal_left_width)), MAIN_PANE_MIN, 1200),
    normal_right_width: clampNumber(Math.floor(toNumberSafe(raw.normal_right_width, fallback.normal_right_width)), EDITOR_SIDE_MIN, 1200),
    focus_left_width: clampNumber(Math.floor(toNumberSafe(raw.focus_left_width, fallback.focus_left_width)), FOCUS_MAIN_PANE_MIN, 800),
    focus_right_width: clampNumber(Math.floor(toNumberSafe(raw.focus_right_width, fallback.focus_right_width)), FOCUS_EDITOR_SIDE_MIN, 800),
  };
}

export function createDefaultPersistedState(): PersistedState {
  return {
    last_worldbook: '',
    history: {},
    entry_history: {},
    global_presets: [],
    last_global_preset_id: '',
    role_override_baseline: null,
    theme: 'ocean',
    ai_chat: { sessions: [], activeSessionId: null },
    worldbook_tags: { definitions: [], assignments: {} },
    tag_filter: createDefaultTagFilterState(),
    extract_ignore_tags: ['think', 'thinking', 'recap', 'content', 'details', 'summary'],
    show_ai_chat: false,
    multi_edit: createDefaultMultiEditPersistState(),
    tag_editor: createDefaultTagEditorPersistState(),
    ai_api_config: {
      mode: 'tavern',
      use_main_api: true,
      apiurl: '',
      key: '',
      model: '',
      max_tokens: 4096,
      temperature: 1,
    },
    layout: createDefaultLayoutState(),
    cross_copy: createDefaultCrossCopyPersistState(),
    sort: { mode: 'mutate', reassign_uid: true },
    glass_mode: true,
    panel_mode: 'browse',
  };
}

export function normalizePersistedState(input: unknown): PersistedState {
  const root = asRecord(input);
  if (!root) {
    return createDefaultPersistedState();
  }

  const history = normalizePersistedWorldbookHistory(root.history, {
    asRecord,
    createId,
    historyLimit: HISTORY_LIMIT,
    normalizeEntryList,
    toNumberSafe,
    toStringSafe,
  });
  const entryHistory = normalizePersistedEntryHistory(root.entry_history, {
    asRecord,
    createId,
    entryHistoryLimit: ENTRY_HISTORY_LIMIT,
    normalizeEntry,
    toNumberSafe,
    toStringSafe,
  });

  const globalPresetsRaw = Array.isArray(root.global_presets) ? root.global_presets : [];
  const globalPresets = globalPresetsRaw
    .map(item => {
      const record = asRecord(item);
      if (!record) {
        return null;
      }
      const worldbooksRaw = Array.isArray(record.worldbooks) ? record.worldbooks : [];
      const worldbooks = [...new Set(worldbooksRaw.map(name => toStringSafe(name).trim()).filter(Boolean))];
      const roleBindings = normalizePresetRoleBindings(record.role_bindings);
      return {
        id: toStringSafe(record.id, createId('global-preset')),
        name: toStringSafe(record.name, '未命名预设'),
        worldbooks,
        role_bindings: roleBindings,
        updated_at: toNumberSafe(record.updated_at, Date.now()),
      } satisfies GlobalWorldbookPreset;
    })
    .filter((item): item is GlobalWorldbookPreset => item !== null)
    .slice(0, GLOBAL_PRESET_LIMIT);

  const rawBaseline = asRecord(root.role_override_baseline);
  let roleOverrideBaseline: PersistedState['role_override_baseline'] = null;
  if (rawBaseline) {
    const baselineWorldbooks = Array.isArray(rawBaseline.worldbooks)
      ? rawBaseline.worldbooks.map(name => toStringSafe(name).trim()).filter(Boolean)
      : [];
    roleOverrideBaseline = {
      preset_id: toStringSafe(rawBaseline.preset_id),
      worldbooks: [...new Set(baselineWorldbooks)],
    };
  }

  const aiChatRaw = asRecord(root.ai_chat);
  const aiChat: AIGeneratorState = { sessions: [], activeSessionId: null };
  if (aiChatRaw) {
    aiChat.activeSessionId = toStringSafe(aiChatRaw.activeSessionId) || null;
    if (Array.isArray(aiChatRaw.sessions)) {
      aiChat.sessions = aiChatRaw.sessions
        .map((s: unknown) => {
          const sr = asRecord(s);
          if (!sr) return null;
          const msgs = Array.isArray(sr.messages)
            ? sr.messages.map((m: unknown) => {
                const mr = asRecord(m);
                if (!mr) return null;
                return {
                  role: mr.role === 'assistant' ? 'assistant' : 'user',
                  content: toStringSafe(mr.content),
                  timestamp: toNumberSafe(mr.timestamp, Date.now()),
                } satisfies AIChatMessage;
              }).filter((m): m is AIChatMessage => m !== null)
            : [];
          return {
            id: toStringSafe(sr.id, createId('ai-chat')),
            title: toStringSafe(sr.title, '新对话'),
            createdAt: toNumberSafe(sr.createdAt, Date.now()),
            messages: msgs.slice(0, AI_CHAT_MESSAGE_LIMIT),
          } satisfies AIChatSession;
        })
        .filter((s): s is AIChatSession => s !== null)
        .slice(0, AI_CHAT_SESSION_LIMIT);
    }
  }

  // 标签数据规范化
  const rawTags = asRecord(root.worldbook_tags);
  const tagDefs: WorldbookTagDefinition[] = [];
  const tagIdSet = new Set<string>();
  if (rawTags && Array.isArray(rawTags.definitions)) {
    rawTags.definitions.forEach((d, index) => {
      const dr = asRecord(d);
      if (!dr) return;
      const id = toStringSafe(dr.id).trim();
      const name = toStringSafe(dr.name).trim();
      if (!id || !name || tagIdSet.has(id)) return;
      const parentIdRaw = toStringSafe(dr.parent_id).trim();
      const parentId = parentIdRaw || null;
      tagDefs.push({
        id,
        name,
        color: toStringSafe(dr.color, TAG_COLORS[0]),
        parent_id: parentId,
        sort: Math.max(0, Math.floor(toNumberSafe(dr.sort, index))),
      });
      tagIdSet.add(id);
    });
  }
  const tagIdSetFromDefs = new Set(tagDefs.map(tag => tag.id));
  for (const def of tagDefs) {
    if (def.parent_id && !tagIdSetFromDefs.has(def.parent_id)) {
      def.parent_id = null;
    }
  }
  const tagAssignmentsRaw = asRecord(rawTags?.assignments);
  const tagAssignmentsNorm: Record<string, string[]> = {};
  if (tagAssignmentsRaw) {
    for (const [wbName, ids] of Object.entries(tagAssignmentsRaw)) {
      if (Array.isArray(ids)) {
        const normalizedIds = [...new Set(ids.map(id => toStringSafe(id)).filter(id => tagIdSetFromDefs.has(id)))];
        if (normalizedIds.length) {
          tagAssignmentsNorm[wbName] = normalizedIds;
        }
      }
    }
  }
  const normalizedTagFilter = normalizeTagFilterState(root.tag_filter);
  normalizedTagFilter.selected_ids = normalizedTagFilter.selected_ids.filter(id => tagIdSetFromDefs.has(id));

  return {
    ...klona(root),
    last_worldbook: toStringSafe(root.last_worldbook),
    history,
    entry_history: entryHistory,
    global_presets: globalPresets,
    last_global_preset_id: toStringSafe(root.last_global_preset_id),
    role_override_baseline: roleOverrideBaseline,
    theme: (toStringSafe(root.theme) as ThemeKey) || 'ocean',
    ai_chat: aiChat,
    worldbook_tags: { definitions: tagDefs.slice(0, TAG_LIMIT), assignments: tagAssignmentsNorm },
    tag_filter: normalizedTagFilter,
    extract_ignore_tags: Array.isArray(root.extract_ignore_tags)
      ? root.extract_ignore_tags.map((t: unknown) => toStringSafe(t).trim().toLowerCase()).filter(Boolean)
      : ['thinking', 'recap', 'content', 'details', 'summary'],
    show_ai_chat: root.show_ai_chat === true,
    multi_edit: normalizeMultiEditPersistState(root.multi_edit),
    tag_editor: normalizeTagEditorPersistState(root.tag_editor),
    ai_api_config: (() => {
      const raw = asRecord(root.ai_api_config);
      if (!raw) return createDefaultPersistedState().ai_api_config;
      return {
        mode: raw.mode === 'custom' ? 'custom' : 'tavern',
        use_main_api: raw.use_main_api !== false,
        apiurl: toStringSafe(raw.apiurl),
        key: toStringSafe(raw.key),
        model: toStringSafe(raw.model),
        max_tokens: toNumberSafe(raw.max_tokens, 4096),
        temperature: toNumberSafe(raw.temperature, 1),
      } as AIApiConfig;
    })(),
    layout: normalizeLayoutState(root.layout),
    cross_copy: normalizeCrossCopyPersistState(root.cross_copy),
    sort: (() => {
      const raw = asRecord(root.sort);
      return {
        mode: raw?.mode === 'view' ? 'view' as const : 'mutate' as const,
        reassign_uid: raw?.reassign_uid !== false,
      };
    })(),
    glass_mode: root.glass_mode === true,
    panel_mode: root.panel_mode === 'editor' ? 'editor' : 'browse',
  };
}
