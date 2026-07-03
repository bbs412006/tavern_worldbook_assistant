<template>
  <div class="editor-panel-root">
    <template v-if="selectedEntry">
      <header class="editor-head">
        <label class="field editor-comment">
          <span>备注 (COMMENT)</span>
          <input v-model="selectedEntry.name" type="text" class="text-input" tabindex="-1" />
        </label>
        <div class="editor-badges">
          <span class="editor-badge" :class="selectedEntry.enabled ? 'on' : 'off'">{{ selectedEntry.enabled ? 'EN' : 'OFF' }}</span>
          <span class="editor-badge mono">#{{ selectedEntry.uid }}</span>
        </div>
      </header>

      <section class="editor-grid two-cols editor-keyword-grid">
        <label class="field">
          <span>主要关键词 (KEYS)</span>
          <textarea :value="keysRaw" @input="keysRaw = ($event.target as HTMLTextAreaElement).value" @blur="commitKeys" class="text-area compact"></textarea>
        </label>
        <label class="field">
          <span>次要关键词 (SECONDARY)</span>
          <textarea :value="secondaryKeysRaw" @input="secondaryKeysRaw = ($event.target as HTMLTextAreaElement).value" @blur="commitSecondaryKeys" class="text-area compact"></textarea>
        </label>
      </section>

      <section class="editor-content-block" ref="contentBlockRef">
        <div class="editor-content-title">世界观设定 / 内容 (CONTENT)</div>
        <textarea v-model="selectedEntry.content" class="text-area large editor-content-area" :disabled="multiSelectMode"></textarea>
      </section>

      <section class="editor-strategy-section">
        <div class="strategy-switch">
          <button type="button" class="strategy-pill constant" :class="{ active: selectedEntry.strategy.type === 'constant' }" @click="selectedEntry.strategy.type = 'constant'">🔵 常驻</button>
          <button type="button" class="strategy-pill vector" :class="{ active: selectedEntry.strategy.type === 'vectorized' }" @click="selectedEntry.strategy.type = 'vectorized'">📎 向量化</button>
          <button type="button" class="strategy-pill selective" :class="{ active: selectedEntry.strategy.type === 'selective' }" @click="selectedEntry.strategy.type = 'selective'">🟢 关键词</button>
        </div>
      </section>
    </template>
    <div v-else class="empty-block">请在列表中选择一个条目</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  selectedEntry: any;
  multiSelectMode?: boolean;
}>();

const emit = defineEmits<{
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
