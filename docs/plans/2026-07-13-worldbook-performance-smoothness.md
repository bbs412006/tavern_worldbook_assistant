# Worldbook Assistant Performance and Smoothness Implementation Plan

**Goal:** Make Settings/AI Config navigation and utility-page interaction feel immediate on mobile WebView while keeping resource counts and long-running memory stable.

**Architecture:** Keep the large main workspace mounted and visibility-toggle it while utility pages remain conditionally mounted. Add small activity/resource abstractions so visibility-only layout work can pause, resume, coalesce to one frame, and dispose deterministically without changing business-critical watchers or data flows.

**Tech Stack:** Vue 3 SFC, TypeScript, Vitest + jsdom + Vue Test Utils, Python structural guards, Webpack 5, pnpm.

## Global Constraints

- Primary target is mobile App/WebView.
- Balance response speed and memory usage; do not optimize one by unboundedly worsening the other.
- Preserve all existing settings, AI configuration, editor, persistence, selection, scroll, mobile-tab, focus-mode, and unsaved-state behavior.
- Do not restore Teleport, host-body overlays, cross-document modal routing, or persisted-data format changes.
- Keep business-critical host/data updates active while utility pages are open.
- Pause only work proven to be visibility-only; every suspended resource must resume and dispose deterministically.
- Utility pages remain conditionally mounted and are removed after exit; the main workspace remains one stable instance.
- Do not introduce list virtualization unless measurements prove it necessary.
- Follow strict RED-GREEN-REFACTOR TDD and commit each reviewable slice.
- Expected compatible performance release version is `2.1.1`; do not move the stable tag until real mobile-host acceptance.

---

## File Map

- `src/worldbook_assistant_build/App.vue`: navigation visibility, main-workspace activity signal, and integration with existing UI resources.
- `src/worldbook_assistant_build/composables/useCoalescedFrame.ts`: one-pending-frame scheduler with cancel/dispose semantics.
- `src/worldbook_assistant_build/composables/useVisibilityActivity.ts`: visibility-owned suspend/resume/dispose lifecycle for layout/UI resources.
- `src/worldbook_assistant_build/domain/performanceDiagnostics.ts`: inert-by-default local timing and resource-count diagnostics.
- `tests/worldbook_assistant_build/components/AppUtilityNavigation.test.ts`: real `App.vue` navigation identity/activity regression coverage with host dependencies stubbed at boundaries.
- `tests/worldbook_assistant_build/composables/useCoalescedFrame.test.ts`: scheduler lifecycle tests.
- `tests/worldbook_assistant_build/composables/useVisibilityActivity.test.ts`: create/suspend/resume/dispose resource tests.
- `tests/worldbook_assistant_build/domain/performanceDiagnostics.test.ts`: timing/count behavior without telemetry.
- `tests/worldbook_assistant_build/components/UtilityPageMotion.test.ts`: reduced-motion and mobile scroll/style contracts.
- `scripts/check-worldbook-performance.py`: deterministic architecture guard.
- `scripts/verify-worldbook-build.py`: include performance guard and all new tests.
- `src/worldbook_assistant_build/domain/version.ts`: patch version bump to `2.1.1` after implementation is green.
- `dist/worldbook_assistant_build/index.js`: reviewed production bundle for `2.1.1`.

---

### Task 1: Guard the retained-workspace architecture

**Files:**
- Create: `scripts/check-worldbook-performance.py`
- Modify: `scripts/verify-worldbook-build.py`
- Test: `scripts/check-worldbook-performance.py`

**Interfaces:**
- Consumes: source text from `App.vue`, performance composables, diagnostics module, and utility-page styles.
- Produces: deterministic checks that fail before the performance architecture exists and run before tests/build in `verify:worldbook`.

- [ ] **Step 1: Write the RED structural guard**

Create checks requiring exact production markers:

