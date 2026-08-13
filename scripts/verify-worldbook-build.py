#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
import shutil
import os
import re
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TARGET_BUNDLE = Path('dist/worldbook_assistant_build/index.js')
ALLOWED_DIST_PATHS = {TARGET_BUNDLE.as_posix()}


def run(command: list[str], *, env: dict[str, str] | None = None) -> None:
    print(f"\n$ {' '.join(command)}", flush=True)
    subprocess.run(command, cwd=ROOT, check=True, env=env)


def changed_dist_paths() -> list[str]:
    result = subprocess.run(
        ['git', 'status', '--porcelain=v1', '--untracked-files=all', '--', 'dist'],
        cwd=ROOT,
        check=True,
        text=True,
        capture_output=True,
    )
    return [line[3:] for line in result.stdout.splitlines() if line.strip()]


def normalized_bundle(path: Path) -> str:
    content = path.read_text(encoding='utf-8')
    content = re.sub(r"\}\}\}\('[^']+','[^']+'\),", "}}}('[BUILD_COMMIT]','[BUILD_TIME]'),", content, count=1)
    content = re.sub(
        r"!0===globalThis\.__WB_ASSISTANT_ENABLE_PERFORMANCE_DIAGNOSTICS__\|\|'[^']*'\.includes\('debug'\)",
        "!0===globalThis.__WB_ASSISTANT_ENABLE_PERFORMANCE_DIAGNOSTICS__||'[BUILD_BRANCH]'.includes('debug')",
        content,
        count=1,
    )
    return content


def main() -> None:
    require_clean_bundle = '--check-bundle-clean' in sys.argv[1:]
    pnpm = ['corepack', 'pnpm'] if shutil.which('corepack') else ['pnpm']
    build_env = os.environ.copy()
    if require_clean_bundle:
        committed_bundle = subprocess.run(
            ['git', 'show', f'HEAD:{TARGET_BUNDLE.as_posix()}'],
            cwd=ROOT,
            check=True,
            capture_output=True,
        ).stdout.decode('utf-8')
        metadata = re.search(r"\}\}\}\('([^']+)','([^']+)'\),", committed_bundle)
        if not metadata:
            raise SystemExit('Unable to read build metadata from the tracked worldbook bundle')
        build_env['WB_BUILD_COMMIT'] = metadata.group(1)
        build_env['WB_BUILD_TIME'] = metadata.group(2)
        build_env['WB_BUILD_BRANCH'] = 'ST-Manager-STscript'
    checks = [
        'scripts/check-worldbook-build-hygiene.py',
        'scripts/check-worldbook-quality-gates.py',
        'scripts/check-domain-modules.py',
        # This guard intentionally stays early so missing inline utility pages
        # fail before domain tests or a production build can mask the regression.
        'scripts/check-settings-ai-modals.py',
        'scripts/check-worldbook-performance.py',
        'scripts/check-worldbook-unified-controls.py',
        'scripts/check-worldbook-version-feature.py',
        'scripts/check-worldbook-debug-diagnostics.py',
    ]
    for check in checks:
        run(['python3', check])

    run(['python3', '-m', 'unittest', 'tests/scripts/test_check_worldbook_unified_controls.py'])
    run(['python3', '-m', 'unittest', 'tests/scripts/test_check_worldbook_quality_gates.py'])
    run([*pnpm, 'lint:worldbook'])
    run([*pnpm, 'typecheck:worldbook'])
    run([*pnpm, 'test:worldbook-domain'])
    run([*pnpm, 'test:worldbook-components'])
    run([*pnpm, 'test:worldbook-composables'])
    tracked_bundle = (ROOT / TARGET_BUNDLE).read_bytes() if require_clean_bundle else None
    run([*pnpm, 'build:worldbook'], env=build_env)

    if require_clean_bundle and tracked_bundle is not None:
        with tempfile.NamedTemporaryFile(suffix='.js', delete=False) as tracked_file:
            tracked_file.write(tracked_bundle)
            tracked_path = Path(tracked_file.name)
        try:
            if normalized_bundle(tracked_path) != normalized_bundle(ROOT / TARGET_BUNDLE):
                raise SystemExit('Tracked worldbook bundle is stale; rebuild and commit dist/worldbook_assistant_build/index.js')
        finally:
            tracked_path.unlink(missing_ok=True)
        (ROOT / TARGET_BUNDLE).write_bytes(tracked_bundle)

    run([*pnpm, 'test:worldbook-e2e'])

    maps = sorted((ROOT / 'dist').rglob('*.map'))
    for source_map in maps:
        source_map.unlink()
    if maps:
        print(f"Removed {len(maps)} generated source map(s).")

    run(['node', '--check', TARGET_BUNDLE.as_posix()])


    unexpected = sorted(set(changed_dist_paths()) - ALLOWED_DIST_PATHS)
    if unexpected:
        formatted = '\n'.join(f'  - {path}' for path in unexpected)
        raise SystemExit(f'Unexpected dist changes detected:\n{formatted}')

    remaining_maps = sorted((ROOT / 'dist').rglob('*.map'))
    if remaining_maps:
        formatted = '\n'.join(f'  - {path.relative_to(ROOT)}' for path in remaining_maps)
        raise SystemExit(f'Source maps remain after verification:\n{formatted}')

    print('\nWorldbook build verification passed.')


if __name__ == '__main__':
    main()