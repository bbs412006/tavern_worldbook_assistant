// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import AIConfigPage from '../../../src/worldbook_assistant_build/components/AIConfigPage.vue';

type Change = {
  name: string;
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
  selected: boolean;
};

function mountPage(overrides: Record<string, unknown> = {}) {
  return mount(AIConfigPage, {
    props: {
      worldbookNames: ['世界书 A', '世界书 B'],
      targetWorldbook: '世界书 A',
      input: '调整条目配置',
      customPrompt: '自定义提示词',
      changes: [] as Change[],
      preview: false,
      generating: false,
      ...overrides,
    },
  });
}

function previewChanges(): Change[] {
  return [
    { name: '条目一', field: 'sticky', label: '常驻', oldValue: '否', newValue: '是', selected: false },
    { name: '条目二', field: 'position_order', label: '顺序', oldValue: '2', newValue: '1', selected: true },
  ];
}

describe('AIConfigPage', () => {
  it('emits target, instruction, and custom prompt input updates', async () => {
    const wrapper = mountPage();

    await wrapper.get('select').setValue('世界书 B');
    await wrapper.get('.ai-config-input-stage > .field textarea').setValue('新的配置指令');
    await wrapper.get('.custom-prompt-input').setValue('新的系统提示词');

    expect(wrapper.emitted('update:targetWorldbook')).toEqual([['世界书 B']]);
    expect(wrapper.emitted('update:input')).toEqual([['新的配置指令']]);
    expect(wrapper.emitted('update:customPrompt')).toEqual([['新的系统提示词']]);
  });

  it('uses the active stage as its single internal scroll container', () => {
    const wrapper = mountPage();

    expect(wrapper.findAll('.utility-page-scroll')).toHaveLength(1);
    expect(wrapper.get('.utility-page-scroll').classes()).toContain('utility-page-body');
  });

  it('emits back from the input stage', async () => {
    const wrapper = mountPage();

    await wrapper.get('.utility-page-back').trigger('click');

    expect(wrapper.emitted('back')).toHaveLength(1);
    expect(wrapper.emitted('back-to-input')).toBeUndefined();
  });

  it('shows generating feedback without an enabled back button', () => {
    const wrapper = mountPage({ generating: true });

    expect(wrapper.text()).toContain('AI 正在分析配置指令...');
    expect(wrapper.find('.utility-page-back').exists()).toBe(false);
    expect(wrapper.get('.utility-page-back-placeholder').attributes('aria-hidden')).toBe('true');
  });

  it('emits back-to-input from the preview stage', async () => {
    const wrapper = mountPage({ preview: true, changes: previewChanges() });

    await wrapper.get('.utility-page-back').trigger('click');

    expect(wrapper.emitted('back-to-input')).toHaveLength(1);
    expect(wrapper.emitted('back')).toBeUndefined();
  });

  it('selects all preview changes', async () => {
    const changes = previewChanges();
    const wrapper = mountPage({ preview: true, changes });

    await wrapper.get('.select-all').trigger('click');

    expect(changes.map(change => change.selected)).toEqual([true, true]);
    expect(wrapper.get('.apply-action').text()).toContain('2');
  });

  it('selects no preview changes and disables apply', async () => {
    const changes = previewChanges();
    const wrapper = mountPage({ preview: true, changes });

    await wrapper.get('.select-none').trigger('click');

    expect(changes.map(change => change.selected)).toEqual([false, false]);
    expect(wrapper.get('.apply-action').attributes()).toHaveProperty('disabled');
  });

  it('emits apply for selected preview changes', async () => {
    const wrapper = mountPage({ preview: true, changes: previewChanges() });

    await wrapper.get('.apply-action').trigger('click');

    expect(wrapper.emitted('apply')).toHaveLength(1);
  });

  it('keeps preview row DOM identity with the intrinsic change when rows reorder', async () => {
    const changes = previewChanges();
    const wrapper = mountPage({ preview: true, changes });
    const firstRow = wrapper.findAll('tbody tr')[0].element;

    await wrapper.setProps({ changes: [changes[1], changes[0]] });

    expect(wrapper.findAll('tbody tr')[1].element).toBe(firstRow);
  });
});
