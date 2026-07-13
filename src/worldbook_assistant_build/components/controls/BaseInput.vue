<script setup lang="ts">
defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    modelValue: string | number | null;
    type?: string;
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    error?: boolean;
  }>(),
  { type: 'text', size: 'md', disabled: false, error: false },
);

const emit = defineEmits<{ 'update:modelValue': [value: string | number | null] }>();

function onInput(event: Event): void {
  const raw = (event.target as HTMLInputElement).value;
  emit('update:modelValue', props.type === 'number' ? (raw === '' ? null : Number(raw)) : raw);
}
</script>

<template>
  <span
    class="wb-control-input-shell"
    :class="{ 'has-error': error, 'has-prefix': Boolean($slots.prefix), 'has-suffix': Boolean($slots.suffix) }"
  >
    <span v-if="$slots.prefix" class="wb-control-input-prefix" aria-hidden="true"><slot name="prefix" /></span>
    <input
      v-bind="$attrs"
      class="wb-control wb-control-input"
      :class="[
        { 'has-error': error, 'has-prefix': Boolean($slots.prefix), 'has-suffix': Boolean($slots.suffix) },
        `wb-control--${size}`,
      ]"
      :type="type"
      :value="modelValue ?? ''"
      :disabled="disabled"
      @input="onInput"
    />
    <span v-if="$slots.suffix" class="wb-control-input-suffix" aria-hidden="true"><slot name="suffix" /></span>
  </span>
</template>
