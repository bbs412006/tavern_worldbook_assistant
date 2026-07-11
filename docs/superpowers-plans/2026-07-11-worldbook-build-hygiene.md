# Worldbook Build Hygiene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-subagent-driven-development (recommended) or superpowers-executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dedicated worldbook-assistant build and verification commands that do not rewrite unrelated demo artifacts or leave source maps behind.

**Architecture:** Make webpack entry selection and production source-map generation configurable through environment variables. Add a small verification script that runs existing structural checks, builds only `src/worldbook_assistant_build/index.ts`, validates the generated bundle, removes source maps, and rejects unrelated `dist/` changes.

**Tech Stack:** TypeScript, Webpack 5, Node.js, Python regression checks, pnpm.

## Global Constraints

- Preserve the existing `pnpm build` full-project behavior except for explicit environment-controlled options.
- Keep the production artifact at `dist/worldbook_assistant_build/index.js`.
- Do not rewrite unrelated demo/example artifacts in `build:worldbook` or `verify:worldbook`.
- Do not retain generated `*.map` files from the dedicated production build.
- Reuse all existing structural regression checks.

---

### Task 1: Add webpack entry and source-map controls

**Files:**
- Modify: `webpack.config.ts`
- Create: `scripts/check-worldbook-build-hygiene.py`

**Interfaces:**
- Consumes: `WORLD_BOOK_ONLY=1`, `WORLD_BOOK_SOURCE_MAP=0`
- Produces: a webpack configuration array containing only `src/worldbook_assistant_build/index.ts` when requested, with production source maps disabled when requested.

- [ ] Write a failing structural test requiring the two environment controls.
- [ ] Run it and confirm failure.
- [ ] Add minimal webpack configuration support.
- [ ] Run the structural test and confirm success.

### Task 2: Add dedicated package commands and verifier

**Files:**
- Modify: `package.json`
- Create: `scripts/verify-worldbook-build.py`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `pnpm build:worldbook`
- Produces: `pnpm verify:worldbook`

- [ ] Extend the failing structural test to require both package commands and ignored source maps.
- [ ] Run it and confirm failure.
- [ ] Add `build:worldbook`, `verify:worldbook`, the verification runner, and `*.map` ignore rule.
- [ ] Run the structural test and confirm success.

### Task 3: Verify artifact isolation

**Files:**
- Generated: `dist/worldbook_assistant_build/index.js`

**Interfaces:**
- Consumes: all scripts from Tasks 1-2.
- Produces: a syntactically valid production bundle and no unrelated `dist/` changes.

- [ ] Run `pnpm verify:worldbook`.
- [ ] Confirm all structural checks pass.
- [ ] Confirm `node --check dist/worldbook_assistant_build/index.js` passes.
- [ ] Confirm no `*.map` remains.
- [ ] Confirm git status contains only intended source/config files and the target bundle if its bytes changed.
- [ ] Commit the focused change.
