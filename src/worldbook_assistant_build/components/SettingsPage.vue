<template>
  <section class="utility-page">
    <header v-if="!isMobile" class="utility-page-header">
      <BaseButton class="utility-page-back" size="md" @click="$emit('back')">← 返回</BaseButton>
      <h2 class="utility-page-title">⚙️ 设置中心</h2>
    </header>
    <div class="utility-page-body utility-page-scroll">
      <div class="settings-page-shell">
        <aside v-if="!isMobile" class="settings-page-nav" aria-label="设置分区">
          <span class="settings-page-nav-label">SETTINGS</span>
          <a
            href="#settings-experience"
            :class="{ on: activeNavSection === 'settings-experience' }"
            @click="activeNavSection = 'settings-experience'"
          >
            <StudioIcon name="sliders" :size="14" />
            <span>体验</span>
          </a>
          <a
            href="#settings-rules"
            :class="{ on: activeNavSection === 'settings-rules' }"
            @click="activeNavSection = 'settings-rules'"
          >
            <StudioIcon name="layers" :size="14" />
            <span>策略</span>
          </a>
          <a
            href="#settings-typography"
            :class="{ on: activeNavSection === 'settings-typography' }"
            @click="activeNavSection = 'settings-typography'"
          >
            <StudioIcon name="font" :size="14" />
            <span>字体</span>
          </a>
          <a
            href="#settings-api"
            :class="{ on: activeNavSection === 'settings-api' }"
            @click="activeNavSection = 'settings-api'"
          >
            <StudioIcon name="sparkle" :size="14" />
            <span>API 与模型</span>
          </a>
          <a
            href="#settings-version"
            :class="{ on: activeNavSection === 'settings-version' }"
            @click="activeNavSection = 'settings-version'"
          >
            <StudioIcon name="activity" :size="14" />
            <span>版本</span>
          </a>
          <div class="settings-page-nav-sep"></div>
          <!-- unified-control-exception: SHELF 02 studio custom-styled control -->
          <button type="button" @click="$emit('back')">返回工作台</button>
          <p>主题、密钥与快照都只保存在本地脚本存储。</p>
        </aside>

        <div class="utility-page-content">
          <!-- Card 1: 交互与偏好 -->
          <div id="settings-experience" class="settings-card m-card">
            <div class="m-card-head settings-card-head">
              <div>
                <h3 class="settings-section-title">体验设置</h3>
                <p class="m-card-subtitle">定制悬浮球、楼层快捷键及多选联动机制</p>
              </div>
            </div>

            <div class="settings-rows-list">
              <div class="m-setting-row">
                <div class="m-setting-copy">
                  <span class="m-setting-title">显示悬浮按钮（📖）</span>
                  <span class="m-setting-desc">控制屏幕右侧悬浮球展示，关闭后仍可从工具箱或魔法棒菜单呼出</span>
                </div>
                <div class="m-setting-control">
                  <BaseSwitch
                    :model-value="fabVisible"
                    aria-label="显示悬浮按钮（📖）"
                    @update:model-value="$emit('set-fab-visible', $event)"
                  >
                    显示悬浮按钮（📖）
                  </BaseSwitch>
                </div>
              </div>

              <div class="m-setting-row">
                <div class="m-setting-copy">
                  <span class="m-setting-title">显示楼层提取按钮</span>
                  <span class="m-setting-desc">在聊天楼层操作列中增加一键提取按钮，快速从消息生成草稿条目</span>
                </div>
                <div class="m-setting-control">
                  <BaseSwitch
                    :model-value="floorBtnVisible"
                    aria-label="显示楼层提取按钮"
                    @update:model-value="$emit('toggle-floor-btns', $event)"
                  >
                    显示楼层提取按钮
                  </BaseSwitch>
                </div>
              </div>

              <div class="m-setting-row">
                <div class="m-setting-copy">
                  <span class="m-setting-title">显示 AI 对话模块</span>
                  <span class="m-setting-desc settings-hint">开启后将在工具栏和移动端 Tab 中显示 AI 对话入口</span>
                </div>
                <div class="m-setting-control">
                  <BaseSwitch
                    :model-value="persistedState.show_ai_chat"
                    aria-label="显示 AI 对话模块"
                    @update:model-value="$emit('update-persisted-state', (state: any) => state.show_ai_chat = $event)"
                  >
                    显示 AI 对话模块
                  </BaseSwitch>
                </div>
              </div>

              <div class="m-setting-row">
                <div class="m-setting-copy">
                  <span class="m-setting-title">显示条目内容预览</span>
                  <span class="m-setting-desc">列表展示正文摘要；关闭后仅保留关键信息，一屏显示更多条目</span>
                </div>
                <div class="m-setting-control">
                  <BaseSwitch
                    :model-value="Boolean(persistedState.show_entry_preview)"
                    aria-label="显示条目内容预览"
                    @update:model-value="$emit('update-persisted-state', (state: any) => state.show_entry_preview = $event)"
                  >
                    显示条目内容预览（关闭后仅保留关键信息，显示更多条目）
                  </BaseSwitch>
                </div>
              </div>

              <div class="m-setting-row">
                <div class="m-setting-copy">
                  <span class="m-setting-title">启用多选配置联动</span>
                  <span class="m-setting-desc">在条目列表中批量选择条目时，策略与字段修改自动同步至所选项</span>
                </div>
                <div class="m-setting-control">
                  <BaseSwitch
                    :model-value="persistedState.multi_edit.enabled"
                    aria-label="启用多选配置联动"
                    @update:model-value="$emit('update-persisted-state', (state: any) => state.multi_edit.enabled = $event)"
                  >
                    启用多选配置联动
                  </BaseSwitch>
                </div>
              </div>

              <div class="m-setting-row" :class="{ 'is-disabled': !persistedState.multi_edit.enabled }">
                <div class="m-setting-copy">
                  <span class="m-setting-title">同步高级字段 / extra JSON</span>
                  <span class="m-setting-desc">多选联动时同步扩展配置与高级 JSON 规则（需先启用多选配置联动）</span>
                </div>
                <div class="m-setting-control">
                  <BaseSwitch
                    :model-value="persistedState.multi_edit.sync_extra_json"
                    :disabled="!persistedState.multi_edit.enabled"
                    aria-label="多选联动时同步高级字段 / extra JSON"
                    @update:model-value="$emit('update-persisted-state', (state: any) => state.multi_edit.sync_extra_json = $event)"
                  >
                    多选联动时同步高级字段 / extra JSON
                  </BaseSwitch>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 2: 规则与呈现策略 -->
          <div id="settings-rules" class="settings-card m-card">
            <div class="m-card-head settings-card-head">
              <div>
                <h3 class="settings-section-title">策略与规则</h3>
                <p class="m-card-subtitle">标签层级处理、排序数据行为与全局主题配色</p>
              </div>
            </div>

            <div class="settings-form-stack">
              <div class="m-setting-field">
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
                <span class="m-setting-desc">删除包含子标签的父标签时，选择是级联删除整棵树还是保留子级并上提</span>
              </div>

              <div class="m-setting-field">
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
                <span class="m-setting-desc">直接排序修改条目在世界书中的持久化顺序；仅显示排序不写入原文件</span>
              </div>

              <div class="m-setting-row">
                <div class="m-setting-copy">
                  <span class="m-setting-title">排序后重新分配 UID</span>
                  <span class="m-setting-desc">直接排序后重新顺序分配条目数字编号（仅直接排序模式有效）</span>
                </div>
                <div class="m-setting-control">
                  <BaseSwitch
                    :model-value="persistedState.sort.reassign_uid"
                    aria-label="排序后重新分配 UID"
                    @update:model-value="$emit('update-persisted-state', (state: any) => state.sort.reassign_uid = $event)"
                  >
                    排序后重新分配 UID（仅直接排序模式）
                  </BaseSwitch>
                </div>
              </div>

              <div class="m-setting-field">
                <label class="field settings-field">
                  <span id="settings-theme-label">主题风格</span>
                  <BaseSelect
                    id="settings-theme-select"
                    aria-labelledby="settings-theme-label"
                    :model-value="currentTheme"
                    :options="themeSelectOptions"
                    @update:model-value="$emit('set-theme', String($event) as ThemeKey)"
                  />
                </label>
                <span class="m-setting-desc">支持在浅色纸张、雾松夜深色及高对比度主题之间即时无缝切换</span>
              </div>

              <div class="m-setting-row">
                <div class="m-setting-copy">
                  <span class="m-setting-title">启用毛玻璃特效 (Glassmorphism)</span>
                  <span class="m-setting-desc">为顶栏、底部导航与浮动卡片启用半透明磨砂质感（需环境支持）</span>
                </div>
                <div class="m-setting-control">
                  <BaseSwitch
                    :model-value="persistedState.glass_mode"
                    aria-label="启用毛玻璃特效"
                    @update:model-value="$emit('update-persisted-state', (state: any) => state.glass_mode = $event)"
                  >
                    启用毛玻璃特效 (Glassmorphism)
                  </BaseSwitch>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 3: 字体与阅读 -->
          <TypographySettings
            :preferences="typographyPreferences"
            :theme-color="typographyThemeColor"
            @update="updateTypography"
            @reset="resetTypography"
          />

          <!-- Card 4: API 与端点配置 -->
          <div id="settings-api" class="settings-card m-card api-section-card">
            <div class="m-card-head settings-card-head api-section-heading">
              <div>
                <h3 class="settings-section-title">API 设置</h3>
                <p class="m-card-subtitle">配置用于条目智能辅助与生成能力的端点和密钥</p>
              </div>
            </div>

            <div class="api-mode-choices m-segmented" role="group" aria-label="API 模式">
              <BaseButton
                class="api-mode-choice api-mode-choice--tavern"
                :class="{ active: persistedState.ai_api_config.mode === 'tavern' }"
                :variant="persistedState.ai_api_config.mode === 'tavern' ? 'primary' : 'default'"
                :aria-pressed="persistedState.ai_api_config.mode === 'tavern'"
                @click="$emit('update-api-config', { mode: 'tavern' })"
              >
                使用酒馆连接预设
              </BaseButton>
              <BaseButton
                class="api-mode-choice api-mode-choice--custom"
                :class="{ active: persistedState.ai_api_config.mode === 'custom' }"
                :variant="persistedState.ai_api_config.mode === 'custom' ? 'primary' : 'default'"
                :aria-pressed="persistedState.ai_api_config.mode === 'custom'"
                @click="$emit('update-api-config', { mode: 'custom', use_main_api: false })"
              >
                自定义 API
              </BaseButton>
            </div>

            <template v-if="persistedState.ai_api_config.mode === 'custom'">
              <div class="settings-form-stack">
                <div class="m-setting-row">
                  <div class="m-setting-copy">
                    <span class="m-setting-title">使用主API</span>
                    <span class="m-setting-desc">直接复用酒馆当前启用的模型与连接预设，无需重复填入密钥</span>
                  </div>
                  <div class="m-setting-control">
                    <BaseSwitch
                      :model-value="persistedState.ai_api_config.use_main_api"
                      aria-label="使用主API"
                      @update:model-value="$emit('update-api-config', { use_main_api: $event })"
                    >
                      使用主API（直接使用酒馆当前API和模型）
                    </BaseSwitch>
                  </div>
                </div>

                <template v-if="!persistedState.ai_api_config.use_main_api">
                  <div class="api-warning-callout">
                    <span class="api-warning-icon">⚠️</span>
                    <span class="api-warning">API密钥将保存在脚本本地存储中。</span>
                  </div>

                  <div class="m-form-stack">
                    <label class="field settings-field">
                      <span>API基础URL</span>
                      <BaseInput
                        :model-value="persistedState.ai_api_config.apiurl"
                        aria-label="API基础URL"
                        placeholder="https://api.openai.com/v1"
                        @change="updateTextApiField('apiurl', $event)"
                      />
                    </label>

                    <label class="field settings-field">
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
                      <label class="field settings-field">
                        <span>最大Tokens</span>
                        <BaseInput
                          :model-value="persistedState.ai_api_config.max_tokens"
                          type="number"
                          aria-label="最大Tokens"
                          @change="updateNumberApiField('max_tokens', 4096, $event)"
                        />
                      </label>
                      <label class="field settings-field">
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

                    <label v-if="apiModelList.length > 0" class="field settings-field">
                      <span id="settings-model-label">选择模型</span>
                      <BaseSelect
                        id="settings-model-select"
                        aria-labelledby="settings-model-label"
                        :model-value="persistedState.ai_api_config.model"
                        :options="modelOptions"
                        @update:model-value="$emit('update-api-config', { model: String($event ?? '') })"
                      />
                    </label>
                    <label v-else class="field settings-field">
                      <span>模型名称（手动输入）</span>
                      <BaseInput
                        :model-value="persistedState.ai_api_config.model"
                        aria-label="模型名称（手动输入）"
                        placeholder="gpt-4o"
                        @change="updateTextApiField('model', $event)"
                      />
                    </label>
                  </div>
                </template>
              </div>
            </template>

            <div v-if="persistedState.ai_api_config.mode === 'tavern'" class="settings-tavern-note">
              将直接使用酒馆当前启用的预设和API配置进行生成。
            </div>
          </div>

          <!-- Card 5: 版本与环境 -->
          <div id="settings-version" class="settings-card m-card">
            <div class="m-card-head settings-card-head">
              <div>
                <h3 class="settings-section-title">版本与更新</h3>
                <p class="m-card-subtitle">查看当前构建元数据及在线检查发布版本</p>
              </div>
            </div>

            <div class="version-details m-version-grid">
              <div class="m-version-tile">
                <span class="m-version-k">当前版本</span>
                <strong class="m-version-v">
                  <span class="m-version-tag">v{{ versionInfo.version }}</span>
                </strong>
              </div>
              <div class="m-version-tile">
                <span class="m-version-k">当前构建</span>
                <strong class="m-version-v font-mono"><code>{{ versionInfo.commit }}</code> / {{ versionInfo.branch }}</strong>
              </div>
              <div class="m-version-tile">
                <span class="m-version-k">构建时间</span>
                <strong class="m-version-v font-mono">{{ formatVersionTime(versionInfo.build_time) }}</strong>
              </div>
              <div v-if="versionInfo.latest_version" class="m-version-tile">
                <span class="m-version-k">远程最新版本</span>
                <strong class="m-version-v">
                  v{{ versionInfo.latest_version }}
                  <span class="version-update-pill" :class="compareVersionText(versionInfo.latest_version, versionInfo.version) <= 0 ? 'is-latest' : 'has-update'">
                    {{ compareVersionText(versionInfo.latest_version, versionInfo.version) <= 0 ? '（已是最新）' : '（有更新）' }}
                  </span>
                </strong>
              </div>
              <div v-if="versionInfo.latest_commit" class="m-version-tile">
                <span class="m-version-k">最新构建</span>
                <strong class="m-version-v font-mono"><code>{{ versionInfo.latest_commit }}</code></strong>
              </div>
              <div v-if="versionInfo.latest_checked_at" class="m-version-tile">
                <span class="m-version-k">检查时间</span>
                <strong class="m-version-v font-mono">{{ formatVersionTime(versionInfo.latest_checked_at) }}</strong>
              </div>
              <div v-if="versionCheckError" class="settings-error m-version-error">检查失败：{{ versionCheckError }}</div>
            </div>

            <div class="utility-actions version-actions m-row-actions">
              <BaseButton
                class="check-version-action"
                variant="primary"
                :loading="versionCheckLoading"
                @click="$emit('check-latest-version')"
              >
                {{ versionCheckLoading ? '检查中...' : '检查最新版本' }}
              </BaseButton>
              <BaseButton class="copy-version-action" @click="$emit('copy-version-import-url')">复制固定版本导入链接</BaseButton>
            </div>
            <div class="settings-hint">复制链接后可在酒馆导入脚本时指定版本；固定 commit 链接可用于回退或切换版本。</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { THEMES, type ThemeKey } from '../domain/uiConstants';
