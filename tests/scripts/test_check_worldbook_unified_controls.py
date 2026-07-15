from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'scripts/check-worldbook-unified-controls.py'
SPEC = importlib.util.spec_from_file_location('check_worldbook_unified_controls', SCRIPT)
assert SPEC and SPEC.loader
GUARD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(GUARD)


class UnifiedControlGuardTest(unittest.TestCase):
    def write_vue(self, source: str) -> Path:
        directory = Path(self.tempdir.name)
        path = directory / 'Fixture.vue'
        path.write_text(source, encoding='utf-8')
        return path

    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory(dir=ROOT)
        self.addCleanup(self.tempdir.cleanup)

    def violations(self, source: str) -> list[str]:
        return GUARD.native_control_violations(self.write_vue(source))

    def test_scans_past_nested_template_blocks(self) -> None:
        violations = self.violations(
            '''<template>\n  <template v-if="ready">\n    <BaseButton />\n  </template>\n  <button>late violation</button>\n</template>\n'''
        )

        self.assertEqual(len(violations), 1)
        self.assertIn(':5: native <button>', violations[0])

    def test_reports_source_line_when_script_precedes_template(self) -> None:
        violations = self.violations(
            '''<script setup lang="ts">\nconst ready = true;\n</script>\n\n<template>\n  <textarea />\n</template>\n'''
        )

        self.assertEqual(len(violations), 1)
        self.assertIn(':6: native <textarea>', violations[0])

    def test_permits_multiline_classified_input(self) -> None:
        violations = self.violations(
            '''<template>\n  <input\n    type="file"\n  />\n</template>\n'''
        )

        self.assertEqual(violations, [])

    def test_exception_only_applies_to_the_immediately_following_control(self) -> None:
        violations = self.violations(
            '''<template>\n  <!-- unified-control-exception: browser file picker --><input type="file" /><button>not exempt</button>\n</template>\n'''
        )

        self.assertEqual(len(violations), 1)
        self.assertIn(':2: native <button>', violations[0])

    def test_ignores_template_like_strings_in_script(self) -> None:
        violations = self.violations(
            '''<script setup lang="ts">\nconst sample = '<template><div /></template>';\n</script>\n<template>\n  <button>real violation</button>\n</template>\n'''
        )

        self.assertEqual(len(violations), 1)
        self.assertIn(':5: native <button>', violations[0])

    def test_ignores_template_closing_text_and_native_examples_in_comments(self) -> None:
        violations = self.violations(
            '''<template>\n  <!-- docs mention </template> and <button>example</button> here -->\n  <button>real violation</button>\n</template>\n'''
        )

        self.assertEqual(len(violations), 1)
        self.assertIn(':3: native <button>', violations[0])

    def test_ignores_unclosed_comment_opener_in_script_string(self) -> None:
        violations = self.violations(
            '''<script setup lang="ts">\nconst sample = '<!--';\n</script>\n<template>\n  <!-- ordinary template comment -->\n  <button>real violation</button>\n</template>\n'''
        )

        self.assertEqual(len(violations), 1)
        self.assertIn(':6: native <button>', violations[0])


if __name__ == '__main__':
    unittest.main()
