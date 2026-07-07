from pathlib import Path

root = Path(__file__).resolve().parents[1]
app = (root / 'src/worldbook_assistant_build/App.vue').read_text(encoding='utf-8')
ui_constants_path = root / 'src/worldbook_assistant_build/domain/uiConstants.ts'
ui_constants = ui_constants_path.read_text(encoding='utf-8') if ui_constants_path.exists() else ''
types_path = root / 'src/worldbook_assistant_build/domain/types.ts'
types = types_path.read_text(encoding='utf-8') if types_path.exists() else ''
persisted_composable_path = root / 'src/worldbook_assistant_build/composables/usePersistedState.ts'
persisted_composable = persisted_composable_path.read_text(encoding='utf-8') if persisted_composable_path.exists() else ''
ai_config_path = root / 'src/worldbook_assistant_build/domain/aiConfig.ts'
ai_config = ai_config_path.read_text(encoding='utf-8') if ai_config_path.exists() else ''

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
    'persisted state module exists': (root / 'src/worldbook_assistant_build/domain/persistedState.ts').exists(),
    'persisted state exports defaults': 'export function createDefaultPersistedState' in ((root / 'src/worldbook_assistant_build/domain/persistedState.ts').read_text(encoding='utf-8') if (root / 'src/worldbook_assistant_build/domain/persistedState.ts').exists() else ''),
    'persisted state exports normalizer': 'export function normalizePersistedState' in ((root / 'src/worldbook_assistant_build/domain/persistedState.ts').read_text(encoding='utf-8') if (root / 'src/worldbook_assistant_build/domain/persistedState.ts').exists() else ''),
    'app imports persisted state helpers': "from './domain/persistedState'" in app,
    'app no longer declares persisted state default inline': 'function createDefaultPersistedState' not in app,
    'app no longer declares persisted state normalizer inline': 'function normalizePersistedState' not in app,
    'persisted state composable exists': persisted_composable_path.exists(),
    'persisted state composable exports usePersistedState': 'export function usePersistedState' in persisted_composable,
    'persisted state composable owns variable bridge': 'readPersistedState' in persisted_composable and 'writePersistedState' in persisted_composable and 'updatePersistedState' in persisted_composable,
    'app imports persisted state composable': "from './composables/usePersistedState'" in app and 'usePersistedState' in app,
    'app no longer declares persisted state bridge inline': 'function readPersistedState' not in app and 'function writePersistedState' not in app and 'function updatePersistedState' not in app,
    'ai config domain module exists': ai_config_path.exists(),
    'ai config domain exports prompt builder': 'export function buildConfigSystemPrompt' in ai_config,
    'ai config domain exports json extractor': 'export function extractJsonArray' in ai_config,
    'app imports ai config domain helpers': "from './domain/aiConfig'" in app and 'buildConfigSystemPrompt' in app and 'extractJsonArray' in app,
    'app no longer declares ai config pure helpers inline': 'function extractJsonArray' not in app,
}

for name, ok in checks.items():
    print(('PASS' if ok else 'FAIL'), name)
if not all(checks.values()):
    raise SystemExit(1)
