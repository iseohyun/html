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

    await page.locator('#home-view-switch a', { hasText: '리스트' }).click();
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

    await page.evaluate(() => document.getElementById('app-main').scrollTo({ top: 900, behavior: 'instant' }));
    await expect.poll(() => page.evaluate(() => Math.round(document.getElementById('app-main').scrollTop))).toBe(900);

    // 다른 문서는 처음 보는 곳이라 맨 위에서 시작한다
    await page.evaluate(() => { window.location.hash = '#/info.html'; });
    await expect(page.locator('#header-title')).toHaveText('사이트 소개');
    await expect.poll(() => page.evaluate(() => Math.round(document.getElementById('app-main').scrollTop))).toBe(0);

    // 돌아오면 보던 자리
    await page.evaluate(() => { window.location.hash = '#/column/swimming/freestyle.html'; });
    await expect(page.locator('#header-title')).not.toHaveText('사이트 소개');
    await expect.poll(() => page.evaluate(() => Math.round(document.getElementById('app-main').scrollTop))).toBe(900);
  });

  test('홈의 달력도 다녀오면 보던 자리로 돌아온다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/index.html');
    await expect(page.locator('.update-calendar-table')).toBeVisible();

    await page.evaluate(() => document.getElementById('app-main').scrollTo({ top: 700, behavior: 'instant' }));
    await expect.poll(() => page.evaluate(() => Math.round(document.getElementById('app-main').scrollTop))).toBe(700);

    // 보기 전환은 새소식 맨 위에 있어 스크롤한 자리에서는 보이지 않는다. 늘 보이는 헤더 탭으로 다녀온다.
    await page.locator('#header-tabs .app-tab', { hasText: '프로젝트' }).click();
    await expect(page).toHaveURL(/#\/promo\.html$/);
    await page.locator('#header-tabs .app-tab', { hasText: '새소식' }).click();
    await expect(page.locator('.update-calendar-table')).toBeVisible();
    await expect.poll(() => page.evaluate(() => Math.round(document.getElementById('app-main').scrollTop))).toBe(700);
  });
});

test.describe('본문 영역만 스크롤', () => {
  test('페이지는 스크롤되지 않고 본문 영역만 스크롤되며, 헤더는 제자리에 있다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/index.html#/column/swimming/freestyle.html');
    await expect(page.locator('article h1').first()).toBeVisible();

    const main = page.locator('#app-main');
    await expect(main).toBeVisible();
    expect(await main.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);

    await page.locator('article').hover();
    await page.mouse.wheel(0, 1200);
    await expect.poll(() => main.evaluate(el => el.scrollTop)).toBeGreaterThan(300);
    expect(await page.evaluate(() => document.scrollingElement.scrollTop)).toBe(0);
    expect(await page.locator('#app-header').evaluate(el => Math.round(el.getBoundingClientRect().top))).toBe(0);

    // 예전 코드 호환: window.scrollY 가 본문 영역의 스크롤 위치를 돌려준다
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  });

  test('문서 맨 위에는 제목과 분류 경로가 나온다', async ({ page }) => {
    await page.goto('/index.html#/science/middle/first/force.html');
    await expect(page.locator('#title-container')).toBeVisible();
    await expect(page.locator('#title-container')).toContainText('과학 > 중학 > 1학년');
    await expect(page.locator('#last-modified')).toBeAttached();
  });

  test('문서는 테마의 종이(어두운 테마는 표면색) 위에, 둘레의 바탕은 테마를 따른다', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('iseohyun_settings_v1', JSON.stringify({ theme: 'navy', fontScale: '1' }));
    });
    await page.goto('/index.html#/column/swimming/freestyle.html');
    await expect(page.locator('article h1').first()).toBeVisible();
    const colors = await page.evaluate(() => ({
      body: getComputedStyle(document.body).backgroundColor,
      article: getComputedStyle(document.querySelector('article')).backgroundColor,
    }));
    expect(colors.body).toBe('rgb(15, 27, 45)');
    expect(colors.article).toBe('rgb(22, 38, 61)');
  });

  test('목차는 본문 영역을 스크롤하면 지금 보는 항목을 강조한다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/index.html#/column/swimming/freestyle.html');
    await expect(page.locator('article h1').first()).toBeVisible();
    await page.locator('#header-toc-btn').click();
    await expect(page.locator('#toc-tree li').first()).toBeVisible();

    // 목차의 마지막 항목이 가리키는 제목으로 스크롤하면 그 항목이 강조된다
    const lastTocText = await page.locator('#toc-tree a').last().textContent();
    const headingText = await page.evaluate(tocText => {
      const heading = [...document.querySelectorAll('article h1, article h2')].reverse()
        .find(h => h.textContent && tocText.includes(h.textContent));
      heading.scrollIntoView({ block: 'start', behavior: 'instant' });
      return heading.textContent;
    }, lastTocText);
    await expect(page.locator('#toc-tree a.active-toc')).toHaveCount(1);
    await expect(page.locator('#toc-tree a.active-toc')).toContainText(headingText.trim());
  });
});
