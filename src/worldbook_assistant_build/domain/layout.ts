export function isCompactLayoutWidth(viewportWidth: number): boolean {
  return viewportWidth <= 1100;
}

export function isDesktopFocusLayout(isMobile: boolean, isCompactLayout: boolean, isFocusEditing: boolean): boolean {
  return !isMobile && !isCompactLayout && isFocusEditing;
}

export interface MainLayoutStyleInput {
  isMobile: boolean;
  isCompactLayout: boolean;
  activeMainPaneMin: number;
  activeMainPaneWidth: number;
  mainEditorMin: number;
  resizeHandleSize: number;
}

export function buildMainLayoutStyle(input: MainLayoutStyleInput): Record<string, string> | undefined {
  if (input.isMobile) {
    return {
      display: 'block',
      height: 'auto',
      overflow: 'visible',
    };
  }
  if (input.isCompactLayout) {
    return undefined;
  }
  return {
    gridTemplateColumns: `minmax(${input.activeMainPaneMin}px, min(${input.activeMainPaneWidth}px, calc(100% - ${input.mainEditorMin + input.resizeHandleSize}px))) ${input.resizeHandleSize}px minmax(0, 1fr)`,
  };
}

export interface EditorShellStyleInput {
  isCompactLayout: boolean;
  activeEditorSideMin: number;
  activeEditorSideWidth: number;
  editorCenterMin: number;
  resizeHandleSize: number;
}

export function buildEditorShellStyle(input: EditorShellStyleInput): Record<string, string> | undefined {
  if (input.isCompactLayout) {
    return undefined;
  }
  return {
    gridTemplateColumns: `minmax(0, 1fr) ${input.resizeHandleSize}px minmax(${input.activeEditorSideMin}px, min(${input.activeEditorSideWidth}px, calc(100% - ${input.editorCenterMin + input.resizeHandleSize}px)))`,
  };
}
