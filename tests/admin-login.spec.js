const { test, expect } = require('@playwright/test');
const crypto = require('crypto');

// 테스트용 관리자 주소. 실제 관리자 주소는 테스트에 적지 않는다: 설정 파일의 해시를 이 주소의 해시로 바꿔 끼운다.
const TEST_ADMIN_EMAIL = 'admin@example.com';
const TEST_ADMIN_HASH = crypto.createHash('sha256').update(TEST_ADMIN_EMAIL).digest('hex');
const DEV_PAGE_TITLE = '진법';
const DEV_PAGE_URL = '/basicStudy/engineering/binary/binary.html';

// 구글 로그인 창 대신 쓰는 가짜 Firebase: window.__fakeGoogleUser 를 로그인한 사용자로 돌려준다
const FAKE_FIREBASE_APP = `
  (function () {
    var listeners = [];
    var current = null;
    var notify = function () { listeners.forEach(function (cb) { cb(current); }); };
    var authObject = {
      onAuthStateChanged: function (cb) { listeners.push(cb); setTimeout(function () { cb(current); }, 0); },
      signInWithPopup: function () { current = window.__fakeGoogleUser || null; notify(); return Promise.resolve({ user: current }); },
      signOut: function () { current = null; notify(); return Promise.resolve(); }
    };
    var auth = function () { return authObject; };
    auth.GoogleAuthProvider = function () { this.addScope = function () {}; };
    window.firebase = { apps: [], initializeApp: function (config) { this.apps.push(config); }, auth: auth };
  })();
`;

async function mockSite(page, { user }) {
  // 사이트맵: 문서 하나만 개발중으로 표시한다.
  // 실제 사이트맵에 이미 개발중인 항목이 있어도 글 수가 흔들리지 않게, 원래의 개발중 표시는 먼저 지운다.
  await page.route('**/hierarchy.json', async route => {
    const response = await route.fetch();
    const tree = await response.json();
    let marked = 0;
    (function walk(list) {
      list.forEach(item => {
        delete item.상태;
        if (item.주제 === DEV_PAGE_TITLE) { item.상태 = '개발중'; marked++; }
        if (item.목록) walk(item.목록);
      });
    })(tree);
    expect(marked).toBe(1);
    await route.fulfill({ response, json: tree });
  });
  // 설정: 관리자 해시를 테스트용 주소의 것으로 바꾼다
  await page.route('**/modules/core/site-config.js*', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace(/emailHashes: Object\.freeze\(\[[^\]]*\]\)/, `emailHashes: Object.freeze(["${TEST_ADMIN_HASH}"])`);
    expect(body).toContain(TEST_ADMIN_HASH);
    await route.fulfill({ response, body });
  });
  await page.route('https://www.gstatic.com/firebasejs/**/firebase-app-compat.js', route =>
    route.fulfill({ contentType: 'application/javascript', body: FAKE_FIREBASE_APP }));
  await page.route('https://www.gstatic.com/firebasejs/**/firebase-auth-compat.js', route =>
    route.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.addInitScript(fakeUser => { window.__fakeGoogleUser = fakeUser; }, user);
}

function folder(page, name) {
  return page.locator('#sitemap-tree li.folder').filter({
    has: page.locator(':scope > .tree-row > .tree-label', { hasText: new RegExp(`^${name}$`) })
  });
}

async function openSitemap(page) {
  const tree = page.locator('#sitemap-tree');
  if (!(await tree.isVisible())) await page.locator('#nav-sitemap').click();
  await expect(tree).toBeVisible();
}

async function login(page) {
  await page.locator('#nav-kakao-channel').click();
  await expect(page.locator('#contact-login-btn')).toHaveText('로그인 (Google)');
  await page.locator('#contact-login-btn').click();
  await expect(page.locator('#contact-login-btn')).toHaveText('로그아웃');
}

