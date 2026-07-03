<template>
  <section class="ai-generator-panel" :class="{ 'mobile-ai-panel': isMobile }">
    <div class="ai-chat-area">
      <div v-if="!activeSession" class="ai-chat-empty">
        <div class="ai-chat-empty-icon">🤖</div>
        <div class="ai-chat-empty-text">新建一个对话开始生成</div>
        <button class="btn" type="button" @click="$emit('create-session')">+ 新建对话</button>
        <button class="btn" type="button" style="margin-top:6px;" @click="$emit('extract-from-chat')">📥 从聊天提取世界书</button>
      </div>
      <div v-else class="ai-chat-messages" ref="messagesRef">
        <div v-for="(msg, idx) in messages" :key="'msg-' + idx" class="ai-chat-bubble" :class="msg.role">
          <div class="ai-chat-bubble-role">{{ msg.role === 'user' ? '👤 你' : '🤖 AI' }}</div>
          <div class="ai-chat-bubble-content">{{ msg.content }}</div>
        </div>
      </div>
      <div class="ai-chat-input-bar" v-if="activeSession">
        <textarea v-model="inputText" class="text-input ai-chat-input" placeholder="输入提示词..." rows="2" :disabled="isGenerating" @keydown.enter.exact.prevent="send"></textarea>
        <button v-if="!isGenerating" class="btn ai-send-btn" type="button" :disabled="!inputText.trim()" @click="send">发送</button>
        <button v-else class="btn danger ai-stop-btn" type="button" @click="$emit('stop-generation')">停止</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  activeSession: boolean;
  messages: any[];
  isGenerating: boolean;
  isMobile: boolean;
}>();

const emit = defineEmits<{
  'create-session': [];
  'extract-from-chat': [];
  'send': [text: string];
  'stop-generation': [];
}>();

const inputText = ref('');
const messagesRef = ref<HTMLElement>();

function send() {
  const text = inputText.value.trim();
  if (text) {
    emit('send', text);
    inputText.value = '';
  }
}
</script>
