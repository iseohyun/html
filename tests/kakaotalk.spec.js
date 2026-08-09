const { test, expect } = require('@playwright/test');

test.describe('카카오톡 대화 생성기 (small-project/KakaoTalk)', () => {
  test('카카오톡 캔버스 정상 로드 및 렌더링 검증', async ({ page }) => {
    await page.goto('/#/' + 'small-project/KakaoTalk/index.html');
    await page.waitForTimeout(1000);

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    const canvasBounds = await canvas.evaluate(el => ({
      width: el.width,
      height: el.height
    }));
    expect(canvasBounds.width).toBe(1080);
    expect(canvasBounds.height).toBe(2340);
  });
});
