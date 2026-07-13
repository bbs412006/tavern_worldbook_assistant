// @vitest-environment jsdom

import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../../../src/worldbook_assistant_build/App.vue';

const SettingsPageStub = defineComponent({
  name: 'SettingsPage',
  emits: ['back'],
  template: '<section data-settings-page><button data-utility-back type="button" @click="$emit(\'back\')">返回</button></section>',
});

const AIConfigPageStub = defineComponent({
  name: 'AIConfigPage',
  emits: ['back'],
  template: '<section data-ai-config-page><button data-utility-back type="button" @click="$emit(\'back\')">返回</button></section>',
});

const BrowsePanelStub = defineComponent({
  name: 'BrowsePanel',
  template: '<section data-heavy-browse-stub><input data-retained-draft /></section>',
});

const EmptyStub = defineComponent({ template: '<div />' });

function installHostBoundaryStubs(): void {
  const globals = globalThis as Record<string, any>;
  globals.__WB_ASSISTANT_BUILD_COMMIT__ = 'test-commit';
  globals.__WB_ASSISTANT_BUILD_BRANCH__ = 'test-branch';
  globals.__WB_ASSISTANT_BUILD_TIME__ = '2026-07-13T00:00:00Z';
  globals.getScriptId = vi.fn(() => 'worldbook-test');
  globals.getVariables = vi.fn(() => ({}));
  globals.replaceVariables = vi.fn();
  globals.getWorldbookNames = vi.fn(() => []);
  globals.getWorldbook = vi.fn(async () => []);
  globals.updateWorldbookWith = vi.fn(async (_name: string, updater: (entries: unknown[]) => unknown[]) => updater([]));
  globals.replaceWorldbook = vi.fn(async () => undefined);
  globals.createWorldbook = vi.fn(async () => undefined);
  globals.deleteWorldbook = vi.fn(async () => true);
  globals.getGlobalWorldbookNames = vi.fn(() => []);
  globals.rebindGlobalWorldbooks = vi.fn(async () => undefined);
  globals.getCharWorldbookNames = vi.fn(() => ({ primary: null, additional: [] }));
  globals.getChatWorldbookName = vi.fn(() => null);
  globals.getCurrentCharacter = vi.fn(() => null);
  globals.getCurrentChatId = vi.fn(() => 'test-chat');
  globals.getChatMessages = vi.fn(() => []);
  globals.createWorldbookEntries = vi.fn(async () => undefined);
  globals.generateRaw = vi.fn(async () => '[]');
  globals.eventOn = vi.fn(() => ({ stop: vi.fn() }));
  globals.tavern_events = {
    WORLD_INFO_ACTIVATED: 'WORLD_INFO_ACTIVATED',
    WORLDINFO_UPDATED: 'WORLDINFO_UPDATED',
    CHAT_CHANGED: 'CHAT_CHANGED',
  };
  globals.toastr = { success: vi.fn(), info: vi.fn(), warning: vi.fn(), error: vi.fn() };
  globals.confirm = vi.fn(() => true);
  globals.prompt = vi.fn(() => null);
}

function mountApp(): VueWrapper {
  return mount(App, {
    attachTo: document.body,
    global: {
      stubs: {
        SettingsPage: SettingsPageStub,
        AIConfigPage: AIConfigPageStub,
        BrowsePanel: BrowsePanelStub,
        WorldbookPicker: EmptyStub,
        EditorPanel: EmptyStub,
        CrossCopyPanel: EmptyStub,
        CrossCopyControls: EmptyStub,
        CrossCopySourceList: EmptyStub,
        CrossCopyActionRows: EmptyStub,
        CrossCopyBulkActions: EmptyStub,
        CrossCopyDesktopGrid: EmptyStub,
        CrossCopyMobileStages: EmptyStub,
        GlobalModePanel: EmptyStub,
        TagManager: EmptyStub,
        AIChatPanel: EmptyStub,
        SettingPanel: EmptyStub,
        TagEditorPanel: EmptyStub,
        Transition: false,
        TransitionGroup: false,
      },
    },
  });
}

