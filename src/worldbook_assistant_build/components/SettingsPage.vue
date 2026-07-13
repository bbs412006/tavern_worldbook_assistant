<template>
  <section class="utility-page">
    <header class="utility-page-header">
      <button class="utility-page-back" type="button" @click="$emit('back')">← 返回</button>
      <h2 class="utility-page-title">⚙️ 设置中心</h2>
    </header>
    <div class="utility-page-body utility-page-scroll">
      <div class="utility-page-content">
        <div style="border:1px solid var(--wb-border-subtle,#334155);border-radius:8px;padding:10px;">
          <div style="font-size:13px;font-weight:600;margin-bottom:8px;">体验设置</div>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:6px;">
            <input type="checkbox" :checked="fabVisible" @change="$emit('set-fab-visible', ($event.target as HTMLInputElement).checked)" />
            <span>显示悬浮按钮（📖）</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:6px;">
            <input type="checkbox" :checked="floorBtnVisible" @change="$emit('toggle-floor-btns', ($event.target as HTMLInputElement).checked)" />
            <span>显示楼层提取按钮</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="checkbox" :checked="persistedState.show_ai_chat" @change="$emit('update-persisted-state', (s: any) => s.show_ai_chat = ($event.target as HTMLInputElement).checked)" />
            <span>显示 AI 对话模块</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-top:6px;">
            <input
              type="checkbox"
              :checked="persistedState.multi_edit.enabled"
              @change="$emit('update-persisted-state', (s: any) => s.multi_edit.enabled = ($event.target as HTMLInputElement).checked)"
            />
            <span>启用多选配置联动</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input
              type="checkbox"
              :checked="persistedState.multi_edit.sync_extra_json"
              :disabled="!persistedState.multi_edit.enabled"
              @change="$emit('update-persisted-state', (s: any) => s.multi_edit.sync_extra_json = ($event.target as HTMLInputElement).checked)"
            />
            <span>多选联动时同步高级字段 / extra JSON</span>
          </label>
          <label class="field" style="margin-top:8px;">
            <span>父标签删除策略</span>
            <select class="text-input" :value="persistedState.tag_editor.delete_parent_mode" @change="$emit('set-tag-delete-parent-mode', ($event.target as HTMLSelectElement).value)">
              <option value="promote">删除父标签并上提子标签</option>
              <option value="cascade">级联删除整棵标签树</option>
            </select>
          </label>
          <div style="font-size:11px;color:var(--wb-text-muted,#64748b);margin-top:4px;">开启后将在工具栏和移动端 Tab 中显示 AI 对话入口</div>
          <label class="field" style="margin-top:8px;">
            <span>排序模式</span>
            <select class="text-input" :value="persistedState.sort.mode" @change="$emit('update-persisted-state', (s: any) => s.sort.mode = ($event.target as HTMLSelectElement).value)">
              <option value="mutate">直接排序（修改条目顺序）</option>
              <option value="view">仅显示排序（不修改数据）</option>
            </select>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-top:6px;">
            <input
              type="checkbox"
              :checked="persistedState.sort.reassign_uid"
              @change="$emit('update-persisted-state', (s: any) => s.sort.reassign_uid = ($event.target as HTMLInputElement).checked)"
            />
            <span>排序后重新分配 UID（仅直接排序模式）</span>
          </label>
          <label class="field" style="margin-top:8px;">
            <span>主题</span>
            <select class="text-input" :value="currentTheme" @change="$emit('set-theme', ($event.target as HTMLSelectElement).value)">
              <option v-for="item in themeOptions" :key="`setting-theme-${item.key}`" :value="item.key">{{ item.label }}</option>
            </select>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-top:6px;">
            <input type="checkbox" :checked="persistedState.glass_mode" @change="$emit('update-persisted-state', (s: any) => s.glass_mode = ($event.target as HTMLInputElement).checked)" />
            <span>启用毛玻璃特效 (Glassmorphism)</span>
          </label>
        </div>
        <div style="border:1px solid var(--wb-border-subtle,#334155);border-radius:8px;padding:10px;">
          <div style="font-size:13px;font-weight:600;margin-bottom:8px;">版本与更新</div>
          <div style="display:grid;gap:4px;font-size:12px;color:var(--wb-text-muted,#94a3b8);">
            <div>当前版本：<strong style="color:var(--wb-text-main,#e2e8f0);">v{{ versionInfo.version }}</strong></div>
            <div>当前构建：<code>{{ versionInfo.commit }}</code> / {{ versionInfo.branch }}</div>
            <div>构建时间：{{ formatVersionTime(versionInfo.build_time) }}</div>
            <div v-if="versionInfo.latest_version">
              最新版本：<strong style="color:var(--wb-text-main,#e2e8f0);">v{{ versionInfo.latest_version }}</strong>
              <span :style="{ color: compareVersionText(versionInfo.latest_version, versionInfo.version) <= 0 ? '#22c55e' : '#f59e0b' }">
                {{ compareVersionText(versionInfo.latest_version, versionInfo.version) <= 0 ? '（已是最新）' : '（有更新）' }}
              </span>
            </div>
            <div v-if="versionInfo.latest_commit">最新构建：<code>{{ versionInfo.latest_commit }}</code></div>
            <div v-if="versionInfo.latest_checked_at">检查时间：{{ formatVersionTime(versionInfo.latest_checked_at) }}</div>
            <div v-if="versionCheckError" style="color:#f87171;">检查失败：{{ versionCheckError }}</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
            <button class="btn" type="button" :disabled="versionCheckLoading" @click="$emit('check-latest-version')">
              {{ versionCheckLoading ? '检查中...' : '检查最新版本' }}
            </button>
            <button class="btn" type="button" @click="$emit('copy-version-import-url')">复制固定版本导入链接</button>
          </div>
          <div style="font-size:11px;color:var(--wb-text-muted,#64748b);margin-top:6px;">
            复制链接后可在酒馆导入脚本时指定版本；固定 commit 链接可用于回退或切换版本。
          </div>
        </div>
        <div style="border-top:1px solid var(--wb-border-subtle,#334155);padding-top:10px;">
          <div style="font-size:13px;font-weight:600;margin-bottom:8px;">API 设置</div>
        </div>
        <div style="display:flex;gap:12px;align-items:center;">
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer;">
            <input type="radio" value="custom" :checked="persistedState.ai_api_config.mode === 'custom'" @change="$emit('update-api-config', { mode: 'custom', use_main_api: false })" />
            <span>自定义API</span>
          </label>
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer;">
            <input type="radio" value="tavern" :checked="persistedState.ai_api_config.mode === 'tavern'" @change="$emit('update-api-config', { mode: 'tavern' })" />
            <span>使用酒馆连接预设</span>
          </label>
        </div>
        <template v-if="persistedState.ai_api_config.mode === 'custom'">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="checkbox" :checked="persistedState.ai_api_config.use_main_api" @change="$emit('update-api-config', { use_main_api: ($event.target as HTMLInputElement).checked })" />
            <span>使用主API（直接使用酒馆当前API和模型）</span>
          </label>
          <template v-if="!persistedState.ai_api_config.use_main_api">
            <div style="font-size:11px;color:#f59e0b;">⚠️ API密钥将保存在脚本本地存储中。</div>
            <label class="field">
              <span>API基础URL</span>
              <input class="text-input" type="text" :value="persistedState.ai_api_config.apiurl" placeholder="https://api.openai.com/v1" @change="$emit('update-api-config', { apiurl: ($event.target as HTMLInputElement).value })" />
            </label>
            <label class="field">
              <span>API密钥（可选）</span>
              <input class="text-input" type="password" :value="persistedState.ai_api_config.key" placeholder="sk-..." @change="$emit('update-api-config', { key: ($event.target as HTMLInputElement).value })" />
            </label>
            <div style="display:flex;gap:10px;">
              <label class="field" style="flex:1;">
                <span>最大Tokens</span>
                <input class="text-input" type="number" :value="persistedState.ai_api_config.max_tokens" @change="$emit('update-api-config', { max_tokens: Number(($event.target as HTMLInputElement).value) || 4096 })" />
              </label>
              <label class="field" style="flex:1;">
                <span>温度</span>
                <input class="text-input" type="number" step="0.1" min="0" max="2" :value="persistedState.ai_api_config.temperature" @change="$emit('update-api-config', { temperature: Number(($event.target as HTMLInputElement).value) || 1 })" />
              </label>
            </div>
            <button class="btn" type="button" :disabled="apiModelLoading || !persistedState.ai_api_config.apiurl" style="width:100%;" @click="$emit('load-model-list')">
              {{ apiModelLoading ? '加载中...' : '加载模型列表' }}
            </button>
            <label v-if="apiModelList.length > 0" class="field">
              <span>选择模型</span>
              <select class="text-input" :value="persistedState.ai_api_config.model" @change="$emit('update-api-config', { model: ($event.target as HTMLSelectElement).value })">
                <option value="">请选择模型</option>
                <option v-for="m in apiModelList" :key="m" :value="m">{{ m }}</option>
              </select>
            </label>
            <label v-else class="field">
              <span>模型名称（手动输入）</span>
              <input class="text-input" type="text" :value="persistedState.ai_api_config.model" placeholder="gpt-4o" @change="$emit('update-api-config', { model: ($event.target as HTMLInputElement).value })" />
            </label>
          </template>
        </template>
        <div v-if="persistedState.ai_api_config.mode === 'tavern'" style="font-size:12px;color:var(--wb-text-muted);padding:8px 0;">
          将直接使用酒馆当前启用的预设和API配置进行生成。
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
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

