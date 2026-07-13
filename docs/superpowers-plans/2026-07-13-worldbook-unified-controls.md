# Worldbook Assistant Unified Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-subagent-driven-development (recommended) or superpowers-executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace inconsistent assistant-internal native controls with a tested, theme-aware control system, including fully custom searchable dropdown menus, while preserving all existing business behavior and mobile WebView compatibility.

**Architecture:** Add focused base-control Vue components under `components/controls/` and shared control tokens under the assistant root. Migrate business surfaces in small reviewed slices, keeping the current `.btn`/`.text-input` compatibility layer until the final cleanup. `BaseSelect` owns its menu, keyboard behavior, owner-document listeners, positioning, search state, and teardown without cross-document Teleport.

**Tech Stack:** Vue 3 SFCs, TypeScript, Vue Test Utils, Vitest/jsdom, existing VueUse/auto-import build boundary, webpack production bundle, Python structural guards.

## Global Constraints

- Cover all controls rendered inside the Worldbook Assistant Vue root.
- Do not modify the host magic-wand entry, host floating launcher, floor-extraction popup, or native SillyTavern controls.
- Preserve existing theme data and derive control tokens from existing theme variables.
- Do not change business event names, persistence formats, save timing, generation timing, or API behavior.
- Preserve string versus number model-value types.
- All assistant-internal dropdowns become custom menus; no cross-document Teleport.
- `searchable="auto"` enables search when option count is greater than 8.
- Menus and owner-document listeners exist only while open and must not accumulate over 20 cycles.
- Regular mobile controls target a minimum touch height around 40 px; compact toolbar controls may use `sm` sizing.
- Keep `.btn`, `.text-input`, `.text-area`, and `.toolbar-select` as compatibility styles until Task 8 cleanup.
- Use strict RED-GREEN-REFACTOR for every production behavior change.
- Restore verification-only `dist/worldbook_assistant_build/index.js` metadata churn unless the task explicitly versions the release artifact.
- Final application version is `2.2.0`; do not create a stable tag without the current real mobile-host acceptance policy or explicit user direction.

---

### Task 1: Add the control-system structural guard

**Files:**
- Create: `scripts/check-worldbook-unified-controls.py`
- Modify: `scripts/verify-worldbook-build.py`

**Interfaces:**
- Produces a deterministic RED-first guard with named checks for control tokens, six base components, committed control tests, and final native-select prohibition.
- Later tasks turn individual checks green; Task 8 turns the migration checks fully green.

- [ ] **Step 1: Write the structural guard**

Create `scripts/check-worldbook-unified-controls.py` with checks equivalent to:

```python
#!/usr/bin/env python3
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = root / 'src/worldbook_assistant_build'
controls = source / 'components/controls'
app = (source / 'App.vue').read_text(encoding='utf-8')
component_sources = '\n'.join(
    path.read_text(encoding='utf-8')
    for path in (source / 'components').rglob('*.vue')
    if 'components/controls/' not in path.as_posix()
)
assistant_sources = app + '\n' + component_sources

checks = {
    'control tokens exist': '--wb-control-height-md' in app and '--wb-control-focus-ring' in app,
    'base button exists': (controls / 'BaseButton.vue').is_file(),
    'base input exists': (controls / 'BaseInput.vue').is_file(),
    'base textarea exists': (controls / 'BaseTextarea.vue').is_file(),
    'base select exists': (controls / 'BaseSelect.vue').is_file(),
    'base checkbox exists': (controls / 'BaseCheckbox.vue').is_file(),
    'base switch exists': (controls / 'BaseSwitch.vue').is_file(),
    'base select has no teleport': '<Teleport' not in ((controls / 'BaseSelect.vue').read_text(encoding='utf-8') if (controls / 'BaseSelect.vue').is_file() else ''),
    'assistant pages avoid native select': '<select' not in assistant_sources,
    'control component tests exist': (root / 'tests/worldbook_assistant_build/components/controls/BaseSelect.test.ts').is_file(),
}

for name, ok in checks.items():
    print(('PASS' if ok else 'FAIL'), name)
if not all(checks.values()):
    raise SystemExit(1)
```

- [ ] **Step 2: Integrate the guard into normal verification**

In `scripts/verify-worldbook-build.py`, run it after the performance guard and before test suites:

```python
run(['python3', 'scripts/check-worldbook-unified-controls.py'])
```

- [ ] **Step 3: Verify intentional RED**

Run:

```bash
python3 scripts/check-worldbook-unified-controls.py
```

Expected: component/token/native-select checks fail, while the no-Teleport check may pass vacuously. Preserve the actual exit code as `1` and list each failed assertion.

- [ ] **Step 4: Verify unaffected suites**

Run:

