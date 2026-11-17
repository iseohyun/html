const { test, expect } = require('@playwright/test');

// 시뮬레이터는 문서 안의 그림(svg)에 그린다. 페이지 맨 앞에는 사이트 뼈대의 아이콘(svg, 20px)이 있으므로
// 그냥 "svg" 로 고르면 아이콘이 잡혀 그림이 20px 안에 찌그러진다.
test.describe('시뮬레이터가 문서 안의 그림에 그려진다', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test('베지어 시뮬레이터: 바탕이 그림 영역 전체를 덮고 곡선이 그 안에 그려진다', async ({ page }) => {
    await page.goto('/index.html#/small-project/Bezier/index.html');
    const ground = page.locator('article svg #ground');
    await expect(ground).toBeAttached();
    await expect.poll(async () => Number(await ground.getAttribute('width'))).toBeGreaterThan(400);
    await expect.poll(async () => Number(await ground.getAttribute('height'))).toBeGreaterThan(400);

    // 곡선의 시작점이 아이콘 크기(20px)를 벗어난 자리에 있다
    const pathData = await page.locator('article svg #bezier-path').getAttribute('d');
    const startX = Number(/^M\s*([\d.]+)/.exec(pathData)[1]);
    expect(startX).toBeGreaterThan(50);
    await expect(page.locator('article svg g[id^="svg-ptr"]').first()).toBeVisible();
  });

  for (const name of ['imaginary', 'SonPrefer']) {
    test(`${name}: 그림을 고르는 선택자가 문서 안의 그림을 가리킨다`, async ({ page }) => {
      await page.goto(`/index.html#/small-project/${name}/index.html`);
      await expect(page.locator('article svg').first()).toBeAttached();
      const picked = await page.evaluate(() => {
        const el = document.querySelector(SELECTORS.svg);
        return el ? { inArticle: !!el.closest('article'), width: el.clientWidth } : null;
      });
      expect(picked).not.toBeNull();
      expect(picked.inArticle).toBe(true);
      expect(picked.width).toBeGreaterThan(100);
      await expect(page.locator('.error-state')).toHaveCount(0);
    });
  }
});
