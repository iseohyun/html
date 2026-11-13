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
    await expect(popover.locator('.contact-action')).toHaveText(['카카오톡 채널 추가', '카카오톡 1:1 채팅', '메일로 문의']);
    await expect(popover.locator('a.contact-action').nth(0)).toHaveAttribute('href', 'http://pf.kakao.com/_ETRrX');
    await expect(popover.locator('a.contact-action').nth(1)).toHaveAttribute('href', 'http://pf.kakao.com/_ETRrX/chat');

    // 메일 폼은 눌러야 펼쳐진다
    await expect(page.locator('#contact-mail-form')).toBeHidden();
    await page.locator('#contact-mail-toggle').click();
    await expect(page.locator('#contact-mail-form')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(popover).toBeHidden();
  });

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

  test('메일: 실패하면 내용을 남기고 이유를 보여 준다', async ({ page }) => {
    await page.route(WEB3FORMS_URL, route => route.fulfill({ status: 400, json: { success: false, message: 'Invalid access key' } }));

    await page.locator('#nav-kakao-channel').click();
    await page.locator('#contact-mail-toggle').click();
    await page.locator('#contact-message').fill('실패해도 남아야 하는 내용');
    await page.locator('#contact-submit-btn').click();

    await expect(page.locator('#contact-result')).toContainText('보내지 못했습니다');
    await expect(page.locator('#contact-result')).toContainText('Invalid access key');
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
