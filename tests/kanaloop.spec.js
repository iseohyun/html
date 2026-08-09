const { test, expect } = require('@playwright/test');

test.describe('KanaLoop (small-project/KanaLoop)', () => {
  test('KanaLoop 메인 UI 및 컨트롤러 로드', async ({ page }) => {
    await page.goto('/#/' + 'small-project/KanaLoop/index.html');
    await page.waitForTimeout(1000);

    const mainContainer = page.locator('article');
    await expect(mainContainer).toBeVisible();
  });
});
