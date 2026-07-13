#!/usr/bin/env python3
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
webpack = (root / 'webpack.config.ts').read_text(encoding='utf-8')
package = json.loads((root / 'package.json').read_text(encoding='utf-8'))
gitignore = (root / '.gitignore').read_text(encoding='utf-8')

verify_runner_path = root / 'scripts/verify-worldbook-build.py'
verify_runner = verify_runner_path.read_text(encoding='utf-8') if verify_runner_path.is_file() else ''
vitest_config = root / 'vitest.config.ts'
vitest_config_text = vitest_config.read_text(encoding='utf-8') if vitest_config.is_file() else ''

checks = {
    'webpack supports worldbook-only entry selection': 'WORLD_BOOK_ONLY' in webpack and 'src/worldbook_assistant_build/index.ts' in webpack,
    'webpack supports disabling worldbook source maps': 'WORLD_BOOK_SOURCE_MAP' in webpack,
    'package exposes build:worldbook': 'build:worldbook' in package.get('scripts', {}),
    'package exposes verify:worldbook': 'verify:worldbook' in package.get('scripts', {}),
    'package exposes test:worldbook-domain': 'test:worldbook-domain' in package.get('scripts', {}),
    'package exposes test:worldbook-composables': 'test:worldbook-composables' in package.get('scripts', {}),
    'vitest is a development dependency': 'vitest' in package.get('devDependencies', {}),
    'vitest config exists': vitest_config.is_file(),
    'vitest config collects composable tests': 'composables' in vitest_config_text,
    'source maps are ignored': '*.map' in gitignore,
    'verification runner exists': verify_runner_path.is_file(),
    'verification runner executes domain tests': 'test:worldbook-domain' in verify_runner,
    'verification runner executes composable tests': 'test:worldbook-composables' in verify_runner,
}

failed = False
for label, passed in checks.items():
    print(('PASS' if passed else 'FAIL'), label)
    failed |= not passed

raise SystemExit(1 if failed else 0)
