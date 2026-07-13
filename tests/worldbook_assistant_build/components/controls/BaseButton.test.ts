// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BaseButton from '../../../../src/worldbook_assistant_build/components/controls/BaseButton.vue';

describe('BaseButton', () => {
  it('renders a native button and blocks click while loading', async () => {
    const wrapper = mount(BaseButton, { props: { loading: true }, slots: { default: '保存' } });

    expect(wrapper.element.tagName).toBe('BUTTON');
    expect(wrapper.attributes('aria-busy')).toBe('true');
    expect(wrapper.attributes('disabled')).toBeDefined();
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeUndefined();
  });

  it('keeps the explicit loading click guard effective for synthetic dispatched clicks', () => {
    const wrapper = mount(BaseButton, { props: { loading: true } });
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    wrapper.element.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(wrapper.emitted('click')).toBeUndefined();
  });

  it('applies variant and size classes', () => {
    const wrapper = mount(BaseButton, { props: { variant: 'danger', size: 'sm' } });

    expect(wrapper.classes()).toContain('wb-control-button--danger');
    expect(wrapper.classes()).toContain('wb-control--sm');
  });

  it('forwards native button type and emits enabled clicks', async () => {
    const wrapper = mount(BaseButton, { props: { type: 'submit' } });

    expect(wrapper.attributes('type')).toBe('submit');
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });
});
