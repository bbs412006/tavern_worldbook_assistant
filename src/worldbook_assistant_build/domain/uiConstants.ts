export type ThemeKey = 'ocean' | 'nebula' | 'forest' | 'sunset' | 'coffee' | 'paper' | 'snow' | 'midnight';

export const THEMES: Record<ThemeKey, { name: string; label: string; colors: Record<string, string> }> = {
  ocean: {
    name: 'Ocean (Deep)',
    label: '深海',
    colors: {
      '--wb-bg-root': '#0b1120',
      '--wb-bg-panel': '#161f32',
      '--wb-text-main': '#f1f5f9',
      '--wb-text-muted': '#94a3b8',
      '--wb-primary': '#38bdf8',
      '--wb-primary-light': '#7dd3fc',
      '--wb-primary-hover': 'rgba(56, 189, 248, 0.15)',
      '--wb-primary-soft': 'rgba(56, 189, 248, 0.1)',
      '--wb-primary-glow': 'rgba(56, 189, 248, 0.4)',
      '--wb-input-bg': 'rgba(0, 0, 0, 0.25)',
      '--wb-input-bg-hover': 'rgba(0, 0, 0, 0.4)',
      '--wb-input-bg-focus': 'rgba(15, 23, 42, 0.8)',
      '--wb-border-subtle': 'rgba(255, 255, 255, 0.05)',
      '--wb-border-main': 'rgba(255, 255, 255, 0.1)',
      '--wb-shadow-main': '0 12px 32px rgba(0, 0, 0, 0.5)',
      '--wb-scrollbar-thumb': 'rgba(255, 255, 255, 0.15)',
      '--wb-glass-bg': 'rgba(20, 20, 20, 0.85)',
      '--wb-glass-header': 'rgba(0, 0, 0, 0.2)',
      '--wb-overlay-bg': 'rgba(0, 0, 0, 0.45)',
      '--wb-dropdown-bg': 'rgba(15, 15, 15, 0.7)',
    },
  },
  nebula: {
    name: 'Nebula (Dark)',
    label: '星云',
    colors: {
      '--wb-bg-root': '#130a1e',
      '--wb-bg-panel': '#1d122b',
      '--wb-text-main': '#f3e8ff',
      '--wb-text-muted': '#a855f7',
      '--wb-primary': '#c084fc',
      '--wb-primary-light': '#d8b4fe',
      '--wb-primary-hover': 'rgba(192, 132, 252, 0.15)',
      '--wb-primary-soft': 'rgba(192, 132, 252, 0.1)',
      '--wb-primary-glow': 'rgba(192, 132, 252, 0.4)',
      '--wb-input-bg': 'rgba(0, 0, 0, 0.25)',
      '--wb-input-bg-hover': 'rgba(0, 0, 0, 0.4)',
      '--wb-input-bg-focus': 'rgba(19, 10, 30, 0.8)',
      '--wb-border-subtle': 'rgba(255, 255, 255, 0.05)',
      '--wb-border-main': 'rgba(255, 255, 255, 0.1)',
      '--wb-shadow-main': '0 12px 32px rgba(0, 0, 0, 0.5)',
      '--wb-scrollbar-thumb': 'rgba(255, 255, 255, 0.15)',
      '--wb-glass-bg': 'rgba(20, 20, 20, 0.85)',
      '--wb-glass-header': 'rgba(0, 0, 0, 0.2)',
      '--wb-overlay-bg': 'rgba(0, 0, 0, 0.45)',
      '--wb-dropdown-bg': 'rgba(15, 15, 15, 0.7)',
    },
  },
  forest: {
    name: 'Forest',
    label: '森林',
    colors: {
      '--wb-bg-root': '#051812',
      '--wb-bg-panel': '#0b241b',
      '--wb-text-main': '#ecfdf5',
      '--wb-text-muted': '#34d399',
      '--wb-primary': '#34d399',
      '--wb-primary-light': '#6ee7b7',
      '--wb-primary-hover': 'rgba(52, 211, 153, 0.15)',
      '--wb-primary-soft': 'rgba(52, 211, 153, 0.1)',
      '--wb-primary-glow': 'rgba(52, 211, 153, 0.4)',
      '--wb-input-bg': 'rgba(0, 0, 0, 0.25)',
      '--wb-input-bg-hover': 'rgba(0, 0, 0, 0.4)',
      '--wb-input-bg-focus': 'rgba(5, 24, 18, 0.8)',
      '--wb-border-subtle': 'rgba(255, 255, 255, 0.05)',
      '--wb-border-main': 'rgba(255, 255, 255, 0.1)',
      '--wb-shadow-main': '0 12px 32px rgba(0, 0, 0, 0.5)',
      '--wb-scrollbar-thumb': 'rgba(255, 255, 255, 0.15)',
      '--wb-glass-bg': 'rgba(20, 20, 20, 0.85)',
      '--wb-glass-header': 'rgba(0, 0, 0, 0.2)',
      '--wb-overlay-bg': 'rgba(0, 0, 0, 0.45)',
      '--wb-dropdown-bg': 'rgba(15, 15, 15, 0.7)',
    },
  },
  sunset: {
    name: 'Sunset',
    label: '日落',
    colors: {
      '--wb-bg-root': '#180e0e',
      '--wb-bg-panel': '#221414',
      '--wb-text-main': '#fff1f2',
      '--wb-text-muted': '#fb7185',
      '--wb-primary': '#fb923c',
      '--wb-primary-light': '#fdba74',
      '--wb-primary-hover': 'rgba(251, 146, 60, 0.15)',
      '--wb-primary-soft': 'rgba(251, 146, 60, 0.1)',
      '--wb-primary-glow': 'rgba(251, 146, 60, 0.4)',
      '--wb-input-bg': 'rgba(0, 0, 0, 0.25)',
      '--wb-input-bg-hover': 'rgba(0, 0, 0, 0.4)',
      '--wb-input-bg-focus': 'rgba(24, 14, 14, 0.8)',
      '--wb-border-subtle': 'rgba(255, 255, 255, 0.05)',
      '--wb-border-main': 'rgba(255, 255, 255, 0.1)',
      '--wb-shadow-main': '0 12px 32px rgba(0, 0, 0, 0.5)',
      '--wb-scrollbar-thumb': 'rgba(255, 255, 255, 0.15)',
      '--wb-glass-bg': 'rgba(20, 20, 20, 0.85)',
      '--wb-glass-header': 'rgba(0, 0, 0, 0.2)',
      '--wb-overlay-bg': 'rgba(0, 0, 0, 0.45)',
      '--wb-dropdown-bg': 'rgba(15, 15, 15, 0.7)',
    },
  },
  coffee: {
    name: 'Coffee',
    label: '咖啡',
    colors: {
      '--wb-bg-root': '#140e08',
      '--wb-bg-panel': '#1e160e',
      '--wb-text-main': '#fffbeb',
      '--wb-text-muted': '#d97706',
      '--wb-primary': '#fbbf24',
      '--wb-primary-light': '#fcd34d',
      '--wb-primary-hover': 'rgba(251, 191, 36, 0.15)',
      '--wb-primary-soft': 'rgba(251, 191, 36, 0.1)',
      '--wb-primary-glow': 'rgba(251, 191, 36, 0.4)',
      '--wb-input-bg': 'rgba(0, 0, 0, 0.25)',
      '--wb-input-bg-hover': 'rgba(0, 0, 0, 0.4)',
      '--wb-input-bg-focus': 'rgba(20, 14, 8, 0.8)',
      '--wb-border-subtle': 'rgba(255, 255, 255, 0.05)',
      '--wb-border-main': 'rgba(255, 255, 255, 0.1)',
      '--wb-shadow-main': '0 12px 32px rgba(0, 0, 0, 0.5)',
      '--wb-scrollbar-thumb': 'rgba(255, 255, 255, 0.15)',
      '--wb-glass-bg': 'rgba(20, 20, 20, 0.85)',
      '--wb-glass-header': 'rgba(0, 0, 0, 0.2)',
      '--wb-overlay-bg': 'rgba(0, 0, 0, 0.45)',
      '--wb-dropdown-bg': 'rgba(15, 15, 15, 0.7)',
    },
  },
  paper: {
    name: 'Paper (Light)',
    label: '纸莎草',
    colors: {
      '--wb-bg-root': '#fbf9f5',
      '--wb-bg-panel': '#f0eadd',
      '--wb-text-main': '#4a3b32',
      '--wb-text-muted': '#8c7b70',
      '--wb-primary': '#d97706',
      '--wb-primary-light': '#b45309',
      '--wb-primary-hover': 'rgba(217, 119, 6, 0.1)',
      '--wb-primary-soft': 'rgba(180, 83, 9, 0.1)',
      '--wb-primary-glow': 'rgba(217, 119, 6, 0.25)',
      '--wb-input-bg': '#f7f3ec',
      '--wb-input-bg-hover': '#f2ece2',
      '--wb-input-bg-focus': '#ffffff',
      '--wb-border-subtle': 'rgba(74, 59, 50, 0.12)',
      '--wb-border-main': 'rgba(74, 59, 50, 0.2)',
      '--wb-shadow-main': '0 8px 24px rgba(74, 59, 50, 0.12)',
      '--wb-scrollbar-thumb': 'rgba(74, 59, 50, 0.25)',
      '--wb-glass-bg': 'rgba(255, 255, 255, 0.88)',
      '--wb-glass-header': 'rgba(240, 234, 221, 0.6)',
      '--wb-overlay-bg': 'rgba(74, 59, 50, 0.35)',
      '--wb-dropdown-bg': 'rgba(251, 249, 245, 0.85)',
    },
  },
  snow: {
    name: 'Snow (Light)',
    label: '雪白',
    colors: {
      '--wb-bg-root': '#ffffff',
      '--wb-bg-panel': '#f4f4f5',
      '--wb-text-main': '#18181b',
      '--wb-text-muted': '#71717a',
      '--wb-primary': '#2563eb',
      '--wb-primary-light': '#3b82f6',
      '--wb-primary-hover': 'rgba(37, 99, 235, 0.1)',
      '--wb-primary-soft': 'rgba(37, 99, 235, 0.08)',
      '--wb-primary-glow': 'rgba(37, 99, 235, 0.25)',
      '--wb-input-bg': '#ffffff',
      '--wb-input-bg-hover': '#fafafa',
      '--wb-input-bg-focus': '#ffffff',
      '--wb-border-subtle': '#e4e4e7',
      '--wb-border-main': '#d4d4d8',
      '--wb-shadow-main': '0 12px 28px rgba(0, 0, 0, 0.08)',
      '--wb-scrollbar-thumb': '#a1a1aa',
      '--wb-glass-bg': 'rgba(255, 255, 255, 0.9)',
      '--wb-glass-header': 'rgba(244, 244, 245, 0.6)',
      '--wb-overlay-bg': 'rgba(24, 24, 27, 0.35)',
      '--wb-dropdown-bg': 'rgba(255, 255, 255, 0.88)',
    },
  },
  midnight: {
    name: 'Midnight',
    label: '黑黄',
    colors: {
      '--wb-bg-root': '#0d0d0d',
      '--wb-bg-panel': '#1a1a1a',
      '--wb-text-main': '#f5f5f5',
      '--wb-text-muted': '#d4a017',
      '--wb-primary': '#f5a623',
      '--wb-primary-light': '#f7c948',
      '--wb-primary-hover': 'rgba(245, 166, 35, 0.15)',
      '--wb-primary-soft': 'rgba(212, 160, 23, 0.15)',
      '--wb-primary-glow': 'rgba(245, 166, 35, 0.4)',
      '--wb-input-bg': 'rgba(255, 255, 255, 0.1)',
      '--wb-input-bg-hover': 'rgba(255, 255, 255, 0.15)',
      '--wb-input-bg-focus': 'rgba(255, 255, 255, 0.2)',
      '--wb-border-subtle': 'rgba(245, 166, 35, 0.12)',
      '--wb-border-main': 'rgba(245, 166, 35, 0.22)',
      '--wb-shadow-main': '0 12px 28px rgba(0, 0, 0, 0.6)',
      '--wb-scrollbar-thumb': 'rgba(245, 166, 35, 0.3)',
      '--wb-glass-bg': 'rgba(13, 13, 13, 0.88)',
      '--wb-glass-header': 'rgba(0, 0, 0, 0.25)',
      '--wb-overlay-bg': 'rgba(0, 0, 0, 0.5)',
      '--wb-dropdown-bg': 'rgba(13, 13, 13, 0.8)',
    },
  },
};

