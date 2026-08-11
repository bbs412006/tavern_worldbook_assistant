export const APP_VERSION = '2.2.5';
export const VERSION_REPO_OWNER = 'bbs412006';
export const VERSION_REPO_NAME = 'tavern_worldbook_assistant';
export const VERSION_BRANCH = 'ST-Manager-STscript';
export const VERSION_BUNDLE_PATH = 'dist/worldbook_assistant_build/index.js';

export function normalizeVersionTag(value: string): string {
  return value.trim().replace(/^v/i, '');
}

export function compareSemver(left: string, right: string): number {
  const parse = (value: string) => normalizeVersionTag(value).split('.').map(part => Number.parseInt(part, 10) || 0);
  const leftParts = parse(left);
  const rightParts = parse(right);
  const length = Math.max(leftParts.length, rightParts.length, 3);
  for (let index = 0; index < length; index += 1) {
    const delta = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

export function buildVersionImportUrl(version = APP_VERSION): string {
  return `https://cdn.jsdelivr.net/gh/${VERSION_REPO_OWNER}/${VERSION_REPO_NAME}@${version}/${VERSION_BUNDLE_PATH}`;
}
