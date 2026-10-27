<template>
  <div class="browse-panel-root" :class="{ 'is-mobile': isMobile }">
    <template v-if="!isMobile">
      <section class="browse-header" aria-label="世界书浏览工具栏">
        <div class="browse-heading">
          <div class="browse-heading-icon"><StudioIcon name="book" :size="20" /></div>
          <div>
            <p class="browse-eyebrow">WORLDBOOK</p>
            <h2>世界书浏览</h2>
            <p class="browse-heading-caption">查看、整理你的世界设定</p>
          </div>
        </div>
        <div class="browse-header-controls">
          <label class="browse-book-picker">
            <span>当前世界书</span>
            <WorldbookPicker
              v-model="localSelectedWorldbook"
              :names="worldbookNames"
              placeholder="请选择世界书"
              search-placeholder="搜索世界书..."
              noMatchText="没有匹配的世界书"
            />
          </label>
          <div class="browse-view-switch" aria-label="页面模式">
            <BaseButton class="browse-view-button is-active" size="sm" aria-current="page"
              ><StudioIcon name="eye" :size="15" /> 查看</BaseButton
            >
            <BaseButton class="browse-view-button" size="sm" @click="$emit('switch-mode', 'editor')"
              ><StudioIcon name="pen" :size="15" /> 编辑</BaseButton
            >
          </div>
        </div>
      </section>

      <section class="browse-tools" aria-label="世界书操作">
        <div class="browse-tools-primary">
          <BaseInput
            v-model="localSearchText"
            class="browse-search"
            placeholder="搜索名称、内容或关键词"
            aria-label="搜索世界书条目"
          >
            <template #prefix><StudioIcon name="search" :size="16" /></template>
          </BaseInput>
          <span class="browse-entry-count"
            >条目 {{ filteredEntries.length }} <span>/ {{ entries.length }}</span></span
          >
          <BaseButton
            class="browse-add"
            size="sm"
            variant="primary"
            :disabled="!localSelectedWorldbook"
            @click="$emit('add-entry')"
            ><StudioIcon name="plus" :size="15" /> 新条目</BaseButton
          >
        </div>
        <div class="browse-tools-secondary">
          <div class="browse-bindings">
            <span v-if="bindings.global.length" class="binding-tag global"
              >全局 · {{ bindings.global.join(', ') }}</span
            >
            <span v-if="bindings.charPrimary" class="binding-tag char">角色 · {{ bindings.charPrimary }}</span>
            <span v-if="bindings.chat" class="binding-tag chat">聊天 · {{ bindings.chat }}</span>
            <span v-if="!bindings.global.length && !bindings.charPrimary && !bindings.chat" class="browse-unbound"
              >暂无绑定</span
            >
          </div>
          <div class="browse-actions">
            <BaseButton size="sm" @click="$emit('create')">新建</BaseButton>
            <BaseButton size="sm" :disabled="!localSelectedWorldbook" @click="$emit('duplicate')">另存为</BaseButton>
            <BaseButton size="sm" :disabled="!localSelectedWorldbook" @click="$emit('export')">导出</BaseButton>
            <BaseButton size="sm" @click="$emit('import')">导入</BaseButton>
            <BaseButton size="sm" variant="danger" :disabled="!localSelectedWorldbook" @click="$emit('delete')"
              >删除</BaseButton
            >
            <BaseButton
              size="sm"
              :class="{ 'has-changes': hasUnsavedChanges }"
              :disabled="!hasUnsavedChanges"
              @click="$emit('save')"
              ><StudioIcon name="save" :size="14" /> 保存</BaseButton
            >
            <BaseButton size="sm" :class="{ 'is-active': globalMode }" @click="$emit('toggle-global')"
              ><StudioIcon name="globe" :size="14" /> 全局模式</BaseButton
            >
          </div>
        </div>
      </section>
    </template>

    <section v-else class="browse-mobile-summary">
      <div class="browse-bindings">
        <span v-if="bindings.global.length" class="binding-tag global">全局</span>
        <span v-if="bindings.charPrimary" class="binding-tag char">角色</span>
        <span v-if="bindings.chat" class="binding-tag chat">聊天</span>
        <span class="browse-entry-count">{{ filteredEntries.length }} / {{ entries.length }} 条目</span>
      </div>
      <BaseButton size="sm" :disabled="!localSelectedWorldbook" aria-label="新条目" @click="$emit('add-entry')"
        ><StudioIcon name="plus" :size="16"
      /></BaseButton>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import BaseButton from './controls/BaseButton.vue';
import BaseInput from './controls/BaseInput.vue';
import StudioIcon from './StudioIcon.vue';
import WorldbookPicker from './WorldbookPicker.vue';

