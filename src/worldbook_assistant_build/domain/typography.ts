export type TypographyScope = 'entries' | 'interface';
export type FontFamilyPreference = 'default' | 'sans' | 'serif' | 'rounded' | 'mono';

export interface TypographyPreferences {
  scope: TypographyScope;
  family: FontFamilyPreference;
  size: number | null;
  weight: number | null;
  color: string | null;
  line_height: number | null;
}

export const FONT_FAMILIES: Record<Exclude<FontFamilyPreference, 'default'>, string> = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  serif: '"Songti SC", "Noto Serif CJK SC", "SimSun", serif',
  rounded: '"Arial Rounded MT Bold", "PingFang SC", "Microsoft YaHei", sans-serif',
  mono: 'ui-monospace, "SFMono-Regular", Consolas, "Microsoft YaHei", monospace',
};

export function createDefaultTypography(): TypographyPreferences {
  return { scope: 'entries', family: 'default', size: null, weight: null, color: null, line_height: null };
}

export function normalizeTypography(input: unknown): TypographyPreferences {
  const raw = input && typeof input === 'object' && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {};
  const scope: TypographyScope = raw.scope === 'interface' ? 'interface' : 'entries';
  const family = typeof raw.family === 'string' && (raw.family === 'default' || Object.prototype.hasOwnProperty.call(FONT_FAMILIES, raw.family))
    ? raw.family as FontFamilyPreference
    : 'default';
  const size = typeof raw.size === 'number' && Number.isFinite(raw.size)
    ? Math.min(28, Math.max(12, Math.round(raw.size)))
    : null;
  const weight = typeof raw.weight === 'number' && [400, 500, 600, 700, 800].includes(raw.weight)
    ? raw.weight
    : null;
  const color = typeof raw.color === 'string' && /^#[0-9a-f]{6}$/i.test(raw.color)
    ? raw.color.toLowerCase()
    : null;
  const lineHeight = typeof raw.line_height === 'number' && Number.isFinite(raw.line_height)
    ? Math.round(Math.min(2.2, Math.max(1.2, raw.line_height)) * 10) / 10
    : null;
  return { scope, family, size, weight, color, line_height: lineHeight };
}

export function typographyStyle(preferences: TypographyPreferences): Record<string, string> {
  const style: Record<string, string> = {};
  if (preferences.family !== 'default') style['--wb-user-font-family'] = FONT_FAMILIES[preferences.family];
  if (preferences.size !== null) style['--wb-user-font-size'] = `${preferences.size}px`;
  if (preferences.weight !== null) style['--wb-user-font-weight'] = String(preferences.weight);
  if (preferences.color !== null) style['--wb-user-font-color'] = preferences.color;
  if (preferences.line_height !== null) style['--wb-user-line-height'] = String(preferences.line_height);
  return style;
}
