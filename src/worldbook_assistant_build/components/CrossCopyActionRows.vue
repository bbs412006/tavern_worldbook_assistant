<template>
  <section class="cross-copy-right">
    <div class="cross-copy-list-head">
      <strong>对比与动作</strong>
      <span>已选 {{ selectedCount }} 条</span>
    </div>
    <div class="cross-copy-list-tools">
      <select
        :value="statusFilter"
        class="text-input"
        @change="$emit('update:status-filter', ($event.target as HTMLSelectElement).value)"
      >
        <option value="all">全部状态</option>
        <option v-for="status in statusPriority" :key="`${idPrefix}-copy-filter-${status}`" :value="status">
          {{ statusLabel(status) }} ({{ statusCounts[status] ?? 0 }})
        </option>
      </select>
    </div>
    <slot name="bulk"></slot>
    <div class="cross-copy-rows" :class="{ 'mobile-rows': mobile }">
      <article v-for="row in rows" :key="`${idPrefix}-copy-row-${row.id}`" class="cross-copy-row">
        <div class="cross-copy-row-head">
          <div class="cross-copy-row-title">
            <span class="cross-copy-status-badge" :class="statusBadgeClass(row.status)">{{ statusLabel(row.status) }}</span>
            <strong :title="row.source_entry.name || `条目 ${row.source_entry.uid}`">{{ row.source_entry.name || `条目 ${row.source_entry.uid}` }}</strong>
          </div>
          <label class="checkbox-inline">
            <input
              :checked="row.selected"
              type="checkbox"
              :disabled="row.status === 'invalid_same_source_target' || applyLoading"
              @change="$emit('set-selected', row.id, ($event.target as HTMLInputElement).checked)"
            />
            <span>选中</span>
          </label>
        </div>
        <div class="cross-copy-row-note">{{ row.note || rowDiffSummary(row) }}</div>
        <div class="cross-copy-row-actions">
          <select
            :value="row.action"
            class="text-input"
            :disabled="!row.selected || row.status === 'invalid_same_source_target' || applyLoading"
            @change="$emit('set-action', row.id, ($event.target as HTMLSelectElement).value)"
          >
            <option value="skip">{{ actionLabel('skip') }}</option>
            <option value="overwrite">{{ actionLabel('overwrite') }}</option>
            <option value="create">{{ actionLabel('create') }}</option>
            <option value="rename_create">{{ actionLabel('rename_create') }}</option>
          </select>
          <input
            v-if="row.action === 'rename_create'"
            :value="row.rename_name"
            type="text"
            class="text-input"
            placeholder="输入新名称（自动去重）"
            :disabled="!row.selected || applyLoading"
            @input="$emit('set-rename-name', row.id, ($event.target as HTMLInputElement).value)"
            @blur="$emit('rename-blur', row.id)"
          />
        </div>
        <button class="btn mini cross-copy-detail-trigger" type="button" @click="$emit('open-detail', row.id)">
          ▷ 查看对比明细
        </button>
      </article>
      <div v-if="!rows.length" class="empty-note">当前筛选下无条目</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { CrossCopyAction, CrossCopyRow, CrossCopyRowStatus, CrossCopyStatusFilter } from '../domain/types';

defineProps<{
  rows: CrossCopyRow[];
  selectedCount: number;
  statusFilter: CrossCopyStatusFilter;
  statusPriority: CrossCopyRowStatus[];
  statusCounts: Record<CrossCopyRowStatus, number>;
  applyLoading: boolean;
  idPrefix: string;
  mobile?: boolean;
  statusLabel: (status: CrossCopyRowStatus) => string;
  actionLabel: (action: CrossCopyAction) => string;
  statusBadgeClass: (status: CrossCopyRowStatus) => string;
  rowDiffSummary: (row: CrossCopyRow) => string;
}>();

defineEmits<{
  'update:status-filter': [value: CrossCopyStatusFilter];
  'set-selected': [id: string, selected: boolean];
  'set-action': [id: string, action: CrossCopyAction];
  'set-rename-name': [id: string, value: string];
  'rename-blur': [id: string];
  'open-detail': [id: string];
}>();
</script>
