// @vitest-environment jsdom

import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import BaseSelect from '../../../../src/worldbook_assistant_build/components/controls/BaseSelect.vue';

const options = [
  { value: 1, label: '一', keywords: ['first'] },
  { value: 2, label: '二', disabled: true },
  { value: 3, label: '三', keywords: ['third'] },
  { value: '3', label: '字符串三' },
];

function createAssistantRoot(ownerDocument: Document = document): HTMLElement {
  const root = ownerDocument.createElement('div');
  root.className = 'wb-assistant-root';
  ownerDocument.body.append(root);
  return root;
}

function mountSelect(props: Record<string, unknown> = {}, attachTo?: HTMLElement): VueWrapper {
  const ownerDocument = attachTo?.ownerDocument ?? document;
  const root = attachTo?.closest('.wb-assistant-root') as HTMLElement | null ?? createAssistantRoot(ownerDocument);
  const host = attachTo ?? ownerDocument.createElement('div');
  if (!host.isConnected || host.parentElement !== root) root.append(host);
  return mount(BaseSelect, {
    props: { modelValue: null, options, ...props },
    attachTo: host,
  });
}

function rootOf(wrapper: VueWrapper): HTMLElement {
  return wrapper.element.closest('.wb-assistant-root') as HTMLElement;
}

function menuOf(wrapper: VueWrapper): HTMLElement | null {
  return rootOf(wrapper).querySelector('[role="listbox"]');
}

function layerOf(wrapper: VueWrapper): HTMLElement | null {
  return rootOf(wrapper).querySelector('.wb-control-select-menu');
}

function optionElements(wrapper: VueWrapper): HTMLElement[] {
  return [...rootOf(wrapper).querySelectorAll<HTMLElement>('[role="option"]')];
}

async function flush(): Promise<void> {
  await nextTick();
  await nextTick();
}

async function click(element: Element): Promise<void> {
  element.dispatchEvent(new element.ownerDocument.defaultView!.MouseEvent('click', { bubbles: true }));
  await flush();
}

async function keydown(element: Element, key: string): Promise<KeyboardEvent> {
  const event = new element.ownerDocument.defaultView!.KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  });
  element.dispatchEvent(event);
  await flush();
  return event;
}

async function setInput(element: HTMLInputElement, value: string): Promise<void> {
  element.value = value;
  element.dispatchEvent(new element.ownerDocument.defaultView!.Event('input', { bubbles: true }));
  await flush();
}

