import { ref } from 'vue';
import { STORAGE_KEY } from '../domain/uiConstants';
import { createDefaultPersistedState, normalizePersistedState } from '../domain/persistedState';
import type { PersistedState } from '../domain/types';

export function usePersistedState(onStateWritten?: (state: PersistedState) => void) {
  const persistedState = ref<PersistedState>(createDefaultPersistedState());

  function readPersistedState(): PersistedState {
    const vars = getVariables({ type: 'script', script_id: getScriptId() });
    return normalizePersistedState(vars[STORAGE_KEY]);
  }

  function writePersistedState(state: PersistedState): void {
    const vars = getVariables({ type: 'script', script_id: getScriptId() });
    vars[STORAGE_KEY] = state;
    replaceVariables(vars, { type: 'script', script_id: getScriptId() });
    persistedState.value = state;
    onStateWritten?.(state);
  }

  function updatePersistedState(mutator: (state: PersistedState) => void): void {
    const state = readPersistedState();
    mutator(state);
    writePersistedState(state);
  }

  return {
    persistedState,
    readPersistedState,
    writePersistedState,
    updatePersistedState,
  };
}
