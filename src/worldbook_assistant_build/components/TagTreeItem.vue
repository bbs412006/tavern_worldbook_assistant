<template>
  <div class="tag-editor-tree-item" :style="itemStyle">
    <span class="tag-editor-indent"></span>
    <span class="tag-editor-dot" :style="{ background: row.color }"></span>
    <BaseInput
      :model-value="name"
      class="tag-editor-name-input"
      @update:model-value="draftName = String($event ?? '')"
      @blur="$emit('rename', draftName)"
      @keydown.enter.prevent="blurCurrentTarget"
    />
    <BaseSelect
      class="text-input tag-parent-select"
      :model-value="parentId ?? ''"
      :options="selectOptions"
      @update:model-value="$emit('set-parent', String($event ?? '') || null)"
    />
    <TagColorPicker
      :value="row.color"
      :colors="colors"
      :id-prefix="`${idPrefix}-color-${row.id}`"
      @select="$emit('set-color', $event)"
    />
    <BaseButton class="tag-delete-btn" variant="ghost" size="sm" icon-only aria-label="删除标签" @click="$emit('delete')">×</BaseButton>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import TagColorPicker from './TagColorPicker.vue';
import BaseButton from './controls/BaseButton.vue';
import BaseInput from './controls/BaseInput.vue';
import BaseSelect from './controls/BaseSelect.vue';

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

const draftName = ref(props.name);
const itemStyle = computed(() => ({
  '--tag-color': props.row.color,
  '--depth': props.row.depth,
}));
const selectOptions = computed(() => [
  { value: '', label: '根级' },
  ...props.parentOptions.map(option => ({
    value: option.id,
    label: option.path,
    disabled: props.disabledParentIds.has(option.id),
  })),
]);

watch(() => props.name, value => { draftName.value = value; });

function blurCurrentTarget(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null;
  target?.blur();
}
</script>
