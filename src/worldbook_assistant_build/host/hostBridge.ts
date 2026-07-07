export function getHostWindow(): Window {
  try {
    return window.parent || window;
  } catch {
    return window;
  }
}

export function getHostDocument(): Document {
  try {
    return getHostWindow().document;
  } catch {
    return document;
  }
}

export function resolveModalTarget(root: HTMLElement | null): HTMLElement | string {
  return root?.ownerDocument?.body ?? getHostDocument().body ?? 'body';
}

export function stopHostPointerEvents(event: Event): void {
  event.stopPropagation();
}
