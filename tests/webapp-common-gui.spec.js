/**
 * @file tests/webapp-common-gui.spec.js
 * @description 「WebApp Common GUI」 묶음(column/ai/webapp-common-gui/*.html) 검증.
 *   - 여덟 문서가 사이트 뼈대 안에서 그려지고(기본 레일 항목 유지, 형제 탭 10개: 견본 8개 + md 표준 문서 2개), 콘솔 오류가 없다
 *   - 레일의 「미리보기 설정」이 더해지고, 뼈대에 적용한 값이 떠날 때 모두 되돌려진다
 *   - 견본 동작: 달력 설정, 리스트 표↔카드, 필터 적용 표시, 지도↔필터 연동, 단어 단축, 워커 계산
 *   - 이 묶음의 스타일이 다른 문서로 새지 않는다
 */
const { test, expect } = require('@playwright/test');

const BASE = '#/column/ai/webapp-common-gui/';
const PAGES = [
  { file: 'screen.html', label: '화면', page: 'base' },
  { file: 'calendar.html', label: '달력', page: 'calendar' },
  { file: 'list.html', label: '리스트', page: 'list' },
  { file: 'map.html', label: '지도', page: 'map' },
  { file: 'filter.html', label: '필터', page: 'filter' },
  { file: 'word-shortening.html', label: '단어 단축', page: 'abbr' },
  { file: 'architecture.html', label: '구조', page: 'arch' },
  { file: 'conveniences.html', label: '편의 기능', page: 'extras' }
];
const OTHER_DOC_HASH = '#/column/prefix/prefix.html';
const BUILT_IN_RAIL_IDS = ['nav-home', 'nav-sitemap', 'nav-search', 'nav-kakao-channel', 'nav-info'];
const RAIL_ITEM = '#nav-page-cg-preview';

// 페이지 오류와 콘솔 오류를 모은다. 바깥 서비스(분석 · 글꼴)를 받지 못한 것은 이 묶음과 무관하므로 뺀다
function collectErrors(page) {
  const errors = [];
  page.on('pageerror', err => errors.push('pageerror: ' + err.message));
  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    const url = (msg.location() || {}).url || '';
    const isExternalLoadFailure = /Failed to load resource|net::ERR/.test(msg.text()) && !/^https?:\/\/localhost[:/]/.test(url);
    if (!isExternalLoadFailure) errors.push('console: ' + msg.text());
  });
  return errors;
}

async function openDoc(page, file) {
  await page.goto('/index.html' + BASE + file);
  await expect(page.locator('.cg-doc[data-cg-ready="1"]')).toBeVisible();
}

async function goToHash(page, hash) {
  await page.evaluate(nextHash => { window.location.hash = nextHash; }, hash);
}

async function goToDoc(page, file) {
  const target = PAGES.find(item => item.file === file);
  await goToHash(page, BASE + file);
  await expect(page.locator(`.cg-doc[data-cg-page="${target.page}"][data-cg-ready="1"]`)).toBeVisible();
}

test.describe('WebApp Common GUI: 문서가 사이트 뼈대 안에서 그려진다', () => {
  for (const doc of PAGES) {
    test(`${doc.label} (${doc.file}): 기본 레일 항목 · 형제 탭 10개 · 미리보기 설정 · 콘솔 오류 없음`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      const errors = collectErrors(page);
      await openDoc(page, doc.file);

      await expect(page.locator(`.cg-doc[data-cg-page="${doc.page}"]`)).toBeVisible();
      await expect(page.locator('#header-title')).toHaveText(doc.label);
      for (const id of BUILT_IN_RAIL_IDS) await expect(page.locator(`#sidebar-nav #${id}`)).toBeVisible();

      const tabs = page.locator('#header-tabs .app-tab');
      await expect(tabs).toHaveCount(PAGES.length + 2);   // 견본 문서 8개 + 보고서 · 그림 보기 견본. 규칙(md)은 「WebApp Common GUI 규칙」 묶음에 따로 있다
      await expect(tabs).toHaveText(PAGES.map(item => item.label).concat(['보고서', '그림 보기']));
      await expect(page.locator('#header-tabs .app-tab[aria-selected="true"]')).toHaveText(doc.label);

      const railItem = page.locator(RAIL_ITEM);
      await expect(railItem).toBeVisible();
      await expect(railItem).toHaveAttribute('data-tooltip', '미리보기 설정');

      // 절 제목은 사이트 규칙대로 h1 이고, 목차 패널에도 올라간다
      await expect(page.locator('.cg-doc h1').first()).toBeVisible();
      expect(await page.locator('#toc-tree a').count()).toBeGreaterThan(2);

      // 필터 아이콘은 필터를 등록한 화면에서만 보인다
      const hasFilter = ['calendar', 'list', 'map', 'filter'].includes(doc.page);
      if (hasFilter) await expect(page.locator('#header-filter-btn')).toBeVisible();
      else await expect(page.locator('#header-filter-btn')).toBeHidden();

      // 늦게 나는 오류(타이머 · 지연 로드)까지 한 박자 기다렸다가 확인한다
      await page.waitForTimeout(400);
      expect(errors).toEqual([]);
    });
  }
});

