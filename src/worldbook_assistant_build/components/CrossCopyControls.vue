<template>
  <div class="cross-copy-controls-wrap">
    <div class="cross-copy-controls" :class="{ 'cross-copy-controls-primary': !mobile }">
      <label class="field">
        <span>来源世界书</span>
        <select :value="sourceWorldbook" class="text-input" @change="$emit('update:source-worldbook', ($event.target as HTMLSelectElement).value)">
          <option value="">请选择来源世界书</option>
          <option v-for="name in worldbookNames" :key="`${idPrefix}-copy-source-${name}`" :value="name">{{ name }}</option>
        </select>
      </label>
      <label class="field">
        <span>目标世界书</span>
        <select :value="targetWorldbook" class="text-input" @change="$emit('update:target-worldbook', ($event.target as HTMLSelectElement).value)">
          <option value="">请选择目标世界书</option>
          <option v-for="name in worldbookNames" :key="`${idPrefix}-copy-target-${name}`" :value="name">{{ name }}</option>
        </select>
      </label>
      <div class="cross-copy-control-actions">
        <button class="btn" type="button" :disabled="!canCompare || compareLoading || applyLoading" @click="$emit('refresh')">
          {{ compareLoading ? '比较中...' : '刷新比较' }}
        </button>
      </div>
    </div>

    <button v-if="mobile" class="btn mini utility-btn cross-copy-mobile-advanced-toggle" type="button" @click="$emit('toggle-collapsed')">
      {{ controlsCollapsed ? '展开高级项' : '收起高级项' }}
    </button>

    <Transition name="copy-controls-advanced">
      <div v-if="!controlsCollapsed" :class="mobile ? 'cross-copy-mobile-advanced' : 'cross-copy-controls cross-copy-controls-advanced'">
        <label class="checkbox-inline">
          <input
            :checked="useDraftSourceWhenCurrent"
            type="checkbox"
            :disabled="!sourceIsCurrentWorldbook"
            @change="$emit('update:use-draft-source-when-current', ($event.target as HTMLInputElement).checked)"
          />
          <span>{{ sourceVersionLabel }}</span>
        </label>
        <label class="checkbox-inline">
          <input
            :checked="snapshotBeforeApply"
            type="checkbox"
            @change="$emit('update:snapshot-before-apply', ($event.target as HTMLInputElement).checked)"
          />
          <span>{{ mobile ? '执行前写入目标快照（默认开启）' : '执行前写入目标快照' }}</span>
        </label>
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
defineProps<{
  worldbookNames: string[];
  sourceWorldbook: string;
  targetWorldbook: string;
  canCompare: boolean;
  compareLoading: boolean;
  applyLoading: boolean;
  controlsCollapsed: boolean;
  useDraftSourceWhenCurrent: boolean;
  sourceIsCurrentWorldbook: boolean;
  sourceVersionLabel: string;
  snapshotBeforeApply: boolean;
  sourceTargetInvalid: boolean;
  compareSummary: string;
  lastResultSummary: string;
  idPrefix: string;
  mobile?: boolean;
}>();

defineEmits<{
  'update:source-worldbook': [value: string];
  'update:target-worldbook': [value: string];
  'update:use-draft-source-when-current': [value: boolean];
  'update:snapshot-before-apply': [value: boolean];
  refresh: [];
  'toggle-collapsed': [];
}>();
</script>
