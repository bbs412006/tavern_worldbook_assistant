import type { ComputedRef, Ref } from 'vue';
import { klona } from 'klona';
import { normalizeEntryList } from '../domain/persistedState';
import {
  applyCrossCopyRowsToEntries,
  createCrossCopyApplyStats,
  formatCrossCopyApplySummary,
} from '../domain/crossCopy';
import type { CrossCopyRow } from '../domain/types';

export function useCrossCopyApply(options: {
  sourceWorldbook: Ref<string>;
  targetWorldbook: Ref<string>;
  rows: Ref<CrossCopyRow[]>;
  applyLoading: Ref<boolean>;
  snapshotBeforeApply: Ref<boolean>;
  currentWorldbookName: Ref<string>;
  hasUnsavedChanges: Ref<boolean> | ComputedRef<boolean>;
  lastResultSummary: Ref<string>;
  getWorldbook: (name: string) => Promise<WorldbookEntry[]>;
  updateWorldbookWith: (
    name: string,
    updater: (entries: WorldbookEntry[]) => WorldbookEntry[],
    options?: { render?: 'immediate' | 'silent' },
  ) => Promise<WorldbookEntry[]>;
  saveCurrentWorldbook: () => Promise<void>;
  pushSnapshot: (worldbookName: string, entries: WorldbookEntry[], label: string) => void;
  syncCurrentTargetEntries: (entries: WorldbookEntry[]) => void;
  refreshComparison: () => Promise<void>;
  setStatus: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  success: (message: string) => void;
}) {
  async function applySelection(): Promise<void> {
    if (!options.sourceWorldbook.value || !options.targetWorldbook.value) {
      options.warn('请先选择来源与目标世界书');
      return;
    }
    if (options.sourceWorldbook.value === options.targetWorldbook.value) {
      options.warn('来源和目标不能相同');
      return;
    }
    const selectedRows = options.rows.value.filter(row => row.selected);
    if (!selectedRows.length) {
      options.warn('请至少勾选一条来源条目');
      return;
    }
    if (options.applyLoading.value) {
      return;
    }

    if (options.targetWorldbook.value === options.currentWorldbookName.value && options.hasUnsavedChanges.value) {
      options.setStatus('目标为当前世界书，正在自动保存未保存修改...');
      await options.saveCurrentWorldbook();
      if (options.hasUnsavedChanges.value) {
        options.error('自动保存失败，请先处理保存问题后再执行复制');
        return;
      }
    }

    options.applyLoading.value = true;
    try {
      const targetName = options.targetWorldbook.value;
      const targetBefore = normalizeEntryList(await options.getWorldbook(targetName));
      if (options.snapshotBeforeApply.value) {
        options.pushSnapshot(targetName, targetBefore, '跨书复制前快照');
      }

      const orderedRows = options.rows.value.filter(row => row.selected);
      const stats = createCrossCopyApplyStats(orderedRows);
      const updatedEntries = await options.updateWorldbookWith(targetName, worldbook => {
        return applyCrossCopyRowsToEntries(worldbook, orderedRows, stats);
      }, { render: 'immediate' });

      if (targetName === options.currentWorldbookName.value) {
        const normalized = normalizeEntryList(updatedEntries.map(entry => klona(entry)));
        options.syncCurrentTargetEntries(normalized);
      }

      options.lastResultSummary.value = formatCrossCopyApplySummary(stats);
      options.setStatus(`跨书复制完成：${options.lastResultSummary.value}`);
      options.success('跨书复制已完成');
      await options.refreshComparison();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      options.error(`复制失败: ${message}`);
      options.lastResultSummary.value = `执行失败：${message}`;
    } finally {
      options.applyLoading.value = false;
    }
  }

  return {
    applySelection,
  };
}