```bash
COREPACK_HOME=/opt/data/.corepack corepack pnpm test:worldbook-domain
COREPACK_HOME=/opt/data/.corepack corepack pnpm test:worldbook-components
COREPACK_HOME=/opt/data/.corepack corepack pnpm test:worldbook-composables
COREPACK_HOME=/opt/data/.corepack corepack pnpm build:worldbook
node --check dist/worldbook_assistant_build/index.js
git restore --worktree dist/worldbook_assistant_build/index.js
git diff --check
```

Expected: existing tests/build pass; only the new full verifier path remains intentionally RED.

- [ ] **Step 5: Commit**

```bash
git add scripts/check-worldbook-unified-controls.py scripts/verify-worldbook-build.py
git diff --cached --check
git commit -m "test: guard unified worldbook controls"
```

---

### Task 2: Build shared tokens, buttons, text inputs, textareas, checkboxes, and switches

**Files:**
- Create: `src/worldbook_assistant_build/components/controls/BaseButton.vue`
- Create: `src/worldbook_assistant_build/components/controls/BaseInput.vue`
- Create: `src/worldbook_assistant_build/components/controls/BaseTextarea.vue`
- Create: `src/worldbook_assistant_build/components/controls/BaseCheckbox.vue`
- Create: `src/worldbook_assistant_build/components/controls/BaseSwitch.vue`
- Create: `tests/worldbook_assistant_build/components/controls/BaseButton.test.ts`
- Create: `tests/worldbook_assistant_build/components/controls/BaseInput.test.ts`
- Create: `tests/worldbook_assistant_build/components/controls/BaseCheckbox.test.ts`
- Modify: `src/worldbook_assistant_build/App.vue` control-token and compatibility-style sections

**Interfaces:**
- Produces `BaseButton`, `BaseInput`, `BaseTextarea`, `BaseCheckbox`, and `BaseSwitch` for every migration task.
- Shared model interfaces:

```ts
BaseButton: variant, size, loading, disabled, iconOnly, type
BaseInput: modelValue: string | number | null
BaseTextarea: modelValue: string
BaseCheckbox: modelValue: boolean, indeterminate?: boolean
BaseSwitch: modelValue: boolean
```

- [ ] **Step 1: Write failing button tests**

In `BaseButton.test.ts`, mount the real component and assert:

```ts
it('renders a native button and blocks click while loading', async () => {
  const wrapper = mount(BaseButton, { props: { loading: true }, slots: { default: '保存' } });
  expect(wrapper.element.tagName).toBe('BUTTON');
  expect(wrapper.attributes('aria-busy')).toBe('true');
  await wrapper.trigger('click');
  expect(wrapper.emitted('click')).toBeUndefined();
});

it('applies variant and size classes', () => {
  const wrapper = mount(BaseButton, { props: { variant: 'danger', size: 'sm' } });
  expect(wrapper.classes()).toContain('wb-control-button--danger');
  expect(wrapper.classes()).toContain('wb-control--sm');
});
```

Run the file and expect module-not-found RED.

- [ ] **Step 2: Implement `BaseButton.vue` minimally**

Use a native button and explicit click guard:

```vue
<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  iconOnly?: boolean;
  type?: 'button' | 'submit' | 'reset';
}>(), { variant: 'default', size: 'md', loading: false, disabled: false, iconOnly: false, type: 'button' });
const emit = defineEmits<{ click: [event: MouseEvent] }>();
function onClick(event: MouseEvent): void {
  if (props.disabled || props.loading) {
    event.preventDefault();
    return;
  }
  emit('click', event);
}
</script>

<template>
  <button
    class="wb-control wb-control-button"
    :class="[`wb-control--${size}`, `wb-control-button--${variant}`, { 'is-icon-only': iconOnly, 'is-loading': loading }]"
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    @click="onClick"
  >
    <span v-if="loading" class="wb-control-spinner" aria-hidden="true" />
    <slot />
  </button>
</template>
```

- [ ] **Step 3: Write failing input and textarea tests**

Assert value-type preservation and native attribute forwarding:

```ts
it('emits numeric model values as numbers for number inputs', async () => {
  const wrapper = mount(BaseInput, { props: { modelValue: 3, type: 'number' } });
  await wrapper.get('input').setValue('7');
  expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([7]);
});

it('preserves text values for normal inputs', async () => {
  const wrapper = mount(BaseInput, { props: { modelValue: 'old' } });
  await wrapper.get('input').setValue('new');
  expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['new']);
});
```

For `BaseTextarea`, assert string update and configured resize class.

- [ ] **Step 4: Implement `BaseInput.vue` and `BaseTextarea.vue`**

`BaseInput` must convert only `type="number"` values:

```ts
function onInput(event: Event): void {
  const raw = (event.target as HTMLInputElement).value;
  emit('update:modelValue', props.type === 'number' ? (raw === '' ? null : Number(raw)) : raw);
}
```

