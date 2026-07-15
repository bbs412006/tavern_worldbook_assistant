# Inline Settings and AI Config Implementation Plan

**Goal:** Replace the broken cross-document settings and AI-config modals with inline utility pages inside the worldbook assistant while preserving every existing business action.

**Architecture:** `App.vue` owns a single `utilityPage` navigation state and all existing business state. `SettingsPage.vue` and `AIConfigPage.vue` are presentation components rendered inside the assistant root; they communicate only through props and emits and never use Teleport, fixed overlays, or the host document body.

**Tech Stack:** Vue 3 SFC, TypeScript, Vitest, Python structural regression checks, Webpack 5, pnpm.

## Global Constraints

- Preserve all existing settings fields, API actions, AI prompt generation, response parsing, preview selection, and apply behavior.
- Do not change persisted-state or worldbook data formats.
- Do not add new settings or AI capabilities.
- Settings and AI-config pages must render inside the assistant root and must not use `Teleport`, viewport-level fixed overlays, or cross-document event shielding.
- Returning to the main page must preserve draft entries, selection, mobile tab, focus mode, and entered AI-config text.
- AI-config preview back returns to input; generating state cannot navigate back.
- Do not move or create a stable release tag before real-host confirmation.
- Follow RED-GREEN TDD and commit each independently reviewable slice.

---

### Task 1: Guard the inline-page architecture

**Files:**
- Modify: `scripts/check-settings-ai-modals.py`
- Modify: `scripts/verify-worldbook-build.py`

**Interfaces:**
- Consumes: source text from `App.vue`, `SettingsPage.vue`, and `AIConfigPage.vue`.
- Produces: deterministic structural checks for inline pages and retained business contracts.

- [ ] Replace modal-specific positive assertions with checks requiring `SettingsPage.vue` and `AIConfigPage.vue` to exist, be imported and rendered by `App.vue`, and contain no `Teleport` or `ai-tag-review-overlay`.
- [ ] Require `App.vue` to declare `type UtilityPage = 'main' | 'settings' | 'ai-config'`, `utilityPage`, `openSettingsPage`, `openAiConfigPage`, and `closeUtilityPage`.
- [ ] Require all three settings entry points to call `openSettingsPage` and all three AI-config entry points to call `openAiConfigPage`.
- [ ] Require settings business markers: `set-fab-visible`, `toggle-floor-btns`, `update-persisted-state`, `update-api-config`, `load-model-list`, `check-latest-version`, and `copy-version-import-url`.
- [ ] Require AI-config markers: target worldbook, instruction input, custom prompt, generating state, preview table, select-all, select-none, and apply.
- [ ] Run `python3 scripts/check-settings-ai-modals.py` and confirm RED because the page components and navigation state do not exist.
- [ ] Commit the RED guard as `test: guard inline settings and ai config pages`.

### Task 2: Render settings as an inline utility page

**Files:**
- Create: `src/worldbook_assistant_build/components/SettingsPage.vue`
- Modify: `src/worldbook_assistant_build/App.vue`
- Test: `scripts/check-settings-ai-modals.py`

**Interfaces:**
- Consumes: the same settings props and business callbacks currently passed to `SettingsModal.vue`.
- Produces: `SettingsPage` emitting `back`, `set-fab-visible`, `toggle-floor-btns`, `update-persisted-state`, `set-tag-delete-parent-mode`, `set-theme`, `update-api-config`, `load-model-list`, `check-latest-version`, and `copy-version-import-url`.

- [ ] Create `SettingsPage.vue` by preserving the complete settings form, version section, and API section, replacing the modal wrapper with `.utility-page`, `.utility-page-header`, `.utility-page-back`, and `.utility-page-body`.
- [ ] Add scoped/responsive styles so the page fills the assistant content area, uses internal scrolling, and has no fixed positioning.
- [ ] Add `UtilityPage`, `utilityPage`, `openSettingsPage()`, and `closeUtilityPage()` to `App.vue`.
- [ ] Replace every `showApiSettings = true` entry point with `openSettingsPage`.
- [ ] Render `SettingsPage` ahead of the normal main content when `utilityPage === 'settings'`; wire existing state and callbacks without changing their implementation.
- [ ] Remove `showApiSettings`, the `SettingsModal` import/invocation, and settings-only teleport props after confirming no references remain.
- [ ] Run `python3 scripts/check-settings-ai-modals.py`; expect settings checks GREEN while AI page checks remain RED.
- [ ] Run `corepack pnpm test:worldbook-domain` and `corepack pnpm build:worldbook`.
- [ ] Restore build-metadata-only bundle churn and commit as `refactor: render settings as an inline page`.

### Task 3: Render AI configuration as an inline utility page

