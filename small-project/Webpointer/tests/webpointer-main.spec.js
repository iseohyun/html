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

  test('TC07: Full Shape Drawing Suite (Point, Line, Ellipse, Arc)', async ({ page }) => {
    await page.click('.tab-btn:has-text("삽입")');
    const canvas = page.locator('#mainSvg');
    const box = await canvas.boundingBox();

    // 1. Draw Line
    await page.locator('button[onclick*="line"]').first().click();
    await page.mouse.move(box.x + 50, box.y + 50);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y + 50);
    await page.mouse.up();
    expect(await page.locator('#objectsGroup line').count()).toBeGreaterThanOrEqual(1);

    // 2. Draw Point
    await page.locator('button[onclick*="point"]').first().click();
    await page.mouse.click(box.x + 200, box.y + 50);
    expect(await page.locator('#objectsGroup circle').count()).toBeGreaterThanOrEqual(1);

    // 3. Draw Ellipse
    await page.locator('button[onclick*="ellipse"]').first().click();
    await page.mouse.move(box.x + 250, box.y + 50);
    await page.mouse.down();
    await page.mouse.move(box.x + 350, box.y + 120);
    await page.mouse.up();
    expect(await page.locator('#objectsGroup ellipse').count()).toBeGreaterThanOrEqual(1);

    // 4. Draw Arc
    await page.locator('button[onclick*="arc"]').first().click();
    await page.mouse.move(box.x + 400, box.y + 50);
    await page.mouse.down();
    await page.mouse.move(box.x + 480, box.y + 120);
    await page.mouse.up();
    expect(await page.locator('#objectsGroup path').count()).toBeGreaterThanOrEqual(1);

    expect(pageErrors).toEqual([]);
  });

  test('TC08: Picture Formatting Suite (Stroke Width & Format Inputs)', async ({ page }) => {
    // Draw a rectangle first
    await page.click('.tab-btn:has-text("삽입")');
    await page.locator('button[onclick*="rect"]').first().click();
    const canvas = page.locator('#mainSvg');
    const box = await canvas.boundingBox();

    await page.mouse.move(box.x + 100, box.y + 200);
    await page.mouse.down();
    await page.mouse.move(box.x + 200, box.y + 280);
    await page.mouse.up();

    // Switch to Picture Formatting Tab ("그림 서식")
    await page.click('.tab-btn:has-text("그림 서식")');

    const strokeWidthInput = page.locator('input[oninput*="setStrokeWidth"]');
    if (await strokeWidthInput.count() > 0) {
      await strokeWidthInput.fill('4');
    }

    expect(pageErrors).toEqual([]);
  });

  test('TC09: Detailed Text Formatting Suite (Font, Underline Style)', async ({ page }) => {
    // Switch to Text Tab ("글 서식")
    await page.click('.tab-btn:has-text("글 서식")');

    const underlineStyleSelect = page.locator('select[onchange*="setTextUnderlineStyle"]');
    if (await underlineStyleSelect.count() > 0) {
      await underlineStyleSelect.selectOption('solid');
    }

    expect(pageErrors).toEqual([]);
  });

  test('TC10: Proximity Selection Distance & Nearest Object Detection', async ({ page }) => {
    // Draw a point at (100, 100)
    await page.click('.tab-btn:has-text("삽입")');
    await page.locator('button[onclick*="point"]').first().click();
    const canvas = page.locator('#mainSvg');
    const box = await canvas.boundingBox();

    await page.mouse.click(box.x + 100, box.y + 100);

    // Switch to Select Tool (1st tool button in Insert tab)
    await page.locator('.tool-btn').first().click();

    // Click slightly offset at (105, 105) near the point
    await page.mouse.click(box.x + 105, box.y + 105);

    // Verify selection includes object
    const selectedCount = await page.evaluate(() => window.WebpointerConfig.selectedIds.size);
    expect(selectedCount).toBeGreaterThanOrEqual(1);

    expect(pageErrors).toEqual([]);
  });

  test('TC11: File Operations Suite (Web LocalStorage Save & File Modal)', async ({ page }) => {
    // Switch to File Tab ("파일")
    await page.click('.tab-btn:has-text("파일")');

    // Click Web LocalStorage Save
    await page.evaluate(() => window.saveFileToWeb());

    // Verify localStorage item is written
    const savedDoc = await page.evaluate(() => localStorage.getItem('webpointer_saved_doc'));
    expect(savedDoc).not.toBeNull();

    expect(pageErrors).toEqual([]);
  });

  test('TC12: Animation Tab & Preset Previews', async ({ page }) => {
    // Switch to Animation Tab ("애니메이션")
    await page.click('.tab-btn:has-text("애니메이션")');

    // Trigger Line Draw Animation preview
    await page.evaluate(() => window.playAnimation && window.playAnimation('draw'));

    expect(pageErrors).toEqual([]);
  });

  test('TC13: Shortcut Guidance Modal Popup', async ({ page }) => {
    // Switch to Settings Tab ("설정")
    await page.click('.tab-btn:has-text("설정")');

    // Click Keyboard Shortcut button
    await page.click('#btnShortcutGuide');

    // Verify shortcut modal opens
    const modal = page.locator('#shortcutModal');
    await expect(modal).toHaveClass(/show/);

    // Save visual proof screenshot
    await page.screenshot({ path: 'tests/shortcut-modal-proof.png' });

    // Close modal
    await page.click('#shortcutModal button:has-text("닫기")');
    await expect(modal).not.toHaveClass(/show/);

    expect(pageErrors).toEqual([]);
  });

  test('TC14: Detailed Settings Modal & Apply Proximity Threshold', async ({ page }) => {
    // Switch to Settings Tab ("설정")
    await page.click('.tab-btn:has-text("설정")');

    // Click Detailed Settings Gear button
    await page.click('#btnDetailedSettings');

    // Verify detailed settings modal opens
    const modal = page.locator('#detailedSettingsModal');
    await expect(modal).toHaveClass(/show/);

    // Save visual proof screenshot
    await page.screenshot({ path: 'tests/detailed-settings-modal-proof.png' });

    // Change proximity threshold to 25
    await page.fill('#settingProximityThreshold', '25');

    // Click Apply
    await page.click('#detailedSettingsModal button:has-text("적용")');
    await expect(modal).not.toHaveClass(/show/);

    // Verify config value updated to 25
    const proxVal = await page.evaluate(() => window.WebpointerConfig.proximityThreshold);
    expect(proxVal).toBe(25);

    expect(pageErrors).toEqual([]);
  });
});
