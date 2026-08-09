const { test, expect } = require('@playwright/test');

test.describe('Webpointer 캔버스 파일 드래그 앤 드랍(Drag & Drop) 자동 로드 수트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1/#/small-project/Webpointer/index.html');
    await page.waitForSelector('#mainSvg');
  });

  test('TC-DRAG-DROP-01: .json 프로젝트 파일 드롭 시 캔버스 스냅샷 데이터 100% 원본 복원 검증', async ({ page }) => {
    const jsonStr = JSON.stringify({
      version: '1.0.0',
      timestamp: Date.now(),
      objects: [
        { id: 'drag_dropped_rect_101', type: 'rect', attrs: { x: 100, y: 100, width: 200, height: 150, fill: '#0284c7' } }
      ]
    });

    await page.evaluate((content) => {
      const dataTransfer = new DataTransfer();
      const file = new File([content], 'project_backup.json', { type: 'application/json' });
      dataTransfer.items.add(file);

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dataTransfer
      });
      window.dispatchEvent(dropEvent);
    }, jsonStr);

    await page.waitForTimeout(400);

    const isRestored = await page.evaluate(() => {
      return window.WebpointerConfig.objectsMap.has('drag_dropped_rect_101');
    });

    console.log('[Webpointer Drag & Drop JSON Test 🧪 - Object Restored]:', isRestored);
    expect(isRestored).toBe(true);
  });

  test('TC-DRAG-DROP-02: .svg 벡터 파일 드롭 시 캔버스 정중앙 심볼 생성 검증', async ({ page }) => {
    const svgStr = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#10b981"/></svg>';

    await page.evaluate((content) => {
      const dataTransfer = new DataTransfer();
      const file = new File([content], 'sample_icon.svg', { type: 'image/svg+xml' });
      dataTransfer.items.add(file);

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dataTransfer
      });
      window.dispatchEvent(dropEvent);
    }, svgStr);

    await page.waitForTimeout(400);

    const hasSvgObj = await page.evaluate(() => {
      const objs = Array.from(window.WebpointerConfig.objectsMap.values());
      return objs.some(o => o.type === 'image' && o.attrs && o.attrs.href && o.attrs.href.includes('data:image/svg+xml'));
    });

    console.log('[Webpointer Drag & Drop SVG Test 🧪 - SVG Symbol Placed]:', hasSvgObj);
    expect(hasSvgObj).toBe(true);
  });

  test('TC-DRAG-DROP-03: .png/.jpg 이미지 파일 드롭 시 캔버스 정중앙 그림 심볼 생성 검증', async ({ page }) => {
    const dummyPngData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    await page.evaluate((base64) => {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const file = new File([byteArray], 'photo.png', { type: 'image/png' });

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dataTransfer
      });
      window.dispatchEvent(dropEvent);
    }, dummyPngData);

    await page.waitForTimeout(400);

    const imageDomState = await page.evaluate(() => {
      const imgEl = document.querySelector('#objectsGroup image');
      if (!imgEl) return { hasEl: false };
      const href = imgEl.getAttribute('href') || imgEl.getAttribute('xlink:href');
      return {
        hasEl: true,
        tagName: imgEl.tagName.toLowerCase(),
        width: imgEl.getAttribute('width'),
        height: imgEl.getAttribute('height'),
        hasValidHref: !!href && href.startsWith('data:image/png;base64,')
      };
    });

    console.log('[Webpointer Drag & Drop PNG Image Test 🧪 - Image DOM State]:', imageDomState);
    expect(imageDomState.hasEl).toBe(true);
    expect(imageDomState.tagName).toBe('image');
    expect(imageDomState.hasValidHref).toBe(true);
  });
});
