const { test, expect } = require('@playwright/test');

test.describe('공통 모듈 및 모바일 삼선 메뉴 명세 검증', () => {
  test('데스크탑 비노출 & 모바일 좌상단 고정 삼선 메뉴 버튼 규격', async ({ page }) => {
    // 모바일 뷰포트
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/index.html');

    const menuBtn = page.locator('#mobile-menu-btn');
    await expect(menuBtn).toBeVisible();

    const position = await menuBtn.evaluate(el => window.getComputedStyle(el).position);
    expect(position).toBe('fixed');

    // 데스크탑 뷰포트
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(menuBtn).toBeHidden();
  });

  test('삼선 메뉴 클릭 시 사이드바 열림 & 목차 탭 전환', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/index.html');

    await page.locator('#mobile-menu-btn').click();
    await expect(page.locator('#sidebar-container')).toHaveClass(/active/);

    await page.locator('#nav-toc').click();
    await expect(page.locator('#tab-toc')).toHaveClass(/active/);
  });

  test('외부 출처 해시 경로는 차단되어 홈으로 복귀', async ({ page }) => {
    await page.goto('/index.html#//example.com/x.html');
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.locator('#site-history')).toBeAttached();
  });
});
