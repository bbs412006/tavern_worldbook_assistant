#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / 'src/worldbook_assistant_build'
VUE_ROOTS = [SOURCE_ROOT / 'App.vue', SOURCE_ROOT / 'components']
CONTROLS_ROOT = SOURCE_ROOT / 'components/controls'
TEST_ROOT = ROOT / 'tests/worldbook_assistant_build/components/controls'
EXCEPTION_MARKER = 'unified-control-exception:'

CONTROL_TESTS = [
    'BaseButton.test.ts',
    'BaseInput.test.ts',
    'BaseSelect.test.ts',
    'BaseCheckbox.test.ts',
    'ControlStyles.test.ts',
]
NATIVE_TAG = re.compile(r'<(button|input|textarea|select)\b', re.IGNORECASE)
COMMENT_OR_NATIVE_TAG = re.compile(r'<!--.*?-->|<(button|input|textarea|select)\b', re.IGNORECASE | re.DOTALL)
INPUT_TYPE = re.compile(r'\btype\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE)
ALLOWED_NATIVE_INPUT_TYPES = {'file', 'color', 'hidden'}
ALLOWED_BASE_NATIVE_TAGS = {
    'BaseButton.vue': {'button'},
    'BaseInput.vue': {'input'},
    'BaseTextarea.vue': {'textarea'},
    'BaseSelect.vue': {'button', 'input'},
    'BaseCheckbox.vue': {'input'},
    'BaseSwitch.vue': {'input'},
}


def iter_vue_files() -> list[Path]:
    files = [VUE_ROOTS[0]]
    files.extend(sorted(path for path in VUE_ROOTS[1].rglob('*.vue') if path.is_file()))
    return files


TEMPLATE_TAG = re.compile(r'</?template\b[^>]*>', re.IGNORECASE)
COMMENT = re.compile(r'<!--.*?-->', re.DOTALL)
SCRIPT_OR_STYLE_BLOCK = re.compile(r'<(script|style)\b[^>]*>.*?</\1\s*>', re.IGNORECASE | re.DOTALL)


def mask_matches(text: str, pattern: re.Pattern[str]) -> str:
    """Mask matches while preserving offsets and source line numbers."""
    chars = list(text)
    for match in pattern.finditer(text):
        for index in range(match.start(), match.end()):
            if chars[index] != '\n':
                chars[index] = ' '
    return ''.join(chars)


def template_source(text: str) -> tuple[str, int]:
    """Return the root SFC template body and its zero-based source offset."""
    searchable = mask_matches(mask_matches(text, COMMENT), SCRIPT_OR_STYLE_BLOCK)
    depth = 0
    body_start: int | None = None
    for match in TEMPLATE_TAG.finditer(searchable):
        is_closing = match.group(0).startswith('</')
        if not is_closing:
            if depth == 0:
                body_start = match.end()
            depth += 1
            continue
        if depth == 0:
            continue
        depth -= 1
        if depth == 0 and body_start is not None:
            return text[body_start:match.start()], body_start
    return '', 0


def start_tag(source: str, offset: int) -> str:
    """Read one HTML start tag, respecting quoted > characters."""
    quote: str | None = None
    for index in range(offset, len(source)):
        char = source[index]
        if quote:
            if char == quote:
                quote = None
        elif char in {'"', "'"}:
            quote = char
        elif char == '>':
            return source[offset:index + 1]
    return source[offset:]


def native_control_violations(path: Path) -> list[str]:
    violations: list[str] = []
    text = path.read_text(encoding='utf-8')
    source, source_offset = template_source(text)
    relative = path.relative_to(ROOT)
    allowed_base_tags = ALLOWED_BASE_NATIVE_TAGS.get(path.name, set()) if path.parent == CONTROLS_ROOT else set()
    pending_exception_end: int | None = None
    for match in COMMENT_OR_NATIVE_TAG.finditer(source):
        token = match.group(0)
        if token.startswith('<!--'):
            pending_exception_end = match.end() if EXCEPTION_MARKER in token else None
            continue

        tag = match.group(1).lower()
        exempt = pending_exception_end is not None and not source[pending_exception_end:match.start()].strip()
        pending_exception_end = None
        if exempt:
            continue
        if tag in allowed_base_tags:
            continue
        if tag == 'input':
            type_match = INPUT_TYPE.search(start_tag(source, match.start()))
            input_type = type_match.group(1).lower() if type_match else 'text'
            if input_type in ALLOWED_NATIVE_INPUT_TYPES:
                continue
        line_number = text.count('\n', 0, source_offset + match.start()) + 1
        violations.append(f'{relative}:{line_number}: native <{tag}> requires a unified control or documented exception')
    return violations


def main() -> None:
    failures: list[str] = []

    app_source = (SOURCE_ROOT / 'App.vue').read_text(encoding='utf-8')
    if '--wb-control-height-md' not in app_source:
        failures.append('src/worldbook_assistant_build/App.vue: missing control token contract')

    for name in ['BaseButton.vue', 'BaseInput.vue', 'BaseTextarea.vue', 'BaseSelect.vue', 'BaseCheckbox.vue', 'BaseSwitch.vue']:
        if not (CONTROLS_ROOT / name).is_file():
            failures.append(f'src/worldbook_assistant_build/components/controls/{name}: missing base control')

    base_select = (CONTROLS_ROOT / 'BaseSelect.vue').read_text(encoding='utf-8')
    if 'Teleport' in base_select:
        failures.append('BaseSelect.vue: cross-document Teleport is forbidden')
    for marker in ['ownerDocument', 'ownerWindow', 'removeEventListener', 'onBeforeUnmount']:
        if marker not in base_select:
            failures.append(f'BaseSelect.vue: missing owner-document cleanup marker {marker!r}')

    for path in iter_vue_files():
        failures.extend(native_control_violations(path))

    for name in CONTROL_TESTS:
        if not (TEST_ROOT / name).is_file():
            failures.append(f'tests/worldbook_assistant_build/components/controls/{name}: missing base-control test')

    package = (ROOT / 'package.json').read_text(encoding='utf-8')
    verifier = (ROOT / 'scripts/verify-worldbook-build.py').read_text(encoding='utf-8')
    if 'test:worldbook-components' not in package:
        failures.append('package.json: missing normal component test command')
    if 'test:worldbook-components' not in verifier or 'check-worldbook-unified-controls.py' not in verifier:
        failures.append('scripts/verify-worldbook-build.py: unified controls are not in the normal verifier collection')

    if failures:
        print('FAIL unified control guard')
        for failure in failures:
            print(f'- {failure}')
        raise SystemExit(1)

    print('PASS unified control guard')
    print(f'PASS scanned {len(iter_vue_files())} assistant Vue files')
    print(f'PASS required {len(CONTROL_TESTS)} base-control test files')


if __name__ == '__main__':
    main()
