import { describe, expect, it } from 'vitest';

import {
  buildConfigSystemPrompt,
  cleanupJsonArrayText,
  extractJsonArray,
  stripAiReasoningBlocks,
} from '../../../src/worldbook_assistant_build/domain/aiConfig';
import { normalizeEntry } from '../../../src/worldbook_assistant_build/domain/persistedState';

describe('AI config domain', () => {
  it('uses a custom prompt unless the default is forced', () => {
    const entries = [normalizeEntry({ uid: 1, name: 'Alpha' }, 1)];

    expect(buildConfigSystemPrompt(entries, ' custom prompt ')).toBe(' custom prompt ');
    expect(buildConfigSystemPrompt(entries, 'custom prompt', true)).toContain('世界书条目配置助手');
  });

  it('lists each available entry name once in the default prompt', () => {
    const entries = [
      normalizeEntry({ uid: 1, name: 'Alpha' }, 1),
      normalizeEntry({ uid: 2, name: 'Alpha' }, 2),
      normalizeEntry({ uid: 3, name: 'Beta' }, 3),
    ];
    const prompt = buildConfigSystemPrompt(entries);
    const availableSection = prompt.split('## 可用条目\n')[1].split('\n\n## JSON Schema')[0];

    expect(availableSection).toBe('"Alpha", "Beta"');
  });

  it('removes reasoning blocks, comments, fences, line comments, and trailing commas', () => {
    expect(stripAiReasoningBlocks('<thinking>secret</thinking><!-- hidden -->visible')).toBe('visible');
    expect(cleanupJsonArrayText('```json\n[{"name":"Alpha", // comment\n}]\n```')).toBe('[{"name":"Alpha"}]');
  });

  it('prefers the last tagged payload and cleans its JSON', () => {
    const result = extractJsonArray(
      '<worldbook_config>[{"name":"Old"}]</worldbook_config> text ' +
        '<worldbook_config>```json\n[{"name":"New",}]\n```</worldbook_config>',
    );

    expect(result).toEqual({ ok: true, json: '[{"name":"New"}]' });
  });

  it('falls back to fenced or raw JSON arrays and reports missing payloads', () => {
    expect(extractJsonArray('```json\n[{"name":"Fenced"}]\n```')).toEqual({
      ok: true,
      json: '[{"name":"Fenced"}]',
    });
    expect(extractJsonArray('prefix [{"name":"Raw"}] suffix')).toEqual({
      ok: true,
      json: '[{"name":"Raw"}]',
    });
    expect(extractJsonArray('no configuration here')).toEqual({ ok: false, json: '' });
  });
});
