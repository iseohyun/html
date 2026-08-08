const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });

  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://127.0.0.1/index.html', { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(300);

  // 1. 헤더 오른쪽 아이콘이 '목차(toc)' 아이콘인지 검증
  const headerRightIcon = await mobilePage.evaluate(() => {
    const iconContainer = document.getElementById('header-toc-toggle');
    const iconSpan = iconContainer ? iconContainer.querySelector('.material-symbols-outlined') : null;
    return iconSpan ? iconSpan.getAttribute('data-icon') : null;
  });

  // 2. 모바일 버전 툴팁 숨김 검증
  const isMobileTooltipHidden = await mobilePage.evaluate(() => {
    const navItem = document.querySelector('.nav-item[data-tooltip]');
    if (!navItem) return true;
    const computed = window.getComputedStyle(navItem, '::before');
    return computed.display === 'none' || computed.visibility === 'hidden' || computed.content === 'none';
  });

  // 3. 헤더 오른쪽 목차 아이콘 클릭 시 '항상 목차 탭(tab-toc)으로 등장하여 열림' 검증
  await mobilePage.click('#header-toc-toggle');
  await mobilePage.waitForTimeout(300);

  const isTocTabOpened = await mobilePage.evaluate(() => {
    const container = document.getElementById('sidebar-container');
    const tocPane = document.getElementById('tab-toc');
    return container && container.classList.contains('active') && tocPane && tocPane.classList.contains('active');
  });

  console.log('[당장 구현할 사항.md 새로 추가된 주의사항 2종 100% 검증 결과 🔍]:', {
    newCaution1_isMobileTooltipHidden: isMobileTooltipHidden,
    newCaution2_headerRightIconIsToc: headerRightIcon === 'toc',
    newCaution2_isNavOpenedToTocTabOnIconClick: isTocTabOpened,
    isAllNewCautionRulesPassed: isMobileTooltipHidden && (headerRightIcon === 'toc') && isTocTabOpened
  });

  await browser.close();
})();
