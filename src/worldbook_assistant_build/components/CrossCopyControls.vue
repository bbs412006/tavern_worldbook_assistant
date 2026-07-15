<template>
  <div class="cross-copy-controls-wrap">
    <div class="cross-copy-controls" :class="{ 'cross-copy-controls-primary': !mobile }">
      <label class="field">
        <span>来源世界书</span>
        <BaseSelect :model-value="sourceWorldbook" :options="worldbookOptions" placeholder="请选择来源世界书" @update:model-value="updateSource" />
      </label>
      <label class="field">
        <span>目标世界书</span>
        <BaseSelect :model-value="targetWorldbook" :options="worldbookOptions" placeholder="请选择目标世界书" @update:model-value="updateTarget" />
      </label>
      <div class="cross-copy-control-actions">
        <BaseButton class="btn" :disabled="!canCompare || compareLoading || applyLoading" :loading="compareLoading" @click="$emit('refresh')">
          {{ compareLoading ? '比较中...' : '刷新比较' }}
        </BaseButton>
      </div>
    </div>

    <BaseButton v-if="mobile" class="btn mini utility-btn cross-copy-mobile-advanced-toggle" size="sm" @click="$emit('toggle-collapsed')">
      {{ controlsCollapsed ? '展开高级项' : '收起高级项' }}
    </BaseButton>

    <Transition name="copy-controls-advanced">
      <div v-if="!controlsCollapsed" :class="mobile ? 'cross-copy-mobile-advanced' : 'cross-copy-controls cross-copy-controls-advanced'">
        <BaseCheckbox :model-value="useDraftSourceWhenCurrent" class="checkbox-inline" :disabled="!sourceIsCurrentWorldbook" @update:model-value="$emit('update:use-draft-source-when-current', $event)">
          {{ sourceVersionLabel }}
        </BaseCheckbox>
        <BaseCheckbox :model-value="snapshotBeforeApply" class="checkbox-inline" @update:model-value="$emit('update:snapshot-before-apply', $event)">
          {{ mobile ? '执行前写入目标快照（默认开启）' : '执行前写入目标快照' }}
        </BaseCheckbox>
      </div>
    </Transition>

    <div v-if="controlsCollapsed" class="cross-copy-inline-tip">
      {{ sourceVersionLabel }} | {{ snapshotBeforeApply ? '执行前写入快照' : '不写入快照' }}
    </div>
    <div v-if="!mobile" class="cross-copy-inline-tips">
      <div v-if="sourceTargetInvalid" class="cross-copy-inline-tip warning">来源和目标不能相同。</div>
      <div v-if="compareSummary" class="cross-copy-inline-tip">{{ compareSummary }}</div>
      <div v-if="lastResultSummary" class="cross-copy-inline-tip success">{{ lastResultSummary }}</div>
    </div>
    <div v-else-if="compareSummary" class="cross-copy-inline-tip">{{ compareSummary }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BaseButton from './controls/BaseButton.vue';
import BaseCheckbox from './controls/BaseCheckbox.vue';
import BaseSelect from './controls/BaseSelect.vue';

const props = defineProps<{
  worldbookNames: string[]; sourceWorldbook: string; targetWorldbook: string; canCompare: boolean;
  compareLoading: boolean; applyLoading: boolean; controlsCollapsed: boolean; useDraftSourceWhenCurrent: boolean;
  sourceIsCurrentWorldbook: boolean; sourceVersionLabel: string; snapshotBeforeApply: boolean; sourceTargetInvalid: boolean;
  compareSummary: string; lastResultSummary: string; idPrefix: string; mobile?: boolean;
}>();
const emit = defineEmits<{
  'update:source-worldbook': [value: string]; 'update:target-worldbook': [value: string];
  'update:use-draft-source-when-current': [value: boolean]; 'update:snapshot-before-apply': [value: boolean];
  refresh: []; 'toggle-collapsed': [];
}>();
const worldbookOptions = computed(() => props.worldbookNames.map(name => ({ value: name, label: name })));
function updateSource(value: string | number | null): void { emit('update:source-worldbook', String(value ?? '')); }
function updateTarget(value: string | number | null): void { emit('update:target-worldbook', String(value ?? '')); }
</script>
