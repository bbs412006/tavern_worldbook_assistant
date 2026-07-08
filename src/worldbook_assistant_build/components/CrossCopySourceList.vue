<template>
  <aside class="cross-copy-left">
    <div class="cross-copy-list-head">
      <strong>来源条目</strong>
      <span>{{ totalCount }} 条</span>
    </div>
    <div class="cross-copy-list-tools">
      <input
        :value="searchText"
        type="text"
        class="text-input"
        placeholder="搜索来源名称 / 内容"
        @input="$emit('update:search-text', ($event.target as HTMLInputElement).value)"
      />
      <div class="cross-copy-mini-actions">
        <button class="btn mini" type="button" :disabled="!rows.length" @click="$emit('select-filtered', true)">全选显示</button>
        <button class="btn mini" type="button" :disabled="!totalCount" @click="$emit('select-all', false)">全不选</button>
      </div>
    </div>
    <div class="cross-copy-source-list" :class="{ 'mobile-source-list': mobile }">
      <label v-for="row in rows" :key="`${idPrefix}-copy-pick-${row.id}`" class="cross-copy-source-item" :class="{ checked: row.selected }">
        <input
          :checked="row.selected"
          type="checkbox"
          :disabled="row.status === 'invalid_same_source_target' || applyLoading"
          @change="$emit('set-selected', row.id, ($event.target as HTMLInputElement).checked)"
        />
        <span class="cross-copy-status-dot" :class="statusBadgeClass(row.status)"></span>
        <span class="cross-copy-source-name" :title="row.source_entry.name || `条目 ${row.source_entry.uid}`">
          {{ row.source_entry.name || `条目 ${row.source_entry.uid}` }}
        </span>
      </label>
      <div v-if="!rows.length" class="empty-note">暂无可选条目，请先刷新比较</div>
    </div>
  </aside>
</template>

<script setup lang="ts">
type CrossCopySourceRow = {
  id: string;
  selected: boolean;
  status: string;
  source_entry: {
    uid: number;
    name: string;
  };
};

defineProps<{
  rows: CrossCopySourceRow[];
  totalCount: number;
  searchText: string;
  applyLoading: boolean;
  idPrefix: string;
  mobile?: boolean;
  statusBadgeClass: (status: string) => string;
}>();

defineEmits<{
  'update:search-text': [value: string];
  'select-filtered': [selected: boolean];
  'select-all': [selected: boolean];
  'set-selected': [id: string, selected: boolean];
}>();
</script>
