<template>
  <div :class="mobile ? 'cross-copy-mobile-bulk' : 'cross-copy-actions'">
    <button class="btn mini" type="button" :disabled="!hasRows" @click="$emit('select-all', false)">全不选</button>
    <button class="btn mini" type="button" :disabled="!selectedCount" @click="$emit('apply-status-action', 'same_name_changed', 'overwrite')">同名更新→覆盖</button>
    <button class="btn mini" type="button" :disabled="!selectedCount" @click="$emit('apply-status-action', 'duplicate_exact', 'skip')">同名同内容→跳过</button>
    <button class="btn mini" type="button" :disabled="!selectedCount" @click="$emit('apply-status-action', 'content_duplicate_other_name', 'skip')">异名同内容→跳过</button>
    <div class="cross-copy-bulk-box">
      <select
        :value="bulkAction"
        class="text-input"
        @change="$emit('update:bulk-action', ($event.target as HTMLSelectElement).value)"
      >
        <option value="skip">{{ actionLabel('skip') }}</option>
        <option value="overwrite">{{ actionLabel('overwrite') }}</option>
        <option value="create">{{ actionLabel('create') }}</option>
        <option value="rename_create">{{ actionLabel('rename_create') }}</option>
      </select>
      <button class="btn mini" type="button" :disabled="!selectedCount" @click="$emit('apply-bulk-action')">应用到已选</button>
    </div>
    <button v-if="!mobile" class="btn primary" type="button" :disabled="!canApply" @click="$emit('apply-selection')">
      {{ applyLoading ? '执行中...' : `执行复制（${selectedCount}）` }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { CrossCopyAction, CrossCopyRowStatus } from '../domain/types';

defineProps<{
  hasRows: boolean;
  selectedCount: number;
  bulkAction: CrossCopyAction;
  canApply: boolean;
  applyLoading: boolean;
  mobile?: boolean;
  actionLabel: (action: CrossCopyAction) => string;
}>();

defineEmits<{
  'select-all': [selected: boolean];
  'apply-status-action': [status: CrossCopyRowStatus, action: CrossCopyAction];
  'update:bulk-action': [value: CrossCopyAction];
  'apply-bulk-action': [];
  'apply-selection': [];
}>();
</script>