Use `inheritAttrs`/`v-bind="$attrs"` so placeholder, min, max, step, inputmode, autocomplete, and aria attributes reach the native element. `BaseTextarea` always emits strings and accepts `resize: 'none' | 'vertical' | 'both'`.

- [ ] **Step 5: Write failing checkbox and switch tests**

```ts
it('keeps a real checkbox and toggles through its label', async () => {
  const wrapper = mount(BaseCheckbox, { props: { modelValue: false }, slots: { default: '启用' } });
  expect(wrapper.get('input').attributes('type')).toBe('checkbox');
  await wrapper.get('label').trigger('click');
  expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true]);
});

it('uses switch semantics while retaining checkbox behavior', () => {
  const wrapper = mount(BaseSwitch, { props: { modelValue: true } });
  expect(wrapper.get('input').attributes('role')).toBe('switch');
  expect((wrapper.get('input').element as HTMLInputElement).checked).toBe(true);
});
```

- [ ] **Step 6: Implement checkbox and switch components**

Use real visually-hidden checkbox inputs, a styled indicator, and a label slot. Set indeterminate through a template ref/watch in `BaseCheckbox`. `BaseSwitch` uses `role="switch"` and emits booleans.

- [ ] **Step 7: Add shared control tokens and styles**

In the assistant root style section, add exact token mappings:

```css
.wb-assistant-root {
  --wb-control-height-sm: 28px;
  --wb-control-height-md: 36px;
  --wb-control-height-lg: 42px;
  --wb-control-radius: 8px;
  --wb-control-padding-x-sm: 9px;
  --wb-control-padding-x-md: 12px;
  --wb-control-padding-x-lg: 15px;
  --wb-control-bg: var(--wb-input-bg);
  --wb-control-bg-hover: var(--wb-input-bg-hover);
  --wb-control-bg-active: var(--wb-input-bg-focus);
  --wb-control-border: var(--wb-border-main);
  --wb-control-border-hover: var(--wb-primary-light);
  --wb-control-focus-ring: 0 0 0 2px color-mix(in srgb, var(--wb-primary) 34%, transparent);
  --wb-control-disabled-opacity: 0.5;
  --wb-control-menu-bg: var(--wb-dropdown-bg, var(--wb-bg-panel));
  --wb-control-menu-shadow: var(--wb-shadow-main);
  --wb-control-option-active: var(--wb-primary-hover);
  --wb-control-option-selected: var(--wb-primary-soft);
}
```

Define `.wb-control`, sizes, focus-visible, disabled, button variants, input surface, checkbox/switch indicators, spinner, and reduced-motion behavior. Preserve compatibility selectors but map them to the same tokens.

- [ ] **Step 8: Verify GREEN**

Run:

```bash
COREPACK_HOME=/opt/data/.corepack corepack pnpm vitest run --config vitest.config.ts tests/worldbook_assistant_build/components/controls
COREPACK_HOME=/opt/data/.corepack corepack pnpm test:worldbook-components
python3 scripts/check-worldbook-unified-controls.py
```

Expected: base components/token checks pass; select and migration checks remain intentionally RED.

- [ ] **Step 9: Commit**

```bash
git add src/worldbook_assistant_build/App.vue src/worldbook_assistant_build/components/controls tests/worldbook_assistant_build/components/controls
git diff --cached --check
git commit -m "feat: add worldbook base controls"
```

---

### Task 3: Build the custom searchable `BaseSelect`

**Files:**
- Create: `src/worldbook_assistant_build/components/controls/BaseSelect.vue`
- Create: `src/worldbook_assistant_build/components/controls/selectPosition.ts`
- Create: `tests/worldbook_assistant_build/components/controls/BaseSelect.test.ts`
- Create: `tests/worldbook_assistant_build/domain/selectPosition.test.ts`

**Interfaces:**
- Produces:

```ts
export interface BaseSelectOption<T extends string | number = string | number> {
  value: T;
  label: string;
  disabled?: boolean;
  keywords?: string[];
}

modelValue: string | number | null
options: BaseSelectOption[]
searchable: boolean | 'auto'
searchThreshold: number
clearable: boolean
disabled: boolean
size: 'sm' | 'md' | 'lg'
placeholder: string
```

- Produces pure `calculateSelectMenuPlacement(triggerRect, rootRect, viewportHeight, preferredMaxHeight)` for deterministic positioning tests.

- [ ] **Step 1: Write failing model/search tests**

Cover:

