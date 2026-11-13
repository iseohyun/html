/**
 * @file modules/core/header.js
 * @module SiteModules.Header
 * @description 화면 위에 고정되는 헤더. 한 줄에 세 묶음을 둔다:
 *   [메뉴 아이콘][페이지 제목] ── 탭 ── [필터][페이지 공유][설정]
 *   탭 줄이 제목과 아이콘에 밀려 다 보이지 않으면 가려진 쪽에 스크롤 버튼이 생기고, 탭 줄을 끌어서도 밀 수 있다.
 *   필터와 화면별 설정은 헤더 바로 아래로 펼쳐지는 같은 자리의 패널이며 한 번에 하나만 열린다.
 *   패널의 내용은 각 화면이 setPanels() 로 등록한다. 필터 아이콘은 등록한 화면에서만 보이고,
 *   설정 아이콘은 어느 화면에나 있으며 맨 아래 줄에서 전체 설정 페이지로 간다.
 * @requires SiteModules.Icons
 * @exports init, setTitle, setTabs, setPanels, togglePanel, closePanel, setFilterActive
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.Header = (function () {
  const TOAST_DURATION_MS = 1600;
  const PANEL_KINDS = ["filter", "settings"];
  const GLOBAL_SETTINGS_HREF = "#/settings.html";
  // 탭 줄: 이만큼은 스크롤 끝으로 본다 / 버튼 한 번에 미는 폭(탭 줄 폭 대비) / 끌기로 인정하는 최소 이동
  const TAB_SCROLL_EPSILON_PX = 2;
  const TAB_SCROLL_PAGE_RATIO = 0.7;
  const TAB_DRAG_THRESHOLD_PX = 5;

  let root = null;
  let openKind = null;
  let toastTimer = null;
  const panels = { filter: null, settings: null };

  function el(id) {
    return document.getElementById(id);
  }

  /**
   * 헤더를 만든다. 이미 있으면 아무 것도 하지 않는다.
   * @param {{onMenuClick: Function}} options 메뉴 아이콘을 눌렀을 때의 동작(패널/서랍 여닫기)
   */
  function init(options = {}) {
    if (el("app-header")) return;
    const icon = window.SiteModules.Icons.html;

    root = document.createElement("div");
    root.id = "app-header";
    root.className = "app-header";
    root.setAttribute("role", "banner");
    root.innerHTML = `
      <div class="app-topbar">
        <div class="app-header-left">
          <button class="icon-btn" type="button" id="header-menu-btn" aria-label="메뉴" title="메뉴">${icon("menu")}</button>
          <span class="app-page-title" id="header-title"></span>
        </div>
        <div class="app-tabs-wrap">
          <button class="app-tabs-arrow" type="button" id="header-tabs-prev" aria-label="앞쪽 탭 보기" title="앞쪽 탭 보기" hidden>${icon("chevron-left")}</button>
          <nav class="app-tabs" id="header-tabs" aria-label="페이지"></nav>
          <button class="app-tabs-arrow" type="button" id="header-tabs-next" aria-label="뒤쪽 탭 보기" title="뒤쪽 탭 보기" hidden>${icon("chevron-right")}</button>
        </div>
        <div class="app-header-right">
          <button class="icon-btn" type="button" id="header-filter-btn" aria-label="필터" title="필터" aria-expanded="false" aria-controls="header-drop" hidden>${icon("filter")}<span class="filter-dot" id="header-filter-dot" hidden></span></button>
          <span class="pop-wrap">
            <button class="icon-btn" type="button" id="header-share-btn" aria-label="페이지 공유" title="페이지 공유 (주소 복사)">${icon("share")}</button>
            <span class="app-toast" id="header-toast" role="status" hidden></span>
          </span>
          <button class="icon-btn" type="button" id="header-settings-btn" aria-label="화면 설정" title="화면 설정" aria-expanded="false" aria-controls="header-drop" hidden>${icon("gear")}</button>
        </div>
      </div>
      <div class="app-drop" id="header-drop">
        <div class="app-drop-inner">
          <div class="app-drop-content" id="header-drop-content"></div>
        </div>
      </div>
    `;
    document.body.insertBefore(root, document.body.firstChild);

    el("header-menu-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      if (typeof options.onMenuClick === "function") options.onMenuClick();
    });
    el("header-filter-btn").addEventListener("click", () => togglePanel("filter"));
    el("header-settings-btn").addEventListener("click", () => togglePanel("settings"));
    el("header-share-btn").addEventListener("click", sharePage);
    bindTabStrip();

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && openKind) closePanel();
    });
    // 창 크기가 바뀌어 탭 줄의 폭이 달라져도 켜진 탭이 보이게 한다
    window.addEventListener("resize", scrollSelectedTabIntoView);
  }

  /**
   * 헤더 가운데의 탭을 바꾼다. 빈 배열이면 탭을 지운다.
   * 탭은 주소(#...)로 가는 링크라서 눌렀을 때의 화면 전환은 라우터가 맡는다.
   * @param {Array<{label: string, href: string, selected?: boolean}>} tabs
   */
  function setTabs(tabs = []) {
    const nav = el("header-tabs");
    if (!nav) return;
    nav.replaceChildren();

    let selectedTab = null;
    tabs.forEach(tab => {
      const link = document.createElement("a");
      link.className = "app-tab";
      link.setAttribute("role", "tab");
      link.setAttribute("aria-selected", String(!!tab.selected));
      link.href = tab.href;
      link.textContent = tab.label;
      link.title = tab.label;
      if (tab.selected) selectedTab = link;
      nav.appendChild(link);
    });

    scrollSelectedTabIntoView();
  }

  // 탭 줄이 제목과 아이콘에 밀려 다 보이지 않을 때: 가려진 쪽에 스크롤 버튼을 보이고, 탭 줄을 끌어서도 밀 수 있다
  function updateTabArrows() {
    const nav = el("header-tabs");
    const prev = el("header-tabs-prev");
    const next = el("header-tabs-next");
    if (!nav || !prev || !next) return;

    const maxScroll = nav.scrollWidth - nav.clientWidth;
    const isOverflowing = maxScroll > TAB_SCROLL_EPSILON_PX;
    prev.hidden = !isOverflowing || nav.scrollLeft <= TAB_SCROLL_EPSILON_PX;
    next.hidden = !isOverflowing || nav.scrollLeft >= maxScroll - TAB_SCROLL_EPSILON_PX;
    nav.classList.toggle("is-scrollable", isOverflowing);
  }

  function bindTabStrip() {
    const nav = el("header-tabs");
    const prev = el("header-tabs-prev");
    const next = el("header-tabs-next");

    const scrollByPage = (direction) => {
      nav.scrollBy({ left: direction * nav.clientWidth * TAB_SCROLL_PAGE_RATIO, behavior: "smooth" });
    };
    prev.addEventListener("click", () => scrollByPage(-1));
    next.addEventListener("click", () => scrollByPage(1));
    nav.addEventListener("scroll", updateTabArrows, { passive: true });

    // 마우스로 탭 줄을 끌어서 민다 (손가락으로 미는 것은 브라우저가 원래 처리한다)
    let drag = null;
    nav.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      drag = { startX: e.clientX, startScroll: nav.scrollLeft, moved: false };
    });
    window.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const delta = e.clientX - drag.startX;
      if (!drag.moved && Math.abs(delta) < TAB_DRAG_THRESHOLD_PX) return;
      drag.moved = true;
      nav.classList.add("is-dragging");
      nav.scrollLeft = drag.startScroll - delta;
    });
    window.addEventListener("pointerup", () => {
      if (!drag) return;
      const wasDragged = drag.moved;
      drag = null;
      nav.classList.remove("is-dragging");
      // 끌다가 놓은 자리의 탭이 눌리지 않게, 바로 뒤따르는 클릭 한 번만 막는다
      if (wasDragged) {
        const swallow = (clickEvent) => {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
        };
        nav.addEventListener("click", swallow, { capture: true, once: true });
        setTimeout(() => nav.removeEventListener("click", swallow, { capture: true }), 0);
      }
    });
    // 탭(링크)을 끌 때 브라우저의 링크 끌기가 시작되지 않게 한다
    nav.addEventListener("dragstart", (e) => e.preventDefault());
  }

  // 탭이 넘쳐서 가로로 밀리는 경우, 켜진 탭이 탭 줄의 가운데에 오도록 민다
  function scrollSelectedTabIntoView() {
    const nav = el("header-tabs");
    const selected = nav ? nav.querySelector('.app-tab[aria-selected="true"]') : null;
    updateTabArrows();
    if (!nav || !selected || nav.scrollWidth <= nav.clientWidth) return;

    const navRect = nav.getBoundingClientRect();
    const tabRect = selected.getBoundingClientRect();
    const tabCenter = tabRect.left + tabRect.width / 2;
    const navCenter = navRect.left + navRect.width / 2;
    nav.scrollLeft += tabCenter - navCenter;
    updateTabArrows();
  }

  function setTitle(text) {
    const title = el("header-title");
    if (title) title.textContent = text || "";
  }

  /**
   * 지금 화면의 필터/설정 패널 내용을 등록한다. 넘기지 않은 종류는 아이콘을 숨긴다.
   * @param {{filter?: HTMLElement, settings?: HTMLElement}} nextPanels
   */
  function setPanels(nextPanels = {}) {
    closePanel();
    panels.filter = nextPanels.filter || null;
    // 설정 아이콘은 어느 화면에나 있다: 화면별 설정이 없으면 안내 한 줄, 맨 아래 줄은 전체 설정 링크
    panels.settings = buildSettingsPanel(nextPanels.settings || null);
    PANEL_KINDS.forEach(kind => {
      const btn = el(`header-${kind}-btn`);
      if (btn) btn.hidden = !panels[kind];
    });
    setFilterActive(false);
  }

  function buildSettingsPanel(pageSettings) {
    const wrap = document.createElement("div");
    wrap.className = "app-settings-panel";

    if (pageSettings) {
      wrap.appendChild(pageSettings);
    } else {
      const note = document.createElement("p");
      note.className = "app-drop-note";
      note.textContent = "이 화면에만 해당하는 설정은 없습니다.";
      wrap.appendChild(note);
    }

    const footer = document.createElement("div");
    footer.className = "app-drop-foot";
    const link = document.createElement("a");
    link.className = "app-drop-link";
    link.id = "header-global-settings-link";
    link.href = GLOBAL_SETTINGS_HREF;
    link.textContent = "전체 설정 (테마 · 글자 크기 · 단축키) →";
    link.addEventListener("click", closePanel);
    footer.appendChild(link);
    wrap.appendChild(footer);
    return wrap;
  }

  function togglePanel(kind) {
    if (!panels[kind]) return;
    if (openKind === kind) {
      closePanel();
      return;
    }

    const content = el("header-drop-content");
    content.replaceChildren(panels[kind]);
    openKind = kind;
    el("header-drop").classList.add("is-open");
    PANEL_KINDS.forEach(k => {
      const btn = el(`header-${k}-btn`);
      if (btn) btn.setAttribute("aria-expanded", String(k === kind));
    });
  }

  function closePanel() {
    if (!openKind) return;
    openKind = null;
    const drop = el("header-drop");
    if (drop) drop.classList.remove("is-open");
    PANEL_KINDS.forEach(k => {
      const btn = el(`header-${k}-btn`);
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  }

  /** 필터가 걸려 있으면 필터 아이콘에 점을 찍는다. */
  function setFilterActive(isActive) {
    const dot = el("header-filter-dot");
    if (dot) dot.hidden = !isActive;
  }

  function showToast(message) {
    const toast = el("header-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, TOAST_DURATION_MS);
  }

  async function sharePage() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      showToast("주소를 복사했습니다");
    } catch (err) {
      console.warn("[Header] 주소 복사 실패:", err);
      showToast("복사하지 못했습니다");
    }
  }

  return {
    init: init,
    setTitle: setTitle,
    setTabs: setTabs,
    setPanels: setPanels,
    togglePanel: togglePanel,
    closePanel: closePanel,
    setFilterActive: setFilterActive
  };
})();
