import { describe, expect, it, vi } from 'vitest';

import { createPerformanceDiagnostics } from '../../../src/worldbook_assistant_build/domain/performanceDiagnostics';

const EMPTY_METRICS = {
  'open-settings': { count: 0, latestMs: 0, maxMs: 0 },
  'open-ai-config': { count: 0, latestMs: 0, maxMs: 0 },
  'return-main': { count: 0, latestMs: 0, maxMs: 0 },
};

describe('performanceDiagnostics', () => {
  it('is inert while disabled and retains no local state', () => {
    const now = vi.fn(() => 10);
    const diagnostics = createPerformanceDiagnostics(false, { now });

    const finish = diagnostics.start('open-settings');
    diagnostics.setResourceCount('navigation-frame', 1);
    diagnostics.incrementMount('main');
    diagnostics.incrementMount('settings');

    expect(finish()).toBe(0);
    expect(now).not.toHaveBeenCalled();
    expect(diagnostics.snapshot()).toEqual({
      metrics: EMPTY_METRICS,
      resources: {},
      mainWorkspaceMounts: 0,
      utilityPageMounts: { settings: 0, 'ai-config': 0 },
    });
  });

  it('records only bounded count, latest, and max timing aggregates with an injected clock', () => {
    const times = [5, 14, 20, 26];
    const diagnostics = createPerformanceDiagnostics(true, { now: () => times.shift() ?? 0 });

    expect(diagnostics.start('open-settings')()).toBe(9);
    expect(diagnostics.start('open-settings')()).toBe(6);

    expect(diagnostics.snapshot().metrics['open-settings']).toEqual({ count: 2, latestMs: 6, maxMs: 9 });
  });

  it('replaces resource counts and tracks bounded mount counters', () => {
    const diagnostics = createPerformanceDiagnostics(true, { now: () => 0 });

    diagnostics.setResourceCount('navigation-frame', 1);
    diagnostics.setResourceCount('navigation-frame', 0);
    diagnostics.incrementMount('main');
    diagnostics.incrementMount('settings');
    diagnostics.incrementMount('settings');
    diagnostics.incrementMount('ai-config');

    expect(diagnostics.snapshot()).toMatchObject({
      resources: { 'navigation-frame': 0 },
      mainWorkspaceMounts: 1,
      utilityPageMounts: { settings: 2, 'ai-config': 1 },
    });
  });

  it('returns detached snapshots and reset clears all state', () => {
    const diagnostics = createPerformanceDiagnostics(true, { now: () => 1 });
    diagnostics.start('return-main')();
    diagnostics.setResourceCount('listener', 2);
    diagnostics.incrementMount('main');

    const snapshot = diagnostics.snapshot();
    snapshot.resources.listener = 99;
    snapshot.metrics['return-main'].count = 99;
    diagnostics.reset();

    expect(diagnostics.snapshot()).toEqual({
      metrics: EMPTY_METRICS,
      resources: {},
      mainWorkspaceMounts: 0,
      utilityPageMounts: { settings: 0, 'ai-config': 0 },
    });
  });

  it('does not use network or global telemetry APIs', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const sendBeacon = vi.fn();
    Object.defineProperty(globalThis.navigator, 'sendBeacon', { configurable: true, value: sendBeacon });
    const diagnostics = createPerformanceDiagnostics(true, { now: () => 1 });

    diagnostics.start('open-ai-config')();
    diagnostics.setResourceCount('observer', 1);
    diagnostics.incrementMount('ai-config');
    diagnostics.snapshot();
    diagnostics.reset();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(sendBeacon).not.toHaveBeenCalled();
  });
});
