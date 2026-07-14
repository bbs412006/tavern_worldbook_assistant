<template>
  <div class="worldbook-picker">
    <BaseSelect
      :model-value="modelValue"
      :options="worldbookOptions"
      :placeholder="placeholder"
      searchable="auto"
      aria-label="世界书"
      @update:model-value="selectWorldbook"
    />
    <div v-if="showTagFilter && tagDefinitions.length" class="worldbook-picker-tags tree-mode">
      <div class="tag-filter-toolbar">
        <BaseButton class="tag-filter-open" size="sm" @click="tagFilterPanelOpen = !tagFilterPanelOpen">🏷 标签筛选</BaseButton>
        <span class="tag-filter-summary">{{ tagFilterSummary }}</span>
        <BaseSelect
          v-model="tagFilterLogic"
          class="tag-filter-select"
          :options="tagFilterLogicOptions"
          :searchable="false"
          size="sm"
          aria-label="标签筛选逻辑"
        />
        <BaseSelect
          v-model="tagFilterMatchMode"
          class="tag-filter-select"
          :options="tagFilterMatchModeOptions"
          :searchable="false"
          size="sm"
          aria-label="标签匹配模式"
        />
        <BaseButton size="sm" :disabled="!selectedTagFilterIds.length" @click="clearTagFilterSelection">清空</BaseButton>
      </div>
      <Transition name="tag-filter-panel">
        <div v-if="tagFilterPanelOpen" class="tag-filter-panel">
          <BaseInput v-model="tagFilterSearchText" class="tag-filter-search" placeholder="搜索标签..." aria-label="搜索标签" />
          <div class="tag-tree-list">
            <div v-if="!tagTreeRows.length" class="empty-note">没有匹配的标签</div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

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
}>(), {
  placeholder: '请选择',
  searchPlaceholder: '搜索...',
  noMatchText: '无匹配',
  showTagFilter: false,
  tagDefinitions: () => [],
  tagAssignments: () => ({}),
  tagPathMap: () => new Map<string, string>(),
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const tagFilterPanelOpen = ref(false);
const tagFilterSearchText = ref('');
const tagFilterLogic = ref<'or' | 'and'>('or');
const tagFilterMatchMode = ref<'descendants' | 'exact'>('descendants');
const selectedTagFilterIds = ref<string[]>([]);

const worldbookOptions = computed<BaseSelectOption<string>[]>(() => props.names.map(name => ({ value: name, label: name })));
const tagFilterLogicOptions: BaseSelectOption<string>[] = [
  { value: 'or', label: 'OR' },
  { value: 'and', label: 'AND' },
];
const tagFilterMatchModeOptions: BaseSelectOption<string>[] = [
  { value: 'descendants', label: '子树' },
  { value: 'exact', label: '精确' },
];
const tagTreeRows = computed(() => []);
const tagFilterSummary = computed(() => {
  const count = selectedTagFilterIds.value.length;
  return count ? `${count} 个标签` : '未筛选';
});

function selectWorldbook(value: string | number | null): void {
  if (typeof value === 'string') emit('update:modelValue', value);
}

function clearTagFilterSelection(): void {
  selectedTagFilterIds.value = [];
}
</script>
