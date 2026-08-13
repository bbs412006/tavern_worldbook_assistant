// @vitest-environment jsdom

import { mount, type VueWrapper } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { defineComponent, nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../../../src/worldbook_assistant_build/App.vue';
import BaseSelect from '../../../src/worldbook_assistant_build/components/controls/BaseSelect.vue';
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
  globals.IntersectionObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
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

  it('tears down active floating drag listeners when the workspace hides', async () => {
    const globals = globalThis as Record<string, any>;
    globals.__WB_ASSISTANT_ENABLE_PERFORMANCE_DIAGNOSTICS__ = true;
    const wrapper = mountApp();
    const vm = wrapper.vm as unknown as {
      startFloatingDrag(key: 'find', event: PointerEvent): void;
    };
    const handle = document.createElement('div');
    const addDocumentListener = vi.spyOn(document, 'addEventListener');
    const removeDocumentListener = vi.spyOn(document, 'removeEventListener');
    const addWindowListener = vi.spyOn(window, 'addEventListener');
    const removeWindowListener = vi.spyOn(window, 'removeEventListener');
    handle.setPointerCapture = vi.fn();

    vm.startFloatingDrag('find', {
      button: 0,
      pointerId: 12,
      pointerType: 'mouse',
      clientX: 120,
      clientY: 80,
      currentTarget: handle,
      preventDefault: vi.fn(),
    } as unknown as PointerEvent);

    expect(addDocumentListener.mock.calls.filter(([type]) => type === 'pointermove')).toHaveLength(1);
    expect(addDocumentListener.mock.calls.filter(([type]) => type === 'pointerup')).toHaveLength(1);
    expect(addDocumentListener.mock.calls.filter(([type]) => type === 'pointercancel')).toHaveLength(1);
    expect(addWindowListener.mock.calls.filter(([type]) => type === 'blur')).toHaveLength(1);
    expect(globals.__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__().resources['floating-session']).toBe(1);

    await openUtility(wrapper, 'settings');

    expect(removeDocumentListener.mock.calls.filter(([type]) => type === 'pointermove')).toHaveLength(1);
    expect(removeDocumentListener.mock.calls.filter(([type]) => type === 'pointerup')).toHaveLength(1);
    expect(removeDocumentListener.mock.calls.filter(([type]) => type === 'pointercancel')).toHaveLength(1);
    expect(removeWindowListener.mock.calls.filter(([type]) => type === 'blur')).toHaveLength(1);
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

  it('preserves representative toolbar mappings and AI target across utility round trips', async () => {
    const wrapper = mountApp();
    const vm = wrapper.vm as unknown as {
      selectedWorldbookName: string;
      aiTargetWorldbook: string;
      selectedGlobalPresetId: string;
      panelMode: string;
      draftEntries: ReturnType<typeof normalizeEntry>[];
      selectedEntryUid: number | null;
      selectedEntryUids: number[];
      selectedPositionSelectValue: string;
    };
    vm.selectedWorldbookName = '世界书 A';
    vm.aiTargetWorldbook = '世界书 B';
    vm.selectedGlobalPresetId = '';
    vm.panelMode = 'editor';
    vm.draftEntries = [normalizeEntry({
      uid: 4,
      comment: 'Entry',
      content: 'Draft',
      strategy: { type: 'selective', keys: [], keys_secondary: { logic: 'not_any', keys: [] } },
      position: { type: 'at_depth', role: 'assistant', depth: 4, order: 100 },
    }, 4)];
    vm.selectedEntryUid = 4;
    vm.selectedEntryUids = [4];
    await nextTick();

    expect(vm.selectedPositionSelectValue).toBe('at_depth_as_assistant');
    await openUtility(wrapper, 'settings');
    await returnToMain(wrapper);
    await openUtility(wrapper, 'ai-config');
    await returnToMain(wrapper);

    expect(vm.selectedWorldbookName).toBe('世界书 A');
    expect(vm.aiTargetWorldbook).toBe('世界书 B');
    expect(vm.selectedGlobalPresetId).toBe('');

    wrapper.unmount();
  });

  it('uses named custom selects on the migrated App toolbar surfaces', async () => {
    const wrapper = mountApp();
    const vm = wrapper.vm as unknown as {
      panelMode: string;
      draftEntries: ReturnType<typeof normalizeEntry>[];
      selectedEntryUid: number | null;
      selectedEntryUids: number[];
    };
    vm.panelMode = 'editor';
    vm.draftEntries = [normalizeEntry({ uid: 2, comment: 'Entry', content: 'Draft' }, 2)];
    vm.selectedEntryUid = 2;
    vm.selectedEntryUids = [2];
    await nextTick();

    const migratedNames = ['次要逻辑', '位置', '深度角色'];
    const customSelects = wrapper.findAllComponents(BaseSelect);
    for (const name of migratedNames) {
      expect(customSelects.some(select => select.get('[role="combobox"]').attributes('aria-label') === name)).toBe(true);
    }
    expect(wrapper.find('.wb-toolbar select').exists()).toBe(false);
    expect(wrapper.find('.wb-focus-toolbar select').exists()).toBe(false);
    expect(wrapper.find('.mobile-browse-toolbar select').exists()).toBe(false);

    wrapper.unmount();
  });

  it('keeps only one serialized baseline and does not stringify the unchanged original entries after every edit', () => {
    const appSource = readFileSync('src/worldbook_assistant_build/App.vue', 'utf8');

    const syncDigestBody = appSource.match(/function syncEntriesDigestNow\(\): void \{([^}]*)\}/)?.[1] ?? '';
    const baselineBody = appSource.match(/function establishEntriesBaseline\(\): void \{([^}]*)\}/)?.[1] ?? '';

    expect(appSource).toMatch(/const originalEntriesDigest = ref\('(?:\[\]|)'\);/);
    expect(syncDigestBody).toMatch(/draftEntriesDigest\.value = JSON\.stringify\(draftEntries\.value\);/);
    expect(syncDigestBody).not.toContain('originalEntriesDigest');
    expect(baselineBody).toMatch(/originalEntriesDigest\.value = JSON\.stringify\(originalEntries\.value\);/);
  });

  it('keeps the current worldbook when dirty-switch confirmation is cancelled and switches when accepted', async () => {
    const wrapper = mountApp();
    const vm = wrapper.vm as unknown as {
      selectedWorldbookName: string;
      draftEntries: ReturnType<typeof normalizeEntry>[];
      originalEntries: ReturnType<typeof normalizeEntry>[];
      syncEntriesDigestNow(): void;
      handleWorldbookSelectionUpdate(value: string): void;
    };
    vm.selectedWorldbookName = '世界书 A';
    await nextTick();
    await Promise.resolve();
    vm.originalEntries = [normalizeEntry({ uid: 1, comment: 'Entry', content: 'saved' }, 1)];
    vm.draftEntries = [normalizeEntry({ uid: 1, comment: 'Entry', content: 'dirty' }, 1)];
    vm.syncEntriesDigestNow();
    await nextTick();
    const confirm = vi.mocked((globalThis as Record<string, any>).confirm);

    confirm.mockReturnValueOnce(false);
    vm.handleWorldbookSelectionUpdate('世界书 B');
    await nextTick();
    expect(vm.selectedWorldbookName).toBe('世界书 A');

    confirm.mockReturnValueOnce(true);
    vm.handleWorldbookSelectionUpdate('世界书 B');
    await nextTick();
    expect(vm.selectedWorldbookName).toBe('世界书 B');
    expect(confirm).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it('renders Task 5 desktop main and focus toolbar actions through small BaseButtons', async () => {
    const wrapper = mountApp();
    const vm = wrapper.vm as unknown as { panelMode: string; isFocusEditing: boolean; focusToolsExpanded: boolean };
    vm.panelMode = 'editor';
    await nextTick();
    const mainActions = wrapper.findAll('[data-focus-hero^="wb_"]');
    expect(mainActions).toHaveLength(5);
    expect(mainActions.every(button => button.classes().includes('wb-control--sm'))).toBe(true);

    vm.isFocusEditing = true;
    vm.focusToolsExpanded = true;
    await nextTick();
    const focusActions = wrapper.findAll('.wb-focus-toolbar button')
      .filter(button => !button.classes().includes('wb-control-select-option'));
    expect(focusActions.length).toBeGreaterThan(5);
    expect(focusActions.every(button => button.classes().includes('wb-control--sm') || button.classes().includes('tag-tree-toggle'))).toBe(true);
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

  it('survives 20 settings and AI config round trips with stable DOM, state, and bounded owned resources', async () => {
    const globals = globalThis as Record<string, any>;
    globals.__WB_ASSISTANT_ENABLE_PERFORMANCE_DIAGNOSTICS__ = true;
    const frames = installFrameQueue();
    const wrapper = mountApp();
    const originalWorkspace = wrapper.get('[data-main-workspace]').element;
    const retainedInput = wrapper.get('[data-retained-draft]');
    await retainedInput.setValue('循环后仍保留');
    (wrapper.vm as unknown as { mobileTab: string }).mobileTab = 'tags';
    const activeResourceBaseline = {
      'browse-observer': 0,
      'resize-listener': 1,
      'workspace-frame': 0,
      'pane-session': 0,
      'content-session': 0,
      'top-session': 0,
      'floating-session': 0,
    };
    expect(globals.__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__().resources).toMatchObject(activeResourceBaseline);

    for (let cycle = 0; cycle < 20; cycle += 1) {
      (wrapper.vm as unknown as { openSettingsPage(): void }).openSettingsPage();
      await nextTick();
      expect(globals.__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__().resources['navigation-frame']).toBe(1);
      expect(wrapper.find('[data-settings-page]').exists()).toBe(true);
      expect(globals.__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__().resources).toMatchObject({
        ...activeResourceBaseline,
        'resize-listener': 0,
      });
      frames.flush();
      await wrapper.get('[data-utility-back]').trigger('click');
      await nextTick();
      expect(globals.__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__().resources['navigation-frame']).toBe(1);
      frames.flush();
      expect(wrapper.find('[data-settings-page]').exists()).toBe(false);
      expect(globals.__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__().resources).toMatchObject(activeResourceBaseline);

      (wrapper.vm as unknown as { openAiConfigPage(): void }).openAiConfigPage();
      await nextTick();
      expect(globals.__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__().resources['navigation-frame']).toBe(1);
      expect(wrapper.find('[data-ai-config-page]').exists()).toBe(true);
      expect(globals.__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__().resources).toMatchObject({
        ...activeResourceBaseline,
        'resize-listener': 0,
      });
      frames.flush();
      await wrapper.get('[data-utility-back]').trigger('click');
      await nextTick();
      expect(globals.__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__().resources['navigation-frame']).toBe(1);
      frames.flush();
      expect(wrapper.find('[data-ai-config-page]').exists()).toBe(false);
      expect(globals.__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__().resources).toMatchObject(activeResourceBaseline);

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
      resources: { 'navigation-frame': 0, ...activeResourceBaseline },
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

  it('keeps crowded mobile tabs readable, aligned, and horizontally scrollable', () => {
    const appSource = readFileSync('src/worldbook_assistant_build/App.vue', 'utf8');
    const tabBarRule = appSource.match(/\.mobile-tab-bar\s*\{([^}]*)\}/)?.[1] ?? '';
    const tabButtonRule = appSource.match(/\.mobile-tab-bar button\s*\{([^}]*)\}/)?.[1] ?? '';
    const tabLabelRule = appSource.match(/\.mobile-tab-bar \.tab-label\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(tabBarRule).toMatch(/overflow-x:\s*auto;/);
    expect(tabBarRule).toMatch(/align-items:\s*stretch;/);
    expect(tabButtonRule).toMatch(/flex:\s*0 0 auto;/);
    expect(tabButtonRule).toMatch(/min-width:\s*56px;/);
    expect(tabButtonRule).toMatch(/min-height:\s*52px;/);
    expect(tabButtonRule).toMatch(/align-self:\s*stretch;/);
    expect(tabLabelRule).toMatch(/white-space:\s*nowrap;/);
  });

  it('keeps mobile list titles left-aligned and gives them priority over right-aligned metadata', () => {
    const appSource = readFileSync('src/worldbook_assistant_build/App.vue', 'utf8');
    const mobileListTemplate = appSource.match(/<div class="mobile-entry-list">([\s\S]*?)<div v-if="!filteredEntries\.length"/)?.[1] ?? '';
    const titleGroupRule = appSource.match(/\.mobile-entry-title-group\s*\{([^}]*)\}/)?.[1] ?? '';
    const titleRule = appSource.match(/\.mobile-entry-list \.entry-item-title\s*\{([^}]*)\}/)?.[1] ?? '';
    const metadataRule = appSource.match(/\.mobile-entry-meta\s*\{([^}]*)\}/)?.[1] ?? '';
    const detailsRule = appSource.match(/\.mobile-entry-details\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(mobileListTemplate).toMatch(/class="mobile-entry-title-group"[\s\S]*?entry-status-dot[\s\S]*?entry-item-title/);
    expect(mobileListTemplate).toMatch(/class="mobile-entry-meta"[\s\S]*?entry-chip mono[\s\S]*?entry-chip uid/);
    expect(mobileListTemplate).toMatch(/class="mobile-entry-details"/);
    expect(titleGroupRule).toMatch(/flex:\s*1 1 auto;/);
    expect(titleGroupRule).toMatch(/justify-content:\s*flex-start;/);
    expect(titleRule).toMatch(/white-space:\s*normal;/);
    expect(titleRule).toMatch(/overflow-wrap:\s*anywhere;/);
    expect(titleRule).not.toMatch(/text-overflow:\s*ellipsis;/);
    expect(metadataRule).toMatch(/margin-left:\s*auto;/);
    expect(metadataRule).toMatch(/justify-content:\s*flex-end;/);
    expect(detailsRule).toMatch(/justify-content:\s*flex-end;/);
  });

  it('contains the mobile entry list within one vertical scroller without overlay collisions', () => {
    const appSource = readFileSync('src/worldbook_assistant_build/App.vue', 'utf8');
    const mobilePaneRule = appSource.match(/\.mobile-pane\s*\{([^}]*)\}/)?.[1] ?? '';
    const mobileListRule = appSource.match(/\.mobile-entry-list\s*\{([^}]*)\}/)?.[1] ?? '';
    const mobileItemRule = appSource.match(/\.mobile-entry-list \.entry-item\s*\{([^}]*)\}/)?.[1] ?? '';
    const titleGroupRule = appSource.match(/\.mobile-entry-title-group\s*\{([^}]*)\}/)?.[1] ?? '';
    const keysRule = appSource.match(/\.mobile-entry-list \.entry-item-keys\s*\{([^}]*)\}/)?.[1] ?? '';
    const detailsRule = appSource.match(/\.mobile-entry-details\s*\{([^}]*)\}/)?.[1] ?? '';
    const loadMoreRule = appSource.match(/\.mobile-entry-load-more\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(mobilePaneRule).toMatch(/overflow-x:\s*hidden;/);
    expect(mobilePaneRule).toMatch(/box-sizing:\s*border-box;/);
    expect(mobilePaneRule).toMatch(/padding:\s*8px 8px calc\(60px \+ env\(safe-area-inset-bottom,\s*0px\)\);/);
    expect(mobileListRule).toMatch(/width:\s*100%;/);
    expect(mobileListRule).toMatch(/min-width:\s*0;/);
    expect(mobileListRule).toMatch(/overflow-x:\s*clip;/);
    expect(mobileItemRule).toMatch(/box-sizing:\s*border-box;/);
    expect(mobileItemRule).toMatch(/max-width:\s*100%;/);
    expect(mobileItemRule).toMatch(/min-width:\s*0;/);
    expect(titleGroupRule).toMatch(/max-width:\s*100%;/);
    expect(mobileItemRule).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\) auto;/);
    expect(keysRule).toMatch(/white-space:\s*normal;/);
    expect(keysRule).toMatch(/min-width:\s*0;/);
    expect(keysRule).toMatch(/grid-column:\s*1 \/ -1;/);
    expect(detailsRule).toMatch(/grid-column:\s*1 \/ -1;/);
    expect(loadMoreRule).toMatch(/padding:\s*4px 0 calc\(8px \+ env\(safe-area-inset-bottom,\s*0px\)\);/);
  });

  it('debounces large-list search and reuses a normalized search index', async () => {
    vi.useFakeTimers();
    const wrapper = mountApp();
    const vm = wrapper.vm as unknown as {
      draftEntries: ReturnType<typeof normalizeEntry>[];
      searchText: string;
      filteredEntries: ReturnType<typeof normalizeEntry>[];
    };
    vm.draftEntries = Array.from({ length: 500 }, (_, index) => normalizeEntry({
      uid: index + 1,
      comment: `Entry ${index + 1}`,
      content: index === 499 ? 'unique-search-target' : 'ordinary content',
    }, index + 1));
    await nextTick();

    vm.searchText = 'unique-search-target';
    await nextTick();
    expect(vm.filteredEntries).toHaveLength(500);

    await vi.advanceTimersByTimeAsync(150);
    await nextTick();
    expect(vm.filteredEntries).toHaveLength(1);
    expect(vm.filteredEntries[0]?.uid).toBe(500);

    wrapper.unmount();
    vi.useRealTimers();
  });

  it('renders desktop entries in bounded batches so large worldbooks do not mount every row at once', async () => {
    Object.defineProperty(window.screen, 'width', { configurable: true, value: 1440 });
    Object.defineProperty(window.screen, 'height', { configurable: true, value: 900 });
    const globals = globalThis as Record<string, any>;
    globals.getWorldbookNames = vi.fn(() => ['桌面大型世界书']);
    globals.getWorldbook = vi.fn(async () =>
      Array.from({ length: 120 }, (_, index) => normalizeEntry({
        uid: index + 1,
        name: `桌面条目 ${index + 1}`,
        content: `桌面内容 ${index + 1}`,
      }, index + 1)),
    );

    const wrapper = mountApp();
    const vm = wrapper.vm as unknown as {
      panelMode: string;
      reloadWorldbookNames(preferred?: string): Promise<boolean>;
      desktopEditorLoadMore(): void;
    };
    vm.panelMode = 'editor';
    await vm.reloadWorldbookNames('桌面大型世界书');
    await nextTick();

    expect(wrapper.findAll('.list-scroll .entry-item')).toHaveLength(48);
    vm.desktopEditorLoadMore();
    await nextTick();
    expect(wrapper.findAll('.list-scroll .entry-item')).toHaveLength(96);
    wrapper.unmount();
  });

  it('renders mobile entries in bounded batches so opening a large worldbook stays responsive', async () => {
    Object.defineProperty(window.screen, 'width', { configurable: true, value: 390 });
    Object.defineProperty(window.screen, 'height', { configurable: true, value: 844 });
    const globals = globalThis as Record<string, any>;
    globals.getWorldbookNames = vi.fn(() => ['大型世界书']);
    globals.getWorldbook = vi.fn(async () =>
      Array.from({ length: 120 }, (_, index) =>
        normalizeEntry({
          uid: index + 1,
          name: `长标题条目 ${index + 1}`,
          enabled: true,
          strategy: { type: 'selective', keys: [`关键词 ${index + 1}`], secondary_keys: [] },
          position: { type: 'before_character_definition', order: index + 1 },
          recursion: { prevent_incoming: false, prevent_outgoing: false },
          content: `内容 ${index + 1}`,
        }, index + 1),
      ),
    );

    const wrapper = mountApp();
    const vm = wrapper.vm as unknown as {
      panelMode: string;
      mobileTab: string;
      reloadWorldbookNames(preferred?: string): Promise<boolean>;
      mobileEditorLoadMore(): void;
    };
    vm.panelMode = 'editor';
    vm.mobileTab = 'list';
    await vm.reloadWorldbookNames('大型世界书');
    await nextTick();

    expect(wrapper.findAll('.mobile-entry-list .entry-item')).toHaveLength(18);
    vm.mobileEditorLoadMore();
    await nextTick();
    expect(wrapper.findAll('.mobile-entry-list .entry-item')).toHaveLength(36);
    wrapper.unmount();
  });

  it('resets mobile rendering when switching between equally sized worldbooks', async () => {
    Object.defineProperty(window.screen, 'width', { configurable: true, value: 390 });
    Object.defineProperty(window.screen, 'height', { configurable: true, value: 844 });
    const globals = globalThis as Record<string, any>;
    globals.getWorldbookNames = vi.fn(() => ['世界书 A', '世界书 B']);
    globals.getWorldbook = vi.fn(async (name: string) =>
      Array.from({ length: 36 }, (_, index) => normalizeEntry({
        uid: index + 1,
        name: `${name} 条目 ${index + 1}`,
        content: `${name} 内容 ${index + 1}`,
      }, index + 1)),
    );

    const wrapper = mountApp();
    const vm = wrapper.vm as unknown as {
      panelMode: string;
      mobileTab: string;
      reloadWorldbookNames(preferred?: string): Promise<boolean>;
      switchWorldbookSelection(name: string, options?: Record<string, unknown>): boolean;
      mobileEditorLoadMore(): void;
    };
    vm.panelMode = 'editor';
    vm.mobileTab = 'list';
    await vm.reloadWorldbookNames('世界书 A');
    await nextTick();
    vm.mobileEditorLoadMore();
    await nextTick();
    expect(wrapper.findAll('.mobile-entry-list .entry-item')).toHaveLength(36);

    expect(vm.switchWorldbookSelection('世界书 B', { source: 'manual', allowDirty: true })).toBe(true);
    await vi.waitFor(() => expect(globals.getWorldbook).toHaveBeenCalledWith('世界书 B'));
    await nextTick();
    expect(wrapper.findAll('.mobile-entry-list .entry-item')).toHaveLength(18);
    expect(wrapper.get('.mobile-entry-list .entry-item').text()).toContain('世界书 B');
    wrapper.unmount();
  });

  it('selects only the currently rendered mobile entries when selecting all visible', async () => {
    Object.defineProperty(window.screen, 'width', { configurable: true, value: 390 });
    Object.defineProperty(window.screen, 'height', { configurable: true, value: 844 });
    const globals = globalThis as Record<string, any>;
    globals.getWorldbookNames = vi.fn(() => ['大型世界书']);
    globals.getWorldbook = vi.fn(async () =>
      Array.from({ length: 36 }, (_, index) => normalizeEntry({ uid: index + 1, name: `条目 ${index + 1}` }, index + 1)),
    );

    const wrapper = mountApp();
    const vm = wrapper.vm as unknown as {
      panelMode: string;
      mobileTab: string;
      mobileMultiSelectMode: boolean;
      selectedEntryUids: number[];
      reloadWorldbookNames(preferred?: string): Promise<boolean>;
      selectAllVisibleForMobileMultiSelect(): void;
    };
    vm.panelMode = 'editor';
    vm.mobileTab = 'list';
    await vm.reloadWorldbookNames('大型世界书');
    await nextTick();
    vm.mobileMultiSelectMode = true;
    vm.selectAllVisibleForMobileMultiSelect();

    expect(vm.selectedEntryUids).toHaveLength(18);
    expect(vm.selectedEntryUids).toEqual(Array.from({ length: 18 }, (_, index) => index + 1));
    wrapper.unmount();
  });

  it('switches to the mobile editor immediately after selecting a rendered entry', async () => {
    Object.defineProperty(window.screen, 'width', { configurable: true, value: 390 });
    Object.defineProperty(window.screen, 'height', { configurable: true, value: 844 });
    const globals = globalThis as Record<string, any>;
    globals.getWorldbookNames = vi.fn(() => ['快速世界书']);
    globals.getWorldbook = vi.fn(async () => [
      normalizeEntry({ uid: 1, name: '快速展开条目', content: '正文' }, 1),
    ]);

    const wrapper = mountApp();
    const vm = wrapper.vm as unknown as {
      panelMode: string;
      mobileTab: string;
      reloadWorldbookNames(preferred?: string): Promise<boolean>;
    };
    vm.panelMode = 'editor';
    vm.mobileTab = 'list';
    await vm.reloadWorldbookNames('快速世界书');
    await nextTick();

    await wrapper.get('.mobile-entry-list .entry-item').trigger('click');
    expect(vm.mobileTab).toBe('edit');
    expect(wrapper.find('.mobile-pane .editor-head').exists()).toBe(true);
    wrapper.unmount();
  });

  it('keeps mobile controls touchable while removing permanent frames from secondary actions', () => {
    const appSource = readFileSync('src/worldbook_assistant_build/App.vue', 'utf8');
    const mobileBlocks = [...appSource.matchAll(/\.wb-assistant-root\.is-mobile\s*\{([\s\S]*?)\n\}/g)].map(match => match[1]).join('\n');

    expect(mobileBlocks).toMatch(/--wb-control-height-sm:\s*44px;/);
    expect(mobileBlocks).toMatch(/--wb-control-height-md:\s*44px;/);
    expect(mobileBlocks).toMatch(/--wb-control-height-lg:\s*48px;/);
    expect(mobileBlocks).toMatch(/:deep\(\.wb-control-button--default\)[\s\S]*?border-color:\s*transparent;/);
    expect(mobileBlocks).toMatch(/:deep\(\.wb-control-button\.is-icon-only\)[\s\S]*?background:\s*transparent;/);
    expect(mobileBlocks).toMatch(/:deep\(\.wb-control-button:active:not\(:disabled\)\)[\s\S]*?transform:\s*scale\(0\.97\);/);
    expect(mobileBlocks).toMatch(/:deep\(\.wb-control-button--primary\)[\s\S]*?border-color:\s*var\(--wb-primary\);/);
    expect(mobileBlocks).toMatch(/:deep\(\.wb-control-button\.is-icon-only\.wb-control-button--primary\)[\s\S]*?background:\s*var\(--wb-primary\);/);
    expect(mobileBlocks).toMatch(/:deep\(\.wb-control-button--danger\)[\s\S]*?border-color:\s*var\(--wb-control-danger-border\);/);
    expect(mobileBlocks).toMatch(/:deep\(\.wb-control-choice\)[\s\S]*?min-height:\s*44px;/);
    expect(mobileBlocks).toMatch(/:deep\(\.wb-control-select-clear\)[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/);
    expect(mobileBlocks).toMatch(/\.ai-session-delete,[\s\S]*?\.ai-tag-review-close[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/);
    expect(mobileBlocks).toMatch(/\.ai-session-delete[\s\S]*?opacity:\s*1;/);
    expect(mobileBlocks).not.toMatch(/\.ai-tag-review-close\s*\{[^}]*width:\s*28px;/);
    expect(appSource.match(/<BaseButton[^>]*variant="primary"[^>]*@click="saveCurrentWorldbook"/g)).toHaveLength(3);

    const coarsePointerRule = appSource.match(/@media \(pointer:\s*coarse\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    expect(coarsePointerRule).not.toMatch(/(?:min-height|width|min-width):\s*(?:40|4[0-3])px;/);
    expect(mobileBlocks).toMatch(/\.tag-tree-row[\s\S]*?grid-template-columns:\s*44px 44px minmax\(0,\s*1fr\);/);
    expect(mobileBlocks).toMatch(/\.tag-tree-toggle:not\(\.placeholder\)[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/);
    expect(mobileBlocks).toMatch(/:deep\(\.wb-control-select-control\.has-clear \.wb-control-select-value\)[\s\S]*?padding-right:\s*68px;/);
  });

  it('flattens nested mobile panels and preserves the device bottom safe area', () => {
    const appSource = readFileSync('src/worldbook_assistant_build/App.vue', 'utf8');
    const mobileBlocks = [...appSource.matchAll(/\.wb-assistant-root\.is-mobile\s*\{([\s\S]*?)\n\}/g)].map(match => match[1]).join('\n');
    const tabBarRule = appSource.match(/\.mobile-tab-bar\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(mobileBlocks).toMatch(/\.wb-header,[\s\S]*?\.wb-bindings,[\s\S]*?\.wb-toolbar[\s\S]*?border-color:\s*transparent;/);
    expect(mobileBlocks).toMatch(/\.wb-header,[\s\S]*?\.wb-bindings,[\s\S]*?\.wb-toolbar[\s\S]*?box-shadow:\s*none;/);
    expect(mobileBlocks).toMatch(/\.tool-card,[\s\S]*?\.history-preview-card[\s\S]*?border-color:\s*transparent;/);
    expect(tabBarRule).toMatch(/padding-bottom:\s*env\(safe-area-inset-bottom,\s*0px\);/);
    expect(tabBarRule).toMatch(/height:\s*calc\(52px \+ env\(safe-area-inset-bottom,\s*0px\)\);/);
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
