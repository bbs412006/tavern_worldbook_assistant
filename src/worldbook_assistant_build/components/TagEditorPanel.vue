<template>
  <section class="tag-editor-panel" :class="{ 'mobile-tag-editor': mobile }" :style="panelStyle">
    <div class="tag-editor-title">🏷️ 标签管理</div>
    <TagCreatePanel
      :name="newName"
      :parent-id="newParentId"
      :parent-options="assignOptions"
      :has-tags="hasTags"
      :desktop="desktop"
      :show-parent-select="desktop"
      @update:name="$emit('update:new-name', $event)"
      @update:parent-id="$emit('update:new-parent-id', $event)"
      @create="$emit('create')"
      @reset-all="$emit('reset-all')"
    />
    <template v-if="hasTags">
      <div :class="desktop ? 'tag-editor-layout' : undefined">
        <TagTreePanel
          :rows="rows"
          :parent-options="assignOptions"
          :colors="colors"
          :id-prefix="idPrefix"
          :animated="desktop"
          :name-of="nameOf"
          :parent-id-of="parentIdOf"
          :disabled-parent-ids="disabledParentIds"
          @rename="handleRename"
          @set-parent="handleSetParent"
          @set-color="handleSetColor"
          @delete="$emit('delete-tag', $event)"
        />
        <TagAssignmentPanel
          :target-id="assignTargetId"
          :search="assignSearch"
          :options="assignOptions"
          :worldbooks="assignWorldbooks"
          :assignments="assignments"
          :path-summary="pathSummary"
          :id-prefix="idPrefix"
          :compact="mobile"
          @update:target-id="$emit('update:assign-target-id', $event)"
          @update:search="$emit('update:assign-search', $event)"
          @toggle="$emit('toggle-assignment', $event)"
        />
      </div>
    </template>
    <div v-else class="empty-note" :style="emptyStyle">暂无标签，请先创建</div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import TagAssignmentPanel from './TagAssignmentPanel.vue';
import TagCreatePanel from './TagCreatePanel.vue';
import TagTreePanel from './TagTreePanel.vue';

interface TagEditorPanelRow {
  id: string;
  name: string;
  path: string;
  color: string;
  depth: number;
  parent_id: string | null;
  sort: number;
}

const props = defineProps<{
  mobile?: boolean;
  desktop?: boolean;
  rows: TagEditorPanelRow[];
  newName: string;
  newParentId: string;
  assignTargetId: string;
  assignSearch: string;
  assignOptions: Array<{ id: string; path: string }>;
  assignWorldbooks: string[];
  assignments: Record<string, string[]>;
  colors: string[];
  nameOf: (id: string) => string;
  parentIdOf: (id: string) => string | null;
  disabledParentIds: (id: string) => Set<string>;
  pathSummary: (name: string) => string;
}>();

const emit = defineEmits<{
  'update:new-name': [value: string];
  'update:new-parent-id': [value: string];
  'update:assign-target-id': [value: string];
  'update:assign-search': [value: string];
  create: [];
  'reset-all': [];
  rename: [id: string, value: string];
  'set-parent': [id: string, parentId: string | null];
  'set-color': [id: string, color: string];
  'delete-tag': [id: string];
  'toggle-assignment': [name: string];
}>();

function handleRename(id: string, value: string): void {
  emit('rename', id, value);
}

function handleSetParent(id: string, parentId: string | null): void {
  emit('set-parent', id, parentId);
}

function handleSetColor(id: string, color: string): void {
  emit('set-color', id, color);
}

const hasTags = computed(() => props.rows.length > 0);
const idPrefix = computed(() => (props.mobile ? 'mobile' : 'desktop'));
const panelStyle = computed(() => (props.desktop ? { padding: '16px' } : undefined));
const emptyStyle = computed(() => (props.desktop ? { marginTop: '20px' } : { marginTop: '16px' }));
</script>
