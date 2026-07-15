# Worldbook Assistant Core Refactor Implementation Plan

**Goal:** Refactor the worldbook assistant into smaller, testable modules while preserving the current user-facing feature set and avoiding another modal/event/host-document patch spiral.

**Architecture:** Keep the current Vue UI and SillyTavern/TavernHelper integration, but extract stable domains from `src/worldbook_assistant_build/App.vue` into typed modules and composables. The refactor is intentionally incremental: first move pure types/constants/normalizers and tests, then composables for persistence/version/modals, then UI panels. The published bundle remains `dist/worldbook_assistant_build/index.js`.

**Tech Stack:** Vue 3 SFC, TypeScript, webpack, TavernHelper/SillyTavern globals, Python grep-style regression checks, `corepack pnpm build`.

## Global Constraints

- Preserve most existing features: browse/editor modes, worldbook load/save, history/time-machine, tags, cross-copy, global mode, AI chat, AI config, settings, version check, floor extraction, FAB/menu host integration.
- Do not rewrite the whole app in one pass; use small commits with behavior-preserving extraction.
- Do not add new runtime dependencies unless a task explicitly justifies it.
- Keep the published artifact path `dist/worldbook_assistant_build/index.js`.
- Do not include broad demo/example `dist/` build churn; only include the production bundle when publishing.
- Every extracted pure module must have an executable regression check before moving more code.
- Prefer host `SillyTavern.Popup` for future whole-screen modals instead of ad-hoc Teleport overlays unless a test proves Teleport is safe.
- `App.vue` should shrink from ~18k lines toward a shell/orchestrator; each task should reduce or quarantine one domain.

---

## Refactor Postmortem

The current implementation became low-value to patch because:

1. **Single-file gravity:** `App.vue` is ~18k lines and mixes template, styles, types, constants, persistence, network calls, AI prompts, worldbook mutations, keyboard/mobile interactions, and host integration. Small fixes require loading and reasoning about unrelated domains.
2. **Host boundary confusion:** The assistant renders inside a SillyTavern host document, sometimes through `window.parent`, sometimes through Vue roots. Modal fixes oscillated between inline, Teleport, and event shielding because ownership of the host document was not centralized.
3. **Scoped-style extraction trap:** Extracted components lost parent scoped CSS assumptions, then shared CSS and Teleport fixes were added reactively.
4. **No real unit boundary tests:** Existing checks are useful grep regressions but cannot validate data normalization or business logic independently. Most logic only runs inside the full bundle.
5. **Build churn risk:** Whole-project builds rewrite many unrelated `dist/` artifacts and source maps, making it easy to commit noise.
6. **Feature coupling:** AI config, AI chat, settings, version checks, tag extraction, and worldbook mutation all depend on the same giant state and helper functions.

The refactor therefore prioritizes **module boundaries and tests** before more UI extraction.

## Target File Structure

Create these modules under `src/worldbook_assistant_build/`:

- `domain/types.ts` — exported shared domain interfaces/types currently embedded in `App.vue`.
- `domain/constants.ts` — version constants, storage keys, limits, option labels, theme definitions.
- `domain/persistedState.ts` — pure persisted-state defaults and normalization helpers.
- `domain/version.ts` — semantic-version compare and import URL construction.
- `domain/worldbookEntry.ts` — pure entry clone/default/position/strategy helpers.
- `domain/aiConfig.ts` — pure AI config prompt/result parsing and config-change mapping.
- `domain/crossCopy.ts` — pure cross-copy status/diff helpers.
- `composables/usePersistedState.ts` — bridge from TavernHelper variable APIs to `domain/persistedState.ts`.
- `composables/useVersionInfo.ts` — runtime refs/actions for version checking/copying.
- `composables/useHostBridge.ts` — `window.parent`, host document, modal target, event shield decisions.
- `components/ModalHost.vue` or `host/modals.ts` — one modal abstraction for settings/AI config/tag review.
- `scripts/check-domain-modules.py` — static regression check ensuring domains stay extracted and `App.vue` does not re-grow the moved sections.
- Existing `scripts/check-settings-ai-modals.py` and `scripts/check-worldbook-version-feature.py` continue to run.

## Milestone 1: Pure Domain Extraction

### Task 1: Extract version constants and semver helpers

**Files:**
- Create: `src/worldbook_assistant_build/domain/version.ts`
- Modify: `src/worldbook_assistant_build/App.vue`
- Modify: `scripts/check-worldbook-version-feature.py`
- Test: `scripts/check-worldbook-version-feature.py`

