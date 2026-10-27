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
  const actions = page.locator('.mobile-library-actions');
  if (await actions.isVisible() && !(await actions.evaluate(element => (element as HTMLDetailsElement).open))) {
    await actions.locator('summary').click();
  }
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

test('opens the redesigned list for existing mobile editor users and preserves list interactions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openAssistant(page);

  // The host fixture persists panel_mode: editor, as an existing user would.
  const list = page.locator('.mobile-entry-list');
  const rows = list.locator('.mobile-archive-entry');
  await expect(page.getByRole('heading', { name: '世界书', exact: true })).toBeVisible();
  await expect(rows).toHaveCount(18);
  const first = rows.filter({ hasText: '大型世界书条目 1' }).first();
  await expect(first.locator('.mobile-archive-keywords')).toContainText('关键词1');
  await expect(first.locator('.mobile-archive-preview')).toContainText('这是第 1 个条目的正文内容');
  await expect(first.locator('.mobile-entry-details')).toContainText('权重 1');

  const firstSwitch = first.getByRole('switch', { name: '大型世界书条目 1启用状态' });
  await expect(firstSwitch).not.toBeChecked();
  await first.locator('.wb-control-switch-track').click();
  await expect(firstSwitch).toBeChecked();
  await expect(list).toBeVisible();
  await expect(page.getByRole('heading', { name: '编辑条目', exact: true })).not.toBeVisible();

  const filters = page.locator('.mobile-archive-library .mobile-archive-filters');
  await filters.getByRole('button', { name: '已启用', exact: true }).click();
  await expect(list.getByText('大型世界书条目 6', { exact: true })).toHaveCount(0);
  await expect(first).toBeVisible();
  await filters.getByRole('button', { name: '常驻', exact: true }).click();
  await expect(list.getByText('大型世界书条目 2', { exact: true })).toHaveCount(0);
  await expect(list.getByText('大型世界书条目 8', { exact: true })).toBeVisible();
  await filters.getByRole('button', { name: '全部', exact: true }).click();

  const firstMain = list.locator('.mobile-archive-entry').first().locator('.mobile-archive-entry-main');
  await firstMain.scrollIntoViewIfNeeded();
  const box = await firstMain.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + 30, box!.y + 20);
  await page.mouse.down();
  await page.waitForTimeout(500); // Longer than the mobile long-press threshold.
  await page.mouse.up();
  await expect(list.locator('.mobile-multi-toolbar')).toContainText('已选 1');
  await list.locator('.mobile-archive-entry').nth(1).locator('.mobile-archive-entry-main').click();
  await expect(list.locator('.mobile-multi-toolbar')).toContainText('已选 2');
  await list.getByRole('button', { name: '完成', exact: true }).click();
  await expect(list.locator('.mobile-multi-toolbar')).toHaveCount(0);
  expect(await page.evaluate(() => (globalThis as unknown as Record<string, unknown[]>).__WB_E2E_ERRORS__ ?? [])).toEqual([]);
});

test('keeps the mobile workspace inside the viewport in landscape', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 } });
  const page = await context.newPage();
  await openAssistant(page);
  await expect(page.locator('.mobile-entry-list')).toBeVisible();
  const bounds = await page.locator('#wb-assistant-panel').boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(844);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(390);
  await context.close();
});

test('searches entries and opens a browse card in the full mobile editor', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openAssistant(page);

  const search = page.getByRole('textbox', { name: '搜索世界书条目' });
  await search.fill('关键词42');
  const entries = page.locator('.mobile-entry-list .entry-item');
  await expect(entries).toHaveCount(1);
  await expect(entries.first()).toContainText('大型世界书条目 42');

  await page.getByRole('button', { name: '浏览', exact: true }).click();
  const card = page.locator('.mobile-browse-grid .browse-card');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('大型世界书条目 42');
  await card.locator('.browse-card-header').click();
  await expect(card.locator('.mobile-reading-content')).toContainText('这是第 42 个条目的正文内容');
  await page.getByRole('button', { name: '编辑条目', exact: true }).click();

  const editor = page.locator('.mobile-pane:visible');
  await expect(editor.locator('.editor-comment input')).toHaveValue('大型世界书条目 42');
  await expect(editor.locator('textarea.editor-content-area')).toHaveValue(/这是第 42 个条目的正文内容/);
  expect(await page.evaluate(() => (globalThis as unknown as Record<string, unknown[]>).__WB_E2E_ERRORS__ ?? [])).toEqual([]);
});

test('saves mobile browse changes to the selected worldbook', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openAssistant(page);
  await page.getByRole('textbox', { name: '搜索世界书条目' }).fill('关键词42');
  await page.getByRole('button', { name: '浏览', exact: true }).click();

  const card = page.locator('.mobile-browse-grid .browse-card');
  await expect(card).toHaveCount(1);
  await card.locator('.browse-card-header').click();
  await card.locator('.mobile-inline-editor summary').click();
  const content = card.locator('textarea.browse-content-input');
  await content.fill('移动端修改后的世界书内容');
  await card.getByRole('button', { name: '保存', exact: true }).click();

  await expect.poll(() => page.evaluate(async () => {
    const entries = await (globalThis as any).getWorldbook('大型世界书 A');
    return entries.find((entry: { uid: number }) => entry.uid === 42)?.content;
  })).toBe('移动端修改后的世界书内容');
  expect(await page.evaluate(() => (globalThis as unknown as Record<string, unknown[]>).__WB_E2E_ERRORS__ ?? [])).toEqual([]);
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

  await expect.poll(() => page.evaluate(() => {
    const target = globalThis as Record<string, any>;
    return target.__WB_ASSISTANT_PERFORMANCE_SNAPSHOT__?.().metrics['return-main']?.count;
  })).toBe(40);

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
