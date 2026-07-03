<template>
  <div class="browse-panel-root" :class="{ 'is-mobile': isMobile }">
    <!-- Desktop browse toolbar -->
    <template v-if="!isMobile">
      <section class="wb-toolbar browse-toolbar">
        <label class="toolbar-label">
          <span>世界书</span>
          <WorldbookPicker
            v-model="localSelectedWorldbook"
            :names="worldbookNames"
            placeholder="请选择世界书"
            search-placeholder="搜索世界书..."
            noMatchText="没有匹配的世界书"
          />
        </label>
        <button class="btn" type="button" @click="$emit('create')">新建</button>
        <button class="btn" type="button" :disabled="!localSelectedWorldbook" @click="$emit('duplicate')">另存为</button>
        <button class="btn danger" type="button" :disabled="!localSelectedWorldbook" @click="$emit('delete')">删除</button>
        <button class="btn" type="button" :disabled="!localSelectedWorldbook" @click="$emit('export')">导出</button>
        <button class="btn" type="button" @click="$emit('import')">导入</button>
        <button class="btn" type="button" :class="{ 'glow-pulse': hasUnsavedChanges }" :disabled="!hasUnsavedChanges" @click="$emit('save')">💾 保存</button>
        <div class="browse-mode-switch">
          <button class="btn browse-mode-btn active" type="button">📖 浏览</button>
          <button class="btn browse-mode-btn" type="button" @click="$emit('switch-mode', 'editor')">✏️ 编辑</button>
        </div>
      </section>

      <section class="browse-action-bar">
        <input v-model="searchText" type="text" class="text-input browse-search" placeholder="🔍 搜索名称 / 内容 / 关键词" />
        <span v-if="bindings.global.length" class="binding-tag global">🟢 全局: {{ bindings.global.join(', ') }}</span>
        <span v-if="bindings.charPrimary" class="binding-tag char">🔵 角色: {{ bindings.charPrimary }}</span>
        <span v-if="bindings.chat" class="binding-tag chat">🟡 聊天: {{ bindings.chat }}</span>
        <span class="browse-action-spacer"></span>
        <span class="browse-entry-count">条目 {{ filteredEntries.length }} / {{ entries.length }}</span>
        <button class="btn mini" type="button" :disabled="!localSelectedWorldbook" @click="$emit('add-entry')">+ 新条目</button>
        <button class="btn mini utility-btn" :class='{ active: globalMode }' type="button" @click="$emit('toggle-global')">🌐 全局模式</button>
      </section>
    </template>

    <!-- Browse scroll area / grid -->
    <div class="browse-scroll-area" :class="{ 'mobile-browse-scroll': isMobile }">
      <section class="browse-bindings" :class="{ 'mobile-browse-bindings': isMobile }">
        <span v-if="bindings.global.length" class="binding-tag global">🟢 全局</span>
        <span v-if="bindings.charPrimary" class="binding-tag char">🔵 角色</span>
        <span v-if="bindings.chat" class="binding-tag chat">🟡 聊天</span>
        <span class="browse-entry-count">{{ filteredEntries.length }} / {{ entries.length }}</span>
        <button class="btn mini" type="button" :disabled="!localSelectedWorldbook" @click="$emit('add-entry')">+</button>
      </section>
      <div class="browse-grid" :class="{ 'mobile-browse-grid': isMobile }">
        <div v-if="!filteredEntries.length" class="browse-empty">
          <div class="browse-empty-icon">📖</div>
          <div class="browse-empty-text">{{ localSelectedWorldbook ? '无条目' : '请选择世界书' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import WorldbookPicker from './WorldbookPicker.vue';

const props = defineProps<{
  modelValue: string;
  entries: any[];
  worldbookNames: string[];
  bindings: { global: string[]; charPrimary: string | null; charAdditional: string[]; chat: string | null };
  hasUnsavedChanges: boolean;
  isMobile: boolean;
  globalMode: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'create': [];
  'duplicate': [];
  'delete': [];
  'export': [];
  'import': [];
  'save': [];
  'switch-mode': [mode: string];
  'add-entry': [];
  'toggle-global': [];
}>();

const searchText = ref('');
const localSelectedWorldbook = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const filteredEntries = computed(() => {
  const q = searchText.value.toLowerCase().trim();
  if (!q) return props.entries;
  return props.entries.filter((e: any) =>
    (e.name && e.name.toLowerCase().includes(q)) ||
    (e.content && e.content.toLowerCase().includes(q)) ||
    (e.strategy?.keys?.some((k: any) => String(k).toLowerCase().includes(q)))
  );
});
</script>
