import { expect, test } from '@playwright/test';

async function openAssistant(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/tests/worldbook_assistant_build/e2e/host.html');
  await page.waitForFunction(() => (globalThis as Record<string, unknown>).__WB_E2E_READY__ === true);
  const fab = page.locator('#wb-assistant-fab');
  await expect(fab).toBeVisible();
  await fab.click();
  await expect(page.locator('#wb-assistant-panel')).toHaveClass(/active/);
  await expect(page.locator('[data-main-workspace]')).toBeVisible();
}

async function openUtilityPage(
  page: import('@playwright/test').Page,
  label: '⚙️ 设置' | '🔧 AI配置',
  heading: '⚙️ 设置中心' | '🔧 AI 配置世界书',
): Promise<void> {
  await page.getByRole('button', { name: label, exact: true }).first().click();
  await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
}

test('loads the tracked production bundle in a mobile host without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await openAssistant(page);

  await expect(page.locator('.mobile-entry-list .entry-item')).toHaveCount(18);
  const geometry = await page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>('#wb-assistant-panel');
    const pane = document.querySelector<HTMLElement>('.mobile-pane:not([style*="display: none"])');
    const list = document.querySelector<HTMLElement>('.mobile-entry-list');
    const fab = document.querySelector<HTMLElement>('#wb-assistant-fab');
    return {
      docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      panelOverflow: panel ? panel.scrollWidth - panel.clientWidth : -1,
      paneOverflow: pane ? pane.scrollWidth - pane.clientWidth : -1,
      listOverflow: list ? list.scrollWidth - list.clientWidth : -1,
      fabVisibility: fab ? getComputedStyle(fab).visibility : 'missing',
      fabPointerEvents: fab ? getComputedStyle(fab).pointerEvents : 'missing',
      errors: (globalThis as unknown as Record<string, unknown[]>).__WB_E2E_ERRORS__ ?? [],
    };
  });

  expect(geometry.docOverflow).toBeLessThanOrEqual(0);
  expect(geometry.panelOverflow).toBeLessThanOrEqual(0);
  expect(geometry.paneOverflow).toBeLessThanOrEqual(0);
  expect(geometry.listOverflow).toBeLessThanOrEqual(0);
  expect(geometry.fabVisibility).toBe('hidden');
  expect(geometry.fabPointerEvents).toBe('none');
  expect(geometry.errors).toEqual([]);
});

test('reopens the retained panel repeatedly without duplicate roots or runtime errors', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await openAssistant(page);

  for (let index = 0; index < 10; index += 1) {
    await page.locator('#wb-assistant-panel .wb-assistant-close').click();
    await expect(page.locator('#wb-assistant-panel')).not.toHaveClass(/active/);
    await page.locator('#wb-assistant-fab').click();
    await expect(page.locator('#wb-assistant-panel')).toHaveClass(/active/);
  }

  await expect(page.locator('#wb-assistant-panel')).toHaveCount(1);
  await expect(page.locator('#wb-assistant-panel .wb-assistant-root')).toHaveCount(1);
  const errors = await page.evaluate(() => (globalThis as unknown as Record<string, unknown[]>).__WB_E2E_ERRORS__ ?? []);
  expect(errors).toEqual([]);
});