async function openUtility(wrapper: VueWrapper, page: 'settings' | 'ai-config'): Promise<void> {
  const vm = wrapper.vm as unknown as {
    openSettingsPage(): void;
    openAiConfigPage(): void;
  };
  if (page === 'settings') vm.openSettingsPage();
  else vm.openAiConfigPage();
  await nextTick();
}

async function returnToMain(wrapper: VueWrapper): Promise<void> {
  await wrapper.get('[data-utility-back]').trigger('click');
  await nextTick();
}

describe('App utility navigation', () => {
  beforeEach(() => {
    installHostBoundaryStubs();
    Object.defineProperty(window.screen, 'width', { configurable: true, value: 1440 });
    Object.defineProperty(window.screen, 'height', { configurable: true, value: 900 });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('keeps the same main workspace element across settings and AI config round trips', async () => {
    const wrapper = mountApp();
    const originalWorkspace = wrapper.get('[data-main-workspace]').element;

    await openUtility(wrapper, 'settings');
    await returnToMain(wrapper);
    expect(wrapper.get('[data-main-workspace]').element).toBe(originalWorkspace);

    await openUtility(wrapper, 'ai-config');
    await returnToMain(wrapper);
    expect(wrapper.get('[data-main-workspace]').element).toBe(originalWorkspace);

    wrapper.unmount();
  });

  it('marks the hidden main workspace inert and aria-hidden', async () => {
    const wrapper = mountApp();
    const workspace = wrapper.get('[data-main-workspace]');

    expect(workspace.attributes('aria-hidden')).toBe('false');
    expect(workspace.element.hasAttribute('inert')).toBe(false);

    await openUtility(wrapper, 'settings');
    expect(workspace.attributes('aria-hidden')).toBe('true');
    expect(workspace.element.hasAttribute('inert')).toBe(true);
    expect((workspace.element as HTMLElement).style.display).toBe('none');

    await returnToMain(wrapper);
    expect(workspace.attributes('aria-hidden')).toBe('false');
    expect(workspace.element.hasAttribute('inert')).toBe(false);

    wrapper.unmount();
  });

  it('mounts only the active utility page and removes it on return', async () => {
    const wrapper = mountApp();

    await openUtility(wrapper, 'settings');
    expect(wrapper.find('[data-settings-page]').exists()).toBe(true);
    expect(wrapper.find('[data-ai-config-page]').exists()).toBe(false);
    await returnToMain(wrapper);
    expect(wrapper.find('[data-settings-page]').exists()).toBe(false);

    await openUtility(wrapper, 'ai-config');
    expect(wrapper.find('[data-settings-page]').exists()).toBe(false);
    expect(wrapper.find('[data-ai-config-page]').exists()).toBe(true);
    await returnToMain(wrapper);
    expect(wrapper.find('[data-ai-config-page]').exists()).toBe(false);

    wrapper.unmount();
  });

  it('preserves heavy-child input and selected mobile state across round trips', async () => {
    const wrapper = mountApp();
    const retainedInput = wrapper.get('[data-retained-draft]');
    await retainedInput.setValue('未保存编辑内容');
    (wrapper.vm as unknown as { mobileTab: string }).mobileTab = 'tags';

    await openUtility(wrapper, 'settings');
    await returnToMain(wrapper);
    await openUtility(wrapper, 'ai-config');
    await returnToMain(wrapper);

    expect(wrapper.get('[data-retained-draft]').element).toBe(retainedInput.element);
    expect((wrapper.get('[data-retained-draft]').element as HTMLInputElement).value).toBe('未保存编辑内容');
    expect((wrapper.vm as unknown as { mobileTab: string }).mobileTab).toBe('tags');

    wrapper.unmount();
  });
});
