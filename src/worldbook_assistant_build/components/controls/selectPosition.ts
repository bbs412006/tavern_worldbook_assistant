export interface SelectRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

export interface SelectMenuPlacement {
  side: 'up' | 'down';
  left: number;
  top: number;
  width: number;
  maxHeight: number;
}

const BOUNDARY_GAP = 8;

export function calculateSelectMenuPlacement(
  triggerRect: SelectRect,
  rootRect: SelectRect,
  viewportHeight: number,
  preferredMaxHeight: number,
): SelectMenuPlacement {
  const visibleTop = Math.max(rootRect.top, 0);
  const visibleBottom = Math.min(rootRect.bottom, viewportHeight);
  const availableUp = Math.max(0, triggerRect.top - visibleTop - BOUNDARY_GAP);
  const availableDown = Math.max(0, visibleBottom - triggerRect.bottom - BOUNDARY_GAP);
  const side: 'up' | 'down' = availableDown >= preferredMaxHeight || availableDown >= availableUp ? 'down' : 'up';
  const maxHeight = Math.min(preferredMaxHeight, side === 'down' ? availableDown : availableUp);
  const innerWidth = Math.max(0, rootRect.width - BOUNDARY_GAP * 2);
  const width = Math.min(Math.max(0, triggerRect.width), innerWidth);
  const triggerLeft = triggerRect.left - rootRect.left;
  const maxLeft = Math.max(BOUNDARY_GAP, rootRect.width - BOUNDARY_GAP - width);
  const left = Math.min(Math.max(triggerLeft, BOUNDARY_GAP), maxLeft);
  const triggerTop = triggerRect.top - rootRect.top;
  const triggerBottom = triggerRect.bottom - rootRect.top;
  const top = side === 'down' ? triggerBottom : triggerTop - maxHeight;

  return { side, left, top, width, maxHeight };
}