export const TAG_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#6366f1', '#14b8a6', '#f43f5e', '#a855f7',
];

export const STORAGE_KEY = 'worldbook_assistant_state_v1';
export const DIRTY_STATE_KEY = '__WB_ASSISTANT_HAS_UNSAVED_CHANGES__';
export const HISTORY_LIMIT = 12;
export const ENTRY_HISTORY_LIMIT = 7;
export const ACTIVATION_LOG_LIMIT = 120;
export const RESIZE_HANDLE_SIZE = 10;
export const MAIN_PANE_DEFAULT = 280;
export const MAIN_PANE_MIN = 220;
export const FOCUS_MAIN_PANE_DEFAULT = 176;
export const FOCUS_MAIN_PANE_MIN = 150;
export const MAIN_EDITOR_MIN = 540;
export const EDITOR_SIDE_DEFAULT = 360;
export const EDITOR_SIDE_MIN = 280;
export const FOCUS_EDITOR_SIDE_DEFAULT = 220;
export const FOCUS_EDITOR_SIDE_MIN = 180;
export const EDITOR_CENTER_MIN = 420;
export const GLOBAL_PRESET_LIMIT = 64;
export const TAG_LIMIT = 32;
export const FOCUS_CINE_DURATION = 1400;
export const FOCUS_CINE_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
export const FOCUS_CINE_STAGGER = 28;
export const FOCUS_CINE_MAX_STAGGER_STEPS = 8;
export const COPY_CINE_DURATION = 1100;
export const COPY_CINE_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
export const COPY_CINE_STAGGER = 22;
export const COPY_CINE_MAX_STAGGER_STEPS = 14;
export const CROSS_COPY_DESKTOP_LEFT_DEFAULT = 300;
export const CROSS_COPY_DESKTOP_LEFT_MIN = 240;
export const CROSS_COPY_DESKTOP_LEFT_MAX = 440;
export const CROSS_COPY_SPLITTER_SIZE = 8;
export const CROSS_COPY_RIGHT_MIN = 360;
export const ENTRIES_DIGEST_DEBOUNCE_MS = 120;
export const MOBILE_MULTI_LONG_PRESS_MS = 420;
export const MOBILE_MULTI_LONG_PRESS_MOVE_PX = 12;

