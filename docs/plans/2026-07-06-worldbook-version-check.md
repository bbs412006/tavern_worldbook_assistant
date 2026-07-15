# Worldbook Version Check Implementation Plan

**Goal:** Add visible script version information and an update check inside the worldbook assistant settings modal.

**Architecture:** Maintain a manual semantic version constant in `App.vue`, inject build commit/branch from webpack, expose a small `VersionInfo` object to `SettingsModal`, and check GitHub latest branch commit on demand. Keep code in existing files for this small feature.

**Tech Stack:** Vue 3 SFC, TypeScript, webpack DefinePlugin, GitHub REST commits endpoint, pnpm/webpack build.

## Global Constraints

- Use manual app version plus build commit, not GitHub Releases.
- Must work from a jsDelivr/imported SillyTavern script bundle.
- Do not store GitHub credentials; latest check uses public GitHub API.
- Keep bundle single-chunk behavior unchanged.

---

### Task 1: Build metadata injection

**Files:**
- Modify: `webpack.config.ts`

**Interfaces:**
- Produces globals: `__WB_ASSISTANT_BUILD_COMMIT__`, `__WB_ASSISTANT_BUILD_BRANCH__`, `__WB_ASSISTANT_BUILD_TIME__`.

Steps:
- [ ] Add `execSync` import from `node:child_process`.
- [ ] Add helper `read_git_value(command, fallback)`.
- [ ] Add DefinePlugin entries for the three globals.
- [ ] Verify with `pnpm build`.

### Task 2: App version state and GitHub check

**Files:**
- Modify: `src/worldbook_assistant_build/App.vue`

**Interfaces:**
- Produces `versionInfo`, `versionCheckLoading`, `versionCheckError`, `checkLatestVersion()`, `copyVersionImportUrl()`.

Steps:
- [ ] Declare global build constants for TypeScript.
- [ ] Add `APP_VERSION = '0.2.0'` and repo constants.
- [ ] Add `VersionInfo` interface.
- [ ] Implement latest commit fetch from `https://api.github.com/repos/bbs412006/tavern_worldbook_assistant/commits/ST-Manager-STscript`.
- [ ] Implement copy fixed commit jsDelivr URL.
- [ ] Pass props/events into `SettingsModal`.
- [ ] Verify with assertion script and build.

### Task 3: Settings UI

**Files:**
- Modify: `src/worldbook_assistant_build/components/SettingsModal.vue`

**Interfaces:**
- Consumes version props and emits `check-latest-version`, `copy-version-import-url`.

Steps:
- [ ] Add a VersionInfo type in the component script.
- [ ] Add props for `versionInfo`, `versionCheckLoading`, `versionCheckError`.
- [ ] Add “版本与更新” card showing current version, current build, latest build, status.
- [ ] Add buttons for check and copy URL.
- [ ] Verify with assertion script and build.

### Task 4: Commit and merge

**Files:**
- Modify: source files above plus `dist/worldbook_assistant_build/index.js`.
- Add: this plan file.

Steps:
- [ ] Clean unrelated webpack build outputs and sourcemaps.
- [ ] Run `git diff --check`.
- [ ] Stage only task-relevant files.
- [ ] Commit, merge to `ST-Manager-STscript`, push.
