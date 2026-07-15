# Worldbook Domain Tests Batch 2 Implementation Plan

**Goal:** Extend behavioral unit coverage to tag trees, cross-copy operations, AI configuration parsing, and AI tag extraction.

**Architecture:** Add four Node-only Vitest files that import existing pure domain modules directly. Tests use normalized real worldbook entries where needed and avoid host/Vue mocks. No production behavior changes are planned; any failing assertion must be resolved by aligning the test with documented existing behavior unless it reveals a clear defect.

**Tech Stack:** TypeScript, Vitest, existing worldbook domain helpers.

## Global Constraints

- Do not change production behavior without a demonstrated failing behavioral test.
- Test exported functions with real values and no mocks.
- Keep tests under `tests/worldbook_assistant_build/domain/`.
- Preserve the existing `pnpm test:worldbook-domain` and `pnpm verify:worldbook` commands.
- Restore generated bundle metadata churn after verification.

---

### Task 1: Test tag tree behavior

**Files:**
- Create: `tests/worldbook_assistant_build/domain/tags.test.ts`

**Interfaces:**
- Consumes: `normalizeTagNameKey`, `isTagDescendantOf`, `collectTagSubtreeIds`, `hasSiblingTagNameConflict`.

- [ ] Cover trimmed/case-insensitive name keys.
- [ ] Cover descendant traversal and cycle termination.
- [ ] Cover breadth-first subtree collection and cycle deduplication.
- [ ] Cover sibling-only conflicts and `excludeId` rename behavior.
- [ ] Run the tags test file.

### Task 2: Test cross-copy behavior

**Files:**
- Create: `tests/worldbook_assistant_build/domain/crossCopy.test.ts`

**Interfaces:**
- Consumes: normalization helpers, text/field diff helpers, unique naming, apply stats, summary formatting, and row application.

- [ ] Cover case-insensitive names and whitespace-normalized content.
- [ ] Cover changed/add/remove text diff counts and empty content.
- [ ] Cover field diff changed markers.
- [ ] Cover deterministic unique copy names.
- [ ] Cover create, rename-create, overwrite, and skip application while preserving overwrite UID.
- [ ] Run the cross-copy test file.

### Task 3: Test AI config behavior

**Files:**
- Create: `tests/worldbook_assistant_build/domain/aiConfig.test.ts`

**Interfaces:**
- Consumes: `buildConfigSystemPrompt`, `stripAiReasoningBlocks`, `cleanupJsonArrayText`, `extractJsonArray`.

- [ ] Cover custom prompt preference and forced default prompt.
- [ ] Cover deduplicated entry names in the default prompt.
- [ ] Cover reasoning/comment stripping and JSON cleanup.
- [ ] Cover last tagged payload, fenced JSON fallback, raw array fallback, and missing payload.
- [ ] Run the AI config test file.

### Task 4: Test AI tag behavior

**Files:**
- Create: `tests/worldbook_assistant_build/domain/aiTags.test.ts`

**Interfaces:**
- Consumes: extraction, content normalization, deduplication, existing-entry map, and duplicate marking.

- [ ] Cover normal extraction and ignored wrapper recursion.
- [ ] Cover whitespace normalization.
- [ ] Cover last tag-name wins plus duplicate content filtering.
- [ ] Cover exact duplicate deselection, updated entries, and new entries.
- [ ] Run the AI tags test file.

### Task 5: Verify and commit

- [ ] Run all domain tests.
- [ ] Run `pnpm verify:worldbook`.
- [ ] Restore `dist/worldbook_assistant_build/index.js` if only build metadata changed.
- [ ] Run `git diff --check` and inspect scope.
- [ ] Commit the four tests and this plan.
