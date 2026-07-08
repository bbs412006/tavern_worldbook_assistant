<template>
  <div class="tag-color-picker">
    <button
      v-for="color in colors"
      :key="`${idPrefix}-${color}`"
      class="tag-color-dot"
      :class="{ active: color === value }"
      :style="{ background: color }"
      type="button"
      @click="$emit('select', color)"
    ></button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  value: string;
  colors: string[];
  idPrefix: string;
}>();

defineEmits<{
  select: [color: string];
}>();
</script>
