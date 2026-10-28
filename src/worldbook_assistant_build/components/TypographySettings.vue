<template>
  <section id="settings-typography" class="typography-settings settings-card" aria-labelledby="typography-title">
    <div class="typography-heading">
      <div>
        <h3 id="typography-title">字体与阅读</h3>
        <p>字体系列应用于整个助手；其他选项可选择作用于条目文字或整个界面。</p>
      </div>
      <BaseButton size="sm" :disabled="isDefault" @click="$emit('reset')">恢复默认</BaseButton>
    </div>
    <div class="typography-grid">
      <label class="typography-field">
        <span id="typography-scope-label">作用范围</span>
        <BaseSelect :model-value="preferences.scope" :options="scopeOptions" :searchable="false" aria-labelledby="typography-scope-label" @update:model-value="updateScope" />
      </label>
      <label class="typography-field">
        <span id="typography-family-label">字体系列</span>
        <BaseSelect :model-value="preferences.family" :options="familyOptions" :searchable="false" aria-labelledby="typography-family-label" @update:model-value="updateFamily" />
      </label>
      <label class="typography-field">
        <span id="typography-weight-label">文字粗细</span>
        <BaseSelect :model-value="preferences.weight ?? 'default'" :options="weightOptions" :searchable="false" aria-labelledby="typography-weight-label" @update:model-value="updateNumber('weight', $event)" />
      </label>
      <label class="typography-field">
        <span id="typography-line-height-label">{{ preferences.scope === 'interface' ? '文字行距' : '正文行距' }}</span>
        <BaseSelect :model-value="preferences.line_height ?? 'default'" :options="lineHeightOptions" :searchable="false" aria-labelledby="typography-line-height-label" @update:model-value="updateNumber('line_height', $event)" />
      </label>
      <label class="typography-field typography-size-field">
        <span id="typography-size-label">文字大小</span>
        <div class="typography-size-row">
          <BaseSelect :model-value="preferences.size ?? 'default'" :options="sizeOptions" :searchable="false" aria-labelledby="typography-size-label" @update:model-value="updateNumber('size', $event)" />
          <div class="typography-steppers">
            <BaseButton size="sm" type="button" :disabled="(preferences.size ?? 15) <= 12" aria-label="减小字号" @click="stepSize(-1)">A-</BaseButton>
            <BaseButton size="sm" type="button" :disabled="(preferences.size ?? 15) >= 28" aria-label="增大字号" @click="stepSize(1)">A+</BaseButton>
          </div>
        </div>
      </label>
      <div class="typography-field typography-color-field">
        <span id="typography-color-label">文字颜色</span>
        <div class="typography-color-controls">
          <div class="typography-color-swatches" aria-label="快捷色板">
            <!-- unified-control-exception: color swatch pill -->
            <button
              type="button"
              class="typography-swatch-pill"
              :class="{ active: preferences.color === null }"
              @click="$emit('update', { color: null })"
            >跟随主题</button>
            <!-- unified-control-exception: color swatch circle -->
            <button
              v-for="swatch in colorSwatches"
              :key="swatch.color"
              type="button"
              class="typography-swatch-circle"
              :class="{ active: preferences.color?.toLowerCase() === swatch.color.toLowerCase() }"
              :style="{ backgroundColor: swatch.color }"
              :title="swatch.name"
              :aria-label="swatch.name"
              @click="$emit('update', { color: swatch.color })"
            ></button>
          </div>
          <div class="typography-custom-color">
            <BaseInput :model-value="preferences.color ?? themeColor" type="color" aria-labelledby="typography-color-label" @update:model-value="updateColor" />
            <span class="typography-color-hex">{{ preferences.color ?? '跟随主题' }}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="typography-preview" :style="typographyStyle(preferences)">
      <span class="typography-preview-label">实时预览</span>
      <p>世界书是一份慢慢展开的档案。</p>
      <small>文字样式随设置即时变化</small>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { createDefaultTypography, typographyStyle, type FontFamilyPreference, type TypographyPreferences, type TypographyScope } from '../domain/typography';
import BaseButton from './controls/BaseButton.vue';
import BaseInput from './controls/BaseInput.vue';
import BaseSelect, { type BaseSelectOption } from './controls/BaseSelect.vue';

const props = defineProps<{ preferences: TypographyPreferences; themeColor: string }>();
const emit = defineEmits<{ update: [patch: Partial<TypographyPreferences>]; reset: [] }>();

