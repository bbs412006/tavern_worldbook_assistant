<script setup lang="ts">
defineOptions({ inheritAttrs: false });

const attrs = useAttrs();
const props = withDefaults(
  defineProps<{
    modelValue: string;
    size?: 'sm' | 'md' | 'lg';
    resize?: 'none' | 'vertical' | 'both';
    disabled?: boolean;
    minRows?: number;
  }>(),
  { size: 'md', resize: 'vertical', disabled: false, minRows: 3 },
);

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

function onInput(event: Event): void {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value);
}

const rows = computed(() => {
  const requestedRows = Number(attrs.rows);
  return Number.isFinite(requestedRows) ? Math.max(props.minRows, requestedRows) : props.minRows;
});
</script>

<template>
  <textarea
    v-bind="$attrs"
    class="wb-control wb-control-textarea"
    :class="[`wb-control--${size}`, `wb-control-textarea--resize-${resize}`]"
    :value="modelValue"
    :disabled="disabled"
    :rows="rows"
    @input="onInput"
  />
</template>
