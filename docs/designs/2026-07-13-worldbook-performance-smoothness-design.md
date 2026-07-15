# Worldbook Assistant Response, Smoothness, and Memory Optimization Design

**Date:** 2026-07-13

**Status:** Approved

## 1. Goal

Improve the worldbook assistant's perceived response speed, interaction smoothness, and long-running memory behavior, with mobile App/WebView as the primary target.

The most visible problems are:

- A slight pause whenever entering or leaving Settings and AI Config.
- Less-than-smooth scrolling, text input, and control interaction inside utility pages.
- A need to prevent CPU work, temporary allocations, observers, listeners, or DOM nodes from accumulating during long sessions.

This optimization must preserve all existing behavior, persisted data, worldbook editing state, and AI configuration logic.

## 2. Confirmed Constraints

- Primary environment: mobile App/WebView.
- Optimize for a balance between response speed and memory usage.
- Settings and AI Config remain inline utility pages inside the assistant root.
- Do not restore Teleport, host-body overlays, or cross-document event handling.
- Do not change persisted-state or worldbook data formats.
- Do not change AI prompt construction, response parsing, preview, or application semantics.
- Do not sacrifice editor state, selection, scroll position, mobile tab, focus mode, or unsaved changes when navigating.
- Stable release tagging follows real-host confirmation; implementation version should advance according to semantic-versioning policy.

## 3. Root Cause Hypothesis

`App.vue` currently renders the utility pages and main workspace as an exclusive `v-if` / `v-else-if` / `v-else` chain. Entering Settings or AI Config therefore destroys the entire main workspace DOM and its component tree. Returning reconstructs that large tree, re-runs mounting logic, re-establishes observers/listeners, and causes layout/style work.

On a desktop browser this can be subtle. On a mobile WebView, reconstructing the large editor, panels, lists, and responsive layout creates a visible pause and short-lived allocation spike.

The design will validate this hypothesis with instrumentation rather than assuming it is the only cause.

## 4. Chosen Architecture: Retain the Workspace, Suspend Expensive Work

The main workspace will stay mounted and switch visibility rather than being destroyed during utility-page navigation. Utility pages will still mount only while active so their temporary DOM and state do not remain resident unnecessarily.

The main workspace will expose an explicit visibility/activity signal derived from:

```ts
const isMainWorkspaceActive = computed(() => utilityPage.value === 'main');
```

This signal will control work that only benefits a visible main workspace:

- Layout measurement and resize reactions.
- Mutation-driven UI synchronization.
- Animation and transition activity.
- Large derived view calculations where safe to defer.
- Repeated DOM reads/writes for hidden panels.
- Visibility-only timers and preview refreshes.

Business-critical work remains active:

- Persisted-state writes caused by an explicit user action.
- AI generation already in progress.
- Host data updates that must not be lost.
- Correct cleanup of in-flight async operations.

This provides the response benefit of keeping the large workspace alive without allowing hidden UI work to consume unlimited CPU.

## 5. Navigation and Rendering

### 5.1 Main Workspace

The main workspace wrapper will use visibility toggling instead of conditional destruction. When inactive it must:

- Be removed from layout and accessibility navigation.
- Not accept pointer or keyboard input.
- Preserve child component instances, DOM state, and scroll positions.
- Avoid display transitions that force long layout/paint work.

A semantic wrapper/class will make the active state testable without relying only on source-text inspection.

### 5.2 Utility Pages

Settings and AI Config remain conditionally mounted:

- Opening a utility page mounts only that page.
- Leaving a utility page destroys its DOM and temporary UI objects.
- AI input stored in `App.vue` remains available according to the existing navigation contract.
- The AI preview change array is retained only as long as required by the current workflow and is released when the user starts a new configuration flow or successfully completes/cancels the flow according to current semantics.

### 5.3 Frame Scheduling

Navigation state changes happen synchronously so the next frame can display the requested page. Non-critical work caused by the transition will be coalesced:

- DOM writes before reads where possible.
- One layout refresh per animation frame.
- Idle scheduling only for optional diagnostics or precomputation.
- No fixed-delay timeout used as a substitute for lifecycle correctness.

## 6. Activity Suspension

The implementation plan must inventory the existing runtime resources before changing them. Each item will be classified as:

1. **Always active:** required for data correctness.
2. **Main-visible only:** suspend while Settings or AI Config is active.
3. **Component-owned:** created and destroyed with its component.
4. **Session-owned:** created once and cleaned on assistant teardown.

The inventory includes:

- `ResizeObserver` and `MutationObserver` instances.
- `window`, `document`, host-window, and host-document listeners.
- Intervals, timeouts, animation frames, and idle callbacks.
- Watchers that read layout or rebuild large derived arrays.
- Transition/animation state.
- Cached worldbook or preview data.

Suspension must be explicit and reversible. Repeated navigation must not register duplicate resources.

## 7. Interaction Smoothness

### 7.1 Utility Page Forms

