<template>
  <div class="tag-color-picker">
    <BaseButton
      v-for="color in colors"
      :key="`${idPrefix}-${color}`"
      class="tag-color-dot"
      :class="{ active: color === value }"
      :style="{ background: color }"
      variant="ghost"
      size="sm"
      icon-only
      :aria-label="`选择颜色 ${color}`"
      @click="$emit('select', color)"
    />
    <!-- unified-control-exception: native color input required -->
    <input
      type="color"
      class="tag-color-custom"
      :value="value"
      aria-label="自定义标签颜色"
      @input="$emit('select', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>

<script setup lang="ts">
import BaseButton from './controls/BaseButton.vue';

defineProps<{
  value: string;
  colors: string[];
  idPrefix: string;
}>();

defineEmits<{
  select: [color: string];
}>();
</script>
