// @vitest-environment jsdom

import { mount, type VueWrapper } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SettingsPage from '../../../src/worldbook_assistant_build/components/SettingsPage.vue';
import BaseButton from '../../../src/worldbook_assistant_build/components/controls/BaseButton.vue';
import BaseInput from '../../../src/worldbook_assistant_build/components/controls/BaseInput.vue';
import BaseSelect from '../../../src/worldbook_assistant_build/components/controls/BaseSelect.vue';
import BaseSwitch from '../../../src/worldbook_assistant_build/components/controls/BaseSwitch.vue';

function createPersistedState() {
  return {
    show_ai_chat: true,
    multi_edit: { enabled: true, sync_extra_json: false },
    tag_editor: { delete_parent_mode: 'promote' },
    sort: { mode: 'mutate', reassign_uid: false },
    glass_mode: false,
    ai_api_config: {
      mode: 'custom',
      use_main_api: false,
      apiurl: 'https://api.example.test/v1',
      key: '',
      max_tokens: 4096,
      temperature: 1,
      model: 'test-model',
    },
  };
}

function mountPage(overrides: Record<string, unknown> = {}) {
  return mount(SettingsPage, {
    props: {
      persistedState: createPersistedState(),
      fabVisible: true,
      floorBtnVisible: false,
      currentTheme: 'dark',
      themeOptions: [
        { key: 'dark', label: '深色' },
        { key: 'paper', label: '纸张' },
      ],
      apiModelList: [],
      apiModelLoading: false,
      versionInfo: {
        version: '1.2.3',
        branch: 'test',
        commit: 'abc1234',
        build_time: '2026-07-13T00:00:00Z',
        latest_version: '',
        latest_commit: '',
        latest_checked_at: 0,
        latest_url: '',
      },
      versionCheckLoading: false,
      versionCheckError: '',
      ...overrides,
    },
  });
}

function selectWithLabel(wrapper: VueWrapper, label: string) {
  const select = wrapper.findAllComponents(BaseSelect).find(candidate =>
    (candidate.props('options') as Array<{ label: string }>).some(option => option.label === label),
  );
  expect(select, `missing BaseSelect option ${label}`).toBeDefined();
  return select!;
}

function expectNamedComboboxes(wrapper: VueWrapper): void {
  const comboboxes = wrapper.findAll('[role="combobox"]');
  expect(comboboxes.length).toBeGreaterThan(0);
  for (const combobox of comboboxes) {
    const ariaLabel = combobox.attributes('aria-label')?.trim();
    const labelledby = combobox.attributes('aria-labelledby')?.trim();
    const labelledText = labelledby
      ?.split(/\s+/)
      .map(id => wrapper.find(`[id="${id}"]`).text().trim())
      .join(' ')
      .trim();
    expect(ariaLabel || labelledText, combobox.html()).toBeTruthy();
  }
}

