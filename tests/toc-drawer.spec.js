const { test, expect } = require('@playwright/test');

// 오른쪽 목차 사이드바: 헤더의 목차 단추로 켜고 끄며, 고정하면 본문 옆에 붙는다 (modules/core/toc.js)
const DOC_HASH = '#/engineering/language/C/pointer.html';
const STORAGE_KEY = 'iseohyun_toc_drawer_v1';
const TOC_W = 260;

async function openDoc(page, hash = DOC_HASH) {
  await page.goto('/index.html' + hash);
  await expect(page.locator('article h1').first()).toBeVisible();
  await expect(page.locator('#toc-tree a').first()).toBeAttached();
}

async function goToHash(page, hash) {
  await page.evaluate(h => { window.location.hash = h; }, hash);
}

function drawerLeft(page) {
  return page.locator('#toc-drawer').evaluate(el => Math.round(el.getBoundingClientRect().left));
}

function bodyPaddingRight(page) {
  return page.evaluate(() => getComputedStyle(document.body).paddingRight);
}

function savedPrefs(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), STORAGE_KEY);
}

test.describe('오른쪽 목차 사이드바', () => {
  test('넓은 화면: 목차 단추가 토글이고, 기본은 고정이라 본문을 밀어내고 옆에 붙는다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openDoc(page);

    const toggle = page.locator('#header-toc-btn');
    const drawer = page.locator('#toc-drawer');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(drawer).toBeHidden();
    // 왼쪽 레일에는 목차 탭이 없다
    await expect(page.locator('#nav-toc')).toHaveCount(0);

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveClass(/docked/);
    await expect(page.locator('#toc-pin-btn')).toHaveAttribute('aria-pressed', 'true');
    // 오른쪽 끝에서 밀려 나와 본문 옆에 붙는다
    await expect.poll(() => drawerLeft(page)).toBe(1280 - TOC_W);
    await expect.poll(() => bodyPaddingRight(page)).toBe(`${TOC_W}px`);
    await expect.poll(() => page.locator('#app-main').evaluate(el => Math.round(el.getBoundingClientRect().right))).toBe(1280 - TOC_W);
    // 헤더는 그대로 화면 끝까지 간다
    await expect.poll(() => page.locator('#app-header').evaluate(el => Math.round(el.getBoundingClientRect().right))).toBe(1280);

    // 고정되어 있으면 본문을 눌러도 닫히지 않는다
    await page.locator('article').click({ position: { x: 20, y: 20 } });
    await expect(drawer).toHaveClass(/open/);

    // 이전글/다음글 단추가 사이드바 위쪽에 있다
    await expect(page.locator('#toc-doc-details .toc-doc-nav-buttons a')).toHaveCount(2);

    // 다시 누르면 닫히고 본문이 제자리로 돌아온다
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(drawer).toBeHidden();
    await expect.poll(() => bodyPaddingRight(page)).toBe('0px');
  });

  test('고정을 풀면 본문 위에 겹쳐 뜨고, 바깥을 누르거나 Esc 로 닫힌다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openDoc(page);

    await page.locator('#header-toc-btn').click();
    await page.locator('#toc-pin-btn').click();
    const drawer = page.locator('#toc-drawer');
    await expect(page.locator('#toc-pin-btn')).toHaveAttribute('aria-pressed', 'false');
    await expect(drawer).not.toHaveClass(/docked/);
    await expect(drawer).toHaveClass(/open/);
    await expect.poll(() => bodyPaddingRight(page)).toBe('0px');
    await expect.poll(() => drawerLeft(page)).toBe(1280 - TOC_W);

    // 사이드바 안의 목차 항목을 눌러도 닫히지 않는다
    await page.locator('#toc-tree a').last().click();
    await expect(page).toHaveURL(/pointer\.html#/);
    await expect(drawer).toHaveClass(/open/);

    // 바깥(본문)을 누르면 닫힌다
    await page.locator('article').click({ position: { x: 20, y: 20 } });
    await expect(drawer).not.toHaveClass(/open/);
    await expect(page.locator('#header-toc-btn')).toHaveAttribute('aria-pressed', 'false');

    // Esc 로도 닫힌다
    await page.locator('#header-toc-btn').click();
    await expect(drawer).toHaveClass(/open/);
    await page.keyboard.press('Escape');
    await expect(drawer).not.toHaveClass(/open/);
  });

  test('열림과 고정 상태를 기억해 다시 열어도 그대로다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openDoc(page);
    await page.locator('#header-toc-btn').click();
    expect(await savedPrefs(page)).toEqual({ open: true, pinned: true });

    await page.reload();
    await expect(page.locator('article h1').first()).toBeVisible();
    await expect(page.locator('#toc-drawer')).toHaveClass(/open/);
    await expect(page.locator('#toc-drawer')).toHaveClass(/docked/);
    await expect(page.locator('#header-toc-btn')).toHaveAttribute('aria-pressed', 'true');

    // 고정을 풀고 닫은 것도 기억한다
    await page.locator('#toc-pin-btn').click();
    await page.locator('#toc-close-btn').click();
    expect(await savedPrefs(page)).toEqual({ open: false, pinned: false });
    await page.reload();
    await expect(page.locator('article h1').first()).toBeVisible();
    await expect(page.locator('#header-toc-btn')).toBeVisible();
    await expect(page.locator('#toc-drawer')).not.toHaveClass(/open/);
    await page.locator('#header-toc-btn').click();
    await expect(page.locator('#toc-drawer')).not.toHaveClass(/docked/);
  });

  test('목차가 없는 화면(홈, 설정)에서는 단추와 사이드바가 숨고, 문서로 돌아오면 다시 열린다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openDoc(page);
    await page.locator('#header-toc-btn').click();
    await expect(page.locator('#toc-drawer')).toHaveClass(/docked/);

    await goToHash(page, '#/');
    await expect(page.locator('.update-calendar-table')).toBeVisible();
    await expect(page.locator('#header-toc-btn')).toBeHidden();
    await expect(page.locator('#toc-drawer')).toBeHidden();
    await expect.poll(() => bodyPaddingRight(page)).toBe('0px');

    await goToHash(page, '#/settings.html');
    await expect(page.locator('#header-title')).not.toHaveText('iseohyun.com');
    await expect(page.locator('#header-toc-btn')).toBeHidden();

    await goToHash(page, DOC_HASH);
    await expect(page.locator('#header-toc-btn')).toBeVisible();
    await expect(page.locator('#toc-drawer')).toHaveClass(/open/);
    await expect(page.locator('#toc-tree a').first()).toBeVisible();
  });

  test('단축키 2 가 목차를 여닫고, Alt 를 누르면 목차 단추에 배지가 붙는다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openDoc(page);

    await page.keyboard.down('Alt');
    await expect(page.locator('#header-toc-btn')).toHaveAttribute('data-key', '2');
    await page.keyboard.up('Alt');

    await page.keyboard.press('2');
    await expect(page.locator('#toc-drawer')).toHaveClass(/open/);
    await page.keyboard.press('2');
    await expect(page.locator('#toc-drawer')).not.toHaveClass(/open/);
  });

  test('좁은 화면: 늘 겹쳐 뜨는 서랍이고, 목차 항목이나 덮개를 누르면 닫히며 열림을 기억하지 않는다', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openDoc(page);

    const drawer = page.locator('#toc-drawer');
    const overlay = page.locator('#toc-overlay');
    await page.locator('#header-toc-btn').click();
    await expect(drawer).toHaveClass(/open/);
    await expect(drawer).not.toHaveClass(/docked/);
    await expect(overlay).toHaveClass(/active/);
    // 고정 단추는 감추고, 본문은 밀지 않는다
    await expect(page.locator('#toc-pin-btn')).toBeHidden();
    await expect.poll(() => bodyPaddingRight(page)).toBe('0px');
    await expect.poll(() => drawerLeft(page)).toBe(375 - TOC_W);
    expect(await savedPrefs(page)).toBeNull();

    // 목차 항목을 누르면 그 제목으로 가고 서랍이 닫힌다
    await page.locator('#toc-tree a').last().click();
    await expect(page).toHaveURL(/pointer\.html#/);
    await expect(drawer).not.toHaveClass(/open/);
    await expect(overlay).not.toHaveClass(/active/);

    // 덮개를 눌러도 닫힌다
    await page.locator('#header-toc-btn').click();
    await expect(overlay).toHaveClass(/active/);
    await overlay.click({ position: { x: 40, y: 400 } });
    await expect(drawer).not.toHaveClass(/open/);
  });

  test('넓은 화면에서 열어 둔 채 좁아지면 닫히고, 다시 넓어지면 고정된 채 돌아온다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openDoc(page);
    await page.locator('#header-toc-btn').click();
    await expect(page.locator('#toc-drawer')).toHaveClass(/docked/);

    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator('#toc-drawer')).not.toHaveClass(/open/);
    await expect.poll(() => bodyPaddingRight(page)).toBe('0px');

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('#toc-drawer')).toHaveClass(/docked/);
    await expect.poll(() => bodyPaddingRight(page)).toBe(`${TOC_W}px`);
  });
});