**Files:**
- Create: `src/worldbook_assistant_build/components/AIConfigPage.vue`
- Modify: `src/worldbook_assistant_build/App.vue`
- Delete: `src/worldbook_assistant_build/components/AIConfigModal.vue`
- Delete: `src/worldbook_assistant_build/components/SettingsModal.vue`
- Test: `scripts/check-settings-ai-modals.py`

**Interfaces:**
- Consumes: `worldbookNames`, `aiConfigTargetWorldbook`, `aiConfigInput`, `aiConfigCustomPrompt`, `aiConfigChanges`, `aiConfigPreview`, and `aiConfigGenerating`.
- Produces: `AIConfigPage` emitting `back`, `back-to-input`, `update:targetWorldbook`, `update:input`, `update:customPrompt`, `load-default-config-prompt`, `generate`, and `apply`.

- [ ] Create `AIConfigPage.vue` with input, generating, and preview sections from the existing modal, rendered as mutually exclusive inline stages.
- [ ] In input stage, wire `back`; in generating stage render no enabled back action; in preview stage wire `back-to-input`.
- [ ] Preserve the existing target selector, instruction textarea, custom-prompt controls, generation disable rules, preview rows, direct selection mutation, select-all, select-none, selected count, and apply disable rule.
- [ ] Rename `openAiConfigModal()` to `openAiConfigPage()` while preserving its existing reset and target-worldbook initialization before setting `utilityPage = 'ai-config'`.
- [ ] Replace every AI-config entry point with `openAiConfigPage` and render `AIConfigPage` when `utilityPage === 'ai-config'`.
- [ ] Implement preview back by setting `aiConfigPreview = false` without clearing input, target, prompt, or changes; implement input back with `closeUtilityPage()`.
- [ ] Remove the old modal invocations/imports. Remove `modalTeleportTarget`, `resolveModalTarget`, and modal host helpers only if repository-wide search proves they have no consumers.
- [ ] Run `python3 scripts/check-settings-ai-modals.py` and confirm all checks GREEN.
- [ ] Run `corepack pnpm test:worldbook-domain` and `corepack pnpm build:worldbook`.
- [ ] Restore metadata-only bundle churn and commit as `refactor: render ai config as an inline page`.

### Task 4: Add interaction regression coverage

**Files:**
- Create: `tests/worldbook_assistant_build/components/SettingsPage.test.ts`
- Create: `tests/worldbook_assistant_build/components/AIConfigPage.test.ts`
- Modify: `vitest.config.ts`
- Modify: `package.json`
- Modify: `scripts/verify-worldbook-build.py`

**Interfaces:**
- Consumes: public props and emitted-event contracts of both page components.
- Produces: component tests runnable through `pnpm test:worldbook-components` and included in `verify:worldbook`.

- [ ] Add the minimum Vue test dependencies needed for SFC mounting in the existing Vitest environment.
- [ ] Write SettingsPage tests that mount the real component, assert all major sections render, click back, toggle a setting, change API mode, and verify the corresponding emits.
- [ ] Run the settings test first and confirm RED before any test-only setup correction; then make the minimum Vitest configuration changes needed for GREEN.
- [ ] Write AIConfigPage tests covering input update emits, input back, generating feedback with no enabled back, preview back, select-all, select-none, and apply emit.
- [ ] Run the AI test first and confirm RED for missing/unhandled test setup, then make minimal changes and verify GREEN.
- [ ] Add `test:worldbook-components` and invoke it from `verify-worldbook-build.py` before the production build.
- [ ] Run both component suites, domain tests, and the structural check.
- [ ] Commit as `test: cover inline utility page interactions`.

### Task 5: Browser harness and complete verification

**Files:**
- Modify: `scripts/check-settings-ai-modals.py` only if runtime evidence exposes a missing deterministic assertion.
- Generated: `dist/worldbook_assistant_build/index.js`.

**Interfaces:**
- Consumes: complete inline-page implementation.
- Produces: verified production bundle and evidence that both buttons switch pages inside the assistant root.

- [ ] Run `corepack pnpm verify:worldbook` and confirm structural checks, domain tests, component tests, production build, and `node --check` all pass.
- [ ] Launch the existing local host/browser harness with the production bundle and click one settings entry and one AI-config entry.
- [ ] Verify each click changes the inline page inside the assistant root, no overlay is appended to a host body, settings controls accept input, AI-config input accepts text, preview navigation works, and returning restores the main page.
- [ ] Inspect browser console and require zero Vue or JavaScript exceptions from the interaction path.
- [ ] Restore metadata-only bundle churn. If the reviewed source change requires a production bundle update for branch users, rebuild once and stage only `dist/worldbook_assistant_build/index.js` with the source commits.
- [ ] Run `git diff --check`, inspect staged scope explicitly, and run the complete verification once more on the exact final tree.
- [ ] Commit any required deterministic harness or bundle update as `test: verify inline settings and ai config flow`.
- [ ] Do not create a release tag; push the feature branch or merge only after final review.