```python
checks = {
    'app declares main workspace activity': 'isMainWorkspaceActive' in app,
    'main workspace is visibility retained': 'data-main-workspace' in app and 'v-show="isMainWorkspaceActive"' in app,
    'main workspace is not utility v-else branch': '<template v-else>' not in app_header,
    'utility pages remain conditionally mounted': "utilityPage === 'settings'" in app and "utilityPage === 'ai-config'" in app,
    'coalesced frame composable exists': coalesced_path.is_file(),
    'visibility activity composable exists': activity_path.is_file(),
    'performance diagnostics exists': diagnostics_path.is_file(),
    'utility pages avoid teleport and fixed overlay': forbidden_tokens_absent,
    'reduced motion contract exists': 'prefers-reduced-motion: reduce' in utility_styles,
}
```

The script must print one `PASS`/`FAIL` line per check and exit `1` if any fail.

- [ ] **Step 2: Run the guard and verify RED**

Run:

```bash
python3 scripts/check-worldbook-performance.py
```

Expected: nonzero exit with failures for retained workspace, activity composables, diagnostics, and reduced-motion contract.

- [ ] **Step 3: Add the guard to verification**

Add `scripts/check-worldbook-performance.py` to the structural check list in `scripts/verify-worldbook-build.py`, after the inline-page guard and before test/build execution.

- [ ] **Step 4: Commit the RED guard**

```bash
git add scripts/check-worldbook-performance.py scripts/verify-worldbook-build.py
git diff --cached --check
git commit -m "test: guard worldbook performance lifecycle"
```

---

### Task 2: Add a one-frame coalescing scheduler

**Files:**
- Create: `src/worldbook_assistant_build/composables/useCoalescedFrame.ts`
- Create: `tests/worldbook_assistant_build/composables/useCoalescedFrame.test.ts`

**Interfaces:**
- Produces:

```ts
export interface CoalescedFrame {
  schedule(task: () => void): void;
  cancel(): void;
  dispose(): void;
  readonly pending: Readonly<Ref<boolean>>;
}

export function useCoalescedFrame(options?: {
  request?: typeof requestAnimationFrame;
  cancel?: typeof cancelAnimationFrame;
}): CoalescedFrame;
```

- [ ] **Step 1: Write failing scheduler tests**

Cover:

```ts
it('runs only the latest task once in the next frame');
it('cancels a pending frame');
it('does not schedule after dispose');
it('clears pending before invoking the task so the task may reschedule');
```

Use an injected fake `request`/`cancel` queue rather than global timer mocks.

- [ ] **Step 2: Run tests and verify RED**

```bash
corepack pnpm vitest run --config vitest.config.ts tests/worldbook_assistant_build/composables/useCoalescedFrame.test.ts
```

Expected: module-not-found failure for `useCoalescedFrame`.

- [ ] **Step 3: Implement the minimal scheduler**

Implement one stored frame id, one latest task, and a disposed flag. `schedule()` replaces the pending task without requesting another frame; `cancel()` clears frame and task; `dispose()` cancels and permanently prevents scheduling.

- [ ] **Step 4: Run GREEN verification**

Run the focused test and then all component/composable tests:

```bash
corepack pnpm vitest run --config vitest.config.ts tests/worldbook_assistant_build/composables/useCoalescedFrame.test.ts
corepack pnpm test:worldbook-components
```

Expected: all pass with no uncaught errors.

- [ ] **Step 5: Commit**

```bash
git add src/worldbook_assistant_build/composables/useCoalescedFrame.ts tests/worldbook_assistant_build/composables/useCoalescedFrame.test.ts
git diff --cached --check
git commit -m "perf: coalesce worldbook frame work"
```

---

### Task 3: Add visibility-owned resource lifecycle

**Files:**
- Create: `src/worldbook_assistant_build/composables/useVisibilityActivity.ts`
- Create: `tests/worldbook_assistant_build/composables/useVisibilityActivity.test.ts`

**Interfaces:**
- Consumes: `MaybeRefOrGetter<boolean>` activity state.
- Produces:

```ts
export interface VisibilityResource {
  resume(): void;
  suspend(): void;
  dispose(): void;
}

export function useVisibilityActivity(
  active: MaybeRefOrGetter<boolean>,
  create: () => VisibilityResource,
): {
  readonly resource: Readonly<ShallowRef<VisibilityResource | null>>;
  dispose(): void;
};
```

