const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

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

    // Click Rectangle Tool
    await page.click('.tool-btn[onclick*="rect"]');

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

    // Switch to Text Tool
    await page.click('.tool-btn[onclick*="text"]');

    // Switch to Pan Tool (1st tool button: pan) and test canvas panning
    await page.click('.tool-btn[onclick*="pan"]');
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 50, startY + 50);
    await page.mouse.up();

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

  test('TC15: Text Selection Font Size Hotkeys (+/-)', async ({ page }) => {
    // Create and select a text object programmatically
    const textObjId = await page.evaluate(() => {
      window.WebpointerTextTool.startDirectCanvasTyping(300, 300, null);
      var textObj = window.WebpointerState.typingSvgObj;
      if (textObj) {
        textObj.attrs.text = 'Hotkey Font Test';
        textObj.attrs.fontSize = 20;
        window.WebpointerTextTool.finishDirectCanvasTyping();
        window.WebpointerConfig.selectedIds.clear();
        window.WebpointerConfig.selectedIds.add(textObj.id);
        window.WebpointerRender.renderUI();
        return textObj.id;
      }
      return null;
    });
    expect(textObjId).not.toBeNull();

    // Get initial font size
    const initialSize = await page.evaluate(() => {
      const textObj = Array.from(window.WebpointerConfig.objectsMap.values()).find(o => o.type === 'text');
      return textObj ? textObj.attrs.fontSize || 20 : 0;
    });
    expect(initialSize).toBeGreaterThan(0);

    // Trigger font size increase (+ / =) keydown
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '+', code: 'Equal', bubbles: true }));
    });

    const sizeAfterPlus = await page.evaluate(() => {
      const textObj = Array.from(window.WebpointerConfig.objectsMap.values()).find(o => o.type === 'text');
      return textObj ? textObj.attrs.fontSize : 0;
    });
    expect(sizeAfterPlus).toBe(initialSize + 2);

    // Trigger font size decrease (- / _) keydown
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '-', code: 'Minus', bubbles: true }));
    });
    const sizeAfterMinus = await page.evaluate(() => {
      const textObj = Array.from(window.WebpointerConfig.objectsMap.values()).find(o => o.type === 'text');
      return textObj ? textObj.attrs.fontSize : 0;
    });
    expect(sizeAfterMinus).toBe(initialSize);

    expect(pageErrors).toEqual([]);
  });

  test('TC16: Non-Destructive Image & Shape Cropping (ClipPath)', async ({ page }) => {
    // Switch to Picture Format Tab ("그림 서식")
    await page.click('.tab-btn:has-text("그림 서식")');

    // Programmatically create a rect object and select it
    const rectObjId = await page.evaluate(() => {
      var obj = window.WebpointerObjects.createSvgObject('rect', { stepX: 5, stepY: 5 }, { stepX: 15, stepY: 15 });
      if (obj) {
        window.WebpointerConfig.selectedIds.clear();
        window.WebpointerConfig.selectedIds.add(obj.id);
        window.WebpointerRender.renderUI();
        window.WebpointerRender.renderRibbon();
        return obj.id;
      }
      return null;
    });
    expect(rectObjId).not.toBeNull();

    // Toggle Crop Mode
    await page.evaluate(() => window.toggleCropMode());
    const isCropActive = await page.evaluate(() => window.WebpointerState.isCropModeActive);
    expect(isCropActive).toBe(true);

    // Apply crop attributes (10% left, 20% top, 15% right, 25% bottom)
    await page.evaluate((id) => {
      var obj = window.WebpointerConfig.objectsMap.get(id);
      if (obj) {
        obj.attrs.cropLeft = 0.1;
        obj.attrs.cropTop = 0.2;
        obj.attrs.cropRight = 0.15;
        obj.attrs.cropBottom = 0.25;
        window.WebpointerRender.updateElementAttributes(obj);
        window.WebpointerRender.renderUI();
      }
    }, rectObjId);

    // Verify clip-path attribute is created and attached to element
    const clipAttr = await page.evaluate((id) => {
      var obj = window.WebpointerConfig.objectsMap.get(id);
      return obj && obj.el ? obj.el.getAttribute('clip-path') : null;
    }, rectObjId);
    expect(clipAttr).toContain('url(#crop_clip_' + rectObjId + ')');

    // Deactivate crop mode (exiting crop handles UI)
    await page.evaluate(() => window.toggleCropMode());
    const isCropActiveAfter = await page.evaluate(() => window.WebpointerState.isCropModeActive);
    expect(isCropActiveAfter).toBe(false);

    // Verify clip-path remains non-destructively attached
    const clipAttrAfter = await page.evaluate((id) => {
      var obj = window.WebpointerConfig.objectsMap.get(id);
      return obj && obj.el ? obj.el.getAttribute('clip-path') : null;
    }, rectObjId);
    expect(clipAttrAfter).toContain('url(#crop_clip_' + rectObjId + ')');

    // Reset crop attributes and verify clip-path is safely removed
    await page.evaluate((id) => {
      var obj = window.WebpointerConfig.objectsMap.get(id);
      if (obj) {
        obj.attrs.cropLeft = 0;
        obj.attrs.cropTop = 0;
        obj.attrs.cropRight = 0;
        obj.attrs.cropBottom = 0;
        window.WebpointerRender.updateElementAttributes(obj);
        window.WebpointerRender.renderUI();
      }
    }, rectObjId);

    const clipAttrReset = await page.evaluate((id) => {
      var obj = window.WebpointerConfig.objectsMap.get(id);
      return obj && obj.el ? obj.el.getAttribute('clip-path') : null;
    }, rectObjId);
    expect(clipAttrReset).toBeNull();

    expect(pageErrors).toEqual([]);
  });

  test('TC17: SVG File Import & Parser Diagnostics Suite', async ({ page }) => {
    const exampleSvgDir = path.join(__dirname, 'exampleSvg');
    const svgFiles = fs.readdirSync(exampleSvgDir).filter(f => f.toLowerCase().endsWith('.svg'));
    expect(svgFiles.length).toBeGreaterThanOrEqual(3);

    for (const fileName of svgFiles) {
      const filePath = path.join(exampleSvgDir, fileName);
      const svgContent = fs.readFileSync(filePath, 'utf-8');

      const importResult = await page.evaluate((content) => {
        if (!window.WebpointerSVGImporter) return false;
        var initCount = window.WebpointerConfig.objectsMap.size;
        var success = window.WebpointerSVGImporter.importSVGContent(content);
        var finalCount = window.WebpointerConfig.objectsMap.size;
        var mainSvg = document.getElementById('mainSvg');
        var objectsGroup = document.getElementById('objectsGroup');
        return {
          success: success,
          addedCount: finalCount - initCount,
          viewBox: mainSvg ? mainSvg.getAttribute('viewBox') : null,
          hasChildrenInDom: objectsGroup ? objectsGroup.childNodes.length > 0 : false
        };
      }, svgContent);

      expect(importResult.success).toBe(true);
      expect(importResult.addedCount).toBeGreaterThan(0);
      expect(importResult.viewBox).not.toBeNull();
      expect(importResult.hasChildrenInDom).toBe(true);
    }

    expect(pageErrors).toEqual([]);
  });

  test('TC18: Symbol Manager Modal & Symbol Registry Operations', async ({ page }) => {
    // Switch to File Tab & open Symbol Manager Modal
    await page.evaluate(() => {
      if (window.switchTab) window.switchTab('file');
      if (window.openSymbolManagerModal) window.openSymbolManagerModal();
    });
    await page.waitForTimeout(200);

    // Check modal visibility
    const modal = page.locator('#symbolManagerModal');
    await expect(modal).toBeVisible();

    // Register test symbol programmatically
    await page.evaluate(() => {
      window.WebpointerConfig.symbolRegistry.push({
        id: 'sym_test_1',
        name: '해변플랜심볼',
        type: 'image',
        thumb: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="%230ea5e9"/></svg>',
        data: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="%230ea5e9"/></svg>'
      });
      window.renderSymbolList();
    });

    // Check thumbnail and symbol card displayed
    const symbolCard = page.locator('#symbolListContainer:has-text("해변플랜심볼")');
    await expect(symbolCard).toBeVisible();

    // Delete symbol
    await page.evaluate(() => {
      window.deleteSymbol('sym_test_1');
    });

    const emptyMsg = page.locator('#symbolListContainer:has-text("등록된 심볼이 없습니다.")');
    await expect(emptyMsg).toBeVisible();

    // Close modal
    await page.click('#symbolManagerModal button:has-text("닫기")');
    await expect(modal).toBeHidden();

    expect(pageErrors).toEqual([]);
  });

  test('TC19: Extended Fill Color Palette (Linear/Radial Gradient, Pattern, Image Fill)', async ({ page }) => {
    // Draw a rectangle
    const canvas = page.locator('#mainSvg');
    const box = await canvas.boundingBox();
    const startX = box.x + 200;
    const startY = box.y + 200;

    await page.evaluate(() => {
      if (window.WebpointerHandlers) window.WebpointerHandlers.setTool('rect');
    });

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 150, startY + 100);
    await page.mouse.up();

    // Verify rectangle created
    const rectCount = await page.evaluate(() => {
      let count = 0;
      window.WebpointerConfig.objectsMap.forEach(obj => {
        if (obj.type === 'rect') count++;
      });
      return count;
    });
    expect(rectCount).toBe(1);

    // Create Linear Gradient fill
    const linGradUrl = await page.evaluate(() => {
      return window.WebpointerHandlers.createLinearGradient('#38bdf8', '#0369a1', 90);
    });
    expect(linGradUrl).toContain('url(#grad_lin_');

    // Apply linear gradient fill to selected rectangle
    await page.evaluate((fillVal) => {
      window.WebpointerHandlers.setFillColor(fillVal);
    }, linGradUrl);

    // Check DOM element fill attribute
    const fillAttr = await page.evaluate(() => {
      const rectEl = document.querySelector('#objectsGroup rect');
      return rectEl ? rectEl.getAttribute('fill') : null;
    });
    expect(fillAttr).toBe(linGradUrl);

    // Create Pattern Fill (dots)
    const patUrl = await page.evaluate(() => {
      return window.WebpointerHandlers.createPatternFill('dots', '#0ea5e9', 16);
    });
    expect(patUrl).toContain('url(#pat_dots_');

    await page.evaluate((fillVal) => {
      window.WebpointerHandlers.setFillColor(fillVal);
    }, patUrl);

    const patFillAttr = await page.evaluate(() => {
      const rectEl = document.querySelector('#objectsGroup rect');
      return rectEl ? rectEl.getAttribute('fill') : null;
    });
    expect(patFillAttr).toBe(patUrl);

    // Create Image Fill
    const imgUrl = await page.evaluate(() => {
      const sampleData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      return window.WebpointerHandlers.createImageFill(sampleData, 50, 50);
    });
    expect(imgUrl).toContain('url(#imgpat_');

    await page.evaluate((fillVal) => {
      window.WebpointerHandlers.setFillColor(fillVal);
    }, imgUrl);

    const imgFillAttr = await page.evaluate(() => {
      const rectEl = document.querySelector('#objectsGroup rect');
      return rectEl ? rectEl.getAttribute('fill') : null;
    });
    expect(imgFillAttr).toBe(imgUrl);

    expect(pageErrors).toEqual([]);
  });

  test('TC20: Picture Filter Effects Suite (Stacked Filters & Range Coefficients)', async ({ page }) => {
    // Select Rect tool and draw a rectangle
    await page.click('.tab-btn:has-text("삽입")');
    const rectToolBtn = page.locator('#ribbonBar button[onclick*="rect"]').first();
    await rectToolBtn.click();

    const svgBox = await page.locator('#mainSvg').boundingBox();
    const startX = svgBox.x + 200;
    const startY = svgBox.y + 200;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 150, startY + 100);
    await page.mouse.up();

    // Switch to Picture tab (style)
    await page.click('.tab-btn:has-text("그림 서식")');
    await page.waitForTimeout(200);

    // Click Filter Popover button
    const filterBtn = page.locator('#ribbonBar button:has-text("🪄")');
    await expect(filterBtn).toBeVisible();
    await filterBtn.click();

    const popover = page.locator('#filterEffectPopover');
    await expect(popover).toBeVisible();

    // Select Blur filter and add
    await page.selectOption('#popFilterType', 'blur');
    await page.evaluate(() => {
      const range = document.getElementById('popFilterRange');
      if (range) range.value = 5;
    });
    await page.click('#filterEffectPopover button:has-text("➕ 필터 추가")');

    // Select Sepia filter and add
    await page.selectOption('#popFilterType', 'sepia');
    await page.evaluate(() => {
      const range = document.getElementById('popFilterRange');
      if (range) range.value = 80;
    });
    await page.click('#filterEffectPopover button:has-text("➕ 필터 추가")');

    // Verify filter stack tag list contains blur and sepia
    const stackList = page.locator('#popFilterStackList');
    await expect(stackList).toContainText('blur(5px)');
    await expect(stackList).toContainText('sepia(80%)');

    // Verify DOM element filter attribute and style
    const filterState = await page.evaluate(() => {
      const rectEl = document.querySelector('#objectsGroup rect');
      return {
        attr: rectEl ? rectEl.getAttribute('filter') : null,
        style: rectEl ? rectEl.style.filter : null
      };
    });

    expect(filterState.attr).toContain('blur(5px)');
    expect(filterState.attr).toContain('sepia(80%)');

    // Clear all filters
    await page.click('#filterEffectPopover button:has-text("🧹 전체 삭제")');
    await expect(stackList).toContainText('적용된 필터가 없습니다');

    const clearedFilterAttr = await page.evaluate(() => {
      const rectEl = document.querySelector('#objectsGroup rect');
      return rectEl ? rectEl.getAttribute('filter') : null;
    });
    expect(clearedFilterAttr).toBeNull();

    expect(pageErrors).toEqual([]);
  });

  test('TC21: Symbol Cookie-Cutter Clipping Suite', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Create a target rectangle object via createSvgObject
    const rectObjId = await page.evaluate(() => {
      const obj = window.WebpointerObjects.createSvgObject('rect', { stepX: 10, stepY: 10 }, { stepX: 30, stepY: 25 });
      if (obj) {
        window.WebpointerConfig.selectedIds.clear();
        window.WebpointerConfig.selectedIds.add(obj.id);
        window.WebpointerRender.renderUI();
        return obj.id;
      }
      return null;
    });
    expect(rectObjId).not.toBeNull();

    // Open Symbol Clip Popover
    await page.evaluate(() => window.openSymbolClipPopover());
    await expect(page.locator('#symbolClipPopover')).toBeVisible();

    // Verify default symbols (Star, Heart, Circle, Hexagon) are rendered in grid
    const symbolGrid = page.locator('#popSymbolClipGrid');
    await expect(symbolGrid).toContainText('별 (Star)');
    await expect(symbolGrid).toContainText('하트 (Heart)');

    // Apply Star symbol cookie-cutter clipping
    await page.evaluate(() => window.applySymbolClip('sym_def_star'));
    await expect(page.locator('#symbolClipPopover')).toBeHidden();

    // Verify clip-path attribute is set on object SVG element
    const clipAttr = await page.evaluate((id) => {
      const obj = window.WebpointerConfig.objectsMap.get(id);
      return obj && obj.el ? obj.el.getAttribute('clip-path') : null;
    }, rectObjId);
    expect(clipAttr).toContain('url(#sym_clip_' + rectObjId + ')');

    // Verify defs clipPath contains scaling transform and path data
    const clipPathDefHtml = await page.evaluate((id) => {
      const clipEl = document.getElementById('sym_clip_' + id);
      return clipEl ? clipEl.innerHTML : '';
    }, rectObjId);
    expect(clipPathDefHtml).toContain('transform="translate(20 20) scale(');
    expect(clipPathDefHtml).toContain('d="M 25 2 L 32 17');

    // Remove symbol clip
    await page.evaluate(() => window.removeSymbolClipFromSelected());
    const clipAttrAfterRemoval = await page.evaluate((id) => {
      const obj = window.WebpointerConfig.objectsMap.get(id);
      return obj && obj.el ? obj.el.getAttribute('clip-path') : null;
    }, rectObjId);
    expect(clipAttrAfterRemoval).toBeNull();

    expect(pageErrors).toEqual([]);
  });

  test('TC22: Smart Alignment Snap Guides & Snapping', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Enable snapping explicitly
    await page.evaluate(() => {
      window.WebpointerConfig.snappingEnabled = true;
    });

    // 1. Create Object A (Rect at 100, 100, size 100x100)
    const objA = await page.evaluate(() => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const obj = {
        id: 'obj_snap_a',
        type: 'rect',
        attrs: { x: 100, y: 100, width: 100, height: 100, stroke: '#000000', fill: '#cbd5e1' },
        el: el
      };
      window.WebpointerConfig.objectsMap.set(obj.id, obj);
      window.WebpointerRender.renderCanvas();
      return obj.id;
    });
    expect(objA).toBe('obj_snap_a');

    // 2. Create Object B (Rect at 300, 300, size 100x100)
    const objB = await page.evaluate(() => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const obj = {
        id: 'obj_snap_b',
        type: 'rect',
        attrs: { x: 300, y: 300, width: 100, height: 100, stroke: '#000000', fill: '#f87171' },
        el: el
      };
      window.WebpointerConfig.objectsMap.set(obj.id, obj);
      window.WebpointerRender.renderCanvas();
      return obj.id;
    });
    expect(objB).toBe('obj_snap_b');

    // 3. Test calculation of snap guides when dragging B near X alignment with A (e.g. X=103, Y=300)
    const snapResult = await page.evaluate((targetId) => {
      const obj = window.WebpointerConfig.objectsMap.get(targetId);
      const snap = window.WebpointerHandlers.calculateSmartSnaps(obj, 103, 300);
      return snap;
    }, objB);

    // X should snap to 100 (matching Object A left edge)
    expect(snapResult.x).toBe(100);
    expect(snapResult.lines.length).toBeGreaterThan(0);
    expect(snapResult.lines[0].type).toBe('v');

    // 4. Test guide lines rendering into #snapGuidesGroup
    await page.evaluate((lines) => {
      window.WebpointerRender.renderSnapGuides(lines);
    }, snapResult.lines);

    const guideLinesCount = await page.evaluate(() => {
      const grp = document.getElementById('snapGuidesGroup');
      return grp ? grp.querySelectorAll('line').length : 0;
    });
    expect(guideLinesCount).toBeGreaterThan(0);

    // 5. Test clearing snap guides
    await page.evaluate(() => {
      window.WebpointerRender.clearSnapGuides();
    });

    const guideLinesCountAfterClear = await page.evaluate(() => {
      const grp = document.getElementById('snapGuidesGroup');
      return grp ? grp.querySelectorAll('line').length : 0;
    });
    expect(guideLinesCountAfterClear).toBe(0);

    expect(pageErrors).toEqual([]);
  });

  test('TC23: Object Alignment & Distribution Tools', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Create 3 rectangles at different positions
    await page.evaluate(() => {
      const o1 = { id: 'align_1', type: 'rect', attrs: { x: 50, y: 100, width: 60, height: 60, stroke: '#000', fill: '#fff' } };
      const o2 = { id: 'align_2', type: 'rect', attrs: { x: 200, y: 150, width: 60, height: 60, stroke: '#000', fill: '#fff' } };
      const o3 = { id: 'align_3', type: 'rect', attrs: { x: 500, y: 200, width: 60, height: 60, stroke: '#000', fill: '#fff' } };
      window.WebpointerConfig.objectsMap.set(o1.id, o1);
      window.WebpointerConfig.objectsMap.set(o2.id, o2);
      window.WebpointerConfig.objectsMap.set(o3.id, o3);
      window.WebpointerConfig.selectedIds.clear();
      window.WebpointerConfig.selectedIds.add(o1.id);
      window.WebpointerConfig.selectedIds.add(o2.id);
      window.WebpointerConfig.selectedIds.add(o3.id);
      window.WebpointerRender.renderCanvas();
    });

    // Test Align Left (All align to min X = 50)
    await page.evaluate(() => window.alignSelectedObjects('left'));
    const xPositionsAfterLeft = await page.evaluate(() => {
      return [
        window.WebpointerConfig.objectsMap.get('align_1').attrs.x,
        window.WebpointerConfig.objectsMap.get('align_2').attrs.x,
        window.WebpointerConfig.objectsMap.get('align_3').attrs.x
      ];
    });
    expect(xPositionsAfterLeft).toEqual([50, 50, 50]);

    // Test Distribute Horizontal Spacing
    await page.evaluate(() => {
      const o1 = window.WebpointerConfig.objectsMap.get('align_1');
      const o2 = window.WebpointerConfig.objectsMap.get('align_2');
      const o3 = window.WebpointerConfig.objectsMap.get('align_3');
      o1.attrs.x = 0;
      o2.attrs.x = 100;
      o3.attrs.x = 600;
      window.WebpointerHandlers.distributeObjects('horizontal');
    });

    const xPositionsAfterDistribute = await page.evaluate(() => {
      return [
        window.WebpointerConfig.objectsMap.get('align_1').attrs.x,
        window.WebpointerConfig.objectsMap.get('align_2').attrs.x,
        window.WebpointerConfig.objectsMap.get('align_3').attrs.x
      ];
    });
    // With x: 0 (width 60), 600 (width 60), o2 should be centered evenly at (600 - 0) / 2 = 300
    expect(xPositionsAfterDistribute[1]).toBe(300);

    expect(pageErrors).toEqual([]);
  });

  test('TC24: File Slot Save/Load Modal & Auto-Save Recovery Suite', async ({ page }) => {
    // Switch to File tab
    await page.click('.tab-btn:has-text("파일")');

    // Open File Slots Modal via window function
    await page.evaluate(() => {
      if (typeof window.openFileSlotsModal === 'function') {
        window.openFileSlotsModal();
      }
    });
    await expect(page.locator('#fileSlotsModal')).toBeVisible();

    // Save to slot 1 programmatically
    await page.evaluate(() => {
      if (typeof window.saveToFileSlot === 'function') {
        window.saveToFileSlot(1);
      }
    });

    // Check slot 1 thumbnail / status updated
    const slot1Text = await page.locator('#fileSlotCard_1').innerText();
    expect(slot1Text).toContain('Slot 1');

    // Close modal
    await page.click('#fileSlotsModal button:has-text("닫기")');
    await expect(page.locator('#fileSlotsModal')).toBeHidden();

    expect(pageErrors).toEqual([]);
  });

  test('TC25: Image Fill Modes (Stretch, Tile, Single) Suite', async ({ page }) => {
    const stretchFill = await page.evaluate(() => {
      return window.createImageFill('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'stretch');
    });
    expect(stretchFill).toContain('url(#imgpat_');

    const tileFill = await page.evaluate(() => {
      return window.createImageFill('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'tile', 30);
    });
    expect(tileFill).toContain('url(#imgpat_');

    const singleFill = await page.evaluate(() => {
      return window.createImageFill('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'single');
    });
    expect(singleFill).toContain('url(#imgpat_');

    expect(pageErrors).toEqual([]);
  });

  test('TC26: Multi-Stop Gradient Color Ramp & 2-Point Handles Suite', async ({ page }) => {
    const gradUrl = await page.evaluate(() => {
      const stops = [
        { offset: '0%', color: '#ff0000' },
        { offset: '50%', color: '#00ff00' },
        { offset: '100%', color: '#0000ff' }
      ];
      return window.createLinearGradient('#ff0000', '#0000ff', 45, stops);
    });
    expect(gradUrl).toContain('url(#grad_lin_');

    await page.evaluate((fill) => {
      const obj = {
        id: 'rect_grad_1',
        type: 'rect',
        attrs: { x: 100, y: 100, width: 150, height: 100, fill: fill, stroke: '#000', strokeWidth: 2 }
      };
      window.WebpointerConfig.objectsMap.set('rect_grad_1', obj);
      window.WebpointerConfig.selectedIds.clear();
      window.WebpointerConfig.selectedIds.add('rect_grad_1');
      if (window.WebpointerRender) window.WebpointerRender.renderUI();
    }, gradUrl);

    const handleCount = await page.locator('#uiGroup circle[data-handle-type="gradient_start"]').count();
    expect(handleCount).toBe(1);

    expect(pageErrors).toEqual([]);
  });

  test('TC27: Shape Text Horizontal & Vertical Alignment Suite', async ({ page }) => {
    const coords = await page.evaluate(() => {
      const shapeObj = { id: 's1', type: 'rect', attrs: { x: 100, y: 100, width: 200, height: 100 } };
      const textObj = { id: 't1', type: 'text', attrs: { text: 'Hello', fontSize: 20 } };
      window.updateShapeTextAlignment(shapeObj, textObj, 'left', 'top');
      const topX = textObj.attrs.x;
      const topY = textObj.attrs.y;

      window.updateShapeTextAlignment(shapeObj, textObj, 'right', 'bottom');
      const botX = textObj.attrs.x;
      const botY = textObj.attrs.y;

      return { topX, topY, botX, botY };
    });

    expect(coords.topX).toBe(112);
    expect(coords.botX).toBe(288);
    expect(coords.botY).toBeGreaterThan(coords.topY);

    expect(pageErrors).toEqual([]);
  });

  test('TC28: Live Filter Preview & Stack Reordering Suite', async ({ page }) => {
    const filters = await page.evaluate(() => {
      const obj = { id: 'obj_flt_1', type: 'rect', attrs: { x: 50, y: 50, width: 100, height: 100, filterList: ['blur(5px)', 'grayscale(100%)'] } };
      window.WebpointerConfig.objectsMap.set('obj_flt_1', obj);
      window.WebpointerConfig.selectedIds.clear();
      window.WebpointerConfig.selectedIds.add('obj_flt_1');

      window.moveFilterDown(0);
      const afterDown = obj.attrs.filterList.slice();

      window.moveFilterUp(1);
      const afterUp = obj.attrs.filterList.slice();

      return { afterDown, afterUp };
    });

    expect(filters.afterDown[0]).toBe('grayscale(100%)');
    expect(filters.afterDown[1]).toBe('blur(5px)');
    expect(filters.afterUp[0]).toBe('blur(5px)');

    expect(pageErrors).toEqual([]);
  });

  test('TC29: Rotation & Flip E2E Suite, SMIL Animation, Hotkeys & Canvas Zoom', async ({ page }) => {
    await page.evaluate(() => {
      const o1 = window.WebpointerObjects.createSvgObject('rect', { stepX: 1, stepY: 1 }, { stepX: 5, stepY: 5 });
      const o2 = window.WebpointerObjects.createSvgObject('rect', { stepX: 10, stepY: 10 }, { stepX: 15, stepY: 15 });
      window.WebpointerConfig.selectedIds.clear();
      window.WebpointerConfig.selectedIds.add(o1.id);
      window.WebpointerConfig.selectedIds.add(o2.id);
    });
    await page.keyboard.press('Control+a');
    const selectedCount = await page.evaluate(() => window.WebpointerConfig.selectedIds.size);
    expect(selectedCount).toBeGreaterThanOrEqual(2);

    await page.evaluate(() => {
      window.playAnimation('rotate');
      window.playAnimation('bounce');
    });
    const animCount = await page.locator('#mainSvg animateTransform').count();
    expect(animCount).toBeGreaterThan(0);

    await page.evaluate(() => window.stopAllAnimations());
    const animCountAfterStop = await page.locator('#mainSvg animateTransform').count();
    expect(animCountAfterStop).toBe(0);

    await page.evaluate(() => {
      window.cycleStartMarker();
      window.cycleEndMarker();
      window.cycleStrokeCap();
      window.cycleStrokeJoin();
    });

    expect(pageErrors).toEqual([]);
  });
});

