from pathlib import Path

root = Path(__file__).resolve().parents[1]
webpack = (root / 'webpack.config.ts').read_text(encoding='utf-8')
app = (root / 'src/worldbook_assistant_build/App.vue').read_text(encoding='utf-8')
settings = (root / 'src/worldbook_assistant_build/components/SettingsModal.vue').read_text(encoding='utf-8')
version_module_path = root / 'src/worldbook_assistant_build/domain/version.ts'
version_module = version_module_path.read_text(encoding='utf-8') if version_module_path.exists() else ''

checks = {
    'webpack defines build commit': '__WB_ASSISTANT_BUILD_COMMIT__' in webpack,
    'webpack defines build branch': '__WB_ASSISTANT_BUILD_BRANCH__' in webpack,
    'webpack defines build time': '__WB_ASSISTANT_BUILD_TIME__' in webpack,
    'version module exists': version_module_path.exists(),
    'version module declares semantic version': "APP_VERSION = '1.3.4'" in version_module,
    'version module exports semver helpers': 'export function normalizeVersionTag' in version_module and 'export function compareSemver' in version_module,
    'version module exports import url builder': 'export function buildVersionImportUrl' in version_module and "@${version}" in version_module and 'VERSION_BUNDLE_PATH' in version_module,
    'app imports version helpers': "from './domain/version'" in app and 'APP_VERSION' in app and 'compareSemver' in app,
    'app checks latest semantic tag': 'checkLatestVersion' in app and 'api.github.com/repos' in app and '/tags?per_page=100' in app,
    'settings shows version section': '版本与更新' in settings,
    'settings emits version events': 'check-latest-version' in settings and 'copy-version-import-url' in settings,
}
failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(('PASS' if ok else 'FAIL'), name)
if failed:
    raise SystemExit(1)