- [ ] **Step 1: Write failing lifecycle tests**

Cover real Vue refs/effect scope:

```ts
it('creates and resumes once when initially active');
it('suspends and resumes the same resource as visibility changes');
it('does not create duplicate resources across twenty cycles');
it('disposes once when the owning scope stops');
it('does not resume after manual dispose');
```

- [ ] **Step 2: Verify RED**

Run the focused test and require module-not-found failure.

- [ ] **Step 3: Implement minimal lifecycle control**

Use a synchronous watcher inside the current scope. Lazily create on first activation, call `suspend()` on inactive transitions, and register `onScopeDispose(dispose)`.

- [ ] **Step 4: Verify GREEN**

Run focused tests and all component/composable tests.

- [ ] **Step 5: Commit**

```bash
git add src/worldbook_assistant_build/composables/useVisibilityActivity.ts tests/worldbook_assistant_build/composables/useVisibilityActivity.test.ts
git commit -m "perf: own visibility resource lifecycle"
```

---

### Task 4: Retain the main workspace across utility navigation

**Files:**
- Modify: `src/worldbook_assistant_build/App.vue`
- Create: `tests/worldbook_assistant_build/components/AppUtilityNavigation.test.ts`
- Modify: `tests/worldbook_assistant_build/components/InlineUtilityFlow.test.ts`
- Test: `scripts/check-worldbook-performance.py`

**Interfaces:**
- Produces:

```ts
const isMainWorkspaceActive = computed(() => utilityPage.value === 'main');
```

The main workspace root carries:

```html
<div
  v-show="isMainWorkspaceActive"
  data-main-workspace
  :aria-hidden="!isMainWorkspaceActive"
  :inert="!isMainWorkspaceActive"
>
```

- [ ] **Step 1: Write failing real-App navigation tests**

Mount `App.vue` with minimal boundary stubs for host APIs and heavy child components. Assert:

```ts
it('keeps the same main workspace element across settings and ai config round trips');
it('marks the hidden main workspace inert and aria-hidden');
it('mounts only the active utility page and removes it on return');
it('preserves selected editor/mobile state across round trips');
```

The identity assertion must keep the original `HTMLElement` and compare with the element after returning; do not reproduce navigation in a test-only parent.

- [ ] **Step 2: Run the focused tests and verify RED**

Expected: main workspace element disappears or is recreated because the current template uses the exclusive `v-else` branch.

- [ ] **Step 3: Change only the rendering boundary**

- Render Settings and AI Config as independent conditional siblings.
- Replace the main `<template v-else>` boundary with a semantic main-workspace wrapper using `v-show`.
- Add `isMainWorkspaceActive` computed state.
- Do not move editor state or business functions.
- Do not add animations yet.

- [ ] **Step 4: Verify GREEN and structural progress**

```bash
corepack pnpm vitest run --config vitest.config.ts tests/worldbook_assistant_build/components/AppUtilityNavigation.test.ts
python3 scripts/check-worldbook-performance.py
corepack pnpm test:worldbook-components
```

Expected: navigation identity tests pass; performance guard may still fail only for later diagnostics/activity/style tasks.

- [ ] **Step 5: Commit**

```bash
git add src/worldbook_assistant_build/App.vue tests/worldbook_assistant_build/components/AppUtilityNavigation.test.ts tests/worldbook_assistant_build/components/InlineUtilityFlow.test.ts
git commit -m "perf: retain main workspace during utility navigation"
```

---

### Task 5: Gate visibility-only layout and observer work

**Files:**
- Modify: `src/worldbook_assistant_build/App.vue`
- Modify as identified by inventory: `src/worldbook_assistant_build/composables/useCrossCopyResize.ts`
- Modify as identified by inventory: components/composables that own browse intersection, resize, or layout resources.
- Create: `tests/worldbook_assistant_build/components/WorkspaceActivity.test.ts`

