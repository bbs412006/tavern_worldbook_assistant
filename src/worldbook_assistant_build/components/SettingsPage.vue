<template>
  <section class="utility-page">
    <header v-if="!isMobile" class="utility-page-header">
      <BaseButton class="utility-page-back" size="md" @click="$emit('back')">← 返回</BaseButton>
      <h2 class="utility-page-title">⚙️ 设置中心</h2>
    </header>
    <div class="utility-page-body utility-page-scroll">
      <div class="settings-page-shell">
        <aside class="settings-page-nav" aria-label="设置分区">
          <span class="settings-page-nav-label">SETTINGS</span>
          <a href="#settings-experience" class="on"><span>◉</span>体验</a>
          <a href="#settings-typography"><span>文</span>字体</a>
          <a href="#settings-version"><span>◇</span>版本</a>
          <a href="#settings-api"><span>⌘</span>API 与模型</a>
          <div class="settings-page-nav-sep"></div>
          <!-- unified-control-exception: SHELF 02 studio custom-styled control -->
          <button type="button" @click="$emit('back')">返回工作台</button>
          <p>主题、密钥与快照都只保存在本地脚本存储。</p>
        </aside>
        <div class="utility-page-content">
        <div id="settings-experience" class="settings-card">
          <div class="settings-section-title">体验设置</div>
          <div class="settings-choice-list">
            <BaseSwitch :model-value="fabVisible" @update:model-value="$emit('set-fab-visible', $event)">
              显示悬浮按钮（📖）
            </BaseSwitch>
            <BaseSwitch :model-value="floorBtnVisible" @update:model-value="$emit('toggle-floor-btns', $event)">
              显示楼层提取按钮
            </BaseSwitch>
            <BaseSwitch
              :model-value="persistedState.show_ai_chat"
              @update:model-value="$emit('update-persisted-state', (state: any) => state.show_ai_chat = $event)"
            >
              显示 AI 对话模块
            </BaseSwitch>
            <BaseSwitch
              :model-value="persistedState.multi_edit.enabled"
              @update:model-value="$emit('update-persisted-state', (state: any) => state.multi_edit.enabled = $event)"
            >
              启用多选配置联动
            </BaseSwitch>
            <BaseSwitch
              :model-value="persistedState.multi_edit.sync_extra_json"
              :disabled="!persistedState.multi_edit.enabled"
              @update:model-value="$emit('update-persisted-state', (state: any) => state.multi_edit.sync_extra_json = $event)"
            >
              多选联动时同步高级字段 / extra JSON
            </BaseSwitch>
            <BaseSwitch
              :model-value="Boolean(persistedState.show_entry_preview)"
              @update:model-value="$emit('update-persisted-state', (state: any) => state.show_entry_preview = $event)"
            >
              显示条目内容预览（关闭后仅保留关键信息，显示更多条目）
            </BaseSwitch>
          </div>
          <label class="field settings-field">
            <span id="settings-delete-parent-label">父标签删除策略</span>
            <BaseSelect
              id="settings-delete-parent-select"
              aria-labelledby="settings-delete-parent-label"
              :model-value="persistedState.tag_editor.delete_parent_mode"
              :options="deleteParentOptions"
              @update:model-value="$emit('set-tag-delete-parent-mode', String($event))"
            />
          </label>
          <div class="settings-hint">开启后将在工具栏和移动端 Tab 中显示 AI 对话入口</div>
          <label class="field settings-field">
            <span id="settings-sort-mode-label">排序模式</span>
            <BaseSelect
              id="settings-sort-mode-select"
              aria-labelledby="settings-sort-mode-label"
              :model-value="persistedState.sort.mode"
              :options="sortModeOptions"
              @update:model-value="updateSortMode"
            />
          </label>
          <BaseSwitch
            :model-value="persistedState.sort.reassign_uid"
            @update:model-value="$emit('update-persisted-state', (state: any) => state.sort.reassign_uid = $event)"
          >
            排序后重新分配 UID（仅直接排序模式）
          </BaseSwitch>
          <label class="field settings-field">
            <span id="settings-theme-label">主题</span>
            <BaseSelect
              id="settings-theme-select"
              aria-labelledby="settings-theme-label"
              :model-value="currentTheme"
              :options="themeSelectOptions"
              @update:model-value="$emit('set-theme', String($event) as ThemeKey)"
            />
          </label>
          <BaseSwitch
            :model-value="persistedState.glass_mode"
            @update:model-value="$emit('update-persisted-state', (state: any) => state.glass_mode = $event)"
          >
            启用毛玻璃特效 (Glassmorphism)
          </BaseSwitch>
        </div>

        <TypographySettings :preferences="typographyPreferences" :theme-color="typographyThemeColor" @update="updateTypography" @reset="resetTypography" />

        <div id="settings-version" class="settings-card">
          <div class="settings-section-title">版本与更新</div>
          <div class="version-details">
            <div>当前版本：<strong>v{{ versionInfo.version }}</strong></div>
            <div>当前构建：<code>{{ versionInfo.commit }}</code> / {{ versionInfo.branch }}</div>
            <div>构建时间：{{ formatVersionTime(versionInfo.build_time) }}</div>
            <div v-if="versionInfo.latest_version">
              最新版本：<strong>v{{ versionInfo.latest_version }}</strong>
              <span :style="{ color: compareVersionText(versionInfo.latest_version, versionInfo.version) <= 0 ? '#22c55e' : '#f59e0b' }">
                {{ compareVersionText(versionInfo.latest_version, versionInfo.version) <= 0 ? '（已是最新）' : '（有更新）' }}
              </span>
            </div>
            <div v-if="versionInfo.latest_commit">最新构建：<code>{{ versionInfo.latest_commit }}</code></div>
            <div v-if="versionInfo.latest_checked_at">检查时间：{{ formatVersionTime(versionInfo.latest_checked_at) }}</div>
            <div v-if="versionCheckError" class="settings-error">检查失败：{{ versionCheckError }}</div>
          </div>
          <div class="utility-actions version-actions">
            <BaseButton
              class="check-version-action"
              :loading="versionCheckLoading"
              @click="$emit('check-latest-version')"
            >
              {{ versionCheckLoading ? '检查中...' : '检查最新版本' }}
            </BaseButton>
            <BaseButton class="copy-version-action" @click="$emit('copy-version-import-url')">复制固定版本导入链接</BaseButton>
          </div>
          <div class="settings-hint">复制链接后可在酒馆导入脚本时指定版本；固定 commit 链接可用于回退或切换版本。</div>
        </div>

        <div id="settings-api" class="api-section-heading">
          <div class="settings-section-title">API 设置</div>
        </div>
        <div class="api-mode-choices" role="group" aria-label="API 模式">
          <BaseButton
            class="api-mode-choice api-mode-choice--custom"
            :variant="persistedState.ai_api_config.mode === 'custom' ? 'primary' : 'default'"
            :aria-pressed="persistedState.ai_api_config.mode === 'custom'"
            @click="$emit('update-api-config', { mode: 'custom', use_main_api: false })"
          >
            自定义API
          </BaseButton>
          <BaseButton
            class="api-mode-choice api-mode-choice--tavern"
            :variant="persistedState.ai_api_config.mode === 'tavern' ? 'primary' : 'default'"
            :aria-pressed="persistedState.ai_api_config.mode === 'tavern'"
            @click="$emit('update-api-config', { mode: 'tavern' })"
          >
            使用酒馆连接预设
          </BaseButton>
        </div>
        <template v-if="persistedState.ai_api_config.mode === 'custom'">
          <BaseSwitch
            :model-value="persistedState.ai_api_config.use_main_api"
            @update:model-value="$emit('update-api-config', { use_main_api: $event })"
          >
            使用主API（直接使用酒馆当前API和模型）
          </BaseSwitch>
          <template v-if="!persistedState.ai_api_config.use_main_api">
            <div class="api-warning">⚠️ API密钥将保存在脚本本地存储中。</div>
            <label class="field">
              <span>API基础URL</span>
              <BaseInput
                :model-value="persistedState.ai_api_config.apiurl"
                aria-label="API基础URL"
                placeholder="https://api.openai.com/v1"
                @change="updateTextApiField('apiurl', $event)"
              />
            </label>
            <label class="field">
              <span>API密钥（可选）</span>
              <BaseInput
                :model-value="persistedState.ai_api_config.key"
                type="password"
                aria-label="API密钥（可选）"
                placeholder="sk-..."
                @change="updateTextApiField('key', $event)"
              />
            </label>
            <div class="api-number-fields">
              <label class="field">
                <span>最大Tokens</span>
                <BaseInput
                  :model-value="persistedState.ai_api_config.max_tokens"
                  type="number"
                  aria-label="最大Tokens"
                  @change="updateNumberApiField('max_tokens', 4096, $event)"
                />
              </label>
              <label class="field">
                <span>温度</span>
                <BaseInput
                  :model-value="persistedState.ai_api_config.temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  aria-label="温度"
                  @change="updateNumberApiField('temperature', 1, $event)"
                />
              </label>
            </div>
            <BaseButton
              class="load-model-action"
              :loading="apiModelLoading"
              :disabled="!persistedState.ai_api_config.apiurl"
              @click="$emit('load-model-list')"
            >
              {{ apiModelLoading ? '加载中...' : '加载模型列表' }}
            </BaseButton>
            <label v-if="apiModelList.length > 0" class="field">
              <span id="settings-model-label">选择模型</span>
              <BaseSelect
                id="settings-model-select"
                aria-labelledby="settings-model-label"
                :model-value="persistedState.ai_api_config.model"
                :options="modelOptions"
                @update:model-value="$emit('update-api-config', { model: String($event ?? '') })"
              />
            </label>
            <label v-else class="field">
              <span>模型名称（手动输入）</span>
              <BaseInput
                :model-value="persistedState.ai_api_config.model"
                aria-label="模型名称（手动输入）"
                placeholder="gpt-4o"
                @change="updateTextApiField('model', $event)"
              />
            </label>
          </template>
        </template>
        <div v-if="persistedState.ai_api_config.mode === 'tavern'" class="settings-tavern-note">
          将直接使用酒馆当前启用的预设和API配置进行生成。
        </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { THEMES, type ThemeKey } from '../domain/uiConstants';
