<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { useCoalescedFrame, type CoalescedFrame } from '../../composables/useCoalescedFrame';
import { calculateSelectMenuPlacement, type SelectMenuPlacement } from './selectPosition';

export interface BaseSelectOption<T extends string | number = string | number> {
  value: T;
  label: string;
  disabled?: boolean;
  keywords?: string[];
}

const props = withDefaults(
  defineProps<{
    modelValue: string | number | null;
    options: BaseSelectOption[];
    searchable?: boolean | 'auto';
    searchThreshold?: number;
    clearable?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    placeholder?: string;
  }>(),
  {
    searchable: 'auto',
    searchThreshold: 8,
    clearable: false,
    disabled: false,
    size: 'md',
    placeholder: '请选择',
  },
);

const emit = defineEmits<{ 'update:modelValue': [value: string | number | null] }>();

let idSeed = 0;
const instanceId = `wb-base-select-${++idSeed}`;
const listboxId = `${instanceId}-listbox`;
const searchId = `${instanceId}-search`;
const open = ref(false);
const query = ref('');
const activeIndex = ref(-1);
const triggerRef = ref<HTMLElement | null>(null);
const menuRef = ref<HTMLElement | null>(null);
const searchRef = ref<HTMLInputElement | null>(null);
const placement = ref<SelectMenuPlacement>({ side: 'down', left: 0, top: 0, width: 0, maxHeight: 280 });
let ownerDocument: Document | null = null;
let ownerWindow: Window | null = null;
let frame: CoalescedFrame | null = null;

const searchEnabled = computed(() =>
  props.searchable === true || (props.searchable === 'auto' && props.options.length > props.searchThreshold),
);
const selectedOption = computed(() => props.options.find(option => option.value === props.modelValue) ?? null);
const filteredOptions = computed(() => {
  const normalizedQuery = query.value.trim().toLocaleLowerCase();
  if (!normalizedQuery) return props.options;
  return props.options.filter(option =>
    [option.label, ...(option.keywords ?? [])].some(text => text.toLocaleLowerCase().includes(normalizedQuery)),
  );
});
const activeOption = computed(() => filteredOptions.value[activeIndex.value] ?? null);
const activeDescendant = computed(() => activeOption.value ? optionId(activeOption.value) : undefined);
const menuStyle = computed(() => ({
  left: `${placement.value.left}px`,
  top: `${placement.value.top}px`,
  width: `${placement.value.width}px`,
  maxHeight: `${placement.value.maxHeight}px`,
}));

function optionKey(option: BaseSelectOption): string {
  return `${typeof option.value}:${String(option.value)}`;
}

