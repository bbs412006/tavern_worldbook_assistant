<script setup lang="ts">
defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    modelValue: string | number | null;
    type?: string;
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
  }>(),
  { type: 'text', size: 'md', disabled: false },
);

const emit = defineEmits<{ 'update:modelValue': [value: string | number | null] }>();

function onInput(event: Event): void {
  const raw = (event.target as HTMLInputElement).value;
  emit('update:modelValue', props.type === 'number' ? (raw === '' ? null : Number(raw)) : raw);
}
</script>

<template>
  <input
    v-bind="$attrs"
    class="wb-control wb-control-input"
    :class="`wb-control--${size}`"
    :type="type"
    :value="modelValue ?? ''"
    :disabled="disabled"
    @input="onInput"
  />
</template>
