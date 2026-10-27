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
        <span id="typography-size-label">文字大小</span>
        <BaseSelect :model-value="preferences.size ?? 'default'" :options="sizeOptions" :searchable="false" aria-labelledby="typography-size-label" @update:model-value="updateNumber('size', $event)" />
      </label>
      <label class="typography-field">
        <span id="typography-weight-label">文字粗细</span>
        <BaseSelect :model-value="preferences.weight ?? 'default'" :options="weightOptions" :searchable="false" aria-labelledby="typography-weight-label" @update:model-value="updateNumber('weight', $event)" />
      </label>
      <label class="typography-field">
        <span id="typography-line-height-label">{{ preferences.scope === 'interface' ? '文字行距' : '正文行距' }}</span>
        <BaseSelect :model-value="preferences.line_height ?? 'default'" :options="lineHeightOptions" :searchable="false" aria-labelledby="typography-line-height-label" @update:model-value="updateNumber('line_height', $event)" />
      </label>
      <div class="typography-field typography-color-field">
        <span id="typography-color-label">文字颜色</span>
        <div class="typography-color-controls">
          <BaseInput :model-value="preferences.color ?? themeColor" type="color" aria-labelledby="typography-color-label" @update:model-value="updateColor" />
          <span>{{ preferences.color ?? '跟随主题' }}</span>
          <BaseButton size="sm" :disabled="preferences.color === null" @click="$emit('update', { color: null })">跟随主题</BaseButton>
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
.typography-color-field { grid-column: 1 / -1; }
.typography-color-controls { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; color: var(--wb-text-muted); }
.typography-color-controls :deep(.wb-control-input-shell) { width: 48px; flex: 0 0 48px; }
.typography-color-controls :deep(input[type='color']) { box-sizing: border-box; width: 48px; height: 40px; padding: 3px; cursor: pointer; }
.typography-color-controls :deep(.wb-control-button) { margin-left: auto; }
.typography-preview { margin-top: 16px; padding: 14px; border: 1px solid var(--wb-border-subtle); border-radius: 10px; background: var(--wb-bg-soft, var(--wb-input-bg)); }
.typography-preview-label, .typography-preview small { display: block; color: var(--wb-text-muted); font-size: 11px; }
.typography-preview p { margin: 10px 0; color: var(--wb-user-font-color, var(--wb-text-main)); font-family: var(--wb-user-font-family, 'Songti SC', 'Noto Serif CJK SC', serif); font-size: var(--wb-user-font-size, 16px); font-weight: var(--wb-user-font-weight, 400); line-height: var(--wb-user-line-height, 1.7); overflow-wrap: anywhere; }
@media (max-width: 360px) { .typography-grid { grid-template-columns: 1fr; } .typography-color-field { grid-column: auto; } }
</style>
