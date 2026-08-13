<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useAttrs, watch } from 'vue';

import { useCoalescedFrame, type CoalescedFrame } from '../../composables/useCoalescedFrame';
import { calculateSelectMenuPlacement, type SelectMenuPlacement } from './selectPosition';

export interface BaseSelectOption<T extends string | number = string | number> {
  value: T;
  label: string;
  disabled?: boolean;
  keywords?: string[];
}

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();

interface IndexedOption {
  option: BaseSelectOption;
  sourceIndex: number;
  valueKey: string;
  occurrenceKey: string;
  id: string;
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
    selectedLabel?: string;
    searchPlaceholder?: string;
    noMatchText?: string;
  }>(),
  {
    searchable: 'auto',
    searchThreshold: 8,
    clearable: false,
    disabled: false,
    size: 'md',
    placeholder: '请选择',
    selectedLabel: undefined,
    searchPlaceholder: '搜索',
    noMatchText: '无匹配选项',
  },
);

const emit = defineEmits<{ 'update:modelValue': [value: string | number | null] }>();

let idSeed = 0;
const instanceId = `wb-base-select-${++idSeed}`;
const listboxId = `${instanceId}-listbox`;
const searchLabelId = `${instanceId}-search-label`;
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

function valueKey(option: BaseSelectOption): string {
  return `${typeof option.value}:${String(option.value)}`;
}

const indexedOptions = computed<IndexedOption[]>(() => {
  const occurrences = new Map<string, number>();
  return props.options.map((option, sourceIndex) => {
    const key = valueKey(option);
    const occurrence = occurrences.get(key) ?? 0;
    occurrences.set(key, occurrence + 1);
    return {
      option,
      sourceIndex,
      valueKey: key,
      occurrenceKey: `${key}:${occurrence}`,
      id: `${instanceId}-option-${sourceIndex}-${occurrence}`,
    };
  });
});
const searchEnabled = computed(() =>
  props.searchable === true || (props.searchable === 'auto' && props.options.length > props.searchThreshold),
);
const selectedOption = computed(() => props.options.find(option => option.value === props.modelValue) ?? null);
const displayedSelectedLabel = computed(() => selectedOption.value?.label ?? props.selectedLabel ?? null);
const filteredOptions = computed(() => {
  const normalizedQuery = query.value.trim().toLocaleLowerCase();
  if (!normalizedQuery) return indexedOptions.value;
  return indexedOptions.value.filter(({ option }) =>
    [option.label, ...(option.keywords ?? [])].some(text => text.toLocaleLowerCase().includes(normalizedQuery)),
  );
});
const activeEntry = computed(() => filteredOptions.value[activeIndex.value] ?? null);
const activeDescendant = computed(() => activeEntry.value?.id);
const triggerAttrs = computed(() => Object.fromEntries(
  Object.entries(attrs).filter(([name]) => name === 'id'
    || name === 'title'
    || name.startsWith('aria-')
    || name.startsWith('data-')),
));
const searchAttrs = computed(() => {
  const labelledby = typeof attrs['aria-labelledby'] === 'string' ? attrs['aria-labelledby'].trim() : '';
  const label = typeof attrs['aria-label'] === 'string' ? attrs['aria-label'].trim() : '';
  return {
    'aria-labelledby': labelledby ? `${labelledby} ${searchLabelId}` : undefined,
    'aria-label': labelledby ? (label || undefined) : `${label ? `${label} ` : ''}搜索选项`,
    'aria-describedby': typeof attrs['aria-describedby'] === 'string' ? attrs['aria-describedby'] : undefined,
    'aria-description': typeof attrs['aria-description'] === 'string' ? attrs['aria-description'] : undefined,
    'aria-details': typeof attrs['aria-details'] === 'string' ? attrs['aria-details'] : undefined,
    title: typeof attrs.title === 'string' ? attrs.title : undefined,
  };
});
const menuStyle = computed(() => ({
  left: `${placement.value.left}px`,
  top: `${placement.value.top}px`,
  width: `${placement.value.width}px`,
  maxHeight: `${placement.value.maxHeight}px`,
}));

