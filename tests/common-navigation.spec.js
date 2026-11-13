const { test, expect } = require('@playwright/test');

test.describe('공통 뼈대: 헤더 · 레일 · 패널', () => {
  test('헤더는 화면 위에 고정되고 메뉴 아이콘이 넓은 화면과 좁은 화면 모두에 보인다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/index.html');

    const header = page.locator('#app-header');
    await expect(header).toBeVisible();
    expect(await header.evaluate(el => window.getComputedStyle(el).position)).toBe('fixed');
    expect(await page.locator('.app-topbar').evaluate(el => el.getBoundingClientRect().height)).toBe(48);
    await expect(page.locator('#header-menu-btn')).toBeVisible();
    await expect(page.locator('#header-title')).toHaveText('iseohyun.com');

    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator('#header-menu-btn')).toBeVisible();
    // 좁은 화면에서는 헤더가 화면 왼쪽 끝부터 시작한다
    await expect.poll(() => header.evaluate(el => Math.round(el.getBoundingClientRect().left))).toBe(0);
  });

  test('넓은 화면: 메뉴 아이콘이 패널을 여닫고 헤더가 그만큼 밀린다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/index.html');

    const panel = page.locator('#sidebar-panel');
    const header = page.locator('#app-header');
    await expect(panel).toHaveClass(/collapsed/);
    await expect.poll(() => header.evaluate(el => Math.round(el.getBoundingClientRect().left))).toBe(60);

    await page.locator('#header-menu-btn').click();
    await expect(panel).not.toHaveClass(/collapsed/);
    await expect(page.locator('#panel-title')).toHaveText('사이트맵');
    await expect.poll(() => header.evaluate(el => Math.round(el.getBoundingClientRect().left))).toBe(300);

    await page.locator('#panel-close-btn').click();
    await expect(panel).toHaveClass(/collapsed/);
  });

  test('좁은 화면: 메뉴 아이콘이 서랍을 열고 목차 탭으로 전환된다', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/index.html');

    await page.locator('#header-menu-btn').click();
    await expect(page.locator('#sidebar-container')).toHaveClass(/active/);

    await page.locator('#nav-toc').click();
    await expect(page.locator('#tab-toc')).toHaveClass(/active/);
    await expect(page.locator('#panel-title')).toHaveText('목차');

    // 덮개를 누르면 서랍이 닫힌다
    await page.locator('#sidebar-overlay').click({ position: { x: 360, y: 400 } });
    await expect(page.locator('#sidebar-container')).not.toHaveClass(/active/);
  });

  test('필터와 화면 설정 아이콘은 홈에서만 보이고, 같은 자리에 한 번에 하나만 펼쳐진다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/index.html');
    await expect(page.locator('.update-calendar-table')).toBeVisible();

    const filterBtn = page.locator('#header-filter-btn');
    const settingsBtn = page.locator('#header-settings-btn');
    const drop = page.locator('#header-drop');
    await expect(filterBtn).toBeVisible();
    await expect(settingsBtn).toBeVisible();

    await filterBtn.click();
    await expect(drop).toHaveClass(/is-open/);
    await expect(page.locator('#cal-search-input')).toBeVisible();

    // 설정을 열면 필터는 닫히고 같은 자리에 설정이 나온다
    await settingsBtn.click();
    await expect(filterBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(settingsBtn).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#cal-bg-alpha-slider')).toBeVisible();
    await expect(page.locator('#cal-search-input')).toHaveCount(0);

    await page.keyboard.press('Escape');
    await expect(drop).not.toHaveClass(/is-open/);

    // 필터를 걸면 아이콘에 점이 찍힌다
    await filterBtn.click();
    await page.locator('#cal-search-input').fill('수영');
    await expect(page.locator('#header-filter-dot')).toBeVisible();

    // 문서 페이지로 가면 두 아이콘이 사라지고 제목이 바뀐다
    await page.evaluate(() => { window.location.hash = '#/column/swimming/swimming.html'; });
    await expect(page.locator('article h1').first()).toBeVisible();
    await expect(filterBtn).toBeHidden();
    await expect(settingsBtn).toBeHidden();
    await expect(page.locator('#header-title')).not.toHaveText('iseohyun.com');
  });

  test('페이지 공유 아이콘은 주소를 복사하고 짧은 알림을 띄운다', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/index.html');

    await page.locator('#header-share-btn').click();
    await expect(page.locator('#header-toast')).toHaveText('주소를 복사했습니다');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('/index.html');
  });

  test('외부 출처 해시 경로는 차단되어 홈으로 복귀', async ({ page }) => {
    await page.goto('/index.html#//example.com/x.html');
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.locator('#site-history')).toBeAttached();
  });
});
