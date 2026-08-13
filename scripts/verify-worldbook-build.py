#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
import shutil
import os
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


def main() -> None:
    require_clean_bundle = '--check-bundle-clean' in sys.argv[1:]
    pnpm = ['corepack', 'pnpm'] if shutil.which('corepack') else ['pnpm']
    build_env = os.environ.copy()
    if require_clean_bundle:
        build_env['WB_BUILD_COMMIT'] = subprocess.run(
            ['git', 'log', '-1', '--format=%h', '--', TARGET_BUNDLE.as_posix()],
            cwd=ROOT,
            check=True,
            text=True,
            capture_output=True,
        ).stdout.strip()
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
    run([*pnpm, 'build:worldbook'], env=build_env)
    run([*pnpm, 'test:worldbook-e2e'])

    maps = sorted((ROOT / 'dist').rglob('*.map'))
    for source_map in maps:
        source_map.unlink()
    if maps:
        print(f"Removed {len(maps)} generated source map(s).")

    run(['node', '--check', TARGET_BUNDLE.as_posix()])

    if require_clean_bundle:
        result = subprocess.run(
            ['git', 'status', '--porcelain=v1', '--', TARGET_BUNDLE.as_posix()],
            cwd=ROOT,
            check=True,
            text=True,
            capture_output=True,
        )
        if result.stdout.strip():
            raise SystemExit('Tracked worldbook bundle is stale; rebuild and commit dist/worldbook_assistant_build/index.js')

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