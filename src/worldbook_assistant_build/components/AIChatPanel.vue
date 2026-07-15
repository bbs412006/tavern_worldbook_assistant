<template>
  <section class="ai-generator-panel" :class="{ 'mobile-ai-panel': isMobile }">
    <div class="ai-chat-area">
      <div v-if="!activeSession" class="ai-chat-empty">
        <div class="ai-chat-empty-icon">🤖</div><div class="ai-chat-empty-text">{{ emptyText }}</div>
        <template v-if="showEmptyActions">
          <BaseButton class="btn" @click="$emit('create-session')">+ 新建对话</BaseButton>
          <BaseButton class="btn" style="margin-top:6px;" @click="$emit('extract-from-chat')">📥 从聊天提取世界书</BaseButton>
        </template>
      </div>
      <template v-else>
        <div class="ai-chat-messages">
          <div v-for="(msg, idx) in messages" :key="`msg-${idx}`" class="ai-chat-bubble" :class="msg.role"><div class="ai-chat-bubble-role">{{ msg.role === 'user' ? '👤 你' : '🤖 AI' }}</div><div class="ai-chat-bubble-content">{{ msg.content }}</div></div>
          <div v-if="isGenerating && streamingText" class="ai-chat-bubble assistant streaming"><div class="ai-chat-bubble-role">🤖 AI</div><div class="ai-chat-bubble-content">{{ streamingText }}<span class="ai-cursor">▌</span></div></div>
          <div v-if="isGenerating && !streamingText" class="ai-chat-bubble assistant streaming"><div class="ai-chat-bubble-role">🤖 AI</div><div class="ai-chat-bubble-content"><span class="ai-thinking">思考中...</span></div></div>
        </div>
        <div class="ai-chat-input-bar">
          <BaseSwitch :model-value="useContext" class="ai-context-toggle" title="开启后，AI 将能看到酒馆的预设、世界书和正则上下文" @update:model-value="$emit('update:use-context', $event)">{{ useContext ? '📖 附带上下文' : '🔒 纯净模式' }}</BaseSwitch>
          <BaseTextarea :model-value="input" class="text-input ai-chat-input" placeholder="输入提示词..." :min-rows="2" :disabled="isGenerating" @update:model-value="$emit('update:input', $event)" @keydown.enter.exact.prevent="$emit('send')" />
          <BaseButton v-if="!isGenerating" class="btn ai-send-btn" :disabled="!input.trim()" @click="$emit('send')">发送</BaseButton>
          <BaseButton v-else class="btn danger ai-stop-btn" variant="danger" @click="$emit('stop-generation')">停止</BaseButton>
        </div>
      </template>
    </div>
  </section>
</template>
<script setup lang="ts">
import type { AIChatMessage, AIChatSession } from '../domain/types';
import BaseButton from './controls/BaseButton.vue';
import BaseSwitch from './controls/BaseSwitch.vue';
import BaseTextarea from './controls/BaseTextarea.vue';
withDefaults(defineProps<{ activeSession: AIChatSession | null; messages: AIChatMessage[]; input: string; useContext: boolean; isGenerating: boolean; streamingText: string; isMobile: boolean; emptyText?: string; showEmptyActions?: boolean }>(), { emptyText: '新建一个对话开始生成', showEmptyActions: false });
defineEmits<{ 'create-session': []; 'extract-from-chat': []; 'update:input': [value: string]; 'update:use-context': [value: boolean]; send: []; 'stop-generation': [] }>();
</script>
