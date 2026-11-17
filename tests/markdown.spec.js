const { test, expect } = require('@playwright/test');

// 시험용 마크다운 문서: 실제 파일을 두지 않고 요청을 가로채 돌려준다 (tests/fixtures 는 git 에 올라가지 않는다)
const MD_DIR = '/tests/md-docs/';
const SAMPLE_MD = [
  '---',
  'title: 머리말 제목',
  'description: 머리말은 본문에 나오지 않는다',
  '---',
  '# 샘플 문서 제목',
  '',
  '첫 문단 **굵게** *기울임* `inline<code>` snake_case_name <b id="raw-html">날것</b>',
  '[안전하지 않은 링크](javascript:alert(1)) [옆 문서](second.md) [바깥](https://example.com/a_b)',
  '',
  '## 첫째 장',
  '',
  '### 첫째 절',
  '',
  '1. 하나',
  '   - 하나의 가',
  '   - 하나의 나',
  '2. 둘',
  '',
  '- [x] 끝낸 일',
  '- [ ] 남은 일',
  '',
  '> 인용 문단',
  '> ## 인용 안의 제목',
  '',
  '### 둘째 절',
  '',
  '| 왼쪽 | 가운데 | 오른쪽 |',
  '| :--- | :---: | ---: |',
  '| a | `x\\|y` | 3 |',
  '| b | c |',
  '',
  '## 둘째 장',
  '',
  '```js',
  'const tag = "<b>";',
  '# 제목이 아니다',
  '```',
  '',
  '![그림](img/pic.png)',
  '',
  '---',
  '',
  '마지막 문단  ',
  '줄바꿈'
].join('\n');
const SECOND_MD = '# 둘째 문서\n\n## 유일한 장\n\n둘째 문서의 본문\n';

// hierarchy.json 에 시험용 묶음(마크다운 문서 둘)을 더하고, 그 문서 요청에는 위의 원문을 돌려준다
async function mockMarkdownDocs(page) {
  await page.route('**/hierarchy.json', async route => {
    const response = await route.fetch();
    const list = await response.json();
    list.push({
      주제: 'MD 시험',
      디렉토리: MD_DIR.slice(1),
      목록: [
        { 주제: '샘플', 디렉토리: '', 파일명: 'sample.md' },
        { 주제: '둘째', 디렉토리: '', 파일명: 'second.md' }
      ]
    });
    await route.fulfill({ response, json: list });
  });
  const fulfillMarkdown = (body) => route => route.fulfill({
    status: 200,
    contentType: 'text/markdown; charset=utf-8',
    headers: { 'Last-Modified': 'Tue, 10 Nov 2026 03:00:00 GMT' },
    body
  });
  await page.route(`**${MD_DIR}sample.md`, fulfillMarkdown(SAMPLE_MD));
  await page.route(`**${MD_DIR}second.md`, fulfillMarkdown(SECOND_MD));
}

