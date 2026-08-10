const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('카카오톡 대화 생성기 (small-project/KakaoTalk)', () => {
  test('카카오톡 캔버스 정상 로드 및 렌더링 검증', async ({ page }) => {
    await page.goto('/#/' + 'small-project/KakaoTalk/index.html');
    await page.waitForTimeout(1000);

    const canvas = page.locator('#chat-canvas');
    await expect(canvas).toBeVisible();

    const canvasBounds = await canvas.evaluate(el => ({
      width: el.width,
      height: el.height
    }));
    expect(canvasBounds.width).toBe(1080);
    expect(canvasBounds.height).toBe(2340);
  });

  test('사용자 제공 내보내기 대화 파일(tests/fixtures) 로드 및 렌더링 검증', async ({ page }) => {
    await page.goto('/#/' + 'small-project/KakaoTalk/index.html');
    await page.waitForTimeout(1000);

    const fixturePath = path.join(__dirname, 'fixtures', '정재현, 구인호, 최경은, 이장섭 5 님과 카카오톡 대화');
    if (fs.existsSync(fixturePath)) {
      const fileLoader = page.locator('#file-loader');
      await fileLoader.setInputFiles(fixturePath);
      await page.waitForTimeout(1000);

      const canvas = page.locator('#chat-canvas');
      await expect(canvas).toBeVisible();
    }
  });

  test('대화방 테마 선택 및 개별 색상 설정 변경 렌더링 검증', async ({ page }) => {
    await page.goto('/small-project/KakaoTalk/index.html');
    await page.waitForTimeout(1000);

    await page.locator('#btn-icon-settings').click();
    await page.waitForTimeout(300);

    const colorAccordionHeader = page.locator('.setting-accordion-header').filter({ hasText: '색상 설정' });
    await colorAccordionHeader.click();
    await page.waitForTimeout(200);

    const selectTheme = page.locator('#select-theme');
    await expect(selectTheme).toBeVisible();

    await selectTheme.selectOption('dark');
    await page.waitForTimeout(300);

    const canvas = page.locator('#chat-canvas');
    await expect(canvas).toBeVisible();
  });

  test('캔버스 직접 선택 색상 변경 모드 (🎯) 버튼 토글 및 마우스 호버 툴팁 검증', async ({ page }) => {
    await page.goto('/small-project/KakaoTalk/index.html');
    await page.waitForTimeout(1000);

    await page.locator('#btn-icon-settings').click();
    await page.waitForTimeout(300);

    const btnCanvasPicker = page.locator('#btn-canvas-picker-mode');
    await expect(btnCanvasPicker).toBeVisible();

    await btnCanvasPicker.click();
    await page.waitForTimeout(200);

    const isPickerActive = await btnCanvasPicker.evaluate(el => el.classList.contains('active'));
    expect(isPickerActive).toBe(true);

    const canvas = page.locator('#chat-canvas');
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(300);

      const tooltip = page.locator('#canvas-picker-tooltip');
      await expect(tooltip).toBeVisible();
    }
  });

  test('커스텀 메뉴얼 컬러 피커 모달 (2D Hue-Value Map + 모자이크 슬라이더) 검증', async ({ page }) => {
    await page.goto('/small-project/KakaoTalk/index.html');
    await page.waitForTimeout(1000);

    await page.locator('#btn-icon-settings').click();
    await page.waitForTimeout(300);

    const colorAccordionHeader = page.locator('.setting-accordion-header').filter({ hasText: '색상 설정' });
    await colorAccordionHeader.click();
    await page.waitForTimeout(200);

    const colorBgInput = page.locator('#color-bg');
    await page.evaluate(() => {
      window.openCustomColorPicker(document.getElementById('color-bg'), '대화방 배경색');
    });
    await page.waitForTimeout(300);

    const customPickerModal = page.locator('#custom-color-picker-modal');
    await expect(customPickerModal).toBeVisible();

    const mosaicSlider = page.locator('#input-picker-mosaic');
    await expect(mosaicSlider).toBeVisible();

    await page.locator('#btn-picker-confirm').click();
    await page.waitForTimeout(200);
    await expect(customPickerModal).toBeHidden();
  });
});