test.describe('WebApp Common GUI: 레일의 미리보기 설정', () => {
  test('영역 표시와 모서리 값이 실제 뼈대에 적용되고, 묶음 밖으로 나가면 항목과 함께 모두 사라진다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = collectErrors(page);
    await openDoc(page, 'screen.html');
    const inlineRadius = () => page.evaluate(() => document.documentElement.style.getPropertyValue('--r-md'));
    expect(await inlineRadius()).toBe('');

    await page.locator(RAIL_ITEM).click();
    await expect(page.locator('#panel-title')).toHaveText('미리보기 설정');
    await expect(page.locator('#cg-radius-out')).toHaveText('8px');

    // 영역 표시: 레일 · 패널 · 헤더 · 본문 네 틀이 실제 뼈대 요소의 자리에 놓인다
    await page.locator('#cg-region-btn').click();
    await expect(page.locator('#cg-region-btn')).toHaveAttribute('aria-pressed', 'true');
    const boxes = page.locator('.cg-region-overlay .cg-region-box:not([hidden])');
    await expect(boxes).toHaveCount(4);
    await expect(page.locator('.cg-region-tag')).toHaveText(['레일', '패널', '헤더', '본문']);
    const rects = await page.evaluate(() => {
      const round = (el) => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round); };
      return { box: round(document.querySelector('.cg-region-box[data-cg-region="본문"]')), target: round(document.getElementById('app-main')) };
    });
    expect(rects.box).toEqual(rects.target);

    // 모서리: 사이트 토큰이 바뀌고, 화면 탭의 견본 상자도 함께 바뀐다
    await page.locator('#cg-radius-range').fill('16');
    await expect(page.locator('#cg-radius-out')).toHaveText('16px');
    expect(await inlineRadius()).toBe('16px');
    await expect(page.locator('.cg-doc .radius-box').nth(1)).toHaveCSS('border-top-left-radius', '16px');
    await expect(page.locator('#header-menu-btn')).toHaveCSS('border-top-left-radius', '16px');

    // 같은 묶음의 다른 문서로 옮기면 고른 값이 이어진다
    await goToDoc(page, 'conveniences.html');
    await expect(page.locator(RAIL_ITEM)).toHaveCount(1);
    expect(await inlineRadius()).toBe('16px');
    await expect(page.locator('.cg-region-overlay')).toHaveCount(1);

    // 묶음 밖으로 나가면: 항목 · 패널 · 점선 틀 · 모서리 값이 모두 사라지고 기본 항목은 그대로다
    await goToHash(page, OTHER_DOC_HASH);
    await expect(page.locator('#header-title')).toHaveText('숫자 접두어');
    await expect(page.locator(RAIL_ITEM)).toHaveCount(0);
    await expect(page.locator('#tab-page-cg-preview')).toHaveCount(0);
    await expect(page.locator('.cg-region-overlay')).toHaveCount(0);
    expect(await inlineRadius()).toBe('');
    await expect(page.locator('#header-menu-btn')).toHaveCSS('border-top-left-radius', '8px');
    for (const id of BUILT_IN_RAIL_IDS) await expect(page.locator(`#sidebar-nav #${id}`)).toBeVisible();

    // 돌아와서 「기본값으로」를 누르면 처음 상태가 된다
    await goToDoc(page, 'screen.html');
    await page.locator(RAIL_ITEM).click();
    await page.locator('#cg-preview-reset').click();
    await expect(page.locator('#cg-radius-out')).toHaveText('8px');
    await expect(page.locator('.cg-region-overlay')).toHaveCount(0);
    expect(await inlineRadius()).toBe('');
    expect(errors).toEqual([]);
  });
});

