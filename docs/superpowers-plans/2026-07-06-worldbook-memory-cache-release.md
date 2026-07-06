# Worldbook Memory Cache Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-subagent-driven-development (recommended) or superpowers-executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce runtime memory retained by heavyweight worldbook helper features after they are closed or no longer relevant.

**Architecture:** Keep the existing monolithic `App.vue` architecture for this low-risk pass. Add explicit cleanup functions and gate heavyweight history view construction behind modal visibility so large snapshot/diff structures are not held while the feature is closed.

**Tech Stack:** Vue 3 SFC, TypeScript, existing webpack/pnpm build.

## Global Constraints

- Do not change core `draftEntries` / `originalEntries` save semantics in this pass.
- Preserve existing UI behavior except clearing closed feature caches.
- Include only `dist/worldbook_assistant_build/index.js` as the required build artifact; ignore unrelated build outputs and source maps.

---

### Task 1: Release history modal state on close

**Files:**
- Modify: `src/worldbook_assistant_build/App.vue`

**Interfaces:**
- Produces: `closeEntryHistoryModal()` and `closeWorldbookHistoryModal()`.

- [ ] Replace direct `showEntryHistoryModal = false` and `showWorldbookHistoryModal = false` template close handlers with close functions.
- [ ] Add close functions that hide the modal, clear left/right IDs, clear active row, and stop resize listeners.
- [ ] Verify `pnpm build` succeeds.

### Task 2: Gate heavyweight history computed data

**Files:**
- Modify: `src/worldbook_assistant_build/App.vue`

**Interfaces:**
- Produces: `buildEntryVersionViews()` and `buildWorldbookVersionViews()` helpers.

- [ ] Move current `entryVersionViews` body into helper and return `[]` while modal is closed.
- [ ] Move current `worldbookVersionViews` body into helper and return `[]` while modal is closed.
- [ ] Use helpers from `openEntryHistoryModal()` and `openWorldbookHistoryModal()` so opening behavior remains unchanged.
- [ ] Verify `pnpm build` succeeds.

### Task 3: Release cross-copy caches on mode close and worldbook changes

**Files:**
- Modify: `src/worldbook_assistant_build/App.vue`

**Interfaces:**
- Uses existing `resetCrossCopyCompare(reason?: string)`.

- [ ] When cross-copy mode is disabled, clear rows, source baseline entries, target baseline entries, compare summary, diff modal, and mobile step.
- [ ] When selected worldbook changes, clear cross-copy compare cache because source/target baselines can now be stale.
- [ ] On component unmount, clear cross-copy and history caches.
- [ ] Verify `pnpm build` succeeds.

### Task 4: Commit and push

**Files:**
- Modify: `dist/worldbook_assistant_build/index.js`
- Modify: source files above

- [ ] Run `git diff --check`.
- [ ] Stage only task-relevant source files and `dist/worldbook_assistant_build/index.js`.
- [ ] Commit and push to `ST-Manager-STscript`.
