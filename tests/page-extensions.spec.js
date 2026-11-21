const { test, expect } = require('@playwright/test');

const DOC_HASH = '#/column/swimming/freestyle.html';
const OTHER_DOC_HASH = '#/column/swimming/swimming.html';
const BUILT_IN_RAIL_IDS = ['nav-home', 'nav-sitemap', 'nav-search', 'nav-kakao-channel', 'nav-info'];

async function openDoc(page, hash = DOC_HASH) {
  await page.goto('/index.html' + hash);
  await expect(page.locator('article h1').first()).toBeVisible();
}

async function goToHash(page, hash) {
  await page.evaluate(nextHash => { window.location.hash = nextHash; }, hash);
}

// 문서 스크립트가 하듯이 레일 항목을 더한다. 열림/닫힘 횟수는 window.__rail 에 적는다
async function addDemoRailItem(page) {
  await page.evaluate(() => {
    window.__rail = { opens: 0, closes: 0, renders: 0 };
    window.__removeDemoRailItem = window.SiteModules.Navigation.addRailItem({
      id: 'demo',
      icon: 'play',
      label: '데모 도구',
      renderPanel(container) {
        window.__rail.renders++;
        const note = document.createElement('p');
        note.id = 'demo-panel-note';
        note.textContent = '데모 패널 내용';
        container.appendChild(note);
      },
      onOpen() { window.__rail.opens++; },
      onClose() { window.__rail.closes++; }
    });
  });
}

