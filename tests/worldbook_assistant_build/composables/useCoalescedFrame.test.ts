import { describe, expect, it, vi } from 'vitest';

import { useCoalescedFrame } from '../../../src/worldbook_assistant_build/composables/useCoalescedFrame';

function createFrameQueue() {
  let nextId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();
  const request = vi.fn((callback: FrameRequestCallback): number => {
    const id = nextId++;
    callbacks.set(id, callback);
    return id;
  });
  const cancel = vi.fn((id: number): void => {
    callbacks.delete(id);
  });

  return {
    request,
    cancel,
    flushNext(timestamp = 0): void {
      const next = callbacks.entries().next();
      if (next.done) {
        throw new Error('No pending frame');
      }
      const [id, callback] = next.value;
      callbacks.delete(id);
      callback(timestamp);
    },
    get size(): number {
      return callbacks.size;
    },
  };
}

describe('useCoalescedFrame', () => {
  it('runs only the latest task once in the next frame', () => {
    const frames = createFrameQueue();
    const scheduler = useCoalescedFrame({ request: frames.request, cancel: frames.cancel });
    const first = vi.fn();
    const latest = vi.fn();

    scheduler.schedule(first);
    scheduler.schedule(latest);

    expect(frames.request).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(1);
    expect(scheduler.pending.value).toBe(true);

    frames.flushNext();

    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledTimes(1);
    expect(scheduler.pending.value).toBe(false);
  });

  it('cancels a pending frame', () => {
    const frames = createFrameQueue();
    const scheduler = useCoalescedFrame({ request: frames.request, cancel: frames.cancel });
    const task = vi.fn();

    scheduler.schedule(task);
    scheduler.cancel();

    expect(frames.cancel).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
    expect(scheduler.pending.value).toBe(false);
    expect(task).not.toHaveBeenCalled();
  });

  it('does not schedule after dispose', () => {
    const frames = createFrameQueue();
    const scheduler = useCoalescedFrame({ request: frames.request, cancel: frames.cancel });
    const pendingTask = vi.fn();
    const laterTask = vi.fn();

    scheduler.schedule(pendingTask);
    scheduler.dispose();
    scheduler.schedule(laterTask);

    expect(frames.cancel).toHaveBeenCalledTimes(1);
    expect(frames.request).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
    expect(scheduler.pending.value).toBe(false);
    expect(pendingTask).not.toHaveBeenCalled();
    expect(laterTask).not.toHaveBeenCalled();
  });

  it('clears pending before invoking the task so the task may reschedule', () => {
    const frames = createFrameQueue();
    const scheduler = useCoalescedFrame({ request: frames.request, cancel: frames.cancel });
    const second = vi.fn();
    const first = vi.fn(() => {
      expect(scheduler.pending.value).toBe(false);
      scheduler.schedule(second);
    });

    scheduler.schedule(first);
    frames.flushNext();

    expect(first).toHaveBeenCalledTimes(1);
    expect(frames.request).toHaveBeenCalledTimes(2);
    expect(frames.size).toBe(1);
    expect(scheduler.pending.value).toBe(true);

    frames.flushNext();

    expect(second).toHaveBeenCalledTimes(1);
    expect(scheduler.pending.value).toBe(false);
  });
});
