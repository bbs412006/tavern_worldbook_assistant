#!/usr/bin/env python3
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
webpack = (root / 'webpack.config.ts').read_text(encoding='utf-8')
package = json.loads((root / 'package.json').read_text(encoding='utf-8'))
gitignore = (root / '.gitignore').read_text(encoding='utf-8')

checks = {
    'webpack supports worldbook-only entry selection': 'WORLD_BOOK_ONLY' in webpack and 'src/worldbook_assistant_build/index.ts' in webpack,
    'webpack supports disabling worldbook source maps': 'WORLD_BOOK_SOURCE_MAP' in webpack,
    'package exposes build:worldbook': 'build:worldbook' in package.get('scripts', {}),
    'package exposes verify:worldbook': 'verify:worldbook' in package.get('scripts', {}),
    'source maps are ignored': '*.map' in gitignore,
    'verification runner exists': (root / 'scripts/verify-worldbook-build.py').is_file(),
}

failed = False
for label, passed in checks.items():
    print(('PASS' if passed else 'FAIL'), label)
    failed |= not passed

raise SystemExit(1 if failed else 0)
