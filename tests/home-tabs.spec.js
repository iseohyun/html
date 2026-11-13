const { test, expect } = require('@playwright/test');

test.describe('헤더 탭과 홈의 리스트 보기', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test('홈 탭: 달력 · 리스트 · 프로젝트를 오간다', async ({ page }) => {
    await page.goto('/index.html');
    const tabs = page.locator('#header-tabs .app-tab');
    await expect(tabs).toHaveText(['달력', '리스트', '프로젝트']);
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.update-calendar-table')).toBeVisible();

    await tabs.nth(1).click();
    await expect(page).toHaveURL(/#\/list$/);
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('table.list-data-table')).toBeVisible();
    await expect(page.locator('.update-calendar-table')).toHaveCount(0);

    await tabs.nth(2).click();
    await expect(page).toHaveURL(/#\/promo\.html$/);
    await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
    // 프로젝트 소개에서는 홈 전용 필터가 사라진다
    await expect(page.locator('#header-filter-btn')).toBeHidden();

    await tabs.nth(0).click();
    await expect(page.locator('.update-calendar-table')).toBeVisible();
  });

  test('리스트: 필터를 따르고, 설정에서 표/카드와 정렬을 바꾸면 기억한다', async ({ page }) => {
    await page.goto('/index.html#/list');
    const rows = page.locator('table.list-data-table tbody tr');
    await expect(rows.first()).toBeVisible();
    const total = await rows.count();
    expect(total).toBeGreaterThan(10);

    // 최신순이 기본: 첫 줄이 마지막 줄보다 늦은 날짜
    const firstDate = await rows.first().locator('.list-date-cell').textContent();
    const lastDate = await rows.last().locator('.list-date-cell').textContent();
    expect(firstDate > lastDate).toBe(true);

    // 필터는 달력과 같은 것을 쓴다
    await page.locator('#header-filter-btn').click();
    await page.locator('#cal-search-input').fill('수영');
    await expect.poll(() => rows.count()).toBeLessThan(total);
    await expect(page.locator('#header-filter-dot')).toBeVisible();
    await page.locator('#cal-search-input').fill('');
    await expect.poll(() => rows.count()).toBe(total);

    // 화면별 설정: 정렬을 오래된순으로, 보기를 카드로
    await page.locator('#header-settings-btn').click();
    await page.locator('.pill-btn', { hasText: '오래된순' }).click();
    const firstDateAsc = await rows.first().locator('.list-date-cell').textContent();
    expect(firstDateAsc).toBe(lastDate);

    await page.locator('.pill-btn', { hasText: '카드' }).click();
    await expect(page.locator('.list-card').first()).toBeVisible();
    await expect(page.locator('table.list-data-table')).toHaveCount(0);

    // 새로 열어도 고른 보기와 정렬이 남아 있다
    await page.reload();
    await expect(page.locator('.list-card').first()).toBeVisible();
    await expect(page.locator('.list-summary-hint')).toContainText('오래된순');

    // 항목을 누르면 상세 팝업이 열린다
    await page.locator('.list-card').first().click();
    await expect(page.locator('.cal-modal-overlay.active')).toBeVisible();
  });

  test('이어지는 문서는 같은 묶음의 문서가 탭으로 나오고, 켜진 탭이 현재 문서다', async ({ page }) => {
    await page.goto('/index.html#/column/swimming/freestyle.html');
    await expect(page.locator('article h1').first()).toBeVisible();

    const tabs = page.locator('#header-tabs .app-tab');
    await expect.poll(() => tabs.count()).toBeGreaterThanOrEqual(2);
    const selected = page.locator('#header-tabs .app-tab[aria-selected="true"]');
    await expect(selected).toHaveCount(1);
    await expect(selected).toHaveText(await page.locator('#header-title').textContent());

    // 다른 탭을 누르면 그 문서로 이동하고 탭 묶음은 그대로다
    const count = await tabs.count();
    const other = page.locator('#header-tabs .app-tab[aria-selected="false"]').first();
    const otherLabel = await other.textContent();
    await other.click();
    await expect(page.locator('#header-title')).toHaveText(otherLabel);
    await expect(tabs).toHaveCount(count);
  });

  test('독립 프로젝트와 묶음이 없는 문서에는 탭이 없다', async ({ page }) => {
    await page.goto('/index.html#/small-project/Bezier/index.html');
    await expect(page.locator('#header-title')).not.toHaveText('iseohyun.com');
    await expect(page.locator('#header-tabs .app-tab')).toHaveCount(0);
  });
});
