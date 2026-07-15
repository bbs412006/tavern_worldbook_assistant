// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import TagAssignmentPanel from '../../../src/worldbook_assistant_build/components/TagAssignmentPanel.vue';
import TagColorPicker from '../../../src/worldbook_assistant_build/components/TagColorPicker.vue';
import TagCreatePanel from '../../../src/worldbook_assistant_build/components/TagCreatePanel.vue';
import TagTreeItem from '../../../src/worldbook_assistant_build/components/TagTreeItem.vue';
import BaseButton from '../../../src/worldbook_assistant_build/components/controls/BaseButton.vue';
import BaseInput from '../../../src/worldbook_assistant_build/components/controls/BaseInput.vue';
import BaseSelect from '../../../src/worldbook_assistant_build/components/controls/BaseSelect.vue';

const options = [
  { id: 'root', path: '根标签' },
  { id: 'child', path: '根标签/子标签' },
];

describe('tag unified controls', () => {
  it('preserves create input, Enter behavior, parent IDs, and actions', async () => {
    const wrapper = mount(TagCreatePanel, {
      props: { name: '', parentId: '', parentOptions: options, hasTags: true, showParentSelect: true },
    });

    expect(wrapper.find('select').exists()).toBe(false);
    expect(wrapper.findComponent(BaseInput).exists()).toBe(true);
    expect(wrapper.findComponent(BaseSelect).exists()).toBe(true);
    expect(wrapper.findComponent(BaseSelect).get('[data-select-trigger]').attributes('aria-label')).toBe('新标签的父标签');
    expect(wrapper.findAllComponents(BaseButton)).toHaveLength(2);

    await wrapper.findComponent(BaseInput).setValue('新标签');
    await wrapper.findComponent(BaseInput).get('input').trigger('keydown', { key: 'Enter' });
    await wrapper.findComponent(BaseSelect).vm.$emit('update:modelValue', 'child');
    await wrapper.findAllComponents(BaseButton)[1]!.trigger('click');

    expect(wrapper.emitted('update:name')?.at(-1)).toEqual(['新标签']);
    expect(wrapper.emitted('create')).toHaveLength(1);
    expect(wrapper.emitted('update:parent-id')?.at(-1)).toEqual(['child']);
    expect(wrapper.emitted('reset-all')).toHaveLength(1);
  });

  it('preserves assignment selection, search, and worldbook toggles', async () => {
    const wrapper = mount(TagAssignmentPanel, {
      props: {
        targetId: 'child', search: '', options, worldbooks: ['世界书 A'],
        assignments: { '世界书 A': ['child'] }, pathSummary: () => '根标签/子标签', idPrefix: 'test',
      },
    });

    expect(wrapper.find('select').exists()).toBe(false);
    await wrapper.findComponent(BaseSelect).vm.$emit('update:modelValue', 'root');
    await wrapper.findComponent(BaseInput).setValue('世界书');
    await wrapper.findComponent(BaseButton).trigger('click');

    expect(wrapper.emitted('update:target-id')?.at(-1)).toEqual(['root']);
    expect(wrapper.emitted('update:search')?.at(-1)).toEqual(['世界书']);
    expect(wrapper.emitted('toggle')?.at(-1)).toEqual(['世界书 A']);
  });

  it('preserves tree rename, nullable parent, color, and delete events', async () => {
    const wrapper = mount(TagTreeItem, {
      props: {
        row: { id: 'child', name: '子标签', path: '根标签/子标签', color: '#112233', depth: 1, parent_id: 'root', sort: 0 },
        name: '子标签', parentId: 'root', parentOptions: options,
        disabledParentIds: new Set(['child']), colors: ['#112233', '#445566'], idPrefix: 'test',
      },
    });

    expect(wrapper.find('select').exists()).toBe(false);
    expect(wrapper.findComponent(BaseSelect).get('[data-select-trigger]').attributes('aria-label')).toBe('子标签的父标签');
    await wrapper.findComponent(BaseInput).setValue('重命名');
    await wrapper.findComponent(BaseInput).get('input').trigger('blur');
    await wrapper.findComponent(BaseSelect).vm.$emit('update:modelValue', '');
    await wrapper.findComponent(TagColorPicker).vm.$emit('select', '#445566');
    await wrapper.findAllComponents(BaseButton).at(-1)!.trigger('click');

    expect(wrapper.emitted('rename')?.at(-1)).toEqual(['重命名']);
    expect(wrapper.emitted('set-parent')?.at(-1)).toEqual([null]);
    expect(wrapper.emitted('set-color')?.at(-1)).toEqual(['#445566']);
    expect(wrapper.emitted('delete')).toHaveLength(1);
  });

  it('offers accessible preset colors and a classified native custom-color input', async () => {
    const wrapper = mount(TagColorPicker, {
      props: { value: '#112233', colors: ['#112233', '#445566'], idPrefix: 'test' },
    });
    expect(wrapper.findAllComponents(BaseButton)).toHaveLength(2);
    const nativeColor = wrapper.get('input[type="color"]');
    expect(nativeColor.attributes('aria-label')).toBe('自定义标签颜色');
    await nativeColor.setValue('#abcdef');
    expect(wrapper.emitted('select')?.at(-1)).toEqual(['#abcdef']);
  });
});
