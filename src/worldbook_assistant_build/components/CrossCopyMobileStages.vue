<template>
  <div class="cross-copy-mobile-stage">
    <section v-show="step === 1" class="cross-copy-mobile-stage-panel">
      <slot name="controls"></slot>
    </section>

    <section v-show="step === 2" class="cross-copy-mobile-stage-panel">
      <slot name="source"></slot>
    </section>

    <section v-show="step === 3" class="cross-copy-mobile-stage-panel">
      <slot name="action"></slot>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { CrossCopyMobileStep } from '../domain/types';

defineProps<{
  step: CrossCopyMobileStep;
}>();
</script>
