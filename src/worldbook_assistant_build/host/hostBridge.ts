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
