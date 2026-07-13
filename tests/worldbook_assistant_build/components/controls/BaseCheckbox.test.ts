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
});
