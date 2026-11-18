/**
 * @file tests/slides.spec.js
 * @description 보고서 형식 문서(AI 패스트 팔로워 노트)와 /modules/features/slides.js 의 핵심 동작 검증.
 *   소리(speechSynthesis)는 흉내 객체로 바꿔 start/boundary/end 신호를 직접 보낸다.
 *   브라우저의 전체 화면은 머리 없는 환경에서 믿을 수 없으므로 막아 두고 「창 안을 가득 채우기」 경로를 검증한다.
 */
const { test, expect } = require('@playwright/test');

const CH1 = '#/column/ai/fast-follower/ch1.html';
const CH2 = '#/column/ai/fast-follower/ch2.html';
const BUILT_IN_RAIL_IDS = ['nav-home', 'nav-sitemap', 'nav-toc', 'nav-search', 'nav-kakao-channel', 'nav-info'];
const CHAPTER_TABS = ['1장 개요', '2장 설명하는 실력', '3장 도구', '4장 토큰', '5장 컨텍스트 스위칭', '6장 공부', '부록 부품 지도'];
const SETTINGS_KEY = 'iseohyun_slides_settings_v1';

// 읽어 주기 흉내: 말한 문장을 window.__tts.spoken 에 적고, window.__ttsFire(type) 로 지금 문장의 신호를 보낸다
async function stubBrowser(page) {
  await page.addInitScript(() => {
    const tts = { spoken: [], current: null, cancels: 0 };
    const voices = [
      { name: 'Microsoft Heami - Korean', lang: 'ko-KR', voiceURI: 'ms-heami', default: true },
      { name: 'Google 한국의', lang: 'ko-KR', voiceURI: 'google-ko', default: false },
      { name: 'Google US English', lang: 'en-US', voiceURI: 'google-en', default: false }
    ];
    const synth = {
      getVoices() { return voices; },
      speak(utterance) { tts.spoken.push(utterance.text); tts.current = utterance; },
      cancel() { tts.cancels++; tts.current = null; },
      addEventListener() {},
      removeEventListener() {}
    };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, get: () => synth });
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
    window.__tts = tts;
    window.__ttsFire = (type, detail) => {
      const utterance = tts.current;
      if (!utterance) return false;
      if (type === 'end') tts.current = null;
      const handler = utterance['on' + type];
      if (handler) handler(Object.assign({ name: 'word' }, detail || {}));
      return true;
    };
    // 전체 화면 API 를 막아 창 안 덮개 경로를 쓰게 한다
    Element.prototype.requestFullscreen = undefined;
  });
}

async function openChapter(page, hash = CH1) {
  await page.goto('/index.html' + hash);
  await expect(page.locator('article .slides-doc')).toBeVisible();
  if (hash === CH1) await expect(page.locator('.slides-doc .sl-full')).toHaveCount(3);
}

async function goToHash(page, hash) {
  await page.evaluate(nextHash => { window.location.hash = nextHash; }, hash);
}

const spoken = page => page.evaluate(() => window.__tts.spoken.slice());
const fire = (page, type, detail) => page.evaluate(([t, d]) => window.__ttsFire(t, d), [type, detail]);

test.beforeEach(async ({ page }) => {
  await stubBrowser(page);
  await page.setViewportSize({ width: 1280, height: 800 });
});

test.describe('장 문서가 사이트 뼈대 안에 그려진다', () => {
  test('레일 기본 항목과 장 탭, 목차가 그대로 있다', async ({ page }) => {
    await openChapter(page);

    await expect(page.locator('#app-header')).toBeVisible();
    for (const id of BUILT_IN_RAIL_IDS) await expect(page.locator('#' + id)).toBeVisible();

    // 지금은 1장만 공개해서 묶음에 문서가 하나뿐이라 장 탭이 없다.
    // 2장 이후를 공개하면 아래 두 줄을 되살린다:
    //   await expect(tabs).toHaveText(CHAPTER_TABS);
    //   await expect(page.locator('#header-tabs .app-tab[aria-selected="true"]')).toHaveText('1장 개요');
    const tabs = page.locator('#header-tabs .app-tab');
    await expect(tabs).toHaveCount(0);
    await expect(page.locator('#header-title')).toHaveText('1장 개요');

    // 목차에는 장 제목과 묶음 제목만 나온다 (슬라이드 제목은 h1/h2 가 아니다)
    const toc = page.locator('#toc-tree a');
    await expect(toc).toHaveCount(4);
    await expect(toc.nth(1)).toContainText('1-1. 패스트 팔로워란');
    await expect(toc.nth(3)).toContainText('1-3. 결론');
    await expect(page.locator('.slides-doc .slide h1, .slides-doc .slide h2')).toHaveCount(0);

    // 원문의 메타데이터가 남아 있다
    await expect(page.locator('.slides-doc .slide-no')).toHaveText(['1-1', '1-2', '1-3']);
    await expect(page.locator('.slides-doc a[data-view]')).toHaveCount(2);
    expect(await page.locator('.slides-doc [data-cue]').count()).toBeGreaterThan(15);
  });

  test('1280px 에서 슬라이드 세 장이 16:9 이고 내용이 넘치지 않는다', async ({ page }) => {
    await openChapter(page);
    const report = await page.evaluate(() => Array.from(document.querySelectorAll('.slides-doc .slide')).map(slide => {
      const rect = slide.getBoundingClientRect();
      const body = slide.querySelector('.slide-body').getBoundingClientRect();
      // 칸마다 그 안의 내용이 칸 밖으로 나가지 않는지 본다
      const clipped = [];
      slide.querySelectorAll('.slide-body, .flow > li, .rethink, .slide-legend, .thesis, .thesis-points').forEach(box => {
        const outer = box.getBoundingClientRect();
        box.querySelectorAll('*').forEach(el => {
          const inner = el.getBoundingClientRect();
          if (!inner.width || !inner.height) return;
          if (inner.bottom > outer.bottom + 1 || inner.right > outer.right + 1 || inner.top < outer.top - 1 || inner.left < outer.left - 1) {
            clipped.push((box.className || box.tagName) + ' > ' + (el.className || el.tagName) + ' ' + Math.round(inner.bottom - outer.bottom));
          }
        });
      });
      return { width: rect.width, ratio: rect.width / rect.height, bodyFits: body.bottom <= rect.bottom + 1 && body.right <= rect.right + 1, clipped };
    }));
    expect(report).toHaveLength(3);
    for (const slide of report) {
      expect(slide.width).toBeGreaterThan(560);
      expect(Math.abs(slide.ratio - 16 / 9)).toBeLessThan(0.02);
      expect(slide.bodyFits).toBe(true);
      expect(slide.clipped).toEqual([]);
    }
  });

  test('좁은 화면에서는 16:9 를 풀고 세로로 쌓는다', async ({ page }) => {
    await page.setViewportSize({ width: 420, height: 800 });
    await openChapter(page);
    const ratios = await page.evaluate(() => Array.from(document.querySelectorAll('.slides-doc .slide')).map(slide => {
      const rect = slide.getBoundingClientRect();
      return rect.width / rect.height;
    }));
    // 내용이 많은 앞의 두 장은 세로로 길어진다
    expect(ratios[0]).toBeLessThan(1.2);
    expect(ratios[1]).toBeLessThan(1.2);
    const fontSize = await page.locator('.slides-doc .slide-body').first().evaluate(el => getComputedStyle(el).fontSize);
    expect(fontSize).toBe('13px');
  });
});

