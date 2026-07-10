from pathlib import Path

root = Path(__file__).resolve().parents[1]
settings = (root / 'src/worldbook_assistant_build/components/SettingsModal.vue').read_text(encoding='utf-8')
ai = (root / 'src/worldbook_assistant_build/components/AIConfigModal.vue').read_text(encoding='utf-8')
css = (root / 'src/worldbook_assistant_build/components/modal-shared.css').read_text(encoding='utf-8')
app = (root / 'src/worldbook_assistant_build/App.vue').read_text(encoding='utf-8')
version_module = (root / 'src/worldbook_assistant_build/domain/version.ts').read_text(encoding='utf-8')
index = (root / 'src/worldbook_assistant_build/index.ts').read_text(encoding='utf-8')
host_bridge_path = root / 'src/worldbook_assistant_build/host/hostBridge.ts'
host_bridge = host_bridge_path.read_text(encoding='utf-8') if host_bridge_path.exists() else ''
modal_host_path = root / 'src/worldbook_assistant_build/host/modalHost.ts'
modal_host = modal_host_path.read_text(encoding='utf-8') if modal_host_path.exists() else ''
bundle_path = root / 'dist/worldbook_assistant_build/index.js'
bundle = bundle_path.read_text(encoding='utf-8') if bundle_path.exists() else ''

checks = {
    'app version bumped for modal visibility fix': "APP_VERSION = '2.0.0'" in version_module and "from './domain/version'" in app,
    'app resolves host document teleport target': 'modalTeleportTarget' in app and 'resolveModalTarget(rootRef.value)' in app,
    'settings modal receives explicit teleport target': ':teleport-target="modalTeleportTarget"' in app,
    'ai config modal receives explicit teleport target': ':teleport-target="modalTeleportTarget"' in app,
    'settings modal teleports to explicit target': ':to="teleportTarget"' in settings and 'teleportTarget: HTMLElement | string' in settings and '设置中心' in settings,
    'ai config modal teleports to explicit target': ':to="teleportTarget"' in ai and 'teleportTarget: HTMLElement | string' in ai and 'AI 配置世界书' in ai,
    'settings modal closes teleport wrapper': '</Teleport>' in settings,
    'ai config modal closes teleport wrapper': '</Teleport>' in ai,
    'settings modal uses Vue native event shielding': '@pointerdown.stop' in settings and '@mousedown.stop' in settings and '@touchstart.stop' in settings and '@click.self.stop=' in settings and "from '../host/modalHost'" not in settings,
    'ai config modal uses Vue native event shielding': ai.count('@pointerdown.stop') >= 3 and ai.count('@mousedown.stop') >= 3 and ai.count('@touchstart.stop') >= 3 and ai.count('@click.self.stop=') >= 2 and "from '../host/modalHost'" not in ai,
    'shared modal css keeps overlay fixed on mobile': '@media (orientation: portrait)' in css and 'position: absolute;' not in css,
    'app opens settings with boolean': 'showApiSettings = true' in app and 'v-if="showApiSettings"' in app,
    'app opens ai config with boolean': 'openAiConfigModal' in app and ':show-input="showAiConfigModal"' in app,
    'host bridge centralizes host document helpers': host_bridge_path.exists() and 'export function getHostWindow' in host_bridge and 'export function getHostDocument' in host_bridge,
    'host bridge exports modal target resolver': 'export function resolveModalTarget' in host_bridge,
    'index imports host bridge helpers': "from './host/hostBridge'" in index and 'getHostDocument' in index and 'getHostWindow' in index,
    'app imports host bridge modal resolver': "from './host/hostBridge'" in app and 'resolveModalTarget' in app,
    'modal host centralizes overlay shielding': modal_host_path.exists() and 'export function shieldModalHostEvent' in modal_host,
    'settings modal avoids cross-document helper shielding': "from '../host/modalHost'" not in settings and 'shieldModalHostEvent' not in settings,
    'ai config modal avoids cross-document helper shielding': "from '../host/modalHost'" not in ai and 'shieldModalHostEvent' not in ai,
    'shared modal css present': 'ai-tag-review-overlay' in css,
    'bundle has settings title': (not bundle) or '设置中心' in bundle,
    'bundle has ai config title': (not bundle) or 'AI 配置世界书' in bundle,
    'bundle includes teleport runtime after build': (not bundle) or 'Teleport' in bundle or 'teleport' in bundle,
}
for name, ok in checks.items():
    print(('PASS' if ok else 'FAIL'), name)
if not all(checks.values()):
    raise SystemExit(1)
