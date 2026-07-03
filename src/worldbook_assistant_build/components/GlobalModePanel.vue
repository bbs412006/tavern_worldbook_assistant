<template>
  <div class="global-mode-panel">
    <div class="global-mode-header">
      <span style="font-weight:600;font-size:13px;">🌐 全局世界书（{{ globalBindings.length }}）</span>
      <button class="btn mini danger" type="button" :disabled="!globalBindings.length" @click="$emit('clear')">清空</button>
    </div>

    <label class="field">
      <span style="font-size:12px;">预设（切换即应用）</span>
      <select v-model="selectedPresetId" class="text-input" @change="$emit('preset-change', selectedPresetId)" style="font-size:12px;">
        <option value="">默认预设（清空全局世界书）</option>
        <option v-for="preset in presets" :key="preset.id" :value="preset.id">
          {{ preset.name }}（{{ preset.worldbooks.length }}）
        </option>
      </select>
    </label>

    <div class="global-mode-actions">
      <button class="btn mini" type="button" :disabled="!globalBindings.length" @click="$emit('save-preset')">保存组合</button>
      <button class="btn mini" type="button" :disabled="!selectedPreset" @click="$emit('overwrite-preset', selectedPresetId)">覆盖预设</button>
      <button class="btn mini danger" type="button" :disabled="!selectedPreset" @click="$emit('delete-preset', selectedPresetId)">删除预设</button>
    </div>

    <label class="field">
      <span style="font-size:12px;">搜索并添加</span>
      <input v-model="searchText" type="text" class="text-input" placeholder="搜索世界书..." style="font-size:12px;" />
    </label>

    <div v-if="globalBindings.length" style="font-size:12px;margin-bottom:4px;opacity:0.7;">已启用：</div>
    <div class="global-mode-list">
      <button v-for="name in filteredBindings" :key="'gl-' + name" type="button" class="global-mode-item" @click="$emit('remove', name)">
        <span>{{ name }}</span><span style="color:#ef4444;">移除</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  globalBindings: string[];
  presets: any[];
  selectedPresetId: string;
}>();

const emit = defineEmits<{
  'clear': [];
  'preset-change': [id: string];
  'save-preset': [];
  'overwrite-preset': [id: string];
  'delete-preset': [id: string];
  'remove': [name: string];
}>();

const searchText = ref('');
const selectedPresetId = ref(props.selectedPresetId);

const selectedPreset = computed(() => props.presets.find(p => p.id === selectedPresetId.value));

const filteredBindings = computed(() => {
  const q = searchText.value.toLowerCase();
  if (!q) return props.globalBindings;
  return props.globalBindings.filter(n => n.toLowerCase().includes(q));
});
</script>
