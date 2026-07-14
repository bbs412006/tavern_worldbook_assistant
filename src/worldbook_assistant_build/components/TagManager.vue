<template>
  <section class="tag-editor-panel" :class="{ 'mobile-tag-editor': isMobile }">
    <div class="tag-editor-title">🏷️ 标签管理</div>
    <div class="tag-create-panel">
      <div class="tag-create-row">
        <BaseInput v-model="newName" class="text-input" placeholder="新标签名称" @keydown.enter.prevent="createTag" />
        <BaseButton class="btn" @click="createTag">创建</BaseButton>
        <BaseButton class="btn danger" variant="danger" :disabled="!tags.length" @click="$emit('reset-all')">清除全部</BaseButton>
      </div>
    </div>
    <div v-if="!tags.length" class="empty-note" style="margin-top:16px;">暂无标签，请先创建</div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import BaseButton from './controls/BaseButton.vue';
import BaseInput from './controls/BaseInput.vue';

const props = defineProps<{
  tags: any[];
  isMobile: boolean;
}>();

const emit = defineEmits<{
  'create': [name: string];
  'reset-all': [];
}>();

const newName = ref('');

function createTag() {
  const name = newName.value.trim();
  if (name) {
    emit('create', name);
    newName.value = '';
  }
}
</script>