test.describe('전체 화면 보기 (창 안 덮개)', () => {
  test('열고, 넘기고, 닫는다. 그동안 사이트 단축키는 받지 않는다', async ({ page }) => {
    await openChapter(page);
    const root = page.locator('.slides-doc');
    const panelCollapsed = () => page.locator('#sidebar-panel').evaluate(el => el.classList.contains('collapsed'));
    const before = await panelCollapsed();

    await page.locator('#s1-1 .sl-full').click();
    await expect(root).toHaveClass(/is-full/);
    await expect(root).toHaveClass(/is-overlay/);

    // 창을 가득 덮고, 헤더와 레일보다 위에 있다
    const cover = await page.evaluate(() => {
      const el = document.querySelector('.slides-doc');
      const rect = el.getBoundingClientRect();
      const inside = (x, y) => el.contains(document.elementFromPoint(x, y));
      return { rect: [rect.left, rect.top, rect.width, rect.height], header: inside(640, 10), rail: inside(10, 400), center: inside(640, 400) };
    });
    expect(cover).toEqual({ rect: [0, 0, 1280, 800], header: true, rail: true, center: true });

    // 고른 슬라이드 하나만 보이고 16:9 로 화면에 맞춘다
    await expect(page.locator('.slides-doc .slide:visible')).toHaveCount(1);
    await expect(page.locator('.slides-doc .script:visible')).toHaveCount(0);
    const frame = await page.locator('#s1-1 .slide-frame').boundingBox();
    expect(Math.round(frame.width)).toBe(1280);
    expect(Math.abs(frame.width / frame.height - 16 / 9)).toBeLessThan(0.02);

    const count = page.locator('.slides-doc section.has-active .sl-count');
    await expect(count).toHaveText('1 / 3');
    await expect(page.locator('#s1-1 .sl-full')).toHaveAttribute('aria-label', '전체 화면 닫기');
    await expect(page.locator('#s1-1 .sl-cc')).toBeVisible();
    await expect(page.locator('#s1-1 .sl-gear')).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(count).toHaveText('2 / 3');
    await page.keyboard.press('PageDown');
    await expect(count).toHaveText('3 / 3');
    await page.keyboard.press('PageDown');   // 끝 장에서는 더 가지 않는다
    await expect(count).toHaveText('3 / 3');
    await page.keyboard.press('ArrowUp');
    await expect(count).toHaveText('2 / 3');

    // 사이트 단축키(M: 패널 여닫기)는 받지 않는다
    await page.keyboard.press('m');
    expect(await panelCollapsed()).toBe(before);
    await expect(root).toHaveClass(/is-full/);

    await page.keyboard.press('Escape');
    await expect(root).not.toHaveClass(/is-full/);
    await expect(root).not.toHaveClass(/is-overlay/);
    await expect(page.locator('#s1-2 .sl-cc')).toBeHidden();
    // 마지막에 보던 슬라이드 자리로 돌아온다
    await expect(page.locator('#s1-2 .slide')).toBeInViewport();
  });

  test('읽는 동안 자막이 보이고, 자막 단추와 설정 창이 같은 설정을 쓴다', async ({ page }) => {
    await openChapter(page);
    await page.locator('#s1-1 .sl-full').click();
    await page.locator('#s1-1 .sl-tts').click();
    await fire(page, 'start');

    const caption = page.locator('.slides-doc > .sl-caption');
    const first = (await spoken(page))[0];
    await expect(caption).toBeVisible();
    // 자막은 지금 읽는 문장의 첫 조각이다 (긴 문장은 쉼표에서 끊으므로 문장 전체가 아닐 수 있다)
    const shown = await caption.locator('.sl-caption-text').textContent();
    expect(shown.length).toBeGreaterThan(0);
    expect(first.startsWith(shown)).toBe(true);
    await expect(caption).toHaveAttribute('data-v', 'bottom');
    await expect(caption).toHaveAttribute('data-h', 'center');
    const style = await caption.evaluate(el => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, blur: cs.backdropFilter, pointer: cs.pointerEvents };
    });
    expect(style).toEqual({ bg: 'rgba(0, 0, 0, 0.3)', blur: 'blur(4px)', pointer: 'none' });

    // 단어 신호가 오면 자막의 단어 상자가 나타난다
    await fire(page, 'boundary', { charIndex: 0, charLength: 1 });
    await expect(caption.locator('.sl-caption-hl')).toHaveCSS('opacity', '1');

    // 진행 막대는 전체 화면 안에서도 보인다
    await expect(page.locator('.slides-doc > .sl-playbar')).toBeVisible();

    // 설정 창: 헤더의 읽기 설정 줄을 옮겨 와 쓴다
    await page.locator('#s1-1 .sl-gear').click();
    const pop = page.locator('#s1-1 .sl-settings-pop');
    await expect(pop).toBeVisible();
    await expect(pop.locator('[data-sl-setting]')).toHaveCount(6);
    await pop.locator('[data-cap-v="top"]').click();
    await expect(caption).toHaveAttribute('data-v', 'top');
    // 창 안에서 누른 키는 슬라이드를 넘기지 않는다
    await pop.locator('#sl-rate').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.slides-doc section.has-active .sl-count')).toHaveText('1 / 3');
    await expect(pop.locator('#sl-rate-value')).toHaveText('155%');
    await page.keyboard.press('Escape');     // 창만 닫는다
    await expect(pop).toHaveCount(0);
    await expect(page.locator('.slides-doc')).toHaveClass(/is-full/);

    // 자막 단추
    const cc = page.locator('#s1-1 .sl-cc');
    await expect(cc).toHaveAttribute('aria-pressed', 'true');
    await cc.click();
    await expect(caption).toHaveCount(0);
    await expect(cc).toHaveAttribute('aria-pressed', 'false');

    // 읽는 중에 슬라이드를 넘기면(PageDown) 읽던 슬라이드는 멈추고 다음 슬라이드를 이어 읽는다
    await page.keyboard.press('PageDown');
    await expect(page.locator('#s1-1 .sl-tts')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#s1-2 .sl-tts')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');

    // 설정 줄은 헤더 패널로 돌아와 있고 바꾼 값이 남아 있다
    await page.locator('#header-settings-btn').click();
    await expect(page.locator('#header-drop [data-sl-setting]')).toHaveCount(6);
    await expect(page.locator('#header-drop [data-cap="off"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#header-drop [data-cap-v="top"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('자막은 긴 문장을 쉼표에서 끊고, 나열의 쉼표에서는 끊지 않는다', async ({ page }) => {
    await openChapter(page);
    const parts = text => page.evaluate(t => window.SiteModules.Slides.captionParts(t).map(p => t.slice(p[0], p[1]).trim()), text);

    // 짧은 문장은 쉼표가 있어도 그대로
    expect(await parts('그래서 유료 결제를 하고, 그림을 맡겼습니다.')).toEqual(['그래서 유료 결제를 하고, 그림을 맡겼습니다.']);
    // 긴 문장은 절 사이의 쉼표에서 끊는다
    expect(await parts('혁신가는 새롭다는 것 자체가 이유이고, 얼리 어답터는 불완전해도 가능성을 보고 먼저 씁니다.'))
      .toEqual(['혁신가는 새롭다는 것 자체가 이유이고,', '얼리 어답터는 불완전해도 가능성을 보고 먼저 씁니다.']);
    // 나열(예시)의 쉼표에서는 끊지 않는다
    expect(await parts('데이터베이스, 네트워크, 운영체제, 자료구조를 한 학기에 모두 배웁니다.')).toHaveLength(1);
    expect(await parts('이 화면에서 쓸 수 있는 것은 레일, 패널, 헤더이고 나머지는 프로젝트가 정합니다.')).toHaveLength(1);
    // 「예를 들어,」처럼 짧은 머리말 뒤에서도 끊지 않는다
    expect(await parts('예를 들어, 처음 쓰는 사람은 무엇을 물어야 할지조차 모르는 경우가 많습니다.')).toHaveLength(1);
    // 끊고 남은 뒷조각이 너무 짧으면 앞에 붙인다
    expect(await parts('얼리 어답터가 치른 시행착오를 충분히 지켜본 다음에야 움직이고, 따라갑니다.')).toHaveLength(1);
  });

  test('읽는 자리가 쉼표를 넘어가면 자막이 다음 조각으로 바뀐다', async ({ page }) => {
    await openChapter(page);
    await page.locator('#s1-1 .sl-full').click();
    await page.locator('#s1-1 .sl-tts').click();
    const text = page.locator('.slides-doc > .sl-caption .sl-caption-text');

    // 쉼표에서 끊기는 문장이 나올 때까지 읽어 넘긴다
    let sentence = null, cut = null;
    for (let i = 0; i < 12 && !cut; i++) {
      await fire(page, 'start');
      sentence = (await spoken(page)).pop();
      const pieces = await page.evaluate(t => window.SiteModules.Slides.captionParts(t), sentence);
      if (pieces.length > 1) cut = pieces;
      else await fire(page, 'end');
    }
    expect(cut, '1장 첫 슬라이드의 스크립트에 쉼표에서 끊기는 긴 문장이 있어야 한다').not.toBeNull();

    const piece = n => sentence.slice(cut[n][0], cut[n][1]).trim();
    await expect(text).toHaveText(piece(0));
    // 둘째 조각의 첫 단어를 읽기 시작하면 자막이 바뀌고, 단어 상자는 새 조각 안의 자리에 놓인다
    const word = sentence.slice(cut[1][0]).match(/^\S+/)[0];
    await fire(page, 'boundary', { charIndex: cut[1][0], charLength: word.length });
    await expect(text).toHaveText(piece(1));
    await expect(page.locator('.sl-caption-hl')).toHaveCSS('opacity', '1');
    const hlLeft = await page.locator('.sl-caption-hl').evaluate(el => parseFloat(el.style.left));
    const pad = await page.locator('.slides-doc > .sl-caption').evaluate(el => parseFloat(getComputedStyle(el).paddingLeft));
    expect(Math.abs(hlLeft - (pad - 3))).toBeLessThan(2);   // 조각의 첫 단어이므로 자막의 왼쪽 안여백에서 시작한다

    // 「읽는 곳」이 단어가 아니어도 조각은 읽는 자리를 따라간다
    await fire(page, 'end');
    await page.keyboard.press('Escape');
  });

  test('자막 글자 크기를 설정에서 바꾼다', async ({ page }) => {
    await openChapter(page);
    await page.locator('#s1-1 .sl-full').click();
    await page.locator('#s1-1 .sl-tts').click();
    await fire(page, 'start');
    const caption = page.locator('.slides-doc > .sl-caption');
    const size = () => caption.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    const before = await size();

    await page.locator('#s1-1 .sl-gear').click();
    const pop = page.locator('#s1-1 .sl-settings-pop');
    await expect(pop.locator('#sl-cap-size')).toHaveValue('100');
    await pop.locator('#sl-cap-size').fill('150');
    await expect(pop.locator('#sl-cap-size-value')).toHaveText('150%');
    expect(Math.abs(await size() - before * 1.5)).toBeLessThan(0.6);

    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SETTINGS_KEY);
    expect(saved.capSize).toBe(150);
  });
});

