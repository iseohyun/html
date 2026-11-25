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

  test('헤더 설정 패널의 맨 아래 줄 「테마」: 바로 바꾸고, 전체 설정 페이지와 눌림이 맞으며, 「상세」로 전체 설정에 간다', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/index.html#/engineering/language/C/pointer.html');
    await expect(page.locator('article h1').first()).toBeVisible();
    await page.locator('#header-settings-btn').click();

    const themes = page.locator('#header-drop [data-header-theme]');
    await expect(themes).toHaveText(['밝게', '어둡게', '스톤', '네이비', '시스템']);
    await expect(page.locator('#header-drop [data-header-theme="system"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#header-global-settings-link')).toHaveText('상세');

    await page.locator('#header-drop [data-header-theme="navy"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'navy');
    await expect(page.locator('#header-drop [data-header-theme="navy"]')).toHaveAttribute('aria-pressed', 'true');

    // 「상세」: 전체 설정 페이지로 가고, 그곳의 테마 단추도 같은 값이 눌려 있다
    await page.locator('#header-global-settings-link').click();
    await expect(page).toHaveURL(/#\/settings\.html$/);
    await expect(page.locator('.set-card [data-setting="theme"][data-value="navy"]')).toHaveAttribute('aria-pressed', 'true');

    // 전체 설정에서 바꾸면 헤더 패널을 다시 열 때 그 값이 눌려 있다
    await page.locator('.set-card [data-setting="theme"][data-value="light"]').click();
    await page.locator('#header-settings-btn').click();
    await expect(page.locator('#header-drop [data-header-theme="light"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('테마: 고르면 뼈대 색이 바뀌고, 새로 열어도 남아 있으며, 문서 본문도 테마를 따른다', async ({ page }) => {
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

    // 문서 본문도 테마의 글자색 · 종이색(표면)을 따른다
    await page.evaluate(() => { window.location.hash = '#/engineering/language/C/pointer.html'; });
    await expect(page.locator('#header-title')).not.toHaveText('전체 설정');
    const article = page.locator('#app-main > article');
    expect(await article.evaluate(el => getComputedStyle(el).color)).toBe('rgb(230, 237, 247)');
    expect(await article.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(22, 38, 61)');

    // 밝게로 돌아오면 본문은 예전 그대로(흰 종이 · 짙은 회색 글자)
    await page.evaluate(() => window.SiteModules.Settings.set('theme', 'light'));
    expect(await article.evaluate(el => getComputedStyle(el).color)).toBe('rgb(68, 68, 68)');
    expect(await article.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)');
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
    // 홈의 탭은 새소식 · 프로젝트 둘이다
    await expect(page).toHaveURL(/#\/promo\.html$/);
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

test.describe('팔레트 색', () => {
  test('전체 설정의 「팔레트 색」 줄: 5칸 미리보기와 기본값, 저장한 팔레트는 UniPalette 를 불러오지 않고 적용된다', async ({ page }) => {
    const saved = [
      ['#102030', '#405060', '#A0B0C0'], ['#112233', '#445566', '#AABBCC'], ['#123456', '#456789', '#ABCDEF'],
      ['#203040', '#506070', '#B0C0D0'], ['#213243', '#546576', '#BACBDC']
    ];
    await page.addInitScript(p => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      // 예전 「슬라이드 색」 키에 있던 값은 새 키로 옮겨 쓴다
      localStorage.setItem('iseohyun_slides_palette_v1', JSON.stringify(p));
    }, saved);
    await page.goto('/index.html#/settings.html');
    const row = page.locator('.set-card [data-palette-row]');
    await expect(row).toBeVisible();
    await expect(row.locator('.pal-chip')).toHaveCount(5);
    await expect(row.locator('[data-pal="reset"]')).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--sp1-d'))).toBe('#102030');
    expect(await page.evaluate(() => typeof window.UniPalette)).toBe('undefined');
    expect(await page.evaluate(() => localStorage.getItem('iseohyun_palette_v1'))).not.toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('iseohyun_slides_palette_v1'))).toBeNull();

    // 기본값: 저장값을 지우고 CSS 기본 5×3 으로
    await row.locator('[data-pal="reset"]').click();
    await expect(row.locator('[data-pal="reset"]')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--sp1-d'))).toBe('');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--sp1-d').trim().toUpperCase())).toBe('#5B1F0B');
  });

  test('테마에는 UniPalette 가 없고, 예전에 저장한 「UniPalette」 테마는 기본(시스템)으로 돌아간다', async ({ page }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('iseohyun_settings_v1', JSON.stringify({ theme: 'custom', fontScale: '1' }));
    });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/index.html#/settings.html');
    await expect(page.locator('.set-card')).toBeVisible();
    await expect(page.locator('[data-setting="theme"][data-value="custom"]')).toHaveCount(0);
    await expect(page.locator('[data-setting="theme"][data-value="system"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).not.toHaveAttribute('data-skin', /.+/);
  });

  test('어두운 테마에서는 팔레트의 면과 글자 역할이 바뀐다', async ({ page }) => {
    await page.goto('/index.html#/settings.html');
    await page.locator('.pill-btn[data-setting="theme"][data-value="dark"]').click();
    const roles = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return { fill: cs.getPropertyValue('--sp1-fill').trim(), d: cs.getPropertyValue('--sp1-d').trim() };
    });
    expect(roles.fill.toUpperCase()).toBe(roles.d.toUpperCase());
  });
});

