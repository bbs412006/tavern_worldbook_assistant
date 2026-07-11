# Worldbook Domain Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-subagent-driven-development (recommended) or superpowers-executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a Vitest unit-test foundation and cover the version, persisted-state helper, and worldbook import/sort domains with executable behavioral tests.

**Architecture:** Add Vitest as a development dependency with a Node-only configuration. Tests import the existing pure TypeScript modules directly, avoiding Vue and SillyTavern host globals. Integrate the domain suite into `verify:worldbook` before the production build.

**Tech Stack:** TypeScript, Vitest, pnpm, existing Webpack verification scripts.

## Global Constraints

- Do not change production behavior merely to satisfy tests.
- Test public exported behavior with real values and no mocks.
- Keep tests under `tests/worldbook_assistant_build/domain/`.
- `pnpm verify:worldbook` must run the domain unit suite.
- Keep the production artifact path unchanged.

---

### Task 1: Add the Vitest test runner

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `vitest.config.ts`
- Modify: `scripts/check-worldbook-build-hygiene.py`

**Interfaces:**
- Produces: `pnpm test:worldbook-domain`
- Produces: Vitest Node environment scoped to `tests/worldbook_assistant_build/domain/**/*.test.ts`.

- [ ] Extend the structural check to require the Vitest script, dependency, and config.
- [ ] Run the check and confirm it fails.
- [ ] Add Vitest and the minimal config.
- [ ] Run the structural check and confirm it passes.

### Task 2: Cover version behavior

**Files:**
- Create: `tests/worldbook_assistant_build/domain/version.test.ts`

**Interfaces:**
- Consumes: `normalizeVersionTag`, `compareSemver`, `buildVersionImportUrl`.

- [ ] Write tests for `v` prefix normalization, multi-digit semantic ordering, missing patch components, and pinned CDN URL generation.
- [ ] Run only the version test and confirm the suite executes successfully against existing behavior.

### Task 3: Cover persisted-state helper behavior

**Files:**
- Create: `tests/worldbook_assistant_build/domain/persistedState.test.ts`

**Interfaces:**
- Consumes: `asRecord`, `toStringSafe`, `toNumberSafe`, `clampNumber`, `parseNullableInteger`, `normalizeKeywordList`.

- [ ] Write tests for object detection, numeric fallback, integer clamping, regex parsing, invalid regex preservation, blank removal, and case-insensitive deduplication.
- [ ] Run only the persisted-state test and confirm success.

### Task 4: Cover worldbook import and sorting behavior

**Files:**
- Create: `tests/worldbook_assistant_build/domain/worldbook.test.ts`

**Interfaces:**
- Consumes: `collectRawEntries`, `parseImportedPayload`, `compareEntriesByPositionThenOrder`.

- [ ] Write tests for array imports, nested entry maps, filename/name fallback, malformed roots, missing entries, unknown-field preservation, and position/depth/order sorting.
- [ ] Run only the worldbook test and confirm success.

### Task 5: Integrate and verify

**Files:**
- Modify: `scripts/verify-worldbook-build.py`

**Interfaces:**
- `pnpm verify:worldbook` runs `pnpm test:worldbook-domain` before building.

- [ ] Extend the structural check to require unit-test execution in the verifier and confirm failure.
- [ ] Add the test command to the verifier.
- [ ] Run `pnpm test:worldbook-domain`.
- [ ] Run `pnpm verify:worldbook`.
- [ ] Restore verification-only bundle metadata churn.
- [ ] Inspect and commit only test infrastructure, tests, plan, and lockfile changes.
