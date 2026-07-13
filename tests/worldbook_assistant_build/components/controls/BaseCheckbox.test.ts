// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, expect, it } from 'vitest';

import BaseCheckbox from '../../../../src/worldbook_assistant_build/components/controls/BaseCheckbox.vue';
import BaseSwitch from '../../../../src/worldbook_assistant_build/components/controls/BaseSwitch.vue';

describe('BaseCheckbox', () => {
  it('keeps a real checkbox and toggles through its label', async () => {
    const wrapper = mount(BaseCheckbox, {
      props: { modelValue: false },
      slots: { default: '启用' },
      attachTo: document.body,
    });

    expect(wrapper.get('input').attributes('type')).toBe('checkbox');
    wrapper.get('label').element.click();
    await nextTick();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true]);
    wrapper.unmount();
  });

  it('reflects disabled and indeterminate native state', async () => {
    const wrapper = mount(BaseCheckbox, { props: { modelValue: false, disabled: true, indeterminate: true } });
    await nextTick();

    const input = wrapper.get('input').element as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(input.indeterminate).toBe(true);
  });

  it('resyncs a controlled indeterminate state after click and model updates', async () => {
    const wrapper = mount(BaseCheckbox, {
      props: {
        modelValue: false,
        indeterminate: true,
        'onUpdate:modelValue': async value => {
          await wrapper.setProps({ modelValue: value });
        },
      },
      attachTo: document.body,
    });
    const input = wrapper.get('input').element as HTMLInputElement;
    await nextTick();
    expect(input.indeterminate).toBe(true);

    input.click();
    await nextTick();
    await nextTick();

    expect(wrapper.props('modelValue')).toBe(true);
    expect(wrapper.props('indeterminate')).toBe(true);
    expect(input.indeterminate).toBe(true);
    wrapper.unmount();
  });

  it('forwards checkbox identity and aria attributes to the native input', () => {
    const wrapper = mount(BaseCheckbox, {
      props: { modelValue: false },
      attrs: { id: 'enabled', name: 'enabled', value: 'yes', 'aria-describedby': 'enabled-help' },
      slots: { default: '启用' },
    });

    expect(wrapper.get('input').attributes()).toMatchObject({
      id: 'enabled',
      name: 'enabled',
      value: 'yes',
      'aria-describedby': 'enabled-help',
    });
    expect(wrapper.get('label').attributes('for')).toBe('enabled');
  });
});

describe('BaseSwitch', () => {
  it('uses switch semantics while retaining checkbox behavior', () => {
    const wrapper = mount(BaseSwitch, { props: { modelValue: true } });
    const input = wrapper.get('input');

    expect(input.attributes('type')).toBe('checkbox');
    expect(input.attributes('role')).toBe('switch');
    expect((input.element as HTMLInputElement).checked).toBe(true);
  });

  it('emits boolean updates through its label', async () => {
    const wrapper = mount(BaseSwitch, {
      props: { modelValue: false },
      slots: { default: '启用' },
      attachTo: document.body,
    });

    wrapper.get('label').element.click();
    await nextTick();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true]);
    wrapper.unmount();
  });

  it('forwards switch attributes and exposes an accessible name', () => {
    const wrapper = mount(BaseSwitch, {
      props: { modelValue: true },
      attrs: { id: 'auto-save', name: 'autoSave', 'aria-label': '自动保存', 'aria-describedby': 'save-help' },
    });

    expect(wrapper.get('input').attributes()).toMatchObject({
      id: 'auto-save',
      name: 'autoSave',
      role: 'switch',
      'aria-label': '自动保存',
      'aria-describedby': 'save-help',
    });
    expect(wrapper.get('label').attributes('for')).toBe('auto-save');
  });
});