import { createDefaultTypography, normalizeTypography, type TypographyPreferences } from '../domain/typography';
import TypographySettings from './TypographySettings.vue';
import StudioIcon from './StudioIcon.vue';

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

const activeNavSection = ref<'settings-experience' | 'settings-rules' | 'settings-typography' | 'settings-api' | 'settings-version'>('settings-experience');

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
  width: min(100%, 780px);
  min-width: 0;
  margin: 0 auto;
  flex-direction: column;
  gap: 12px;
}

/* ── Standard Native Grouped Cards ── */
.settings-card {
  padding: 14px 16px;
  border: 1px solid var(--wb-border-subtle, #334155);
  border-radius: 16px;
  background: var(--wb-bg-card, var(--wb-bg-panel, #111827));
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.028);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settings-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 2px;
}

.settings-section-title {
  margin: 0;
  font-size: 14.5px;
  font-weight: 700;
  color: var(--wb-text-main);
  letter-spacing: -0.01em;
}

.m-card-subtitle {
  margin: 3px 0 0;
  font-size: 11.5px;
  color: var(--wb-text-muted, #94a3b8);
  line-height: 1.4;
}

/* ── Standard Setting Rows (Left Copy, Right Control) ── */
.settings-rows-list {
  display: flex;
  flex-direction: column;
}

.m-setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 48px;
  padding: 10px 0;
  border-top: 1px solid var(--wb-border-subtle, #334155);
}

.settings-rows-list > .m-setting-row:first-child,
.settings-form-stack > .m-setting-row:first-child {
  border-top: 0;
  padding-top: 2px;
}

.m-setting-row.is-disabled {
  opacity: 0.5;
}

.m-setting-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1 1 auto;
  min-width: 0;
}

.m-setting-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--wb-text-main);
  line-height: 1.35;
}

