from pathlib import Path

root = Path(__file__).resolve().parents[1]
settings = (root / 'src/worldbook_assistant_build/components/SettingsModal.vue').read_text(encoding='utf-8')
ai = (root / 'src/worldbook_assistant_build/components/AIConfigModal.vue').read_text(encoding='utf-8')
css = (root / 'src/worldbook_assistant_build/components/modal-shared.css').read_text(encoding='utf-8')
app = (root / 'src/worldbook_assistant_build/App.vue').read_text(encoding='utf-8')
bundle_path = root / 'dist/worldbook_assistant_build/index.js'
bundle = bundle_path.read_text(encoding='utf-8') if bundle_path.exists() else ''

checks = {
    'app version bumped for modal visibility fix': "APP_VERSION = '1.3.4'" in app,
    'app resolves host document teleport target': 'modalTeleportTarget' in app and 'ownerDocument?.body' in app,
    'settings modal receives explicit teleport target': ':teleport-target="modalTeleportTarget"' in app,
    'ai config modal receives explicit teleport target': ':teleport-target="modalTeleportTarget"' in app,
    'settings modal teleports to explicit target': ':to="teleportTarget"' in settings and 'teleportTarget: HTMLElement | string' in settings and '设置中心' in settings,
    'ai config modal teleports to explicit target': ':to="teleportTarget"' in ai and 'teleportTarget: HTMLElement | string' in ai and 'AI 配置世界书' in ai,
    'settings modal closes teleport wrapper': '</Teleport>' in settings,
    'ai config modal closes teleport wrapper': '</Teleport>' in ai,
    'settings modal shields host pointer events': '@pointerdown.stop' in settings and '@mousedown.stop' in settings and '@touchstart.stop' in settings and '@click.self.stop' in settings,
    'ai config modal shields host pointer events': ai.count('@pointerdown.stop') >= 3 and ai.count('@mousedown.stop') >= 3 and ai.count('@touchstart.stop') >= 3 and ai.count('@click.self.stop') >= 2,
    'shared modal css keeps overlay fixed on mobile': '@media (orientation: portrait)' in css and 'position: absolute;' not in css,
    'app opens settings with boolean': 'showApiSettings = true' in app and 'v-if="showApiSettings"' in app,
    'app opens ai config with boolean': 'openAiConfigModal' in app and ':show-input="showAiConfigModal"' in app,
    'shared modal css present': "import './modal-shared.css'" in settings and "import './modal-shared.css'" in ai,
    'bundle has settings title': (not bundle) or '设置中心' in bundle,
    'bundle has ai config title': (not bundle) or 'AI 配置世界书' in bundle,
    'bundle includes teleport runtime after build': (not bundle) or 'Teleport' in bundle or 'teleport' in bundle,
}
for name, ok in checks.items():
    print(('PASS' if ok else 'FAIL'), name)
if not all(checks.values()):
    raise SystemExit(1)
