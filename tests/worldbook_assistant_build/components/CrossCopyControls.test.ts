// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import CrossCopyActionRows from '../../../src/worldbook_assistant_build/components/CrossCopyActionRows.vue';
import CrossCopyBulkActions from '../../../src/worldbook_assistant_build/components/CrossCopyBulkActions.vue';
import CrossCopyControls from '../../../src/worldbook_assistant_build/components/CrossCopyControls.vue';
import CrossCopyMobileStepper from '../../../src/worldbook_assistant_build/components/CrossCopyMobileStepper.vue';
import CrossCopySourceList from '../../../src/worldbook_assistant_build/components/CrossCopySourceList.vue';
import BaseButton from '../../../src/worldbook_assistant_build/components/controls/BaseButton.vue';
import BaseCheckbox from '../../../src/worldbook_assistant_build/components/controls/BaseCheckbox.vue';
import BaseInput from '../../../src/worldbook_assistant_build/components/controls/BaseInput.vue';
import BaseSelect from '../../../src/worldbook_assistant_build/components/controls/BaseSelect.vue';

const statusPriority = ['new', 'duplicate_exact', 'same_name_changed', 'content_duplicate_other_name', 'invalid_same_source_target'] as const;
const statusCounts = Object.fromEntries(statusPriority.map(status => [status, status === 'new' ? 1 : 0])) as Record<(typeof statusPriority)[number], number>;
const row = {
  id: 'row-1',
  source_entry: { uid: 7, name: '来源条目' },
  source_index: 0,
  source_name_key: '来源条目',
  source_content_key: '内容',
  status: 'new' as const,
  selected: true,
  action: 'create' as const,
  rename_name: '',
  note: '',
  details_open: false,
  target_summary: { same_name_matches: [], same_name_exact_count: 0, content_duplicate_other_name_matches: [] },
} as any;

const actionLabel = (action: string) => action;
const statusLabel = (status: string) => status;
const statusBadgeClass = (status: string) => status;

function mountControls() {
  return mount(CrossCopyControls, {
    props: {
      worldbookNames: ['世界书 A', '世界书 B'],
      sourceWorldbook: '世界书 A',
      targetWorldbook: '世界书 B',
      canCompare: true,
      compareLoading: false,
      applyLoading: false,
      controlsCollapsed: false,
      useDraftSourceWhenCurrent: true,
      sourceIsCurrentWorldbook: true,
      sourceVersionLabel: '使用当前草稿',
      snapshotBeforeApply: true,
      sourceTargetInvalid: false,
      compareSummary: '',
      lastResultSummary: '',
      idPrefix: 'test',
    },
  });
}