**Interfaces:**
- Produces:
  - `APP_VERSION: string`
  - `VERSION_REPO_OWNER: string`
  - `VERSION_REPO_NAME: string`
  - `VERSION_BRANCH: string`
  - `VERSION_BUNDLE_PATH: string`
  - `normalizeVersionTag(value: string): string`
  - `compareSemver(left: string, right: string): number`
  - `buildVersionImportUrl(version?: string): string`
- Consumes: No new runtime dependency.

- [ ] **Step 1: Extend failing static test**

Modify `scripts/check-worldbook-version-feature.py` so it reads `src/worldbook_assistant_build/domain/version.ts` and fails unless `APP_VERSION`, `compareSemver`, and `buildVersionImportUrl` live there and `App.vue` imports them.

Run:
```bash
python3 scripts/check-worldbook-version-feature.py
```
Expected: FAIL because `domain/version.ts` does not exist.

- [ ] **Step 2: Create `domain/version.ts`**

Move the existing version constants and pure helper functions from `App.vue` into the new file. Keep exact URL behavior.

- [ ] **Step 3: Import helpers in `App.vue`**

Replace local declarations with:
```ts
import {
  APP_VERSION,
  VERSION_BRANCH,
  VERSION_REPO_OWNER,
  VERSION_REPO_NAME,
  VERSION_BUNDLE_PATH,
  normalizeVersionTag,
  compareSemver,
  buildVersionImportUrl,
} from './domain/version';
```

- [ ] **Step 4: Verify**

Run:
```bash
python3 scripts/check-worldbook-version-feature.py
python3 scripts/check-settings-ai-modals.py
git diff --check
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/worldbook_assistant_build/domain/version.ts src/worldbook_assistant_build/App.vue scripts/check-worldbook-version-feature.py
git commit -m "refactor: extract version helpers"
```

### Task 2: Extract theme definitions and UI constants

**Files:**
- Create: `src/worldbook_assistant_build/domain/uiConstants.ts`
- Modify: `src/worldbook_assistant_build/App.vue`
- Test: `scripts/check-domain-modules.py`

**Interfaces:**
- Produces:
  - `ThemeKey`
  - `THEMES`
  - `TAG_COLORS`
  - pane/layout constants used by UI and persistence normalization.

- [ ] **Step 1: Write failing static check**

Create `scripts/check-domain-modules.py` with assertions that `THEMES` and `TAG_COLORS` live in `domain/uiConstants.ts`, and that `App.vue` imports them.

Run:
```bash
python3 scripts/check-domain-modules.py
```
Expected: FAIL because the file is not extracted yet.

- [ ] **Step 2: Move theme/constant declarations**

Move `ThemeKey`, `THEMES`, `TAG_COLORS`, layout limits, animation constants, and option label arrays only if they are pure data.

- [ ] **Step 3: Verify**

Run:
```bash
python3 scripts/check-domain-modules.py
python3 scripts/check-settings-ai-modals.py
corepack pnpm build
```
Expected: PASS/build success with warnings only.

- [ ] **Step 4: Commit**

```bash
git add src/worldbook_assistant_build/domain/uiConstants.ts src/worldbook_assistant_build/App.vue scripts/check-domain-modules.py
git commit -m "refactor: extract ui constants"
```

### Task 3: Extract shared domain types

**Files:**
- Create: `src/worldbook_assistant_build/domain/types.ts`
- Modify: `src/worldbook_assistant_build/App.vue`
- Modify: modal/component prop imports if useful.
- Test: `scripts/check-domain-modules.py`

**Interfaces:**
- Produces exported interfaces for persisted state, AI chat/session, tag state, version info, cross-copy rows, history snapshots, imported payload, config changes.

- [ ] **Step 1: Extend static check**

Assert `interface PersistedState`, `interface AIApiConfig`, and `interface VersionInfo` are exported from `domain/types.ts` and no longer declared in `App.vue`.

- [ ] **Step 2: Move type declarations**

Move type/interface declarations that do not require local refs/functions. Use `import type` in `App.vue`.

- [ ] **Step 3: Verify**

Run:
```bash
python3 scripts/check-domain-modules.py
corepack pnpm build
```
Expected: PASS/build success.

- [ ] **Step 4: Commit**

