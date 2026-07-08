<template>
  <div class="tag-editor-tree-wrap">
    <div class="tag-editor-subtitle">标签树</div>
    <TransitionGroup v-if="animated" name="list" tag="div" class="tag-editor-tree-list">
      <TagTreeItem
        v-for="row in rows"
        :key="`${idPrefix}-row-${row.id}`"
        :row="row"
        :name="nameOf(row.id)"
        :parent-id="parentIdOf(row.id)"
        :parent-options="parentOptions"
        :disabled-parent-ids="disabledParentIds(row.id)"
        :colors="colors"
        :id-prefix="idPrefix"
        @rename="$emit('rename', row.id, $event)"
        @set-parent="$emit('set-parent', row.id, $event)"
        @set-color="$emit('set-color', row.id, $event)"
        @delete="$emit('delete', row.id)"
      />
    </TransitionGroup>
    <div v-else class="tag-editor-tree-list">
      <TagTreeItem
        v-for="row in rows"
        :key="`${idPrefix}-row-${row.id}`"
        :row="row"
        :name="nameOf(row.id)"
        :parent-id="parentIdOf(row.id)"
        :parent-options="parentOptions"
        :disabled-parent-ids="disabledParentIds(row.id)"
        :colors="colors"
        :id-prefix="idPrefix"
        @rename="$emit('rename', row.id, $event)"
        @set-parent="$emit('set-parent', row.id, $event)"
        @set-color="$emit('set-color', row.id, $event)"
        @delete="$emit('delete', row.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import TagTreeItem from './TagTreeItem.vue';

interface TagTreePanelRow {
  id: string;
  name: string;
  path: string;
  color: string;
  depth: number;
  parent_id: string | null;
  sort: number;
}

defineProps<{
  rows: TagTreePanelRow[];
  parentOptions: Array<{ id: string; path: string }>;
  colors: string[];
  idPrefix: string;
  animated?: boolean;
  nameOf: (id: string) => string;
  parentIdOf: (id: string) => string | null;
  disabledParentIds: (id: string) => Set<string>;
}>();

defineEmits<{
  rename: [id: string, value: string];
  'set-parent': [id: string, parentId: string | null];
  'set-color': [id: string, color: string];
  delete: [id: string];
}>();
</script>
