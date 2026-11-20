const { test, expect } = require('@playwright/test');

const WEB3FORMS_URL = 'https://api.web3forms.com/submit';

test.describe('문의 창 (레일의 문의 아이콘)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/index.html');
    await expect(page.locator('#nav-kakao-channel')).toBeVisible();
  });

  test('우하단 버튼과 레일의 홍보·질의응답 아이콘은 없다', async ({ page }) => {
    await expect(page.locator('#kakao-fab-btn')).toHaveCount(0);
    await expect(page.locator('#nav-promo')).toHaveCount(0);
    await expect(page.locator('#nav-help')).toHaveCount(0);
  });

  test('문의 아이콘을 누르면 채널 추가 · 1:1 채팅 · 메일로 문의가 나온다', async ({ page }) => {
    const popover = page.locator('#contact-popover');
    await expect(popover).toBeHidden();

    await page.locator('#nav-kakao-channel').click();
    await expect(popover).toBeVisible();
    await expect(popover.locator('.contact-action')).toHaveText(['카카오톡 1:1 채팅', '메일로 문의', '로그인', '문의하기']);
    await expect(popover.locator('a.contact-action').nth(0)).toHaveAttribute('href', 'http://pf.kakao.com/_ETRrX/chat');
    await expect(popover.locator('a.contact-icon-action')).toHaveAttribute('href', 'http://pf.kakao.com/_ETRrX');

    // 메일 폼은 눌러야 옆의 대화창에 열린다
    await expect(page.locator('#contact-mail-form')).toBeHidden();
    await page.locator('#contact-mail-toggle').click();
    await expect(page.locator('#contact-mail-form')).toBeVisible();

    // Esc 는 대화창을 먼저 닫고, 한 번 더 누르면 문의 창을 닫는다
    await page.keyboard.press('Escape');
    await expect(page.locator('#contact-mail-window')).toBeHidden();
    await expect(popover).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(popover).toBeHidden();
  });

  test('로그인을 누르면 문의 창 오른쪽에 Google · 네이버 · 카카오 목록이 뜬다', async ({ page }) => {
    const popover = page.locator('#contact-popover');
    const panel = page.locator('#contact-login-providers');
    const login = page.locator('#contact-login-btn');

    await page.locator('#nav-kakao-channel').click();
    await expect(panel).toBeHidden();
    await login.click();
    await expect(panel).toBeVisible();
    await expect(login).toHaveAttribute('aria-expanded', 'true');
    await expect(panel.locator('.contact-provider-name')).toHaveText(['Google', '네이버', '카카오']);
    await expect(panel.locator('[data-provider="google"]')).toBeEnabled();
    await expect(panel.locator('[data-provider="naver"]')).toBeEnabled();
    await expect(panel.locator('[data-provider="kakao"]')).toBeEnabled();
    await expect(panel.locator('.contact-provider-soon')).toHaveCount(0);

    // 문의 창 바로 오른쪽, 로그인 줄 높이에 붙는다
    const box = await popover.boundingBox();
    const panelBox = await panel.boundingBox();
    const loginBox = await login.boundingBox();
    expect(panelBox.x).toBeGreaterThanOrEqual(box.x + box.width);
    expect(panelBox.x - (box.x + box.width)).toBeLessThan(20);
    // 로그인 줄 높이에 맞추되, 화면 아래로 넘치면 위로 올린다: 어느 쪽이든 로그인 줄과 겹치고 화면 안에 있다
    expect(panelBox.y).toBeLessThanOrEqual(loginBox.y + 1);
    expect(panelBox.y + panelBox.height).toBeGreaterThan(loginBox.y);
    expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(800);

    // Esc 는 목록만 먼저 닫고, 한 번 더 누르면 문의 창을 닫는다
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(popover).toBeVisible();
    await login.click();
    await expect(panel).toBeVisible();
    await login.click();
    await expect(panel).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(popover).toBeHidden();
  });

  test('좁은 화면에서는 계정 목록이 로그인 줄 아래에 펼쳐진다', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.locator('#header-menu-btn').click();
    await page.locator('#nav-kakao-channel').click();
    await page.locator('#contact-login-btn').click();
    const panel = page.locator('#contact-login-providers');
    await expect(panel).toBeVisible();
    const panelBox = await panel.boundingBox();
    const loginBox = await page.locator('#contact-login-btn').boundingBox();
    expect(panelBox.y).toBeGreaterThan(loginBox.y + loginBox.height - 1);
    expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(390);
  });

  test('메일: 앞서 난 오류는 다음에 보낼 때 진단으로 몰래 붙고, 보낸 뒤에는 비운다', async ({ page }) => {
    let fail = true;
    const sent = [];
    await page.route(WEB3FORMS_URL, route => {
      sent.push(route.request().postDataJSON());
      if (fail) route.fulfill({ status: 400, json: { success: false, message: 'Invalid access key' } });
      else route.fulfill({ json: { success: true, message: 'ok' } });
    });

    await page.locator('#nav-kakao-channel').click();
    await page.locator('#contact-mail-toggle').click();
    await page.locator('#contact-message').fill('첫 번째 문의 내용');
    await page.locator('#contact-submit-btn').click();
    await expect(page.locator('#contact-result')).toContainText('보내지 못했습니다');

    fail = false;
    await page.locator('#contact-submit-btn').click();
    await expect(page.locator('#contact-result')).toContainText('보냈습니다');
    expect(sent[1].diagnostics).toContain('Invalid access key');
    expect(sent[1].diagnostics).toContain('빌드:');
    // 화면에는 진단이 보이지 않는다
    await expect(page.locator('#contact-mail-window')).not.toContainText('Invalid access key');

    await page.locator('#contact-message').fill('두 번째 문의 내용');
    await page.locator('#contact-submit-btn').click();
    await expect(page.locator('#contact-result')).toContainText('보냈습니다');
    expect(sent[2].diagnostics).toBeUndefined();
  });

  test('대화창: 메일 · 문의하기는 문의 창 오른쪽에 아래를 맞춰 하나씩 뜬다', async ({ page }) => {
    const popover = page.locator('#contact-popover');
    const mail = page.locator('#contact-mail-window');
    const chat = page.locator('#contact-chat-window');
    await page.locator('#nav-kakao-channel').click();

    await page.locator('#contact-mail-toggle').click();
    await expect(mail).toBeVisible();
    await expect(page.locator('#contact-mail-toggle')).toHaveAttribute('aria-expanded', 'true');
    const box = await popover.boundingBox();
    const mailBox = await mail.boundingBox();
    expect(mailBox.x).toBeGreaterThanOrEqual(box.x + box.width);
    expect(mailBox.x - (box.x + box.width)).toBeLessThan(20);
    expect(Math.abs((mailBox.y + mailBox.height) - (box.y + box.height))).toBeLessThan(2);

    // 문의하기를 열면 메일 창은 닫힌다
    await page.locator('#contact-dm-toggle').click();
    await expect(chat).toBeVisible();
    await expect(mail).toBeHidden();
    await expect(chat).toContainText('로그인하면 관리자와 대화할 수 있어요');

    // 로그인 목록을 열면 대화창은 닫힌다
    await page.locator('#contact-login-btn').click();
    await expect(page.locator('#contact-login-providers')).toBeVisible();
    await expect(chat).toBeHidden();

    // 대화창 안을 눌러도 문의 창은 닫히지 않고, 바깥을 누르면 모두 닫힌다
    await page.locator('#contact-dm-toggle').click();
    await chat.locator('.contact-window-title').click();
    await expect(popover).toBeVisible();
    await page.mouse.click(1200, 100);
    await expect(popover).toBeHidden();
    await expect(chat).toBeHidden();
  });

  test('대화창: 크게 보기 단추와 오른쪽 위 모서리 끌기로 크기를 바꾸고, 크기를 기억한다', async ({ page }) => {
    const mail = page.locator('#contact-mail-window');
    await page.locator('#nav-kakao-channel').click();
    await page.locator('#contact-mail-toggle').click();
    const before = await mail.boundingBox();

    const max = mail.locator('.contact-window-max');
    await max.click();
    await expect(max).toHaveAttribute('aria-pressed', 'true');
    const big = await mail.boundingBox();
    expect(big.width).toBeGreaterThan(before.width + 100);
    expect(big.height).toBeGreaterThan(before.height);
    await max.click();
    await expect(max).toHaveAttribute('aria-pressed', 'false');
    const back = await mail.boundingBox();
    expect(Math.abs(back.width - before.width)).toBeLessThan(2);

    // 오른쪽 위 모서리를 오른쪽 · 위로 끌면 커지고, 아래 끝은 그대로다
    const grip = await mail.locator('.contact-window-grip').boundingBox();
    await page.mouse.move(grip.x + 8, grip.y + 8);
    await page.mouse.down();
    await page.mouse.move(grip.x + 108, grip.y - 52, { steps: 5 });
    await page.mouse.up();
    const dragged = await mail.boundingBox();
    expect(dragged.width).toBeGreaterThan(before.width + 80);
    expect(dragged.height).toBeGreaterThan(before.height + 30);
    expect(Math.abs((dragged.y + dragged.height) - (before.y + before.height))).toBeLessThan(2);

    // 다시 열어도 그 크기
    await page.reload();
    await page.locator('#nav-kakao-channel').click();
    await page.locator('#contact-mail-toggle').click();
    const again = await mail.boundingBox();
    expect(Math.abs(again.width - dragged.width)).toBeLessThan(2);
  });

  test('대화창: 좁은 화면에서는 화면 가장자리에 맞춰 뜬다', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.locator('#header-menu-btn').click();
    await page.locator('#nav-kakao-channel').click();
    await page.locator('#contact-mail-toggle').click();
    const mail = page.locator('#contact-mail-window');
    await expect(mail).toBeVisible();
    const box = await mail.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(11);
    expect(box.x + box.width).toBeLessThanOrEqual(379);
    expect(box.height).toBeGreaterThan(700);
    await expect(mail.locator('.contact-window-grip')).toBeHidden();
    await expect(mail.locator('.contact-window-max')).toBeHidden();
  });

  test('레일의 문의 아이콘은 노란색이 아니라 다른 레일 아이콘과 같은 강조색을 쓴다', async ({ page }) => {
    const contact = page.locator('#nav-kakao-channel');
    await contact.click();
    await expect(contact).toHaveClass(/active/);
    const colors = await page.evaluate(() => {
      const contactEl = document.getElementById('nav-kakao-channel');
      const other = Array.from(document.querySelectorAll('#sidebar-nav .nav-item')).find(n => n !== contactEl);
      other.classList.add('active');
      const result = { contact: getComputedStyle(contactEl).backgroundColor, other: getComputedStyle(other).backgroundColor };
      other.classList.remove('active');
      return result;
    });
    expect(colors.contact).not.toBe('rgb(254, 229, 0)');
    expect(colors.contact).toBe(colors.other);
  });

  test('카카오: 등록하지 않은 주소에서는 로그인 창을 열지 않고 이유를 보여 준다', async ({ page }) => {
    await page.locator('#nav-kakao-channel').click();
    await page.locator('#contact-login-btn').click();
    await page.locator('[data-provider="kakao"]').click();
    await expect(page.locator('#contact-auth-status')).toContainText('카카오 로그인을 쓸 수 없습니다');
    await expect(page.locator('#contact-auth-status')).toHaveClass(/is-error/);
  });

  // 카카오 · 네이버: 로그인 화면 → 콜백 페이지 → 로그인 함수까지 같은 흐름
  const OAUTH_CASES = [
    { id: 'kakao', name: '카카오', authorize: 'https://kauth.kakao.com/oauth/authorize', clientId: 'e10f5dba1343212a115708b84584dad0' },
    { id: 'naver', name: '네이버', authorize: 'https://nid.naver.com/oauth2.0/authorize', clientId: 'f1zKks6XzuAlapalQCEi' }
  ];
  for (const c of OAUTH_CASES) {
    test(`${c.name}: 로그인 창이 돌려준 인가 코드와 state 를 로그인 함수에 보낸다`, async ({ page, baseURL }) => {
      const origin = new URL(baseURL).origin;
      const endpoint = `https://login.test/${c.id}Login`;
      // 이 테스트 서버 주소를 허용하고, 이 로그인의 함수 주소를 가짜로 바꾼다
      await page.route('**/modules/core/site-config.js*', async route => {
        const res = await route.fetch();
        const text = (await res.text())
          .replace(/"http:\/\/localhost:8137"\]\)/g, `"http://localhost:8137", "${origin}"])`)
          .replace(new RegExp(`loginEndpoint: "[^"]+/${c.id}Login"`), `loginEndpoint: "${endpoint}"`);
        await route.fulfill({ response: res, body: text });
      });
      // 로그인 화면은 바로 콜백 페이지로 돌려보낸다
      let authorizeUrl = null;
      await page.context().route(`${c.authorize}**`, route => {
        authorizeUrl = new URL(route.request().url());
        const back = `${authorizeUrl.searchParams.get('redirect_uri')}?code=test-code&state=${authorizeUrl.searchParams.get('state')}`;
        route.fulfill({ status: 302, headers: { location: back } });
      });
      let sent = null;
      await page.route(endpoint, route => {
        sent = route.request().postDataJSON();
        route.fulfill({ status: 500, json: { error: '테스트 서버' } });
      });

      await page.goto('/index.html');
      await page.locator('#nav-kakao-channel').click();
      await page.locator('#contact-login-btn').click();
      const popupPromise = page.waitForEvent('popup');
      await page.locator(`[data-provider="${c.id}"]`).click();
      const popup = await popupPromise;
      await popup.waitForEvent('close');

      await expect(page.locator('#contact-auth-status')).toContainText('테스트 서버');
      expect(authorizeUrl.searchParams.get('client_id')).toBe(c.clientId);
      expect(authorizeUrl.searchParams.get('response_type')).toBe('code');
      expect(sent).toEqual({
        code: 'test-code',
        state: authorizeUrl.searchParams.get('state'),
        redirectUri: `${origin}/auth/${c.id}-callback.html`
      });
    });
  }

  test('메일: 내용이 짧거나 주소 모양이 틀리면 보내지 않는다', async ({ page }) => {
    let requestCount = 0;
    await page.route(WEB3FORMS_URL, route => { requestCount++; route.fulfill({ json: { success: true } }); });

    await page.locator('#nav-kakao-channel').click();
    await page.locator('#contact-mail-toggle').click();

    await page.locator('#contact-message').fill('짧음');
    await page.locator('#contact-submit-btn').click();
    await expect(page.locator('#contact-result')).toContainText('5글자 이상');

    await page.locator('#contact-message').fill('충분히 긴 문의 내용입니다.');
    await page.locator('#contact-email').fill('주소아님');
    await page.locator('#contact-submit-btn').click();
    await expect(page.locator('#contact-result')).toContainText('주소의 모양');

    expect(requestCount).toBe(0);
  });

  test('메일: 성공하면 칸을 비우고, 보낸 값에 접근 키 · 내용 · 보던 페이지가 들어 있다', async ({ page }) => {
    let sent = null;
    await page.route(WEB3FORMS_URL, route => {
      sent = route.request().postDataJSON();
      route.fulfill({ json: { success: true, message: 'ok' } });
    });

    await page.locator('#nav-kakao-channel').click();
    await page.locator('#contact-mail-toggle').click();
    await page.locator('#contact-message').fill('테스트 문의 내용입니다.');
    await page.locator('#contact-email').fill('reader@example.com');
    await page.locator('#contact-submit-btn').click();

    await expect(page.locator('#contact-result')).toContainText('보냈습니다');
    await expect(page.locator('#contact-message')).toHaveValue('');

    expect(sent.access_key).toBeTruthy();
    expect(sent.subject).toContain('iseohyun.com');
    expect(sent.message).toContain('테스트 문의 내용입니다.');
    expect(sent.message).toContain('주소: ');
    expect(sent.email).toBe('reader@example.com');
  });

  test('메일: 실패하면 내용을 남기고 짧은 안내만 보여 준다(자세한 이유는 콘솔에만)', async ({ page }) => {
    await page.route(WEB3FORMS_URL, route => route.fulfill({ status: 400, json: { success: false, message: 'Invalid access key' } }));

    await page.locator('#nav-kakao-channel').click();
    await page.locator('#contact-mail-toggle').click();
    await page.locator('#contact-message').fill('실패해도 남아야 하는 내용');
    await page.locator('#contact-submit-btn').click();

    await expect(page.locator('#contact-result')).toContainText('보내지 못했습니다');
    await expect(page.locator('#contact-result')).not.toContainText('Invalid access key');
    await expect(page.locator('#contact-message')).toHaveValue('실패해도 남아야 하는 내용');
    await expect(page.locator('#contact-submit-btn')).toBeEnabled();
  });

  test('메일: 현재 페이지 정보는 기본으로 체크되어 있고, 읽기 전용 칸에 페이지 이름이 나온다', async ({ page }) => {
    let sent = null;
    await page.route(WEB3FORMS_URL, route => {
      sent = route.request().postDataJSON();
      route.fulfill({ json: { success: true } });
    });

    await page.evaluate(() => { window.location.hash = '#/info.html'; });
    await expect(page.locator('#header-title')).toHaveText('사이트 소개');

    await page.locator('#nav-kakao-channel').click();
    await page.locator('#contact-mail-toggle').click();

    const check = page.locator('#contact-page-check');
    const pageName = page.locator('#contact-page-name');
    await expect(check).toBeChecked();
    await expect(pageName).toHaveValue('사이트 소개');
    await expect(pageName).toHaveAttribute('readonly', '');

    await page.locator('#contact-message').fill('페이지 정보가 붙는 문의');
    await page.locator('#contact-submit-btn').click();
    await expect(page.locator('#contact-result')).toContainText('보냈습니다');
    expect(sent.subject).toContain('사이트 소개');
    expect(sent.message).toContain('페이지: 사이트 소개');

    // 체크를 끄면 페이지 정보 없이 내용만 보낸다
    await check.uncheck();
    await page.locator('#contact-message').fill('페이지 정보 없이 보내는 문의');
    await page.locator('#contact-submit-btn').click();
    await expect(page.locator('#contact-result')).toContainText('보냈습니다');
    expect(sent.message).toBe('페이지 정보 없이 보내는 문의');
    expect(sent.subject).not.toContain('사이트 소개');
  });

  test('로그인 · 문서별 건의 칸은 없고, Firebase 를 불러오지 않는다', async ({ page }) => {
    const firebaseRequests = [];
    page.on('request', request => {
      if (/firebasejs|firestore.googleapis|identitytoolkit/.test(request.url())) firebaseRequests.push(request.url());
    });

    await page.goto('/index.html#/column/swimming/freestyle.html');
    await expect(page.locator('article h1').first()).toBeVisible();
    await page.waitForTimeout(1500);

    await expect(page.locator('#nav-login')).toHaveCount(0);
    await expect(page.locator('#login-modal-overlay')).toHaveCount(0);
    await expect(page.locator('#page-feedback-area')).toHaveCount(0);
    expect(firebaseRequests).toEqual([]);
  });
});
