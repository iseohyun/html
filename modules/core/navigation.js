/**
 * @file modules/core/navigation.js
 * @module SiteModules.Navigation
 * @description SPA 해시 라우터와 이중 사이드바(사이트맵/목차/검색 탭) UI를 담당하는 코어 모듈.
 *   검색은 SiteModules.Search, 문의 창은 SiteModules.Contact, hierarchy 순회는 SiteModules.Hierarchy에 위임한다.
 * @requires SiteModules.Config, SiteModules.Icons, SiteModules.Header, SiteModules.Hierarchy,
 *   SiteModules.Search, SiteModules.Contact, SiteModules.TOC, SiteModules.Document
 * @exports init, trigBoard, findHierarchyPath, registerPageCleanup
 * @state window.SiteModules.state (현재/이전/다음 문서), hierarchyListCached
 */

window.SiteModules = window.SiteModules || {};
window.SiteModules.state = window.SiteModules.state || {
  category: "",
  cur_doc: { title: "", dir: "", file: "" },
  prv_doc: { title: "", dir: "", file: "" },
  next_doc: { title: "", dir: "", file: "" },
  currentPath: ""
};
// 페이지 종속 스크립트용 단축 진입점: window.SiteModules.registerPageCleanup(() => { ... })
window.SiteModules.registerPageCleanup = function (cleanupFn) {
  window.SiteModules.Navigation.registerPageCleanup(cleanupFn);
};