test.describe('레일 항목 더하기 (Navigation.addRailItem)', () => {
  test('기본 항목은 그대로 두고 항목과 패널을 더하며, 다른 문서로 가면 사라진다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openDoc(page);
    await addDemoRailItem(page);

    const item = page.locator('#nav-page-demo');
    await expect(item).toBeVisible();
    await expect(item).toHaveAttribute('data-tooltip', '데모 도구');
    for (const id of BUILT_IN_RAIL_IDS) await expect(page.locator(`#sidebar-nav #${id}`)).toBeVisible();
    expect(await page.evaluate(() => window.__rail)).toEqual({ opens: 0, closes: 0, renders: 1 });

    // 누르면 패널이 열리고 제목이 바뀐다
    await item.click();
    await expect(page.locator('#sidebar-panel')).not.toHaveClass(/collapsed/);
    await expect(page.locator('#panel-title')).toHaveText('데모 도구');
    await expect(page.locator('#demo-panel-note')).toBeVisible();
    await expect(item).toHaveClass(/active/);
    expect(await page.evaluate(() => window.__rail.opens)).toBe(1);

    // 기본 탭으로 바꾸면 내 패널은 가려지고, 돌아오면 다시 보인다 (다시 그리지 않는다)
    await page.locator('#nav-sitemap').click();
    await expect(page.locator('#sitemap-tree')).toBeVisible();
    await expect(page.locator('#demo-panel-note')).toBeHidden();
    await expect(item).not.toHaveClass(/active/);
    expect(await page.evaluate(() => window.__rail.closes)).toBe(1);

    await item.click();
    await expect(page.locator('#demo-panel-note')).toBeVisible();
    await expect(page.locator('#tab-sitemap')).not.toHaveClass(/active/);
    // 열린 항목을 또 누르면 패널이 접힌다
    await item.click();
    await expect(page.locator('#sidebar-panel')).toHaveClass(/collapsed/);
    expect(await page.evaluate(() => window.__rail)).toEqual({ opens: 2, closes: 2, renders: 1 });

    // 패널을 연 채 다른 문서로 옮기면: 항목과 패널은 사라지고, 열려 있던 패널은 사이트맵으로 돌아간다
    await item.click();
    await goToHash(page, OTHER_DOC_HASH);
    await expect(page.locator('#header-title')).toHaveText('수영 이론');
    await expect(page.locator('#nav-page-demo')).toHaveCount(0);
    await expect(page.locator('#tab-page-demo')).toHaveCount(0);
    for (const id of BUILT_IN_RAIL_IDS) await expect(page.locator(`#sidebar-nav #${id}`)).toBeVisible();
    await expect(page.locator('#panel-title')).toHaveText('사이트맵');
    await expect(page.locator('#sitemap-tree')).toBeVisible();
    expect(await page.evaluate(() => window.__rail)).toEqual({ opens: 3, closes: 3, renders: 1 });
  });

  test('돌려받은 함수로 직접 지울 수 있고, 단축키 배지와 기본 탭 단축키는 그대로다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openDoc(page);
    await addDemoRailItem(page);

    // Alt 를 누르는 동안 기본 항목에만 배지가 붙는다
    await page.keyboard.down('Alt');
    await expect(page.locator('#nav-sitemap')).toHaveAttribute('data-key', '1');
    await expect(page.locator('#nav-page-demo')).not.toHaveAttribute('data-key', /.*/);
    await page.keyboard.up('Alt');

    await page.locator('#nav-page-demo').click();
    await expect(page.locator('#demo-panel-note')).toBeVisible();
    await page.keyboard.press('1');
    await expect(page.locator('#tab-sitemap')).toHaveClass(/active/);
    await expect(page.locator('#demo-panel-note')).toBeHidden();

    await page.evaluate(() => window.__removeDemoRailItem());
    await expect(page.locator('#nav-page-demo')).toHaveCount(0);
    await expect(page.locator('#tab-page-demo')).toHaveCount(0);
    await expect(page.locator('#tab-sitemap')).toHaveClass(/active/);
    // 두 번 불러도 탈이 없다
    await page.evaluate(() => window.__removeDemoRailItem());
    for (const id of BUILT_IN_RAIL_IDS) await expect(page.locator(`#sidebar-nav #${id}`)).toBeVisible();
  });

  test('좁은 화면의 서랍에서도 항목이 보이고 패널이 열린다', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openDoc(page);
    await addDemoRailItem(page);

    await page.locator('#header-menu-btn').click();
    await expect(page.locator('#sidebar-container')).toHaveClass(/active/);
    await expect(page.locator('#nav-page-demo')).toBeVisible();
    await expect(page.locator('#nav-sitemap')).toBeVisible();

    await page.locator('#nav-page-demo').click();
    await expect(page.locator('#panel-title')).toHaveText('데모 도구');
    await expect(page.locator('#demo-panel-note')).toBeVisible();
    expect(await page.evaluate(() => window.__rail.opens)).toBe(1);

    // 덮개를 눌러 서랍을 닫으면 패널도 가려진 것으로 알린다
    await page.locator('#sidebar-overlay').click({ position: { x: 360, y: 400 } });
    await expect(page.locator('#sidebar-container')).not.toHaveClass(/active/);
    expect(await page.evaluate(() => window.__rail.closes)).toBe(1);

    // 홈으로 가도 사라진다
    await goToHash(page, '#/');
    await expect(page.locator('#site-history')).toBeAttached();
    await expect(page.locator('#nav-page-demo')).toHaveCount(0);
  });
});