function optionId(option: BaseSelectOption): string {
  return `${instanceId}-option-${optionKey(option).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function firstEnabledIndex(): number {
  return filteredOptions.value.findIndex(option => !option.disabled);
}

function lastEnabledIndex(): number {
  for (let index = filteredOptions.value.length - 1; index >= 0; index -= 1) {
    if (!filteredOptions.value[index]?.disabled) return index;
  }
  return -1;
}

function selectedEnabledIndex(): number {
  const index = filteredOptions.value.findIndex(option => option.value === props.modelValue && !option.disabled);
  return index >= 0 ? index : firstEnabledIndex();
}

function moveActive(direction: 1 | -1): void {
  const options = filteredOptions.value;
  if (!options.length) {
    activeIndex.value = -1;
    return;
  }
  let index = activeIndex.value;
  for (let count = 0; count < options.length; count += 1) {
    index = (index + direction + options.length) % options.length;
    if (!options[index]?.disabled) {
      activeIndex.value = index;
      return;
    }
  }
}

function ownerRoot(): HTMLElement | null {
  return triggerRef.value?.closest('.wb-assistant-root') as HTMLElement | null
    ?? triggerRef.value?.parentElement
    ?? null;
}

function updatePlacement(): void {
  const trigger = triggerRef.value;
  const root = ownerRoot();
  if (!trigger || !root || !ownerWindow) return;
  placement.value = calculateSelectMenuPlacement(
    trigger.getBoundingClientRect(),
    root.getBoundingClientRect(),
    ownerWindow.innerHeight,
    280,
  );
}

function schedulePlacement(): void {
  frame?.schedule(updatePlacement);
}

function scrollActiveIntoView(): void {
  nextTick(() => {
    const active = activeDescendant.value
      ? menuRef.value?.querySelector<HTMLElement>(`[id="${activeDescendant.value}"]`)
      : null;
    if (typeof active?.scrollIntoView === 'function') {
      active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  });
}

function addOpenListeners(): void {
  ownerDocument = triggerRef.value?.ownerDocument ?? null;
  ownerWindow = ownerDocument?.defaultView ?? null;
  if (!ownerDocument || !ownerWindow) return;
  frame = useCoalescedFrame({
    request: ownerWindow.requestAnimationFrame.bind(ownerWindow),
    cancel: ownerWindow.cancelAnimationFrame.bind(ownerWindow),
  });
  ownerDocument.addEventListener('pointerdown', onOwnerPointerDown);
  ownerDocument.addEventListener('keydown', onOwnerKeyDown);
  ownerWindow.addEventListener('resize', schedulePlacement);
}

function removeOpenListeners(): void {
  ownerDocument?.removeEventListener('pointerdown', onOwnerPointerDown);
  ownerDocument?.removeEventListener('keydown', onOwnerKeyDown);
  ownerWindow?.removeEventListener('resize', schedulePlacement);
  frame?.dispose();
  frame = null;
  ownerDocument = null;
  ownerWindow = null;
}

async function openMenu(): Promise<void> {
  if (props.disabled || open.value) return;
  open.value = true;
  query.value = '';
  activeIndex.value = selectedEnabledIndex();
  addOpenListeners();
  await nextTick();
  updatePlacement();
  scrollActiveIntoView();
  if (searchEnabled.value) searchRef.value?.focus({ preventScroll: true });
}

function closeMenu(options: { focus?: boolean } = {}): void {
  if (!open.value) return;
  open.value = false;
  query.value = '';
  activeIndex.value = -1;
  removeOpenListeners();
  if (options.focus) nextTick(() => triggerRef.value?.focus({ preventScroll: true }));
}

function selectOption(option: BaseSelectOption): void {
  if (option.disabled) return;
  emit('update:modelValue', option.value);
  closeMenu({ focus: true });
}

function clearValue(event: MouseEvent): void {
  event.stopPropagation();
  if (!props.disabled) emit('update:modelValue', null);
}

function onTriggerClick(): void {
  if (open.value) closeMenu();
  else void openMenu();
}

function onOwnerPointerDown(event: Event): void {
  const target = event.target as Node | null;
  if (!target || triggerRef.value?.contains(target) || menuRef.value?.contains(target)) return;
  closeMenu();
}

function handleKey(event: KeyboardEvent): void {
  if (props.disabled) return;
  const isSearchTarget = event.target === searchRef.value;
  if (isSearchTarget && event.key === ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) return;
  if (event.key === 'Tab') {
    closeMenu();
    return;
  }
  if (event.key === 'Escape') {
    if (open.value) {
      event.preventDefault();
      closeMenu({ focus: true });
    }
    return;
  }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    if (!open.value) {
      void openMenu().then(() => {
        if (event.key === 'ArrowUp') activeIndex.value = lastEnabledIndex();
        scrollActiveIntoView();
      });
    } else {
      moveActive(event.key === 'ArrowDown' ? 1 : -1);
      scrollActiveIntoView();
    }
    return;
  }
  if (event.key === 'Home' || event.key === 'End') {
    if (!open.value) return;
    event.preventDefault();
    activeIndex.value = event.key === 'Home' ? firstEnabledIndex() : lastEnabledIndex();
    scrollActiveIntoView();
    return;
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    if (!open.value) {
      void openMenu();
    } else if (activeOption.value) {
      selectOption(activeOption.value);
    }
  }
}

function onOwnerKeyDown(event: KeyboardEvent): void {
  if (event.target === triggerRef.value || event.target === searchRef.value) return;
  handleKey(event);
}

watch(query, () => {
  activeIndex.value = firstEnabledIndex();
  scrollActiveIntoView();
});
watch(() => props.options, () => {
  if (!open.value) return;
  activeIndex.value = selectedEnabledIndex();
  nextTick(updatePlacement);
}, { deep: true });
watch(() => props.disabled, disabled => {
  if (disabled) closeMenu();
});

onBeforeUnmount(removeOpenListeners);
</script>

<template>
  <div class="wb-control-select-shell" :class="{ 'is-open': open, 'is-disabled': disabled }">
    <div
      ref="triggerRef"
      role="combobox"
      class="wb-control wb-control-select-trigger"
      :class="`wb-control--${size}`"
      :tabindex="disabled ? -1 : 0"
      :aria-disabled="disabled || undefined"
      :aria-controls="listboxId"
      :aria-expanded="open"
      :aria-haspopup="'listbox'"
      :aria-activedescendant="open ? activeDescendant : undefined"
      @click="onTriggerClick"
      @keydown="handleKey"
    >
      <span class="wb-control-select-value" :class="{ 'is-placeholder': !selectedOption }">
        {{ selectedOption?.label ?? placeholder }}
      </span>
      <button
        v-if="clearable && modelValue !== null"
        type="button"
        class="wb-control-select-clear"
        aria-label="清除选择"
        @click="clearValue"
      >×</button>
      <span class="wb-control-select-chevron" aria-hidden="true">⌄</span>
    </div>

    <div
      v-if="open"
      :id="listboxId"
      ref="menuRef"
      role="listbox"
      class="wb-control-select-menu"
      :aria-labelledby="searchEnabled ? searchId : undefined"
      :data-side="placement.side"
      :style="menuStyle"
    >
      <div v-if="searchEnabled" class="wb-control-select-search-wrap">
        <input
          :id="searchId"
          ref="searchRef"
          v-model="query"
          type="search"
          class="wb-control wb-control-input wb-control-select-search"
          placeholder="搜索"
          aria-label="搜索选项"
          @keydown="handleKey"
        />
      </div>
      <div class="wb-control-select-options">
        <button
          v-for="(option, index) in filteredOptions"
          :id="optionId(option)"
          :key="optionKey(option)"
          type="button"
          role="option"
          class="wb-control-select-option"
          :class="{ 'is-active': index === activeIndex, 'is-selected': option.value === modelValue }"
          :disabled="option.disabled"
          :aria-disabled="option.disabled || undefined"
          :aria-selected="option.value === modelValue"
          :data-value-key="optionKey(option)"
          @mouseenter="!option.disabled && (activeIndex = index)"
          @click="selectOption(option)"
        >
          {{ option.label }}
        </button>
        <div v-if="filteredOptions.length === 0" class="wb-control-select-empty">无匹配选项</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wb-control-select-shell {
  position: relative;
  min-width: 0;
}

.wb-control-select-trigger {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  text-align: left;
}

.wb-control-select-value {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wb-control-select-value.is-placeholder,
.wb-control-select-empty {
  color: var(--wb-text-muted);
}

.wb-control-select-clear {
  display: grid;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: inherit;
  background: transparent;
  font: inherit;
}

.wb-control-select-chevron {
  transition: transform 140ms ease;
}

.is-open .wb-control-select-chevron {
  transform: rotate(180deg);
}

.wb-control-select-menu {
  position: absolute;
  z-index: 30;
  box-sizing: border-box;
  display: flex;
  min-height: 40px;
  flex-direction: column;
  overflow: hidden;
  overscroll-behavior: contain;
  border: 1px solid var(--wb-control-border);
  border-radius: var(--wb-control-radius);
  background: var(--wb-control-menu-bg);
  box-shadow: var(--wb-control-menu-shadow);
  touch-action: pan-y;
}

.wb-control-select-search-wrap {
  padding: 8px;
  border-bottom: 1px solid var(--wb-control-border);
}

.wb-control-select-search {
  width: 100%;
}

.wb-control-select-options {
  overflow: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.wb-control-select-option {
  display: block;
  width: 100%;
  min-height: 40px;
  padding: 8px 12px;
  border: 0;
  color: var(--wb-text-main);
  background: transparent;
  font: inherit;
  text-align: left;
}

.wb-control-select-option.is-active {
  background: var(--wb-control-option-active);
}

.wb-control-select-option.is-selected {
  background: var(--wb-control-option-selected);
}

.wb-control-select-option:disabled {
  cursor: not-allowed;
  opacity: var(--wb-control-disabled-opacity);
}

.wb-control-select-empty {
  padding: 12px;
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .wb-control-select-chevron {
    transition: none;
  }
}
</style>
