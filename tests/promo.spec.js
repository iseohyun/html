const { test, expect } = require('@playwright/test');

test.describe('프로젝트 탭 (promo)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/index.html#/promo.html');
    await expect(page.locator('.promo-section').first()).toBeVisible();
  });

  test('보기 전환과 검색은 헤더의 설정 아이콘 안에 있다', async ({ page }) => {
    // 떠 있던 보기 전환 버튼은 없다
    await expect(page.locator('#promo-view-toggle-btn')).toHaveCount(0);
    await expect(page.locator('#header-filter-btn')).toBeHidden();

    const settingsBtn = page.locator('#header-settings-btn');
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    // 보기: 아이콘(기본) -> 카드
    await expect(page.locator('.pill-btn[data-view="icon"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.promo-icon-grid').first()).toBeVisible();
    await page.locator('.pill-btn[data-view="card"]').click();
    await expect(page.locator('.promo-grid').first()).toBeVisible();
    await expect(page.locator('.promo-icon-grid')).toHaveCount(0);

    // 검색: 맞는 프로젝트만 남고, 없으면 안내가 나온다
    const total = await page.locator('.promo-grid > *').count();
    await page.locator('#promo-search-input').fill('movie');
    await expect.poll(() => page.locator('.promo-grid > *').count()).toBeLessThan(total);
    await expect(page.locator('.promo-grid')).toContainText('Movie Player');
    await page.locator('#promo-search-input').fill('zzz-없는-검색어');
    await expect(page.locator('.promo-empty')).toBeVisible();

    // 고른 보기는 새로 열어도 남아 있다
    await page.reload();
    await expect(page.locator('.promo-grid').first()).toBeVisible();
  });

  test('분류 안에서는 최근에 업데이트된 프로젝트가 앞에 온다', async ({ page }) => {
    const mismatches = await page.evaluate(async () => {
      const data = await (await fetch('/promo.json')).json();
      const latest = item => {
        const log = [].concat(item.changelog || item.변경이력 || []);
        let best = 0;
        log.forEach(entry => {
          const text = typeof entry === 'string' ? entry : ((entry && (entry.date || entry.날짜)) || '');
          const m = /(\d{4})[.\-\/]\s*(\d{1,2})[.\-\/]\s*(\d{1,2})/.exec(String(text));
          if (m) best = Math.max(best, new Date(+m[1], +m[2] - 1, +m[3]).getTime());
        });
        return best;
      };
      const sectionEls = [...document.querySelectorAll('.promo-section')];
      const problems = [];
      data.sections.filter(sec => (sec.items || []).length).forEach((sec, i) => {
        const expected = sec.items.map((item, index) => ({ title: item.title, time: latest(item), index }))
          .sort((a, b) => (b.time - a.time) || (a.index - b.index)).map(x => x.title);
        const shown = [...sectionEls[i].querySelectorAll('.promo-icon-item')].map(el => el.textContent.trim());
        expected.forEach((title, k) => { if (!shown[k] || !shown[k].includes(title)) problems.push(`${sec.title}: ${k}번째 기대 "${title}" / 실제 "${shown[k]}"`); });
      });
      return problems;
    });
    expect(mismatches).toEqual([]);
  });

  test('분류 머리의 화살표는 오른쪽 끝에 붙는다', async ({ page }) => {
    const gap = await page.locator('.promo-section-header').first().evaluate(header => {
      const chevron = header.querySelector('.promo-section-chevron');
      const padRight = parseFloat(getComputedStyle(header).paddingRight);
      return header.getBoundingClientRect().right - padRight - chevron.getBoundingClientRect().right;
    });
    expect(Math.abs(gap)).toBeLessThan(3);
  });

  test('상세 창: 링크는 프로젝트 배지 바로 뒤에 있고, 창이 열린 동안 뒤의 페이지는 스크롤되지 않는다', async ({ page }) => {
    await page.locator('.promo-icon-item', { hasText: '동영상 재생 및 편집기' }).first().click();
    const modal = page.locator('#promo-detail-modal');
    await expect(modal).toHaveClass(/active/);

    // 배지 다음 형제가 링크 버튼
    const nextIsLink = await page.locator('.promo-detail-project-badge').evaluate(badge =>
      !!badge.nextElementSibling && badge.nextElementSibling.classList.contains('promo-detail-link-btn'));
    expect(nextIsLink).toBe(true);
    await expect(page.locator('.promo-detail-body .promo-detail-link-btn')).toHaveCount(0);

    // 상세 창 위에서 휠을 끝까지 굴려도 페이지는 그대로다
    const before = await page.evaluate(() => window.scrollY);
    await page.locator('.promo-detail-body').hover();
    for (let i = 0; i < 12; i++) await page.mouse.wheel(0, 900);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY)).toBe('hidden');

    // 닫으면 다시 스크롤된다
    await page.keyboard.press('Escape');
    await expect(modal).not.toHaveClass(/active/);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY)).not.toBe('hidden');
  });
});

test.describe('헤더 탭의 색과 자동 스크롤', () => {
  test('탭 글자색은 방문 여부와 상관없이 같고, 켜진 탭이 보이는 곳으로 스크롤된다', async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 800 });
    // 초등수학 13편: 탭 줄이 화면보다 길다
    await page.goto('/index.html#/basicStudy/math/elementary/6-2.html');
    await expect(page.locator('#header-title')).toHaveText('6학년 2학기');

    const nav = page.locator('#header-tabs');
    const selected = page.locator('#header-tabs .app-tab[aria-selected="true"]');
    await expect(selected).toHaveCount(1);
    expect(await nav.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);

    // 켜진 탭이 탭 줄 안에 온전히 보인다
    const visible = await selected.evaluate(tab => {
      const navRect = tab.parentElement.getBoundingClientRect();
      const rect = tab.getBoundingClientRect();
      return rect.left >= navRect.left - 1 && rect.right <= navRect.right + 1;
    });
    expect(visible).toBe(true);

    // 방문한 문서의 탭과 방문하지 않은 문서의 탭 색이 같다 (이전 탭을 눌러 방문 기록을 만든 뒤 비교)
    const tabs = page.locator('#header-tabs .app-tab[aria-selected="false"]');
    await tabs.first().click();
    await expect(page.locator('#header-tabs .app-tab[aria-selected="true"]')).toHaveCount(1);
    const colors = await page.locator('#header-tabs .app-tab[aria-selected="false"]').evaluateAll(els =>
      [...new Set(els.map(el => getComputedStyle(el).color))]);
    expect(colors).toHaveLength(1);
  });
});
