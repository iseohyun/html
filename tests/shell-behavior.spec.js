const { test, expect } = require('@playwright/test');

test.describe('홈 화면의 테마', () => {
  test('테마를 바꾸면 홈의 바탕 · 달력 · 리스트도 함께 바뀐다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.addInitScript(() => {
      localStorage.setItem('iseohyun_settings_v1', JSON.stringify({ theme: 'navy', fontScale: '1' }));
    });
    await page.goto('/index.html');
    await expect(page.locator('.update-calendar-table')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'navy');

    const colors = await page.evaluate(() => ({
      body: getComputedStyle(document.body).backgroundColor,
      cell: getComputedStyle(document.querySelector('td.cal-cell:not(.is-today)')).backgroundColor,
      dateText: getComputedStyle(document.querySelector('td.cal-cell:not(.sun-cell):not(.sat-cell):not(.holiday-cell) .cal-date-num:not(.month-start-badge)')).color,
    }));
    // 네이비 테마의 토큰 값: --bg #0f1b2d, --surface #16263d
    expect(colors.body).toBe('rgb(15, 27, 45)');
    expect(colors.cell).toBe('rgb(22, 38, 61)');
    expect(colors.dateText).not.toBe('rgb(51, 65, 85)');

    await page.locator('#header-tabs .app-tab', { hasText: '리스트' }).click();
    await expect(page.locator('table.list-data-table')).toBeVisible();
    const listBg = await page.locator('.list-table-scroll').evaluate(el => getComputedStyle(el).backgroundColor);
    expect(listBg).toBe('rgb(22, 38, 61)');
  });
});

test.describe('오류 안내 화면', () => {
  test('문서를 불러오지 못하면 안내와 다시 시도 · 새로 고침 버튼이 나오고, 헤더와 사이드바는 그대로다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/index.html#/column/swimming/없는-문서.html');

    const errorBox = page.locator('.error-state');
    await expect(errorBox).toBeVisible();
    await expect(errorBox).toContainText('문제가 생겼습니다');
    await expect(page.locator('#error-retry-btn')).toBeVisible();
    await expect(page.locator('#error-reload-btn')).toBeVisible();
    await expect(page.locator('#header-title')).toHaveText('문제가 생겼습니다');

    // 다른 페이지로 옮길 수 있다
    await expect(page.locator('#header-menu-btn')).toBeVisible();
    await page.evaluate(() => { window.location.hash = '#/'; });
    await expect(page.locator('.update-calendar-table')).toBeVisible();
    await expect(page.locator('.error-state')).toHaveCount(0);
  });

  test('다시 시도는 같은 문서를 다시 불러온다', async ({ page }) => {
    let failNext = true;
    await page.route('**/column/swimming/freestyle.html', route => {
      if (failNext) { failNext = false; return route.fulfill({ status: 503, body: 'down' }); }
      return route.continue();
    });
    await page.goto('/index.html#/column/swimming/freestyle.html');
    await expect(page.locator('.error-state')).toBeVisible();

    await page.locator('#error-retry-btn').click();
    await expect(page.locator('.error-state')).toHaveCount(0);
    await expect(page.locator('article h1').first()).toBeVisible();
  });
});

test.describe('스크롤 위치 기억', () => {
  test('다른 화면에 다녀오면 보던 자리로 돌아온다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/index.html#/column/swimming/freestyle.html');
    await expect(page.locator('article h1').first()).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 900));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(900);

    // 다른 문서는 처음 보는 곳이라 맨 위에서 시작한다
    await page.evaluate(() => { window.location.hash = '#/info.html'; });
    await expect(page.locator('#header-title')).toHaveText('사이트 소개');
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

    // 돌아오면 보던 자리
    await page.evaluate(() => { window.location.hash = '#/column/swimming/freestyle.html'; });
    await expect(page.locator('#header-title')).not.toHaveText('사이트 소개');
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(900);
  });

  test('홈의 달력도 다녀오면 보던 자리로 돌아온다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/index.html');
    await expect(page.locator('.update-calendar-table')).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 700));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(700);

    await page.locator('#header-tabs .app-tab', { hasText: '리스트' }).click();
    await expect(page.locator('table.list-data-table')).toBeVisible();
    await page.locator('#header-tabs .app-tab', { hasText: '달력' }).click();
    await expect(page.locator('.update-calendar-table')).toBeVisible();
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(700);
  });
});
