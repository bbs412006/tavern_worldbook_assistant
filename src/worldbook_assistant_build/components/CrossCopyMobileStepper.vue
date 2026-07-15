<template>
  <div class="cross-copy-mobile-stepper">
    <BaseButton class="cross-copy-mobile-step" :class="{ active: step === 1 }" variant="ghost" size="sm" @click="$emit('go-step', 1)">1 配置</BaseButton>
    <BaseButton class="cross-copy-mobile-step" :class="{ active: step === 2 }" variant="ghost" size="sm" :disabled="!canGoStep2 && step !== 2" @click="$emit('go-step', 2)">2 选择</BaseButton>
    <BaseButton class="cross-copy-mobile-step" :class="{ active: step === 3 }" variant="ghost" size="sm" :disabled="!canGoStep3 && step !== 3" @click="$emit('go-step', 3)">3 执行</BaseButton>
  </div>
  <slot></slot>
  <div class="cross-copy-mobile-nav">
    <BaseButton class="btn mini" size="sm" :disabled="step === 1" @click="$emit('previous')">上一步</BaseButton>
    <BaseButton v-if="step < 3" class="btn mini primary" variant="primary" size="sm" :disabled="nextDisabled" @click="$emit('next')">下一步</BaseButton>
    <BaseButton v-else class="btn primary" variant="primary" :disabled="nextDisabled" :loading="applyLoading" @click="$emit('apply')">{{ applyLoading ? '执行中...' : `执行复制（${selectedCount}）` }}</BaseButton>
  </div>
</template>
<script setup lang="ts">
import type { CrossCopyMobileStep } from '../domain/types';
import BaseButton from './controls/BaseButton.vue';
defineProps<{ step: CrossCopyMobileStep; canGoStep2: boolean; canGoStep3: boolean; nextDisabled: boolean; applyLoading: boolean; selectedCount: number }>();
defineEmits<{ 'go-step': [step: CrossCopyMobileStep]; previous: []; next: []; apply: [] }>();
</script>