test.describe('WebApp Common GUI: 견본 동작', () => {
  test('달력: 헤더 설정에서 달력 칸 · 기간 항목 · 이어보기를 바꾸면 달력이 따라 바뀐다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = collectErrors(page);
    await openDoc(page, 'calendar.html');

    // 처음: 달 카드 열두 장, 칩 달력, 이번 달(11월) 카드가 보이게 스크롤
    await expect(page.locator('#yearStack .month-card')).toHaveCount(12);
    await expect(page.locator('#yearStack .event-chip').first()).toBeAttached();
    await expect(page.locator('#yearStack .day-cell.is-today .today-badge')).toBeVisible();
    expect(await page.locator('#calFrame').evaluate(el => el.scrollTop)).toBeGreaterThan(500);

    await page.locator('#header-settings-btn').click();
    const settings = page.locator('#cg-settings-panel');
    await expect(settings).toBeVisible();

    // 기간 항목: 가로 막대
    await settings.locator('[data-set="span"][data-value="bar"]').click();
    await expect(settings.locator('[data-set="span"][data-value="bar"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#yearStack .bar.bar-start').first()).toBeAttached();

    // 달력 칸: 점. 점 달력에서는 막대를 쓰지 않고, 날짜를 누르면 그 주 아래로 상세가 펼쳐진다
    await settings.locator('[data-set="cal"][data-value="dot"]').click();
    await expect(page.locator('#yearStack .bar')).toHaveCount(0);
    await expect(page.locator('#yearStack .event-chip')).toHaveCount(0);
    await expect(page.locator('#yearStack .day-cell.is-dot .dot').first()).toBeAttached();
    await page.keyboard.press('Escape');
    await page.locator('#yearStack [data-day="2026-11-13"]').click();
    await expect(page.locator('#yearStack .day-detail.is-open')).toHaveCount(1);
    await expect(page.locator('#yearStack .rec.is-open')).toHaveCount(1);
    await page.locator('#yearStack [data-day="2026-11-13"]').click();
    await expect(page.locator('#yearStack .day-detail')).toHaveCount(0);

    // 이어보기 + 빈 주 생략: 한 장으로 이어지고, 빈 주 묶음 버튼이 생긴다
    await page.locator('#header-settings-btn').click();
    await settings.locator('[data-set="cont"][data-value="true"]').click();
    await expect(page.locator('#yearStack .month-card')).toHaveCount(1);
    await expect(page.locator('#yearStack .month-badge')).toHaveCount(12);
    await settings.locator('[data-set="skipEmpty"][data-value="true"]').click();
    await expect(page.locator('#yearStack .fold-row').first()).toBeAttached();

    // 설정은 기억된다: 새로 고쳐도 점 달력 그대로
    await page.reload();
    await expect(page.locator('.cg-doc[data-cg-ready="1"]')).toBeVisible();
    await expect(page.locator('#yearStack .day-cell.is-dot').first()).toBeAttached();
    expect(errors).toEqual([]);
  });

  test('리스트: 표 ↔ 카드 전환, 열 머리 정렬, 표시 열, 더 보기', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = collectErrors(page);
    await openDoc(page, 'list.html');

    // 기본은 표, 6건씩
    await expect(page.locator('#listSummary')).toHaveText('총 12건');
    await expect(page.locator('#listBody table.data-table tbody tr')).toHaveCount(6);
    await expect(page.locator('#listBody thead th')).toHaveCount(5);
    await page.locator('#listBody [data-more]').click();
    await expect(page.locator('#listBody tbody tr')).toHaveCount(12);
    await expect(page.locator('#listBody [data-more]')).toHaveCount(0);

    // 열 머리: 이름 오름차순 → 내림차순
    await page.locator('#listBody [data-sort="t"]').click();
    await expect(page.locator('#listBody th[aria-sort="ascending"]')).toHaveCount(1);
    const firstAsc = await page.locator('#listBody tbody tr .title-cell').first().getAttribute('title');
    await page.locator('#listBody [data-sort="t"]').click();
    await expect(page.locator('#listBody th[aria-sort="descending"]')).toHaveCount(1);
    expect(await page.locator('#listBody tbody tr .title-cell').first().getAttribute('title')).not.toBe(firstAsc);

    // 헤더 설정: 표시 열을 끄면 열이 줄고, 카드로 바꾸면 표시 열 줄이 사라진다
    await page.locator('#header-settings-btn').click();
    const settings = page.locator('#cg-settings-panel');
    await settings.locator('[data-col="c"]').click();
    await expect(page.locator('#listBody thead th')).toHaveCount(4);
    await expect(settings.locator('[data-col="t"]')).toBeDisabled();
    await settings.locator('[data-set="view"][data-value="card"]').click();
    await expect(page.locator('#listBody .card-grid .card')).toHaveCount(12);
    await expect(page.locator('#listBody table')).toHaveCount(0);
    await expect(settings.locator('[data-col]')).toHaveCount(0);
    await settings.locator('[data-set="view"][data-value="table"]').click();
    await expect(page.locator('#listBody table.data-table')).toHaveCount(1);

    // 단어 단축을 끄면 원래 이름이 나온다
    await settings.locator('[data-set="rev"][data-value="false"]').click();
    await expect(page.locator('#listBody tbody tr .title-cell').first()).toHaveText('제580돌 한글날 기념 낭독회');
    await settings.locator('[data-set="rev"][data-value="true"]').click();
    await expect(page.locator('#listBody tbody tr .title-cell').first()).toHaveText('서울 성탄 빛 거리');
    await settings.locator('[data-set="abbr"][data-value="false"]').click();
    await expect(page.locator('#listBody tbody tr .title-cell').first()).toHaveText('서울특별시 성탄 빛 거리');
    expect(errors).toEqual([]);
  });

  test('필터: 고르면 필터 아이콘에 점이 찍히고, 묶음의 다른 문서에도 같은 필터가 걸린다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = collectErrors(page);
    await openDoc(page, 'filter.html');
    const dot = page.locator('#header-filter-dot');
    await expect(dot).toBeHidden();
    await expect(page.locator('#filterState')).toContainText('걸린 필터 없음');
    await expect(page.locator('#filterState')).toContainText('12건 / 전체 12건');

    // 본문의 「필터 펼치기」가 사이트 헤더의 필터 패널을 연다
    await page.locator('#filterOpenBtn').click();
    await expect(page.locator('#header-drop')).toHaveClass(/is-open/);
    const panel = page.locator('#cg-filter-panel');
    await expect(panel).toBeVisible();

    await panel.locator('[data-group="region"][data-value="서울"]').click();
    await expect(dot).toBeVisible();
    await expect(panel.locator('[data-group="region"][data-value="서울"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#filterState')).toContainText('지역 서울');
    await expect(page.locator('#filterState')).toContainText('3건 / 전체 12건');

    // 날짜 빠른 버튼은 계산한 범위를 입력 칸에 채운다
    await panel.locator('[data-group="date"][data-value="month"]').click();
    await expect(panel.locator('[data-date="from"]')).toHaveValue('2026-11-01');
    await expect(panel.locator('[data-date="to"]')).toHaveValue('2026-11-30');
    await expect(page.locator('#filterState')).toContainText('1건 / 전체 12건');
    await panel.locator('[data-group="date"][data-value="all"]').click();

    // 검색: 넣는 즉시 적용되고, 지우기 버튼은 글자가 있을 때만 보인다
    await expect(panel.locator('[data-act="clear"]')).toBeHidden();
    await panel.locator('#cg-filter-search').fill('성탄');
    await expect(page.locator('#filterState')).toContainText('1건 / 전체 12건');
    await panel.locator('[data-act="clear"]').click();
    await expect(page.locator('#filterState')).toContainText('3건 / 전체 12건');

    // 리스트로 옮겨도 같은 필터가 걸려 있다
    await goToDoc(page, 'list.html');
    await expect(dot).toBeVisible();
    await expect(page.locator('#listSummary')).toContainText('총 3건');
    await expect(page.locator('#listSummary')).toContainText('필터 적용 중');

    // 초기화하면 점이 사라진다
    await page.locator('#header-filter-btn').click();
    await page.locator('#cg-filter-panel [data-act="reset"]').click();
    await expect(dot).toBeHidden();
    await expect(page.locator('#listSummary')).toHaveText('총 12건');

    // 결과가 0건이면 빈 상태를 보여 준다
    await page.locator('#cg-filter-panel #cg-filter-search').fill('없는 이름');
    await expect(page.locator('#listBody .empty')).toBeVisible();

    // 묶음 밖의 문서에는 필터 아이콘이 없다
    await goToHash(page, OTHER_DOC_HASH);
    await expect(page.locator('#header-title')).toHaveText('숫자 접두어');
    await expect(page.locator('#header-filter-btn')).toBeHidden();
    expect(errors).toEqual([]);
  });

  test('지도: 지역을 누르면 필터가 바뀌고, 지도 API 보기(흉내)와 범례 · 전체 화면이 동작한다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = collectErrors(page);
    await openDoc(page, 'map.html');
    await expect(page.locator('#mapSvg path.area')).toHaveCount(17);
    await expect(page.locator('#mapState')).toContainText('고른 지역 없음');

    await page.locator('#mapSvg path[data-area="제주"]').click();
    await expect(page.locator('#mapSvg path[data-area="제주"]')).toHaveClass(/is-sel/);
    await expect(page.locator('#mapState')).toContainText('제주');
    await expect(page.locator('#mapState')).toContainText('2건');
    await expect(page.locator('#header-filter-dot')).toBeVisible();
    await page.locator('#mapRemote [data-map="reset"]').click();
    await expect(page.locator('#header-filter-dot')).toBeHidden();

    // 지도 API 보기: 세 개 이상은 묶음, 누르면 풀린다
    await page.locator('#mapRemote [data-map="pin"]').click();
    await expect(page.locator('#mapSvg .cluster')).toHaveCount(2); // 서울 3건, 대구 3건
    await page.locator('#mapSvg .cluster[data-cluster="서울"]').click();
    await expect(page.locator('#mapSvg .cluster')).toHaveCount(1);
    await expect(page.locator('#mapSvg circle.pin').first()).toBeAttached();

    // 범례 끄기, 전체 화면은 Esc 로 돌아온다
    await expect(page.locator('#mapLegend')).toBeVisible();
    await page.locator('#mapRemote [data-map="legend"]').click();
    await expect(page.locator('#mapLegend')).toBeHidden();
    await page.locator('#mapRemote [data-map="full"]').click();
    await expect(page.locator('#mapCard')).toHaveClass(/is-full/);
    const full = await page.locator('#mapCard').boundingBox();
    expect(Math.round(full.width)).toBe(1280);
    expect(Math.round(full.height)).toBe(800);
    await page.keyboard.press('Escape');
    await expect(page.locator('#mapCard')).not.toHaveClass(/is-full/);
    expect(errors).toEqual([]);
  });

  test('단어 단축: 미리보기, 규칙 켜고 끄기, 단어 추가 · 삭제와 확인 문구', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = collectErrors(page);
    await openDoc(page, 'word-shortening.html');
    await expect(page.locator('#abbrOut')).toHaveText("2026 7' 서울 가을 국화 전");
    await expect(page.locator('#regexRules tr')).toHaveCount(3);
    await expect(page.locator('#wordRules tr')).toHaveCount(6);
    await expect(page.locator('#abbrResults tr')).toHaveCount(12);

    await page.locator('#rule-year').uncheck();
    await expect(page.locator('#abbrOut')).toHaveText("2026년 7' 서울 가을 국화 전");

    await page.locator('#abbrFrom').fill('국');
    await page.locator('#abbrAdd').click();
    await expect(page.locator('#abbrMsg')).toHaveText('원래 단어를 두 글자 이상 적어 주세요.');
    await page.locator('#abbrFrom').fill('국화');
    await page.locator('#abbrTo').fill('菊');
    await page.locator('#abbrAdd').click();
    await expect(page.locator('#wordRules tr')).toHaveCount(7);
    await expect(page.locator('#wordRules')).toContainText('추가함');
    await expect(page.locator('#abbrOut')).toHaveText("2026년 7' 서울 가을 菊 전");

    // 규칙은 기억된다
    await page.reload();
    await expect(page.locator('.cg-doc[data-cg-ready="1"]')).toBeVisible();
    await expect(page.locator('#wordRules tr')).toHaveCount(7);
    await expect(page.locator('#rule-year')).not.toBeChecked();
    await page.locator('#wordRules tr').last().locator('[data-word-del]').click();
    await expect(page.locator('#wordRules tr')).toHaveCount(6);

    await page.locator('#abbrToggle').click();
    await expect(page.locator('#abbrToggle')).toHaveAttribute('aria-pressed', 'false');
    expect(errors).toEqual([]);
  });

  test('화면 · 구조: 공통 아이콘 표, 전환 속도 비교, 워커 계산', async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = collectErrors(page);
    await openDoc(page, 'screen.html');
    await expect(page.locator('#iconGrid .icon-tile')).toHaveCount(34);
    // 아이콘 그림이 실제로 아이콘 모음에 있다 (빈 <use> 가 없다)
    const missing = await page.locator('#iconGrid use').evaluateAll(uses => uses.map(use => use.getAttribute('href')).filter(href => !document.querySelector(href)));
    expect(missing).toEqual([]);
    await page.locator('#playBtn').click();
    await expect(page.locator('#tracks')).toHaveClass(/is-on/);

    await goToDoc(page, 'architecture.html');
    await expect.poll(async () => Number(await page.locator('#aliveOut').textContent())).toBeGreaterThan(2);
    await page.locator('#runWorker').click();
    await expect(page.locator('#demoOut')).toContainText('화면이 살아 있음', { timeout: 60000 });
    await expect(page.locator('#demoOut')).toContainText('소수 539,777개');
    await expect(page.locator('#runWorker')).toBeEnabled();
    expect(errors).toEqual([]);
  });
});

