const { test, expect } = require('@playwright/test');

// 사이트맵 패널을 연다 (넓은 화면에서는 레일의 사이트맵 아이콘으로 연다)
async function openSitemap(page) {
  const tree = page.locator('#sitemap-tree');
  if (!(await tree.isVisible())) await page.locator('#nav-sitemap').click();
  await expect(tree).toBeVisible();
  return tree;
}

function folder(page, name) {
  return page.locator('#sitemap-tree li.folder').filter({
    has: page.locator(':scope > .tree-row > .tree-label', { hasText: new RegExp(`^${name}$`) })
  });
}

test.describe('사이트맵 트리', () => {
  test('최상위는 수학 · 과학 · 공학 · 칼럼 · SH Standard이고, 묶음마다 안에 든 글 수가 나온다', async ({ page }) => {
    await page.goto('/index.html');
    const tree = await openSitemap(page);

    await expect(tree.locator(':scope > li > .tree-row > .tree-label')).toHaveText(['수학', '과학', '공학', '칼럼', 'SH Standard']);

    // 글 수는 hierarchy.json 에서 센 값과 같다
    const expected = await page.evaluate(() => {
      const Hierarchy = window.SiteModules.Hierarchy;
      return window.SiteModules.hierarchyListCached.map(item => `(${Hierarchy.countPages(item)})`);
    });
    await expect(tree.locator(':scope > li > .tree-row > .tree-count')).toHaveText(expected);

    // 글이 아직 없는 묶음도 (0) 으로 보인다
    await folder(page, '수학').locator(':scope > .tree-row').click();
    await expect(folder(page, '중등 수학').locator(':scope > .tree-row > .tree-count')).toHaveText('(0)');
  });

  test('묶음은 줄을 눌러 접고 편다', async ({ page }) => {
    await page.goto('/index.html');
    await openSitemap(page);

    const math = folder(page, '수학');
    await expect(math).toHaveClass(/collapsed/);
    await math.locator(':scope > .tree-row').click();
    await expect(math).not.toHaveClass(/collapsed/);
    await expect(folder(page, '고등 수학')).toBeVisible();
    await math.locator(':scope > .tree-row').click();
    await expect(math).toHaveClass(/collapsed/);
  });

  test('개론이 있는 묶음(과학)은 이름을 누르면 개론이 열리고 하위 목록이 펼쳐진다', async ({ page }) => {
    await page.goto('/index.html');
    await openSitemap(page);

    const science = folder(page, '과학');
    await science.locator(':scope > .tree-row > a.tree-label').click();
    await expect(page).toHaveURL(/#\/science\/index\.html$/);
    await expect(page.locator('#app-main article svg').first()).toBeVisible();
    await expect(science).not.toHaveClass(/collapsed/);
    await expect(science).toHaveClass(/this-doc/);
    await expect(folder(page, '중학')).toBeVisible();

    // 이름을 다시 누르면 접히고, 문서는 그대로다. 한 번 더 누르면 다시 펼쳐진다
    await science.locator(':scope > .tree-row > a.tree-label').click();
    await expect(science).toHaveClass(/collapsed/);
    await expect(page).toHaveURL(/#\/science\/index\.html$/);
    await science.locator(':scope > .tree-row > a.tree-label').click();
    await expect(science).not.toHaveClass(/collapsed/);

    // 화살표로도 접는다
    await science.locator(':scope > .tree-row > .tree-toggle').click();
    await expect(science).toHaveClass(/collapsed/);

    // 펼쳐진 채 그 안의 문서를 보고 있을 때 이름을 누르면: 접지 않고 개론으로 간다
    await page.goto('/index.html#/science/middle/first/force.html');
    await expect(science).not.toHaveClass(/collapsed/);
    await science.locator(':scope > .tree-row > a.tree-label').click();
    await expect(page).toHaveURL(/#\/science\/index\.html$/);
    await expect(science).not.toHaveClass(/collapsed/);
  });

  test('과학 개론의 칸을 누르면 그 문서로 간다', async ({ page }) => {
    await page.goto('/index.html#/science/index.html');
    // 칸 위의 글자는 눌림을 칸에 넘기므로, 칸 한가운데(글자 위)를 눌러도 간다
    const box = page.locator('#app-main article svg.science-map .link rect').first();
    await expect(box).toBeVisible();
    await box.click();
    await expect(page).toHaveURL(/#\/science\/middle\/first\/geosphere\.html$/);
    await expect(page.locator('#sitemap-tree li.this-doc > a')).toHaveText(/.+/);
    await expect(page.locator('.error-state')).toHaveCount(0);
  });

  test('개론이 없는 하위 묶음을 열면 가장 가까운 위쪽 묶음의 개론이 열리고, 접을 때는 문서가 바뀌지 않는다', async ({ page }) => {
    await page.goto('/index.html#/science/middle/first/force.html');
    await openSitemap(page);

    // 과학 > 고등 은 개론이 없다: 열면 과학의 개론이 열린다
    const high = folder(page, '고등');
    await high.locator(':scope > .tree-row').click();
    await expect(page).toHaveURL(/#\/science\/index\.html$/);
    await expect(high).not.toHaveClass(/collapsed/);
    await expect(folder(page, '과학')).toHaveClass(/this-doc/);

    // 접을 때는 그대로
    await page.goto('/index.html#/science/middle/first/force.html');
    await high.locator(':scope > .tree-row').click();
    await expect(high).toHaveClass(/collapsed/);
    await expect(page).toHaveURL(/force\.html$/);

  });

  test('개론 문서가 어디에도 없는 묶음은 하위 목록을 보여 주는 자동 개론이 열린다', async ({ page }) => {
    await page.goto('/index.html');
    await openSitemap(page);

    // 공학: 하위 묶음 여섯 개가 카드로 나온다
    const engineering = folder(page, '공학');
    await engineering.locator(':scope > .tree-row').click();
    await expect(page.locator('#header-title')).toHaveText('공학');
    await expect(engineering).toHaveClass(/this-doc/);
    await expect(engineering).not.toHaveClass(/collapsed/);
    const cards = page.locator('article .auto-overview-card');
    await expect(cards.locator('.auto-overview-name')).toContainText(['프로그래밍 언어', '웹', '표현 기법', '개발 도구', '자격증']);
    expect(await page.evaluate(() => window.SiteModules.state.currentPath)).toBe('/sitemap/공학');

    // 글 수는 트리와 같다
    const treeCount = await folder(page, '표현 기법').locator(':scope > .tree-row > .tree-count').textContent();
    await expect(cards.filter({ hasText: '표현 기법' }).locator('.auto-overview-count')).toHaveText(treeCount);

    // 카드를 누르면 그 묶음의 자동 개론으로 가고, 트리도 따라 펼쳐진다
    await cards.filter({ hasText: '표현 기법' }).click();
    await expect(page.locator('#header-title')).toHaveText('표현 기법');
    await expect(page.locator('#title-container')).toContainText('공학');
    await expect(folder(page, '표현 기법')).toHaveClass(/this-doc/);
    await expect(folder(page, '표현 기법')).not.toHaveClass(/collapsed/);
    // 묶음은 카드, 낱개 문서는 목록
    await expect(page.locator('article .auto-overview-card .auto-overview-name')).toContainText(['글자', '베지어 곡선']);
    await expect(page.locator('article .auto-overview-pages a')).toHaveText(['진법', '정규표현식', 'LaTeX']);

    // 목록의 문서를 누르면 그 문서가 열린다
    await page.locator('article .auto-overview-pages a').first().click();
    await expect(page).toHaveURL(/#\/engineering\/representation\/binary\/binary\.html$/);
    await expect(page.locator('.error-state')).toHaveCount(0);

    // 이름을 다시 누르면: 다른 문서를 보는 중이므로 접지 않고 자동 개론으로 돌아간다. 한 번 더 누르면 접힌다
    await folder(page, '표현 기법').locator(':scope > .tree-row > .tree-label').click();
    await expect(page.locator('#header-title')).toHaveText('표현 기법');
    await expect(folder(page, '표현 기법')).not.toHaveClass(/collapsed/);
    await folder(page, '표현 기법').locator(':scope > .tree-row > .tree-label').click();
    await expect(folder(page, '표현 기법')).toHaveClass(/collapsed/);
  });

  test('자동 개론: 글이 없는 묶음은 안내가 나오고, 주소로 바로 들어와도 열리며, 없는 묶음은 오류 안내가 나온다', async ({ page }) => {
    await page.goto('/index.html#/sitemap/수학/중등 수학');
    await expect(page.locator('#header-title')).toHaveText('중등 수학');
    await expect(page.locator('article .auto-overview-lead')).toHaveText('아직 글이 없습니다.');
    await openSitemap(page);
    await expect(folder(page, '중등 수학')).toHaveClass(/this-doc/);
    await expect(folder(page, '수학')).not.toHaveClass(/collapsed/);

    // 개론 문서가 있는 하위 묶음(초등 수학)의 카드는 그 개론 문서로 간다
    await page.goto('/index.html#/sitemap/수학');
    await page.locator('article .auto-overview-card', { hasText: '초등 수학' }).click();
    await expect(page).toHaveURL(/#\/math\/elementary\/index\.html$/);

    await page.goto('/index.html#/sitemap/없는 묶음');
    await expect(page.locator('.error-state')).toBeVisible();
  });

  test('초등 수학의 개론은 목록에 따로 나오지 않고 묶음의 이름으로 열린다', async ({ page }) => {
    await page.goto('/index.html');
    await openSitemap(page);
    await folder(page, '수학').locator(':scope > .tree-row').click();

    const elementary = folder(page, '초등 수학');
    await expect(elementary.locator(':scope > .tree-row > .tree-count')).toHaveText('(8)');
    await elementary.locator(':scope > .tree-row > a.tree-label').click();
    await expect(page).toHaveURL(/#\/math\/elementary\/index\.html$/);
    await expect(elementary.locator(':scope > ul > li > a')).toHaveCount(8);
    await expect(elementary.locator(':scope > ul > li > a', { hasText: /^개론$/ })).toHaveCount(0);

    // 헤더 탭: 개론 + 공개된 8편(4-2 · 5-2 · 6-1 · 6-2 는 개발중). 안의 문서로 가도 개론 탭이 맨 앞에 남는다
    const tabs = page.locator('#header-tabs .app-tab');
    await expect(tabs).toHaveCount(9);
    await expect(tabs.first()).toHaveText('개론');
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
    await page.goto('/index.html#/math/elementary/1-1.html');
    await expect(tabs).toHaveCount(9);
    await expect(tabs.first()).toHaveText('개론');
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  });

  test('좁은 화면: 묶음을 열어 개론이 열려도 서랍은 닫히지 않고, 문서를 고르면 닫힌다', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/index.html');
    await page.locator('#header-menu-btn').click();
    const container = page.locator('#sidebar-container');
    await expect(container).toHaveClass(/active/);
    await openSitemap(page);

    await folder(page, '과학').locator(':scope > .tree-row > a.tree-label').click();
    await expect(page).toHaveURL(/#\/science\/index\.html$/);
    await expect(container).toHaveClass(/active/);

    await folder(page, '중학').locator(':scope > .tree-row').click();
    await expect(container).toHaveClass(/active/);
    await folder(page, '1학년').first().locator(':scope > .tree-row').click();
    await expect(container).toHaveClass(/active/);

    // 문서를 고르면 서랍이 닫힌다
    await folder(page, '1학년').first().locator(':scope > ul > li > a').first().click();
    await expect(page).toHaveURL(/#\/science\/middle\/first\//);
    await expect(container).not.toHaveClass(/active/);
  });

  test('분류만 옮기고 폴더는 그대로인 문서도 제 주소로 열리고, 지금 문서까지의 가지가 펼쳐진다', async ({ page }) => {
    // 공학 > 프로그래밍 언어 > C 는 /engineering/language/C/ 폴더 그대로다
    await page.goto('/index.html#/engineering/language/C/start.html');
    await openSitemap(page);

    await expect(page.locator('#sitemap-tree li.this-doc > a')).toHaveAttribute('href', '/engineering/language/C/start.html');
    for (const name of ['공학', '프로그래밍 언어', 'C']) {
      await expect(folder(page, name)).not.toHaveClass(/collapsed/);
    }
    await expect(folder(page, '수학')).toHaveClass(/collapsed/);
    await expect(page.locator('#title-container')).toContainText('공학 > 프로그래밍 언어 > C');
  });

  test('같은 단계에서는 묶음이 위쪽, 낱개 문서가 아래쪽에 놓인다', async ({ page }) => {
    await page.goto('/index.html');
    await openSitemap(page);
    await folder(page, '공학').locator(':scope > .tree-row').click();
    const group = folder(page, '표현 기법');
    await group.locator(':scope > .tree-row').click();

    // 표현 기법: 묶음(글자, 베지어 곡선)이 먼저, 낱개 문서(진법, 정규표현식, LaTeX)가 뒤
    await expect(group.locator(':scope > ul > li > .tree-row > .tree-label, :scope > ul > li > a.tree-label'))
      .toHaveText(['글자', '베지어 곡선', '진법', '정규표현식', 'LaTeX']);

    // 베지어 곡선 묶음: 이론과 시뮬레이터
    const bezier = folder(page, '베지어 곡선');
    await bezier.locator(':scope > .tree-row').click();
    await expect(bezier.locator(':scope > ul > li > a')).toHaveText(['이론', '시뮬레이터']);
    await expect(bezier.locator(':scope > ul > li.is-app > a')).toHaveAttribute('href', '/small-project/Bezier/index.html');
  });

  test('시뮬레이터는 주제 옆에 놓이고 표시가 붙는다', async ({ page }) => {
    await page.goto('/index.html');
    await openSitemap(page);
    await folder(page, '수학').locator(':scope > .tree-row').click();

    const apps = page.locator('#sitemap-tree li.is-app > a');
    await expect(apps.filter({ hasText: '수기로 제곱근 구하기' })).toHaveAttribute('href', '/small-project/manualSqrt/index.html');
    await expect(page.locator('#sitemap-tree a[href*="youtube_skip"]')).toHaveCount(0);
  });
});