**Interfaces:**
- Consumes: `isMainWorkspaceActive`, `useVisibilityActivity`, and `useCoalescedFrame`.
- Produces: resource wrappers whose `resume`, `suspend`, and `dispose` are idempotent.

- [ ] **Step 1: Record the concrete resource inventory in the task report**

Search source for:

```text
ResizeObserver
MutationObserver
IntersectionObserver
requestAnimationFrame
setInterval
addEventListener
```

For each resource touched by this task, record owner, creation site, cleanup site, and classification (`always active`, `main-visible only`, `component-owned`, `session-owned`). Do not gate data-correctness watchers merely because they are expensive.

- [ ] **Step 2: Write failing activity tests**

At minimum test the concrete main-visible resources selected from the inventory:

```ts
it('suspends browse intersection observation while utility pages are active');
it('stops active pane/history resize listeners when the main workspace hides');
it('coalesces repeated visible layout refresh requests into one frame');
it('returns listener and observer counts to baseline after twenty cycles');
```

Use injected factories or owned wrappers; do not globally monkey-patch every browser API.

- [ ] **Step 3: Verify RED**

Run `WorkspaceActivity.test.ts`; expected failure shows resources remain active or duplicate work is scheduled.

- [ ] **Step 4: Implement minimal activity gating**

- Wrap only proven visibility-only resources.
- Stop pointer-resize sessions immediately when main becomes inactive.
- Disconnect visibility-only observers on suspend; reconnect the same owned resource on resume.
- Route repeated layout refreshes through `useCoalescedFrame`.
- Guard deferred callbacks with `isMainWorkspaceActive.value` before DOM work.
- Preserve always-active persistence and host-data behavior.

- [ ] **Step 5: Verify GREEN and no regression**

```bash
corepack pnpm vitest run --config vitest.config.ts tests/worldbook_assistant_build/components/WorkspaceActivity.test.ts
corepack pnpm test:worldbook-components
corepack pnpm test:worldbook-domain
```

- [ ] **Step 6: Commit**

Stage only the inventory-backed source and test files, then:

```bash
git commit -m "perf: suspend hidden workspace ui work"
```

---

### Task 6: Optimize utility-page motion and scrolling cost

**Files:**
- Modify: `src/worldbook_assistant_build/components/SettingsPage.vue`
- Modify: `src/worldbook_assistant_build/components/AIConfigPage.vue`
- Create: `tests/worldbook_assistant_build/components/UtilityPageMotion.test.ts`

**Interfaces:**
- Produces semantic CSS classes and reduced-motion behavior; no business interface changes.

- [ ] **Step 1: Write failing style/DOM tests**

Require:

```ts
it('uses one internal scroll container per utility page');
it('does not apply transitions to layout properties');
it('disables non-essential transitions under prefers-reduced-motion');
it('keeps preview horizontal scrolling contained');
```

Inspect mounted DOM classes and compiled SFC style text where jsdom cannot compute media-query behavior.

- [ ] **Step 2: Verify RED**

Expected: no reduced-motion contract exists.

- [ ] **Step 3: Implement minimal CSS improvements**

- Add `@media (prefers-reduced-motion: reduce)` disabling non-essential transition/animation.
- Restrict any page entrance effect to opacity/transform and keep it short; omit it entirely if measurement indicates next-frame visibility is better without animation.
- Avoid new nested scroll containers.
- Avoid additional large `backdrop-filter` surfaces; preserve glass-mode capability through existing root styling.
- Add `content-visibility` only if tested on the actual target and it does not break retained scroll/focus state; otherwise omit.

- [ ] **Step 4: Verify GREEN**

Run focused tests, component suite, and performance guard.

- [ ] **Step 5: Commit**

```bash
git commit -m "perf: streamline utility page interactions"
```

---

### Task 7: Add inert local performance diagnostics

**Files:**
- Create: `src/worldbook_assistant_build/domain/performanceDiagnostics.ts`
- Create: `tests/worldbook_assistant_build/domain/performanceDiagnostics.test.ts`
- Modify: `src/worldbook_assistant_build/App.vue`

**Interfaces:**
- Produces:

