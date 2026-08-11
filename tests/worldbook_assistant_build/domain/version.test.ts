import { describe, expect, it } from 'vitest';

import {
  APP_VERSION,
  VERSION_BUNDLE_PATH,
  VERSION_REPO_NAME,
  VERSION_REPO_OWNER,
  buildVersionImportUrl,
  compareSemver,
  normalizeVersionTag,
} from '../../../src/worldbook_assistant_build/domain/version';

describe('version domain', () => {
  it('reports the mobile-list-review-fix release version', () => {
    expect(APP_VERSION).toBe('2.2.6');
  });

  it('normalizes whitespace and a leading v prefix', () => {
    expect(normalizeVersionTag('  v2.0.1 ')).toBe('2.0.1');
    expect(normalizeVersionTag('V1.3.3')).toBe('1.3.3');
  });

  it('orders semantic versions numerically instead of lexically', () => {
    expect(compareSemver('1.10.0', '1.9.9')).toBeGreaterThan(0);
    expect(compareSemver('2.0.0', '10.0.0')).toBeLessThan(0);
    expect(compareSemver('v2.0.1', '2.0.1')).toBe(0);
  });

  it('treats missing semantic components as zero', () => {
    expect(compareSemver('2.1', '2.1.0')).toBe(0);
    expect(compareSemver('2', '2.0.1')).toBeLessThan(0);
  });

  it('builds a pinned jsDelivr import URL', () => {
    const version = '9.8.7';
    expect(buildVersionImportUrl(version)).toBe(
      `https://cdn.jsdelivr.net/gh/${VERSION_REPO_OWNER}/${VERSION_REPO_NAME}@${version}/${VERSION_BUNDLE_PATH}`,
    );
    expect(buildVersionImportUrl()).toContain(`@${APP_VERSION}/`);
  });
});
