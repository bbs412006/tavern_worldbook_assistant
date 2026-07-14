<template>
  <!-- eslint-disable vue/no-mutating-props -- preserves the existing in-place draft contract -->
  <div class="editor-panel-root">
    <template v-if="selectedEntry">
      <header class="editor-head">
        <label class="field editor-comment">
          <span>备注 (COMMENT)</span>
          <BaseInput v-model="selectedEntry.name" class="text-input" tabindex="-1" />
        </label>
        <div class="editor-badges">
          <span class="editor-badge" :class="selectedEntry.enabled ? 'on' : 'off'">{{ selectedEntry.enabled ? 'EN' : 'OFF' }}</span>
          <span class="editor-badge mono">#{{ selectedEntry.uid }}</span>
        </div>
      </header>

      <section class="editor-grid two-cols editor-keyword-grid">
        <label class="field">
          <span>主要关键词 (KEYS)</span>
          <BaseTextarea v-model="keysRaw" class="text-area compact" :min-rows="3" @blur="commitKeys" />
        </label>
        <label class="field">
          <span>次要关键词 (SECONDARY)</span>
          <BaseTextarea v-model="secondaryKeysRaw" class="text-area compact" :min-rows="3" @blur="commitSecondaryKeys" />
        </label>
      </section>

      <section ref="contentBlockRef" class="editor-content-block">
        <div class="editor-content-title">世界观设定 / 内容 (CONTENT)</div>
        <BaseTextarea v-model="selectedEntry.content" class="text-area large editor-content-area" :disabled="multiSelectMode" :min-rows="6" />
      </section>

      <section class="editor-strategy-section">
        <div class="strategy-switch">
          <BaseButton variant="ghost" size="sm" class="strategy-pill constant" :class="{ active: selectedEntry.strategy.type === 'constant' }" :aria-pressed="selectedEntry.strategy.type === 'constant'" @click="selectedEntry.strategy.type = 'constant'">🔵 常驻</BaseButton>
          <BaseButton variant="ghost" size="sm" class="strategy-pill vector" :class="{ active: selectedEntry.strategy.type === 'vectorized' }" :aria-pressed="selectedEntry.strategy.type === 'vectorized'" @click="selectedEntry.strategy.type = 'vectorized'">📎 向量化</BaseButton>
          <BaseButton variant="ghost" size="sm" class="strategy-pill selective" :class="{ active: selectedEntry.strategy.type === 'selective' }" :aria-pressed="selectedEntry.strategy.type === 'selective'" @click="selectedEntry.strategy.type = 'selective'">🟢 关键词</BaseButton>
        </div>
      </section>
    </template>
    <div v-else class="empty-block">请在列表中选择一个条目</div>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable vue/no-mutating-props -- this editor intentionally preserves the existing in-place draft contract */
import { ref, watch } from 'vue';
import BaseButton from './controls/BaseButton.vue';
import BaseInput from './controls/BaseInput.vue';
import BaseTextarea from './controls/BaseTextarea.vue';

const props = defineProps<{
  selectedEntry: any;
  multiSelectMode?: boolean;
}>();

defineEmits<{
  'update:selectedEntry': [entry: any];
}>();

const keysRaw = ref('');
const secondaryKeysRaw = ref('');
const contentBlockRef = ref<HTMLElement>();

watch(() => props.selectedEntry?.uid, () => {
  if (props.selectedEntry) {
    keysRaw.value = (props.selectedEntry.strategy?.keys || []).join(', ');
    secondaryKeysRaw.value = (props.selectedEntry.strategy?.keys_secondary?.keys || []).join(', ');
  }
}, { immediate: true });

function commitKeys() {
  if (!props.selectedEntry) return;
  props.selectedEntry.strategy.keys = keysRaw.value.split(',').map((s: string) => s.trim()).filter(Boolean);
}

function commitSecondaryKeys() {
  if (!props.selectedEntry) return;
  props.selectedEntry.strategy.keys_secondary.keys = secondaryKeysRaw.value.split(',').map((s: string) => s.trim()).filter(Boolean);
}
</script>
