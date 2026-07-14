// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import EditorPanel from '../../../src/worldbook_assistant_build/components/EditorPanel.vue';
import BaseButton from '../../../src/worldbook_assistant_build/components/controls/BaseButton.vue';
import BaseInput from '../../../src/worldbook_assistant_build/components/controls/BaseInput.vue';
import BaseTextarea from '../../../src/worldbook_assistant_build/components/controls/BaseTextarea.vue';

function createEntry() {
  return {
    uid: 7,
    name: '旧备注',
    content: '旧内容',
    enabled: true,
    strategy: {
      type: 'selective',
      keys: ['alpha'],
      keys_secondary: { keys: ['beta'] },
    },
  };
}

describe('EditorPanel unified controls', () => {
  it('uses base controls and keeps text and keyword mutations unchanged', async () => {
    const entry = createEntry();
    const wrapper = mount(EditorPanel, { props: { selectedEntry: entry } });

    expect(wrapper.find('input').exists()).toBe(true);
    expect(wrapper.findAllComponents(BaseInput)).toHaveLength(1);
    expect(wrapper.findAllComponents(BaseTextarea)).toHaveLength(3);
    expect(wrapper.findAllComponents(BaseButton)).toHaveLength(3);
    expect(wrapper.find('select').exists()).toBe(false);

    await wrapper.findComponent(BaseInput).setValue('新备注');
    expect(entry.name).toBe('新备注');

    const textareas = wrapper.findAllComponents(BaseTextarea);
    await textareas[0]!.setValue('one, two');
    await textareas[0]!.trigger('blur');
    expect(entry.strategy.keys).toEqual(['one', 'two']);

    await textareas[2]!.setValue('新内容');
    expect(entry.content).toBe('新内容');
  });

  it('keeps strategy values and exposes pressed state', async () => {
    const entry = createEntry();
    const wrapper = mount(EditorPanel, { props: { selectedEntry: entry } });
    const buttons = wrapper.findAllComponents(BaseButton);

    expect(buttons[2]!.attributes('aria-pressed')).toBe('true');
    await buttons[0]!.trigger('click');
    expect(entry.strategy.type).toBe('constant');
    expect(buttons[0]!.attributes('aria-pressed')).toBe('true');
  });

  it('keeps content disabled in multi-select mode', () => {
    const wrapper = mount(EditorPanel, { props: { selectedEntry: createEntry(), multiSelectMode: true } });
    expect(wrapper.findAllComponents(BaseTextarea)[2]!.attributes('disabled')).toBeDefined();
  });
});