```ts
it('preserves numeric option values', async () => {
  const wrapper = mount(BaseSelect, {
    props: { modelValue: 1, options: [{ value: 1, label: '一' }, { value: 2, label: '二' }] },
    attachTo: document.body,
  });
  await wrapper.get('[role="combobox"]').trigger('click');
  await wrapper.get('[role="option"][data-value-key="number:2"]').trigger('click');
  expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([2]);
});

it('enables search automatically above eight options', async () => {
  const options = Array.from({ length: 9 }, (_, index) => ({ value: index, label: `选项 ${index}` }));
  const wrapper = mount(BaseSelect, { props: { modelValue: null, options, searchable: 'auto' }, attachTo: document.body });
  await wrapper.get('[role="combobox"]').trigger('click');
  expect(wrapper.find('input[type="search"]').exists()).toBe(true);
});
```

Expected RED: module missing.

- [ ] **Step 2: Write failing keyboard/accessibility tests**

Cover combobox/listbox connection, ArrowDown, disabled-option skipping, Home/End, Enter selection, Escape close without mutation, Tab close, and `aria-activedescendant`.

- [ ] **Step 3: Write failing owner-document and cleanup tests**

Mount into an iframe document and assert open-time listeners are added to `iframe.contentDocument`, then removed on close/unmount. Repeat 20 cycles and assert one menu maximum and listener counts return to baseline.

- [ ] **Step 4: Write failing placement tests**

In `selectPosition.test.ts`:

```ts
it('opens upward when downward space is insufficient', () => {
  const placement = calculateSelectMenuPlacement(
    { left: 20, right: 220, top: 650, bottom: 686, width: 200, height: 36 },
    { left: 0, right: 360, top: 0, bottom: 700, width: 360, height: 700 },
    700,
    280,
  );
  expect(placement.side).toBe('up');
  expect(placement.maxHeight).toBeLessThanOrEqual(280);
});
```

Also test horizontal clamping and width no smaller than trigger width.

- [ ] **Step 5: Implement the placement helper**

Return:

```ts
interface SelectMenuPlacement {
  side: 'up' | 'down';
  left: number;
  top: number;
  width: number;
  maxHeight: number;
}
```

Use assistant-root-relative coordinates, an 8 px boundary gap, and the larger available vertical side when neither side fits the preferred height.

- [ ] **Step 6: Implement `BaseSelect.vue` state and semantics**

Use refs for `open`, `query`, `activeIndex`, trigger/menu/search elements, and placement. Generate stable IDs once. Use a typed value key:

```ts
function optionKey(option: BaseSelectOption): string {
  return `${typeof option.value}:${String(option.value)}`;
}
```

Filter on lowercase label plus keywords. `searchable="auto"` means `options.length > searchThreshold` with default threshold `8`.

Render the menu only with `v-if="open"`. Do not render `<select>` and do not use Teleport.

- [ ] **Step 7: Implement keyboard and pointer ownership**

Attach owner-document `pointerdown` and `keydown` listeners only while open. Resolve owner document from `triggerRef.value?.ownerDocument`. Close and remove listeners on selection, Escape, Tab, outside pointer, disabled transition, and scope disposal.

Use a single coalesced frame for position recomputation on owner-window resize while open. Cancel it during close.

- [ ] **Step 8: Implement menu styles**

Use control tokens, `position: absolute`, `z-index` within the assistant root, contained touch scrolling, `box-sizing: border-box`, no backdrop blur, stable selected/active states, and reduced-motion-safe opacity/transform only if animation is retained.

- [ ] **Step 9: Verify GREEN**

Run:

```bash
COREPACK_HOME=/opt/data/.corepack corepack pnpm vitest run --config vitest.config.ts tests/worldbook_assistant_build/components/controls/BaseSelect.test.ts tests/worldbook_assistant_build/domain/selectPosition.test.ts
COREPACK_HOME=/opt/data/.corepack corepack pnpm test:worldbook-components
COREPACK_HOME=/opt/data/.corepack corepack pnpm test:worldbook-domain
python3 scripts/check-worldbook-unified-controls.py
```

Expected: all foundation checks pass; native-select migration remains RED.

- [ ] **Step 10: Commit**

```bash
git add src/worldbook_assistant_build/components/controls/BaseSelect.vue src/worldbook_assistant_build/components/controls/selectPosition.ts tests/worldbook_assistant_build/components/controls/BaseSelect.test.ts tests/worldbook_assistant_build/domain/selectPosition.test.ts
git diff --cached --check
git commit -m "feat: add searchable worldbook select"
```

---

### Task 4: Migrate Settings and AI Configuration controls

**Files:**
- Modify: `src/worldbook_assistant_build/components/SettingsPage.vue`
- Modify: `src/worldbook_assistant_build/components/AIConfigPage.vue`
- Modify: `tests/worldbook_assistant_build/components/SettingsPage.test.ts`
- Modify: `tests/worldbook_assistant_build/components/AIConfigPage.test.ts`
- Modify: `tests/worldbook_assistant_build/components/UtilityPageMotion.test.ts`

