import type { ComputedRef, Ref } from 'vue';
import { normalizeCrossCopyPersistState } from '../domain/persistedState';
import type { CrossCopyPersistState, PersistedState } from '../domain/types';

export function useCrossCopyPersistence(options: {
  persistedState: Ref<PersistedState>;
  updatePersistedState: (mutator: (state: PersistedState) => void) => void;
  sourceWorldbook: Ref<string>;
  targetWorldbook: Ref<string>;
  useDraftSourceWhenCurrent: Ref<boolean>;
  snapshotBeforeApply: Ref<boolean>;
  desktopLeftWidth: Ref<number>;
  desktopLeftWidthClamped: ComputedRef<number>;
  controlsCollapsed: Ref<boolean>;
  workspaceToolsExpanded: Ref<boolean>;
}) {
  function applyFromPersisted(): void {
    const state = normalizeCrossCopyPersistState(options.persistedState.value.cross_copy);
    options.sourceWorldbook.value = state.last_source_worldbook;
    options.targetWorldbook.value = state.last_target_worldbook;
    options.useDraftSourceWhenCurrent.value = state.use_draft_source_when_current;
    options.snapshotBeforeApply.value = state.snapshot_before_apply;
    options.desktopLeftWidth.value = state.desktop_left_width;
    options.controlsCollapsed.value = state.controls_collapsed;
    options.workspaceToolsExpanded.value = state.workspace_tools_expanded;
  }

  function persist(): void {
    options.updatePersistedState(state => {
      state.cross_copy = {
        last_source_worldbook: options.sourceWorldbook.value,
        last_target_worldbook: options.targetWorldbook.value,
        use_draft_source_when_current: options.useDraftSourceWhenCurrent.value,
        snapshot_before_apply: options.snapshotBeforeApply.value,
        desktop_left_width: options.desktopLeftWidthClamped.value,
        controls_collapsed: options.controlsCollapsed.value,
        workspace_tools_expanded: options.workspaceToolsExpanded.value,
      } satisfies CrossCopyPersistState;
    });
  }

  return {
    applyFromPersisted,
    persist,
  };
}
