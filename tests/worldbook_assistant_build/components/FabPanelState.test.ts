import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('worldbook assistant FAB panel state', () => {
  it('synchronizes a recreated FAB with the current panel visibility', () => {
    const source = readFileSync('src/worldbook_assistant_build/index.ts', 'utf8');
    const createFabBody = source.match(/function createFab\(\): void \{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(createFabBody).toMatch(/fab\.classList\.toggle\('panel-open',\s*isPanelVisible\);/);
    expect(createFabBody).toMatch(/fab\.textContent\s*=\s*isPanelVisible\s*\?\s*'✕'\s*:\s*'📖';/);
  });
});
