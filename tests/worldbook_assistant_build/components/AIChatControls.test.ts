// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import AIChatPanel from '../../../src/worldbook_assistant_build/components/AIChatPanel.vue';
import SettingPanel from '../../../src/worldbook_assistant_build/components/SettingPanel.vue';
import BaseButton from '../../../src/worldbook_assistant_build/components/controls/BaseButton.vue';
import BaseSwitch from '../../../src/worldbook_assistant_build/components/controls/BaseSwitch.vue';
import BaseTextarea from '../../../src/worldbook_assistant_build/components/controls/BaseTextarea.vue';

const activeSession = { id: 'session-1', title: '测试对话', messages: [] } as any;

function mountChat(overrides: Record<string, unknown> = {}) {
  return mount(AIChatPanel, {
    props: {
      activeSession,
      messages: [],
      input: '',
      useContext: true,
      isGenerating: false,
      streamingText: '',
      isMobile: false,
      ...overrides,
    },
  });
}

describe('AI and settings unified controls', () => {
  it('preserves context, local input update, Enter send, and send button events', async () => {
    const wrapper = mountChat();

    expect(wrapper.find('textarea').exists()).toBe(true);
    expect(wrapper.findComponent(BaseTextarea).exists()).toBe(true);
    expect(wrapper.findComponent(BaseSwitch).exists()).toBe(true);

    await wrapper.findComponent(BaseSwitch).vm.$emit('update:modelValue', false);
    await wrapper.findComponent(BaseTextarea).setValue('生成一个世界书');
    await wrapper.findComponent(BaseTextarea).get('textarea').trigger('keydown', { key: 'Enter' });
    await wrapper.setProps({ input: '生成一个世界书' });
    await wrapper.findComponent(BaseButton).trigger('click');

    expect(wrapper.emitted('update:use-context')?.at(-1)).toEqual([false]);
    expect(wrapper.emitted('update:input')?.at(-1)).toEqual(['生成一个世界书']);
    expect(wrapper.emitted('send')).toHaveLength(2);
  });

  it('preserves stop-generation event while generating', async () => {
    const wrapper = mountChat({ input: '继续', isGenerating: true });
    await wrapper.findComponent(BaseButton).trigger('click');
    expect(wrapper.emitted('stop-generation')).toHaveLength(1);
  });

  it('preserves empty-state create and extract actions', async () => {
    const wrapper = mountChat({ activeSession: null, showEmptyActions: true });
    const buttons = wrapper.findAllComponents(BaseButton);
    await buttons[0]!.trigger('click');
    await buttons[1]!.trigger('click');
    expect(wrapper.emitted('create-session')).toHaveLength(1);
    expect(wrapper.emitted('extract-from-chat')).toHaveLength(1);
  });

  it('preserves settings toggles and history actions', async () => {
    const wrapper = mount(SettingPanel, {
      props: { showAIChat: true, glassMode: false, showFloorExtract: true, hasWorldbook: true },
    });

    expect(wrapper.find('input').exists()).toBe(true);
    expect(wrapper.findAllComponents(BaseSwitch)).toHaveLength(3);
    expect(wrapper.findAllComponents(BaseButton)).toHaveLength(2);

    const switches = wrapper.findAllComponents(BaseSwitch);
    await switches[0]!.vm.$emit('update:modelValue', false);
    await switches[1]!.vm.$emit('update:modelValue', true);
    await switches[2]!.vm.$emit('update:modelValue', false);
    const buttons = wrapper.findAllComponents(BaseButton);
    await buttons[0]!.trigger('click');
    await buttons[1]!.trigger('click');

    expect(wrapper.emitted('update:showAIChat')?.at(-1)).toEqual([false]);
    expect(wrapper.emitted('update:glassMode')?.at(-1)).toEqual([true]);
    expect(wrapper.emitted('update:showFloorExtract')?.at(-1)).toEqual([false]);
    expect(wrapper.emitted('entry-history')).toHaveLength(1);
    expect(wrapper.emitted('worldbook-history')).toHaveLength(1);
  });
});