```bash
git add src/worldbook_assistant_build/domain/types.ts src/worldbook_assistant_build/App.vue scripts/check-domain-modules.py
git commit -m "refactor: extract domain types"
```

### Task 4: Extract persisted-state defaults and normalization

**Files:**
- Create: `src/worldbook_assistant_build/domain/persistedState.ts`
- Modify: `src/worldbook_assistant_build/App.vue`
- Test: `scripts/check-domain-modules.py`

**Interfaces:**
- Produces:
  - `createDefaultPersistedState(): PersistedState`
  - `normalizePersistedState(raw: unknown): PersistedState`
  - supporting pure normalizers.
- Consumes: types/constants from Tasks 2-3.

- [ ] **Step 1: Add failing check**

Assert `createDefaultPersistedState` and `normalizePersistedState` live in `domain/persistedState.ts` and are imported by `App.vue`.

- [ ] **Step 2: Move pure normalization helpers**

Move `asRecord`, safe string/number helpers, default constructors, and normalization functions. Keep TavernHelper `getVariables/replaceVariables` in `App.vue` for now.

- [ ] **Step 3: Verify**

Run:
```bash
python3 scripts/check-domain-modules.py
corepack pnpm build
```
Expected: PASS/build success.

- [ ] **Step 4: Commit**

```bash
git add src/worldbook_assistant_build/domain/persistedState.ts src/worldbook_assistant_build/App.vue scripts/check-domain-modules.py
git commit -m "refactor: extract persisted state normalization"
```

## Milestone 2: Host and Modal Boundary

### Task 5: Centralize host document bridge

**Files:**
- Create: `src/worldbook_assistant_build/host/hostBridge.ts`
- Modify: `src/worldbook_assistant_build/index.ts`
- Modify: `src/worldbook_assistant_build/App.vue`
- Test: `scripts/check-settings-ai-modals.py`

**Interfaces:**
- Produces:
  - `getHostWindow(): Window`
  - `getHostDocument(): Document`
  - `stopHostPointerEvents(event: Event): void`
  - `resolveModalTarget(root: HTMLElement | null): HTMLElement | string`

- [ ] **Step 1: Extend failing modal check**

Assert host bridge exists and both `index.ts` and `App.vue` import from it instead of duplicating host document logic.

- [ ] **Step 2: Move host helpers**

Move duplicated `window.parent`/host document logic and event shield helpers into `hostBridge.ts`.

- [ ] **Step 3: Verify**

Run:
```bash
python3 scripts/check-settings-ai-modals.py
corepack pnpm build
```
Expected: PASS/build success.

- [ ] **Step 4: Commit**

```bash
git add src/worldbook_assistant_build/host/hostBridge.ts src/worldbook_assistant_build/index.ts src/worldbook_assistant_build/App.vue scripts/check-settings-ai-modals.py
git commit -m "refactor: centralize host bridge"
```

### Task 6: Replace ad-hoc modal transport with one modal host path

**Files:**
- Create: `src/worldbook_assistant_build/host/modalHost.ts`
- Modify: `src/worldbook_assistant_build/components/SettingsModal.vue`
- Modify: `src/worldbook_assistant_build/components/AIConfigModal.vue`
- Modify: `src/worldbook_assistant_build/App.vue`
- Test: `scripts/check-settings-ai-modals.py`

**Interfaces:**
- Produces a single modal target/event shielding contract. If `SillyTavern.Popup` is available and suitable, prefer it for future non-inline dialogs; otherwise keep Teleport but with centralized event shielding.

- [ ] **Step 1: Extend failing modal check**

Assert settings and AI config use the same exported shield helper / modal target contract instead of hand-coded duplicated modifiers.

- [ ] **Step 2: Implement modal host abstraction**

Start with minimal behavior-preserving wrapper: no visual redesign, just one place for target resolution and pointer shielding.

- [ ] **Step 3: Verify**

Run:
```bash
python3 scripts/check-settings-ai-modals.py
corepack pnpm build
```
Expected: PASS/build success.

- [ ] **Step 4: Commit**

```bash
git add src/worldbook_assistant_build/host/modalHost.ts src/worldbook_assistant_build/components/SettingsModal.vue src/worldbook_assistant_build/components/AIConfigModal.vue src/worldbook_assistant_build/App.vue scripts/check-settings-ai-modals.py
git commit -m "refactor: unify settings modal host"
```

## Milestone 3: Feature Composables

### Task 7: Extract version runtime composable

