<script setup lang="ts">
defineOptions({ inheritAttrs: false });

withDefaults(
  defineProps<{
    modelValue: string;
    size?: 'sm' | 'md' | 'lg';
    resize?: 'none' | 'vertical' | 'both';
    disabled?: boolean;
  }>(),
  { size: 'md', resize: 'vertical', disabled: false },
);

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

function onInput(event: Event): void {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value);
}
</script>

<template>
  <textarea
    v-bind="$attrs"
    class="wb-control wb-control-textarea"
    :class="[`wb-control--${size}`, `wb-control-textarea--resize-${resize}`]"
    :value="modelValue"
    :disabled="disabled"
    @input="onInput"
  />
</template>
