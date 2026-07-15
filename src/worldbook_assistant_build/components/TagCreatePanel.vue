<template>
  <div class="tag-create-panel" :class="{ desktop }">
    <div class="tag-create-row">
      <BaseInput
        :model-value="name"
        class="text-input"
        placeholder="新标签名称"
        @update:model-value="$emit('update:name', String($event ?? ''))"
        @keydown.enter.prevent="$emit('create')"
      />
      <BaseSelect
        v-if="showParentSelect"
        aria-label="新标签的父标签"
        :model-value="parentId"
        :options="selectOptions"
        class="text-input tag-parent-select"
        @update:model-value="$emit('update:parent-id', String($event ?? ''))"
      />
      <BaseButton class="btn" @click="$emit('create')">创建</BaseButton>
      <BaseButton class="btn danger" variant="danger" :disabled="!hasTags" @click="$emit('reset-all')">清除全部</BaseButton>
    </div>
    <label v-if="!showParentSelect" class="field tag-parent-field">
      <span>父标签（可选）</span>
      <BaseSelect
        aria-label="新标签的父标签"
        :model-value="parentId"
        :options="selectOptions"
        class="text-input"
        @update:model-value="$emit('update:parent-id', String($event ?? ''))"
      />
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BaseButton from './controls/BaseButton.vue';
import BaseInput from './controls/BaseInput.vue';
import BaseSelect from './controls/BaseSelect.vue';

const props = defineProps<{
  name: string;
  parentId: string;
  parentOptions: Array<{ id: string; path: string }>;
  hasTags: boolean;
  desktop?: boolean;
  showParentSelect?: boolean;
}>();

const selectOptions = computed(() => [
  { value: '', label: '根级' },
  ...props.parentOptions.map(option => ({ value: option.id, label: option.path })),
]);

defineEmits<{
  'update:name': [value: string];
  'update:parent-id': [value: string];
  create: [];
  'reset-all': [];
}>();
</script>