**Files:**
- Create: `src/worldbook_assistant_build/composables/useVersionInfo.ts`
- Modify: `src/worldbook_assistant_build/App.vue`
- Test: `scripts/check-worldbook-version-feature.py`

**Interfaces:**
- Produces `useVersionInfo()` returning `versionInfo`, `versionCheckLoading`, `versionCheckError`, `checkLatestVersion`, `copyVersionImportUrl`.

- [ ] **Step 1: Add failing check**
- [ ] **Step 2: Move runtime version refs/actions**
- [ ] **Step 3: Verify `python3 scripts/check-worldbook-version-feature.py && corepack pnpm build`**
- [ ] **Step 4: Commit `refactor: extract version composable`**

### Task 8: Extract persisted-state composable

**Files:**
- Create: `src/worldbook_assistant_build/composables/usePersistedState.ts`
- Modify: `src/worldbook_assistant_build/App.vue`
- Test: `scripts/check-domain-modules.py`

**Interfaces:**
- Produces `usePersistedState()` with `persistedState`, `readPersistedState`, `writePersistedState`, `updatePersistedState`.

- [ ] **Step 1: Add failing check**
- [ ] **Step 2: Move TavernHelper variable bridge**
- [ ] **Step 3: Verify `python3 scripts/check-domain-modules.py && corepack pnpm build`**
- [ ] **Step 4: Commit `refactor: extract persisted state composable`**

### Task 9: Extract AI API/config pure logic

**Files:**
- Create: `src/worldbook_assistant_build/domain/aiConfig.ts`
- Modify: `src/worldbook_assistant_build/App.vue`
- Test: `scripts/check-domain-modules.py`

**Interfaces:**
- Produces pure helpers for config prompt construction, response JSON extraction, and config-change construction. Runtime generation remains in `App.vue` until the pure layer is extracted.

- [ ] **Step 1: Add failing check**
- [ ] **Step 2: Move pure helpers only**
- [ ] **Step 3: Verify `python3 scripts/check-domain-modules.py && corepack pnpm build`**
- [ ] **Step 4: Commit `refactor: extract ai config domain logic`**

### Task 10: Extract cross-copy pure helpers

**Files:**
- Create: `src/worldbook_assistant_build/domain/crossCopy.ts`
- Modify: `src/worldbook_assistant_build/App.vue`
- Test: `scripts/check-domain-modules.py`

**Interfaces:**
- Produces row-status, match-summary, and text/field diff helpers used by the existing cross-copy UI.

- [ ] **Step 1: Add failing check**
- [ ] **Step 2: Move pure helpers only**
- [ ] **Step 3: Verify `python3 scripts/check-domain-modules.py && corepack pnpm build`**
- [ ] **Step 4: Commit `refactor: extract cross-copy helpers`**

## Milestone 4: UI Shell Reduction

### Task 11: Extract mobile shell component

**Files:**
- Create: `src/worldbook_assistant_build/components/MobileShell.vue`
- Modify: `src/worldbook_assistant_build/App.vue`
- Test: build + static line-count check.

**Interfaces:**
- Produces a presentational shell receiving existing state/handlers as props/emits. No data ownership moves in this task.

- [ ] **Step 1: Add check that `MobileShell.vue` exists and `App.vue` line count decreases**
- [ ] **Step 2: Move mobile-only template block**
- [ ] **Step 3: Verify `corepack pnpm build`**
- [ ] **Step 4: Commit `refactor: extract mobile shell`**

### Task 12: Extract desktop editor shell component

**Files:**
- Create: `src/worldbook_assistant_build/components/DesktopEditorShell.vue`
- Modify: `src/worldbook_assistant_build/App.vue`
- Test: build + static line-count check.

**Interfaces:**
- Presentational extraction only. No behavior redesign.

- [ ] **Step 1: Add check**
- [ ] **Step 2: Move desktop editor template block**
- [ ] **Step 3: Verify `corepack pnpm build`**
- [ ] **Step 4: Commit `refactor: extract desktop editor shell`**

## Final Verification

- [ ] Run:
```bash
python3 scripts/check-domain-modules.py
python3 scripts/check-settings-ai-modals.py
python3 scripts/check-worldbook-version-feature.py
corepack pnpm build
git diff --check
```
- [ ] Restore unrelated generated artifacts, keep only intended source/test changes and the production bundle if publishing.
- [ ] Run final code review.
- [ ] Decide whether to tag/publish a new fixed version after manual smoke testing in SillyTavern.
