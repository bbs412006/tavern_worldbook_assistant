# Worldbook Assistant Unified Controls Design

**Date:** 2026-07-13

**Status:** Approved

## 1. Goal

Unify the visual language and interaction behavior of all controls rendered inside the Worldbook Assistant while preserving the current theme system, business events, data shapes, persistence timing, and mobile WebView compatibility.

The current interface contains roughly 400 button, input, textarea, checkbox, switch, and select usages. Existing `.btn` and `.text-input` compatibility styles cover part of the interface, but many components still render browser-native controls or maintain local one-off styling. The result is inconsistent height, padding, radius, borders, focus treatment, disabled states, and dropdown presentation.

This work introduces a small internal control system and migrates the assistant in verified slices. It does not redesign the product or change feature behavior.

## 2. Scope

### In scope

All controls rendered inside the assistant Vue root:

- Main and focus toolbars.
- Worldbook selection.
- Browse and editor views.
- Tag management.
- Cross-worldbook copy.
- AI chat.
- Settings.
- AI configuration.
- History views.
- Mobile navigation and tool areas.
- Floating panels rendered inside the assistant root.

Control families:

- Standard, primary, danger, ghost, compact, and icon buttons.
- Text, number, and search inputs.
- Textareas.
- Select/dropdown controls.
- Checkboxes, switches, and radio-like choices.

### Out of scope

Controls rendered outside the assistant Vue root:

- The SillyTavern magic-wand menu entry.
- The host-document floating launcher button.
- The floor-extraction popup and its controls.
- Native SillyTavern controls owned by the host application.

No cross-document Teleport will be introduced.

## 3. Visual direction

Retain the existing assistant themes and palette. Unification is limited to control geometry, surfaces, border treatment, typography, and interaction states.

The new control system must use theme variables rather than hard-coded redesign colors.

Required states:

- Default.
- Hover where hover is available.
- Active/pressed.
- `focus-visible`.
- Disabled.
- Read-only where applicable.
- Error where applicable.
- Loading for buttons.

Mobile targets:

- Regular primary interaction controls should have a minimum touch height around 40 px.
- Compact toolbar controls may use the small size token.
- Icon-only controls require an accessible label and a square hit target.

## 4. Control tokens

Define or normalize shared tokens under the assistant root:

```css
--wb-control-height-sm
--wb-control-height-md
--wb-control-height-lg
--wb-control-radius
--wb-control-padding-x-sm
--wb-control-padding-x-md
--wb-control-padding-x-lg
--wb-control-bg
--wb-control-bg-hover
--wb-control-bg-active
--wb-control-border
--wb-control-border-hover
--wb-control-focus-ring
--wb-control-disabled-opacity
--wb-control-menu-bg
--wb-control-menu-shadow
--wb-control-option-active
--wb-control-option-selected
```

The tokens derive from existing theme variables such as input backgrounds, panel backgrounds, borders, text colors, primary colors, and shadows. They must work across all existing themes and glass mode without adding a new theme format.

## 5. Base components

### 5.1 `BaseButton.vue`

Interface:

```ts
variant: 'default' | 'primary' | 'danger' | 'ghost'
size: 'sm' | 'md' | 'lg'
loading: boolean
disabled: boolean
iconOnly: boolean
type: 'button' | 'submit' | 'reset'
```

Requirements:

- Native `<button>` semantics.
- Emits native click only when enabled and not loading.
- Loading state exposes `aria-busy` and preserves width where practical.
- Icon-only mode requires an accessible name supplied by the consumer.
- Uses only opacity/transform for optional interaction motion.
- Respects reduced-motion preferences.

### 5.2 `BaseInput.vue`

Supports text, search, number, password, URL, and other currently used text-like input types.

Requirements:

- Standardized height, padding, background, border, and focus ring.
- Forwards relevant native attributes.
- Supports `v-model` without changing value semantics.
- Supports disabled, readonly, error, prefix, and suffix presentation.
- Does not interfere with mobile keyboard/input-mode selection.

### 5.3 `BaseTextarea.vue`

Requirements:

- Shared surface and interaction states with `BaseInput`.
- Configurable minimum rows and resize behavior.
- Preserves current input/update timing.
- Does not introduce per-keystroke persistence or object copying.

### 5.4 `BaseSelect.vue`

All assistant-internal native selects will migrate to this custom component.

Interface includes:

```ts
modelValue: string | number | null
options: Array<{
  value: string | number
  label: string
  disabled?: boolean
  keywords?: string[]
}>
searchable: boolean | 'auto'
searchThreshold: number // default 8
clearable: boolean
disabled: boolean
size: 'sm' | 'md' | 'lg'
placeholder: string
```

Value types must be preserved. The component must not stringify numeric values internally.

Behavior:

- Short lists with 8 or fewer options show a normal custom menu.
- Lists with more than 8 options show a search input automatically.
- Consumers can explicitly enable or disable searching.
- Arrow Up/Down moves the active option.
- Home/End moves to the first/last available option.
- Enter or Space opens/chooses as appropriate.
- Escape closes without changing the selected value.
- Tab closes and follows normal focus order.
- Outside pointer interaction closes the menu.
- The selected/active option scrolls into view.
- Disabled options are skipped.
- Menu opens upward when downward space is insufficient.
- The menu is constrained to the assistant viewport and cannot cause horizontal overflow.
- Search text is local and cleared when the menu closes.
- Search input is focused only for searchable menus, avoiding unnecessary mobile keyboard activation for short menus.

Accessibility:

