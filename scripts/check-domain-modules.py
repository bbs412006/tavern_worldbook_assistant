from pathlib import Path

root = Path(__file__).resolve().parents[1]
app = (root / 'src/worldbook_assistant_build/App.vue').read_text(encoding='utf-8')
ui_constants_path = root / 'src/worldbook_assistant_build/domain/uiConstants.ts'
ui_constants = ui_constants_path.read_text(encoding='utf-8') if ui_constants_path.exists() else ''
types_path = root / 'src/worldbook_assistant_build/domain/types.ts'
types = types_path.read_text(encoding='utf-8') if types_path.exists() else ''

checks = {
    'ui constants module exists': ui_constants_path.exists(),
    'ui constants exports themes': 'export type ThemeKey' in ui_constants and 'export const THEMES' in ui_constants,
    'ui constants exports tag colors': 'export const TAG_COLORS' in ui_constants,
    'ui constants exports option arrays': 'strategyTypeOptions' in ui_constants and 'positionSelectOptions' in ui_constants,
    'app imports ui constants': "from './domain/uiConstants'" in app,
    'app no longer declares themes inline': 'const THEMES:' not in app,
    'app no longer declares tag colors inline': 'const TAG_COLORS =' not in app,
    'domain types module exists': types_path.exists(),
    'domain types exports persisted state': 'export interface PersistedState' in types,
    'domain types exports ai api config': 'export interface AIApiConfig' in types,
    'domain types exports version info': 'export interface VersionInfo' in types,
    'app imports domain types': "from './domain/types'" in app,
    'app no longer declares persisted state inline': 'interface PersistedState' not in app,
    'app no longer declares ai api config inline': 'interface AIApiConfig' not in app,
    'app no longer declares version info inline': 'interface VersionInfo' not in app,
}

for name, ok in checks.items():
    print(('PASS' if ok else 'FAIL'), name)
if not all(checks.values()):
    raise SystemExit(1)