describe('cross-copy unified controls', () => {
  it('preserves source, target, advanced toggles, and refresh events', async () => {
    const wrapper = mountControls();

    expect(wrapper.find('select').exists()).toBe(false);
    expect(wrapper.findAllComponents(BaseSelect)).toHaveLength(2);
    expect(wrapper.findAllComponents(BaseCheckbox)).toHaveLength(2);

    await wrapper.findAllComponents(BaseSelect)[0]!.vm.$emit('update:modelValue', '世界书 B');
    await wrapper.findAllComponents(BaseSelect)[1]!.vm.$emit('update:modelValue', '世界书 A');
    await wrapper.findAllComponents(BaseCheckbox)[0]!.vm.$emit('update:modelValue', false);
    await wrapper.findAllComponents(BaseCheckbox)[1]!.vm.$emit('update:modelValue', false);
    await wrapper.findComponent(BaseButton).trigger('click');

    expect(wrapper.emitted('update:source-worldbook')?.at(-1)).toEqual(['世界书 B']);
    expect(wrapper.emitted('update:target-worldbook')?.at(-1)).toEqual(['世界书 A']);
    expect(wrapper.emitted('update:use-draft-source-when-current')?.at(-1)).toEqual([false]);
    expect(wrapper.emitted('update:snapshot-before-apply')?.at(-1)).toEqual([false]);
    expect(wrapper.emitted('refresh')).toHaveLength(1);
  });

  it('preserves status filter, row action, selection, rename, and detail events', async () => {
    const wrapper = mount(CrossCopyActionRows, {
      props: {
        rows: [row],
        selectedCount: 1,
        statusFilter: 'all',
        statusPriority: [...statusPriority],
        statusCounts,
        applyLoading: false,
        idPrefix: 'test',
        statusLabel,
        actionLabel,
        statusBadgeClass,
        rowDiffSummary: () => '差异',
      },
    });

    expect(wrapper.find('select').exists()).toBe(false);
    expect(wrapper.findAllComponents(BaseSelect)).toHaveLength(2);
    expect(wrapper.findComponent(BaseCheckbox).exists()).toBe(true);
    expect(wrapper.findAllComponents(BaseSelect).map(select => select.get('[data-select-trigger]').attributes('aria-label'))).toEqual([
      '筛选对比状态',
      '来源条目 操作',
    ]);

    await wrapper.findAllComponents(BaseSelect)[0]!.vm.$emit('update:modelValue', 'new');
    await wrapper.findAllComponents(BaseSelect)[1]!.vm.$emit('update:modelValue', 'rename_create');
    await wrapper.findComponent(BaseCheckbox).vm.$emit('update:modelValue', false);
    await wrapper.setProps({ rows: [{ ...row, action: 'rename_create' }] });
    await wrapper.findComponent(BaseInput).setValue('新条目名');
    await wrapper.findComponent(BaseInput).get('input').trigger('blur');
    await wrapper.findComponent(BaseButton).trigger('click');

    expect(wrapper.emitted('update:status-filter')?.at(-1)).toEqual(['new']);
    expect(wrapper.emitted('set-action')?.at(-1)).toEqual(['row-1', 'rename_create']);
    expect(wrapper.emitted('set-selected')?.at(-1)).toEqual(['row-1', false]);
    expect(wrapper.emitted('set-rename-name')?.at(-1)).toEqual(['row-1', '新条目名']);
    expect(wrapper.emitted('rename-blur')?.at(-1)).toEqual(['row-1']);
    expect(wrapper.emitted('open-detail')?.at(-1)).toEqual(['row-1']);
  });

  it('preserves bulk action values and execution events', async () => {
    const wrapper = mount(CrossCopyBulkActions, {
      props: { hasRows: true, selectedCount: 1, bulkAction: 'skip', canApply: true, applyLoading: false, actionLabel },
    });

    expect(wrapper.find('select').exists()).toBe(false);
    expect(wrapper.findComponent(BaseSelect).get('[data-select-trigger]').attributes('aria-label')).toBe('批量动作');
    await wrapper.findComponent(BaseSelect).vm.$emit('update:modelValue', 'overwrite');
    const buttons = wrapper.findAllComponents(BaseButton);
    await buttons[0]!.trigger('click');
    await buttons[1]!.trigger('click');
    await buttons[4]!.trigger('click');
    await buttons[5]!.trigger('click');

    expect(wrapper.emitted('update:bulk-action')?.at(-1)).toEqual(['overwrite']);
    expect(wrapper.emitted('select-all')?.at(-1)).toEqual([false]);
    expect(wrapper.emitted('apply-status-action')?.at(-1)).toEqual(['same_name_changed', 'overwrite']);
    expect(wrapper.emitted('apply-bulk-action')).toHaveLength(1);
    expect(wrapper.emitted('apply-selection')).toHaveLength(1);
  });

  it('preserves source-list search and checkbox selection', async () => {
    const wrapper = mount(CrossCopySourceList, {
      props: { rows: [row], totalCount: 1, searchText: '', applyLoading: false, idPrefix: 'test', statusBadgeClass },
    });

    await wrapper.findComponent(BaseInput).setValue('来源');
    await wrapper.findComponent(BaseCheckbox).vm.$emit('update:modelValue', false);
    expect(wrapper.emitted('update:search-text')?.at(-1)).toEqual(['来源']);
    expect(wrapper.emitted('set-selected')?.at(-1)).toEqual(['row-1', false]);
  });

  it('preserves mobile previous, next, apply, and direct-step events', async () => {
    const wrapper = mount(CrossCopyMobileStepper, {
      props: { step: 2, canGoStep2: true, canGoStep3: true, nextDisabled: false, applyLoading: false, selectedCount: 1 },
    });
    const buttons = wrapper.findAllComponents(BaseButton);
    await buttons[0]!.trigger('click');
    await buttons[3]!.trigger('click');
    await buttons[4]!.trigger('click');
    expect(wrapper.emitted('go-step')?.at(-1)).toEqual([1]);
    expect(wrapper.emitted('previous')).toHaveLength(1);
    expect(wrapper.emitted('next')).toHaveLength(1);

    await wrapper.setProps({ step: 3 });
    await wrapper.findAllComponents(BaseButton).at(-1)!.trigger('click');
    expect(wrapper.emitted('apply')).toHaveLength(1);
  });
});