test.describe('헤더 동작 단추 (Header.setActions / updateAction)', () => {
  test('필터 · 공유 · 설정 앞에 놓이고, 모양을 바꿀 수 있고, 다른 문서로 가면 사라진다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openDoc(page);

    await page.evaluate(() => {
      const Header = window.SiteModules.Header;
      window.__clicks = 0;
      let isPlaying = false;
      Header.setActions([
        {
          id: 'play', icon: 'play', label: '재생', pressed: false,
          onClick() {
            window.__clicks++;
            isPlaying = !isPlaying;
            Header.updateAction('play', { icon: isPlaying ? 'pause' : 'play', label: isPlaying ? '일시 정지' : '재생', pressed: isPlaying });
          }
        },
        { id: 'info', icon: 'info', label: '안내' }
      ]);
    });

    const playBtn = page.locator('#header-action-play');
    await expect(playBtn).toBeVisible();
    await expect(playBtn).toHaveClass(/icon-btn/);
    await expect(playBtn).toHaveAttribute('aria-label', '재생');
    await expect(playBtn).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#header-action-info')).not.toHaveAttribute('aria-pressed', /.*/);
    // 오른쪽 묶음의 순서: 동작 단추들 → 필터 → 공유 → 설정
    const order = await page.locator('.app-header-right').evaluate(group =>
      Array.from(group.querySelectorAll('button')).map(button => button.id));
    expect(order).toEqual(['header-action-play', 'header-action-info', 'header-filter-btn', 'header-share-btn', 'header-settings-btn', 'header-toc-btn']);
    await expect(page.locator('#header-share-btn')).toBeVisible();
    await expect(page.locator('#header-settings-btn')).toBeVisible();

    await playBtn.click();
    await expect(playBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(playBtn).toHaveAttribute('aria-label', '일시 정지');
    await expect(playBtn.locator('use')).toHaveAttribute('href', '#i-pause');
    await playBtn.click();
    await expect(playBtn).toHaveAttribute('aria-pressed', 'false');
    await expect(playBtn.locator('use')).toHaveAttribute('href', '#i-play');
    expect(await page.evaluate(() => window.__clicks)).toBe(2);
    expect(await page.evaluate(() => window.SiteModules.Header.updateAction('없는-단추', { label: 'x' }))).toBe(false);

    // 같은 문서 안에서 앵커만 옮길 때는 남아 있다
    await page.locator('#header-toc-btn').click();
    await page.locator('#toc-tree a').last().click();
    await expect(page).toHaveURL(/freestyle\.html#/);
    await expect(playBtn).toBeVisible();

    await goToHash(page, OTHER_DOC_HASH);
    await expect(page.locator('#header-title')).toHaveText('수영 이론');
    await expect(page.locator('.header-action')).toHaveCount(0);
    await expect(page.locator('#header-share-btn')).toBeVisible();
  });

  test('홈으로 가도 사라지고, 문서가 등록한 아이콘도 쓸 수 있다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openDoc(page);

    const registered = await page.evaluate(() => {
      const Icons = window.SiteModules.Icons;
      const first = Icons.register('test-square', '<rect x="4" y="4" width="16" height="16" rx="2"/>');
      const second = Icons.register('test-square', '<rect x="1" y="1" width="2" height="2"/>');
      window.SiteModules.Header.setActions([{ id: 'square', icon: 'test-square', label: '네모' }]);
      const symbol = document.getElementById('i-test-square');
      return { first, second, isSvgSymbol: symbol instanceof SVGSymbolElement, rects: symbol.querySelectorAll('rect').length };
    });
    expect(registered).toEqual({ first: true, second: false, isSvgSymbol: true, rects: 1 });
    await expect(page.locator('#header-action-square')).toBeVisible();
    // 등록한 그림이 실제로 그려진다 (크기가 0 이 아니다)
    expect(await page.locator('#header-action-square svg').evaluate(svg => svg.getBoundingClientRect().width)).toBeGreaterThan(0);

    await goToHash(page, '#/');
    await expect(page.locator('.update-calendar-table')).toBeVisible();
    await expect(page.locator('.header-action')).toHaveCount(0);
    await expect(page.locator('#header-filter-btn')).toBeVisible();
  });
});

