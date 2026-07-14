// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import AIConfigPage from '../../../src/worldbook_assistant_build/components/AIConfigPage.vue';

const settingsSource = readFileSync(
  resolve(process.cwd(), 'src/worldbook_assistant_build/components/SettingsPage.vue'),
  'utf8',
);
const aiConfigSource = readFileSync(
  resolve(process.cwd(), 'src/worldbook_assistant_build/components/AIConfigPage.vue'),
  'utf8',
);
function getRule(source: string, selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, 's'));

  expect(match, `missing CSS rule for ${selector}`).not.toBeNull();
  return match?.[1] ?? '';
}

function expectDeclarations(rule: string, declarations: Record<string, string>): void {
  for (const [property, value] of Object.entries(declarations)) {
    expect(rule).toMatch(new RegExp(`${property}\\s*:\\s*${value}(?:\\s*!important)?\\s*;`));
  }
}

function expectReducedMotionContract(source: string): void {
  const media = source.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/);

  expect(media, 'missing reduced-motion media query').not.toBeNull();
  expectDeclarations(media?.[1] ?? '', {
    'animation-duration': '0\\.01ms',
    'animation-iteration-count': '1',
    'transition-duration': '0\\.01ms',
  });
}

function mountAIConfigPage(preview = false) {
  return mount(AIConfigPage, {
    props: {
      worldbookNames: ['世界书 A'],
      targetWorldbook: '世界书 A',
      input: '调整条目配置',
      customPrompt: '',
      changes: preview
        ? [{ name: '条目一', label: '常驻', oldValue: '否', newValue: '是', selected: true }]
        : [],
      preview,
      generating: false,
    },
  });
}

describe('utility page motion and scrolling contracts', () => {
  it.each([
    ['SettingsPage', settingsSource, '1'],
    ['AIConfigPage', aiConfigSource, '1 1 auto'],
  ])('%s keeps root overflow internal and declares the full scroll contract', (_name, source, flex) => {
    expectDeclarations(getRule(source, '.utility-page'), {
      'min-height': '0',
      overflow: 'hidden',
    });
    expectDeclarations(getRule(source, '.utility-page-body'), {
      flex,
      'min-height': '0',
      'overflow-y': 'auto',
      'overscroll-behavior': 'contain',
      '-webkit-overflow-scrolling': 'touch',
      'box-sizing': 'border-box',
    });
  });

  it.each([
    ['SettingsPage', settingsSource],
    ['AIConfigPage', aiConfigSource],
  ])('%s declares its own reduced-motion fallback', (_name, source) => {
    expectReducedMotionContract(source);
  });

  it('keeps the AI preview as a contained horizontal scroller', () => {
    const preview = mountAIConfigPage(true);
    const previewRule = getRule(aiConfigSource, '.preview-table-wrap');

    expect(preview.findAll('.preview-table-wrap')).toHaveLength(1);
    expectDeclarations(previewRule, {
      'min-width': '0',
      'overflow-x': 'auto',
      'overflow-y': 'hidden',
      'overscroll-behavior-x': 'contain',
      '-webkit-overflow-scrolling': 'touch',
    });
  });

  it.each([
    ['SettingsPage', settingsSource, '.utility-page-content'],
    ['AIConfigPage', aiConfigSource, '.utility-page-body'],
  ])('%s keeps utility content constrained against horizontal clipping', (_name, source, selector) => {
    expectDeclarations(getRule(source, selector), {
      width: 'min\\(100%,\\s*\\d+px\\)',
      'min-width': '0',
    });
  });

  it('keeps primary AI mobile actions at least 40px tall with unified buttons', () => {
    expect(aiConfigSource).toMatch(
      /@media\s*\(max-width:\s*640px\)[\s\S]*?\.utility-actions \.wb-control-button\s*\{[^}]*min-height:\s*40px;/,
    );
  });

  it('keeps the AI target worldbook on the custom select layer', () => {
    const input = mountAIConfigPage();

    expect(input.find('[role="combobox"]').exists()).toBe(true);
    expect(input.find('select').exists()).toBe(false);
  });
});
