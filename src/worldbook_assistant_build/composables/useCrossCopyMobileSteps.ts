import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { clampNumber } from '../domain/persistedState';
import type { CrossCopyMobileStep } from '../domain/types';

export function useCrossCopyMobileSteps(options: {
  hasCompared: ComputedRef<boolean>;
  rowCount: ComputedRef<number>;
  compareLoading: Ref<boolean> | ComputedRef<boolean>;
  canApply: Ref<boolean> | ComputedRef<boolean>;
  notifyBlocked: () => void;
}) {
  const step = ref<CrossCopyMobileStep>(1);
  const canGoStep2 = computed(() => options.hasCompared.value && options.rowCount.value > 0);
  const canGoStep3 = computed(() => canGoStep2.value);
  const nextDisabled = computed(() => {
    if (step.value === 1) {
      return !canGoStep2.value || options.compareLoading.value;
    }
    if (step.value === 2) {
      return !canGoStep3.value;
    }
    return !options.canApply.value;
  });

  function canEnterStep(targetStep: CrossCopyMobileStep): boolean {
    if (targetStep <= 1) {
      return true;
    }
    if (targetStep === 2) {
      return canGoStep2.value;
    }
    return canGoStep3.value;
  }

  function goToStep(targetStep: CrossCopyMobileStep): void {
    if (targetStep === step.value) {
      return;
    }
    if (!canEnterStep(targetStep)) {
      options.notifyBlocked();
      return;
    }
    step.value = targetStep;
  }

  function goToPreviousStep(): void {
    step.value = clampNumber(step.value - 1, 1, 3) as CrossCopyMobileStep;
  }

  function goToNextStep(): void {
    goToStep(clampNumber(step.value + 1, 1, 3) as CrossCopyMobileStep);
  }

  function resetStep(): void {
    step.value = 1;
  }

  return {
    step,
    canGoStep2,
    canGoStep3,
    nextDisabled,
    canEnterStep,
    goToStep,
    goToPreviousStep,
    goToNextStep,
    resetStep,
  };
}
