<template>
  <section class="cross-copy-panel desktop">
    <div class="cross-copy-head">
      <div class="cross-copy-head-main"><strong>📚 跨世界书复制条目</strong><span>{{ workspaceSummary }}</span></div>
      <div class="cross-copy-head-actions">
        <span>{{ comparedText }}</span>
        <BaseButton class="btn mini utility-btn" size="sm" @click="$emit('toggle-controls-collapsed')">{{ controlsCollapsed ? '展开高级项' : '收起高级项' }}</BaseButton>
        <BaseButton class="btn mini utility-btn" size="sm" :disabled="cineLocked" @click="$emit('exit')">退出模式</BaseButton>
        <div class="copy-cine-sink-cluster" aria-hidden="true">
          <span class="copy-cine-sink" data-copy-sink="focus_toggle"></span><span class="copy-cine-sink" data-copy-sink="save_btn"></span><span class="copy-cine-sink" data-copy-sink="more_btn"></span><span class="copy-cine-sink" data-copy-sink="tools_btn"></span><span class="copy-cine-sink" data-copy-sink="tool_global"></span><span class="copy-cine-sink" data-copy-sink="tool_entry_history"></span><span class="copy-cine-sink" data-copy-sink="tool_worldbook_history"></span><span class="copy-cine-sink" data-copy-sink="tool_activation"></span><span class="copy-cine-sink" data-copy-sink="tool_ai_generate"></span><span class="copy-cine-sink" data-copy-sink="tool_extract"></span><span class="copy-cine-sink" data-copy-sink="tool_tag"></span><span class="copy-cine-sink" data-copy-sink="tool_copy"></span><span class="copy-cine-sink" data-copy-sink="tool_settings"></span><span class="copy-cine-sink" data-copy-sink="tool_ai_config"></span>
        </div>
      </div>
    </div>
    <slot></slot>
  </section>
</template>
<script setup lang="ts">
import BaseButton from './controls/BaseButton.vue';
defineProps<{ workspaceSummary: string; comparedText: string; controlsCollapsed: boolean; cineLocked: boolean }>();
defineEmits<{ 'toggle-controls-collapsed': []; exit: [] }>();
</script>
