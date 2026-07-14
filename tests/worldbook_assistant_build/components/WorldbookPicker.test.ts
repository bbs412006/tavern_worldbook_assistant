// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import WorldbookPicker from '../../../src/worldbook_assistant_build/components/WorldbookPicker.vue';
import BaseSelect from '../../../src/worldbook_assistant_build/components/controls/BaseSelect.vue';

function mountPicker(extraProps: Record<string, unknown> = {}) {
  const host = document.createElement('div');
  host.className = 'wb-assistant-root';
  document.body.append(host);
  return mount(WorldbookPicker, {
    attachTo: host,
    props: {
      modelValue: '世界书 A',
      names: ['世界书 A', '世界书 B', '搜索目标', '世界书 C', '世界书 D', '世界书 E', '世界书 F', '世界书 G', '世界书 H'],
      showTagFilter: true,
      tagDefinitions: [
        { id: 'root', name: '分类', parent_id: null, sort: 0, color: '#111111' },
        { id: 'tag-a', name: '标签 A', parent_id: 'root', sort: 0, color: '#222222' },
        { id: 'tag-b', name: '标签 B', parent_id: null, sort: 1, color: '#333333' },
      ],
      tagAssignments: { '世界书 A': ['tag-a'], '世界书 B': ['tag-b'] },
      tagPathMap: new Map([['root', '分类'], ['tag-a', '分类/标签 A'], ['tag-b', '标签 B']]),
      selectedTagIds: [],
      tagFilterLogic: 'or',
      tagFilterMatchMode: 'descendants',
      mobileTagView: false,
      searchPlaceholder: '搜索世界书...',
      noMatchText: '没有匹配的世界书',
      ...extraProps,
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
    const search = document.querySelector<HTMLInputElement>('.wb-control-select-menu input[type="search"]')!;
    search.value = '目标';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    document.querySelector<HTMLElement>('[role="option"][data-value-key="string:搜索目标"]')!.click();
    await nextTick();
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['搜索目标']);
    expect(document.querySelectorAll('.wb-control-select-menu')).toHaveLength(0);
    wrapper.unmount();
  });

  it('forwards worldbook search and empty-result copy to BaseSelect', async () => {
    const wrapper = mountPicker();
    await wrapper.get('[role="combobox"]').trigger('click');
    const search = document.querySelector<HTMLInputElement>('.wb-control-select-menu input[type="search"]')!;
    expect(search.placeholder).toBe('搜索世界书...');
    search.value = '不存在';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    expect(document.querySelector('.wb-control-select-empty')?.textContent).toBe('没有匹配的世界书');
    wrapper.unmount();
  });

  it('keeps OR/AND and descendants/exact tag-filter values unchanged', async () => {
    const wrapper = mountPicker();
    const selects = wrapper.findAllComponents(BaseSelect);
    expect(selects).toHaveLength(3);
    await selects[1].vm.$emit('update:modelValue', 'and');
    await selects[2].vm.$emit('update:modelValue', 'exact');
    expect(wrapper.emitted('update:tagFilterLogic')?.at(-1)).toEqual(['and']);
    expect(wrapper.emitted('update:tagFilterMatchMode')?.at(-1)).toEqual(['exact']);
    wrapper.unmount();
  });

  it('derives tree rows, expands parents, selects tags, and renders selected path chips', async () => {
    const wrapper = mountPicker({ selectedTagIds: ['tag-b'] });
    await wrapper.get('.tag-filter-open').trigger('click');
    expect(wrapper.findAll('.tag-tree-row').some(row => row.text().includes('分类'))).toBe(true);
    expect(wrapper.findAll('.tag-tree-row').some(row => row.text().includes('标签 B'))).toBe(true);
    expect(wrapper.findAll('.tag-tree-row').some(row => row.text().includes('标签 A'))).toBe(true);
    await wrapper.get('.tag-tree-toggle').trigger('click');
    expect(wrapper.findAll('.tag-tree-row').some(row => row.text().includes('标签 A'))).toBe(false);
    await wrapper.get('.tag-tree-toggle').trigger('click');
    const tagARow = wrapper.findAll('.tag-tree-row').find(row => row.text().includes('标签 A'))!;
    expect(tagARow.exists()).toBe(true);
    await tagARow.get('input[type="checkbox"]').setValue(true);
    expect(wrapper.emitted('update:selectedTagIds')?.at(-1)).toEqual([['tag-b', 'tag-a']]);
    expect(wrapper.get('.tag-filter-selected-chip').text()).toContain('标签 B');
    wrapper.unmount();
  });

  it('uses the mobile flat tag view with path search and assignments-driven filtering semantics', async () => {
    const wrapper = mountPicker({ mobileTagView: true, selectedTagIds: ['root'] });
    await wrapper.get('.tag-filter-open').trigger('click');
    expect(wrapper.findAll('.tag-flat-item').map(item => item.text())).toEqual(['分类', '分类/标签 A', '标签 B']);
    await wrapper.get<HTMLInputElement>('.tag-filter-search').setValue('分类/标签');
    expect(wrapper.findAll('.tag-flat-item').map(item => item.text())).toEqual(['分类/标签 A']);
    expect((wrapper.vm as unknown as { filteredWorldbookNames: string[] }).filteredWorldbookNames).toEqual(['世界书 A']);
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