import { createDefaultTypography, normalizeTypography, type TypographyPreferences } from '../domain/typography';
import TypographySettings from './TypographySettings.vue';

import BaseButton from './controls/BaseButton.vue';
import BaseInput from './controls/BaseInput.vue';
import BaseSelect, { type BaseSelectOption } from './controls/BaseSelect.vue';
import BaseSwitch from './controls/BaseSwitch.vue';

interface VersionInfo {
  version: string;
  branch: string;
  commit: string;
  build_time: string;
  latest_version: string;
  latest_commit: string;
  latest_checked_at: number;
  latest_url: string;
}

const props = defineProps<{
  persistedState: any;
  fabVisible: boolean;
  floorBtnVisible: boolean;
  currentTheme: ThemeKey;
  isMobile?: boolean;
  themeOptions: Array<{ key: ThemeKey; label: string }>;
  apiModelList: string[];
  apiModelLoading: boolean;
  versionInfo: VersionInfo;
  versionCheckLoading: boolean;
  versionCheckError: string;
}>();

const emit = defineEmits<{
  back: [];
  'set-fab-visible': [value: boolean];
  'toggle-floor-btns': [value: boolean];
  'update-persisted-state': [updater: (state: any) => void];
  'set-tag-delete-parent-mode': [value: string];
  'set-theme': [value: ThemeKey];
  'update-api-config': [patch: Record<string, unknown>];
  'load-model-list': [];
  'check-latest-version': [];
  'copy-version-import-url': [];
}>();