.m-setting-desc {
  font-size: 11.5px;
  color: var(--wb-text-muted, #94a3b8);
  line-height: 1.4;
}

.m-setting-control {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

/* Hide BaseSwitch duplicated slot label visually inside setting row */
.m-setting-control :deep(.wb-control-choice-label) {
  display: none !important;
}

/* ── Form Stack & Fields ── */
.settings-form-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.m-setting-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--wb-border-subtle, #334155);
}

.settings-form-stack > .m-setting-field:first-child {
  border-top: 0;
  padding-top: 0;
}

.settings-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.settings-field > span {
  font-size: 12px;
  font-weight: 600;
  color: var(--wb-text-muted, #94a3b8);
}

.m-form-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.settings-hint {
  color: var(--wb-text-muted, #64748b);
  font-size: 11.5px;
  line-height: 1.4;
}

/* ── Segmented Control (iOS / M3 Capsule Style) ── */
.m-segmented {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--wb-border-subtle, #334155);
  border-radius: 12px;
  background: var(--wb-bg-soft, rgba(255, 255, 255, 0.04));
}

.m-segmented :deep(.api-mode-choice) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  height: 36px;
  padding: 0 10px;
  border: 0 !important;
  border-radius: 8px;
  background: transparent !important;
  color: var(--wb-text-muted, #94a3b8) !important;
  font-size: 12.5px;
  font-weight: 600;
  box-shadow: none !important;
  transition: all 0.16s ease;
}

.m-segmented :deep(.api-mode-choice.active),
.m-segmented :deep(.api-mode-choice[aria-pressed="true"]) {
  background: var(--wb-bg-card, #1e293b) !important;
  color: var(--wb-text-main, #fff) !important;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12) !important;
}

.api-warning-callout {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.api-warning-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.api-warning {
  color: #f59e0b;
  font-size: 12px;
  line-height: 1.4;
}

.api-number-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.api-number-fields .field {
  min-width: 0;
  flex: 1;
}

.load-model-action {
  width: 100%;
  min-height: 38px;
}

.settings-tavern-note {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--wb-bg-soft, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--wb-border-subtle, #334155);
  color: var(--wb-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

/* ── Version Key-Value Tiles Grid ── */
.m-version-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.m-version-tile {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--wb-bg-soft, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--wb-border-subtle, #334155);
  min-width: 0;
}

.m-version-k {
  font-size: 11px;
  font-weight: 600;
  color: var(--wb-text-muted, #94a3b8);
}

.m-version-v {
  font-size: 12.5px;
  color: var(--wb-text-main, #e2e8f0);
  word-break: break-all;
  font-weight: 600;
}

.m-version-tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--wb-primary-soft, rgba(99, 102, 241, 0.15));
  color: var(--wb-primary-light, #818cf8);
  font-weight: 700;
}

.version-update-pill {
  margin-left: 6px;
  font-size: 11px;
  font-weight: 600;
}

.version-update-pill.is-latest {
  color: #22c55e;
}

.version-update-pill.has-update {
  color: #f59e0b;
}

.m-version-error {
  grid-column: 1 / -1;
  color: #f87171;
  font-size: 12px;
  padding: 4px 0;
}

.m-row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.m-row-actions :deep(.wb-control-button) {
  flex: 1 1 auto;
  min-height: 38px;
}

/* ── Desktop Anchor Sidebar ── */
.settings-page-shell {
  display: grid;
  grid-template-columns: 188px minmax(0, 1fr);
  gap: 20px;
  width: min(1100px, 100%);
  margin: 0 auto;
  align-items: start;
}

.settings-page-nav {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px 10px;
  border: 1px solid var(--wb-border-subtle);
  border-radius: 14px;
  background: var(--wb-bg-panel);
}

.settings-page-nav-label {
  padding: 4px 8px 8px;
  color: var(--wb-text-dim, var(--wb-text-muted));
  font-family: monospace;
  font-size: 9px;
  letter-spacing: .12em;
}

.settings-page-nav a,
.settings-page-nav button {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--wb-text-muted);
  font-size: 12px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.15s ease;
}

.settings-page-nav a:hover,
.settings-page-nav button:hover,
.settings-page-nav a.on {
  background: var(--wb-primary-soft);
  color: var(--wb-primary-light);
  font-weight: 600;
}

.settings-page-nav a :deep(.studio-icon) {
  flex-shrink: 0;
  opacity: 0.8;
}

.settings-page-nav a.on :deep(.studio-icon) {
  opacity: 1;
}

.settings-page-nav-sep {
  height: 1px;
  margin: 8px 6px;
  background: var(--wb-border-subtle);
}

.settings-page-nav p {
  margin: 9px 7px 3px;
  color: var(--wb-text-dim, var(--wb-text-muted));
  font-size: 10px;
  line-height: 1.5;
}

.settings-page-shell .utility-page-content {
  width: 100%;
  max-width: none;
}

@media (max-width: 900px) {
  .settings-page-shell {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 760px) {
  .utility-page-body {
    padding: 12px 14px calc(64px + env(safe-area-inset-bottom, 0px));
  }

  .settings-page-shell {
    gap: 12px;
  }

  .settings-card {
    padding: 14px;
    border-radius: 16px;
    background: var(--wb-bg-card, var(--wb-bg-panel));
  }

  .api-number-fields {
    grid-template-columns: minmax(0, 1fr);
  }

  .m-version-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

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
</style>
