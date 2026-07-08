<template>
  <CrossCopyMobileWorkspace
    v-if="variant === 'mobile'"
    :compared-text="comparedText"
    :source-target-invalid="sourceTargetInvalid"
    :last-result-summary="lastResultSummary"
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
    <slot></slot>
  </CrossCopyMobileWorkspace>

  <CrossCopyDesktopWorkspace
    v-else
    :workspace-summary="workspaceSummary"
    :compared-text="comparedText"
    :controls-collapsed="controlsCollapsed"
    :cine-locked="cineLocked"
    @toggle-controls-collapsed="$emit('toggle-controls-collapsed')"
    @exit="$emit('exit')"
  >
    <slot></slot>
  </CrossCopyDesktopWorkspace>
</template>

<script setup lang="ts">
import type { CrossCopyMobileStep } from '../domain/types';
import CrossCopyDesktopWorkspace from './CrossCopyDesktopWorkspace.vue';
import CrossCopyMobileWorkspace from './CrossCopyMobileWorkspace.vue';

withDefaults(defineProps<{
  variant: 'mobile' | 'desktop';
  comparedText: string;
  sourceTargetInvalid?: boolean;
  lastResultSummary?: string;
  step?: CrossCopyMobileStep;
  canGoStep2?: boolean;
  canGoStep3?: boolean;
  nextDisabled?: boolean;
  applyLoading: boolean;
  selectedCount: number;
  workspaceSummary?: string;
  controlsCollapsed?: boolean;
  cineLocked?: boolean;
}>(), {
  sourceTargetInvalid: false,
  lastResultSummary: '',
  step: 1,
  canGoStep2: false,
  canGoStep3: false,
  nextDisabled: false,
  workspaceSummary: '',
  controlsCollapsed: false,
  cineLocked: false,
});

defineEmits<{
  'go-step': [step: CrossCopyMobileStep];
  previous: [];
  next: [];
  apply: [];
  'toggle-controls-collapsed': [];
  exit: [];
}>();
</script>