const deleteParentOptions: BaseSelectOption[] = [
  { value: 'promote', label: '删除父标签并上提子标签' },
  { value: 'cascade', label: '级联删除整棵标签树' },
];
const sortModeOptions: BaseSelectOption[] = [
  { value: 'mutate', label: '直接排序（修改条目顺序）' },
  { value: 'view', label: '仅显示排序（不修改数据）' },
];
const themeSelectOptions = computed<BaseSelectOption[]>(() =>
  props.themeOptions.map(item => ({ value: item.key, label: item.label })),
);
const typographyPreferences = computed(() => normalizeTypography(props.persistedState.typography));
const typographyThemeColor = computed(() => THEMES[props.currentTheme]?.colors['--wb-text-main'] ?? '#17201b');
function updateTypography(patch: Partial<TypographyPreferences>): void {
  emit('update-persisted-state', state => {
    state.typography = normalizeTypography({ ...state.typography, ...patch });
  });
}
function resetTypography(): void {
  emit('update-persisted-state', state => { state.typography = createDefaultTypography(); });
}
const modelOptions = computed<BaseSelectOption[]>(() => [
  { value: '', label: '请选择模型' },
  ...props.apiModelList.map(model => ({ value: model, label: model })),
]);

function formatVersionTime(value: string | number): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function compareVersionText(left: string, right: string): number {
  const parse = (value: string) => value.replace(/^v/i, '').split('.').map(part => Number.parseInt(part, 10) || 0);
  const leftParts = parse(left);
  const rightParts = parse(right);
  for (let index = 0; index < 3; index += 1) {
    const delta = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

function updateSortMode(value: string | number | null): void {
  emit('update-persisted-state', state => state.sort.mode = String(value));
}

function nativeInputValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}

function updateTextApiField(field: string, event: Event): void {
  emit('update-api-config', { [field]: nativeInputValue(event) });
}

function updateNumberApiField(field: string, fallback: number, event: Event): void {
  emit('update-api-config', { [field]: Number(nativeInputValue(event)) || fallback });
}
</script>

<style scoped>
.utility-page {
  display: flex;
  flex: 1;
  min-height: 0;
  width: 100%;
  flex-direction: column;
  overflow: hidden;
  color: var(--wb-text-main, #e2e8f0);
  background: var(--wb-bg-root, var(--wb-bg, #0f172a));
}

.utility-page-header {
  display: grid;
  grid-template-columns: minmax(88px, 1fr) auto minmax(88px, 1fr);
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
  padding: 12px 16px;
  border-bottom: 1px solid var(--wb-border-subtle, #334155);
  background: var(--wb-bg-panel, var(--wb-panel-bg, #111827));
}

.utility-page-back { justify-self: start; }
.utility-page-title { margin: 0; font-size: 16px; font-weight: 700; }
.utility-page-body {
  box-sizing: border-box;
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: 16px;
}

.utility-page-content {
  display: flex;
  width: min(100%, 720px);
  min-width: 0;
  margin: 0 auto;
  flex-direction: column;
  gap: 12px;
}

.settings-card { padding: 10px; border: 1px solid var(--wb-border-subtle, #334155); border-radius: 8px; }
.settings-section-title { margin-bottom: 8px; font-size: 13px; font-weight: 600; }
.settings-choice-list { display: flex; flex-direction: column; gap: 6px; }
.settings-field { margin-top: 8px; }
.settings-hint { margin-top: 6px; color: var(--wb-text-muted, #64748b); font-size: 11px; }
.version-details { display: grid; gap: 4px; color: var(--wb-text-muted, #94a3b8); font-size: 12px; }
.version-details strong { color: var(--wb-text-main, #e2e8f0); }
.settings-error { color: #f87171; }
.utility-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.version-actions { margin-top: 10px; }
.api-section-heading { padding-top: 10px; border-top: 1px solid var(--wb-border-subtle, #334155); }
.api-mode-choices { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.api-mode-choice { flex: 1 1 180px; }
.api-warning { color: #f59e0b; font-size: 11px; }
.api-number-fields { display: flex; gap: 10px; }
.api-number-fields .field { min-width: 0; flex: 1; }
.load-model-action { width: 100%; }
.settings-tavern-note { padding: 8px 0; color: var(--wb-text-muted); font-size: 12px; }

@media (max-width: 640px) {
  .utility-page-header { grid-template-columns: auto minmax(0, 1fr); padding: 10px 12px; }
  .utility-page-title { justify-self: end; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .utility-page-body { padding: 12px; }
  .utility-page-content > div,
  .utility-page-content label,
  .field,
  .wb-control-input-shell,
  .wb-control-select-shell { min-width: 0; max-width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .utility-page,
  .utility-page * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* SHELF 02 settings shell */
.settings-page-shell {
  display: grid;
  grid-template-columns: 188px minmax(0, 1fr);
  gap: 16px;
  width: min(1100px, 100%);
  margin: 0 auto;
  align-items: start;
}

.settings-page-nav {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 9px;
  border: 1px solid var(--wb-border-subtle);
  border-radius: 11px;
  background: var(--wb-bg-panel);
}

.settings-page-nav-label {
  padding: 3px 8px 8px;
  color: var(--wb-text-dim, var(--wb-text-muted));
  font-family: monospace;
  font-size: 8px;
  letter-spacing: .12em;
}

.settings-page-nav a,
.settings-page-nav button {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 31px;
  padding: 0 8px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--wb-text-muted);
  font-size: 10px;
  text-align: left;
  cursor: pointer;
  text-decoration: none;
}

.settings-page-nav a:hover,
.settings-page-nav button:hover,
.settings-page-nav a.on {
  background: var(--wb-primary-soft);
  color: var(--wb-primary-light);
}

.settings-page-nav a span {
  width: 12px;
  color: var(--wb-text-dim, var(--wb-text-muted));
  font-size: 9px;
  text-align: center;
}

.settings-page-nav-sep {
  height: 1px;
  margin: 8px 6px;
  background: var(--wb-border-subtle);
}

.settings-page-nav p {
  margin: 9px 7px 3px;
  color: var(--wb-text-dim, var(--wb-text-muted));
  font-size: 8px;
  line-height: 1.6;
}

.settings-page-shell .utility-page-content {
  width: 100%;
  max-width: none;
}

.settings-page-shell .settings-card {
  border-radius: 11px;
  box-shadow: none;
}

.settings-page-shell .settings-choice-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings-page-shell .settings-choice-list > * {
  width: 100%;
  min-width: 0;
}

.settings-page-shell .settings-choice-list .settings-field {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 5px;
}

.settings-page-shell .settings-choice-list .settings-field > span {
  font-size: 11px;
  color: var(--wb-text-muted, var(--wb-text-dim));
}

.settings-page-shell .settings-card > label.wb-control-choice {
  display: flex;
  width: 100%;
}

.settings-page-shell .settings-card > label.field.settings-field {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 5px;
  width: 100%;
}

.settings-page-shell .settings-card > label.field.settings-field > span {
  font-size: 11px;
  color: var(--wb-text-muted, var(--wb-text-dim));
}

.settings-page-shell .settings-card-head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 9px;
}

.settings-page-shell .settings-card-head b {
  font-size: 11px;
  font-weight: 600;
}

.settings-page-shell .settings-card-head span {
  margin-left: auto;
  color: var(--wb-text-dim, var(--wb-text-muted));
  font-size: 8px;
}

.settings-page-shell .setting-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 5px 0;
  border-top: 1px solid var(--wb-border-subtle);
}

.settings-page-shell .settings-card-head + .setting-line {
  border-top: 0;
}

.settings-page-shell .setting-line .copy {
  flex: 1;
  min-width: 0;
}

.settings-page-shell .setting-line .copy b {
  display: block;
  font-size: 10px;
  font-weight: 520;
}

.settings-page-shell .setting-line .copy span {
  display: block;
  margin-top: 2px;
  color: var(--wb-text-dim, var(--wb-text-muted));
  font-size: 8px;
}

.settings-page-shell .theme-cards {
  display: flex;
  gap: 6px;
}

.settings-page-shell .theme-card {
  flex: 1;
  padding: 6px;
  border: 1px solid var(--wb-border-subtle);
  border-radius: 7px;
  background: var(--wb-input-bg);
}

.settings-page-shell .theme-card.on {
  border-color: var(--wb-primary);
}

.settings-page-shell .theme-swatch {
  display: flex;
  gap: 2px;
  height: 35px;
  overflow: hidden;
  border-radius: 4px;
}

.settings-page-shell .theme-swatch i {
  flex: 1;
  display: block;
}

.settings-page-shell .theme-card b {
  display: block;
  margin-top: 5px;
  font-size: 8px;
  font-weight: 500;
  text-align: center;
}

.settings-page-shell .version-box {
  padding: 9px;
  border: 1px dashed var(--wb-border-main);
  border-radius: 7px;
  color: var(--wb-text-muted);
  font-family: monospace;
  font-size: 8px;
  line-height: 1.7;
}

.settings-page-shell .version-box b {
  color: var(--wb-text-main);
  font-weight: 500;
}

@media (max-width: 900px) {
  .settings-page-shell {
    grid-template-columns: minmax(0, 1fr);
  }

  .settings-page-nav {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
  }

  .settings-page-nav-label,
  .settings-page-nav-sep,
  .settings-page-nav p {
    display: none;
  }
}

@media (max-width: 760px) {
  .utility-page-body {
    padding: 12px 14px calc(64px + env(safe-area-inset-bottom, 0px));
  }

  .settings-page-shell {
    gap: 12px;
  }

  .settings-page-nav {
    flex-wrap: nowrap;
    overflow-x: auto;
    gap: 6px;
    padding: 8px 10px;
    border-radius: 14px;
    background: var(--wb-bg-card, var(--wb-bg-panel));
    scrollbar-width: none;
  }

  .settings-page-nav::-webkit-scrollbar {
    display: none;
  }

  .settings-page-nav button {
    display: none;
  }

  .settings-page-nav a {
    flex: 0 0 auto;
    min-height: 36px;
    padding: 0 12px;
    border-radius: 999px;
    background: var(--wb-bg-soft);
    color: var(--wb-text-main);
    font-size: 12.5px;
    font-weight: 600;
  }

  .settings-page-nav a.on {
    background: var(--wb-primary);
    color: var(--wb-on-primary, #fff);
  }

  .settings-page-nav a span {
    display: none;
  }

  .settings-page-shell .settings-card {
    padding: 14px;
    border-radius: 16px;
    background: var(--wb-bg-card, var(--wb-bg-panel));
  }

  .settings-page-shell .settings-card-head {
    margin-bottom: 10px;
  }

  .settings-page-shell .settings-card-head b {
    font-size: 15px;
    font-weight: 700;
  }

  .settings-page-shell .settings-card-head span {
    font-size: 11.5px;
  }

  .settings-page-shell .setting-line {
    min-height: 46px;
    padding: 8px 0;
    gap: 12px;
  }

  .settings-page-shell .setting-line .copy b {
    font-size: 13.5px;
    font-weight: 600;
  }

  .settings-page-shell .setting-line .copy span {
    font-size: 11.5px;
    line-height: 1.4;
  }

  .settings-page-shell .settings-choice-list .settings-field > span,
  .settings-page-shell .settings-card > label.field.settings-field > span {
    font-size: 12.5px;
    font-weight: 600;
  }

  .settings-page-shell .theme-cards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .settings-page-shell .theme-card {
    padding: 8px;
    border-radius: 12px;
  }

  .settings-page-shell .theme-card b {
    margin-top: 6px;
    font-size: 12px;
    font-weight: 600;
  }

  .settings-page-shell .version-box {
    padding: 12px;
    border-radius: 12px;
    font-size: 12px;
  }

  .api-number-fields {
    flex-direction: column;
  }
}
</style>