test.describe('로그인과 개발 중인 문서', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test('로그인하지 않은 방문자: 개발중 문서는 트리 · 글 수 · 자동 개론에 없고, 주소로 들어와도 안내만 나온다. Firebase 도 불러오지 않는다', async ({ page }) => {
    const firebaseRequests = [];
    page.on('request', request => { if (request.url().includes('firebasejs')) firebaseRequests.push(request.url()); });
    await mockSite(page, { user: null });

    await page.goto('/index.html#/sitemap/공학/표현 원리');
    await expect(page.locator('article .auto-overview-card').first()).toBeVisible();
    await expect(page.locator('article .auto-overview-pages a', { hasText: DEV_PAGE_TITLE })).toHaveCount(0);

    await openSitemap(page);
    await expect(page.locator(`#sitemap-tree a[href="${DEV_PAGE_URL}"]`)).toHaveCount(0);
    await expect(page.locator('#sitemap-tree .tree-dev-count')).toHaveCount(0);
    // 글 수에서도 빠진다: 표현 원리는 글자 3 + 베지어 2 = 5
    await expect(folder(page, '표현 원리').locator(':scope > .tree-row > .tree-count')).toHaveText('(5)');

    await page.goto(`/index.html#${DEV_PAGE_URL}`);
    await expect(page.locator('.error-state-title')).toHaveText('개발 중인 문서입니다');
    await expect(page.locator('article h1')).toHaveCount(0);
    expect(firebaseRequests).toEqual([]);
  });

  test('관리자로 로그인하면 개발중 문서가 보이고, 묶음마다 빨간 +n 이 붙는다. 로그아웃하면 다시 사라진다', async ({ page }) => {
    await mockSite(page, { user: { email: TEST_ADMIN_EMAIL, emailVerified: true } });
    await page.goto(`/index.html#${DEV_PAGE_URL}`);
    await expect(page.locator('.error-state-title')).toHaveText('개발 중인 문서입니다');

    await login(page);
    await expect(page.locator('#contact-auth-status')).toContainText('관리자로 로그인했습니다');

    // 막혀 있던 문서가 바로 열린다
    await expect(page.locator('.error-state')).toHaveCount(0);
    await expect(page.locator('#header-title')).toHaveText(DEV_PAGE_TITLE);

    await page.locator('#contact-close-btn').click();
    await openSitemap(page);
    const devLink = page.locator(`#sitemap-tree li.is-dev > a[href="${DEV_PAGE_URL}"]`);
    await expect(devLink).toBeVisible();
    await expect(devLink.locator('xpath=..')).toHaveClass(/this-doc/);

    // 공개 글 수는 그대로, 개발중 글 수는 빨간 +1 로: 그 문서를 품은 묶음마다 붙는다
    const group = folder(page, '표현 원리');
    await expect(group.locator(':scope > .tree-row > .tree-count')).toHaveText('(5)');
    await expect(group.locator(':scope > .tree-row > .tree-dev-count')).toHaveText('+1');
    await expect(folder(page, '공학').locator(':scope > .tree-row > .tree-dev-count')).toHaveText('+1');
    await expect(folder(page, '수학').locator(':scope > .tree-row > .tree-dev-count')).toHaveCount(0);
    const color = await group.locator(':scope > .tree-row > .tree-dev-count').evaluate(el => getComputedStyle(el).color);
    expect(color).toBe('rgb(211, 47, 47)');

    // 로그아웃: 보고 있던 개발중 문서가 가려지고 트리에서도 사라진다
    await page.locator('#nav-kakao-channel').click();
    await page.locator('#contact-login-btn').click();
    await expect(page.locator('#contact-login-btn')).toHaveText('로그인 (Google)');
    await expect(page.locator('.error-state-title')).toHaveText('개발 중인 문서입니다');
    await expect(page.locator(`#sitemap-tree a[href="${DEV_PAGE_URL}"]`)).toHaveCount(0);
    await expect(page.locator('#sitemap-tree .tree-dev-count')).toHaveCount(0);
  });

  test('관리자로 로그인한 브라우저는 새로 고쳐도 로그인 상태가 이어진다', async ({ page }) => {
    await mockSite(page, { user: { email: TEST_ADMIN_EMAIL, emailVerified: true } });
    await page.goto('/index.html');
    await login(page);

    // 가짜 Firebase 는 새로 고치면 로그인한 사람을 잊으므로, 되살아난 것처럼 다시 로그인된 상태로 시작하게 한다
    await page.addInitScript(() => {
      const timer = setInterval(() => {
        if (window.firebase && window.firebase.auth) { clearInterval(timer); window.firebase.auth().signInWithPopup(); }
      }, 20);
    });
    await page.reload();
    await openSitemap(page);
    await expect(folder(page, '공학').locator(':scope > .tree-row > .tree-dev-count')).toHaveText('+1');
  });

  test('관리자가 아닌 계정, 메일이 확인되지 않은 계정으로는 개발중 문서가 보이지 않는다', async ({ page }) => {
    await mockSite(page, { user: { email: 'someone@example.com', emailVerified: true } });
    await page.goto('/index.html');
    await login(page);
    await expect(page.locator('#contact-auth-status')).toContainText('관리자 계정은 아닙니다');
    await page.locator('#contact-close-btn').click();
    await openSitemap(page);
    await expect(page.locator('#sitemap-tree .tree-dev-count')).toHaveCount(0);
    await expect(page.locator(`#sitemap-tree a[href="${DEV_PAGE_URL}"]`)).toHaveCount(0);
  });

  test('메일이 확인되지 않은 관리자 주소는 관리자로 보지 않는다', async ({ page }) => {
    await mockSite(page, { user: { email: TEST_ADMIN_EMAIL, emailVerified: false } });
    await page.goto('/index.html');
    await login(page);
    await expect(page.locator('#contact-auth-status')).toContainText('관리자 계정은 아닙니다');
  });
});
