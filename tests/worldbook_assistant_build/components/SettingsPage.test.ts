// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SettingsPage from '../../../src/worldbook_assistant_build/components/SettingsPage.vue';

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

function mountPage() {
  return mount(SettingsPage, {
    props: {
      persistedState: createPersistedState(),
      fabVisible: true,
      floorBtnVisible: false,
      currentTheme: 'dark',
      themeOptions: [{ key: 'dark', label: '深色' }],
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
    },
  });
}

describe('SettingsPage', () => {
  it('renders experience, version, and API sections', () => {
    const wrapper = mountPage();

    expect(wrapper.text()).toContain('体验设置');
    expect(wrapper.text()).toContain('版本与更新');
    expect(wrapper.text()).toContain('API 设置');
  });

  it('emits back when the page back button is clicked', async () => {
    const wrapper = mountPage();

    await wrapper.get('.utility-page-back').trigger('click');

    expect(wrapper.emitted('back')).toHaveLength(1);
  });

  it('emits the changed floating-button setting', async () => {
    const wrapper = mountPage();
    const checkbox = wrapper.findAll('input[type="checkbox"]')[0];

    await checkbox.setValue(false);

    expect(wrapper.emitted('set-fab-visible')).toEqual([[false]]);
  });

  it('emits the selected API mode patch', async () => {
    const wrapper = mountPage();
    const tavernMode = wrapper.get('input[type="radio"][value="tavern"]');

    await tavernMode.setValue(true);

    expect(wrapper.emitted('update-api-config')).toEqual([[{ mode: 'tavern' }]]);
  });
});
