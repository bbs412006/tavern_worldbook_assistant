import { computed, type Ref } from 'vue';
import type { CrossCopyAction, CrossCopyRow, CrossCopyRowStatus, CrossCopyStatusFilter } from '../domain/types';

export function useCrossCopySelection(options: {
  rows: Ref<CrossCopyRow[]>;
  searchText: Ref<string>;
  statusFilter: Ref<CrossCopyStatusFilter>;
  ensureRenameForRow: (row: CrossCopyRow) => void;
  openDiff: (row: CrossCopyRow) => void;
}) {
  const sourceRowsFiltered = computed(() => {
    const keyword = options.searchText.value.trim().toLowerCase();
    return options.rows.value.filter(row => {
      if (!keyword) {
        return true;
      }
      return (
        row.source_entry.name.toLowerCase().includes(keyword) ||
        row.source_entry.content.toLowerCase().includes(keyword)
      );
    });
  });

  const rowsFiltered = computed(() => {
    if (options.statusFilter.value === 'all') {
      return sourceRowsFiltered.value;
    }
    return sourceRowsFiltered.value.filter(row => row.status === options.statusFilter.value);
  });

  const selectedRows = computed(() => options.rows.value.filter(row => row.selected));
  const statusCounts = computed(() => {
    const counts: Record<CrossCopyRowStatus, number> = {
      new: 0,
      duplicate_exact: 0,
      same_name_changed: 0,
      content_duplicate_other_name: 0,
      invalid_same_source_target: 0,
    };
    for (const row of options.rows.value) {
      counts[row.status] += 1;
    }
    return counts;
  });
  const selectedCount = computed(() => selectedRows.value.length);

  function findRow(rowId: string): CrossCopyRow | null {
    return options.rows.value.find(item => item.id === rowId) ?? null;
  }

  function setRowSelected(rowId: string, selected: boolean): void {
    const row = findRow(rowId);
    if (!row || row.status === 'invalid_same_source_target') {
      return;
    }
    row.selected = selected;
  }

  function setSelectionForRows(rows: CrossCopyRow[], selected: boolean): void {
    for (const row of rows) {
      if (row.status === 'invalid_same_source_target') {
        row.selected = false;
        continue;
      }
      row.selected = selected;
    }
  }

  function setSelectionForFiltered(selected: boolean): void {
    setSelectionForRows(sourceRowsFiltered.value, selected);
  }

  function setSelectionForAll(selected: boolean): void {
    setSelectionForRows(options.rows.value, selected);
  }

  function setRowAction(rowId: string, action: CrossCopyAction): void {
    const row = findRow(rowId);
    if (!row) {
      return;
    }
    row.action = action;
    if (row.action === 'rename_create') {
      options.ensureRenameForRow(row);
    }
  }

  function setRowRenameName(rowId: string, value: string): void {
    const row = findRow(rowId);
    if (!row) {
      return;
    }
    row.rename_name = value;
  }

  function handleRowRenameBlur(rowId: string): void {
    const row = findRow(rowId);
    if (!row) {
      return;
    }
    options.ensureRenameForRow(row);
  }

  function openDiffById(rowId: string): void {
    const row = findRow(rowId);
    if (!row) {
      return;
    }
    options.openDiff(row);
  }

  function applyBulkAction(action: CrossCopyAction): void {
    for (const row of options.rows.value) {
      if (!row.selected) {
        continue;
      }
      row.action = action;
      if (row.action === 'rename_create') {
        options.ensureRenameForRow(row);
      }
    }
  }

  function applyActionByStatus(status: CrossCopyRowStatus, action: CrossCopyAction): void {
    for (const row of options.rows.value) {
      if (!row.selected || row.status !== status) {
        continue;
      }
      row.action = action;
      if (row.action === 'rename_create') {
        options.ensureRenameForRow(row);
      }
    }
  }

  return {
    sourceRowsFiltered,
    rowsFiltered,
    selectedRows,
    statusCounts,
    selectedCount,
    findRow,
    setSelectionForFiltered,
    setSelectionForAll,
    setRowSelected,
    setRowAction,
    setRowRenameName,
    handleRowRenameBlur,
    openDiffById,
    applyBulkAction,
    applyActionByStatus,
  };
}
