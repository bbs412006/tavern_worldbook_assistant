import { describe, expect, it } from 'vitest';
import { createDefaultPersistedState, normalizePersistedState } from '../../../src/worldbook_assistant_build/domain/persistedState';
import { createDefaultTypography, normalizeTypography, typographyStyle } from '../../../src/worldbook_assistant_build/domain/typography';

describe('typography preferences', () => {
  it('keeps the existing look for older saved states and preserves unrelated state', () => {
    const state = normalizePersistedState({ theme: 'pine_dark', custom_future_field: 'kept' });
    expect(state.typography).toEqual(createDefaultTypography());
    expect(createDefaultPersistedState().typography).toEqual(createDefaultTypography());
    expect(state.theme).toBe('pine_dark');
    expect(state.custom_future_field).toBe('kept');
    expect(typographyStyle(state.typography)).toEqual({});
  });

  it('normalizes supported values and rejects unsafe CSS values', () => {
    expect(normalizeTypography({ family: 'serif', size: 99, weight: 700, color: '#A1B2C3', line_height: 0.4 })).toEqual({
      scope: 'entries', family: 'serif', size: 28, weight: 700, color: '#a1b2c3', line_height: 1.2,
    });
    expect(normalizeTypography({ family: 'url(evil)', size: '20px', weight: 123, color: 'red; display:none', line_height: Infinity }))
      .toEqual(createDefaultTypography());
  });

  it('returns only selected CSS variables and round-trips saved settings', () => {
    const saved = normalizePersistedState({ typography: { family: 'mono', size: 20, weight: 600, color: '#245678', line_height: 1.8 } });
    expect(normalizePersistedState(JSON.parse(JSON.stringify(saved))).typography).toEqual(saved.typography);
    expect(typographyStyle(saved.typography)).toMatchObject({
      '--wb-user-font-size': '20px', '--wb-user-font-weight': '600', '--wb-user-font-color': '#245678', '--wb-user-line-height': '1.8',
    });
    expect(typographyStyle(saved.typography)['--wb-user-font-family']).toContain('monospace');
  });
});
