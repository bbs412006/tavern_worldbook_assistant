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
  const nav = page.locator('.mobile-tab-bar');
  if (label === '⚙️ 设置') {
    await nav.getByRole('button', { name: '设置', exact: true }).click();
  } else {
    await nav.getByRole('button', { name: '工具', exact: true }).click();
    await page.getByRole('button', { name: /AI配置/ }).first().click();
  }
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
  await expect(page.getByRole('heading', { name: '世界书助手', exact: true })).toBeVisible();
  await expect(rows).toHaveCount(18);
  const first = rows.filter({ hasText: '大型世界书条目 1' }).first();
  await expect(first.locator('.mobile-archive-keywords')).toContainText('关键词1');
  await expect(first.locator('.mobile-archive-preview')).toHaveCount(0);
  await page.getByRole('button', { name: '切换精简与预览模式' }).click();
  await expect(first.locator('.mobile-archive-preview')).toContainText('这是第 1 个条目的正文内容');
  await page.getByRole('button', { name: '切换精简与预览模式' }).click();
  await expect(first.locator('.mobile-archive-preview')).toHaveCount(0);
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

test('searches entries, expands inline reader, and opens the full-screen segmented mobile editor', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openAssistant(page);

  const search = page.getByRole('textbox', { name: '搜索世界书条目' });
  await search.fill('关键词42');
  const entries = page.locator('.mobile-entry-list .entry-item');
  await expect(entries).toHaveCount(1);
  await expect(entries.first()).toContainText('大型世界书条目 42');

  await entries.first().getByRole('button', { name: /阅读/ }).click();
  await expect(entries.first().locator('.m-inline-reader .mobile-reading-content')).toContainText('这是第 42 个条目的正文内容');
  await entries.first().locator('.m-inline-reader').getByRole('button', { name: '编辑条目' }).click();

  const editor = page.locator('.m-detail-pane:visible');
  await expect(editor.locator('.editor-comment input')).toHaveValue('大型世界书条目 42');
  await expect(editor.locator('textarea.editor-content-area')).toHaveValue(/这是第 42 个条目的正文内容/);
  await editor.getByRole('tab', { name: '配置', exact: true }).click();
  await expect(editor.getByText('触发策略', { exact: true })).toBeVisible();
  await editor.getByRole('tab', { name: '阅读', exact: true }).click();
  await expect(editor.locator('.m-reader-surface .mobile-reading-content')).toContainText('这是第 42 个条目的正文内容');
  expect(await page.evaluate(() => (globalThis as unknown as Record<string, unknown[]>).__WB_E2E_ERRORS__ ?? [])).toEqual([]);
});

test('edits mobile keyword chips and saves an unconfirmed draft', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openAssistant(page);
  await page.locator('.mobile-archive-entry').filter({ hasText: '大型世界书条目 2' }).first().locator('.mobile-archive-entry-main').click();

  const editor = page.locator('.mobile-editor-pane:visible');
  await expect(editor.locator('.editor-comment input')).toHaveValue('大型世界书条目 2');
  await editor.getByRole('button', { name: '删除关键词 关键词2', exact: true }).click();

  await editor.getByRole('button', { name: '添加主要关键词', exact: true }).click();
  const primaryInput = editor.getByRole('textbox', { name: '添加主要关键词' });
  const primaryField = editor.locator('.mobile-keyword-field').first();
  await primaryInput.fill('新增文字');
  await primaryField.getByRole('button', { name: '添加', exact: true }).click();
  await editor.getByRole('button', { name: '添加主要关键词', exact: true }).click();
  await primaryInput.fill('/needle/i');
  await primaryInput.press('Enter');
  await expect(editor.getByRole('button', { name: '删除关键词 /needle/i', exact: true })).toBeVisible();

  const save = editor.locator('.mobile-editor-heading').getByRole('button', { name: '保存', exact: true });
  await save.click();
  const readSavedKeywords = () => page.evaluate(async () => {
    const entries = await (globalThis as any).getWorldbook('大型世界书 A');
    const entry = entries.find((item: { uid: number }) => item.uid === 2);
    const describe = (key: string | RegExp) => key instanceof RegExp
      ? { type: 'regexp', source: key.source, flags: key.flags }
      : { type: 'string', value: key };
    return {
      primary: entry.strategy.keys.map(describe),
      secondary: entry.strategy.keys_secondary.keys.map(describe),
    };
  });
  await expect.poll(readSavedKeywords).toEqual({
    primary: [
      { type: 'string', value: '移动端测试' },
      { type: 'string', value: '新增文字' },
      { type: 'regexp', source: 'needle', flags: 'i' },
    ],
    secondary: [],
  });
  await expect(save).toBeDisabled();

  // Saving from a focused input must not lose the text even if 添加 was never pressed.
  await editor.getByRole('button', { name: '添加次要关键词', exact: true }).click();
  await editor.getByRole('textbox', { name: '添加次要关键词' }).fill('尚未确认');
  await expect(save).toBeEnabled();
  await save.click();
  await expect.poll(readSavedKeywords).toMatchObject({ secondary: [{ type: 'string', value: '尚未确认' }] });
  expect(await page.evaluate(() => (globalThis as unknown as Record<string, unknown[]>).__WB_E2E_ERRORS__ ?? [])).toEqual([]);
});

