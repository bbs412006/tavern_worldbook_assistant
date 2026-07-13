#!/usr/bin/env python3
from pathlib import Path


root = Path(__file__).resolve().parents[1]
source_root = root / 'src/worldbook_assistant_build'
components = source_root / 'components'
app_path = source_root / 'App.vue'
coalesced_path = source_root / 'composables/useCoalescedFrame.ts'
activity_path = source_root / 'composables/useVisibilityActivity.ts'
diagnostics_path = source_root / 'domain/performanceDiagnostics.ts'
settings_path = components / 'SettingsPage.vue'
ai_config_path = components / 'AIConfigPage.vue'

app = app_path.read_text(encoding='utf-8')
settings = settings_path.read_text(encoding='utf-8') if settings_path.is_file() else ''
ai_config = ai_config_path.read_text(encoding='utf-8') if ai_config_path.is_file() else ''
utility_styles = '\n'.join((settings, ai_config))
app_header = app.split('<!-- ═══ Mobile Tab View ═══ -->', 1)[0]
forbidden_tokens_absent = all(
    token not in utility_styles
    for token in ('<Teleport', 'position: fixed')
)

checks = {
    'app declares main workspace activity': 'isMainWorkspaceActive' in app,
    'main workspace is visibility retained': 'data-main-workspace' in app and 'v-show="isMainWorkspaceActive"' in app,
    'main workspace is not utility v-else branch': '<template v-else>' not in app_header,
    'utility pages remain conditionally mounted': "utilityPage === 'settings'" in app and "utilityPage === 'ai-config'" in app,
    'coalesced frame composable exists': coalesced_path.is_file(),
    'visibility activity composable exists': activity_path.is_file(),
    'performance diagnostics exists': diagnostics_path.is_file(),
    'utility pages avoid teleport and fixed overlay': forbidden_tokens_absent,
    'reduced motion contract exists': 'prefers-reduced-motion: reduce' in utility_styles,
}

for name, ok in checks.items():
    print(('PASS' if ok else 'FAIL'), name)
if not all(checks.values()):
    raise SystemExit(1)