**Interfaces:**
- Consumes all base components from Tasks 2-3.
- Preserves every existing emit in both pages.
- Theme, delete strategy, sort mode, model selection, and target worldbook use `BaseSelect` options with original values.

- [ ] **Step 1: Add failing migration tests**

Assert both pages contain no native `select`, use real `BaseSelect`, and preserve existing emits. Representative assertions:

```ts
expect(wrapper.find('select').exists()).toBe(false);
await wrapper.getComponent(BaseSelect).vm.$emit('update:modelValue', 'paper');
expect(wrapper.emitted('set-theme')?.[0]).toEqual(['paper']);
```

For model selection, assert custom mode fallback input still emits the exact string. For AI target worldbook, assert the selected worldbook emit remains `update:targetWorldbook`.

- [ ] **Step 2: Migrate Settings controls**

Replace:

- All settings checkboxes with `BaseSwitch` or `BaseCheckbox` according to current presentation.
- The two API-mode radios with accessible `BaseButton` segmented choices or retained native radios wrapped by a unified radio control; do not represent mutually exclusive choices as independent switches.
- Delete strategy, sort mode, theme, and model list with `BaseSelect`.
- URL, key, token count, temperature, and custom model with `BaseInput`.
- Version and model-loading actions with `BaseButton`.

Build options in script with exact values and labels. For numeric API fields, handle `null` and preserve the existing fallback values (`4096` and `1`) at the emit boundary.

- [ ] **Step 3: Migrate AI Configuration controls**

Use `BaseButton`, `BaseTextarea`, `BaseSelect`, and `BaseCheckbox`. Preserve generate/apply/back behavior, generating-state back restriction, selected-change mutation, stable preview keys, and target-worldbook value type.

- [ ] **Step 4: Verify page layout and mobile interaction**

Extend tests to assert no horizontal clipping contract, internal scrolling, 40 px primary mobile buttons, custom menu containment, and reduced-motion media rules remain present.

- [ ] **Step 5: Run regression suites**

```bash
COREPACK_HOME=/opt/data/.corepack corepack pnpm vitest run --config vitest.config.ts tests/worldbook_assistant_build/components/SettingsPage.test.ts tests/worldbook_assistant_build/components/AIConfigPage.test.ts tests/worldbook_assistant_build/components/UtilityPageMotion.test.ts
COREPACK_HOME=/opt/data/.corepack corepack pnpm test:worldbook-components
python3 scripts/check-settings-ai-modals.py
```

- [ ] **Step 6: Commit**

```bash
git add src/worldbook_assistant_build/components/SettingsPage.vue src/worldbook_assistant_build/components/AIConfigPage.vue tests/worldbook_assistant_build/components/SettingsPage.test.ts tests/worldbook_assistant_build/components/AIConfigPage.test.ts tests/worldbook_assistant_build/components/UtilityPageMotion.test.ts
git diff --cached --check
git commit -m "refactor: unify utility page controls"
```

---

### Task 5: Migrate main toolbars and worldbook selectors

**Files:**
- Modify: `src/worldbook_assistant_build/components/WorldbookPicker.vue`
- Modify: `src/worldbook_assistant_build/components/BrowsePanel.vue`
- Modify: `src/worldbook_assistant_build/components/GlobalModePanel.vue`
- Modify: `src/worldbook_assistant_build/App.vue` main/focus/mobile toolbar template sections
- Create: `tests/worldbook_assistant_build/components/WorldbookPicker.test.ts`
- Modify: `tests/worldbook_assistant_build/components/AppUtilityNavigation.test.ts`

**Interfaces:**
- `WorldbookPicker` keeps existing props/emits and tag-filter behavior.
- All worldbook/preset/filter selects preserve string values.
- Compact toolbar actions use `BaseButton size="sm"`.

- [ ] **Step 1: Add failing picker tests**

Mount the real picker and verify:

- No native select exists.
- Worldbook menu uses custom listbox/search behavior.
- OR/AND and descendants/exact tag-filter values emit unchanged.
- Open/close 20 times leaves one or zero menu DOM and no document-listener growth.

- [ ] **Step 2: Migrate `WorldbookPicker.vue`**

Reuse `BaseSelect` rather than maintaining a second custom dropdown implementation. Preserve the existing selected worldbook label and tag-filter subpanel by either using a dedicated slot supported by `BaseSelect` or keeping the tag-filter panel adjacent to the select trigger; do not embed a second native select.

- [ ] **Step 3: Migrate `BrowsePanel.vue` and `GlobalModePanel.vue`**

Use base buttons/inputs/selects while preserving all current emits. Preset selection still applies immediately through the same event. Search fields retain per-keystroke local state only.

