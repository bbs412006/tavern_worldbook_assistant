<script setup lang="ts">
defineOptions({ inheritAttrs: false });

const attrs = useAttrs();
const inputId = computed(() => (typeof attrs.id === 'string' ? attrs.id : undefined));

withDefaults(
  defineProps<{
    modelValue: boolean;
    disabled?: boolean;
  }>(),
  { disabled: false },
);

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

function onChange(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement).checked);
}
</script>

<template>
  <label
    class="wb-control-choice wb-control-switch"
    :class="{ 'is-disabled': disabled }"
    :for="inputId"
  >
    <input
      v-bind="$attrs"
      class="wb-control-native"
      type="checkbox"
      role="switch"
      :checked="modelValue"
      :disabled="disabled"
      @change="onChange"
    />
    <span class="wb-control-switch-track" aria-hidden="true"><span class="wb-control-switch-thumb" /></span>
    <span v-if="$slots.default" class="wb-control-choice-label"><slot /></span>
  </label>
</template>
