import { readonly, ref, type Ref } from 'vue';

export interface CoalescedFrame {
  schedule(task: () => void): void;
  cancel(): void;
  dispose(): void;
  readonly pending: Readonly<Ref<boolean>>;
}

export function useCoalescedFrame(options?: {
  request?: typeof requestAnimationFrame;
  cancel?: typeof cancelAnimationFrame;
}): CoalescedFrame {
  const request = options?.request ?? requestAnimationFrame;
  const cancelFrame = options?.cancel ?? cancelAnimationFrame;
  const pending = ref(false);
  let frameId: number | null = null;
  let latestTask: (() => void) | null = null;
  let disposed = false;

  function schedule(task: () => void): void {
    if (disposed) {
      return;
    }
    latestTask = task;
    if (frameId !== null) {
      return;
    }
    pending.value = true;
    frameId = request(() => {
      const taskToRun = latestTask;
      frameId = null;
      latestTask = null;
      pending.value = false;
      taskToRun?.();
    });
  }

  function cancel(): void {
    if (frameId !== null) {
      cancelFrame(frameId);
    }
    frameId = null;
    latestTask = null;
    pending.value = false;
  }

  function dispose(): void {
    if (disposed) {
      return;
    }
    disposed = true;
    cancel();
  }

  return {
    schedule,
    cancel,
    dispose,
    pending: readonly(pending),
  };
}