- [ ] **Step 4: Migrate representative App toolbars**

Replace main/focus/mobile toolbar native selects and ordinary buttons with base components. Explicitly include:

- Strategy selects.
- Position selects.
- Secondary-key logic.
- Position role.
- Tag-filter logic and match mode.
- Global preset selection.
- AI target worldbook.

Build option arrays in script/computed state instead of inline `<option>` blocks. Preserve inline value-mapping logic by moving it into named functions with tests where mapping is nontrivial.

- [ ] **Step 5: Extend real App regression tests**

Assert representative toolbar values survive Settings/AI round trips, numeric/string types remain unchanged, and no migrated toolbar renders native selects.

- [ ] **Step 6: Verify and commit**

```bash
COREPACK_HOME=/opt/data/.corepack corepack pnpm vitest run --config vitest.config.ts tests/worldbook_assistant_build/components/WorldbookPicker.test.ts tests/worldbook_assistant_build/components/AppUtilityNavigation.test.ts
COREPACK_HOME=/opt/data/.corepack corepack pnpm test:worldbook-components
COREPACK_HOME=/opt/data/.corepack corepack pnpm build:worldbook
node --check dist/worldbook_assistant_build/index.js
git restore --worktree dist/worldbook_assistant_build/index.js
git add src/worldbook_assistant_build/App.vue src/worldbook_assistant_build/components/WorldbookPicker.vue src/worldbook_assistant_build/components/BrowsePanel.vue src/worldbook_assistant_build/components/GlobalModePanel.vue tests/worldbook_assistant_build/components/WorldbookPicker.test.ts tests/worldbook_assistant_build/components/AppUtilityNavigation.test.ts
git diff --cached --check
git commit -m "refactor: unify worldbook toolbar controls"
```

---

### Task 6: Migrate editor, browse cards, and tag-management controls

**Files:**
- Modify: `src/worldbook_assistant_build/components/EditorPanel.vue`
- Modify: `src/worldbook_assistant_build/components/TagManager.vue`
- Modify: `src/worldbook_assistant_build/components/TagCreatePanel.vue`
- Modify: `src/worldbook_assistant_build/components/TagAssignmentPanel.vue`
- Modify: `src/worldbook_assistant_build/components/TagTreeItem.vue`
- Modify: `src/worldbook_assistant_build/components/TagColorPicker.vue`
- Modify: `src/worldbook_assistant_build/App.vue` duplicated mobile/desktop browse and editor sections
- Create: `tests/worldbook_assistant_build/components/EditorPanel.test.ts`
- Create: `tests/worldbook_assistant_build/components/TagControls.test.ts`

**Interfaces:**
- Preserve entry strategy/position/key logic value mappings.
- Preserve tag IDs as strings and all create/delete/assign emits.
- Color input remains an explicitly classified native color input behind the styled color-picker component.

- [ ] **Step 1: Add failing editor tests**

Verify name/content updates, strategy-pill selection, secondary logic, position and role values, disabled role state, and absence of native select in migrated editor surfaces.

- [ ] **Step 2: Migrate editor controls**

Use `BaseInput`, `BaseTextarea`, `BaseSelect`, `BaseButton`, and `BaseSwitch`. Strategy pills may use `BaseButton variant="ghost" size="sm"` with selected state classes and `aria-pressed`; do not convert them into dropdowns.

- [ ] **Step 3: Add failing tag-control tests**

Cover create input Enter behavior, parent selection, assignment target selection, checkbox selection, tree parent reassignment, delete action, and color picker accessibility.

- [ ] **Step 4: Migrate tag components**

Use base controls. Keep the native `input[type="color"]` only inside `TagColorPicker.vue`, style its trigger consistently, and add an explicit source comment marker:

```html
<!-- unified-control-exception: native color input required -->
```

The final guard will permit this classified exception.

- [ ] **Step 5: Migrate duplicated App browse/editor controls**

Replace remaining strategy, position, role, tag-filter, and AI target selects in the large App template. Extract repeated option arrays and mapping handlers; do not duplicate inline arrow-function conversion logic.

- [ ] **Step 6: Verify and commit**

```bash
COREPACK_HOME=/opt/data/.corepack corepack pnpm vitest run --config vitest.config.ts tests/worldbook_assistant_build/components/EditorPanel.test.ts tests/worldbook_assistant_build/components/TagControls.test.ts
COREPACK_HOME=/opt/data/.corepack corepack pnpm test:worldbook-components
python3 scripts/check-domain-modules.py
git add src/worldbook_assistant_build/App.vue src/worldbook_assistant_build/components/EditorPanel.vue src/worldbook_assistant_build/components/TagManager.vue src/worldbook_assistant_build/components/TagCreatePanel.vue src/worldbook_assistant_build/components/TagAssignmentPanel.vue src/worldbook_assistant_build/components/TagTreeItem.vue src/worldbook_assistant_build/components/TagColorPicker.vue tests/worldbook_assistant_build/components/EditorPanel.test.ts tests/worldbook_assistant_build/components/TagControls.test.ts
git diff --cached --check
git commit -m "refactor: unify editor and tag controls"
```

