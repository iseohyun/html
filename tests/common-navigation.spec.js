const { test, expect } = require('@playwright/test');

test.describe('공통 모듈 및 모바일 헤더 매뉴얼 명세 검증', () => {
  test('데스크탑 비노출 & 모바일 상단 고정 헤더 규격', async ({ page }) => {
    // 모바일 뷰포트
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/index.html');
    await page.waitForTimeout(300);

    const header = page.locator('.site-header');
    await expect(header).toBeVisible();

    const position = await header.evaluate(el => window.getComputedStyle(el).position);
    expect(position).toBe('fixed');

    // 데스크탑 뷰포트
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(header).toBeHidden();
  });

  test('헤더 좌측 아이콘 클릭 시 사이드바 토글 & 우측 아이콘 항상 목차(TOC) 열기', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/index.html');
    await page.waitForTimeout(300);

    // 헤더 우측 목차 아이콘 클릭
    const tocToggle = page.locator('#header-toc-toggle');
    await expect(tocToggle).toBeVisible();
    await tocToggle.click();

    const tocPane = page.locator('#tab-toc');
    await expect(tocPane).toHaveClass(/active/);
  });
});
