<template>
  <section class="cross-copy-right">
    <div class="cross-copy-list-head"><strong>对比与动作</strong><span>已选 {{ selectedCount }} 条</span></div>
    <div class="cross-copy-list-tools">
      <BaseSelect aria-label="筛选对比状态" :model-value="statusFilter" :options="statusOptions" @update:model-value="updateStatusFilter" />
    </div>
    <slot name="bulk"></slot>
    <div class="cross-copy-rows" :class="{ 'mobile-rows': mobile }">
      <article v-for="row in rows" :key="`${idPrefix}-copy-row-${row.id}`" class="cross-copy-row">
        <div class="cross-copy-row-head">
          <div class="cross-copy-row-title">
            <span class="cross-copy-status-badge" :class="statusBadgeClass(row.status)">{{ statusLabel(row.status) }}</span>
            <strong :title="row.source_entry.name || `条目 ${row.source_entry.uid}`">{{ row.source_entry.name || `条目 ${row.source_entry.uid}` }}</strong>
          </div>
          <BaseCheckbox :model-value="row.selected" class="checkbox-inline" :disabled="row.status === 'invalid_same_source_target' || applyLoading" @update:model-value="$emit('set-selected', row.id, $event)">选中</BaseCheckbox>
        </div>
        <div class="cross-copy-row-note">{{ row.note || rowDiffSummary(row) }}</div>
        <div class="cross-copy-row-actions">
          <BaseSelect :aria-label="`${row.source_entry.name || `条目 ${row.source_entry.uid}`} 操作`" :model-value="row.action" :options="actionOptions" :disabled="!row.selected || row.status === 'invalid_same_source_target' || applyLoading" @update:model-value="value => updateAction(row.id, value)" />
          <BaseInput v-if="row.action === 'rename_create'" :model-value="row.rename_name" class="text-input" placeholder="输入新名称（自动去重）" :disabled="!row.selected || applyLoading" @update:model-value="$emit('set-rename-name', row.id, $event)" @blur="$emit('rename-blur', row.id)" />
        </div>
        <BaseButton class="btn mini cross-copy-detail-trigger" size="sm" @click="$emit('open-detail', row.id)">▷ 查看对比明细</BaseButton>
      </article>
      <div v-if="!rows.length" class="empty-note">当前筛选下无条目</div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import type { CrossCopyAction, CrossCopyRow, CrossCopyRowStatus, CrossCopyStatusFilter } from '../domain/types';
import BaseButton from './controls/BaseButton.vue';
import BaseCheckbox from './controls/BaseCheckbox.vue';
import BaseInput from './controls/BaseInput.vue';
import BaseSelect from './controls/BaseSelect.vue';
const props = defineProps<{ rows: CrossCopyRow[]; selectedCount: number; statusFilter: CrossCopyStatusFilter; statusPriority: CrossCopyRowStatus[]; statusCounts: Record<CrossCopyRowStatus, number>; applyLoading: boolean; idPrefix: string; mobile?: boolean; statusLabel: (status: CrossCopyRowStatus) => string; actionLabel: (action: CrossCopyAction) => string; statusBadgeClass: (status: CrossCopyRowStatus) => string; rowDiffSummary: (row: CrossCopyRow) => string }>();
const emit = defineEmits<{ 'update:status-filter': [value: CrossCopyStatusFilter]; 'set-selected': [id: string, selected: boolean]; 'set-action': [id: string, action: CrossCopyAction]; 'set-rename-name': [id: string, value: string]; 'rename-blur': [id: string]; 'open-detail': [id: string] }>();
const statusOptions = computed(() => [{ value: 'all', label: '全部状态' }, ...props.statusPriority.map(status => ({ value: status, label: `${props.statusLabel(status)} (${props.statusCounts[status] ?? 0})` }))]);
const actions: CrossCopyAction[] = ['skip', 'overwrite', 'create', 'rename_create'];
const actionOptions = computed(() => actions.map(action => ({ value: action, label: props.actionLabel(action) })));
function updateStatusFilter(value: string | number | null): void { emit('update:status-filter', String(value) as CrossCopyStatusFilter); }
function updateAction(id: string, value: string | number | null): void { emit('set-action', id, String(value) as CrossCopyAction); }
</script>
