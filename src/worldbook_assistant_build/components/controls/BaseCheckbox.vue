<script setup lang="ts">
defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    indeterminate?: boolean;
    disabled?: boolean;
  }>(),
  { indeterminate: false, disabled: false },
);

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
const inputRef = ref<HTMLInputElement | null>(null);

function syncIndeterminate(): void {
  if (inputRef.value) inputRef.value.indeterminate = props.indeterminate;
}

watch(
  () => props.indeterminate,
  syncIndeterminate,
  { flush: 'post' },
);
onMounted(syncIndeterminate);

function onChange(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement).checked);
}
</script>

<template>
  <label class="wb-control-choice" :class="{ 'is-disabled': disabled }">
    <input
      ref="inputRef"
      v-bind="$attrs"
      class="wb-control-native"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="onChange"
    />
    <span class="wb-control-checkbox-indicator" aria-hidden="true" />
    <span v-if="$slots.default" class="wb-control-choice-label"><slot /></span>
  </label>
</template>
