const { test, expect } = require('@playwright/test');

test.describe('전체 설정', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test('헤더 설정 패널의 맨 아래 줄에서 전체 설정 페이지로 간다', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('.update-calendar-table')).toBeVisible();

    await page.locator('#header-settings-btn').click();
    // 홈에는 화면별 설정(달력)이 있고, 그 아래에 전체 설정 링크가 붙는다
    await expect(page.locator('#cal-bg-alpha-slider')).toBeVisible();
    await page.locator('#header-global-settings-link').click();

    await expect(page).toHaveURL(/#\/settings\.html$/);
    await expect(page.locator('#header-title')).toHaveText('전체 설정');
    await expect(page.locator('.set-card')).toBeVisible();
    await expect(page.locator('#header-drop')).not.toHaveClass(/is-open/);
  });

  test('테마: 고르면 뼈대 색이 바뀌고, 새로 열어도 남아 있으며, 문서 본문은 밝게 유지된다', async ({ page }) => {
    await page.goto('/index.html#/settings.html');
    const rail = page.locator('#sidebar-nav');
    await expect(page.locator('.set-card')).toBeVisible();
    const lightBg = await rail.evaluate(el => getComputedStyle(el).backgroundColor);

    await page.locator('.pill-btn[data-setting="theme"][data-value="navy"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'navy');
    const navyBg = await rail.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(navyBg).not.toBe(lightBg);

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'navy');
    await expect(page.locator('.pill-btn[data-setting="theme"][data-value="navy"]')).toHaveAttribute('aria-pressed', 'true');

    // 문서 본문의 글자색은 테마와 무관하게 그대로다
    await page.evaluate(() => { window.location.hash = '#/column/swimming/freestyle.html'; });
    await expect(page.locator('#header-title')).not.toHaveText('전체 설정');
    const articleColor = await page.locator('article').evaluate(el => getComputedStyle(el).color);
    expect(articleColor).toBe('rgb(68, 68, 68)');
  });

  test('글자 크기: 단계를 바꾸면 화면 전체 글자 크기가 달라지고, 기본값으로 되돌릴 수 있다', async ({ page }) => {
    await page.goto('/index.html#/settings.html');
    await expect(page.locator('.set-card')).toBeVisible();
    const rootSize = () => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    const base = await rootSize();

    await page.locator('.pill-btn[data-setting="fontScale"][data-value="1.25"]').click();
    expect(await rootSize()).toBeCloseTo(base * 1.25, 1);

    await page.locator('#settings-reset-btn').click();
    expect(await rootSize()).toBeCloseTo(base, 1);
    await expect(page.locator('.pill-btn[data-setting="fontScale"][data-value="1"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).not.toHaveAttribute('data-skin', /.+/);
  });

  test('저장된 값이 어긋나 있으면 그 항목만 기본값으로 둔다', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('iseohyun_settings_v1', JSON.stringify({ theme: '없는테마', fontScale: '1.1' }));
    });
    await page.goto('/index.html#/settings.html');
    await expect(page.locator('.set-card')).toBeVisible();
    // 테마의 기본값은 "시스템"
    await expect(page.locator('.pill-btn[data-setting="theme"][data-value="system"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.pill-btn[data-setting="fontScale"][data-value="1.1"]')).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('단축키', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/index.html');
    await expect(page.locator('.update-calendar-table')).toBeVisible();
  });

  test('기본 단축키: M 은 패널, F 는 필터, 쉼표는 설정, ] 는 다음 탭', async ({ page }) => {
    const panel = page.locator('#sidebar-panel');
    await expect(panel).toHaveClass(/collapsed/);
    await page.keyboard.press('m');
    await expect(panel).not.toHaveClass(/collapsed/);
    await page.keyboard.press('m');
    await expect(panel).toHaveClass(/collapsed/);

    await page.keyboard.press('f');
    await expect(page.locator('#header-filter-btn')).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press(',');
    await expect(page.locator('#header-settings-btn')).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');

    await page.keyboard.press(']');
    await expect(page).toHaveURL(/#\/list$/);
    await page.keyboard.press('[');
    await expect(page.locator('.update-calendar-table')).toBeVisible();
  });

  test('입력 칸에 글자를 넣는 중에는 단축키가 동작하지 않는다', async ({ page }) => {
    await page.locator('#header-filter-btn').click();
    await page.locator('#cal-search-input').fill('');
    await page.locator('#cal-search-input').type('mf');
    await expect(page.locator('#cal-search-input')).toHaveValue('mf');
    await expect(page.locator('#sidebar-panel')).toHaveClass(/collapsed/);
  });

  test('Alt 를 누르는 동안 버튼에 단축키 배지가 보인다', async ({ page }) => {
    await page.keyboard.down('Alt');
    await expect(page.locator('body')).toHaveClass(/show-keys/);
    await expect(page.locator('#header-menu-btn')).toHaveAttribute('data-key', 'm');
    await expect(page.locator('#nav-sitemap')).toHaveAttribute('data-key', '1');
    const badge = await page.locator('#header-menu-btn').evaluate(el => {
      const cs = getComputedStyle(el, '::after');
      return { content: cs.content, opacity: cs.opacity };
    });
    expect(badge.content).toBe('"m"');
    await expect.poll(() => page.locator('#header-menu-btn').evaluate(el => getComputedStyle(el, '::after').opacity)).toBe('1');
    await page.keyboard.up('Alt');
    await expect(page.locator('body')).not.toHaveClass(/show-keys/);
  });

  test('단축키 바꾸기: 새 키로 바뀌고 기억되며, 이미 쓰는 키는 받지 않고, 기본값으로 되돌릴 수 있다', async ({ page }) => {
    await page.evaluate(() => { window.location.hash = '#/settings-keys.html'; });
    await expect(page.locator('#header-title')).toHaveText('단축키');
    const menuKey = page.locator('.key-cap[data-action="menu"]');
    await expect(menuKey).toHaveText('M');

    // 이미 쓰는 키(F)는 받지 않고 어디서 쓰는지 알려 준다
    await menuKey.click();
    await page.keyboard.press('f');
    await expect(page.locator('#keys-message')).toContainText('필터 여닫기');
    // 같은 대기 상태에서 다른 키(K)를 누르면 바뀐다
    await page.keyboard.press('k');
    await expect(page.locator('.key-cap[data-action="menu"]')).toHaveText('K');

    // 바꾼 키로 동작하고, 예전 키는 동작하지 않는다
    const panel = page.locator('#sidebar-panel');
    await page.keyboard.press('m');
    await expect(panel).toHaveClass(/collapsed/);
    await page.keyboard.press('k');
    await expect(panel).not.toHaveClass(/collapsed/);
    await page.keyboard.press('k');

    // 새로 열어도 남아 있다
    await page.reload();
    await expect(page.locator('.key-cap[data-action="menu"]')).toHaveText('K');

    // Esc 는 취소, 기본값으로 되돌리기
    await page.locator('.key-cap[data-action="menu"]').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('.key-cap[data-action="menu"]')).toHaveText('K');
    await page.locator('#keys-reset-btn').click();
    await expect(page.locator('.key-cap[data-action="menu"]')).toHaveText('M');
  });
});

test.describe('기본 테마', () => {
  test('처음 온 방문자는 기기의 밝게/어둡게 설정을 따른다', async ({ browser }) => {
    const dark = await browser.newContext({ colorScheme: 'dark' });
    const darkPage = await dark.newPage();
    await darkPage.goto('/index.html');
    await expect(darkPage.locator('html')).toHaveAttribute('data-skin', 'dark');
    await dark.close();

    const light = await browser.newContext({ colorScheme: 'light' });
    const lightPage = await light.newPage();
    await lightPage.goto('/index.html');
    await expect(lightPage.locator('.update-calendar-table')).toBeVisible();
    await expect(lightPage.locator('html')).not.toHaveAttribute('data-skin', /.+/);
    await light.close();
  });
});