window.SiteModules.Navigation = (function () {
  let baseUl;
  // 모바일(드로어) 레이아웃 전환 기준 너비. style.css의 @media (max-width: 960px)와 동일해야 한다.
  const MOBILE_BREAKPOINT = window.SiteModules.Config.layout.mobileBreakpoint;
  // 본문을 밀어내는 사이드바 폭 (--sidebar-width 에 넣는 값)
  const RAIL_WIDTH = "var(--rail-w)";
  const RAIL_AND_PANEL_WIDTH = "calc(var(--rail-w) + var(--panel-w))";
  // 홈의 보기 방식과 주소: 달력(#/), 리스트(#/list). 프로젝트 소개는 별도 문서(/promo.html)지만 같은 탭 줄에 둔다.
  const HOME_VIEW_BY_HASH = { "#/list": "list" };
  const HOME_TABS = [
    { id: "calendar", label: "달력", href: "#/" },
    { id: "list", label: "리스트", href: "#/list" },
    { id: "promo", label: "프로젝트", href: "#/promo.html" }
  ];
  const PROMO_PATH = "/promo.html";
  // 형제 문서를 탭으로 묶지 않는 경로 (서로 이어지는 글이 아닌 독립 프로젝트)
  const NO_SERIES_TAB_PREFIX = "/small-project/";
  // hierarchy.json에 없어도 SPA 본문으로 로드 가능한 루트 문서
  const KNOWN_ROOT_ARTICLES = ["/index.html", "/info.html", "/promo.html", "/"];
  // registerPageCleanup을 쓰지 않는 기존 소프로젝트들이 남기는 전역 이름 (신규 프로젝트는 registerPageCleanup 사용)
  const LEGACY_PAGE_GLOBALS = [
    "init", "initApp", "rebuildGrid", "positionTooltip", "guide", "stepsData", "inputs",
    "cur_step", "cur_line", "language", "isFin", "isGreating", "stateHistory", "state",
    "EuclideanGridInput", "SqrtGridInput", "GridInput", "V", "titleText", "sentences",
    "activeCells", "clearGridRow", "highlightActiveStep", "nextStep", "prevStep", "initKeybindings",
    "triggerRandomStart", "resetToStart",
    "initChart", "redrawChart", "startChartAnimation", "drawBars", "updateChartRealtime",
    "triggerMathRendering", "setupDualInputBindings", "handleRunSimulation", "cleanupActiveWorker", "updateResultUI",
    "coordinatesToSvg", "svgToCoordinates", "multiplyComplex", "drawRulers", "handleReload", "drawAnimatePath",
    "drawCoordinateAxes", "drawConcentricCircles", "drawControlPath", "updateDragGuideLine", "setBackgroundSize", "T"
  ];
  // 현재 페이지가 등록한 정리 함수 목록 (다음 페이지로 전환될 때 1회 실행 후 비워진다)
  let pageCleanups = [];

  /**
   * 페이지 종속 스크립트가 SPA 전환 시 실행할 정리 함수를 등록한다.
   * (전역 변수 삭제, 타이머/리스너/Worker 해제 등)
   * @param {Function} cleanupFn
   */
  function registerPageCleanup(cleanupFn) {
    if (typeof cleanupFn === "function") pageCleanups.push(cleanupFn);
  }

  function runPageCleanups() {
    const cleanups = pageCleanups;
    pageCleanups = [];
    cleanups.forEach(cleanupFn => {
      try {
        cleanupFn();
      } catch (err) {
        console.error("[Router] 페이지 정리 함수 실행 실패:", err);
      }
    });
  }

  function isKnownArticlePage(absolutePath) {
    if (KNOWN_ROOT_ARTICLES.includes(absolutePath)) return true;

    const list = window.SiteModules.hierarchyListCached;
    if (!list) return true;

    return !!window.SiteModules.Hierarchy.findPage(list, absolutePath);
  }

  // hierarchy에서 현재 문서를 찾아 state의 현재/이전/다음 문서 정보를 채운다
  function populateDocState(list, targetPath) {
    const page = window.SiteModules.Hierarchy.findPage(list, targetPath.split('#')[0]);
    if (!page) return false;

    const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
    const toNeighborDoc = (neighbor) => {
      if (!neighbor) return { title: "", dir: "", file: "" };
      return {
        title: neighbor.주제,
        dir: neighbor.디렉토리,
        file: hasOwn(neighbor, '파일명') ? neighbor.파일명 : (hasOwn(neighbor, '목록') ? "" : "index.html"),
        parentDirs: page.parentDirs
      };
    };

    const state = window.SiteModules.state;
    state.cur_doc.title = page.item.주제;
    state.cur_doc.dir = page.item.디렉토리;
    state.cur_doc.file = page.fileName;
    state.category = page.ancestors.join(" >> ");
    state.prv_doc = toNeighborDoc(page.siblings[page.index - 1]);
    state.next_doc = toNeighborDoc(page.siblings[page.index + 1]);
    return true;
  }

  // 헤더 탭 구성: 홈과 프로젝트 소개는 홈 탭, 이어지는 문서는 같은 묶음의 형제 문서를 탭으로 보여 준다
  function buildHeaderTabs(isHome, urlPath) {
    if (isHome || urlPath === PROMO_PATH) {
      const selectedId = isHome ? (window.SiteModules.state.homeView || "calendar") : "promo";
      return HOME_TABS.map(tab => ({ label: tab.label, href: tab.href, selected: tab.id === selectedId }));
    }

    const list = window.SiteModules.hierarchyListCached;
    if (!list || !urlPath || urlPath.startsWith(NO_SERIES_TAB_PREFIX)) return [];

    const Hierarchy = window.SiteModules.Hierarchy;
    const page = Hierarchy.findPage(list, urlPath.split('#')[0]);
    if (!page) return [];

    const seriesDocs = page.siblings.filter(Hierarchy.isPageItem);
    if (seriesDocs.length < 2) return [];

    return seriesDocs.map(item => ({
      label: item.주제 || "",
      href: `#/${page.parentDirs}${item.디렉토리 || ""}${Hierarchy.getFileName(item)}`,
      selected: item === page.item
    }));
  }

  function init() {
    const state = window.SiteModules.state;
    state.currentPath = window.location.pathname;

    // 1. 구글 머티리얼 심볼 링크 주입 및 기본 파비콘 동기화
    let faviconLink = document.querySelector("link[rel*='icon']");
    if (!faviconLink) {
      faviconLink = document.createElement("link");
      faviconLink.rel = "shortcut icon";
      document.head.appendChild(faviconLink);
    }
    faviconLink.type = "image/svg+xml";
    faviconLink.href = "/source/icon_seohyun_reverse.svg";
    if (!document.getElementById("material-symbols-link")) {
      const link = document.createElement("link");
      link.id = "material-symbols-link";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0";
      document.head.appendChild(link);
    }

    // 2. Gemini 스타일의 이중 사이드바 컨테이너 빌드
    let sidebarContainer = document.getElementById("sidebar-container");
    if (!sidebarContainer) {
      const body = document.querySelector("body");

      // C. 아이콘 모음과 헤더 (메뉴 아이콘은 넓은 화면에서 패널을, 좁은 화면에서 서랍을 여닫는다)
      const icon = window.SiteModules.Icons.html;
      window.SiteModules.Icons.ensureSprite();
      window.SiteModules.Header.init({ onMenuClick: () => trigBoard("trigger") });

      // D. 모바일 어두운 배경 오버레이
      let sidebarOverlay = document.getElementById("sidebar-overlay");
      if (!sidebarOverlay) {
        sidebarOverlay = document.createElement("div");
        sidebarOverlay.setAttribute("id", "sidebar-overlay");
        body.appendChild(sidebarOverlay);
      }

      sidebarContainer = document.createElement("div");
      sidebarContainer.setAttribute("id", "sidebar-container");
      body.appendChild(sidebarContainer);

      // A. 좌측 좁은 아이콘 바 (width 60px)
      const sidebarNav = document.createElement("div");
      sidebarNav.setAttribute("id", "sidebar-nav");
      sidebarNav.innerHTML = `
        <div class="nav-group">
          <div class="nav-item" id="nav-home" data-tooltip="홈으로 이동">
            <svg viewBox="0 0 500 500" style="width: 20px; height: 20px; stroke: currentColor; fill: none; stroke-linecap: round; stroke-width: 46px;">
              <path d="M 84 440 C -1 341 38 223 68 161 S 151 23 234 34 S 363 164 327 217 S 245 273 198 229 S 187 105 245 77 S 432 108 432 212 S 354 371 393 420 C 431 460 468 436 468 407"/>
              <path d="M 99 289 C 183 296 239 392 188 468"/>
              <path d="M 246 311 C 335 320 324 390 291 462" style="stroke-miterlimit: 17;"/>
              <path d="M 341 267 C 339 260 360 313 400 309" style="stroke-miterlimit: 17;"/>
            </svg>
          </div>
          <div class="nav-item" id="nav-sitemap" data-tab="tab-sitemap" data-tooltip="사이트맵" data-panel-title="사이트맵">
            ${icon("sitemap")}
            <span class="keybind-badge">1</span>
          </div>
          <div class="nav-item" id="nav-toc" data-tab="tab-toc" data-tooltip="목차" data-panel-title="목차">
            ${icon("list")}
            <span class="keybind-badge">2</span>
          </div>
          <div class="nav-item" id="nav-search" data-tab="tab-search" data-tooltip="검색" data-panel-title="문서 검색">
            ${icon("search")}
            <span class="keybind-badge">3</span>
          </div>
        </div>
        
        <!-- 동적 페이지 기능 아이콘 배치용 영역 -->
        <div class="nav-group" id="sidebar-page-features"></div>
        
        <div class="nav-group">
          <div class="nav-item" id="nav-kakao-channel" data-tooltip="문의 (카카오톡 · 메일)">
            <svg viewBox="0 0 24 24" class="kakao-nav-svg" aria-hidden="true">
              <path d="M12 3C6.477 3 2 6.463 2 10.734c0 2.757 1.856 5.177 4.651 6.535-.153.553-.986 3.555-1.021 3.79-.044.294.108.29.228.211.094-.062 3.743-2.501 5.252-3.524.291.028.587.043.89.043 5.523 0 10-3.463 10-7.734S17.523 3 12 3z"/>
            </svg>
          </div>
          <div class="nav-item" id="nav-info" data-tooltip="사이트 소개">
            ${icon("info")}
          </div>
        </div>
      `;
      sidebarContainer.appendChild(sidebarNav);

      // B. 우측 확장 패널 (width 240px)
      const sidebarPanel = document.createElement("div");
      sidebarPanel.setAttribute("id", "sidebar-panel");
      sidebarPanel.innerHTML = `
        <div class="panel-head">
          <span id="panel-title">사이트맵</span>
          <button class="icon-btn is-bare" type="button" id="panel-close-btn" aria-label="패널 닫기" title="패널 닫기">${icon("x")}</button>
        </div>
        <div class="panel-body">
          <!-- 1. Sitemap Pane -->
          <div class="tab-pane" id="tab-sitemap">
            <div class="sitemap-actions" style="margin-bottom: 10px; display: flex; gap: 8px;">
              <button id="home-btn" class="site-action-btn">홈</button>
              <button id="sitemap-toggle-all-btn" class="site-action-btn">전체 닫기</button>
              <button id="sitemap-open-current-btn" class="site-action-btn">현재 문서</button>
            </div>
            <ul class="sitemap-panel-list" id="sitemap-tree"></ul>
          </div>
          
          <!-- 2. TOC Pane -->
          <div class="tab-pane" id="tab-toc">
            <div class="toc-breadcrumb" id="toc-breadcrumb-info" style="font-size:0.75em; color:#5f6368; margin-bottom:4px; font-weight: 500;"></div>
            <ul class="toc-panel-list" id="toc-tree"></ul>
          </div>
          <!-- 3. Search Pane -->
          <div class="tab-pane" id="tab-search">
            <div class="search-type-wrapper">
              <label class="search-type-option active">
                <input type="radio" name="search-type" value="title" checked style="display: none;">
                제목
              </label>
              <label class="search-type-option">
                <input type="radio" name="search-type" value="tag" style="display: none;">
                Tag
              </label>
              <label class="search-type-option">
                <input type="radio" name="search-type" value="all" style="display: none;">
                모든 문서
              </label>
            </div>
            <div class="search-input-wrapper" style="margin-bottom: 15px;">
              <input type="text" id="sidebar-search-input" placeholder="문서 제목 검색...">
            </div>
            <ul class="search-results-list" id="sidebar-search-results"></ul>
          </div>
        </div>
        <div class="panel-foot" id="panel-foot"></div>
      `;
      sidebarPanel.querySelector("#panel-foot").textContent = window.SiteVersion ? `빌드 ${window.SiteVersion}` : "";
      sidebarContainer.appendChild(sidebarPanel);

      if (window.innerWidth > MOBILE_BREAKPOINT) {
        setPanelCollapsed(true);
      } else {
        setPanelCollapsed(false);
        document.documentElement.style.setProperty('--sidebar-width', '0px');
      }

      createModals();
      bindSidebarEvents();

      // 문서에 남아 있는 예전 <header> 요소 제거 (새 헤더는 #app-header)
      document.querySelectorAll("header").forEach(h => h.remove());
    }

    baseUl = document.getElementById("sitemap-tree");
    if (baseUl) baseUl.innerHTML = "";

    // hierarchy.json 로드
    fetch('/hierarchy.json')
      .then(response => response.json())
      .then(list => {
        window.SiteModules.hierarchyListCached = list;

        let directory = state.currentPath.split('/').join('/');
        if (directory.startsWith('/')) {
          directory = directory.substring(1);
        }

        // 초기 상태 로드
        renderHierarchy(list, baseUl, '', directory);

        // 라우터 초기화
        initRouter();

      })
      .catch(err => console.error("Error loading hierarchy.json:", err));
  }

  function resolveRelativePath(basePath, relativePath) {
    if (relativePath.startsWith("/")) return relativePath;

    const baseParts = basePath.split("/");
    baseParts.pop();

    const relParts = relativePath.split("/");
    for (const part of relParts) {
      if (part === "." || part === "") {
        continue;
      } else if (part === "..") {
        if (baseParts.length > 0) baseParts.pop();
      } else {
        baseParts.push(part);
      }
    }
    return baseParts.join("/");
  }



  // SPA 해시 라우터 구성
  function initRouter() {
    window.addEventListener("hashchange", handleRouteChange);

    // 글로벌 링크 가로채기 (페이지 리로드 없이 SPA로 동작하도록 설계)
    document.addEventListener("click", (e) => {
      const anchor = e.target.closest("a");
      if (anchor) {
        let href = anchor.getAttribute("href");
        if (href) {
          if (href.startsWith("#")) {
            // 만약 해시에 슬래시가 없는 단순 내부 앵커 이동인 경우 (예: href="#용어")
            if (!href.includes("/")) {
              e.preventDefault();
              const state = window.SiteModules.state;
              const currentPath = state.currentPath || "/index.html";
              window.location.hash = "#" + currentPath + href;
            }
          } else if (!href.startsWith("http")) {
            const isHtmlLink = href.includes(".html");
            const isTargetBlank = anchor.getAttribute("target") === "_blank";
            if (isHtmlLink && !isTargetBlank) {
              let cleanHref = href;
              const hashIdx = href.indexOf('#');
              if (hashIdx !== -1) {
                cleanHref = href.substring(0, hashIdx);
              }
              const queryIdx = cleanHref.indexOf('?');
              if (queryIdx !== -1) {
                cleanHref = cleanHref.substring(0, queryIdx);
              }

              const state = window.SiteModules.state;
              const absolutePath = resolveRelativePath(state.currentPath || "/index.html", cleanHref);

              // 최근 업데이트 항목 판별
              const isRecentUpdateLink = anchor.closest("#sidebar-update-list, #site-history") || anchor.classList.contains("recent-visit-link");
              if (isRecentUpdateLink) {
                let hashOrQuery = "";
                const firstHashOrQueryIdx = href.search(/[#?]/);
                if (firstHashOrQueryIdx !== -1) {
                  hashOrQuery = href.substring(firstHashOrQueryIdx);
                }

                const knownHasArticle = window.SiteModules.Search.getKnownArticleFlag(absolutePath);
                if (knownHasArticle !== undefined) {
                  if (knownHasArticle) {
                    e.preventDefault();
                    window.location.hash = "#" + absolutePath + hashOrQuery;
                  } else {
                    anchor.setAttribute("target", "_blank");
                  }
                } else {
                  // 비동기 팝업 차단 우회를 위한 빈 탭 사전 생성 후 페치
                  e.preventDefault();
                  const newTab = window.open("", "_blank");
                  fetch(absolutePath)
                    .then(res => {
                      if (!res.ok) throw new Error("Fetch failed");
                      return res.text();
                    })
                    .then(htmlText => {
                      const parser = new DOMParser();
                      const doc = parser.parseFromString(htmlText, "text/html");
                      const articleEl = doc.querySelector("article");
                      const hasArticle = !!articleEl;

                      window.SiteModules.Search.rememberArticleFlag(absolutePath, hasArticle);

                      if (hasArticle) {
                        newTab.close();
                        window.location.hash = "#" + absolutePath + hashOrQuery;
                      } else {
                        newTab.location.href = href;
                      }
                    })
                    .catch(err => {
                      console.error("Failed to dynamically check article for recent update link:", err);
                      newTab.location.href = href;
                    });
                }
                return;
              }

              if (!isKnownArticlePage(absolutePath)) {
                anchor.setAttribute("target", "_blank");
                return;
              }

              e.preventDefault();
              let hashOrQuery = "";
              const firstHashOrQueryIdx = href.search(/[#?]/);
              if (firstHashOrQueryIdx !== -1) {
                hashOrQuery = href.substring(firstHashOrQueryIdx);
              }
              window.location.hash = "#" + absolutePath + hashOrQuery;
            }
          }
        }
      }
    });

    // 초기 상태 라우팅 수행
    handleRouteChange();
  }


  function handleRouteChange() {
    let hash = window.location.hash;
    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;

    if (isMobile) {
      const container = document.getElementById("sidebar-container");
      const overlay = document.getElementById("sidebar-overlay");
      if (container) container.classList.remove("active");
      if (overlay) overlay.classList.remove("active");
      document.body.classList.remove("mobile-nav-open");
    }

    if (HOME_VIEW_BY_HASH[hash]) {
      loadHomeRoute(HOME_VIEW_BY_HASH[hash]);
    } else if (!hash || hash === "#" || hash === "#/" || hash === "#/index.html" || hash === "#index.html") {
      const path = window.location.pathname;
      if (hash === "#/" || hash === "#/index.html" || hash === "#index.html" || path === "/" || path.endsWith("/") || path === "/index.html" || path.endsWith("/index.html") || !!document.getElementById("site-history")) {
        loadHomeRoute();
      } else {
        // 서브페이지 직접 진입 (해시 없음): 기존 article 구조와 내용을 유지하면서 상태 데이터만 갱신
        postLoadPageActions(false, path, document.title);
      }
    } else {
      // hash 예: "#/basicStudy/math/1-1.html#title" 또는 "#basicStudy/math/1-1.html" 또는 "#연산operator"
      let cleanHash = hash;
      if (cleanHash.startsWith('#')) {
        cleanHash = cleanHash.substring(1);
      }

      // 만약 해시에 슬래시(/)가 존재하지 않는다면, 이는 서브페이지 경로가 아니라 단순 로컬 문서 앵커입니다.
      if (!cleanHash.includes('/')) {
        const id = decodeURIComponent(cleanHash);
        const targetElement = document.getElementById(id);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: "smooth" });
        }
        return; // 페이지 로딩 생략
      }

      if (cleanHash.startsWith('/')) {
        cleanHash = cleanHash.substring(1);
      }

      // sub-anchor가 존재하는 경우 fetch 경로와 스크롤용 분리
      let urlPath = cleanHash;
      let subAnchor = "";
      const secondHashIdx = cleanHash.indexOf('#');
      if (secondHashIdx !== -1) {
        urlPath = cleanHash.substring(0, secondHashIdx);
        subAnchor = cleanHash.substring(secondHashIdx + 1);
      }

      // 만약 현재 로드된 페이지와 이동하려는 페이지가 동일하다면, 페이지를 새로 페치하지 않고 스크롤만 수행
      const targetFullPath = "/" + urlPath;
      const state = window.SiteModules.state;
      if (state.currentPath === targetFullPath) {
        if (subAnchor) {
          const id = decodeURIComponent(subAnchor);
          const targetElement = document.getElementById(id);
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: "smooth" });
          }
        } else {
          window.scrollTo(0, 0);
        }
        return;
      }

      loadPageRoute(targetFullPath);
    }
  }

  // 홈 페이지 (index.html 기본 내용)를 동적으로 완전 빌드 (무한 대기 루프 완벽 제거)
  function loadHomeRoute(view = "calendar") {
    const article = document.querySelector("article");
    if (!article) return;

    window.SiteModules.state.homeView = view;

    if (window.SiteModules && window.SiteModules.state) {
      window.SiteModules.state.lastModifiedDate = null;
    }

    // 구조 빌드
    article.innerHTML = `
      <ul id="site-history"></ul>
    `;

    // 최근 변경 사항 로그 빌드 (전체 로드하여 필터링 지원)
    if (window.SiteModules.UpdateLog && typeof window.SiteModules.UpdateLog.getUpdateList === 'function') {
      window.SiteModules.UpdateLog.getUpdateList('all', '2023-01-01', '', '', 'site-history', view);
    } else {
      window.SiteModules.updateLogQueue = window.SiteModules.updateLogQueue || [];
      window.SiteModules.updateLogQueue.push(['all', '2023-01-01', '', '', 'site-history', view]);
    }

    postLoadPageActions(true);
  }

  // 모든 상대 경로(img src, object data, iframe src, a href 등)를 loaded page의 절대 경로로 재조정하는 헬퍼 함수
  function resolveAllRelativePaths(tempDoc, urlPath) {
    // 1. src 속성을 갖는 요소들 (img, iframe, embed, source, video, audio, script 등)
    const srcElements = tempDoc.querySelectorAll("[src]");
    srcElements.forEach(el => {
      const src = el.getAttribute("src");
      if (src && !src.startsWith("/") && !src.startsWith("http:") && !src.startsWith("https:") && !src.startsWith("data:")) {
        el.setAttribute("src", resolveRelativePath(urlPath, src));
      }
    });

    // 2. data 속성을 갖는 object 태그
    const objectElements = tempDoc.querySelectorAll("object[data]");
    objectElements.forEach(el => {
      const data = el.getAttribute("data");
      if (data && !data.startsWith("/") && !data.startsWith("http:") && !data.startsWith("https:") && !data.startsWith("data:")) {
        el.setAttribute("data", resolveRelativePath(urlPath, data));
      }
    });

    // 3. href 속성을 갖는 요소들 (a, link 등)
    const hrefElements = tempDoc.querySelectorAll("[href]");
    hrefElements.forEach(el => {
      const href = el.getAttribute("href");
      if (href && !href.startsWith("/") && !href.startsWith("http:") && !href.startsWith("https:") && !href.startsWith("#") && !href.startsWith("javascript:") && !href.startsWith("mailto:") && !href.startsWith("tel:")) {
        el.setAttribute("href", resolveRelativePath(urlPath, href));
      }
    });

    // 4. onclick 속성 내의 window.location.href 상대 경로 재조정 및 SPA 해시 전환
    const onclickElements = tempDoc.querySelectorAll("[onclick]");
    onclickElements.forEach(el => {
      const onclick = el.getAttribute("onclick");
      if (onclick && (onclick.includes("location.href") || onclick.includes("location ="))) {
        const match = onclick.match(/(?:window\.)?location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/);
        if (match) {
          const relPath = match[1];
          if (!relPath.startsWith("/") && !relPath.startsWith("http:") && !relPath.startsWith("https:") && !relPath.startsWith("#")) {
            const absPath = resolveRelativePath(urlPath, relPath);
            el.setAttribute("onclick", `window.location.hash='#${absPath}'`);
          }
        }
      }
    });
  }

  function executePageStylesheets(tempDoc) {
    const links = tempDoc.querySelectorAll("link[rel='stylesheet']");
    links.forEach(oldLink => {
      const href = oldLink.getAttribute("href");
      if (href) {
        if (href.includes("highlight/")) {
          return; // CDN 버전이 index.html에 로드되므로 로컬 highlight 스타일 무시
        }
        if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) {
          return; // 이미 로드된 스타일시트 생략
        }
        const newLink = document.createElement("link");
        newLink.rel = "stylesheet";
        newLink.href = href;
        document.head.appendChild(newLink);
      }
    });
  }

  // 해시 경로가 동일 출처의 HTML 문서인지 검증 (예: "#//evil.com/x.html" 같은 프로토콜 상대 URL 차단)
  function isSafeInternalPath(urlPath) {
    try {
      const resolved = new URL(urlPath, window.location.origin);
      return resolved.origin === window.location.origin && /\.html?$/i.test(resolved.pathname);
    } catch (e) {
      return false;
    }
  }

  async function loadPageRoute(urlPath) {
    const article = document.querySelector("article");
    if (!article) return;

    if (!isSafeInternalPath(urlPath)) {
      console.warn("[Router] 허용되지 않은 경로를 차단했습니다:", urlPath);
      window.location.hash = "#/";
      return;
    }

    // SPA 페이지 전환 시 잔존하는 ResizeObserver 및 윈도우 스냅 리스너 일괄 청소
    if (window.activeResizeObservers) {
      window.activeResizeObservers.forEach(obs => {
        try { obs.disconnect(); } catch (e) {}
      });
      window.activeResizeObservers = [];
    }
    if (window.activeWindowListeners) {
      window.activeWindowListeners.forEach(item => {
        try { window.removeEventListener(item.type, item.fn); } catch (e) {}
      });
      window.activeWindowListeners = [];
    }

    // 이전 페이지가 registerPageCleanup으로 등록한 정리 함수 실행
    runPageCleanups();
    // 이전 화면의 필터/설정 패널을 내린다 (새 문서의 스크립트가 자기 패널을 등록할 수 있도록 본문을 넣기 전에 비운다)
    window.SiteModules.Header.setPanels({});

    // SPA 페이지 전환 시 이전 소프로젝트 잔존 전역 함수 및 변수 일괄 소거 (네임스페이스 충돌 방어)
    LEGACY_PAGE_GLOBALS.forEach(key => {
      try { delete window[key]; } catch(e) {}
    });

    try {
      const response = await fetch(urlPath);
      if (!response.ok) {
        throw new Error(`Failed to load: ${urlPath} (status ${response.status})`);
      }
      const htmlText = await response.text();

      const parser = new DOMParser();
      const tempDoc = parser.parseFromString(htmlText, "text/html");

      const fetchedArticle = tempDoc.querySelector("article");

      if (fetchedArticle) {
        // 본문 로드 전에 로딩 표시
        article.innerHTML = "<p style='padding:50px; text-align:center; font-size:1.2em; color:#747775;'>페이지를 불러오는 중입니다...</p>";

        // Last-Modified 헤더값 읽기 및 저장
        const lastModifiedHeader = response.headers.get("Last-Modified");
        const state = window.SiteModules.state;
        state.lastModifiedDate = lastModifiedHeader ? new Date(lastModifiedHeader) : null;

        // 본문 DOM을 렌더링하기 전 상대 경로를 모두 절대 경로로 변환하여 404 오류 원천 봉쇄
        resolveAllRelativePaths(tempDoc, urlPath);

        article.innerHTML = fetchedArticle.innerHTML;

        // 페이지 종속 스타일시트 추출 및 로드
        executePageStylesheets(tempDoc);

        // 페이지 종속 스크립트 추출 및 실행
        executePageScripts(tempDoc);

        // 후속 모듈 재호출
        postLoadPageActions(false, urlPath, tempDoc.title);
      } else {
        // article 엘리먼트가 없는 경우 -> 새 창에서 열고 기존 위치 고수
        window.open(urlPath, "_blank");

        // 브라우저 해시 주소 복구 (기존 위치 고수)
        const state = window.SiteModules.state;
        const previousPath = state.currentPath || "/index.html";
        
        window.removeEventListener("hashchange", handleRouteChange);
        window.location.hash = "#" + previousPath;
        setTimeout(() => {
          window.addEventListener("hashchange", handleRouteChange);
        }, 0);
      }
    } catch (err) {
      console.error(err);
      article.innerHTML = `<h1 style="color:red;">페이지 로드 오류</h1><p>해당 문서를 불러올 수 없습니다.<br><span id="page-load-error-detail"></span></p>`;
      const errorDetail = article.querySelector("#page-load-error-detail");
      if (errorDetail) errorDetail.textContent = err.message;
    }
  }

  function executePageScripts(tempDoc) {
    const scripts = tempDoc.querySelectorAll("script");
    scripts.forEach(oldScript => {
      const src = oldScript.getAttribute("src");
      const id = oldScript.getAttribute("id");

      if (src && (src.includes("modules/script.js") || src.includes("code.jquery.com/jquery") || src.includes("highlight/"))) {
        return;
      }

      // 소프로젝트 하위의 페이지 종속 스크립트들은 재진입 시 항상 새로 실행하도록 기존 캐시 태그 노드 제거
      if (src && (src.includes("/small-project/") || src.includes("/modules/features/"))) {
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
          existingScript.remove();
        }
      } else if (src && document.querySelector(`script[src="${src}"]`)) {
        return; // 이미 로드된 스크립트 실행 생략
      }

      const newScript = document.createElement("script");
      const scriptType = oldScript.getAttribute("type");
      if (scriptType) newScript.type = scriptType;
      if (src) {
        newScript.src = src;
        newScript.async = false; // 브라우저 스크립트 실행 순서 보장 (defer/순서 준수)
        if (id) newScript.id = id;
        document.head.appendChild(newScript);

        if (src.includes("mathjax")) {
          newScript.onload = () => {
            if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
              const article = document.querySelector("article");
              window.MathJax.typesetPromise([article]).catch(err => {
                console.warn("MathJax onload typeset error:", err);
              });
            }
          };
        }
      } else {
        // 일반 인라인 스크립트의 경우, const/let 재선언 SyntaxError를 방지하기 위해 IIFE로 래핑하여 실행
        if (scriptType !== "module") {
          newScript.textContent = `(function(){\n${oldScript.textContent}\n})();`;
        } else {
          newScript.textContent = oldScript.textContent;
        }
        document.body.appendChild(newScript);
        // type=module 스크립트는 append 후에도 DOM에 남겨야 실행되므로 remove() 생략
        if (scriptType !== "module") newScript.remove();
      }
    });
  }

  function postLoadPageActions(isHome, urlPath, docTitle) {
    const state = window.SiteModules.state;

    if (isHome) {
      state.currentPath = "/index.html";
      state.category = "";
      state.cur_doc = { title: "홈", dir: "", file: "index.html" };
      state.prv_doc = { title: "", dir: "", file: "" };
      state.next_doc = { title: "", dir: "", file: "" };
      document.title = "iseohyun.com";
    } else {
      state.currentPath = urlPath;

      const list = window.SiteModules.hierarchyListCached;
      if (list) {
        const found = populateDocState(list, state.currentPath);
        if (!found) {
          const fallbackTitles = {
            "/promo.html": "홍보",
            "/info.html": "사이트 소개"
          };
          state.cur_doc = { title: docTitle || fallbackTitles[urlPath] || "", dir: "", file: urlPath.replace(/^\//, "") };
          state.prv_doc = { title: "", dir: "", file: "" };
          state.next_doc = { title: "", dir: "", file: "" };
          state.category = "";
        }
      }

    }

    // A. 사이드바 트리 활성 메뉴 노드 표시 및 오토 익스팬드
    highlightSitemapTree(state.currentPath);

    // B. 목차 초기화
    if (window.SiteModules.TOC && typeof window.SiteModules.TOC.init === 'function') {
      window.SiteModules.TOC.init();
    }

    // C. 목차 리스트 렌더링
    const tocTree = document.getElementById("toc-tree");
    if (tocTree) {
      tocTree.innerHTML = "";
      if (window.SiteModules.TOC && typeof window.SiteModules.TOC.addContentsList === 'function' && !isHome) {
        window.SiteModules.TOC.addContentsList(tocTree);
      }
    }

    // D. 목차 탭 문서 세부사항 및 버튼 갱신
    updateTOCPanelInfo(isHome, docTitle);

    // E. 참조 및 copyright 재계산 생략 (피드백 이관 이후 맨 아래 배치 위해 연기)

    // F. 코드 하이라이트 구동
    if (window.SiteModules.CodeLoader && typeof window.SiteModules.CodeLoader.init === 'function') {
      window.SiteModules.CodeLoader.init();
    }

    // G. 코드 카피 버튼 재구축
    if (window.SiteModules.Clipboard && typeof window.SiteModules.Clipboard.init === 'function') {
      window.SiteModules.Clipboard.init();
    }

    // I. 튜토리얼 기능 연동
    updatePageFeatures();

    // I-2. MathJax 수식 렌더링 구동 (DOM 수정 완료 후, 최종 스크롤 정렬 직전에 실행하여 렌더링 후의 정확한 높이로 스크롤 정렬 보장)
    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
      const article = document.querySelector("article");
      if (article) {
        window.MathJax.typesetPromise([article]).catch(err => {
          console.warn("MathJax post-load typeset error:", err);
        });
      }
    }

    // E. 참조 및 copyright 재계산
    if (window.SiteModules.Document && typeof window.SiteModules.Document.init === 'function') {
      window.SiteModules.Document.init();
    }

    // 헤더: 제목을 맞추고, 홈이 아니면 홈 전용 필터/설정 패널을 내린다
    window.SiteModules.Header.setTitle(isHome ? "iseohyun.com" : (state.cur_doc.title || docTitle || ""));
    window.SiteModules.Header.setTabs(buildHeaderTabs(isHome, urlPath));

    // J. 서브 앵커 스크롤바 정렬 (querySelector 대신 안전한 getElementById 사용)
    const hash = window.location.hash;
    const lastHashIndex = hash.lastIndexOf("#");
    if (lastHashIndex > 0) {
      const subHash = hash.substring(lastHashIndex);
      if (subHash.startsWith('#')) {
        const id = decodeURIComponent(subHash.substring(1));
        const targetElement = document.getElementById(id);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: "smooth" });
        }
      }
    } else {
      window.scrollTo(0, 0);
    }
  }

  function highlightSitemapTree(currentPath) {
    const sitemapTree = document.getElementById("sitemap-tree");
    if (!sitemapTree) return;

    sitemapTree.querySelectorAll(".this-doc, .this-path, a.this-path").forEach(el => {
      el.classList.remove("this-doc", "this-path");
    });

    if (currentPath === "/index.html" || currentPath === "/") return;

    const activeAnchor = sitemapTree.querySelector(`a[href$="${currentPath}"]`);
    if (activeAnchor) {
      let li = activeAnchor.parentElement;
      li.classList.add("this-doc");

      let parent = li.parentElement;
      while (parent && parent !== sitemapTree) {
        if (parent.tagName === "LI" && parent.classList.contains("folder")) {
          parent.classList.add("this-path");
          parent.classList.remove("collapsed");
        }
        parent = parent.parentElement;
      }
    }
  }

  function updateTOCPanelInfo(isHome, pageTitle) {
    const panelTitle = document.getElementById("panel-title");
    const tabTOC = document.getElementById("tab-toc");
    if (!tabTOC) return;

    const existingDetails = tabTOC.querySelector(".toc-doc-details");
    if (existingDetails) existingDetails.remove();

    if (isHome) {
      if (panelTitle && document.getElementById("nav-toc").classList.contains("active")) {
        panelTitle.textContent = "목차 보기";
      }
      const tocTree = document.getElementById("toc-tree");
      if (tocTree) {
        tocTree.innerHTML = "<li style='padding: 10px; color: #747775; font-size: 0.85em;'>목차를 표시할 수 없는 페이지입니다.</li>";
      }
      return;
    }

    const state = window.SiteModules.state;

    // 문서 세부 정보 패널 구성
    const detailsDiv = document.createElement("div");
    detailsDiv.className = "toc-doc-details";

    // 5-2. 하단 이전글/다음글 단추 배치
    const navBtnDiv = document.createElement("div");
    navBtnDiv.className = "toc-doc-nav-buttons";

    const prevBtn = document.createElement("a");
    prevBtn.className = "nav-btn";
    if (state.prv_doc && state.prv_doc.file) {
      const parentDirs = state.prv_doc.parentDirs || "";
      prevBtn.href = `/${parentDirs}${state.prv_doc.dir || ""}${state.prv_doc.file}`;
      prevBtn.textContent = "이전글";
    } else {
      prevBtn.classList.add("disabled");
      prevBtn.textContent = "이전글 없음";
    }
    navBtnDiv.appendChild(prevBtn);

    const nextBtn = document.createElement("a");
    nextBtn.className = "nav-btn";
    if (state.next_doc && state.next_doc.file) {
      const parentDirs = state.next_doc.parentDirs || "";
      nextBtn.href = `/${parentDirs}${state.next_doc.dir || ""}${state.next_doc.file}`;
      nextBtn.textContent = "다음글";
    } else {
      nextBtn.classList.add("disabled");
      nextBtn.textContent = "다음글 없음";
    }
    navBtnDiv.appendChild(nextBtn);

    detailsDiv.appendChild(navBtnDiv);
    tabTOC.insertBefore(detailsDiv, tabTOC.firstChild);

    // 액티브 패널 타이틀 지정
    if (panelTitle && document.getElementById("nav-toc").classList.contains("active")) {
      panelTitle.textContent = pageTitle || state.cur_doc.title || "목차";
    }
  }

  function renderHierarchy(data, parentElement, parentDirectories, directory) {
    if (Array.isArray(data)) {
      data.forEach((item) => {
        const listItem = document.createElement('li');
        const currentDirectory = item.디렉토리 || "";

        const hasFile = item.hasOwnProperty('파일명') || !item.hasOwnProperty('목록');
        if (hasFile) {
          const fileName = item.hasOwnProperty('파일명') ? item.파일명 : "index.html";
          const anchor = document.createElement('a');
          anchor.href = `/${parentDirectories}${currentDirectory}${fileName}`;
          anchor.textContent = item.주제;
          listItem.appendChild(anchor);

          if (item.hasOwnProperty('목록')) {
            listItem.classList.add('folder');
            if (directory.startsWith(currentDirectory)) {
              directory = directory.substring(currentDirectory.length);
              anchor.classList.add('this-path');
              listItem.classList.add('this-path');
            } else {
              listItem.classList.add('collapsed');
            }

            listItem.addEventListener('click', function (event) {
              if (event.target.closest('li') !== this) return;
              event.stopPropagation();
              this.classList.toggle('collapsed');
            });
          }
        } else {
          const text = document.createElement('span');
          text.textContent = item.주제;

          listItem.classList.add('folder');
          listItem.appendChild(text);

          if (directory.startsWith(currentDirectory)) {
            directory = directory.substring(currentDirectory.length);
            text.classList.add('this-path');
          } else {
            listItem.classList.add('collapsed');
          }

          listItem.addEventListener('click', function (event) {
            if (event.target.closest('li') !== this) return;
            event.stopPropagation();
            this.classList.toggle('collapsed');
          });
        }

        if (item.display == "hidden")
          return;

        if (item.목록 && item.목록.length > 0) {
          const sublist = document.createElement('ul');
          const previousParentDirectories = parentDirectories;
          parentDirectories += currentDirectory;
          renderHierarchy(item.목록, sublist, parentDirectories, directory);

          parentDirectories = previousParentDirectories;
          listItem.appendChild(sublist);
        }

        parentElement.appendChild(listItem);
      });
    }
  }

  function trigBoard(mode = "trigger") {
    const container = document.getElementById("sidebar-container");
    const panel = document.getElementById("sidebar-panel");
    const overlay = document.getElementById("sidebar-overlay");
    if (!container || !panel) return;

    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;

    if (isMobile) {
      let nextActive = !container.classList.contains("active");
      if (mode === "visible") {
        nextActive = true;
      } else if (mode === "hidden") {
        nextActive = false;
      }
      container.classList.toggle("active", nextActive);
      if (overlay) overlay.classList.toggle("active", nextActive);
      document.body.classList.toggle("mobile-nav-open", nextActive);
      if (nextActive) {
        setPanelCollapsed(false);
      }
    } else {
      const isCollapsed = panel.classList.contains("collapsed");
      let nextState = isCollapsed;

      if (mode === "trigger") {
        nextState = !isCollapsed;
      } else if (mode === "visible") {
        nextState = false;
      } else {
        nextState = true;
      }

      setPanelCollapsed(nextState);
    }
  }

  // 패널 머리의 제목을 지금 켜진 레일 탭에 맞춘다
  function updatePanelTitle() {
    const title = document.getElementById("panel-title");
    const activeTab = document.querySelector("#sidebar-nav .nav-item.active[data-panel-title]");
    if (title && activeTab) title.textContent = activeTab.getAttribute("data-panel-title");
  }

  function setPanelCollapsed(shouldCollapse) {
    const panel = document.getElementById("sidebar-panel");
    if (!panel) return;
    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;

    if (shouldCollapse) {
      panel.classList.add("collapsed");
      document.documentElement.style.setProperty('--sidebar-width', isMobile ? '0px' : RAIL_WIDTH);
      // 패널이 접히면 모든 탭 아이콘에서 active 클래스를 제거하여 비활성 상태로 보이도록 합니다.
      const tabs = ["nav-sitemap", "nav-toc", "nav-search"];
      tabs.forEach(id => {
        const tabEl = document.getElementById(id);
        if (tabEl) tabEl.classList.remove("active");
      });
    } else {
      panel.classList.remove("collapsed");
      document.documentElement.style.setProperty('--sidebar-width', isMobile ? '0px' : RAIL_AND_PANEL_WIDTH);

      // 패널이 펼쳐질 때, 만약 활성화된 탭이 없다면 기본적으로 nav-sitemap을 활성화합니다.
      const tabs = ["nav-sitemap", "nav-toc", "nav-search"];
      const activeExists = tabs.some(id => {
        const tabEl = document.getElementById(id);
        return tabEl && tabEl.classList.contains("active");
      });
      if (!activeExists) {
        const defaultTab = document.getElementById("nav-sitemap");
        if (defaultTab) {
          defaultTab.classList.add("active");
          const paneEl = document.getElementById("tab-sitemap");
          if (paneEl) {
            document.querySelectorAll("#sidebar-panel .tab-pane").forEach(pane => {
              pane.classList.remove("active");
            });
            paneEl.classList.add("active");
          }
        }
      }
      updatePanelTitle();
    }
  }

  function setDblClickListener(e) {
    const article = document.querySelector("article");
    if (!article) return;
    article.removeEventListener('dblclick', setDblClickListener);
    article.addEventListener('click', setClickListener);
    trigBoard("visible");
  }

  function setClickListener(e) {
    const article = document.querySelector("article");
    if (!article) return;
    article.removeEventListener('click', setClickListener);
    setTimeout(() => {
      article.addEventListener('dblclick', setDblClickListener);
    }, 2000);
    trigBoard("hidden");
  }

  function createModals() {
    const body = document.querySelector("body");

    // Help Modal
    if (!document.getElementById("help-modal-overlay")) {
      const helpModal = document.createElement("div");
      helpModal.id = "help-modal-overlay";
      helpModal.className = "site-modal-overlay";
      helpModal.innerHTML = `
        <div class="site-modal-card">
          <div class="site-modal-header">
            <span>인터페이스 가이드 (Help)</span>
            <span class="site-modal-close-btn" id="help-modal-close">&times;</span>
          </div>
          <div class="site-modal-body" id="help-modal-body"></div>
        </div>
      `;
      body.appendChild(helpModal);
    }

  }

  function bindSidebarEvents() {
    const sidebarOverlay = document.getElementById("sidebar-overlay");
    const sidebarContainer = document.getElementById("sidebar-container");

    function setMobileDrawerState(isOpen) {
      if (!sidebarContainer) return;
      sidebarContainer.classList.toggle("active", isOpen);
      if (sidebarOverlay) {
        sidebarOverlay.classList.toggle("active", isOpen);
      }
      document.body.classList.toggle("mobile-nav-open", isOpen);
      if (isOpen) {
        // 삼선 메뉴가 열릴 때 패널이 접혀 있다면 펼쳐서 메뉴 항목을 활성화
        setPanelCollapsed(false);
      }
    }

    const panelCloseBtn = document.getElementById("panel-close-btn");
    if (panelCloseBtn) {
      panelCloseBtn.addEventListener("click", () => trigBoard("hidden"));
    }

    if (sidebarOverlay) {
      sidebarOverlay.addEventListener("click", () => {
        setMobileDrawerState(false);
      });
    }

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && window.innerWidth <= MOBILE_BREAKPOINT && sidebarContainer && sidebarContainer.classList.contains("active")) {
        setMobileDrawerState(false);
      }
    });

    let lastIsMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    window.addEventListener("resize", () => {
      const nowIsMobile = window.innerWidth <= MOBILE_BREAKPOINT;
      if (nowIsMobile !== lastIsMobile) {
        lastIsMobile = nowIsMobile;
        const panel = document.getElementById("sidebar-panel");
        setMobileDrawerState(false);
        if (nowIsMobile) {
          document.documentElement.style.setProperty('--sidebar-width', '0px');
        } else {
          const isCollapsed = panel ? panel.classList.contains("collapsed") : true;
          document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? RAIL_WIDTH : RAIL_AND_PANEL_WIDTH);
        }
      }
    });

    const navHomeBtn = document.getElementById("nav-home");
    if (navHomeBtn) {
      navHomeBtn.addEventListener("click", () => {
        window.location.hash = "#/";
      });
    }

    const homeBtn = document.getElementById("home-btn");
    if (homeBtn) {
      homeBtn.addEventListener("click", () => {
        window.location.hash = "#/";
      });
    }

    // 모든폴더보기 액션 버튼 기동 (전체 열기/닫기 토글 & 현재 경로 열기)
    const toggleAllBtn = document.getElementById("sitemap-toggle-all-btn");
    if (toggleAllBtn) {
      toggleAllBtn.addEventListener("click", () => {
        const folders = document.querySelectorAll("#sitemap-tree li.folder, #sitemap-tree li");
        const isCollapse = toggleAllBtn.textContent === "전체 닫기";

        folders.forEach(f => {
          if (f.classList.contains("folder") || f.querySelector("ul")) {
            if (isCollapse) {
              f.classList.add("collapsed");
            } else {
              f.classList.remove("collapsed");
            }
          }
        });

        toggleAllBtn.textContent = isCollapse ? "전체 열기" : "전체 닫기";
      });
    }

    const openCurrentBtn = document.getElementById("sitemap-open-current-btn");
    if (openCurrentBtn) {
      openCurrentBtn.addEventListener("click", () => {
        // 1. Collapse all folders first
        const folders = document.querySelectorAll("#sitemap-tree li.folder, #sitemap-tree li");
        folders.forEach(f => {
          if (f.classList.contains("folder") || f.querySelector("ul")) {
            f.classList.add("collapsed");
          }
        });
        // 2. Sync the toggle-all button text
        const toggleAllBtn = document.getElementById("sitemap-toggle-all-btn");
        if (toggleAllBtn) {
          toggleAllBtn.textContent = "전체 열기";
        }
        // 3. Highlight/expand current path
        const state = window.SiteModules.state;
        highlightSitemapTree(state.currentPath);
      });
    }

    const searchOptions = document.querySelectorAll(".search-type-option");
    searchOptions.forEach(opt => {
      opt.addEventListener("click", () => {
        searchOptions.forEach(o => o.classList.remove("active"));
        opt.classList.add("active");
        
        const radio = opt.querySelector("input[type='radio']");
        if (radio) {
          radio.checked = true;
          const input = document.getElementById("sidebar-search-input");
          if (input) {
            if (radio.value === "title") {
              input.placeholder = "문서 제목 검색...";
            } else if (radio.value === "tag") {
              input.placeholder = "Tag 검색...";
            } else {
              input.placeholder = "전체 문서 검색...";
            }
            input.dispatchEvent(new Event("input"));
          }
        }
      });
    });

    const tabs = ["nav-sitemap", "nav-toc", "nav-search"];
    tabs.forEach(tabId => {
      const el = document.getElementById(tabId);
      if (el) {
        el.addEventListener("click", () => {
          const isActive = el.classList.contains("active");
          const panel = document.getElementById("sidebar-panel");
          const isPanelCollapsed = panel ? panel.classList.contains("collapsed") : true;

          if (isActive && !isPanelCollapsed) {
            // 이미 활성화된 탭을 열린 상태에서 또 누르면 좁게보기(접기)
            trigBoard("hidden");
          } else {
            tabs.forEach(id => {
              const tabEl = document.getElementById(id);
              if (tabEl) tabEl.classList.remove("active");
            });
            document.querySelectorAll("#sidebar-panel .tab-pane").forEach(pane => {
              pane.classList.remove("active");
            });

            el.classList.add("active");
            if (tabId === "nav-search") window.SiteModules.Search.ensureIndex();
            const targetTabPane = el.getAttribute("data-tab");
            const paneEl = document.getElementById(targetTabPane);
            if (paneEl) paneEl.classList.add("active");
            updatePanelTitle();

            trigBoard("visible");
          }
        });
      }
    });

    // 문의 창: 카카오톡 채널 추가 · 1:1 채팅 · 메일로 문의
    window.SiteModules.Contact.init({ closeDrawer: () => setMobileDrawerState(false) });

    const infoBtn = document.getElementById("nav-info");
    if (infoBtn) {
      infoBtn.addEventListener("click", () => {
        window.location.hash = "#/info.html";
      });
    }

    // 검색 입력 처리(제목/태그/전체)는 Search 모듈이 담당
    window.SiteModules.Search.bindInput();
  }







  function updatePageFeatures() {
    const featuresContainer = document.getElementById("sidebar-page-features");
    if (!featuresContainer) return;
    featuresContainer.innerHTML = "";

    const tutorials = document.querySelectorAll(".tutorial");
    if (tutorials.length > 0) {
      const tutorialBtn = document.createElement("div");
      tutorialBtn.className = "nav-item";
      tutorialBtn.id = "sidebar-tutorial-toggle";
      tutorialBtn.setAttribute("data-tooltip", "튜토리얼 표시 토글");
      tutorialBtn.innerHTML = window.SiteModules.Icons.html("school");

      let anyVisible = false;
      tutorials.forEach(t => {
        if (getComputedStyle(t).display !== "none") anyVisible = true;
      });
      if (anyVisible) tutorialBtn.classList.add("active");

      tutorialBtn.addEventListener("click", () => {
        trigTutorialInSidebar();
      });

      featuresContainer.appendChild(tutorialBtn);
    }
  }

  function trigTutorialInSidebar() {
    const tutorials = document.querySelectorAll(".tutorial");
    const iconBtn = document.getElementById("sidebar-tutorial-toggle");
    if (tutorials.length === 0) return;

    let active = false;
    tutorials.forEach(tutorial => {
      const currentDisplay = getComputedStyle(tutorial).display;
      if (currentDisplay === "none") {
        tutorial.style.display = "";
        active = true;
      } else {
        tutorial.style.display = "none";
      }
    });

    if (iconBtn) {
      if (active) {
        iconBtn.classList.add("active");
      } else {
        iconBtn.classList.remove("active");
      }
    }
  }








  return {
    init: init,
    trigBoard: trigBoard,
    findHierarchyPath: (hierarchy, title, currentPath) => window.SiteModules.Hierarchy.findPathByTitle(hierarchy, title, currentPath),
    registerPageCleanup: registerPageCleanup
  };
})();
