<template>
  <div class="settings-panel">
    <div class="settings-title">⚙️ 设置</div>
    <div class="settings-section">
      <label class="field checkbox-inline">
        <input type="checkbox" :checked="showAIChat" @change="$emit('update:showAIChat', ($event.target as HTMLInputElement).checked)" />
        <span>显示 AI 对话面板</span>
      </label>
      <label class="field checkbox-inline">
        <input type="checkbox" :checked="glassMode" @change="$emit('update:glassMode', ($event.target as HTMLInputElement).checked)" />
        <span>毛玻璃模式</span>
      </label>
      <label class="field checkbox-inline">
        <input type="checkbox" :checked="showFloorExtract" @change="$emit('update:showFloorExtract', ($event.target as HTMLInputElement).checked)" />
        <span>显示楼层提取按钮</span>
      </label>
    </div>
    <div class="settings-section">
      <div class="settings-subtitle">🕰️ 时光机</div>
      <div class="settings-buttons">
        <button class="btn" type="button" :disabled="!hasWorldbook" @click="$emit('entry-history')">条目录时光机</button>
        <button class="btn" type="button" :disabled="!hasWorldbook" @click="$emit('worldbook-history')">整本时光机</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  showAIChat: boolean;
  glassMode: boolean;
  showFloorExtract: boolean;
  hasWorldbook: boolean;
}>();

defineEmits<{
  'update:showAIChat': [v: boolean];
  'update:glassMode': [v: boolean];
  'update:showFloorExtract': [v: boolean];
  'entry-history': [];
  'worldbook-history': [];
}>();
</script>
