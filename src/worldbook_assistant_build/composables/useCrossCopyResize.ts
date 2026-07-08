import { computed, ref, type ComputedRef, type Ref } from 'vue';
import {
  CROSS_COPY_DESKTOP_LEFT_MAX,
  CROSS_COPY_DESKTOP_LEFT_MIN,
  CROSS_COPY_RIGHT_MIN,
  CROSS_COPY_SPLITTER_SIZE,
} from '../domain/uiConstants';
import { clampNumber } from '../domain/persistedState';
import type { CrossCopyPaneResizeState } from '../domain/types';

export function useCrossCopyResize(options: {
  desktopLeftWidth: Ref<number>;
  desktopSingleColumn: ComputedRef<boolean>;
  cineLocked: ComputedRef<boolean>;
  persistState: () => void;
}) {
  const crossCopyPaneResizeState = ref<CrossCopyPaneResizeState | null>(null);
  const crossCopyGridElement = ref<HTMLElement | null>(null);

  const desktopLeftWidthClamped = computed(() =>
    clampNumber(Math.floor(options.desktopLeftWidth.value), CROSS_COPY_DESKTOP_LEFT_MIN, CROSS_COPY_DESKTOP_LEFT_MAX),
  );
  const gridStyle = computed((): Record<string, string> | undefined => {
    if (options.desktopSingleColumn.value) {
      return undefined;
    }
    return {
      gridTemplateColumns: `${desktopLeftWidthClamped.value}px ${CROSS_COPY_SPLITTER_SIZE}px minmax(0, 1fr)`,
    };
  });

  function startResize(event: PointerEvent, gridElement: HTMLElement | null): void {
    if (options.cineLocked.value) {
      return;
    }
    if (options.desktopSingleColumn.value) {
      return;
    }
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    crossCopyGridElement.value = gridElement;
    const trigger = event.currentTarget as HTMLElement | null;
    const hostDoc = trigger?.ownerDocument ?? document;
    const hostWin = hostDoc.defaultView ?? window;
    crossCopyPaneResizeState.value = {
      pointerId: event.pointerId,
      doc: hostDoc,
      win: hostWin,
    };
    trigger?.setPointerCapture?.(event.pointerId);
    hostDoc.addEventListener('pointermove', onResizeMove);
    hostDoc.addEventListener('pointerup', stopResize);
    hostDoc.addEventListener('pointercancel', stopResize);
    hostWin.addEventListener('blur', stopResize);
    event.preventDefault();
  }

  function onResizeMove(event: PointerEvent): void {
    const state = crossCopyPaneResizeState.value;
    if (!state || state.pointerId !== event.pointerId) {
      return;
    }
    const rect = crossCopyGridElement.value?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const pointerLeft = Math.floor(event.clientX - rect.left - CROSS_COPY_SPLITTER_SIZE / 2);
    const maxByLayout = Math.max(
      CROSS_COPY_DESKTOP_LEFT_MIN,
      Math.floor(rect.width - CROSS_COPY_SPLITTER_SIZE - CROSS_COPY_RIGHT_MIN),
    );
    const maxWidth = Math.min(CROSS_COPY_DESKTOP_LEFT_MAX, maxByLayout);
    options.desktopLeftWidth.value = clampNumber(pointerLeft, CROSS_COPY_DESKTOP_LEFT_MIN, maxWidth);
  }

  function stopResize(): void {
    const state = crossCopyPaneResizeState.value;
    if (!state) {
      return;
    }
    state.doc.removeEventListener('pointermove', onResizeMove);
    state.doc.removeEventListener('pointerup', stopResize);
    state.doc.removeEventListener('pointercancel', stopResize);
    state.win.removeEventListener('blur', stopResize);
    crossCopyPaneResizeState.value = null;
    crossCopyGridElement.value = null;
    options.desktopLeftWidth.value = desktopLeftWidthClamped.value;
    options.persistState();
  }

  return {
    crossCopyPaneResizeState,
    desktopLeftWidthClamped,
    gridStyle,
    startResize,
    stopResize,
  };
}
