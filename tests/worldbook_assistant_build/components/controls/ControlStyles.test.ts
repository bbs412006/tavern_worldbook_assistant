import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(
  fileURLToPath(new URL('../../../../src/worldbook_assistant_build/App.vue', import.meta.url)),
  'utf8',
);

function cssRule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = appSource.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  expect(match, `missing CSS rule: ${selector}`).not.toBeNull();
  return match?.[1] ?? '';
}

describe('worldbook control CSS contracts', () => {
  it('removes obsolete native-form compatibility overrides after migration', () => {
    expect(appSource).not.toContain('.wb-assistant-root input[type="text"]:not(.wb-control)');
    expect(appSource).not.toContain('.wb-assistant-root textarea:not(.wb-control)');
    expect(appSource).not.toContain('.wb-assistant-root select:focus');
    expect(appSource).toContain('.wb-assistant-root :deep(.wb-control:focus-visible)');
  });

  it.each([
    ['sm', '--wb-control-height-sm'],
    ['md', '--wb-control-height-md'],
    ['lg', '--wb-control-height-lg'],
  ])('makes %s icon-only buttons square', (size, token) => {
    const rule = cssRule(`.wb-assistant-root :deep(.wb-control-button.wb-control--${size}.is-icon-only)`);
    expect(rule).toContain(`width: var(${token})`);
    expect(rule).toContain(`min-width: var(${token})`);
  });

  it('raises regular md icon-only controls to a square 40px coarse-pointer target', () => {
    expect(appSource).toMatch(
      /@media \(pointer: coarse\)[\s\S]*?\.wb-assistant-root :deep\(\.wb-control-button\.wb-control--md\.is-icon-only\)\s*\{[^}]*width: 40px;[^}]*min-width: 40px;/,
    );
  });

  it('disables compatibility button motion and glow pulse for reduced motion', () => {
    expect(appSource).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.wb-assistant-root \.btn\s*\{[^}]*transition: none;[^}]*transform: none;/,
    );
    expect(appSource).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.wb-assistant-root \.btn:hover:not\(:disabled\),[\s\S]*?\.wb-assistant-root \.btn:active:not\(:disabled\)\s*\{[^}]*transform: none;/,
    );
    expect(appSource).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.wb-assistant-root \.btn\.glow-pulse\s*\{[^}]*animation: none;/,
    );
  });

  it('derives semantic danger tokens from existing theme variables without new hardcoded danger colors', () => {
    const tokens = cssRule('.wb-assistant-root');
    const danger = cssRule('.wb-assistant-root :deep(.wb-control-button--danger)');

    expect(tokens).toContain('--wb-control-danger: var(--wb-danger, var(--wb-primary))');
    expect(tokens).toContain('--wb-control-danger-contrast: var(--wb-danger-contrast, var(--wb-text-main))');
    expect(danger).toContain('var(--wb-control-danger-border)');
    expect(danger).toContain('var(--wb-control-danger-soft)');
    expect(danger).toContain('var(--wb-control-danger-contrast)');
    expect(danger).not.toMatch(/#e11d48|#f43f5e/);
  });
});
