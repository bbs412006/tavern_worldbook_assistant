<template>
  <div
    ref="gridRef"
    class="cross-copy-grid"
    :class="{ 'single-column': singleColumn }"
    :style="gridStyle"
  >
    <slot name="source"></slot>

    <div
      v-if="!singleColumn"
      class="cross-copy-splitter"
      :class="{ dragging }"
      @pointerdown="$emit('start-resize', $event, gridRef)"
    >
      <span>⋮</span>
    </div>

    <slot name="action"></slot>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const gridRef = ref<HTMLElement | null>(null);

defineProps<{
  singleColumn: boolean;
  gridStyle?: Record<string, string>;
  dragging: boolean;
}>();

defineEmits<{
  'start-resize': [event: PointerEvent, gridElement: HTMLElement | null];
}>();
</script>
