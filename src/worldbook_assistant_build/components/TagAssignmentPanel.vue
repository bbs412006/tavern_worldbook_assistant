<template>
  <div class="tag-assign-panel">
    <div class="tag-editor-subtitle">世界书分配</div>
    <div class="tag-assign-controls">
      <label class="field">
        <span>当前分配标签</span>
        <select :value="targetId" class="text-input" @change="$emit('update:target-id', ($event.target as HTMLSelectElement).value)">
          <option value="">请选择标签</option>
          <option v-for="option in options" :key="`assign-${idPrefix}-${option.id}`" :value="option.id">
            {{ option.path }}
          </option>
        </select>
      </label>
      <label v-if="!compact" class="field">
        <span>搜索世界书</span>
        <input
          :value="search"
          type="text"
          class="text-input"
          placeholder="搜索世界书..."
          @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <input
        v-else
        :value="search"
        type="text"
        class="text-input"
        placeholder="搜索世界书..."
        @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <div class="tag-assign-list" :class="{ compact }">
      <button
        v-for="name in worldbooks"
        :key="`assign-${idPrefix}-wb-${name}`"
        class="tag-assign-row toggle"
        :class="{ active: targetId ? (assignments[name] ?? []).includes(targetId) : false }"
        type="button"
        :disabled="!targetId"
        @click="$emit('toggle', name)"
      >
        <span class="tag-assign-name" :title="name">{{ name }}</span>
        <span class="tag-assign-state">{{ targetId && (assignments[name] ?? []).includes(targetId) ? '已分配' : '未分配' }}</span>
        <span class="tag-assign-paths">{{ pathSummary(name) }}</span>
      </button>
      <div v-if="!worldbooks.length" class="empty-note">没有匹配的世界书</div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  targetId: string;
  search: string;
  options: Array<{ id: string; path: string }>;
  worldbooks: string[];
  assignments: Record<string, string[]>;
  pathSummary: (name: string) => string;
  idPrefix: string;
  compact?: boolean;
}>();

defineEmits<{
  'update:target-id': [value: string];
  'update:search': [value: string];
  toggle: [name: string];
}>();
</script>
