from __future__ import annotations

import importlib.util
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'scripts/check-worldbook-quality-gates.py'
SPEC = importlib.util.spec_from_file_location('check_worldbook_quality_gates', SCRIPT)
assert SPEC and SPEC.loader
GUARD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(GUARD)


class WorldbookQualityGateGuardTest(unittest.TestCase):
    def test_requires_typecheck_lint_ci_and_e2e_links(self) -> None:
        checks = GUARD.collect_checks(ROOT)

        required = {
            'package exposes lint:worldbook',
            'package exposes typecheck:worldbook',
            'package pins pnpm 10.12.4',
            'worldbook typecheck uses vue-tsc',
            'worldbook typecheck includes App.vue',
            'worldbook generated type declarations are tracked inputs',
            'package exposes test:worldbook-e2e',
            'package exposes CI bundle consistency verification',
            'verification runner executes lint',
            'verification runner executes typecheck',
            'verification runner executes host e2e',
            'verification runner supports pnpm without corepack',
            'verification runner restores generated build inputs',
            'worldbook typecheck config exists',
            'worldbook host e2e config exists',
            'worldbook host e2e has no machine-specific browser path',
            'worldbook CI workflow exists',
            'CI runs canonical worldbook verification',
            'CI installs Chromium for host E2E',
            'CI reports repository cleanliness diffs',
            'bundle verifier normalizes every embedded build metadata occurrence',
            'worldbook build time is reproducible',
            'worldbook runtime externals are version pinned',
        }
        self.assertTrue(required.issubset(checks))
        self.assertTrue(all(checks[label] for label in required))

    def test_generated_type_declarations_must_be_tracked_and_not_ignored(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            subprocess.run(['git', 'init', '-q'], cwd=root, check=True)
            for filename in ('auto-imports.d.ts', 'components.d.ts'):
                (root / filename).write_text('export {}\n', encoding='utf-8')
            subprocess.run(['git', 'add', '-f', 'auto-imports.d.ts', 'components.d.ts'], cwd=root, check=True)

            self.assertTrue(GUARD.tracked_and_not_ignored(root, 'auto-imports.d.ts'))
            self.assertTrue(GUARD.tracked_and_not_ignored(root, 'components.d.ts'))

            (root / '.gitignore').write_text('*.d.ts\n', encoding='utf-8')
            self.assertFalse(GUARD.tracked_and_not_ignored(root, 'auto-imports.d.ts'))
            self.assertFalse(GUARD.tracked_and_not_ignored(root, 'components.d.ts'))

            subprocess.run(
                ['git', 'rm', '--cached', 'components.d.ts'],
                cwd=root,
                check=True,
                stdout=subprocess.DEVNULL,
            )
            (root / '.gitignore').write_text('', encoding='utf-8')
            self.assertFalse(GUARD.tracked_and_not_ignored(root, 'components.d.ts'))


if __name__ == '__main__':
    unittest.main()
