const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://127.0.0.1/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);

  const hasSiteIntro = await page.evaluate(() => {
    return !!document.getElementById('site-intro');
  });

  console.log('[site-intro Removal Test Result 🔍]:', {
    hasSiteIntro,
    isSuccessfullyRemoved: !hasSiteIntro
  });

  await browser.close();
})();
