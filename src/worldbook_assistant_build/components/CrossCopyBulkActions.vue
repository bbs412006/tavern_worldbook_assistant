<template>
  <div :class="mobile ? 'cross-copy-mobile-bulk' : 'cross-copy-actions'">
    <BaseButton class="btn mini" size="sm" :disabled="!hasRows" @click="$emit('select-all', false)">全不选</BaseButton>
    <BaseButton class="btn mini" size="sm" :disabled="!selectedCount" @click="$emit('apply-status-action', 'same_name_changed', 'overwrite')">同名更新→覆盖</BaseButton>
    <BaseButton class="btn mini" size="sm" :disabled="!selectedCount" @click="$emit('apply-status-action', 'duplicate_exact', 'skip')">同名同内容→跳过</BaseButton>
    <BaseButton class="btn mini" size="sm" :disabled="!selectedCount" @click="$emit('apply-status-action', 'content_duplicate_other_name', 'skip')">异名同内容→跳过</BaseButton>
    <div class="cross-copy-bulk-box">
      <BaseSelect aria-label="批量动作" :model-value="bulkAction" :options="actionOptions" size="sm" @update:model-value="updateBulkAction" />
      <BaseButton class="btn mini" size="sm" :disabled="!selectedCount" @click="$emit('apply-bulk-action')">应用到已选</BaseButton>
    </div>
    <BaseButton v-if="!mobile" class="btn primary" variant="primary" :disabled="!canApply" :loading="applyLoading" @click="$emit('apply-selection')">{{ applyLoading ? '执行中...' : `执行复制（${selectedCount}）` }}</BaseButton>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import type { CrossCopyAction, CrossCopyRowStatus } from '../domain/types';
import BaseButton from './controls/BaseButton.vue';
import BaseSelect from './controls/BaseSelect.vue';
const props = defineProps<{ hasRows: boolean; selectedCount: number; bulkAction: CrossCopyAction; canApply: boolean; applyLoading: boolean; mobile?: boolean; actionLabel: (action: CrossCopyAction) => string }>();
const emit = defineEmits<{ 'select-all': [selected: boolean]; 'apply-status-action': [status: CrossCopyRowStatus, action: CrossCopyAction]; 'update:bulk-action': [value: CrossCopyAction]; 'apply-bulk-action': []; 'apply-selection': [] }>();
const actions: CrossCopyAction[] = ['skip', 'overwrite', 'create', 'rename_create'];
const actionOptions = computed(() => actions.map(action => ({ value: action, label: props.actionLabel(action) })));
function updateBulkAction(value: string | number | null): void { emit('update:bulk-action', String(value) as CrossCopyAction); }
</script>
