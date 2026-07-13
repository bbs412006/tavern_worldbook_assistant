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
    'base select has no teleport': '<Teleport' not in (
        (controls / 'BaseSelect.vue').read_text(encoding='utf-8')
        if (controls / 'BaseSelect.vue').is_file()
        else ''
    ),
    'assistant pages avoid native select': '<select' not in assistant_sources,
    'control component tests exist': (
        root / 'tests/worldbook_assistant_build/components/controls/BaseSelect.test.ts'
    ).is_file(),
}

for name, ok in checks.items():
    print(('PASS' if ok else 'FAIL'), name)
if not all(checks.values()):
    raise SystemExit(1)
