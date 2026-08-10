const { test, expect } = require('@playwright/test');

test.describe('웹 장기 (small-project/janggi)', () => {
  test('웹 장기 2.0 보드 및 컨트롤러 로드', async ({ page }) => {
    await page.goto('/#/' + 'small-project/janggi/index.html');
    await page.waitForTimeout(1000);

    const board = page.locator('article');
    await expect(board).toBeVisible();
  });
});
