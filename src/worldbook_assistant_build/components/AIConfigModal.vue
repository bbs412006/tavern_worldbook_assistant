<template>
  <Teleport :to="teleportTarget">
  <template v-if="showInput && !preview && !generating">
    <div
      class="ai-tag-review-overlay"
      @pointerdown="shieldModalHostEvent"
      @mousedown="shieldModalHostEvent"
      @touchstart="shieldModalHostEvent"
      @click.self="$emit('close-input')"
    >
      <div class="ai-tag-review-modal" style="max-width:600px;">
        <div class="ai-tag-review-head">
          <span class="ai-tag-review-title">🔧 AI 配置世界书</span>
          <button class="ai-tag-review-close" type="button" @click="$emit('close-input')">×</button>
        </div>
        <div style="padding:16px;display:flex;flex-direction:column;gap:12px;overflow-y:auto;max-height:60vh;">
          <label class="field">
            <span>目标世界书</span>
            <select :value="targetWorldbook" class="text-input" @change="$emit('update:targetWorldbook', ($event.target as HTMLSelectElement).value)">
              <option value="">请选择</option>
              <option v-for="name in worldbookNames" :key="`cfg-wb-${name}`" :value="name">{{ name }}</option>
            </select>
          </label>
          <label class="field">
            <span>配置指令（自然语言描述）</span>
            <textarea
              :value="input"
              class="text-input"
              rows="8"
              placeholder="例如：
将以下条目设为蓝灯常驻，位置设为角色定义前：
- 世界观设定（顺序1）
- 角色速览（顺序2）

所有条目启用不可递归和防止进一步递归"
              @input="$emit('update:input', ($event.target as HTMLTextAreaElement).value)"
            ></textarea>
          </label>
          <details style="margin-top:4px;">
            <summary style="cursor:pointer;color:var(--wb-text-dim);font-size:12px;user-select:none;">📝 查看/修改系统提示词</summary>
            <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px;">
              <textarea
                :value="customPrompt"
                class="text-input"
                rows="10"
                :placeholder="'留空则使用默认提示词。\n当前默认提示词会在选择世界书后自动填入条目名。'"
                style="font-size:12px;font-family:monospace;"
                @input="$emit('update:customPrompt', ($event.target as HTMLTextAreaElement).value)"
              ></textarea>
              <div style="display:flex;gap:6px;">
                <button class="btn" type="button" style="font-size:12px;" @click="$emit('update:customPrompt', '')">🔄 恢复默认</button>
                <button class="btn" type="button" style="font-size:12px;" @click="$emit('load-default-config-prompt')">📋 加载默认提示词</button>
              </div>
            </div>
          </details>
          <button class="btn primary" type="button" :disabled="!input.trim() || !targetWorldbook || generating" style="width:100%;margin-top:8px;" @click="$emit('generate')">
            {{ generating ? '⏳ AI 分析中...' : '🤖 发送给 AI 分析' }}
          </button>
        </div>
      </div>
    </div>
  </template>

  <div
    v-if="generating"
    class="ai-tag-review-overlay"
    @pointerdown="shieldModalHostEvent"
    @mousedown="shieldModalHostEvent"
    @touchstart="shieldModalHostEvent"
  >
    <div class="ai-tag-review-modal" style="max-width:400px;text-align:center;padding:40px;">
      <div style="font-size:24px;margin-bottom:12px;">⏳</div>
      <div style="color:var(--wb-text-main);">AI 正在分析配置指令...</div>
    </div>
  </div>

  <div
    v-if="preview"
    class="ai-tag-review-overlay"
    @pointerdown="shieldModalHostEvent"
    @mousedown="shieldModalHostEvent"
    @touchstart="shieldModalHostEvent"
    @click.self="$emit('close-preview')"
  >
    <div class="ai-tag-review-modal" style="max-width:700px;">
      <div class="ai-tag-review-head">
        <span class="ai-tag-review-title">📋 配置变更预览</span>
        <button class="ai-tag-review-close" type="button" @click="$emit('close-preview')">×</button>
      </div>
      <div style="padding:16px;overflow-y:auto;max-height:55vh;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="border-bottom:1px solid var(--wb-border);">
              <th style="width:30px;padding:6px;"></th>
              <th style="text-align:left;padding:6px;">条目</th>
              <th style="text-align:left;padding:6px;">设置项</th>
              <th style="text-align:left;padding:6px;">旧值</th>
              <th style="text-align:center;padding:6px;">→</th>
              <th style="text-align:left;padding:6px;">新值</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(c, i) in changes" :key="i" style="border-bottom:1px solid var(--wb-border);" :style="{ opacity: c.selected ? 1 : 0.4 }">
              <td style="padding:6px;"><input v-model="c.selected" type="checkbox" /></td>
              <td style="padding:6px;font-weight:600;">{{ c.name }}</td>
              <td style="padding:6px;">{{ c.label }}</td>
              <td style="padding:6px;color:#ef4444;">{{ c.oldValue }}</td>
              <td style="padding:6px;text-align:center;">→</td>
              <td style="padding:6px;color:#22c55e;">{{ c.newValue }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="ai-tag-review-actions">
        <button class="btn" type="button" @click="changes.forEach(c => c.selected = true)">全选</button>
        <button class="btn" type="button" @click="changes.forEach(c => c.selected = false)">全不选</button>
        <button class="btn primary" type="button" :disabled="!changes.some(c => c.selected)" @click="$emit('apply')">
          应用选中变更（{{ changes.filter(c => c.selected).length }}）
        </button>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import './modal-shared.css';
import { shieldModalHostEvent } from '../host/modalHost';

defineProps<{
  teleportTarget: HTMLElement | string;
  showInput: boolean;
  worldbookNames: string[];
  targetWorldbook: string;
  input: string;
  customPrompt: string;
  changes: any[];
  preview: boolean;
  generating: boolean;
}>();

defineEmits<{
  'update:targetWorldbook': [value: string];
  'update:input': [value: string];
  'update:customPrompt': [value: string];
  'close-input': [];
  'close-preview': [];
  'load-default-config-prompt': [];
  generate: [];
  apply: [];
}>();
</script>