async function open(wrapper: VueWrapper): Promise<void> {
  await click(wrapper.get('[data-select-trigger]').element);
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('BaseSelect values, identity, and search', () => {
  it('preserves numeric, string, and null values', async () => {
    const wrapper = mountSelect({ modelValue: 1, clearable: true });
    await open(wrapper);
    await click(rootOf(wrapper).querySelector('[role="option"][data-value-key="number:3"]')!);
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([3]);

    await open(wrapper);
    await click(rootOf(wrapper).querySelector('[role="option"][data-value-key="string:3"]')!);
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual(['3']);
    await click(wrapper.get('.wb-control-select-clear').element);
    expect(wrapper.emitted('update:modelValue')?.[2]).toEqual([null]);
    wrapper.unmount();
  });

  it('assigns unique stable occurrence keys and IDs for duplicate values and sanitized-value collisions', async () => {
    const collisionOptions = [
      { value: 1, label: '数字一 A' },
      { value: 1, label: '数字一 B' },
      { value: 'a b', label: '空格' },
      { value: 'a?b', label: '问号' },
    ];
    const wrapper = mountSelect({ modelValue: 1, options: collisionOptions });
    await open(wrapper);
    const firstIds = optionElements(wrapper).map(option => option.id);

    expect(new Set(firstIds).size).toBe(collisionOptions.length);
    expect(optionElements(wrapper).filter(option => option.dataset.valueKey === 'number:1')).toHaveLength(2);
    expect(optionElements(wrapper).filter(option => option.getAttribute('aria-selected') === 'true')).toHaveLength(2);

    await keydown(wrapper.get('[data-select-trigger]').element, 'Escape');
    await open(wrapper);
    expect(optionElements(wrapper).map(option => option.id)).toEqual(firstIds);
    await click(optionElements(wrapper)[1]!);
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([1]);
    wrapper.unmount();
  });

  it('honors custom thresholds and explicit searchable overrides', async () => {
    const five = Array.from({ length: 5 }, (_, index) => ({ value: index, label: `${index}` }));
    const custom = mountSelect({ options: five, searchable: 'auto', searchThreshold: 4 });
    await open(custom);
    expect(rootOf(custom).querySelector('input[type="search"]')).not.toBeNull();
    custom.unmount();

    const forcedOff = mountSelect({ options: Array.from({ length: 9 }, (_, index) => ({ value: index, label: `${index}` })), searchable: false });
    await open(forcedOff);
    expect(rootOf(forcedOff).querySelector('input[type="search"]')).toBeNull();
    forcedOff.unmount();

    const forcedOn = mountSelect({ options: [{ value: 1, label: '一' }], searchable: true });
    await open(forcedOn);
    expect(rootOf(forcedOn).querySelector('input[type="search"]')).not.toBeNull();
    forcedOn.unmount();
  });

  it('filters by label and keywords and resets query after close', async () => {
    const wrapper = mountSelect({ searchable: true });
    await open(wrapper);
    await setInput(rootOf(wrapper).querySelector('input[type="search"]')!, 'THIRD');
    expect(optionElements(wrapper).map(node => node.textContent)).toEqual(['三']);
    await keydown(rootOf(wrapper).querySelector('input[type="search"]')!, 'Escape');
    await open(wrapper);
    expect((rootOf(wrapper).querySelector('input[type="search"]') as HTMLInputElement).value).toBe('');
    expect(optionElements(wrapper)).toHaveLength(options.length);
    wrapper.unmount();
  });

  it('allows spaces in search without selecting the active option', async () => {
    const wrapper = mountSelect({
      searchable: true,
      options: [{ value: 'two words', label: 'Two Words' }, { value: 'other', label: 'Other' }],
    });
    await open(wrapper);
    const search = rootOf(wrapper).querySelector<HTMLInputElement>('input[type="search"]')!;
    await setInput(search, 'Two');
    await keydown(search, ' ');
    expect(menuOf(wrapper)).not.toBeNull();
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    wrapper.unmount();
  });

  it('clears hidden query and transfers focus when search availability changes while open', async () => {
    const nine = Array.from({ length: 9 }, (_, index) => ({ value: index, label: `选项 ${index}` }));
    const wrapper = mountSelect({ options: nine, searchable: 'auto', modelValue: 0 });
    await open(wrapper);
    const search = rootOf(wrapper).querySelector('input[type="search"]') as HTMLInputElement;
    expect(search.ownerDocument.activeElement).toBe(search);
    await setInput(search, '8');
    expect(optionElements(wrapper)).toHaveLength(1);

    await wrapper.setProps({ options: nine.slice(0, 8) });
    await flush();
    expect(rootOf(wrapper).querySelector('input[type="search"]')).toBeNull();
    expect(optionElements(wrapper)).toHaveLength(8);
    expect(document.activeElement).toBe(wrapper.get('[data-select-trigger]').element);
    expect(wrapper.get('[data-select-trigger]').attributes('aria-activedescendant')).toBe(optionElements(wrapper)[0]!.id);

    await wrapper.setProps({ options: nine, searchThreshold: 4 });
    await flush();
    const restoredSearch = rootOf(wrapper).querySelector('input[type="search"]') as HTMLInputElement;
    expect(document.activeElement).toBe(restoredSearch);
    expect(restoredSearch.getAttribute('aria-activedescendant')).toBe(optionElements(wrapper)[0]!.id);

    await wrapper.setProps({ searchable: false });
    await flush();
    expect(rootOf(wrapper).querySelector('input[type="search"]')).toBeNull();
    expect(document.activeElement).toBe(wrapper.get('[data-select-trigger]').element);
    wrapper.unmount();
  });
});

describe('BaseSelect keyboard and accessibility', () => {
  it('uses the focused element as combobox owner and keeps options out of the Tab order', async () => {
    const nonSearch = mountSelect({ modelValue: 1, searchable: false });
    const trigger = nonSearch.get<HTMLElement>('[data-select-trigger]');
    trigger.element.focus();
    await open(nonSearch);
    expect(trigger.attributes('role')).toBe('combobox');
    expect(trigger.attributes('aria-expanded')).toBe('true');
    expect(trigger.attributes('aria-activedescendant')).toBe(optionElements(nonSearch)[0]!.id);
    expect(optionElements(nonSearch).every(option => option.getAttribute('tabindex') === '-1')).toBe(true);
    expect(document.activeElement).toBe(trigger.element);
    nonSearch.unmount();

    const searchable = mountSelect({ modelValue: 1, searchable: true });
    await open(searchable);
    const search = rootOf(searchable).querySelector('input[type="search"]') as HTMLInputElement;
    expect(document.activeElement).toBe(search);
    expect(search.getAttribute('role')).toBe('combobox');
    expect(search.getAttribute('aria-controls')).toBe(menuOf(searchable)!.id);
    expect(search.getAttribute('aria-expanded')).toBe('true');
    expect(search.getAttribute('aria-activedescendant')).toBe(optionElements(searchable)[0]!.id);
    expect(search.closest('[role="listbox"]')).toBeNull();
    expect(searchable.get('[data-select-trigger]').attributes('aria-activedescendant')).toBeUndefined();
    searchable.unmount();
  });

  it.each(['Enter', ' '])('clears from the focused clear button with %s without selecting the active option', async key => {
    const wrapper = mountSelect({ modelValue: 1, clearable: true, searchable: false });
    const clear = wrapper.get<HTMLButtonElement>('.wb-control-select-clear');
    expect(clear.element.parentElement).toBe(wrapper.get('.wb-control-select-control').element);
    expect(clear.element.parentElement).not.toBe(wrapper.get('[data-select-trigger]').element);
    await open(wrapper);
    clear.element.focus();
    expect(document.activeElement).toBe(clear.element);
    await keydown(clear.element, key);
    await click(clear.element);
    expect(wrapper.emitted('update:modelValue')).toEqual([[null]]);
    expect(menuOf(wrapper)).not.toBeNull();
    wrapper.unmount();
  });

  it('closes from a focused clear button with Escape and restores trigger focus', async () => {
    const wrapper = mountSelect({ modelValue: 1, clearable: true, searchable: false });
    const trigger = wrapper.get<HTMLElement>('[data-select-trigger]').element;
    const clear = wrapper.get<HTMLButtonElement>('.wb-control-select-clear').element;
    await open(wrapper);
    await click(clear);
    clear.focus();

    const event = await keydown(clear, 'Escape');

    expect(event.defaultPrevented).toBe(true);
    expect(menuOf(wrapper)).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(wrapper.emitted('update:modelValue')).toEqual([[null]]);
    wrapper.unmount();
  });

  it('closes from a focused clear button with Tab without preventing normal focus traversal', async () => {
    const wrapper = mountSelect({ modelValue: 1, clearable: true, searchable: false });
    const clear = wrapper.get<HTMLButtonElement>('.wb-control-select-clear').element;
    const after = document.createElement('button');
    rootOf(wrapper).append(after);
    await open(wrapper);
    await click(clear);
    clear.focus();

    const event = await keydown(clear, 'Tab');
    if (!event.defaultPrevented) after.focus();

    expect(event.defaultPrevented).toBe(false);
    expect(menuOf(wrapper)).toBeNull();
    expect(document.activeElement).toBe(after);
    expect(wrapper.emitted('update:modelValue')).toEqual([[null]]);
    wrapper.unmount();
  });

  it('navigates, skips disabled options, and selects with Enter or Space', async () => {
    const wrapper = mountSelect({ searchable: false });
    const trigger = wrapper.get('[data-select-trigger]').element;
    await keydown(trigger, 'ArrowDown');
    expect(trigger.getAttribute('aria-activedescendant')).toBe(optionElements(wrapper)[0]!.id);
    await keydown(trigger, 'ArrowDown');
    expect(trigger.getAttribute('aria-activedescendant')).toBe(optionElements(wrapper)[2]!.id);
    await keydown(trigger, 'Home');
    expect(trigger.getAttribute('aria-activedescendant')).toBe(optionElements(wrapper)[0]!.id);
    await keydown(trigger, 'End');
    expect(trigger.getAttribute('aria-activedescendant')).toBe(optionElements(wrapper)[3]!.id);
    await keydown(trigger, 'Enter');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['3']);

    await keydown(trigger, ' ');
    await keydown(trigger, 'Home');
    await keydown(trigger, ' ');
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([1]);
    wrapper.unmount();
  });

  it('closes with Escape or Tab and does not hijack keys from unrelated document elements', async () => {
    const wrapper = mountSelect({ modelValue: 1, searchable: false });
    const trigger = wrapper.get('[data-select-trigger]').element;
    await open(wrapper);
    const initialActive = trigger.getAttribute('aria-activedescendant');
    const unrelated = document.createElement('input');
    document.body.append(unrelated);
    await keydown(unrelated, 'ArrowDown');
    expect(trigger.getAttribute('aria-activedescendant')).toBe(initialActive);

    await keydown(trigger, 'End');
    await keydown(trigger, 'Escape');
    expect(menuOf(wrapper)).toBeNull();
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    await open(wrapper);
    await keydown(trigger, 'Tab');
    expect(menuOf(wrapper)).toBeNull();
    wrapper.unmount();
  });
});

