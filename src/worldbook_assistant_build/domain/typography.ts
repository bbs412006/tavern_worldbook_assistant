export type TypographyScope = 'entries' | 'interface';
export type FontFamilyPreference = 'default' | 'sans' | 'serif' | 'rounded' | 'mono';

export interface TypographyPreferences {
  scope: TypographyScope;
  family: FontFamilyPreference;
  size: number | null;
  weight: number | null;
  color: string | null;
  line_height: number | null;
  title_weight: number | null;
  title_color: string | null;
  content_weight: number | null;
  content_color: string | null;
}

export const FONT_FAMILIES: Record<Exclude<FontFamilyPreference, 'default'>, string> = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  serif: '"Songti SC", "Noto Serif CJK SC", "SimSun", serif',
  rounded: '"Arial Rounded MT Bold", "PingFang SC", "Microsoft YaHei", sans-serif',
  mono: 'ui-monospace, "SFMono-Regular", Consolas, "Microsoft YaHei", monospace',
};

export function createDefaultTypography(): TypographyPreferences {
  return {
    scope: 'entries',
    family: 'default',
    size: null,
    weight: null,
    color: null,
    line_height: null,
    title_weight: null,
    title_color: null,
    content_weight: null,
    content_color: null,
  };
}

const VALID_WEIGHTS = [400, 500, 600, 700, 800];

function normalizeWeight(value: unknown): number | null {
  return typeof value === 'number' && VALID_WEIGHTS.includes(value) ? value : null;
}

function normalizeColor(value: unknown): string | null {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : null;
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
  const weight = normalizeWeight(raw.weight);
  const color = normalizeColor(raw.color);
  const lineHeight = typeof raw.line_height === 'number' && Number.isFinite(raw.line_height)
    ? Math.round(Math.min(2.2, Math.max(1.2, raw.line_height)) * 10) / 10
    : null;

  const title_weight = normalizeWeight(raw.title_weight);
  const title_color = normalizeColor(raw.title_color);
  const content_weight = normalizeWeight(raw.content_weight);
  const content_color = normalizeColor(raw.content_color);

  return {
    scope,
    family,
    size,
    weight,
    color,
    line_height: lineHeight,
    title_weight,
    title_color,
    content_weight,
    content_color,
  };
}

export function typographyStyle(preferences: TypographyPreferences): Record<string, string> {
  const style: Record<string, string> = {};
  if (preferences.family !== 'default') style['--wb-user-font-family'] = FONT_FAMILIES[preferences.family];
  if (preferences.size !== null) style['--wb-user-font-size'] = `${preferences.size}px`;
  if (preferences.weight !== null) style['--wb-user-font-weight'] = String(preferences.weight);
  if (preferences.color !== null) style['--wb-user-font-color'] = preferences.color;
  if (preferences.line_height !== null) style['--wb-user-line-height'] = String(preferences.line_height);

  const effectiveTitleWeight = preferences.title_weight ?? preferences.weight;
  if (effectiveTitleWeight !== null) style['--wb-user-title-font-weight'] = String(effectiveTitleWeight);
  const effectiveTitleColor = preferences.title_color ?? preferences.color;
  if (effectiveTitleColor !== null) style['--wb-user-title-font-color'] = effectiveTitleColor;

  const effectiveContentWeight = preferences.content_weight ?? preferences.weight;
  if (effectiveContentWeight !== null) style['--wb-user-content-font-weight'] = String(effectiveContentWeight);
  const effectiveContentColor = preferences.content_color ?? preferences.color;
  if (effectiveContentColor !== null) style['--wb-user-content-font-color'] = effectiveContentColor;

  return style;
}