test('keeps the production workspace and owned resources bounded across 20 utility round trips', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.addInitScript(() => {
    (globalThis as Record<string, unknown>).__WB_ASSISTANT_ENABLE_PERFORMANCE_DIAGNOSTICS__ = true;
  });
  await openAssistant(page);

  const originalWorkspace = page.locator('[data-main-workspace]');
  await originalWorkspace.evaluate(element => {
    (globalThis as Record<string, unknown>).__WB_E2E_WORKSPACE__ = element;
  });

  for (let cycle = 0; cycle < 20; cycle += 1) {
    await openUtilityPage(page, '⚙️ 设置', '⚙️ 设置中心');
    await page.locator('.utility-page-back').click();
    await expect(originalWorkspace).toBeVisible();

    await openUtilityPage(page, '🔧 AI配置', '🔧 AI 配置世界书');
    await page.locator('.utility-page-back').click();
    await expect(originalWorkspace).toBeVisible();
  }

  const snapshot = await page.evaluate(() => {
    const target = globalThis as Record<string, any>;
    const workspace = document.querySelector('[data-main-workspace]');
    return {
      sameWorkspace: workspace === target.__WB_E2E_WORKSPACE__,
      workspaceCount: document.querySelectorAll('[data-main-workspace]').length,
      utilityPageCount: document.querySelectorAll('.utility-page').length,
      diagnostics: target.__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__?.(),
      errors: target.__WB_E2E_ERRORS__ ?? [],
    };
  });

  expect(snapshot.sameWorkspace).toBe(true);
  expect(snapshot.workspaceCount).toBe(1);
  expect(snapshot.utilityPageCount).toBe(0);
  expect(snapshot.diagnostics).toMatchObject({
    metrics: {
      'open-settings': { count: 20 },
      'open-ai-config': { count: 20 },
      'return-main': { count: 40 },
    },
    mainWorkspaceMounts: 1,
    utilityPageMounts: { settings: 20, 'ai-config': 20 },
  });
  expect(snapshot.diagnostics.resources['navigation-frame']).toBe(0);
  expect(snapshot.diagnostics.resources['workspace-frame']).toBe(0);
  expect(snapshot.diagnostics.resources['pane-session']).toBe(0);
  expect(snapshot.diagnostics.resources['content-session']).toBe(0);
  expect(snapshot.diagnostics.resources['top-session']).toBe(0);
  expect(snapshot.diagnostics.resources['floating-session']).toBe(0);
  expect(snapshot.errors).toEqual([]);
});

test('premounts the workspace before the first FAB click', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto('/tests/worldbook_assistant_build/e2e/host.html');
  await page.waitForFunction(() => (globalThis as Record<string, unknown>).__WB_E2E_READY__ === true);

  await expect(page.locator('#wb-assistant-panel .wb-assistant-root')).toHaveCount(1, { timeout: 5000 });

  const fab = page.locator('#wb-assistant-fab');
  await fab.click();
  await expect(page.locator('#wb-assistant-panel')).toHaveClass(/active/);
});

test('collapses the FAB at a screen edge and expands it before opening the panel', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto('/tests/worldbook_assistant_build/e2e/host.html');
  await page.waitForFunction(() => (globalThis as Record<string, unknown>).__WB_E2E_READY__ === true);

  const fab = page.locator('#wb-assistant-fab');
  const box = await fab.boundingBox();
  expect(box).not.toBeNull();
  const pointerY = (box?.y ?? 0) + (box?.height ?? 0) / 2;

  await page.mouse.move((box?.x ?? 0) + (box?.width ?? 0) / 2, pointerY);
  await page.mouse.down();
  await page.mouse.move(10, pointerY, { steps: 12 });
  await page.mouse.up();

  await expect(fab).toHaveClass(/edge-collapsed-left/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('__WB_FAB_POS__'))).toContain('"edge":"left"');
  await expect(page.locator('#wb-assistant-panel')).not.toHaveClass(/active/);

  // The first click on a collapsed FAB only expands it.
  await page.mouse.click(8, pointerY);
  await expect(fab).not.toHaveClass(/edge-collapsed-left|edge-collapsed-right/);
  await expect(page.locator('#wb-assistant-panel')).not.toHaveClass(/active/);

  await fab.click();
  await expect(page.locator('#wb-assistant-panel')).toHaveClass(/active/);
});

test('switches between the pine light and night themes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tests/worldbook_assistant_build/e2e/host.html');
  await page.waitForFunction(() => (globalThis as Record<string, unknown>).__WB_E2E_READY__ === true);
  await page.locator('#wb-assistant-fab').click();
  await expect(page.locator('#wb-assistant-panel')).toHaveClass(/active/);

  const root = page.locator('.wb-assistant-root');
  await expect(root).toHaveCSS('--wb-bg-root', '#f2efe6');

  await page.locator('#wb-assistant-panel .wb-assistant-theme').click();
  await page.getByRole('button', { name: '雾松夜', exact: true }).click();
  await expect(root).toHaveCSS('--wb-bg-root', '#0d1310');
  await expect.poll(() => page.evaluate(() => {
    const state = (globalThis as Record<string, any>).getVariables()['worldbook_assistant_state_v1'];
    return state?.theme;
  })).toBe('pine_dark');

  await page.locator('#wb-assistant-panel .wb-assistant-theme').click();
  await page.getByRole('button', { name: '雾松纸', exact: true }).click();
  await expect(root).toHaveCSS('--wb-bg-root', '#f2efe6');
});

test('keeps the desktop large-list initial DOM bounded', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openAssistant(page);

  const count = await page.locator('.list-scroll .entry-item').count();
  expect(count).toBeLessThanOrEqual(60);
});
