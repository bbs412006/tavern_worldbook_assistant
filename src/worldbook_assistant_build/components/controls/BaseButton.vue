<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    disabled?: boolean;
    iconOnly?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }>(),
  { variant: 'default', size: 'md', loading: false, disabled: false, iconOnly: false, type: 'button' },
);

const emit = defineEmits<{ click: [event: MouseEvent] }>();

function onClick(event: MouseEvent): void {
  if (props.disabled || props.loading) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  emit('click', event);
}
</script>

<template>
  <button
    class="wb-control wb-control-button"
    :class="[
      `wb-control--${size}`,
      `wb-control-button--${variant}`,
      { 'is-icon-only': iconOnly, 'is-loading': loading },
    ]"
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    @click="onClick"
  >
    <span v-if="loading" class="wb-control-spinner" aria-hidden="true" />
    <slot />
  </button>
</template>