---

### Task 7: Migrate cross-copy, AI chat, settings panel, and history-facing controls

**Files:**
- Modify: `src/worldbook_assistant_build/components/CrossCopyControls.vue`
- Modify: `src/worldbook_assistant_build/components/CrossCopyActionRows.vue`
- Modify: `src/worldbook_assistant_build/components/CrossCopyBulkActions.vue`
- Modify: `src/worldbook_assistant_build/components/CrossCopySourceList.vue`
- Modify: `src/worldbook_assistant_build/components/CrossCopyMobileStepper.vue`
- Modify: `src/worldbook_assistant_build/components/CrossCopyDesktopWorkspace.vue`
- Modify: `src/worldbook_assistant_build/components/AIChatPanel.vue`
- Modify: `src/worldbook_assistant_build/components/SettingPanel.vue`
- Modify: `src/worldbook_assistant_build/App.vue` remaining assistant-internal controls
- Create: `tests/worldbook_assistant_build/components/CrossCopyControls.test.ts`
- Create: `tests/worldbook_assistant_build/components/AIChatControls.test.ts`

**Interfaces:**
- Preserve source/target worldbook values, status filter, row action, bulk action, selected flags, AI context flag, send/stop events, history actions, and mobile-step events.

- [ ] **Step 1: Write failing cross-copy tests**

Test real components for:

- Source and target selection emits.
- Status filter values.
- Row action values.
- Bulk action values.
- Checkbox selections.
- Mobile previous/next/apply behavior.
- No native selects in the migrated cross-copy component tree.

- [ ] **Step 2: Migrate cross-copy controls**

Use `BaseSelect` for all source/target/filter/action selects, `BaseCheckbox` for row selections, and `BaseButton` for action rows, bulk operations, mobile steps, compare, apply, collapse, and exit actions. Keep compact sizing and existing disabled/loading conditions.

- [ ] **Step 3: Write failing AI/settings-panel tests**

Assert AI context toggle, input updates, send/stop/create/extract events, settings toggles, and history buttons remain unchanged.

- [ ] **Step 4: Migrate AI chat and settings panel**

Use `BaseTextarea`, `BaseSwitch`, and `BaseButton`. Preserve AI input local state and do not introduce new per-keypress external emits beyond the current contract.

- [ ] **Step 5: Migrate all remaining App controls**

Search the Vue root for remaining ordinary native controls. Migrate standard button/input/textarea/select/checkbox/radio usages. Explicit exceptions are limited to:

- Hidden file inputs.
- Native color inputs inside `TagColorPicker`.
- Hidden semantic checkbox inputs inside the base checkbox/switch components.
- Drag handles that are not form controls.

Mark each retained exception with `unified-control-exception:` and a specific reason.

- [ ] **Step 6: Verify and commit**

```bash
COREPACK_HOME=/opt/data/.corepack corepack pnpm vitest run --config vitest.config.ts tests/worldbook_assistant_build/components/CrossCopyControls.test.ts tests/worldbook_assistant_build/components/AIChatControls.test.ts
COREPACK_HOME=/opt/data/.corepack corepack pnpm test:worldbook-components
COREPACK_HOME=/opt/data/.corepack corepack pnpm test:worldbook-composables
COREPACK_HOME=/opt/data/.corepack corepack pnpm test:worldbook-domain
git add src/worldbook_assistant_build/App.vue src/worldbook_assistant_build/components tests/worldbook_assistant_build/components/CrossCopyControls.test.ts tests/worldbook_assistant_build/components/AIChatControls.test.ts
git diff --cached --check
git commit -m "refactor: unify remaining assistant controls"
```

---

### Task 8: Enforce migration, clean compatibility styles, version 2.2.0, and release artifact

**Files:**
- Modify: `scripts/check-worldbook-unified-controls.py`
- Modify: `scripts/check-worldbook-build-hygiene.py`
- Modify: `src/worldbook_assistant_build/App.vue` compatibility/control styles
- Modify: `src/worldbook_assistant_build/domain/version.ts`
- Modify: `tests/worldbook_assistant_build/domain/version.test.ts`
- Modify: `dist/worldbook_assistant_build/index.js`
- Modify only where a real gap is found: base/migration tests

**Interfaces:**
- Produces a fully green structural guard.
- Produces source and tracked bundle reporting `2.2.0`.

- [ ] **Step 1: Strengthen the structural guard**

Update the guard to:

