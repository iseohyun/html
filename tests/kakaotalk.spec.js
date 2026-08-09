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

  test('테마 상세보기 버튼 클릭 시 테마 상세 설정 모달 팝업 및 미리보기 캔버스 렌더링 검증', async ({ page }) => {
    await page.goto('/small-project/KakaoTalk/index.html');
    await page.waitForTimeout(1000);

    const btnOpenThemeModal = page.locator('#btn-open-theme-modal');
    await expect(btnOpenThemeModal).toBeVisible();

    await btnOpenThemeModal.click();
    await page.waitForTimeout(500);

    const isModalFlex = await page.evaluate(() => {
      const modal = document.getElementById('theme-detail-modal');
      return modal ? window.getComputedStyle(modal).display === 'flex' : false;
    });
    expect(isModalFlex).toBe(true);

    const previewCanvas = page.locator('#theme-preview-canvas');
    await expect(previewCanvas).toBeVisible();
  });
});