test.describe('읽기 설정 (헤더의 화면 설정 패널)', () => {
  test('컨트롤이 기본값으로 있고, 바꾼 값을 기억한다', async ({ page }) => {
    await openChapter(page);
    await page.locator('#header-settings-btn').click();
    const drop = page.locator('#header-drop');
    await expect(drop).toHaveClass(/is-open/);
    await expect(drop.locator('.app-drop-note')).toHaveCount(0);
    await expect(drop.locator('#header-global-settings-link')).toBeVisible();

    // 기본값: 자동 목소리(문서 언어 안에서 Google 먼저), 150%, 단어, 빨강, 자막 보기·아래·가운데, 검정 30% 4px
    await expect(drop.locator('#sl-voice')).toHaveValue('');
    await expect(drop.locator('#sl-voice option').first()).toHaveText('자동 · Google 한국의');
    await expect(drop.locator('#sl-voice option').nth(1)).toHaveText('Google 한국의 · ko-KR');
    await expect(drop.locator('#sl-rate')).toHaveValue('150');
    await expect(drop.locator('#sl-rate-value')).toHaveText('150%');
    await expect(drop.locator('#sl-rate-dots i')).toHaveCount(7);
    await expect(drop.locator('#sl-rate-dots i.is-on')).toHaveCount(1);
    await expect(drop.locator('[data-unit="word"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(drop.locator('[data-cue-color="#d32f2f"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(drop.locator('[data-cap="on"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(drop.locator('[data-cap-v="bottom"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(drop.locator('[data-cap-h="center"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(drop.locator('#sl-cap-bg')).toHaveValue('#000000');
    await expect(drop.locator('#sl-cap-alpha')).toHaveValue('30');
    await expect(drop.locator('#sl-cap-blur')).toHaveValue('4');
    await expect(drop.locator('#sl-cap-size')).toHaveValue('100');

    // 키보드는 5%씩 움직이고 자석이 붙지 않는다
    await drop.locator('#sl-rate').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(drop.locator('#sl-rate-value')).toHaveText('145%');
    await expect(drop.locator('#sl-rate-dots i.is-on')).toHaveCount(0);
    // 끌 때는 지점의 ±5% 안에서 붙는다 (pointerdown 뒤의 input)
    await drop.locator('#sl-rate').evaluate(el => {
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      el.value = '205';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });
    await expect(drop.locator('#sl-rate-value')).toHaveText('200%');

    await drop.locator('[data-unit="sentence"]').click();
    await drop.locator('[data-cue-color="#1565c0"]').click();
    await drop.locator('#sl-voice').selectOption('ms-heami');
    await drop.locator('#sl-cap-alpha').fill('60');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--sl-cue').trim())).toBe('#1565c0');

    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SETTINGS_KEY);
    expect(saved).toMatchObject({ rate: 2, unit: 'sentence', cue: '#1565c0', voice: 'ms-heami', capAlpha: 60, caption: true });

    await page.reload();
    await expect(page.locator('.slides-doc .sl-full')).toHaveCount(3);
    await page.locator('#header-settings-btn').click();
    await expect(drop.locator('#sl-rate')).toHaveValue('200');
    await expect(drop.locator('[data-unit="sentence"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(drop.locator('[data-cue-color="#1565c0"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(drop.locator('#sl-voice')).toHaveValue('ms-heami');
    await expect(drop.locator('#sl-cap-alpha-value')).toHaveText('60%');
  });
});

test.describe('읽어 주기', () => {
  test('문장 순서대로 읽으며 읽는 곳과 슬라이드를 짚고, 멈추면 진행 막대가 자리를 기억한다', async ({ page }) => {
    await openChapter(page);
    const sentences = await page.locator('#s1-1 .script .sent').allTextContents();
    expect(sentences.length).toBeGreaterThan(10);
    // 출처와 날짜 줄은 문장으로 나누지 않는다
    await expect(page.locator('#s1-1 .script .meta .sent')).toHaveCount(0);

    const tts = page.locator('#s1-1 .sl-tts');
    const hasCue = (key, cls) => page.locator(`#s1-1 .slide [data-key="${key}"]`).evaluate((el, c) => el.classList.contains(c), cls);
    await expect(page.locator('.sl-playbar')).toHaveCount(0);

    await tts.click();
    expect(await spoken(page)).toEqual([sentences[0]]);
    await expect(tts).toHaveAttribute('aria-pressed', 'true');
    await expect(tts.locator('use')).toHaveAttribute('href', '#i-play');
    expect(await tts.evaluate(el => getComputedStyle(el).animationName)).toBe('sl-pulse');
    await fire(page, 'start');

    // 읽는 곳: 기본은 단어 → 문장을 선택 면으로 채우고, 단어 신호가 오면 그 단어를 뒤집는다
    await expect(page.locator('#s1-1 .script .sent.is-reading')).toHaveText(sentences[0]);
    await fire(page, 'boundary', { charIndex: 0, charLength: 1 });
    expect(await page.evaluate(() => CSS.highlights.get('sl-tts-word').size)).toBe(1);
    // 첫 문단은 data-cue="doc:check": 줄 끝에 체크 표시가 붙는다 (사이트의 단축키 배지 모양이 아니다)
    expect(await hasCue('doc', 'cue-check')).toBe(true);
    const check = await page.locator('#s1-1 .slide [data-key="doc"]').evaluate(el => {
      const cs = getComputedStyle(el, '::after');
      return { content: cs.content, position: cs.position, color: cs.color };
    });
    expect(check).toEqual({ content: '"✓"', position: 'static', color: 'rgb(211, 47, 47)' });
    // Alt 를 눌러도 슬라이드의 data-key 요소에 단축키 배지가 생기지 않는다
    expect(await page.locator('#s1-1 .slide [data-key="meaning"]').evaluate(el => getComputedStyle(el, '::after').content)).toBe('none');

    // 둘째 문단(groups:box)의 첫 문장까지 읽는다: 첫 문단은 두 문장
    await fire(page, 'end');
    await fire(page, 'start');
    await fire(page, 'end');
    expect((await spoken(page)).length).toBe(3);
    await expect(page.locator('#s1-1 .script .sent.is-reading')).toHaveText(sentences[2]);
    expect(await hasCue('groups', 'cue-box')).toBe(true);
    expect(await hasCue('doc', 'cue-check')).toBe(true);    // 체크는 끝까지 남는다

    // 읽는 곳을 문단으로 바꾸면 바로 적용된다
    await page.locator('#header-settings-btn').click();
    await page.locator('#header-drop [data-unit="paragraph"]').click();
    await expect(page.locator('#s1-1 .script > p.is-reading')).toHaveCount(1);
    await expect(page.locator('#s1-1 .script .sent.is-reading')).toHaveCount(0);
    await page.keyboard.press('Escape');   // 패널을 닫는다. 본문에서 Esc 는 읽기도 멈춘다

    await expect(tts).toHaveAttribute('aria-pressed', 'false');
    await expect(tts.locator('use')).toHaveAttribute('href', '#i-volume');
    expect(await hasCue('groups', 'cue-box')).toBe(false);
    expect(await hasCue('doc', 'cue-check')).toBe(false);
    await expect(page.locator('.is-reading')).toHaveCount(0);
    expect(await page.evaluate(() => window.__tts.cancels)).toBeGreaterThan(0);

    // 진행 막대: 멈춰도 지우지 않고, 다 읽은 문장 수만큼(2 / 전체)을 가리킨다
    const bar = page.locator('body > .sl-playbar');
    await expect(bar).toBeVisible();
    const geometry = await bar.evaluate(el => {
      const rect = el.getBoundingClientRect();
      const line = el.firstChild.getBoundingClientRect();
      return { bottom: Math.round(window.innerHeight - rect.bottom), hit: rect.height, line: line.height, ratio: line.width / window.innerWidth };
    });
    expect(geometry.bottom).toBe(0);
    expect(geometry.hit).toBe(18);
    expect(geometry.line).toBe(1);
    expect(geometry.ratio).toBeCloseTo(2 / sentences.length, 2);

    // 다시 누르면 기억해 둔 자리의 문장부터 읽는다
    await tts.click();
    expect((await spoken(page)).pop()).toBe(sentences[2]);

    // 막대의 한 자리를 누르면 그 자리의 문장부터 읽는다 (넉넉한 띠의 위쪽을 눌러도 된다)
    await bar.click({ position: { x: 1275, y: 2 } });
    expect((await spoken(page)).pop()).toBe(sentences[sentences.length - 1]);
    // 끝까지 읽으면 멈추고 막대는 가득 찬 채 남는다
    await fire(page, 'start');
    await fire(page, 'end');
    await expect(tts).toHaveAttribute('aria-pressed', 'false');
    await expect(bar).toBeVisible();
    expect(await bar.evaluate(el => el.firstChild.getBoundingClientRect().width)).toBeCloseTo(1280, 0);
    // 끝까지 읽은 슬라이드는 처음부터
    await tts.click();
    expect((await spoken(page)).pop()).toBe(sentences[0]);
  });

  test('문장을 감싼 요소의 data-cue 는 그 문장에만 걸린다', async ({ page }) => {
    await openChapter(page);
    const sentences = await page.locator('#s1-3 .script .sent').allTextContents();
    const classes = key => page.locator(`#s1-3 .slide [data-key="${key}"]`).evaluate(el => el.className);
    await page.locator('#s1-3 .sl-tts').click();   // "결론입니다."
    await fire(page, 'start');
    expect(await classes('k1')).not.toContain('cue-check');
    await fire(page, 'end');                        // k1:check
    expect(await classes('k1')).toContain('cue-check');
    expect(await classes('k2')).not.toContain('cue-check');
    for (let i = 2; i < sentences.length; i++) await fire(page, 'end');
    // 마지막 문장: 주제 한 줄에 밑줄, 받침 세 가지는 체크가 남아 있다
    expect(await classes('thesis')).toContain('cue-underline');
    expect(await classes('k3')).toContain('cue-check');
    // 다른 슬라이드에는 짚기가 번지지 않는다
    await expect(page.locator('#s1-1 .slide [class*="cue-"], #s1-2 .slide [class*="cue-"]')).toHaveCount(0);
  });
});

test.describe('이어 재생 (헤더의 재생 단추)', () => {
  test('슬라이드가 있는 문서에만 있고, 한 장을 다 읽으면 다음 장으로 넘어간다', async ({ page }) => {
    await openChapter(page);
    const play = page.locator('#header-action-slides-play');
    await expect(play).toBeVisible();
    await expect(play).toHaveAttribute('aria-label', '슬라이드 이어 재생');
    // 헤더 오른쪽 묶음의 맨 앞(필터의 왼쪽)
    expect(await play.evaluate(el => el.nextElementSibling.id)).toBe('header-filter-btn');

    const first = await page.locator('#s1-1 .script .sent').allTextContents();
    const second = await page.locator('#s1-2 .script .sent').allTextContents();
    const total = first.length + second.length + await page.locator('#s1-3 .script .sent').count();

    await play.click();
    await expect(play).toHaveAttribute('aria-pressed', 'true');
    await expect(play).toHaveAttribute('aria-label', '재생 멈춤');
    await expect(play.locator('use')).toHaveAttribute('href', '#i-stop');
    expect(await spoken(page)).toEqual([first[0]]);

    for (let i = 0; i < first.length; i++) await fire(page, 'end');
    // 다음 슬라이드로 스크롤한 뒤(0.6초 ~ 2.5초) 읽기 시작한다
    await expect.poll(async () => (await spoken(page)).pop(), { timeout: 5000 }).toBe(second[0]);
    await expect(page.locator('#s1-2 .sl-tts')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#s1-2 .slide')).toBeInViewport();

    // 진행 막대는 문서 전체의 문장 수가 기준이다
    const ratio = await page.locator('body > .sl-playbar').evaluate(el => el.firstChild.getBoundingClientRect().width / window.innerWidth);
    expect(ratio).toBeCloseTo(first.length / total, 2);

    // 슬라이드의 스피커 단추를 누르면 이어 재생이 멈춘다
    await page.locator('#s1-2 .sl-tts').click();
    await expect(play).toHaveAttribute('aria-pressed', 'false');
    await expect(play.locator('use')).toHaveAttribute('href', '#i-play');

    // 다시 누르면 기억해 둔 자리(둘째 슬라이드의 첫 문장)부터
    await play.click();
    expect((await spoken(page)).pop()).toBe(second[0]);
    await play.click();
    await expect(play).toHaveAttribute('aria-pressed', 'false');
  });

  // 2장 이후는 아직 공개하지 않아 저장소에 없다. 공개할 때 skip 을 풀어 준다.
  test.skip('슬라이드가 없는 장에는 재생 단추와 읽기 설정이 없고, 글쓴이 필터가 있다', async ({ page }) => {
    await openChapter(page, CH2);
    await expect(page.locator('#header-title')).toHaveText('2장 설명하는 실력');
    await expect(page.locator('.slides-doc .note')).toHaveCount(6);
    await expect(page.locator('#header-filter-btn')).toBeVisible();
    await expect(page.locator('#header-action-slides-play')).toHaveCount(0);

    await page.locator('#header-settings-btn').click();
    await expect(page.locator('.app-drop-note')).toHaveText('이 화면에만 해당하는 설정은 없습니다.');
    await expect(page.locator('#sl-settings')).toHaveCount(0);

    // 항목 제목이 목차에 오른다 (장 제목 1 + 항목 6)
    await expect(page.locator('#toc-tree a')).toHaveCount(7);

    // 실선 카드 = 내 경험과 생각, 점선 카드 = Claude의 의견
    expect(await page.locator('.slides-doc .note.claude').evaluate(el => getComputedStyle(el).borderTopStyle)).toBe('dashed');
    expect(await page.locator('.slides-doc .note:not(.claude)').first().evaluate(el => getComputedStyle(el).borderTopStyle)).toBe('solid');

    await page.locator('#header-filter-btn').click();
    await page.locator('#header-drop [data-author="claude"]').click();
    await expect(page.locator('.slides-doc .note:visible')).toHaveCount(1);
    await expect(page.locator('.slides-doc .note:visible')).toHaveClass(/claude/);
    await expect(page.locator('#header-filter-dot')).toBeVisible();
    await page.locator('#header-drop [data-author="me"]').click();
    await expect(page.locator('.slides-doc .note:visible')).toHaveCount(5);
    await page.locator('#header-drop [data-author="all"]').click();
    await expect(page.locator('.slides-doc .note:visible')).toHaveCount(6);
    await expect(page.locator('#header-filter-dot')).toBeHidden();
  });
});

test.describe('그림 크게 보기', () => {
  test('슬라이드 안에서 열리고, 화면 절반과 화살표로 넘기고, Esc 로 닫는다', async ({ page }) => {
    await openChapter(page);
    const thumbs = page.locator('#s1-2 a[data-view]');
    await thumbs.first().scrollIntoViewIfNeeded();
    await thumbs.first().click();

    const viewer = page.locator('#s1-2 .slide > .sl-viewer');
    await expect(viewer).toBeVisible();
    await expect(viewer).toHaveAttribute('role', 'dialog');
    await expect(page).toHaveURL(/ch1\.html$/);   // 주소는 바꾸지 않는다
    // 슬라이드를 가득 덮고, 그동안 슬라이드의 단추는 숨는다
    const slideBox = await page.locator('#s1-2 .slide').boundingBox();
    const viewerBox = await viewer.boundingBox();
    expect(Math.abs(viewerBox.width - slideBox.width)).toBeLessThan(3);
    expect(Math.abs(viewerBox.height - slideBox.height)).toBeLessThan(3);
    await expect(page.locator('#s1-2 .sl-full')).toBeHidden();
    await expect(viewer.locator('.sl-viewer-close')).toBeFocused();

    await expect(viewer.locator('.sl-viewer-stage')).toHaveAttribute('data-src', /taxonomy\.svg$/);
    await expect(viewer.locator('.sl-viewer-cap')).toHaveText('그림 5 · 계통도');
    await expect(viewer.locator('.sl-viewer-count')).toHaveText('1 / 2');
    await expect(viewer.locator('.is-prev')).toBeDisabled();

    // 다음 단추를 누르면 다음 그림
    await viewer.locator('.is-next').click();
    await expect(viewer.locator('.sl-viewer-count')).toHaveText('2 / 2');
    await expect(viewer.locator('.sl-viewer-cap')).toHaveText('그림 6 · 지질역사');
    await expect(viewer.locator('.is-next')).toBeDisabled();
    // 이전 단추 → 이전, 화살표 키 → 다음. 끝에서는 돌아가지 않는다
    await viewer.locator('.is-prev').click();
    await expect(viewer.locator('.sl-viewer-count')).toHaveText('1 / 2');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(viewer.locator('.sl-viewer-count')).toHaveText('2 / 2');
    await page.keyboard.press('ArrowLeft');
    await expect(viewer.locator('.sl-viewer-count')).toHaveText('1 / 2');

    await page.keyboard.press('Escape');
    await expect(page.locator('.sl-viewer')).toHaveCount(0);
    await expect(thumbs.first()).toBeFocused();
    await expect(page.locator('#s1-2 .sl-full')).toBeVisible();

    // 닫기 단추
    await thumbs.nth(1).click();
    await expect(viewer.locator('.sl-viewer-count')).toHaveText('2 / 2');
    await viewer.locator('.sl-viewer-close').click();
    await expect(page.locator('.sl-viewer')).toHaveCount(0);
  });
});

test.describe('문서를 떠날 때', () => {
  // 2장 이후는 아직 공개하지 않아 저장소에 없다. 공개할 때 skip 을 풀어 준다.
  test.skip('음성, 덮개, 진행 막대, 헤더 단추를 모두 거두고, 돌아오면 읽던 자리를 기억한다', async ({ page }) => {
    await openChapter(page);
    await page.locator('#s1-1 .sl-full').click();
    await page.locator('#s1-1 .sl-tts').click();
    await fire(page, 'start');
    await fire(page, 'end');
    await expect(page.locator('.sl-playbar')).toHaveCount(1);
    await expect(page.locator('.sl-caption')).toHaveCount(1);
    const cancelsBefore = await page.evaluate(() => window.__tts.cancels);
    expect(await page.evaluate(() => window.SiteModules.Slides.isActive())).toBe(true);

    await goToHash(page, CH2);
    await expect(page.locator('#header-title')).toHaveText('2장 설명하는 실력');
    await expect(page.locator('.slides-doc .note')).toHaveCount(6);

    await expect(page.locator('.sl-playbar')).toHaveCount(0);
    await expect(page.locator('.sl-caption')).toHaveCount(0);
    await expect(page.locator('.sl-viewer')).toHaveCount(0);
    await expect(page.locator('.slides-doc.is-full')).toHaveCount(0);
    await expect(page.locator('#header-action-slides-play')).toHaveCount(0);
    const after = await page.evaluate(() => ({
      cancels: window.__tts.cancels,
      current: window.__tts.current,
      cue: document.documentElement.style.getPropertyValue('--sl-cue'),
      highlight: CSS.highlights.has('sl-tts-word')
    }));
    expect(after.cancels).toBeGreaterThan(cancelsBefore);
    expect(after.current).toBeNull();
    expect(after.cue).toBe('');
    expect(after.highlight).toBe(false);
    // 떠난 뒤에는 방향키가 슬라이드로 가지 않는다 (리스너가 남지 않았다)
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.slides-doc.is-full')).toHaveCount(0);

    // 돌아오면 진행 막대가 다시 보이고, 스피커 단추는 읽던 문장부터 읽는다
    const sentence = await (async () => {
      await goToHash(page, CH1);
      await expect(page.locator('.slides-doc .sl-full')).toHaveCount(3);
      return (await page.locator('#s1-1 .script .sent').allTextContents())[1];
    })();
    await expect(page.locator('body > .sl-playbar')).toBeVisible();
    await expect(page.locator('#header-action-slides-play')).toHaveCount(1);
    await page.locator('#s1-1 .sl-tts').click();
    expect((await spoken(page)).pop()).toBe(sentence);
  });
});

test.describe('슬라이드 문서의 코드 보기', () => {
  test('코드 한 줄의 높이가 글줄 높이와 같다 (본문 표의 칸 여백이 걸리지 않는다)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/index.html');
    // React 문서는 개발중이라 관리자에게만 보인다: 보이기 설정을 켜고 들어간다
    await page.evaluate(() => window.SiteModules.Hierarchy.setShowDev(true));
    await page.evaluate(() => { window.location.hash = '#/web-tech/React/start.html'; });
    await expect(page.locator('article .slides-doc')).toBeVisible();
    await page.evaluate(() => document.querySelectorAll('article details').forEach(el => { el.open = true; }));

    const row = page.locator('article .slides-doc pre table.hljs-ln tr').first();
    await expect(row).toBeVisible();
    const metrics = await page.evaluate(() => {
      const pre = document.querySelector('article .slides-doc pre:has(table.hljs-ln)');
      const rows = pre.querySelectorAll('table.hljs-ln tr');
      const cell = rows[0].querySelector('td.hljs-ln-code');
      const style = getComputedStyle(cell);
      return {
        rowHeight: rows[0].getBoundingClientRect().height,
        lineHeight: parseFloat(style.lineHeight),
        paddingTop: parseFloat(style.paddingTop),
        borderBottom: parseFloat(style.borderBottomWidth),
        preHeight: pre.getBoundingClientRect().height,
        rowCount: rows.length
      };
    });
    expect(metrics.paddingTop).toBe(0);
    expect(metrics.borderBottom).toBe(0);
    // 한 줄은 글줄 높이 그대로다 (예전에는 위아래 9px 씩 붙어 두 배쯤 됐다)
    expect(metrics.rowHeight).toBeLessThan(metrics.lineHeight + 2);
    expect(metrics.preHeight).toBeLessThan(metrics.rowCount * (metrics.lineHeight + 2) + 40);
  });
});

test.describe('슬라이드 보기의 키', () => {
  const current = page => page.evaluate(() => (window.__tts.current ? window.__tts.current.text : null));

  test('전체 화면: 스페이스로 재생/멈춤, 읽는 중 좌우 화살표로 문장, PageDown 으로 슬라이드, C 로 자막', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openChapter(page);
    await page.locator('#s1-1 .sl-full').click();
    const count = page.locator('.slides-doc section.has-active .sl-count');
    const caption = page.locator('.slides-doc .sl-caption');
    await expect(count).toHaveText('1 / 3');
    await expect(caption).toHaveCount(0);   // 아직 읽지 않은 슬라이드에는 자막이 없다

    // 스페이스: 읽기 시작. 자막이 나온다
    await page.keyboard.press('Space');
    await expect.poll(() => spoken(page).then(list => list.length)).toBe(1);
    const first = (await spoken(page))[0];
    await expect(caption).toBeVisible();

    // 읽는 중의 좌우 화살표: 슬라이드가 아니라 문장을 넘긴다
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => spoken(page).then(list => list.length)).toBe(2);
    const second = (await spoken(page))[1];
    expect(second).not.toBe(first);
    await expect(count).toHaveText('1 / 3');
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => current(page)).toBe(first);

    // 스페이스: 멈춤. 자막은 멈춘 문장을 계속 보여 준다
    await page.keyboard.press('Space');
    await expect.poll(() => current(page)).toBeNull();
    await expect(caption).toBeVisible();
    const pausedText = await caption.locator('.sl-caption-text').textContent();
    expect(pausedText.trim().length).toBeGreaterThan(0);

    // C: 자막 끄기 / 켜기 (멈춘 동안에도)
    await page.keyboard.press('c');
    await expect(caption).toHaveCount(0);
    await expect(page.locator('#s1-1 .sl-cc')).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('c');
    await expect(caption).toBeVisible();
    await expect(caption.locator('.sl-caption-text')).toHaveText(pausedText);

    // 스페이스: 멈춘 문장부터 이어 읽는다
    await page.keyboard.press('Space');
    await expect.poll(() => current(page)).toBe(first);

    // PageDown: 다음 슬라이드로 넘어가 그 슬라이드의 처음부터 이어 읽는다
    await page.keyboard.press('PageDown');
    await expect(count).toHaveText('2 / 3');
    await expect.poll(() => current(page)).not.toBeNull();
    const slideTwoFirst = await current(page);
    expect([first, second]).not.toContain(slideTwoFirst);
    await expect(caption).toBeVisible();

    // 멈춘 뒤의 화살표는 슬라이드를 넘긴다. 읽은 적이 없는 슬라이드에는 자막이 없다
    await page.keyboard.press('Space');
    await expect.poll(() => current(page)).toBeNull();
    await page.keyboard.press('ArrowRight');
    await expect(count).toHaveText('3 / 3');
    await expect(caption).toHaveCount(0);
    await page.keyboard.press('PageUp');
    await expect(count).toHaveText('2 / 3');
    await expect(caption).toBeVisible();
  });

  test('본문: 스페이스로 이어 재생을 켜고 끄고, PageDown 으로 다음 슬라이드를 읽고, 글자를 넣는 칸에서는 받지 않는다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openChapter(page);
    const play = page.locator('#header-action-slides-play');

    await page.keyboard.press('Space');
    await expect(play).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => spoken(page).then(list => list.length)).toBe(1);
    const first = (await spoken(page))[0];

    // 읽는 중의 오른쪽 화살표: 다음 문장
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => current(page)).not.toBe(first);

    // PageDown: 다음 슬라이드의 처음부터
    const before = (await spoken(page)).length;
    await page.keyboard.press('PageDown');
    await expect.poll(() => spoken(page).then(list => list.length), { timeout: 8000 }).toBeGreaterThan(before);
    await expect(page.locator('#s1-2 .sl-tts')).toHaveAttribute('aria-pressed', 'true');

    // 스페이스: 멈춤
    await page.keyboard.press('Space');
    await expect(play).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => current(page)).toBeNull();

    // 검색 칸에 글자를 넣는 동안에는 스페이스와 C 가 글자로 들어간다
    await page.locator('#nav-search').click();
    const input = page.locator('#tab-search input[type="text"], #tab-search input[type="search"]').first();
    await input.click();
    await page.keyboard.type('c c');
    await expect(input).toHaveValue('c c');
    await expect(play).toHaveAttribute('aria-pressed', 'false');
  });
});
