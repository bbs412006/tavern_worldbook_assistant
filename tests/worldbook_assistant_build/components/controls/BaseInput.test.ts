// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BaseInput from '../../../../src/worldbook_assistant_build/components/controls/BaseInput.vue';
import BaseTextarea from '../../../../src/worldbook_assistant_build/components/controls/BaseTextarea.vue';

describe('BaseInput', () => {
  it('emits numeric model values as numbers for number inputs', async () => {
    const wrapper = mount(BaseInput, { props: { modelValue: 3, type: 'number' } });

    await wrapper.get('input').setValue('7');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([7]);
  });

  it('emits null for an empty number input', async () => {
    const wrapper = mount(BaseInput, { props: { modelValue: 3, type: 'number' } });

    await wrapper.get('input').setValue('');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([null]);
  });

  it('preserves text values for normal inputs', async () => {
    const wrapper = mount(BaseInput, { props: { modelValue: 'old' } });

    await wrapper.get('input').setValue('new');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['new']);
  });

  it('forwards native input attributes', () => {
    const wrapper = mount(BaseInput, {
      props: { modelValue: 3, type: 'number' },
      attrs: {
        id: 'amount',
        name: 'amount',
        min: '1',
        max: '9',
        step: '2',
        inputmode: 'numeric',
        autocomplete: 'off',
        readonly: true,
        'aria-label': '数量',
        'aria-describedby': 'amount-help',
      },
    });

    expect(wrapper.get('input').attributes()).toMatchObject({
      id: 'amount',
      name: 'amount',
      min: '1',
      max: '9',
      step: '2',
      inputmode: 'numeric',
      autocomplete: 'off',
      readonly: '',
      'aria-label': '数量',
      'aria-describedby': 'amount-help',
    });
  });

  it('exposes error styling and prefix/suffix presentation without moving native attributes off the input', () => {
    const wrapper = mount(BaseInput, {
      props: { modelValue: 'keyword', error: true },
      attrs: { id: 'search', 'aria-invalid': 'true' },
      slots: { prefix: '🔍', suffix: '⌘K' },
    });

    expect(wrapper.classes()).toContain('wb-control-input-shell');
    expect(wrapper.classes()).toContain('has-error');
    expect(wrapper.get('.wb-control-input-prefix').text()).toBe('🔍');
    expect(wrapper.get('.wb-control-input-suffix').text()).toBe('⌘K');
    expect(wrapper.get('input').attributes()).toMatchObject({ id: 'search', 'aria-invalid': 'true' });
  });
});

describe('BaseTextarea', () => {
  it('always emits string updates and applies the resize class', async () => {
    const wrapper = mount(BaseTextarea, { props: { modelValue: 'old', resize: 'none' } });

    await wrapper.get('textarea').setValue('new');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['new']);
    expect(wrapper.get('textarea').classes()).toContain('wb-control-textarea--resize-none');
  });

  it('forwards native textarea attributes', () => {
    const wrapper = mount(BaseTextarea, {
      props: { modelValue: '' },
      attrs: { rows: '4', placeholder: '内容', 'aria-label': '正文' },
    });

    expect(wrapper.get('textarea').attributes()).toMatchObject({ rows: '4', placeholder: '内容', 'aria-label': '正文' });
  });

  it('uses minRows as a floor while preserving a larger explicit native rows attribute', () => {
    const defaultRows = mount(BaseTextarea, { props: { modelValue: '', minRows: 5 } });
    const smallerRows = mount(BaseTextarea, {
      props: { modelValue: '', minRows: 5 },
      attrs: { rows: '2' },
    });
    const largerRows = mount(BaseTextarea, {
      props: { modelValue: '', minRows: 5 },
      attrs: { rows: '8' },
    });

    expect(defaultRows.get('textarea').attributes('rows')).toBe('5');
    expect(smallerRows.get('textarea').attributes('rows')).toBe('5');
    expect(largerRows.get('textarea').attributes('rows')).toBe('8');
  });
});
