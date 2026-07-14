<template>
  <div class="global-mode-panel">
    <div class="global-mode-header">
      <span style="font-weight:600;font-size:13px;">🌐 全局世界书（{{ globalBindings.length }}）</span>
      <BaseButton size="sm" variant="danger" :disabled="!globalBindings.length" @click="$emit('clear')">清空</BaseButton>
    </div>

    <label class="field">
      <span id="global-mode-preset-label" style="font-size:12px;">预设（切换即应用）</span>
      <BaseSelect
        v-model="localSelectedPresetId"
        :options="presetOptions"
        :searchable="false"
        size="sm"
        aria-labelledby="global-mode-preset-label"
        @update:model-value="emitPresetChange"
      />
    </label>

    <div class="global-mode-actions">
      <BaseButton size="sm" :disabled="!globalBindings.length" @click="$emit('save-preset')">保存组合</BaseButton>
      <BaseButton size="sm" :disabled="!selectedPreset" @click="$emit('overwrite-preset', localSelectedPresetId)">覆盖预设</BaseButton>
      <BaseButton size="sm" variant="danger" :disabled="!selectedPreset" @click="$emit('delete-preset', localSelectedPresetId)">删除预设</BaseButton>
    </div>

    <label class="field">
      <span style="font-size:12px;">搜索并添加</span>
      <BaseInput v-model="searchText" size="sm" placeholder="搜索世界书..." aria-label="搜索世界书" />
    </label>

    <div v-if="globalBindings.length" style="font-size:12px;margin-bottom:4px;opacity:0.7;">已启用：</div>
    <div class="global-mode-list">
      <BaseButton v-for="name in filteredBindings" :key="'gl-' + name" class="global-mode-item" size="sm" @click="$emit('remove', name)">
        <span>{{ name }}</span><span style="color:#ef4444;">移除</span>
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import BaseButton from './controls/BaseButton.vue';
import BaseInput from './controls/BaseInput.vue';
import BaseSelect, { type BaseSelectOption } from './controls/BaseSelect.vue';

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
const localSelectedPresetId = ref(props.selectedPresetId);
watch(() => props.selectedPresetId, value => {
  localSelectedPresetId.value = value;
});

const presetOptions = computed<BaseSelectOption<string>[]>(() => [
  { value: '', label: '默认预设（清空全局世界书）' },
  ...props.presets.map(preset => ({ value: preset.id, label: `${preset.name}（${preset.worldbooks.length}）` })),
]);
const selectedPreset = computed(() => props.presets.find(p => p.id === localSelectedPresetId.value));
const filteredBindings = computed(() => {
  const q = searchText.value.toLowerCase();
  if (!q) return props.globalBindings;
  return props.globalBindings.filter(n => n.toLowerCase().includes(q));
});

function emitPresetChange(value: string | number | null): void {
  if (typeof value !== 'string') return;
  localSelectedPresetId.value = value;
  emit('preset-change', value);
}
</script>
