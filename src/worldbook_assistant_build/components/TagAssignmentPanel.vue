<template>
  <div class="tag-assign-panel">
    <div class="tag-editor-subtitle">世界书分配</div>
    <div class="tag-assign-controls">
      <label class="field">
        <span>当前分配标签</span>
        <BaseSelect :model-value="targetId" :options="selectOptions" class="text-input" @update:model-value="$emit('update:target-id', String($event ?? ''))" />
      </label>
      <label v-if="!compact" class="field">
        <span>搜索世界书</span>
        <BaseInput :model-value="search" class="text-input" placeholder="搜索世界书..." @update:model-value="$emit('update:search', String($event ?? ''))" />
      </label>
      <BaseInput v-else :model-value="search" class="text-input" placeholder="搜索世界书..." @update:model-value="$emit('update:search', String($event ?? ''))" />
    </div>
    <div class="tag-assign-list" :class="{ compact }">
      <BaseButton
        v-for="name in worldbooks"
        :key="`assign-${idPrefix}-wb-${name}`"
        class="tag-assign-row toggle"
        :class="{ active: targetId ? (assignments[name] ?? []).includes(targetId) : false }"
        :disabled="!targetId"
        @click="$emit('toggle', name)"
      >
        <span class="tag-assign-name" :title="name">{{ name }}</span>
        <span class="tag-assign-state">{{ targetId && (assignments[name] ?? []).includes(targetId) ? '已分配' : '未分配' }}</span>
        <span class="tag-assign-paths">{{ pathSummary(name) }}</span>
      </BaseButton>
      <div v-if="!worldbooks.length" class="empty-note">没有匹配的世界书</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BaseButton from './controls/BaseButton.vue';
import BaseInput from './controls/BaseInput.vue';
import BaseSelect from './controls/BaseSelect.vue';

const props = defineProps<{
  targetId: string;
  search: string;
  options: Array<{ id: string; path: string }>;
  worldbooks: string[];
  assignments: Record<string, string[]>;
  pathSummary: (name: string) => string;
  idPrefix: string;
  compact?: boolean;
}>();

const selectOptions = computed(() => [
  { value: '', label: '请选择标签' },
  ...props.options.map(option => ({ value: option.id, label: option.path })),
]);

defineEmits<{
  'update:target-id': [value: string];
  'update:search': [value: string];
  toggle: [name: string];
}>();
</script>