test.describe('마크다운 문서 보기', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mockMarkdownDocs(page);
  });

  test('.md 원문을 받아 제목 · 목록 · 표 · 코드로 그린다', async ({ page }) => {
    const requested = [];
    page.on('request', request => { if (request.url().endsWith('sample.md')) requested.push(request.url()); });
    await page.goto(`/index.html#${MD_DIR}sample.md`);

    const article = page.locator('article');
    await expect(article.locator('h1').first()).toBeVisible();
    expect(requested.length).toBe(1);

    // 제목 단계: "# 제목"은 본문에서 빠지고 "## 장"이 h1, "### 절"이 h2 가 된다
    await expect(article.locator('h1')).toHaveText(['첫째 장', '둘째 장']);
    await expect(article.locator('h2')).toHaveText(['첫째 절', '둘째 절']);
    await expect(article).not.toContainText('샘플 문서 제목');
    await expect(article).not.toContainText('머리말은 본문에 나오지 않는다');
    // 인용 안의 제목은 목차에 끼지 않게 굵은 문단으로
    await expect(article.locator('blockquote.md-quote p.md-heading')).toHaveText('인용 안의 제목');

    // 문단 안 문법, 그리고 원문 속 HTML 은 글자로만 보인다
    const firstParagraph = article.locator('p').first();
    await expect(firstParagraph.locator('strong')).toHaveText('굵게');
    await expect(firstParagraph.locator('em')).toHaveText('기울임');
    await expect(firstParagraph.locator('code')).toHaveText('inline<code>');
    await expect(firstParagraph).toContainText('snake_case_name <b id="raw-html">날것</b>');
    await expect(page.locator('#raw-html')).toHaveCount(0);

    // 링크: 허용하지 않는 스킴은 글자만, 상대 경로는 문서 폴더 기준, 바깥 링크는 새 탭
    await expect(firstParagraph.locator('a')).toHaveCount(2);
    await expect(firstParagraph.locator('a').nth(0)).toHaveAttribute('href', `${MD_DIR}second.md`);
    await expect(firstParagraph.locator('a').nth(1)).toHaveAttribute('href', 'https://example.com/a_b');
    await expect(firstParagraph.locator('a').nth(1)).toHaveAttribute('target', '_blank');
    await expect(article.locator('img.md-img')).toHaveAttribute('src', `${MD_DIR}img/pic.png`);

    // 목록: 중첩과 할 일
    await expect(article.locator('ol > li')).toHaveCount(2);
    await expect(article.locator('ol > li').first().locator('ul > li')).toHaveText(['하나의 가', '하나의 나']);
    await expect(article.locator('li input[type="checkbox"]')).toHaveCount(2);
    await expect(article.locator('li input[type="checkbox"]').first()).toBeChecked();

    // 표: 정렬 줄과 \| , 모자란 칸은 빈 칸
    const table = article.locator('table.md-table');
    await expect(table).toHaveCount(1);
    await expect(table.locator('thead th')).toHaveText(['왼쪽', '가운데', '오른쪽']);
    await expect(table.locator('tbody tr')).toHaveCount(2);
    await expect(table.locator('tbody tr').first().locator('td')).toHaveText(['a', 'x|y', '3']);
    await expect(table.locator('tbody tr').nth(1).locator('td')).toHaveCount(3);
    expect(await table.locator('tbody tr').first().locator('td').evaluateAll(cells => cells.map(cell => getComputedStyle(cell).textAlign)))
      .toEqual(['left', 'center', 'right']);

    // 코드 울타리: 언어 클래스를 지키고 안쪽은 문법으로 풀지 않는다
    const code = article.locator('pre code.language-js');
    await expect(code).toHaveCount(1);
    await expect(code).toContainText('const tag = "<b>";');
    await expect(code).toContainText('# 제목이 아니다');
    await expect(article.locator('hr')).toHaveCount(1);
    await expect(article.locator('p', { hasText: '마지막 문단' }).locator('br')).toHaveCount(1);
  });

  test('헤더 제목 · 형제 문서 탭 · 목차 · 문서 머리가 HTML 문서와 같이 나온다', async ({ page }) => {
    await page.goto(`/index.html#${MD_DIR}sample.md`);
    await expect(page.locator('article h1').first()).toBeVisible();

    // 제목은 hierarchy.json 의 주제
    await expect(page.locator('#header-title')).toHaveText('샘플');
    await expect(page.locator('#title-container .doc-title-text')).toHaveText('샘플');
    await expect(page.locator('#title-container')).toContainText('MD 시험');
    await expect(page.locator('#last-modified')).toContainText('2026-11-10');

    const tabs = page.locator('#header-tabs .app-tab');
    await expect(tabs).toHaveText(['샘플', '둘째']);
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');

    await page.locator('#nav-toc').click();
    await expect(page.locator('#toc-tree a')).toHaveCount(4);
    await expect(page.locator('#toc-tree a').first()).toHaveText('1. 첫째 장');
    await expect(page.locator('#toc-tree a').nth(1)).toContainText('1-1. 첫째 절');
    await expect(page.locator('#toc-tree a').nth(3)).toHaveText('2. 둘째 장');

    // 목차 항목을 누르면 같은 문서 안에서 그 제목으로 간다 (문서를 다시 받지 않는다)
    await page.locator('#toc-tree a').nth(3).click();
    await expect(page).toHaveURL(/sample\.md#/);
    await expect(page.locator('article h1').nth(1)).toBeInViewport();

    // 탭으로 형제 마크다운 문서로 옮긴다
    await tabs.nth(1).click();
    await expect(page).toHaveURL(new RegExp(`#${MD_DIR}second\\.md$`));
    await expect(page.locator('#header-title')).toHaveText('둘째');
    await expect(page.locator('article h1')).toHaveText(['유일한 장']);
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  });

  test('본문과 사이트맵의 .md 링크는 새로 고침 없이 SPA 로 열린다', async ({ page }) => {
    await page.goto(`/index.html#${MD_DIR}sample.md`);
    await expect(page.locator('article h1').first()).toBeVisible();
    await page.evaluate(() => { window.__stillSamePage = true; });

    await page.locator('article a', { hasText: '옆 문서' }).click();
    await expect(page).toHaveURL(new RegExp(`/index\\.html#${MD_DIR}second\\.md$`));
    await expect(page.locator('article h1')).toHaveText(['유일한 장']);

    await page.locator(`#sitemap-tree a[href$="sample.md"]`).evaluate(link => link.click());
    await expect(page).toHaveURL(new RegExp(`/index\\.html#${MD_DIR}sample\\.md$`));
    await expect(page.locator('article h1')).toHaveText(['첫째 장', '둘째 장']);
    expect(await page.evaluate(() => window.__stillSamePage)).toBe(true);
  });

  test('다녀오면 보던 스크롤 자리로 돌아오고, 공유는 .md 주소를 복사한다', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.setViewportSize({ width: 1280, height: 400 });
    await page.goto(`/index.html#${MD_DIR}sample.md`);
    await expect(page.locator('article h1').first()).toBeVisible();

    await page.evaluate(() => document.getElementById('app-main').scrollTo({ top: 300, behavior: 'instant' }));
    await expect.poll(() => page.evaluate(() => Math.round(document.getElementById('app-main').scrollTop))).toBe(300);
    await page.evaluate(() => { window.location.hash = '#/info.html'; });
    await expect(page.locator('#header-title')).toHaveText('사이트 소개');
    await page.evaluate(dir => { window.location.hash = `#${dir}sample.md`; }, MD_DIR);
    await expect(page.locator('#header-title')).toHaveText('샘플');
    await expect.poll(() => page.evaluate(() => Math.round(document.getElementById('app-main').scrollTop))).toBe(300);

    await page.locator('#header-share-btn').click();
    await expect(page.locator('#header-toast')).toHaveText('주소를 복사했습니다');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(`#${MD_DIR}sample.md`);
  });

  test('없는 .md 문서는 오류 안내를 보여 주고, 다른 화면으로 옮길 수 있다', async ({ page }) => {
    await page.goto(`/index.html#${MD_DIR}없는-문서.md`);

    const errorBox = page.locator('.error-state');
    await expect(errorBox).toBeVisible();
    await expect(errorBox).toContainText('문제가 생겼습니다');
    await expect(page.locator('#error-retry-btn')).toBeVisible();
    await expect(page.locator('#header-title')).toHaveText('문제가 생겼습니다');

    await page.evaluate(dir => { window.location.hash = `#${dir}sample.md`; }, MD_DIR);
    await expect(page.locator('.error-state')).toHaveCount(0);
    await expect(page.locator('article h1')).toHaveText(['첫째 장', '둘째 장']);
  });

  test('제목 단계 규칙: # 이 여럿이면 그대로, 제목만 있으면 본문에서 뺀다', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#app-header')).toBeVisible();

    const results = await page.evaluate(() => {
      const md = window.SiteModules.Markdown;
      return {
        multi: md.render('# 가\n\n# 나\n\n## 다'),
        noTitle: md.parse('## 장\n\n### 절\n\n#### 항'),
        titled: md.parse('# 제목 **굵게**\n\n본문'),
        frontmatter: md.parse('---\ntitle: "머리말 제목"\ntags: a, b\n---\n# 제목\n\n본문'),
        unsafe: md.render('[a](JaVaScRiPt:alert(1)) [b](data:text/html,x) [c](//evil.example/x) ![d](javascript:x)')
      };
    });
    expect(results.multi).toContain('<h1>가</h1>');
    expect(results.multi).toContain('<h1>나</h1>');
    expect(results.multi).toContain('<h2>다</h2>');
    expect(results.noTitle.html).toContain('<h1>장</h1>');
    expect(results.noTitle.html).toContain('<h2>절</h2>');
    expect(results.noTitle.html).toContain('<h3>항</h3>');
    expect(results.noTitle.title).toBe('');
    expect(results.titled.title).toBe('제목 굵게');
    expect(results.titled.html.trim()).toBe('<p>본문</p>');
    expect(results.frontmatter.title).toBe('머리말 제목');
    expect(results.frontmatter.meta.tags).toBe('a, b');
    expect(results.frontmatter.html.trim()).toBe('<p>본문</p>');
    expect(results.unsafe).not.toContain('<a');
    expect(results.unsafe).not.toContain('<img');
  });
});

