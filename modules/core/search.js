/**
 * @file modules/core/search.js
 * @module SiteModules.Search
 * @description 사이드바 검색. 제목 검색은 hierarchy.json만으로 즉시 수행하고, 태그/전체 검색은
 *   본문 색인(window.SiteModules.searchCache)을 사용한다. 색인은 검색 탭 진입/검색창 포커스 시점에 한 번만 준비하며,
 *   정적 색인(/search-index.json, scripts/build-search-index.js로 생성)을 우선 받고 없으면 모든 문서를 직접 수집한다.
 * @requires SiteModules.Hierarchy, window.SiteModules.hierarchyListCached
 * @exports ensureIndex, getKnownArticleFlag, rememberArticleFlag, bindInput
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.Search = (function () {
  const INDEX_FETCH_CONCURRENCY = 5;
  const MIN_QUERY_LENGTH = 2;
  const STATIC_INDEX_URL = "/search-index.json";

  let indexPromise = null;
  let isIndexReady = false;
  // 문서 URL별 <article> 존재 여부 캐시 (색인에 없는 문서의 SPA/새 탭 분기 판단용)
  const articleFlagCache = new Map();

  /** 문서에 <article>이 있는지 캐시에서 조회한다. 모르면 undefined. */
  function getKnownArticleFlag(url) {
    if (articleFlagCache.has(url)) return articleFlagCache.get(url);
    const entry = (window.SiteModules.searchCache || []).find(page => page.url === url);
    return entry ? entry.hasArticle : undefined;
  }

  function rememberArticleFlag(url, hasArticle) {
    articleFlagCache.set(url, hasArticle);
  }

  function listPages(list) {
    const pages = [];
    window.SiteModules.Hierarchy.forEachPage(list, page => {
      pages.push({
        title: page.title,
        url: page.url,
        breadcrumb: page.ancestors.concat(page.title).join(" > ")
      });
    });
    return pages;
  }

  /** 본문 색인을 최초 1회 생성한다. 실패하면 다음 호출에서 다시 시도한다. */
  function ensureIndex() {
    if (!indexPromise) {
      const list = window.SiteModules.hierarchyListCached;
      if (!list) return Promise.resolve();
      indexPromise = buildIndex(list)
        .then(() => { isIndexReady = true; })
        .catch(err => {
          console.error("[Search] 색인 생성 실패:", err);
          indexPromise = null;
        });
    }
    return indexPromise;
  }

  // 배포 전에 scripts/build-search-index.js로 만들어 둔 정적 색인을 받는다. 없거나 형식이 다르면 null.
  async function loadStaticIndex() {
    try {
      const res = await fetch(STATIC_INDEX_URL + "?v=" + (window.SiteVersion || ""));
      if (!res.ok) return null;
      const entries = await res.json();
      const isValid = Array.isArray(entries) && entries.every(entry =>
        entry && typeof entry.url === "string" && typeof entry.title === "string" &&
        Array.isArray(entry.tags) && typeof entry.articleText === "string");
      return isValid ? entries : null;
    } catch (err) {
      console.warn("[Search] 정적 색인을 불러오지 못해 문서를 직접 수집합니다:", err);
      return null;
    }
  }

  async function buildIndex(list) {
    const staticIndex = await loadStaticIndex();
    if (staticIndex) {
      window.SiteModules.searchCache = staticIndex;
      return;
    }
    await crawlPages(list);
  }

  // 정적 색인이 없을 때의 대체 경로: 모든 문서를 받아 브라우저에서 색인을 만든다
  async function crawlPages(list) {
    window.SiteModules.searchCache = [];
    const pages = listPages(list);
    let nextIndex = 0;

    async function worker() {
      while (nextIndex < pages.length) {
        const page = pages[nextIndex++];

        try {
          const res = await fetch(page.url);
          if (!res.ok) continue;
          const htmlText = await res.text();
          const doc = new DOMParser().parseFromString(htmlText, "text/html");

          const tagsEl = doc.querySelector("tags");
          const tagsText = tagsEl ? tagsEl.textContent : "";
          const tags = tagsText.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean);

          const articleEl = doc.querySelector("article");
          let articleText = "";
          if (articleEl) {
            const clone = articleEl.cloneNode(true);
            clone.querySelectorAll("script, style, tags, #site-intro, #site-toc-panel").forEach(el => el.remove());
            articleText = (clone.textContent || "").toLowerCase().replace(/\s+/g, ' ').trim();
          }

          window.SiteModules.searchCache.push({
            title: page.title,
            url: page.url,
            breadcrumb: page.breadcrumb,
            tags: tags,
            articleText: articleText,
            hasArticle: !!articleEl
          });
        } catch (err) {
          console.warn(`Failed to index page ${page.url}:`, err);
        }
      }
    }

    await Promise.all(Array.from({ length: INDEX_FETCH_CONCURRENCY }, () => worker()));
  }

  // query는 소문자로 정규화된 값
  function findMatches(searchType, query) {
    if (searchType === "title") {
      return listPages(window.SiteModules.hierarchyListCached).filter(page => page.title.toLowerCase().includes(query));
    }

    const index = window.SiteModules.searchCache || [];
    if (searchType === "tag") {
      return index.filter(page => page.tags.some(tag => tag.includes(query)));
    }
    return index.filter(page =>
      page.title.toLowerCase().includes(query) ||
      page.tags.some(tag => tag.includes(query)) ||
      page.articleText.includes(query)
    );
  }

  function renderNotice(container, message) {
    const li = document.createElement("li");
    li.style.padding = "10px";
    li.style.color = "#747775";
    li.style.fontSize = "0.85em";
    li.textContent = message;
    container.appendChild(li);
  }

  function renderMatches(container, matches) {
    matches.forEach(match => {
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.href = match.url;
      link.textContent = match.title;
      const pathDesc = document.createElement("span");
      pathDesc.className = "search-path-desc";
      pathDesc.textContent = match.breadcrumb;
      li.append(link, pathDesc);
      container.appendChild(li);
    });
  }

  /** 사이드바 검색창(#sidebar-search-input)에 입력 처리기를 연결한다. */
  function bindInput() {
    const searchInput = document.getElementById("sidebar-search-input");
    if (!searchInput) return;

    // 검색창에 처음 포커스할 때 본문 색인 생성을 시작
    searchInput.addEventListener("focus", () => { ensureIndex(); }, { once: true });

    searchInput.addEventListener("input", () => {
      const query = searchInput.value.trim().toLowerCase();
      const resultsContainer = document.getElementById("sidebar-search-results");
      if (!resultsContainer) return;
      resultsContainer.innerHTML = "";

      if (query.length < MIN_QUERY_LENGTH) return;

      const activeRadio = document.querySelector("input[name='search-type']:checked");
      const searchType = activeRadio ? activeRadio.value : "title";

      // 태그/전체 검색은 본문 색인이 필요하므로, 준비 전이면 안내 후 완료 시 자동 재검색
      if (searchType !== "title" && !isIndexReady) {
        renderNotice(resultsContainer, "검색 색인을 준비하는 중입니다...");
        ensureIndex().then(() => {
          if (isIndexReady && searchInput.value.trim().toLowerCase() === query) {
            searchInput.dispatchEvent(new Event("input"));
          }
        });
        return;
      }

      const matches = findMatches(searchType, query);
      if (matches.length === 0) {
        renderNotice(resultsContainer, "검색 결과가 없습니다.");
        return;
      }
      renderMatches(resultsContainer, matches);
    });
  }

  return {
    ensureIndex: ensureIndex,
    getKnownArticleFlag: getKnownArticleFlag,
    rememberArticleFlag: rememberArticleFlag,
    bindInput: bindInput
  };
})();
