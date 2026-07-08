<template>
  <section class="cross-copy-panel mobile">
    <div class="cross-copy-head">
      <strong>📚 跨世界书复制</strong>
      <span>{{ comparedText }}</span>
    </div>
    <CrossCopyMobileStepper
      :step="step"
      :can-go-step2="canGoStep2"
      :can-go-step3="canGoStep3"
      :next-disabled="nextDisabled"
      :apply-loading="applyLoading"
      :selected-count="selectedCount"
      @go-step="$emit('go-step', $event)"
      @previous="$emit('previous')"
      @next="$emit('next')"
      @apply="$emit('apply')"
    >
      <div v-if="sourceTargetInvalid" class="cross-copy-inline-tip warning">来源和目标不能相同。</div>
      <div v-if="lastResultSummary" class="cross-copy-inline-tip success">{{ lastResultSummary }}</div>
      <slot></slot>
    </CrossCopyMobileStepper>
  </section>
</template>

<script setup lang="ts">
import type { CrossCopyMobileStep } from '../domain/types';
import CrossCopyMobileStepper from './CrossCopyMobileStepper.vue';

defineProps<{
  comparedText: string;
  sourceTargetInvalid: boolean;
  lastResultSummary: string;
  step: CrossCopyMobileStep;
  canGoStep2: boolean;
  canGoStep3: boolean;
  nextDisabled: boolean;
  applyLoading: boolean;
  selectedCount: number;
}>();

defineEmits<{
  'go-step': [step: CrossCopyMobileStep];
  previous: [];
  next: [];
  apply: [];
}>();
</script>
