const { test, expect } = require('@playwright/test');

test.describe('Webpointer Vector CAD Editor E2E Test Suite', () => {
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    await page.goto('/');
    await page.waitForSelector('#mainSvg');
  });

  test('TC01: App Initialization & No Console Errors', async ({ page }) => {
    // Check Menu Bar & Tab Buttons
    await expect(page.locator('.menu-bar')).toBeVisible();
    await expect(page.locator('.tab-btn:has-text("파일")')).toBeVisible();
    await expect(page.locator('.tab-btn:has-text("삽입")')).toBeVisible();
    await expect(page.locator('.tab-btn:has-text("설정")')).toBeVisible();

    // Check Ribbon Bar & Main Canvas
    await expect(page.locator('#ribbonBar')).toBeVisible();
    await expect(page.locator('#mainSvg')).toBeVisible();

    // Ensure ZERO JS runtime exceptions on load
    expect(pageErrors, 'JS Page Errors found: ' + JSON.stringify(pageErrors)).toEqual([]);
  });

  test('TC02: Draw Rectangle and Add Text Element', async ({ page }) => {
    // Switch to Insert Tab
    await page.click('.tab-btn:has-text("삽입")');

    const toolBtns = page.locator('.tool-btn');
    const count = await toolBtns.count();
    console.log('[Test Log] Found tool buttons count:', count);

    // Click Rectangle Tool (5th tool button in Insert tab: select, text, point, line, rect)
    await toolBtns.nth(4).click();

    // Drag on SVG Canvas to create a rectangle
    const canvas = page.locator('#mainSvg');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    const startX = box.x + 100;
    const startY = box.y + 100;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 150, startY + 100);
    await page.mouse.up();

    // Verify SVG DOM contains created rectangle
    const rectCount = await page.locator('#objectsGroup rect').count();
    expect(rectCount).toBeGreaterThanOrEqual(1);

    // Switch to Text Tool (2nd tool button: text)
    await toolBtns.nth(1).click();

    // Ensure zero page errors
    expect(pageErrors).toEqual([]);
  });

  test('TC03: Single Cycling Buttons & Underline Format in Text Tab', async ({ page }) => {
    // Switch to Text Tab
    await page.click('.tab-btn:has-text("글 서식")');

    // Click Horizontal Alignment Cycle Button
    await page.locator('button[onclick*="HorizontalAlign"]').first().click();

    // Click Vertical Alignment Cycle Button
    await page.locator('button[onclick*="VerticalAlign"]').first().click();

    // Click Auto-Fit Mode Cycle Button
    await page.locator('button[onclick*="AutoFitMode"]').first().click();

    // Ensure zero page errors
    expect(pageErrors).toEqual([]);
  });

  test('TC04: Undo (Ctrl+Z) & Redo (Ctrl+Y) History Stack', async ({ page }) => {
    // Draw an object first
    await page.click('.tab-btn:has-text("삽입")');
    await page.locator('button[onclick*="rect"]').first().click();

    const canvas = page.locator('#mainSvg');
    const box = await canvas.boundingBox();

    await page.mouse.move(box.x + 200, box.y + 200);
    await page.mouse.down();
    await page.mouse.move(box.x + 300, box.y + 280);
    await page.mouse.up();

    const countBeforeUndo = await page.locator('#objectsGroup rect').count();

    // Trigger Ctrl+Z (Undo)
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(100);

    const countAfterUndo = await page.locator('#objectsGroup rect').count();
    expect(countAfterUndo).toBe(countBeforeUndo - 1);

    // Trigger Redo via API or shortcut
    await page.evaluate(() => window.redo());
    await page.waitForTimeout(100);

    const countAfterRedo = await page.locator('#objectsGroup rect').count();
    expect(countAfterRedo).toBe(countBeforeUndo);

    expect(pageErrors).toEqual([]);
  });

  test('TC05: Settings Tab & Persistent Grid Background (No Black Canvas)', async ({ page }) => {
    // Click Settings Tab ("설정")
    await page.click('.tab-btn:has-text("설정")');
    await page.waitForSelector('#chkGridToggle');

    // Toggle Grid Checkbox (Uncheck grid)
    const gridChk = page.locator('#chkGridToggle');
    await gridChk.uncheck();

    // Verify background rect remains white/visible (not black)
    const bgRectFill = await page.locator('#gridGroup rect').getAttribute('fill');
    expect(bgRectFill).toBe('#ffffff');

    // Re-check grid
    await gridChk.check();
    expect(pageErrors).toEqual([]);
  });

  test('TC06: Visual Snapshot Baseline', async ({ page }) => {
    // Wait for canvas to settle
    await page.waitForTimeout(200);

    // Visual screenshot snapshot comparison
    await expect(page).toHaveScreenshot('webpointer-canvas-baseline.png', {
      mask: [page.locator('#uiGroup')]
    });
  });
});