- Trigger uses combobox semantics.
- Menu uses listbox semantics.
- Options use option semantics with selected and disabled state.
- Trigger and listbox are connected by stable IDs.
- A hidden native input may be used for form semantics where needed, but it must not invoke the native select picker.

Lifecycle and performance:

- Menu DOM exists only while open.
- Document/window listeners exist only while open.
- Listeners are attached to the mounted owner document/window, not assumed global objects.
- Menu teardown removes listeners, pending frames, and temporary search state.
- Twenty open/close cycles must not accumulate menu DOM or listeners.
- No cross-document Teleport.

### 5.5 `BaseCheckbox.vue` and `BaseSwitch.vue`

Requirements:

- Preserve a real checkbox input for accessibility and keyboard behavior.
- Entire label surface is clickable.
- Support disabled and indeterminate states where applicable.
- `BaseSwitch` uses checkbox semantics with switch presentation.
- Existing boolean model values and emitted event timing remain unchanged.

## 6. Dropdown positioning

`BaseSelect` is rendered inside the assistant root. The menu may use an absolutely positioned layer owned by the assistant root, but not host-body Teleport.

Positioning flow:

1. Measure trigger and assistant root bounds after opening.
2. Choose downward placement when sufficient space exists.
3. Otherwise choose upward placement.
4. Clamp width and horizontal position inside the assistant root.
5. Limit menu height and use contained touch scrolling.
6. Recalculate through a coalesced frame on relevant owner-window resize while open.

The implementation should reuse the established coalesced-frame and resource-ownership patterns where appropriate.

## 7. Compatibility layer and migration

Existing `.btn`, `.text-input`, `.text-area`, and `.toolbar-select` styling stays temporarily as a compatibility layer.

Migration rules:

- Do not change business event names.
- Do not change persisted data formats.
- Do not change save/generate/apply timing.
- Preserve select value and label mappings.
- Preserve option disabled state.
- Preserve number versus string value types.
- Preserve existing compact layout constraints.
- Do not turn icon/action elements into inaccessible generic divs.
- Special controls such as color inputs, file inputs, drag handles, and hidden inputs are not blindly replaced by text-input components.

After migration, structural guards will prevent new assistant-internal native selects and flag unclassified plain controls.

## 8. Migration slices

### Slice 1: Foundation

- Add tokens.
- Add base components.
- Add component interaction, accessibility, owner-document, cleanup, and mobile menu tests.
- Do not migrate business pages yet.

### Slice 2: Settings and AI configuration

- Migrate all buttons, inputs, textareas, selects, checkboxes, and switches on the two utility pages.
- Validate custom menus in the recently stabilized inline-page flow.

### Slice 3: Main toolbars and worldbook selection

- Migrate main/focus toolbars and all worldbook selectors.
- Verify compact sizing and state preservation across utility navigation.

### Slice 4: Browse, editor, and tag management

- Migrate filters, editing fields, tag selectors, action controls, and compact tree controls.
- Preserve drag/resize and editor focus behavior.

### Slice 5: Cross-copy, AI chat, and history

- Migrate complex action rows, source/target selectors, AI controls, history filters, and modal controls inside the assistant root.

### Slice 6: Guards and cleanup

- Add structural checks forbidding assistant-internal native selects except explicit documented exceptions.
- Identify remaining native/plain controls and either migrate or classify them.
- Remove duplicate local styles that are fully replaced by control tokens/components.
- Preserve compatibility classes only where still required.

## 9. Testing

### Base component tests

- Variants and sizes render correct semantic elements/classes.
- Disabled/loading controls do not invoke actions.
- `v-model` preserves string and number values.
- Select opens/closes by pointer and keyboard.
- Search appears automatically above the threshold.
- Search filtering handles labels and keywords.
- Disabled options are skipped.
- Escape and outside click close correctly.
- Upward placement and clamping work with injected/mocked bounds.
- Menu uses the mounted owner document/window.
- Twenty cycles leave no listener or menu accumulation.
- Reduced-motion contract is present.

### Migrated page tests

- Existing business emits and state transitions remain unchanged.
- Settings, AI configuration, worldbook selection, filters, tag actions, copy actions, and AI actions keep their original value types.
- Mobile layouts retain touch target size and no horizontal clipping.
- Real `App.vue` tests cover representative controls across navigation.

### Structural verification

- Count and classify native control usage.
- Fail on unapproved native `<select>` inside the assistant source.
- Fail when new plain buttons/text inputs bypass the base components without an explicit exception marker.
- Ensure the verification runner executes base-control and migration tests before production build.

## 10. Success criteria

- No system-native dropdown picker remains inside the assistant Vue root.
- Buttons, text inputs, textareas, checkboxes, and switches share consistent geometry and states.
- All existing themes render correctly through existing theme variables.
- Lists over 8 options automatically provide search unless overridden.
- Custom dropdowns support keyboard and touch interaction.
- Dropdowns do not clip, overflow horizontally, or remain mounted after close.
- Twenty open/close cycles do not accumulate owned listeners or menu DOM.
- Existing save, generate, apply, filter, selection, and persistence behavior remains unchanged.
- No significant increase in idle memory or interaction latency.
- Full automated verification and production build pass.
- The application version advances to `2.2.0` because this is a broad, backward-compatible UI capability and architecture update.

## 11. Release policy

Source, production bundle, and main branch may advance to `2.2.0` after automated verification and review. A stable `2.2.0` tag should follow the project's current real mobile-host acceptance policy unless the user explicitly directs immediate tagging.
