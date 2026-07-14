// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';

import BrowsePanel from '../../../src/worldbook_assistant_build/components/BrowsePanel.vue';
import GlobalModePanel from '../../../src/worldbook_assistant_build/components/GlobalModePanel.vue';
import WorldbookPicker from '../../../src/worldbook_assistant_build/components/WorldbookPicker.vue';
import BaseSelect from '../../../src/worldbook_assistant_build/components/controls/BaseSelect.vue';

afterEach(() => { document.body.innerHTML = ''; });

describe('BrowsePanel', () => {
  it('forwards picker selection and preserves action emits plus live search filtering', async () => {
    const wrapper = mount(BrowsePanel, { props: {
      modelValue: 'A',
      entries: [{ name: 'Alpha', content: 'one', strategy: { keys: [] } }, { name: 'Beta', content: 'two', strategy: { keys: [] } }],
      worldbookNames: ['A', 'B'],
      bindings: { global: [], charPrimary: null, charAdditional: [], chat: null },
      hasUnsavedChanges: true,
      isMobile: false,
      globalMode: false,
    } });
    await wrapper.getComponent(WorldbookPicker).vm.$emit('update:modelValue', 'B');
    expect(wrapper.emitted('update:modelValue')).toEqual([['B']]);
    await wrapper.get('input[aria-label="搜索世界书条目"]').setValue('beta');
    expect(wrapper.text()).toContain('条目 1 / 2');
    await wrapper.findAll('button').find(button => button.text() === '新建')!.trigger('click');
    await wrapper.findAll('button').find(button => button.text() === '💾 保存')!.trigger('click');
    expect(wrapper.emitted('create')).toHaveLength(1);
    expect(wrapper.emitted('save')).toHaveLength(1);
  });
});

describe('GlobalModePanel', () => {
  it('emits preset-change immediately with the selected string and preserves action payloads', async () => {
    const wrapper = mount(GlobalModePanel, { props: {
      globalBindings: ['A', 'B'],
      presets: [{ id: 'preset-1', name: '组合', worldbooks: ['A'] }],
      selectedPresetId: '',
    } });
    await wrapper.getComponent(BaseSelect).vm.$emit('update:modelValue', 'preset-1');
    await nextTick();
    expect(wrapper.emitted('preset-change')).toEqual([['preset-1']]);
    await wrapper.findAll('button').find(button => button.text() === '覆盖预设')!.trigger('click');
    await wrapper.findAll('button').find(button => button.text().includes('A移除'))!.trigger('click');
    expect(wrapper.emitted('overwrite-preset')).toEqual([['preset-1']]);
    expect(wrapper.emitted('remove')).toEqual([['A']]);
  });
});
