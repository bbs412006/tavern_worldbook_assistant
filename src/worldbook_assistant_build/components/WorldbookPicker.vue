<template>
  <div class="worldbook-picker">
    <BaseSelect
      :model-value="modelValue"
      :options="worldbookOptions"
      :placeholder="placeholder"
      :selected-label="selectedWorldbookLabel"
      :search-placeholder="searchPlaceholder"
      :no-match-text="noMatchText"
      searchable="auto"
      aria-label="世界书"
      @update:model-value="selectWorldbook"
    />
    <div v-if="showTagFilter && tagDefinitions.length" class="worldbook-picker-tags tree-mode">
      <div class="tag-filter-toolbar">
        <BaseButton class="tag-filter-open" size="sm" @click="tagFilterPanelOpen = !tagFilterPanelOpen">🏷 标签筛选</BaseButton>
        <span class="tag-filter-summary">{{ tagFilterSummary }}</span>
        <BaseSelect
          :model-value="tagFilterLogic"
          class="tag-filter-select"
          :options="tagFilterLogicOptions"
          :searchable="false"
          size="sm"
          aria-label="标签筛选逻辑"
          @update:model-value="updateTagFilterLogic"
        />
        <BaseSelect
          :model-value="tagFilterMatchMode"
          class="tag-filter-select"
          :options="tagFilterMatchModeOptions"
          :searchable="false"
          size="sm"
          aria-label="标签匹配模式"
          @update:model-value="updateTagFilterMatchMode"
        />
        <BaseButton size="sm" :disabled="!selectedTagIds.length" @click="clearTagFilterSelection">清空</BaseButton>
      </div>
      <Transition name="tag-filter-panel">
        <div v-if="tagFilterPanelOpen" class="tag-filter-panel">
          <BaseInput v-model="tagFilterSearchText" class="tag-filter-search" placeholder="搜索标签..." aria-label="搜索标签" />
          <div v-if="selectedTagIds.length" class="tag-filter-selected-list">
            <BaseButton
              v-for="tagId in selectedTagIds"
              :key="`tag-selected-${tagId}`"
              class="tag-filter-selected-chip"
              size="sm"
              @click="toggleTagFilterSelection(tagId)"
            >{{ pathFor(tagId) }} ×</BaseButton>
          </div>
          <div v-if="mobileTagView" class="tag-flat-list">
            <label v-for="tag in flatTagRows" :key="`tag-flat-${tag.id}`" class="tag-flat-item" :style="{ '--tag-color': tag.color }">
              <input type="checkbox" :checked="selectedTagIdSet.has(tag.id)" @change="toggleTagFilterSelection(tag.id)" />
              <span>{{ tag.path }}</span>
            </label>
            <div v-if="!flatTagRows.length" class="empty-note">没有匹配的标签</div>
          </div>
          <div v-else class="tag-tree-list">
            <div v-for="row in tagTreeRows" :key="`tag-tree-${row.id}`" class="tag-tree-row" :style="{ '--depth': row.depth, '--tag-color': row.color }">
              <BaseButton v-if="row.hasChildren" class="tag-tree-toggle" size="sm" icon-only :aria-label="`${expandedTagIdSet.has(row.id) ? '收起' : '展开'} ${row.name}`" @click.stop="toggleTagTreeExpanded(row.id)">
                {{ expandedTagIdSet.has(row.id) || tagFilterSearchText.trim() ? '▾' : '▸' }}
              </BaseButton>
              <span v-else class="tag-tree-toggle placeholder"></span>
              <input type="checkbox" :checked="selectedTagIdSet.has(row.id)" @change="toggleTagFilterSelection(row.id)" />
              <span class="tag-tree-name">{{ row.name }}</span>
              <span class="tag-tree-path">{{ row.path }}</span>
            </div>
            <div v-if="!tagTreeRows.length" class="empty-note">没有匹配的标签</div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import BaseButton from './controls/BaseButton.vue';
import BaseInput from './controls/BaseInput.vue';
import BaseSelect, { type BaseSelectOption } from './controls/BaseSelect.vue';

