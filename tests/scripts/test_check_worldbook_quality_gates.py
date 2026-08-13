from __future__ import annotations

import importlib.util
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
            'package exposes test:worldbook-e2e',
            'package exposes CI bundle consistency verification',
            'verification runner executes lint',
            'verification runner executes typecheck',
            'verification runner executes host e2e',
            'verification runner supports pnpm without corepack',
            'worldbook typecheck config exists',
            'worldbook host e2e config exists',
            'worldbook CI workflow exists',
            'CI runs canonical worldbook verification',
            'CI installs Chromium for host E2E',
            'worldbook build time is reproducible',
            'worldbook runtime externals are version pinned',
        }
        self.assertTrue(required.issubset(checks))
        self.assertTrue(all(checks[label] for label in required))


if __name__ == '__main__':
    unittest.main()