describe('SettingsPage', () => {
  it('renders experience, version, and API sections', () => {
    const wrapper = mountPage();

    expect(wrapper.text()).toContain('体验设置');
    expect(wrapper.text()).toContain('版本与更新');
    expect(wrapper.text()).toContain('API 设置');
  });

  it('uses unified controls without a native select', () => {
    const wrapper = mountPage();

    expect(wrapper.find('select').exists()).toBe(false);
    expect(wrapper.findAllComponents(BaseSelect).length).toBeGreaterThanOrEqual(3);
    expect(wrapper.findAllComponents(BaseSwitch).length).toBeGreaterThanOrEqual(6);
    expect(wrapper.findAllComponents(BaseInput).length).toBeGreaterThanOrEqual(5);
    expect(wrapper.findAllComponents(BaseButton).length).toBeGreaterThanOrEqual(5);
  });

  it('gives every custom combobox a stable accessible name linked to visible field text', () => {
    const wrapper = mountPage({ apiModelList: ['model-a', 'model-b'] });

    expectNamedComboboxes(wrapper);
    const ids = wrapper.findAll('[id]').map(node => node.attributes('id'));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses the page body as its single internal scroll container', () => {
    const wrapper = mountPage();

    expect(wrapper.findAll('.utility-page-scroll')).toHaveLength(1);
    expect(wrapper.get('.utility-page-scroll').classes()).toContain('utility-page-body');
  });

  it('emits back when the page back button is clicked', async () => {
    const wrapper = mountPage();

    await wrapper.get('.utility-page-back').trigger('click');

    expect(wrapper.emitted('back')).toHaveLength(1);
  });

  it('emits the changed floating-button setting', () => {
    const wrapper = mountPage();
    const toggle = wrapper.findAllComponents(BaseSwitch)[0];

    toggle.vm.$emit('update:modelValue', false);

    expect(wrapper.emitted('set-fab-visible')).toEqual([[false]]);
  });

  it('emits settings select values with their original string types', () => {
    const wrapper = mountPage();

    selectWithLabel(wrapper, '删除父标签并上提子标签').vm.$emit('update:modelValue', 'cascade');
    selectWithLabel(wrapper, '仅显示排序（不修改数据）').vm.$emit('update:modelValue', 'view');
    selectWithLabel(wrapper, '纸张').vm.$emit('update:modelValue', 'paper');

    expect(wrapper.emitted('set-tag-delete-parent-mode')).toEqual([['cascade']]);
    const persistedUpdaters = wrapper.emitted('update-persisted-state') as [[(state: any) => void]];
    const state = createPersistedState();
    persistedUpdaters[0][0](state);
    expect(state.sort.mode).toBe('view');
    expect(wrapper.emitted('set-theme')).toEqual([['paper']]);
  });

  it('uses pressed segmented buttons for API mode and preserves mode patches', async () => {
    const wrapper = mountPage();
    const customMode = wrapper.get('.api-mode-choice--custom');
    const tavernMode = wrapper.get('.api-mode-choice--tavern');

    expect(customMode.attributes('aria-pressed')).toBe('true');
    expect(tavernMode.attributes('aria-pressed')).toBe('false');
    await tavernMode.trigger('click');

    expect(wrapper.emitted('update-api-config')).toEqual([[{ mode: 'tavern' }]]);
  });

  it('preserves model strings and numeric API value types with empty fallbacks', async () => {
    const wrapper = mountPage();
    const url = wrapper.get('[aria-label="API基础URL"]');
    const maxTokens = wrapper.get('[aria-label="最大Tokens"]');
    const temperature = wrapper.get('[aria-label="温度"]');
    const model = wrapper.get('[aria-label="模型名称（手动输入）"]');

    await url.setValue('https://new.example/v1');
    await maxTokens.setValue('2048');
    await temperature.setValue('0.7');
    await model.setValue('gpt-next');

    expect(wrapper.emitted('update-api-config')).toEqual([
      [{ apiurl: 'https://new.example/v1' }],
      [{ max_tokens: 2048 }],
      [{ temperature: 0.7 }],
      [{ model: 'gpt-next' }],
    ]);

    await maxTokens.setValue('');
    await temperature.setValue('');
    expect(wrapper.emitted('update-api-config')?.slice(-2)).toEqual([
      [{ max_tokens: 4096 }],
      [{ temperature: 1 }],
    ]);
  });

  it('preserves model selection strings from the custom select', () => {
    const wrapper = mountPage({ apiModelList: ['model-a', 'model-b'] });

    selectWithLabel(wrapper, 'model-b').vm.$emit('update:modelValue', 'model-b');

    expect(wrapper.emitted('update-api-config')).toEqual([[{ model: 'model-b' }]]);
  });

  it('keeps version and model actions disabled or loading and emits action flows', async () => {
    const wrapper = mountPage({ apiModelLoading: true, versionCheckLoading: true });
    const modelButton = wrapper.get('.load-model-action');
    const versionButton = wrapper.get('.check-version-action');

    expect(modelButton.attributes()).toHaveProperty('disabled');
    expect(modelButton.attributes('aria-busy')).toBe('true');
    expect(versionButton.attributes()).toHaveProperty('disabled');
    expect(versionButton.attributes('aria-busy')).toBe('true');
    await modelButton.trigger('click');
    await versionButton.trigger('click');
    expect(wrapper.emitted('load-model-list')).toBeUndefined();
    expect(wrapper.emitted('check-latest-version')).toBeUndefined();

    const enabled = mountPage();
    await enabled.get('.load-model-action').trigger('click');
    await enabled.get('.check-version-action').trigger('click');
    await enabled.get('.copy-version-action').trigger('click');
    expect(enabled.emitted('load-model-list')).toHaveLength(1);
    expect(enabled.emitted('check-latest-version')).toHaveLength(1);
    expect(enabled.emitted('copy-version-import-url')).toHaveLength(1);
  });
});