test('saves mobile detail changes to the selected worldbook and navigates Global and Tools tabs', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openAssistant(page);
  await page.getByRole('textbox', { name: '搜索世界书条目' }).fill('关键词42');
  await expect(page.locator('.mobile-entry-list .entry-item-title').first()).toContainText('大型世界书条目 42');
  await page.locator('.mobile-entry-list .entry-item').first().locator('.mobile-archive-entry-main').click();

  const editor = page.locator('.m-detail-pane:visible');
  await editor.locator('textarea.editor-content-area').fill('移动端修改后的世界书内容');
  await editor.locator('.mobile-editor-heading').getByRole('button', { name: '保存', exact: true }).click();

  await expect.poll(() => page.evaluate(async () => {
    const entries = await (globalThis as any).getWorldbook('大型世界书 A');
    return entries.find((entry: { uid: number }) => entry.uid === 42)?.content;
  })).toBe('移动端修改后的世界书内容');

  await editor.getByRole('button', { name: '返回' }).click();
  await page.locator('.mobile-tab-bar').getByRole('button', { name: '全局', exact: true }).click();
  await expect(page.getByRole('heading', { name: '全局与绑定', exact: true })).toBeVisible();
  await page.locator('.mobile-tab-bar').getByRole('button', { name: '工具', exact: true }).click();
  await expect(page.getByRole('heading', { name: '工作台工具', exact: true })).toBeVisible();
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

test('persists typography settings and applies them to reading and editing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openAssistant(page);
  await openUtilityPage(page, '⚙️ 设置', '⚙️ 设置中心');

  async function choose(labelId: string, option: string): Promise<void> {
    await page.locator(`[aria-labelledby="${labelId}"]`).click();
    await page.getByRole('option', { name: option, exact: true }).click();
  }
  await choose('typography-scope-label', '整个界面');
  await choose('typography-family-label', '等宽');
  await choose('typography-size-label', '20 px');
  await choose('typography-weight-label', '粗体 700');
  await choose('typography-line-height-label', '1.8 倍');
  await page.locator('input[type="color"][aria-labelledby="typography-color-label"]').evaluate((input: HTMLInputElement) => {
    input.value = '#336699';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const preview = page.locator('.typography-preview p');
  await expect(preview).toHaveCSS('font-size', '20px');
  await expect(preview).toHaveCSS('font-weight', '700');
  await expect(preview).toHaveCSS('color', 'rgb(51, 102, 153)');
  const hostTitle = page.locator('#wb-assistant-panel .wb-assistant-title-copy strong');
  await expect(hostTitle).toHaveCSS('color', 'rgb(51, 102, 153)');
  await expect(hostTitle).toHaveCSS('font-size', '20px');
  await expect(hostTitle).toHaveCSS('font-weight', '700');
  await expect.poll(() => page.evaluate(() => (globalThis as Record<string, any>).getVariables().worldbook_assistant_state_v1.typography)).toMatchObject({
    scope: 'interface', family: 'mono', size: 20, weight: 700, color: '#336699', line_height: 1.8,
  });

  await page.locator('.utility-page-back').click();
  await page.locator('.mobile-archive-entry-main').first().click();
  const editor = page.locator('.mobile-pane:visible .editor-content-area');
  await expect(editor).toHaveCSS('font-size', '20px');
  await expect(editor).toHaveCSS('font-weight', '700');
  await expect(editor).toHaveCSS('color', 'rgb(51, 102, 153)');
  await expect(editor).toHaveCSS('line-height', '36px');
  await expect(editor).toHaveCSS('font-family', /monospace/);
  await page.getByRole('tab', { name: '阅读', exact: true }).click();
  const reading = page.locator('.m-reader-surface .mobile-reading-content');
  await expect(reading).toHaveCSS('font-size', '20px');
  await expect(reading).toHaveCSS('color', 'rgb(51, 102, 153)');

  await openAssistant(page);
  await expect(page.locator('.wb-assistant-root')).toHaveClass(/wb-custom-font-size/);
  await openUtilityPage(page, '⚙️ 设置', '⚙️ 设置中心');
  await expect(page.locator('.typography-preview p')).toHaveCSS('font-size', '20px');
  await page.getByRole('button', { name: '恢复默认', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (globalThis as Record<string, any>).getVariables().worldbook_assistant_state_v1.typography)).toEqual({
    scope: 'entries', family: 'default', size: null, weight: null, color: null, line_height: null,
  });
  await expect(page.locator('.wb-assistant-root')).not.toHaveClass(/wb-custom-font-size|wb-custom-font-color/);
  await expect(hostTitle).toHaveCSS('color', 'rgb(23, 32, 27)');
  await expect(hostTitle).toHaveCSS('font-size', '15px');
});

test('applies entry typography to the desktop editor', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openAssistant(page);
  await page.locator('.studio-rail [title="设置中心"]').click();
  await page.locator('[aria-labelledby="typography-size-label"]').click();
  await page.getByRole('option', { name: '22 px', exact: true }).click();
  await page.locator('[aria-labelledby="typography-weight-label"]').click();
  await page.getByRole('option', { name: '半粗 600', exact: true }).click();
  await page.locator('input[type="color"][aria-labelledby="typography-color-label"]').evaluate((input: HTMLInputElement) => {
    input.value = '#a14535';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('.utility-page-back').click();
  const editor = page.locator('.wb-editor .editor-content-area');
  await expect(editor).toBeVisible();
  await expect(editor).toHaveCSS('font-size', '22px');
  await expect(editor).toHaveCSS('font-weight', '600');
  await expect(editor).toHaveCSS('color', 'rgb(161, 69, 53)');
});

test('keeps font settings usable at the largest interface size on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openAssistant(page);
  await openUtilityPage(page, '⚙️ 设置', '⚙️ 设置中心');
  await page.locator('[aria-labelledby="typography-scope-label"]').click();
  await page.getByRole('option', { name: '整个界面', exact: true }).click();
  await page.locator('[aria-labelledby="typography-size-label"]').click();
  await page.getByRole('option', { name: '28 px', exact: true }).click();
  await expect(page.locator('.typography-preview p')).toHaveCSS('font-size', '28px');
  await expect(page.locator('[aria-labelledby="typography-scope-label"]')).toContainText('整个界面');
  const overflow = await page.evaluate(() => ['#wb-assistant-panel', '.typography-settings'].map(selector => {
    const element = document.querySelector<HTMLElement>(selector)!;
    return element.scrollWidth - element.clientWidth;
  }));
  expect(overflow.every(value => value <= 0)).toBe(true);
  await page.getByRole('button', { name: '恢复默认', exact: true }).click();
  await expect(page.locator('.typography-preview p')).toHaveCSS('font-size', '16px');
});

test('keeps the mobile header aligned with the selected theme', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openAssistant(page);
  const header = page.locator('#wb-assistant-panel .wb-assistant-header');
  const title = page.locator('#wb-assistant-panel .wb-assistant-title-copy strong');
  await expect(header).toHaveCSS('background-color', 'rgb(255, 253, 248)');
  await expect(title).toHaveCSS('color', 'rgb(23, 32, 27)');
  await page.locator('#wb-assistant-panel .wb-assistant-theme').click();
  await page.getByRole('button', { name: '雾松夜', exact: true }).click();
  await expect(header).toHaveCSS('background-color', 'rgb(20, 28, 24)');
  await expect(title).toHaveCSS('color', 'rgb(233, 239, 234)');
  await page.locator('#wb-assistant-panel .wb-assistant-theme').click();
  await page.getByRole('button', { name: '深海', exact: true }).click();
  await expect(page.locator('#wb-assistant-panel')).toHaveAttribute('data-wb-theme', 'ocean');
  await page.locator('#wb-assistant-panel .wb-assistant-theme').click();
  await page.getByRole('button', { name: '雾松纸', exact: true }).click();
  await expect(header).toHaveCSS('background-color', 'rgb(255, 253, 248)');
});

test('switches between the pine light and night themes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tests/worldbook_assistant_build/e2e/host.html');
  await page.waitForFunction(() => (globalThis as Record<string, unknown>).__WB_E2E_READY__ === true);
  await page.locator('#wb-assistant-fab').click();
  await expect(page.locator('#wb-assistant-panel')).toHaveClass(/active/);

  const root = page.locator('.wb-assistant-root');
  await expect(root).toHaveCSS('--wb-bg-root', '#f2efe6');
  const header = page.locator('#wb-assistant-panel .wb-assistant-header');
  await expect(header).toHaveCSS('background-color', 'rgb(255, 253, 248)');

  await page.locator('#wb-assistant-panel .wb-assistant-theme').click();
  await page.getByRole('button', { name: '雾松夜', exact: true }).click();
  await expect(root).toHaveCSS('--wb-bg-root', '#0d1310');
  await expect(header).toHaveCSS('background-color', 'rgb(20, 28, 24)');
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

test('renders only a single header title across mobile and desktop views without duplicate inner headings', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openAssistant(page);

  const hostTitle = page.locator('#wb-assistant-panel .wb-assistant-title-copy strong');
  await expect(hostTitle).toHaveText('世界书助手');
  await expect(page.locator('.m-home-top h2, .m-page-head, .m-subpage-bar h3')).toHaveCount(0);

  // Entry detail screen
  await page.locator('.mobile-archive-entry-main').first().click();
  await expect(hostTitle).toHaveText('编辑条目');
  await expect(page.locator('.m-detail-title-box h2')).toHaveCount(0);
  await page.locator('.m-detail-topbar').getByRole('button', { name: '返回' }).click();

  // Global tab
  await page.locator('.mobile-tab-bar').getByRole('button', { name: '全局', exact: true }).click();
  await expect(hostTitle).toHaveText('全局与绑定');

  // Tools tab and sub-pages
  await page.locator('.mobile-tab-bar').getByRole('button', { name: '工具', exact: true }).click();
  await expect(hostTitle).toHaveText('工作台工具');

  await page.getByRole('button', { name: /跨书复制/ }).first().click();
  await expect(hostTitle).toHaveText('跨书复制');
  await expect(page.locator('.m-subpage-bar h3')).toHaveCount(0);
  await page.locator('.m-subpage-pane:visible .m-back-btn').click();

  await page.getByRole('button', { name: /标签管理/ }).first().click();
  await expect(hostTitle).toHaveText('标签管理');
  await expect(page.locator('.m-subpage-bar h3')).toHaveCount(0);
  await page.locator('.m-subpage-pane:visible .m-back-btn').click();

  // Settings & AI Config utility pages on mobile
  await openUtilityPage(page, '⚙️ 设置', '⚙️ 设置中心');
  await expect(hostTitle).toHaveText('⚙️ 设置中心');
  await expect(page.locator('.utility-page-title')).toBeHidden();
  await page.locator('.utility-page-back').click();

  await openUtilityPage(page, '🔧 AI配置', '🔧 AI 配置世界书');
  await expect(hostTitle).toHaveText('🔧 AI 配置世界书');
  await expect(page.locator('.utility-page-title')).toBeHidden();
  await page.locator('.utility-page-back').click();

  // Desktop views
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(hostTitle).toHaveText('世界书助手');

  await page.locator('.studio-rail [title="标签管理"]').click();
  await expect(hostTitle).toHaveText('标签管理');
  await expect(page.locator('.studio-tag-head h1')).toBeHidden();
  await expect(page.locator('.tag-editor-title')).toBeHidden();

  await page.locator('.studio-rail [title="跨书复制"]').click();
  await expect(hostTitle).toHaveText('跨书复制');
  await expect(page.locator('.wb-copy-workspace-head')).toBeHidden();
  await expect(page.locator('.cross-copy-head-main strong')).toBeHidden();

  await page.locator('.studio-rail [title="设置中心"]').click();
  await expect(hostTitle).toHaveText('⚙️ 设置中心');
  await expect(page.locator('.utility-page-title')).toBeHidden();
});
