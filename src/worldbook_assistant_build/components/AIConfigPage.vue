<template>
  <section class="utility-page ai-config-page">
    <header class="utility-page-header">
      <BaseButton
        v-if="stage !== 'generating'"
        class="utility-page-back"
        @click="$emit(stage === 'preview' ? 'back-to-input' : 'back')"
      >
        ← 返回
      </BaseButton>
      <span v-else class="utility-page-back-placeholder" aria-hidden="true"></span>
      <h2 class="utility-page-title">{{ stage === 'preview' ? '📋 配置变更预览' : '🔧 AI 配置世界书' }}</h2>
    </header>

    <div v-if="stage === 'input'" class="utility-page-body utility-page-scroll ai-config-input-stage">
      <label class="field">
        <span>目标世界书</span>
        <BaseSelect
          :model-value="targetWorldbook"
          :options="worldbookOptions"
          @update:model-value="$emit('update:targetWorldbook', String($event ?? ''))"
        />
      </label>

      <label class="field">
        <span>配置指令（自然语言描述）</span>
        <BaseTextarea
          :model-value="input"
          rows="8"
          placeholder="例如：
将以下条目设为蓝灯常驻，位置设为角色定义前：
- 世界观设定（顺序1）
- 角色速览（顺序2）

所有条目启用不可递归和防止进一步递归"
          @update:model-value="$emit('update:input', $event)"
        />
      </label>

      <details class="custom-prompt-section">
        <summary>📝 查看/修改系统提示词</summary>
        <div class="custom-prompt-content">
          <BaseTextarea
            :model-value="customPrompt"
            class="custom-prompt-input"
            rows="10"
            :placeholder="'留空则使用默认提示词。\n当前默认提示词会在选择世界书后自动填入条目名。'"
            @update:model-value="$emit('update:customPrompt', $event)"
          />
          <div class="utility-actions">
            <BaseButton class="reset-prompt-action" @click="$emit('update:customPrompt', '')">🔄 恢复默认</BaseButton>
            <BaseButton class="load-default-prompt-action" @click="$emit('load-default-config-prompt')">
              📋 加载默认提示词
            </BaseButton>
          </div>
        </div>
      </details>

      <BaseButton
        class="generate-action"
        variant="primary"
        size="lg"
        :disabled="!input.trim() || !targetWorldbook || generating"
        @click="$emit('generate')"
      >
        🤖 发送给 AI 分析
      </BaseButton>
    </div>

    <div v-else-if="stage === 'generating'" class="utility-page-body utility-page-scroll generating-stage" aria-live="polite">
      <div class="generating-icon">⏳</div>
      <div>AI 正在分析配置指令...</div>
    </div>

    <div v-else class="utility-page-body utility-page-scroll preview-stage">
      <div class="preview-table-wrap">
        <table class="preview-table">
          <thead>
            <tr>
              <th class="selection-column"></th>
              <th>条目</th>
              <th>设置项</th>
              <th>旧值</th>
              <th class="arrow-column">→</th>
              <th>新值</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="change in changes" :key="getConfigChangeKey(change)" :class="{ unselected: !change.selected }">
              <td>
                <BaseCheckbox
                  :model-value="change.selected"
                  :aria-label="`选择 ${change.name} ${change.label}`"
                  @update:model-value="change.selected = $event"
                />
              </td>
              <td class="entry-name">{{ change.name }}</td>
              <td>{{ change.label }}</td>
              <td class="old-value">{{ change.oldValue }}</td>
              <td class="arrow-column">→</td>
              <td class="new-value">{{ change.newValue }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="utility-actions preview-actions">
        <BaseButton class="select-all" @click="changes.forEach(change => change.selected = true)">全选</BaseButton>
        <BaseButton class="select-none" @click="changes.forEach(change => change.selected = false)">全不选</BaseButton>
        <BaseButton
          class="apply-action"
          variant="primary"
          size="lg"
          :disabled="!changes.some(change => change.selected)"
          @click="$emit('apply')"
        >
          应用选中变更（{{ changes.filter(change => change.selected).length }}）
        </BaseButton>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import BaseButton from './controls/BaseButton.vue';
import BaseCheckbox from './controls/BaseCheckbox.vue';
import BaseSelect, { type BaseSelectOption } from './controls/BaseSelect.vue';
import BaseTextarea from './controls/BaseTextarea.vue';

const props = defineProps<{
  worldbookNames: string[];
  targetWorldbook: string;
  input: string;
  customPrompt: string;
  changes: any[];
  preview: boolean;
  generating: boolean;
}>();

const stage = computed<'input' | 'generating' | 'preview'>(() => {
  if (props.generating) return 'generating';
  if (props.preview) return 'preview';
  return 'input';
});
const worldbookOptions = computed<BaseSelectOption[]>(() => [
  { value: '', label: '请选择' },
  ...props.worldbookNames.map(name => ({ value: name, label: name })),
]);

function getConfigChangeKey(change: { name: string; field: string }): string {
  return `${change.name}\u0000${change.field}`;
}

defineEmits<{
  back: [];
  'back-to-input': [];
  'update:targetWorldbook': [value: string];
  'update:input': [value: string];
  'update:customPrompt': [value: string];
  'load-default-config-prompt': [];
  generate: [];
  apply: [];
}>();
</script>

<style scoped>
.utility-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  color: var(--wb-text-main, #e2e8f0);
  background: var(--wb-bg-root, #0f172a);
}

.utility-page-header {
  display: grid;
  grid-template-columns: minmax(88px, 1fr) auto minmax(88px, 1fr);
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
  padding: 12px 16px;
  border-bottom: 1px solid var(--wb-border-subtle, #334155);
  background: var(--wb-bg-panel, #111827);
}

.utility-page-back { justify-self: start; }
.utility-page-back-placeholder { min-width: 88px; }
.utility-page-title { margin: 0; font-size: 16px; white-space: nowrap; }
.utility-page-body {
  box-sizing: border-box;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  width: min(100%, 900px);
  margin: 0 auto;
  padding: 18px;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.ai-config-input-stage { display: flex; flex-direction: column; gap: 14px; }
.custom-prompt-section summary { cursor: pointer; color: var(--wb-text-muted, #94a3b8); font-size: 12px; user-select: none; }
.custom-prompt-content { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
.custom-prompt-input { font-family: monospace; font-size: 12px; }
.utility-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.generate-action { width: 100%; margin-top: 4px; }
.generating-stage { display: grid; place-content: center; text-align: center; }
.generating-icon { margin-bottom: 12px; font-size: 28px; }
.preview-stage { display: flex; flex-direction: column; gap: 14px; }
.preview-table-wrap {
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  border: 1px solid var(--wb-border-subtle, #334155);
  border-radius: 8px;
}
.preview-table { width: 100%; min-width: 650px; border-collapse: collapse; font-size: 13px; }
.preview-table th, .preview-table td { padding: 8px; border-bottom: 1px solid var(--wb-border-subtle, #334155); text-align: left; }
.preview-table tbody tr:last-child td { border-bottom: 0; }
.preview-table tr.unselected { opacity: 0.4; }
.selection-column { width: 34px; }
.arrow-column { width: 34px; text-align: center !important; }
.entry-name { font-weight: 600; }
.old-value { color: #ef4444; }
.new-value { color: #22c55e; }
.preview-actions { justify-content: flex-end; }
.apply-action { margin-left: auto; }

@media (max-width: 640px) {
  .utility-page-header { grid-template-columns: auto 1fr; padding: 10px 12px; }
  .utility-page-title { justify-self: end; font-size: 14px; }
  .utility-page-back-placeholder { min-width: 72px; }
  .utility-page-body { padding: 12px; }
  .utility-actions .wb-control-button { min-height: 40px; }
  .preview-actions { justify-content: stretch; }
  .preview-actions .wb-control-button { flex: 1 1 auto; }
  .apply-action { flex-basis: 100% !important; margin-left: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .utility-page,
  .utility-page * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
