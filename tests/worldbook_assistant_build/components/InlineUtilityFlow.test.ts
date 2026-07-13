// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import { describe, expect, it } from 'vitest';

import AIConfigPage from '../../../src/worldbook_assistant_build/components/AIConfigPage.vue';
import SettingsPage from '../../../src/worldbook_assistant_build/components/SettingsPage.vue';

const InlineUtilityHarness = defineComponent({
  components: { AIConfigPage, SettingsPage },
  setup() {
    const page = ref<'main' | 'settings' | 'ai-config'>('main');
    const instruction = ref('');
    const preview = ref(false);
    const fabVisible = ref(true);
    const changes = ref([
      { name: '条目一', label: '常驻', oldValue: '否', newValue: '是', selected: true },
    ]);
    const persistedState = ref({
      show_ai_chat: true,
      multi_edit: { enabled: true, sync_extra_json: false },
      tag_editor: { delete_parent_mode: 'promote' },
      sort: { mode: 'mutate', reassign_uid: false },
      glass_mode: false,
      ai_api_config: {
        mode: 'tavern',
        use_main_api: false,
        apiurl: '',
        key: '',
        max_tokens: 4096,
        temperature: 1,
        model: '',
      },
    });

    return {
      page,
      instruction,
      preview,
      fabVisible,
      changes,
      persistedState,
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
    };
  },
  template: `
    <main data-testid="assistant-root">
      <template v-if="page === 'main'">
        <h1>助手主页面</h1>
        <button class="open-settings" @click="page = 'settings'">设置</button>
        <button class="open-ai-config" @click="page = 'ai-config'">AI配置</button>
      </template>
      <SettingsPage
        v-else-if="page === 'settings'"
        :persisted-state="persistedState"
        :fab-visible="fabVisible"
        :floor-btn-visible="false"
        current-theme="dark"
        :theme-options="[{ key: 'dark', label: '深色' }]"
        :api-model-list="[]"
        :api-model-loading="false"
        :version-info="versionInfo"
        :version-check-loading="false"
        version-check-error=""
        @back="page = 'main'"
        @set-fab-visible="fabVisible = $event"
      />
      <AIConfigPage
        v-else
        :worldbook-names="['世界书 A']"
        target-worldbook="世界书 A"
        :input="instruction"
        custom-prompt=""
        :changes="changes"
        :preview="preview"
        :generating="false"
        @update:input="instruction = $event"
        @generate="preview = true"
        @back-to-input="preview = false"
        @back="page = 'main'"
      />
    </main>
  `,
});

function mountHarness() {
  return mount(InlineUtilityHarness, { attachTo: document.body });
}

describe('inline settings and AI config flow', () => {
  it('navigates through settings inside the assistant root and returns to main', async () => {
    const wrapper = mountHarness();
    const root = wrapper.get('[data-testid="assistant-root"]');

    await wrapper.get('.open-settings').trigger('click');
    expect(root.findComponent(SettingsPage).exists()).toBe(true);
    expect(document.body.querySelector('.utility-page')).toBe(root.get('.utility-page').element);

    await root.findAll('input[type="checkbox"]')[0].setValue(false);
    expect((wrapper.vm as any).fabVisible).toBe(false);

    await root.get('.utility-page-back').trigger('click');
    expect(root.text()).toContain('助手主页面');
  });

  it('accepts AI input, enters preview, returns to input, then returns to main', async () => {
    const wrapper = mountHarness();
    const root = wrapper.get('[data-testid="assistant-root"]');

    await wrapper.get('.open-ai-config').trigger('click');
    expect(root.findComponent(AIConfigPage).exists()).toBe(true);

    await root.get('.ai-config-input-stage > .field textarea').setValue('将条目设为常驻');
    expect((wrapper.vm as any).instruction).toBe('将条目设为常驻');

    await root.get('.generate-action').trigger('click');
    expect(root.text()).toContain('配置变更预览');

    await root.get('.utility-page-back').trigger('click');
    expect(root.text()).toContain('发送给 AI 分析');
    expect((root.get('.ai-config-input-stage > .field textarea').element as HTMLTextAreaElement).value).toBe('将条目设为常驻');

    await root.get('.utility-page-back').trigger('click');
    expect(root.text()).toContain('助手主页面');
    expect(document.body.querySelector('.ai-tag-review-overlay')).toBeNull();
  });
});
