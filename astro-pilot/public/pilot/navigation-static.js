/**
 * @file astro-pilot/public/pilot/navigation-static.js
 * @module SiteModules.Navigation (정적 페이지판)
 * @description 기존 navigation.js(해시 라우터 + 뼈대 생성)를 대신한다.
 *   시범 전환에서는 문서마다 완성된 HTML 페이지가 있으므로 라우팅을 하지 않는다. 이 파일은
 *   (1) 빌드가 미리 그린 레일 · 패널 · 사이트맵 트리에 동작을 붙이고,
 *   (2) 헤더 · 목차 · 검색 · 코드 하이라이트 같은 기존 모듈을 그대로 초기화하고,
 *   (3) 기존 형식의 링크(#/경로)를 실제 주소로 바꿔 보낸다.
 *   문서 스크립트가 쓰는 Navigation.onLeave 등은 <head> 의 작은 스크립트(Shell.astro)가 먼저 만들어 둔다.
 */
(function () {
  const S = window.SiteModules;
  const data = JSON.parse(document.getElementById("pilot-page-data").textContent);
  const MOBILE_BREAKPOINT = S.Config.layout.mobileBreakpoint;
  const RAIL_WIDTH = "var(--rail-w)";
  const RAIL_AND_PANEL_WIDTH = "calc(var(--rail-w) + var(--panel-w))";
  const PANEL_STATE_KEY = "iseohyun_pilot_panel_v1";

  const $ = (id) => document.getElementById(id);
  const isMobile = () => window.innerWidth <= MOBILE_BREAKPOINT;

  // 기존 라우터가 문서를 열 때 채우던 상태 (document.js · contact.js 가 읽는다)
  Object.assign(S.state, data.state, { lastModifiedDate: data.lastModified ? new Date(data.lastModified) : null });

  // ---------------------------------------------------------------- 주소
  function isMigrated(path) {
    return data.migratedPrefixes.some((prefix) => path.startsWith(prefix)) && !data.devPaths.includes(path);
  }

  /** 기존 형식의 주소(#/경로#제목)나 사이트 안 경로를 실제로 갈 주소로 바꾼다 */
  function resolveHref(raw) {
    let rest = raw.startsWith("#/") ? raw.slice(1) : raw;
    const cut = rest.indexOf("#");
    const path = cut >= 0 ? rest.slice(0, cut) : rest;
    const anchor = cut >= 0 ? rest.slice(cut + 1) : "";
    if (path === "/" || path === "/index.html") return "/";
    if (isMigrated(path)) return path + (anchor ? "#" + encodeURIComponent(decodeURIComponent(anchor)) : "");
    return data.legacyBase + path + (anchor ? "#" + anchor : "");
  }

  function scrollToHeading(id) {
    const target = document.getElementById(id);
    if (!target) return false;
    target.scrollIntoView({ behavior: "smooth" });
    history.replaceState(null, "", "#" + encodeURIComponent(id));
    return true;
  }

  // 기존 모듈이 만드는 사이트 안 링크를 가로챈다: "#/경로" 꼴(기존 라우터 형식)과,
  // 검색 결과처럼 아직 옮기지 않은 문서를 가리키는 "/경로.html"
  function needsResolve(href) {
    if (href.startsWith("#/")) return true;
    const path = href.split("#")[0];
    return path.startsWith("/") && /.html$/.test(path) && !isMigrated(path);
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const legacy = link.getAttribute("data-legacy-href");
    const href = legacy || link.getAttribute("href");
    if (!href || !(legacy || needsResolve(href))) return;
    event.preventDefault();
    const target = resolveHref(href);
    const [targetPath, targetAnchor] = target.split("#");
    if (targetPath === location.pathname && targetAnchor && scrollToHeading(decodeURIComponent(targetAnchor))) return;
    location.href = target;
  });

  // ---------------------------------------------------------------- 패널
  function railTabs() {
    return Array.from(document.querySelectorAll("#sidebar-nav .nav-item[data-tab]"));
  }

  function updatePanelTitle() {
    const active = document.querySelector("#sidebar-nav .nav-item.active[data-panel-title]");
    if (active) $("panel-title").textContent = active.id === "nav-toc" ? (data.title || "목차") : active.getAttribute("data-panel-title");
  }

  function setPanelCollapsed(collapse) {
    const panel = $("sidebar-panel");
    panel.classList.toggle("collapsed", collapse);
    document.documentElement.style.setProperty("--sidebar-width", isMobile() ? "0px" : (collapse ? RAIL_WIDTH : RAIL_AND_PANEL_WIDTH));
    if (collapse) {
      railTabs().forEach((tab) => tab.classList.remove("active"));
    } else if (!railTabs().some((tab) => tab.classList.contains("active"))) {
      activateTab($("nav-sitemap"), false);
    }
    updatePanelTitle();
    if (!isMobile()) {
      try { localStorage.setItem(PANEL_STATE_KEY, collapse ? "" : (document.querySelector("#sidebar-nav .nav-item.active") || {}).id || ""); } catch (err) { /* 저장 못 해도 동작에는 지장 없다 */ }
    }
  }

  function setDrawer(open) {
    $("sidebar-container").classList.toggle("active", open);
    $("sidebar-overlay").classList.toggle("active", open);
    document.body.classList.toggle("mobile-nav-open", open);
    if (open) setPanelCollapsed(false);
  }

  function trigBoard(mode = "trigger") {
    if (isMobile()) {
      const open = mode === "visible" ? true : mode === "hidden" ? false : !$("sidebar-container").classList.contains("active");
      setDrawer(open);
      return;
    }
    const collapsed = $("sidebar-panel").classList.contains("collapsed");
    setPanelCollapsed(mode === "trigger" ? !collapsed : mode !== "visible");
  }

  function activateTab(tab, open = true) {
    railTabs().forEach((other) => other.classList.toggle("active", other === tab));
    document.querySelectorAll("#sidebar-panel .tab-pane").forEach((pane) => pane.classList.toggle("active", pane.id === tab.getAttribute("data-tab")));
    if (tab.id === "nav-search") S.Search.ensureIndex();
    updatePanelTitle();
    if (open) trigBoard("visible");
  }

  railTabs().forEach((tab) => tab.addEventListener("click", () => {
    const open = !$("sidebar-panel").classList.contains("collapsed");
    if (tab.classList.contains("active") && open) trigBoard("hidden");
    else activateTab(tab);
  }));
  $("panel-close-btn").addEventListener("click", () => trigBoard("hidden"));
  $("sidebar-overlay").addEventListener("click", () => setDrawer(false));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isMobile() && $("sidebar-container").classList.contains("active")) setDrawer(false);
  });
  let wasMobile = isMobile();
  window.addEventListener("resize", () => {
    if (isMobile() === wasMobile) return;
    wasMobile = isMobile();
    setDrawer(false);
    const collapsed = $("sidebar-panel").classList.contains("collapsed");
    document.documentElement.style.setProperty("--sidebar-width", wasMobile ? "0px" : (collapsed ? RAIL_WIDTH : RAIL_AND_PANEL_WIDTH));
  });

  // ---------------------------------------------------------------- 사이트맵 트리 (빌드가 그린 것에 동작만 붙인다)
  const treeRoot = $("sitemap-tree");
  treeRoot.addEventListener("click", (event) => {
    const row = event.target.closest(".tree-row");
    if (!row) return;
    if (event.target.closest("a.tree-label")) return; // 개론이 있는 묶음의 이름은 그 문서로 간다
    row.parentElement.classList.toggle("collapsed");
  });
  const toggleAll = $("sitemap-toggle-all-btn");
  toggleAll.addEventListener("click", () => {
    const collapse = toggleAll.textContent === "전체 닫기";
    treeRoot.querySelectorAll("li.folder").forEach((li) => li.classList.toggle("collapsed", collapse));
    toggleAll.textContent = collapse ? "전체 열기" : "전체 닫기";
  });
  $("sitemap-open-current-btn").addEventListener("click", () => {
    treeRoot.querySelectorAll("li.folder").forEach((li) => li.classList.toggle("collapsed", !li.classList.contains("this-path")));
    toggleAll.textContent = "전체 열기";
    const current = treeRoot.querySelector("li.this-doc");
    if (current) current.scrollIntoView({ block: "center" });
  });

  // 검색 종류(제목 / Tag / 모든 문서)
  const searchOptions = document.querySelectorAll(".search-type-option");
  const placeholders = { title: "문서 제목 검색...", tag: "Tag 검색...", all: "전체 문서 검색..." };
  searchOptions.forEach((opt) => opt.addEventListener("click", () => {
    searchOptions.forEach((o) => o.classList.toggle("active", o === opt));
    const radio = opt.querySelector("input");
    radio.checked = true;
    const input = $("sidebar-search-input");
    input.placeholder = placeholders[radio.value];
    input.dispatchEvent(new Event("input"));
  }));

  // ---------------------------------------------------------------- 본문 스크롤 영역
  // 기존 사이트와 같이 #app-main 만 스크롤한다. 창의 스크롤에 기대는 예전 문서 코드를 위해 이어 준다.
  const main = $("app-main");
  try {
    ["scrollY", "pageYOffset"].forEach((name) => Object.defineProperty(window, name, { configurable: true, get: () => main.scrollTop }));
  } catch (err) {
    console.warn("[Pilot] window.scrollY 호환 처리를 적용하지 못했습니다:", err);
  }
  main.addEventListener("scroll", () => {
    window.dispatchEvent(new Event("scroll"));
    document.dispatchEvent(new Event("scroll"));
  }, { passive: true });

  // ---------------------------------------------------------------- 기존 모듈 초기화
  Object.assign(S.Navigation, { trigBoard: trigBoard, getScroller: () => main });

  S.Icons.ensureSprite();
  S.Header.init({ onMenuClick: () => trigBoard("trigger") });
  S.Header.setTitle(data.title);
  S.Header.setTabs(data.tabs);
  S.Header.setPanels({});

  S.TOC.init();
  S.TOC.addContentsList($("toc-tree"));
  // 기존 목차 링크는 "#/경로#제목" 꼴이다. 정적 페이지에서는 같은 문서 안으로만 옮긴다.
  // 주소는 "#제목" 으로 줄인다 (toc.js 가 "#제목" 으로 끝나는지 보고 지금 읽는 항목을 표시하므로 끝은 그대로 둔다)
  $("toc-tree").querySelectorAll("a").forEach((a) => {
    const href = a.getAttribute("href") || "";
    const id = href.slice(href.lastIndexOf("#") + 1);
    a.setAttribute("href", "#" + id);
    a.addEventListener("click", (e) => {
      e.preventDefault();
      scrollToHeading(id);
    });
  });
  $("toc-breadcrumb-info").textContent = data.breadcrumb;

  S.Document.init();
  S.CodeLoader.init();
  S.Clipboard.init();
  S.Quiz.init();
  S.KeybindManager.init();
  S.Search.bindInput();
  S.Contact.init({ closeDrawer: () => setDrawer(false) });

  // 검색(제목)은 사이트맵 전체가 필요하다. 처음 검색할 때 쓰도록 미리 받아 둔다.
  fetch("/hierarchy.json")
    .then((res) => res.json())
    .then((list) => { S.hierarchyListCached = list; })
    .catch((err) => console.warn("[Pilot] hierarchy.json 을 받지 못했습니다:", err));

  // 첫 화면: 넓은 화면은 지난번 패널 상태를 따르고, 좁은 화면은 서랍을 닫아 둔다
  if (isMobile()) {
    $("sidebar-panel").classList.remove("collapsed");
    document.documentElement.style.setProperty("--sidebar-width", "0px");
  } else {
    let saved = "";
    try { saved = localStorage.getItem(PANEL_STATE_KEY) || ""; } catch (err) { saved = ""; }
    if (saved && $(saved)) activateTab($(saved));
    else setPanelCollapsed(true);
  }

  // 주소에 제목이 붙어 왔으면(#제목) 그리로 옮긴다
  if (location.hash.length > 1) {
    requestAnimationFrame(() => scrollToHeading(decodeURIComponent(location.hash.slice(1))));
  }
})();