const props = withDefaults(defineProps<{
  modelValue: string;
  names: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  noMatchText?: string;
  showTagFilter?: boolean;
  tagDefinitions?: any[];
  tagAssignments?: Record<string, string[]>;
  tagPathMap?: Map<string, string>;
  selectedTagIds?: string[];
  tagFilterLogic?: 'or' | 'and';
  tagFilterMatchMode?: 'descendants' | 'exact';
  mobileTagView?: boolean;
}>(), {
  placeholder: '请选择',
  searchPlaceholder: '搜索...',
  noMatchText: '无匹配',
  showTagFilter: false,
  tagDefinitions: () => [],
  tagAssignments: () => ({}),
  tagPathMap: () => new Map<string, string>(),
  selectedTagIds: () => [],
  tagFilterLogic: 'or',
  tagFilterMatchMode: 'descendants',
  mobileTagView: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'update:selectedTagIds': [value: string[]];
  'update:tagFilterLogic': [value: 'or' | 'and'];
  'update:tagFilterMatchMode': [value: 'descendants' | 'exact'];
}>();

const tagFilterPanelOpen = ref(false);
const tagFilterSearchText = ref('');
const expandedTagIds = ref<string[]>([]);

interface TagRow { id: string; name: string; path: string; depth: number; hasChildren: boolean; color: string }
const definitions = computed(() => props.tagDefinitions.map((definition: any, index) => ({
  id: String(definition.id),
  name: String(definition.name ?? definition.id),
  parentId: definition.parent_id ? String(definition.parent_id) : null,
  sort: Number.isFinite(definition.sort) ? definition.sort : index,
  color: String(definition.color ?? 'transparent'),
})));
const definitionMap = computed(() => new Map(definitions.value.map(definition => [definition.id, definition])));
const childrenMap = computed(() => {
  const result = new Map<string | null, typeof definitions.value>();
  for (const definition of definitions.value) {
    const parentId = definition.parentId && definitionMap.value.has(definition.parentId) ? definition.parentId : null;
    const children = result.get(parentId) ?? [];
    children.push({ ...definition, parentId });
    result.set(parentId, children);
  }
  for (const children of result.values()) children.sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  return result;
});
function pathFor(tagId: string): string {
  const provided = props.tagPathMap.get(tagId);
  if (provided) return provided;
  const names: string[] = [];
  const seen = new Set<string>();
  let cursor: string | null = tagId;
  while (cursor && definitionMap.value.has(cursor) && !seen.has(cursor)) {
    seen.add(cursor);
    const definition = definitionMap.value.get(cursor)!;
    names.unshift(definition.name);
    cursor = definition.parentId;
  }
  return names.join('/') || tagId;
}
function descendantIds(tagId: string): Set<string> {
  const result = new Set<string>([tagId]);
  const visit = (parentId: string) => {
    for (const child of childrenMap.value.get(parentId) ?? []) {
      if (result.has(child.id)) continue;
      result.add(child.id);
      visit(child.id);
    }
  };
  visit(tagId);
  return result;
}
function matchesTagFilter(name: string): boolean {
  const selected = props.selectedTagIds.filter(id => definitionMap.value.has(id));
  if (!selected.length) return true;
  const assigned = new Set(props.tagAssignments[name] ?? []);
  const results = selected.map(id => {
    const candidates = props.tagFilterMatchMode === 'exact' ? new Set([id]) : descendantIds(id);
    return [...candidates].some(candidate => assigned.has(candidate));
  });
  return props.tagFilterLogic === 'and' ? results.every(Boolean) : results.some(Boolean);
}
const filteredWorldbookNames = computed(() => props.names.filter(matchesTagFilter));
const worldbookOptions = computed<BaseSelectOption<string>[]>(() => filteredWorldbookNames.value.map(name => ({ value: name, label: name })));
const selectedWorldbookLabel = computed(() => props.names.includes(props.modelValue) ? props.modelValue : undefined);
const tagFilterLogicOptions: BaseSelectOption<string>[] = [
  { value: 'or', label: 'OR' },
  { value: 'and', label: 'AND' },
];
const tagFilterMatchModeOptions: BaseSelectOption<string>[] = [
  { value: 'descendants', label: '子树' },
  { value: 'exact', label: '精确' },
];
const selectedTagIdSet = computed(() => new Set(props.selectedTagIds));
const expandedTagIdSet = computed(() => new Set(expandedTagIds.value));
const flatTagRows = computed<TagRow[]>(() => {
  const keyword = tagFilterSearchText.value.trim().toLowerCase();
  return definitions.value.map(definition => ({ ...definition, path: pathFor(definition.id), depth: 0, hasChildren: (childrenMap.value.get(definition.id) ?? []).length > 0 }))
    .filter(row => !keyword || row.path.toLowerCase().includes(keyword));
});
const tagTreeRows = computed<TagRow[]>(() => {
  const rows: TagRow[] = [];
  const keyword = tagFilterSearchText.value.trim().toLowerCase();
  const walk = (parentId: string | null, depth: number): void => {
    for (const definition of childrenMap.value.get(parentId) ?? []) {
      const row = { ...definition, path: pathFor(definition.id), depth, hasChildren: (childrenMap.value.get(definition.id) ?? []).length > 0 };
      const subtreeMatches = !keyword || row.path.toLowerCase().includes(keyword) || [...descendantIds(row.id)].some(id => pathFor(id).toLowerCase().includes(keyword));
      if (!subtreeMatches) continue;
      rows.push(row);
      if (keyword || expandedTagIdSet.value.has(row.id)) walk(row.id, depth + 1);
    }
  };
  walk(null, 0);
  return rows;
});
const tagFilterSummary = computed(() => {
  const count = props.selectedTagIds.length;
  return count === 1 ? pathFor(props.selectedTagIds[0]!) : count ? `${count} 个标签` : '未筛选';
});

function selectWorldbook(value: string | number | null): void {
  if (typeof value === 'string') emit('update:modelValue', value);
}

function clearTagFilterSelection(): void {
  emit('update:selectedTagIds', []);
}

function toggleTagFilterSelection(tagId: string): void {
  const next = new Set(props.selectedTagIds);
  if (next.has(tagId)) next.delete(tagId);
  else next.add(tagId);
  emit('update:selectedTagIds', [...next]);
}

function toggleTagTreeExpanded(tagId: string): void {
  const next = new Set(expandedTagIds.value);
  if (next.has(tagId)) next.delete(tagId);
  else next.add(tagId);
  expandedTagIds.value = [...next];
}

function updateTagFilterLogic(value: string | number | null): void {
  if (value === 'or' || value === 'and') emit('update:tagFilterLogic', value);
}

function updateTagFilterMatchMode(value: string | number | null): void {
  if (value === 'descendants' || value === 'exact') emit('update:tagFilterMatchMode', value);
}

watch(tagFilterPanelOpen, opened => {
  if (opened && !expandedTagIds.value.length) expandedTagIds.value = (childrenMap.value.get(null) ?? []).map(item => item.id);
  if (!opened) tagFilterSearchText.value = '';
});
</script>