const props = defineProps<{
  modelValue: string;
  entries: any[];
  worldbookNames: string[];
  bindings: { global: string[]; charPrimary: string | null; charAdditional: string[]; chat: string | null };
  hasUnsavedChanges: boolean;
  isMobile: boolean;
  globalMode: boolean;
  searchText?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'update:searchText': [value: string];
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

const fallbackSearchText = ref('');
const localSearchText = computed({
  get: () => props.searchText ?? fallbackSearchText.value,
  set: (value: string | number | null) => {
    const text = String(value ?? '');
    fallbackSearchText.value = text;
    emit('update:searchText', text);
  },
});
const localSelectedWorldbook = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const filteredEntries = computed(() => {
  const q = localSearchText.value.toLowerCase().trim();
  if (!q) return props.entries;
  return props.entries.filter((e: any) =>
    (e.name && e.name.toLowerCase().includes(q)) ||
    (e.content && e.content.toLowerCase().includes(q)) ||
    (e.strategy?.keys?.some((k: any) => String(k).toLowerCase().includes(q)))
  );
});
</script>

<style scoped>
.browse-panel-root {
  display: grid;
  gap: 18px;
  flex: none;
  min-width: 0;
}
.browse-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
}
.browse-heading {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.browse-heading-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 46px;
  height: 46px;
  border-radius: 15px;
  color: var(--wb-accent, #7869d6);
  background: color-mix(in srgb, var(--wb-accent, #7869d6) 13%, transparent);
}
.browse-eyebrow {
  margin: 0 0 4px;
  color: var(--wb-text-muted);
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.14em;
}
.browse-heading h2 {
  margin: 0;
  color: var(--wb-text-main);
  font-size: 21px;
  line-height: 1.2;
  letter-spacing: -0.03em;
}
.browse-heading-caption {
  margin: 5px 0 0;
  color: var(--wb-text-muted);
  font-size: 12px;
}
.browse-header-controls {
  display: flex;
  align-items: end;
  gap: 12px;
}
.browse-book-picker {
  display: grid;
  gap: 6px;
  width: min(260px, 28vw);
  color: var(--wb-text-muted);
  font-size: 11px;
  font-weight: 650;
}
.browse-book-picker :deep(.worldbook-picker) {
  width: 100%;
}
.browse-view-switch {
  display: flex;
  gap: 3px;
  padding: 4px;
  border: 1px solid var(--wb-border-main);
  border-radius: 11px;
  background: var(--studio-soft, rgba(127, 127, 127, 0.06));
}
.browse-view-switch :deep(.browse-view-button) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 13px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--wb-text-muted);
  box-shadow: none;
}
.browse-view-switch :deep(.browse-view-button.is-active) {
  background: var(--studio-surface, var(--wb-bg-card));
  color: var(--wb-text-main);
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
}
.browse-tools {
  display: grid;
  gap: 12px;
  padding: 15px;
  border: 1px solid var(--wb-border-main);
  border-radius: 16px;
  background: var(--studio-surface, var(--wb-bg-card));
}
.browse-tools-primary,
.browse-tools-secondary {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.browse-tools-primary :deep(.wb-control-input-shell) {
  flex: 1;
  min-width: 120px;
}
.browse-tools-primary :deep(.wb-control-input) {
  width: 100%;
  min-height: 38px;
  border-radius: 10px;
}
.browse-entry-count {
  flex: none;
  color: var(--wb-text-main);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
.browse-entry-count span {
  color: var(--wb-text-muted);
  font-weight: 450;
}
.browse-tools :deep(.wb-control-button),
.browse-mobile-summary :deep(.wb-control-button) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  white-space: nowrap;
}
.browse-tools :deep(.browse-add) {
  min-height: 38px;
  padding: 0 15px;
  border-radius: 10px;
}
.browse-tools-secondary {
  justify-content: space-between;
  flex-wrap: wrap;
}
.browse-bindings,
.browse-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
}
.browse-actions :deep(.wb-control-button) {
  min-height: 29px;
  border-radius: 8px;
  font-size: 11px;
}
.browse-actions :deep(.has-changes),
.browse-actions :deep(.is-active) {
  color: var(--wb-accent, #7869d6);
  border-color: var(--wb-accent, #7869d6);
}
.binding-tag {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 5px 9px;
  border-radius: 7px;
  font-size: 11px;
  font-weight: 600;
}
.binding-tag.global {
  color: #379277;
  background: rgba(52, 168, 130, 0.1);
}
.binding-tag.char {
  color: #6289c6;
  background: rgba(82, 133, 202, 0.1);
}
.binding-tag.chat {
  color: #b38b46;
  background: rgba(195, 148, 66, 0.1);
}
.browse-unbound {
  color: var(--wb-text-muted);
  font-size: 11px;
}
.browse-mobile-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
@media (max-width: 1050px) {
  .browse-header {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .browse-header-controls {
    flex: 1;
    justify-content: flex-end;
  }
  .browse-book-picker {
    width: min(260px, 35vw);
  }
}
@media (max-width: 600px) {
  .browse-header-controls {
    width: 100%;
    flex-basis: 100%;
    justify-content: stretch;
  }
  .browse-book-picker {
    flex: 1;
    width: auto;
  }
  .browse-tools {
    padding: 12px;
  }
  .browse-tools-primary {
    flex-wrap: wrap;
  }
  .browse-tools-primary :deep(.wb-control-input-shell) {
    flex-basis: 100%;
  }
  .browse-tools-primary .browse-add {
    margin-left: auto;
  }
  .browse-actions {
    width: 100%;
  }
}
</style>
