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

function mountSelect(props: Record<string, unknown> = {}, attachTo: HTMLElement = document.body): VueWrapper {
  return mount(BaseSelect, {
    props: { modelValue: null, options, ...props },
    attachTo,
  });
}

async function open(wrapper: VueWrapper): Promise<void> {
  await wrapper.get('[role="combobox"]').trigger('click');
  await nextTick();
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('BaseSelect values and search', () => {
  it('preserves numeric, string, and null values', async () => {
    const numeric = mountSelect({ modelValue: 1, clearable: true });
    await open(numeric);
    await numeric.get('[role="option"][data-value-key="number:3"]').trigger('click');
    expect(numeric.emitted('update:modelValue')?.[0]).toEqual([3]);

    await open(numeric);
    await numeric.get('[role="option"][data-value-key="string:3"]').trigger('click');
    expect(numeric.emitted('update:modelValue')?.[1]).toEqual(['3']);
    await numeric.get('.wb-control-select-clear').trigger('click');
    expect(numeric.emitted('update:modelValue')?.[2]).toEqual([null]);
    numeric.unmount();
  });

  it('enables auto search only above the default threshold of eight', async () => {
    const eight = mountSelect({ options: Array.from({ length: 8 }, (_, index) => ({ value: index, label: `${index}` })), searchable: 'auto' });
    await open(eight);
    expect(eight.find('input[type="search"]').exists()).toBe(false);
    eight.unmount();

    const nine = mountSelect({ options: Array.from({ length: 9 }, (_, index) => ({ value: index, label: `${index}` })), searchable: 'auto' });
    await open(nine);
    expect(nine.find('input[type="search"]').exists()).toBe(true);
    nine.unmount();
  });

  it('filters case-insensitively by label and keywords', async () => {
    const wrapper = mountSelect({ searchable: true });
    await open(wrapper);
    await wrapper.get('input[type="search"]').setValue('THIRD');
    expect(wrapper.findAll('[role="option"]').map(node => node.text())).toEqual(['三']);
    wrapper.unmount();
  });

  it('allows spaces to be typed into the search query without selecting the active option', async () => {
    const wrapper = mountSelect({
      searchable: true,
      options: [{ value: 'two words', label: 'Two Words' }, { value: 'other', label: 'Other' }],
    });
    await open(wrapper);
    const search = wrapper.get('input[type="search"]');
    await search.setValue('Two');
    await search.trigger('keydown', { key: ' ' });

    expect(wrapper.find('[role="listbox"]').exists()).toBe(true);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    wrapper.unmount();
  });
});

describe('BaseSelect keyboard and accessibility', () => {
  it('connects stable combobox, listbox, and active option IDs', async () => {
    const wrapper = mountSelect({ modelValue: 1 });
    const combobox = wrapper.get('[role="combobox"]');
    const controlsId = combobox.attributes('aria-controls');
    await open(wrapper);

    expect(wrapper.get('[role="listbox"]').attributes('id')).toBe(controlsId);
    expect(combobox.attributes('aria-expanded')).toBe('true');
    expect(combobox.attributes('aria-activedescendant')).toBe(wrapper.get('[role="option"][aria-selected="true"]').attributes('id'));
    await combobox.trigger('keydown', { key: 'Escape' });
    await open(wrapper);
    expect(wrapper.get('[role="listbox"]').attributes('id')).toBe(controlsId);
    wrapper.unmount();
  });

  it('navigates Arrow/Home/End, skips disabled options, and selects with Enter or Space', async () => {
    const wrapper = mountSelect();
    const combobox = wrapper.get('[role="combobox"]');
    await combobox.trigger('keydown', { key: 'ArrowDown' });
    expect(combobox.attributes('aria-activedescendant')).toContain('number-1');
    await combobox.trigger('keydown', { key: 'ArrowDown' });
    expect(combobox.attributes('aria-activedescendant')).toContain('number-3');
    await combobox.trigger('keydown', { key: 'Home' });
    expect(combobox.attributes('aria-activedescendant')).toContain('number-1');
    await combobox.trigger('keydown', { key: 'End' });
    expect(combobox.attributes('aria-activedescendant')).toContain('string-3');
    await combobox.trigger('keydown', { key: 'Enter' });
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['3']);

    await combobox.trigger('keydown', { key: ' ' });
    await combobox.trigger('keydown', { key: 'Home' });
    await combobox.trigger('keydown', { key: ' ' });
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([1]);
    wrapper.unmount();
  });

  it('closes with Escape without mutation and closes with Tab', async () => {
    const wrapper = mountSelect({ modelValue: 1 });
    const combobox = wrapper.get('[role="combobox"]');
    await open(wrapper);
    await combobox.trigger('keydown', { key: 'End' });
    await combobox.trigger('keydown', { key: 'Escape' });
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    await open(wrapper);
    await combobox.trigger('keydown', { key: 'Tab' });
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('scrolls the selected/active option into view', async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
    const wrapper = mountSelect({ modelValue: 3 });
    await open(wrapper);
    expect(scrollIntoView).toHaveBeenCalled();
    scrollIntoView.mockClear();
    await wrapper.get('[role="combobox"]').trigger('keydown', { key: 'End' });
    await nextTick();
    expect(scrollIntoView).toHaveBeenCalled();
    wrapper.unmount();
  });
});

describe('BaseSelect owner document and cleanup', () => {
  it('mounts and listens in the iframe owner document only while open, then closes outside', async () => {
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    const ownerDocument = iframe.contentDocument!;
    const host = ownerDocument.createElement('div');
    ownerDocument.body.append(host);
    const add = vi.spyOn(ownerDocument, 'addEventListener');
    const remove = vi.spyOn(ownerDocument, 'removeEventListener');
    const localAdd = vi.spyOn(document, 'addEventListener');
    const wrapper = mountSelect({}, host);

    expect(add.mock.calls.filter(([type]) => type === 'pointerdown' || type === 'keydown')).toHaveLength(0);
    await open(wrapper);
    expect(wrapper.get('[role="listbox"]').element.ownerDocument).toBe(ownerDocument);
    expect(add.mock.calls.filter(([type]) => type === 'pointerdown' || type === 'keydown')).toHaveLength(2);
    expect(localAdd.mock.calls.filter(([type]) => type === 'pointerdown' || type === 'keydown')).toHaveLength(0);
    ownerDocument.body.dispatchEvent(new ownerDocument.defaultView!.PointerEvent('pointerdown', { bubbles: true }));
    await nextTick();
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(remove.mock.calls.filter(([type]) => type === 'pointerdown' || type === 'keydown')).toHaveLength(2);
    wrapper.unmount();
    iframe.remove();
  });

  it('does not accumulate menus or owner listeners over twenty cycles', async () => {
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    const wrapper = mountSelect();
    const addedBaseline = add.mock.calls.filter(([type]) => type === 'pointerdown' || type === 'keydown').length;
    const removedBaseline = remove.mock.calls.filter(([type]) => type === 'pointerdown' || type === 'keydown').length;
    for (let index = 0; index < 20; index += 1) {
      await open(wrapper);
      expect(document.querySelectorAll('[role="listbox"]')).toHaveLength(1);
      await wrapper.get('[role="combobox"]').trigger('keydown', { key: 'Escape' });
      expect(document.querySelectorAll('[role="listbox"]')).toHaveLength(0);
    }
    expect(add.mock.calls.filter(([type]) => type === 'pointerdown' || type === 'keydown')).toHaveLength(addedBaseline + 40);
    expect(remove.mock.calls.filter(([type]) => type === 'pointerdown' || type === 'keydown')).toHaveLength(removedBaseline + 40);
    wrapper.unmount();
  });

  it('removes owner document/window listeners and menu on disable or unmount', async () => {
    const removeDocument = vi.spyOn(document, 'removeEventListener');
    const removeWindow = vi.spyOn(window, 'removeEventListener');
    const wrapper = mountSelect();
    await open(wrapper);
    await wrapper.setProps({ disabled: true });
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(removeDocument.mock.calls.filter(([type]) => type === 'pointerdown' || type === 'keydown')).toHaveLength(2);
    expect(removeWindow.mock.calls.filter(([type]) => type === 'resize')).toHaveLength(1);

    await wrapper.setProps({ disabled: false });
    await open(wrapper);
    wrapper.unmount();
    expect(document.querySelectorAll('[role="listbox"]')).toHaveLength(0);
    expect(removeDocument.mock.calls.filter(([type]) => type === 'pointerdown' || type === 'keydown')).toHaveLength(4);
    expect(removeWindow.mock.calls.filter(([type]) => type === 'resize')).toHaveLength(2);
  });
});

describe('BaseSelect DOM and style contract', () => {
  it('renders no menu while closed and contains no native select or teleport', async () => {
    const wrapper = mountSelect();
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(wrapper.find('select').exists()).toBe(false);
    await open(wrapper);
    expect(wrapper.find('[role="listbox"]').exists()).toBe(true);
    expect(wrapper.html()).not.toContain('teleport');
    wrapper.unmount();
  });
});
