<template>
  <div class="cross-copy-mobile-stepper">
    <button class="cross-copy-mobile-step" type="button" :class="{ active: step === 1 }" @click="$emit('go-step', 1)">
      1 配置
    </button>
    <button
      class="cross-copy-mobile-step"
      type="button"
      :class="{ active: step === 2 }"
      :disabled="!canGoStep2 && step !== 2"
      @click="$emit('go-step', 2)"
    >
      2 选择
    </button>
    <button
      class="cross-copy-mobile-step"
      type="button"
      :class="{ active: step === 3 }"
      :disabled="!canGoStep3 && step !== 3"
      @click="$emit('go-step', 3)"
    >
      3 执行
    </button>
  </div>

  <slot></slot>

  <div class="cross-copy-mobile-nav">
    <button class="btn mini" type="button" :disabled="step === 1" @click="$emit('previous')">上一步</button>
    <button
      v-if="step < 3"
      class="btn mini primary"
      type="button"
      :disabled="nextDisabled"
      @click="$emit('next')"
    >
      下一步
    </button>
    <button
      v-else
      class="btn primary"
      type="button"
      :disabled="nextDisabled"
      @click="$emit('apply')"
    >
      {{ applyLoading ? '执行中...' : `执行复制（${selectedCount}）` }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { CrossCopyMobileStep } from '../domain/types';

defineProps<{
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