Settings and AI Config inputs should update only the minimal reactive state required by the interaction.

- Text input must not trigger full persisted-state cloning or unrelated list rebuilding on every keystroke.
- Settings actions continue using the existing parent-owned emit contracts.
- Stable DOM keys remain mandatory for preview rows and model options.
- Controls must not synchronously read layout after writing reactive state.

### 7.2 Scrolling and Visual Effects

Mobile WebView styling should avoid expensive effects in scrolling regions:

- Animate only `transform` and `opacity` when animation is useful.
- Avoid transitions on layout properties.
- Keep blur/backdrop-filter use bounded; glass mode remains available but should not layer multiple large blurred surfaces on utility pages.
- Utility page scroll containers retain `overscroll-behavior: contain`.
- Use touch-friendly targets and avoid unnecessary nested scroll containers.
- Honor `prefers-reduced-motion`.

### 7.3 Large Preview Tables

The existing AI preview remains horizontally scrollable. The first optimization pass will not introduce virtualization unless measurement shows preview size to be a material bottleneck. YAGNI applies: optimize measured costs, not hypothetical ones.

## 8. Memory Management

The optimization will enforce ownership and cleanup rather than targeting an arbitrary memory number that differs across WebViews.

Required invariants:

- Repeating main → Settings → main → AI Config → main does not increase registered listeners or observers.
- At most one pending animation-frame layout refresh exists per concern.
- Utility-page DOM is removed after exit.
- Main workspace DOM remains one stable instance across navigation.
- Temporary AI preview and model-list objects have explicit reset/replacement points.
- Assistant teardown removes all session-owned listeners, observers, timers, and scheduled callbacks.
- Async callbacks check lifecycle/activity before performing visibility-only DOM work.

## 9. Diagnostics and Measurement

Development-only or locally inspectable diagnostics will measure, without uploading telemetry:

- Time from button handler entry to utility-page DOM availability.
- Time from back action to restored main-workspace visibility.
- Long tasks or frame delays during repeated navigation where supported.
- Counts of owned observers, listeners, timers, and scheduled frames.
- Main workspace mount count.
- Utility page mount/unmount count.

Diagnostics must be lightweight and disabled or inert in normal production use unless explicitly enabled through the existing debug mechanism.

The measurements are acceptance evidence, not permanent analytics.

## 10. Tests

### 10.1 Structural Tests

Extend deterministic guards to require:

- Main workspace is retained instead of conditionally destroyed during utility navigation.
- Utility pages remain inside the assistant root.
- No Teleport, fixed host overlay, or modal host dependency returns.
- Activity gating exists for identified visibility-only resources.

### 10.2 Component and Integration Tests

Tests must mount real Vue components and cover:

- Main workspace component/DOM identity remains stable across Settings and AI Config round trips.
- Utility-page DOM mounts and unmounts correctly.
- Input, selection, and navigation state remain intact.
- Hidden main workspace does not accept focus/pointer interaction.
- Navigation scheduling does not create duplicate animation-frame callbacks.
- Repeated navigation leaves resource registry counts unchanged.
- Reduced-motion styles disable non-essential transitions.

### 10.3 Resource Lifecycle Tests

Observers, event listeners, timers, and frame scheduling should be accessed through small owned abstractions where necessary so tests can assert create, suspend, resume, and dispose behavior without mocking the entire browser.

### 10.4 Verification

Final verification includes:

```bash
COREPACK_HOME=/opt/data/.corepack corepack pnpm verify:worldbook
node --check dist/worldbook_assistant_build/index.js
git diff --check
```

The exact production bundle must contain the intended semantic version and pass syntax checking.

## 11. Real-Host Acceptance

Mobile App/WebView validation remains necessary because component tests cannot reproduce host CSS, touch dispatch, soft keyboard behavior, or WebView memory policy.

Acceptance flow:

1. Open Settings and return 20 times.
2. Open AI Config, enter text, preview/back where possible, and return 20 times.
3. Confirm no progressive slowdown.
4. Confirm main editor state and scroll position remain stable.
5. Confirm utility-page scrolling, typing, selects, and switches feel responsive.
6. Confirm no visible overlay, focus trap, or host-scroll regression.
7. Inspect available WebView memory/process diagnostics for sustained growth after the system settles.

## 12. Success Criteria

- Utility page skeleton is visible by the next rendered frame under normal mobile WebView load.
- Returning to main does not remount the main workspace tree.
- Twenty navigation round trips do not become progressively slower.
- Owned observer/listener/timer/frame counts return to their expected baseline.
- Utility-page scrolling, typing, and switches do not perform avoidable full-workspace work.
- Existing settings, AI configuration, editing, persistence, and version features remain unchanged.
- Full automated verification passes.
- Version advances according to semantic versioning; this performance-only compatible change is expected to be a patch release unless implementation introduces a user-visible feature or compatibility change.
- Stable tag is updated only after real mobile-host acceptance.