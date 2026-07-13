#!/usr/bin/env python3
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
components = root / 'src/worldbook_assistant_build/components'
app = (root / 'src/worldbook_assistant_build/App.vue').read_text(encoding='utf-8')
settings_path = components / 'SettingsPage.vue'
ai_path = components / 'AIConfigPage.vue'
settings = settings_path.read_text(encoding='utf-8') if settings_path.is_file() else ''
ai = ai_path.read_text(encoding='utf-8') if ai_path.is_file() else ''


def contains_all(source: str, markers: tuple[str, ...]) -> bool:
    return all(marker in source for marker in markers)


def click_count(handler: str) -> int:
    return len(re.findall(rf'@click\s*=\s*["\']{handler}["\']', app))


checks = {
    'settings inline page exists': settings_path.is_file(),
    'ai config inline page exists': ai_path.is_file(),
    'app imports settings inline page': "import SettingsPage from './components/SettingsPage.vue'" in app,
    'app imports ai config inline page': "import AIConfigPage from './components/AIConfigPage.vue'" in app,
    'app renders settings inline page': '<SettingsPage' in app and "utilityPage === 'settings'" in app,
    'app renders ai config inline page': '<AIConfigPage' in app and "utilityPage === 'ai-config'" in app,
    'settings page avoids teleport and overlay': bool(settings) and 'Teleport' not in settings and 'ai-tag-review-overlay' not in settings,
    'ai config page avoids teleport and overlay': bool(ai) and 'Teleport' not in ai and 'ai-tag-review-overlay' not in ai,
    'app declares utility page navigation': contains_all(app, (
        "type UtilityPage = 'main' | 'settings' | 'ai-config'",
        'utilityPage',
        'openSettingsPage',
        'openAiConfigPage',
        'closeUtilityPage',
    )),
    'all three settings entry points use openSettingsPage': click_count('openSettingsPage') == 3,
    'all three ai config entry points use openAiConfigPage': click_count('openAiConfigPage') == 3,
    'settings page retains business event contracts': contains_all(settings, (
        'set-fab-visible',
        'toggle-floor-btns',
        'update-persisted-state',
        'update-api-config',
        'load-model-list',
        'check-latest-version',
        'copy-version-import-url',
    )),
    'ai config page retains input and generation contracts': contains_all(ai, (
        'targetWorldbook',
        'input',
        'customPrompt',
        'generating',
        'generate',
    )),
    'ai config page retains preview selection and apply contracts': contains_all(ai, (
        'preview',
        'select-all',
        'select-none',
        'apply',
    )),
}

for name, ok in checks.items():
    print(('PASS' if ok else 'FAIL'), name)
if not all(checks.values()):
    raise SystemExit(1)
