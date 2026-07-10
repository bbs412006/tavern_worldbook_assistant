# Worldbook Assistant Debug Diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-subagent-driven-development (recommended) or superpowers-executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a temporary `2.0.0-debug.1` build that renders real Vue, synchronous mount, window error, and unhandled Promise rejection details inside the otherwise-empty assistant panel.

**Architecture:** Add diagnostics only in `src/worldbook_assistant_build/index.ts`, where the panel body and Vue application are both available. A small renderer replaces the panel body with a readable debug report. Listeners are installed before mount and removed during cleanup. The debug work is released under a separate branch/tag and does not move the stable `2.0.0` tag.

**Tech Stack:** TypeScript, Vue 3, Webpack, Python structural regression checks, GitHub/jsDelivr.

## Global Constraints

- Display diagnostics directly inside `#wb-assistant-panel-body` for mobile screenshots.
- Capture Vue `app.config.errorHandler`, synchronous `app.mount()` errors, `window` error events, and `unhandledrejection`.
- Include diagnostic phase, message, stack, build commit, build time, URL, and user agent.
- Do not modify or force-move the stable `2.0.0` tag.
- Publish the temporary build as `2.0.0-debug.1`.

---

### Task 1: Add the diagnostic regression check

**Files:**
- Create: `scripts/check-worldbook-debug-diagnostics.py`

**Interfaces:**
- Consumes: `src/worldbook_assistant_build/index.ts`
- Produces: a deterministic source check for the four required error channels and in-panel renderer

- [ ] Write a structural check requiring `renderDebugDiagnostic`, `app.config.errorHandler`, `window error`, `unhandledrejection`, build metadata, and cleanup.
- [ ] Run it and confirm it fails because the diagnostic implementation is absent.
- [ ] Commit together with Task 2 after the implementation passes.

### Task 2: Implement in-panel diagnostics

**Files:**
- Modify: `src/worldbook_assistant_build/index.ts:410-424, cleanup section`

**Interfaces:**
- Produces: `renderDebugDiagnostic(phase: string, error: unknown, info?: string): void`
- Produces: `installDebugDiagnostics(): void`
- Produces: `removeDebugDiagnostics(): void`

- [ ] Add safe error normalization and HTML escaping.
- [ ] Render a high-contrast report into the panel body.
- [ ] Install `error` and `unhandledrejection` listeners before mounting Vue.
- [ ] Set `app.config.errorHandler` before `app.mount()`.
- [ ] Wrap `app.mount()` in `try/catch`, render, then rethrow for the console.
- [ ] Remove global listeners in cleanup.
- [ ] Run the structural check and existing project checks.

### Task 3: Build and release the debug artifact

**Files:**
- Modify generated: `dist/worldbook_assistant_build/index.js`

**Interfaces:**
- Produces tag: `2.0.0-debug.1`
- Produces CDN URL: `https://cdn.jsdelivr.net/gh/bbs412006/tavern_worldbook_assistant@2.0.0-debug.1/dist/worldbook_assistant_build/index.js`

- [ ] Build production output.
- [ ] Run `node --check`, structural checks, and `git diff --check`.
- [ ] Commit on a dedicated debug branch.
- [ ] Push branch and annotated tag `2.0.0-debug.1` without touching `2.0.0`.
- [ ] Purge jsDelivr and download the CDN artifact.
- [ ] Verify syntax and embedded diagnostic markers in the downloaded artifact.
