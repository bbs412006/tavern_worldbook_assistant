// @vitest-environment jsdom

import { effectScope, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import { useWorkspaceActivity } from '../../../src/worldbook_assistant_build/composables/useWorkspaceActivity';

function createFrameQueue() {
  let nextId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();
  return {
    request: vi.fn((callback: FrameRequestCallback) => {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    }),
    cancel: vi.fn((id: number) => {
      callbacks.delete(id);
    }),
    flush() {
      const queued = [...callbacks.entries()];
      callbacks.clear();
      queued.forEach(([, callback]) => callback(0));
    },
    get pendingCount() {
      return callbacks.size;
    },
  };
}

function createHarness(initiallyActive = true) {
  const active = ref(initiallyActive);
  const sentinel = document.createElement('div');
  let currentSentinel: Element | null = sentinel;
  const observed = new Set<Element>();
  const observe = vi.fn((element: Element) => observed.add(element));
  const disconnect = vi.fn(() => observed.clear());
  const observerFactory = vi.fn((callback: IntersectionObserverCallback) => ({
    callback,
    observer: { observe, disconnect } as unknown as IntersectionObserver,
  }));
  const listeners = new Set<EventListenerOrEventListenerObject>();
  const resizeTarget = {
    addEventListener: vi.fn((_type: string, listener: EventListenerOrEventListenerObject) => listeners.add(listener)),
    removeEventListener: vi.fn((_type: string, listener: EventListenerOrEventListenerObject) => listeners.delete(listener)),
    dispatchResize() {
      listeners.forEach(listener => {
        if (typeof listener === 'function') listener(new Event('resize'));
        else listener.handleEvent(new Event('resize'));
      });
    },
  };
  let currentResizeTarget: typeof resizeTarget | null = resizeTarget;
  const frames = createFrameQueue();
  const loadMore = vi.fn();
  const stopResizeSessions = vi.fn();
  const refreshLayout = vi.fn();
  let resourceCounts = {
    browseObserverActive: 0,
    resizeListenerActive: 0,
    workspaceFramePending: 0,
  };
  const scope = effectScope();
  let activity!: ReturnType<typeof useWorkspaceActivity>;

  scope.run(() => {
    activity = useWorkspaceActivity({
      active,
      getBrowseSentinel: () => currentSentinel,
      hasMoreBrowseEntries: () => true,
      loadMoreBrowseEntries: loadMore,
      createIntersectionObserver: (callback: IntersectionObserverCallback) => observerFactory(callback).observer,
      getResizeTarget: () => currentResizeTarget,
      stopResizeSessions,
      refreshLayout,
      requestFrame: frames.request,
      cancelFrame: frames.cancel,
      onResourceCountChange: counts => {
        resourceCounts = counts;
      },
    });
  });

  return {
    active,
    activity,
    sentinel,
    setSentinel(next: Element | null) {
      currentSentinel = next;
    },
    observed,
    observe,
    disconnect,
    observerFactory,
    resizeTarget,
    setResizeTarget(next: typeof resizeTarget | null) {
      currentResizeTarget = next;
    },
    listeners,
    frames,
    loadMore,
    stopResizeSessions,
    refreshLayout,
    get resourceCounts() {
      return resourceCounts;
    },
    scope,
  };
}

describe('workspace visibility activity', () => {
  it('suspends browse intersection observation while utility pages are active', () => {
    const harness = createHarness();

    expect(harness.observed.has(harness.sentinel)).toBe(true);
    harness.active.value = false;
    expect(harness.observed.size).toBe(0);

    harness.active.value = true;
    expect(harness.observed.has(harness.sentinel)).toBe(true);
    expect(harness.observerFactory).toHaveBeenCalledTimes(1);

    harness.scope.stop();
  });

  it('observes a browse sentinel attached after the activity resource starts', () => {
    const harness = createHarness(false);
    harness.setSentinel(null);

    harness.active.value = true;
    expect(harness.observed.size).toBe(0);
    expect(harness.observerFactory).not.toHaveBeenCalled();

    harness.setSentinel(harness.sentinel);
    harness.activity.refreshBrowseObservation();
    expect(harness.observed.has(harness.sentinel)).toBe(true);

    harness.scope.stop();
  });

  it('stops active pane and history resize listeners when the main workspace hides', () => {
    const harness = createHarness();

    harness.active.value = false;

    expect(harness.stopResizeSessions).toHaveBeenCalledTimes(1);
    expect(harness.listeners.size).toBe(0);
    harness.scope.stop();
  });

  it('waits for the mounted host resize target and binds it when refreshed', () => {
    const harness = createHarness(false);
    harness.setResizeTarget(null);

    harness.active.value = true;
    expect(harness.listeners.size).toBe(0);
    expect(harness.resizeTarget.addEventListener).not.toHaveBeenCalled();

    harness.setResizeTarget(harness.resizeTarget);
    harness.activity.refreshResizeTarget();
    expect(harness.listeners.size).toBe(1);
    expect(harness.resizeTarget.addEventListener).toHaveBeenCalledTimes(1);

    harness.scope.stop();
  });

  it('coalesces repeated visible layout refresh requests into one frame', () => {
    const harness = createHarness();

    harness.resizeTarget.dispatchResize();
    harness.resizeTarget.dispatchResize();
    harness.resizeTarget.dispatchResize();

    expect(harness.frames.pendingCount).toBe(1);
    expect(harness.refreshLayout).not.toHaveBeenCalled();
    harness.frames.flush();
    expect(harness.refreshLayout).toHaveBeenCalledTimes(1);

    harness.active.value = false;
    harness.resizeTarget.dispatchResize();
    expect(harness.frames.pendingCount).toBe(0);
    harness.scope.stop();
  });

  it('cancels an actually pending layout frame when the workspace hides', () => {
    const harness = createHarness();

    harness.resizeTarget.dispatchResize();
    expect(harness.frames.pendingCount).toBe(1);

    harness.active.value = false;

    expect(harness.frames.cancel).toHaveBeenCalledTimes(1);
    expect(harness.frames.pendingCount).toBe(0);
    harness.frames.flush();
    expect(harness.refreshLayout).not.toHaveBeenCalled();
    harness.scope.stop();
  });

  it('coalesces one layout refresh on resume without synchronous initial work', () => {
    const harness = createHarness();

    expect(harness.refreshLayout).not.toHaveBeenCalled();
    expect(harness.frames.pendingCount).toBe(0);

    harness.active.value = false;
    harness.active.value = true;

    expect(harness.refreshLayout).not.toHaveBeenCalled();
    expect(harness.frames.pendingCount).toBe(1);
    harness.frames.flush();
    expect(harness.refreshLayout).toHaveBeenCalledTimes(1);
    harness.scope.stop();
  });

  it('returns owned listener and observer counts to baseline after twenty cycles', () => {
    const harness = createHarness();

    for (let cycle = 0; cycle < 20; cycle += 1) {
      harness.active.value = false;
      expect(harness.listeners.size).toBe(0);
      expect(harness.observed.size).toBe(0);
      harness.active.value = true;
      expect(harness.listeners.size).toBe(1);
      expect(harness.observed.size).toBe(1);
    }

    expect(harness.observerFactory).toHaveBeenCalledTimes(1);
    expect(harness.resizeTarget.addEventListener).toHaveBeenCalledTimes(21);
    expect(harness.resizeTarget.removeEventListener).toHaveBeenCalledTimes(20);

    harness.scope.stop();
    expect(harness.listeners.size).toBe(0);
    expect(harness.observed.size).toBe(0);
  });

  it('reports current owned observer, resize listener, and pending frame counts on transitions', () => {
    const harness = createHarness();

    expect(harness.resourceCounts).toEqual({
      browseObserverActive: 1,
      resizeListenerActive: 1,
      workspaceFramePending: 0,
    });

    harness.resizeTarget.dispatchResize();
    expect(harness.resourceCounts.workspaceFramePending).toBe(1);
    harness.frames.flush();
    expect(harness.resourceCounts.workspaceFramePending).toBe(0);

    harness.active.value = false;
    expect(harness.resourceCounts).toEqual({
      browseObserverActive: 0,
      resizeListenerActive: 0,
      workspaceFramePending: 0,
    });

    harness.scope.stop();
  });
});