describe('BaseSelect root layer positioning', () => {
  it('reparents the menu to the assistant root to escape nested overflow clipping and aligns down/clamped coordinates', async () => {
    const root = createAssistantRoot();
    const hidden = document.createElement('div');
    hidden.style.overflow = 'hidden';
    const scroll = document.createElement('div');
    scroll.style.overflow = 'auto';
    const host = document.createElement('div');
    root.append(hidden);
    hidden.append(scroll);
    scroll.append(host);
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({ left: 100, right: 460, top: 50, bottom: 750, width: 360, height: 700, x: 100, y: 50, toJSON: () => ({}) });
    const wrapper = mountSelect({}, host);
    vi.spyOn(wrapper.get('[data-select-trigger]').element, 'getBoundingClientRect').mockReturnValue({ left: 430, right: 530, top: 200, bottom: 236, width: 100, height: 36, x: 430, y: 200, toJSON: () => ({}) });

    await open(wrapper);
    const layer = layerOf(wrapper)!;
    expect(layer.parentElement).toBe(root);
    expect(layer.getAttributeNames().some(name => name.startsWith('data-v-'))).toBe(true);
    expect(layer.style.left).toBe('252px');
    expect(layer.style.top).toBe('186px');
    expect(layer.dataset.side).toBe('down');
    await keydown(wrapper.get('[data-select-trigger]').element, 'Escape');
    expect(root.querySelector('.wb-control-select-menu')).toBeNull();
    wrapper.unmount();
  });

  it('aligns upward placement from a nonzero root and trigger offset', async () => {
    const root = createAssistantRoot();
    const host = document.createElement('div');
    root.append(host);
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({ left: 40, right: 400, top: 100, bottom: 700, width: 360, height: 600, x: 40, y: 100, toJSON: () => ({}) });
    const wrapper = mountSelect({}, host);
    vi.spyOn(wrapper.get('[data-select-trigger]').element, 'getBoundingClientRect').mockReturnValue({ left: 110, right: 310, top: 620, bottom: 656, width: 200, height: 36, x: 110, y: 620, toJSON: () => ({}) });

    await open(wrapper);
    const layer = layerOf(wrapper)!;
    expect(layer.parentElement).toBe(root);
    expect(layer.style.left).toBe('70px');
    expect(layer.style.top).toBe('240px');
    expect(layer.dataset.side).toBe('up');
    wrapper.unmount();
  });
});

