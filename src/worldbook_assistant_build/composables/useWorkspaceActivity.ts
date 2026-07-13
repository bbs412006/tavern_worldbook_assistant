import { toValue, type MaybeRefOrGetter } from 'vue';
import { useCoalescedFrame } from './useCoalescedFrame';
import { useVisibilityActivity, type VisibilityResource } from './useVisibilityActivity';

interface ResizeEventTarget {
  addEventListener(type: 'resize', listener: EventListenerOrEventListenerObject): void;
  removeEventListener(type: 'resize', listener: EventListenerOrEventListenerObject): void;
}

export interface WorkspaceActivityOptions {
  active: MaybeRefOrGetter<boolean>;
  getBrowseSentinel: () => Element | null;
  hasMoreBrowseEntries: () => boolean;
  loadMoreBrowseEntries: () => void;
  createIntersectionObserver?: (callback: IntersectionObserverCallback) => IntersectionObserver;
  getResizeTarget: () => ResizeEventTarget | null;
  stopResizeSessions: () => void;
  refreshLayout: () => void;
  requestFrame?: typeof requestAnimationFrame;
  cancelFrame?: typeof cancelAnimationFrame;
  onResourceCountChange?: (counts: WorkspaceOwnedResourceCounts) => void;
}

export interface WorkspaceOwnedResourceCounts {
  browseObserverActive: number;
  resizeListenerActive: number;
  workspaceFramePending: number;
}

export function useWorkspaceActivity(options: WorkspaceActivityOptions) {
  const frame = useCoalescedFrame({ request: options.requestFrame, cancel: options.cancelFrame });
  const createObserver = options.createIntersectionObserver
    ?? (callback => new IntersectionObserver(callback, { rootMargin: '200px' }));
  const resourceCounts: WorkspaceOwnedResourceCounts = {
    browseObserverActive: 0,
    resizeListenerActive: 0,
    workspaceFramePending: 0,
  };
  const reportResourceCounts = () => options.onResourceCountChange?.({ ...resourceCounts });

  let refreshBrowseObservation = () => {};
  let refreshResizeTarget = () => {};
  const owner = useVisibilityActivity(options.active, (): VisibilityResource => {
    let observer: IntersectionObserver | null = null;
    let active = false;
    let hasResumed = false;
    let resizeTarget: ResizeEventTarget | null = null;

    refreshResizeTarget = () => {
      const nextTarget = active ? options.getResizeTarget() : null;
      if (nextTarget === resizeTarget) {
        return;
      }
      resizeTarget?.removeEventListener('resize', onResize);
      resizeTarget = nextTarget;
      resizeTarget?.addEventListener('resize', onResize);
      resourceCounts.resizeListenerActive = resizeTarget ? 1 : 0;
      reportResourceCounts();
    };

    refreshBrowseObservation = () => {
      observer?.disconnect();
      resourceCounts.browseObserverActive = 0;
      if (!active) {
        reportResourceCounts();
        return;
      }
      const sentinel = options.getBrowseSentinel();
      if (sentinel) {
        observer ??= createObserver(entries => {
          if (toValue(options.active) && entries[0]?.isIntersecting && options.hasMoreBrowseEntries()) {
            options.loadMoreBrowseEntries();
          }
        });
        observer.observe(sentinel);
        resourceCounts.browseObserverActive = 1;
      }
      reportResourceCounts();
    };

    const onResize = () => {
      if (!toValue(options.active)) {
        return;
      }
      frame.schedule(() => {
        resourceCounts.workspaceFramePending = 0;
        reportResourceCounts();
        if (toValue(options.active)) {
          options.refreshLayout();
        }
      });
      resourceCounts.workspaceFramePending = frame.pending.value ? 1 : 0;
      reportResourceCounts();
    };

    return {
      resume() {
        if (active) {
          refreshResizeTarget();
          return;
        }
        active = true;
        refreshBrowseObservation();
        refreshResizeTarget();
        if (hasResumed) {
          onResize();
        } else {
          hasResumed = true;
        }
      },
      suspend() {
        if (!active) {
          options.stopResizeSessions();
          return;
        }
        active = false;
        observer?.disconnect();
        resourceCounts.browseObserverActive = 0;
        refreshResizeTarget();
        frame.cancel();
        resourceCounts.workspaceFramePending = 0;
        reportResourceCounts();
        options.stopResizeSessions();
      },
      dispose() {
        active = false;
        observer?.disconnect();
        resourceCounts.browseObserverActive = 0;
        refreshResizeTarget();
        frame.dispose();
        resourceCounts.workspaceFramePending = 0;
        reportResourceCounts();
        options.stopResizeSessions();
      },
    };
  });

  return {
    refreshBrowseObservation: () => refreshBrowseObservation(),
    refreshResizeTarget: () => refreshResizeTarget(),
    dispose: owner.dispose,
  };
}
