import { computed, ref, type Ref } from 'vue';
import {
  buildCrossCopyFieldDiffRows,
  buildCrossCopyTextDiff,
  getCrossCopyPrimaryTargetMatch,
  getCrossCopyRowDiffSummary,
} from '../domain/crossCopy';
import type { CrossCopyFieldDiffRow, CrossCopyRow, CrossCopyTextDiffResult } from '../domain/types';

function toText(value: unknown): string {
  return String(value ?? '');
}

export function useCrossCopyDiffModal(options: {
  rows: Ref<CrossCopyRow[]>;
}) {
  const showModal = ref(false);
  const rowId = ref('');

  const row = computed(() => {
    if (!rowId.value) {
      return null;
    }
    return options.rows.value.find(item => item.id === rowId.value) ?? null;
  });

  const targetEntry = computed(() => {
    if (!row.value) {
      return null;
    }
    return getCrossCopyPrimaryTargetMatch(row.value);
  });

  const fieldDiffRows = computed<CrossCopyFieldDiffRow[]>(() => {
    return buildCrossCopyFieldDiffRows(row.value?.source_entry ?? null, targetEntry.value);
  });

  const contentDiff = computed<CrossCopyTextDiffResult>(() => {
    const left = row.value?.source_entry.content ?? '';
    const right = targetEntry.value?.content ?? '';
    return buildCrossCopyTextDiff(toText(left), toText(right));
  });

  const contentDiffSummary = computed(() => {
    const result = contentDiff.value;
    return `新增行 ${result.added} / 修改行 ${result.changed} / 删除行 ${result.removed}`;
  });

  const summary = computed(() => {
    if (!row.value) {
      return '未选择对比条目';
    }
    if (!targetEntry.value) {
      return '目标无直接命中，右侧为空';
    }
    return getCrossCopyRowDiffSummary(row.value);
  });

  const headerText = computed(() => {
    if (!row.value) {
      return '-';
    }
    const sourceName = row.value.source_entry.name || `条目 ${row.value.source_entry.uid}`;
    const targetName = targetEntry.value
      ? (targetEntry.value.name || `条目 ${targetEntry.value.uid}`)
      : '无命中条目';
    return `${sourceName}  ↔  ${targetName}`;
  });

  function open(targetRow: CrossCopyRow): void {
    rowId.value = targetRow.id;
    showModal.value = true;
  }

  function close(): void {
    showModal.value = false;
    rowId.value = '';
  }

  return {
    showModal,
    rowId,
    row,
    targetEntry,
    fieldDiffRows,
    contentDiff,
    contentDiffSummary,
    summary,
    headerText,
    open,
    close,
  };
}
