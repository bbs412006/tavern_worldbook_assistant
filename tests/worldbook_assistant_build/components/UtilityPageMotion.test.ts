// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import AIConfigPage from '../../../src/worldbook_assistant_build/components/AIConfigPage.vue';
import SettingsPage from '../../../src/worldbook_assistant_build/components/SettingsPage.vue';

const settingsSource = readFileSync(
  resolve(process.cwd(), 'src/worldbook_assistant_build/components/SettingsPage.vue'),
  'utf8',
);
const aiConfigSource = readFileSync(
  resolve(process.cwd(), 'src/worldbook_assistant_build/components/AIConfigPage.vue'),
  'utf8',
);
const utilityPageStyles = `${settingsSource}\n${aiConfigSource}`;

function mountSettingsPage() {
  return mount(SettingsPage, {
    props: {
      persistedState: {
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
      },
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

function mountAIConfigPage(preview = false) {
  return mount(AIConfigPage, {
    props: {
      worldbookNames: ['世界书 A'],
      targetWorldbook: '世界书 A',
      input: '调整条目配置',
      customPrompt: '',
      changes: preview
        ? [{ name: '条目一', label: '常驻', oldValue: '否', newValue: '是', selected: true }]
        : [],
      preview,
      generating: false,
    },
  });
}

describe('utility page motion and scrolling contracts', () => {
  it('uses one internal scroll container per utility page', () => {
    const settings = mountSettingsPage();
    const aiConfig = mountAIConfigPage();

    expect(settings.findAll('.utility-page-scroll')).toHaveLength(1);
    expect(aiConfig.findAll('.utility-page-scroll')).toHaveLength(1);
    expect(settings.get('.utility-page-scroll').classes()).toContain('utility-page-body');
    expect(aiConfig.get('.utility-page-scroll').classes()).toContain('utility-page-body');
  });

  it('does not apply transitions to layout properties', () => {
    const declarations = [...utilityPageStyles.matchAll(/transition(?:-property)?\s*:\s*([^;}]+)/gi)].map(
      match => match[1],
    );

    expect(declarations).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\b(?:all|width|height|margin|padding|top|right|bottom|left|grid|flex)\b/i),
      ]),
    );
  });

  it('disables non-essential transitions and animations under prefers-reduced-motion', () => {
    expect(settingsSource).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(aiConfigSource).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(utilityPageStyles).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
    expect(utilityPageStyles).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
  });

  it('keeps preview horizontal scrolling contained', () => {
    const preview = mountAIConfigPage(true);

    expect(preview.findAll('.preview-table-wrap')).toHaveLength(1);
    expect(aiConfigSource).toMatch(/\.preview-table-wrap\s*\{[^}]*overflow-x:\s*auto/s);
    expect(aiConfigSource).toMatch(/\.preview-table-wrap\s*\{[^}]*overscroll-behavior-x:\s*contain/s);
    expect(aiConfigSource).toMatch(/\.preview-table-wrap\s*\{[^}]*-webkit-overflow-scrolling:\s*touch/s);
  });
});