```ts
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

export function createPerformanceDiagnostics(enabled: boolean): {
  start(name: PerformanceMetricName): () => number;
  setResourceCount(name: string, count: number): void;
  incrementMount(name: 'main' | 'settings' | 'ai-config'): void;
  snapshot(): PerformanceSnapshot;
  reset(): void;
};
```

- [ ] **Step 1: Write failing diagnostics tests**

Use injected or stubbed `performance.now` and assert:

- Disabled diagnostics are inert and retain no samples.
- Timing records count/latest/max only.
- Resource counts replace rather than append.
- Reset clears all local state.
- No network/global telemetry APIs are called.

- [ ] **Step 2: Verify RED**

Expected module-not-found failure.

- [ ] **Step 3: Implement diagnostics**

Keep bounded aggregates only—no unbounded sample arrays. Enable through the existing debug mechanism or a development-only constant. Expose a local snapshot through the existing debug surface only when enabled.

- [ ] **Step 4: Wire navigation measurement**

Start at button handler entry and complete after `nextTick` plus the coalesced next frame when the requested DOM is available. Do not block navigation on measurement.

- [ ] **Step 5: Verify GREEN**

Run focused domain tests, navigation tests, all domain/component tests, and performance guard.

- [ ] **Step 6: Commit**

```bash
git commit -m "perf: add local worldbook diagnostics"
```

---

### Task 8: Version, production bundle, and final verification

**Files:**
- Modify: `src/worldbook_assistant_build/domain/version.ts`
- Modify: `dist/worldbook_assistant_build/index.js`
- Modify only if a real gap is found: performance tests/guards.

**Interfaces:**
- Produces: source and bundle reporting version `2.1.1`.

- [ ] **Step 1: Verify the full source tree before versioning**

```bash
COREPACK_HOME=/opt/data/.corepack corepack pnpm verify:worldbook
```

Expected: structural checks, 33+ domain tests, all component/composable tests, production build, and bundle syntax check pass. Only the existing bundle-size warnings are acceptable.

- [ ] **Step 2: Perform repeat-navigation acceptance in the deterministic harness**

Run a test that performs at least 20 cycles and asserts:

- The main workspace element identity never changes.
- Utility page elements are removed after exit.
- Resource counts return to baseline.
- One concern never has more than one pending frame.
- Editor/input/navigation state remains stable.

- [ ] **Step 3: Bump version with a failing assertion first**

Add/update a version assertion expecting `2.1.1`, run it to observe RED against `2.1.0`, then change:

```ts
export const APP_VERSION = '2.1.1';
```

- [ ] **Step 4: Build and inspect the exact production artifact**

```bash
COREPACK_HOME=/opt/data/.corepack corepack pnpm verify:worldbook
node --check dist/worldbook_assistant_build/index.js
rg -o '2\.1\.1' dist/worldbook_assistant_build/index.js | head -1
git diff --check
```

Expected: all commands pass and the bundle contains `2.1.1`.

- [ ] **Step 5: Inspect staging scope and commit**

```bash
git add src/worldbook_assistant_build/domain/version.ts dist/worldbook_assistant_build/index.js
# Also stage only any final performance source/tests that were intentionally changed.
git diff --cached --check
git diff --cached --stat
git diff --cached --name-status
git commit -m "chore: bump worldbook assistant to 2.1.1"
```

- [ ] **Step 6: Final branch review and integration**

Run final whole-branch review against this design/spec. Fix Critical/Important findings and re-run full verification. Merge/push the branch only after approval.

- [ ] **Step 7: Real mobile-host acceptance before tag**

In the actual mobile App/WebView:

- Perform 20 Settings round trips.
- Perform 20 AI Config round trips, including typing and preview/back.
- Confirm no progressive slowdown, state loss, touch/scroll issue, focus trap, or sustained memory growth after settling.
- Only after that acceptance, create/push tag `2.1.1` and verify the pinned jsDelivr URL returns `200`, passes `node --check`, contains `2.1.1`, and matches the committed bundle checksum.

Do not create the stable tag from automated evidence alone.