test.describe('WebApp Common GUI: 스타일이 다른 문서로 새지 않는다', () => {
  // 묶음 밖 문서의 모양을 숫자로 적어 둔다
  async function snapshotOtherDoc(page) {
    await expect(page.locator('#header-title')).toHaveText('숫자 접두어');
    await expect(page.locator('article table').first()).toBeVisible();
    // 사이드 패널이 열려 있으면 본문 폭이 달라지므로, 재기 전에 접어서 같은 조건으로 맞춘다
    if (!(await page.locator('#sidebar-panel').evaluate(el => el.classList.contains('collapsed')))) {
      await page.locator('#header-menu-btn').click();
      await expect(page.locator('#sidebar-panel')).toHaveClass(/collapsed/);
      await page.waitForTimeout(500);
    }
    // 방금 누른 단추에 남은 호버 · 초점 색이 재어지지 않게 마우스를 본문 쪽으로 옮기고 초점을 푼다
    await page.mouse.move(640, 500);
    await page.evaluate(() => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); });
    await page.waitForTimeout(700); // 색 전환이 끝난 뒤에 잰다
    return page.evaluate(() => {
      const pick = (selector, props) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const style = getComputedStyle(el);
        return props.map(prop => style.getPropertyValue(prop));
      };
      return {
        article: pick('#app-main > article', ['background-color', 'box-shadow', 'color', 'margin-top', 'width']),
        h1: pick('article h1', ['margin-top', 'padding-top', 'border-bottom-width', 'font-size', 'width']),
        table: pick('article table', ['margin-top', 'border-top-width', 'font-family', 'font-size', 'border-collapse']),
        thead: pick('article table thead', ['background-color', 'color', 'position']),
        td: pick('article table td', ['text-align', 'padding-left', 'border-top-width', 'line-height']),
        menuButton: pick('#header-menu-btn', ['border-top-left-radius', 'background-color', 'width']),
        selectedTab: pick('#header-tabs .app-tab[aria-selected="true"]', ['background-color', 'color']),
        radiusToken: getComputedStyle(document.documentElement).getPropertyValue('--r-md').trim(),
        bodyBackground: getComputedStyle(document.body).backgroundColor,
        leftovers: document.querySelectorAll('.cg, .cg-region-overlay, #nav-page-cg-preview, #cg-filter-panel, #cg-settings-panel').length
      };
    });
  }

  test('이 묶음을 다녀온 뒤에도 다른 문서(숫자 접두어)의 계산된 스타일이 그대로다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = collectErrors(page);
    await page.goto('/index.html' + OTHER_DOC_HASH);
    const before = await snapshotOtherDoc(page);
    expect(before.leftovers).toBe(0);
    expect(before.article[0]).toBe('rgb(255, 255, 255)');

    // 다녀오는 동안 스타일시트가 붙고, 뼈대에도 손을 댄다 (영역 표시 · 모서리 · 필터 패널)
    await goToDoc(page, 'calendar.html');
    await expect(page.locator('link[rel="stylesheet"][href="/modules/features/common-gui-demo.css"]')).toHaveCount(1);
    await expect(page.locator('#app-main > article')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await page.locator(RAIL_ITEM).click();
    await page.locator('#cg-region-btn').click();
    await page.locator('#cg-radius-range').fill('0');
    await page.locator('#header-filter-btn').click();
    await page.locator('#cg-filter-panel [data-group="cat"][data-value="전시"]').click();
    await goToDoc(page, 'list.html');
    await goToDoc(page, 'screen.html');

    await goToHash(page, OTHER_DOC_HASH);
    const after = await snapshotOtherDoc(page);
    expect(after).toEqual(before);
    // 스타일시트는 남아 있지만 아무 것도 건드리지 않는다
    await expect(page.locator('link[rel="stylesheet"][href="/modules/features/common-gui-demo.css"]')).toHaveCount(1);

    // 홈 화면의 선택 버튼(.pill-btn)도 그대로다
    await goToHash(page, '#/');
    await expect(page.locator('#site-history')).toBeVisible();
    await expect(page.locator(RAIL_ITEM)).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('좁은 화면: 서랍 안에서도 미리보기 설정이 보이고, 달력은 점 달력으로 바뀐다', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const errors = collectErrors(page);
    await openDoc(page, 'calendar.html');
    await expect(page.locator('#yearStack .day-cell.is-dot').first()).toBeAttached();
    await expect(page.locator('#yearStack .event-chip')).toHaveCount(0);
    // 본문이 가로로 넘치지 않는다
    const overflow = await page.evaluate(() => { const main = document.getElementById('app-main'); return main.scrollWidth - main.clientWidth; });
    expect(overflow).toBeLessThanOrEqual(1);

    await page.locator('#header-menu-btn').click();
    await expect(page.locator('#sidebar-container')).toHaveClass(/active/);
    await expect(page.locator(RAIL_ITEM)).toBeVisible();
    await page.locator(RAIL_ITEM).click();
    await expect(page.locator('#cg-region-btn')).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe('WebApp Common GUI: 보고서 · 그림 보기 견본 (슬라이드 모듈)', () => {
  test('보고서: 슬라이드 세 장과 규칙 요약이 사이트 뼈대 안에 그려지고, 규칙 탭으로 이어진다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = collectErrors(page);
    await page.goto('/index.html' + BASE + 'report.html');
    const doc = page.locator('article .slides-doc[data-page="cg-report"]');
    await expect(doc).toBeVisible();
    await expect(page.locator('#header-title')).toHaveText('보고서');
    await expect(page.locator('#header-tabs .app-tab[aria-selected="true"]')).toHaveText('보고서');
    await expect(doc.locator('.slide')).toHaveCount(3);
    await expect(doc.locator('.sl-full')).toHaveCount(3);
    await expect(doc.locator('.slide-no')).toHaveText(['1', '2', '3']);
    await expect(doc.locator('.slide h1, .slide h2')).toHaveCount(0);
    await expect(doc.locator('#report-rules table tbody tr')).toHaveCount(12);

    // 전체 화면을 열고 닫는다
    await doc.locator('#r-1 .sl-full').click();
    await expect(doc).toHaveClass(/is-full/);
    await page.keyboard.press('Escape');
    await expect(doc).not.toHaveClass(/is-full/);

    // 규칙 요약의 링크가 md 규칙 문서를 연다
    await doc.locator('#report-rules a[href$="report.md"]').click();
    await expect(page.locator('#header-tabs .app-tab[aria-selected="true"]')).toHaveText('보고서');
    await expect(page.locator('#header-tabs .app-tab')).toHaveCount(16);   // 규칙 묶음의 문서 16개
    await expect(page.locator('article h1').first()).toBeVisible();
    await page.waitForTimeout(400);
    expect(errors).toEqual([]);
  });

  test('그림 보기: 본문의 그림은 창 전체에서, 슬라이드 안의 그림은 슬라이드 안에서 열린다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = collectErrors(page);
    await page.goto('/index.html' + BASE + 'image-viewer.html');
    const doc = page.locator('article .slides-doc[data-page="cg-viewer"]');
    await expect(doc).toBeVisible();
    await expect(page.locator('#header-tabs .app-tab[aria-selected="true"]')).toHaveText('그림 보기');
    await expect(doc.locator('a[data-view]')).toHaveCount(6);

    // 그림 파일이 모두 실제로 읽힌다
    const broken = await doc.locator('a[data-view] img').evaluateAll(list => list.filter(img => !(img.complete && img.naturalWidth > 0)).length);
    expect(broken).toBe(0);

    // 본문의 그림: 셋 가운데 첫째가 열리고, 오른쪽 화살표로 넘어간다
    await doc.locator('#v-body a[data-view]').first().click();
    const viewer = page.locator('.sl-viewer');
    await expect(viewer).toBeVisible();
    await expect(viewer).toContainText('1 / 3');
    await page.keyboard.press('ArrowRight');
    await expect(viewer).toContainText('2 / 3');
    await page.keyboard.press('Escape');
    await expect(viewer).toHaveCount(0);

    // 슬라이드 안의 그림: 그 슬라이드 안에서 열린다
    await doc.locator('#v-slide a[data-view]').first().click();
    await expect(page.locator('#v-slide .slide .sl-viewer')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.sl-viewer')).toHaveCount(0);
    await page.waitForTimeout(400);
    expect(errors).toEqual([]);
  });
});

test.describe('WebApp Common GUI 규칙: md 규칙 문서 묶음', () => {
  const RULES = ['screen', 'calendar', 'list', 'map', 'filter', 'word-shortening', 'architecture', 'conveniences', 'settings', 'login', 'install', 'icons', 'report', 'image-viewer', 'push', 'changes'];

  test('규칙 문서 16개가 모두 사이트 뼈대 안에서 열리고, 문서 사이 링크가 끊기지 않는다', async ({ page, request }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = collectErrors(page);
    await page.goto('/index.html' + BASE + 'rules/screen.md');
    await expect(page.locator('#header-tabs .app-tab')).toHaveCount(RULES.length);

    const targets = new Set();
    for (const name of RULES) {
      await goToHash(page, BASE + 'rules/' + name + '.md');
      await expect(page.locator('#header-tabs .app-tab[aria-selected="true"]')).toBeVisible();
      await expect(page.locator('article :is(h1, h2, table)').first()).toBeVisible();
      // 옮기기 전의 자리(reference/, design/)를 가리키는 말이 남아 있지 않다
      await expect(page.locator('article')).not.toContainText(/reference\/|design\/\d\d/);
      const links = await page.locator('article a[href*="/column/ai/webapp-common-gui/"]').evaluateAll(list => list.map(a => a.getAttribute('href')));
      links.forEach(href => targets.add(href.replace(/^#/, '')));
    }
    expect(targets.size).toBeGreaterThan(10);
    for (const target of targets) {
      const response = await request.get(target);
      expect(response.status(), target).toBe(200);
    }
    expect(errors).toEqual([]);
  });
});
