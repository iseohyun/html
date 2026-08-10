/**
 * scratch/check_header_dom.js
 * Playwright로 모바일 뷰어(width 375px) 상단 헤더 DOM 및 시각적 노출 상태 100% 진단
 */

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }, // 모바일 뷰포트
    isMobile: true
  });
  const page = await context.newPage();

  await page.goto('http://127.0.0.1/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const headerDiagnosis = await page.evaluate(() => {
    const header = document.querySelector('header');
    const app = document.getElementById('app-container');
    const sidebarNav = document.getElementById('sidebar-nav');

    return {
      hasHeader: !!header,
      headerHTML: header ? header.outerHTML : 'null',
      headerStyle: header ? window.getComputedStyle(header).display : 'none',
      hasSidebarNav: !!sidebarNav,
      sidebarNavHTML: sidebarNav ? sidebarNav.outerHTML : 'null',
      bodyHTML: document.body.innerHTML.substring(0, 500)
    };
  });

  console.log('[Header Diagnosis Results 🔍]:', JSON.stringify(headerDiagnosis, null, 2));
  await browser.close();
})();
