<template>
  <section class="ai-generator-panel" :class="{ 'mobile-ai-panel': isMobile }">
    <div class="ai-chat-area">
      <div v-if="!activeSession" class="ai-chat-empty">
        <div class="ai-chat-empty-icon">🤖</div>
        <div class="ai-chat-empty-text">{{ emptyText }}</div>
        <template v-if="showEmptyActions">
          <button class="btn" type="button" @click="$emit('create-session')">+ 新建对话</button>
          <button class="btn" type="button" style="margin-top:6px;" @click="$emit('extract-from-chat')">📥 从聊天提取世界书</button>
        </template>
      </div>
      <template v-else>
        <div class="ai-chat-messages">
          <div v-for="(msg, idx) in messages" :key="`msg-${idx}`" class="ai-chat-bubble" :class="msg.role">
            <div class="ai-chat-bubble-role">{{ msg.role === 'user' ? '👤 你' : '🤖 AI' }}</div>
            <div class="ai-chat-bubble-content">{{ msg.content }}</div>
          </div>
          <div v-if="isGenerating && streamingText" class="ai-chat-bubble assistant streaming">
            <div class="ai-chat-bubble-role">🤖 AI</div>
            <div class="ai-chat-bubble-content">{{ streamingText }}<span class="ai-cursor">▌</span></div>
          </div>
          <div v-if="isGenerating && !streamingText" class="ai-chat-bubble assistant streaming">
            <div class="ai-chat-bubble-role">🤖 AI</div>
            <div class="ai-chat-bubble-content"><span class="ai-thinking">思考中...</span></div>
          </div>
        </div>
        <div class="ai-chat-input-bar">
          <label class="ai-context-toggle" title="开启后，AI 将能看到酒馆的预设、世界书和正则上下文">
            <input :checked="useContext" type="checkbox" @change="$emit('update:use-context', ($event.target as HTMLInputElement).checked)" />
            <span>{{ useContext ? '📖 附带上下文' : '🔒 纯净模式' }}</span>
          </label>
          <textarea
            :value="input"
            class="text-input ai-chat-input"
            placeholder="输入提示词..."
            rows="2"
            :disabled="isGenerating"
            @input="$emit('update:input', ($event.target as HTMLTextAreaElement).value)"
            @keydown.enter.exact.prevent="$emit('send')"
          ></textarea>
          <button v-if="!isGenerating" class="btn ai-send-btn" type="button" :disabled="!input.trim()" @click="$emit('send')">发送</button>
          <button v-else class="btn danger ai-stop-btn" type="button" @click="$emit('stop-generation')">停止</button>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { AIChatMessage, AIChatSession } from '../domain/types';

withDefaults(defineProps<{
  activeSession: AIChatSession | null;
  messages: AIChatMessage[];
  input: string;
  useContext: boolean;
  isGenerating: boolean;
  streamingText: string;
  isMobile: boolean;
  emptyText?: string;
  showEmptyActions?: boolean;
}>(), {
  emptyText: '新建一个对话开始生成',
  showEmptyActions: false,
});

defineEmits<{
  'create-session': [];
  'extract-from-chat': [];
  'update:input': [value: string];
  'update:use-context': [value: boolean];
  send: [];
  'stop-generation': [];
}>();
</script>