test.describe('칼럼 > AI 의 마크다운 문서', () => {
  test('Full Code Review Checklist 가 장 6개 · 표 5개 · 코드 1개로 보인다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/index.html#/column/ai/full-code-review-checklist.md');

    const article = page.locator('article');
    await expect(page.locator('#header-title')).toHaveText('Full Code Review Checklist');
    await expect(article.locator('h1')).toHaveText([
      '목적과 적용 범위', '검사 절차', '체크리스트', '판정 기준과 도구', '결과 보고 형식', '에이전트 공유 방법'
    ]);
    await expect(article.locator('table.md-table')).toHaveCount(5);
    await expect(article.locator('table.md-table').first().locator('tbody tr')).toHaveCount(18);
    await expect(article.locator('pre')).toHaveCount(1);
    await expect(article.locator('pre code.language-markdown')).toContainText('## 코드 전수 검사');
    await expect(page.locator('#title-container')).toContainText('공학 > 개발 도구');
    await expect(page.locator('.error-state')).toHaveCount(0);

    await page.locator('#nav-toc').click();
    await expect(page.locator('#toc-tree a')).toHaveCount(6);
    // 사이트맵에서 지금 문서가 표시된다
    await expect(page.locator('#sitemap-tree li.this-doc a')).toHaveText('Full Code Review Checklist');
  });
});