test.describe('화면을 떠날 때 (Navigation.onLeave · site:page-leave)', () => {
  test('다른 문서나 홈으로 옮길 때 한 번만 부르고, 같은 문서 안의 앵커 이동에는 부르지 않는다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openDoc(page);

    await page.evaluate(() => {
      window.__leave = { hook: 0, cleanup: 0, events: [] };
      window.SiteModules.Navigation.onLeave(() => { window.__leave.hook++; });
      window.SiteModules.registerPageCleanup(() => { window.__leave.cleanup++; });
      // 떠날 때 한 번 받고 스스로 떼는 쓰기 방식
      document.addEventListener('site:page-leave', event => { window.__leave.events.push(event.detail.path); }, { once: true });
    });

    await page.locator('#header-toc-btn').click();
    await page.locator('#toc-tree a').last().click();
    await expect(page).toHaveURL(/freestyle\.html#/);
    expect(await page.evaluate(() => window.__leave)).toEqual({ hook: 0, cleanup: 0, events: [] });

    await goToHash(page, OTHER_DOC_HASH);
    await expect(page.locator('#header-title')).toHaveText('수영 이론');
    expect(await page.evaluate(() => window.__leave)).toEqual({ hook: 1, cleanup: 1, events: ['/column/swimming/freestyle.html'] });

    // 한 번 부른 정리 함수는 비워져서 다음 이동에는 다시 부르지 않는다
    await page.evaluate(() => { window.SiteModules.Navigation.onLeave(() => { window.__leave.hook += 10; }); });
    await goToHash(page, '#/');
    await expect(page.locator('.update-calendar-table')).toBeVisible();
    expect(await page.evaluate(() => window.__leave.hook)).toBe(11);
    await goToHash(page, DOC_HASH);
    await expect(page.locator('article h1').first()).toBeVisible();
    expect(await page.evaluate(() => window.__leave)).toEqual({ hook: 11, cleanup: 1, events: ['/column/swimming/freestyle.html'] });
  });
});

test.describe('화면별 설정 패널 (Header.setPanels)', () => {
  test('아무 DOM 이나 넣을 수 있고 여닫아도 값이 남으며, 다른 문서로 가면 비워진다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openDoc(page);

    await page.evaluate(() => {
      const box = document.createElement('div');
      box.className = 'cal-settings-list';
      box.innerHTML = `
        <label class="cal-settings-wrap"><span class="cal-settings-label">속도</span>
          <input type="range" id="demo-rate" class="cal-bg-slider" min="0.5" max="2" step="0.1" value="1">
          <span id="demo-rate-label" class="cal-bg-percent-label">1.0</span></label>
        <label class="cal-settings-wrap"><span class="cal-settings-label">목소리</span>
          <select id="demo-voice"><option value="a">가</option><option value="b">나</option></select></label>
        <label class="cal-settings-wrap"><span class="cal-settings-label">강조색</span>
          <input type="color" id="demo-color" value="#228be6"></label>`;
      box.querySelector('#demo-rate').addEventListener('input', event => {
        box.querySelector('#demo-rate-label').textContent = Number(event.target.value).toFixed(1);
      });
      window.SiteModules.Header.setPanels({ settings: box });
    });

    const settingsBtn = page.locator('#header-settings-btn');
    await settingsBtn.click();
    await expect(page.locator('#header-drop')).toHaveClass(/is-open/);
    await expect(page.locator('#demo-rate')).toBeVisible();
    await expect(page.locator('#demo-color')).toBeVisible();
    await expect(page.locator('.app-drop-note')).toHaveCount(0);
    await expect(page.locator('#header-global-settings-link')).toBeVisible();
    // 필터는 등록하지 않았으므로 숨어 있다
    await expect(page.locator('#header-filter-btn')).toBeHidden();

    await page.locator('#demo-rate').fill('1.5');
    await page.locator('#demo-voice').selectOption('b');
    await expect(page.locator('#demo-rate-label')).toHaveText('1.5');

    await page.keyboard.press('Escape');
    await expect(page.locator('#header-drop')).not.toHaveClass(/is-open/);
    await settingsBtn.click();
    await expect(page.locator('#demo-rate')).toHaveValue('1.5');
    await expect(page.locator('#demo-voice')).toHaveValue('b');
    await page.keyboard.press('Escape');

    await goToHash(page, OTHER_DOC_HASH);
    await expect(page.locator('#header-title')).toHaveText('수영 이론');
    await settingsBtn.click();
    await expect(page.locator('.app-drop-note')).toHaveText('이 화면에만 해당하는 설정은 없습니다.');
    await expect(page.locator('#demo-rate')).toHaveCount(0);
  });
});