describe('BaseSelect owner lifecycle', () => {
  it('uses only the iframe owner document/window and cancels a pending owner RAF on close', async () => {
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    const ownerDocument = iframe.contentDocument!;
    const root = createAssistantRoot(ownerDocument);
    const host = ownerDocument.createElement('div');
    root.append(host);
    const ownerWindow = ownerDocument.defaultView!;
    const addDocument = vi.spyOn(ownerDocument, 'addEventListener');
    const removeDocument = vi.spyOn(ownerDocument, 'removeEventListener');
    const addWindow = vi.spyOn(ownerWindow, 'addEventListener');
    const removeWindow = vi.spyOn(ownerWindow, 'removeEventListener');
    const request = vi.spyOn(ownerWindow, 'requestAnimationFrame').mockReturnValue(41);
    const cancel = vi.spyOn(ownerWindow, 'cancelAnimationFrame').mockImplementation(() => undefined);
    const localAdd = vi.spyOn(document, 'addEventListener');
    const wrapper = mountSelect({ searchable: false }, host);

    await open(wrapper);
    expect(menuOf(wrapper)!.ownerDocument).toBe(ownerDocument);
    expect(addDocument.mock.calls.filter(([type]) => type === 'pointerdown')).toHaveLength(1);
    expect(addDocument.mock.calls.filter(([type]) => type === 'keydown')).toHaveLength(0);
    expect(addWindow.mock.calls.filter(([type]) => type === 'resize')).toHaveLength(1);
    expect(localAdd.mock.calls.filter(([type]) => type === 'pointerdown' || type === 'keydown')).toHaveLength(0);
    ownerWindow.dispatchEvent(new ownerWindow.Event('resize'));
    ownerWindow.dispatchEvent(new ownerWindow.Event('resize'));
    expect(request).toHaveBeenCalledTimes(1);
    await keydown(wrapper.get('[data-select-trigger]').element, 'Escape');
    expect(cancel).toHaveBeenCalledWith(41);
    expect(removeDocument.mock.calls.filter(([type]) => type === 'pointerdown')).toHaveLength(1);
    expect(removeWindow.mock.calls.filter(([type]) => type === 'resize')).toHaveLength(1);
    wrapper.unmount();
    iframe.remove();
  });

  it('returns document/window listener and menu counts to baseline over twenty cycles', async () => {
    const addDocument = vi.spyOn(document, 'addEventListener');
    const removeDocument = vi.spyOn(document, 'removeEventListener');
    const addWindow = vi.spyOn(window, 'addEventListener');
    const removeWindow = vi.spyOn(window, 'removeEventListener');
    const request = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 1;
    });
    const wrapper = mountSelect({ searchable: false });
    const baselines = {
      addPointer: addDocument.mock.calls.filter(([type]) => type === 'pointerdown').length,
      removePointer: removeDocument.mock.calls.filter(([type]) => type === 'pointerdown').length,
      addResize: addWindow.mock.calls.filter(([type]) => type === 'resize').length,
      removeResize: removeWindow.mock.calls.filter(([type]) => type === 'resize').length,
    };

    for (let index = 0; index < 20; index += 1) {
      await open(wrapper);
      expect(rootOf(wrapper).querySelectorAll('[role="listbox"]')).toHaveLength(1);
      window.dispatchEvent(new Event('resize'));
      await keydown(wrapper.get('[data-select-trigger]').element, 'Escape');
      expect(rootOf(wrapper).querySelectorAll('[role="listbox"]')).toHaveLength(0);
    }

    expect(addDocument.mock.calls.filter(([type]) => type === 'pointerdown')).toHaveLength(baselines.addPointer + 20);
    expect(removeDocument.mock.calls.filter(([type]) => type === 'pointerdown')).toHaveLength(baselines.removePointer + 20);
    expect(addWindow.mock.calls.filter(([type]) => type === 'resize')).toHaveLength(baselines.addResize + 20);
    expect(removeWindow.mock.calls.filter(([type]) => type === 'resize')).toHaveLength(baselines.removeResize + 20);
    expect(request).toHaveBeenCalledTimes(20);
    wrapper.unmount();
  });

  it('removes the root-layer menu and owner resources on disable or unmount', async () => {
    const removeDocument = vi.spyOn(document, 'removeEventListener');
    const removeWindow = vi.spyOn(window, 'removeEventListener');
    const wrapper = mountSelect();
    await open(wrapper);
    await wrapper.setProps({ disabled: true });
    await flush();
    expect(menuOf(wrapper)).toBeNull();
    expect(removeDocument.mock.calls.filter(([type]) => type === 'pointerdown')).toHaveLength(1);
    expect(removeWindow.mock.calls.filter(([type]) => type === 'resize')).toHaveLength(1);

    await wrapper.setProps({ disabled: false });
    await open(wrapper);
    const root = rootOf(wrapper);
    wrapper.unmount();
    expect(root.querySelectorAll('[role="listbox"]')).toHaveLength(0);
    expect(removeDocument.mock.calls.filter(([type]) => type === 'pointerdown')).toHaveLength(2);
    expect(removeWindow.mock.calls.filter(([type]) => type === 'resize')).toHaveLength(2);
  });
});

describe('BaseSelect DOM contract', () => {
  it('uses an explicit clear state class for value padding', () => {
    const clearable = mountSelect({ modelValue: 1, clearable: true });
    expect(clearable.get('.wb-control-select-control').classes()).toContain('has-clear');
    clearable.unmount();

    const empty = mountSelect({ modelValue: null, clearable: true });
    expect(empty.get('.wb-control-select-control').classes()).not.toContain('has-clear');
    empty.unmount();
  });

  it('renders no closed menu, native select, or Teleport', async () => {
    const wrapper = mountSelect();
    expect(menuOf(wrapper)).toBeNull();
    expect(rootOf(wrapper).querySelector('select')).toBeNull();
    await open(wrapper);
    expect(menuOf(wrapper)).not.toBeNull();
    expect(rootOf(wrapper).innerHTML).not.toContain('teleport');
    wrapper.unmount();
  });
});
