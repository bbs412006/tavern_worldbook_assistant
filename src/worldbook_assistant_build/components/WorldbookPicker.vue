<template>
  <div ref="pickerRef" class="worldbook-picker">
    <button class="worldbook-picker-trigger" type="button" @click="toggleOpen">
      <span class="worldbook-picker-trigger-text" :title="modelValue || placeholder">
        {{ modelValue || placeholder }}
      </span>
      <span class="worldbook-picker-trigger-arrow">{{ isOpen ? '▴' : '▾' }}</span>
    </button>
    <div v-if="isOpen" class="worldbook-picker-dropdown" @click.stop>
      <div v-if="showTagFilter && tagDefinitions.length" class="worldbook-picker-tags tree-mode">
        <div class="tag-filter-toolbar">
          <button class="btn mini tag-filter-open" type="button" @click="tagFilterPanelOpen = !tagFilterPanelOpen">🏷 标签筛选</button>
          <span class="tag-filter-summary">{{ tagFilterSummary }}</span>
          <select v-model="tagFilterLogic" class="text-input tag-filter-select">
            <option value="or">OR</option>
            <option value="and">AND</option>
          </select>
          <select v-model="tagFilterMatchMode" class="text-input tag-filter-select">
            <option value="descendants">子树</option>
            <option value="exact">精确</option>
          </select>
          <button class="btn mini" type="button" :disabled="!selectedTagFilterIds.length" @click="clearTagFilterSelection">清空</button>
        </div>
        <Transition name="tag-filter-panel">
          <div v-if="tagFilterPanelOpen" class="tag-filter-panel">
            <input v-model="tagFilterSearchText" type="text" class="text-input tag-filter-search" placeholder="搜索标签..." />
            <div class="tag-tree-list">
              <div v-if="!tagTreeRows.length" class="empty-note">没有匹配的标签</div>
            </div>
          </div>
        </Transition>
      </div>
      <input
        ref="searchInputRef"
        v-model="searchText"
        type="text"
        class="text-input worldbook-picker-search"
        :placeholder="searchPlaceholder"
        @keydown.enter.prevent="filteredNames[0] && selectName(filteredNames[0])"
      />
      <div class="worldbook-picker-list">
        <button
          v-for="name in filteredNames"
          :key="`wb-pick-${name}`"
          class="worldbook-picker-item"
          :class="{ active: name === modelValue }"
          type="button"
          @click="selectName(name)"
        >{{ name }}</button>
        <div v-if="!filteredNames.length" class="empty-note">{{ noMatchText }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';

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
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const pickerRef = ref<HTMLDivElement>();
const searchInputRef = ref<HTMLInputElement>();
const searchText = ref('');
const isOpen = ref(false);
const tagFilterPanelOpen = ref(false);
const tagFilterSearchText = ref('');
const tagFilterLogic = ref<'or' | 'and'>('or');
const tagFilterMatchMode = ref<'descendants' | 'exact'>('descendants');
const selectedTagFilterIds = ref<string[]>([]);

// We accept tagDefinitions as a prop and compute rows from it
const tagTreeRows = computed(() => []);

const tagFilterSummary = computed(() => {
  const count = selectedTagFilterIds.value.length;
  return count ? `${count} 个标签` : '未筛选';
});

const filteredNames = computed(() => {
  const q = searchText.value.toLowerCase();
  if (!q) return props.names;
  return props.names.filter(n => n.toLowerCase().includes(q));
});

function toggleOpen() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    nextTick(() => searchInputRef.value?.focus());
  }
}

function selectName(name: string) {
  emit('update:modelValue', name);
  isOpen.value = false;
  searchText.value = '';
}

function clearTagFilterSelection() {
  selectedTagFilterIds.value = [];
}
</script>