export const strategyTypeOptions = ['constant', 'selective', 'vectorized'] as const;
export const secondaryLogicOptions = ['and_any', 'and_all', 'not_all', 'not_any'] as const;
export const positionTypeOptions = [
  'before_character_definition',
  'after_character_definition',
  'before_example_messages',
  'after_example_messages',
  'before_author_note',
  'after_author_note',
  'at_depth',
] as const;

export const positionSelectOptions = [
  { value: 'before_character_definition', type: 'before_character_definition', label: '角色定义之前' },
  { value: 'after_character_definition', type: 'after_character_definition', label: '角色定义之后' },
  { value: 'before_example_messages', type: 'before_example_messages', label: '示例消息前（↑EM）' },
  { value: 'after_example_messages', type: 'after_example_messages', label: '示例消息后（↓EM）' },
  { value: 'before_author_note', type: 'before_author_note', label: '作者注释之前' },
  { value: 'after_author_note', type: 'after_author_note', label: '作者注释之后' },
  { value: 'at_depth_as_system', type: 'at_depth', role: 'system', label: '@D ⚙ [系统]在深度' },
  { value: 'at_depth_as_user', type: 'at_depth', role: 'user', label: '@D 👤 [用户]在深度' },
  { value: 'at_depth_as_assistant', type: 'at_depth', role: 'assistant', label: '@D 🤖 [AI]在深度' },
] as const;