function firstEnabledIndex(): number {
  return filteredOptions.value.findIndex(({ option }) => !option.disabled);
}

function lastEnabledIndex(): number {
  for (let index = filteredOptions.value.length - 1; index >= 0; index -= 1) {
    if (!filteredOptions.value[index]?.option.disabled) return index;
  }
  return -1;
}

function selectedEnabledIndex(): number {
  const index = filteredOptions.value.findIndex(({ option }) => option.value === props.modelValue && !option.disabled);
  return index >= 0 ? index : firstEnabledIndex();
}

function normalizeActiveIndex(preferSelected = false): void {
  const current = filteredOptions.value[activeIndex.value];
  if (!preferSelected && current && !current.option.disabled) return;
  activeIndex.value = selectedEnabledIndex();
}

function moveActive(direction: 1 | -1): void {
  const entries = filteredOptions.value;
  if (!entries.length) {
    activeIndex.value = -1;
    return;
  }
  let index = activeIndex.value;
  for (let count = 0; count < entries.length; count += 1) {
    index = (index + direction + entries.length) % entries.length;
    if (!entries[index]?.option.disabled) {
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

function moveMenuToRoot(): void {
  const root = ownerRoot();
  const menu = menuRef.value;
  if (root && menu && menu.parentElement !== root) root.append(menu);
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
    active?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
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
  ownerDocument.addEventListener('scroll', schedulePlacement, true);
  ownerWindow.addEventListener('resize', schedulePlacement);
}

function removeOpenListeners(): void {
  ownerDocument?.removeEventListener('pointerdown', onOwnerPointerDown);
  ownerDocument?.removeEventListener('scroll', schedulePlacement, true);
  ownerWindow?.removeEventListener('resize', schedulePlacement);
  frame?.dispose();
  frame = null;
  ownerDocument = null;
  ownerWindow = null;
}

async function focusCurrentOwner(): Promise<void> {
  await nextTick();
  const target = searchEnabled.value ? searchRef.value : triggerRef.value;
  target?.focus({ preventScroll: true });
}

async function openMenu(): Promise<void> {
  if (props.disabled || open.value) return;
  open.value = true;
  query.value = '';
  activeIndex.value = selectedEnabledIndex();
  addOpenListeners();
  await nextTick();
  moveMenuToRoot();
  updatePlacement();
  scrollActiveIntoView();
  await focusCurrentOwner();
}

function closeMenu(options: { focus?: boolean } = {}): void {
  if (!open.value) return;
  open.value = false;
  query.value = '';
  activeIndex.value = -1;
  removeOpenListeners();
  if (options.focus) nextTick(() => triggerRef.value?.focus({ preventScroll: true }));
}

function selectOption(entry: IndexedOption): void {
  if (entry.option.disabled) return;
  emit('update:modelValue', entry.option.value);
  closeMenu({ focus: true });
}

function clearValue(): void {
  if (!props.disabled) emit('update:modelValue', null);
}

function onTriggerClick(): void {
  if (open.value) closeMenu();
  else void openMenu();
}

function onClearClick(event: MouseEvent): void {
  event.stopPropagation();
  clearValue();
}

function onClearKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    if (open.value) {
      event.preventDefault();
      closeMenu({ focus: true });
    }
    return;
  }
  if (event.key === 'Tab') {
    closeMenu();
    return;
  }
  if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
}

function onOwnerPointerDown(event: Event): void {
  const target = event.target as Node | null;
  if (!target || triggerRef.value?.parentElement?.contains(target) || menuRef.value?.contains(target)) return;
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
    if (!open.value) void openMenu();
    else if (activeEntry.value) selectOption(activeEntry.value);
  }
}

