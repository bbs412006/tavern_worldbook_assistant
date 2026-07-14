// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import WorldbookPicker from '../../../src/worldbook_assistant_build/components/WorldbookPicker.vue';
import BaseSelect from '../../../src/worldbook_assistant_build/components/controls/BaseSelect.vue';

function mountPicker() {
  const host = document.createElement('div');
  host.className = 'wb-assistant-root';
  document.body.append(host);
  return mount(WorldbookPicker, {
    attachTo: host,
    props: {
      modelValue: '世界书 A',
      names: ['世界书 A', '世界书 B', '搜索目标', '世界书 C', '世界书 D', '世界书 E', '世界书 F', '世界书 G', '世界书 H'],
      showTagFilter: true,
      tagDefinitions: [{ id: 'tag-a', name: '标签 A' }],
    },
  });
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('WorldbookPicker', () => {
  it('uses the real searchable BaseSelect menu and preserves worldbook string values', async () => {
    const wrapper = mountPicker();

    expect(wrapper.find('select').exists()).toBe(false);
    expect(wrapper.findComponent(BaseSelect).exists()).toBe(true);
    await wrapper.get('[role="combobox"]').trigger('click');
    const search = document.querySelector<HTMLInputElement>('.wb-control-select-menu input[type="search"]');
    expect(search).not.toBeNull();
    search!.value = '目标';
    search!.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    const option = document.querySelector<HTMLElement>('[role="option"][data-value-key="string:搜索目标"]');
    expect(option).not.toBeNull();
    option!.click();
    await nextTick();

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['搜索目标']);
    expect(document.querySelectorAll('.wb-control-select-menu')).toHaveLength(0);
    wrapper.unmount();
  });

  it('keeps OR/AND and descendants/exact tag-filter values unchanged', async () => {
    const wrapper = mountPicker();
    const selects = wrapper.findAllComponents(BaseSelect);

    expect(selects).toHaveLength(3);
    await selects[1].vm.$emit('update:modelValue', 'and');
    await selects[2].vm.$emit('update:modelValue', 'exact');

    expect((wrapper.vm as unknown as { tagFilterLogic: string }).tagFilterLogic).toBe('and');
    expect((wrapper.vm as unknown as { tagFilterMatchMode: string }).tagFilterMatchMode).toBe('exact');
    wrapper.unmount();
  });

  it('returns menu DOM and owner listeners to baseline after 20 open-close cycles', async () => {
    const addDocument = vi.spyOn(document, 'addEventListener');
    const removeDocument = vi.spyOn(document, 'removeEventListener');
    const addWindow = vi.spyOn(window, 'addEventListener');
    const removeWindow = vi.spyOn(window, 'removeEventListener');
    const wrapper = mountPicker();
    const trigger = wrapper.get('[role="combobox"]');
    const pointerAddsBefore = addDocument.mock.calls.filter(([type]) => type === 'pointerdown').length;
    const pointerRemovesBefore = removeDocument.mock.calls.filter(([type]) => type === 'pointerdown').length;
    const resizeAddsBefore = addWindow.mock.calls.filter(([type]) => type === 'resize').length;
    const resizeRemovesBefore = removeWindow.mock.calls.filter(([type]) => type === 'resize').length;

    for (let cycle = 0; cycle < 20; cycle += 1) {
      await trigger.trigger('click');
      expect(document.querySelectorAll('.wb-control-select-menu')).toHaveLength(1);
      await trigger.trigger('click');
      expect(document.querySelectorAll('.wb-control-select-menu')).toHaveLength(0);
    }

    expect(addDocument.mock.calls.filter(([type]) => type === 'pointerdown').length - pointerAddsBefore).toBe(20);
    expect(removeDocument.mock.calls.filter(([type]) => type === 'pointerdown').length - pointerRemovesBefore).toBe(20);
    expect(addWindow.mock.calls.filter(([type]) => type === 'resize').length - resizeAddsBefore).toBe(20);
    expect(removeWindow.mock.calls.filter(([type]) => type === 'resize').length - resizeRemovesBefore).toBe(20);
    wrapper.unmount();
  });
});