- Fail on `<select` anywhere in assistant Vue source outside base-control internals (which should not contain one either).
- Fail on plain `<button`, text-like `<input`, and `<textarea` unless the line or preceding line contains a documented `unified-control-exception:` marker.
- Permit native hidden checkbox internals only within `BaseCheckbox.vue`/`BaseSwitch.vue`.
- Permit classified file/color/hidden inputs.
- Require every base-control test file and normal verifier collection.
- Require `BaseSelect` owner-document cleanup markers and no Teleport.

Use parsed file-by-file reporting so failures show exact paths and line numbers rather than a single boolean.

- [ ] **Step 2: Run the guard and classify every remaining failure**

```bash
python3 scripts/check-worldbook-unified-controls.py
```

Expected: any remaining failures point to concrete unclassified controls. Migrate them or add a narrow exception with the reason; do not weaken the guard globally.

- [ ] **Step 3: Remove obsolete local control styles**

Delete duplicate button/input/select declarations fully replaced by control tokens. Retain compatibility selectors only when a documented consumer remains. Run component tests after each style removal batch to prevent layout regressions.

- [ ] **Step 4: Run full pre-version verification**

```bash
COREPACK_HOME=/opt/data/.corepack corepack pnpm verify:worldbook
node --check dist/worldbook_assistant_build/index.js
git restore --worktree dist/worldbook_assistant_build/index.js
git diff --check
```

Expected: all guards and tests pass; only existing webpack size warnings are acceptable.

- [ ] **Step 5: Add a failing version assertion**

In `version.test.ts`:

```ts
it('reports the unified-controls release version', () => {
  expect(APP_VERSION).toBe('2.2.0');
});
```

Run the focused test and observe RED against `2.1.1`.

- [ ] **Step 6: Bump source version**

Change:

```ts
export const APP_VERSION = '2.2.0';
```

Run the focused version test and expect GREEN.

- [ ] **Step 7: Build and verify the exact release artifact**

```bash
COREPACK_HOME=/opt/data/.corepack corepack pnpm verify:worldbook
node --check dist/worldbook_assistant_build/index.js
python3 - <<'PY'
from pathlib import Path
text = Path('dist/worldbook_assistant_build/index.js').read_text(encoding='utf-8')
assert '2.2.0' in text
assert '2.1.1' not in text
print('bundle version ok')
PY
git diff --check
```

Do not restore the bundle in this versioning task because the reviewed `2.2.0` artifact is intentional.

- [ ] **Step 8: Inspect and commit exact scope**

```bash
git add scripts/check-worldbook-unified-controls.py scripts/check-worldbook-build-hygiene.py src/worldbook_assistant_build/App.vue src/worldbook_assistant_build/domain/version.ts tests/worldbook_assistant_build/domain/version.test.ts dist/worldbook_assistant_build/index.js
git diff --cached --check
git diff --cached --stat
git diff --cached --name-status
git commit -m "chore: release unified controls 2.2.0"
```

If final guard/style fixes touched additional intentional source/tests, stage those exact paths explicitly before the commit.

- [ ] **Step 9: Final whole-branch review**

Review the entire implementation against the design. Require:

- Zero Critical/Important findings.
- No native assistant-internal dropdowns.
- Correct string/number value behavior.
- Keyboard/touch accessibility.
- No listener/menu accumulation after 20 cycles.
- No cross-document Teleport.
- Full `verify:worldbook` exit `0`.
- Fresh bundle syntax/version checks.
- Clean worktree after restoring only metadata-only post-commit verification churn.

- [ ] **Step 10: Merge and push after approval**

Fast-forward the main branch, rerun full verification on the merged result, restore metadata-only bundle churn, push `ST-Manager-STscript`, and verify local/remote SHAs match. Do not create `2.2.0` tag unless the real mobile-host policy is satisfied or the user explicitly requests immediate tagging.

---

## Plan self-review

- Spec coverage: tokens, six components, custom dropdown behavior, auto-search threshold, keyboard/touch accessibility, owner-document lifecycle, migration of all internal surfaces, exceptions, cleanup, verification, versioning, and release policy all map to Tasks 1-8.
- Type consistency: `BaseSelectOption.value` remains `string | number`; all migration tasks consume the same `BaseSelect` interface. Checkbox and switch models remain boolean. Numeric inputs emit numbers or `null` and page boundaries preserve existing fallbacks.
- Scope isolation: host-owned controls remain excluded. Native color/file/hidden inputs require explicit narrow exception markers.
- TDD: every production component or migration slice begins with a failing focused test and ends with focused plus aggregate verification.
- Placeholder scan: no deferred placeholders or unspecified implementation steps remain.
- Git hygiene: every build task checks the fresh bundle before restoring verification-only churn; the version task intentionally commits the tracked release bundle.
