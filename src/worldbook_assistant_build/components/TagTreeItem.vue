<template>
  <div class="tag-editor-tree-item" :style="itemStyle">
    <span class="tag-editor-indent"></span>
    <span class="tag-editor-dot" :style="{ background: row.color }"></span>
    <input
      :value="name"
      class="tag-editor-name-input"
      @blur="$emit('rename', ($event.target as HTMLInputElement).value)"
      @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
    />
    <select
      class="text-input tag-parent-select"
      :value="parentId ?? ''"
      @change="$emit('set-parent', ($event.target as HTMLSelectElement).value || null)"
    >
      <option value="">根级</option>
      <option
        v-for="option in parentOptions"
        :key="`${idPrefix}-parent-${row.id}-${option.id}`"
        :value="option.id"
        :disabled="disabledParentIds.has(option.id)"
      >
        {{ option.path }}
      </option>
    </select>
    <TagColorPicker
      :value="row.color"
      :colors="colors"
      :id-prefix="`${idPrefix}-color-${row.id}`"
      @select="$emit('set-color', $event)"
    />
    <button class="tag-delete-btn" type="button" @click="$emit('delete')">×</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import TagColorPicker from './TagColorPicker.vue';

interface TagTreeItemRow {
  id: string;
  name: string;
  path: string;
  color: string;
  depth: number;
  parent_id: string | null;
  sort: number;
}

const props = defineProps<{
  row: TagTreeItemRow;
  name: string;
  parentId: string | null;
  parentOptions: Array<{ id: string; path: string }>;
  disabledParentIds: Set<string>;
  colors: string[];
  idPrefix: string;
}>();

defineEmits<{
  rename: [value: string];
  'set-parent': [parentId: string | null];
  'set-color': [color: string];
  delete: [];
}>();

const itemStyle = computed(() => ({
  '--tag-color': props.row.color,
  '--depth': props.row.depth,
}));
</script>