defineProps<{
  persistedState: any;
  fabVisible: boolean;
  floorBtnVisible: boolean;
  currentTheme: string;
  themeOptions: Array<{ key: string; label: string }>;
  apiModelList: string[];
  apiModelLoading: boolean;
  versionInfo: VersionInfo;
  versionCheckLoading: boolean;
  versionCheckError: string;
}>();

defineEmits<{
  back: [];
  'set-fab-visible': [value: boolean];
  'toggle-floor-btns': [value: boolean];
  'update-persisted-state': [updater: (state: any) => void];
  'set-tag-delete-parent-mode': [value: string];
  'set-theme': [value: string];
  'update-api-config': [patch: Record<string, unknown>];
  'load-model-list': [];
  'check-latest-version': [];
  'copy-version-import-url': [];
}>();
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
  background: var(--wb-bg, #0f172a);
}

.utility-page-header {
  display: grid;
  grid-template-columns: minmax(88px, 1fr) auto minmax(88px, 1fr);
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
  padding: 12px 16px;
  border-bottom: 1px solid var(--wb-border-subtle, #334155);
  background: var(--wb-panel-bg, #111827);
}

.utility-page-back {
  justify-self: start;
  min-height: 38px;
  padding: 8px 12px;
  border: 1px solid var(--wb-border-subtle, #334155);
  border-radius: 8px;
  color: inherit;
  background: var(--wb-card-bg, #1e293b);
  cursor: pointer;
}

.utility-page-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

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
  margin: 0 auto;
  flex-direction: column;
  gap: 12px;
}

@media (max-width: 640px) {
  .utility-page-header {
    grid-template-columns: auto minmax(0, 1fr);
    padding: 10px 12px;
  }

  .utility-page-title {
    justify-self: end;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .utility-page-body {
    padding: 12px;
  }

  .utility-page-content > div,
  .utility-page-content label,
  .field,
  .text-input {
    min-width: 0;
    max-width: 100%;
  }
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