const scopeOptions: BaseSelectOption[] = [
  { value: 'entries', label: '条目文字' },
  { value: 'interface', label: '整个界面' },
];
const familyOptions: BaseSelectOption[] = [
  { value: 'default', label: '跟随默认' },
  { value: 'sans', label: '无衬线' },
  { value: 'serif', label: '宋体 / 衬线' },
  { value: 'rounded', label: '圆润' },
  { value: 'mono', label: '等宽' },
];
const sizeOptions: BaseSelectOption[] = [
  { value: 'default', label: '跟随默认' },
  ...Array.from({ length: 17 }, (_, index) => ({ value: index + 12, label: `${index + 12} px` })),
];
const weightOptions: BaseSelectOption[] = [
  { value: 'default', label: '跟随默认' },
  { value: 400, label: '常规 400' },
  { value: 500, label: '适中 500' },
  { value: 600, label: '半粗 600' },
  { value: 700, label: '粗体 700' },
  { value: 800, label: '特粗 800' },
];
const lineHeightOptions: BaseSelectOption[] = [
  { value: 'default', label: '跟随默认' },
  ...Array.from({ length: 11 }, (_, index) => {
    const value = (index + 12) / 10;
    return { value, label: `${value.toFixed(1)} 倍` };
  }),
];
const isDefault = computed(() => JSON.stringify(props.preferences) === JSON.stringify(createDefaultTypography()));

const colorSwatches = [
  { name: '纯白', color: '#ffffff' },
  { name: '银灰白', color: '#f1f5f9' },
  { name: '暖琥珀', color: '#fef3c7' },
  { name: '草木绿', color: '#86efac' },
  { name: '天青蓝', color: '#7dd3fc' },
  { name: '淡紫', color: '#d8b4fe' },
  { name: '柔粉', color: '#f472b6' },
];

function stepSize(delta: number): void {
  const current = props.preferences.size ?? 15;
  const next = Math.max(12, Math.min(28, current + delta));
  emit('update', { size: next });
}

function updateScope(value: string | number | null): void {
  emit('update', { scope: String(value) as TypographyScope });
}
function updateFamily(value: string | number | null): void {
  emit('update', { family: String(value) as FontFamilyPreference });
}
function updateNumber(field: 'size' | 'weight' | 'line_height', value: string | number | null): void {
  emit('update', { [field]: value === 'default' || value === null ? null : Number(value) });
}
function updateColor(value: string | number | null): void {
  if (typeof value === 'string') emit('update', { color: value });
}
</script>

<style scoped>
.typography-settings { padding: 16px; border: 1px solid var(--wb-border-subtle); border-radius: 12px; background: var(--wb-bg-card); }
.typography-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.typography-heading h3 { margin: 0; color: var(--wb-text-main); font-size: 15px; }
.typography-heading p { margin: 6px 0 0; color: var(--wb-text-muted); font-size: 12px; line-height: 1.55; }
.typography-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
.typography-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; color: var(--wb-text-main); font-size: 12px; }
.typography-size-field { grid-column: 1 / -1; }
.typography-size-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.typography-size-row :deep(.wb-control-select-shell) { flex: 1; min-width: 0; }
.typography-steppers { display: flex; gap: 4px; flex-shrink: 0; }
.typography-steppers :deep(.wb-control-button) { min-width: 34px; padding: 0 7px; font-weight: 700; font-size: 11px; }
.typography-color-field { grid-column: 1 / -1; }
.typography-color-controls { display: flex; flex-direction: column; gap: 10px; color: var(--wb-text-muted); }
.typography-color-swatches { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.typography-swatch-pill {
  padding: 3px 10px;
  border-radius: 8px;
  border: 1px solid var(--wb-border-main);
  background: var(--wb-bg-soft, var(--wb-input-bg));
  color: var(--wb-text-main);
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}
.typography-swatch-pill.active {
  border-color: var(--wb-primary);
  background: var(--wb-primary-soft, rgba(97, 214, 174, 0.15));
  color: var(--wb-primary);
  font-weight: 700;
}
.typography-swatch-circle {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: transform 0.15s ease, border-color 0.15s ease;
}
.typography-swatch-circle:hover { transform: scale(1.15); }
.typography-swatch-circle.active {
  border-color: var(--wb-primary, #61d6ae);
  transform: scale(1.18);
  box-shadow: 0 0 0 2px var(--wb-bg-panel), 0 0 0 4px var(--wb-primary);
}
.typography-custom-color { display: flex; align-items: center; gap: 10px; }
.typography-custom-color :deep(.wb-control-input-shell) { width: 44px; flex: 0 0 44px; }
.typography-custom-color :deep(input[type='color']) { box-sizing: border-box; width: 44px; height: 34px; padding: 2px; cursor: pointer; border-radius: 6px; }
.typography-color-hex { font-size: 12px; color: var(--wb-text-muted); font-family: monospace; }
.typography-preview { margin-top: 16px; padding: 14px; border: 1px solid var(--wb-border-subtle); border-radius: 10px; background: var(--wb-bg-soft, var(--wb-input-bg)); }
.typography-preview-label, .typography-preview small { display: block; color: var(--wb-text-muted); font-size: 11px; }
.typography-preview p { margin: 10px 0; color: var(--wb-user-font-color, var(--wb-text-main)); font-family: var(--wb-user-font-family, 'Songti SC', 'Noto Serif CJK SC', serif); font-size: var(--wb-user-font-size, 16px); font-weight: var(--wb-user-font-weight, 400); line-height: var(--wb-user-line-height, 1.7); overflow-wrap: anywhere; }
@media (max-width: 520px) { .typography-heading { flex-wrap: wrap; } .typography-grid { grid-template-columns: minmax(0, 1fr); } .typography-size-field, .typography-color-field { grid-column: auto; } }
</style>