test.describe('하이라이트 · 인터페이스 색', () => {
  test('다른 테마에서도 후보색으로 강제하고, 새로 열어도 남으며, 자동으로 되돌린다', async ({ page }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('iseohyun_settings_v1', JSON.stringify({ theme: 'light', fontScale: '1' }));
    });
    await page.goto('/index.html#/settings.html');
    await expect(page.locator('.set-card')).toBeVisible();

    const accentRow = page.locator('[data-accent-row="accent"]');
    const uiRow = page.locator('[data-accent-row="ui"]');
    await expect(accentRow.locator('.color-swatch')).toHaveCount(8);
    await expect(uiRow.locator('.color-swatch')).toHaveCount(8);
    const rootStyle = name => page.evaluate(n => document.documentElement.style.getPropertyValue(n), name);
    expect(await rootStyle('--active')).toBe('');

    // 하이라이트 = 파랑: 선택 면이 옅은 파랑으로. 비활성 탭은 그대로 테마의 음영
    const idleTabBg = () => page.evaluate(() => {
      const tab = document.querySelector('.app-tab:not([aria-selected="true"])');
      return tab ? getComputedStyle(tab).backgroundColor : null;
    });
    const tabBefore = await idleTabBg();
    await accentRow.locator('[data-value="#1E88E5"]').click();
    await expect(accentRow.locator('[data-value="#1E88E5"]')).toHaveAttribute('aria-pressed', 'true');
    const face = await rootStyle('--active');
    expect(face).toMatch(/^#[0-9A-F]{6}$/);
    if (tabBefore) {
      expect(await idleTabBg()).toBe(tabBefore);
    }

    // 인터페이스 = 주황: 켜진 메뉴 글자가 선택 면 위에서 4.5:1 이상
    await uiRow.locator('[data-value="#FB8C00"]').click();
    const text = await rootStyle('--sidebar-active-color');
    expect(text).toMatch(/^#[0-9A-F]{6}$/);
    const ratio = await page.evaluate(([a, b]) => window.SiteModules.ColorMath.contrast(a, b), [text, face]);
    expect(ratio).toBeGreaterThanOrEqual(4.5);

    // 새로 열어도 남는다 (화면을 그리기 전에 먼저 적용)
    await page.reload();
    await expect(page.locator('.set-card')).toBeVisible();
    expect(await rootStyle('--active')).toBe(face);
    expect(await rootStyle('--sidebar-active-color')).toBe(text);

    // 어둡게로 바꾸면 같은 후보가 어두운 면으로 다시 계산된다
    await page.locator('[data-setting="theme"][data-value="dark"]').click();
    const darkFace = await rootStyle('--active');
    expect(darkFace).not.toBe(face);
    await expect(page.locator('[data-accent-row="accent"] [data-value="#1E88E5"]')).toHaveAttribute('aria-pressed', 'true');

    // 자동으로 되돌리면 테마의 값으로
    await page.locator('[data-accent-row="accent"] [data-value="auto"]').click();
    await page.locator('[data-accent-row="ui"] [data-value="auto"]').click();
    expect(await rootStyle('--active')).toBe('');
    expect(await rootStyle('--sidebar-active-color')).toBe('');
    expect(await page.evaluate(() => localStorage.getItem('iseohyun_accent_tokens_v1'))).toBeNull();
  });
});
