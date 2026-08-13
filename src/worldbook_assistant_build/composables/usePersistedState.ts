import { klona } from 'klona';
import { ref } from 'vue';
import { STORAGE_KEY } from '../domain/uiConstants';
import {
  createDefaultPersistedState,
  enforceHistoryByteBudget,
  normalizePersistedState,
} from '../domain/persistedState';
import type { PersistedState } from '../domain/types';

interface PersistedStateOptions {
  scheduleWrite?: (task: () => void) => void;
}

export function usePersistedState(
  onStateWritten?: (state: PersistedState) => void,
  options: PersistedStateOptions = {},
) {
  const persistedState = ref<PersistedState>(createDefaultPersistedState());
  let writeScheduled = false;

  function readPersistedState(): PersistedState {
    const vars = getVariables({ type: 'script', script_id: getScriptId() });
    return normalizePersistedState(vars[STORAGE_KEY]);
  }

  function commitPersistedState(): void {
    writeScheduled = false;
    enforceHistoryByteBudget(persistedState.value);
    const vars = getVariables({ type: 'script', script_id: getScriptId() });
    vars[STORAGE_KEY] = klona(persistedState.value);
    replaceVariables(vars, { type: 'script', script_id: getScriptId() });
    onStateWritten?.(persistedState.value);
  }

  function schedulePersistedStateWrite(): void {
    if (!options.scheduleWrite) {
      commitPersistedState();
      return;
    }
    if (writeScheduled) {
      return;
    }
    writeScheduled = true;
    options.scheduleWrite(commitPersistedState);
  }

  function writePersistedState(state: PersistedState): void {
    persistedState.value = klona(state);
    schedulePersistedStateWrite();
  }

  function updatePersistedState(mutator: (state: PersistedState) => void): void {
    const state = klona(persistedState.value);
    mutator(state);
    persistedState.value = state;
    schedulePersistedStateWrite();
  }

  function flushPersistedState(): void {
    if (writeScheduled) {
      commitPersistedState();
    }
  }

  return {
    persistedState,
    readPersistedState,
    writePersistedState,
    updatePersistedState,
    flushPersistedState,
  };
}
