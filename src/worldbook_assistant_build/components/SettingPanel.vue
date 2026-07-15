<template>
  <div class="settings-panel">
    <div class="settings-title">⚙️ 设置</div>
    <div class="settings-section">
      <BaseSwitch :model-value="showAIChat" class="field checkbox-inline" @update:model-value="$emit('update:showAIChat', $event)">显示 AI 对话面板</BaseSwitch>
      <BaseSwitch :model-value="glassMode" class="field checkbox-inline" @update:model-value="$emit('update:glassMode', $event)">毛玻璃模式</BaseSwitch>
      <BaseSwitch :model-value="showFloorExtract" class="field checkbox-inline" @update:model-value="$emit('update:showFloorExtract', $event)">显示楼层提取按钮</BaseSwitch>
    </div>
    <div class="settings-section">
      <div class="settings-subtitle">🕰️ 时光机</div>
      <div class="settings-buttons">
        <BaseButton class="btn" :disabled="!hasWorldbook" @click="$emit('entry-history')">条目录时光机</BaseButton>
        <BaseButton class="btn" :disabled="!hasWorldbook" @click="$emit('worldbook-history')">整本时光机</BaseButton>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import BaseButton from './controls/BaseButton.vue';
import BaseSwitch from './controls/BaseSwitch.vue';
defineProps<{ showAIChat: boolean; glassMode: boolean; showFloorExtract: boolean; hasWorldbook: boolean }>();
defineEmits<{ 'update:showAIChat': [v: boolean]; 'update:glassMode': [v: boolean]; 'update:showFloorExtract': [v: boolean]; 'entry-history': []; 'worldbook-history': [] }>();
</script>
