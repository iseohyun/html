const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://127.0.0.1/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);

  const fontSizeResult = await page.evaluate(() => {
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const articleEl = document.querySelector('article');

    return {
      htmlFontSize: window.getComputedStyle(htmlEl).fontSize,
      bodyFontSize: window.getComputedStyle(bodyEl).fontSize,
      articleFontSize: articleEl ? window.getComputedStyle(articleEl).fontSize : 'none',
      is80PercentApplied: window.getComputedStyle(htmlEl).fontSize === '12.8px' || window.getComputedStyle(bodyEl).fontSize === '12.8px'
    };
  });

  console.log('[Default Font Size 80% Verification Result 🔍]:', fontSizeResult);
  await browser.close();
})();
