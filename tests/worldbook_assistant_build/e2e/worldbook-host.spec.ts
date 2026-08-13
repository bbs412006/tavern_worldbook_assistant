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

test('keeps the desktop large-list initial DOM bounded', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openAssistant(page);

  const count = await page.locator('.list-scroll .entry-item').count();
  expect(count).toBeLessThanOrEqual(60);
});
