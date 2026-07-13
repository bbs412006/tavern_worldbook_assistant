// @vitest-environment jsdom

import { mount, type VueWrapper } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { defineComponent, nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../../../src/worldbook_assistant_build/App.vue';
import { normalizeEntry } from '../../../src/worldbook_assistant_build/domain/persistedState';

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
  globals.__WB_ASSISTANT_ENABLE_PERFORMANCE_DIAGNOSTICS__ = false;
  delete globals.__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__;
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

function mountApp(attachTo: HTMLElement = document.body): VueWrapper {
  return mount(App, {
    attachTo,
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

function installFrameQueue() {
  let nextId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    const id = nextId++;
    callbacks.set(id, callback);
    return id;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => {
    callbacks.delete(id);
  });
  return {
    flush() {
      const queued = [...callbacks.entries()];
      callbacks.clear();
      queued.forEach(([id, callback]) => callback(id));
    },
    pending: () => callbacks.size,
  };
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

  it('binds workspace resize work to the mounted document window', () => {
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    const foreignDocument = iframe.contentDocument!;
    const foreignWindow = iframe.contentWindow!;
    const host = foreignDocument.createElement('div');
    foreignDocument.body.append(host);
    const foreignAdd = vi.spyOn(foreignWindow, 'addEventListener');
    const foreignRemove = vi.spyOn(foreignWindow, 'removeEventListener');
    const localAdd = vi.spyOn(window, 'addEventListener');

    const wrapper = mountApp(host);

    const foreignResizeListeners = foreignAdd.mock.calls.filter(([type]) => type === 'resize');
    const localResizeListeners = localAdd.mock.calls.filter(([type]) => type === 'resize');
    expect(foreignResizeListeners).toHaveLength(1);
    expect(localResizeListeners).toHaveLength(1);
    wrapper.unmount();
    expect(foreignRemove.mock.calls.filter(([type]) => type === 'resize')).toHaveLength(1);
    iframe.remove();
  });

  it('does not persist layout when navigation stops no active pane resize', async () => {
    const wrapper = mountApp();
    const replaceVariables = vi.mocked((globalThis as Record<string, any>).replaceVariables);
    await nextTick();
    replaceVariables.mockClear();

    await openUtility(wrapper, 'settings');

    expect(replaceVariables).not.toHaveBeenCalled();
    wrapper.unmount();
    expect(replaceVariables).not.toHaveBeenCalled();
  });

  it('persists layout after stopping a real pane resize', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
    const wrapper = mountApp();
    const replaceVariables = vi.mocked((globalThis as Record<string, any>).replaceVariables);
    const vm = wrapper.vm as unknown as {
      startPaneResize(key: 'main', event: PointerEvent): void;
    };
    const target = document.createElement('div');
    target.setPointerCapture = vi.fn();
    await nextTick();
    replaceVariables.mockClear();

    vm.startPaneResize('main', {
      button: 0,
      pointerId: 7,
      pointerType: 'mouse',
      clientX: 320,
      currentTarget: target,
      preventDefault: vi.fn(),
    } as unknown as PointerEvent);
    document.dispatchEvent(new Event('pointerup'));

    expect(replaceVariables).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('tears down an active content resize session when the workspace hides', async () => {
    const wrapper = mountApp();
    const vm = wrapper.vm as unknown as {
      panelMode: string;
      draftEntries: ReturnType<typeof normalizeEntry>[];
      selectedEntryUid: number | null;
    };
    vm.panelMode = 'editor';
    vm.draftEntries = [normalizeEntry({ uid: 1, comment: 'Entry', content: 'Draft' }, 1)];
    vm.selectedEntryUid = 1;
    await nextTick();

    const textarea = wrapper.get('.editor-content-area').element as HTMLTextAreaElement;
    const handle = wrapper.get('.content-resize-handle').element as HTMLElement;
    const cancelFrame = vi.spyOn(window, 'cancelAnimationFrame');
    Object.defineProperty(handle, 'setPointerCapture', { configurable: true, value: vi.fn() });
    Object.defineProperty(handle, 'hasPointerCapture', { configurable: true, value: vi.fn(() => true) });
    Object.defineProperty(handle, 'releasePointerCapture', { configurable: true, value: vi.fn() });

    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 9, clientY: 200 }));
    handle.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 9, clientY: 260 }));
    expect(textarea.style.pointerEvents).toBe('none');
    expect(textarea.style.willChange).toBe('height');

    await openUtility(wrapper, 'settings');

    expect(cancelFrame).toHaveBeenCalledTimes(1);
    expect(handle.releasePointerCapture).toHaveBeenCalledWith(9);
    expect(textarea.style.pointerEvents).toBe('');
    expect(textarea.style.willChange).toBe('');
    wrapper.unmount();
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

  it('records navigation metrics after nextTick and one coalesced frame only when locally enabled', async () => {
    const globals = globalThis as Record<string, any>;
    globals.__WB_ASSISTANT_ENABLE_PERFORMANCE_DIAGNOSTICS__ = true;
    const frames = installFrameQueue();
    const wrapper = mountApp();
    await nextTick();

    const initial = globals.__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__();
    expect(initial.mainWorkspaceMounts).toBe(1);

    (wrapper.vm as unknown as { openSettingsPage(): void }).openSettingsPage();
    expect(globals.__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__().metrics['open-settings'].count).toBe(0);
    await nextTick();
    expect(globals.__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__().resources['navigation-frame']).toBe(1);
    frames.flush();
    expect(globals.__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__()).toMatchObject({
      metrics: { 'open-settings': { count: 1 } },
      resources: { 'navigation-frame': 0 },
      utilityPageMounts: { settings: 1 },
    });

    await wrapper.get('[data-utility-back]').trigger('click');
    await nextTick();
    expect(globals.__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__().resources['navigation-frame']).toBe(1);
    frames.flush();
    expect(globals.__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__().metrics['return-main'].count).toBe(1);

    wrapper.unmount();
    expect(globals.__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__).toBeUndefined();
  });

  it('keeps diagnostics disabled without exposing a local snapshot', async () => {
    const wrapper = mountApp();

    expect((globalThis as Record<string, any>).__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__).toBeUndefined();
    await openUtility(wrapper, 'settings');
    await returnToMain(wrapper);
    expect((globalThis as Record<string, any>).__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__).toBeUndefined();

    wrapper.unmount();
  });

  it('survives 20 settings and AI config round trips with stable DOM, state, and bounded navigation frames', async () => {
    const globals = globalThis as Record<string, any>;
    globals.__WB_ASSISTANT_ENABLE_PERFORMANCE_DIAGNOSTICS__ = true;
    const frames = installFrameQueue();
    const wrapper = mountApp();
    const originalWorkspace = wrapper.get('[data-main-workspace]').element;
    const retainedInput = wrapper.get('[data-retained-draft]');
    await retainedInput.setValue('循环后仍保留');
    (wrapper.vm as unknown as { mobileTab: string }).mobileTab = 'tags';

    for (let cycle = 0; cycle < 20; cycle += 1) {
      (wrapper.vm as unknown as { openSettingsPage(): void }).openSettingsPage();
      await nextTick();
      expect(globals.__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__().resources['navigation-frame']).toBe(1);
      expect(wrapper.find('[data-settings-page]').exists()).toBe(true);
      frames.flush();
      await wrapper.get('[data-utility-back]').trigger('click');
      await nextTick();
      expect(globals.__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__().resources['navigation-frame']).toBe(1);
      frames.flush();
      expect(wrapper.find('[data-settings-page]').exists()).toBe(false);

      (wrapper.vm as unknown as { openAiConfigPage(): void }).openAiConfigPage();
      await nextTick();
      expect(globals.__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__().resources['navigation-frame']).toBe(1);
      expect(wrapper.find('[data-ai-config-page]').exists()).toBe(true);
      frames.flush();
      await wrapper.get('[data-utility-back]').trigger('click');
      await nextTick();
      expect(globals.__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__().resources['navigation-frame']).toBe(1);
      frames.flush();
      expect(wrapper.find('[data-ai-config-page]').exists()).toBe(false);

      expect(wrapper.get('[data-main-workspace]').element).toBe(originalWorkspace);
    }

    expect(wrapper.get('[data-retained-draft]').element).toBe(retainedInput.element);
    expect((wrapper.get('[data-retained-draft]').element as HTMLInputElement).value).toBe('循环后仍保留');
    expect((wrapper.vm as unknown as { mobileTab: string }).mobileTab).toBe('tags');
    expect(globals.__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__().resources['navigation-frame']).toBe(0);
    expect(globals.__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__()).toMatchObject({
      metrics: {
        'open-settings': { count: 20 },
        'open-ai-config': { count: 20 },
        'return-main': { count: 40 },
      },
      resources: { 'navigation-frame': 0 },
      mainWorkspaceMounts: 1,
      utilityPageMounts: { settings: 20, 'ai-config': 20 },
    });

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

  it('preserves the mobile workspace flex boundary and active tab across utility round trips', async () => {
    Object.defineProperty(window.screen, 'width', { configurable: true, value: 390 });
    Object.defineProperty(window.screen, 'height', { configurable: true, value: 844 });

    const wrapper = mountApp();
    const vm = wrapper.vm as unknown as { panelMode: string; mobileTab: string };
    vm.panelMode = 'editor';
    vm.mobileTab = 'tags';
    await nextTick();

    const workspace = wrapper.get('[data-main-workspace]');
    const originalWorkspace = workspace.element;
    const appSource = readFileSync('src/worldbook_assistant_build/App.vue', 'utf8');
    const workspaceRule = appSource.match(/\.main-workspace\s*\{([^}]*)\}/)?.[1] ?? '';
    const assertMobileLayoutState = () => {
      expect(workspace.classes()).toContain('main-workspace');
      expect(workspaceRule).toMatch(/display:\s*flex;/);
      expect(workspaceRule).toMatch(/flex:\s*1;/);
      expect(workspaceRule).toMatch(/flex-direction:\s*column;/);
      expect(workspaceRule).toMatch(/min-height:\s*0;/);
      expect(workspaceRule).toMatch(/overflow:\s*hidden;/);
      expect(workspaceRule).toMatch(/width:\s*100%;/);

      const activeTab = wrapper.get('.mobile-tab-bar button.active');
      expect(activeTab.text()).toContain('标签');
      expect(wrapper.get('.mobile-tab-view').isVisible()).toBe(true);
    };

    assertMobileLayoutState();
    await openUtility(wrapper, 'settings');
    await returnToMain(wrapper);
    expect(wrapper.get('[data-main-workspace]').element).toBe(originalWorkspace);
    assertMobileLayoutState();

    await openUtility(wrapper, 'ai-config');
    await returnToMain(wrapper);
    expect(wrapper.get('[data-main-workspace]').element).toBe(originalWorkspace);
    assertMobileLayoutState();

    wrapper.unmount();
  });
});
