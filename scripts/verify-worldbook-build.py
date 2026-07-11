#!/usr/bin/env python3
from __future__ import annotations

import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TARGET_BUNDLE = Path('dist/worldbook_assistant_build/index.js')
ALLOWED_DIST_PATHS = {TARGET_BUNDLE.as_posix()}


def run(command: list[str]) -> None:
    print(f"\n$ {' '.join(command)}", flush=True)
    subprocess.run(command, cwd=ROOT, check=True)


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
    checks = [
        'scripts/check-worldbook-build-hygiene.py',
        'scripts/check-domain-modules.py',
        'scripts/check-settings-ai-modals.py',
        'scripts/check-worldbook-version-feature.py',
        'scripts/check-worldbook-debug-diagnostics.py',
    ]
    for check in checks:
        run(['python3', check])

    run(['corepack', 'pnpm', 'test:worldbook-domain'])
    run(['corepack', 'pnpm', 'build:worldbook'])

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