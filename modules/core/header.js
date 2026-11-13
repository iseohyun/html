/**
 * @file modules/core/header.js
 * @module SiteModules.Header
 * @description 화면 위에 고정되는 헤더. 한 줄에 세 묶음을 둔다:
 *   [메뉴 아이콘][페이지 제목] ── 탭 ── [필터][페이지 공유][설정]
 *   필터와 화면별 설정은 헤더 바로 아래로 펼쳐지는 같은 자리의 패널이며 한 번에 하나만 열린다.
 *   패널의 내용은 각 화면이 setPanels() 로 등록하고, 등록한 화면에서만 해당 아이콘이 보인다.
 * @requires SiteModules.Icons
 * @exports init, setTitle, setTabs, setPanels, togglePanel, closePanel, setFilterActive
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.Header = (function () {
  const TOAST_DURATION_MS = 1600;
  const PANEL_KINDS = ["filter", "settings"];

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
        <nav class="app-tabs" id="header-tabs" aria-label="페이지"></nav>
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

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && openKind) closePanel();
    });
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

    // 넘쳐서 가려진 경우 켜진 탭이 보이도록 가로로 민다
    if (selectedTab) {
      const overflowLeft = selectedTab.offsetLeft - nav.scrollLeft;
      const overflowRight = selectedTab.offsetLeft + selectedTab.offsetWidth - (nav.scrollLeft + nav.clientWidth);
      if (overflowLeft < 0) nav.scrollLeft += overflowLeft - 16;
      else if (overflowRight > 0) nav.scrollLeft += overflowRight + 16;
    }
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
    PANEL_KINDS.forEach(kind => {
      panels[kind] = nextPanels[kind] || null;
      const btn = el(`header-${kind}-btn`);
      if (btn) btn.hidden = !panels[kind];
    });
    setFilterActive(false);
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
