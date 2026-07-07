<template>
  <div class="tag-create-panel" :class="{ desktop }">
    <div class="tag-create-row">
      <input
        :value="name"
        type="text"
        class="text-input"
        placeholder="新标签名称"
        @input="$emit('update:name', ($event.target as HTMLInputElement).value)"
        @keydown.enter.prevent="$emit('create')"
      />
      <select
        v-if="showParentSelect"
        :value="parentId"
        class="text-input tag-parent-select"
        @change="$emit('update:parent-id', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">根级</option>
        <option v-for="option in parentOptions" :key="`new-parent-${option.id}`" :value="option.id">
          {{ option.path }}
        </option>
      </select>
      <button class="btn" type="button" @click="$emit('create')">创建</button>
      <button class="btn danger" type="button" :disabled="!hasTags" @click="$emit('reset-all')">清除全部</button>
    </div>
    <label v-if="!showParentSelect" class="field tag-parent-field">
      <span>父标签（可选）</span>
      <select
        :value="parentId"
        class="text-input"
        @change="$emit('update:parent-id', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">根级</option>
        <option v-for="option in parentOptions" :key="`new-parent-mobile-${option.id}`" :value="option.id">
          {{ option.path }}
        </option>
      </select>
    </label>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  name: string;
  parentId: string;
  parentOptions: Array<{ id: string; path: string }>;
  hasTags: boolean;
  desktop?: boolean;
  showParentSelect?: boolean;
}>();

defineEmits<{
  'update:name': [value: string];
  'update:parent-id': [value: string];
  create: [];
  'reset-all': [];
}>();
</script>
