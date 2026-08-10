const { test, expect } = require('@playwright/test');

test.describe('Webpointer (small-project/Webpointer)', () => {
  test('Webpointer 인터페이스 및 SVG 캔버스 로드', async ({ page }) => {
    await page.goto('/#/' + 'small-project/Webpointer/index.html');
    await page.waitForTimeout(1000);

    const article = page.locator('article');
    await expect(article).toBeVisible();
  });
});
