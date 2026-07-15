<template>
  <div ref="rootRef" class="wb-assistant-root" :class="[focusCineRootClass, { 'is-mobile': isMobile, 'is-glass-mode': persistedState.glass_mode }]" :style="themeStyles">
    <SettingsPage
      v-if="utilityPage === 'settings'"
      :persisted-state="persistedState"
      :fab-visible="fabVisible"
      :floor-btn-visible="floorBtnVisible"
      :current-theme="currentTheme"
      :theme-options="themeOptions"
      :api-model-list="apiModelList"
      :api-model-loading="apiModelLoading"
      :version-info="versionInfo"
      :version-check-loading="versionCheckLoading"
      :version-check-error="versionCheckError"
      @back="closeUtilityPage"
      @set-fab-visible="setFabVisible"
      @toggle-floor-btns="toggleFloorBtns"
      @update-persisted-state="updatePersistedState"
      @set-tag-delete-parent-mode="setTagDeleteParentMode"
      @set-theme="setTheme"
      @update-api-config="updateApiConfig"
      @load-model-list="loadModelList"
      @check-latest-version="checkLatestVersion"
      @copy-version-import-url="copyVersionImportUrl"
    />
    <AIConfigPage
      v-if="utilityPage === 'ai-config'"
      :worldbook-names="worldbookNames"
      :target-worldbook="aiConfigTargetWorldbook"
      :input="aiConfigInput"
      :custom-prompt="aiConfigCustomPrompt"
      :changes="aiConfigChanges"
      :preview="aiConfigPreview"
      :generating="aiConfigGenerating"
      @back="closeUtilityPage"
      @back-to-input="aiConfigPreview = false"
      @update:target-worldbook="aiConfigTargetWorldbook = $event"
      @update:input="aiConfigInput = $event"
      @update:custom-prompt="aiConfigCustomPrompt = $event"
      @load-default-config-prompt="loadDefaultConfigPrompt"
      @generate="aiConfigGenerate"
      @apply="aiConfigApply"
    />
    <div
      v-show="isMainWorkspaceActive"
      class="main-workspace"
      data-main-workspace
      :aria-hidden="!isMainWorkspaceActive"
      :inert="!isMainWorkspaceActive || undefined"
    >

    <!-- ═══ Mobile Tab View ═══ -->
    <template v-if="isMobile">

      <!-- ═══ Mobile Browse Mode ═══ -->
      <template v-if="panelMode === 'browse'">
        <div class="mobile-browse-view">
          <!-- Mobile browse toolbar -->
          <section class="wb-toolbar browse-toolbar mobile-browse-toolbar">
            <WorldbookPicker :model-value="selectedWorldbookName" :names="selectableWorldbookNames" placeholder="请选择" @update:model-value="handleWorldbookSelectionUpdate" />
            <BaseInput v-model="searchText" class="browse-search" placeholder="🔍 搜索..." aria-label="搜索世界书条目" />
            <BaseButton size="sm" icon-only aria-label="保存世界书" :class="{ 'glow-pulse': hasUnsavedChanges }" :disabled="!hasUnsavedChanges" @click="saveCurrentWorldbook">💾</BaseButton>
          </section>

          <!-- Mobile browse card list -->
          <div class="browse-scroll-area mobile-browse-scroll">
            <section class="browse-bindings mobile-browse-bindings">
              <span v-if="bindings.global.length" class="binding-tag global">🟢 全局</span>
              <span v-if="bindings.charPrimary" class="binding-tag char">🔵 角色</span>
              <span v-if="bindings.chat" class="binding-tag chat">🟡 聊天</span>
              <span class="browse-entry-count">{{ filteredEntries.length }} / {{ draftEntries.length }}</span>
              <BaseButton size="sm" icon-only aria-label="新增条目" :disabled="!selectedWorldbookName" @click="addEntry">+</BaseButton>
            </section>
            <div class="browse-grid mobile-browse-grid">
              <article
                v-for="entry in browseVisibleEntries"
                :key="`mbrowse-card-${entry.uid}`"
                class="browse-card"
                :class="{
                  expanded: expandedBrowseCardUids.has(entry.uid),
                  disabled: !entry.enabled,
                }"
                :data-status="getEntryVisualStatus(entry)"
              >
                <div class="browse-card-header" @click="toggleBrowseCard(entry.uid)">
                  <span class="entry-status-dot" :data-status="getEntryVisualStatus(entry)"></span>
                  <span class="browse-card-title">{{ entry.name || `条目 ${entry.uid}` }}</span>
                  <BaseCheckbox
                    :model-value="entry.enabled"
                    class="browse-toggle-wrap"
                    :aria-label="`${entry.name || `条目 ${entry.uid}`}启用状态`"
                    @click.stop
                    @update:model-value="browseToggleEnabled(entry)"
                  >
                    <span class="browse-toggle-label">{{ entry.enabled ? 'ON' : 'OFF' }}</span>
                  </BaseCheckbox>
                </div>
                <div v-if="!expandedBrowseCardUids.has(entry.uid) && entry.strategy.keys.length" class="browse-card-keys" @click="toggleBrowseCard(entry.uid)">
                  <span v-for="(k, ki) in entry.strategy.keys.slice(0, 4)" :key="`mbk-${entry.uid}-${ki}`" class="browse-key-chip">{{ String(k) }}</span>
                  <span v-if="entry.strategy.keys.length > 4" class="browse-key-chip more">+{{ entry.strategy.keys.length - 4 }}</span>
                </div>
                <div v-if="!expandedBrowseCardUids.has(entry.uid)" class="browse-card-preview" @click="toggleBrowseCard(entry.uid)">
                  {{ browseGetContentPreview(entry) }}
                </div>
                <div v-if="!expandedBrowseCardUids.has(entry.uid)" class="browse-card-meta" @click="toggleBrowseCard(entry.uid)">
                  <span class="browse-meta-pill" :data-status="getEntryVisualStatus(entry)">{{ browseGetStrategyLabel(entry) }}</span>
                  <span class="browse-meta-pill">📍 {{ browseGetPositionLabel(entry) }}</span>
                </div>

                <!-- Mobile expanded inline editor -->
                <div v-if="expandedBrowseCardUids.has(entry.uid)" class="browse-card-expanded">
                  <label class="field">
                    <span>备注</span>
                    <BaseInput v-model="entry.name" placeholder="名称" />
                  </label>
                  <label class="field">
                    <span>主要关键词</span>
                    <BaseTextarea
                      class="browse-keys-input"
                      :model-value="entry.strategy.keys.map(k => String(k)).join(', ')"
                      placeholder="逗号分隔"
                      rows="1"
                      @change="entry.strategy.keys = ($event.target as HTMLTextAreaElement).value.split(',').map(s => s.trim()).filter(Boolean) as any"
                    />
                  </label>
                  <label class="field">
                    <span>内容</span>
                    <BaseTextarea v-model="entry.content" class="browse-content-input" placeholder="条目内容..." />
                  </label>
                  <div class="browse-config-grid mobile-config-grid">
                    <label class="field">
                      <span>策略</span>
                      <BaseSelect v-model="entry.strategy.type" :options="strategySelectOptions" :searchable="false" size="sm" aria-label="策略" />
                    </label>
                    <label class="field">
                      <span>位置</span>
                      <BaseSelect :model-value="getEntryPositionSelectValue(entry)" :options="positionSelectControlOptions" :searchable="false" size="sm" aria-label="位置" @update:model-value="setEntryPositionSelectValue(entry, $event)" />
                    </label>
                    <label class="field">
                      <span>权重</span>
                      <BaseInput v-model="entry.position.order" type="number" />
                    </label>
                  </div>
                  <div class="browse-recursion-row">
                    <BaseCheckbox v-model="entry.recursion.prevent_incoming">🚫 不可递归命中</BaseCheckbox>
                    <BaseCheckbox v-model="entry.recursion.prevent_outgoing">🚫 阻止后续递归</BaseCheckbox>
                  </div>
                  <div class="browse-card-actions">
                    <BaseButton variant="danger" size="sm" icon-only aria-label="删除条目" @click="removeSelectedEntry" @mousedown="selectEntry(entry.uid)">🗑</BaseButton>
                    <BaseButton variant="secondary" size="sm" @click="switchToEditorForEntry(entry.uid)">✏️ 完整编辑</BaseButton>
                    <BaseButton variant="ghost" size="sm" @click="toggleBrowseCard(entry.uid)">收起</BaseButton>
                  </div>
                </div>
              </article>
              <div v-if="browseHasMoreEntries" ref="browseLoadMoreSentinelRef" class="browse-load-more-sentinel">
                <span class="browse-load-more-text">已加载 {{ browseVisibleEntries.length }} / {{ filteredEntries.length }} …</span>
              </div>
              <div v-if="!filteredEntries.length" class="browse-empty">
                <div class="browse-empty-icon">📖</div>
                <div class="browse-empty-text">{{ selectedWorldbookName ? '无条目' : '请选择世界书' }}</div>
              </div>
            </div>
          </div>
        </div>
        <!-- Mobile browse bottom tabs -->
        <div class="mobile-tab-bar" style="display:flex !important;flex-shrink:0;">
          <BaseButton class="active">
            <span class="tab-icon">📖</span><span class="tab-label">浏览</span>
          </BaseButton>
          <BaseButton @click="switchPanelMode('editor')">
            <span class="tab-icon">✏️</span><span class="tab-label">编辑</span>
          </BaseButton>
        </div>
      </template>

      <!-- ═══ Mobile Editor Mode ═══ -->
      <template v-if="panelMode === 'editor'">
      <div class="mobile-tab-view">
        <div class="mobile-tab-content">

          <!-- Tab: 列表 -->
          <Transition name="mobile-tab">
            <div v-show="mobileTab === 'list'" class="mobile-pane">
              <section class="wb-toolbar">
                <label class="toolbar-label">
                  <span>世界书</span>
                  <WorldbookPicker
                    :model-value="selectedWorldbookName"
                    :names="selectableWorldbookNames"
                    placeholder="请选择世界书"
                    search-placeholder="搜索世界书..."
                    no-match-text="没有匹配的世界书"
                    show-tag-filter
                    :tag-definitions="tagDefinitions"
                    :tag-assignments="tagAssignments"
                    :tag-path-map="tagPathMap"
                    :selected-tag-ids="selectedTagFilterIds"
                    :tag-filter-logic="tagFilterLogic"
                    :tag-filter-match-mode="tagFilterMatchMode"
                    mobile-tag-view
                    @update:model-value="handleWorldbookSelectionUpdate"
                    @update:selected-tag-ids="updateSelectedTagFilterIds"
                    @update:tag-filter-logic="updateTagFilterLogic"
                    @update:tag-filter-match-mode="updateTagFilterMatchMode"
                  />
              </label>
              <div class="toolbar-btns" style="display:flex;gap:6px;flex-wrap:wrap;">
                <BaseButton size="sm" :class="{ 'glow-pulse': hasUnsavedChanges }" :disabled="!hasUnsavedChanges" @click="saveCurrentWorldbook">💾 保存</BaseButton>
                <BaseButton size="sm" @click="addEntry">+ 新条目</BaseButton>
                <BaseButton size="sm" @click="triggerImport">📥 导入</BaseButton>
                <BaseButton size="sm" :disabled="!selectedWorldbookName" @click="exportCurrentWorldbook">📤 导出</BaseButton>
                <BaseButton size="sm" :class="{ active: globalWorldbookMode }" @click="toggleGlobalMode">🌐 全局</BaseButton>
                <BaseButton size="sm" @click="extractFromChat">📥 提取</BaseButton>
                <BaseButton size="sm" @click="openSettingsPage">⚙️ 设置</BaseButton>
                <BaseButton size="sm" @click="openAiConfigPage">🔧 AI配置</BaseButton>
                <BaseButton size="sm" :disabled="!draftEntries.length" :class="{ active: viewSortActive }" @click="sortEntries">🔢 排序</BaseButton>
                <BaseButton size="sm" :disabled="!selectedEntry" @click="openEntryHistoryModal">🕰️ 条目时光机</BaseButton>
                <BaseButton size="sm" :disabled="!selectedWorldbookName" @click="openWorldbookHistoryModal">⏪ 整本时光机</BaseButton>
              </div>
            </section>
            <div class="wb-bindings" v-if="bindings.global.length || bindings.charPrimary || bindings.charAdditional.length || bindings.chat">
              <span v-for="name in bindings.global" :key="`bg-m-${name}`" class="binding-chip global" :title="name">{{ name }}</span>
              <span v-if="bindings.charPrimary" :key="`bc-m-${bindings.charPrimary}`" class="binding-chip char" :title="bindings.charPrimary">{{ bindings.charPrimary }}</span>
              <span v-for="name in bindings.charAdditional" :key="`bca-m-${name}`" class="binding-chip char" :title="name">{{ name }}</span>
              <span v-if="bindings.chat" :key="`bch-m-${bindings.chat}`" class="binding-chip chat" :title="bindings.chat">{{ bindings.chat }}</span>
            </div>
            <!-- Global Mode Panel (mobile) -->
            <div v-if="globalWorldbookMode" style="border:1px solid var(--wb-border-subtle);border-radius:8px;padding:10px;margin-bottom:8px;background:var(--wb-bg-card);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-weight:600;font-size:13px;">🌐 全局世界书（{{ bindings.global.length }}）</span>
                <BaseButton class="btn mini danger" type="button" :disabled="!bindings.global.length" @click="clearGlobalWorldbooks" style="font-size:11px;">清空</BaseButton>
              </div>
              <label class="field" style="margin-bottom:6px;">
                <span style="font-size:12px;">预设（切换即应用）</span>
                <BaseSelect v-model="selectedGlobalPresetId" :options="globalPresetOptions" :searchable="false" size="sm" aria-label="全局预设" @update:model-value="onGlobalPresetSelectionChanged" />
              </label>
              <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;">
                <BaseButton class="btn mini" type="button" :disabled="!bindings.global.length" @click="saveCurrentAsGlobalPreset" style="font-size:11px;">保存组合</BaseButton>
                <BaseButton class="btn mini" type="button" :disabled="!selectedGlobalPreset" @click="overwriteSelectedGlobalPreset" style="font-size:11px;">覆盖预设</BaseButton>
                <BaseButton class="btn mini danger" type="button" :disabled="!selectedGlobalPreset" @click="deleteSelectedGlobalPreset" style="font-size:11px;">删除预设</BaseButton>
              </div>
              <label class="field" style="margin-bottom:6px;">
                <span style="font-size:12px;">搜索并添加</span>
                <BaseInput v-model="globalAddSearchText" type="text" class="text-input" placeholder="搜索世界书..." @keydown.enter.prevent="addFirstGlobalCandidate" style="font-size:12px;" />
              </label>
              <div v-if="globalAddCandidates.length" style="max-height:120px;overflow-y:auto;margin-bottom:6px;">
                <BaseButton v-for="name in globalAddCandidates" :key="`m-add-${name}`" type="button" style="display:flex;justify-content:space-between;align-items:center;width:100%;padding:6px 8px;border:none;background:var(--wb-input-bg);border-radius:4px;color:var(--wb-text-main);font-size:12px;margin-bottom:2px;cursor:pointer;" @click="addGlobalWorldbook(name)">
                  <span>{{ name }}</span><span style="color:#22c55e;">+ 添加</span>
                </BaseButton>
              </div>
              <div v-if="filteredGlobalWorldbooks.length" style="font-size:12px;margin-bottom:4px;opacity:0.7;">已启用：</div>
              <div style="display:flex;flex-direction:column;gap:2px;margin-bottom:8px;">
                <BaseButton v-for="name in filteredGlobalWorldbooks" :key="`m-gl-${name}`" type="button" style="display:flex;justify-content:space-between;align-items:center;width:100%;padding:6px 8px;border:none;background:var(--wb-input-bg);border-radius:4px;color:var(--wb-text-main);font-size:12px;cursor:pointer;" @click="removeGlobalWorldbook(name)">
                  <span>{{ name }}</span><span style="color:#ef4444;">移除</span>
                </BaseButton>
              </div>
              <!-- Role Binding Section -->
              <div style="border-top:1px solid var(--wb-border-subtle);padding-top:8px;margin-top:4px;">
                <div style="font-size:12px;font-weight:600;margin-bottom:6px;">角色绑定</div>
                <div style="font-size:11px;margin-bottom:6px;opacity:0.8;" :style="{ color: currentRoleContext ? '#60a5fa' : '#94a3b8' }">
                  {{ currentRoleContext ? `当前角色: ${currentRoleContext.name}` : '当前未进入角色聊天' }}
                </div>
                <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
                  <BaseButton class="btn mini" type="button" :disabled="!selectedGlobalPreset || !currentRoleContext" @click="bindCurrentRoleToSelectedPreset" style="font-size:11px;">绑定当前角色</BaseButton>
                  <BaseButton class="btn mini" type="button" :disabled="!selectedGlobalPreset || !isCurrentRoleBoundToSelectedPreset" @click="unbindCurrentRoleFromSelectedPreset" style="font-size:11px;">解绑当前角色</BaseButton>
                </div>
                <div style="margin-bottom:6px;">
                  <BaseButton type="button" :disabled="!selectedGlobalPreset" @click="toggleRolePicker" style="display:flex;justify-content:space-between;align-items:center;width:100%;padding:6px 8px;border:1px solid var(--wb-border-subtle);border-radius:4px;background:var(--wb-input-bg);color:var(--wb-text-main);font-size:12px;cursor:pointer;">
                    <span>{{ selectedGlobalPreset ? '从角色卡列表选择绑定' : '请先选择预设' }}</span>
                    <span>{{ rolePickerOpen ? '▴' : '▾' }}</span>
                  </BaseButton>
                  <div v-if="rolePickerOpen" style="margin-top:4px;">
                    <BaseInput v-model="roleBindSearchText" type="text" class="text-input" placeholder="搜索角色名..." style="font-size:12px;margin-bottom:4px;" @keydown.enter.prevent="bindFirstRoleCandidate" />
                    <div style="max-height:120px;overflow-y:auto;">
                      <BaseButton v-for="candidate in roleBindingCandidates" :key="`m-role-${candidate.key}`" type="button" :disabled="candidate.bound" style="display:flex;justify-content:space-between;align-items:center;width:100%;padding:6px 8px;border:none;background:var(--wb-input-bg);border-radius:4px;color:var(--wb-text-main);font-size:12px;margin-bottom:2px;cursor:pointer;opacity: 1;" :style="{ opacity: candidate.bound ? '0.5' : '1' }" @click="bindRoleCandidateToSelectedPreset(candidate)">
                        <span>{{ candidate.name }}</span><span :style="{ color: candidate.bound ? '#94a3b8' : '#22c55e' }">{{ candidate.bound ? '已绑定' : '绑定' }}</span>
                      </BaseButton>
                      <div v-if="!roleBindingCandidates.length" style="font-size:11px;opacity:0.5;padding:4px;">没有匹配角色</div>
                    </div>
                  </div>
                </div>
                <div v-if="selectedGlobalPreset" style="display:flex;flex-wrap:wrap;gap:4px;">
                  <BaseButton v-for="binding in selectedGlobalPresetRoleBindings" :key="`m-rb-${selectedGlobalPreset?.id}-${binding.key}`" type="button" style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border:1px solid var(--wb-border-subtle);border-radius:4px;background:var(--wb-input-bg);color:var(--wb-text-main);font-size:11px;cursor:pointer;" @click="removeRoleBindingFromSelectedPreset(binding.key)">
                    {{ binding.name }} <span style="color:#ef4444;">×</span>
                  </BaseButton>
                  <div v-if="!selectedGlobalPresetRoleBindings.length" style="font-size:11px;opacity:0.5;">当前预设尚未绑定角色</div>
                </div>
                <div v-else style="font-size:11px;opacity:0.5;">选择预设后可配置角色绑定</div>
              </div>
            </div>
            <div class="mobile-entry-list">
              <div v-if="mobileMultiSelectMode" class="mobile-multi-toolbar">
                <span class="mobile-multi-title">多选模式 · 已选 {{ selectedEntryCount }}</span>
                <div class="mobile-multi-actions">
                  <BaseButton class="btn mini" type="button" @click="selectAllVisibleForMobileMultiSelect">全选可见</BaseButton>
                  <BaseButton class="btn mini" type="button" @click="clearMobileMultiSelectSelection">清空</BaseButton>
                  <BaseButton class="btn mini" type="button" @click="finishMobileMultiSelectMode">完成</BaseButton>
                </div>
              </div>
              <BaseButton
                v-for="entry in filteredEntries"
                :key="`me-${entry.uid}`"
                type="button"
                class="entry-item"
                :data-status="getEntryVisualStatus(entry)"
                :class="{
                  selected: selectedEntryUidSet.has(entry.uid),
                  primary: entry.uid === selectedEntryUid,
                  disabled: !entry.enabled,
                  'mobile-multi-item': mobileMultiSelectMode,
                }"
                @click="selectEntry(entry.uid, $event)"
                @pointerdown="startMobileEntryLongPress(entry.uid, $event)"
                @pointermove="handleMobileEntryLongPressMove($event)"
                @pointerup="finishMobileEntryLongPress($event)"
                @pointercancel="finishMobileEntryLongPress($event)"
                @lostpointercapture="finishMobileEntryLongPress()"
                @contextmenu.prevent
                style="border: 1px solid var(--wb-border-subtle); border-radius: 8px; padding: 8px 10px; margin-bottom: 4px;"
              >
                <div class="entry-item-head">
                  <BaseCheckbox
                    v-if="mobileMultiSelectMode"

                    class="mobile-multi-checkbox"
                    :checked="selectedEntryUidSet.has(entry.uid)"
                    @click.stop
                    @change="toggleMobileEntrySelection(entry.uid)"
                  />
                  <span class="entry-status-dot" :data-status="getEntryVisualStatus(entry)"></span>
                  <div class="entry-item-title">{{ entry.name || `条目 ${entry.uid}` }}</div>
                  <span v-if="mobileMultiSelectMode && selectedEntryUid === entry.uid && selectedEntryUidSet.has(entry.uid)" class="entry-chip mono">样板</span>
                  <span class="entry-chip uid">#{{ entry.uid }}</span>
                </div>
                <div class="entry-item-keys" v-if="entry.strategy.keys?.length">
                  {{ entry.strategy.keys.join(', ') }}
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;font-size:10px;opacity:0.8;">
                  <span style="background:var(--wb-input-bg);padding:2px 6px;border-radius:4px;">📍 {{ getPositionTypeLabel(entry.position.type, entry.position.role) }}</span>
                  <span style="background:var(--wb-input-bg);padding:2px 6px;border-radius:4px;">⚖️ #{{ entry.position.order }}</span>
                  <span v-if="entry.recursion.prevent_incoming" style="background:var(--wb-input-bg);padding:2px 6px;border-radius:4px;color:#f59e0b;">🚫入</span>
                  <span v-if="entry.recursion.prevent_outgoing" style="background:var(--wb-input-bg);padding:2px 6px;border-radius:4px;color:#f59e0b;">🚫出</span>
                </div>
              </BaseButton>
              <div v-if="!filteredEntries.length" class="empty-note">暂无条目</div>
            </div>
            </div>
          </Transition>

          <!-- Tab: 编辑 -->
          <Transition name="mobile-tab">
            <div v-show="mobileTab === 'edit'" class="mobile-pane">
              <template v-if="selectedEntry">
              <header class="editor-head">
                <label class="field editor-comment">
                  <span>备注 (COMMENT)</span>
                  <BaseInput v-model="selectedEntry.name" type="text" class="text-input" tabindex="-1" />
                </label>
                <div class="editor-badges">
                  <span class="editor-badge" :class="selectedEntry.enabled ? 'on' : 'off'">{{ selectedEntry.enabled ? 'EN' : 'OFF' }}</span>
                  <span class="editor-badge mono">#{{ selectedEntry.uid }}</span>
                  <span class="editor-badge mono">~{{ selectedTokenEstimate }}T</span>
                </div>
              </header>
              <section class="editor-grid two-cols editor-keyword-grid">
                <label class="field">
                  <span>主要关键词 (KEYS)</span>
                  <BaseTextarea :model-value="selectedKeysRaw" @update:model-value="selectedKeysRaw = $event" @blur="commitKeysFromRaw" class="text-area compact"></BaseTextarea>
                </label>
                <label class="field">
                  <span>次要关键词 (SECONDARY)</span>
                  <BaseTextarea :model-value="selectedSecondaryKeysRaw" @update:model-value="selectedSecondaryKeysRaw = $event" @blur="commitSecondaryKeysFromRaw" class="text-area compact"></BaseTextarea>
                </label>
              </section>
              <section class="editor-content-block" ref="editorContentBlockRef">
                <div v-if="isMobile" class="content-top-drag-handle" @pointerdown="startContentTopDrag">
                  <span class="content-top-drag-grip">━━━</span>
                </div>
                <div v-if="mobileMultiSelectMode" class="mobile-multi-content-note">多选模式下仅支持配置联动，内容编辑已禁用</div>
                <div class="editor-content-title">世界观设定 / 内容 (CONTENT)</div>
                <BaseTextarea
                  ref="contentTextareaRef"
                  v-model="selectedEntry.content"
                  class="text-area large editor-content-area"
                  :disabled="mobileMultiSelectMode"
                  style="min-height: calc(100vh - 500px);"
                ></BaseTextarea>
                <div class="content-resize-handle" @pointerdown="startContentResize">
                  <span class="content-resize-grip">━━━</span>
                </div>
              </section>
            </template>
            <div v-else class="empty-block">请在列表中选择一个条目</div>
          </div>
          </Transition>

          <!-- Tab: 设置 -->
          <Transition name="mobile-tab">
          <div v-show="mobileTab === 'settings'" class="mobile-pane">
            <template v-if="selectedEntry">
              <article class="editor-card">
                <h4>触发策略 (STRATEGY)</h4>
                <label class="field checkbox-inline">
                  <BaseCheckbox v-model="selectedEntry.enabled" />
                  <span>启用条目</span>
                </label>
                <div class="strategy-switch">
                  <BaseButton type="button" class="strategy-pill constant" :class="{ active: selectedEntry.strategy.type === 'constant' }" @click="selectedEntry.strategy.type = 'constant'">🔵 常驻</BaseButton>
                  <BaseButton type="button" class="strategy-pill vector" :class="{ active: selectedEntry.strategy.type === 'vectorized' }" @click="selectedEntry.strategy.type = 'vectorized'">📎 向量化</BaseButton>
                  <BaseButton type="button" class="strategy-pill selective" :class="{ active: selectedEntry.strategy.type === 'selective' }" @click="selectedEntry.strategy.type = 'selective'">🟢 关键词</BaseButton>
                </div>
                <details class="editor-advanced">
                  <summary>高级策略设置</summary>
                  <label class="field">
                    <span>次要逻辑 (LOGIC)</span>
                    <BaseSelect v-model="selectedEntry.strategy.keys_secondary.logic" :options="secondaryLogicSelectOptions" :searchable="false" size="sm" aria-label="次要逻辑" />
                  </label>
                  <label class="field">
                    <span>扫描深度</span>
                    <BaseInput v-model="selectedScanDepthText" type="text" class="text-input" placeholder="留空或 same_as_global" />
                  </label>
                  <label class="field">
                    <span>概率(0-100)</span>
                    <BaseInput v-model.number="selectedEntry.probability" type="number" class="text-input" min="0" max="100" step="1" />
                  </label>
                </details>
              </article>
              <article class="editor-card">
                <h4>插入设置 (INSERTION)</h4>
                <label class="field">
                  <span>位置 (Position)</span>
                  <BaseSelect v-model="selectedPositionSelectValue" :options="positionSelectControlOptions" :searchable="false" size="sm" aria-label="位置" />
                </label>
                <label class="field">
                  <span>权重 (Order)</span>
                  <BaseInput v-model.number="selectedEntry.position.order" type="number" class="text-input" step="1" />
                </label>
                <div class="editor-grid two-cols">
                  <label class="field" :class="{ disabled: selectedEntry.position.type !== 'at_depth' }">
                    <span>深度角色</span>
                    <BaseSelect v-model="selectedEntry.position.role" :options="positionRoleOptions" :searchable="false" size="sm" aria-label="深度角色" :disabled="selectedEntry.position.type !== 'at_depth'" />
                  </label>
                  <label class="field" :class="{ disabled: selectedEntry.position.type !== 'at_depth' }">
                    <span>深度层级</span>
                    <BaseInput v-model.number="selectedEntry.position.depth" type="number" class="text-input" min="0" step="1" :disabled="selectedEntry.position.type !== 'at_depth'" />
                  </label>
                </div>
              </article>
              <article class="editor-card">
                <h4>递归与效果 (RECURSION)</h4>
                <label class="field checkbox-inline">
                  <BaseCheckbox v-model="selectedEntry.recursion.prevent_incoming" />
                  <span>不可递归命中</span>
                </label>
                <label class="field checkbox-inline">
                  <BaseCheckbox v-model="selectedEntry.recursion.prevent_outgoing" />
                  <span>阻止后续递归</span>
                </label>
              </article>
              <details class="editor-advanced">
                <summary>高级字段 / extra JSON</summary>
                <label class="field">
                  <span>extra JSON（未知字段）</span>
                  <BaseTextarea v-model="selectedExtraText" class="text-area compact" placeholder="{ ... }"></BaseTextarea>
                </label>
                <div class="field-actions">
                  <BaseButton class="btn" type="button" @click="applyExtraJson">应用 extra</BaseButton>
                  <BaseButton class="btn" type="button" @click="clearExtra">清空 extra</BaseButton>
                </div>
              </details>
              <div class="mobile-danger-zone">
                <BaseButton class="btn danger" type="button" @click="removeSelectedEntry">🗑 删除此条目</BaseButton>
                <BaseButton class="btn" type="button" @click="duplicateSelectedEntry">📋 复制条目</BaseButton>
              </div>
            </template>
            <div v-else class="empty-block">请在列表中选择一个条目</div>
          </div>
          </Transition>

          <!-- Tab: 复制 -->
          <Transition name="mobile-tab">
          <div v-show="mobileTab === 'copy'" class="mobile-pane">
            <CrossCopyPanel
              variant="mobile"
              :compared-text="crossCopyWorkspaceComparedText"
              :source-target-invalid="crossCopySourceTargetInvalid"
              :last-result-summary="crossCopyLastResultSummary"
              :step="crossCopyMobileStep"
              :can-go-step2="crossCopyMobileCanGoStep2"
              :can-go-step3="crossCopyMobileCanGoStep3"
              :next-disabled="crossCopyMobileNextDisabled"
              :apply-loading="crossCopyApplyLoading"
              :selected-count="crossCopySelectedCount"
              @go-step="goToCrossCopyMobileStep"
              @previous="goToPreviousCrossCopyMobileStep"
              @next="goToNextCrossCopyMobileStep"
              @apply="applyCrossCopySelection"
            >
              <CrossCopyMobileStages :step="crossCopyMobileStep">
                <template #controls>
                  <CrossCopyControls
                    :worldbook-names="worldbookNames"
                    :source-worldbook="crossCopySourceWorldbook"
                    :target-worldbook="crossCopyTargetWorldbook"
                    :can-compare="crossCopyCanCompare"
                    :compare-loading="crossCopyCompareLoading"
                    :apply-loading="crossCopyApplyLoading"
                    :controls-collapsed="crossCopyControlsCollapsed"
                    :use-draft-source-when-current="crossCopyUseDraftSourceWhenCurrent"
                    :source-is-current-worldbook="crossCopySourceIsCurrentWorldbook"
                    :source-version-label="crossCopySourceVersionLabel"
                    :snapshot-before-apply="crossCopySnapshotBeforeApply"
                    :source-target-invalid="crossCopySourceTargetInvalid"
                    :compare-summary="crossCopyCompareSummary"
                    :last-result-summary="crossCopyLastResultSummary"
                    id-prefix="m"
                    mobile
                    @update:source-worldbook="crossCopySourceWorldbook = $event"
                    @update:target-worldbook="crossCopyTargetWorldbook = $event"
                    @update:use-draft-source-when-current="crossCopyUseDraftSourceWhenCurrent = $event"
                    @update:snapshot-before-apply="crossCopySnapshotBeforeApply = $event"
                    @refresh="refreshCrossCopyComparison"
                    @toggle-collapsed="toggleCrossCopyControlsCollapsed"
                  />
                </template>

                <template #source>
                  <CrossCopySourceList
                    :rows="crossCopySourceRowsFiltered"
                    :total-count="crossCopyRows.length"
                    :search-text="crossCopySearchText"
                    :apply-loading="crossCopyApplyLoading"
                    id-prefix="m"
                    mobile
                    :status-badge-class="getCrossCopyStatusBadgeClass"
                    @update:search-text="crossCopySearchText = $event"
                    @select-filtered="setCrossCopySelectionForFiltered"
                    @select-all="setCrossCopySelectionForAll"
                    @set-selected="setCrossCopyRowSelected"
                  />
                </template>

                <template #action>
                  <CrossCopyActionRows
                    :rows="crossCopyRowsFiltered"
                    :selected-count="crossCopySelectedCount"
                    :status-filter="crossCopyStatusFilter"
                    :status-priority="CROSS_COPY_STATUS_PRIORITY"
                    :status-counts="crossCopyStatusCounts"
                    :apply-loading="crossCopyApplyLoading"
                    id-prefix="m"
                    mobile
                    :status-label="getCrossCopyStatusLabel"
                    :action-label="getCrossCopyActionLabel"
                    :status-badge-class="getCrossCopyStatusBadgeClass"
                    :row-diff-summary="getCrossCopyRowDiffSummary"
                    @update:status-filter="crossCopyStatusFilter = $event"
                    @set-selected="setCrossCopyRowSelected"
                    @set-action="setCrossCopyRowAction"
                    @set-rename-name="setCrossCopyRowRenameName"
                    @rename-blur="handleCrossCopyRowRenameBlur"
                    @open-detail="openCrossCopyDiffById"
                  >
                    <template #bulk>
                      <CrossCopyBulkActions
                        :has-rows="Boolean(crossCopyRows.length)"
                        :selected-count="crossCopySelectedCount"
                        :bulk-action="crossCopyBulkAction"
                        :can-apply="crossCopyCanApply"
                        :apply-loading="crossCopyApplyLoading"
                        mobile
                        :action-label="getCrossCopyActionLabel"
                        @select-all="setCrossCopySelectionForAll"
                        @apply-status-action="applyCrossCopyActionByStatus"
                        @update:bulk-action="crossCopyBulkAction = $event"
                        @apply-bulk-action="applyCrossCopyBulkAction"
                      />
                    </template>
                  </CrossCopyActionRows>
                </template>
              </CrossCopyMobileStages>

            </CrossCopyPanel>
          </div>
          </Transition>

          <!-- Tab: AI -->
          <Transition name="mobile-tab">
          <div v-show="mobileTab === 'ai'" class="mobile-pane">
            <AIChatPanel
              :active-session="aiActiveSession"
              :messages="aiActiveMessages"
              :input="aiChatInputText"
              :use-context="aiUseContext"
              :is-generating="aiIsGenerating"
              :streaming-text="aiStreamingText"
              :is-mobile="true"
              :show-empty-actions="true"
              @create-session="aiCreateSession"
              @extract-from-chat="extractFromChat"
              @update:input="aiChatInputText = $event"
              @update:use-context="aiUseContext = $event"
              @send="aiSendMessage"
              @stop-generation="aiStopGeneration"
            />
          </div>
          </Transition>

          <!-- Tab: 标签 -->
          <Transition name="mobile-tab">
          <div v-show="mobileTab === 'tags'" class="mobile-pane">
            <TagEditorPanel
              mobile
              :rows="tagManagementRows"
              :new-name="tagNewName"
              :new-parent-id="tagNewParentId"
              :assign-target-id="tagAssignTargetId"
              :assign-search="tagAssignSearch"
              :assign-options="tagAssignOptions"
              :assign-worldbooks="tagAssignWorldbooks"
              :assignments="tagAssignments"
              :colors="TAG_COLORS"
              :name-of="getTagDefinitionName"
              :parent-id-of="getTagDefinitionParentId"
              :disabled-parent-ids="getTagDisabledParentIds"
              :path-summary="getWorldbookTagPathSummary"
              @update:new-name="tagNewName = $event"
              @update:new-parent-id="tagNewParentId = $event"
              @update:assign-target-id="tagAssignTargetId = $event"
              @update:assign-search="tagAssignSearch = $event"
              @create="tagCreate"
              @reset-all="tagResetAll"
              @rename="tagRename"
              @set-parent="tagSetParent"
              @set-color="tagSetColor"
              @delete-tag="tagDelete"
              @toggle-assignment="tagToggleAssignmentForSelectedTag"
            />
          </div>
          </Transition>

        </div>
      </div>

      <!-- Tab Bar: bottom, direct child of wb-assistant-root via fragment -->
      <div class="mobile-tab-bar" style="display:flex !important;flex-shrink:0;">
        <BaseButton @click="switchPanelMode('browse')">
          <span class="tab-icon">📖</span><span class="tab-label">浏览</span>
        </BaseButton>
        <BaseButton @click="mobileTab = 'list'" :class="{ active: mobileTab === 'list' }">
          <span class="tab-icon">📋</span><span class="tab-label">列表</span>
        </BaseButton>
        <BaseButton @click="mobileTab = 'edit'" :class="{ active: mobileTab === 'edit' }">
          <span class="tab-icon">✏️</span><span class="tab-label">编辑</span>
        </BaseButton>
        <BaseButton @click="mobileTab = 'settings'" :class="{ active: mobileTab === 'settings' }">
          <span class="tab-icon">⚙️</span><span class="tab-label">设置</span>
        </BaseButton>
        <BaseButton @click="mobileTab = 'copy'" :class="{ active: mobileTab === 'copy' }">
          <span class="tab-icon">📚</span><span class="tab-label">复制</span>
        </BaseButton>
        <BaseButton v-if="persistedState.show_ai_chat" @click="mobileTab = 'ai'" :class="{ active: mobileTab === 'ai' }">
          <span class="tab-icon">🤖</span><span class="tab-label">AI</span>
        </BaseButton>
        <BaseButton @click="mobileTab = 'tags'" :class="{ active: mobileTab === 'tags' }">
          <span class="tab-icon">🏷️</span><span class="tab-label">标签</span>
        </BaseButton>
      </div>
      </template><!-- end mobile editor mode -->
    </template>

    <!-- ═══ Desktop Layout ═══ -->
    <template v-if="!isMobile">

    <!-- ═══ Desktop Browse Mode (via BrowsePanel) ═══ -->
    <template v-if="panelMode === 'browse'">
      <BrowsePanel
        :model-value="selectedWorldbookName"
        :entries="draftEntries"
        :worldbookNames="selectableWorldbookNames"
        :bindings="bindings"
        :hasUnsavedChanges="hasUnsavedChanges"
        :isMobile="false"
        :globalMode="globalWorldbookMode"
        @create="createNewWorldbook"
        @duplicate="duplicateWorldbook"
        @delete="deleteCurrentWorldbook"
        @export="exportCurrentWorldbook"
        @import="triggerImport"
        @save="saveCurrentWorldbook"
        @switch-mode="switchPanelMode"
        @add-entry="addEntry"
        @toggle-global="toggleGlobalMode"
        @update:model-value="handleWorldbookSelectionUpdate"
      />

      <!-- Global Mode Panel (reuse existing) -->
      <section v-if="globalWorldbookMode" class="wb-bindings browse-global-mode">
        <!-- Intentionally showing the same global mode panel -->
        <div class="global-mode-panel">
          <div class="global-mode-grid">
            <div class="global-mode-column">
              <label class="field">
                <span>搜索并添加常驻世界书</span>
                <BaseInput
                  v-model="globalAddSearchText"
                  type="text"
                  class="text-input"
                  placeholder="搜索并添加..."
                  @keydown.enter.prevent="addFirstGlobalCandidate"
                />
              </label>
              <TransitionGroup name="list" tag="div" class="global-mode-list">
                <BaseButton
                  v-for="name in globalAddCandidates"
                  :key="`browse-add-${name}`"
                  class="global-mode-item add"
                  type="button"
                  @click="addGlobalWorldbook(name)"
                >
                  <span class="global-mode-item-name">{{ name }}</span>
                  <span class="global-mode-item-action">添加</span>
                </BaseButton>
                <div v-if="!globalAddCandidates.length" key="empty" class="empty-note">没有可添加的世界书</div>
              </TransitionGroup>
            </div>
            <div class="global-mode-column">
              <label class="field">
                <span>筛选常驻世界书</span>
                <BaseInput
                  v-model="globalFilterText"
                  type="text"
                  class="text-input"
                  placeholder="筛选..."
                />
              </label>
              <TransitionGroup name="list" tag="div" class="global-mode-list">
                <BaseButton
                  v-for="name in filteredGlobalWorldbooks"
                  :key="`browse-global-${name}`"
                  class="global-mode-item active"
                  type="button"
                  @click="removeGlobalWorldbook(name)"
                >
                  <span class="global-mode-item-name">{{ name }}</span>
                  <span class="global-mode-item-action">移除</span>
                </BaseButton>
                <div v-if="!filteredGlobalWorldbooks.length" key="empty" class="empty-note">暂无常驻世界书</div>
              </TransitionGroup>
            </div>
          </div>
        </div>
      </section>

      <!-- Card Grid -->
      <div class="browse-scroll-area">
        <div class="browse-grid">
          <article
            v-for="entry in browseVisibleEntries"
            :key="`browse-card-${entry.uid}`"
            class="browse-card"
            :class="{
              expanded: expandedBrowseCardUids.has(entry.uid),
              disabled: !entry.enabled,
            }"
            :data-status="getEntryVisualStatus(entry)"
          >
            <!-- Collapsed Header -->
            <div class="browse-card-header" @click="toggleBrowseCard(entry.uid)">
              <span class="entry-status-dot" :data-status="getEntryVisualStatus(entry)"></span>
              <span class="browse-card-title">{{ entry.name || `条目 ${entry.uid}` }}</span>
              <BaseCheckbox
                :model-value="entry.enabled"
                class="browse-toggle-wrap"
                :aria-label="`${entry.name || `条目 ${entry.uid}`}启用状态`"
                @click.stop
                @update:model-value="browseToggleEnabled(entry)"
              >
                <span class="browse-toggle-label">{{ entry.enabled ? 'ON' : 'OFF' }}</span>
              </BaseCheckbox>
            </div>

            <!-- Keywords preview (collapsed) -->
            <div v-if="!expandedBrowseCardUids.has(entry.uid) && entry.strategy.keys.length" class="browse-card-keys" @click="toggleBrowseCard(entry.uid)">
              <span v-for="(k, ki) in entry.strategy.keys.slice(0, 6)" :key="`bk-${entry.uid}-${ki}`" class="browse-key-chip">{{ String(k) }}</span>
              <span v-if="entry.strategy.keys.length > 6" class="browse-key-chip more">+{{ entry.strategy.keys.length - 6 }}</span>
            </div>

            <!-- Content preview (collapsed) -->
            <div v-if="!expandedBrowseCardUids.has(entry.uid)" class="browse-card-preview" @click="toggleBrowseCard(entry.uid)">
              {{ browseGetContentPreview(entry) }}
            </div>

            <!-- Meta row (collapsed) -->
            <div v-if="!expandedBrowseCardUids.has(entry.uid)" class="browse-card-meta" @click="toggleBrowseCard(entry.uid)">
              <span class="browse-meta-pill" :data-status="getEntryVisualStatus(entry)">{{ browseGetStrategyLabel(entry) }}</span>
              <span class="browse-meta-pill">📍 {{ browseGetPositionLabel(entry) }}</span>
              <span class="browse-meta-pill">⚖️ #{{ entry.position.order }}</span>
            </div>

            <!-- ═══ Expanded Inline Editor ═══ -->
            <div v-if="expandedBrowseCardUids.has(entry.uid)" class="browse-card-expanded">
              <label class="field">
                <span>备注 (Comment)</span>
                <BaseInput v-model="entry.name" placeholder="条目名称" />
              </label>
              <label class="field">
                <span>主要关键词</span>
                <BaseTextarea
                  class="browse-keys-input"
                  :model-value="entry.strategy.keys.map(k => String(k)).join(', ')"
                  placeholder="关键词, 用逗号分隔"
                  rows="1"
                  @change="entry.strategy.keys = ($event.target as HTMLTextAreaElement).value.split(',').map(s => s.trim()).filter(Boolean) as any"
                />
              </label>
              <label class="field">
                <span>次要关键词</span>
                <div class="browse-secondary-keys-row">
                  <BaseSelect v-model="entry.strategy.keys_secondary.logic" :options="secondaryLogicSelectOptions" :searchable="false" size="sm" aria-label="次要逻辑" />
                  <BaseTextarea
                    class="browse-keys-input"
                    :model-value="entry.strategy.keys_secondary.keys.map(k => String(k)).join(', ')"
                    placeholder="次要关键词, 用逗号分隔"
                    rows="1"
                    @change="entry.strategy.keys_secondary.keys = ($event.target as HTMLTextAreaElement).value.split(',').map(s => s.trim()).filter(Boolean) as any"
                  />
                </div>
              </label>
              <label class="field">
                <span>内容 (Content)</span>
                <BaseTextarea v-model="entry.content" class="browse-content-input" placeholder="世界书条目内容..." />
              </label>
              <div class="browse-config-grid">
                <label class="field">
                  <span>策略</span>
                  <BaseSelect v-model="entry.strategy.type" :options="strategySelectOptions" :searchable="false" size="sm" aria-label="策略" />
                </label>
                <label class="field">
                  <span>位置</span>
                  <BaseSelect :model-value="getEntryPositionSelectValue(entry)" :options="positionSelectControlOptions" :searchable="false" size="sm" aria-label="位置" @update:model-value="setEntryPositionSelectValue(entry, $event)" />
                </label>
                <label class="field">
                  <span>权重 (Order)</span>
                  <BaseInput v-model="entry.position.order" type="number" />
                </label>
                <label v-if="entry.position.type === 'at_depth'" class="field">
                  <span>深度 (Depth)</span>
                  <BaseInput v-model="entry.position.depth" type="number" min="0" />
                </label>
              </div>
              <div class="browse-recursion-row">
                <BaseCheckbox v-model="entry.recursion.prevent_incoming">🚫 不可递归命中</BaseCheckbox>
                <BaseCheckbox v-model="entry.recursion.prevent_outgoing">🚫 阻止后续递归</BaseCheckbox>
              </div>
              <div class="browse-card-actions">
                <BaseButton variant="secondary" size="sm" @click="duplicateSelectedEntry" @mouseenter="selectEntry(entry.uid)">📋 复制</BaseButton>
                <BaseButton variant="danger" size="sm" @click="removeSelectedEntry" @mouseenter="selectEntry(entry.uid)">🗑 删除</BaseButton>
                <BaseButton variant="secondary" size="sm" @click="switchToEditorForEntry(entry.uid)">✏️ 完整编辑</BaseButton>
                <BaseButton variant="ghost" size="sm" @click="toggleBrowseCard(entry.uid)">收起</BaseButton>
              </div>
            </div>
          </article>
          <div v-if="browseHasMoreEntries" ref="browseLoadMoreSentinelRef" class="browse-load-more-sentinel">
            <span class="browse-load-more-text">已加载 {{ browseVisibleEntries.length }} / {{ filteredEntries.length }} …</span>
          </div>
          <div v-if="!filteredEntries.length" class="browse-empty">
            <div class="browse-empty-icon">📖</div>
            <div class="browse-empty-text">{{ selectedWorldbookName ? '没有符合条件的条目' : '请选择一本世界书' }}</div>
          </div>
        </div>
      </div>
    </template>

    <!-- ═══ Desktop Editor Mode ═══ -->
    <template v-if="panelMode === 'editor'">
    <section class="wb-toolbar browse-toolbar" style="justify-content: flex-end; gap: 8px; padding: 6px 12px; min-height: 0;">
      <div class="browse-mode-switch">
        <BaseButton class="btn browse-mode-btn" type="button" @click="switchPanelMode('browse')">📖 浏览</BaseButton>
        <BaseButton class="btn browse-mode-btn active" type="button">✏️ 编辑</BaseButton>
      </div>
    </section>
    <section v-if="!isDesktopFocusMode" class="wb-toolbar">
            <label class="toolbar-label">
              <span>世界书</span>
              <div class="worldbook-picker">
                <BaseSelect :model-value="selectedWorldbookName" :options="worldbookSelectOptions" placeholder="请选择世界书" aria-label="世界书" @update:model-value="handleWorldbookSelectionUpdate" />
                  <div v-if="tagDefinitions.length" class="worldbook-picker-tags tree-mode">
                    <div class="tag-filter-toolbar">
                      <BaseButton class="btn mini tag-filter-open" type="button" @click="tagFilterPanelOpen = !tagFilterPanelOpen">🏷 标签筛选</BaseButton>
                      <span class="tag-filter-summary">{{ tagFilterSummary }}</span>
                      <BaseSelect v-model="tagFilterLogic" class="tag-filter-select" :options="tagFilterLogicOptions" :searchable="false" size="sm" aria-label="标签筛选逻辑" />
                      <BaseSelect v-model="tagFilterMatchMode" class="tag-filter-select" :options="tagFilterMatchModeOptions" :searchable="false" size="sm" aria-label="标签匹配模式" />
                      <BaseButton class="btn mini" type="button" :disabled="!selectedTagFilterIds.length" @click="clearTagFilterSelection">清空</BaseButton>
                    </div>
                    <Transition name="tag-filter-panel">
                      <div v-if="tagFilterPanelOpen" class="tag-filter-panel">
                        <BaseInput v-model="tagFilterSearchText" type="text" class="text-input tag-filter-search" placeholder="搜索标签名称 / 路径..." />
                        <div v-if="selectedTagFilterIds.length" class="tag-filter-selected-list">
                          <BaseButton
                            v-for="tagId in selectedTagFilterIds"
                            :key="`tag-selected-desktop-${tagId}`"
                            class="tag-filter-selected-chip"
                            type="button"
                            @click="toggleTagFilterSelection(tagId)"
                          >
                            {{ tagPathMap.get(tagId) ?? tagId }} ×
                          </BaseButton>
                        </div>
                        <div class="tag-tree-list">
                          <div v-for="row in tagTreeRows" :key="`tag-tree-desktop-${row.id}`" class="tag-tree-row" :style="{ '--depth': row.depth, '--tag-color': row.color }">
                            <BaseButton
                              v-if="row.hasChildren"
                              class="tag-tree-toggle"
                              type="button"
                              @click.stop="toggleTagTreeExpanded(row.id)"
                            >{{ tagTreeExpandedIds.includes(row.id) || tagFilterSearchText.trim() ? '▾' : '▸' }}</BaseButton>
                            <span v-else class="tag-tree-toggle placeholder"></span>
                            <BaseCheckbox :model-value="selectedTagFilterIdSet.has(row.id)" @update:model-value="toggleTagFilterSelection(row.id)" />
                            <span class="tag-tree-name">{{ row.name }}</span>
                            <span class="tag-tree-path">{{ row.path }}</span>
                          </div>
                          <div v-if="!tagTreeRows.length" class="empty-note">没有匹配的标签</div>
                        </div>
                      </div>
                    </Transition>
                  </div>
              </div>
            </label>
            <BaseButton class="btn" size="sm" data-focus-hero="wb_new" @click="createNewWorldbook">新建</BaseButton>
            <BaseButton class="btn" size="sm" data-focus-hero="wb_duplicate" :disabled="!selectedWorldbookName" @click="duplicateWorldbook">
              另存为
            </BaseButton>
            <BaseButton class="btn danger" size="sm" variant="danger" data-focus-hero="wb_delete" :disabled="!selectedWorldbookName" @click="deleteCurrentWorldbook">
              删除
            </BaseButton>
            <BaseButton class="btn" size="sm" data-focus-hero="wb_export" :disabled="!selectedWorldbookName" @click="exportCurrentWorldbook">
              导出
            </BaseButton>
            <BaseButton class="btn" size="sm" data-focus-hero="wb_import" @click="triggerImport">导入</BaseButton>
            <div class="focus-cine-sink-row" aria-hidden="true">
              <span class="focus-cine-sink" data-focus-sink="save_btn"></span>
              <span class="focus-cine-sink" data-focus-sink="more_btn"></span>
              <span class="focus-cine-sink" data-focus-sink="tools_btn"></span>
            </div>
          </section>

          <section v-else ref="focusToolbarRef" class="wb-focus-toolbar" :class="{ compact: isFocusToolbarCompact }">
            <div class="wb-focus-toolbar-row">
              <div class="wb-focus-core-group">
                <label class="toolbar-label focus-toolbar-label">
                  <span class="focus-toolbar-label-text">世界书</span>
                  <div class="worldbook-picker">
                    <BaseSelect :model-value="selectedWorldbookName" :options="worldbookSelectOptions" placeholder="请选择世界书" aria-label="世界书" size="sm" @update:model-value="handleWorldbookSelectionUpdate" />
                      <div v-if="tagDefinitions.length" class="worldbook-picker-tags tree-mode">
                        <div class="tag-filter-toolbar">
                          <BaseButton class="btn mini tag-filter-open" type="button" @click="tagFilterPanelOpen = !tagFilterPanelOpen">🏷 标签筛选</BaseButton>
                          <span class="tag-filter-summary">{{ tagFilterSummary }}</span>
                          <BaseSelect v-model="tagFilterLogic" class="tag-filter-select" :options="tagFilterLogicOptions" :searchable="false" size="sm" aria-label="标签筛选逻辑" />
                          <BaseSelect v-model="tagFilterMatchMode" class="tag-filter-select" :options="tagFilterMatchModeOptions" :searchable="false" size="sm" aria-label="标签匹配模式" />
                          <BaseButton class="btn mini" type="button" :disabled="!selectedTagFilterIds.length" @click="clearTagFilterSelection">清空</BaseButton>
                        </div>
                        <Transition name="tag-filter-panel">
                          <div v-if="tagFilterPanelOpen" class="tag-filter-panel">
                            <BaseInput v-model="tagFilterSearchText" type="text" class="text-input tag-filter-search" placeholder="搜索标签名称 / 路径..." />
                            <div v-if="selectedTagFilterIds.length" class="tag-filter-selected-list">
                              <BaseButton
                                v-for="tagId in selectedTagFilterIds"
                                :key="`tag-selected-focus-${tagId}`"
                                class="tag-filter-selected-chip"
                                type="button"
                                @click="toggleTagFilterSelection(tagId)"
                              >
                                {{ tagPathMap.get(tagId) ?? tagId }} ×
                              </BaseButton>
                            </div>
                            <div class="tag-tree-list">
                              <div v-for="row in tagTreeRows" :key="`tag-tree-focus-${row.id}`" class="tag-tree-row" :style="{ '--depth': row.depth, '--tag-color': row.color }">
                                <BaseButton
                                  v-if="row.hasChildren"
                                  class="tag-tree-toggle"
                                  type="button"
                                  @click.stop="toggleTagTreeExpanded(row.id)"
                                >{{ tagTreeExpandedIds.includes(row.id) || tagFilterSearchText.trim() ? '▾' : '▸' }}</BaseButton>
                                <span v-else class="tag-tree-toggle placeholder"></span>
                                <BaseCheckbox :model-value="selectedTagFilterIdSet.has(row.id)" @update:model-value="toggleTagFilterSelection(row.id)" />
                                <span class="tag-tree-name">{{ row.name }}</span>
                                <span class="tag-tree-path">{{ row.path }}</span>
                              </div>
                              <div v-if="!tagTreeRows.length" class="empty-note">没有匹配的标签</div>
                            </div>
                          </div>
                        </Transition>
                      </div>
                  </div>
                </label>
                <BaseButton class="btn" size="sm" data-focus-hero="save_btn" data-copy-hero="save_btn" aria-label="保存世界书" :class="{ 'glow-pulse': hasUnsavedChanges }" :disabled="!hasUnsavedChanges || isAnyCineLocked" @click="saveCurrentWorldbook">
                  {{ isFocusToolbarCompact ? '💾' : '💾 保存' }}
                </BaseButton>
                <BaseButton class="btn utility-btn" size="sm" data-focus-hero="focus_toggle" data-copy-hero="focus_toggle" aria-label="切换专注编辑" :class="{ active: isDesktopFocusMode }" :disabled="isAnyCineLocked" @click="toggleFocusEditing">
                  {{ isFocusToolbarCompact ? '🎯' : '🎯 专注开关' }}
                </BaseButton>
                <div ref="focusWorldbookMenuRef" class="focus-menu-wrap">
                  <BaseButton class="btn utility-btn" size="sm" data-focus-hero="more_btn" data-copy-hero="more_btn" aria-label="更多世界书操作" :disabled="isAnyCineLocked" @click="toggleFocusWorldbookMenu">
                    {{ isFocusToolbarCompact ? '⋯' : '更多' }}
                  </BaseButton>
                  <div class="focus-cine-sink-cluster menu" aria-hidden="true">
                    <span class="focus-cine-sink" data-focus-sink="wb_new"></span>
                    <span class="focus-cine-sink" data-focus-sink="wb_duplicate"></span>
                    <span class="focus-cine-sink" data-focus-sink="wb_delete"></span>
                    <span class="focus-cine-sink" data-focus-sink="wb_export"></span>
                    <span class="focus-cine-sink" data-focus-sink="wb_import"></span>
                  </div>
                  <Transition name="focus-menu-pop">
                    <div v-if="focusWorldbookMenuOpen" class="focus-menu-panel">
                      <BaseButton class="btn mini" size="sm" @click="runFocusWorldbookAction('create')">新建</BaseButton>
                      <BaseButton class="btn mini" size="sm" :disabled="!selectedWorldbookName" @click="runFocusWorldbookAction('duplicate')">另存为</BaseButton>
                      <BaseButton class="btn mini danger" size="sm" variant="danger" :disabled="!selectedWorldbookName" @click="runFocusWorldbookAction('delete')">删除</BaseButton>
                      <BaseButton class="btn mini" size="sm" @click="runFocusWorldbookAction('import')">导入</BaseButton>
                      <BaseButton class="btn mini" size="sm" :disabled="!selectedWorldbookName" @click="runFocusWorldbookAction('export')">导出</BaseButton>
                    </div>
                  </Transition>
                </div>
              </div>
              <div class="wb-focus-tool-entry">
                <BaseButton
                  size="sm"
                  class="btn history-btn utility-btn focus-search-btn"
                  data-focus-hero="find_btn"
                  data-copy-hero="find_btn"
                  type="button"
                  :class="{ active: floatingPanels.find.visible }"
                  :disabled="!draftEntries.length || isAnyCineLocked"
                  @click="toggleFloatingPanel('find')"
                  aria-label="查找替换"
                >
                  {{ isFocusToolbarCompact ? '🔎' : '🔎 查找替换' }}
                </BaseButton>
                <Transition name="focus-tools-trigger">
                  <BaseButton v-if="focusToolsTriggerVisible" class="btn history-btn utility-btn" size="sm" data-focus-hero="tools_btn" data-copy-hero="tools_btn" :disabled="focusToolsExpanded || isAnyCineLocked" @click="openFocusToolsBand">
                    {{ isFocusToolbarCompact ? '工具' : '更多工具' }}
                  </BaseButton>
                </Transition>
                <div class="focus-cine-sink-cluster tools" aria-hidden="true">
                  <span class="focus-cine-sink" data-focus-sink="tool_global"></span>
                  <span class="focus-cine-sink" data-focus-sink="tool_entry_history"></span>
                  <span class="focus-cine-sink" data-focus-sink="tool_worldbook_history"></span>
                  <span class="focus-cine-sink" data-focus-sink="tool_activation"></span>
                  <span class="focus-cine-sink" data-focus-sink="tool_ai_generate"></span>
                  <span class="focus-cine-sink" data-focus-sink="tool_extract"></span>
                  <span class="focus-cine-sink" data-focus-sink="tool_tag"></span>
                  <span class="focus-cine-sink" data-focus-sink="tool_copy"></span>
                  <span class="focus-cine-sink" data-focus-sink="tool_settings"></span>
                  <span class="focus-cine-sink" data-focus-sink="tool_ai_config"></span>
                </div>
              </div>
            </div>
            <Transition name="focus-tools-band" @after-leave="onFocusToolsBandAfterLeave">
              <div v-if="focusToolsExpanded" class="wb-focus-tools-band">
                <BaseButton class="btn history-btn utility-btn" size="sm" data-focus-hero="tool_global" data-copy-hero="tool_global" :class="{ active: globalWorldbookMode }" @click="toggleGlobalMode">🌐 全局模式</BaseButton>
                <BaseButton class="btn history-btn utility-btn" size="sm" data-focus-hero="tool_entry_history" data-copy-hero="tool_entry_history" :disabled="!selectedEntry" @click="openEntryHistoryModal">🕰️ 条目时光机</BaseButton>
                <BaseButton class="btn history-btn utility-btn" size="sm" data-focus-hero="tool_worldbook_history" data-copy-hero="tool_worldbook_history" :disabled="!selectedWorldbookName" @click="openWorldbookHistoryModal">⏪ 整本时光机</BaseButton>
                <BaseButton class="btn history-btn utility-btn" size="sm" data-focus-hero="tool_activation" data-copy-hero="tool_activation" :class="{ active: floatingPanels.activation.visible }" @click="toggleFloatingPanel('activation')">📡 激活监控</BaseButton>
                <BaseButton v-if="persistedState.show_ai_chat" class="btn history-btn utility-btn" size="sm" data-focus-hero="tool_ai_generate" data-copy-hero="tool_ai_generate" :class="{ active: aiGeneratorMode }" @click="aiToggleMode">🤖 AI 生成</BaseButton>
                <BaseButton class="btn history-btn utility-btn" size="sm" data-focus-hero="tool_extract" data-copy-hero="tool_extract" @click="extractFromChat">📥 从聊天提取</BaseButton>
                <BaseButton class="btn history-btn utility-btn" size="sm" data-focus-hero="tool_tag" data-copy-hero="tool_tag" :class="{ active: tagEditorMode }" @click="tagToggleMode">🏷️ 标签管理</BaseButton>
                <BaseButton class="btn history-btn utility-btn" size="sm" data-focus-hero="tool_copy" data-copy-hero="tool_copy" :class="{ active: crossCopyMode }" :disabled="isAnyCineLocked" @click="toggleCrossCopyMode">📚 跨书复制</BaseButton>
                <BaseButton class="btn history-btn utility-btn" size="sm" data-focus-hero="tool_settings" data-copy-hero="tool_settings" @click="openSettingsPage">⚙️ 设置</BaseButton>
                <BaseButton class="btn history-btn utility-btn" size="sm" data-focus-hero="tool_ai_config" data-copy-hero="tool_ai_config" @click="openAiConfigPage">🔧 AI配置</BaseButton>
                <BaseButton class="btn history-btn utility-btn focus-tools-collapse" size="sm" @click="closeFocusToolsBand">收起工具</BaseButton>
              </div>
            </Transition>
          </section>

          <!-- unified-control-exception: hidden native file input required for browser file picker -->
          <input
            ref="importFileInput"
            class="hidden-input"
            type="file"
            accept=".json,application/json"
            @change="onImportChange"
          />

          <div class="wb-scroll-area" :class="{ 'copy-workspace': crossCopyMode && !isMobile }">
          <section
            v-if="!isDesktopFocusMode || globalWorldbookMode"
            class="wb-bindings"
            :class="{
              'focus-bindings': isDesktopFocusMode,
              'copy-workspace': crossCopyMode && !globalWorldbookMode && !isDesktopFocusMode,
            }"
          >
            <div v-if="!isDesktopFocusMode && crossCopyMode" class="wb-copy-workspace-head">
              <div class="wb-copy-workspace-title">
                <strong>📚 跨书复制工作台</strong>
                <span>{{ crossCopyWorkspaceSummary }}</span>
              </div>
              <div class="wb-copy-workspace-actions">
                <span class="wb-copy-workspace-meta">{{ crossCopyWorkspaceComparedText }}</span>
                <div class="wb-copy-workspace-tool-anchor">
                  <BaseButton class="btn mini utility-btn" type="button" :disabled="isAnyCineLocked" @click="toggleCrossCopyWorkspaceTools">
                    {{ crossCopyWorkspaceToolsExpanded ? '收起工具' : '展开工具' }}
                  </BaseButton>
                  <div class="copy-cine-sink-cluster workspace" aria-hidden="true">
                    <span class="copy-cine-sink" data-copy-sink="focus_toggle"></span>
                    <span class="copy-cine-sink" data-copy-sink="save_btn"></span>
                    <span class="copy-cine-sink" data-copy-sink="more_btn"></span>
                    <span class="copy-cine-sink" data-copy-sink="tools_btn"></span>
                    <span class="copy-cine-sink" data-copy-sink="tool_global"></span>
                    <span class="copy-cine-sink" data-copy-sink="tool_entry_history"></span>
                    <span class="copy-cine-sink" data-copy-sink="tool_worldbook_history"></span>
                    <span class="copy-cine-sink" data-copy-sink="tool_activation"></span>
                    <span class="copy-cine-sink" data-copy-sink="tool_ai_generate"></span>
                    <span class="copy-cine-sink" data-copy-sink="tool_extract"></span>
                    <span class="copy-cine-sink" data-copy-sink="tool_tag"></span>
                    <span class="copy-cine-sink" data-copy-sink="tool_copy"></span>
                    <span class="copy-cine-sink" data-copy-sink="tool_settings"></span>
                    <span class="copy-cine-sink" data-copy-sink="tool_ai_config"></span>
                  </div>
                </div>
                <BaseButton class="btn mini utility-btn" type="button" :disabled="isAnyCineLocked" @click="toggleCrossCopyMode">退出模式</BaseButton>
              </div>
            </div>
            <Transition name="copy-workspace-tools">
            <div v-if="!isDesktopFocusMode && (!crossCopyMode || crossCopyWorkspaceToolsExpanded)" class="wb-history-shortcuts" :class="{ 'copy-workspace-tools': crossCopyMode }">
              <BaseButton class="btn history-btn utility-btn" data-focus-hero="focus_toggle" data-copy-hero="focus_toggle" type="button" :disabled="isAnyCineLocked" @click="toggleFocusEditing">🎯 专注编辑</BaseButton>
              <BaseButton
                class="btn history-btn utility-btn"
                data-focus-hero="tool_global"
                data-copy-hero="tool_global"
                type="button"
                :class="{ active: globalWorldbookMode }"
                @click="toggleGlobalMode"
              >
                🌐 全局模式
              </BaseButton>
              <BaseButton class="btn history-btn" data-focus-hero="tool_entry_history" data-copy-hero="tool_entry_history" type="button" :disabled="!selectedEntry" @click="openEntryHistoryModal">
                🕰️ 条目时光机
              </BaseButton>
              <BaseButton
                class="btn history-btn"
                data-focus-hero="tool_worldbook_history"
                data-copy-hero="tool_worldbook_history"
                type="button"
                :disabled="!selectedWorldbookName"
                @click="openWorldbookHistoryModal"
              >
                ⏪ 整本时光机
              </BaseButton>
              <BaseButton
                class="btn history-btn utility-btn"
                data-focus-hero="find_btn"
                data-copy-hero="find_btn"
                type="button"
                :class="{ active: floatingPanels.find.visible }"
                :disabled="!draftEntries.length || isAnyCineLocked"
                @click="toggleFloatingPanel('find')"
              >
                🔎 查找与替换
              </BaseButton>
              <BaseButton
                class="btn history-btn utility-btn"
                data-focus-hero="tool_activation"
                data-copy-hero="tool_activation"
                type="button"
                :class="{ active: floatingPanels.activation.visible }"
                @click="toggleFloatingPanel('activation')"
              >
                📡 激活监控
              </BaseButton>
              <BaseButton
                v-if="persistedState.show_ai_chat"
                class="btn history-btn utility-btn"
                data-focus-hero="tool_ai_generate"
                data-copy-hero="tool_ai_generate"
                type="button"
                :class="{ active: aiGeneratorMode }"
                @click="aiToggleMode"
              >
                🤖 AI 生成
              </BaseButton>
              <BaseButton
                class="btn history-btn utility-btn"
                data-focus-hero="tool_extract"
                data-copy-hero="tool_extract"
                type="button"
                @click="extractFromChat"
              >
                📥 从聊天提取
              </BaseButton>
              <BaseButton
                class="btn history-btn utility-btn"
                data-focus-hero="tool_tag"
                data-copy-hero="tool_tag"
                type="button"
                :class="{ active: tagEditorMode }"
                @click="tagToggleMode"
              >
                🏷️ 标签管理
              </BaseButton>
              <BaseButton
                class="btn history-btn utility-btn"
                data-focus-hero="tool_copy"
                data-copy-hero="tool_copy"
                type="button"
                :class="{ active: crossCopyMode }"
                :disabled="isAnyCineLocked"
                @click="toggleCrossCopyMode"
              >
                📚 跨书复制
              </BaseButton>
              <BaseButton
                class="btn history-btn utility-btn"
                data-focus-hero="tool_settings"
                data-copy-hero="tool_settings"
                type="button"
                @click="openSettingsPage"
              >
                ⚙️ 设置
              </BaseButton>
              <BaseButton
                class="btn history-btn utility-btn"
                data-focus-hero="tool_ai_config"
                data-copy-hero="tool_ai_config"
                type="button"
                @click="openAiConfigPage"
              >
                🔧 AI配置
              </BaseButton>
            </div>
            </Transition>
            <div v-if="globalWorldbookMode" class="global-mode-panel">
              <div class="global-mode-head">
                <span class="global-mode-title">全局世界书（{{ bindings.global.length }}）</span>
                <BaseButton class="btn mini danger" type="button" :disabled="!bindings.global.length" @click="clearGlobalWorldbooks">
                  清空全局
                </BaseButton>
              </div>
              <div class="global-mode-sections">
                <details class="global-mode-section" open>
                  <summary class="global-mode-section-summary">
                    <span class="global-mode-section-title">世界书预设（切换即应用）</span>
                    <span class="global-mode-section-meta">
                      {{ selectedGlobalPreset ? selectedGlobalPreset.name : '默认预设（清空全局）' }}
                    </span>
                  </summary>
                  <div class="global-mode-section-body global-preset-panel">
                    <label class="field">
                      <span>选择预设</span>
                      <BaseSelect v-model="selectedGlobalPresetId" :options="globalPresetOptions" :searchable="false" aria-label="全局预设" @update:model-value="onGlobalPresetSelectionChanged" />
                    </label>
                    <div class="global-mode-actions">
                      <BaseButton class="btn" type="button" :disabled="!bindings.global.length" @click="saveCurrentAsGlobalPreset">
                        保存当前组合
                      </BaseButton>
                      <BaseButton class="btn" type="button" :disabled="!selectedGlobalPreset" @click="overwriteSelectedGlobalPreset">
                        覆盖当前预设
                      </BaseButton>
                      <BaseButton class="btn danger" type="button" :disabled="!selectedGlobalPreset" @click="deleteSelectedGlobalPreset">
                        删除预设
                      </BaseButton>
                    </div>
                  </div>
                </details>

                <details class="global-mode-section" open>
                  <summary class="global-mode-section-summary">
                    <span class="global-mode-section-title">角色绑定（一个预设可绑定多个角色）</span>
                    <span class="preset-role-current" :class="{ empty: !currentRoleContext }">
                      {{ currentRoleContext ? `当前角色: ${currentRoleContext.name}` : '当前未进入角色聊天' }}
                    </span>
                  </summary>
                  <div class="global-mode-section-body preset-role-panel">
                    <div class="preset-role-actions">
                      <BaseButton
                        class="btn mini"
                        type="button"
                        :disabled="!selectedGlobalPreset || !currentRoleContext"
                        @click="bindCurrentRoleToSelectedPreset"
                      >
                        绑定当前角色
                      </BaseButton>
                      <BaseButton
                        class="btn mini"
                        type="button"
                        :disabled="!selectedGlobalPreset || !isCurrentRoleBoundToSelectedPreset"
                        @click="unbindCurrentRoleFromSelectedPreset"
                      >
                        解绑当前角色
                      </BaseButton>
                    </div>
                    <div ref="rolePickerRef" class="role-picker">
                      <BaseButton
                        class="role-picker-trigger"
                        type="button"
                        :disabled="!selectedGlobalPreset"
                        @click="toggleRolePicker"
                      >
                        <span class="role-picker-trigger-text">
                          {{ selectedGlobalPreset ? '从角色卡列表选择绑定' : '请先选择预设' }}
                        </span>
                        <span class="role-picker-trigger-arrow">{{ rolePickerOpen ? '▴' : '▾' }}</span>
                      </BaseButton>
                      <div v-if="rolePickerOpen" class="role-picker-dropdown">
                        <BaseInput
                          ref="rolePickerSearchInputRef"
                          v-model="roleBindSearchText"
                          type="text"
                          class="text-input role-picker-search"
                          placeholder="搜索角色名 / avatar..."
                          @keydown.enter.prevent="bindFirstRoleCandidate"
                        />
                        <div class="role-picker-list">
                          <BaseButton
                            v-for="candidate in roleBindingCandidates"
                            :key="`role-candidate-${candidate.key}`"
                            class="role-picker-item"
                            type="button"
                            :disabled="candidate.bound"
                            @click="bindRoleCandidateToSelectedPreset(candidate)"
                          >
                            <span class="name">{{ candidate.name }}</span>
                            <span class="meta">{{ candidate.bound ? '已绑定' : '绑定' }}</span>
                          </BaseButton>
                          <div v-if="!roleBindingCandidates.length" class="empty-note">没有匹配角色</div>
                        </div>
                      </div>
                    </div>
                    <div class="preset-role-tags">
                      <BaseButton
                        v-for="binding in selectedGlobalPresetRoleBindings"
                        :key="`binding-${selectedGlobalPreset?.id}-${binding.key}`"
                        class="preset-role-tag"
                        type="button"
                        :title="`点击移除绑定: ${binding.name}`"
                        @click="removeRoleBindingFromSelectedPreset(binding.key)"
                      >
                        <span>{{ binding.name }}</span>
                        <span class="remove">×</span>
                      </BaseButton>
                      <div v-if="selectedGlobalPreset && !selectedGlobalPresetRoleBindings.length" class="empty-note">
                        当前预设尚未绑定角色
                      </div>
                      <div v-if="!selectedGlobalPreset" class="empty-note">选择预设后可配置角色绑定</div>
                    </div>
                  </div>
                </details>
              </div>
              <div class="global-mode-grid">
                <div class="global-mode-column">
                  <label class="field">
                    <span>搜索并添加常驻世界书</span>
                    <BaseInput
                      v-model="globalAddSearchText"
                      type="text"
                      class="text-input"
                      placeholder="搜索并添加常驻世界书..."
                      @keydown.enter.prevent="addFirstGlobalCandidate"
                    />
                  </label>
                  <TransitionGroup name="list" tag="div" class="global-mode-list">
                    <BaseButton
                      v-for="name in globalAddCandidates"
                      :key="`add-${name}`"
                      class="global-mode-item add"
                      type="button"
                      @click="addGlobalWorldbook(name)"
                    >
                      <span class="global-mode-item-name">{{ name }}</span>
                      <span class="global-mode-item-action">添加</span>
                    </BaseButton>
                    <div v-if="!globalAddCandidates.length" key="empty" class="empty-note">没有可添加的世界书</div>
                  </TransitionGroup>
                </div>
                <div class="global-mode-column">
                  <label class="field">
                    <span>筛选常驻世界书</span>
                    <BaseInput
                      v-model="globalFilterText"
                      type="text"
                      class="text-input"
                      placeholder="筛选常驻世界书..."
                    />
                  </label>
                  <TransitionGroup name="list" tag="div" class="global-mode-list">
                    <BaseButton
                      v-for="name in filteredGlobalWorldbooks"
                      :key="`global-${name}`"
                      class="global-mode-item active"
                      type="button"
                      @click="removeGlobalWorldbook(name)"
                    >
                      <span class="global-mode-item-name">{{ name }}</span>
                      <span class="global-mode-item-action">移除</span>
                    </BaseButton>
                    <div v-if="!filteredGlobalWorldbooks.length" key="empty" class="empty-note">
                      {{ bindings.global.length ? '没有匹配结果' : '暂无常驻世界书' }}
                    </div>
                  </TransitionGroup>
                </div>
              </div>
              <div class="global-mode-actions">
                <BaseButton class="btn" type="button" :disabled="!selectedWorldbookName" @click="toggleGlobalBinding">
                  {{ isGlobalBound ? '移出全局' : '加入全局' }}
                </BaseButton>
              </div>
            </div>
          </section>

          <!-- ═══ AI Generator Panel ═══ -->
          <section v-if="aiGeneratorMode" class="ai-generator-panel">
            <div class="ai-sidebar">
              <div class="ai-sidebar-head">
                <span class="ai-sidebar-title">对话列表</span>
                <BaseButton class="btn mini" type="button" @click="aiCreateSession">+ 新建</BaseButton>
              </div>
              <div class="ai-session-list">
                <div
                  v-for="session in aiSessions"
                  :key="session.id"
                  class="ai-session-item"
                  :class="{ active: session.id === aiActiveSession?.id }"
                  role="button"
                  tabindex="0"
                  @click="aiSwitchSession(session.id)"
                  @keydown.enter.prevent="aiSwitchSession(session.id)"
                  @keydown.space.prevent="aiSwitchSession(session.id)"
                >
                  <span class="ai-session-title">{{ session.title }}</span>
                  <span class="ai-session-meta">{{ session.messages.length }} 条消息</span>
                  <BaseButton
                    class="ai-session-delete"
                    type="button"
                    title="删除对话"
                    @click.stop="aiDeleteSession(session.id)"
                  >×</BaseButton>
                </div>
                <div v-if="!aiSessions.length" class="empty-note">暂无对话，点击上方新建</div>
              </div>
            </div>
            <AIChatPanel
              :active-session="aiActiveSession"
              :messages="aiActiveMessages"
              :input="aiChatInputText"
              :use-context="aiUseContext"
              :is-generating="aiIsGenerating"
              :streaming-text="aiStreamingText"
              :is-mobile="false"
              empty-text="选择或新建一个对话开始生成"
              @create-session="aiCreateSession"
              @extract-from-chat="extractFromChat"
              @update:input="aiChatInputText = $event"
              @update:use-context="aiUseContext = $event"
              @send="aiSendMessage"
              @stop-generation="aiStopGeneration"
            />
          </section>

          <!-- 标签编辑模式 -->
          <TagEditorPanel
            v-if="tagEditorMode"
            desktop
            :rows="tagManagementRows"
            :new-name="tagNewName"
            :new-parent-id="tagNewParentId"
            :assign-target-id="tagAssignTargetId"
            :assign-search="tagAssignSearch"
            :assign-options="tagAssignOptions"
            :assign-worldbooks="tagAssignWorldbooks"
            :assignments="tagAssignments"
            :colors="TAG_COLORS"
            :name-of="getTagDefinitionName"
            :parent-id-of="getTagDefinitionParentId"
            :disabled-parent-ids="getTagDisabledParentIds"
            :path-summary="getWorldbookTagPathSummary"
            @update:new-name="tagNewName = $event"
            @update:new-parent-id="tagNewParentId = $event"
            @update:assign-target-id="tagAssignTargetId = $event"
            @update:assign-search="tagAssignSearch = $event"
            @create="tagCreate"
            @reset-all="tagResetAll"
            @rename="tagRename"
            @set-parent="tagSetParent"
            @set-color="tagSetColor"
            @delete-tag="tagDelete"
            @toggle-assignment="tagToggleAssignmentForSelectedTag"
          />

          <CrossCopyPanel
            v-if="crossCopyMode"
            variant="desktop"
            :workspace-summary="crossCopyWorkspaceSummary"
            :compared-text="crossCopyWorkspaceComparedText"
            :controls-collapsed="crossCopyControlsCollapsed"
            :cine-locked="isAnyCineLocked"
            :apply-loading="crossCopyApplyLoading"
            :selected-count="crossCopySelectedCount"
            @toggle-controls-collapsed="toggleCrossCopyControlsCollapsed"
            @exit="toggleCrossCopyMode"
          >

            <CrossCopyControls
              :worldbook-names="worldbookNames"
              :source-worldbook="crossCopySourceWorldbook"
              :target-worldbook="crossCopyTargetWorldbook"
              :can-compare="crossCopyCanCompare"
              :compare-loading="crossCopyCompareLoading"
              :apply-loading="crossCopyApplyLoading"
              :controls-collapsed="crossCopyControlsCollapsed"
              :use-draft-source-when-current="crossCopyUseDraftSourceWhenCurrent"
              :source-is-current-worldbook="crossCopySourceIsCurrentWorldbook"
              :source-version-label="crossCopySourceVersionLabel"
              :snapshot-before-apply="crossCopySnapshotBeforeApply"
              :source-target-invalid="crossCopySourceTargetInvalid"
              :compare-summary="crossCopyCompareSummary"
              :last-result-summary="crossCopyLastResultSummary"
              id-prefix="d"
              @update:source-worldbook="crossCopySourceWorldbook = $event"
              @update:target-worldbook="crossCopyTargetWorldbook = $event"
              @update:use-draft-source-when-current="crossCopyUseDraftSourceWhenCurrent = $event"
              @update:snapshot-before-apply="crossCopySnapshotBeforeApply = $event"
              @refresh="refreshCrossCopyComparison"
              @toggle-collapsed="toggleCrossCopyControlsCollapsed"
            />

            <CrossCopyDesktopGrid
              :single-column="crossCopyDesktopSingleColumn"
              :grid-style="crossCopyGridStyle"
              :dragging="Boolean(crossCopyPaneResizeState)"
              @start-resize="startCrossCopyPaneResize"
            >
              <template #source>
                <CrossCopySourceList
                  :rows="crossCopySourceRowsFiltered"
                  :total-count="crossCopyRows.length"
                  :search-text="crossCopySearchText"
                  :apply-loading="crossCopyApplyLoading"
                  id-prefix="d"
                  :status-badge-class="getCrossCopyStatusBadgeClass"
                  @update:search-text="crossCopySearchText = $event"
                  @select-filtered="setCrossCopySelectionForFiltered"
                  @select-all="setCrossCopySelectionForAll"
                  @set-selected="setCrossCopyRowSelected"
                />
              </template>

              <template #action>
                <CrossCopyActionRows
                  :rows="crossCopyRowsFiltered"
                  :selected-count="crossCopySelectedCount"
                  :status-filter="crossCopyStatusFilter"
                  :status-priority="CROSS_COPY_STATUS_PRIORITY"
                  :status-counts="crossCopyStatusCounts"
                  :apply-loading="crossCopyApplyLoading"
                  id-prefix="d"
                  :status-label="getCrossCopyStatusLabel"
                  :action-label="getCrossCopyActionLabel"
                  :status-badge-class="getCrossCopyStatusBadgeClass"
                  :row-diff-summary="getCrossCopyRowDiffSummary"
                  @update:status-filter="crossCopyStatusFilter = $event"
                  @set-selected="setCrossCopyRowSelected"
                  @set-action="setCrossCopyRowAction"
                  @set-rename-name="setCrossCopyRowRenameName"
                  @rename-blur="handleCrossCopyRowRenameBlur"
                  @open-detail="openCrossCopyDiffById"
                />
              </template>
            </CrossCopyDesktopGrid>

            <CrossCopyBulkActions
              :has-rows="Boolean(crossCopyRows.length)"
              :selected-count="crossCopySelectedCount"
              :bulk-action="crossCopyBulkAction"
              :can-apply="crossCopyCanApply"
              :apply-loading="crossCopyApplyLoading"
              :action-label="getCrossCopyActionLabel"
              @select-all="setCrossCopySelectionForAll"
              @apply-status-action="applyCrossCopyActionByStatus"
              @update:bulk-action="crossCopyBulkAction = $event"
              @apply-bulk-action="applyCrossCopyBulkAction"
              @apply-selection="applyCrossCopySelection"
            />
          </CrossCopyPanel>

          <section v-show="!aiGeneratorMode && !tagEditorMode && !crossCopyMode" ref="mainLayoutRef" class="wb-main-layout" :class="{ 'focus-mode': isDesktopFocusMode, 'global-mode-visible': globalWorldbookMode }" :style="mainLayoutStyle">
            <aside v-show="!showMobileEditor" class="wb-entry-list" :class="{ focus: isDesktopFocusMode }">
              <div v-if="!isDesktopFocusMode" class="list-search">
                <BaseInput v-model="searchText" type="text" class="text-input" placeholder="搜索名称 / 内容 / 关键词" />
                <label class="checkbox-inline">
                  <BaseCheckbox v-model="onlyEnabled" />
                  <span>仅启用</span>
                </label>
              </div>
              <div v-if="!isDesktopFocusMode" class="list-summary">
                <span>条目 {{ filteredEntries.length }} / {{ draftEntries.length }} | 启用 {{ enabledEntryCount }} | 选中 {{ selectedEntryCount }}</span>
                <BaseButton class="btn mini" type="button" :disabled="!draftEntries.length" :class="{ active: viewSortActive }" @click="sortEntries" style="margin-left:auto;font-size:11px;">🔢 排序</BaseButton>
              </div>
              <div v-if="selectedEntryCount > 1 && !isMobile" class="list-multi-edit-hint" :class="{ off: !multiEditEnabled }">
                {{ multiEditHintText }}
              </div>
              <TransitionGroup name="list" tag="div" class="list-scroll">
                <BaseButton
                  v-for="entry in filteredEntries"
                  :key="entry.uid"
                  type="button"
                  class="entry-item"
                  :data-status="getEntryVisualStatus(entry)"
                  :class="{
                    selected: selectedEntryUidSet.has(entry.uid),
                    primary: entry.uid === selectedEntryUid,
                    'drag-source': draggingEntryUids.includes(entry.uid),
                    'drop-before': entryDropTargetUid === entry.uid && entryDropPosition === 'before',
                    'drop-after': entryDropTargetUid === entry.uid && entryDropPosition === 'after',
                    disabled: !entry.enabled,
                  }"
                  :draggable="!isMobile"
                  @click="selectEntry(entry.uid, $event)"
                  @dragstart="handleEntryDragStart(entry.uid, $event)"
                  @dragover="handleEntryDragOver(entry.uid, $event)"
                  @drop="handleEntryDrop(entry.uid, $event)"
                  @dragend="handleEntryDragEnd"
                >
                  <div class="entry-item-head">
                    <span class="entry-status-dot" :data-status="getEntryVisualStatus(entry)"></span>
                    <div class="entry-item-title">{{ entry.name || `条目 ${entry.uid}` }}</div>
                    <span v-if="!isDesktopFocusMode" class="entry-chip uid">#{{ entry.uid }}</span>
                  </div>
                  <div v-if="!isDesktopFocusMode" class="entry-item-tags">
                    <span class="entry-chip status" :data-status="getEntryVisualStatus(entry)">
                      {{ getEntryStatusLabel(entry) }}
                    </span>
                    <span class="entry-chip">🔑 {{ entry.strategy.keys.length }}</span>
                    <span class="entry-chip">🎯 {{ entry.probability }}</span>
                    <span class="entry-chip mono">#{{ entry.position.order }}</span>
                  </div>
                  <div v-if="!isDesktopFocusMode" class="entry-item-preview">{{ getEntryKeyPreview(entry) }}</div>
                </BaseButton>
              </TransitionGroup>
              <div v-if="!isDesktopFocusMode" class="list-actions">
                <BaseButton class="btn" type="button" :disabled="!selectedWorldbookName" @click="addEntry">新增</BaseButton>
                <BaseButton class="btn" type="button" :disabled="!selectedEntry" @click="duplicateSelectedEntry">
                  复制
                </BaseButton>
                <BaseButton class="btn danger" type="button" :disabled="!selectedEntry" @click="removeSelectedEntry">
                  删除
                </BaseButton>
                <BaseButton class="btn" type="button" :disabled="!selectedEntry" @click="moveSelectedEntry(-1)">
                  上移
                </BaseButton>
                <BaseButton class="btn" type="button" :disabled="!selectedEntry" @click="moveSelectedEntry(1)">下移</BaseButton>
              </div>
            </aside>
            <div
              v-show="!isMobile"
              class="wb-resize-handle main"
              :class="{ dragging: paneResizeState?.key === 'main' }"
              @pointerdown="startPaneResize('main', $event)"
            ></div>

            <main v-show="!isMobile || showMobileEditor" class="wb-editor">
              <template v-if="selectedEntry">
                <div ref="editorShellRef" class="wb-editor-shell" :style="editorShellStyle">
                  <section class="editor-center" :class="{ focus: isDesktopFocusMode }">
                    <header class="editor-head" :class="{ focus: isDesktopFocusMode }">
                      <div v-if="isMobile" class="editor-back-btn" @click="goBackToList">
                        ← 返回
                      </div>
                      <template v-if="!isDesktopFocusMode">
                        <label class="field editor-comment">
                          <span>备注 (COMMENT)</span>
                          <BaseInput v-model="selectedEntry.name" type="text" class="text-input" />
                        </label>
                      </template>
                      <template v-else>
                        <div class="focus-meta-summary-row">
                          <BaseButton class="focus-meta-chip" type="button" :class="{ active: focusMetaPanel.comment }" @click="toggleFocusMetaPanel('comment')">
                            <span>备注</span>
                            <strong>{{ focusCommentSummary }}</strong>
                          </BaseButton>
                          <BaseButton class="focus-meta-chip" type="button" :class="{ active: focusMetaPanel.keywords }" @click="toggleFocusMetaPanel('keywords')">
                            <span>关键词</span>
                            <strong>{{ focusKeywordSummary }}</strong>
                          </BaseButton>
                        </div>
                      </template>
                      <div class="editor-badges">
                        <span class="editor-badge" :class="selectedEntry.enabled ? 'on' : 'off'">
                          {{ selectedEntry.enabled ? 'EN' : 'OFF' }}
                        </span>
                        <span class="editor-badge strategy" :data-status="getEntryVisualStatus(selectedEntry)">
                          {{ getEntryStatusLabel(selectedEntry) }}
                        </span>
                        <span class="editor-badge mono">#{{ selectedEntry.uid }}</span>
                        <span class="editor-badge mono">Chars {{ selectedContentChars }}</span>
                        <span class="editor-badge mono">~{{ selectedTokenEstimate }}T</span>
                      </div>
                    </header>

                    <Transition name="focus-meta-panel">
                      <section v-if="isDesktopFocusMode && focusMetaPanel.comment" class="focus-meta-panel">
                        <label class="field editor-comment">
                          <span>备注 (COMMENT)</span>
                          <BaseInput v-model="selectedEntry.name" type="text" class="text-input" />
                        </label>
                      </section>
                    </Transition>

                    <section v-if="!isDesktopFocusMode || focusMetaPanel.keywords" class="editor-grid two-cols editor-keyword-grid">
                      <label class="field">
                        <span>主要关键词 (KEYS)</span>
                        <BaseTextarea :model-value="selectedKeysRaw" @update:model-value="selectedKeysRaw = $event" @blur="commitKeysFromRaw" class="text-area compact"></BaseTextarea>
                      </label>
                      <label class="field">
                        <span>次要关键词 (SECONDARY)</span>
                        <BaseTextarea :model-value="selectedSecondaryKeysRaw" @update:model-value="selectedSecondaryKeysRaw = $event" @blur="commitSecondaryKeysFromRaw" class="text-area compact"></BaseTextarea>
                      </label>
                    </section>

                    <section class="editor-content-block">
                      <div class="editor-content-title">世界观设定 / 内容 (CONTENT)</div>
                      <BaseTextarea
                        ref="contentTextareaRef"
                        v-model="selectedEntry.content"
                        class="text-area large editor-content-area"
                      ></BaseTextarea>
                      <div
                        class="content-resize-handle"
                        @pointerdown="startContentResize"
                      >
                        <span class="content-resize-grip">⋯</span>
                      </div>
                    </section>

                    <details class="editor-advanced">
                      <summary>高级字段 / extra JSON</summary>
                      <label class="field">
                        <span>extra JSON（未知字段）</span>
                        <BaseTextarea v-model="selectedExtraText" class="text-area compact" placeholder="{ ... }"></BaseTextarea>
                      </label>
                      <div class="field-actions">
                        <BaseButton class="btn" type="button" @click="applyExtraJson">应用 extra</BaseButton>
                        <BaseButton class="btn" type="button" @click="clearExtra">清空 extra</BaseButton>
                      </div>
                    </details>
                  </section>
                  <div
                    v-show="!isMobile"
                    class="wb-resize-handle editor"
                    :class="{ dragging: paneResizeState?.key === 'editor' }"
                    @pointerdown="startPaneResize('editor', $event)"
                  ></div>

                  <aside class="editor-side" :class="{ focus: isDesktopFocusMode }">
                    <article class="editor-card focus-side-card" :class="{ open: focusSidePanelState.strategy }">
                      <template v-if="isDesktopFocusMode">
                        <BaseButton type="button" class="focus-side-summary" @click="toggleFocusSidePanel('strategy')">
                          <span class="focus-side-summary-title">触发策略</span>
                          <span class="focus-side-summary-value">{{ focusStrategySummary }}</span>
                          <span class="focus-side-summary-arrow">{{ focusSidePanelState.strategy ? '▾' : '▸' }}</span>
                        </BaseButton>
                      </template>
                      <h4 v-else>触发策略 (STRATEGY)</h4>
                      <div class="focus-side-content" :class="{ hidden: isDesktopFocusMode && !focusSidePanelState.strategy }">
                        <label class="field checkbox-inline">
                          <BaseCheckbox v-model="selectedEntry.enabled" />
                          <span>启用条目</span>
                        </label>
                        <div class="strategy-switch">
                          <BaseButton
                            type="button"
                            class="strategy-pill constant"
                            :class="{ active: selectedEntry.strategy.type === 'constant' }"
                            @click="selectedEntry.strategy.type = 'constant'"
                          >
                            🔵 常驻 (Constant)
                          </BaseButton>
                          <BaseButton
                            type="button"
                            class="strategy-pill vector"
                            :class="{ active: selectedEntry.strategy.type === 'vectorized' }"
                            @click="selectedEntry.strategy.type = 'vectorized'"
                          >
                            📎 向量化 (Vector)
                          </BaseButton>
                          <BaseButton
                            type="button"
                            class="strategy-pill selective"
                            :class="{ active: selectedEntry.strategy.type === 'selective' }"
                            @click="selectedEntry.strategy.type = 'selective'"
                          >
                            🟢 关键词 (Selective)
                          </BaseButton>
                        </div>
                        <details class="editor-advanced">
                          <summary>高级设置</summary>
                          <label class="field">
                            <span>次要逻辑 (LOGIC)</span>
                            <BaseSelect v-model="selectedEntry.strategy.keys_secondary.logic" :options="secondaryLogicSelectOptions" :searchable="false" size="sm" aria-label="次要逻辑" />
                          </label>
                          <label class="field">
                            <span>扫描深度</span>
                            <BaseInput
                              v-model="selectedScanDepthText"
                              type="text"
                              class="text-input"
                              placeholder="留空或 same_as_global"
                            />
                          </label>
                          <label class="field">
                            <span>概率(0-100)</span>
                            <BaseInput
                              v-model.number="selectedEntry.probability"
                              type="number"
                              class="text-input"
                              min="0"
                              max="100"
                              step="1"
                            />
                          </label>
                        </details>
                      </div>
                    </article>

                    <article class="editor-card focus-side-card" :class="{ open: focusSidePanelState.insertion }">
                      <template v-if="isDesktopFocusMode">
                        <BaseButton type="button" class="focus-side-summary" @click="toggleFocusSidePanel('insertion')">
                          <span class="focus-side-summary-title">插入设置</span>
                          <span class="focus-side-summary-value">{{ focusInsertionSummary }}</span>
                          <span class="focus-side-summary-arrow">{{ focusSidePanelState.insertion ? '▾' : '▸' }}</span>
                        </BaseButton>
                      </template>
                      <h4 v-else>插入设置 (INSERTION)</h4>
                      <div class="focus-side-content" :class="{ hidden: isDesktopFocusMode && !focusSidePanelState.insertion }">
                        <label class="field">
                          <span>位置 (Position)</span>
                          <BaseSelect v-model="selectedPositionSelectValue" :options="positionSelectControlOptions" :searchable="false" size="sm" aria-label="位置" />
                        </label>
                        <label class="field">
                          <span>权重 (Order)</span>
                          <BaseInput v-model.number="selectedEntry.position.order" type="number" class="text-input" step="1" />
                        </label>
                        <div class="editor-collapsible-group">
                          <details class="editor-mini-collapse" :class="{ disabled: selectedEntry.position.type !== 'at_depth' }">
                            <summary>
                              <span>深度角色</span>
                              <span class="editor-mini-collapse-value">
                                {{ selectedEntry.position.type === 'at_depth' ? selectedEntry.position.role : '仅深度插入可用' }}
                              </span>
                            </summary>
                            <div class="editor-mini-collapse-body">
                              <BaseSelect v-model="selectedEntry.position.role" :options="positionRoleOptions" :searchable="false" size="sm" aria-label="深度角色" :disabled="selectedEntry.position.type !== 'at_depth'" />
                            </div>
                          </details>
                          <details class="editor-mini-collapse" :class="{ disabled: selectedEntry.position.type !== 'at_depth' }">
                            <summary>
                              <span>深度层级</span>
                              <span class="editor-mini-collapse-value">
                                {{ selectedEntry.position.type === 'at_depth' ? selectedEntry.position.depth : '仅深度插入可用' }}
                              </span>
                            </summary>
                            <div class="editor-mini-collapse-body">
                              <BaseInput
                                v-model.number="selectedEntry.position.depth"
                                type="number"
                                class="text-input"
                                min="0"
                                step="1"
                                :disabled="selectedEntry.position.type !== 'at_depth'"
                              />
                            </div>
                          </details>
                        </div>
                      </div>
                    </article>

                    <article class="editor-card focus-side-card" :class="{ open: focusSidePanelState.recursion }">
                      <template v-if="isDesktopFocusMode">
                        <BaseButton type="button" class="focus-side-summary" @click="toggleFocusSidePanel('recursion')">
                          <span class="focus-side-summary-title">递归与效果</span>
                          <span class="focus-side-summary-value">{{ focusRecursionSummary }}</span>
                          <span class="focus-side-summary-arrow">{{ focusSidePanelState.recursion ? '▾' : '▸' }}</span>
                        </BaseButton>
                      </template>
                      <h4 v-else>递归与效果 (RECURSION)</h4>
                      <div class="focus-side-content" :class="{ hidden: isDesktopFocusMode && !focusSidePanelState.recursion }">
                        <label class="field checkbox-inline">
                          <BaseCheckbox v-model="selectedEntry.recursion.prevent_incoming" />
                          <span>不可递归命中 (Exclude Incoming)</span>
                        </label>
                        <label class="field checkbox-inline">
                          <BaseCheckbox v-model="selectedEntry.recursion.prevent_outgoing" />
                          <span>阻止后续递归 (Prevent Outgoing)</span>
                        </label>
                        <div class="editor-collapsible-group">
                          <details class="editor-mini-collapse">
                            <summary>
                              <span>递归延迟层级</span>
                              <span class="editor-mini-collapse-value">{{ selectedRecursionDelayText || 'null' }}</span>
                            </summary>
                            <div class="editor-mini-collapse-body">
                              <BaseInput
                                v-model="selectedRecursionDelayText"
                                type="text"
                                class="text-input"
                                placeholder="留空表示 null"
                              />
                            </div>
                          </details>
                          <details class="editor-mini-collapse">
                            <summary>
                              <span>sticky</span>
                              <span class="editor-mini-collapse-value">{{ selectedStickyText || 'null' }}</span>
                            </summary>
                            <div class="editor-mini-collapse-body">
                              <BaseInput
                                v-model="selectedStickyText"
                                type="text"
                                class="text-input"
                                placeholder="留空表示 null"
                              />
                            </div>
                          </details>
                          <details class="editor-mini-collapse">
                            <summary>
                              <span>cooldown</span>
                              <span class="editor-mini-collapse-value">{{ selectedCooldownText || 'null' }}</span>
                            </summary>
                            <div class="editor-mini-collapse-body">
                              <BaseInput
                                v-model="selectedCooldownText"
                                type="text"
                                class="text-input"
                                placeholder="留空表示 null"
                              />
                            </div>
                          </details>
                          <details class="editor-mini-collapse">
                            <summary>
                              <span>delay</span>
                              <span class="editor-mini-collapse-value">{{ selectedEffectDelayText || 'null' }}</span>
                            </summary>
                            <div class="editor-mini-collapse-body">
                              <BaseInput
                                v-model="selectedEffectDelayText"
                                type="text"
                                class="text-input"
                                placeholder="留空表示 null"
                              />
                            </div>
                          </details>
                        </div>
                      </div>
                    </article>
                  </aside>
                </div>
              </template>
              <template v-else>
                <div class="empty-block">请选择或新增一个条目后开始编辑。</div>
              </template>
            </main>
          </section>
          </div>

          <footer class="wb-status" :class="{ 'has-unsaved': hasUnsavedChanges }">
            <span>{{ isBusy ? '加载中...' : statusMessage }}</span>
            <span>
              当前条目: {{ draftEntries.length }} | 内容字符: {{ totalContentChars }} |
              {{ hasUnsavedChanges ? '存在未保存修改' : '已同步' }}
            </span>
          </footer>
    </template>
    <!-- ═══ End Desktop Layout ═══ -->

    <div
      v-if="focusCinePhase !== 'idle'"
      ref="focusCineOverlayRef"
      class="focus-cine-overlay"
      aria-hidden="true"
    ></div>
    <div
      v-if="copyCinePhase !== 'idle'"
      ref="copyCineOverlayRef"
      class="copy-cine-overlay"
      aria-hidden="true"
    ></div>

    <!-- 标签审查 -->
    <div v-if="aiShowTagReview" class="ai-tag-review-overlay" @click.self="aiShowTagReview = false">
      <div class="ai-tag-review-modal">
        <div class="ai-tag-review-head">
          <span class="ai-tag-review-title">📋 提取到的条目（{{ aiExtractedTags.length }}）</span>
          <BaseButton class="ai-tag-review-close" type="button" @click="aiShowTagReview = false">×</BaseButton>
        </div>
        <div class="ai-tag-review-target">
          <label class="field">
            <span>目标世界书</span>
            <BaseSelect v-model="aiTargetWorldbook" :options="aiTargetWorldbookOptions" aria-label="AI 目标世界书" @update:model-value="markDuplicatesInTags" />
          </label>
        </div>
        <details class="ai-tag-ignore-config">
          <summary>🚫 忽略标签配置</summary>
          <div style="padding:8px 0 0;font-size:12px;color:var(--wb-text-muted);margin-bottom:4px;">匹配到这些标签时跳过导入，但继续扫描其内部可用标签（逗号或换行分隔）</div>
          <BaseTextarea
            class="text-input"
            rows="2"
            :value="persistedState.extract_ignore_tags.join(', ')"
            @change="updateIgnoreTags(($event.target as HTMLTextAreaElement).value)"
            style="width:100%;font-size:12px;"
          ></BaseTextarea>
          <BaseButton class="btn" type="button" style="margin-top:4px;font-size:11px;" @click="resetIgnoreTags">🔄 恢复默认</BaseButton>
        </details>
        <div class="ai-tag-list">
          <label
            v-for="(tag, idx) in aiExtractedTags"
            :key="`tag-${idx}`"
            class="ai-tag-item"
            :class="{ 'ai-tag-duplicate': tag.duplicate }"
          >
            <BaseCheckbox v-model="tag.selected" />
            <div class="ai-tag-info">
              <span class="ai-tag-name">{{ tag.tag }}<span v-if="tag.duplicate" style="color:#f59e0b;font-size:0.85em;margin-left:6px;">⚠️ 已存在</span><span v-else-if="tag.updated" style="color:#3b82f6;font-size:0.85em;margin-left:6px;">🔄 内容已更新</span></span>
              <span class="ai-tag-preview">{{ tag.content.slice(0, 120) }}{{ tag.content.length > 120 ? '...' : '' }}</span>
            </div>
          </label>
        </div>
        <div class="ai-tag-review-actions">
          <BaseButton class="btn" type="button" @click="aiExtractedTags.forEach(t => t.selected = true)">全选</BaseButton>
          <BaseButton class="btn" type="button" @click="aiExtractedTags.forEach(t => t.selected = false)">全不选</BaseButton>
          <BaseButton
            class="btn primary"
            type="button"
            :disabled="!aiTargetWorldbook || !aiExtractedTags.some(t => t.selected)"
            @click="aiCreateSelectedEntries"
          >创建选中条目（{{ aiExtractedTags.filter(t => t.selected).length }}）</BaseButton>
        </div>
      </div>
    </div>

          <div v-if="showCrossCopyDiffModal && crossCopyDiffRow" class="wb-modal-backdrop" @click.self="closeCrossCopyDiff">
            <div class="wb-history-modal cross-copy-diff-modal">
              <div class="wb-history-modal-header">
                <div>
                  <strong>📚 跨书条目对比</strong>
                  <span>{{ crossCopyDiffHeaderText }}</span>
                </div>
                <div class="wb-history-modal-actions">
                  <span class="cross-copy-status-badge" :class="getCrossCopyStatusBadgeClass(crossCopyDiffRow.status)">
                    {{ getCrossCopyStatusLabel(crossCopyDiffRow.status) }}
                  </span>
                  <BaseButton class="btn mini" type="button" @click="closeCrossCopyDiff">关闭</BaseButton>
                </div>
              </div>

              <div class="cross-copy-diff-main">
                <div class="cross-copy-preview-grid cross-copy-preview-grid-modal">
                  <div class="cross-copy-preview-card">
                    <strong>来源</strong>
                    <span class="name">{{ crossCopyDiffRow.source_entry.name || `条目 ${crossCopyDiffRow.source_entry.uid}` }}</span>
                    <span class="meta">{{ getCrossCopyEntryProfile(crossCopyDiffRow.source_entry) }}</span>
                    <p>{{ getCrossCopyPreviewText(crossCopyDiffRow.source_entry.content, 260) }}</p>
                  </div>
                  <div class="cross-copy-preview-card">
                    <strong>目标命中</strong>
                    <template v-if="crossCopyDiffTargetEntry">
                      <span class="name">{{ crossCopyDiffTargetEntry.name || `条目 ${crossCopyDiffTargetEntry.uid}` }}</span>
                      <span class="meta">{{ getCrossCopyEntryProfile(crossCopyDiffTargetEntry) }}</span>
                      <p>{{ getCrossCopyPreviewText(crossCopyDiffTargetEntry.content, 260) }}</p>
                    </template>
                    <template v-else>
                      <span class="meta">无直接命中条目（右侧为空）</span>
                      <p class="cross-copy-diff-empty">该条目在目标世界书中将按“新建”逻辑处理。</p>
                    </template>
                  </div>
                </div>

                <section class="cross-copy-visual-section">
                  <div class="cross-copy-visual-head">
                    <strong>字段对比</strong>
                    <span>{{ crossCopyDiffSummary }}</span>
                    <span v-if="crossCopyDiffRow.target_summary.same_name_matches.length > 1" class="cross-copy-diff-note">
                      同名命中 {{ crossCopyDiffRow.target_summary.same_name_matches.length }} 条（右侧展示首条）
                    </span>
                  </div>
                  <div class="cross-copy-field-table">
                    <div class="cross-copy-field-row cross-copy-field-header">
                      <span>字段</span>
                      <span>来源</span>
                      <span>目标</span>
                      <span>状态</span>
                    </div>
                    <div v-for="field in crossCopyFieldDiffRows" :key="field.key" class="cross-copy-field-row" :class="{ changed: field.changed }">
                      <span class="cross-copy-field-label">{{ field.label }}</span>
                      <span class="cross-copy-field-value left">{{ field.left }}</span>
                      <span class="cross-copy-field-value right">{{ field.right }}</span>
                      <span class="cross-copy-field-state" :class="{ changed: field.changed, same: !field.changed }">
                        {{ field.changed ? '不同' : '一致' }}
                      </span>
                    </div>
                  </div>
                </section>

                <section class="cross-copy-visual-section">
                  <div class="cross-copy-visual-head">
                    <strong>内容差异</strong>
                    <span>{{ crossCopyContentDiffSummary }}</span>
                  </div>
                  <div class="cross-copy-content-grid">
                    <div class="cross-copy-content-col">
                      <div class="wb-history-diff-title">Left / 来源内容</div>
                      <div class="cross-copy-content-body">
                        <div v-for="(line, idx) in crossCopyContentDiff.left" :key="`cc-left-${idx}`" class="cross-copy-content-line" :class="line.type">
                          <span class="line-no">{{ line.line_no ?? '' }}</span>
                          <span class="line-text">{{ line.text || ' ' }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="cross-copy-content-col">
                      <div class="wb-history-diff-title">Right / 目标内容</div>
                      <div class="cross-copy-content-body">
                        <div v-for="(line, idx) in crossCopyContentDiff.right" :key="`cc-right-${idx}`" class="cross-copy-content-line" :class="line.type">
                          <span class="line-no">{{ line.line_no ?? '' }}</span>
                          <span class="line-text">{{ line.text || ' ' }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>

          <div v-if="showEntryHistoryModal" class="wb-modal-backdrop" @click.self="closeEntryHistoryModal">
            <div class="wb-history-modal">
              <div class="wb-history-modal-header">
                <div>
                  <strong>🕰️ 条目时光机</strong>
                  <span>{{ entryHistorySummary }}</span>
                </div>
                <div class="wb-history-modal-actions">
                  <BaseButton class="btn mini" type="button" :disabled="!selectedEntry" @click="createManualEntrySnapshot">
                    记录条目
                  </BaseButton>
                  <BaseButton
                    class="btn mini danger"
                    type="button"
                    :disabled="!entrySnapshotsForSelected.length"
                    @click="clearCurrentEntrySnapshots"
                  >
                    清空条目历史
                  </BaseButton>
                  <BaseButton class="btn mini" type="button" @click="closeEntryHistoryModal">关闭</BaseButton>
                </div>
              </div>

              <div class="wb-history-modal-main">
                <aside class="wb-history-versions">
                  <div class="wb-history-versions-title">版本列表（L/R）</div>
                  <div class="wb-history-versions-scroll">
                    <div v-for="ver in entryVersionViews" :key="ver.id" class="wb-history-version-item">
                      <div class="wb-history-version-line">
                        <strong>{{ formatHistoryOptionLabel(ver.label, ver.ts, ver.isCurrent) }}</strong>
                        <div class="wb-history-lr">
                          <BaseButton class="mini-lr" :class="{ active: entryHistoryLeftId === ver.id }" @click="entryHistoryLeftId = ver.id">L</BaseButton>
                          <BaseButton class="mini-lr" :class="{ active: entryHistoryRightId === ver.id }" @click="entryHistoryRightId = ver.id">R</BaseButton>
                        </div>
                      </div>
                      <span>{{ ver.name }}</span>
                    </div>
                    <div v-if="entryVersionViews.length <= 1" class="empty-note">暂无历史条目版本</div>
                  </div>
                </aside>

                <section class="wb-history-diff-wrap">
                  <div class="wb-history-diff-head">
                    <div>
                      Left: {{ selectedEntryHistoryLeft ? formatHistoryOptionLabel(selectedEntryHistoryLeft.label, selectedEntryHistoryLeft.ts, selectedEntryHistoryLeft.isCurrent) : '-' }}
                      |
                      Right: {{ selectedEntryHistoryRight ? formatHistoryOptionLabel(selectedEntryHistoryRight.label, selectedEntryHistoryRight.ts, selectedEntryHistoryRight.isCurrent) : '-' }}
                    </div>
                    <BaseButton class="btn mini" type="button" :disabled="!canRestoreEntryFromLeft" @click="restoreEntryFromLeftHistory">
                      恢复到 Left
                    </BaseButton>
                  </div>
                  <div class="wb-history-visual-main">
                    <div ref="entryHistoryLayoutRef" class="wb-history-resizable-layout">
                      <div class="wb-history-pane-section" :style="getHistorySectionStyle('entry', 0)">
                        <div class="cross-copy-preview-grid cross-copy-preview-grid-modal wb-history-version-preview">
                          <div class="cross-copy-preview-card">
                            <strong>Left 版本</strong>
                            <span class="name">{{ selectedEntryHistoryLeft ? selectedEntryHistoryLeft.name || `条目 ${selectedEntryHistoryLeft.entry.uid}` : '-' }}</span>
                            <span class="meta">{{ selectedEntryHistoryLeft ? getCrossCopyEntryProfile(selectedEntryHistoryLeft.entry) : '-' }}</span>
                            <p>{{ getEntryVersionPreview(selectedEntryHistoryLeft) || '-' }}</p>
                          </div>
                          <div class="cross-copy-preview-card">
                            <strong>Right 版本</strong>
                            <span class="name">{{ selectedEntryHistoryRight ? selectedEntryHistoryRight.name || `条目 ${selectedEntryHistoryRight.entry.uid}` : '-' }}</span>
                            <span class="meta">{{ selectedEntryHistoryRight ? getCrossCopyEntryProfile(selectedEntryHistoryRight.entry) : '-' }}</span>
                            <p>{{ getEntryVersionPreview(selectedEntryHistoryRight) || '-' }}</p>
                          </div>
                        </div>
                      </div>

                      <div
                        v-if="canResizeHistorySections"
                        class="wb-history-pane-splitter"
                        @pointerdown="startHistorySectionResize('entry', 0, $event)"
                      >
                        <span class="wb-history-pane-splitter-grip">⋯⋯⋯</span>
                      </div>

                      <div class="wb-history-pane-section" :style="getHistorySectionStyle('entry', 1)">
                        <section class="cross-copy-visual-section">
                          <div class="cross-copy-visual-head">
                            <strong>字段对比</strong>
                            <span>{{ entryHistoryFieldDiffSummary }}</span>
                          </div>
                          <div class="cross-copy-field-table">
                            <div class="cross-copy-field-row cross-copy-field-header">
                              <span>字段</span>
                              <span>Left</span>
                              <span>Right</span>
                              <span>状态</span>
                            </div>
                            <div v-for="field in entryHistoryFieldDiffRows" :key="field.key" class="cross-copy-field-row" :class="{ changed: field.changed }">
                              <span class="cross-copy-field-label">{{ field.label }}</span>
                              <span class="cross-copy-field-value left">{{ field.left }}</span>
                              <span class="cross-copy-field-value right">{{ field.right }}</span>
                              <span class="cross-copy-field-state" :class="{ changed: field.changed, same: !field.changed }">
                                {{ field.changed ? '不同' : '一致' }}
                              </span>
                            </div>
                          </div>
                        </section>
                      </div>

                      <div
                        v-if="canResizeHistorySections"
                        class="wb-history-pane-splitter"
                        @pointerdown="startHistorySectionResize('entry', 1, $event)"
                      >
                        <span class="wb-history-pane-splitter-grip">⋯⋯⋯</span>
                      </div>

                      <div class="wb-history-pane-section" :style="getHistorySectionStyle('entry', 2)">
                        <section class="cross-copy-visual-section">
                          <div class="cross-copy-visual-head">
                            <strong>内容差异</strong>
                            <span>{{ entryHistoryContentDiffSummary }}</span>
                          </div>
                          <div class="cross-copy-content-grid">
                            <div class="cross-copy-content-col">
                              <div class="wb-history-diff-title">Left / 条目内容</div>
                              <div class="cross-copy-content-body">
                                <div v-for="(line, idx) in entryHistoryContentDiff.left" :key="`eh-left-${idx}`" class="cross-copy-content-line" :class="line.type">
                                  <span class="line-no">{{ line.line_no ?? '' }}</span>
                                  <span class="line-text">{{ line.text || ' ' }}</span>
                                </div>
                              </div>
                            </div>
                            <div class="cross-copy-content-col">
                              <div class="wb-history-diff-title">Right / 条目内容</div>
                              <div class="cross-copy-content-body">
                                <div v-for="(line, idx) in entryHistoryContentDiff.right" :key="`eh-right-${idx}`" class="cross-copy-content-line" :class="line.type">
                                  <span class="line-no">{{ line.line_no ?? '' }}</span>
                                  <span class="line-text">{{ line.text || ' ' }}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </section>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>

          <div v-if="showWorldbookHistoryModal" class="wb-modal-backdrop" @click.self="closeWorldbookHistoryModal">
            <div class="wb-history-modal">
              <div class="wb-history-modal-header">
                <div>
                  <strong>⏪ 时光机（整本回滚）</strong>
                  <span>{{ getWorldbookVersionDiffSummary(selectedWorldbookHistoryLeft, selectedWorldbookHistoryRight) }}</span>
                </div>
                <div class="wb-history-modal-actions">
                  <BaseButton class="btn mini" type="button" :disabled="!selectedWorldbookName" @click="createManualSnapshot">
                    创建整本快照
                  </BaseButton>
                  <BaseButton
                    class="btn mini danger"
                    type="button"
                    :disabled="!snapshotsForCurrent.length"
                    @click="clearCurrentSnapshots"
                  >
                    清空整本快照
                  </BaseButton>
                  <BaseButton class="btn mini" type="button" @click="closeWorldbookHistoryModal">关闭</BaseButton>
                </div>
              </div>

              <div class="wb-history-modal-main">
                <aside class="wb-history-versions">
                  <div class="wb-history-versions-title">版本列表（L/R）</div>
                  <div class="wb-history-versions-scroll">
                    <div v-for="ver in worldbookVersionViews" :key="ver.id" class="wb-history-version-item">
                      <div class="wb-history-version-line">
                        <strong>{{ formatHistoryOptionLabel(ver.label, ver.ts, ver.isCurrent) }}</strong>
                        <div class="wb-history-lr">
                          <BaseButton class="mini-lr" :class="{ active: worldbookHistoryLeftId === ver.id }" @click="worldbookHistoryLeftId = ver.id">L</BaseButton>
                          <BaseButton class="mini-lr" :class="{ active: worldbookHistoryRightId === ver.id }" @click="worldbookHistoryRightId = ver.id">R</BaseButton>
                        </div>
                      </div>
                      <span>entries: {{ ver.entries.length }}</span>
                    </div>
                  </div>
                </aside>

                <section class="wb-history-diff-wrap">
                  <div class="wb-history-diff-head">
                    <div>
                      Left: {{ selectedWorldbookHistoryLeft ? formatHistoryOptionLabel(selectedWorldbookHistoryLeft.label, selectedWorldbookHistoryLeft.ts, selectedWorldbookHistoryLeft.isCurrent) : '-' }}
                      |
                      Right: {{ selectedWorldbookHistoryRight ? formatHistoryOptionLabel(selectedWorldbookHistoryRight.label, selectedWorldbookHistoryRight.ts, selectedWorldbookHistoryRight.isCurrent) : '-' }}
                    </div>
                    <BaseButton
                      class="btn mini"
                      type="button"
                      :disabled="!canRestoreWorldbookFromLeft"
                      @click="restoreWorldbookFromLeftHistory"
                    >
                      恢复到 Left
                    </BaseButton>
                  </div>
                  <div class="wb-history-visual-main">
                    <div class="cross-copy-preview-grid cross-copy-preview-grid-modal wb-history-version-preview">
                      <div class="cross-copy-preview-card">
                        <strong>Left 版本</strong>
                        <span class="name">{{ selectedWorldbookHistoryLeft ? formatHistoryOptionLabel(selectedWorldbookHistoryLeft.label, selectedWorldbookHistoryLeft.ts, selectedWorldbookHistoryLeft.isCurrent) : '-' }}</span>
                        <span class="meta">entries: {{ selectedWorldbookHistoryLeft ? selectedWorldbookHistoryLeft.entries.length : 0 }}</span>
                        <p>{{ selectedWorldbookHistoryLeft ? getWorldbookHistoryVersionPreview(selectedWorldbookHistoryLeft) : '-' }}</p>
                      </div>
                      <div class="cross-copy-preview-card">
                        <strong>Right 版本</strong>
                        <span class="name">{{ selectedWorldbookHistoryRight ? formatHistoryOptionLabel(selectedWorldbookHistoryRight.label, selectedWorldbookHistoryRight.ts, selectedWorldbookHistoryRight.isCurrent) : '-' }}</span>
                        <span class="meta">entries: {{ selectedWorldbookHistoryRight ? selectedWorldbookHistoryRight.entries.length : 0 }}</span>
                        <p>{{ selectedWorldbookHistoryRight ? getWorldbookHistoryVersionPreview(selectedWorldbookHistoryRight) : '-' }}</p>
                      </div>
                    </div>

                    <section class="cross-copy-visual-section wb-worldbook-compare-list-section">
                      <div class="cross-copy-visual-head">
                        <strong>条目变化列表</strong>
                        <span>{{ worldbookHistoryCompareSummary }}</span>
                      </div>
                      <div class="wb-worldbook-compare-list">
                        <BaseButton
                          v-for="row in worldbookHistoryCompareRows"
                          :key="row.key"
                          type="button"
                          class="wb-worldbook-compare-row"
                          :class="{ active: worldbookHistoryActiveRowKey === row.key }"
                          @click="worldbookHistoryActiveRowKey = row.key"
                        >
                          <div class="wb-worldbook-compare-row-head">
                            <span class="cross-copy-status-badge" :class="getWorldbookHistoryStatusBadgeClass(row.status)">
                              {{ getWorldbookHistoryStatusLabel(row.status) }}
                            </span>
                            <strong>{{ row.title }}</strong>
                            <span v-if="row.uid !== null" class="entry-chip uid">#{{ row.uid }}</span>
                          </div>
                          <div class="wb-worldbook-compare-row-note">{{ row.note }}</div>
                        </BaseButton>
                        <div v-if="!worldbookHistoryCompareRows.length" class="empty-note">左右版本条目一致，无需处理。</div>
                      </div>
                    </section>

                    <template v-if="worldbookHistoryActiveRow">
                      <div ref="worldbookHistoryLayoutRef" class="wb-history-resizable-layout wb-history-resizable-layout-detail">
                        <div class="wb-history-pane-section" :style="getHistorySectionStyle('worldbook', 0)">
                          <div class="cross-copy-preview-grid cross-copy-preview-grid-modal">
                            <div class="cross-copy-preview-card">
                              <strong>Left 条目</strong>
                              <template v-if="worldbookHistoryActiveRow.left_entry">
                                <span class="name">{{ worldbookHistoryActiveRow.left_entry.name || `条目 ${worldbookHistoryActiveRow.left_entry.uid}` }}</span>
                                <span class="meta">{{ getCrossCopyEntryProfile(worldbookHistoryActiveRow.left_entry) }}</span>
                                <p>{{ getCrossCopyPreviewText(worldbookHistoryActiveRow.left_entry.content, 260) }}</p>
                              </template>
                              <template v-else>
                                <span class="meta">该条目在 Left 版本不存在</span>
                              </template>
                            </div>
                            <div class="cross-copy-preview-card">
                              <strong>Right 条目</strong>
                              <template v-if="worldbookHistoryActiveRow.right_entry">
                                <span class="name">{{ worldbookHistoryActiveRow.right_entry.name || `条目 ${worldbookHistoryActiveRow.right_entry.uid}` }}</span>
                                <span class="meta">{{ getCrossCopyEntryProfile(worldbookHistoryActiveRow.right_entry) }}</span>
                                <p>{{ getCrossCopyPreviewText(worldbookHistoryActiveRow.right_entry.content, 260) }}</p>
                              </template>
                              <template v-else>
                                <span class="meta">该条目在 Right 版本不存在</span>
                              </template>
                            </div>
                          </div>
                        </div>

                        <div
                          v-if="canResizeHistorySections"
                          class="wb-history-pane-splitter"
                          @pointerdown="startHistorySectionResize('worldbook', 0, $event)"
                        >
                          <span class="wb-history-pane-splitter-grip">⋯⋯⋯</span>
                        </div>

                        <div class="wb-history-pane-section" :style="getHistorySectionStyle('worldbook', 1)">
                          <section class="cross-copy-visual-section">
                            <div class="cross-copy-visual-head">
                              <strong>字段对比</strong>
                              <span>{{ worldbookHistoryFieldDiffSummary }}</span>
                            </div>
                            <div class="cross-copy-field-table">
                              <div class="cross-copy-field-row cross-copy-field-header">
                                <span>字段</span>
                                <span>Left</span>
                                <span>Right</span>
                                <span>状态</span>
                              </div>
                              <div v-for="field in worldbookHistoryFieldDiffRows" :key="field.key" class="cross-copy-field-row" :class="{ changed: field.changed }">
                                <span class="cross-copy-field-label">{{ field.label }}</span>
                                <span class="cross-copy-field-value left">{{ field.left }}</span>
                                <span class="cross-copy-field-value right">{{ field.right }}</span>
                                <span class="cross-copy-field-state" :class="{ changed: field.changed, same: !field.changed }">
                                  {{ field.changed ? '不同' : '一致' }}
                                </span>
                              </div>
                            </div>
                          </section>
                        </div>

                        <div
                          v-if="canResizeHistorySections"
                          class="wb-history-pane-splitter"
                          @pointerdown="startHistorySectionResize('worldbook', 1, $event)"
                        >
                          <span class="wb-history-pane-splitter-grip">⋯⋯⋯</span>
                        </div>

                        <div class="wb-history-pane-section" :style="getHistorySectionStyle('worldbook', 2)">
                          <section class="cross-copy-visual-section">
                            <div class="cross-copy-visual-head">
                              <strong>内容差异</strong>
                              <span>{{ worldbookHistoryContentDiffSummary }}</span>
                            </div>
                            <div class="cross-copy-content-grid">
                              <div class="cross-copy-content-col">
                                <div class="wb-history-diff-title">Left / 条目内容</div>
                                <div class="cross-copy-content-body">
                                  <div v-for="(line, idx) in worldbookHistoryContentDiff.left" :key="`wh-left-${idx}`" class="cross-copy-content-line" :class="line.type">
                                    <span class="line-no">{{ line.line_no ?? '' }}</span>
                                    <span class="line-text">{{ line.text || ' ' }}</span>
                                  </div>
                                </div>
                              </div>
                              <div class="cross-copy-content-col">
                                <div class="wb-history-diff-title">Right / 条目内容</div>
                                <div class="cross-copy-content-body">
                                  <div v-for="(line, idx) in worldbookHistoryContentDiff.right" :key="`wh-right-${idx}`" class="cross-copy-content-line" :class="line.type">
                                    <span class="line-no">{{ line.line_no ?? '' }}</span>
                                    <span class="line-text">{{ line.text || ' ' }}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </section>
                        </div>
                      </div>
                    </template>
                    <div v-else class="empty-note wb-worldbook-detail-empty">请选择一条变化记录查看详细对比</div>
                  </div>
                </section>
              </div>
            </div>
          </div>

          <div
            v-if="floatingPanels.find.visible"
            class="wb-floating-window find-window"
            :style="getFloatingPanelStyle('find')"
            @pointerdown="bringFloatingToFront('find')"
          >
            <div class="wb-floating-header" @pointerdown="startFloatingDrag('find', $event)">
              <strong>🔎 查找与替换</strong>
              <div class="wb-floating-header-actions">
                <BaseButton
                  class="btn mini"
                  type="button"
                  :disabled="!draftEntries.length"
                  @pointerdown.stop
                  @click="findFirstMatch"
                >
                  查找
                </BaseButton>
                <BaseButton
                  class="btn mini"
                  type="button"
                  :disabled="!draftEntries.length"
                  @pointerdown.stop
                  @click="findPreviousMatch"
                >
                  上一个
                </BaseButton>
                <BaseButton
                  class="btn mini"
                  type="button"
                  :disabled="!draftEntries.length"
                  @pointerdown.stop
                  @click="findNextMatch"
                >
                  下一个
                </BaseButton>
                <BaseButton
                  class="btn mini"
                  type="button"
                  :disabled="!draftEntries.length"
                  @pointerdown.stop
                  @click="applyBatchReplace"
                >
                  替换全部
                </BaseButton>
                <BaseButton class="btn mini danger" type="button" @pointerdown.stop @click="closeFloatingPanel('find')">
                  关闭
                </BaseButton>
              </div>
            </div>
            <div class="wb-floating-body">
              <div class="tool-line stacked">
                <BaseInput v-model="batchFindText" type="text" class="text-input" placeholder="查找文本 / 正则" />
                <BaseInput v-model="batchReplaceText" type="text" class="text-input" placeholder="替换为" />
                <div class="find-scope-line">
                  <label class="checkbox-inline">
                    <!-- unified-control-exception: native radio required for mutually exclusive search scope -->
                  <input v-model="batchSearchScope" type="radio" value="all" />
                    <span>全部条目</span>
                  </label>
                  <label class="checkbox-inline">
                    <!-- unified-control-exception: native radio required for mutually exclusive search scope -->
                  <input v-model="batchSearchScope" type="radio" value="current" :disabled="!selectedEntry" />
                    <span>当前条目</span>
                  </label>
                  <span class="find-summary-text">{{ findHitSummaryText }}</span>
                </div>
                <BaseInput
                  v-model="batchExcludeText"
                  type="text"
                  class="text-input"
                  placeholder="排除项：#UID / 名称 / 内容 / 关键词（逗号或换行）"
                />
                <div v-if="activeFindHit" class="find-active-hit">
                  <strong>#{{ activeFindHit.entryUid }} {{ activeFindHit.entryName || `条目 ${activeFindHit.entryUid}` }}</strong>
                  <span>{{ getFindFieldLabel(activeFindHit.field) }} · {{ activeFindHit.preview }}</span>
                </div>
                <div class="batch-exclude-note">
                  示例: `#12, name:世界观, content:{{user}}, keys:吸血鬼`（默认命中名称/内容/关键词即排除）
                </div>
                <div v-if="batchExcludeTokensPreview.length" class="batch-exclude-chips">
                  <span v-for="token in batchExcludeTokensPreview" :key="token" class="exclude-chip">{{ token }}</span>
                </div>
                <div class="find-flags">
                  <label class="checkbox-inline">
                    <BaseCheckbox v-model="batchUseRegex" />
                    <span>正则模式</span>
                  </label>
                  <label class="checkbox-inline">
                    <BaseCheckbox v-model="batchInName" />
                    <span>名称</span>
                  </label>
                  <label class="checkbox-inline">
                    <BaseCheckbox v-model="batchInContent" />
                    <span>内容</span>
                  </label>
                  <label class="checkbox-inline">
                    <BaseCheckbox v-model="batchInKeys" />
                    <span>关键词</span>
                  </label>
                </div>
              </div>
              <details class="tool-details">
                <summary>附加批处理工具</summary>
                <div class="tool-line">
                  <BaseButton class="btn" type="button" :disabled="!draftEntries.length" @click="normalizeAllEntries">
                    标准化全部
                  </BaseButton>
                  <BaseButton class="btn" type="button" :disabled="!draftEntries.length" @click="sortEntriesByOrderDesc">
                    按 order 排序
                  </BaseButton>
                </div>
                <div class="tool-line">
                  <BaseButton class="btn" type="button" :disabled="!draftEntries.length" @click="setEnabledForAll(true)">
                    全部启用
                  </BaseButton>
                  <BaseButton class="btn" type="button" :disabled="!draftEntries.length" @click="setEnabledForAll(false)">
                    全部禁用
                  </BaseButton>
                </div>
              </details>
            </div>
          </div>

          <div
            v-if="floatingPanels.activation.visible"
            class="wb-floating-window activation-window"
            :style="getFloatingPanelStyle('activation')"
            @pointerdown="bringFloatingToFront('activation')"
          >
            <div class="wb-floating-header" @pointerdown="startFloatingDrag('activation', $event)">
              <strong>📡 激活监控（WORLD_INFO_ACTIVATED）</strong>
              <div class="wb-floating-header-actions">
                <BaseButton
                  class="btn mini danger"
                  type="button"
                  :disabled="!activationLogs.length"
                  @pointerdown.stop
                  @click="clearActivationLogs"
                >
                  清空
                </BaseButton>
                <BaseButton
                  class="btn mini danger"
                  type="button"
                  @pointerdown.stop
                  @click="closeFloatingPanel('activation')"
                >
                  关闭
                </BaseButton>
              </div>
            </div>
            <div class="wb-floating-body">
              <div class="tool-scroll">
                <div v-for="log in activationLogs" :key="log.id" class="activation-item">
                  <div class="activation-main">
                    <strong>{{ log.world }}</strong>
                    <span>#{{ log.uid }} · {{ log.name }}</span>
                  </div>
                  <div class="activation-sub">
                    <span>{{ formatDateTime(log.time) }}</span>
                    <span>{{ log.contentPreview }}</span>
                  </div>
                </div>
                <div v-if="!activationLogs.length" class="empty-note">暂无激活记录</div>
              </div>
            </div>
          </div>
    </template><!-- end editor mode -->
    </div>
  </div>
</template>

<script setup lang="ts">
declare const __WB_ASSISTANT_BUILD_COMMIT__: string;
declare const __WB_ASSISTANT_BUILD_BRANCH__: string;
declare const __WB_ASSISTANT_BUILD_TIME__: string;

import { klona } from 'klona';

// ── Extracted sub-components ──
import WorldbookPicker from './components/WorldbookPicker.vue';
import BrowsePanel from './components/BrowsePanel.vue';
import EditorPanel from './components/EditorPanel.vue';
import CrossCopyPanel from './components/CrossCopyPanel.vue';
import CrossCopyControls from './components/CrossCopyControls.vue';
import CrossCopySourceList from './components/CrossCopySourceList.vue';
import CrossCopyActionRows from './components/CrossCopyActionRows.vue';
import CrossCopyBulkActions from './components/CrossCopyBulkActions.vue';
import CrossCopyDesktopGrid from './components/CrossCopyDesktopGrid.vue';
import CrossCopyMobileStages from './components/CrossCopyMobileStages.vue';
import GlobalModePanel from './components/GlobalModePanel.vue';
import TagManager from './components/TagManager.vue';
import AIChatPanel from './components/AIChatPanel.vue';
import SettingPanel from './components/SettingPanel.vue';
import TagEditorPanel from './components/TagEditorPanel.vue';
import SettingsPage from './components/SettingsPage.vue';
import AIConfigPage from './components/AIConfigPage.vue';
import BaseButton from './components/controls/BaseButton.vue';
import BaseCheckbox from './components/controls/BaseCheckbox.vue';
import BaseInput from './components/controls/BaseInput.vue';
import BaseTextarea from './components/controls/BaseTextarea.vue';
import BaseSelect, { type BaseSelectOption } from './components/controls/BaseSelect.vue';
import { APP_VERSION } from './domain/version';
import {
  type ThemeKey,
  THEMES,
  TAG_COLORS,
  STORAGE_KEY,
  DIRTY_STATE_KEY,
  HISTORY_LIMIT,
  ENTRY_HISTORY_LIMIT,
  ACTIVATION_LOG_LIMIT,
  RESIZE_HANDLE_SIZE,
  MAIN_PANE_DEFAULT,
  MAIN_PANE_MIN,
  FOCUS_MAIN_PANE_DEFAULT,
  FOCUS_MAIN_PANE_MIN,
  MAIN_EDITOR_MIN,
  EDITOR_SIDE_DEFAULT,
  EDITOR_SIDE_MIN,
  FOCUS_EDITOR_SIDE_DEFAULT,
  FOCUS_EDITOR_SIDE_MIN,
  EDITOR_CENTER_MIN,
  GLOBAL_PRESET_LIMIT,
  TAG_LIMIT,
  FOCUS_CINE_DURATION,
  FOCUS_CINE_EASE,
  FOCUS_CINE_STAGGER,
  FOCUS_CINE_MAX_STAGGER_STEPS,
  COPY_CINE_DURATION,
  COPY_CINE_EASE,
  COPY_CINE_STAGGER,
  COPY_CINE_MAX_STAGGER_STEPS,
  CROSS_COPY_DESKTOP_LEFT_DEFAULT,
  ENTRIES_DIGEST_DEBOUNCE_MS,
  MOBILE_MULTI_LONG_PRESS_MS,
  MOBILE_MULTI_LONG_PRESS_MOVE_PX,
  strategyTypeOptions,
  secondaryLogicOptions,
  positionTypeOptions,
  positionSelectOptions,
} from './domain/uiConstants';
import type {
  StrategyType,
  SecondaryLogic,
  PositionType,
  PositionSelectValue,
  RoleType,
  EntryVisualStatus,
  FloatingPanelKey,
  PaneResizeKey,
  HistoryResizeTarget,
  BatchSearchScope,
  FindFieldKey,
  SelectionSource,
  FocusSidePanelKey,
  FocusMetaPanelKey,
  FocusCinePhase,
  FocusCineDirection,
  CopyCinePhase,
  CopyCineDirection,
  FocusHeroKey,
  CrossCopyRowStatus,
  CrossCopyAction,
  CrossCopyStatusFilter,
  WorldbookHistoryCompareStatus,
  CrossCopyMobileStep,
  MultiEditPersistState,
  TagDeleteParentMode,
  TagEditorPersistState,
  CrossCopyMatchSummary,
  CrossCopyRow,
  CrossCopyFieldDiffRow,
  CrossCopyTextDiffLine,
  CrossCopyTextDiffResult,
  EntryFieldDiffOptions,
  WorldbookHistoryCompareRow,
  WorldbookSwitchOptions,
  HardRefreshOptions,
  FloatingPanelState,
  PaneResizeState,
  HistorySectionResizeState,
  FocusHeroSnapshot,
  FocusSinkSnapshot,
  WorldbookSnapshot,
  EntrySnapshot,
  EntryVersionView,
  WorldbookVersionView,
  PresetRoleBinding,
  RoleBindingCandidate,
  GlobalWorldbookPreset,
  AIChatMessage,
  AIChatSession,
  AIGeneratorState,
  ExtractedTag,
  WorldbookTagDefinition,
  WorldbookTagState,
  TagFilterLogic,
  TagFilterMatchMode,
  TagFilterState,
  AIApiConfig,
  LayoutState,
  PersistedState,
  ActivationLog,
  VersionInfo,
  ImportedPayload,
  EventSubscription,
  FindHit,
  EntryConfigPatch,
  MobileEntryLongPressState,
} from './domain/types';
import {
  createDefaultPersistedState,
  normalizePersistedState,
  normalizeLayoutState,
  normalizeTagFilterState,
} from './domain/persistedState';
import { getHostWindow } from './host/hostBridge';
import { useVersionInfo } from './composables/useVersionInfo';
import { usePersistedState } from './composables/usePersistedState';
import { useCrossCopyResize } from './composables/useCrossCopyResize';
import { useCoalescedFrame } from './composables/useCoalescedFrame';
import { useWorkspaceActivity } from './composables/useWorkspaceActivity';
import { useCrossCopyMobileSteps } from './composables/useCrossCopyMobileSteps';
import { useCrossCopyPersistence } from './composables/useCrossCopyPersistence';
import { useCrossCopySelection } from './composables/useCrossCopySelection';
import { useCrossCopyDiffModal } from './composables/useCrossCopyDiffModal';
import { useCrossCopyApply } from './composables/useCrossCopyApply';
import { buildConfigSystemPrompt, extractJsonArray } from './domain/aiConfig';
import { dedupeExtractedTags, extractAiTags, markExtractedTagDuplicates } from './domain/aiTags';
import { collectTagSubtreeIds, isTagDescendantOf, normalizeTagNameKey } from './domain/tags';
import { compareEntriesByPositionThenOrder, parseImportedPayload } from './domain/worldbook';
import { buildEditorShellStyle, buildMainLayoutStyle, isCompactLayoutWidth, isDesktopFocusLayout } from './domain/layout';
import {
  createPerformanceDiagnostics,
  type PerformanceMetricName,
  type PerformanceSnapshot,
} from './domain/performanceDiagnostics';
import {
  CROSS_COPY_ACTION_LABELS,
  CROSS_COPY_STATUS_LABELS,
  buildCrossCopyTextDiff,
  buildEntryFieldDiffRows,
  generateCrossCopyUniqueName,
  getCrossCopyRowDiffSummary,
  getCrossCopyActionLabel,
  getCrossCopyStatusLabel,
  normalizeCrossCopyContentKey,
  normalizeCrossCopyNameKey,
} from './domain/crossCopy';

const FOCUS_FALLBACK_PRIORITY: FocusHeroKey[] = [
  'focus_toggle',
  'find_btn',
  'save_btn',
  'more_btn',
  'tools_btn',
];
const COPY_FALLBACK_PRIORITY: FocusHeroKey[] = [
  'tool_copy',
  'find_btn',
  'focus_toggle',
  'save_btn',
  'more_btn',
  'tools_btn',
  'tool_global',
  'tool_entry_history',
  'tool_worldbook_history',
  'tool_activation',
  'tool_ai_generate',
  'tool_extract',
  'tool_tag',
  'tool_settings',
  'tool_ai_config',
];
const CROSS_COPY_STATUS_PRIORITY: CrossCopyRowStatus[] = [
  'same_name_changed',
  'content_duplicate_other_name',
  'duplicate_exact',
  'new',
  'invalid_same_source_target',
];
const worldbookNames = ref<string[]>([]);
const selectedWorldbookName = ref('');
const focusToolbarRef = ref<HTMLElement | null>(null);
const focusWorldbookMenuRef = ref<HTMLElement | null>(null);
const rolePickerOpen = ref(false);
const rolePickerRef = ref<HTMLElement | null>(null);
const rolePickerSearchInputRef = ref<HTMLInputElement | null>(null);
const currentTheme = ref<ThemeKey>('ocean');
const themePickerOpen = ref(false);
const globalWorldbookMode = ref(false);
const aiGeneratorMode = ref(false);
const crossCopyMode = ref(false);
const panelMode = ref<'browse' | 'editor'>('browse');
const expandedBrowseCardUids = ref<Set<number>>(new Set());
const BROWSE_RENDER_BATCH = 30;
const browseRenderLimit = ref(BROWSE_RENDER_BATCH);
const browseLoadMoreSentinelRef = ref<HTMLElement | null>(null);
const rootRef = ref<HTMLElement | null>(null);
const performanceDiagnosticsEnabled = (() => {
  const target = globalThis as Record<string, unknown>;
  return target.__WB_ASSISTANT_ENABLE_PERFORMANCE_DIAGNOSTICS__ === true
    || __WB_ASSISTANT_BUILD_BRANCH__.includes('debug');
})();
const performanceDiagnostics = createPerformanceDiagnostics(performanceDiagnosticsEnabled);
const navigationMeasurementFrame = useCoalescedFrame();
const setOwnedResourceCount = (name: string, active: boolean | number) => {
  performanceDiagnostics.setResourceCount(name, typeof active === 'number' ? active : Number(active));
};
for (const sessionName of ['pane-session', 'content-session', 'top-session', 'floating-session']) {
  setOwnedResourceCount(sessionName, 0);
}
const performanceSnapshotKey = '__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__';
const localPerformanceSnapshot = (): PerformanceSnapshot => performanceDiagnostics.snapshot();

if (performanceDiagnosticsEnabled) {
  (globalThis as Record<string, unknown>)[performanceSnapshotKey] = localPerformanceSnapshot;
}

function measureNavigation(
  metric: PerformanceMetricName,
  targetSelector: string,
  mount: 'settings' | 'ai-config' | null,
): void {
  if (!performanceDiagnosticsEnabled) {
    return;
  }
  const finish = performanceDiagnostics.start(metric);
  void nextTick().then(() => {
    performanceDiagnostics.setResourceCount('navigation-frame', 1);
    navigationMeasurementFrame.schedule(() => {
      performanceDiagnostics.setResourceCount('navigation-frame', 0);
      const target = rootRef.value?.querySelector(targetSelector);
      if (!target) {
        return;
      }
      if (mount) {
        performanceDiagnostics.incrementMount(mount);
      }
      finish();
    });
  });
}
const isFocusEditing = ref(false);
const focusWorldbookMenuOpen = ref(false);
const focusToolsExpanded = ref(false);
const focusToolsTriggerVisible = ref(true);
const focusCinePhase = ref<FocusCinePhase>('idle');
const focusCineDirection = ref<FocusCineDirection>('enter');
const focusCineLocked = ref(false);
const focusCineOverlayRef = ref<HTMLElement | null>(null);
let focusCineToken = 0;
let focusCineGhostNodes: HTMLElement[] = [];
let focusCineHiddenNodes: HTMLElement[] = [];
const copyCinePhase = ref<CopyCinePhase>('idle');
const copyCineDirection = ref<CopyCineDirection>('enter');
const copyCineLocked = ref(false);
const copyCineOverlayRef = ref<HTMLElement | null>(null);
let copyCineToken = 0;
let copyCineGhostNodes: HTMLElement[] = [];
let copyCineHiddenNodes: HTMLElement[] = [];
const focusMetaPanel = reactive<Record<FocusMetaPanelKey, boolean>>({
  comment: false,
  keywords: false,
});
const focusSidePanelState = reactive<Record<FocusSidePanelKey, boolean>>({
  strategy: true,
  insertion: true,
  recursion: true,
});

// Floor extraction button visibility (synced via localStorage + custom event)
const FAB_VISIBLE_KEY = '__WB_FAB_VISIBLE__';
const FAB_VISIBLE_SET_EVENT = 'wb-helper:set-fab-visible';
const FAB_VISIBLE_CHANGED_EVENT = 'wb-helper:fab-visible-changed';
const FLOOR_BTN_KEY = '__WB_FLOOR_BTN_VISIBLE__';
const fabVisible = ref((() => {
  try { return localStorage.getItem(FAB_VISIBLE_KEY) !== 'false'; } catch { return true; }
})());
const floorBtnVisible = ref((() => {
  try { return localStorage.getItem(FLOOR_BTN_KEY) !== 'false'; } catch { return true; }
})());
function setFabVisible(val: boolean): void {
  fabVisible.value = val;
  try { localStorage.setItem(FAB_VISIBLE_KEY, String(val)); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(FAB_VISIBLE_SET_EVENT, { detail: val }));
}
function onFabVisibleChanged(event: Event): void {
  const detail = (event as CustomEvent).detail;
  if (typeof detail === 'boolean') {
    fabVisible.value = detail;
    return;
  }
  try {
    fabVisible.value = localStorage.getItem(FAB_VISIBLE_KEY) !== 'false';
  } catch {
    fabVisible.value = true;
  }
}
function toggleFloorBtns(val: boolean): void {
  floorBtnVisible.value = val;
  try { localStorage.setItem(FLOOR_BTN_KEY, String(val)); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('wb-helper:floor-btns-toggle', { detail: val }));
}
const aiIsGenerating = ref(false);
const aiCurrentGenerationId = ref<string | null>(null);
const aiStreamingText = ref('');
const aiExtractedTags = ref<ExtractedTag[]>([]);
const aiShowTagReview = ref(false);
const aiTargetWorldbook = ref('');
const aiChatInputText = ref('');
const aiUseContext = ref(true);
type UtilityPage = 'main' | 'settings' | 'ai-config';
const utilityPage = ref<UtilityPage>('main');
const isMainWorkspaceActive = computed(() => utilityPage.value === 'main');

function openSettingsPage(): void {
  measureNavigation('open-settings', '[data-settings-page], .utility-page', 'settings');
  utilityPage.value = 'settings';
}

function closeUtilityPage(): void {
  measureNavigation('return-main', '[data-main-workspace]:not([style*="display: none"])', null);
  utilityPage.value = 'main';
}

const apiModelList = ref<string[]>([]);
const apiModelLoading = ref(false);

// AI worldbook config state
interface ConfigChange {
  name: string;
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
  selected: boolean;
  apply: (entry: WorldbookEntry) => void;
}
const aiConfigInput = ref('');
const aiConfigChanges = ref<ConfigChange[]>([]);
const aiConfigPreview = ref(false);
const aiConfigGenerating = ref(false);
const aiConfigTargetWorldbook = ref('');
const aiConfigCustomPrompt = ref('');

function openAiConfigPage(): void {
  measureNavigation('open-ai-config', '[data-ai-config-page], .utility-page', 'ai-config');
  aiConfigPreview.value = false;
  aiConfigChanges.value = [];
  aiConfigTargetWorldbook.value = selectedWorldbookName.value || '';
  utilityPage.value = 'ai-config';
}

const crossCopySourceWorldbook = ref('');
const crossCopyTargetWorldbook = ref('');
const crossCopyUseDraftSourceWhenCurrent = ref(true);
const crossCopySnapshotBeforeApply = ref(true);
const crossCopyControlsCollapsed = ref(true);
const crossCopyWorkspaceToolsExpanded = ref(false);
const crossCopyDesktopLeftWidth = ref(CROSS_COPY_DESKTOP_LEFT_DEFAULT);
const crossCopyRows = ref<CrossCopyRow[]>([]);
const crossCopySourceBaselineEntries = ref<WorldbookEntry[]>([]);
const crossCopyTargetBaselineEntries = ref<WorldbookEntry[]>([]);
const crossCopyCompareLoading = ref(false);
const crossCopyApplyLoading = ref(false);
const crossCopySearchText = ref('');
const crossCopyStatusFilter = ref<CrossCopyStatusFilter>('all');
const crossCopyBulkAction = ref<CrossCopyAction>('skip');
const crossCopyCompareSummary = ref('');
const crossCopyLastResultSummary = ref('');
const crossCopyLastComparedAt = ref<number>(0);

const AI_CHAT_SESSION_LIMIT = 50;
const AI_CHAT_MESSAGE_LIMIT = 200;
const selectedGlobalPresetId = ref('');
const currentRoleContext = ref<PresetRoleBinding | null>(null);
const roleBindingSourceCandidates = ref<PresetRoleBinding[]>([]);
const originalEntries = ref<WorldbookEntry[]>([]);
const draftEntries = ref<WorldbookEntry[]>([]);
const selectedEntryUid = ref<number | null>(null);
const selectedEntryUids = ref<number[]>([]);
const selectedEntryAnchorUid = ref<number | null>(null);
const mobileMultiSelectMode = ref(false);
const mobileLongPressState = ref<MobileEntryLongPressState | null>(null);
const mobileSuppressNextTap = ref(false);
const draggingEntryUids = ref<number[]>([]);
const entryDropTargetUid = ref<number | null>(null);
const entryDropPosition = ref<'before' | 'after' | null>(null);
const suppressNextEntryClick = ref(false);
const multiEditLastPatch = ref<EntryConfigPatch | null>(null);
const multiEditSnapshotDone = ref(false);
const multiEditApplying = ref(false);
const draftEntriesDigest = ref('[]');
const originalEntriesDigest = ref('[]');

const searchText = ref('');
const onlyEnabled = ref(false);
const importFileInput = ref<HTMLInputElement | null>(null);
const selectedExtraText = ref('');
const selectedKeysRaw = ref('');
const selectedSecondaryKeysRaw = ref('');
let keysDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let secondaryKeysDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let entriesDigestTimer: ReturnType<typeof setTimeout> | null = null;
let worldbookLoadRequestId = 0;
let pendingWorldbookLoadCount = 0;
const globalAddSearchText = ref('');
const globalFilterText = ref('');
const roleBindSearchText = ref('');

const batchFindText = ref('');
const batchReplaceText = ref('');
const batchExcludeText = ref('');
const batchUseRegex = ref(false);
const batchInName = ref(true);
const batchInContent = ref(true);
const batchInKeys = ref(false);
const batchSearchScope = ref<BatchSearchScope>('all');
const findHits = ref<FindHit[]>([]);
const findHitIndex = ref(-1);

const statusMessage = ref('就绪');
const isBusy = ref(false);
const isSaving = ref(false);

const showEntryHistoryModal = ref(false);
const showWorldbookHistoryModal = ref(false);
const entryHistoryLeftId = ref('');
const entryHistoryRightId = ref('');
const worldbookHistoryLeftId = ref('');
const worldbookHistoryRightId = ref('');
const worldbookHistoryActiveRowKey = ref('');
const entryHistoryLayoutRef = ref<HTMLElement | null>(null);
const worldbookHistoryLayoutRef = ref<HTMLElement | null>(null);
const entryHistorySectionRatios = ref<[number, number, number]>([24, 34, 42]);
const worldbookHistorySectionRatios = ref<[number, number, number]>([24, 32, 44]);
const historySectionResizeState = ref<HistorySectionResizeState | null>(null);
const floatingZCounter = ref(10005);
const floatingPanels = reactive<Record<FloatingPanelKey, FloatingPanelState>>({
  find: { visible: false, x: 420, y: 170, z: 10006, width: 500 },
  activation: { visible: false, x: 760, y: 230, z: 10008, width: 480 },
});
const activeFloatingDrag = ref<{
  key: FloatingPanelKey;
  pointerId: number;
  offsetX: number;
  offsetY: number;
  doc: Document;
  win: Window;
} | null>(null);
const floatingPanelKeys: FloatingPanelKey[] = ['find', 'activation'];
const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1440);
const mainLayoutRef = ref<HTMLElement | null>(null);
const editorShellRef = ref<HTMLElement | null>(null);
const contentTextareaRef = ref<InstanceType<typeof BaseTextarea> | null>(null);
type ContentDragSession = {
  pointerId: number;
  target: HTMLElement;
  onMove: (event: PointerEvent) => void;
  onStop: () => void;
  rafId: number;
  cleanupTransientState: () => void;
};
let contentResizeSession: ContentDragSession | null = null;
let contentTopDragSession: ContentDragSession | null = null;
const mainPaneWidth = ref(MAIN_PANE_DEFAULT);
const editorSideWidth = ref(EDITOR_SIDE_DEFAULT);
const focusMainPaneWidth = ref(FOCUS_MAIN_PANE_DEFAULT);
const focusEditorSideWidth = ref(FOCUS_EDITOR_SIDE_DEFAULT);
const paneResizeState = ref<PaneResizeState | null>(null);
const hostResizeWindow = ref<Window | null>(null);

const screenWidth = ref(typeof window !== 'undefined' ? window.screen.width : 1440);
const screenHeight = ref(typeof window !== 'undefined' ? window.screen.height : 900);

const isMobile = computed(() => screenWidth.value < screenHeight.value);

// Keep screen dimensions in sync on orientation change
let _screenSyncCleanup: (() => void) | null = null;
if (typeof window !== 'undefined') {
  const syncScreenDims = () => {
    screenWidth.value = window.screen.width;
    screenHeight.value = window.screen.height;
  };
  const orientHandler = () => setTimeout(syncScreenDims, 150);
  window.addEventListener('orientationchange', orientHandler);
  window.addEventListener('resize', syncScreenDims);
  _screenSyncCleanup = () => {
    window.removeEventListener('orientationchange', orientHandler);
    window.removeEventListener('resize', syncScreenDims);
  };
}
const showMobileEditor = computed(() => isMobile.value && selectedEntryUid.value !== null);
const mobileTab = ref<'list' | 'edit' | 'settings' | 'copy' | 'ai' | 'tags'>('list');
const tagEditorMode = ref(false);
const tagFilterPanelOpen = ref(false);
const tagFilterSearchText = ref('');
const tagNewName = ref('');
const tagNewParentId = ref('');
const tagAssignSearch = ref('');
const tagAssignTargetId = ref('');
const tagTreeExpandedIds = ref<string[]>([]);

const bindings = reactive({
  global: [] as string[],
  charPrimary: null as string | null,
  charAdditional: [] as string[],
  chat: null as string | null,
});

const activationLogs = ref<ActivationLog[]>([]);
const {
  persistedState,
  readPersistedState,
  writePersistedState,
  updatePersistedState,
} = usePersistedState(syncSelectedGlobalPresetFromState);
const {
  versionInfo,
  versionCheckLoading,
  versionCheckError,
  checkLatestVersion,
  copyVersionImportUrl,
} = useVersionInfo(__WB_ASSISTANT_BUILD_COMMIT__, __WB_ASSISTANT_BUILD_TIME__);

const subscriptions: EventSubscription[] = [];

const selectedEntry = computed(() => {
  if (selectedEntryUid.value === null) {
    return null;
  }
  return draftEntries.value.find(entry => entry.uid === selectedEntryUid.value) ?? null;
});

const selectedEntryIndex = computed(() => {
  if (!selectedEntry.value) {
    return -1;
  }
  return draftEntries.value.findIndex(entry => entry.uid === selectedEntry.value?.uid);
});

const selectedEntryUidSet = computed(() => new Set(selectedEntryUids.value));
const selectedEntryCount = computed(() => selectedEntryUids.value.length);
const multiEditEnabled = computed(() => persistedState.value.multi_edit.enabled !== false);
const multiEditSyncExtraJson = computed(() => persistedState.value.multi_edit.sync_extra_json === true);
const isMultiEditSyncActive = computed(() => {
  if (!multiEditEnabled.value) {
    return false;
  }
  if (!selectedEntry.value || selectedEntryUids.value.length <= 1) {
    return false;
  }
  if (!selectedEntryUids.value.includes(selectedEntry.value.uid)) {
    return false;
  }
  if (isMobile.value && !mobileMultiSelectMode.value) {
    return false;
  }
  return true;
});
const multiEditSessionKey = computed(() => {
  if (!isMultiEditSyncActive.value || !selectedEntry.value) {
    return '';
  }
  return `${selectedWorldbookName.value}::${selectedEntry.value.uid}::${getOrderedSelectedEntryUids().join(',')}`;
});
const multiEditHintText = computed(() => {
  if (!multiEditEnabled.value) {
    return '多选联动已关闭（可在设置中心开启）';
  }
  return '多选联动已开启：配置字段会同步到其余选中条目（名称/内容不同步）';
});
const selectedPositionSelectValue = computed<PositionSelectValue>({
  get() {
    if (!selectedEntry.value) {
      return 'before_character_definition';
    }
    if (selectedEntry.value.position.type === 'at_depth') {
      return `at_depth_as_${selectedEntry.value.position.role}` as PositionSelectValue;
    }
    return selectedEntry.value.position.type;
  },
  set(value) {
    applySelectedPositionSelectValue(value);
  },
});

const viewSortActive = ref(false);

const filteredEntries = computed(() => {
  const keyword = searchText.value.trim().toLowerCase();
  const result = draftEntries.value.filter(entry => {
    if (onlyEnabled.value && !entry.enabled) {
      return false;
    }
    if (!keyword) {
      return true;
    }
    const keysJoined = entry.strategy.keys.map(stringifyKeyword).join(' ').toLowerCase();
    return (
      entry.name.toLowerCase().includes(keyword) ||
      entry.content.toLowerCase().includes(keyword) ||
      keysJoined.includes(keyword)
    );
  });
  if (viewSortActive.value) {
    return [...result].sort(compareEntriesByPositionThenOrder);
  }
  return result;
});

const enabledEntryCount = computed(() => draftEntries.value.filter(entry => entry.enabled).length);

function sortEntries(): void {
  const mode = persistedState.value.sort.mode;
  if (mode === 'view') {
    viewSortActive.value = !viewSortActive.value;
    return;
  }
  // mutate mode
  if (!draftEntries.value.length) return;
  // Save reference to the currently selected entry BEFORE any UID mutation
  const currentSelectedRef = selectedEntry.value;
  draftEntries.value.sort(compareEntriesByPositionThenOrder);
  if (persistedState.value.sort.reassign_uid) {
    for (let i = 0; i < draftEntries.value.length; i++) {
      draftEntries.value[i].uid = i;
    }
    // Re-select using saved reference (since UIDs have changed)
    if (currentSelectedRef) {
      const newUid = currentSelectedRef.uid; // already reassigned above
      selectedEntryUid.value = newUid;
      selectedEntryUids.value = [newUid];
      selectedEntryAnchorUid.value = newUid;
    }
  }
  toastr.success(`已按位置→权重排序 ${draftEntries.value.length} 个条目${persistedState.value.sort.reassign_uid ? '（UID 已重新分配）' : ''}`);
}

const totalContentChars = computed(() =>
  draftEntries.value.reduce((sum, entry) => {
    return sum + entry.content.length;
  }, 0),
);

const hasUnsavedChanges = computed(() => draftEntriesDigest.value !== originalEntriesDigest.value);
const isCompactLayout = computed(() => isCompactLayoutWidth(viewportWidth.value));
const isDesktopFocusMode = computed(() => isDesktopFocusLayout(isMobile.value, isCompactLayout.value, isFocusEditing.value));
const canResizeHistorySections = computed(() => !isMobile.value && viewportWidth.value > 1380);
const focusCineEnabled = computed(() => !isMobile.value && viewportWidth.value > 1100);
const isFocusCineRunning = computed(() => focusCinePhase.value === 'running' || focusCinePhase.value === 'settling');
const copyCineEnabled = computed(() => !isMobile.value && viewportWidth.value > 1100);
const isCopyCineRunning = computed(() => copyCinePhase.value === 'running' || copyCinePhase.value === 'settling');
const isAnyCineLocked = computed(() => focusCineLocked.value || copyCineLocked.value);
const focusCineRootClass = computed(() => ({
  'focus-cine-running': isFocusCineRunning.value,
  'focus-cine-enter': isFocusCineRunning.value && focusCineDirection.value === 'enter',
  'focus-cine-exit': isFocusCineRunning.value && focusCineDirection.value === 'exit',
  'focus-cine-locked': focusCineLocked.value,
  'copy-cine-running': isCopyCineRunning.value,
  'copy-cine-enter': isCopyCineRunning.value && copyCineDirection.value === 'enter',
  'copy-cine-exit': isCopyCineRunning.value && copyCineDirection.value === 'exit',
  'copy-cine-locked': copyCineLocked.value,
}));
const isFocusToolbarCompact = computed(() => isDesktopFocusMode.value && viewportWidth.value < 1360);
const activeMainPaneMin = computed(() => (isDesktopFocusMode.value ? FOCUS_MAIN_PANE_MIN : MAIN_PANE_MIN));
const activeEditorSideMin = computed(() => (isDesktopFocusMode.value ? FOCUS_EDITOR_SIDE_MIN : EDITOR_SIDE_MIN));
const activeMainPaneWidth = computed(() => (isDesktopFocusMode.value ? focusMainPaneWidth.value : mainPaneWidth.value));
const activeEditorSideWidth = computed(() => (isDesktopFocusMode.value ? focusEditorSideWidth.value : editorSideWidth.value));

const mainLayoutStyle = computed<Record<string, string> | undefined>(() =>
  buildMainLayoutStyle({
    isMobile: isMobile.value,
    isCompactLayout: isCompactLayout.value,
    activeMainPaneMin: activeMainPaneMin.value,
    activeMainPaneWidth: activeMainPaneWidth.value,
    mainEditorMin: MAIN_EDITOR_MIN,
    resizeHandleSize: RESIZE_HANDLE_SIZE,
  }),
);

const editorShellStyle = computed<Record<string, string> | undefined>(() =>
  buildEditorShellStyle({
    isCompactLayout: isCompactLayout.value,
    activeEditorSideMin: activeEditorSideMin.value,
    activeEditorSideWidth: activeEditorSideWidth.value,
    editorCenterMin: EDITOR_CENTER_MIN,
    resizeHandleSize: RESIZE_HANDLE_SIZE,
  }),
);

const themeStyles = computed(() => {
  const baseColors = THEMES[currentTheme.value].colors;
  if (!persistedState.value.glass_mode) {
    return baseColors;
  }

  // Glassmorphism mode: convert specific hex backgrounds to rgba
  const glassColors: Record<string, string> = { ...baseColors };

  const hexToRgb = (hex: string): string | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
  };

  const rootHex = baseColors['--wb-bg-root'];
  if (rootHex && rootHex.startsWith('#')) {
    const rgb = hexToRgb(rootHex);
    if (rgb) glassColors['--wb-bg-root'] = `rgba(${rgb}, 0.25)`;
  }

  const panelHex = baseColors['--wb-bg-panel'];
  if (panelHex && panelHex.startsWith('#')) {
    const rgb = hexToRgb(panelHex);
    if (rgb) {
      glassColors['--wb-bg-panel'] = `rgba(${rgb}, 0.45)`;
      // Override dropdown and glass-bg for better contrast in glass mode
      glassColors['--wb-dropdown-bg'] = `rgba(${rgb}, 0.65)`;
      glassColors['--wb-glass-bg'] = `rgba(${rgb}, 0.75)`;
    }
  }

  return glassColors;
});

const themeOptions = computed(() => {
  return Object.entries(THEMES).map(([key, item]) => ({
    key: key as ThemeKey,
    label: item.label,
  }));
});

const selectableWorldbookNames = computed(() => {
  if (!globalWorldbookMode.value) {
    return worldbookNames.value;
  }
  return bindings.global.filter(name => worldbookNames.value.includes(name));
});

const globalWorldbookPresets = computed(() => persistedState.value.global_presets ?? []);

const selectedGlobalPreset = computed(() => {
  return globalWorldbookPresets.value.find(item => item.id === selectedGlobalPresetId.value) ?? null;
});

const strategySelectOptions: BaseSelectOption<string>[] = strategyTypeOptions.map(value => ({
  value,
  label: value === 'constant' ? '🔵 常驻' : value === 'selective' ? '🟢 关键词' : '🔗 向量化',
}));
const secondaryLogicSelectOptions: BaseSelectOption<string>[] = secondaryLogicOptions.map(value => ({
  value,
  label: getSecondaryLogicLabel(value),
}));
const positionSelectControlOptions: BaseSelectOption<string>[] = positionSelectOptions.map(item => ({
  value: item.value,
  label: item.label,
}));
const positionRoleOptions: BaseSelectOption<string>[] = ['system', 'assistant', 'user'].map(value => ({ value, label: value }));
const tagFilterLogicOptions: BaseSelectOption<string>[] = [
  { value: 'or', label: 'OR' },
  { value: 'and', label: 'AND' },
];
const tagFilterMatchModeOptions: BaseSelectOption<string>[] = [
  { value: 'descendants', label: '子树' },
  { value: 'exact', label: '精确' },
];
const globalPresetOptions = computed<BaseSelectOption<string>[]>(() => [
  { value: '', label: '默认预设（清空全局世界书）' },
  ...globalWorldbookPresets.value.map(preset => ({
    value: preset.id,
    label: `${preset.name}（${preset.worldbooks.length}）`,
  })),
]);
const aiTargetWorldbookOptions = computed<BaseSelectOption<string>[]>(() => [
  { value: '', label: '请选择目标世界书' },
  ...worldbookNames.value.map(name => ({ value: name, label: name })),
]);
const worldbookSelectOptions = computed<BaseSelectOption<string>[]>(() =>
  selectableWorldbookNames.value.map(name => ({ value: name, label: name })),
);

const selectedGlobalPresetRoleBindings = computed(() => selectedGlobalPreset.value?.role_bindings ?? []);

const isCurrentRoleBoundToSelectedPreset = computed(() => {
  const role = currentRoleContext.value;
  const preset = selectedGlobalPreset.value;
  if (!role || !preset) {
    return false;
  }
  return preset.role_bindings.some(item => item.key === role.key);
});

const roleBindingCandidates = computed<RoleBindingCandidate[]>(() => {
  const keyword = roleBindSearchText.value.trim().toLowerCase();
  const boundSet = new Set(selectedGlobalPresetRoleBindings.value.map(item => item.key));
  const list = roleBindingSourceCandidates.value;
  const filtered = keyword
    ? list.filter(item => {
        return (
          item.name.toLowerCase().includes(keyword) ||
          item.avatar.toLowerCase().includes(keyword) ||
          item.key.toLowerCase().includes(keyword)
        );
      })
    : list;
  return filtered.map(item => ({
    ...item,
    bound: boundSet.has(item.key),
  }));
});

const tagDefinitions = computed(() => persistedState.value.worldbook_tags.definitions);
const tagAssignments = computed(() => persistedState.value.worldbook_tags.assignments);

const tagFilterState = computed(() => normalizeTagFilterState(persistedState.value.tag_filter));
const selectedTagFilterIds = computed<string[]>({
  get: () => tagFilterState.value.selected_ids,
  set(value) {
    const valid = [...new Set(value.map(id => toStringSafe(id).trim()).filter(Boolean))];
    updatePersistedState(state => {
      state.tag_filter.selected_ids = valid;
    });
  },
});
const tagFilterLogic = computed<TagFilterLogic>({
  get: () => tagFilterState.value.logic,
  set(value) {
    updatePersistedState(state => {
      state.tag_filter.logic = value === 'and' ? 'and' : 'or';
    });
  },
});
const tagFilterMatchMode = computed<TagFilterMatchMode>({
  get: () => tagFilterState.value.match_mode,
  set(value) {
    updatePersistedState(state => {
      state.tag_filter.match_mode = value === 'exact' ? 'exact' : 'descendants';
    });
  },
});

interface TagTreeRow {
  id: string;
  name: string;
  path: string;
  depth: number;
  hasChildren: boolean;
  parentId: string | null;
  color: string;
}

const tagDefinitionMap = computed(() => {
  const map = new Map<string, WorldbookTagDefinition>();
  for (const def of tagDefinitions.value) {
    map.set(def.id, def);
  }
  return map;
});

const tagChildrenMap = computed(() => {
  const buckets = new Map<string | null, WorldbookTagDefinition[]>();
  for (const def of tagDefinitions.value) {
    const parentId = def.parent_id && tagDefinitionMap.value.has(def.parent_id) ? def.parent_id : null;
    const list = buckets.get(parentId) ?? [];
    list.push({ ...def, parent_id: parentId });
    buckets.set(parentId, list);
  }
  for (const list of buckets.values()) {
    list.sort((left, right) => {
      const sortDiff = left.sort - right.sort;
      if (sortDiff !== 0) {
        return sortDiff;
      }
      return left.name.localeCompare(right.name, 'zh-Hans-CN');
    });
  }
  return buckets;
});

const tagRootIds = computed(() => (tagChildrenMap.value.get(null) ?? []).map(item => item.id));

function getTagPathLabel(tagId: string): string {
  const map = tagDefinitionMap.value;
  const names: string[] = [];
  const seen = new Set<string>();
  let cursor: string | null = tagId;
  while (cursor && map.has(cursor) && !seen.has(cursor)) {
    seen.add(cursor);
    const current = map.get(cursor)!;
    names.push(current.name);
    cursor = current.parent_id && map.has(current.parent_id) ? current.parent_id : null;
  }
  return names.reverse().join('/');
}

const tagPathMap = computed(() => {
  const map = new Map<string, string>();
  for (const def of tagDefinitions.value) {
    map.set(def.id, getTagPathLabel(def.id));
  }
  return map;
});

function collectDescendants(tagId: string): Set<string> {
  const result = new Set<string>([tagId]);
  const queue = [tagId];
  while (queue.length) {
    const current = queue.shift()!;
    const children = tagChildrenMap.value.get(current) ?? [];
    for (const child of children) {
      if (result.has(child.id)) {
        continue;
      }
      result.add(child.id);
      queue.push(child.id);
    }
  }
  return result;
}

const tagDescendantsMap = computed(() => {
  const map = new Map<string, Set<string>>();
  for (const def of tagDefinitions.value) {
    map.set(def.id, collectDescendants(def.id));
  }
  return map;
});

const selectedTagFilterIdSet = computed(() => new Set(selectedTagFilterIds.value));

const tagFilterSummary = computed(() => {
  const ids = selectedTagFilterIds.value.filter(id => tagDefinitionMap.value.has(id));
  if (!ids.length) {
    return '未筛选';
  }
  const firstPath = tagPathMap.value.get(ids[0]) ?? '未命名标签';
  if (ids.length === 1) {
    return firstPath;
  }
  return `${firstPath} +${ids.length - 1}`;
});

const tagTreeRows = computed<TagTreeRow[]>(() => {
  const rows: TagTreeRow[] = [];
  const keyword = tagFilterSearchText.value.trim().toLowerCase();
  const expanded = new Set(tagTreeExpandedIds.value);
  const walk = (parentId: string | null, depth: number): void => {
    const children = tagChildrenMap.value.get(parentId) ?? [];
    for (const child of children) {
      const path = tagPathMap.value.get(child.id) ?? child.name;
      const row: TagTreeRow = {
        id: child.id,
        name: child.name,
        path,
        depth,
        hasChildren: (tagChildrenMap.value.get(child.id) ?? []).length > 0,
        parentId: child.parent_id,
        color: child.color,
      };
      const hit = !keyword || row.name.toLowerCase().includes(keyword) || row.path.toLowerCase().includes(keyword);
      if (hit) {
        rows.push(row);
      }
      const shouldWalkChildren = keyword ? true : expanded.has(child.id);
      if (shouldWalkChildren) {
        walk(child.id, depth + 1);
      }
    }
  };
  walk(null, 0);
  return rows;
});

const tagManagementRows = computed<TagTreeRow[]>(() => {
  const rows: TagTreeRow[] = [];
  const walk = (parentId: string | null, depth: number): void => {
    const children = tagChildrenMap.value.get(parentId) ?? [];
    for (const child of children) {
      rows.push({
        id: child.id,
        name: child.name,
        path: tagPathMap.value.get(child.id) ?? child.name,
        depth,
        hasChildren: (tagChildrenMap.value.get(child.id) ?? []).length > 0,
        parentId: child.parent_id,
        color: child.color,
      });
      walk(child.id, depth + 1);
    }
  };
  walk(null, 0);
  return rows;
});

const tagAssignOptions = computed(() => {
  return tagManagementRows.value.map(row => ({
    id: row.id,
    name: row.name,
    path: row.path,
    color: row.color,
  }));
});

function getWorldbookTags(worldbookName: string): WorldbookTagDefinition[] {
  const ids = tagAssignments.value[worldbookName] ?? [];
  const defs = tagDefinitions.value.filter(d => ids.includes(d.id));
  return defs.sort((left, right) => {
    const leftPath = tagPathMap.value.get(left.id) ?? left.name;
    const rightPath = tagPathMap.value.get(right.id) ?? right.name;
    return leftPath.localeCompare(rightPath, 'zh-Hans-CN');
  });
}

function getWorldbookTagPathSummary(worldbookName: string): string {
  const tags = getWorldbookTags(worldbookName);
  if (!tags.length) {
    return '未分配标签';
  }
  const paths = tags.map(tag => tagPathMap.value.get(tag.id) ?? tag.name);
  if (paths.length <= 2) {
    return paths.join(' · ');
  }
  return `${paths[0]} · ${paths[1]} +${paths.length - 2}`;
}

function toggleTagFilterSelection(tagId: string): void {
  const current = new Set(selectedTagFilterIds.value);
  if (current.has(tagId)) {
    current.delete(tagId);
  } else {
    current.add(tagId);
  }
  selectedTagFilterIds.value = Array.from(current);
}

function clearTagFilterSelection(): void {
  selectedTagFilterIds.value = [];
}

function toggleTagTreeExpanded(tagId: string): void {
  const set = new Set(tagTreeExpandedIds.value);
  if (set.has(tagId)) {
    set.delete(tagId);
  } else {
    set.add(tagId);
  }
  tagTreeExpandedIds.value = Array.from(set);
}

function isWorldbookMatchedByTagFilter(worldbookName: string): boolean {
  const selected = selectedTagFilterIds.value.filter(id => tagDefinitionMap.value.has(id));
  if (!selected.length) {
    return true;
  }
  const assigned = new Set(tagAssignments.value[worldbookName] ?? []);
  const candidateSets = selected.map(id => {
    if (tagFilterMatchMode.value === 'exact') {
      return new Set<string>([id]);
    }
    return tagDescendantsMap.value.get(id) ?? new Set<string>([id]);
  });
  const hasIntersection = (candidate: Set<string>) => {
    for (const id of candidate) {
      if (assigned.has(id)) {
        return true;
      }
    }
    return false;
  };
  if (tagFilterLogic.value === 'and') {
    return candidateSets.every(set => hasIntersection(set));
  }
  return candidateSets.some(set => hasIntersection(set));
}

const tagAssignWorldbooks = computed(() => {
  const keyword = tagAssignSearch.value.trim().toLowerCase();
  const names = worldbookNames.value;
  if (!keyword) return names;
  return names.filter(name => name.toLowerCase().includes(keyword));
});

const crossCopySourceIsCurrentWorldbook = computed(() => {
  return Boolean(crossCopySourceWorldbook.value) && crossCopySourceWorldbook.value === selectedWorldbookName.value;
});

const crossCopySourceVersionLabel = computed(() => {
  if (!crossCopySourceIsCurrentWorldbook.value) {
    return '来源为其他世界书，固定读取已保存版本';
  }
  return crossCopyUseDraftSourceWhenCurrent.value ? '来源读取当前草稿（含未保存修改）' : '来源读取已保存版本';
});
const crossCopyHasCompared = computed(() => crossCopyLastComparedAt.value > 0);

const crossCopyWorkspaceSummary = computed(() => {
  const source = crossCopySourceWorldbook.value || '未选择来源';
  const target = crossCopyTargetWorldbook.value || '未选择目标';
  return `${source} → ${target}`;
});

const crossCopyWorkspaceComparedText = computed(() => {
  if (!crossCopyHasCompared.value) {
    return '尚未比较';
  }
  return `上次比较：${formatDateTime(crossCopyLastComparedAt.value)}`;
});

const crossCopySourceTargetInvalid = computed(() => {
  if (!crossCopySourceWorldbook.value || !crossCopyTargetWorldbook.value) {
    return false;
  }
  return crossCopySourceWorldbook.value === crossCopyTargetWorldbook.value;
});

const {
  showModal: showCrossCopyDiffModal,
  row: crossCopyDiffRow,
  targetEntry: crossCopyDiffTargetEntry,
  fieldDiffRows: crossCopyFieldDiffRows,
  contentDiff: crossCopyContentDiff,
  contentDiffSummary: crossCopyContentDiffSummary,
  summary: crossCopyDiffSummary,
  headerText: crossCopyDiffHeaderText,
  open: openCrossCopyDiff,
  close: closeCrossCopyDiff,
} = useCrossCopyDiffModal({
  rows: crossCopyRows,
});

const {
  sourceRowsFiltered: crossCopySourceRowsFiltered,
  rowsFiltered: crossCopyRowsFiltered,
  selectedRows: crossCopySelectedRows,
  statusCounts: crossCopyStatusCounts,
  selectedCount: crossCopySelectedCount,
  setSelectionForFiltered: setCrossCopySelectionForFiltered,
  setSelectionForAll: setCrossCopySelectionForAll,
  setRowSelected: setCrossCopyRowSelected,
  setRowAction: setCrossCopyRowAction,
  setRowRenameName: setCrossCopyRowRenameName,
  handleRowRenameBlur: handleCrossCopyRowRenameBlur,
  openDiffById: openCrossCopyDiffById,
  applyBulkAction: applyCrossCopyBulkActionToRows,
  applyActionByStatus: applyCrossCopyActionByStatus,
} = useCrossCopySelection({
  rows: crossCopyRows,
  searchText: crossCopySearchText,
  statusFilter: crossCopyStatusFilter,
  ensureRenameForRow: ensureCrossCopyRenameForRow,
  openDiff: openCrossCopyDiff,
});

const crossCopyCanCompare = computed(() =>
  Boolean(crossCopySourceWorldbook.value && crossCopyTargetWorldbook.value) && !crossCopySourceTargetInvalid.value,
);
const crossCopyCanApply = computed(() =>
  crossCopyCanCompare.value && crossCopySelectedRows.value.length > 0 && !crossCopyApplyLoading.value,
);

const crossCopyDesktopSingleColumn = computed(() => viewportWidth.value <= 1200);
const {
  crossCopyPaneResizeState,
  desktopLeftWidthClamped: crossCopyDesktopLeftWidthClamped,
  gridStyle: crossCopyGridStyle,
  startResize: startCrossCopyPaneResize,
  stopResize: stopCrossCopyPaneResize,
} = useCrossCopyResize({
  desktopLeftWidth: crossCopyDesktopLeftWidth,
  desktopSingleColumn: crossCopyDesktopSingleColumn,
  cineLocked: isAnyCineLocked,
  persistState: () => persistCrossCopyState(),
});

const {
  applyFromPersisted: applyCrossCopyStateFromPersisted,
  persist: persistCrossCopyState,
} = useCrossCopyPersistence({
  persistedState,
  updatePersistedState,
  sourceWorldbook: crossCopySourceWorldbook,
  targetWorldbook: crossCopyTargetWorldbook,
  useDraftSourceWhenCurrent: crossCopyUseDraftSourceWhenCurrent,
  snapshotBeforeApply: crossCopySnapshotBeforeApply,
  desktopLeftWidth: crossCopyDesktopLeftWidth,
  desktopLeftWidthClamped: crossCopyDesktopLeftWidthClamped,
  controlsCollapsed: crossCopyControlsCollapsed,
  workspaceToolsExpanded: crossCopyWorkspaceToolsExpanded,
});

const {
  step: crossCopyMobileStep,
  canGoStep2: crossCopyMobileCanGoStep2,
  canGoStep3: crossCopyMobileCanGoStep3,
  nextDisabled: crossCopyMobileNextDisabled,
  goToStep: goToCrossCopyMobileStep,
  goToPreviousStep: goToPreviousCrossCopyMobileStep,
  goToNextStep: goToNextCrossCopyMobileStep,
  resetStep: resetCrossCopyMobileStep,
} = useCrossCopyMobileSteps({
  hasCompared: crossCopyHasCompared,
  rowCount: computed(() => crossCopyRows.value.length),
  compareLoading: crossCopyCompareLoading,
  canApply: crossCopyCanApply,
  notifyBlocked: () => toastr.info('请先完成比较，再继续下一步'),
});

const { applySelection: applyCrossCopySelection } = useCrossCopyApply({
  sourceWorldbook: crossCopySourceWorldbook,
  targetWorldbook: crossCopyTargetWorldbook,
  rows: crossCopyRows,
  applyLoading: crossCopyApplyLoading,
  snapshotBeforeApply: crossCopySnapshotBeforeApply,
  currentWorldbookName: selectedWorldbookName,
  hasUnsavedChanges,
  lastResultSummary: crossCopyLastResultSummary,
  getWorldbook,
  updateWorldbookWith,
  saveCurrentWorldbook,
  pushSnapshot: pushSnapshotForWorldbook,
  syncCurrentTargetEntries: entries => {
    draftEntries.value = klona(entries);
    originalEntries.value = klona(entries);
    syncEntriesDigestNow();
    ensureSelectedEntryExists();
  },
  refreshComparison: refreshCrossCopyComparison,
  setStatus,
  warn: message => toastr.warning(message),
  error: message => toastr.error(message),
  success: message => toastr.success(message),
});

const globalAddCandidates = computed(() => {
  const keyword = globalAddSearchText.value.trim().toLowerCase();
  return worldbookNames.value.filter(name => {
    if (bindings.global.includes(name)) {
      return false;
    }
    if (!keyword) {
      return true;
    }
    return name.toLowerCase().includes(keyword);
  });
});

const filteredGlobalWorldbooks = computed(() => {
  const keyword = globalFilterText.value.trim().toLowerCase();
  if (!keyword) {
    return bindings.global;
  }
  return bindings.global.filter(name => name.toLowerCase().includes(keyword));
});

const isGlobalBound = computed(() => {
  if (!selectedWorldbookName.value) {
    return false;
  }
  return bindings.global.includes(selectedWorldbookName.value);
});

const snapshotsForCurrent = computed(() => {
  if (!selectedWorldbookName.value) {
    return [];
  }
  return persistedState.value.history[selectedWorldbookName.value] ?? [];
});

const entrySnapshotsForSelected = computed(() => {
  if (!selectedWorldbookName.value || !selectedEntry.value) {
    return [];
  }
  const byWorldbook = persistedState.value.entry_history[selectedWorldbookName.value] ?? {};
  return byWorldbook[String(selectedEntry.value.uid)] ?? [];
});

function buildEntryVersionViews(): EntryVersionView[] {
  if (!selectedEntry.value) {
    return [];
  }
  const baselineEntry = originalEntries.value.find(item => item.uid === selectedEntry.value?.uid) ?? null;
  const current: EntryVersionView = {
    id: '__current__',
    label: '当前版本',
    ts: Date.now(),
    name: selectedEntry.value.name,
    entry: selectedEntry.value,
    isCurrent: true,
  };
  const baseline = baselineEntry
    ? ({
        id: '__baseline__',
        label: '加载基线',
        ts: 0,
        name: baselineEntry.name,
        entry: baselineEntry,
        isCurrent: false,
      } satisfies EntryVersionView)
    : null;
  const history = entrySnapshotsForSelected.value.map(item => ({
    id: item.id,
    label: item.label,
    ts: item.ts,
    name: item.name,
    entry: item.entry,
    isCurrent: false,
  }));
  return [current, ...(baseline ? [baseline] : []), ...history];
}

const entryVersionViews = computed<EntryVersionView[]>(() => {
  if (!showEntryHistoryModal.value) {
    return [];
  }
  return buildEntryVersionViews();
});

const selectedEntryHistoryLeft = computed(() => {
  return entryVersionViews.value.find(item => item.id === entryHistoryLeftId.value) ?? null;
});

const selectedEntryHistoryRight = computed(() => {
  return entryVersionViews.value.find(item => item.id === entryHistoryRightId.value) ?? null;
});

const canRestoreEntryFromLeft = computed(() => {
  return Boolean(selectedEntry.value && selectedEntryHistoryLeft.value && !selectedEntryHistoryLeft.value.isCurrent);
});

function buildWorldbookVersionViews(): WorldbookVersionView[] {
  if (!selectedWorldbookName.value) {
    return [];
  }
  const current: WorldbookVersionView = {
    id: '__current__',
    label: '当前草稿',
    ts: Date.now(),
    entries: draftEntries.value,
    isCurrent: true,
  };
  const baseline: WorldbookVersionView | null = {
    id: '__baseline__',
    label: '加载基线',
    ts: 0,
    entries: originalEntries.value,
    isCurrent: false,
  };
  const history = snapshotsForCurrent.value.map(item => ({
    id: item.id,
    label: item.label,
    ts: item.ts,
    entries: item.entries,
    isCurrent: false,
  }));
  return [current, ...(originalEntries.value.length ? [baseline] : []), ...history];
}

const worldbookVersionViews = computed<WorldbookVersionView[]>(() => {
  if (!showWorldbookHistoryModal.value) {
    return [];
  }
  return buildWorldbookVersionViews();
});

const selectedWorldbookHistoryLeft = computed(() => {
  return worldbookVersionViews.value.find(item => item.id === worldbookHistoryLeftId.value) ?? null;
});

const selectedWorldbookHistoryRight = computed(() => {
  return worldbookVersionViews.value.find(item => item.id === worldbookHistoryRightId.value) ?? null;
});

const canRestoreWorldbookFromLeft = computed(() => {
  return Boolean(selectedWorldbookHistoryLeft.value && !selectedWorldbookHistoryLeft.value.isCurrent);
});

const entryHistoryFieldDiffRows = computed<CrossCopyFieldDiffRow[]>(() => {
  return buildEntryFieldDiffRows(
    selectedEntryHistoryLeft.value?.entry ?? null,
    selectedEntryHistoryRight.value?.entry ?? null,
    { left_fallback: '（不存在）', right_fallback: '（不存在）' },
  );
});

const entryHistoryContentDiff = computed<CrossCopyTextDiffResult>(() => {
  const left = selectedEntryHistoryLeft.value?.entry?.content ?? '';
  const right = selectedEntryHistoryRight.value?.entry?.content ?? '';
  return buildCrossCopyTextDiff(toStringSafe(left), toStringSafe(right));
});

const entryHistoryFieldDiffSummary = computed(() => {
  const rows = entryHistoryFieldDiffRows.value;
  if (!rows.length) {
    return '无可对比字段';
  }
  const changed = rows.filter(row => row.changed).length;
  return `不同字段 ${changed} / ${rows.length}`;
});

const entryHistoryContentDiffSummary = computed(() => {
  const result = entryHistoryContentDiff.value;
  return `新增行 ${result.added} / 修改行 ${result.changed} / 删除行 ${result.removed}`;
});

const worldbookHistoryCompareRows = computed<WorldbookHistoryCompareRow[]>(() => {
  return buildWorldbookHistoryCompareRows(selectedWorldbookHistoryLeft.value, selectedWorldbookHistoryRight.value);
});

const worldbookHistoryCompareSummary = computed(() => {
  const rows = worldbookHistoryCompareRows.value;
  let added = 0;
  let removed = 0;
  let changed = 0;
  for (const row of rows) {
    if (row.status === 'added') {
      added += 1;
    } else if (row.status === 'removed') {
      removed += 1;
    } else {
      changed += 1;
    }
  }
  return `新增 ${added} / 修改 ${changed} / 删除 ${removed}`;
});

const worldbookHistoryActiveRow = computed(() => {
  if (!worldbookHistoryActiveRowKey.value) {
    return null;
  }
  return worldbookHistoryCompareRows.value.find(row => row.key === worldbookHistoryActiveRowKey.value) ?? null;
});

const worldbookHistoryFieldDiffRows = computed<CrossCopyFieldDiffRow[]>(() => {
  return buildEntryFieldDiffRows(
    worldbookHistoryActiveRow.value?.left_entry ?? null,
    worldbookHistoryActiveRow.value?.right_entry ?? null,
    { left_fallback: '（不存在）', right_fallback: '（不存在）' },
  );
});

const worldbookHistoryFieldDiffSummary = computed(() => {
  const rows = worldbookHistoryFieldDiffRows.value;
  if (!rows.length) {
    return '无可对比字段';
  }
  const changed = rows.filter(row => row.changed).length;
  return `不同字段 ${changed} / ${rows.length}`;
});

const worldbookHistoryContentDiff = computed<CrossCopyTextDiffResult>(() => {
  const left = worldbookHistoryActiveRow.value?.left_entry?.content ?? '';
  const right = worldbookHistoryActiveRow.value?.right_entry?.content ?? '';
  return buildCrossCopyTextDiff(toStringSafe(left), toStringSafe(right));
});

const worldbookHistoryContentDiffSummary = computed(() => {
  const result = worldbookHistoryContentDiff.value;
  return `新增行 ${result.added} / 修改行 ${result.changed} / 删除行 ${result.removed}`;
});

function getHistorySectionRatios(target: HistoryResizeTarget): [number, number, number] {
  return target === 'entry' ? entryHistorySectionRatios.value : worldbookHistorySectionRatios.value;
}

function setHistorySectionRatios(target: HistoryResizeTarget, next: [number, number, number]): void {
  const normalized: [number, number, number] = [
    Number(next[0].toFixed(2)),
    Number(next[1].toFixed(2)),
    Number(next[2].toFixed(2)),
  ];
  const delta = Number((100 - (normalized[0] + normalized[1] + normalized[2])).toFixed(2));
  normalized[2] = Number((normalized[2] + delta).toFixed(2));
  if (target === 'entry') {
    entryHistorySectionRatios.value = normalized;
    return;
  }
  worldbookHistorySectionRatios.value = normalized;
}

function getHistorySectionStyle(target: HistoryResizeTarget, sectionIndex: 0 | 1 | 2): Record<string, string> | undefined {
  if (!canResizeHistorySections.value) {
    return undefined;
  }
  const ratios = getHistorySectionRatios(target);
  return {
    flex: `0 0 ${ratios[sectionIndex]}%`,
  };
}

function startHistorySectionResize(target: HistoryResizeTarget, handleIndex: 0 | 1, event: PointerEvent): void {
  if (!canResizeHistorySections.value) {
    return;
  }
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }

  const container = target === 'entry' ? entryHistoryLayoutRef.value : worldbookHistoryLayoutRef.value;
  const containerHeight = container?.getBoundingClientRect().height ?? 0;
  if (!container || containerHeight < 120) {
    return;
  }

  const trigger = event.currentTarget as HTMLElement | null;
  const hostDoc = trigger?.ownerDocument ?? document;
  const hostWin = hostDoc.defaultView ?? window;
  historySectionResizeState.value = {
    target,
    handleIndex,
    pointerId: event.pointerId,
    startY: event.clientY,
    containerHeight,
    startRatios: [...getHistorySectionRatios(target)] as [number, number, number],
    doc: hostDoc,
    win: hostWin,
  };

  trigger?.setPointerCapture?.(event.pointerId);
  hostDoc.addEventListener('pointermove', onHistorySectionResizeMove);
  hostDoc.addEventListener('pointerup', stopHistorySectionResize);
  hostDoc.addEventListener('pointercancel', stopHistorySectionResize);
  hostWin.addEventListener('blur', stopHistorySectionResize);
  event.preventDefault();
}

function onHistorySectionResizeMove(event: PointerEvent): void {
  const state = historySectionResizeState.value;
  if (!state || state.pointerId !== event.pointerId) {
    return;
  }
  const deltaPercent = ((event.clientY - state.startY) / state.containerHeight) * 100;
  const minPercent = 14;
  const [a, b, c] = state.startRatios;

  if (state.handleIndex === 0) {
    const nextA = clampNumber(a + deltaPercent, minPercent, 100 - minPercent - c);
    const nextB = 100 - nextA - c;
    setHistorySectionRatios(state.target, [nextA, nextB, c]);
    return;
  }

  const nextB = clampNumber(b + deltaPercent, minPercent, 100 - minPercent - a);
  const nextC = 100 - a - nextB;
  setHistorySectionRatios(state.target, [a, nextB, nextC]);
}

function stopHistorySectionResize(): void {
  const state = historySectionResizeState.value;
  if (!state) {
    return;
  }
  state.doc.removeEventListener('pointermove', onHistorySectionResizeMove);
  state.doc.removeEventListener('pointerup', stopHistorySectionResize);
  state.doc.removeEventListener('pointercancel', stopHistorySectionResize);
  state.win.removeEventListener('blur', stopHistorySectionResize);
  historySectionResizeState.value = null;
}

const batchExcludeTokensPreview = computed(() => parseBatchExcludeTokens(batchExcludeText.value));

const activeFindHit = computed(() => {
  if (findHitIndex.value < 0 || findHitIndex.value >= findHits.value.length) {
    return null;
  }
  return findHits.value[findHitIndex.value] ?? null;
});

const findHitSummaryText = computed(() => {
  if (!batchFindText.value.trim()) {
    return '输入查找文本后可定位';
  }
  if (!findHits.value.length) {
    return '暂无匹配';
  }
  if (!activeFindHit.value) {
    return `匹配 0 / ${findHits.value.length}`;
  }
  return `匹配 ${findHitIndex.value + 1} / ${findHits.value.length}`;
});

const entryHistorySummary = computed(() => {
  return getEntryVersionDiffSummary(selectedEntryHistoryLeft.value, selectedEntryHistoryRight.value);
});

const selectedKeysText = computed(() => {
  if (!selectedEntry.value) {
    return '';
  }
  return selectedEntry.value.strategy.keys.map(stringifyKeyword).join(', ');
});

const selectedSecondaryKeysText = computed(() => {
  if (!selectedEntry.value) {
    return '';
  }
  return selectedEntry.value.strategy.keys_secondary.keys.map(stringifyKeyword).join(', ');
});

const selectedEntryConfigDigest = computed(() => {
  if (!selectedEntry.value) {
    return '';
  }
  return JSON.stringify(extractEntryConfigPatch(selectedEntry.value, multiEditSyncExtraJson.value));
});

function commitKeysFromRaw(): void {
  if (keysDebounceTimer) { clearTimeout(keysDebounceTimer); keysDebounceTimer = null; }
  if (!selectedEntry.value) return;
  selectedEntry.value.strategy.keys = parseKeywordsFromText(selectedKeysRaw.value);
  selectedKeysRaw.value = selectedEntry.value.strategy.keys.map(stringifyKeyword).join(', ');
}

function commitSecondaryKeysFromRaw(): void {
  if (secondaryKeysDebounceTimer) { clearTimeout(secondaryKeysDebounceTimer); secondaryKeysDebounceTimer = null; }
  if (!selectedEntry.value) return;
  selectedEntry.value.strategy.keys_secondary.keys = parseKeywordsFromText(selectedSecondaryKeysRaw.value);
  selectedSecondaryKeysRaw.value = selectedEntry.value.strategy.keys_secondary.keys.map(stringifyKeyword).join(', ');
}

const selectedScanDepthText = computed({
  get: () => {
    if (!selectedEntry.value) {
      return '';
    }
    const depth = selectedEntry.value.strategy.scan_depth;
    return typeof depth === 'number' ? String(depth) : 'same_as_global';
  },
  set: (value: string) => {
    if (!selectedEntry.value) {
      return;
    }
    selectedEntry.value.strategy.scan_depth = normalizeScanDepth(value);
  },
});

const selectedRecursionDelayText = computed({
  get: () => (selectedEntry.value ? nullableNumberToText(selectedEntry.value.recursion.delay_until) : ''),
  set: (value: string) => {
    if (!selectedEntry.value) {
      return;
    }
    selectedEntry.value.recursion.delay_until = parseNullableInteger(value);
  },
});

const selectedStickyText = computed({
  get: () => (selectedEntry.value ? nullableNumberToText(selectedEntry.value.effect.sticky) : ''),
  set: (value: string) => {
    if (!selectedEntry.value) {
      return;
    }
    selectedEntry.value.effect.sticky = parseNullableInteger(value);
  },
});

const selectedCooldownText = computed({
  get: () => (selectedEntry.value ? nullableNumberToText(selectedEntry.value.effect.cooldown) : ''),
  set: (value: string) => {
    if (!selectedEntry.value) {
      return;
    }
    selectedEntry.value.effect.cooldown = parseNullableInteger(value);
  },
});

const selectedEffectDelayText = computed({
  get: () => (selectedEntry.value ? nullableNumberToText(selectedEntry.value.effect.delay) : ''),
  set: (value: string) => {
    if (!selectedEntry.value) {
      return;
    }
    selectedEntry.value.effect.delay = parseNullableInteger(value);
  },
});

function extractEntryConfigPatch(entry: WorldbookEntry, includeExtra: boolean): EntryConfigPatch {
  return {
    enabled: entry.enabled,
    strategy_type: entry.strategy.type,
    keys_secondary_logic: entry.strategy.keys_secondary.logic,
    scan_depth: entry.strategy.scan_depth,
    position_type: entry.position.type,
    position_order: Math.floor(toNumberSafe(entry.position.order, 100)),
    position_role: entry.position.role,
    position_depth: Math.max(0, Math.floor(toNumberSafe(entry.position.depth, 4))),
    probability: clampNumber(Math.floor(toNumberSafe(entry.probability, 100)), 0, 100),
    recursion_delay_until: parseNullableInteger(entry.recursion.delay_until),
    prevent_incoming: Boolean(entry.recursion.prevent_incoming),
    prevent_outgoing: Boolean(entry.recursion.prevent_outgoing),
    effect_sticky: parseNullableInteger(entry.effect.sticky),
    effect_cooldown: parseNullableInteger(entry.effect.cooldown),
    effect_delay: parseNullableInteger(entry.effect.delay),
    extra: includeExtra ? (entry.extra ? klona(entry.extra) : null) : null,
  };
}

function applyEntryConfigPatch(entry: WorldbookEntry, patch: EntryConfigPatch, includeExtra: boolean): void {
  entry.enabled = patch.enabled;

  entry.strategy.type = patch.strategy_type;
  entry.strategy.keys_secondary.logic = normalizeSecondaryLogic(patch.keys_secondary_logic);
  entry.strategy.scan_depth = normalizeScanDepth(patch.scan_depth);

  entry.position.type = normalizePositionType(patch.position_type);
  entry.position.order = Math.floor(toNumberSafe(patch.position_order, entry.position.order));
  if (entry.position.type === 'at_depth') {
    entry.position.role = normalizeRole(patch.position_role);
    entry.position.depth = Math.max(0, Math.floor(toNumberSafe(patch.position_depth, 4)));
  } else {
    entry.position.role = 'system';
    entry.position.depth = 4;
  }

  entry.probability = clampNumber(Math.floor(toNumberSafe(patch.probability, entry.probability)), 0, 100);

  entry.recursion.prevent_incoming = Boolean(patch.prevent_incoming);
  entry.recursion.prevent_outgoing = Boolean(patch.prevent_outgoing);
  entry.recursion.delay_until = parseNullableInteger(patch.recursion_delay_until);

  entry.effect.sticky = parseNullableInteger(patch.effect_sticky);
  entry.effect.cooldown = parseNullableInteger(patch.effect_cooldown);
  entry.effect.delay = parseNullableInteger(patch.effect_delay);

  if (includeExtra) {
    if (patch.extra && Object.keys(patch.extra).length > 0) {
      entry.extra = klona(patch.extra);
    } else {
      delete entry.extra;
    }
  }
}

function resetMultiEditSessionState(): void {
  if (!isMultiEditSyncActive.value || !selectedEntry.value) {
    multiEditLastPatch.value = null;
    multiEditSnapshotDone.value = false;
    return;
  }
  multiEditLastPatch.value = extractEntryConfigPatch(selectedEntry.value, multiEditSyncExtraJson.value);
  multiEditSnapshotDone.value = false;
}

function syncSelectedEntryConfigToMultiSelection(nextPatch: EntryConfigPatch, previousPatch: EntryConfigPatch): void {
  if (!selectedEntry.value || !isMultiEditSyncActive.value) {
    return;
  }
  const orderedSelected = getOrderedSelectedEntryUids();
  if (orderedSelected.length <= 1) {
    return;
  }
  const primaryUid = selectedEntry.value.uid;
  const includeExtra = multiEditSyncExtraJson.value;

  const entryByUid = new Map(draftEntries.value.map(entry => [entry.uid, entry] as const));

  if (!multiEditSnapshotDone.value) {
    const snapshotItems: Array<{
      label: string;
      uid: number;
      name: string;
      entry: WorldbookEntry;
    }> = [];

    for (const uid of orderedSelected) {
      const original = entryByUid.get(uid);
      if (!original) {
        continue;
      }
      const snapshotEntry = normalizeEntry(klona(original), uid);
      if (uid === primaryUid) {
        applyEntryConfigPatch(snapshotEntry, previousPatch, includeExtra);
      }
      snapshotItems.push({
        label: '多选配置前快照',
        uid,
        name: original.name,
        entry: snapshotEntry,
      });
    }

    if (snapshotItems.length) {
      pushEntrySnapshotsBulk(snapshotItems);
    }
    multiEditSnapshotDone.value = true;
  }

  let changedCount = 0;
  multiEditApplying.value = true;
  try {
    for (const uid of orderedSelected) {
      if (uid === primaryUid) {
        continue;
      }
      const target = entryByUid.get(uid);
      if (!target) {
        continue;
      }
      const beforeDigest = JSON.stringify(extractEntryConfigPatch(target, includeExtra));
      applyEntryConfigPatch(target, nextPatch, includeExtra);
      const afterDigest = JSON.stringify(extractEntryConfigPatch(target, includeExtra));
      if (beforeDigest !== afterDigest) {
        changedCount += 1;
      }
    }
  } finally {
    multiEditApplying.value = false;
  }

  if (changedCount > 0) {
    setStatus(`已同步配置到 ${changedCount} 个条目（名称/内容/关键词未同步）`);
  }
}

const selectedContentChars = computed(() => {
  return selectedEntry.value?.content.length ?? 0;
});

const selectedTokenEstimate = computed(() => {
  const chars = selectedContentChars.value;
  if (chars <= 0) {
    return 0;
  }
  return Math.max(1, Math.round(chars / 3.6));
});

const focusCommentSummary = computed(() => {
  const name = selectedEntry.value?.name?.trim();
  if (!name) {
    return '未命名';
  }
  return name.length > 20 ? `${name.slice(0, 20)}...` : name;
});

const focusKeywordSummary = computed(() => {
  if (!selectedEntry.value) {
    return '主0 / 次0';
  }
  return `主${selectedEntry.value.strategy.keys.length} / 次${selectedEntry.value.strategy.keys_secondary.keys.length}`;
});

const focusStrategySummary = computed(() => {
  if (!selectedEntry.value) {
    return '-';
  }
  return `${getEntryStatusLabel(selectedEntry.value)} · ${selectedEntry.value.probability}%`;
});

const focusInsertionSummary = computed(() => {
  if (!selectedEntry.value) {
    return '-';
  }
  return `${getPositionTypeLabel(selectedEntry.value.position.type, selectedEntry.value.position.role)} · #${selectedEntry.value.position.order}`;
});

const focusRecursionSummary = computed(() => {
  if (!selectedEntry.value) {
    return '-';
  }
  const tags: string[] = [];
  tags.push(selectedEntry.value.recursion.prevent_incoming ? '🚫入' : '入✓');
  tags.push(selectedEntry.value.recursion.prevent_outgoing ? '🚫出' : '出✓');
  tags.push(`d:${selectedEffectDelayText.value || 'null'}`);
  return tags.join(' · ');
});

function confirmDiscardUnsavedChanges(options: { source?: SelectionSource; reason?: string } = {}): boolean {
  if (!hasUnsavedChanges.value) {
    return true;
  }
  const sourceLabel = options.source === 'auto' ? '自动操作' : '当前操作';
  const reasonLabel = options.reason ? `（${options.reason}）` : '';
  return confirm(`${sourceLabel}${reasonLabel}会覆盖当前未保存草稿，是否继续？`);
}

function switchWorldbookSelection(nextName: string, options: WorldbookSwitchOptions = {}): boolean {
  const next = toStringSafe(nextName).trim();
  const current = selectedWorldbookName.value;
  if (next === current) {
    return true;
  }
  if (!options.allowDirty && !confirmDiscardUnsavedChanges({ source: options.source, reason: options.reason })) {
    if (!options.silentOnCancel) {
      const action = options.source === 'auto' ? '自动切换' : '切换';
      setStatus(`已取消${action}世界书`);
    }
    return false;
  }
  selectedWorldbookName.value = next;
  return true;
}

function handleWorldbookSelectionUpdate(value: string | number | null): void {
  if (typeof value !== 'string') {
    return;
  }
  switchWorldbookSelection(value, {
    source: 'manual',
    reason: '手动切换世界书',
  });
}

function updateSelectedTagFilterIds(value: string[]): void {
  selectedTagFilterIds.value = value;
}

function updateTagFilterLogic(value: TagFilterLogic): void {
  tagFilterLogic.value = value;
}

function updateTagFilterMatchMode(value: TagFilterMatchMode): void {
  tagFilterMatchMode.value = value;
}

function ensureRefreshAllowed(options: HardRefreshOptions = {}): boolean {
  const ok = confirmDiscardUnsavedChanges({ source: options.source, reason: options.reason ?? '刷新数据' });
  if (!ok) {
    setStatus(options.source === 'auto' ? '已取消自动刷新，保留未保存修改' : '已取消刷新，保留未保存修改');
  }
  return ok;
}

function syncEntriesDigestNow(): void {
  if (entriesDigestTimer) {
    clearTimeout(entriesDigestTimer);
    entriesDigestTimer = null;
  }
  draftEntriesDigest.value = JSON.stringify(draftEntries.value);
  originalEntriesDigest.value = JSON.stringify(originalEntries.value);
}

function scheduleEntriesDigestSync(delay = ENTRIES_DIGEST_DEBOUNCE_MS): void {
  if (delay <= 0) {
    syncEntriesDigestNow();
    return;
  }
  if (entriesDigestTimer) {
    clearTimeout(entriesDigestTimer);
  }
  entriesDigestTimer = setTimeout(() => {
    entriesDigestTimer = null;
    syncEntriesDigestNow();
  }, delay);
}

watch([draftEntries, originalEntries], () => {
  scheduleEntriesDigestSync();
}, { deep: true, immediate: true, flush: 'post' });

watch(selectedWorldbookName, name => {
  mobileMultiSelectMode.value = false;
  clearMobileLongPressState();
  mobileSuppressNextTap.value = false;
  closeEntryHistoryModal();
  closeWorldbookHistoryModal();
  if (crossCopyHasCompared.value) {
    resetCrossCopyCompare('当前世界书已切换，请刷新跨书比较');
  }
  if (!name) {
    draftEntries.value = [];
    originalEntries.value = [];
    selectedEntryUid.value = null;
    return;
  }
  updatePersistedState(state => {
    state.last_worldbook = name;
  });
  normalizeCrossCopyWorldbookSelection();
  void loadWorldbook(name);
});

watch(
  () => selectedEntryUid.value,
  uid => {
    if (uid === null) {
      selectedEntryUids.value = [];
      selectedEntryAnchorUid.value = null;
      syncExtraTextWithSelection();
      selectedKeysRaw.value = selectedKeysText.value;
      selectedSecondaryKeysRaw.value = selectedSecondaryKeysText.value;
      return;
    }

    const exists = draftEntries.value.some(entry => entry.uid === uid);
    if (!exists) {
      selectedEntryUids.value = [];
      selectedEntryAnchorUid.value = null;
      return;
    }
    if (!selectedEntryUids.value.includes(uid)) {
      selectedEntryUids.value = [uid];
    }
    if (selectedEntryAnchorUid.value === null || !draftEntries.value.some(entry => entry.uid === selectedEntryAnchorUid.value)) {
      selectedEntryAnchorUid.value = uid;
    }

    syncExtraTextWithSelection();
    // Sync raw keyword text when entry selection changes
    selectedKeysRaw.value = selectedKeysText.value;
    selectedSecondaryKeysRaw.value = selectedSecondaryKeysText.value;
    if (isDesktopFocusMode.value) {
      focusMetaPanel.comment = false;
      focusMetaPanel.keywords = false;
      focusSidePanelState.strategy = true;
      focusSidePanelState.insertion = true;
      focusSidePanelState.recursion = true;
    }
  },
);

watch(multiEditSessionKey, () => {
  resetMultiEditSessionState();
});

watch(multiEditSyncExtraJson, () => {
  resetMultiEditSessionState();
});

watch(selectedEntryConfigDigest, digest => {
  if (!digest || multiEditApplying.value || !selectedEntry.value || !isMultiEditSyncActive.value) {
    return;
  }
  const currentPatch = extractEntryConfigPatch(selectedEntry.value, multiEditSyncExtraJson.value);
  if (!multiEditLastPatch.value) {
    multiEditLastPatch.value = klona(currentPatch);
    return;
  }
  if (JSON.stringify(currentPatch) === JSON.stringify(multiEditLastPatch.value)) {
    return;
  }
  const previousPatch = klona(multiEditLastPatch.value);
  syncSelectedEntryConfigToMultiSelection(currentPatch, previousPatch);
  multiEditLastPatch.value = klona(currentPatch);
});

// Debounced watcher: parse keywords 600ms after user stops typing
watch(selectedKeysRaw, () => {
  if (keysDebounceTimer) clearTimeout(keysDebounceTimer);
  keysDebounceTimer = setTimeout(commitKeysFromRaw, 600);
});

watch(selectedSecondaryKeysRaw, () => {
  if (secondaryKeysDebounceTimer) clearTimeout(secondaryKeysDebounceTimer);
  secondaryKeysDebounceTimer = setTimeout(commitSecondaryKeysFromRaw, 600);
});

watch(
  [
    batchFindText,
    batchReplaceText,
    batchExcludeText,
    batchUseRegex,
    batchInName,
    batchInContent,
    batchInKeys,
    batchSearchScope,
  ],
  () => {
    resetFindState();
  },
);

watch(
  [crossCopySourceWorldbook, crossCopyTargetWorldbook, crossCopyUseDraftSourceWhenCurrent],
  () => {
    persistCrossCopyState();
    if (crossCopyHasCompared.value) {
      resetCrossCopyCompare('来源或目标已变更，请先刷新比较');
    }
  },
);

watch(crossCopySnapshotBeforeApply, () => {
  persistCrossCopyState();
});

watch([crossCopyControlsCollapsed, crossCopyWorkspaceToolsExpanded], () => {
  persistCrossCopyState();
});

watch(crossCopyHasCompared, hasCompared => {
  if (!hasCompared && crossCopyMobileStep.value > 1) {
    resetCrossCopyMobileStep();
  }
});

watch(crossCopyDesktopSingleColumn, isSingleColumn => {
  if (isSingleColumn) {
    stopCrossCopyPaneResize();
  }
});

watch(crossCopyMode, enabled => {
  if (!enabled) {
    stopCrossCopyPaneResize();
    resetCrossCopyCompare();
    resetCrossCopyMobileStep();
  }
});

watch(crossCopyDiffRow, row => {
  if (!row && showCrossCopyDiffModal.value) {
    closeCrossCopyDiff();
  }
});

watch(mobileTab, tab => {
  if (tab !== 'copy') {
    return;
  }
  globalWorldbookMode.value = false;
  aiGeneratorMode.value = false;
  tagEditorMode.value = false;
  normalizeCrossCopyWorldbookSelection();
  resetCrossCopyMobileStep();
});

watch(tagDefinitions, () => {
  ensureTagAssignTargetSelected();
  if (tagNewParentId.value && !tagDefinitionMap.value.has(tagNewParentId.value)) {
    tagNewParentId.value = '';
  }
  const selectedFiltered = selectedTagFilterIds.value.filter(id => tagDefinitionMap.value.has(id));
  const selectedChanged = selectedFiltered.length !== selectedTagFilterIds.value.length || selectedFiltered.some((id, index) => id !== selectedTagFilterIds.value[index]);
  if (selectedChanged) {
    selectedTagFilterIds.value = selectedFiltered;
  }
  const expandedFiltered = tagTreeExpandedIds.value.filter(id => tagDefinitionMap.value.has(id));
  const expandedChanged = expandedFiltered.length !== tagTreeExpandedIds.value.length || expandedFiltered.some((id, index) => id !== tagTreeExpandedIds.value[index]);
  if (expandedChanged) {
    tagTreeExpandedIds.value = expandedFiltered;
  }
  if (!tagTreeExpandedIds.value.length) {
    tagTreeExpandedIds.value = [...tagRootIds.value];
  }
}, { deep: true, immediate: true });

watch(isMobile, mobile => {
  if (mobile) {
    return;
  }
  mobileMultiSelectMode.value = false;
  mobileLongPressState.value = null;
  mobileSuppressNextTap.value = false;
});

watch(
  entryVersionViews,
  views => {
    if (!views.length) {
      entryHistoryLeftId.value = '';
      entryHistoryRightId.value = '';
      return;
    }

    const ids = new Set(views.map(item => item.id));
    if (!ids.has(entryHistoryRightId.value)) {
      entryHistoryRightId.value = '__current__';
    }
    if (!ids.has(entryHistoryLeftId.value)) {
      const fallback = views.find(item => !item.isCurrent) ?? views[0];
      entryHistoryLeftId.value = fallback.id;
    }
    if (entryHistoryLeftId.value === entryHistoryRightId.value && views.length > 1) {
      const fallback = views.find(item => item.id !== entryHistoryRightId.value);
      if (fallback) {
        entryHistoryLeftId.value = fallback.id;
      }
    }
  },
  { immediate: true },
);

watch(
  worldbookVersionViews,
  views => {
    if (!views.length) {
      worldbookHistoryLeftId.value = '';
      worldbookHistoryRightId.value = '';
      worldbookHistoryActiveRowKey.value = '';
      return;
    }

    const ids = new Set(views.map(item => item.id));
    if (!ids.has(worldbookHistoryRightId.value)) {
      worldbookHistoryRightId.value = '__current__';
    }
    if (!ids.has(worldbookHistoryLeftId.value)) {
      const fallback = views.find(item => !item.isCurrent) ?? views[0];
      worldbookHistoryLeftId.value = fallback.id;
    }
    if (worldbookHistoryLeftId.value === worldbookHistoryRightId.value && views.length > 1) {
      const fallback = views.find(item => item.id !== worldbookHistoryRightId.value);
      if (fallback) {
        worldbookHistoryLeftId.value = fallback.id;
      }
    }
  },
  { immediate: true },
);

watch(
  worldbookHistoryCompareRows,
  rows => {
    if (!rows.length) {
      worldbookHistoryActiveRowKey.value = '';
      return;
    }
    if (!rows.some(row => row.key === worldbookHistoryActiveRowKey.value)) {
      worldbookHistoryActiveRowKey.value = rows[0].key;
    }
  },
  { immediate: true },
);

watch(canResizeHistorySections, enabled => {
  if (!enabled) {
    stopHistorySectionResize();
  }
});

watch(
  () => selectedEntry.value?.position.type,
  () => {
    if (!selectedEntry.value) {
      return;
    }
    if (selectedEntry.value.position.type !== 'at_depth') {
      selectedEntry.value.position.role = 'system';
      selectedEntry.value.position.depth = 4;
    }
  },
);

watch(
  hasUnsavedChanges,
  dirty => {
    const target = window as unknown as Record<string, unknown>;
    target[DIRTY_STATE_KEY] = dirty;
  },
  { immediate: true },
);

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function toStringSafe(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value);
}

function toNumberSafe(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseNullableInteger(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string' && !value.trim()) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.max(0, Math.floor(parsed));
}

function nullableNumberToText(value: number | null): string {
  return value === null ? '' : String(value);
}

function stringifyKeyword(value: string | RegExp): string {
  return value instanceof RegExp ? value.toString() : value;
}

function parseKeywordToken(token: string): string | RegExp {
  const trimmed = token.trim();
  if (!trimmed) {
    return '';
  }
  const regexMatch = trimmed.match(/^\/(.+)\/([dgimsuy]*)$/);
  if (!regexMatch) {
    return trimmed;
  }
  try {
    return new RegExp(regexMatch[1], regexMatch[2]);
  } catch {
    return trimmed;
  }
}

function normalizeKeywordList(value: unknown): (string | RegExp)[] {
  const sourceList = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[\n,]/g) : [];
  const normalized: (string | RegExp)[] = [];
  const seen = new Set<string>();

  for (const item of sourceList) {
    const token = item instanceof RegExp ? item : parseKeywordToken(toStringSafe(item).trim());
    const tokenString = stringifyKeyword(token);
    if (!tokenString) {
      continue;
    }
    const dedupeKey = tokenString.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    normalized.push(token);
  }

  return normalized;
}

function parseKeywordsFromText(value: string): (string | RegExp)[] {
  return normalizeKeywordList(value.split(/[\n,]/g));
}

function normalizePresetRoleBindings(rawList: unknown): PresetRoleBinding[] {
  if (!Array.isArray(rawList)) {
    return [];
  }
  const normalized: PresetRoleBinding[] = [];
  const seen = new Set<string>();
  for (const item of rawList) {
    const record = asRecord(item);
    if (!record) {
      continue;
    }
    const key = toStringSafe(record.key).trim();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push({
      key,
      name: toStringSafe(record.name, key),
      avatar: toStringSafe(record.avatar),
      updated_at: toNumberSafe(record.updated_at, Date.now()),
    });
  }
  return normalized;
}

function getStrategyTypeLabel(type: StrategyType): string {
  if (type === 'constant') {
    return '🔵 常驻 (constant)';
  }
  if (type === 'vectorized') {
    return '📎 向量化 (vectorized)';
  }
  return '🟢 关键词 (selective)';
}

function getSecondaryLogicLabel(logic: SecondaryLogic): string {
  const map: Record<SecondaryLogic, string> = {
    and_any: '任一命中 (and_any)',
    and_all: '全部命中 (and_all)',
    not_all: '不全命中 (not_all)',
    not_any: '全部不命中 (not_any)',
  };
  return map[logic];
}

function getPositionTypeLabel(type: PositionType, role: RoleType = 'system'): string {
  return getPositionTypeLabelWithRole(type, role);
}

function getPositionTypeLabelWithRole(type: PositionType, role: RoleType): string {
  const map: Record<Exclude<PositionType, 'at_depth'>, string> = {
    before_character_definition: '角色定义之前',
    after_character_definition: '角色定义之后',
    before_example_messages: '示例消息前（↑EM）',
    after_example_messages: '示例消息后（↓EM）',
    before_author_note: '作者注释之前',
    after_author_note: '作者注释之后',
  };
  if (type !== 'at_depth') {
    return map[type];
  }
  if (role === 'assistant') {
    return '@D 🤖 [AI]在深度';
  }
  if (role === 'user') {
    return '@D 👤 [用户]在深度';
  }
  return '@D ⚙ [系统]在深度';
}

function parseAtDepthRoleFromPositionValue(value: unknown): RoleType | null {
  if (typeof value !== 'string') {
    return null;
  }
  const depthMatch = value.match(/^at_depth_as_(system|assistant|user)$/);
  if (!depthMatch) {
    return null;
  }
  return depthMatch[1] as RoleType;
}

function applySelectedPositionSelectValue(value: PositionSelectValue): void {
  if (!selectedEntry.value) {
    return;
  }
  const depthRole = parseAtDepthRoleFromPositionValue(value);
  if (depthRole) {
    selectedEntry.value.position.type = 'at_depth';
    selectedEntry.value.position.role = depthRole;
    selectedEntry.value.position.depth = Math.max(0, Math.floor(toNumberSafe(selectedEntry.value.position.depth, 4)));
    return;
  }
  selectedEntry.value.position.type = value as PositionType;
  selectedEntry.value.position.role = 'system';
  selectedEntry.value.position.depth = 4;
}

function getEntryPositionSelectValue(entry: WorldbookEntry): PositionSelectValue {
  if (entry.position.type === 'at_depth') {
    return `at_depth_as_${entry.position.role}` as PositionSelectValue;
  }
  return entry.position.type;
}

function setEntryPositionSelectValue(entry: WorldbookEntry, value: string | number | null): void {
  if (typeof value !== 'string') return;
  const option = positionSelectOptions.find(item => item.value === value);
  if (!option) return;
  entry.position.type = option.type;
  if (option.role) entry.position.role = option.role;
}

function getEntryVisualStatus(entry: WorldbookEntry): EntryVisualStatus {
  if (!entry.enabled) {
    return 'disabled';
  }
  if (entry.strategy.type === 'constant') {
    return 'constant';
  }
  if (entry.strategy.type === 'vectorized') {
    return 'vector';
  }
  return 'normal';
}

function getEntryStatusLabel(entry: WorldbookEntry): string {
  const status = getEntryVisualStatus(entry);
  if (status === 'disabled') {
    return '⚫ 禁用';
  }
  if (status === 'constant') {
    return '🔵 常驻';
  }
  if (status === 'vector') {
    return '📎 向量化';
  }
  return '🟢 关键词';
}

function getEntryKeyPreview(entry: WorldbookEntry): string {
  const rendered = entry.strategy.keys
    .slice(0, 3)
    .map(key => stringifyKeyword(key))
    .join(' / ');
  if (!rendered) {
    return '无关键词';
  }
  if (entry.strategy.keys.length > 3) {
    return `${rendered} ...`;
  }
  return rendered;
}

function normalizeSecondaryLogic(value: unknown): SecondaryLogic {
  if (typeof value === 'string' && secondaryLogicOptions.includes(value as SecondaryLogic)) {
    return value as SecondaryLogic;
  }
  if (typeof value === 'number') {
    const map: SecondaryLogic[] = ['and_any', 'and_all', 'not_all', 'not_any'];
    return map[value] ?? 'and_any';
  }
  return 'and_any';
}

function normalizeStrategyType(
  raw: Record<string, unknown>,
  strategyRecord: Record<string, unknown> | null,
): StrategyType {
  const directType = strategyRecord?.type;
  if (typeof directType === 'string' && strategyTypeOptions.includes(directType as StrategyType)) {
    return directType as StrategyType;
  }
  if (raw.constant) {
    return 'constant';
  }
  if (raw.vectorized) {
    return 'vectorized';
  }
  return 'selective';
}

function normalizePositionType(value: unknown): PositionType {
  if (typeof value === 'string') {
    if (positionTypeOptions.includes(value as PositionType)) {
      return value as PositionType;
    }
    if (parseAtDepthRoleFromPositionValue(value)) {
      return 'at_depth';
    }
  }
  if (typeof value === 'number') {
    const map: Record<number, PositionType> = {
      0: 'before_character_definition',
      1: 'after_character_definition',
      2: 'before_example_messages',
      3: 'after_example_messages',
      4: 'before_author_note',
      5: 'after_author_note',
      6: 'at_depth',
    };
    return map[value] ?? 'before_character_definition';
  }
  return 'before_character_definition';
}

function normalizeRole(value: unknown): RoleType {
  if (value === 'assistant' || value === 'user' || value === 'system') {
    return value;
  }
  if (typeof value === 'number') {
    const map: Record<number, RoleType> = {
      0: 'system',
      1: 'assistant',
      2: 'user',
    };
    return map[value] ?? 'system';
  }
  if (typeof value === 'string') {
    if (value.includes('assistant')) {
      return 'assistant';
    }
    if (value.includes('user')) {
      return 'user';
    }
  }
  return 'system';
}

function normalizeScanDepth(value: unknown): 'same_as_global' | number {
  if (value === 'same_as_global') {
    return 'same_as_global';
  }
  const numeric = Math.floor(toNumberSafe(value, NaN));
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }
  return 'same_as_global';
}

function createDefaultEntry(uid: number): WorldbookEntry {
  return {
    uid,
    name: `条目 ${uid}`,
    enabled: true,
    strategy: {
      type: 'selective',
      keys: [],
      keys_secondary: {
        logic: 'and_any',
        keys: [],
      },
      scan_depth: 'same_as_global',
    },
    position: {
      type: 'before_character_definition',
      role: 'system',
      depth: 4,
      order: 100,
    },
    content: '',
    probability: 100,
    recursion: {
      prevent_incoming: false,
      prevent_outgoing: false,
      delay_until: null,
    },
    effect: {
      sticky: null,
      cooldown: null,
      delay: null,
    },
  };
}

function collectExtraFields(raw: Record<string, unknown>): Record<string, unknown> | undefined {
  const known = new Set([
    'uid',
    'id',
    'name',
    'comment',
    'enabled',
    'disable',
    'strategy',
    'position',
    'content',
    'probability',
    'recursion',
    'effect',
    'extra',
    'keys',
    'key',
    'secondary_keys',
    'keysecondary',
    'filters',
    'logic',
    'selectiveLogic',
    'scan_depth',
    'constant',
    'vectorized',
    'selective',
    'insertion_order',
    'order',
    'role',
    'depth',
    'preventRecursion',
    'excludeRecursion',
    'delayUntilRecursion',
    'sticky',
    'cooldown',
    'delay',
    'useProbability',
  ]);

  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!known.has(key)) {
      extra[key] = value;
    }
  }
  if (Object.keys(extra).length === 0) {
    return undefined;
  }
  return extra;
}

function normalizeEntry(rawInput: unknown, fallbackUid: number): WorldbookEntry {
  const raw = asRecord(rawInput) ?? {};
  const base = createDefaultEntry(fallbackUid);
  const strategyRecord = asRecord(raw.strategy);
  const positionRecord = asRecord(raw.position);
  const recursionRecord = asRecord(raw.recursion);
  const effectRecord = asRecord(raw.effect);
  const secondaryRecord = asRecord(strategyRecord?.keys_secondary);

  const uid = Math.max(0, Math.floor(toNumberSafe(raw.uid ?? raw.id, fallbackUid)));
  const name = toStringSafe(raw.name ?? raw.comment, `条目 ${uid}`).trim() || `条目 ${uid}`;
  const strategyType = normalizeStrategyType(raw, strategyRecord);
  const keys = normalizeKeywordList(strategyRecord?.keys ?? raw.keys ?? raw.key);
  const secondaryKeys = normalizeKeywordList(
    secondaryRecord?.keys ?? raw.secondary_keys ?? raw.keysecondary ?? raw.filters,
  );
  const secondaryLogic = normalizeSecondaryLogic(secondaryRecord?.logic ?? raw.logic ?? raw.selectiveLogic);
  const rawPositionType = positionRecord?.type ?? raw.position;
  const inferredDepthRole = parseAtDepthRoleFromPositionValue(rawPositionType);
  const positionType = normalizePositionType(rawPositionType);
  const role = normalizeRole(positionRecord?.role ?? raw.role ?? inferredDepthRole);
  const depth = Math.max(0, Math.floor(toNumberSafe(positionRecord?.depth ?? raw.depth, 4)));
  const order = Math.floor(toNumberSafe(positionRecord?.order ?? raw.insertion_order ?? raw.order, 100));
  const probability = clampNumber(toNumberSafe(raw.probability, 100), 0, 100);

  const preventIncoming = recursionRecord?.prevent_incoming ?? raw.preventRecursion;
  const preventOutgoing = recursionRecord?.prevent_outgoing ?? raw.excludeRecursion;

  const entry: WorldbookEntry = {
    ...base,
    uid,
    name,
    enabled: raw.enabled === undefined ? raw.disable !== true : raw.enabled,
    strategy: {
      type: strategyType,
      keys,
      keys_secondary: {
        logic: secondaryLogic,
        keys: secondaryKeys,
      },
      scan_depth: normalizeScanDepth(strategyRecord?.scan_depth ?? raw.scan_depth),
    },
    position: {
      type: positionType,
      role: positionType === 'at_depth' ? role : 'system',
      depth: positionType === 'at_depth' ? depth : 4,
      order,
    },
    content: toStringSafe(raw.content),
    probability,
    recursion: {
      prevent_incoming: Boolean(preventIncoming),
      prevent_outgoing: Boolean(preventOutgoing),
      delay_until: parseNullableInteger(recursionRecord?.delay_until ?? raw.delayUntilRecursion),
    },
    effect: {
      sticky: parseNullableInteger(effectRecord?.sticky ?? raw.sticky),
      cooldown: parseNullableInteger(effectRecord?.cooldown ?? raw.cooldown),
      delay: parseNullableInteger(effectRecord?.delay ?? raw.delay),
    },
  };

  const directExtra = asRecord(raw.extra);
  if (directExtra && Object.keys(directExtra).length > 0) {
    entry.extra = klona(directExtra);
  } else {
    const extras = collectExtraFields(raw);
    if (extras) {
      entry.extra = klona(extras);
    }
  }

  return entry;
}

function normalizeEntryList(rawEntries: unknown[]): WorldbookEntry[] {
  const result: WorldbookEntry[] = [];
  const uidSet = new Set<number>();

  for (let index = 0; index < rawEntries.length; index += 1) {
    const rawRecord = asRecord(rawEntries[index]);
    let uid = Math.max(0, Math.floor(toNumberSafe(rawRecord?.uid ?? rawRecord?.id, index)));
    while (uidSet.has(uid)) {
      uid += 1;
    }
    uidSet.add(uid);
    result.push(normalizeEntry(rawEntries[index], uid));
  }

  return result;
}

function getNextUid(entries: WorldbookEntry[]): number {
  if (entries.length === 0) {
    return 0;
  }
  return Math.max(...entries.map(entry => entry.uid)) + 1;
}

function syncSelectedGlobalPresetFromState(state: PersistedState = persistedState.value): void {
  const presets = state.global_presets;
  const byId = new Set(presets.map(item => item.id));
  const preferredId = state.last_global_preset_id;
  if (preferredId && byId.has(preferredId)) {
    selectedGlobalPresetId.value = preferredId;
    return;
  }
  if (selectedGlobalPresetId.value && byId.has(selectedGlobalPresetId.value)) {
    return;
  }
  selectedGlobalPresetId.value = '';
}

function applyLayoutStateFromPersisted(): void {
  const layout = normalizeLayoutState(persistedState.value.layout);
  isFocusEditing.value = layout.focus_mode;
  mainPaneWidth.value = layout.normal_left_width;
  editorSideWidth.value = layout.normal_right_width;
  focusMainPaneWidth.value = layout.focus_left_width;
  focusEditorSideWidth.value = layout.focus_right_width;
}

function persistLayoutState(): void {
  updatePersistedState(state => {
    state.layout = {
      focus_mode: isFocusEditing.value,
      normal_left_width: mainPaneWidth.value,
      normal_right_width: editorSideWidth.value,
      focus_left_width: focusMainPaneWidth.value,
      focus_right_width: focusEditorSideWidth.value,
    };
  });
}

// ═══ Browse Mode Helpers ═══

function toggleBrowseCard(uid: number): void {
  const set = expandedBrowseCardUids.value;
  if (set.has(uid)) {
    set.delete(uid);
  } else {
    set.add(uid);
  }
}

function switchToEditorForEntry(uid: number): void {
  panelMode.value = 'editor';
  updatePersistedState(s => { s.panel_mode = 'editor'; });
  selectEntry(uid);
}

function switchPanelMode(mode: 'browse' | 'editor'): void {
  panelMode.value = mode;
  updatePersistedState(s => { s.panel_mode = mode; });
}

function browseToggleEnabled(entry: WorldbookEntry): void {
  entry.enabled = !entry.enabled;
}

function browseCycleStrategy(entry: WorldbookEntry): void {
  const order: StrategyType[] = ['constant', 'selective', 'vectorized'];
  const idx = order.indexOf(entry.strategy.type);
  entry.strategy.type = order[(idx + 1) % order.length];
}

function browseGetPositionLabel(entry: WorldbookEntry): string {
  const opt = positionSelectOptions.find(o => {
    if (o.type !== entry.position.type) return false;
    if (o.type === 'at_depth' && o.role && o.role !== entry.position.role) return false;
    return true;
  });
  return opt?.label ?? entry.position.type;
}

function browseGetStrategyLabel(entry: WorldbookEntry): string {
  switch (entry.strategy.type) {
    case 'constant': return '🔵 常驻';
    case 'selective': return '🟢 关键词';
    case 'vectorized': return '🔗 向量化';
    default: return entry.strategy.type;
  }
}

function browseGetContentPreview(entry: WorldbookEntry): string {
  return entry.content?.trim() || '(无内容)';
}

function applyPanelModeFromPersisted(): void {
  panelMode.value = persistedState.value.panel_mode || 'browse';
}

const browseVisibleEntries = computed(() => filteredEntries.value.slice(0, browseRenderLimit.value));
const browseHasMoreEntries = computed(() => browseRenderLimit.value < filteredEntries.value.length);

function browseLoadMore(): void {
  browseRenderLimit.value = Math.min(browseRenderLimit.value + BROWSE_RENDER_BATCH, filteredEntries.value.length);
}

watch(
  () => filteredEntries.value.length,
  () => { browseRenderLimit.value = BROWSE_RENDER_BATCH; },
);

function normalizeCrossCopyWorldbookSelection(): void {
  const names = worldbookNames.value;
  if (!names.length) {
    crossCopySourceWorldbook.value = '';
    crossCopyTargetWorldbook.value = '';
    return;
  }
  if (!crossCopySourceWorldbook.value || !names.includes(crossCopySourceWorldbook.value)) {
    crossCopySourceWorldbook.value = selectedWorldbookName.value && names.includes(selectedWorldbookName.value)
      ? selectedWorldbookName.value
      : names[0];
  }
  if (!crossCopyTargetWorldbook.value || !names.includes(crossCopyTargetWorldbook.value)) {
    const firstDifferent = names.find(name => name !== crossCopySourceWorldbook.value) ?? names[0];
    crossCopyTargetWorldbook.value = firstDifferent;
  }
}

// ── AI Chat: computed ──────────────────────────────────────────────
const aiSessions = computed(() => persistedState.value.ai_chat.sessions);

const aiActiveSession = computed((): AIChatSession | null => {
  const id = persistedState.value.ai_chat.activeSessionId;
  if (!id) return null;
  return aiSessions.value.find(s => s.id === id) ?? null;
});

const aiActiveMessages = computed((): AIChatMessage[] => aiActiveSession.value?.messages ?? []);

// ── AI Chat: CRUD ──────────────────────────────────────────────────
function aiCreateSession(): void {
  const id = createId('ai-chat');
  const session: AIChatSession = {
    id,
    title: `对话 ${aiSessions.value.length + 1}`,
    createdAt: Date.now(),
    messages: [],
  };
  updatePersistedState(state => {
    state.ai_chat.sessions.unshift(session);
    state.ai_chat.activeSessionId = id;
  });
  setStatus('已创建新对话');
}

function aiDeleteSession(id: string): void {
  updatePersistedState(state => {
    state.ai_chat.sessions = state.ai_chat.sessions.filter(s => s.id !== id);
    if (state.ai_chat.activeSessionId === id) {
      state.ai_chat.activeSessionId = state.ai_chat.sessions[0]?.id ?? null;
    }
  });
  setStatus('已删除对话');
}

function aiSwitchSession(id: string): void {
  updatePersistedState(state => {
    state.ai_chat.activeSessionId = id;
  });
}

function aiRenameSession(id: string, title: string): void {
  updatePersistedState(state => {
    const session = state.ai_chat.sessions.find(s => s.id === id);
    if (session) {
      session.title = title.trim() || session.title;
    }
  });
}

function aiAddMessage(role: 'user' | 'assistant', content: string): void {
  const sessionId = persistedState.value.ai_chat.activeSessionId;
  if (!sessionId) return;
  updatePersistedState(state => {
    const session = state.ai_chat.sessions.find(s => s.id === sessionId);
    if (session) {
      session.messages.push({ role, content, timestamp: Date.now() });
      if (session.messages.length > AI_CHAT_MESSAGE_LIMIT) {
        session.messages = session.messages.slice(-AI_CHAT_MESSAGE_LIMIT);
      }
    }
  });
}

// ── AI: API config helpers ──────────────────────────────────────────
function updateApiConfig(partial: Partial<AIApiConfig>): void {
  updatePersistedState(state => {
    Object.assign(state.ai_api_config, partial);
  });
}

async function loadModelList(): Promise<void> {
  const cfg = persistedState.value.ai_api_config;
  if (!cfg.apiurl) {
    toastr.warning('请先填写 API 基础 URL');
    return;
  }
  apiModelLoading.value = true;
  try {
    let models: string[];

    // Try TavernHelper's built-in getModelList first; fall back to direct fetch
    if (typeof getModelList === 'function') {
      models = await getModelList({ apiurl: cfg.apiurl, key: cfg.key || undefined });
    } else {
      // Fallback: direct fetch to OpenAI-compatible /v1/models
      let baseUrl = cfg.apiurl.replace(/\/+$/, '');
      if (!baseUrl.endsWith('/v1')) {
        baseUrl += '/v1';
      }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (cfg.key) {
        headers['Authorization'] = `Bearer ${cfg.key}`;
      }
      const resp = await fetch(`${baseUrl}/models`, { method: 'GET', headers });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }
      const json = await resp.json();
      models = (json.data || []).map((m: any) => m.id as string).filter(Boolean).sort();
    }

    apiModelList.value = models;
    if (models.length === 0) {
      toastr.info('未获取到模型列表');
    } else {
      toastr.success(`加载到 ${models.length} 个模型`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    toastr.error(`加载模型列表失败: ${msg}`);
    apiModelList.value = [];
  } finally {
    apiModelLoading.value = false;
  }
}

function buildCustomApiForGenerate(): { custom_api?: CustomApiConfig } {
  const cfg = persistedState.value.ai_api_config;
  if (cfg.mode === 'tavern' || cfg.use_main_api) {
    return {};
  }
  return {
    custom_api: {
      apiurl: cfg.apiurl,
      key: cfg.key || undefined,
      model: cfg.model,
      source: 'openai',
      max_tokens: cfg.max_tokens || undefined,
      temperature: cfg.temperature,
    },
  };
}

// ── AI: Worldbook Config ────────────────────────────────────────────
const POSITION_TYPE_LABELS: Record<string, string> = {
  before_character_definition: '角色定义之前',
  after_character_definition: '角色定义之后',
  before_example_messages: '示例消息前（↑EM）',
  after_example_messages: '示例消息后（↓EM）',
  before_author_note: '作者注释之前',
  after_author_note: '作者注释之后',
  at_depth: '@D 在深度',
};

const STRATEGY_TYPE_LABELS: Record<string, string> = {
  constant: '蓝灯（常驻）',
  selective: '绿灯（关键词）',
  vectorized: '向量化',
};

async function loadDefaultConfigPrompt(): Promise<void> {
  const targetName = aiConfigTargetWorldbook.value;
  if (!targetName) {
    toastr.warning('请先选择目标世界书');
    return;
  }
  try {
    const entries = await getWorldbook(targetName);
    aiConfigCustomPrompt.value = buildConfigSystemPrompt(entries, aiConfigCustomPrompt.value, true);
  } catch (e) {
    toastr.error('加载失败');
  }
}


async function aiConfigGenerate(): Promise<void> {
  const input = aiConfigInput.value.trim();
  const targetName = aiConfigTargetWorldbook.value;
  if (!input || !targetName) {
    toastr.warning('请先选择目标世界书并输入配置指令');
    return;
  }
  aiConfigGenerating.value = true;
  try {
    const existingEntries = await getWorldbook(targetName);

    const systemPrompt = buildConfigSystemPrompt(existingEntries, aiConfigCustomPrompt.value);

    const result = await generateRaw({
      user_input: input,
      should_silence: true,
      ordered_prompts: [
        { role: 'system', content: systemPrompt },
        'user_input',
      ],
      ...buildCustomApiForGenerate(),
    });

    const extracted = extractJsonArray(result);
    if (!extracted.ok) {
      console.error('[AI Config] No JSON found in response:\n', result);
      toastr.error(`① AI 未返回有效 JSON。AI 响应长度: ${result.length} 字符。请检查 API 设置或重试`);
      return;
    }
    const jsonStr = extracted.json;
    let configs: any[];
    try {
      configs = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('[AI Config] JSON parse error:', parseErr, '\nCleaned JSON:', jsonStr, '\nFull response:\n', result);
      toastr.error(`② JSON 格式错误: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}\n请在控制台(F12)查看 [AI Config] 了解详情`);
      return;
    }
    if (!Array.isArray(configs) || configs.length === 0) {
      toastr.info('AI 返回的配置与当前一致，无需变更（AI 可能未理解指令，可尝试更明确的描述）');
      return;
    }

    // Build ConfigChange[] by diffing against existing entries
    const changes: ConfigChange[] = [];

    for (const cfg of configs) {
      const name = cfg.name;
      if (!name) continue;
      const matchedEntries = existingEntries.filter(e => e.name === name);
      if (matchedEntries.length === 0) {
        toastr.warning(`条目 "${name}" 在世界书中不存在，已跳过`);
        continue;
      }
      // Use first matched entry for diff comparison (all same-name entries share config)
      const entry = matchedEntries[0];

      // Check each settable field
      if (cfg.strategy_type !== undefined && cfg.strategy_type !== entry.strategy.type) {
        const oldLabel = STRATEGY_TYPE_LABELS[entry.strategy.type] || entry.strategy.type;
        const newLabel = STRATEGY_TYPE_LABELS[cfg.strategy_type] || cfg.strategy_type;
        changes.push({ name, field: 'strategy_type', label: '激活策略', oldValue: oldLabel, newValue: newLabel, selected: true, apply: e => { e.strategy.type = cfg.strategy_type; } });
      }

      if (cfg.keys !== undefined) {
        const oldKeys = entry.strategy.keys.map(k => String(k)).join(', ') || '（无）';
        const newKeys = cfg.keys.join(', ') || '（无）';
        if (oldKeys !== newKeys) {
          changes.push({ name, field: 'keys', label: '主要关键词', oldValue: oldKeys, newValue: newKeys, selected: true, apply: e => { e.strategy.keys = cfg.keys; } });
        }
      }

      if (cfg.keys_secondary !== undefined) {
        const oldSecKeys = entry.strategy.keys_secondary.keys.map(k => String(k)).join(', ') || '（无）';
        const newSecKeys = cfg.keys_secondary.join(', ') || '（无）';
        if (oldSecKeys !== newSecKeys) {
          changes.push({ name, field: 'keys_secondary', label: '次要关键词', oldValue: oldSecKeys, newValue: newSecKeys, selected: true, apply: e => { e.strategy.keys_secondary.keys = cfg.keys_secondary; } });
        }
      }

      if (cfg.keys_secondary_logic !== undefined && cfg.keys_secondary_logic !== entry.strategy.keys_secondary.logic) {
        changes.push({ name, field: 'keys_secondary_logic', label: '次要关键词逻辑', oldValue: entry.strategy.keys_secondary.logic, newValue: cfg.keys_secondary_logic, selected: true, apply: e => { e.strategy.keys_secondary.logic = cfg.keys_secondary_logic; } });
      }

      if (cfg.scan_depth !== undefined) {
        const oldSd = String(entry.strategy.scan_depth);
        const newSd = String(cfg.scan_depth);
        if (oldSd !== newSd) {
          changes.push({ name, field: 'scan_depth', label: '扫描深度', oldValue: oldSd, newValue: newSd, selected: true, apply: e => { e.strategy.scan_depth = cfg.scan_depth === 'same_as_global' ? 'same_as_global' : Number(cfg.scan_depth); } });
        }
      }

      if (cfg.position_type !== undefined && cfg.position_type !== entry.position.type) {
        const oldLabel = POSITION_TYPE_LABELS[entry.position.type] || entry.position.type;
        const newLabel = POSITION_TYPE_LABELS[cfg.position_type] || cfg.position_type;
        changes.push({ name, field: 'position_type', label: '插入位置', oldValue: oldLabel, newValue: newLabel, selected: true, apply: e => { e.position.type = cfg.position_type; } });
      }

      if (cfg.position_order !== undefined && cfg.position_order !== entry.position.order) {
        changes.push({ name, field: 'position_order', label: '顺序', oldValue: String(entry.position.order), newValue: String(cfg.position_order), selected: true, apply: e => { e.position.order = cfg.position_order; } });
      }

      if (cfg.position_depth !== undefined && cfg.position_depth !== entry.position.depth) {
        changes.push({ name, field: 'position_depth', label: '深度', oldValue: String(entry.position.depth), newValue: String(cfg.position_depth), selected: true, apply: e => { e.position.depth = cfg.position_depth; } });
      }

      if (cfg.position_role !== undefined && cfg.position_role !== entry.position.role) {
        changes.push({ name, field: 'position_role', label: '角色', oldValue: entry.position.role, newValue: cfg.position_role, selected: true, apply: e => { e.position.role = cfg.position_role; } });
      }

      if (cfg.prevent_incoming !== undefined && cfg.prevent_incoming !== entry.recursion.prevent_incoming) {
        changes.push({ name, field: 'prevent_incoming', label: '不可递归', oldValue: entry.recursion.prevent_incoming ? '是' : '否', newValue: cfg.prevent_incoming ? '是' : '否', selected: true, apply: e => { e.recursion.prevent_incoming = cfg.prevent_incoming; } });
      }

      if (cfg.prevent_outgoing !== undefined && cfg.prevent_outgoing !== entry.recursion.prevent_outgoing) {
        changes.push({ name, field: 'prevent_outgoing', label: '防止进一步递归', oldValue: entry.recursion.prevent_outgoing ? '是' : '否', newValue: cfg.prevent_outgoing ? '是' : '否', selected: true, apply: e => { e.recursion.prevent_outgoing = cfg.prevent_outgoing; } });
      }

      if (cfg.new_name !== undefined && cfg.new_name !== entry.name) {
        changes.push({ name, field: 'new_name', label: '条目名称', oldValue: entry.name, newValue: cfg.new_name, selected: true, apply: e => { e.name = cfg.new_name; } });
      }

      if (cfg.enabled !== undefined && cfg.enabled !== entry.enabled) {
        changes.push({ name, field: 'enabled', label: '启用', oldValue: entry.enabled ? '是' : '否', newValue: cfg.enabled ? '是' : '否', selected: true, apply: e => { e.enabled = cfg.enabled; } });
      }

      if (cfg.probability !== undefined && cfg.probability !== entry.probability) {
        changes.push({ name, field: 'probability', label: '激活概率%', oldValue: String(entry.probability), newValue: String(cfg.probability), selected: true, apply: e => { e.probability = cfg.probability; } });
      }

      if (cfg.sticky !== undefined && cfg.sticky !== entry.effect.sticky) {
        changes.push({ name, field: 'sticky', label: '黏性', oldValue: String(entry.effect.sticky ?? '无'), newValue: String(cfg.sticky ?? '无'), selected: true, apply: e => { e.effect.sticky = cfg.sticky; } });
      }

      if (cfg.cooldown !== undefined && cfg.cooldown !== entry.effect.cooldown) {
        changes.push({ name, field: 'cooldown', label: '冷却', oldValue: String(entry.effect.cooldown ?? '无'), newValue: String(cfg.cooldown ?? '无'), selected: true, apply: e => { e.effect.cooldown = cfg.cooldown; } });
      }
    }

    if (changes.length === 0) {
      toastr.info('③ 解析完成但无实际变更 — AI 返回的配置与当前完全一致');
      return;
    }

    aiConfigChanges.value = changes;
    aiConfigPreview.value = true;
    toastr.success(`解析到 ${changes.length} 项变更`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[AI Config] Generation failed:', error);
    toastr.error(`AI 生成失败: ${msg}`);
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed')) {
      toastr.warning('可能是网络问题或 API 配置有误，请检查 ⚙️ API 设置');
    }
  } finally {
    aiConfigGenerating.value = false;
  }
}

async function aiConfigApply(): Promise<void> {
  const targetName = aiConfigTargetWorldbook.value;
  const selected = aiConfigChanges.value.filter(c => c.selected);
  if (!targetName || selected.length === 0) return;

  try {
    await updateWorldbookWith(targetName, entries => {
      for (const change of selected) {
        // Apply to ALL entries with matching name (handles duplicates)
        const matched = entries.filter(e => e.name === change.name);
        for (const entry of matched) {
          change.apply(entry);
        }
      }
      return entries;
    });
    aiConfigPreview.value = false;
    aiConfigChanges.value = [];
    toastr.success(`已应用 ${selected.length} 项配置变更`);
    await loadWorldbook(targetName);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    toastr.error(`应用配置失败: ${msg}`);
  }
}

// ── AI Chat: generate ──────────────────────────────────────────────
let aiStreamSubscription: { stop: () => void } | null = null;

async function aiSendMessage(): Promise<void> {
  const text = aiChatInputText.value.trim();
  if (!text || aiIsGenerating.value) return;

  const sessionId = persistedState.value.ai_chat.activeSessionId;
  if (!sessionId) {
    aiCreateSession();
  }

  aiChatInputText.value = '';
  aiAddMessage('user', text);

  const session = persistedState.value.ai_chat.sessions.find(
    s => s.id === persistedState.value.ai_chat.activeSessionId
  );
  if (!session) return;

  // Build prompts from session history (excluding the user message we just added since generate will use user_input)
  const historyPrompts: RolePrompt[] = session.messages.slice(0, -1).map(m => ({
    role: m.role,
    content: m.content,
  }));

  const generationId = createId('ai-gen');
  aiCurrentGenerationId.value = generationId;
  aiIsGenerating.value = true;
  aiStreamingText.value = '';

  // Subscribe to streaming events
  aiStreamSubscription = eventOn(
    iframe_events.STREAM_TOKEN_RECEIVED_FULLY,
    (fullText: string, genId: string) => {
      if (genId === generationId) {
        aiStreamingText.value = fullText;
      }
    }
  );

  try {
    const generateConfig: Parameters<typeof generate>[0] = {
      generation_id: generationId,
      user_input: text,
      should_stream: true,
      should_silence: true,
      ...buildCustomApiForGenerate(),
    };

    if (!aiUseContext.value) {
      // 纯净模式: 覆盖 chat_history, 不使用酒馆上下文
      generateConfig.overrides = {
        chat_history: { prompts: historyPrompts },
      };
    }
    // 附带上下文模式: 不设置 chat_history, 让酒馆构建完整 prompt (预设+世界书+正则)

    const result = await generate(generateConfig);

    aiAddMessage('assistant', result);
    aiStreamingText.value = '';

    // Auto-extract tags
    const ignoreSet = new Set(persistedState.value.extract_ignore_tags.map(t => t.toLowerCase()));
    const tags = extractAiTags(result, ignoreSet);
    if (tags.length > 0) {
      aiExtractedTags.value = tags;
      aiShowTagReview.value = true;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toastr.error(`AI 生成失败: ${message}`);
    setStatus(`AI 生成失败: ${message}`);
  } finally {
    aiIsGenerating.value = false;
    aiCurrentGenerationId.value = null;
    aiStreamSubscription?.stop();
    aiStreamSubscription = null;
  }
}

function aiStopGeneration(): void {
  if (aiCurrentGenerationId.value) {
    stopGenerationById(aiCurrentGenerationId.value);
  }
}

// ── AI Chat: tag extraction ────────────────────────────────────────
function updateIgnoreTags(raw: string): void {
  const tags = raw
    .split(/[,\n]+/)
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);
  const unique = [...new Set(tags)];
  updatePersistedState(state => {
    state.extract_ignore_tags = unique;
  });
}

function resetIgnoreTags(): void {
  updatePersistedState(state => {
    state.extract_ignore_tags = ['think', 'thinking', 'recap', 'content', 'details', 'summary'];
  });
}

async function markDuplicatesInTags(): Promise<void> {
  const targetName = aiTargetWorldbook.value;
  if (!targetName || aiExtractedTags.value.length === 0) {
    aiExtractedTags.value = aiExtractedTags.value.map(tag => ({ ...tag, duplicate: false, updated: false }));
    return;
  }
  try {
    const existing = await getWorldbook(targetName);
    aiExtractedTags.value = markExtractedTagDuplicates(aiExtractedTags.value, existing);
  } catch {
    aiExtractedTags.value = aiExtractedTags.value.map(tag => ({ ...tag, duplicate: false, updated: false }));
  }
}

async function extractFromChat(): Promise<void> {
  try {
    const lastId = getLastMessageId();
    if (lastId < 0) {
      toastr.warning('当前没有聊天记录');
      return;
    }
    const messages = getChatMessages(`0-${lastId}`);
    const ignoreSet = new Set(persistedState.value.extract_ignore_tags.map(t => t.toLowerCase()));
    const allTags: ExtractedTag[] = [];
    for (const msg of messages) {
      const tags = extractAiTags(msg.message || '', ignoreSet);
      allTags.push(...tags);
    }

    if (allTags.length === 0) {
      toastr.info('聊天记录中未找到 <tag>content</tag> 格式的条目');
      return;
    }

    const deduped = dedupeExtractedTags(allTags);

    aiExtractedTags.value = deduped;
    aiTargetWorldbook.value = selectedWorldbookName.value || '';
    aiShowTagReview.value = true;
    await markDuplicatesInTags();
    toastr.success(`从聊天记录中提取到 ${deduped.length} 个条目`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toastr.error(`提取失败: ${message}`);
  }
}

async function aiCreateSelectedEntries(): Promise<void> {
  const selected = aiExtractedTags.value.filter(t => t.selected);
  if (selected.length === 0) {
    toastr.warning('请至少勾选一个条目');
    return;
  }

  const targetName = aiTargetWorldbook.value;
  if (!targetName) {
    toastr.warning('请选择目标世界书');
    return;
  }

  try {
    const newEntries = selected.map(t => ({
      name: t.tag,
      content: t.content,
    }));

    await createWorldbookEntries(targetName, newEntries);
    toastr.success(`已创建 ${selected.length} 个条目到 "${targetName}"`);
    setStatus(`已创建 ${selected.length} 个条目到 "${targetName}"`);
    aiShowTagReview.value = false;
    aiExtractedTags.value = [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toastr.error(`创建条目失败: ${message}`);
  }
}

function aiToggleMode(): void {
  if (isAnyCineLocked.value) {
    return;
  }
  aiGeneratorMode.value = !aiGeneratorMode.value;
  if (aiGeneratorMode.value) {
    globalWorldbookMode.value = false;
    tagEditorMode.value = false;
    crossCopyMode.value = false;
  }
}

function tagToggleMode(): void {
  if (isAnyCineLocked.value) {
    return;
  }
  tagEditorMode.value = !tagEditorMode.value;
  if (tagEditorMode.value) {
    aiGeneratorMode.value = false;
    globalWorldbookMode.value = false;
    crossCopyMode.value = false;
  }
}

function ensureTagAssignTargetSelected(): void {
  if (tagAssignTargetId.value && tagDefinitionMap.value.has(tagAssignTargetId.value)) {
    return;
  }
  tagAssignTargetId.value = tagAssignOptions.value[0]?.id ?? '';
}

function tagSetParent(tagId: string, parentId: string | null): void {
  const normalizedParent = parentId && tagDefinitionMap.value.has(parentId) ? parentId : null;
  const current = tagDefinitionMap.value.get(tagId);
  if (!current) {
    return;
  }
  if (normalizedParent === tagId || (normalizedParent && isTagDescendantOf(tagDefinitionMap.value, normalizedParent, tagId))) {
    toastr.warning('不能将标签移动到自己或其子节点下');
    return;
  }
  const siblingExists = tagDefinitions.value.some(def => {
    if (def.id === tagId) {
      return false;
    }
    const parentSame = (def.parent_id ?? null) === normalizedParent;
    return parentSame && normalizeTagNameKey(def.name) === normalizeTagNameKey(current.name);
  });
  if (siblingExists) {
    toastr.warning('同一父节点下已存在同名标签');
    return;
  }
  updatePersistedState(state => {
    const defs = state.worldbook_tags.definitions;
    const target = defs.find(def => def.id === tagId);
    if (!target) {
      return;
    }
    target.parent_id = normalizedParent;
    const siblingSorts = defs
      .filter(def => def.id !== tagId && (def.parent_id ?? null) === normalizedParent)
      .map(def => Math.max(0, Math.floor(toNumberSafe(def.sort, 0))));
    const nextSort = siblingSorts.length ? Math.max(...siblingSorts) + 1 : 0;
    target.sort = nextSort;
  });
}

function isTagParentOptionDisabled(tagId: string, parentId: string): boolean {
  if (!parentId) {
    return false;
  }
  if (parentId === tagId) {
    return true;
  }
  return isTagDescendantOf(tagDefinitionMap.value, parentId, tagId);
}

function getTagDisabledParentIds(tagId: string): Set<string> {
  return new Set(tagAssignOptions.value.filter(option => isTagParentOptionDisabled(tagId, option.id)).map(option => option.id));
}

function getTagDefinitionName(tagId: string): string {
  return tagDefinitionMap.value.get(tagId)?.name ?? '';
}

function getTagDefinitionParentId(tagId: string): string | null {
  return tagDefinitionMap.value.get(tagId)?.parent_id ?? null;
}

function setTagDeleteParentMode(modeRaw: string): void {
  const mode: TagDeleteParentMode = modeRaw === 'cascade' ? 'cascade' : 'promote';
  updatePersistedState(state => {
    state.tag_editor.delete_parent_mode = mode;
  });
}

function tagCreate(): void {
  const name = tagNewName.value.trim();
  if (!name) return;
  const parentId = tagNewParentId.value && tagDefinitionMap.value.has(tagNewParentId.value) ? tagNewParentId.value : null;
  const currentDefs = persistedState.value.worldbook_tags.definitions;
  if (currentDefs.length >= TAG_LIMIT) {
    const message = `标签数量已达上限（${TAG_LIMIT}）`;
    toastr.warning(message);
    setStatus(message);
    return;
  }
  const siblingDup = currentDefs.some(def => {
    const sameParent = (def.parent_id ?? null) === parentId;
    return sameParent && normalizeTagNameKey(def.name) === normalizeTagNameKey(name);
  });
  if (siblingDup) {
    const message = '同一父节点下已存在同名标签';
    toastr.warning(message);
    setStatus(message);
    return;
  }
  let created = false;
  updatePersistedState(state => {
    const colorIndex = state.worldbook_tags.definitions.length % TAG_COLORS.length;
    const siblingSorts = state.worldbook_tags.definitions
      .filter(def => (def.parent_id ?? null) === parentId)
      .map(def => Math.max(0, Math.floor(toNumberSafe(def.sort, 0))));
    const nextSort = siblingSorts.length ? Math.max(...siblingSorts) + 1 : 0;
    state.worldbook_tags.definitions.push({
      id: createId('wbtag'),
      name,
      color: TAG_COLORS[colorIndex],
      parent_id: parentId,
      sort: nextSort,
    });
    created = true;
  });
  if (!created) {
    const message = '创建标签失败，请重试';
    toastr.warning(message);
    setStatus(message);
    return;
  }
  tagNewName.value = '';
  ensureTagAssignTargetSelected();
  setStatus(`已创建标签：${name}`);
}

function tagDelete(tagId: string): void {
  const target = tagDefinitionMap.value.get(tagId);
  if (!target) {
    return;
  }
  const hasChildren = (tagChildrenMap.value.get(tagId) ?? []).length > 0;
  const cascadeDelete = hasChildren && persistedState.value.tag_editor.delete_parent_mode === 'cascade';
  const deleteIds = cascadeDelete ? collectTagSubtreeIds(tagId, tagChildrenMap.value) : [tagId];
  const deleteSet = new Set(deleteIds);
  updatePersistedState(state => {
    if (!cascadeDelete) {
      const parent = state.worldbook_tags.definitions.find(def => def.id === tagId)?.parent_id ?? null;
      for (const def of state.worldbook_tags.definitions) {
        if (def.parent_id === tagId) {
          def.parent_id = parent;
        }
      }
    }
    state.worldbook_tags.definitions = state.worldbook_tags.definitions.filter(def => !deleteSet.has(def.id));
    for (const key of Object.keys(state.worldbook_tags.assignments)) {
      const remained = (state.worldbook_tags.assignments[key] ?? []).filter(id => !deleteSet.has(id));
      if (remained.length) {
        state.worldbook_tags.assignments[key] = remained;
      } else {
        delete state.worldbook_tags.assignments[key];
      }
    }
    state.tag_filter.selected_ids = (state.tag_filter.selected_ids ?? []).filter(id => !deleteSet.has(id));
  });
  if (tagAssignTargetId.value && deleteSet.has(tagAssignTargetId.value)) {
    tagAssignTargetId.value = '';
    ensureTagAssignTargetSelected();
  }
}

function tagRename(tagId: string, newName: string): void {
  const trimmed = newName.trim();
  if (!trimmed) return;
  const target = tagDefinitionMap.value.get(tagId);
  if (!target) {
    return;
  }
  const hasConflict = tagDefinitions.value.some(def => {
    if (def.id === tagId) {
      return false;
    }
    return (def.parent_id ?? null) === (target.parent_id ?? null) && normalizeTagNameKey(def.name) === normalizeTagNameKey(trimmed);
  });
  if (hasConflict) {
    toastr.warning('同一父节点下已存在同名标签');
    return;
  }
  updatePersistedState(state => {
    const def = state.worldbook_tags.definitions.find(d => d.id === tagId);
    if (def) def.name = trimmed;
  });
}

function tagSetColor(tagId: string, color: string): void {
  updatePersistedState(state => {
    const def = state.worldbook_tags.definitions.find(d => d.id === tagId);
    if (def) def.color = color;
  });
}

function tagToggleAssignment(worldbookName: string, tagId: string): void {
  updatePersistedState(state => {
    const current = state.worldbook_tags.assignments[worldbookName] ?? [];
    if (current.includes(tagId)) {
      state.worldbook_tags.assignments[worldbookName] = current.filter(id => id !== tagId);
      if (!state.worldbook_tags.assignments[worldbookName].length) {
        delete state.worldbook_tags.assignments[worldbookName];
      }
    } else {
      state.worldbook_tags.assignments[worldbookName] = [...current, tagId];
    }
  });
}

function tagToggleAssignmentForSelectedTag(worldbookName: string): void {
  const tagId = tagAssignTargetId.value;
  if (!tagId) {
    return;
  }
  tagToggleAssignment(worldbookName, tagId);
}

function tagResetAll(): void {
  if (!confirm('确定要清除所有标签和分配吗？')) return;
  updatePersistedState(state => {
    state.worldbook_tags = { definitions: [], assignments: {} };
    state.tag_filter = createDefaultTagFilterState();
  });
  tagAssignTargetId.value = '';
  tagNewParentId.value = '';
}

function setStatus(message: string): void {
  statusMessage.value = message;
}

function getCrossCopyReservedNameKeys(excludeRowId = ''): Set<string> {
  const occupied = new Set(crossCopyTargetBaselineEntries.value.map(entry => normalizeCrossCopyNameKey(entry.name)));
  for (const row of crossCopyRows.value) {
    if (row.id === excludeRowId || row.action !== 'rename_create') {
      continue;
    }
    const key = normalizeCrossCopyNameKey(row.rename_name);
    if (key) {
      occupied.add(key);
    }
  }
  return occupied;
}

function ensureCrossCopyRenameForRow(row: CrossCopyRow): void {
  if (row.action !== 'rename_create') {
    return;
  }
  const occupied = getCrossCopyReservedNameKeys(row.id);
  const typed = toStringSafe(row.rename_name).trim();
  if (!typed) {
    row.rename_name = generateCrossCopyUniqueName(row.source_entry.name, occupied);
    return;
  }
  const typedKey = normalizeCrossCopyNameKey(typed);
  if (occupied.has(typedKey)) {
    row.rename_name = generateCrossCopyUniqueName(typed, occupied);
    return;
  }
  row.rename_name = typed;
}


function toggleCrossCopyWorkspaceTools(): void {
  if (isAnyCineLocked.value) {
    return;
  }
  crossCopyWorkspaceToolsExpanded.value = !crossCopyWorkspaceToolsExpanded.value;
}

function toggleCrossCopyControlsCollapsed(): void {
  crossCopyControlsCollapsed.value = !crossCopyControlsCollapsed.value;
}

function setCrossCopyModeActive(next: boolean): void {
  if (!next) {
    closeCrossCopyDiff();
    stopCrossCopyPaneResize();
    resetCrossCopyMobileStep();
  }
  crossCopyMode.value = next;
  if (next) {
    crossCopyWorkspaceToolsExpanded.value = true;
    aiGeneratorMode.value = false;
    tagEditorMode.value = false;
    globalWorldbookMode.value = false;
    resetCrossCopyMobileStep();
    closeFocusWorldbookMenu();
    closeFocusToolsBand();
    normalizeCrossCopyWorldbookSelection();
    persistCrossCopyState();
    return;
  }
  closeFocusWorldbookMenu();
  closeFocusToolsBand();
}

function toggleCrossCopyMode(): void {
  if (isAnyCineLocked.value) {
    return;
  }
  const nextCrossCopy = !crossCopyMode.value;
  if (!copyCineEnabled.value) {
    setCrossCopyModeActive(nextCrossCopy);
    return;
  }
  void runCrossCopyCinematicTransition(nextCrossCopy);
}

function resetCrossCopyCompare(reason = ''): void {
  closeCrossCopyDiff();
  crossCopyRows.value = [];
  crossCopySourceBaselineEntries.value = [];
  crossCopyTargetBaselineEntries.value = [];
  crossCopyCompareSummary.value = '';
  crossCopyLastComparedAt.value = 0;
  if (reason) {
    crossCopyLastResultSummary.value = reason;
  }
}

function buildCrossCopyRows(
  sourceEntries: WorldbookEntry[],
  targetEntries: WorldbookEntry[],
  sameSourceTarget: boolean,
): CrossCopyRow[] {
  const byName = new Map<string, WorldbookEntry[]>();
  const byContent = new Map<string, WorldbookEntry[]>();
  for (const entry of targetEntries) {
    const nameKey = normalizeCrossCopyNameKey(entry.name);
    const contentKey = normalizeCrossCopyContentKey(entry.content);
    const nameBucket = byName.get(nameKey) ?? [];
    nameBucket.push(entry);
    byName.set(nameKey, nameBucket);
    const contentBucket = byContent.get(contentKey) ?? [];
    contentBucket.push(entry);
    byContent.set(contentKey, contentBucket);
  }

  const initialRows = sourceEntries.map((sourceEntry, sourceIndex) => {
    const sourceNameKey = normalizeCrossCopyNameKey(sourceEntry.name);
    const sourceContentKey = normalizeCrossCopyContentKey(sourceEntry.content);
    const sameNameMatches = byName.get(sourceNameKey) ?? [];
    const sameNameExactCount = sameNameMatches.filter(entry => normalizeCrossCopyContentKey(entry.content) === sourceContentKey).length;
    const contentDuplicateOtherNameMatches = (byContent.get(sourceContentKey) ?? []).filter(entry => {
      return normalizeCrossCopyNameKey(entry.name) !== sourceNameKey;
    });

    let status: CrossCopyRowStatus;
    if (sameSourceTarget) {
      status = 'invalid_same_source_target';
    } else if (sameNameMatches.length) {
      status = sameNameExactCount === sameNameMatches.length ? 'duplicate_exact' : 'same_name_changed';
    } else if (contentDuplicateOtherNameMatches.length) {
      status = 'content_duplicate_other_name';
    } else {
      status = 'new';
    }

    let note = '';
    if (sameNameMatches.length > 1) {
      note = `目标同名命中 ${sameNameMatches.length} 条，覆盖会全部替换`;
    } else if (contentDuplicateOtherNameMatches.length) {
      note = `检测到 ${contentDuplicateOtherNameMatches.length} 条异名同内容条目`;
    }

    let action: CrossCopyAction = 'create';
    if (status === 'duplicate_exact' || status === 'content_duplicate_other_name' || status === 'invalid_same_source_target') {
      action = 'skip';
    } else if (status === 'same_name_changed') {
      action = 'overwrite';
    }

    return {
      id: createId('cross-copy-row'),
      source_entry: normalizeEntry(klona(sourceEntry), sourceEntry.uid),
      source_index: sourceIndex,
      source_name_key: sourceNameKey,
      source_content_key: sourceContentKey,
      status,
      selected: false,
      action,
      rename_name: '',
      note,
      details_open: false,
      target_summary: {
        same_name_matches: sameNameMatches.map(item => normalizeEntry(klona(item), item.uid)),
        same_name_exact_count: sameNameExactCount,
        content_duplicate_other_name_matches: contentDuplicateOtherNameMatches.map(item => normalizeEntry(klona(item), item.uid)),
      },
    } satisfies CrossCopyRow;
  });

  const occupied = new Set(targetEntries.map(entry => normalizeCrossCopyNameKey(entry.name)));
  for (const row of initialRows) {
    row.rename_name = generateCrossCopyUniqueName(row.source_entry.name, occupied);
    occupied.add(normalizeCrossCopyNameKey(row.rename_name));
  }
  return initialRows;
}

function buildCrossCopyCompareSummary(rows: CrossCopyRow[], sourceCount: number, targetCount: number): string {
  const counts = {
    new: 0,
    duplicate_exact: 0,
    same_name_changed: 0,
    content_duplicate_other_name: 0,
    invalid_same_source_target: 0,
  };
  for (const row of rows) {
    counts[row.status] += 1;
  }
  return [
    `来源 ${sourceCount} 条`,
    `目标 ${targetCount} 条`,
    `新增 ${counts.new}`,
    `同名更新 ${counts.same_name_changed}`,
    `同名同内容 ${counts.duplicate_exact}`,
    `异名同内容 ${counts.content_duplicate_other_name}`,
  ].join(' | ');
}

async function readCrossCopySourceEntries(sourceName: string): Promise<WorldbookEntry[]> {
  if (sourceName && sourceName === selectedWorldbookName.value && crossCopyUseDraftSourceWhenCurrent.value) {
    return normalizeEntryList(draftEntries.value.map(entry => klona(entry)));
  }
  const raw = await getWorldbook(sourceName);
  return normalizeEntryList(raw);
}

async function refreshCrossCopyComparison(): Promise<void> {
  if (crossCopyCompareLoading.value) {
    return;
  }
  if (!crossCopySourceWorldbook.value || !crossCopyTargetWorldbook.value) {
    toastr.warning('请先选择来源和目标世界书');
    return;
  }
  crossCopyCompareLoading.value = true;
  try {
    const sameSourceTarget = crossCopySourceWorldbook.value === crossCopyTargetWorldbook.value;
    const [sourceEntries, targetEntries] = await Promise.all([
      readCrossCopySourceEntries(crossCopySourceWorldbook.value),
      getWorldbook(crossCopyTargetWorldbook.value),
    ]);
    const normalizedTarget = normalizeEntryList(targetEntries);
    crossCopySourceBaselineEntries.value = sourceEntries.map(entry => normalizeEntry(klona(entry), entry.uid));
    crossCopyTargetBaselineEntries.value = normalizedTarget.map(entry => normalizeEntry(klona(entry), entry.uid));
    crossCopyRows.value = buildCrossCopyRows(crossCopySourceBaselineEntries.value, crossCopyTargetBaselineEntries.value, sameSourceTarget);
    crossCopyCompareSummary.value = buildCrossCopyCompareSummary(
      crossCopyRows.value,
      crossCopySourceBaselineEntries.value.length,
      crossCopyTargetBaselineEntries.value.length,
    );
    crossCopyLastComparedAt.value = Date.now();
    if (sameSourceTarget) {
      toastr.warning('来源和目标不能是同一个世界书');
      crossCopyLastResultSummary.value = '来源与目标相同，已禁止执行复制';
    } else {
      setStatus(`跨书比较完成：${crossCopyCompareSummary.value}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toastr.error(`对比失败: ${message}`);
    crossCopyLastResultSummary.value = `对比失败：${message}`;
  } finally {
    crossCopyCompareLoading.value = false;
  }
}

function applyCrossCopyBulkAction(action = crossCopyBulkAction.value): void {
  applyCrossCopyBulkActionToRows(action);
}

function pushSnapshotForWorldbook(worldbookName: string, entries: WorldbookEntry[], label: string): void {
  if (!worldbookName) {
    return;
  }
  const snapshot: WorldbookSnapshot = {
    id: createId('snapshot'),
    label,
    ts: Date.now(),
    entries: normalizeEntryList(entries.map(entry => klona(entry))),
  };
  updatePersistedState(state => {
    const list = state.history[worldbookName] ?? [];
    list.unshift(snapshot);
    if (list.length > HISTORY_LIMIT) {
      list.length = HISTORY_LIMIT;
    }
    state.history[worldbookName] = list;
  });
}


function syncExtraTextWithSelection(): void {
  if (!selectedEntry.value || !selectedEntry.value.extra) {
    selectedExtraText.value = '';
    return;
  }
  selectedExtraText.value = JSON.stringify(selectedEntry.value.extra, null, 2);
}

function formatDateTime(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return String(timestamp);
  }
}

function formatHistoryOptionLabel(label: string, ts: number, isCurrent: boolean): string {
  if (isCurrent) {
    return 'Current（当前）';
  }
  if (label === '加载基线' || ts <= 0) {
    return label;
  }
  return `${label} · ${formatDateTime(ts)}`;
}

function getEntryVersionPreview(view: EntryVersionView | null): string {
  if (!view) {
    return '';
  }
  const content = toStringSafe(view.entry.content).replace(/\s+/g, ' ').trim();
  if (!content) {
    return '(空内容)';
  }
  return content.slice(0, 160);
}

function getWorldbookHistoryVersionPreview(view: WorldbookVersionView | null): string {
  if (!view) {
    return '';
  }
  if (!view.entries.length) {
    return '空世界书';
  }
  const enabledCount = view.entries.filter(entry => entry.enabled).length;
  const sampleNames = view.entries
    .slice(0, 3)
    .map(entry => entry.name || `#${entry.uid}`)
    .join(' / ');
  const suffix = view.entries.length > 3 ? ' ...' : '';
  return `启用 ${enabledCount}/${view.entries.length} · ${sampleNames}${suffix}`;
}

function getWorldbookHistoryStatusLabel(status: WorldbookHistoryCompareStatus): string {
  if (status === 'added') {
    return '新增';
  }
  if (status === 'removed') {
    return '删除';
  }
  return '修改';
}

function getWorldbookHistoryStatusBadgeClass(status: WorldbookHistoryCompareStatus): string {
  if (status === 'added') {
    return 'new';
  }
  if (status === 'removed') {
    return 'invalid';
  }
  return 'changed';
}

function getEntryPairDiffSummary(
  left: WorldbookEntry | null,
  right: WorldbookEntry | null,
  labels: { left: string; right: string } = { left: 'Left', right: 'Right' },
): string {
  if (!left && !right) {
    return '无可比较条目';
  }
  if (!left) {
    return `仅${labels.right}存在`;
  }
  if (!right) {
    return `仅${labels.left}存在`;
  }

  const diff: string[] = [];
  if (normalizeCrossCopyNameKey(left.name) !== normalizeCrossCopyNameKey(right.name)) {
    diff.push('名称不同');
  }
  if (normalizeCrossCopyContentKey(left.content) !== normalizeCrossCopyContentKey(right.content)) {
    diff.push('内容不同');
  }
  if (left.enabled !== right.enabled) {
    diff.push('启用状态不同');
  }
  if (left.strategy.type !== right.strategy.type) {
    diff.push('策略不同');
  }
  if (left.probability !== right.probability) {
    diff.push('概率不同');
  }
  if (
    left.position.type !== right.position.type ||
    left.position.order !== right.position.order ||
    left.position.role !== right.position.role ||
    left.position.depth !== right.position.depth
  ) {
    diff.push('插入设置不同');
  }
  if (
    left.recursion.prevent_incoming !== right.recursion.prevent_incoming ||
    left.recursion.prevent_outgoing !== right.recursion.prevent_outgoing ||
    left.recursion.delay_until !== right.recursion.delay_until
  ) {
    diff.push('递归设置不同');
  }
  if (
    left.effect.sticky !== right.effect.sticky ||
    left.effect.cooldown !== right.effect.cooldown ||
    left.effect.delay !== right.effect.delay ||
    left.effect.delay_until !== right.effect.delay_until
  ) {
    diff.push('效果设置不同');
  }
  if (left.strategy.keys.length !== right.strategy.keys.length) {
    diff.push('主要关键词数量不同');
  }
  if (left.strategy.keys_secondary.keys.length !== right.strategy.keys_secondary.keys.length) {
    diff.push('次要关键词数量不同');
  }

  if (!diff.length) {
    return '主要字段一致';
  }
  return diff.join(' / ');
}

function serializeWorldbookEntryForDiff(entry: WorldbookEntry | null): string {
  if (!entry) {
    return '';
  }
  const payload = {
    uid: entry.uid,
    name: entry.name,
    enabled: entry.enabled,
    strategy: entry.strategy,
    position: entry.position,
    probability: entry.probability,
    recursion: entry.recursion,
    effect: entry.effect,
    content: entry.content,
    extra: entry.extra ?? null,
  };
  return JSON.stringify(payload, null, 2);
}

function areWorldbookEntriesEqual(left: WorldbookEntry | null, right: WorldbookEntry | null): boolean {
  return serializeWorldbookEntryForDiff(left) === serializeWorldbookEntryForDiff(right);
}

function buildWorldbookHistoryCompareRows(
  left: WorldbookVersionView | null,
  right: WorldbookVersionView | null,
): WorldbookHistoryCompareRow[] {
  if (!left || !right) {
    return [];
  }

  const rows: WorldbookHistoryCompareRow[] = [];
  const leftMap = new Map<number, WorldbookEntry>();
  const rightMap = new Map<number, WorldbookEntry>();
  for (const entry of left.entries) {
    leftMap.set(entry.uid, entry);
  }
  for (const entry of right.entries) {
    rightMap.set(entry.uid, entry);
  }

  for (const rightEntry of right.entries) {
    const leftEntry = leftMap.get(rightEntry.uid) ?? null;
    if (!leftEntry) {
      rows.push({
        key: `added:${rightEntry.uid}`,
        uid: rightEntry.uid,
        status: 'added',
        title: rightEntry.name || `条目 ${rightEntry.uid}`,
        note: '仅在 Right 版本存在',
        left_entry: null,
        right_entry: rightEntry,
      });
      continue;
    }
    if (!areWorldbookEntriesEqual(leftEntry, rightEntry)) {
      rows.push({
        key: `changed:${rightEntry.uid}`,
        uid: rightEntry.uid,
        status: 'changed',
        title: rightEntry.name || leftEntry.name || `条目 ${rightEntry.uid}`,
        note: getEntryPairDiffSummary(leftEntry, rightEntry),
        left_entry: leftEntry,
        right_entry: rightEntry,
      });
    }
  }

  for (const leftEntry of left.entries) {
    if (rightMap.has(leftEntry.uid)) {
      continue;
    }
    rows.push({
      key: `removed:${leftEntry.uid}`,
      uid: leftEntry.uid,
      status: 'removed',
      title: leftEntry.name || `条目 ${leftEntry.uid}`,
      note: '仅在 Left 版本存在',
      left_entry: leftEntry,
      right_entry: null,
    });
  }

  return rows;
}

function getWorldbookVersionDiffSummary(
  left: WorldbookVersionView | null,
  right: WorldbookVersionView | null,
): string {
  if (!left || !right) {
    return '请选择左右版本进行对比';
  }
  let added = 0;
  let removed = 0;
  let changed = 0;
  for (const row of buildWorldbookHistoryCompareRows(left, right)) {
    if (row.status === 'added') {
      added += 1;
    } else if (row.status === 'removed') {
      removed += 1;
    } else {
      changed += 1;
    }
  }
  return `新增 ${added} / 修改 ${changed} / 删除 ${removed}`;
}

function getEntryVersionDiffSummary(left: EntryVersionView | null, right: EntryVersionView | null): string {
  if (!left || !right) {
    return '请在左侧选择两个版本进行比对';
  }
  const fieldRows = buildEntryFieldDiffRows(left.entry, right.entry, { left_fallback: '（不存在）', right_fallback: '（不存在）' });
  const fieldChanged = fieldRows.filter(row => row.changed).length;
  const content = buildCrossCopyTextDiff(toStringSafe(left.entry.content), toStringSafe(right.entry.content));
  return `字段 ${fieldChanged}/${fieldRows.length} 不同 · 新增行 ${content.added} / 修改行 ${content.changed} / 删除行 ${content.removed}`;
}

function parseBatchExcludeTokens(value: string): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const raw of value.split(/[\n,]/g)) {
    const token = raw.trim().toLowerCase();
    if (!token || seen.has(token)) {
      continue;
    }
    seen.add(token);
    tokens.push(token);
  }
  return tokens;
}

function shouldExcludeEntryForBatch(entry: WorldbookEntry, tokens: string[]): boolean {
  if (!tokens.length) {
    return false;
  }
  const name = entry.name.toLowerCase();
  const content = entry.content.toLowerCase();
  const keys = entry.strategy.keys.map(key => stringifyKeyword(key).toLowerCase()).join(' ');
  const secondaryKeys = entry.strategy.keys_secondary.keys.map(key => stringifyKeyword(key).toLowerCase()).join(' ');

  for (const token of tokens) {
    const uidMatch = token.match(/^(?:#|uid:)?(\d+)$/);
    if (uidMatch && Number(uidMatch[1]) === entry.uid) {
      return true;
    }

    const scoped = token.match(/^(name|content|keys|secondary|secondary_keys):(.+)$/);
    if (scoped) {
      const scope = scoped[1];
      const needle = scoped[2].trim();
      if (!needle) {
        continue;
      }

      if (scope === 'name' && name.includes(needle)) {
        return true;
      }
      if (scope === 'content' && content.includes(needle)) {
        return true;
      }
      if (scope === 'keys' && keys.includes(needle)) {
        return true;
      }
      if ((scope === 'secondary' || scope === 'secondary_keys') && secondaryKeys.includes(needle)) {
        return true;
      }
      continue;
    }

    const plain = token.trim();
    if (!plain) {
      continue;
    }

    if (
      name.includes(plain) ||
      content.includes(plain) ||
      keys.includes(plain) ||
      secondaryKeys.includes(plain)
    ) {
      return true;
    }
  }
  return false;
}

function getFindFieldLabel(field: FindFieldKey): string {
  if (field === 'name') {
    return '名称';
  }
  if (field === 'content') {
    return '内容';
  }
  return '关键词';
}

function resolveBatchRegex(findText: string): RegExp | null {
  if (!batchUseRegex.value) {
    return null;
  }
  try {
    return new RegExp(findText, 'g');
  } catch (error) {
    toastr.error(`正则表达式无效: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function getBatchTargetEntries(): WorldbookEntry[] {
  if (batchSearchScope.value === 'current') {
    return selectedEntry.value ? [selectedEntry.value] : [];
  }
  return draftEntries.value;
}

function getEnabledFindFields(): FindFieldKey[] {
  const fields: FindFieldKey[] = [];
  if (batchInName.value) {
    fields.push('name');
  }
  if (batchInContent.value) {
    fields.push('content');
  }
  if (batchInKeys.value) {
    fields.push('keys');
  }
  return fields;
}

function getEntryFieldText(entry: WorldbookEntry, field: FindFieldKey): string {
  if (field === 'name') {
    return entry.name;
  }
  if (field === 'content') {
    return entry.content;
  }
  return entry.strategy.keys.map(key => stringifyKeyword(key)).join(', ');
}

function collectMatchIndexes(text: string, findText: string, regex: RegExp | null): Array<{ start: number; end: number; matchedText: string }> {
  const hits: Array<{ start: number; end: number; matchedText: string }> = [];
  if (!text || !findText) {
    return hits;
  }

  if (!regex) {
    let cursor = 0;
    while (cursor <= text.length) {
      const start = text.indexOf(findText, cursor);
      if (start < 0) {
        break;
      }
      const end = start + findText.length;
      hits.push({
        start,
        end,
        matchedText: text.slice(start, end),
      });
      cursor = Math.max(end, start + 1);
    }
    return hits;
  }

  const runtime = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
  let result: RegExpExecArray | null = null;
  while ((result = runtime.exec(text)) !== null) {
    const matched = result[0] ?? '';
    if (!matched) {
      runtime.lastIndex += 1;
      continue;
    }
    const start = result.index;
    const end = start + matched.length;
    hits.push({
      start,
      end,
      matchedText: matched,
    });
  }
  return hits;
}

function buildFindPreview(text: string, start: number, end: number): string {
  const left = Math.max(0, start - 18);
  const right = Math.min(text.length, end + 22);
  const prefix = left > 0 ? '...' : '';
  const suffix = right < text.length ? '...' : '';
  return `${prefix}${text.slice(left, right).replace(/\s+/g, ' ')}${suffix}`;
}

function collectFindHits(findText: string, regex: RegExp | null, excludeTokens: string[]): FindHit[] {
  const fields = getEnabledFindFields();
  if (!fields.length) {
    return [];
  }
  const entries = getBatchTargetEntries();
  const hits: FindHit[] = [];

  for (const entry of entries) {
    if (shouldExcludeEntryForBatch(entry, excludeTokens)) {
      continue;
    }
    for (const field of fields) {
      const text = getEntryFieldText(entry, field);
      const indexes = collectMatchIndexes(text, findText, regex);
      for (const match of indexes) {
        hits.push({
          entryUid: entry.uid,
          entryName: entry.name,
          field,
          start: match.start,
          end: match.end,
          matchedText: match.matchedText,
          preview: buildFindPreview(text, match.start, match.end),
        });
      }
    }
  }

  return hits;
}

function isSameFindHit(left: FindHit, right: FindHit): boolean {
  return (
    left.entryUid === right.entryUid &&
    left.field === right.field &&
    left.start === right.start &&
    left.end === right.end &&
    left.matchedText === right.matchedText
  );
}

function resetFindState(): void {
  findHits.value = [];
  findHitIndex.value = -1;
}

function getFindTargetElement(field: FindFieldKey): HTMLInputElement | HTMLTextAreaElement | null {
  const root = editorShellRef.value;
  if (!root) {
    return null;
  }
  if (field === 'name') {
    return root.querySelector('.editor-comment input.text-input');
  }
  if (field === 'content') {
    return root.querySelector('.editor-content-area');
  }
  return root.querySelector('.editor-keyword-grid .field textarea');
}

function getTextareaLineHeight(element: HTMLTextAreaElement): number {
  const style = window.getComputedStyle(element);
  const lineHeight = Number.parseFloat(style.lineHeight);
  if (Number.isFinite(lineHeight) && lineHeight > 0) {
    return lineHeight;
  }
  const fontSize = Number.parseFloat(style.fontSize);
  if (Number.isFinite(fontSize) && fontSize > 0) {
    return fontSize * 1.4;
  }
  return 18;
}

function scrollTextareaToSelection(element: HTMLTextAreaElement, start: number): void {
  const lineHeight = getTextareaLineHeight(element);
  const before = element.value.slice(0, start);
  const lineIndex = before.split('\n').length - 1;
  const desiredTop = Math.max(0, lineIndex * lineHeight - element.clientHeight * 0.35);
  element.scrollTop = desiredTop;
}

async function revealFindHitInEditor(hit: FindHit): Promise<void> {
  await nextTick();
  let target = getFindTargetElement(hit.field);
  if (!target) {
    await nextTick();
    target = getFindTargetElement(hit.field);
    if (!target) {
      return;
    }
  }

  const maxLen = target.value.length;
  const start = Math.max(0, Math.min(hit.start, maxLen));
  const end = Math.max(start, Math.min(hit.end, maxLen));

  target.focus();
  target.setSelectionRange(start, end);
  if (target instanceof HTMLTextAreaElement) {
    scrollTextareaToSelection(target, start);
  }
  target.scrollIntoView({ block: 'center', inline: 'nearest' });
  requestAnimationFrame(() => {
    target?.scrollIntoView({ block: 'center', inline: 'nearest' });
    if (target instanceof HTMLTextAreaElement) {
      scrollTextareaToSelection(target, start);
    }
  });
}

function moveToFindHit(hit: FindHit, index: number, total: number): void {
  findHitIndex.value = index;
  selectedEntryUid.value = hit.entryUid;
  void revealFindHitInEditor(hit);
  const entryLabel = hit.entryName || `条目 ${hit.entryUid}`;
  setStatus(`查找 ${index + 1}/${total}: ${entryLabel} · ${getFindFieldLabel(hit.field)} · ${hit.preview}`);
}

function runFind(step: -1 | 0 | 1): void {
  const findText = batchFindText.value;
  if (!findText) {
    toastr.warning('请先输入查找文本');
    return;
  }

  if (!getEnabledFindFields().length) {
    toastr.warning('请至少勾选一个查找字段');
    return;
  }

  if (batchSearchScope.value === 'current' && !selectedEntry.value) {
    toastr.warning('当前条目模式下请先选择一个条目');
    return;
  }

  const excludeTokens = parseBatchExcludeTokens(batchExcludeText.value);
  const regex = resolveBatchRegex(findText);
  if (batchUseRegex.value && !regex) {
    return;
  }

  const hits = collectFindHits(findText, regex, excludeTokens);
  findHits.value = hits;

  if (!hits.length) {
    findHitIndex.value = -1;
    setStatus('查找完成：未找到匹配');
    toastr.info('未找到匹配项');
    return;
  }

  if (step === 0) {
    moveToFindHit(hits[0], 0, hits.length);
    return;
  }

  const prevHit = activeFindHit.value;
  const currentIndex = prevHit ? hits.findIndex(item => isSameFindHit(item, prevHit)) : findHitIndex.value;
  let nextIndex: number;
  if (currentIndex < 0) {
    nextIndex = step > 0 ? 0 : hits.length - 1;
  } else {
    nextIndex = (currentIndex + step + hits.length) % hits.length;
  }
  moveToFindHit(hits[nextIndex], nextIndex, hits.length);
}

function findFirstMatch(): void {
  runFind(0);
}

function findNextMatch(): void {
  runFind(1);
}

function findPreviousMatch(): void {
  runFind(-1);
}

function getOrderedSelectedEntryUids(): number[] {
  if (!selectedEntryUids.value.length) {
    return [];
  }
  const selected = new Set(selectedEntryUids.value);
  return draftEntries.value
    .filter(entry => selected.has(entry.uid))
    .map(entry => entry.uid);
}

function ensureSelectedEntryExists(): void {
  if (!draftEntries.value.length) {
    selectedEntryUid.value = null;
    selectedEntryUids.value = [];
    selectedEntryAnchorUid.value = null;
    return;
  }

  const validUidSet = new Set(draftEntries.value.map(entry => entry.uid));
  selectedEntryUids.value = selectedEntryUids.value.filter((uid, index, list) => {
    return validUidSet.has(uid) && list.indexOf(uid) === index;
  });

  if (selectedEntryUid.value === null) {
    selectedEntryUid.value = draftEntries.value[0].uid;
  } else if (!validUidSet.has(selectedEntryUid.value)) {
    selectedEntryUid.value = draftEntries.value[0].uid;
  }

  if (selectedEntryUid.value !== null && !selectedEntryUids.value.includes(selectedEntryUid.value)) {
    selectedEntryUids.value.unshift(selectedEntryUid.value);
  }

  if (selectedEntryAnchorUid.value === null || !validUidSet.has(selectedEntryAnchorUid.value)) {
    selectedEntryAnchorUid.value = selectedEntryUid.value;
  }
}

function enterMobileMultiSelectMode(initialUid: number): void {
  if (!isMobile.value) {
    return;
  }
  mobileMultiSelectMode.value = true;
  if (draftEntries.value.some(entry => entry.uid === initialUid)) {
    selectedEntryUids.value = [initialUid];
    selectedEntryUid.value = initialUid;
    selectedEntryAnchorUid.value = initialUid;
  }
  setStatus('已进入多选模式');
}

function finishMobileMultiSelectMode(): void {
  if (!mobileMultiSelectMode.value) {
    return;
  }
  mobileMultiSelectMode.value = false;
  if (selectedEntryUids.value.length > 0) {
    const primaryUid = selectedEntryUids.value[0];
    selectedEntryUid.value = primaryUid;
    selectedEntryUids.value = [primaryUid];
    selectedEntryAnchorUid.value = primaryUid;
  } else {
    selectedEntryUid.value = null;
    selectedEntryUids.value = [];
    selectedEntryAnchorUid.value = null;
  }
  setStatus('已退出多选模式');
}

function toggleMobileEntrySelection(uid: number): void {
  if (!isMobile.value || !mobileMultiSelectMode.value) {
    return;
  }
  if (!draftEntries.value.some(entry => entry.uid === uid)) {
    return;
  }
  const next = [...selectedEntryUids.value];
  const index = next.indexOf(uid);
  if (index >= 0) {
    next.splice(index, 1);
  } else {
    next.push(uid);
  }
  selectedEntryUids.value = next;
  if (!next.length) {
    selectedEntryUid.value = null;
    selectedEntryAnchorUid.value = null;
    return;
  }
  if (!selectedEntryUid.value || !next.includes(selectedEntryUid.value)) {
    selectedEntryUid.value = next[0];
    selectedEntryAnchorUid.value = next[0];
  }
}

function selectAllVisibleForMobileMultiSelect(): void {
  if (!isMobile.value || !mobileMultiSelectMode.value) {
    return;
  }
  const visibleUids = filteredEntries.value.map(entry => entry.uid);
  selectedEntryUids.value = visibleUids;
  if (visibleUids.length > 0) {
    selectedEntryUid.value = visibleUids[0];
    selectedEntryAnchorUid.value = visibleUids[0];
  } else {
    selectedEntryUid.value = null;
    selectedEntryAnchorUid.value = null;
  }
}

function clearMobileMultiSelectSelection(): void {
  if (!isMobile.value || !mobileMultiSelectMode.value) {
    return;
  }
  selectedEntryUids.value = [];
  selectedEntryUid.value = null;
  selectedEntryAnchorUid.value = null;
}

function clearMobileLongPressState(): void {
  const state = mobileLongPressState.value;
  if (!state) {
    return;
  }
  if (state.timerId !== null) {
    clearTimeout(state.timerId);
  }
  if (state.target) {
    try {
      if (state.target.hasPointerCapture(state.pointerId)) {
        state.target.releasePointerCapture(state.pointerId);
      }
    } catch {
      // ignore pointer capture release failures
    }
  }
  mobileLongPressState.value = null;
}

function startMobileEntryLongPress(uid: number, event: PointerEvent): void {
  if (!isMobile.value || mobileTab.value !== 'list' || mobileMultiSelectMode.value) {
    return;
  }
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }
  clearMobileLongPressState();
  const target = event.currentTarget as HTMLElement | null;
  const state: MobileEntryLongPressState = {
    uid,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    triggered: false,
    timerId: null,
    target,
  };
  if (target) {
    try {
      target.setPointerCapture(event.pointerId);
    } catch {
      // ignore pointer capture failures
    }
  }
  state.timerId = window.setTimeout(() => {
    if (!mobileLongPressState.value || mobileLongPressState.value.pointerId !== state.pointerId) {
      return;
    }
    mobileLongPressState.value.triggered = true;
    mobileSuppressNextTap.value = true;
    enterMobileMultiSelectMode(uid);
  }, MOBILE_MULTI_LONG_PRESS_MS);
  mobileLongPressState.value = state;
}

function handleMobileEntryLongPressMove(event: PointerEvent): void {
  const state = mobileLongPressState.value;
  if (!state || state.pointerId !== event.pointerId || state.triggered) {
    return;
  }
  const offsetX = event.clientX - state.startX;
  const offsetY = event.clientY - state.startY;
  if (Math.hypot(offsetX, offsetY) > MOBILE_MULTI_LONG_PRESS_MOVE_PX) {
    clearMobileLongPressState();
  }
}

function finishMobileEntryLongPress(event?: PointerEvent): void {
  const state = mobileLongPressState.value;
  if (!state) {
    return;
  }
  if (event && state.pointerId !== event.pointerId) {
    return;
  }
  const triggered = state.triggered;
  clearMobileLongPressState();
  if (triggered) {
    mobileSuppressNextTap.value = true;
  }
}

function selectEntry(uid: number, event?: MouseEvent): void {
  if (suppressNextEntryClick.value) {
    suppressNextEntryClick.value = false;
    return;
  }

  const entryExists = draftEntries.value.some(entry => entry.uid === uid);
  if (!entryExists) {
    return;
  }

  if (isMobile.value) {
    if (mobileSuppressNextTap.value) {
      mobileSuppressNextTap.value = false;
      return;
    }
    if (mobileMultiSelectMode.value) {
      toggleMobileEntrySelection(uid);
      return;
    }
    selectedEntryUid.value = uid;
    selectedEntryUids.value = [uid];
    selectedEntryAnchorUid.value = uid;
    // Blur active input to prevent keyboard auto-popup on tab switch
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
    nextTick(() => {
      mobileTab.value = 'edit';
    });
    return;
  }

  const ctrlLike = Boolean(event && (event.ctrlKey || event.metaKey));
  const shiftLike = Boolean(event && event.shiftKey);

  if (shiftLike && selectedEntryAnchorUid.value !== null) {
    const from = filteredEntries.value.findIndex(entry => entry.uid === selectedEntryAnchorUid.value);
    const to = filteredEntries.value.findIndex(entry => entry.uid === uid);
    if (from >= 0 && to >= 0) {
      const start = Math.min(from, to);
      const end = Math.max(from, to);
      const rangeUids = filteredEntries.value.slice(start, end + 1).map(entry => entry.uid);
      if (ctrlLike) {
        const merged = [...selectedEntryUids.value];
        for (const currentUid of rangeUids) {
          if (!merged.includes(currentUid)) {
            merged.push(currentUid);
          }
        }
        selectedEntryUids.value = merged;
      } else {
        selectedEntryUids.value = rangeUids;
      }
    } else {
      selectedEntryUids.value = [uid];
    }
    selectedEntryUid.value = uid;
    return;
  }

  if (ctrlLike) {
    const current = [...selectedEntryUids.value];
    const index = current.indexOf(uid);
    if (index >= 0) {
      if (current.length > 1) {
        current.splice(index, 1);
        selectedEntryUids.value = current;
        if (selectedEntryUid.value === uid) {
          selectedEntryUid.value = current[Math.max(0, index - 1)] ?? current[0] ?? uid;
        }
      } else {
        selectedEntryUid.value = uid;
        selectedEntryUids.value = [uid];
      }
    } else {
      current.push(uid);
      selectedEntryUids.value = current;
      selectedEntryUid.value = uid;
    }
    selectedEntryAnchorUid.value = uid;
    return;
  }

  selectedEntryUid.value = uid;
  selectedEntryUids.value = [uid];
  selectedEntryAnchorUid.value = uid;
}

function clearEntryDragState(): void {
  draggingEntryUids.value = [];
  entryDropTargetUid.value = null;
  entryDropPosition.value = null;
}

function reorderEntriesByDrop(targetUid: number, position: 'before' | 'after'): boolean {
  if (!draggingEntryUids.value.length) {
    return false;
  }
  const movingSet = new Set(draggingEntryUids.value);
  if (movingSet.has(targetUid)) {
    return false;
  }
  const movingEntries = draftEntries.value.filter(entry => movingSet.has(entry.uid));
  if (!movingEntries.length) {
    return false;
  }
  const remaining = draftEntries.value.filter(entry => !movingSet.has(entry.uid));
  let insertIndex = remaining.findIndex(entry => entry.uid === targetUid);
  if (insertIndex < 0) {
    insertIndex = remaining.length;
  } else if (position === 'after') {
    insertIndex += 1;
  }
  const next = [...remaining.slice(0, insertIndex), ...movingEntries, ...remaining.slice(insertIndex)];
  const unchanged = next.every((entry, index) => entry.uid === draftEntries.value[index]?.uid);
  if (unchanged) {
    return false;
  }

  draftEntries.value = next;
  selectedEntryUids.value = movingEntries.map(entry => entry.uid);
  if (!selectedEntryUid.value || !selectedEntryUids.value.includes(selectedEntryUid.value)) {
    selectedEntryUid.value = selectedEntryUids.value[0] ?? null;
  }
  if (selectedEntryUid.value !== null) {
    selectedEntryAnchorUid.value = selectedEntryUid.value;
  }
  return true;
}

function handleEntryDragStart(uid: number, event: DragEvent): void {
  if (isMobile.value) {
    return;
  }
  const orderedSelected = getOrderedSelectedEntryUids();
  if (orderedSelected.includes(uid) && orderedSelected.length > 1) {
    draggingEntryUids.value = orderedSelected;
  } else {
    selectedEntryUid.value = uid;
    selectedEntryUids.value = [uid];
    selectedEntryAnchorUid.value = uid;
    draggingEntryUids.value = [uid];
  }
  entryDropTargetUid.value = null;
  entryDropPosition.value = null;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(uid));
  }
}

function handleEntryDragOver(uid: number, event: DragEvent): void {
  if (!draggingEntryUids.value.length) {
    return;
  }
  event.preventDefault();
  const element = event.currentTarget as HTMLElement | null;
  if (!element) {
    return;
  }
  const rect = element.getBoundingClientRect();
  const offsetY = event.clientY - rect.top;
  entryDropTargetUid.value = uid;
  entryDropPosition.value = offsetY > rect.height / 2 ? 'after' : 'before';
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

function handleEntryDrop(uid: number, event: DragEvent): void {
  event.preventDefault();
  if (!draggingEntryUids.value.length) {
    return;
  }
  const changed = reorderEntriesByDrop(uid, entryDropPosition.value ?? 'after');
  clearEntryDragState();
  if (changed) {
    setStatus(`已拖拽排序 ${selectedEntryUids.value.length || 1} 个条目`);
  }
  suppressNextEntryClick.value = true;
  setTimeout(() => {
    suppressNextEntryClick.value = false;
  }, 0);
}

function handleEntryDragEnd(): void {
  clearEntryDragState();
  suppressNextEntryClick.value = true;
  setTimeout(() => {
    suppressNextEntryClick.value = false;
  }, 0);
}

function goBackToList(): void {
  selectedEntryUid.value = null;
  selectedEntryUids.value = [];
  selectedEntryAnchorUid.value = null;
  if (isMobile.value) {
    mobileTab.value = 'list';
  }
}

function createEntrySnapshotRecord(
  label: string,
  uid: number,
  name: string,
  entry: WorldbookEntry,
): EntrySnapshot {
  return {
    id: createId('entry-snapshot'),
    label,
    ts: Date.now(),
    uid,
    name: name || `条目 ${uid}`,
    entry: normalizeEntry(klona(entry), uid),
  };
}

function pushEntrySnapshotsBulk(
  items: Array<{
    label: string;
    uid: number;
    name: string;
    entry: WorldbookEntry;
  }>,
): number {
  if (!selectedWorldbookName.value || !items.length) {
    return 0;
  }

  let added = 0;
  const worldbookName = selectedWorldbookName.value;

  updatePersistedState(state => {
    const byWorldbook = state.entry_history[worldbookName] ?? {};

    for (const item of items) {
      const uidKey = String(item.uid);
      const incoming = createEntrySnapshotRecord(item.label, item.uid, item.name, item.entry);
      const list = byWorldbook[uidKey] ?? [];

      if (list[0] && JSON.stringify(list[0].entry) === JSON.stringify(incoming.entry)) {
        continue;
      }

      list.unshift(incoming);
      if (list.length > ENTRY_HISTORY_LIMIT) {
        list.length = ENTRY_HISTORY_LIMIT;
      }
      byWorldbook[uidKey] = list;
      added += 1;
    }

    state.entry_history[worldbookName] = byWorldbook;
  });

  return added;
}

function pushEntrySnapshot(label: string, entry: WorldbookEntry): boolean {
  const added = pushEntrySnapshotsBulk([
    {
      label,
      uid: entry.uid,
      name: entry.name,
      entry,
    },
  ]);
  return added > 0;
}

function collectEntrySnapshotsBeforeSave(): Array<{
  label: string;
  uid: number;
  name: string;
  entry: WorldbookEntry;
}> {
  const result: Array<{
    label: string;
    uid: number;
    name: string;
    entry: WorldbookEntry;
  }> = [];
  const draftByUid = new Map<number, WorldbookEntry>();
  draftEntries.value.forEach(entry => {
    draftByUid.set(entry.uid, entry);
  });

  for (const previous of originalEntries.value) {
    const current = draftByUid.get(previous.uid);
    if (!current) {
      result.push({
        label: '保存前（删除前）',
        uid: previous.uid,
        name: previous.name,
        entry: previous,
      });
      continue;
    }
    if (JSON.stringify(previous) !== JSON.stringify(current)) {
      result.push({
        label: '保存前',
        uid: previous.uid,
        name: previous.name,
        entry: previous,
      });
    }
  }

  return result;
}

function pushSnapshot(label: string): void {
  if (!selectedWorldbookName.value) {
    return;
  }
  pushSnapshotForWorldbook(selectedWorldbookName.value, draftEntries.value, label);
}

function createManualSnapshot(): void {
  if (!selectedWorldbookName.value) {
    toastr.warning('请先选择世界书');
    return;
  }
  pushSnapshot('手动快照');
  toastr.success('已创建快照');
}

function closeEntryHistoryModal(): void {
  showEntryHistoryModal.value = false;
  entryHistoryLeftId.value = '';
  entryHistoryRightId.value = '';
  stopHistorySectionResize();
}

function closeWorldbookHistoryModal(): void {
  showWorldbookHistoryModal.value = false;
  worldbookHistoryLeftId.value = '';
  worldbookHistoryRightId.value = '';
  worldbookHistoryActiveRowKey.value = '';
  stopHistorySectionResize();
}

function openEntryHistoryModal(): void {
  if (!selectedEntry.value) {
    toastr.warning('请先选择条目');
    return;
  }
  const views = buildEntryVersionViews();
  const nonCurrent = views.find(item => !item.isCurrent) ?? null;
  entryHistoryRightId.value = '__current__';
  entryHistoryLeftId.value = nonCurrent?.id ?? '__current__';
  showEntryHistoryModal.value = true;
}

function openWorldbookHistoryModal(): void {
  if (!selectedWorldbookName.value) {
    toastr.warning('请先选择世界书');
    return;
  }
  const views = buildWorldbookVersionViews();
  const nonCurrent = views.find(item => !item.isCurrent) ?? null;
  worldbookHistoryRightId.value = '__current__';
  worldbookHistoryLeftId.value = nonCurrent?.id ?? '__current__';
  showWorldbookHistoryModal.value = true;
  void nextTick(() => {
    worldbookHistoryActiveRowKey.value = worldbookHistoryCompareRows.value[0]?.key ?? '';
  });
}

function createManualEntrySnapshot(): void {
  if (!selectedEntry.value) {
    toastr.warning('请先选择条目');
    return;
  }
  const added = pushEntrySnapshot('手动条目快照', selectedEntry.value);
  if (added) {
    toastr.success('已记录当前条目快照');
  } else {
    toastr.info('当前条目与最近快照一致，未重复记录');
  }
}

function restoreSnapshot(snapshotId: string): void {
  const snapshot = snapshotsForCurrent.value.find(item => item.id === snapshotId);
  if (!snapshot) {
    return;
  }
  if (!confirm(`回滚到快照 "${snapshot.label}" ? 当前未保存修改会被覆盖。`)) {
    return;
  }
  draftEntries.value = normalizeEntryList(snapshot.entries);
  ensureSelectedEntryExists();
  setStatus(`已回滚到快照：${snapshot.label}`);
}

function restoreWorldbookFromLeftHistory(): void {
  const target = selectedWorldbookHistoryLeft.value;
  if (!target || target.isCurrent) {
    return;
  }
  if (!confirm(`恢复到 Left 版本 "${target.label}" ? 当前未保存修改会被覆盖。`)) {
    return;
  }
  draftEntries.value = normalizeEntryList(klona(target.entries));
  ensureSelectedEntryExists();
  setStatus(`已从时光机恢复：${target.label}`);
  toastr.success('已恢复整本世界书到 Left 版本');
}

function deleteSnapshot(snapshotId: string): void {
  if (!selectedWorldbookName.value) {
    return;
  }
  updatePersistedState(state => {
    const list = state.history[selectedWorldbookName.value] ?? [];
    state.history[selectedWorldbookName.value] = list.filter(item => item.id !== snapshotId);
  });
}

function clearCurrentSnapshots(): void {
  if (!selectedWorldbookName.value || !snapshotsForCurrent.value.length) {
    return;
  }
  if (!confirm(`清空 "${selectedWorldbookName.value}" 的全部快照？`)) {
    return;
  }
  updatePersistedState(state => {
    delete state.history[selectedWorldbookName.value];
  });
}

function restoreEntrySnapshot(snapshotId: string): void {
  if (!selectedEntry.value || selectedEntryIndex.value < 0) {
    return;
  }
  const snapshot = entrySnapshotsForSelected.value.find(item => item.id === snapshotId);
  if (!snapshot) {
    return;
  }
  if (!confirm(`回滚当前条目到快照 "${snapshot.label}" ?`)) {
    return;
  }

  // 回滚前自动留一份，便于撤回
  pushEntrySnapshot('回滚前自动快照', selectedEntry.value);

  const restored = normalizeEntry(klona(snapshot.entry), selectedEntry.value.uid);
  restored.uid = selectedEntry.value.uid;
  draftEntries.value.splice(selectedEntryIndex.value, 1, restored);
  selectedEntryUid.value = restored.uid;
  setStatus(`已回滚条目到快照：${snapshot.label}`);
  toastr.success('已恢复条目快照');
}

function restoreEntryFromLeftHistory(): void {
  const target = selectedEntryHistoryLeft.value;
  if (!target || target.isCurrent) {
    return;
  }
  if (!selectedEntry.value || selectedEntryIndex.value < 0) {
    return;
  }
  if (!confirm(`回滚当前条目到 "${target.label}" ?`)) {
    return;
  }
  pushEntrySnapshot('回滚前自动快照', selectedEntry.value);
  const restored = normalizeEntry(klona(target.entry), selectedEntry.value.uid);
  restored.uid = selectedEntry.value.uid;
  draftEntries.value.splice(selectedEntryIndex.value, 1, restored);
  selectedEntryUid.value = restored.uid;
  setStatus(`已从条目时光机恢复：${target.label}`);
  toastr.success('已恢复条目到 Left 版本');
}

function deleteEntrySnapshot(snapshotId: string): void {
  if (!selectedWorldbookName.value || !selectedEntry.value) {
    return;
  }
  const worldbookName = selectedWorldbookName.value;
  const uidKey = String(selectedEntry.value.uid);
  updatePersistedState(state => {
    const byWorldbook = state.entry_history[worldbookName] ?? {};
    const list = byWorldbook[uidKey] ?? [];
    byWorldbook[uidKey] = list.filter(item => item.id !== snapshotId);
    state.entry_history[worldbookName] = byWorldbook;
  });
}

function clearCurrentEntrySnapshots(): void {
  if (!selectedWorldbookName.value || !selectedEntry.value || !entrySnapshotsForSelected.value.length) {
    return;
  }
  if (!confirm(`清空条目 #${selectedEntry.value.uid} 的历史快照？`)) {
    return;
  }
  const worldbookName = selectedWorldbookName.value;
  const uidKey = String(selectedEntry.value.uid);
  updatePersistedState(state => {
    const byWorldbook = state.entry_history[worldbookName] ?? {};
    delete byWorldbook[uidKey];
    state.entry_history[worldbookName] = byWorldbook;
  });
}

function applyExtraJson(): void {
  if (!selectedEntry.value) {
    return;
  }
  const text = selectedExtraText.value.trim();
  if (!text) {
    selectedEntry.value.extra = undefined;
    return;
  }
  try {
    const parsed = JSON.parse(text);
    const parsedRecord = asRecord(parsed);
    if (!parsedRecord) {
      throw new Error('extra 必须是 JSON 对象');
    }
    selectedEntry.value.extra = klona(parsedRecord);
    toastr.success('extra 已应用');
  } catch (error) {
    toastr.error(`extra JSON 解析失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function clearExtra(): void {
  if (!selectedEntry.value) {
    return;
  }
  selectedEntry.value.extra = undefined;
  selectedExtraText.value = '';
}

function addEntry(): void {
  const uid = getNextUid(draftEntries.value);
  const entry = createDefaultEntry(uid);
  draftEntries.value.push(entry);
  selectedEntryUid.value = uid;
  setStatus(`已新增条目 #${uid}`);
}

function duplicateSelectedEntry(): void {
  if (!selectedEntry.value || selectedEntryIndex.value < 0) {
    return;
  }
  const uid = getNextUid(draftEntries.value);
  const duplicated = normalizeEntry(klona(selectedEntry.value), uid);
  duplicated.uid = uid;
  duplicated.name = `${duplicated.name} (副本)`;
  draftEntries.value.splice(selectedEntryIndex.value + 1, 0, duplicated);
  selectedEntryUid.value = uid;
  setStatus(`已复制条目 #${selectedEntry.value.uid}`);
}

function removeSelectedEntry(): void {
  const selectedUids = getOrderedSelectedEntryUids();
  if (!selectedUids.length) {
    return;
  }
  const entriesByUid = new Map(draftEntries.value.map(entry => [entry.uid, entry] as const));
  const selectedEntries = selectedUids
    .map(uid => entriesByUid.get(uid))
    .filter((entry): entry is WorldbookEntry => Boolean(entry));
  if (!selectedEntries.length) {
    return;
  }

  const confirmText = selectedEntries.length === 1
    ? `确定删除条目 "${selectedEntries[0].name}" ?`
    : `确定删除选中的 ${selectedEntries.length} 个条目？`;
  if (!confirm(confirmText)) {
    return;
  }

  pushEntrySnapshotsBulk(
    selectedEntries.map(entry => ({
      label: '删除前快照',
      uid: entry.uid,
      name: entry.name,
      entry,
    })),
  );

  const removeSet = new Set(selectedUids);
  draftEntries.value = draftEntries.value.filter(entry => !removeSet.has(entry.uid));
  selectedEntryUids.value = [];

  if (isMobile.value) {
    selectedEntryUid.value = null;
    selectedEntryAnchorUid.value = null;
  } else {
    ensureSelectedEntryExists();
  }
  setStatus(selectedEntries.length === 1 ? '已删除条目' : `已删除 ${selectedEntries.length} 个条目`);
}

function moveSelectedEntry(direction: -1 | 1): void {
  const selectedUids = getOrderedSelectedEntryUids();
  if (!selectedUids.length) {
    return;
  }
  const selectedSet = new Set(selectedUids);
  let moved = false;

  if (direction < 0) {
    for (const uid of selectedUids) {
      const index = draftEntries.value.findIndex(entry => entry.uid === uid);
      if (index <= 0) {
        continue;
      }
      const prev = draftEntries.value[index - 1];
      if (selectedSet.has(prev.uid)) {
        continue;
      }
      const [entry] = draftEntries.value.splice(index, 1);
      draftEntries.value.splice(index - 1, 0, entry);
      moved = true;
    }
  } else {
    for (let i = selectedUids.length - 1; i >= 0; i -= 1) {
      const uid = selectedUids[i];
      const index = draftEntries.value.findIndex(entry => entry.uid === uid);
      if (index < 0 || index >= draftEntries.value.length - 1) {
        continue;
      }
      const next = draftEntries.value[index + 1];
      if (selectedSet.has(next.uid)) {
        continue;
      }
      const [entry] = draftEntries.value.splice(index, 1);
      draftEntries.value.splice(index + 1, 0, entry);
      moved = true;
    }
  }

  if (!moved) {
    return;
  }

  selectedEntryUids.value = getOrderedSelectedEntryUids();
  if (!selectedEntryUid.value || !selectedEntryUids.value.includes(selectedEntryUid.value)) {
    selectedEntryUid.value = selectedEntryUids.value[0] ?? null;
  }
  setStatus(selectedUids.length > 1 ? `已移动 ${selectedUids.length} 个条目` : '已移动条目');
}

function normalizeAllEntries(): void {
  draftEntries.value = normalizeEntryList(draftEntries.value.map(entry => klona(entry)));
  ensureSelectedEntryExists();
  setStatus('已完成条目标准化');
}

function sortEntriesByOrderDesc(): void {
  draftEntries.value.sort((left, right) => right.position.order - left.position.order);
  ensureSelectedEntryExists();
  setStatus('已按 order 降序排列');
}

function setEnabledForAll(enabled: boolean): void {
  draftEntries.value.forEach(entry => {
    entry.enabled = enabled;
  });
  setStatus(enabled ? '已启用全部条目' : '已禁用全部条目');
}

function applyBatchReplace(): void {
  const findText = batchFindText.value;
  if (!findText) {
    toastr.warning('请先输入查找文本');
    return;
  }
  if (!getEnabledFindFields().length) {
    toastr.warning('请至少勾选一个查找字段');
    return;
  }
  if (batchSearchScope.value === 'current' && !selectedEntry.value) {
    toastr.warning('当前条目模式下请先选择一个条目');
    return;
  }

  const targetEntries = getBatchTargetEntries();
  if (!targetEntries.length) {
    toastr.warning('没有可处理的条目');
    return;
  }

  const excludeTokens = parseBatchExcludeTokens(batchExcludeText.value);
  const regex = resolveBatchRegex(findText);
  if (batchUseRegex.value && !regex) {
    return;
  }

  let touched = 0;
  let skipped = 0;
  for (const entry of targetEntries) {
    if (shouldExcludeEntryForBatch(entry, excludeTokens)) {
      skipped += 1;
      continue;
    }

    let changed = false;

    if (batchInName.value) {
      const next = regex
        ? entry.name.replace(regex, batchReplaceText.value)
        : entry.name.split(findText).join(batchReplaceText.value);
      if (next !== entry.name) {
        entry.name = next;
        changed = true;
      }
    }

    if (batchInContent.value) {
      const next = regex
        ? entry.content.replace(regex, batchReplaceText.value)
        : entry.content.split(findText).join(batchReplaceText.value);
      if (next !== entry.content) {
        entry.content = next;
        changed = true;
      }
    }

    if (batchInKeys.value) {
      const nextKeys = entry.strategy.keys.map(key => {
        const text = stringifyKeyword(key);
        return regex ? text.replace(regex, batchReplaceText.value) : text.split(findText).join(batchReplaceText.value);
      });
      const normalized = normalizeKeywordList(nextKeys);
      if (
        JSON.stringify(normalized.map(stringifyKeyword)) !== JSON.stringify(entry.strategy.keys.map(stringifyKeyword))
      ) {
        entry.strategy.keys = normalized;
        changed = true;
      }
    }

    if (changed) {
      touched += 1;
    }
  }

  resetFindState();
  setStatus(
    `查找替换完成（${batchSearchScope.value === 'current' ? '当前条目' : '全部条目'}），修改 ${touched} 条，排除 ${skipped} 条`,
  );
}

function downloadJson(filename: string, payload: unknown): void {
  const text = JSON.stringify(payload, null, 2);
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function exportCurrentWorldbook(): void {
  if (!selectedWorldbookName.value) {
    return;
  }
  const payload = {
    format: 'worldbook_assistant_v1',
    name: selectedWorldbookName.value,
    exported_at: new Date().toISOString(),
    entries: draftEntries.value,
  };
  const filename = `${selectedWorldbookName.value.replace(/[\\/:*?"<>|]/g, '_')}.json`;
  downloadJson(filename, payload);
}

function triggerImport(): void {
  importFileInput.value?.click();
}

async function onImportChange(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.[0];
  if (!file) {
    return;
  }

  const fileText = await file.text();
  try {
    const payload = parseImportedPayload(file.name, fileText);
    const suggested = payload.name || file.name.replace(/\.[^/.]+$/, '');
    const newNameRaw = prompt('请输入新世界书名称', suggested);
    const newName = toStringSafe(newNameRaw).trim();
    if (!newName) {
      return;
    }
    await createOrReplaceWorldbook(newName, payload.entries, { render: 'immediate' });
    await reloadWorldbookNames(newName, {
      source: 'manual',
      reason: '导入后切换到新世界书',
    });
    await refreshBindings();
    toastr.success(`已导入为新世界书: ${newName}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const shouldFallback = confirm(`解析导入文件失败: ${message}\n是否尝试按酒馆原生方式导入？`);
    if (!shouldFallback) {
      return;
    }
    const response = await importRawWorldbook(file.name, fileText);
    if (!response.ok) {
      throw new Error(`原生导入失败: HTTP ${response.status}`);
    }
    await hardRefresh({ source: 'manual', reason: '导入后刷新' });
    toastr.success('已按酒馆原生方式导入');
  } finally {
    if (target) {
      target.value = '';
    }
  }
}

async function refreshBindings(): Promise<void> {
  bindings.global = [...getGlobalWorldbookNames()];
  try {
    const charBindings = getCharWorldbookNames('current');
    bindings.charPrimary = charBindings.primary;
    bindings.charAdditional = [...charBindings.additional];
  } catch {
    bindings.charPrimary = null;
    bindings.charAdditional = [];
  }

  try {
    bindings.chat = getChatWorldbookName('current');
  } catch {
    bindings.chat = null;
  }
  if (globalWorldbookMode.value) {
    ensureSelectionForGlobalMode({
      source: 'auto',
      reason: '全局模式同步当前选择',
      silentOnCancel: true,
    });
  }
}

function resolveContextWorldbookCandidate(): string | null {
  const available = worldbookNames.value;
  if (!available.length) {
    return null;
  }
  const chatBound = toStringSafe(bindings.chat).trim();
  if (chatBound && available.includes(chatBound)) {
    return chatBound;
  }
  const charPrimary = toStringSafe(bindings.charPrimary).trim();
  if (charPrimary && available.includes(charPrimary)) {
    return charPrimary;
  }
  const charAdditional = bindings.charAdditional.find(name => available.includes(name));
  return charAdditional ?? null;
}

function ensureSelectionForGlobalMode(options: WorldbookSwitchOptions = {}): boolean {
  if (!globalWorldbookMode.value) {
    return true;
  }
  const globals = selectableWorldbookNames.value;
  if (!globals.length) {
    return switchWorldbookSelection('', {
      source: options.source ?? 'auto',
      reason: options.reason ?? '全局模式下无可用世界书',
      allowDirty: options.allowDirty,
      silentOnCancel: options.silentOnCancel,
    });
  }
  if (!globals.includes(selectedWorldbookName.value)) {
    return switchWorldbookSelection(globals[0], {
      source: options.source ?? 'auto',
      reason: options.reason ?? '全局模式同步当前选择',
      allowDirty: options.allowDirty,
      silentOnCancel: options.silentOnCancel,
    });
  }
  return true;
}

function trySelectWorldbookByContext(
  options: { preferWhenEmptyOnly?: boolean; source?: SelectionSource } = {},
): boolean {
  if (globalWorldbookMode.value) {
    return false;
  }
  if (options.preferWhenEmptyOnly && selectedWorldbookName.value) {
    return false;
  }
  const candidate = resolveContextWorldbookCandidate();
  if (!candidate || candidate === selectedWorldbookName.value) {
    return false;
  }
  const switched = switchWorldbookSelection(candidate, {
    source: options.source ?? 'auto',
    reason: '自动定位上下文世界书',
    silentOnCancel: true,
  });
  if (!switched) {
    setStatus('检测到上下文世界书变更，但当前有未保存修改，已取消自动切换');
    return false;
  }
  setStatus(`已自动定位到上下文世界书: ${candidate}`);
  return true;
}

function toggleGlobalMode(): void {
  if (isAnyCineLocked.value) {
    return;
  }
  globalWorldbookMode.value = !globalWorldbookMode.value;
  if (globalWorldbookMode.value) {
    aiGeneratorMode.value = false;
    tagEditorMode.value = false;
    crossCopyMode.value = false;
    const synced = ensureSelectionForGlobalMode({
      source: 'manual',
      reason: '切换到全局模式',
      silentOnCancel: true,
    });
    if (!synced) {
      globalWorldbookMode.value = false;
      setStatus('已取消切换到全局世界书模式');
      return;
    }
    setStatus('已切换到全局世界书模式');
    return;
  }
  if (!selectedWorldbookName.value) {
    trySelectWorldbookByContext({ source: 'manual' });
  }
  setStatus('已切换到上下文世界书模式');
}

async function applyGlobalWorldbooks(nextGlobal: string[], statusLabel = '已更新全局世界书'): Promise<boolean> {
  const normalized = [...new Set(nextGlobal.map(name => name.trim()).filter(Boolean))].filter(name =>
    worldbookNames.value.includes(name),
  );
  try {
    await rebindGlobalWorldbooks(normalized);
    await refreshBindings();
    ensureSelectionForGlobalMode({
      source: 'manual',
      reason: '更新全局世界书后同步当前选择',
    });
    setStatus(`${statusLabel}（${normalized.length} 本）`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toastr.error(`更新全局世界书失败: ${message}`);
    return false;
  }
}

function addFirstGlobalCandidate(): void {
  const first = globalAddCandidates.value[0];
  if (!first) {
    return;
  }
  void addGlobalWorldbook(first);
}

async function addGlobalWorldbook(name: string): Promise<void> {
  if (!name || bindings.global.includes(name)) {
    return;
  }
  const success = await applyGlobalWorldbooks([...bindings.global, name], `已添加到全局: ${name}`);
  if (success) {
    globalAddSearchText.value = '';
    updatePersistedState(state => {
      state.role_override_baseline = null;
    });
  }
}

async function removeGlobalWorldbook(name: string): Promise<void> {
  if (!name || !bindings.global.includes(name)) {
    return;
  }
  const success = await applyGlobalWorldbooks(
    bindings.global.filter(item => item !== name),
    `已移出全局: ${name}`,
  );
  if (success) {
    updatePersistedState(state => {
      state.role_override_baseline = null;
    });
  }
}

async function clearGlobalWorldbooks(): Promise<void> {
  if (!bindings.global.length) {
    return;
  }
  if (!confirm('确定清空所有全局世界书吗？')) {
    return;
  }
  const success = await applyGlobalWorldbooks([], '已清空全局世界书');
  if (success) {
    updatePersistedState(state => {
      state.role_override_baseline = null;
    });
  }
}

function getCurrentGlobalWorldbookSet(): string[] {
  return [...new Set(bindings.global.map(name => name.trim()).filter(Boolean))];
}

function normalizeWorldbookSet(input: string[]): string[] {
  return [...new Set(input.map(name => name.trim()).filter(Boolean))];
}

function isSameWorldbookSet(left: string[], right: string[]): boolean {
  const leftSorted = [...normalizeWorldbookSet(left)].sort();
  const rightSorted = [...normalizeWorldbookSet(right)].sort();
  if (leftSorted.length !== rightSorted.length) {
    return false;
  }
  for (let index = 0; index < leftSorted.length; index += 1) {
    if (leftSorted[index] !== rightSorted[index]) {
      return false;
    }
  }
  return true;
}

function refreshRoleBindingCandidates(): void {
  let names: string[] = [];
  try {
    names = typeof getCharacterNames === 'function' ? getCharacterNames() : [];
  } catch (error) {
    console.warn('[WorldbookAssistant] getCharacterNames failed:', error);
  }

  const dedupe = new Set<string>();
  const result: PresetRoleBinding[] = [];

  for (const charName of names) {
    const trimmed = charName.trim();
    if (!trimmed) {
      continue;
    }
    const key = `char:${trimmed}`;
    if (dedupe.has(key)) {
      continue;
    }
    dedupe.add(key);
    result.push({
      key,
      name: trimmed,
      avatar: '',
      updated_at: Date.now(),
    });
  }

  result.sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN'));

  const current = resolveCurrentRoleContext();
  if (current && !result.some(item => item.key === current.key)) {
    result.unshift(current);
  }
  roleBindingSourceCandidates.value = result;
}

function resolveCurrentRoleContext(): PresetRoleBinding | null {
  let name: string | null = null;
  try {
    name = typeof getCurrentCharacterName === 'function' ? getCurrentCharacterName() : null;
  } catch (error) {
    console.warn('[WorldbookAssistant] getCurrentCharacterName failed:', error);
  }
  if (!name) {
    return null;
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return null;
  }
  return {
    key: `char:${trimmed}`,
    name: trimmed,
    avatar: '',
    updated_at: Date.now(),
  };
}

function refreshCurrentRoleContext(): void {
  currentRoleContext.value = resolveCurrentRoleContext();
}

async function applyPresetWorldbooks(
  preset: GlobalWorldbookPreset,
  options: { statusPrefix?: string; silentWhenSame?: boolean } = {},
): Promise<boolean> {
  const normalized = normalizeWorldbookSet(preset.worldbooks);
  const missing = normalized.filter(name => !worldbookNames.value.includes(name));
  const matched = normalized.filter(name => worldbookNames.value.includes(name));

  if (options.silentWhenSame && isSameWorldbookSet(getCurrentGlobalWorldbookSet(), matched)) {
    updatePersistedState(state => {
      state.last_global_preset_id = preset.id;
    });
    return true;
  }

  const statusPrefix = options.statusPrefix ?? '已应用预设';
  const success = await applyGlobalWorldbooks(matched, `${statusPrefix}: ${preset.name}`);
  if (!success) {
    return false;
  }
  updatePersistedState(state => {
    state.last_global_preset_id = preset.id;
  });
  if (missing.length) {
    toastr.warning(`预设内有 ${missing.length} 本世界书在当前环境不存在，已自动忽略`);
  }
  return true;
}

async function applySelectedGlobalPreset(): Promise<void> {
  const preset = selectedGlobalPreset.value;
  if (!preset) {
    return;
  }
  const success = await applyPresetWorldbooks(preset);
  if (success) {
    updatePersistedState(state => {
      state.role_override_baseline = null;
    });
  }
}

function getRoleBoundPresetForCurrentContext(): GlobalWorldbookPreset | null {
  const role = currentRoleContext.value;
  if (!role) {
    return null;
  }
  return (
    globalWorldbookPresets.value.find(item => item.role_bindings.some(binding => binding.key === role.key)) ?? null
  );
}

async function autoApplyRoleBoundPreset(): Promise<void> {
  const rolePreset = getRoleBoundPresetForCurrentContext();
  if (!rolePreset) {
    const baseline = persistedState.value.role_override_baseline;
    if (baseline) {
      updatePersistedState(state => {
        state.role_override_baseline = null;
        state.last_global_preset_id = baseline.preset_id;
      });
      selectedGlobalPresetId.value = baseline.preset_id;
      if (baseline.preset_id) {
        const baselinePreset = globalWorldbookPresets.value.find(item => item.id === baseline.preset_id);
        if (baselinePreset) {
          await applyPresetWorldbooks(baselinePreset, {
            statusPrefix: '已恢复角色切换前的预设',
            silentWhenSame: true,
          });
        } else {
          await applyGlobalWorldbooks(
            baseline.worldbooks,
            '已恢复角色切换前的全局世界书',
          );
        }
      } else {
        await applyGlobalWorldbooks(
          baseline.worldbooks,
          '已恢复角色切换前的全局世界书',
        );
      }
    }
    return;
  }
  if (!persistedState.value.role_override_baseline) {
    updatePersistedState(state => {
      state.role_override_baseline = {
        preset_id: selectedGlobalPresetId.value,
        worldbooks: getCurrentGlobalWorldbookSet(),
      };
    });
  }
  selectedGlobalPresetId.value = rolePreset.id;
  await applyPresetWorldbooks(rolePreset, {
    statusPrefix: `已按角色自动切换预设（${currentRoleContext.value?.name ?? '当前角色'}）`,
    silentWhenSame: true,
  });
}

function onGlobalPresetSelectionChanged(): void {
  closeRolePicker();
  if (!selectedGlobalPresetId.value) {
    updatePersistedState(state => {
      state.last_global_preset_id = '';
      state.role_override_baseline = null;
    });
    if (bindings.global.length) {
      void applyGlobalWorldbooks([], '已切换到默认预设（清空全局世界书）');
    } else {
      setStatus('已切换到默认预设');
    }
    return;
  }
  void applySelectedGlobalPreset();
}

function bindRoleToSelectedPreset(role: PresetRoleBinding): void {
  const preset = selectedGlobalPreset.value;
  if (!preset) {
    toastr.warning('请先选择预设');
    return;
  }
  updatePersistedState(state => {
    state.global_presets = (state.global_presets ?? []).map(item => {
      if (item.id !== preset.id) {
        return item;
      }
      const nextBindings = normalizePresetRoleBindings([
        ...item.role_bindings.filter(binding => binding.key !== role.key),
        {
          key: role.key,
          name: role.name,
          avatar: role.avatar,
          updated_at: Date.now(),
        } satisfies PresetRoleBinding,
      ]);
      return {
        ...item,
        role_bindings: nextBindings,
        updated_at: Date.now(),
      };
    });
    state.last_global_preset_id = preset.id;
  });
  setStatus(`已绑定角色到预设: ${role.name} → ${preset.name}`);
}

function bindCurrentRoleToSelectedPreset(): void {
  const role = currentRoleContext.value;
  if (!role) {
    toastr.warning('当前没有可绑定的角色');
    return;
  }
  bindRoleToSelectedPreset(role);
}

function bindRoleCandidateToSelectedPreset(candidate: RoleBindingCandidate): void {
  if (candidate.bound) {
    return;
  }
  bindRoleToSelectedPreset(candidate);
  closeRolePicker();
}

function removeRoleBindingFromSelectedPreset(bindingKey: string): void {
  const preset = selectedGlobalPreset.value;
  if (!preset || !bindingKey) {
    return;
  }
  updatePersistedState(state => {
    state.global_presets = (state.global_presets ?? []).map(item => {
      if (item.id !== preset.id) {
        return item;
      }
      return {
        ...item,
        role_bindings: item.role_bindings.filter(binding => binding.key !== bindingKey),
        updated_at: Date.now(),
      };
    });
  });
}

function unbindCurrentRoleFromSelectedPreset(): void {
  const role = currentRoleContext.value;
  if (!role) {
    toastr.warning('当前没有可解绑的角色');
    return;
  }
  removeRoleBindingFromSelectedPreset(role.key);
  setStatus(`已解绑角色: ${role.name}`);
}

function saveCurrentAsGlobalPreset(): void {
  const current = getCurrentGlobalWorldbookSet();
  if (!current.length) {
    toastr.warning('当前全局世界书为空，无法保存预设');
    return;
  }
  const defaultName = selectedGlobalPreset.value?.name || `全局预设 ${globalWorldbookPresets.value.length + 1}`;
  const nameRaw = prompt('请输入预设名称', defaultName);
  const name = toStringSafe(nameRaw).trim();
  if (!name) {
    return;
  }
  const sameNamePreset = globalWorldbookPresets.value.find(item => item.name === name);
  if (sameNamePreset && !confirm(`预设 "${name}" 已存在，是否覆盖？`)) {
    return;
  }
  const presetId = sameNamePreset?.id || createId('global-preset');
  const nextPreset: GlobalWorldbookPreset = {
    id: presetId,
    name,
    worldbooks: current,
    role_bindings: sameNamePreset?.role_bindings ?? [],
    updated_at: Date.now(),
  };
  updatePersistedState(state => {
    const list = (state.global_presets ?? []).filter(item => item.id !== presetId);
    list.unshift(nextPreset);
    state.global_presets = list.slice(0, GLOBAL_PRESET_LIMIT);
    state.last_global_preset_id = presetId;
  });
  selectedGlobalPresetId.value = presetId;
  setStatus(`已保存预设: ${name}（${current.length} 本）`);
  toastr.success(`已保存预设: ${name}`);
}

function overwriteSelectedGlobalPreset(): void {
  const preset = selectedGlobalPreset.value;
  if (!preset) {
    return;
  }
  const current = getCurrentGlobalWorldbookSet();
  if (!current.length) {
    toastr.warning('当前全局世界书为空，无法覆盖预设');
    return;
  }
  if (!confirm(`确定用当前全局世界书覆盖预设 "${preset.name}" 吗？`)) {
    return;
  }
  updatePersistedState(state => {
    state.global_presets = (state.global_presets ?? []).map(item => {
      if (item.id !== preset.id) {
        return item;
      }
      return {
        ...item,
        worldbooks: current,
        updated_at: Date.now(),
      };
    });
    state.last_global_preset_id = preset.id;
  });
  setStatus(`已覆盖预设: ${preset.name}（${current.length} 本）`);
  toastr.success(`已覆盖预设: ${preset.name}`);
}

function deleteSelectedGlobalPreset(): void {
  const preset = selectedGlobalPreset.value;
  if (!preset) {
    return;
  }
  if (!confirm(`确定删除预设 "${preset.name}" 吗？`)) {
    return;
  }
  updatePersistedState(state => {
    state.global_presets = (state.global_presets ?? []).filter(item => item.id !== preset.id);
    if (state.last_global_preset_id === preset.id) {
      state.last_global_preset_id = '';
    }
  });
  selectedGlobalPresetId.value = '';
  setStatus(`已删除预设: ${preset.name}`);
}

function closeRolePicker(): void {
  rolePickerOpen.value = false;
}

function openRolePicker(): void {
  if (!selectedGlobalPreset.value) {
    return;
  }
  roleBindSearchText.value = '';
  refreshRoleBindingCandidates();
  rolePickerOpen.value = true;
  void nextTick(() => {
    rolePickerSearchInputRef.value?.focus();
  });
}

function resetFocusPanels(): void {
  focusMetaPanel.comment = false;
  focusMetaPanel.keywords = false;
  focusSidePanelState.strategy = true;
  focusSidePanelState.insertion = true;
  focusSidePanelState.recursion = true;
  focusToolsExpanded.value = false;
  focusToolsTriggerVisible.value = true;
  focusWorldbookMenuOpen.value = false;
}

function toggleFocusMetaPanel(panel: FocusMetaPanelKey): void {
  focusMetaPanel[panel] = !focusMetaPanel[panel];
}

function toggleFocusSidePanel(panel: FocusSidePanelKey): void {
  focusSidePanelState[panel] = !focusSidePanelState[panel];
}

function closeFocusWorldbookMenu(): void {
  focusWorldbookMenuOpen.value = false;
}

function toggleFocusWorldbookMenu(): void {
  if (isAnyCineLocked.value) {
    return;
  }
  if (!focusWorldbookMenuOpen.value) {
    closeFocusToolsBand();
  }
  focusWorldbookMenuOpen.value = !focusWorldbookMenuOpen.value;
}

function openFocusToolsBand(): void {
  if (isAnyCineLocked.value) {
    return;
  }
  if (focusToolsExpanded.value || !focusToolsTriggerVisible.value) {
    return;
  }
  closeFocusWorldbookMenu();
  focusToolsTriggerVisible.value = false;
  focusToolsExpanded.value = true;
}

function closeFocusToolsBand(): void {
  if (!focusToolsExpanded.value) {
    focusToolsTriggerVisible.value = true;
    return;
  }
  focusToolsExpanded.value = false;
}

function onFocusToolsBandAfterLeave(): void {
  if (!focusToolsExpanded.value) {
    focusToolsTriggerVisible.value = true;
  }
}

function runFocusWorldbookAction(action: 'create' | 'duplicate' | 'delete' | 'export' | 'import'): void {
  closeFocusWorldbookMenu();
  if (action === 'create') {
    void createNewWorldbook();
    return;
  }
  if (action === 'duplicate') {
    void duplicateWorldbook();
    return;
  }
  if (action === 'delete') {
    void deleteCurrentWorldbook();
    return;
  }
  if (action === 'export') {
    exportCurrentWorldbook();
    return;
  }
  triggerImport();
}

function waitForFrame(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => resolve());
  });
}

function waitForDuration(ms: number): Promise<void> {
  return new Promise(resolve => {
    window.setTimeout(resolve, ms);
  });
}

function applyFocusEditingState(nextFocus: boolean): void {
  isFocusEditing.value = nextFocus;
  if (nextFocus) {
    resetFocusPanels();
  } else {
    closeFocusWorldbookMenu();
    closeFocusToolsBand();
  }
}

function collectFocusAnimatedKeys(
  root: HTMLElement,
  attribute: 'data-focus-hero' | 'data-focus-sink' | 'data-copy-hero' | 'data-copy-sink',
): Set<FocusHeroKey> {
  const keys = new Set<FocusHeroKey>();
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(`[${attribute}]`));
  for (const node of nodes) {
    const rawKey = node.getAttribute(attribute);
    const key = rawKey ? rawKey.trim() : '';
    if (key) {
      keys.add(key);
    }
  }
  return keys;
}

function collectFocusHeroSnapshots(): Map<FocusHeroKey, FocusHeroSnapshot> {
  const snapshots = new Map<FocusHeroKey, FocusHeroSnapshot>();
  const root = rootRef.value;
  if (!root) {
    return snapshots;
  }

  const keys = collectFocusAnimatedKeys(root, 'data-focus-hero');
  for (const key of keys) {
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(`[data-focus-hero="${key}"]`));
    const element = nodes.find(node => {
      if (!node.isConnected) {
        return false;
      }
      const style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) <= 0) {
        return false;
      }
      const rect = node.getBoundingClientRect();
      return rect.width > 1 && rect.height > 1;
    }) ?? nodes[0];
    if (!element) {
      continue;
    }
    const rect = element.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) {
      continue;
    }
    snapshots.set(key, { key, element, rect });
  }

  return snapshots;
}

function collectFocusSinkSnapshots(): Map<FocusHeroKey, FocusSinkSnapshot> {
  const snapshots = new Map<FocusHeroKey, FocusSinkSnapshot>();
  const root = rootRef.value;
  if (!root) {
    return snapshots;
  }
  const keys = collectFocusAnimatedKeys(root, 'data-focus-sink');
  for (const key of keys) {
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(`[data-focus-sink="${key}"]`));
    const element = nodes.find(node => node.isConnected && node.getBoundingClientRect().width > 1 && node.getBoundingClientRect().height > 1) ?? null;
    if (!element) {
      continue;
    }
    const rect = element.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) {
      continue;
    }
    snapshots.set(key, { key, element, rect });
  }
  return snapshots;
}

function collectCopyHeroSnapshots(): Map<FocusHeroKey, FocusHeroSnapshot> {
  const snapshots = new Map<FocusHeroKey, FocusHeroSnapshot>();
  const root = rootRef.value;
  if (!root) {
    return snapshots;
  }

  const keys = collectFocusAnimatedKeys(root, 'data-copy-hero');
  for (const key of keys) {
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(`[data-copy-hero="${key}"]`));
    const visibleNodes = nodes.filter(node => {
      if (!node.isConnected) {
        return false;
      }
      const style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) <= 0) {
        return false;
      }
      const rect = node.getBoundingClientRect();
      return rect.width > 1 && rect.height > 1;
    });
    const element = visibleNodes[visibleNodes.length - 1] ?? nodes[nodes.length - 1] ?? null;
    if (!element) {
      continue;
    }
    const rect = element.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) {
      continue;
    }
    snapshots.set(key, { key, element, rect });
  }

  return snapshots;
}

function collectCopySinkSnapshots(): Map<FocusHeroKey, FocusSinkSnapshot> {
  const snapshots = new Map<FocusHeroKey, FocusSinkSnapshot>();
  const root = rootRef.value;
  if (!root) {
    return snapshots;
  }
  const keys = collectFocusAnimatedKeys(root, 'data-copy-sink');
  for (const key of keys) {
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(`[data-copy-sink="${key}"]`));
    const element = nodes.find(node => node.isConnected && node.getBoundingClientRect().width > 1 && node.getBoundingClientRect().height > 1) ?? null;
    if (!element) {
      continue;
    }
    const rect = element.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) {
      continue;
    }
    snapshots.set(key, { key, element, rect });
  }
  return snapshots;
}

function resolveFocusFallbackRect(
  heroMap: Map<FocusHeroKey, FocusHeroSnapshot>,
  sinkMap: Map<FocusHeroKey, FocusSinkSnapshot>,
): DOMRect | null {
  for (const key of FOCUS_FALLBACK_PRIORITY) {
    const hero = heroMap.get(key);
    if (hero) {
      return hero.rect;
    }
  }
  for (const key of FOCUS_FALLBACK_PRIORITY) {
    const sink = sinkMap.get(key);
    if (sink) {
      return sink.rect;
    }
  }
  for (const hero of heroMap.values()) {
    return hero.rect;
  }
  for (const sink of sinkMap.values()) {
    return sink.rect;
  }
  return null;
}

function buildFocusGhostKeyOrder(
  sourceMap: Map<FocusHeroKey, FocusHeroSnapshot>,
  targetMap: Map<FocusHeroKey, FocusHeroSnapshot>,
  sourceSinkMap: Map<FocusHeroKey, FocusSinkSnapshot>,
  targetSinkMap: Map<FocusHeroKey, FocusSinkSnapshot>,
): FocusHeroKey[] {
  const keySet = new Set<FocusHeroKey>();
  for (const key of sourceMap.keys()) {
    keySet.add(key);
  }
  for (const key of targetMap.keys()) {
    keySet.add(key);
  }
  for (const key of sourceSinkMap.keys()) {
    keySet.add(key);
  }
  for (const key of targetSinkMap.keys()) {
    keySet.add(key);
  }

  const ordered: FocusHeroKey[] = [];
  for (const key of FOCUS_FALLBACK_PRIORITY) {
    if (keySet.delete(key)) {
      ordered.push(key);
    }
  }
  const remaining = Array.from(keySet).sort((a, b) => a.localeCompare(b));
  ordered.push(...remaining);
  return ordered;
}

function resolveCopyFallbackRect(
  heroMap: Map<FocusHeroKey, FocusHeroSnapshot>,
  sinkMap: Map<FocusHeroKey, FocusSinkSnapshot>,
): DOMRect | null {
  for (const key of COPY_FALLBACK_PRIORITY) {
    const hero = heroMap.get(key);
    if (hero) {
      return hero.rect;
    }
  }
  for (const key of COPY_FALLBACK_PRIORITY) {
    const sink = sinkMap.get(key);
    if (sink) {
      return sink.rect;
    }
  }
  for (const hero of heroMap.values()) {
    return hero.rect;
  }
  for (const sink of sinkMap.values()) {
    return sink.rect;
  }
  return null;
}

function buildCopyGhostKeyOrder(
  sourceMap: Map<FocusHeroKey, FocusHeroSnapshot>,
  targetMap: Map<FocusHeroKey, FocusHeroSnapshot>,
  sourceSinkMap: Map<FocusHeroKey, FocusSinkSnapshot>,
  targetSinkMap: Map<FocusHeroKey, FocusSinkSnapshot>,
): FocusHeroKey[] {
  const keySet = new Set<FocusHeroKey>();
  for (const key of sourceMap.keys()) {
    keySet.add(key);
  }
  for (const key of targetMap.keys()) {
    keySet.add(key);
  }
  for (const key of sourceSinkMap.keys()) {
    keySet.add(key);
  }
  for (const key of targetSinkMap.keys()) {
    keySet.add(key);
  }

  const ordered: FocusHeroKey[] = [];
  for (const key of COPY_FALLBACK_PRIORITY) {
    if (keySet.delete(key)) {
      ordered.push(key);
    }
  }
  const remaining = Array.from(keySet).sort((a, b) => a.localeCompare(b));
  ordered.push(...remaining);
  return ordered;
}

function clearFocusCineArtifacts(): void {
  for (const node of focusCineGhostNodes) {
    node.remove();
  }
  focusCineGhostNodes = [];

  for (const node of focusCineHiddenNodes) {
    node.classList.remove('focus-cine-real-hidden');
  }
  focusCineHiddenNodes = [];
}

function clearCopyCineArtifacts(): void {
  for (const node of copyCineGhostNodes) {
    node.remove();
  }
  copyCineGhostNodes = [];

  for (const node of copyCineHiddenNodes) {
    node.classList.remove('copy-cine-real-hidden');
  }
  copyCineHiddenNodes = [];
}

function mountFocusCineGhosts(
  sourceMap: Map<FocusHeroKey, FocusHeroSnapshot>,
  targetMap: Map<FocusHeroKey, FocusHeroSnapshot>,
  sourceSinkMap: Map<FocusHeroKey, FocusSinkSnapshot>,
  targetSinkMap: Map<FocusHeroKey, FocusSinkSnapshot>,
): number {
  clearFocusCineArtifacts();
  const overlay = focusCineOverlayRef.value;
  if (!overlay) {
    return 0;
  }
  const sourceFallbackRect = resolveFocusFallbackRect(sourceMap, sourceSinkMap);
  const targetFallbackRect = resolveFocusFallbackRect(targetMap, targetSinkMap);
  const sourceElementFallback = sourceMap.get('focus_toggle')?.element ?? targetMap.get('focus_toggle')?.element ?? null;
  const hiddenTargets = new Set<HTMLElement>();
  const orderedKeys = buildFocusGhostKeyOrder(sourceMap, targetMap, sourceSinkMap, targetSinkMap);
  let index = 0;

  for (const key of orderedKeys) {
    const sourceSelf = sourceMap.get(key) ?? null;
    const targetSelf = targetMap.get(key) ?? null;
    const sourceSink = sourceSinkMap.get(key) ?? null;
    const targetSink = targetSinkMap.get(key) ?? null;

    if (!sourceSelf && !targetSelf && !sourceSink && !targetSink) {
      continue;
    }

    const startRect = sourceSelf?.rect ?? sourceSink?.rect ?? sourceFallbackRect;
    const endRect = targetSelf?.rect ?? targetSink?.rect ?? targetFallbackRect;
    if (!startRect || !endRect) {
      continue;
    }
    const sourceElement = sourceSelf?.element ?? targetSelf?.element ?? sourceElementFallback;
    if (!sourceElement) {
      continue;
    }
    const ghost = sourceElement.cloneNode(true) as HTMLElement;
    ghost.classList.add('focus-cine-ghost');
    ghost.removeAttribute('id');
    ghost.removeAttribute('data-focus-hero');
    ghost.setAttribute('aria-hidden', 'true');

    const startWidth = Math.max(1, startRect.width);
    const startHeight = Math.max(1, startRect.height);
    const endWidth = Math.max(1, endRect.width);
    const endHeight = Math.max(1, endRect.height);
    const dx = endRect.left - startRect.left;
    const dy = endRect.top - startRect.top;
    const scaleX = clampNumber(endWidth / startWidth, 0.72, 1.42);
    const scaleY = clampNumber(endHeight / startHeight, 0.72, 1.42);
    const arcYOffset = -14;

    ghost.style.left = `${startRect.left}px`;
    ghost.style.top = `${startRect.top}px`;
    ghost.style.width = `${startWidth}px`;
    ghost.style.height = `${startHeight}px`;
    ghost.style.setProperty('--cine-dx', `${dx}px`);
    ghost.style.setProperty('--cine-dy', `${dy}px`);
    ghost.style.setProperty('--cine-scale-x', `${scaleX}`);
    ghost.style.setProperty('--cine-scale-y', `${scaleY}`);
    ghost.style.setProperty('--cine-arc-y', `${arcYOffset}px`);
    ghost.style.setProperty('--cine-from-opacity', sourceSelf ? '1' : '0');
    ghost.style.setProperty('--cine-to-opacity', targetSelf ? '1' : '0');
    ghost.style.animationDuration = `${FOCUS_CINE_DURATION}ms`;
    ghost.style.animationTimingFunction = FOCUS_CINE_EASE;
    const delaySteps = Math.min(index, FOCUS_CINE_MAX_STAGGER_STEPS);
    ghost.style.animationDelay = `${delaySteps * FOCUS_CINE_STAGGER}ms`;

    overlay.appendChild(ghost);
    focusCineGhostNodes.push(ghost);

    if (targetSelf && !hiddenTargets.has(targetSelf.element)) {
      hiddenTargets.add(targetSelf.element);
      targetSelf.element.classList.add('focus-cine-real-hidden');
      focusCineHiddenNodes.push(targetSelf.element);
    }
    index += 1;
  }

  return index;
}

function mountCopyCineGhosts(
  sourceMap: Map<FocusHeroKey, FocusHeroSnapshot>,
  targetMap: Map<FocusHeroKey, FocusHeroSnapshot>,
  sourceSinkMap: Map<FocusHeroKey, FocusSinkSnapshot>,
  targetSinkMap: Map<FocusHeroKey, FocusSinkSnapshot>,
): number {
  clearCopyCineArtifacts();
  const overlay = copyCineOverlayRef.value;
  if (!overlay) {
    return 0;
  }
  const sourceFallbackRect = resolveCopyFallbackRect(sourceMap, sourceSinkMap);
  const targetFallbackRect = resolveCopyFallbackRect(targetMap, targetSinkMap);
  const sourceElementFallback =
    sourceMap.get('tool_copy')?.element
    ?? targetMap.get('tool_copy')?.element
    ?? sourceMap.get('find_btn')?.element
    ?? targetMap.get('find_btn')?.element
    ?? null;
  const hiddenTargets = new Set<HTMLElement>();
  const orderedKeys = buildCopyGhostKeyOrder(sourceMap, targetMap, sourceSinkMap, targetSinkMap);
  let index = 0;

  for (const key of orderedKeys) {
    const sourceSelf = sourceMap.get(key) ?? null;
    const targetSelf = targetMap.get(key) ?? null;
    const sourceSink = sourceSinkMap.get(key) ?? null;
    const targetSink = targetSinkMap.get(key) ?? null;

    if (!sourceSelf && !targetSelf && !sourceSink && !targetSink) {
      continue;
    }

    const startRect = sourceSelf?.rect ?? sourceSink?.rect ?? sourceFallbackRect;
    const endRect = targetSelf?.rect ?? targetSink?.rect ?? targetFallbackRect;
    if (!startRect || !endRect) {
      continue;
    }
    const sourceElement = sourceSelf?.element ?? targetSelf?.element ?? sourceElementFallback;
    if (!sourceElement) {
      continue;
    }
    const ghost = sourceElement.cloneNode(true) as HTMLElement;
    ghost.classList.add('copy-cine-ghost');
    ghost.removeAttribute('id');
    ghost.removeAttribute('data-copy-hero');
    ghost.setAttribute('aria-hidden', 'true');

    const startWidth = Math.max(1, startRect.width);
    const startHeight = Math.max(1, startRect.height);
    const endWidth = Math.max(1, endRect.width);
    const endHeight = Math.max(1, endRect.height);
    const dx = endRect.left - startRect.left;
    const dy = endRect.top - startRect.top;
    const scaleX = clampNumber(endWidth / startWidth, 0.72, 1.42);
    const scaleY = clampNumber(endHeight / startHeight, 0.72, 1.42);
    const arcYOffset = -10;

    ghost.style.left = `${startRect.left}px`;
    ghost.style.top = `${startRect.top}px`;
    ghost.style.width = `${startWidth}px`;
    ghost.style.height = `${startHeight}px`;
    ghost.style.setProperty('--copy-cine-dx', `${dx}px`);
    ghost.style.setProperty('--copy-cine-dy', `${dy}px`);
    ghost.style.setProperty('--copy-cine-scale-x', `${scaleX}`);
    ghost.style.setProperty('--copy-cine-scale-y', `${scaleY}`);
    ghost.style.setProperty('--copy-cine-arc-y', `${arcYOffset}px`);
    ghost.style.setProperty('--copy-cine-from-opacity', sourceSelf ? '1' : '0');
    ghost.style.setProperty('--copy-cine-to-opacity', targetSelf ? '1' : '0');
    ghost.style.animationDuration = `${COPY_CINE_DURATION}ms`;
    ghost.style.animationTimingFunction = COPY_CINE_EASE;
    const delaySteps = Math.min(index, COPY_CINE_MAX_STAGGER_STEPS);
    ghost.style.animationDelay = `${delaySteps * COPY_CINE_STAGGER}ms`;

    overlay.appendChild(ghost);
    copyCineGhostNodes.push(ghost);

    if (targetSelf && !hiddenTargets.has(targetSelf.element)) {
      hiddenTargets.add(targetSelf.element);
      targetSelf.element.classList.add('copy-cine-real-hidden');
      copyCineHiddenNodes.push(targetSelf.element);
    }
    index += 1;
  }

  return index;
}

async function runFocusCinematicTransition(nextFocus: boolean): Promise<void> {
  if (isAnyCineLocked.value) {
    return;
  }
  const token = ++focusCineToken;
  focusCineLocked.value = true;
  focusCineDirection.value = nextFocus ? 'enter' : 'exit';
  focusCinePhase.value = 'prepare';

  try {
    await nextTick();
    const sourceMap = collectFocusHeroSnapshots();
    const sourceSinkMap = collectFocusSinkSnapshots();

    applyFocusEditingState(nextFocus);
    await nextTick();
    await waitForFrame();
    await waitForFrame();

    const targetMap = collectFocusHeroSnapshots();
    const targetSinkMap = collectFocusSinkSnapshots();
    const ghostCount = mountFocusCineGhosts(sourceMap, targetMap, sourceSinkMap, targetSinkMap);
    if (token !== focusCineToken) {
      return;
    }
    if (ghostCount <= 0) {
      focusCinePhase.value = 'settling';
      await nextTick();
      clampPaneWidths();
      persistLayoutState();
      return;
    }

    focusCinePhase.value = 'running';
    const staggerTail = Math.min(Math.max(ghostCount - 1, 0), FOCUS_CINE_MAX_STAGGER_STEPS) * FOCUS_CINE_STAGGER;
    const totalDuration = FOCUS_CINE_DURATION + staggerTail + 40;
    await waitForDuration(totalDuration);
    if (token !== focusCineToken) {
      return;
    }

    focusCinePhase.value = 'settling';
    clearFocusCineArtifacts();
    await nextTick();
    clampPaneWidths();
    persistLayoutState();
  } catch (error) {
    console.error('[focus-cine] transition failed', error);
    await nextTick();
    clampPaneWidths();
    persistLayoutState();
  } finally {
    if (token === focusCineToken) {
      clearFocusCineArtifacts();
      focusCinePhase.value = 'idle';
      focusCineLocked.value = false;
    }
  }
}

async function runCrossCopyCinematicTransition(nextCrossCopy: boolean): Promise<void> {
  if (isAnyCineLocked.value) {
    return;
  }
  const token = ++copyCineToken;
  copyCineLocked.value = true;
  copyCineDirection.value = nextCrossCopy ? 'enter' : 'exit';
  copyCinePhase.value = 'prepare';
  let switched = false;

  try {
    await nextTick();
    const sourceMap = collectCopyHeroSnapshots();
    const sourceSinkMap = collectCopySinkSnapshots();

    setCrossCopyModeActive(nextCrossCopy);
    switched = true;
    await nextTick();
    await waitForFrame();
    await waitForFrame();

    const targetMap = collectCopyHeroSnapshots();
    const targetSinkMap = collectCopySinkSnapshots();
    const ghostCount = mountCopyCineGhosts(sourceMap, targetMap, sourceSinkMap, targetSinkMap);
    if (token !== copyCineToken) {
      return;
    }
    if (ghostCount <= 0) {
      copyCinePhase.value = 'settling';
      await nextTick();
      clampPaneWidths();
      persistLayoutState();
      return;
    }

    copyCinePhase.value = 'running';
    const staggerTail = Math.min(Math.max(ghostCount - 1, 0), COPY_CINE_MAX_STAGGER_STEPS) * COPY_CINE_STAGGER;
    const totalDuration = COPY_CINE_DURATION + staggerTail + 40;
    await waitForDuration(totalDuration);
    if (token !== copyCineToken) {
      return;
    }

    copyCinePhase.value = 'settling';
    clearCopyCineArtifacts();
    await nextTick();
    clampPaneWidths();
    persistLayoutState();
  } catch (error) {
    console.error('[copy-cine] transition failed', error);
    if (!switched) {
      setCrossCopyModeActive(nextCrossCopy);
    }
    await nextTick();
    clampPaneWidths();
    persistLayoutState();
  } finally {
    if (token === copyCineToken) {
      clearCopyCineArtifacts();
      copyCinePhase.value = 'idle';
      copyCineLocked.value = false;
    }
  }
}

function toggleFocusEditing(): void {
  if (isAnyCineLocked.value) {
    return;
  }
  const nextFocus = !isFocusEditing.value;
  if (!focusCineEnabled.value) {
    applyFocusEditingState(nextFocus);
    void nextTick(() => {
      clampPaneWidths();
      persistLayoutState();
    });
    return;
  }
  void runFocusCinematicTransition(nextFocus);
}

function toggleRolePicker(): void {
  if (rolePickerOpen.value) {
    closeRolePicker();
    return;
  }
  void openRolePicker();
}

function toggleTheme(): void {
  const keys = Object.keys(THEMES) as ThemeKey[];
  const index = keys.indexOf(currentTheme.value);
  const nextIndex = (index + 1) % keys.length;
  currentTheme.value = keys[nextIndex];
  setStatus(`已切换主题: ${THEMES[currentTheme.value].name}`);
}

function setTheme(key: ThemeKey): void {
  currentTheme.value = key;
  themePickerOpen.value = false;
  setStatus(`已切换主题: ${THEMES[key].label}`);
}

function onSetThemeEvent(event: Event): void {
  const key = (event as CustomEvent).detail as string;
  if (key && key in THEMES) {
    setTheme(key as ThemeKey);
  }
}

function bindFirstRoleCandidate(): void {
  const first = roleBindingCandidates.value.find(item => !item.bound);
  if (!first) {
    return;
  }
  bindRoleCandidateToSelectedPreset(first);
}

function onHostPointerDownForOpenMenus(event: PointerEvent): void {
  if (!rolePickerOpen.value && !themePickerOpen.value && !focusWorldbookMenuOpen.value) {
    return;
  }
  const target = event.target as Node | null;
  if (!target) {
    closeRolePicker();
    closeFocusWorldbookMenu();
    themePickerOpen.value = false;
    return;
  }

  if (rolePickerOpen.value) {
    const roleRoot = rolePickerRef.value;
    if (!roleRoot || !roleRoot.contains(target)) {
      closeRolePicker();
    }
  }

  if (themePickerOpen.value) {
    themePickerOpen.value = false;
  }

  if (focusWorldbookMenuOpen.value) {
    const focusMenuRoot = focusWorldbookMenuRef.value;
    if (!focusMenuRoot || !focusMenuRoot.contains(target)) {
      closeFocusWorldbookMenu();
    }
  }
}

function onHostKeyDownForOpenMenus(event: KeyboardEvent): void {
  if (!rolePickerOpen.value && !focusWorldbookMenuOpen.value) {
    return;
  }
  if (event.key === 'Escape') {
    closeRolePicker();
    closeFocusWorldbookMenu();
  }
}

async function loadWorldbook(name: string): Promise<void> {
  if (!name) {
    return;
  }
  const requestId = ++worldbookLoadRequestId;
  pendingWorldbookLoadCount += 1;
  isBusy.value = true;
  const isStaleRequest = () => requestId !== worldbookLoadRequestId || selectedWorldbookName.value !== name;
  try {
    let rawEntries: WorldbookEntry[];
    try {
      rawEntries = await getWorldbook(name);
    } catch {
      // Fallback: try trimmed name in case of whitespace mismatch
      rawEntries = await getWorldbook(name.trim());
    }
    if (isStaleRequest()) {
      return;
    }
    const normalized = normalizeEntryList(rawEntries);
    draftEntries.value = klona(normalized);
    originalEntries.value = klona(normalized);
    syncEntriesDigestNow();
    ensureSelectedEntryExists();
    setStatus(`已加载 "${name}"，条目 ${normalized.length}`);
  } catch (error) {
    if (isStaleRequest()) {
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (name !== name.trim()) {
      toastr.error(`读取世界书失败: 世界书名称「${name.trim()}」首尾含有空格，请在酒馆中重命名该世界书以去除空格`);
      setStatus(`读取失败: 世界书名称含首尾空格，请重命名`);
    } else {
      toastr.error(`读取世界书失败: ${message}`);
      setStatus(`读取失败: ${message}`);
    }
  } finally {
    pendingWorldbookLoadCount = Math.max(0, pendingWorldbookLoadCount - 1);
    if (pendingWorldbookLoadCount === 0) {
      isBusy.value = false;
    }
  }
}

async function reloadWorldbookNames(preferred?: string, switchOptions: WorldbookSwitchOptions = {}): Promise<boolean> {
  const names = [...getWorldbookNames()].sort((left, right) => left.localeCompare(right, 'zh-Hans-CN'));
  worldbookNames.value = names;
  normalizeCrossCopyWorldbookSelection();
  persistCrossCopyState();

  if (!names.length) {
    const switched = switchWorldbookSelection('', {
      source: switchOptions.source ?? 'auto',
      reason: switchOptions.reason ?? '世界书列表已为空',
      allowDirty: switchOptions.allowDirty,
      silentOnCancel: true,
    });
    if (!switched) {
      setStatus('世界书列表已变化，但已保留未保存草稿');
      return false;
    }
    draftEntries.value = [];
    originalEntries.value = [];
    selectedEntryUid.value = null;
    return true;
  }

  const fallbackName = persistedState.value.last_worldbook;
  const candidate =
    (preferred && names.includes(preferred) && preferred) ||
    (fallbackName && names.includes(fallbackName) && fallbackName) ||
    selectedWorldbookName.value ||
    names[0];

  if (candidate && selectedWorldbookName.value !== candidate) {
    return switchWorldbookSelection(candidate, {
      source: switchOptions.source ?? 'auto',
      reason: switchOptions.reason ?? '同步世界书选择',
      allowDirty: switchOptions.allowDirty,
      silentOnCancel: true,
    });
  }

  if (selectedWorldbookName.value && !draftEntries.value.length) {
    await loadWorldbook(selectedWorldbookName.value);
  }
  return true;
}

async function hardRefresh(options: HardRefreshOptions = {}): Promise<void> {
  if (!ensureRefreshAllowed(options)) {
    return;
  }
  const allowDirty = hasUnsavedChanges.value;
  persistedState.value = readPersistedState();
  syncSelectedGlobalPresetFromState();
  applyCrossCopyStateFromPersisted();
  const reloaded = await reloadWorldbookNames(selectedWorldbookName.value || undefined, {
    source: options.source ?? 'auto',
    reason: options.reason ?? '刷新后同步世界书',
    allowDirty,
    silentOnCancel: true,
  });
  if (!reloaded) {
    return;
  }
  // Always re-fetch current worldbook data so external changes are synced
  if (selectedWorldbookName.value) {
    await loadWorldbook(selectedWorldbookName.value);
    // Sync raw keyword refs after reload
    selectedKeysRaw.value = selectedKeysText.value;
    selectedSecondaryKeysRaw.value = selectedSecondaryKeysText.value;
  }
  await refreshBindings();
  refreshRoleBindingCandidates();
  refreshCurrentRoleContext();
  await autoApplyRoleBoundPreset();
  if (globalWorldbookMode.value) {
    ensureSelectionForGlobalMode({
      source: options.source ?? 'auto',
      reason: '刷新后同步全局模式选择',
      allowDirty,
      silentOnCancel: true,
    });
  } else {
    trySelectWorldbookByContext({
      preferWhenEmptyOnly: options.preferContextSelection !== true,
      source: options.source ?? 'auto',
    });
  }
  setStatus('已刷新世界书和绑定信息');
}

async function saveCurrentWorldbook(): Promise<void> {
  if (!selectedWorldbookName.value) {
    toastr.warning('请先选择世界书');
    return;
  }
  if (!hasUnsavedChanges.value) {
    setStatus('当前没有需要保存的修改');
    return;
  }
  isSaving.value = true;
  try {
    draftEntries.value = normalizeEntryList(draftEntries.value.map(entry => klona(entry)));
    const pendingEntrySnapshots = collectEntrySnapshotsBeforeSave();
    const savedEntrySnapshotCount = pushEntrySnapshotsBulk(pendingEntrySnapshots);
    await replaceWorldbook(selectedWorldbookName.value, klona(draftEntries.value), { render: 'immediate' });
    originalEntries.value = klona(draftEntries.value);
    syncEntriesDigestNow();
    pushSnapshot('保存后快照');
    await refreshBindings();
    toastr.success(`已保存: ${selectedWorldbookName.value}`);
    setStatus(`保存成功: ${selectedWorldbookName.value}（条目历史 +${savedEntrySnapshotCount}）`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toastr.error(`保存失败: ${message}`);
    setStatus(`保存失败: ${message}`);
  } finally {
    isSaving.value = false;
  }
}

async function createNewWorldbook(): Promise<void> {
  const nameRaw = prompt('请输入新世界书名称');
  const name = toStringSafe(nameRaw).trim();
  if (!name) {
    return;
  }
  try {
    await createOrReplaceWorldbook(name, [], { render: 'immediate' });
    await reloadWorldbookNames(name, {
      source: 'manual',
      reason: '创建世界书后切换',
    });
    await refreshBindings();
    toastr.success(`已创建世界书: ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toastr.error(`创建失败: ${message}`);
  }
}

async function duplicateWorldbook(): Promise<void> {
  if (!selectedWorldbookName.value) {
    return;
  }
  const suggested = `${selectedWorldbookName.value}_copy`;
  const newNameRaw = prompt('请输入复制后的名称', suggested);
  const newName = toStringSafe(newNameRaw).trim();
  if (!newName) {
    return;
  }
  try {
    await createOrReplaceWorldbook(newName, klona(draftEntries.value), { render: 'immediate' });
    await reloadWorldbookNames(newName, {
      source: 'manual',
      reason: '复制世界书后切换',
    });
    await refreshBindings();
    toastr.success(`已复制为: ${newName}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toastr.error(`复制失败: ${message}`);
  }
}

async function deleteCurrentWorldbook(): Promise<void> {
  if (!selectedWorldbookName.value) {
    return;
  }
  const current = selectedWorldbookName.value;
  if (!confirm(`确定删除世界书 "${current}" ?`)) {
    return;
  }
  try {
    const success = await deleteWorldbook(current);
    if (!success) {
      throw new Error('返回 false');
    }
    updatePersistedState(state => {
      delete state.history[current];
      delete state.entry_history[current];
    });
    toastr.success(`已删除: ${current}`);
    await reloadWorldbookNames(undefined, {
      source: 'manual',
      reason: '删除世界书后同步选择',
      allowDirty: true,
    });
    await refreshBindings();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toastr.error(`删除失败: ${message}`);
  }
}

async function toggleGlobalBinding(): Promise<void> {
  if (!selectedWorldbookName.value) {
    return;
  }
  const next = new Set(getGlobalWorldbookNames());
  if (next.has(selectedWorldbookName.value)) {
    next.delete(selectedWorldbookName.value);
  } else {
    next.add(selectedWorldbookName.value);
  }
  await applyGlobalWorldbooks([...next], '已更新全局绑定');
}

function pushActivationLogs(entries: Array<{ world: string } & Record<string, unknown>>): void {
  const logs = entries.map(item => {
    const uid = item.uid ?? item.displayIndex ?? '?';
    const name = toStringSafe(item.name ?? item.comment, `UID ${uid}`);
    const content = toStringSafe(item.content).replace(/\s+/g, ' ').trim().slice(0, 80);
    return {
      id: createId('activation'),
      time: Date.now(),
      world: toStringSafe(item.world, 'unknown'),
      uid: typeof uid === 'number' || typeof uid === 'string' ? uid : '?',
      name,
      contentPreview: content || '(空内容)',
    } satisfies ActivationLog;
  });
  activationLogs.value.unshift(...logs);
  if (activationLogs.value.length > ACTIVATION_LOG_LIMIT) {
    activationLogs.value.length = ACTIVATION_LOG_LIMIT;
  }
}

function clearActivationLogs(): void {
  activationLogs.value = [];
}

function resolveHostWindow(): Window {
  return mainLayoutRef.value?.ownerDocument?.defaultView ?? editorShellRef.value?.ownerDocument?.defaultView ?? window;
}

function clampFloatingPanelToViewport(panel: FloatingPanelState): void {
  const hostWin = resolveHostWindow();
  const viewportWidth = hostWin.innerWidth;
  const viewportHeight = hostWin.innerHeight;
  const maxX = Math.max(8, viewportWidth - panel.width - 8);
  const maxY = Math.max(8, viewportHeight - 68);
  panel.x = clampNumber(panel.x, 8, maxX);
  panel.y = clampNumber(panel.y, 8, maxY);
}

function handleFloatingWindowResize(): void {
  const hostWin = resolveHostWindow();
  viewportWidth.value = hostWin.innerWidth;
  clampPaneWidths();
  for (const key of floatingPanelKeys) {
    if (!floatingPanels[key].visible) {
      continue;
    }
    clampFloatingPanelToViewport(floatingPanels[key]);
  }
}

const workspaceActivity = useWorkspaceActivity({
  active: isMainWorkspaceActive,
  getBrowseSentinel: () => browseLoadMoreSentinelRef.value,
  hasMoreBrowseEntries: () => browseHasMoreEntries.value,
  loadMoreBrowseEntries: browseLoadMore,
  getResizeTarget: () => rootRef.value?.ownerDocument?.defaultView ?? null,
  stopResizeSessions: () => {
    stopPaneResize();
    stopCrossCopyPaneResize();
    stopHistorySectionResize();
    stopContentResize();
    stopContentTopDrag();
    stopFloatingDrag();
  },
  refreshLayout: handleFloatingWindowResize,
  onResourceCountChange: counts => {
    performanceDiagnostics.setResourceCount('browse-observer', counts.browseObserverActive);
    performanceDiagnostics.setResourceCount('resize-listener', counts.resizeListenerActive);
    performanceDiagnostics.setResourceCount('workspace-frame', counts.workspaceFramePending);
  },
});

watch(browseLoadMoreSentinelRef, () => {
  workspaceActivity.refreshBrowseObservation();
});

function bringFloatingToFront(key: FloatingPanelKey): void {
  floatingZCounter.value += 1;
  floatingPanels[key].z = floatingZCounter.value;
}

function openFloatingPanel(key: FloatingPanelKey): void {
  const panel = floatingPanels[key];
  panel.visible = true;
  clampFloatingPanelToViewport(panel);
  bringFloatingToFront(key);
}

function closeFloatingPanel(key: FloatingPanelKey): void {
  floatingPanels[key].visible = false;
  if (activeFloatingDrag.value?.key === key) {
    stopFloatingDrag();
  }
}

function toggleFloatingPanel(key: FloatingPanelKey): void {
  if (focusCineLocked.value) {
    return;
  }
  if (floatingPanels[key].visible) {
    closeFloatingPanel(key);
    return;
  }
  openFloatingPanel(key);
}

function getFloatingPanelStyle(key: FloatingPanelKey): Record<string, string> {
  const panel = floatingPanels[key];
  return {
    left: `${panel.x}px`,
    top: `${panel.y}px`,
    zIndex: String(panel.z),
    width: `${panel.width}px`,
  };
}

function startFloatingDrag(key: FloatingPanelKey, event: PointerEvent): void {
  if (focusCineLocked.value) {
    return;
  }
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }
  const panel = floatingPanels[key];
  const target = event.currentTarget as HTMLElement | null;
  if (!target) {
    return;
  }
  const hostDoc = target.ownerDocument ?? document;
  const hostWin = hostDoc.defaultView ?? window;
  const rect = target.getBoundingClientRect();
  bringFloatingToFront(key);
  const dragState = {
    key,
    pointerId: event.pointerId,
    offsetX: event.clientX - panel.x,
    offsetY: event.clientY - panel.y,
    doc: hostDoc,
    win: hostWin,
  };
  activeFloatingDrag.value = dragState;
  setOwnedResourceCount('floating-session', 1);
  target.setPointerCapture?.(event.pointerId);
  hostDoc.addEventListener('pointermove', onFloatingDragMove);
  hostDoc.addEventListener('pointerup', stopFloatingDrag);
  hostDoc.addEventListener('pointercancel', stopFloatingDrag);
  hostWin.addEventListener('blur', stopFloatingDrag);
  panel.x = clampNumber(event.clientX - dragState.offsetX, 8, Math.max(8, hostWin.innerWidth - panel.width - 8));
  panel.y = clampNumber(event.clientY - dragState.offsetY, 8, Math.max(8, hostWin.innerHeight - rect.height - 8));
  event.preventDefault();
}

function onFloatingDragMove(event: PointerEvent): void {
  const drag = activeFloatingDrag.value;
  if (!drag) {
    return;
  }
  if (event.pointerId !== drag.pointerId) {
    return;
  }
  const panel = floatingPanels[drag.key];
  panel.x = clampNumber(event.clientX - drag.offsetX, 8, Math.max(8, drag.win.innerWidth - panel.width - 8));
  panel.y = clampNumber(event.clientY - drag.offsetY, 8, Math.max(8, drag.win.innerHeight - 68));
}

function stopFloatingDrag(): void {
  const drag = activeFloatingDrag.value;
  if (drag) {
    drag.doc.removeEventListener('pointermove', onFloatingDragMove);
    drag.doc.removeEventListener('pointerup', stopFloatingDrag);
    drag.doc.removeEventListener('pointercancel', stopFloatingDrag);
    drag.win.removeEventListener('blur', stopFloatingDrag);
  }
  activeFloatingDrag.value = null;
  setOwnedResourceCount('floating-session', 0);
}

function clampPaneWidths(): void {
  if (isCompactLayout.value) {
    return;
  }

  const mainMin = isDesktopFocusMode.value ? FOCUS_MAIN_PANE_MIN : MAIN_PANE_MIN;
  const sideMin = isDesktopFocusMode.value ? FOCUS_EDITOR_SIDE_MIN : EDITOR_SIDE_MIN;

  const mainRect = mainLayoutRef.value?.getBoundingClientRect();
  if (mainRect) {
    const maxLeft = Math.max(mainMin, Math.floor(mainRect.width - MAIN_EDITOR_MIN - RESIZE_HANDLE_SIZE));
    if (isDesktopFocusMode.value) {
      focusMainPaneWidth.value = clampNumber(focusMainPaneWidth.value, mainMin, maxLeft);
    } else {
      mainPaneWidth.value = clampNumber(mainPaneWidth.value, mainMin, maxLeft);
    }
  }

  const editorRect = editorShellRef.value?.getBoundingClientRect();
  if (editorRect) {
    const maxSide = Math.max(sideMin, Math.floor(editorRect.width - EDITOR_CENTER_MIN - RESIZE_HANDLE_SIZE));
    if (isDesktopFocusMode.value) {
      focusEditorSideWidth.value = clampNumber(focusEditorSideWidth.value, sideMin, maxSide);
    } else {
      editorSideWidth.value = clampNumber(editorSideWidth.value, sideMin, maxSide);
    }
  }
}

function stopContentDragSession(kind: 'resize' | 'top'): void {
  const session = kind === 'resize' ? contentResizeSession : contentTopDragSession;
  if (!session) {
    return;
  }
  if (session.rafId) {
    cancelAnimationFrame(session.rafId);
  }
  session.target.removeEventListener('pointermove', session.onMove);
  session.target.removeEventListener('pointerup', session.onStop);
  session.target.removeEventListener('pointercancel', session.onStop);
  if (session.target.hasPointerCapture?.(session.pointerId)) {
    session.target.releasePointerCapture?.(session.pointerId);
  }
  session.cleanupTransientState();
  if (kind === 'resize') {
    contentResizeSession = null;
    setOwnedResourceCount('content-session', 0);
  } else {
    contentTopDragSession = null;
    setOwnedResourceCount('top-session', 0);
  }
}

function stopContentResize(): void {
  stopContentDragSession('resize');
}

function stopContentTopDrag(): void {
  stopContentDragSession('top');
}

function startContentResize(e: PointerEvent): void {
  if (focusCineLocked.value) {
    return;
  }
  e.preventDefault();
  const textarea = contentTextareaRef.value?.$el as HTMLTextAreaElement | undefined;
  if (!textarea) return;

  stopContentResize();
  const startY = e.clientY;
  const startHeight = textarea.offsetHeight;
  const target = e.currentTarget as HTMLElement;
  target.setPointerCapture?.(e.pointerId);

  textarea.style.pointerEvents = 'none';
  textarea.style.willChange = 'height';

  let pendingHeight = startHeight;
  const applyHeight = () => {
    textarea.style.height = `${pendingHeight}px`;
    textarea.style.minHeight = `${pendingHeight}px`;
    if (contentResizeSession) {
      contentResizeSession.rafId = 0;
    }
  };
  const onMove = (ev: PointerEvent) => {
    pendingHeight = Math.max(120, startHeight + (ev.clientY - startY));
    if (contentResizeSession && !contentResizeSession.rafId) {
      contentResizeSession.rafId = requestAnimationFrame(applyHeight);
    }
  };
  const onStop = () => {
    if (contentResizeSession?.rafId) {
      cancelAnimationFrame(contentResizeSession.rafId);
      contentResizeSession.rafId = 0;
    }
    applyHeight();
    stopContentResize();
  };

  contentResizeSession = {
    pointerId: e.pointerId,
    target,
    onMove,
    onStop,
    rafId: 0,
    cleanupTransientState: () => {
      textarea.style.pointerEvents = '';
      textarea.style.willChange = '';
    },
  };
  setOwnedResourceCount('content-session', 1);
  target.addEventListener('pointermove', onMove);
  target.addEventListener('pointerup', onStop);
  target.addEventListener('pointercancel', onStop);
}

const editorContentBlockRef = ref<HTMLElement | null>(null);
let contentTopDragOffset = 0;

function startContentTopDrag(e: PointerEvent): void {
  if (focusCineLocked.value) {
    return;
  }
  e.preventDefault();
  const block = editorContentBlockRef.value;
  if (!block) return;

  stopContentTopDrag();
  const startY = e.clientY;
  const startOffset = contentTopDragOffset;
  const target = e.currentTarget as HTMLElement;
  target.setPointerCapture?.(e.pointerId);

  let pendingOffset = startOffset;
  const apply = () => {
    block.style.marginTop = `${-pendingOffset}px`;
    if (contentTopDragSession) {
      contentTopDragSession.rafId = 0;
    }
  };
  const onMove = (ev: PointerEvent) => {
    const delta = startY - ev.clientY;
    pendingOffset = Math.max(0, Math.min(400, startOffset + delta));
    if (contentTopDragSession && !contentTopDragSession.rafId) {
      contentTopDragSession.rafId = requestAnimationFrame(apply);
    }
  };
  const onStop = () => {
    if (contentTopDragSession?.rafId) {
      cancelAnimationFrame(contentTopDragSession.rafId);
      contentTopDragSession.rafId = 0;
    }
    contentTopDragOffset = pendingOffset;
    apply();
    stopContentTopDrag();
  };

  contentTopDragSession = {
    pointerId: e.pointerId,
    target,
    onMove,
    onStop,
    rafId: 0,
    cleanupTransientState: () => {
      block.style.marginTop = `${-contentTopDragOffset}px`;
    },
  };
  setOwnedResourceCount('top-session', 1);
  target.addEventListener('pointermove', onMove);
  target.addEventListener('pointerup', onStop);
  target.addEventListener('pointercancel', onStop);
}

function startPaneResize(key: PaneResizeKey, event: PointerEvent): void {
  if (focusCineLocked.value) {
    return;
  }
  if (isCompactLayout.value) {
    return;
  }
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }
  const target = event.currentTarget as HTMLElement | null;
  const hostDoc = target?.ownerDocument ?? document;
  const hostWin = hostDoc.defaultView ?? window;
  paneResizeState.value = {
    key,
    pointerId: event.pointerId,
    doc: hostDoc,
    win: hostWin,
  };
  setOwnedResourceCount('pane-session', 1);
  target?.setPointerCapture?.(event.pointerId);
  hostDoc.addEventListener('pointermove', onPaneResizeMove);
  hostDoc.addEventListener('pointerup', stopPaneResize);
  hostDoc.addEventListener('pointercancel', stopPaneResize);
  hostWin.addEventListener('blur', stopPaneResize);
  event.preventDefault();
}

function onPaneResizeMove(event: PointerEvent): void {
  const state = paneResizeState.value;
  if (!state || event.pointerId !== state.pointerId) {
    return;
  }
  if (state.key === 'main') {
    const rect = mainLayoutRef.value?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const left = Math.floor(event.clientX - rect.left);
    const minLeft = isDesktopFocusMode.value ? FOCUS_MAIN_PANE_MIN : MAIN_PANE_MIN;
    const maxLeft = Math.max(minLeft, Math.floor(rect.width - MAIN_EDITOR_MIN - RESIZE_HANDLE_SIZE));
    if (isDesktopFocusMode.value) {
      focusMainPaneWidth.value = clampNumber(left, minLeft, maxLeft);
    } else {
      mainPaneWidth.value = clampNumber(left, minLeft, maxLeft);
    }
    return;
  }

  const rect = editorShellRef.value?.getBoundingClientRect();
  if (!rect) {
    return;
  }
  const side = Math.floor(rect.right - event.clientX);
  const minSide = isDesktopFocusMode.value ? FOCUS_EDITOR_SIDE_MIN : EDITOR_SIDE_MIN;
  const maxSide = Math.max(minSide, Math.floor(rect.width - EDITOR_CENTER_MIN - RESIZE_HANDLE_SIZE));
  if (isDesktopFocusMode.value) {
    focusEditorSideWidth.value = clampNumber(side, minSide, maxSide);
  } else {
    editorSideWidth.value = clampNumber(side, minSide, maxSide);
  }
}

function stopPaneResize(): void {
  const state = paneResizeState.value;
  if (!state) {
    return;
  }
  state.doc.removeEventListener('pointermove', onPaneResizeMove);
  state.doc.removeEventListener('pointerup', stopPaneResize);
  state.doc.removeEventListener('pointercancel', stopPaneResize);
  state.win.removeEventListener('blur', stopPaneResize);
  paneResizeState.value = null;
  setOwnedResourceCount('pane-session', 0);
  if (!isCompactLayout.value) {
    persistLayoutState();
  }
}

function onPanelRefresh(): void {
  void hardRefresh({ source: 'manual', reason: '手动刷新' });
}

function onPanelSave(): void {
  void saveCurrentWorldbook();
}

function discardUnsavedDraft(): void {
  if (!hasUnsavedChanges.value) {
    const target = window as unknown as Record<string, unknown>;
    target[DIRTY_STATE_KEY] = false;
    return;
  }
  draftEntries.value = klona(originalEntries.value);
  syncEntriesDigestNow();
  ensureSelectedEntryExists();
  resetFindState();
  setStatus('已放弃未保存修改');
}

function onPanelDiscard(): void {
  discardUnsavedDraft();
}

let _mobileResizeHandler: (() => void) | null = null;

onMounted(() => {
  performanceDiagnostics.incrementMount('main');
  // Fix mobile height: compute exact pixel height based on viewport position
  if (isMobile.value && rootRef.value) {
    const hostWin = (() => { try { return window.parent || window; } catch { return window; } })();
    const el = rootRef.value;

    const syncHeight = () => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = hostWin.innerHeight || window.innerHeight || 0;
      const available = vh - rect.top;
      if (available > 0) {
        el.style.height = available + 'px';
        el.style.maxHeight = available + 'px';
        el.style.overflow = 'hidden';
      }
    };

    // Initial + delayed (wait for layout)
    syncHeight();
    requestAnimationFrame(syncHeight);
    setTimeout(syncHeight, 300);

    // Only recalculate on orientation change (screen rotation),
    // NOT on resize (keyboard open/close triggers resize and would compress the panel)
    _mobileResizeHandler = () => setTimeout(syncHeight, 300);
    hostWin.addEventListener('orientationchange', _mobileResizeHandler);
  }
  persistedState.value = readPersistedState();
  syncSelectedGlobalPresetFromState();
  applyLayoutStateFromPersisted();
  applyCrossCopyStateFromPersisted();
  applyPanelModeFromPersisted();
  if (isFocusEditing.value) {
    resetFocusPanels();
  }

  subscriptions.push(
    eventOn(tavern_events.WORLD_INFO_ACTIVATED, entries => {
      pushActivationLogs(entries as Array<{ world: string } & Record<string, unknown>>);
    }),
  );
  subscriptions.push(
    eventOn(tavern_events.WORLDINFO_UPDATED, () => {
      void hardRefresh({ source: 'auto', reason: '世界书数据已更新' });
    }),
  );
  subscriptions.push(
    eventOn(tavern_events.CHAT_CHANGED, () => {
      void (async () => {
        await refreshBindings();
        refreshRoleBindingCandidates();
        refreshCurrentRoleContext();
        await autoApplyRoleBoundPreset();
        if (globalWorldbookMode.value) {
          ensureSelectionForGlobalMode({
            source: 'auto',
            reason: '聊天切换后同步全局模式选择',
            silentOnCancel: true,
          });
          return;
        }
        trySelectWorldbookByContext({ source: 'auto' });
      })();
    }),
  );

  window.addEventListener('wb-helper:refresh', onPanelRefresh);
  window.addEventListener('wb-helper:save', onPanelSave);
  window.addEventListener('wb-helper:discard', onPanelDiscard);
  window.addEventListener('wb-helper:toggle-theme', toggleTheme);
  window.addEventListener('wb-helper:set-theme', onSetThemeEvent);
  window.addEventListener(FAB_VISIBLE_CHANGED_EVENT, onFabVisibleChanged);
  window.dispatchEvent(new CustomEvent(FAB_VISIBLE_SET_EVENT, { detail: fabVisible.value }));
  hostResizeWindow.value = resolveHostWindow();
  workspaceActivity.refreshResizeTarget();
  const hostDoc = hostResizeWindow.value.document;
  hostDoc.addEventListener('pointerdown', onHostPointerDownForOpenMenus, true);
  hostDoc.addEventListener('keydown', onHostKeyDownForOpenMenus, true);

  handleFloatingWindowResize();
  updateHostPanelTheme();
  void hardRefresh({
    source: 'manual',
    reason: '初始化加载',
    preferContextSelection: true,
  });
});

onUnmounted(() => {
  navigationMeasurementFrame.dispose();
  performanceDiagnostics.setResourceCount('navigation-frame', 0);
  const globalTarget = globalThis as Record<string, unknown>;
  if (globalTarget[performanceSnapshotKey] === localPerformanceSnapshot) {
    delete globalTarget[performanceSnapshotKey];
  }
  focusCineToken += 1;
  focusCineLocked.value = false;
  focusCinePhase.value = 'idle';
  clearFocusCineArtifacts();
  copyCineToken += 1;
  copyCineLocked.value = false;
  copyCinePhase.value = 'idle';
  clearCopyCineArtifacts();
  if (entriesDigestTimer) {
    clearTimeout(entriesDigestTimer);
    entriesDigestTimer = null;
  }
  if (keysDebounceTimer) {
    clearTimeout(keysDebounceTimer);
    keysDebounceTimer = null;
  }
  if (secondaryKeysDebounceTimer) {
    clearTimeout(secondaryKeysDebounceTimer);
    secondaryKeysDebounceTimer = null;
  }
  aiStreamSubscription?.stop();
  aiStreamSubscription = null;
  aiIsGenerating.value = false;
  aiCurrentGenerationId.value = null;
  if (_mobileResizeHandler) {
    try { (window.parent || window).removeEventListener('orientationchange', _mobileResizeHandler); } catch { /* ignore */ }
    _mobileResizeHandler = null;
  }
  const target = window as unknown as Record<string, unknown>;
  target[DIRTY_STATE_KEY] = false;
  subscriptions.forEach(subscription => {
    subscription.stop();
  });
  clearMobileLongPressState();
  closeEntryHistoryModal();
  closeWorldbookHistoryModal();
  resetCrossCopyCompare();
  stopFloatingDrag();
  stopPaneResize();
  stopCrossCopyPaneResize();
  stopHistorySectionResize();
  stopContentResize();
  stopContentTopDrag();
  window.removeEventListener('wb-helper:refresh', onPanelRefresh);
  window.removeEventListener('wb-helper:save', onPanelSave);
  window.removeEventListener('wb-helper:discard', onPanelDiscard);
  window.removeEventListener('wb-helper:toggle-theme', toggleTheme);
  window.removeEventListener('wb-helper:set-theme', onSetThemeEvent);
  window.removeEventListener(FAB_VISIBLE_CHANGED_EVENT, onFabVisibleChanged);
  hostResizeWindow.value?.document.removeEventListener('pointerdown', onHostPointerDownForOpenMenus, true);
  hostResizeWindow.value?.document.removeEventListener('keydown', onHostKeyDownForOpenMenus, true);
  hostResizeWindow.value = null;
  _screenSyncCleanup?.();
  _screenSyncCleanup = null;
});

function updateHostPanelTheme() {
  // The panel may live in the parent document (host) — try both
  let panel = document.getElementById('wb-assistant-panel');
  if (!panel) {
    try { panel = window.parent?.document?.getElementById('wb-assistant-panel') ?? null; } catch { /* cross-origin */ }
  }
  if (!panel) return;
  const theme = THEMES[currentTheme.value];
  const colors = theme.colors;

  panel.style.setProperty('--wb-host-bg', colors['--wb-bg-root']);
  panel.style.setProperty('--wb-host-header-bg', colors['--wb-bg-panel']);
  panel.style.setProperty('--wb-host-border', colors['--wb-border-main']);
  panel.style.setProperty('--wb-host-text', colors['--wb-text-main']);
  panel.style.setProperty('--wb-host-tool-bg', colors['--wb-input-bg']);
  panel.style.setProperty('--wb-host-tool-border', colors['--wb-border-subtle']);
  // Glass/dropdown variables for theme dropdown & host shadows
  panel.style.setProperty('--wb-host-dropdown-bg', colors['--wb-dropdown-bg'] || 'rgba(15,15,15,0.7)');
  panel.style.setProperty('--wb-host-shadow', colors['--wb-shadow-main'] || '0 12px 32px rgba(0,0,0,0.5)');
}

watch(currentTheme, () => {
  updateHostPanelTheme();
});

watch(hasUnsavedChanges, (val) => {
  const panel = document.getElementById('wb-assistant-panel');
  if (panel) {
    const saveBtn = panel.querySelector('.wb-assistant-save');
    if (saveBtn) {
      if (val) {
        saveBtn.classList.add('glow-pulse');
      } else {
        saveBtn.classList.remove('glow-pulse');
      }
    }
  }
}, { immediate: true });
</script>

<style scoped>

/* ═══ Browse Mode Styles ═══ */

.browse-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 12px;
}

.browse-search {
  flex: 1;
  min-width: 120px;
  max-width: 320px;
}

.browse-mode-switch {
  display: flex;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--wb-border-main);
  margin-left: auto;
}

.browse-mode-btn {
  border-radius: 0 !important;
  border: none !important;
  font-size: 12px;
  padding: 4px 12px;
  background: transparent;
  color: var(--wb-text-muted);
  transition: all 0.2s ease;
}

.browse-mode-btn.active {
  background: var(--wb-accent);
  color: #fff;
}

.browse-bindings {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  flex-wrap: wrap;
  font-size: 12px;
}

.binding-tag {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.binding-tag.global {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
}

.binding-tag.char {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
}

.binding-tag.chat {
  background: rgba(234, 179, 8, 0.15);
  color: #facc15;
}

.browse-entry-count {
  color: var(--wb-text-muted);
  font-size: 11px;
}

.browse-action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  flex-wrap: wrap;
  font-size: 12px;
}

.browse-action-spacer {
  flex: 1;
}

.browse-scroll-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 12px 12px;
}

.browse-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
  align-items: stretch;
}

.browse-card {
  background: var(--wb-bg-card, rgba(255, 255, 255, 0.04));
  border: 1px solid var(--wb-border-main);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.browse-card:hover {
  border-color: var(--wb-accent);
  box-shadow: 0 0 12px rgba(var(--wb-accent-rgb, 56, 189, 248), 0.15);
}

.browse-card.expanded {
  cursor: default;
  grid-column: 1 / -1;
  border-color: var(--wb-accent);
  box-shadow: 0 0 20px rgba(var(--wb-accent-rgb, 56, 189, 248), 0.1);
}

.browse-card.disabled {
  opacity: 0.55;
}

.browse-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.browse-card-title {
  flex: 1;
  font-weight: 600;
  font-size: 13px;
  color: var(--wb-text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.browse-toggle-wrap {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 11px;
  flex-shrink: 0;
}

.browse-toggle-wrap input[type="checkbox"] {
  accent-color: var(--wb-accent);
}

.browse-toggle-label {
  color: var(--wb-text-muted);
  font-weight: 600;
  font-size: 10px;
  text-transform: uppercase;
}

.browse-card-keys {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.browse-key-chip {
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--wb-text-muted);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.browse-key-chip.more {
  background: transparent;
  color: var(--wb-accent);
  border-color: var(--wb-accent);
}

.browse-card-preview {
  font-size: 12px;
  color: var(--wb-text-muted);
  line-height: 1.5;
  max-height: clamp(3em, 8vh, 8em);
  overflow: hidden;
  white-space: pre-wrap;
  word-break: break-word;
  mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
}

.browse-card-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.browse-meta-pill {
  padding: 1px 8px;
  border-radius: 6px;
  font-size: 10px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--wb-text-muted);
}

.browse-meta-pill[data-status="constant"] {
  background: rgba(59, 130, 246, 0.12);
  color: #60a5fa;
}

.browse-meta-pill[data-status="selective"] {
  background: rgba(34, 197, 94, 0.12);
  color: #4ade80;
}

/* Expanded card inline editor */

.browse-card-expanded {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--wb-border-main);
  margin-top: 4px;
}

.browse-keys-input {
  resize: vertical;
  min-height: 24px;
  font-size: 12px;
}

.browse-secondary-keys-row {
  display: flex;
  gap: 6px;
}

.browse-secondary-keys-row .wb-base-select {
  width: 110px;
  flex-shrink: 0;
}

.browse-secondary-keys-row .wb-base-textarea {
  flex: 1;
}

.browse-content-input {
  resize: vertical;
  min-height: 280px;
  max-height: 70vh;
  font-size: 12px;
  font-family: inherit;
  line-height: 1.5;
}

.browse-config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
}

.browse-recursion-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.browse-card-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding-top: 6px;
  border-top: 1px solid var(--wb-border-main);
}

.browse-card-actions .btn:last-child {
  margin-left: auto;
}

.browse-empty {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  color: var(--wb-text-muted);
  gap: 8px;
}

.browse-empty-icon {
  font-size: 40px;
  opacity: 0.4;
}

.browse-empty-text {
  font-size: 14px;
}

/* Glow pulse for unsaved changes */
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 4px rgba(var(--wb-accent-rgb, 56, 189, 248), 0.3); }
  50% { box-shadow: 0 0 12px rgba(var(--wb-accent-rgb, 56, 189, 248), 0.7); }
}

.glow-pulse {
  animation: glow-pulse 2s ease-in-out infinite;
}

/* Mobile browse overrides */

.mobile-browse-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.mobile-browse-toolbar {
  padding: 6px 8px;
  gap: 6px;
}

.mobile-browse-toolbar .worldbook-picker {
  max-width: 160px;
}

.mobile-browse-toolbar .browse-search {
  max-width: none;
  min-width: 80px;
}

.mobile-browse-scroll {
  padding: 0 8px 8px;
}

.mobile-browse-bindings {
  padding: 4px 0;
}

.mobile-browse-grid {
  grid-template-columns: 1fr;
  gap: 8px;
}

.mobile-browse-grid .browse-card.expanded {
  grid-column: auto;
}

.mobile-config-grid {
  grid-template-columns: 1fr 1fr;
}

.browse-global-mode {
  padding: 8px 12px;
}

.hidden-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}

/* Load more sentinel */

.browse-load-more-sentinel {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  padding: 16px;
}

.browse-load-more-text {
  font-size: 12px;
  color: var(--wb-text-muted);
  opacity: 0.6;
}

/* ═══ End Browse Mode Styles ═══ */

.wb-assistant-root {
  --wb-control-height-sm: 28px;
  --wb-control-height-md: 36px;
  --wb-control-height-lg: 42px;
  --wb-control-radius: 8px;
  --wb-control-padding-x-sm: 9px;
  --wb-control-padding-x-md: 12px;
  --wb-control-padding-x-lg: 15px;
  --wb-control-bg: var(--wb-input-bg);
  --wb-control-bg-hover: var(--wb-input-bg-hover);
  --wb-control-bg-active: var(--wb-input-bg-focus);
  --wb-control-border: var(--wb-border-main);
  --wb-control-border-hover: var(--wb-primary-light);
  --wb-control-focus-ring: 0 0 0 2px color-mix(in srgb, var(--wb-primary) 34%, transparent);
  --wb-control-disabled-opacity: 0.5;
  --wb-control-menu-bg: var(--wb-dropdown-bg, var(--wb-bg-panel));
  --wb-control-menu-shadow: var(--wb-shadow-main);
  --wb-control-option-active: var(--wb-primary-hover);
  --wb-control-option-selected: var(--wb-primary-soft);
  --wb-control-danger: var(--wb-danger, var(--wb-primary));
  --wb-control-danger-soft: color-mix(in srgb, var(--wb-control-danger) 12%, var(--wb-control-bg));
  --wb-control-danger-border: color-mix(in srgb, var(--wb-control-danger) 55%, transparent);
  --wb-control-danger-contrast: var(--wb-danger-contrast, var(--wb-text-main));
  position: relative;
  flex: 1;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 12px;
  background: var(--wb-bg-root);
  color: var(--wb-text-main);
  font-size: 13px;
  line-height: 1.5;
  border-radius: 12px;
  overflow: hidden;
}

.wb-assistant-root :deep(.wb-control) {
  box-sizing: border-box;
  border: 1px solid var(--wb-control-border);
  border-radius: var(--wb-control-radius);
  color: var(--wb-text-main);
  background: var(--wb-control-bg);
  font: inherit;
  transition: background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.wb-assistant-root :deep(.wb-control--sm) {
  min-height: var(--wb-control-height-sm);
  padding-inline: var(--wb-control-padding-x-sm);
}

.wb-assistant-root :deep(.wb-control--md) {
  min-height: var(--wb-control-height-md);
  padding-inline: var(--wb-control-padding-x-md);
}

.wb-assistant-root :deep(.wb-control--lg) {
  min-height: var(--wb-control-height-lg);
  padding-inline: var(--wb-control-padding-x-lg);
}

.wb-assistant-root :deep(.wb-control:hover:not(:disabled)) {
  border-color: var(--wb-control-border-hover);
  background: var(--wb-control-bg-hover);
}

.wb-assistant-root :deep(.wb-control:focus-visible),
.wb-assistant-root :deep(.wb-control-native:focus-visible + .wb-control-checkbox-indicator),
.wb-assistant-root :deep(.wb-control-native:focus-visible + .wb-control-switch-track) {
  outline: none;
  box-shadow: var(--wb-control-focus-ring);
}

.wb-assistant-root :deep(.wb-control:disabled),
.wb-assistant-root :deep(.wb-control-choice.is-disabled) {
  cursor: not-allowed;
  opacity: var(--wb-control-disabled-opacity);
}

.wb-assistant-root :deep(.wb-control-button) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  cursor: pointer;
  font-weight: 500;
  white-space: nowrap;
  user-select: none;
}

.wb-assistant-root :deep(.wb-control-button:active:not(:disabled)) {
  background: var(--wb-control-bg-active);
  transform: translateY(1px);
}

.wb-assistant-root :deep(.wb-control-button--primary) {
  border-color: var(--wb-primary);
  background: var(--wb-primary);
  color: #fff;
}

.wb-assistant-root :deep(.wb-control-button--danger) {
  border-color: var(--wb-control-danger-border);
  background: var(--wb-control-danger-soft);
  color: var(--wb-control-danger-contrast);
}

.wb-assistant-root :deep(.wb-control-button--ghost) {
  border-color: transparent;
  background: transparent;
}

.wb-assistant-root :deep(.wb-control-button.is-icon-only) {
  padding-inline: 0;
}

.wb-assistant-root :deep(.wb-control-button.wb-control--sm.is-icon-only) {
  width: var(--wb-control-height-sm);
  min-width: var(--wb-control-height-sm);
}

.wb-assistant-root :deep(.wb-control-button.wb-control--md.is-icon-only) {
  width: var(--wb-control-height-md);
  min-width: var(--wb-control-height-md);
}

.wb-assistant-root :deep(.wb-control-button.wb-control--lg.is-icon-only) {
  width: var(--wb-control-height-lg);
  min-width: var(--wb-control-height-lg);
}

.wb-assistant-root :deep(.wb-control-input-shell) {
  position: relative;
  display: inline-flex;
  width: 100%;
  min-width: 0;
  align-items: center;
}

.wb-assistant-root :deep(.wb-control-input-prefix),
.wb-assistant-root :deep(.wb-control-input-suffix) {
  position: absolute;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  color: var(--wb-text-muted);
  pointer-events: none;
}

.wb-assistant-root :deep(.wb-control-input-prefix) { inset-inline-start: var(--wb-control-padding-x-md); }
.wb-assistant-root :deep(.wb-control-input-suffix) { inset-inline-end: var(--wb-control-padding-x-md); }
.wb-assistant-root :deep(.wb-control-input.has-prefix) { padding-inline-start: 2.25rem; }
.wb-assistant-root :deep(.wb-control-input.has-suffix) { padding-inline-end: 2.75rem; }

.wb-assistant-root :deep(.wb-control-input.has-error),
.wb-assistant-root :deep(.wb-control-input-shell.has-error .wb-control-input) {
  border-color: var(--wb-control-danger);
}

.wb-assistant-root :deep(.wb-control-input.has-error:focus-visible),
.wb-assistant-root :deep(.wb-control-input-shell.has-error .wb-control-input:focus-visible) {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--wb-control-danger) 34%, transparent);
}

.wb-assistant-root :deep(.wb-control-input),
.wb-assistant-root :deep(.wb-control-textarea) {
  display: block;
  width: 100%;
  min-width: 0;
}

.wb-assistant-root :deep(.wb-control-textarea) {
  min-height: 96px;
  padding-block: 8px;
}

.wb-assistant-root :deep(.wb-control-textarea--resize-none) { resize: none; }
.wb-assistant-root :deep(.wb-control-textarea--resize-vertical) { resize: vertical; }
.wb-assistant-root :deep(.wb-control-textarea--resize-both) { resize: both; }

.wb-assistant-root :deep(.wb-control-choice) {
  display: inline-flex;
  min-height: var(--wb-control-height-md);
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.wb-assistant-root :deep(.wb-control-native) {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.wb-assistant-root :deep(.wb-control-checkbox-indicator) {
  display: grid;
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  place-items: center;
  border: 1px solid var(--wb-control-border);
  border-radius: 5px;
  background: var(--wb-control-bg);
}

.wb-assistant-root :deep(.wb-control-native:checked + .wb-control-checkbox-indicator),
.wb-assistant-root :deep(.wb-control-native:indeterminate + .wb-control-checkbox-indicator) {
  border-color: var(--wb-primary);
  background: var(--wb-primary);
}

.wb-assistant-root :deep(.wb-control-native:checked + .wb-control-checkbox-indicator::after) {
  content: '';
  width: 8px;
  height: 4px;
  border: solid #fff;
  border-width: 0 0 2px 2px;
  transform: translateY(-1px) rotate(-45deg);
}

.wb-assistant-root :deep(.wb-control-native:indeterminate + .wb-control-checkbox-indicator::after) {
  content: '';
  width: 9px;
  height: 2px;
  border-radius: 1px;
  background: #fff;
}

.wb-assistant-root :deep(.wb-control-switch-track) {
  display: flex;
  width: 38px;
  height: 22px;
  flex: 0 0 38px;
  align-items: center;
  padding: 2px;
  border: 1px solid var(--wb-control-border);
  border-radius: 999px;
  background: var(--wb-control-bg);
  transition: background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.wb-assistant-root :deep(.wb-control-switch-thumb) {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--wb-text-muted);
  transition: transform 160ms ease, background-color 160ms ease;
}

.wb-assistant-root :deep(.wb-control-native:checked + .wb-control-switch-track) {
  border-color: var(--wb-primary);
  background: var(--wb-primary);
}

.wb-assistant-root :deep(.wb-control-native:checked + .wb-control-switch-track .wb-control-switch-thumb) {
  background: #fff;
  transform: translateX(16px);
}

.wb-assistant-root :deep(.wb-control-spinner) {
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: wb-control-spin 700ms linear infinite;
}

@keyframes wb-control-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .wb-assistant-root :deep(.wb-control),
  .wb-assistant-root :deep(.wb-control-switch-track),
  .wb-assistant-root :deep(.wb-control-switch-thumb) {
    transition: none;
  }

  .wb-assistant-root :deep(.wb-control-spinner) {
    animation: none;
  }
}

@media (pointer: coarse) {
  .wb-assistant-root :deep(.wb-control--md),
  .wb-assistant-root :deep(.wb-control-choice) {
    min-height: 40px;
  }

  .wb-assistant-root :deep(.wb-control-button.wb-control--md.is-icon-only) {
    width: 40px;
    min-width: 40px;
  }
}

.main-workspace {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  overflow: hidden;
}

/* Glassmorphism Styles */
.wb-assistant-root.is-glass-mode {
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.wb-assistant-root.is-glass-mode .wb-editor-container,
.wb-assistant-root.is-glass-mode .wb-layout-sidebar,
.wb-assistant-root.is-glass-mode .wb-entry-list,
.wb-assistant-root.is-glass-mode .st-utility-panel,
.wb-assistant-root.is-glass-mode .wb-modal-window {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-color: color-mix(in srgb, var(--wb-border-main) 50%, transparent);
}
.wb-assistant-root.is-glass-mode .utility-btn {
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.focus-cine-overlay {
  position: absolute;
  inset: 0;
  z-index: 10290;
  pointer-events: auto;
  overflow: hidden;
}

.focus-cine-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 40%, rgba(125, 211, 252, 0.14), rgba(2, 6, 23, 0.42) 72%),
    radial-gradient(circle at 50% 50%, rgba(2, 6, 23, 0), rgba(2, 6, 23, 0.42) 100%);
  animation: focus-cine-vignette 1400ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.copy-cine-overlay {
  position: absolute;
  inset: 0;
  z-index: 10292;
  pointer-events: auto;
  overflow: hidden;
}

.copy-cine-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 52% 46%, rgba(125, 211, 252, 0.12), rgba(2, 6, 23, 0.46) 70%),
    radial-gradient(circle at 48% 60%, rgba(2, 6, 23, 0), rgba(2, 6, 23, 0.38) 100%);
  animation: copy-cine-vignette 1100ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.focus-cine-ghost {
  position: fixed;
  z-index: 10305;
  margin: 0;
  pointer-events: none;
  transform-origin: center center;
  will-change: transform, opacity, filter;
  filter: drop-shadow(0 10px 20px rgba(2, 6, 23, 0.45));
  animation-name: focus-cine-hero-flight;
  animation-fill-mode: forwards;
}

.copy-cine-ghost {
  position: fixed;
  z-index: 10308;
  margin: 0;
  pointer-events: none;
  transform-origin: center center;
  will-change: transform, opacity, filter;
  filter: drop-shadow(0 10px 20px rgba(2, 6, 23, 0.42));
  animation-name: copy-cine-hero-flight;
  animation-fill-mode: forwards;
}

[data-focus-hero].focus-cine-real-hidden {
  visibility: hidden !important;
}

[data-copy-hero].copy-cine-real-hidden {
  visibility: hidden !important;
}

@keyframes focus-cine-vignette {
  0% {
    opacity: 0;
  }
  35% {
    opacity: 0.86;
  }
  100% {
    opacity: 0.2;
  }
}

@keyframes focus-cine-hero-flight {
  0% {
    opacity: var(--cine-from-opacity, 1);
    transform: translate3d(0, 0, 0) scale(1, 1);
  }
  60% {
    opacity: 1;
    transform: translate3d(calc(var(--cine-dx, 0px) * 0.6), calc(var(--cine-dy, 0px) * 0.6 + var(--cine-arc-y, -20px)), 0)
      scale(calc(var(--cine-scale-x, 1) * 1.04), calc(var(--cine-scale-y, 1) * 1.04));
  }
  100% {
    opacity: var(--cine-to-opacity, 1);
    transform: translate3d(var(--cine-dx, 0px), var(--cine-dy, 0px), 0) scale(var(--cine-scale-x, 1), var(--cine-scale-y, 1));
  }
}

@keyframes copy-cine-vignette {
  0% {
    opacity: 0;
  }
  40% {
    opacity: 0.8;
  }
  100% {
    opacity: 0.16;
  }
}

@keyframes copy-cine-hero-flight {
  0% {
    opacity: var(--copy-cine-from-opacity, 1);
    transform: translate3d(0, 0, 0) scale(1, 1);
  }
  60% {
    opacity: 1;
    transform: translate3d(
      calc(var(--copy-cine-dx, 0px) * 0.62),
      calc(var(--copy-cine-dy, 0px) * 0.62 + var(--copy-cine-arc-y, -12px)),
      0
    ) scale(
      calc(var(--copy-cine-scale-x, 1) * 1.03),
      calc(var(--copy-cine-scale-y, 1) * 1.03)
    );
  }
  100% {
    opacity: var(--copy-cine-to-opacity, 1);
    transform: translate3d(var(--copy-cine-dx, 0px), var(--copy-cine-dy, 0px), 0) scale(var(--copy-cine-scale-x, 1), var(--copy-cine-scale-y, 1));
  }
}


.wb-scroll-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.wb-scroll-area.copy-workspace {
  overflow: hidden;
}

.wb-settings-wrapper {
  width: 100%;
}

.cross-copy-panel {
  border: 1px solid var(--wb-border-subtle);
  border-radius: 12px;
  background: var(--wb-bg-panel);
  padding: 12px;
  display: grid;
  gap: 10px;
  min-height: 0;
  overflow: hidden;
}

.cross-copy-panel.mobile {
  padding: 10px;
  gap: 8px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.cross-copy-panel.desktop {
  height: clamp(620px, calc(100vh - 220px), 82vh);
  max-height: calc(100vh - 110px);
  grid-template-rows: auto auto minmax(0, 1fr) auto;
}

.cross-copy-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  flex-wrap: wrap;
}

.cross-copy-head-main {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.cross-copy-head-main span {
  color: var(--wb-text-muted);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cross-copy-head-actions {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.copy-cine-sink-cluster {
  position: absolute;
  right: 0;
  top: 50%;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
  z-index: 0;
}

.copy-cine-sink {
  width: 86px;
  height: 34px;
  border-radius: 8px;
}

.copy-cine-sink-cluster .copy-cine-sink {
  position: absolute;
  right: 0;
  top: 0;
  transform: translateY(-50%);
}

.copy-cine-sink-cluster.workspace {
  left: 50%;
  right: auto;
}

.copy-cine-sink-cluster.workspace .copy-cine-sink {
  left: 0;
  right: auto;
  transform: translate(-50%, -50%);
}

.cross-copy-head strong {
  font-size: 15px;
}

.cross-copy-head span {
  color: var(--wb-text-muted);
  font-size: 12px;
}

.cross-copy-controls-wrap {
  display: grid;
  gap: 8px;
}

.cross-copy-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 8px 10px;
  align-items: center;
}

.cross-copy-panel.mobile .cross-copy-controls {
  grid-template-columns: minmax(0, 1fr);
}

.cross-copy-controls-primary {
  grid-template-columns: repeat(2, minmax(220px, 1fr)) auto;
}

.cross-copy-controls-advanced {
  grid-template-columns: repeat(2, minmax(240px, 1fr));
  padding: 8px 10px;
  border: 1px solid var(--wb-border-subtle);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.16);
}

.cross-copy-control-actions {
  display: flex;
  justify-content: flex-end;
  align-items: end;
}

.cross-copy-panel.mobile .cross-copy-control-actions {
  justify-content: flex-start;
}

.cross-copy-inline-tips {
  display: grid;
  gap: 6px;
}

.cross-copy-inline-tip {
  border-radius: 8px;
  border: 1px solid var(--wb-border-subtle);
  padding: 6px 8px;
  font-size: 12px;
  background: var(--wb-input-bg);
}

.cross-copy-inline-tip.warning {
  color: #f59e0b;
}

.cross-copy-inline-tip.success {
  color: #34d399;
}

.copy-controls-advanced-enter-active,
.copy-controls-advanced-leave-active {
  transition: opacity 200ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1), max-height 220ms ease;
  overflow: hidden;
}

.copy-controls-advanced-enter-from,
.copy-controls-advanced-leave-to {
  opacity: 0;
  transform: translateY(-6px);
  max-height: 0;
}

.copy-controls-advanced-enter-to,
.copy-controls-advanced-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 180px;
}

.cross-copy-grid {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  gap: 10px;
  min-height: 0;
  flex: 1;
}

.cross-copy-grid.single-column {
  grid-template-columns: minmax(0, 1fr) !important;
}

.cross-copy-grid.mobile {
  grid-template-columns: minmax(0, 1fr);
}

.cross-copy-splitter {
  width: 100%;
  min-height: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--wb-border-main) 68%, transparent);
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--wb-text-muted);
  user-select: none;
  touch-action: none;
  transition: background 160ms ease, color 160ms ease;
}

.cross-copy-splitter:hover,
.cross-copy-splitter.dragging {
  background: color-mix(in srgb, var(--wb-primary) 50%, transparent);
  color: var(--wb-primary-light);
}

.cross-copy-left,
.cross-copy-right {
  border: 1px solid var(--wb-border-subtle);
  border-radius: 10px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
}

.cross-copy-list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.cross-copy-list-head strong {
  font-size: 13px;
}

.cross-copy-list-head span {
  color: var(--wb-text-muted);
}

.cross-copy-list-tools {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cross-copy-mini-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.cross-copy-source-list,
.cross-copy-rows {
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cross-copy-source-item {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--wb-border-subtle);
  border-radius: 8px;
  padding: 7px 8px;
  cursor: pointer;
  background: var(--wb-input-bg);
}

.cross-copy-source-item.checked {
  border-color: var(--wb-primary);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--wb-primary) 35%, transparent);
}

.cross-copy-source-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cross-copy-status-dot,
.cross-copy-status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid transparent;
}

.cross-copy-status-dot {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
}

.cross-copy-status-badge {
  padding: 2px 8px;
  font-size: 11px;
}

.cross-copy-status-dot.new,
.cross-copy-status-badge.new {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.5);
  color: #22c55e;
}

.cross-copy-status-dot.changed,
.cross-copy-status-badge.changed {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.5);
  color: #60a5fa;
}

.cross-copy-status-dot.duplicate,
.cross-copy-status-badge.duplicate {
  background: rgba(245, 158, 11, 0.2);
  border-color: rgba(245, 158, 11, 0.5);
  color: #f59e0b;
}

.cross-copy-status-dot.content-duplicate,
.cross-copy-status-badge.content-duplicate {
  background: rgba(168, 85, 247, 0.22);
  border-color: rgba(168, 85, 247, 0.5);
  color: #c084fc;
}

.cross-copy-status-dot.invalid,
.cross-copy-status-badge.invalid {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.5);
  color: #f87171;
}

.cross-copy-row {
  border: 1px solid var(--wb-border-subtle);
  border-radius: 10px;
  padding: 6px 8px;
  background: var(--wb-input-bg);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cross-copy-row-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.cross-copy-row-title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.cross-copy-row-title strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cross-copy-row-note {
  color: var(--wb-text-muted);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cross-copy-row-actions {
  display: grid;
  gap: 6px;
  grid-template-columns: minmax(120px, 180px) minmax(0, 1fr);
}

.cross-copy-detail-trigger {
  align-self: flex-start;
  font-size: 11px;
  color: var(--wb-text-muted);
  padding-left: 0;
  padding-right: 0;
}

.cross-copy-preview-grid {
  margin-top: 6px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.cross-copy-preview-card {
  border: 1px solid var(--wb-border-subtle);
  border-radius: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.14);
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.cross-copy-preview-card .name {
  font-weight: 600;
}

.cross-copy-preview-card .meta {
  color: var(--wb-text-muted);
}

.cross-copy-preview-card p {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.cross-copy-diff-modal {
  width: min(1320px, 100%);
  max-height: min(92vh, 1020px);
}

.cross-copy-diff-main {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
  gap: 10px;
  padding: 0 10px 10px;
}

.cross-copy-preview-grid.cross-copy-preview-grid-modal {
  margin-top: 10px;
  padding: 10px;
  border: 1px solid var(--wb-border-main);
  border-radius: 10px;
  background: var(--wb-bg-panel);
}

.cross-copy-diff-empty {
  color: var(--wb-text-muted);
}

.cross-copy-diff-note {
  color: var(--wb-text-muted);
  font-size: 11px;
}

.cross-copy-visual-section {
  border: 1px solid var(--wb-border-main);
  border-radius: 10px;
  overflow: hidden;
  background: var(--wb-input-bg-focus);
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.cross-copy-visual-head {
  padding: 8px 10px;
  border-bottom: 1px solid var(--wb-border-main);
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  font-size: 12px;
  color: var(--wb-text-muted);
  background: var(--wb-bg-panel);
}

.cross-copy-visual-head strong {
  font-size: 13px;
  color: var(--wb-primary-light);
}

.cross-copy-field-table {
  min-height: 0;
  overflow: auto;
}

.cross-copy-field-row {
  display: grid;
  grid-template-columns: 140px minmax(220px, 1fr) minmax(220px, 1fr) 68px;
  gap: 8px;
  align-items: start;
  padding: 8px 10px;
  border-bottom: 1px solid var(--wb-border-subtle);
  font-size: 12px;
}

.cross-copy-field-row:last-child {
  border-bottom: none;
}

.cross-copy-field-row.changed {
  background: color-mix(in srgb, var(--wb-primary-soft) 35%, transparent);
}

.cross-copy-field-row.cross-copy-field-header {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--wb-bg-panel);
  font-size: 11px;
  color: var(--wb-text-muted);
  border-bottom-color: var(--wb-border-main);
}

.cross-copy-field-label {
  font-weight: 600;
  color: var(--wb-text-main);
}

.cross-copy-field-value {
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--wb-text-main);
}

.cross-copy-field-state {
  justify-self: end;
  border: 1px solid var(--wb-border-main);
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 11px;
}

.cross-copy-field-state.same {
  color: #22c55e;
  border-color: rgba(34, 197, 94, 0.45);
  background: rgba(34, 197, 94, 0.16);
}

.cross-copy-field-state.changed {
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.5);
  background: rgba(245, 158, 11, 0.16);
}

.cross-copy-content-grid {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.cross-copy-content-col {
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cross-copy-content-col + .cross-copy-content-col {
  border-left: 1px solid var(--wb-border-main);
}

.cross-copy-content-body {
  min-height: 0;
  flex: 1;
  overflow: auto;
}

.cross-copy-content-line {
  display: grid;
  grid-template-columns: 54px 1fr;
  align-items: start;
  border-bottom: 1px solid var(--wb-border-subtle);
}

.cross-copy-content-line .line-no {
  color: var(--wb-text-muted);
  padding: 2px 8px;
  border-right: 1px solid var(--wb-border-subtle);
  user-select: none;
}

.cross-copy-content-line .line-text {
  white-space: pre-wrap;
  word-break: break-word;
  padding: 2px 8px;
  color: var(--wb-text-main);
}

.cross-copy-content-line.add {
  background: rgba(34, 197, 94, 0.2);
}

.cross-copy-content-line.del {
  background: rgba(239, 68, 68, 0.2);
}

.cross-copy-content-line.empty {
  background: rgba(100, 116, 139, 0.08);
}

.cross-copy-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  border-top: 1px solid var(--wb-border-subtle);
  padding: 10px 12px;
  margin: 0 -12px -12px;
  position: sticky;
  bottom: 0;
  z-index: 8;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  background: color-mix(in srgb, var(--wb-bg-panel) 78%, rgba(5, 8, 20, 0.88));
}

.cross-copy-actions.mobile {
  position: static;
  margin: 0;
  padding: 0;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  background: transparent;
}

.cross-copy-panel.desktop .cross-copy-actions .btn.primary {
  margin-left: auto;
}

.cross-copy-bulk-box {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.cross-copy-bulk-box .text-input {
  min-width: 120px;
}

.cross-copy-mobile-stepper {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.cross-copy-mobile-step {
  border: 1px solid var(--wb-border-subtle);
  border-radius: 8px;
  background: var(--wb-input-bg);
  color: var(--wb-text-muted);
  padding: 6px 8px;
  font-size: 12px;
  cursor: pointer;
}

.cross-copy-mobile-step.active {
  border-color: var(--wb-primary);
  color: var(--wb-primary-light);
  background: color-mix(in srgb, var(--wb-primary) 18%, transparent);
}

.cross-copy-mobile-step:disabled {
  opacity: 0.45;
  cursor: default;
}

.cross-copy-mobile-stage {
  min-height: 0;
  flex: 1;
  display: flex;
}

.cross-copy-mobile-stage-panel {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cross-copy-mobile-advanced-toggle {
  width: fit-content;
}

.cross-copy-mobile-advanced {
  border: 1px solid var(--wb-border-subtle);
  border-radius: 10px;
  padding: 8px;
  display: grid;
  gap: 6px;
  background: rgba(0, 0, 0, 0.14);
}

.mobile-source-list,
.mobile-rows {
  flex: 1;
}

.cross-copy-mobile-bulk {
  display: grid;
  gap: 6px;
}

.cross-copy-mobile-nav {
  position: sticky;
  bottom: 0;
  z-index: 6;
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--wb-border-subtle);
  background: color-mix(in srgb, var(--wb-bg-panel) 82%, rgba(5, 8, 20, 0.9));
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.cross-copy-mobile-nav .btn {
  flex: 1 1 0;
}

@media (max-width: 1200px) {
  .cross-copy-controls-primary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cross-copy-controls-primary .cross-copy-control-actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }

  .cross-copy-head-actions {
    width: 100%;
    justify-content: space-between;
  }

  .cross-copy-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .cross-copy-splitter {
    display: none;
  }

  .cross-copy-row-actions {
    grid-template-columns: minmax(0, 1fr);
  }

  .cross-copy-field-row {
    grid-template-columns: 120px minmax(0, 1fr) minmax(0, 1fr) 62px;
  }
}

@media (max-width: 780px) {
  .cross-copy-preview-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .cross-copy-content-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .cross-copy-content-col + .cross-copy-content-col {
    border-left: none;
    border-top: 1px solid var(--wb-border-main);
  }

  .cross-copy-field-row.cross-copy-field-header {
    display: none;
  }

  .cross-copy-field-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }

  .cross-copy-field-state {
    justify-self: start;
  }
}

.wb-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 12px;
  padding: 16px 20px;
  background: var(--wb-bg-panel);
  margin-bottom: 8px;
  border: 1px solid var(--wb-border-subtle);
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.wb-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wb-title strong {
  font-size: 16px;
}

.wb-title span {
  color: var(--wb-text-muted);
}

.wb-header-actions,
.list-actions,
.tool-line {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.wb-toolbar {
  position: relative;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--wb-bg-panel);
}

.focus-cine-sink-row {
  position: absolute;
  right: 12px;
  top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  opacity: 0;
  pointer-events: none;
}

.focus-cine-sink {
  width: 86px;
  height: 34px;
  border-radius: 8px;
}

.wb-focus-toolbar {
  border-radius: 12px;
  padding: 10px 12px;
  display: grid;
  gap: 8px;
  background: var(--wb-bg-panel);
  border: 1px solid var(--wb-border-subtle);
  transition: padding 240ms cubic-bezier(0.22, 1, 0.36, 1);
}

.wb-focus-toolbar.compact {
  padding: 8px 10px;
}

.wb-focus-toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: nowrap;
  min-width: 0;
}

.wb-focus-core-group,
.wb-focus-tool-entry {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex-wrap: nowrap;
}

.wb-focus-core-group {
  flex: 1 1 auto;
}

.wb-focus-tool-entry {
  position: relative;
}

.focus-toolbar-label {
  min-width: 220px;
  flex: 1 1 auto;
}

.focus-toolbar-label-text {
  white-space: nowrap;
}

.wb-focus-tool-entry .btn {
  white-space: nowrap;
}

.wb-focus-toolbar.compact .btn {
  padding: 6px 10px;
  font-size: 12px;
}

.focus-menu-wrap {
  position: relative;
}

.focus-cine-sink-cluster {
  position: absolute;
  right: 0;
  top: 50%;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
  z-index: 0;
}

.focus-cine-sink-cluster .focus-cine-sink {
  position: absolute;
  right: 0;
  top: 0;
  transform: translateY(-50%);
}

.focus-menu-panel {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  z-index: 10140;
  border: 1px solid var(--wb-border-subtle);
  border-radius: 10px;
  background: var(--wb-dropdown-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.4);
  padding: 8px;
  min-width: 168px;
  display: grid;
  gap: 6px;
}

.focus-menu-pop-enter-active,
.focus-menu-pop-leave-active {
  transition: opacity 180ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.focus-menu-pop-enter-from,
.focus-menu-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

.wb-focus-tools-band {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  justify-content: flex-end;
  justify-self: end;
  margin-left: auto;
  max-width: 100%;
  padding-top: 2px;
}

.wb-focus-tools-band > .btn {
  animation: focus-tool-stagger 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.wb-focus-tools-band > .btn:nth-child(2) { animation-delay: 20ms; }
.wb-focus-tools-band > .btn:nth-child(3) { animation-delay: 40ms; }
.wb-focus-tools-band > .btn:nth-child(4) { animation-delay: 60ms; }
.wb-focus-tools-band > .btn:nth-child(5) { animation-delay: 80ms; }
.wb-focus-tools-band > .btn:nth-child(6) { animation-delay: 100ms; }
.wb-focus-tools-band > .btn:nth-child(7) { animation-delay: 120ms; }
.wb-focus-tools-band > .btn:nth-child(8) { animation-delay: 140ms; }
.wb-focus-tools-band > .btn:nth-child(9) { animation-delay: 160ms; }
.wb-focus-tools-band > .btn:nth-child(10) { animation-delay: 180ms; }
.wb-focus-tools-band > .btn:nth-child(11) { animation-delay: 200ms; }
.wb-focus-tools-band > .btn:nth-child(12) { animation-delay: 220ms; }

@keyframes focus-tool-stagger {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.focus-tools-band-enter-active,
.focus-tools-band-leave-active {
  transition: opacity 220ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1), max-height 220ms ease;
  transform-origin: top right;
}

.focus-tools-band-enter-from,
.focus-tools-band-leave-to {
  opacity: 0;
  transform: translate(18px, -8px) scale(0.96);
  max-height: 0;
}

.focus-tools-band-enter-to,
.focus-tools-band-leave-from {
  opacity: 1;
  transform: translate(0, 0) scale(1);
  max-height: 300px;
}

.focus-tools-trigger-enter-active,
.focus-tools-trigger-leave-active {
  transition: opacity 140ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.focus-tools-trigger-enter-from,
.focus-tools-trigger-leave-to {
  opacity: 0;
  transform: translate(-14px, 10px);
}

.focus-tools-collapse {
  margin-left: auto;
}

.toolbar-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--wb-text-muted);
  min-width: 320px;
  flex: 1 1 520px;
}

.toolbar-select {
  min-width: 200px;
}

.toolbar-select.small {
  min-width: 160px;
}

.worldbook-picker {
  position: relative;
  flex: 1 1 auto;
  min-width: 240px;
}

.worldbook-picker-trigger {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 8px 10px;
  background: var(--wb-input-bg);
  color: var(--wb-text-main);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
}

.worldbook-picker-trigger:hover {
  border-color: var(--wb-primary-light);
}

.worldbook-picker-trigger-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.worldbook-picker-trigger-arrow {
  flex-shrink: 0;
  color: var(--wb-text-muted);
}

.wb-assistant-root .worldbook-picker-dropdown {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  z-index: 10120;
  border: 1px solid var(--wb-border-subtle);
  border-radius: 8px;
  background: var(--wb-dropdown-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.4);
  padding: 8px;
  display: grid;
  gap: 8px;
}

.worldbook-picker-search {
  width: 100%;
}

.worldbook-picker-list {
  max-height: 260px;
  overflow: auto;
  border: none;
  border-radius: 8px;
  background: var(--wb-bg-panel);
  display: flex;
  flex-direction: column;
}

.worldbook-picker-item {
  width: 100%;
  border: none;
  border-bottom: 1px solid var(--wb-border-subtle);
  background: transparent;
  color: var(--wb-text-main);
  padding: 8px 10px;
  text-align: left;
  cursor: pointer;
}

.worldbook-picker-item:last-child {
  border-bottom: none;
}

.worldbook-picker-item:hover {
  background: var(--wb-primary-soft);
}

.worldbook-picker-item.active {
  background: var(--wb-primary-soft);
  color: var(--wb-primary-light);
}

.wb-bindings {
  border-radius: 12px;
  padding: 12px;
  display: grid;
  gap: 8px;
  background: var(--wb-bg-panel);
}

.wb-bindings.copy-workspace {
  padding: 8px 10px;
  gap: 6px;
}

.wb-bindings.focus-bindings {
  padding: 0;
  background: transparent;
}

.wb-copy-workspace-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.wb-copy-workspace-title {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.wb-copy-workspace-title strong {
  font-size: 14px;
  line-height: 1.2;
}

.wb-copy-workspace-title span {
  font-size: 12px;
  color: var(--wb-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wb-copy-workspace-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.wb-copy-workspace-tool-anchor {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.wb-copy-workspace-meta {
  font-size: 12px;
  color: var(--wb-text-muted);
}

.wb-history-shortcuts {
  display: flex;
  justify-content: flex-start;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.wb-history-shortcuts.copy-workspace-tools {
  padding-top: 2px;
}

.copy-workspace-tools-enter-active,
.copy-workspace-tools-leave-active {
  transition: opacity 180ms ease, transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
}

.copy-workspace-tools-enter-from,
.copy-workspace-tools-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.global-mode-panel {
  border-radius: 12px;
  background: var(--wb-bg-panel);
  padding: 12px;
  display: grid;
  gap: 12px;
}

.global-mode-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.global-mode-title {
  color: var(--wb-primary-light);
  font-weight: 700;
  letter-spacing: 0.02em;
}

.global-mode-sections {
  display: grid;
  gap: 10px;
}

.global-mode-section {
  border: 1px solid var(--wb-border-subtle);
  border-radius: 10px;
  background: var(--wb-bg-panel);
  overflow: hidden;
}

.global-mode-section-summary {
  list-style: none;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  user-select: none;
  transition: background 180ms ease;
}

.global-mode-section-summary:hover {
  background: color-mix(in srgb, var(--wb-primary-soft) 45%, transparent);
}

.global-mode-section-summary::-webkit-details-marker {
  display: none;
}

.global-mode-section-summary::after {
  content: '▾';
  margin-left: auto;
  color: var(--wb-text-muted);
  transition: transform 180ms ease;
}

.global-mode-section:not([open]) .global-mode-section-summary::after {
  transform: rotate(-90deg);
}

.global-mode-section-title {
  color: var(--wb-primary-light);
  font-weight: 600;
}

.global-mode-section-meta {
  color: var(--wb-text-muted);
  font-size: 12px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-mode-section-body {
  border-top: 1px solid var(--wb-border-subtle);
  padding: 10px;
  display: grid;
  gap: 8px;
}

.global-preset-panel {
  display: grid;
  gap: 8px;
}

.preset-role-panel {
  display: grid;
  gap: 6px;
}

.preset-role-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.preset-role-current {
  color: var(--wb-primary);
  font-size: 12px;
}

.preset-role-current.empty {
  color: var(--wb-text-muted);
}

.preset-role-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.role-picker {
  position: relative;
}

.role-picker-trigger {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 8px 10px;
  background: var(--wb-input-bg);
  color: var(--wb-text-main);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
}

.role-picker-trigger:disabled {
  opacity: 0.55;
  cursor: default;
}

.role-picker-trigger:hover:not(:disabled) {
  border-color: var(--wb-primary-light);
}

.role-picker-trigger-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.role-picker-trigger-arrow {
  flex-shrink: 0;
  color: var(--wb-text-muted);
}

.wb-assistant-root .role-picker-dropdown {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  z-index: 10130;
  border: 1px solid var(--wb-border-subtle);
  border-radius: 8px;
  background: var(--wb-dropdown-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.4);
  padding: 8px;
  display: grid;
  gap: 8px;
}

.role-picker-search {
  width: 100%;
}

.role-picker-list {
  border: none;
  border-radius: 8px;
  background: var(--wb-bg-panel);
  max-height: 220px;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.role-picker-item {
  width: 100%;
  border: none;
  border-bottom: 1px solid var(--wb-border-subtle);
  background: transparent;
  color: var(--wb-text-main);
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  text-align: left;
  cursor: pointer;
}

.role-picker-item:last-child {
  border-bottom: none;
}

.role-picker-item:hover:not(:disabled) {
  background: var(--wb-primary-soft);
}

.role-picker-item:disabled {
  opacity: 0.55;
  cursor: default;
}

.role-picker-item .name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-picker-item .meta {
  color: var(--wb-primary-light);
  flex-shrink: 0;
  font-size: 11px;
}

.preset-role-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.preset-role-tag {
  border: 1px solid var(--wb-border-subtle);
  border-radius: 999px;
  background: var(--wb-bg-panel);
  color: var(--wb-text-main);
  padding: 2px 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.preset-role-tag:hover {
  border-color: #f43f5e;
}

.preset-role-tag .remove {
  color: #fca5a5;
}

.global-mode-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.global-mode-column {
  border-radius: 8px;
  padding: 10px;
  background: var(--wb-bg-panel);
  display: grid;
  gap: 6px;
  min-height: 168px;
}

.global-mode-list {
  border-radius: 8px;
  background: var(--wb-input-bg);
  max-height: 176px;
  min-height: 88px;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.global-mode-item {
  width: 100%;
  border: none;
  border-bottom: 1px solid var(--wb-border-subtle);
  background: transparent;
  color: var(--wb-text-main);
  padding: 7px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  text-align: left;
}

.global-mode-item:last-child {
  border-bottom: none;
}

.global-mode-item:hover {
  background: var(--wb-primary-soft);
}

.global-mode-item.add .global-mode-item-action {
  color: #86efac;
}

.global-mode-item.active .global-mode-item-action {
  color: #fca5a5;
}

.global-mode-item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-mode-item-action {
  font-size: 12px;
  flex-shrink: 0;
}

/* View Transitions */
.mobile-tab-enter-active,
.mobile-tab-leave-active {
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  width: 100%;
  height: 100%;
}
.mobile-tab-enter-from {
  opacity: 0;
  transform: translateX(15px);
}
.mobile-tab-leave-to {
  opacity: 0;
  transform: translateX(-15px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(4px) scale(0.98);
}

.desktop-content-enter-active,
.desktop-content-leave-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.desktop-content-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.desktop-content-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* List Transitions for TransitionGroup */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: scaleY(0.8) translateY(-10px);
}

.list-leave-active {
  position: absolute;
}

.global-mode-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.history-btn {
  border-color: var(--wb-primary);
  background: var(--wb-primary-soft);
}

.utility-btn {
  border-color: var(--wb-primary-light);
  background: var(--wb-primary-soft);
}

.utility-btn.active {
  border-color: var(--wb-primary-light);
  background: var(--wb-primary-soft);
  color: var(--wb-primary-light);
}

.wb-main-layout {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  display: grid;
  grid-template-columns: 280px 10px minmax(0, 1fr);
  gap: 0;
  align-items: stretch;
  transition: grid-template-columns 240ms cubic-bezier(0.22, 1, 0.36, 1);
}

.wb-main-layout.global-mode-visible {
  flex: 0 0 auto;
  height: auto;
  min-height: clamp(360px, 46vh, 700px);
}

.wb-assistant-root.focus-cine-locked .wb-main-layout {
  transition-duration: 1400ms;
  transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}

.wb-assistant-root.copy-cine-locked .wb-bindings,
.wb-assistant-root.copy-cine-locked .cross-copy-panel.desktop,
.wb-assistant-root.copy-cine-locked .wb-main-layout {
  transition:
    opacity 1100ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 1100ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 1100ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform, opacity, filter;
}

.wb-assistant-root.copy-cine-enter.copy-cine-running .wb-bindings {
  animation: copy-cine-bindings-enter 1100ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.wb-assistant-root.copy-cine-enter.copy-cine-running .cross-copy-panel.desktop {
  animation: copy-cine-panel-enter 1100ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.wb-assistant-root.copy-cine-exit.copy-cine-running .wb-bindings {
  animation: copy-cine-bindings-exit 1100ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.wb-assistant-root.copy-cine-exit.copy-cine-running .wb-main-layout {
  animation: copy-cine-main-enter 1100ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes copy-cine-bindings-enter {
  0% {
    opacity: 0;
    transform: translateY(-10px) scale(0.992);
    filter: blur(1px);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

@keyframes copy-cine-bindings-exit {
  0% {
    opacity: 0;
    transform: translateY(-6px) scale(0.994);
    filter: blur(1px);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

@keyframes copy-cine-panel-enter {
  0% {
    opacity: 0;
    transform: translateY(16px) scale(0.985);
    filter: blur(1.5px);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

@keyframes copy-cine-main-enter {
  0% {
    opacity: 0.2;
    transform: translateY(18px) scale(0.972);
    filter: blur(1.6px);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

.wb-entry-list,
.wb-editor {
  border-radius: 12px;
  border: 1px solid transparent;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: transparent;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  transition: padding 320ms cubic-bezier(0.22, 1, 0.36, 1), background-color 320ms cubic-bezier(0.22, 1, 0.36, 1), border-color 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.list-search {
  display: grid;
  gap: 6px;
  padding: 0 8px;
  flex-shrink: 0;
}

.list-summary {
  color: var(--wb-text-muted);
  font-size: 12px;
  padding: 0 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.list-multi-edit-hint {
  margin: 0 8px;
  border: 1px solid color-mix(in srgb, var(--wb-primary) 36%, transparent);
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 12px;
  color: var(--wb-primary-light);
  background: color-mix(in srgb, var(--wb-primary-soft) 72%, transparent);
  flex-shrink: 0;
}

.list-multi-edit-hint.off {
  color: var(--wb-text-muted);
  border-color: var(--wb-border-subtle);
  background: var(--wb-input-bg);
}

.list-scroll {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  padding: 4px 4px 4px 4px;
  transition: padding 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.entry-item {
  width: 100%;
  text-align: left;
  border: 1px solid transparent;
  background: var(--wb-input-bg);
  color: var(--wb-text-main);
  border-radius: 10px;
  padding: 12px 14px 12px 18px;
  cursor: pointer;
  display: grid;
  gap: 6px;
  position: relative;
  transition:
    background 0.25s ease,
    transform 0.25s ease,
    border-color 0.25s ease,
    box-shadow 0.25s ease,
    padding 320ms cubic-bezier(0.22, 1, 0.36, 1),
    border-radius 320ms cubic-bezier(0.22, 1, 0.36, 1),
    margin-bottom 320ms cubic-bezier(0.22, 1, 0.36, 1),
    gap 320ms cubic-bezier(0.22, 1, 0.36, 1);
  margin-bottom: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.entry-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  border-radius: 10px 0 0 10px;
  background: linear-gradient(to bottom, #64748b, rgba(100, 116, 139, 0.15));
}

.entry-item[data-status='constant']::before {
  background: linear-gradient(to bottom, #3b82f6, rgba(59, 130, 246, 0));
}

.entry-item[data-status='vector']::before {
  background: linear-gradient(to bottom, #a855f7, rgba(168, 85, 247, 0));
}

.entry-item[data-status='normal']::before {
  background: linear-gradient(to bottom, #22c55e, rgba(34, 197, 94, 0));
}

.entry-item[data-status='disabled']::before {
  background: linear-gradient(to bottom, #6b7280, rgba(107, 114, 128, 0));
}

.entry-item:hover {
  background: var(--wb-input-bg-hover);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.1);
  border-color: var(--wb-border-main);
}

.entry-item.selected {
  background: color-mix(in srgb, var(--wb-primary-soft) 65%, transparent);
  border-color: color-mix(in srgb, var(--wb-primary) 70%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--wb-primary) 55%, transparent), 0 4px 14px rgba(0,0,0,0.12);
  transform: translateY(-1px);
}

.entry-item.selected.primary {
  background: var(--wb-primary-soft);
  border-color: var(--wb-primary);
  box-shadow: 0 0 0 1px var(--wb-primary), 0 4px 20px rgba(0,0,0,0.15);
  transform: translateY(-1px);
}

.entry-item.drag-source {
  opacity: 0.82;
}

.entry-item.drop-before::after,
.entry-item.drop-after::after {
  content: '';
  position: absolute;
  left: 8px;
  right: 8px;
  height: 2px;
  border-radius: 999px;
  background: var(--wb-primary-light);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--wb-primary-light) 65%, transparent);
  pointer-events: none;
}

.entry-item.drop-before::after {
  top: -2px;
}

.entry-item.drop-after::after {
  bottom: -2px;
}

.entry-item.disabled {
  opacity: 0.74;
}

.entry-item-head {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.entry-status-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: #64748b;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px var(--wb-bg-panel);
}

.entry-status-dot[data-status='constant'] {
  background: #3b82f6;
}

.entry-status-dot[data-status='vector'] {
  background: #a855f7;
}

.entry-status-dot[data-status='normal'] {
  background: #22c55e;
}

.entry-status-dot[data-status='disabled'] {
  background: #6b7280;
}

.entry-item-title {
  font-weight: 700;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: font-size 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.entry-item-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.entry-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--wb-border-subtle);
  border-radius: 999px;
  padding: 2px 10px;
  color: var(--wb-text-main);
  font-size: 11px;
  background: var(--wb-bg-panel);
  font-weight: 500;
}

.entry-chip.uid {
  color: var(--wb-primary-light);
  font-size: 10px;
  padding: 1px 7px;
}

.entry-chip.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 10px;
}

.entry-chip.status[data-status='constant'] {
  color: #93c5fd;
  background: rgba(59, 130, 246, 0.16);
}

.entry-chip.status[data-status='vector'] {
  color: #d8b4fe;
  background: rgba(168, 85, 247, 0.16);
}

.entry-chip.status[data-status='normal'] {
  color: #86efac;
  background: rgba(34, 197, 94, 0.16);
}

.entry-chip.status[data-status='disabled'] {
  color: #cbd5e1;
  background: rgba(100, 116, 139, 0.15);
}

.entry-item-preview {
  color: var(--wb-text-muted);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-left: 16px;
  opacity: 0.85;
}

.entry-item-preview::before {
  content: 'Keys: ';
  color: var(--wb-text-muted);
  margin-right: 4px;
}

.wb-editor {
  height: 100%;
  overflow: hidden;
}

.wb-editor-shell {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 10px 360px;
  gap: 0;
  transition: grid-template-columns 240ms cubic-bezier(0.22, 1, 0.36, 1);
}

.wb-assistant-root.focus-cine-locked .wb-editor-shell {
  transition-duration: 1400ms;
  transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}

.wb-main-layout.focus-mode .wb-entry-list {
  border: 1px solid var(--wb-border-subtle);
  border-radius: 12px;
  padding: 6px;
  background: var(--wb-bg-panel);
}

.wb-main-layout.focus-mode .list-scroll {
  padding: 2px;
}

.wb-main-layout.focus-mode .entry-item {
  padding: 9px 10px 9px 14px;
  border-radius: 8px;
  margin-bottom: 4px;
  gap: 4px;
}

.wb-main-layout.focus-mode .entry-item-title {
  font-size: 12px;
}

.wb-resize-handle {
  position: relative;
  width: 10px;
  cursor: col-resize;
  user-select: none;
  touch-action: none;
}

.wb-resize-handle::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 12px;
  bottom: 12px;
  width: 2px;
  border-radius: 999px;
  background: var(--wb-primary-hover);
  transition: background-color 0.15s ease;
}

.wb-resize-handle:hover::before,
.wb-resize-handle.dragging::before {
  background: var(--wb-primary-light);
}

.editor-center {
  border: 1px solid var(--wb-border-subtle);
  border-radius: 16px;
  background: var(--wb-bg-panel);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 0;
  height: 100%;
  overflow: auto;
  box-shadow: 0 8px 32px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  transition: padding 320ms cubic-bezier(0.22, 1, 0.36, 1), gap 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.editor-center.focus {
  padding: 18px;
}

.editor-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-end;
  border-bottom: 1px solid var(--wb-border-subtle);
  padding-bottom: 16px;
  transition: gap 320ms cubic-bezier(0.22, 1, 0.36, 1), padding-bottom 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.editor-head.focus {
  align-items: center;
  gap: 10px;
}

.focus-meta-summary-row {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 8px;
  align-items: center;
}

.focus-meta-chip {
  border: 1px solid var(--wb-border-subtle);
  border-radius: 999px;
  background: var(--wb-input-bg);
  color: var(--wb-text-main);
  padding: 4px 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
  max-width: 48%;
}

.focus-meta-chip strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.focus-meta-chip.active {
  border-color: var(--wb-primary-light);
  background: var(--wb-primary-soft);
}

.focus-meta-panel {
  border: 1px solid var(--wb-border-subtle);
  border-radius: 10px;
  padding: 10px;
  background: var(--wb-input-bg);
}

.focus-meta-panel-enter-active,
.focus-meta-panel-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.focus-meta-panel-enter-from,
.focus-meta-panel-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.editor-comment {
  flex: 1;
}

.editor-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.editor-badge {
  font-size: 11px;
  border: 1px solid var(--wb-border-subtle);
  border-radius: 999px;
  padding: 3px 10px;
  color: var(--wb-text-main);
  background: var(--wb-bg-panel);
  white-space: nowrap;
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}

.editor-badge.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.editor-badge.on {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.2);
}

.editor-badge.off {
  color: var(--wb-text-muted);
  background: var(--wb-bg-root);
}

.editor-badge.strategy[data-status='constant'] {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.2);
}

.editor-badge.strategy[data-status='vector'] {
  color: #a855f7;
  background: rgba(168, 85, 247, 0.1);
  border-color: rgba(168, 85, 247, 0.2);
}

.editor-badge.strategy[data-status='normal'] {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.2);
}

.editor-badge.strategy[data-status='disabled'] {
  color: var(--wb-text-muted);
  background: var(--wb-bg-root);
}

.editor-keyword-grid .text-area.compact {
  min-height: 36px;
  height: 36px;
  line-height: 1.35;
}

.editor-content-block {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.editor-content-title {
  font-size: 12px;
  color: var(--wb-primary-light);
  letter-spacing: 0.01em;
}

.editor-content-area {
  min-height: 320px;
  flex: 1;
  resize: none;
  line-height: 1.5;
}

.content-resize-handle {
  display: none;
  align-items: center;
  justify-content: center;
  height: 22px;
  cursor: ns-resize;
  background: var(--wb-bg-panel);
  border-radius: 0 0 8px 8px;
  touch-action: none;
  user-select: none;
}

.content-resize-grip {
  font-size: 12px;
  color: var(--wb-text-dim);
  letter-spacing: 3px;
  line-height: 1;
}

.editor-advanced {
  border: 1px solid var(--wb-border-subtle);
  border-radius: 10px;
  padding: 12px;
  background: var(--wb-input-bg);
}

.editor-advanced > summary {
  cursor: pointer;
  font-size: 12px;
  color: var(--wb-text-muted);
}

.editor-advanced[open] > summary {
  margin-bottom: 7px;
}

.editor-collapsible-group {
  display: grid;
  gap: 8px;
}

.editor-mini-collapse {
  border: 1px solid var(--wb-border-subtle);
  border-radius: 10px;
  background: var(--wb-input-bg);
}

.editor-mini-collapse > summary {
  list-style: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  cursor: pointer;
  color: var(--wb-primary-light);
  font-size: 12px;
}

.editor-mini-collapse > summary::-webkit-details-marker {
  display: none;
}

.editor-mini-collapse > summary::after {
  content: '▾';
  margin-left: 6px;
  color: var(--wb-text-muted);
  transform: rotate(-90deg);
  transition: transform 0.2s ease;
}

.editor-mini-collapse[open] > summary::after {
  transform: rotate(0deg);
}

.editor-mini-collapse-value {
  margin-left: auto;
  color: var(--wb-text-muted);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.editor-mini-collapse-body {
  padding: 0 10px 10px;
}

.editor-mini-collapse.disabled {
  opacity: 0.56;
}

.editor-side {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  min-height: 0;
  overflow: auto;
}

.editor-side.focus .editor-grid.two-cols,
.editor-side.focus .editor-grid.three-cols {
  grid-template-columns: 1fr;
}

.editor-card {
  border: 1px solid var(--wb-border-subtle);
  border-radius: 12px;
  padding: 16px;
  background: var(--wb-bg-panel);
  display: grid;
  gap: 10px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
}

.focus-side-card {
  transition: border-color 220ms ease, box-shadow 220ms ease;
}

.focus-side-summary {
  border: 1px solid var(--wb-border-subtle);
  border-radius: 10px;
  background: var(--wb-input-bg);
  color: var(--wb-text-main);
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.focus-side-summary-title {
  color: var(--wb-primary);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.focus-side-summary-value {
  color: var(--wb-text-muted);
  margin-left: auto;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.focus-side-summary-arrow {
  color: var(--wb-text-muted);
  font-size: 12px;
}

.focus-side-content {
  display: grid;
  gap: 10px;
}

.focus-side-content.hidden {
  display: none;
}

.editor-card h4 {
  margin: 0;
  font-size: 12px;
  color: var(--wb-primary);
}

.strategy-switch {
  display: grid;
  gap: 6px;
}

.strategy-pill {
  border: 1px solid var(--wb-border-subtle);
  border-radius: 8px;
  background: var(--wb-input-bg);
  color: var(--wb-text-muted);
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.strategy-pill:hover {
  background: var(--wb-input-bg-hover);
  border-color: var(--wb-border-main);
}

.strategy-pill.active.constant {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
  border-color: rgba(59, 130, 246, 0.3);
}

.strategy-pill.active.vector {
  background: rgba(168, 85, 247, 0.12);
  color: #a855f7;
  border-color: rgba(168, 85, 247, 0.3);
}

.strategy-pill.active.selective {
  background: rgba(34, 197, 94, 0.12);
  color: #22c55e;
  border-color: rgba(34, 197, 94, 0.3);
}

.editor-grid {
  display: grid;
  gap: 8px;
}

.editor-grid.two-cols {
  grid-template-columns: 1fr 1fr;
}

.editor-grid.three-cols {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field > span {
  color: var(--wb-primary-light);
}

.field.disabled {
  opacity: 0.56;
}

.field-end {
  align-self: end;
}

.field-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.wb-assistant-root .text-input,
.wb-assistant-root .text-area,
.wb-assistant-root .toolbar-select {
  width: 100%;
  min-height: var(--wb-control-height-md);
  box-sizing: border-box;
  border: 1px solid var(--wb-control-border);
  border-radius: var(--wb-control-radius);
  padding: 8px 12px;
  color: var(--wb-text-main);
  background: var(--wb-control-bg);
  transition: background 0.25s cubic-bezier(0.25, 1, 0.5, 1), border-color 0.25s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.25s cubic-bezier(0.25, 1, 0.5, 1);
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
}

.wb-assistant-root .text-input:hover,
.wb-assistant-root .text-area:hover,
.wb-assistant-root .toolbar-select:hover {
  background: var(--wb-control-bg-hover);
  border-color: var(--wb-control-border-hover);
}

.wb-assistant-root .text-input:focus,
.wb-assistant-root .text-area:focus,
.wb-assistant-root .toolbar-select:focus {
  background: var(--wb-control-bg-active);
  border-color: var(--wb-control-border-hover);
  outline: none;
  box-shadow: var(--wb-control-focus-ring), inset 0 1px 2px rgba(0,0,0,0.05);
}

.text-area {
  min-height: 96px;
  resize: vertical;
}

.text-area.compact {
  min-height: 84px;
}

.text-area.large {
  min-height: 190px;
}

.checkbox-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.wb-tools-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.tool-card {
  border: 1px solid var(--wb-border-subtle);
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 170px;
  background: var(--wb-bg-panel);
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.tool-card h4 {
  margin: 0;
  font-size: 13px;
  color: var(--wb-primary-light);
}

.tool-line.stacked {
  display: grid;
  gap: 6px;
}

.find-flags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.find-scope-line {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.find-summary-text {
  margin-left: auto;
  color: var(--wb-primary-light);
  font-size: 12px;
}

.find-active-hit {
  border: 1px solid var(--wb-primary-light);
  border-radius: 10px;
  padding: 10px 12px;
  display: grid;
  gap: 4px;
  background: var(--wb-primary-soft);
  box-shadow: 0 0 0 2px var(--wb-primary-soft);
}

.find-active-hit strong {
  color: var(--wb-text-main);
  font-size: 12px;
}

.find-active-hit span {
  color: var(--wb-text-muted);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.batch-exclude-note {
  color: var(--wb-text-muted);
  font-size: 11px;
}

.batch-exclude-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.exclude-chip {
  border: 1px solid var(--wb-border-subtle);
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 11px;
  color: var(--wb-text-main);
  background: var(--wb-bg-panel);
}

.tool-details {
  border: 1px solid var(--wb-border-main);
  border-radius: 8px;
  padding: 6px;
  background: var(--wb-bg-panel);
}

.tool-details > summary {
  cursor: pointer;
  color: var(--wb-text-main);
  font-size: 12px;
}

.tool-details[open] > summary {
  margin-bottom: 6px;
}

.history-compare {
  display: grid;
  gap: 6px;
}

.history-preview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.history-preview-card {
  border: 1px solid var(--wb-border-subtle);
  border-radius: 10px;
  padding: 10px 12px;
  display: grid;
  gap: 4px;
  background: var(--wb-bg-panel);
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.history-preview-card strong {
  color: var(--wb-primary-light);
  font-size: 11px;
}

.history-preview-card span {
  color: var(--wb-text-muted);
  font-size: 11px;
  line-height: 1.35;
}

.history-note {
  border: 1px dashed var(--wb-border-subtle);
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--wb-text-dim);
  font-size: 12px;
  background: rgba(0, 0, 0, 0.02);
  text-align: center;
}

.tool-scroll {
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tool-list-item {
  border: 1px solid var(--wb-border-subtle);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  background: var(--wb-input-bg);
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.tool-list-item:hover {
  background: var(--wb-input-bg-hover);
  border-color: var(--wb-border-main);
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.item-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.item-main strong,
.activation-main strong {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-main span {
  color: var(--wb-text-muted);
  font-size: 12px;
}

.item-actions {
  display: flex;
  gap: 6px;
}

.activation-item {
  border: 1px solid var(--wb-border-subtle);
  border-radius: 10px;
  padding: 10px 12px;
  display: grid;
  gap: 4px;
  background: var(--wb-input-bg);
  transition: background 0.2s ease, border-color 0.2s ease;
}

.activation-item:hover {
  background: var(--wb-input-bg-hover);
  border-color: var(--wb-border-main);
}

.activation-main,
.activation-sub {
  display: flex;
  justify-content: space-between;
  gap: 6px;
}

.activation-main span,
.activation-sub {
  color: var(--wb-text-muted);
  font-size: 12px;
}

.activation-sub span:last-child {
  flex: 1;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wb-assistant-root .wb-floating-window {
  position: fixed;
  max-width: calc(100vw - 16px);
  max-height: min(74vh, 760px);
  border: 1px solid var(--wb-border-subtle);
  border-radius: 12px;
  background: var(--wb-glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 16px 40px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.wb-assistant-root .wb-floating-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--wb-border-subtle);
  background: var(--wb-glass-header);
  cursor: move;
  user-select: none;
  touch-action: none;
}

.wb-floating-header strong {
  font-size: 12px;
  color: var(--wb-text-main);
}

.wb-floating-header-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.wb-floating-body {
  min-height: 0;
  padding: 12px;
  display: grid;
  gap: 10px;
  overflow: auto;
}

.find-window .wb-floating-body {
  gap: 10px;
}

.activation-window .tool-scroll {
  max-height: min(58vh, 520px);
}

.wb-status {
  border: 1px solid var(--wb-border-subtle);
  border-radius: 12px;
  background: var(--wb-bg-panel);
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: var(--wb-text-main);
  flex-wrap: wrap;
  transition: background 0.3s ease, border-color 0.3s ease;
}

@keyframes wb-status-pulse {
  0% { opacity: 0.8; box-shadow: 0 0 0 rgba(250, 204, 21, 0); }
  50% { opacity: 1; color: #facc15; box-shadow: 0 0 12px rgba(250, 204, 21, 0.2); }
  100% { opacity: 0.8; box-shadow: 0 0 0 rgba(250, 204, 21, 0); }
}

.wb-status.has-unsaved {
  animation: wb-status-pulse 2s infinite ease-in-out;
  border: 1px solid rgba(250, 204, 21, 0.4);
}

.wb-assistant-root .btn {
  display: inline-flex;
  min-height: var(--wb-control-height-md);
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--wb-control-bg);
  border: 1px solid var(--wb-control-border);
  border-radius: var(--wb-control-radius);
  color: var(--wb-text-main);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  transition: background 0.25s cubic-bezier(0.25, 1, 0.5, 1), border-color 0.25s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.25s cubic-bezier(0.25, 1, 0.5, 1), transform 0.25s cubic-bezier(0.25, 1, 0.5, 1);
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  transform: translateZ(0);
}

@keyframes wb-btn-pulse {
  0% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.4); border-color: rgba(52, 211, 153, 0.6); }
  70% { box-shadow: 0 0 0 4px rgba(52, 211, 153, 0); border-color: rgba(52, 211, 153, 1); }
  100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); border-color: rgba(52, 211, 153, 0.6); }
}

.wb-assistant-root .btn.glow-pulse {
  animation: wb-btn-pulse 2s infinite ease-out;
  border-color: #34d399;
  color: #34d399;
  font-weight: 500;
}

.wb-assistant-root .btn:hover:not(:disabled) {
  background: var(--wb-control-bg-hover);
  border-color: var(--wb-control-border-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.wb-assistant-root .btn:active:not(:disabled) {
  transform: translateY(1px) scale(0.97);
  box-shadow: 0 0 0 0 transparent;
}

.wb-assistant-root .btn:disabled {
  opacity: var(--wb-control-disabled-opacity);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.wb-assistant-root .btn.primary {
  background: var(--wb-primary-soft);
  border-color: var(--wb-primary);
  color: var(--wb-primary-light);
}

.wb-assistant-root .btn.primary:hover:not(:disabled) {
  background: var(--wb-primary);
  color: #fff;
  box-shadow: 0 4px 12px var(--wb-primary-soft);
}

.wb-assistant-root .btn.danger {
  background: rgba(225, 29, 72, 0.1);
  border-color: rgba(225, 29, 72, 0.4);
  color: #f43f5e;
}

.wb-assistant-root .btn.danger:hover:not(:disabled) {
  background: #e11d48;
  color: #fff;
  border-color: #be123c;
  box-shadow: 0 4px 12px rgba(225, 29, 72, 0.2);
}

@media (prefers-reduced-motion: reduce) {
  .wb-assistant-root .btn {
    transition: none;
    transform: none;
  }

  .wb-assistant-root .btn:hover:not(:disabled),
  .wb-assistant-root .btn:active:not(:disabled) {
    transform: none;
  }

  .wb-assistant-root .btn.glow-pulse {
    animation: none;
  }
}

.wb-assistant-root .btn.mini {
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 6px;
}

.empty-note,
.empty-block {
  color: var(--wb-text-dim);
  font-size: 13px;
  text-align: center;
  letter-spacing: 0.02em;
}

.empty-block {
  padding: 24px 16px;
  border: 1px dashed var(--wb-border-subtle);
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.02);
  margin: 10px 0;
}

.hidden-input {
  display: none;
}

.wb-assistant-root .wb-modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--wb-overlay-bg);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10020;
  padding: 14px;
  box-sizing: border-box;
}

.wb-assistant-root .wb-history-modal {
  width: min(1260px, 100%);
  max-height: min(88vh, 940px);
  border: 1px solid var(--wb-border-subtle);
  border-radius: 12px;
  background: var(--wb-glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 16px 40px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.wb-assistant-root .wb-history-modal-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--wb-border-subtle);
  background: var(--wb-glass-header);
}

.wb-history-modal-header strong {
  display: block;
  font-size: 14px;
}

.wb-history-modal-header span {
  color: var(--wb-text-muted);
  font-size: 11px;
}

.wb-history-modal-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.wb-history-modal-main {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: 300px 1fr;
  overflow: hidden;
}

.wb-history-versions {
  border-right: 1px solid var(--wb-border-main);
  background: var(--wb-bg-panel);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.wb-history-versions-title {
  padding: 8px 10px;
  font-size: 11px;
  color: var(--wb-text-muted);
  border-bottom: 1px solid var(--wb-border-main);
}

.wb-history-versions-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.wb-history-version-item {
  border: 1px solid var(--wb-border-main);
  border-radius: 8px;
  padding: 6px;
  display: grid;
  gap: 4px;
  background: var(--wb-bg-panel);
}

.wb-history-version-line {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  align-items: center;
}

.wb-history-version-line strong {
  font-size: 11px;
  color: var(--wb-text-main);
}

.wb-history-version-item span {
  font-size: 11px;
  color: var(--wb-text-muted);
  word-break: break-all;
}

.wb-history-lr {
  display: inline-flex;
  gap: 4px;
}

.mini-lr {
  border: 1px solid var(--wb-border-main);
  background: var(--wb-input-bg);
  color: var(--wb-text-muted);
  border-radius: 6px;
  min-width: 24px;
  font-size: 10px;
  cursor: pointer;
}

.mini-lr.active {
  border-color: #22d3ee;
  color: #67e8f9;
}

.wb-history-diff-wrap {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.wb-history-diff-head {
  border-bottom: 1px solid var(--wb-border-main);
  background: var(--wb-bg-panel);
  padding: 8px 10px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  font-size: 11px;
  color: var(--wb-text-muted);
}

.wb-history-visual-main {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
  padding: 10px;
}

.wb-history-version-preview {
  margin-top: 0;
}

.wb-worldbook-compare-list-section {
  min-height: 0;
  flex: 0 0 auto;
}

.wb-history-resizable-layout {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.wb-history-resizable-layout-detail {
  margin-top: 2px;
}

.wb-history-pane-section {
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.wb-history-pane-section > .cross-copy-preview-grid,
.wb-history-pane-section > .cross-copy-visual-section {
  min-height: 0;
  height: 100%;
  margin-top: 0;
}

.wb-history-pane-section > .cross-copy-preview-grid {
  overflow: auto;
}

.wb-history-pane-section .cross-copy-field-table,
.wb-history-pane-section .cross-copy-content-grid {
  min-height: 0;
  flex: 1;
}

.wb-history-pane-section .cross-copy-field-row {
  line-height: 1.35;
}

.wb-history-pane-splitter {
  position: relative;
  flex: 0 0 10px;
  height: 10px;
  cursor: row-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  touch-action: none;
}

.wb-history-pane-splitter::before {
  content: '';
  position: absolute;
  left: 4px;
  right: 4px;
  top: 50%;
  height: 1px;
  background: var(--wb-border-main);
  transform: translateY(-50%);
}

.wb-history-pane-splitter-grip {
  position: relative;
  z-index: 1;
  font-size: 10px;
  color: var(--wb-text-muted);
  letter-spacing: 1px;
  background: var(--wb-bg-panel);
  border-radius: 999px;
  padding: 0 6px;
  border: 1px solid var(--wb-border-subtle);
}

.wb-history-pane-splitter:hover .wb-history-pane-splitter-grip {
  color: var(--wb-primary-light);
  border-color: var(--wb-primary);
}

.wb-history-diff-title {
  padding: 8px 10px;
  border-bottom: 1px solid var(--wb-border-main);
  font-size: 11px;
  color: var(--wb-primary-light);
}

.wb-worldbook-compare-list {
  min-height: 0;
  max-height: 240px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
}

.wb-worldbook-compare-row {
  width: 100%;
  border: 1px solid var(--wb-border-subtle);
  border-radius: 8px;
  background: var(--wb-input-bg);
  color: var(--wb-text-main);
  padding: 8px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
}

.wb-worldbook-compare-row.active {
  border-color: var(--wb-primary);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--wb-primary) 32%, transparent);
}

.wb-worldbook-compare-row-head {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.wb-worldbook-compare-row-head strong {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wb-worldbook-compare-row-note {
  font-size: 12px;
  color: var(--wb-text-muted);
}

.wb-worldbook-detail-empty {
  border: 1px dashed var(--wb-border-subtle);
  border-radius: 10px;
  padding: 10px;
  background: var(--wb-input-bg);
}

@media (max-width: 1380px) {
  .wb-editor-shell {
    grid-template-columns: 1fr;
  }

  .editor-side {
    overflow: visible;
    max-height: none;
  }

  .wb-history-modal-main {
    grid-template-columns: 1fr;
  }

  .wb-history-versions {
    border-right: none;
    border-bottom: 1px solid var(--wb-border-main);
    max-height: 120px;
  }

  .wb-modal-backdrop {
    padding: 2px;
  }

  .wb-history-modal {
    width: 100%;
    max-height: calc(100vh - 4px);
    height: calc(100vh - 4px);
    border-radius: 6px;
  }

  .wb-history-modal-header {
    flex-wrap: wrap;
    gap: 4px;
    padding: 6px 8px;
    flex-shrink: 0;
  }

  .wb-history-modal-header strong {
    font-size: 12px;
  }

  .wb-history-modal-header > div:first-child span {
    display: none;
  }

  .wb-history-modal-actions {
    gap: 4px;
  }

  .wb-history-modal-actions .btn {
    font-size: 10px;
    padding: 3px 6px;
  }

  .wb-history-modal-main {
    grid-template-columns: 1fr;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }

  .wb-history-diff-wrap {
    overflow-y: auto;
    min-height: 0;
  }

  .wb-history-visual-main {
    overflow: auto;
    gap: 8px;
    padding: 8px;
  }

  .wb-history-resizable-layout {
    overflow: visible;
    gap: 8px;
  }

  .wb-history-pane-section {
    overflow: visible;
    flex: 0 0 auto !important;
  }

  .wb-history-pane-section > .cross-copy-preview-grid,
  .wb-history-pane-section > .cross-copy-visual-section {
    height: auto;
  }

  .wb-history-pane-splitter {
    display: none;
  }

  .wb-history-version-preview {
    grid-template-columns: 1fr;
  }

  .wb-worldbook-compare-list {
    max-height: 180px;
  }

  .wb-history-visual-main .cross-copy-content-grid {
    grid-template-columns: 1fr;
  }

  .wb-history-visual-main .cross-copy-content-col + .cross-copy-content-col {
    border-left: none;
    border-top: 1px solid var(--wb-border-main);
  }

  .wb-history-visual-main .cross-copy-content-line {
    grid-template-columns: 1fr;
  }

  .wb-history-visual-main .cross-copy-content-line .line-no {
    display: none;
  }

  .wb-history-diff-head {
    flex-wrap: wrap;
    gap: 4px;
    padding: 6px 8px;
  }

  .wb-history-diff-head > div {
    font-size: 10px;
  }
}

@media (max-width: 1100px) {
  .global-mode-grid {
    grid-template-columns: 1fr;
  }

  .wb-resize-handle {
    display: none;
  }

  .wb-main-layout {
    grid-template-columns: 1fr;
  }

  .wb-tools-grid {
    grid-template-columns: 1fr;
  }

  .editor-grid.two-cols,
  .editor-grid.three-cols {
    grid-template-columns: 1fr;
  }

  .editor-head {
    flex-direction: column;
    align-items: stretch;
  }

  .editor-badges {
    justify-content: flex-start;
  }

  .history-preview-grid {
    grid-template-columns: 1fr;
  }

  .wb-history-visual-main .cross-copy-content-grid {
    grid-template-columns: 1fr;
  }

  .wb-history-visual-main .cross-copy-content-col + .cross-copy-content-col {
    border-left: none;
    border-top: 1px solid var(--wb-border-main);
  }

  .wb-status {
    flex-direction: column;
  }


  .wb-floating-window {
    width: calc(100vw - 16px) !important;
    left: 8px !important;
    right: 8px;
  }
}

.editor-back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin: 0 0 8px 0;
  background: var(--wb-bg-panel);
  border: none;
  border-radius: 6px;
  color: var(--wb-primary);
  font-weight: 600;
  cursor: pointer;
}

.editor-back-btn:hover {
  background: var(--wb-primary-hover);
}

/* ═══ Mobile Tab View ═══ */
.mobile-tab-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.mobile-tab-content {
  flex: 1;
  min-height: 0;
  position: relative;
}

.mobile-pane {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  padding: 8px;
  -webkit-overflow-scrolling: touch;
}

.mobile-entry-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mobile-multi-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  border: 1px solid var(--wb-border-subtle);
  border-radius: 8px;
  padding: 8px;
  background: var(--wb-bg-panel);
  margin-bottom: 4px;
}

.mobile-multi-title {
  font-size: 12px;
  color: var(--wb-primary-light);
}

.mobile-multi-actions {
  display: inline-flex;
  gap: 6px;
  flex-wrap: wrap;
}

.mobile-multi-item {
  position: relative;
}

.mobile-multi-checkbox {
  flex-shrink: 0;
}

.mobile-multi-content-note {
  margin-bottom: 6px;
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 12px;
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.08);
}

.mobile-ai-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.mobile-ai-panel .ai-chat-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.mobile-danger-zone {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--wb-border);
}

.mobile-danger-zone .btn {
  flex: 1;
}

.mobile-tab-bar {
  flex-shrink: 0;
  z-index: 10100;
  display: flex;
  border-top: 1px solid var(--wb-border-main);
  background: var(--wb-bg-panel);
  height: 52px;
}

.mobile-tab-bar button {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: none;
  background: transparent;
  color: var(--wb-text-muted);
  font-size: 10px;
  padding: 4px 0;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.mobile-tab-bar button.active {
  color: var(--wb-primary-light);
  background: var(--wb-primary-soft);
}

.mobile-tab-bar .tab-icon {
  font-size: 20px;
  line-height: 1;
}

.mobile-tab-bar .tab-label {
  font-weight: 500;
}

.wb-assistant-root.is-mobile {
  padding: 6px;
  gap: 8px;

  .wb-modal-backdrop {
    position: absolute;
  }

  .wb-header,
  .wb-bindings,
  .global-mode-panel,
  .wb-toolbar {
    padding: 6px;
    gap: 6px;
  }

  .toolbar-label {
    min-width: 100%;
  }

  .toolbar-select {
    width: 100%;
  }

  .worldbook-picker-trigger {
    white-space: normal;
  }

  .wb-main-layout {
    display: block !important;
    height: auto !important;
    overflow: visible !important;
  }

  .wb-entry-list,
  .wb-editor,
  .wb-editor-shell,
  .editor-side {
    width: 100% !important;
    height: auto !important;
    max-height: none !important;
    border: none !important;
    padding: 0 !important;
  }

  .wb-entry-list {
    max-height: 80vh !important;
    max-height: 80lvh !important;
    overflow-y: auto;
  }

  .wb-editor-shell {
    display: block !important;
  }

  .list-scroll {
    max-height: 60vh;
    max-height: 60lvh;
  }

  .wb-floating-window {
    position: absolute;
    left: 8px !important;
    right: 8px !important;
    width: auto !important;
    max-width: none !important;
  }
}

.list-actions {
  padding: 0 8px;
}

/* ═════════════════════════════════════════════════
   AI Generator Panel
   ═════════════════════════════════════════════════ */
.ai-generator-panel {
  display: flex;
  gap: 0;
  flex: 1;
  min-height: 0;
  border-radius: var(--wb-radius);
  overflow: hidden;
  background: var(--wb-bg-secondary);
}

/* ── Sidebar ── */
.ai-sidebar {
  width: 220px;
  min-width: 180px;
  border-right: 1px solid var(--wb-border);
  display: flex;
  flex-direction: column;
  background: var(--wb-bg-panel);
}

.ai-sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--wb-border);
}

.ai-sidebar-title {
  font-weight: 600;
  font-size: 0.9em;
  color: var(--wb-text-main);
}

.ai-session-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
}

.ai-session-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  width: 100%;
  padding: 8px 10px;
  margin-bottom: 2px;
  border: none;
  border-radius: var(--wb-radius-sm, 6px);
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
  position: relative;
  outline: none;
}

.ai-session-item:hover {
  background: var(--wb-bg-highlight);
}

.ai-session-item:focus-visible {
  box-shadow: 0 0 0 2px var(--wb-primary, #38bdf8);
}

.ai-session-item.active {
  background: var(--wb-primary-soft);
}

.ai-session-title {
  flex: 1;
  font-size: 0.85em;
  color: var(--wb-text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ai-session-meta {
  font-size: 0.72em;
  color: var(--wb-text-dim);
  width: 100%;
  margin-top: 2px;
}

.ai-session-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--wb-text-dim);
  font-size: 1em;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
}

.ai-session-item:hover .ai-session-delete {
  opacity: 1;
}

.ai-session-delete:hover {
  background: var(--wb-danger, #e74c3c);
  color: #fff;
}

/* ── Chat Area ── */
.ai-chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ai-chat-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--wb-text-dim);
}

.ai-chat-empty-icon {
  font-size: 3em;
  opacity: 0.5;
}

.ai-chat-empty-text {
  font-size: 0.95em;
}

.ai-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Chat bubbles ── */
.ai-chat-bubble {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.ai-chat-bubble.user {
  align-self: flex-end;
  background: var(--wb-primary-soft);
  border-bottom-right-radius: 4px;
}

.ai-chat-bubble.assistant {
  align-self: flex-start;
  background: var(--wb-bg-panel);
  border: 1px solid var(--wb-border);
  border-bottom-left-radius: 4px;
}

.ai-chat-bubble-role {
  font-size: 0.72em;
  font-weight: 600;
  color: var(--wb-text-dim);
  margin-bottom: 4px;
}

.ai-chat-bubble-content {
  font-size: 0.88em;
  color: var(--wb-text-main);
}

.ai-cursor {
  animation: ai-blink 0.7s infinite;
  color: var(--wb-primary);
}

@keyframes ai-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.ai-thinking {
  color: var(--wb-text-dim);
  font-style: italic;
}

/* ── Input bar ── */
.ai-chat-input-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--wb-border);
  background: var(--wb-bg-panel);
  align-items: flex-end;
}

.ai-context-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78em;
  color: var(--wb-text-dim);
  cursor: pointer;
  user-select: none;
}

.ai-context-toggle span {
  white-space: nowrap;
}

.ai-chat-input {
  flex: 1;
  resize: vertical;
  min-height: 40px;
  max-height: 140px;
  font-size: 0.88em;
}

.ai-send-btn,
.ai-stop-btn {
  min-width: 64px;
  height: 40px;
}

/* ═════════════════════════════════════════════════
   Tag Review Modal (API Settings / AI Config / Chat Extract)
   ═════════════════════════════════════════════════ */
.ai-tag-review-overlay {
  position: fixed;
  inset: 0;
  z-index: 10350;
  background: var(--wb-overlay-bg);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
  box-sizing: border-box;
}

.ai-tag-review-modal {
  background: var(--wb-glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--wb-border-subtle);
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.1);
  width: 580px;
  max-width: 92vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ai-tag-review-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--wb-border-subtle);
  background: var(--wb-glass-header);
}

.ai-tag-review-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--wb-text-main);
}

.ai-tag-review-close {
  width: 30px;
  height: 30px;
  border: 1px solid var(--wb-border-subtle);
  background: var(--wb-input-bg);
  color: var(--wb-text-main);
  font-size: 1.1em;
  cursor: pointer;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.ai-tag-review-close:hover {
  background: var(--wb-input-bg-hover);
  border-color: #f43f5e;
  transform: translateY(-1px);
}

.ai-tag-review-target {
  padding: 14px 20px;
  border-bottom: 1px solid var(--wb-border-subtle);
}

.ai-tag-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px 20px;
}

.ai-tag-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--wb-border-subtle);
  cursor: pointer;
  transition: background 0.15s ease;
}

.ai-tag-item:last-child {
  border-bottom: none;
}

.ai-tag-item:hover {
  background: var(--wb-primary-soft);
  border-radius: 8px;
  margin: 0 -8px;
  padding: 12px 8px;
}

.ai-tag-item input[type="checkbox"] {
  margin-top: 3px;
}

.ai-tag-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.ai-tag-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--wb-primary-light);
}

.ai-tag-preview {
  font-size: 12px;
  color: var(--wb-text-dim);
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.5;
}

.ai-tag-review-actions {
  display: flex;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid var(--wb-border-subtle);
  justify-content: flex-end;
  background: var(--wb-glass-header);
}

/* ═════════════════════════════════════════════════
   Mobile Responsive
   ═════════════════════════════════════════════════ */
.wb-assistant-root.is-mobile {
  padding: 6px;
  gap: 6px;
  border-radius: 0;

  /* ── Toolbar ── */
  .toolbar-label {
    min-width: unset;
    width: 100%;
  }

  .toolbar-label .wb-base-select {
    flex: 1;
    min-width: 0;
  }

  .toolbar-btns {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .toolbar-btns .btn {
    font-size: 0.78em;
    padding: 4px 8px;
  }

  /* ── Bindings bar ── */
  .wb-bindings {
    flex-wrap: wrap;
    gap: 4px;
    padding: 6px 8px;
    font-size: 0.78em;
  }

  /* ── Main layout ── */
  .wb-main-layout {
    display: block !important;
    overflow: visible;
    flex: none;
  }

  .wb-resize-handle {
    display: none !important;
  }

  .wb-entry-list,
  .wb-editor {
    min-height: 0;
    max-height: none;
  }

  /* ── AI Generator Panel ── */
  .ai-generator-panel {
    flex-direction: column;
  }

  .ai-sidebar {
    width: 100%;
    min-width: unset;
    max-height: 110px;
    border-right: none;
    border-bottom: 1px solid var(--wb-border);
  }

  .ai-sidebar-head {
    padding: 6px 10px;
  }

  .ai-session-list {
    overflow-x: auto;
    overflow-y: hidden;
    display: flex;
    flex-direction: row;
    gap: 4px;
    padding: 4px 8px;
  }

  .ai-session-item {
    flex-shrink: 0;
    min-width: 140px;
    max-width: 200px;
  }

  .ai-chat-messages {
    padding: 10px;
    gap: 8px;
  }

  .ai-chat-bubble {
    max-width: 95%;
  }

  .ai-chat-input-bar {
    padding: 8px 10px;
    gap: 6px;
  }

  .ai-chat-input {
    min-height: 36px;
    font-size: 0.85em;
  }

  /* ── Tag review modal (mobile, constrained inside the assistant panel) ── */
  .ai-tag-review-overlay {
    position: absolute;
    inset: 0;
    padding: 8px;
    z-index: 10350;
    align-items: stretch;
    justify-content: stretch;
  }

  .ai-tag-review-modal {
    width: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
    height: 100%;
    border-radius: 10px;
    border: 1px solid var(--wb-border-subtle);
    box-shadow: 0 10px 32px rgba(0, 0, 0, 0.45);
  }

  .ai-tag-review-head {
    padding: 12px 14px;
    flex-shrink: 0;
  }

  .ai-tag-review-title {
    font-size: 13px;
  }

  .ai-tag-review-close {
    width: 28px;
    height: 28px;
    font-size: 1em;
  }

  .ai-tag-review-target {
    padding: 10px 14px;
    flex-shrink: 0;
  }

  .ai-tag-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 8px 14px;
  }

  .ai-tag-item {
    padding: 10px 0;
    gap: 10px;
  }

  .ai-tag-item:hover {
    margin: 0;
    padding: 10px 0;
    background: transparent;
  }

  .ai-tag-review-actions {
    flex-wrap: wrap;
    gap: 6px;
    padding: 10px 14px;
    flex-shrink: 0;
  }

  .ai-tag-review-actions .btn {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    padding: 8px 10px;
  }

  /* Override inline max-height on modal body scrollable divs */
  .ai-tag-review-modal > div:not(.ai-tag-review-head):not(.ai-tag-review-actions):not(.ai-tag-review-target):not(.ai-tag-list):not(.ai-tag-ignore-config) {
    max-height: none !important;
    flex: 1;
    min-height: 0;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch;
  }

  /* AI config preview table horizontal scroll */
  .ai-tag-review-modal table {
    display: block;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    font-size: 12px;
  }

  /* ── Status footer ── */
  .wb-status {
    font-size: 0.72em;
    padding: 4px 8px;
    gap: 6px;
  }

  /* ── Editor content area ── */
  .editor-content-area {
    flex: 1;
    min-height: 40vh;
    min-height: 40lvh;
  }

  .content-resize-handle {
    display: flex;
    height: 28px;
  }

  .editor-content-block {
    position: relative;
    z-index: 10;
    background: var(--wb-bg-root);
  }

  .content-top-drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 22px;
    cursor: ns-resize;
    background: var(--wb-bg-panel);
    border-radius: 8px 8px 0 0;
    touch-action: none;
    user-select: none;
  }

  .content-top-drag-grip {
    font-size: 12px;
    color: var(--wb-text-dim);
    letter-spacing: 3px;
    line-height: 1;
  }

  .text-area.compact {
    min-height: 60px;
  }

  .editor-center {
    padding: 8px;
  }

  .editor-side {
    padding: 8px;
  }

  .editor-grid.two-cols {
    grid-template-columns: 1fr;
  }
}
</style>
<style scoped>
/* ── Tag System ── */
.worldbook-picker-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px 8px 2px;
}
.worldbook-picker-tags.tree-mode {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid var(--wb-border-subtle);
  background: rgba(12, 24, 52, 0.72);
}

.tag-filter-toolbar {
  display: grid;
  grid-template-columns: auto minmax(120px, 1fr) auto auto auto;
  align-items: center;
  gap: 6px;
}

.tag-filter-open {
  white-space: nowrap;
}

.tag-filter-summary {
  font-size: 12px;
  color: var(--wb-text-dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-filter-select {
  height: 28px;
  min-width: 66px;
  font-size: 12px;
  padding: 3px 8px;
}

.tag-filter-panel-enter-active,
.tag-filter-panel-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.tag-filter-panel-enter-from,
.tag-filter-panel-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.tag-filter-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-radius: 8px;
  border: 1px solid var(--wb-border-subtle);
  background: rgba(7, 18, 40, 0.86);
  padding: 8px;
}

.tag-filter-search {
  height: 30px;
  font-size: 12px;
}

.tag-filter-selected-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 74px;
  overflow: auto;
}

.tag-filter-selected-chip {
  border: 1px solid rgba(96, 165, 250, 0.45);
  background: rgba(37, 99, 235, 0.2);
  color: #bfdbfe;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  cursor: pointer;
}

.tag-tree-list,
.tag-flat-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 220px;
  overflow: auto;
  padding-right: 2px;
}

.tag-tree-row {
  display: grid;
  grid-template-columns: 16px 16px minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: 6px;
  padding: 5px 6px;
  padding-left: calc(6px + var(--depth, 0) * 12px);
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
}

.tag-tree-toggle {
  border: none;
  background: transparent;
  color: var(--wb-text-dim);
  cursor: pointer;
  width: 16px;
  height: 16px;
  padding: 0;
  line-height: 1;
}

.tag-tree-toggle.placeholder {
  display: inline-block;
}

.tag-tree-name {
  color: var(--tag-color, #60a5fa);
  font-size: 12px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-tree-path {
  color: var(--wb-text-dim);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-flat-item {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.02);
  color: var(--tag-color, #60a5fa);
  font-size: 12px;
}

.tag-editor-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  max-height: 100%;
}

.tag-editor-title {
  font-size: 18px;
  font-weight: 700;
}

.tag-create-panel {
  border-radius: 10px;
  border: 1px solid var(--wb-border-subtle);
  background: rgba(255, 255, 255, 0.03);
  padding: 10px;
}

.tag-create-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.tag-create-row .text-input {
  min-width: 180px;
  flex: 1 1 220px;
}

.tag-parent-field {
  margin-top: 8px;
}

.tag-editor-layout {
  display: grid;
  grid-template-columns: minmax(320px, 1fr) minmax(340px, 1.2fr);
  gap: 16px;
  min-height: 0;
}

.tag-editor-subtitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--wb-text-main);
}

.tag-editor-tree-wrap,
.tag-assign-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-radius: 10px;
  border: 1px solid var(--wb-border-subtle);
  background: rgba(255, 255, 255, 0.03);
  padding: 10px;
  min-height: 0;
}

.tag-editor-tree-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 55vh;
  overflow-y: auto;
}

.tag-editor-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 8px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.08);
}

.tag-editor-tree-item {
  display: grid;
  grid-template-columns: auto 12px minmax(120px, 1fr) minmax(160px, 1fr) auto auto;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
}

.tag-editor-indent {
  width: calc(var(--depth, 0) * 14px);
  height: 1px;
}

.tag-editor-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
.tag-editor-name-input {
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255,255,255,.15);
  color: inherit;
  font-size: 13px;
  padding: 2px 4px;
  width: 80px;
  outline: none;
}
.tag-editor-name-input:focus {
  border-bottom-color: #60a5fa;
}

.tag-parent-select {
  min-width: 140px;
  font-size: 12px;
  height: 30px;
}

.tag-color-picker {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
}
.tag-color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  transition: border-color .15s;
}
.tag-color-dot.active {
  border-color: #fff;
  box-shadow: 0 0 4px rgba(255,255,255,.3);
}
.tag-delete-btn {
  background: none;
  border: none;
  color: #f87171;
  font-size: 16px;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
  opacity: .6;
  transition: opacity .15s;
}
.tag-delete-btn:hover {
  opacity: 1;
}

.tag-assign-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.tag-assign-list {
  max-height: 55vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tag-assign-list.compact {
  max-height: 42vh;
}

.tag-assign-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: auto auto;
  align-items: center;
  gap: 4px 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  text-align: left;
}

.tag-assign-row.toggle {
  cursor: pointer;
}

.tag-assign-row.toggle.active {
  border-color: rgba(59, 130, 246, 0.6);
  background: rgba(37, 99, 235, 0.18);
}

.tag-assign-name {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.tag-assign-state {
  font-size: 11px;
  color: #93c5fd;
  border: 1px solid rgba(147, 197, 253, 0.45);
  border-radius: 999px;
  padding: 1px 8px;
}

.tag-assign-paths {
  grid-column: 1 / -1;
  font-size: 11px;
  color: var(--wb-text-dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-tag-editor .tag-editor-title {
  font-size: 16px;
}

.mobile-tag-editor .tag-create-row .text-input {
  flex: 1 1 100%;
}

.mobile-tag-editor .tag-editor-tree-list {
  max-height: 42vh;
}

.mobile-tag-editor .tag-editor-tree-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.mobile-tag-editor .tag-editor-indent {
  width: calc(var(--depth, 0) * 10px);
}

.mobile-tag-editor .tag-editor-name-input {
  flex: 1 1 120px;
  min-width: 100px;
}

.mobile-tag-editor .tag-parent-select {
  width: 100%;
  min-width: 0;
}

@media (max-width: 1360px) {
  .tag-filter-toolbar {
    grid-template-columns: auto minmax(100px, 1fr) auto;
    grid-auto-rows: auto;
  }
  .tag-filter-summary {
    grid-column: 2 / 4;
  }
}

@media (max-width: 1200px) {
  .tag-editor-layout {
    grid-template-columns: 1fr;
  }
  .tag-assign-controls {
    grid-template-columns: 1fr;
  }
  .tag-editor-tree-item {
    grid-template-columns: auto 12px minmax(0, 1fr);
  }
  .tag-editor-tree-item .tag-parent-select {
    grid-column: 3 / 4;
  }
  .tag-editor-tree-item .tag-color-picker {
    grid-column: 2 / 4;
  }
  .tag-editor-tree-item .tag-delete-btn {
    grid-column: 1 / 2;
    justify-self: end;
  }
}

@media (max-width: 760px) {
  .tag-filter-toolbar {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }
  .tag-filter-select {
    min-width: 58px;
  }
  .tag-tree-row {
    grid-template-columns: 14px 14px minmax(0, 1fr);
  }
  .tag-tree-path {
    grid-column: 3 / 4;
  }
  .tag-assign-list,
  .tag-assign-list.compact {
    max-height: 38vh;
  }
}
</style>
