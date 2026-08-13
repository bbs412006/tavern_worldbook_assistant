#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
from pathlib import Path


def tracked_and_not_ignored(root: Path, relative_path: str) -> bool:
    tracked = subprocess.run(
        ['git', 'ls-files', '--error-unmatch', '--', relative_path],
        cwd=root,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    ).returncode == 0
    ignored = subprocess.run(
        ['git', 'check-ignore', '-q', '--no-index', '--', relative_path],
        cwd=root,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    ).returncode == 0
    return tracked and not ignored


def collect_checks(root: Path) -> dict[str, bool]:
    package = json.loads((root / 'package.json').read_text(encoding='utf-8'))
    scripts = package.get('scripts', {})
    verifier_path = root / 'scripts/verify-worldbook-build.py'
    verifier = verifier_path.read_text(encoding='utf-8') if verifier_path.is_file() else ''
    typecheck_path = root / 'tsconfig.worldbook.json'
    e2e_config_path = root / 'playwright.worldbook.config.ts'
    workflow_path = root / '.github/workflows/worldbook-verify.yml'
    workflow = workflow_path.read_text(encoding='utf-8') if workflow_path.is_file() else ''
    webpack = (root / 'webpack.config.ts').read_text(encoding='utf-8')
    e2e_config = e2e_config_path.read_text(encoding='utf-8') if e2e_config_path.is_file() else ''
    typecheck = typecheck_path.read_text(encoding='utf-8') if typecheck_path.is_file() else ''

    return {
        'package exposes lint:worldbook': 'lint:worldbook' in scripts,
        'package exposes typecheck:worldbook': 'typecheck:worldbook' in scripts,
        'package pins pnpm 10.12.4': package.get('packageManager') == 'pnpm@10.12.4',
        'worldbook typecheck uses vue-tsc': scripts.get('typecheck:worldbook', '').startswith('vue-tsc '),
        'worldbook typecheck includes App.vue': 'src/worldbook_assistant_build/**/*.vue' in typecheck,
        'worldbook generated type declarations are tracked inputs': (
            tracked_and_not_ignored(root, 'auto-imports.d.ts')
            and tracked_and_not_ignored(root, 'components.d.ts')
        ),
        'package exposes test:worldbook-e2e': 'test:worldbook-e2e' in scripts,
        'package exposes CI bundle consistency verification': 'verify:worldbook:ci' in scripts,
        'verification runner executes lint': 'lint:worldbook' in verifier,
        'verification runner executes typecheck': 'typecheck:worldbook' in verifier,
        'verification runner executes host e2e': 'test:worldbook-e2e' in verifier,
        'verification runner supports pnpm without corepack': "shutil.which('corepack')" in verifier,
        'verification runner restores generated build inputs': 'GENERATED_TYPE_DECLARATIONS' in verifier and 'Generated type declarations are stale' in verifier and "shutil.rmtree(ROOT / '.tmp_build_13'" in verifier,
        'worldbook typecheck config exists': typecheck_path.is_file(),
        'worldbook host e2e config exists': e2e_config_path.is_file(),
        'worldbook host e2e has no machine-specific browser path': '/opt/hermes/' not in e2e_config,
        'worldbook CI workflow exists': workflow_path.is_file(),
        'CI runs canonical worldbook verification': 'verify:worldbook:ci' in workflow,
        'CI installs Chromium for host E2E': 'playwright install --with-deps chromium' in workflow,
        'CI reports repository cleanliness diffs': 'git diff --stat' in workflow and '.tmp_build_13 auto-imports.d.ts components.d.ts' in workflow,
        'bundle verifier normalizes every embedded build metadata occurrence': "content.replace(commit, '[BUILD_COMMIT]')" in verifier and "content.replace(build_time, '[BUILD_TIME]')" in verifier,
        'worldbook build time is reproducible': 'resolve_worldbook_build_time()' in webpack,
        'worldbook runtime externals are version pinned': "klona: '2.0.6'" in webpack and "diff: '8.0.4'" in webpack,
    }


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    checks = collect_checks(root)
    failed = False
    for label, passed in checks.items():
        print(('PASS' if passed else 'FAIL'), label)
        failed |= not passed
    raise SystemExit(1 if failed else 0)


if __name__ == '__main__':
    main()
