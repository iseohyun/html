/**
 * @file modules/core/navigation.js
 * @module SiteModules.Navigation
 * @description SPA 해시 라우터와 이중 사이드바(사이트맵/목차/검색 탭) UI를 담당하는 코어 모듈.
 *   검색은 SiteModules.Search, 문의 창은 SiteModules.Contact, hierarchy 순회는 SiteModules.Hierarchy에 위임한다.
 *   경로가 .md 로 끝나는 문서는 원문을 그대로 받아 SiteModules.Markdown 으로 그린다.
 *
 *   문서 스크립트가 쓰는 확장 지점 (모두 다른 문서로 옮길 때 자동으로 정리된다):
 *   - onLeave(fn) / registerPageCleanup(fn): 화면을 떠날 때 한 번 부를 정리 함수 (타이머·음성·덮개 해제).
 *     같은 시점에 document 에 "site:page-leave" 이벤트(detail.path = 떠나는 문서 경로)도 보낸다.
 *   - addRailItem({ id, icon, label, renderPanel }): 왼쪽 레일에 항목과 패널을 더한다. 기본 항목은 그대로 둔다.
 * @requires SiteModules.Config, SiteModules.Icons, SiteModules.Header, SiteModules.Hierarchy,
 *   SiteModules.Search, SiteModules.Contact, SiteModules.TOC, SiteModules.Document, SiteModules.Markdown
 * @exports init, trigBoard, findHierarchyPath, registerPageCleanup, onLeave, addRailItem, getScroller
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
  // 홈의 탭: 새소식(변경 이력), 프로젝트. 프로젝트 소개는 별도 문서(/promo.html)지만 같은 탭 줄에 둔다.
  // 새소식의 보기 방식과 주소: 달력(#/), 리스트(#/list). 탭이 아니라 새소식 위쪽의 보기 전환으로 고른다.
  const HOME_VIEW_BY_HASH = { "#/list": "list" };
  const HOME_VIEWS = [
    { id: "calendar", label: "달력", href: "#/" },
    { id: "list", label: "리스트", href: "#/list" }
  ];
  const PROMO_TAB = { id: "promo", label: "프로젝트", href: "#/promo.html" };
  const PROMO_PATH = "/promo.html";
  // 개론이 있는 묶음의 탭 줄에서 개론 탭의 이름
  const OVERVIEW_TAB_LABEL = "개론";
  // 자동 개론의 묶음 카드에 미리 보여 주는 하위 항목의 수
  const AUTO_OVERVIEW_PREVIEW_COUNT = 5;
  // 형제 문서를 탭으로 묶지 않는 경로 (서로 이어지는 글이 아닌 독립 프로젝트)
  const NO_SERIES_TAB_PREFIX = "/small-project/";
  // 화면별 스크롤 위치 (키: 문서 경로, 홈은 보기 방식까지)
  const scrollPositions = new Map();
  // 늦게 그려지는 화면에서 스크롤 위치를 되돌리려고 기다리는 최대 시간
  const SCROLL_RESTORE_WAIT_MS = 1500;
  // hierarchy.json에 없어도 SPA 본문으로 로드 가능한 루트 문서
  const KNOWN_ROOT_ARTICLES = ["/index.html", "/info.html", "/promo.html", "/settings.html", "/settings-keys.html", "/"];
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
  // 화면을 떠날 때 document 에 보내는 이벤트 이름
  const PAGE_LEAVE_EVENT = "site:page-leave";
  // 지금 문서가 addRailItem 으로 더한 레일 항목: { options, nav, pane, isOpen }
  const pageRailItems = [];

  /**
   * 페이지 종속 스크립트가 SPA 전환 시 실행할 정리 함수를 등록한다. (onLeave 는 같은 함수의 다른 이름)
   * (전역 변수 삭제, 타이머/리스너/Worker 해제, 음성 합성 중지, 전체 화면 덮개 제거 등)
   * 다음 화면(문서든 홈이든)을 그리기 직전에 등록한 순서대로 한 번씩 부르고 목록을 비운다.
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

  /**
   * 지금 화면을 떠난다: 다음 화면(문서 또는 홈)을 그리기 직전에 한 번 부른다.
   * 화면이 등록한 정리 함수를 실행하고, 화면이 더한 헤더 동작 단추와 레일 항목을 거둔다.
   * 같은 문서 안에서 앵커만 옮길 때는 부르지 않는다.
   */
  function leaveCurrentPage() {
    runPageCleanups();
    document.dispatchEvent(new CustomEvent(PAGE_LEAVE_EVENT, { detail: { path: window.SiteModules.state.currentPath || "" } }));
    window.SiteModules.Header.setActions([]);
    removePageRailItems();
  }

  // ---------------------------------------------------------------------------
  // 레일 확장: 문서가 더하는 항목 (기본 항목 홈/사이트맵/검색/문의/소개는 그대로 둔다)
  // ---------------------------------------------------------------------------

  // 패널을 여는 레일 항목 전부 (기본 탭 + 문서가 더한 탭)
  function getRailTabs() {
    return Array.from(document.querySelectorAll("#sidebar-nav .nav-item[data-tab]"));
  }

  function isRailItemOpen(item) {
    const panel = document.getElementById("sidebar-panel");
    const container = document.getElementById("sidebar-container");
    if (!item.pane || !panel || panel.classList.contains("collapsed") || !item.nav.classList.contains("active")) return false;
    // 좁은 화면에서는 서랍이 열려 있어야 보인다
    return window.innerWidth > MOBILE_BREAKPOINT || (!!container && container.classList.contains("active"));
  }

  // 문서가 더한 항목의 패널이 열리고 닫힌 것을 알린다 (레일/패널/서랍의 상태가 바뀔 때마다 부른다)
  function syncPageRailItems() {
    pageRailItems.forEach(item => {
      const isOpen = isRailItemOpen(item);
      if (isOpen === item.isOpen) return;
      item.isOpen = isOpen;
      const callback = isOpen ? item.options.onOpen : item.options.onClose;
      if (typeof callback !== "function") return;
      try {
        callback(item.pane);
      } catch (err) {
        console.error(`[Rail] "${item.options.id}" 항목의 ${isOpen ? "onOpen" : "onClose"} 실행 실패:`, err);
      }
    });
  }

  // 레일 탭을 누른 것처럼 그 탭의 패널을 연다
  function activateRailTab(tabEl) {
    getRailTabs().forEach(other => other.classList.remove("active"));
    document.querySelectorAll("#sidebar-panel .tab-pane").forEach(pane => pane.classList.remove("active"));

    tabEl.classList.add("active");
    if (tabEl.id === "nav-search") window.SiteModules.Search.ensureIndex();
    const paneEl = document.getElementById(tabEl.getAttribute("data-tab"));
    if (paneEl) paneEl.classList.add("active");
    updatePanelTitle();
    trigBoard("visible");
    syncPageRailItems();
  }

  function onRailTabClick(tabEl) {
    const panel = document.getElementById("sidebar-panel");
    const isPanelCollapsed = panel ? panel.classList.contains("collapsed") : true;
    if (tabEl.classList.contains("active") && !isPanelCollapsed) {
      // 이미 활성화된 탭을 열린 상태에서 또 누르면 좁게보기(접기)
      trigBoard("hidden");
    } else {
      activateRailTab(tabEl);
    }
  }

  /**
   * 지금 문서 전용 레일 항목을 더한다. 기본 항목 아래(문서 기능 자리)에 놓이고, 다른 문서로 옮기면 저절로 사라진다.
   * renderPanel 이 있으면 누를 때 사이드 패널에 자기 내용을 여는 탭이 되고(좁은 화면의 서랍에서도 같다),
   * 없으면 onClick 만 부르는 단추가 된다. 단축키는 붙지 않는다.
   * @param {{id: string, icon: string, label: string,
   *   renderPanel?: (container: HTMLElement) => void,
   *   onOpen?: (container: HTMLElement) => void, onClose?: (container: HTMLElement) => void,
   *   onClick?: (event: MouseEvent) => void}} options
   *   id: 영문/숫자/하이픈/밑줄. 요소 id 는 nav-page-<id>, 패널은 tab-page-<id>
   *   icon: SiteModules.Icons 의 이름 (없는 그림은 Icons.register 로 먼저 더한다)
   *   label: 풍선 도움말과 패널 제목
   *   renderPanel: 패널 내용을 그린다. 더할 때 한 번만 부른다 (container 는 빈 div.tab-pane)
   *   onOpen/onClose: 패널이 보이게 될 때/가려질 때마다
   * @returns {Function} 항목을 지우는 함수. 실패하면 아무 일도 하지 않는 함수
   */
  function addRailItem(options) {
    const noop = function () {};
    const featuresContainer = document.getElementById("sidebar-page-features");
    const panelBody = document.querySelector("#sidebar-panel .panel-body");
    if (!options || !/^[A-Za-z0-9_-]+$/.test(String(options.id || "")) || !featuresContainer || !panelBody) {
      console.warn("[Rail] 레일 항목을 더하지 못했습니다 (id 가 없거나 뼈대가 아직 없습니다):", options);
      return noop;
    }
    if (pageRailItems.some(item => item.options.id === options.id)) {
      console.warn(`[Rail] 이미 있는 레일 항목입니다: ${options.id}`);
      return noop;
    }

    const label = options.label || "";
    const nav = document.createElement("div");
    nav.className = "nav-item nav-page-item";
    nav.id = `nav-page-${options.id}`;
    nav.setAttribute("role", "button");
    nav.setAttribute("aria-label", label);
    nav.setAttribute("data-tooltip", label);
    nav.innerHTML = window.SiteModules.Icons.html(options.icon);

    let pane = null;
    if (typeof options.renderPanel === "function") {
      pane = document.createElement("div");
      pane.className = "tab-pane tab-page-pane";
      pane.id = `tab-page-${options.id}`;
      nav.setAttribute("data-tab", pane.id);
      nav.setAttribute("data-panel-title", label);
      panelBody.appendChild(pane);
      try {
        options.renderPanel(pane);
      } catch (err) {
        console.error(`[Rail] "${options.id}" 항목의 패널을 그리지 못했습니다:`, err);
      }
    }

    const item = { options: options, nav: nav, pane: pane, isOpen: false };
    nav.addEventListener("click", (event) => {
      if (pane) onRailTabClick(nav);
      if (typeof options.onClick === "function") options.onClick(event);
    });
    featuresContainer.appendChild(nav);
    pageRailItems.push(item);

    return function () { removeRailItem(item); };
  }

  function removeRailItem(item) {
    const index = pageRailItems.indexOf(item);
    if (index === -1) return;
    pageRailItems.splice(index, 1);

    const wasActive = item.nav.classList.contains("active");
    item.nav.remove();
    if (item.pane) item.pane.remove();
    if (item.isOpen && typeof item.options.onClose === "function") {
      try {
        item.options.onClose(item.pane);
      } catch (err) {
        console.error(`[Rail] "${item.options.id}" 항목의 onClose 실행 실패:`, err);
      }
    }
    // 보고 있던 패널이 사라졌으면 패널이 비지 않게 기본 탭(사이트맵)으로 돌린다
    const panel = document.getElementById("sidebar-panel");
    if (wasActive && item.pane && panel && !panel.classList.contains("collapsed")) setPanelCollapsed(false);
  }

  function removePageRailItems() {
    // 지우는 함수가 목록을 고치므로 사본을 돈다
    pageRailItems.slice().forEach(removeRailItem);
  }

  // 로그인 상태가 바뀌었을 때: 사이트맵 트리와 헤더 탭을 다시 그리고, 지금 화면이 영향을 받으면 다시 불러온다
  function refreshForAuth() {
    const Hierarchy = window.SiteModules.Hierarchy;
    const nextShowDev = window.SiteModules.Auth.isAdmin();
    if (Hierarchy.isShowingDev() === nextShowDev) return;
    Hierarchy.setShowDev(nextShowDev);

    const list = window.SiteModules.hierarchyListCached;
    const tree = document.getElementById("sitemap-tree");
    const state = window.SiteModules.state;
    if (!list || !tree) return;

    tree.innerHTML = "";
    renderHierarchy(list, tree, '');
    highlightSitemapTree(state.currentPath);

    const currentPath = state.currentPath || "";
    if (Hierarchy.isDevPath(list, currentPath)) {
      // 막혀 있던 개발중 문서를 열거나, 보고 있던 개발중 문서를 가린다
      state.currentPath = "";
      loadPageRoute(currentPath);
    } else if (currentPath.startsWith(Hierarchy.AUTO_OVERVIEW_PREFIX)) {
      loadAutoOverviewRoute(currentPath);
    } else {
      window.SiteModules.Header.setTabs(buildHeaderTabs(currentPath === "/index.html", currentPath));
    }
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

    const Hierarchy = window.SiteModules.Hierarchy;
    // 이웃이 문서가 아니라 분류면 갈 곳이 없다 (file 이 빈 값)
    const toNeighborDoc = (neighbor) => {
      if (!neighbor || !Hierarchy.isPageItem(neighbor)) return { title: neighbor ? neighbor.주제 : "", dir: "", file: "" };
      return { title: neighbor.주제, dir: "", file: Hierarchy.getItemUrl(page.parentDirs, neighbor).slice(1), parentDirs: "" };
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
      // 새소식 탭은 마지막으로 보던 보기 방식(달력/리스트)으로 돌아간다
      const lastView = HOME_VIEWS.find(view => view.id === window.SiteModules.state.homeView) || HOME_VIEWS[0];
      return [
        { label: "새소식", href: lastView.href, selected: isHome },
        { label: PROMO_TAB.label, href: PROMO_TAB.href, selected: !isHome }
      ];
    }

    const list = window.SiteModules.hierarchyListCached;
    if (!list || !urlPath || urlPath.startsWith(NO_SERIES_TAB_PREFIX)) return [];

    const Hierarchy = window.SiteModules.Hierarchy;
    const page = Hierarchy.findPage(list, urlPath.split('#')[0]);
    if (!page) return [];

    // 개론이 있는 묶음: [개론][그 안의 문서들]. 개론을 보고 있을 때도, 그 안의 문서를 보고 있을 때도 같은 탭 줄이다.
    const isOverview = Object.prototype.hasOwnProperty.call(page.item, '목록');
    const tabs = [];
    let seriesDocs;
    let seriesDirs;
    if (isOverview) {
      tabs.push({ label: OVERVIEW_TAB_LABEL, href: `#${page.url}`, selected: true });
      seriesDocs = Hierarchy.visibleItems(page.item.목록).filter(Hierarchy.isPageItem);
      seriesDirs = Hierarchy.resolveDirs(page.parentDirs, page.item.디렉토리);
    } else {
      if (page.parentOverviewUrl) tabs.push({ label: OVERVIEW_TAB_LABEL, href: `#${page.parentOverviewUrl}`, selected: false });
      seriesDocs = page.siblings.filter(Hierarchy.isPageItem);
      seriesDirs = page.parentDirs;
    }

    seriesDocs.forEach(item => tabs.push({
      label: item.주제 || "",
      href: `#${Hierarchy.getItemUrl(seriesDirs, item)}`,
      selected: item === page.item
    }));
    return tabs.length < 2 ? [] : tabs;
  }

  // 본문 스크롤 영역(#app-main): 페이지 전체가 아니라 이 영역만 스크롤한다. 문서(article)를 감싸서 만든다.
  function ensureMainScroller() {
    let main = document.getElementById("app-main");
    if (main) return main;
    const article = document.querySelector("article");
    if (!article) return null;
    main = document.createElement("main");
    main.id = "app-main";
    article.parentNode.insertBefore(main, article);
    main.appendChild(article);
    installWindowScrollCompat(main);
    return main;
  }

  // 호환 처리: 예전 문서와 소프로젝트 중에는 창(window)의 스크롤에 기대는 코드가 있다
  // (window.scrollY 를 읽거나 window/document 의 scroll 이벤트를 듣는다).
  // 본문 영역의 스크롤을 창의 스크롤처럼 보이게 이어 준다.
  function installWindowScrollCompat(main) {
    try {
      ["scrollY", "pageYOffset"].forEach(name => {
        Object.defineProperty(window, name, { configurable: true, get: () => main.scrollTop });
      });
    } catch (err) {
      console.warn("[Router] window.scrollY 호환 처리를 적용하지 못했습니다:", err);
    }
    main.addEventListener("scroll", () => {
      window.dispatchEvent(new Event("scroll"));
      document.dispatchEvent(new Event("scroll"));
    }, { passive: true });
  }

  function getScroller() {
    return document.getElementById("app-main") || document.scrollingElement || document.documentElement;
  }

  function init() {
    const state = window.SiteModules.state;
    state.currentPath = window.location.pathname;
    ensureMainScroller();

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
          </div>
          <div class="nav-item" id="nav-search" data-tab="tab-search" data-tooltip="검색" data-panel-title="문서 검색">
            ${icon("search")}
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

          <!-- 목차는 오른쪽 목차 사이드바(#toc-drawer, toc.js)에 있다 -->
          <!-- 2. Search Pane -->
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

        // 초기 상태 로드 (지금 문서까지의 가지는 라우터가 highlightSitemapTree 로 펼친다)
        renderHierarchy(list, baseUl, '');

        // 관리자로 로그인하거나 로그아웃하면 개발중 문서가 보이거나 사라지도록 다시 그린다
        window.SiteModules.Auth.onChange(refreshForAuth);
        window.SiteModules.Auth.init();

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
            // 마크다운 문서 링크: 사이트맵에 등록된 문서면 SPA 로 열고, 아니면 브라우저가 원문을 열게 둔다
            if (isMarkdownPath(href) && anchor.getAttribute("target") !== "_blank") {
              const markdownPath = resolveRelativePath(window.SiteModules.state.currentPath || "/index.html", href.split(/[?#]/)[0]);
              if (window.SiteModules.hierarchyListCached && isKnownArticlePage(markdownPath)) {
                e.preventDefault();
                const anchorIdx = href.indexOf("#");
                window.location.hash = "#" + markdownPath + (anchorIdx !== -1 ? href.substring(anchorIdx) : "");
              }
              return;
            }

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


  // 다음 화면 전환 한 번은 좁은 화면의 서랍을 닫지 않는다 (사이트맵에서 묶음을 열 때 켠다)
  let keepDrawerOpenOnce = false;

  function handleRouteChange() {
    // 떠나는 화면의 스크롤 위치를 적어 둔다
    rememberScrollPosition();

    let hash = window.location.hash;
    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    // 사이트맵에서 묶음을 열어 개론으로 온 경우에는 서랍을 닫지 않는다 (하위 목록을 이어서 고를 수 있게)
    const keepDrawerOpen = keepDrawerOpenOnce;
    keepDrawerOpenOnce = false;

    if (isMobile && !keepDrawerOpen) {
      const container = document.getElementById("sidebar-container");
      const overlay = document.getElementById("sidebar-overlay");
      if (container) container.classList.remove("active");
      if (overlay) overlay.classList.remove("active");
      document.body.classList.remove("mobile-nav-open");
      syncPageRailItems();
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
      let targetFullPath = "/" + urlPath;
      // 자동 개론의 주소는 한글 제목 경로다: 브라우저가 % 로 바꿔 둔 것을 되돌려 한 가지 모양으로 다룬다
      const isAutoOverview = targetFullPath.startsWith(window.SiteModules.Hierarchy.AUTO_OVERVIEW_PREFIX);
      if (isAutoOverview) {
        try { targetFullPath = decodeURIComponent(targetFullPath); } catch (err) { /* 잘못된 % 표기는 그대로 둔다 */ }
      }
      const state = window.SiteModules.state;
      if (state.currentPath === targetFullPath) {
        if (subAnchor) {
          const id = decodeURIComponent(subAnchor);
          const targetElement = document.getElementById(id);
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: "smooth" });
          }
        } else {
          getScroller().scrollTo({ top: 0, behavior: "instant" });
        }
        return;
      }

      if (isAutoOverview) loadAutoOverviewRoute(targetFullPath);
      else loadPageRoute(targetFullPath);
    }
  }

  // 자동 개론: 개론 문서가 없는 묶음의 하위 목록을 사이트맵에서 만들어 본문에 보여 준다.
  //   묶음은 카드(이름 · 글 수 · 안에 든 것 몇 가지)로, 낱개 문서는 목록으로 그린다.
  function loadAutoOverviewRoute(urlPath) {
    const article = document.querySelector("article");
    if (!article) return;
    const Hierarchy = window.SiteModules.Hierarchy;

    leaveCurrentPage();
    window.SiteModules.state.lastModifiedDate = null;

    const found = Hierarchy.findFolderByUrl(window.SiteModules.hierarchyListCached || [], urlPath);
    if (!found) {
      window.SiteModules.state.currentPath = urlPath;
      highlightSitemapTree(urlPath);
      renderErrorState(article, new Error("사이트맵에 없는 묶음입니다."), () => loadAutoOverviewRoute(urlPath));
      return;
    }

    const isFolderItem = (item) => Object.prototype.hasOwnProperty.call(item, '목록');
    const children = Hierarchy.visibleItems(found.item.목록);
    const folders = children.filter(isFolderItem);
    const pages = children.filter(item => !isFolderItem(item));
    // 하위 묶음으로 가는 주소: 개론 문서가 있으면 그 문서, 없으면 그 묶음의 자동 개론
    const folderHref = (item) => Hierarchy.isPageItem(item)
      ? Hierarchy.getItemUrl(found.dirs, item)
      : Hierarchy.getAutoOverviewUrl(found.titles.concat(item.주제));

    const wrap = document.createElement("div");
    wrap.className = "auto-overview";

    const lead = document.createElement("p");
    lead.className = "auto-overview-lead";
    const total = Hierarchy.countPages(found.item);
    lead.textContent = total > 0 ? `이 묶음에는 글이 ${total}편 있습니다.` : "아직 글이 없습니다.";
    wrap.appendChild(lead);

    if (folders.length > 0) {
      const grid = document.createElement("div");
      grid.className = "auto-overview-grid";
      folders.forEach(item => {
        const card = document.createElement("a");
        card.className = "auto-overview-card";
        card.href = `#${folderHref(item)}`;

        const name = document.createElement("strong");
        name.className = "auto-overview-name";
        name.textContent = item.주제;
        const count = document.createElement("span");
        count.className = "auto-overview-count";
        count.textContent = `(${Hierarchy.countPages(item)})`;
        name.appendChild(count);

        const preview = document.createElement("span");
        preview.className = "auto-overview-preview";
        const names = Hierarchy.visibleItems(item.목록).map(child => child.주제);
        preview.textContent = names.slice(0, AUTO_OVERVIEW_PREVIEW_COUNT).join(" · ") + (names.length > AUTO_OVERVIEW_PREVIEW_COUNT ? " …" : "");

        card.append(name, preview);
        grid.appendChild(card);
      });
      wrap.appendChild(grid);
    }

    if (pages.length > 0) {
      const listEl = document.createElement("ul");
      listEl.className = "auto-overview-pages";
      pages.forEach(item => {
        const li = document.createElement("li");
        if (item.형식) li.classList.add("is-app");
        const link = document.createElement("a");
        link.href = `#${Hierarchy.getItemUrl(found.dirs, item)}`;
        link.textContent = item.주제;
        li.appendChild(link);
        listEl.appendChild(li);
      });
      wrap.appendChild(listEl);
    }

    article.replaceChildren(wrap);
    document.title = `${found.item.주제} - iseohyun.com`;
    postLoadPageActions(false, urlPath, found.item.주제);
  }

  // 홈 페이지 (index.html 기본 내용)를 동적으로 완전 빌드 (무한 대기 루프 완벽 제거)
  function loadHomeRoute(view = "calendar") {
    const article = document.querySelector("article");
    if (!article) return;

    leaveCurrentPage();
    window.SiteModules.state.homeView = view;

    if (window.SiteModules && window.SiteModules.state) {
      window.SiteModules.state.lastModifiedDate = null;
    }

    // 구조 빌드
    const viewSwitch = HOME_VIEWS.map(item =>
      `<a class="pill-btn" href="${item.href}" data-view="${item.id}" aria-current="${item.id === view ? "true" : "false"}">${item.label}</a>`
    ).join("");
    article.innerHTML = `
      <nav class="home-view-switch" id="home-view-switch" aria-label="새소식 보기 방식">${viewSwitch}</nav>
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

  // 마크다운 문서 경로인지 (원문을 받아 SiteModules.Markdown 으로 그린다)
  function isMarkdownPath(urlPath) {
    return /\.md$/i.test(String(urlPath).split(/[?#]/)[0]);
  }

  // 해시 경로가 동일 출처의 HTML/마크다운 문서인지 검증 (예: "#//evil.com/x.html" 같은 프로토콜 상대 URL 차단)
  function isSafeInternalPath(urlPath) {
    try {
      const resolved = new URL(urlPath, window.location.origin);
      return resolved.origin === window.location.origin && /\.(html?|md)$/i.test(resolved.pathname);
    } catch (e) {
      return false;
    }
  }

  // 본문 영역의 오류 경계: 문서를 그리다 오류가 나도 하얀 화면 대신 안내와 다시 시도 버튼을 보여 준다.
  // 헤더와 사이드바는 그대로 살아 있어 다른 페이지로 옮길 수 있다.
  // @param {string} [titleText] 안내의 제목 (기본: "문제가 생겼습니다")
  function renderErrorState(article, err, retry, titleText = "문제가 생겼습니다") {
    const box = document.createElement("div");
    box.className = "error-state";
    box.setAttribute("role", "alert");

    const title = document.createElement("strong");
    title.className = "error-state-title";
    title.textContent = titleText;
    const detail = document.createElement("p");
    detail.className = "error-state-detail";
    detail.textContent = (err && err.message) ? err.message : "알 수 없는 오류입니다.";

    const actions = document.createElement("div");
    actions.className = "error-state-actions";
    const retryBtn = document.createElement("button");
    retryBtn.type = "button";
    retryBtn.className = "pill-btn";
    retryBtn.id = "error-retry-btn";
    retryBtn.textContent = "다시 시도";
    retryBtn.addEventListener("click", retry);
    const reloadBtn = document.createElement("button");
    reloadBtn.type = "button";
    reloadBtn.className = "pill-btn";
    reloadBtn.id = "error-reload-btn";
    reloadBtn.textContent = "새로 고침";
    reloadBtn.addEventListener("click", () => window.location.reload());
    actions.append(retryBtn, reloadBtn);

    box.append(title, detail, actions);
    article.replaceChildren(box);
    window.SiteModules.Header.setTitle(titleText);
    window.SiteModules.Header.setTabs([]);
  }

  // 화면마다 보던 스크롤 위치를 적어 두고, 돌아오면 되돌린다 (새로 고치면 지워진다)
  function getScrollKey() {
    const state = window.SiteModules.state;
    if (!state.currentPath) return "";
    return state.currentPath === "/index.html" ? `/index.html#${state.homeView || "calendar"}` : state.currentPath;
  }

  function rememberScrollPosition() {
    const key = getScrollKey();
    if (key) scrollPositions.set(key, getScroller().scrollTop);
  }

  // 내용이 늦게 그려지는 화면(홈의 달력 등)은 높이가 찰 때까지 잠깐 기다렸다가 되돌린다.
  // 그 사이 사용자가 직접 스크롤하면 그만둔다.
  function restoreScrollPosition() {
    const saved = scrollPositions.get(getScrollKey()) || 0;
    const scroller = getScroller();
    // 되돌릴 때는 부드럽게 움직이지 않고 바로 그 자리로 간다
    const jump = () => scroller.scrollTo({ top: saved, behavior: "instant" });
    jump();
    if (saved <= 0) return;

    const startedAt = Date.now();
    let cancelled = false;
    const cancel = () => { cancelled = true; };
    window.addEventListener("wheel", cancel, { once: true, passive: true });
    window.addEventListener("touchstart", cancel, { once: true, passive: true });
    window.addEventListener("keydown", cancel, { once: true });

    const retry = () => {
      if (cancelled || Math.abs(scroller.scrollTop - saved) < 2) return;
      jump();
      if (Date.now() - startedAt < SCROLL_RESTORE_WAIT_MS) setTimeout(retry, 100);
    };
    setTimeout(retry, 100);
  }

  async function loadPageRoute(urlPath) {
    const article = document.querySelector("article");
    if (!article) return;

    if (!isSafeInternalPath(urlPath)) {
      console.warn("[Router] 허용되지 않은 경로를 차단했습니다:", urlPath);
      window.location.hash = "#/";
      return;
    }

    // 개발중인 문서는 관리자에게만 보여 준다 (가리는 것일 뿐이다: 파일은 공개되어 있다)
    const hierarchyList = window.SiteModules.hierarchyListCached;
    if (hierarchyList && !window.SiteModules.Hierarchy.isShowingDev() && window.SiteModules.Hierarchy.isDevPath(hierarchyList, urlPath)) {
      leaveCurrentPage();
      window.SiteModules.Header.setPanels({});
      window.SiteModules.state.currentPath = urlPath;
      highlightSitemapTree(urlPath);
      renderErrorState(article, new Error("관리자로 로그인하면 볼 수 있습니다. 왼쪽의 문의 아이콘에서 로그인합니다."), () => loadPageRoute(urlPath), "개발 중인 문서입니다");
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

    // 이전 페이지가 등록한 정리 함수 실행, 이전 페이지가 더한 헤더 동작 단추와 레일 항목 제거
    leaveCurrentPage();
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

      if (isMarkdownPath(urlPath)) {
        renderMarkdownPage(article, urlPath, htmlText, response);
        return;
      }

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
      renderErrorState(article, err, () => loadPageRoute(urlPath));
    }
  }

  // 마크다운 문서: 원문(.md)을 그대로 받아 변환기로 그린 뒤 HTML 문서와 같은 후처리(제목·탭·목차·스크롤)를 한다
  function renderMarkdownPage(article, urlPath, markdownText, response) {
    // 정적 호스팅이 없는 경로에 SPA 껍데기(HTML)를 대신 돌려주는 경우를 걸러 낸다
    if (/^\s*<!doctype html/i.test(markdownText)) {
      throw new Error(`Failed to load: ${urlPath} (마크다운 문서가 아닙니다)`);
    }
    const parsed = window.SiteModules.Markdown.parse(markdownText, { basePath: urlPath });

    const lastModifiedHeader = response.headers.get("Last-Modified");
    window.SiteModules.state.lastModifiedDate = lastModifiedHeader ? new Date(lastModifiedHeader) : null;

    article.innerHTML = parsed.html;
    postLoadPageActions(false, urlPath, parsed.title);
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
            "/info.html": "사이트 소개",
            "/settings.html": "전체 설정",
            "/settings-keys.html": "단축키"
          };
          state.cur_doc = { title: docTitle || fallbackTitles[urlPath] || "", dir: "", file: urlPath.replace(/^\//, "") };
          state.prv_doc = { title: "", dir: "", file: "" };
          state.next_doc = { title: "", dir: "", file: "" };
          const folder = window.SiteModules.Hierarchy.findFolderByUrl(list, urlPath);
          state.category = folder ? folder.titles.slice(0, -1).join(" >> ") : "";
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

    // D. 목차 사이드바의 이전글/다음글 단추 갱신 (목차도 단추도 없으면 사이드바와 헤더 단추를 숨긴다)
    updateTOCPanelInfo(isHome);

    // E. 참조 및 copyright 재계산 생략 (피드백 이관 이후 맨 아래 배치 위해 연기)

    // F. 코드 하이라이트 구동
    if (window.SiteModules.CodeLoader && typeof window.SiteModules.CodeLoader.init === 'function') {
      window.SiteModules.CodeLoader.init();
    }

    // G. 코드 카피 버튼 재구축
    if (window.SiteModules.Clipboard && typeof window.SiteModules.Clipboard.init === 'function') {
      window.SiteModules.Clipboard.init();
    }

    // H. 바깥 사이트로 나가는 링크에 표시 (style.css 의 a.external-link)
    markExternalLinks(document.querySelector("article"));

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
          // 다른 문서에서 넘어온 직후라 부드럽게 굴리면 앞 문서의 스크롤 위치와 겹쳐 목표를 지나친다: 바로 옮긴다
          targetElement.scrollIntoView({ behavior: "instant" });
        }
      }
    } else {
      restoreScrollPosition();
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
    const activeItem = activeAnchor
      ? activeAnchor.closest("li")
      : Array.from(sitemapTree.querySelectorAll("li[data-auto-overview]")).find(el => el.dataset.autoOverview === currentPath);
    if (activeItem) {
      let li = activeItem;
      li.classList.add("this-doc");
      li.classList.remove("collapsed");

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

  // 자기 사이트로 치는 호스트 (이 주소로 가는 절대 링크는 바깥 링크가 아니다)
  const OWN_HOSTS = ["iseohyun.com", "www.iseohyun.com"];
  // 바깥 링크 아이콘을 붙이지 않는 링크: 그림을 감싼 링크, 단추·카드 모양 링크
  const EXTERNAL_ICON_EXCLUDE = "a:has(img, svg, video, canvas), a.pill-btn, a.auto-overview-card, a.nav-btn";

  /**
   * 문서 안에서 다른 사이트로 나가는 http(s) 링크에 external-link 클래스를 붙인다.
   * @param {HTMLElement|null} root 문서(article)
   * @returns {number} 표시한 링크 수
   */
  function markExternalLinks(root) {
    if (!root) return 0;
    let count = 0;
    root.querySelectorAll("a[href]").forEach(anchor => {
      let url;
      try {
        url = new URL(anchor.getAttribute("href"), window.location.href);
      } catch (err) {
        return;
      }
      const isExternal = /^https?:$/.test(url.protocol)
        && url.host !== window.location.host
        && !OWN_HOSTS.includes(url.hostname)
        && !anchor.matches(EXTERNAL_ICON_EXCLUDE);
      anchor.classList.toggle("external-link", isExternal);
      if (isExternal) count++;
    });
    return count;
  }

  // 목차 사이드바 위쪽의 이전글/다음글 단추. 이전글도 다음글도 없는 화면(홈, 설정 등)에는 두지 않는다.
  function updateTOCPanelInfo(isHome) {
    const detailsDiv = document.getElementById("toc-doc-details");
    if (!detailsDiv) return;
    detailsDiv.replaceChildren();

    const state = window.SiteModules.state;
    const hasNeighbor = !!((state.prv_doc && state.prv_doc.file) || (state.next_doc && state.next_doc.file));
    if (!isHome && hasNeighbor) appendNeighborButtons(detailsDiv, state);

    if (window.SiteModules.TOC && typeof window.SiteModules.TOC.refreshAvailability === "function") {
      window.SiteModules.TOC.refreshAvailability();
    }
  }

  function appendNeighborButtons(detailsDiv, state) {
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
  }

  // 사이트맵 트리를 그린다.
  //   - 같은 단계 안에서는 묶음이 위쪽, 낱개 문서가 아래쪽이다.
  //   - "상태": "개발중" 인 항목은 관리자에게만 보인다. 관리자에게는 묶음의 글 수 옆에 개발중 글 수가 빨간 "+n" 으로 붙는다.
  //   - 묶음(하위 목록이 있는 항목)은 접고 펴는 화살표, 이름, 안에 든 글 수 "(n)" 으로 한 줄을 이룬다.
  //   - 묶음을 열면 그 묶음의 개론이 본문에 열린다. 이때 좁은 화면의 서랍은 닫지 않는다. 접을 때는 문서를 바꾸지 않는다.
  //     개론은 이 순서로 정한다: 자기 개론 문서 → 가장 가까운 위쪽 묶음의 개론 문서 → 자기 자동 개론(하위 목록).
  //   - 묶음의 이름을 다시 누르면 접힌다. 다만 펼쳐진 채 다른 문서를 보고 있을 때는 접지 않고 자기 개론으로 간다
  //     (한 번 더 누르면 접힌다). 화살표와 줄의 빈 곳은 언제나 접고 펴기만 한다.
  // @param {string} inheritedOverviewUrl 위쪽 묶음에서 물려받은 개론 문서의 주소 (없으면 "")
  // @param {string[]} ancestorTitles 위쪽 묶음들의 이름 (자동 개론의 주소를 만드는 데 쓴다)
  function renderHierarchy(data, parentElement, parentDirectories, inheritedOverviewUrl = "", ancestorTitles = []) {
    if (!Array.isArray(data)) return;
    const Hierarchy = window.SiteModules.Hierarchy;

    // 묶음을 위쪽에, 낱개 문서를 아래쪽에 둔다 (각각의 순서는 hierarchy.json 에 적힌 그대로)
    const isFolderItem = (item) => Object.prototype.hasOwnProperty.call(item, '목록');
    // 개발중 항목은 관리자에게만 보인다
    const visible = Hierarchy.visibleItems(data);
    const ordered = visible.filter(isFolderItem).concat(visible.filter(item => !isFolderItem(item)));

    ordered.forEach((item) => {
      const listItem = document.createElement('li');
      if (Hierarchy.isDevItem(item)) listItem.classList.add('is-dev');
      const isFolder = isFolderItem(item);
      const isPage = Hierarchy.isPageItem(item);
      const url = isPage ? Hierarchy.getItemUrl(parentDirectories, item) : "";

      let label;
      if (isPage) {
        label = document.createElement('a');
        label.href = url;
      } else {
        label = document.createElement('span');
      }
      label.classList.add('tree-label');
      label.textContent = item.주제;
      if (item.형식) {
        listItem.classList.add('is-app');
        label.title = item.형식;
      }

      if (!isFolder) {
        listItem.appendChild(label);
        parentElement.appendChild(listItem);
        return;
      }

      listItem.classList.add('folder', 'collapsed');
      const titles = ancestorTitles.concat(item.주제);
      // 이 묶음을 열 때 보여 줄 개론, 그리고 그것이 이 묶음 자신의 것인지
      const realOverviewUrl = url || inheritedOverviewUrl;
      const overviewUrl = realOverviewUrl || Hierarchy.getAutoOverviewUrl(titles);
      const ownOverviewUrl = url || (inheritedOverviewUrl ? "" : overviewUrl);
      if (!realOverviewUrl) listItem.dataset.autoOverview = overviewUrl;

      const row = document.createElement('div');
      row.className = 'tree-row';

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'tree-toggle';
      toggle.setAttribute('aria-label', `${item.주제} 접기/펴기`);
      toggle.innerHTML = window.SiteModules.Icons.html("chevron-right");

      const count = document.createElement('span');
      count.className = 'tree-count';
      count.textContent = `(${Hierarchy.countPages(item)})`;

      row.append(toggle, label, count);
      // 관리자에게는 이 묶음 안의 개발중 글 수를 빨간 "+n" 으로 덧붙인다
      const devCount = Hierarchy.isShowingDev() ? Hierarchy.countDevPages(item, Hierarchy.isDevItem(item)) : 0;
      if (devCount > 0) {
        const dev = document.createElement('span');
        dev.className = 'tree-dev-count';
        dev.textContent = `+${devCount}`;
        dev.title = `개발 중인 글 ${devCount}편 (관리자에게만 보입니다)`;
        row.appendChild(dev);
      }
      listItem.appendChild(row);

      row.addEventListener('click', (event) => {
        const wasCollapsed = listItem.classList.contains('collapsed');
        const isNameClick = !!event.target.closest('.tree-label');
        const isOwnOverviewShown = !!ownOverviewUrl && window.SiteModules.state.currentPath === ownOverviewUrl;
        if (event.target.closest('a')) event.preventDefault(); // 문서 전환은 아래에서 직접 한다

        if (isNameClick && !wasCollapsed && ownOverviewUrl && !isOwnOverviewShown) {
          // 펼쳐진 채 다른 문서를 보는 중에 이름을 누르면: 접지 않고 자기 개론으로 간다
          openOverview(ownOverviewUrl);
          return;
        }
        listItem.classList.toggle('collapsed');
        if (wasCollapsed) openOverview(overviewUrl); // 접을 때는 문서를 바꾸지 않는다
      });

      if (item.display !== "hidden" && item.목록.length > 0) {
        const sublist = document.createElement('ul');
        renderHierarchy(item.목록, sublist, Hierarchy.resolveDirs(parentDirectories, item.디렉토리), realOverviewUrl, titles);
        listItem.appendChild(sublist);
      }

      parentElement.appendChild(listItem);
    });
  }

  // 사이트맵에서 묶음을 열었을 때: 그 묶음의 개론을 본문에 연다. 좁은 화면의 서랍은 그대로 둔다.
  function openOverview(overviewUrl) {
    if (!overviewUrl || window.SiteModules.state.currentPath === overviewUrl) return;
    keepDrawerOpenOnce = true;
    window.location.hash = `#${overviewUrl}`;
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
      syncPageRailItems();
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
      getRailTabs().forEach(tabEl => tabEl.classList.remove("active"));
    } else {
      panel.classList.remove("collapsed");
      document.documentElement.style.setProperty('--sidebar-width', isMobile ? '0px' : RAIL_AND_PANEL_WIDTH);

      // 패널이 펼쳐질 때, 만약 활성화된 탭이 없다면 기본적으로 nav-sitemap을 활성화합니다.
      const activeExists = getRailTabs().some(tabEl => tabEl.classList.contains("active"));
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
    syncPageRailItems();
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
      syncPageRailItems();
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

    // 기본 탭(사이트맵/목차/검색). 문서가 더하는 탭은 addRailItem 이 같은 처리기를 붙인다
    getRailTabs().forEach(tabEl => {
      tabEl.addEventListener("click", () => onRailTabClick(tabEl));
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
    // 문서가 addRailItem 으로 더한 항목은 건드리지 않는다 (그쪽은 화면을 떠날 때 거둔다)
    const oldTutorialBtn = document.getElementById("sidebar-tutorial-toggle");
    if (oldTutorialBtn) oldTutorialBtn.remove();

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

      featuresContainer.insertBefore(tutorialBtn, featuresContainer.firstChild);
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
    registerPageCleanup: registerPageCleanup,
    onLeave: registerPageCleanup,
    addRailItem: addRailItem,
    getScroller: getScroller,
    // 문서가 나중에 그린 내용에 바깥 링크 표시를 다시 붙일 때 (문서를 열 때는 라우터가 알아서 부른다)
    markExternalLinks: markExternalLinks
  };
})();