watch(query, () => {
  activeIndex.value = firstEnabledIndex();
  scrollActiveIntoView();
});
watch(() => props.options, () => {
  if (!open.value) return;
  normalizeActiveIndex(true);
  nextTick(() => {
    moveMenuToRoot();
    updatePlacement();
  });
}, { deep: true });
watch(searchEnabled, async (enabled, wasEnabled) => {
  if (!open.value || enabled === wasEnabled) return;
  query.value = '';
  normalizeActiveIndex(true);
  await nextTick();
  moveMenuToRoot();
  updatePlacement();
  await focusCurrentOwner();
  scrollActiveIntoView();
});
watch(() => props.disabled, disabled => {
  if (disabled) closeMenu();
});

onBeforeUnmount(() => {
  removeOpenListeners();
  menuRef.value?.remove();
});
</script>

<template>
  <div class="wb-control-select-shell" :class="{ 'is-open': open, 'is-disabled': disabled }">
    <div class="wb-control-select-control" :class="{ 'has-clear': clearable && modelValue !== null }">
      <div
        ref="triggerRef"
        v-bind="triggerAttrs"
        role="combobox"
        data-select-trigger
        class="wb-control wb-control-select-trigger"
        :class="`wb-control--${size}`"
        :tabindex="disabled ? -1 : 0"
        :aria-disabled="disabled || undefined"
        :aria-controls="listboxId"
        :aria-expanded="open"
        aria-haspopup="listbox"
        :aria-activedescendant="open && !searchEnabled ? activeDescendant : undefined"
        @click="onTriggerClick"
        @keydown="handleKey"
      >
        <span class="wb-control-select-value" :class="{ 'is-placeholder': !displayedSelectedLabel }">
          {{ displayedSelectedLabel ?? placeholder }}
        </span>
        <span class="wb-control-select-chevron" aria-hidden="true">⌄</span>
      </div>
      <button
        v-if="clearable && modelValue !== null"
        type="button"
        class="wb-control-select-clear"
        aria-label="清除选择"
        :disabled="disabled"
        @click="onClearClick"
        @keydown="onClearKeydown"
      >×</button>
    </div>

    <div
      v-if="open"
      ref="menuRef"
      class="wb-control-select-menu"
      :data-side="placement.side"
      :style="menuStyle"
    >
      <div v-if="searchEnabled" class="wb-control-select-search-wrap">
        <span :id="searchLabelId" class="wb-control-visually-hidden">搜索选项</span>
        <input
          ref="searchRef"
          v-model="query"
          v-bind="searchAttrs"
          type="search"
          role="combobox"
          class="wb-control wb-control-input wb-control-select-search"
          :placeholder="searchPlaceholder"
          :aria-controls="listboxId"
          aria-expanded="true"
          aria-haspopup="listbox"
          :aria-activedescendant="activeDescendant"
          @keydown="handleKey"
        />
      </div>
      <div :id="listboxId" role="listbox" class="wb-control-select-options">
        <button
          v-for="(entry, index) in filteredOptions"
          :id="entry.id"
          :key="entry.occurrenceKey"
          type="button"
          role="option"
          tabindex="-1"
          class="wb-control-select-option"
          :class="{ 'is-active': index === activeIndex, 'is-selected': entry.option.value === modelValue }"
          :disabled="entry.option.disabled"
          :aria-disabled="entry.option.disabled || undefined"
          :aria-selected="entry.option.value === modelValue"
          :data-value-key="entry.valueKey"
          @mouseenter="!entry.option.disabled && (activeIndex = index)"
          @click="selectOption(entry)"
        >
          {{ entry.option.label }}
        </button>
        <div v-if="filteredOptions.length === 0" class="wb-control-select-empty">{{ noMatchText }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wb-control-select-shell {
  min-width: 0;
}

.wb-control-select-control {
  position: relative;
  display: flex;
  min-width: 0;
}

.wb-control-select-trigger {
  display: flex;
  width: 100%;
  min-width: 0;
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
  position: absolute;
  top: 50%;
  right: 28px;
  z-index: 1;
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: inherit;
  background: transparent;
  font: inherit;
  transform: translateY(-50%);
}

.wb-control-select-control.has-clear .wb-control-select-value {
  padding-right: 24px;
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

.wb-control-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
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
