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
cross_copy_path = root / 'src/worldbook_assistant_build/domain/crossCopy.ts'
cross_copy = cross_copy_path.read_text(encoding='utf-8') if cross_copy_path.exists() else ''
ai_tags_path = root / 'src/worldbook_assistant_build/domain/aiTags.ts'
ai_tags = ai_tags_path.read_text(encoding='utf-8') if ai_tags_path.exists() else ''
tags_path = root / 'src/worldbook_assistant_build/domain/tags.ts'
tags = tags_path.read_text(encoding='utf-8') if tags_path.exists() else ''
worldbook_path = root / 'src/worldbook_assistant_build/domain/worldbook.ts'
worldbook = worldbook_path.read_text(encoding='utf-8') if worldbook_path.exists() else ''
layout_path = root / 'src/worldbook_assistant_build/domain/layout.ts'
layout = layout_path.read_text(encoding='utf-8') if layout_path.exists() else ''

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
    'cross copy domain module exists': cross_copy_path.exists(),
    'cross copy domain exports status labels': 'export const CROSS_COPY_STATUS_LABELS' in cross_copy and 'export const CROSS_COPY_ACTION_LABELS' in cross_copy,
    'cross copy domain exports diff helpers': 'export function buildEntryFieldDiffRows' in cross_copy and 'export function buildCrossCopyTextDiff' in cross_copy,
    'app imports cross copy domain helpers': "from './domain/crossCopy'" in app and 'buildCrossCopyTextDiff' in app and 'CROSS_COPY_STATUS_LABELS' in app,
    'app no longer declares cross copy diff inline': 'function buildCrossCopyTextDiff' not in app,
    'ai tags domain module exists': ai_tags_path.exists(),
    'ai tags domain exports extraction': 'export function extractAiTags' in ai_tags,
    'ai tags domain exports dedupe': 'export function dedupeExtractedTags' in ai_tags,
    'app imports ai tag helpers': "from './domain/aiTags'" in app and 'extractAiTags' in app and 'dedupeExtractedTags' in app,
    'app no longer declares ai tag extractor inline': 'function aiExtractTags' not in app,
    'tags domain module exists': tags_path.exists(),
    'tags domain exports tree helpers': 'export function normalizeTagNameKey' in tags and 'export function isTagDescendantOf' in tags and 'export function collectTagSubtreeIds' in tags,
    'app imports tags domain helpers': "from './domain/tags'" in app and 'normalizeTagNameKey' in app and 'collectTagSubtreeIds' in app,
    'app no longer declares tag tree helpers inline': 'function normalizeTagNameKey' not in app and 'function collectTagSubtreeIds' not in app,
    'worldbook domain module exists': worldbook_path.exists(),
    'worldbook domain exports import parser': 'export function parseImportedPayload' in worldbook and 'export function collectRawEntries' in worldbook,
    'worldbook domain exports entry sorter': 'export function compareEntriesByPositionThenOrder' in worldbook,
    'app imports worldbook domain helpers': "from './domain/worldbook'" in app and 'parseImportedPayload' in app and 'compareEntriesByPositionThenOrder' in app,
    'app no longer declares worldbook pure helpers inline': 'function parseImportedPayload' not in app and 'function compareEntriesByPositionThenOrder' not in app,
    'layout domain module exists': layout_path.exists(),
    'layout domain exports responsive helpers': 'export function isCompactLayoutWidth' in layout and 'export function buildMainLayoutStyle' in layout and 'export function buildEditorShellStyle' in layout,
    'app imports layout helpers': "from './domain/layout'" in app and 'buildMainLayoutStyle' in app and 'buildEditorShellStyle' in app,
    'app uses ai chat panel component': '<AIChatPanel' in app,
    'app uses ai chat panel for mobile and desktop': app.count('<AIChatPanel') >= 2,
    'ai chat panel supports streaming state': 'streamingText' in (root / 'src/worldbook_assistant_build/components/AIChatPanel.vue').read_text(encoding='utf-8'),
    'ai chat panel can hide empty actions': 'showEmptyActions' in (root / 'src/worldbook_assistant_build/components/AIChatPanel.vue').read_text(encoding='utf-8'),
}

for name, ok in checks.items():
    print(('PASS' if ok else 'FAIL'), name)
if not all(checks.values()):
    raise SystemExit(1)
