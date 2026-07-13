export type PerformanceMetricName =
  | 'open-settings'
  | 'open-ai-config'
  | 'return-main';

export interface PerformanceSnapshot {
  metrics: Record<PerformanceMetricName, { count: number; latestMs: number; maxMs: number }>;
  resources: Record<string, number>;
  mainWorkspaceMounts: number;
  utilityPageMounts: Record<'settings' | 'ai-config', number>;
}

interface PerformanceDiagnosticsOptions {
  now?: () => number;
}

const METRIC_NAMES: PerformanceMetricName[] = ['open-settings', 'open-ai-config', 'return-main'];

function emptyMetrics(): PerformanceSnapshot['metrics'] {
  return {
    'open-settings': { count: 0, latestMs: 0, maxMs: 0 },
    'open-ai-config': { count: 0, latestMs: 0, maxMs: 0 },
    'return-main': { count: 0, latestMs: 0, maxMs: 0 },
  };
}

function emptySnapshot(): PerformanceSnapshot {
  return {
    metrics: emptyMetrics(),
    resources: {},
    mainWorkspaceMounts: 0,
    utilityPageMounts: { settings: 0, 'ai-config': 0 },
  };
}

export function createPerformanceDiagnostics(enabled: boolean, options?: PerformanceDiagnosticsOptions): {
  start(name: PerformanceMetricName): () => number;
  setResourceCount(name: string, count: number): void;
  incrementMount(name: 'main' | 'settings' | 'ai-config'): void;
  snapshot(): PerformanceSnapshot;
  reset(): void;
} {
  if (!enabled) {
    return {
      start: () => () => 0,
      setResourceCount: () => {},
      incrementMount: () => {},
      snapshot: emptySnapshot,
      reset: () => {},
    };
  }

  const now = options?.now ?? (() => performance.now());
  let state = emptySnapshot();

  return {
    start(name) {
      const startedAt = now();
      let finished = false;
      let duration = 0;
      return () => {
        if (finished) {
          return duration;
        }
        finished = true;
        duration = Math.max(0, now() - startedAt);
        const metric = state.metrics[name];
        metric.count += 1;
        metric.latestMs = duration;
        metric.maxMs = Math.max(metric.maxMs, duration);
        return duration;
      };
    },
    setResourceCount(name, count) {
      state.resources[name] = count;
    },
    incrementMount(name) {
      if (name === 'main') {
        state.mainWorkspaceMounts += 1;
        return;
      }
      state.utilityPageMounts[name] += 1;
    },
    snapshot() {
      const metrics = emptyMetrics();
      for (const name of METRIC_NAMES) {
        metrics[name] = { ...state.metrics[name] };
      }
      return {
        metrics,
        resources: { ...state.resources },
        mainWorkspaceMounts: state.mainWorkspaceMounts,
        utilityPageMounts: { ...state.utilityPageMounts },
      };
    },
    reset() {
      state = emptySnapshot();
    },
  };
}
