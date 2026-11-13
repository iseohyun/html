const { test, expect } = require('@playwright/test');

test.describe('홈 변경 이력 달력', () => {
  test('모바일: 칸에는 점만 표시되고, 점을 누르면 주 아래로 이벤트 1건이 펼쳐진다', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/index.html');

    const table = page.locator('.update-calendar-table');
    await expect(table).toBeVisible();

    // 카드 대신 점이 보인다
    const dots = table.locator('.cal-dot');
    await expect(dots.first()).toBeVisible();
    await expect(table.locator('.cal-event-card').first()).toBeHidden();

    // 글자가 한 글자씩 줄바꿈되던 문제 방지: 한 주의 높이가 과도하게 늘어나지 않는다
    const tallestWeek = await table.locator('tbody tr').evaluateAll(
      rows => Math.max(...rows.map(row => row.getBoundingClientRect().height))
    );
    expect(tallestWeek).toBeLessThan(120);

    // 첫 번째 점: 패널이 펼쳐지고 내용이 보인다
    const detailRows = page.locator('tr.cal-day-detail-row');
    await dots.nth(0).click();
    await expect(detailRows).toHaveCount(1);
    await expect(page.locator('.cal-day-detail-title')).toBeVisible();
    await expect(dots.nth(0)).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(async () => (await detailRows.first().boundingBox()).height).toBeGreaterThan(60);

    // 다른 점: 이전 패널은 닫히고 한 번에 1개만 열려 있다
    await dots.nth(1).click();
    await expect(detailRows).toHaveCount(1);
    await expect(dots.nth(0)).toHaveAttribute('aria-expanded', 'false');
    await expect(dots.nth(1)).toHaveAttribute('aria-expanded', 'true');

    // 같은 점을 다시 누르면 닫힌다
    await dots.nth(1).click();
    await expect(detailRows).toHaveCount(0);

    // '자세히 보기'는 기존 상세 팝업을 연다
    await dots.nth(0).click();
    await page.locator('.cal-day-detail-more').click();
    await expect(page.locator('.cal-modal-overlay.active')).toBeVisible();
  });

  test('데스크탑: 기존 카드가 그대로 보이고 점은 숨겨진다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/index.html');

    const table = page.locator('.update-calendar-table');
    await expect(table.locator('.cal-event-card').first()).toBeVisible();
    await expect(table.locator('.cal-dot').first()).toBeHidden();
  });
});
