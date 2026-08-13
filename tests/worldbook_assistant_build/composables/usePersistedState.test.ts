// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePersistedState } from '../../../src/worldbook_assistant_build/composables/usePersistedState';
import { STORAGE_KEY } from '../../../src/worldbook_assistant_build/domain/uiConstants';

const globals = globalThis as Record<string, any>;

describe('usePersistedState', () => {
  let variables: Record<string, unknown>;

  beforeEach(() => {
    variables = {};
    globals.getScriptId = vi.fn(() => 'persisted-state-test');
    globals.getVariables = vi.fn(() => variables);
    globals.replaceVariables = vi.fn((next: Record<string, unknown>) => {
      variables = next;
    });
  });

  it('updates from the in-memory authority without reading and normalizing the host state again', () => {
    const state = usePersistedState();
    state.persistedState.value = state.readPersistedState();
    vi.mocked(globals.getVariables).mockClear();

    state.updatePersistedState(current => {
      current.theme = 'forest';
    });
    state.updatePersistedState(current => {
      current.show_ai_chat = true;
    });

    expect(globals.getVariables).toHaveBeenCalledTimes(2);
    expect(state.persistedState.value.theme).toBe('forest');
    expect(state.persistedState.value.show_ai_chat).toBe(true);
    expect((variables[STORAGE_KEY] as Record<string, unknown>).theme).toBe('forest');
  });

  it('coalesces multiple updates into one host write when a scheduler is supplied', () => {
    const scheduled: Array<() => void> = [];
    const state = usePersistedState(undefined, {
      scheduleWrite(task) {
        scheduled.splice(0, scheduled.length, task);
      },
    });
    state.persistedState.value = state.readPersistedState();
    vi.mocked(globals.replaceVariables).mockClear();

    state.updatePersistedState(current => { current.theme = 'forest'; });
    state.updatePersistedState(current => { current.show_ai_chat = true; });

    expect(globals.replaceVariables).not.toHaveBeenCalled();
    expect(scheduled).toHaveLength(1);
    scheduled[0]!();
    expect(globals.replaceVariables).toHaveBeenCalledTimes(1);
  });
});
