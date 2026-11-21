/**
 * @file modules/core/toc.js
 * @module SiteModules.TOC
 * @description 문서의 h1/h2를 모아 오른쪽 목차 사이드바(#toc-drawer)를 채우고, 스크롤 위치에 따라 지금 읽는 항목을 강조한다.
 *   - 헤더의 목차 단추(#header-toc-btn, header.js 가 만든다)가 사이드바를 켜고 끈다. 켜지면 단추가 눌린 모양(aria-pressed)이 된다.
 *   - 사이드바는 오른쪽에서 밀려 나오는 서랍이다. 「고정」하면 본문을 밀어내고 옆에 붙고(기본값),
 *     고정을 풀면 본문 위에 겹쳐 뜨고 바깥을 누르거나 Esc 를 누르면 닫힌다.
 *   - 좁은 화면(Config.layout.mobileBreakpoint 이하)에서는 고정과 상관없이 겹쳐 뜨는 서랍이고, 목차 항목을 누르면 닫힌다.
 *   - 열림/고정 상태는 브라우저에 기억한다. 열림은 넓은 화면에서 바꾼 것만 기억한다(좁은 화면의 서랍은 그때뿐이다).
 *   - 목차도 이전글/다음글도 없는 화면(홈 등)에서는 단추와 사이드바를 숨긴다. 기억한 열림 상태는 그대로 둔다.
 * @exports init, addContentsList, scrollToHash, refreshAvailability, open, close, toggle, setPinned, isOpen, isPinned
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.TOC = (function() {
  let headers = [];
  let target;
  let scrollListenerAttached = false;
  const CURRENT_HEADING_OFFSET_PX = 20;
  // 저장 모양이 바뀌면 끝의 판 번호를 올린다
  const STORAGE_KEY = "iseohyun_toc_drawer_v1";
  const DEFAULT_PREFS = Object.freeze({ open: false, pinned: true });

  let prefs = loadPrefs();
  // 지금 화면에 실제로 열려 있는지 (좁은 화면에서는 기억한 값과 다를 수 있다)
  let isDrawerOpen = false;
  let isAvailable = false;
  let drawerBuilt = false;

  function loadPrefs() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        open: typeof saved.open === "boolean" ? saved.open : DEFAULT_PREFS.open,
        pinned: typeof saved.pinned === "boolean" ? saved.pinned : DEFAULT_PREFS.pinned
      };
    } catch (err) {
      console.warn("[TOC] 목차 사이드바 상태를 읽지 못해 기본값을 씁니다:", err);
      return { open: DEFAULT_PREFS.open, pinned: DEFAULT_PREFS.pinned };
    }
  }

  function savePrefs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (err) {
      console.warn("[TOC] 목차 사이드바 상태를 저장하지 못했습니다:", err);
    }
  }

  function isMobile() {
    return window.innerWidth <= window.SiteModules.Config.layout.mobileBreakpoint;
  }

  function el(id) {
    return document.getElementById(id);
  }

  function init() {
    headers = document.querySelectorAll("h1, h2");
    ensureDrawer();

    if (!scrollListenerAttached) {
      // 스크롤은 페이지가 아니라 본문 영역(#app-main)에서 일어난다
      getScroller().addEventListener("scroll", handleScroll, { passive: true });
      scrollListenerAttached = true;
    }

    if (!window.hashChangeBound) {
      window.addEventListener("hashchange", (event) => {
        event.preventDefault();
        const hash = window.location.hash;
        if (hash) {
          scrollToHash();
        }
      });
      window.hashChangeBound = true;
    }
  }

  // ---------------------------------------------------------------------------
  // 오른쪽 목차 사이드바
  // ---------------------------------------------------------------------------

  // 헤더의 목차 단추가 있는 화면(사이트 뼈대)에서만 만든다. 한 번만 만든다.
  function ensureDrawer() {
    const toggleBtn = el("header-toc-btn");
    if (drawerBuilt || !toggleBtn) return;
    drawerBuilt = true;
    const icon = window.SiteModules.Icons.html;

    const overlay = document.createElement("div");
    overlay.id = "toc-overlay";
    document.body.appendChild(overlay);

    const drawer = document.createElement("aside");
    drawer.id = "toc-drawer";
    drawer.setAttribute("aria-label", "목차");
    drawer.innerHTML = `
      <div class="toc-drawer-head">
        <span class="toc-drawer-title">목차</span>
        <button class="icon-btn" type="button" id="toc-pin-btn" aria-pressed="false" aria-label="사이드바 고정" title="사이드바 고정">${icon("pin")}</button>
        <button class="icon-btn is-bare" type="button" id="toc-close-btn" aria-label="목차 닫기" title="목차 닫기">${icon("x")}</button>
      </div>
      <div class="toc-drawer-body" id="toc-drawer-body">
        <div class="toc-doc-details" id="toc-doc-details"></div>
        <ul class="toc-panel-list" id="toc-tree"></ul>
      </div>
    `;
    document.body.appendChild(drawer);

    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggle();
    });
    el("toc-close-btn").addEventListener("click", () => close());
    el("toc-pin-btn").addEventListener("click", () => setPinned(!prefs.pinned));
    overlay.addEventListener("click", () => close());

    // 고정하지 않았을 때(좁은 화면은 늘): 사이드바와 목차 단추 바깥을 누르면 닫는다
    document.addEventListener("pointerdown", (e) => {
      if (!isDrawerOpen || isDocked()) return;
      if (drawer.contains(e.target) || toggleBtn.contains(e.target)) return;
      close();
    }, true);

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isDrawerOpen && !isDocked()) close();
    });

    // 좁은 화면으로 바뀌면 서랍을 닫고, 넓은 화면으로 돌아오면 기억한 상태로 되돌린다
    let lastIsMobile = isMobile();
    window.addEventListener("resize", () => {
      const nowIsMobile = isMobile();
      if (nowIsMobile === lastIsMobile) return;
      lastIsMobile = nowIsMobile;
      isDrawerOpen = !nowIsMobile && isAvailable && prefs.open;
      applyState();
    });

    applyState();
  }

  // 본문 옆에 붙어 있는지: 넓은 화면에서 열린 채 고정한 때
  function isDocked() {
    return isDrawerOpen && prefs.pinned && !isMobile();
  }

  function applyState() {
    const drawer = el("toc-drawer");
    const toggleBtn = el("header-toc-btn");
    if (!drawer || !toggleBtn) return;
    const docked = isDocked();

    toggleBtn.hidden = !isAvailable;
    toggleBtn.setAttribute("aria-pressed", String(isDrawerOpen));
    drawer.hidden = !isAvailable;
    drawer.classList.toggle("open", isDrawerOpen);
    drawer.classList.toggle("docked", docked);
    drawer.setAttribute("aria-hidden", String(!isDrawerOpen));
    el("toc-overlay").classList.toggle("active", isDrawerOpen && isMobile());
    // 본문과 헤더를 사이드바 폭만큼 밀어낸다 (style.css 의 --toc-dock-w)
    document.documentElement.classList.toggle("toc-docked", docked);

    const pinBtn = el("toc-pin-btn");
    pinBtn.setAttribute("aria-pressed", String(prefs.pinned));
    const pinLabel = prefs.pinned ? "고정 풀기 (본문 위에 겹쳐 띄우기)" : "사이드바 고정 (본문 옆에 붙이기)";
    pinBtn.setAttribute("aria-label", pinLabel);
    pinBtn.title = pinLabel;
  }

  function setOpen(nextOpen) {
    if (!isAvailable) return;
    isDrawerOpen = nextOpen;
    // 좁은 화면의 서랍은 그때뿐이라 넓은 화면의 열림 상태만 기억한다
    if (!isMobile()) {
      prefs.open = nextOpen;
      savePrefs();
    }
    applyState();
  }

  function open() { setOpen(true); }
  function close() { setOpen(false); }
  function toggle() { setOpen(!isDrawerOpen); }

  function setPinned(pinned) {
    prefs.pinned = !!pinned;
    savePrefs();
    applyState();
  }

  /**
   * 목차나 이전글/다음글이 있는지 보고 단추와 사이드바를 보이거나 숨긴다.
   * 다시 보이게 되면 (넓은 화면에서) 기억한 열림 상태로 되돌린다. 문서를 그린 뒤 라우터가 부른다.
   */
  function refreshAvailability() {
    const tree = el("toc-tree");
    const details = el("toc-doc-details");
    if (!tree) return;
    const nextAvailable = tree.children.length > 0 || (!!details && details.children.length > 0);
    if (nextAvailable !== isAvailable) {
      isAvailable = nextAvailable;
      isDrawerOpen = isAvailable && prefs.open && !isMobile();
    }
    applyState();
  }

  // ---------------------------------------------------------------------------
  // 목차 목록
  // ---------------------------------------------------------------------------

  function addContentsList(object) {
    let i = 0;
    let j = 0;
    const state = window.SiteModules.state;
    const currentPath = (state && state.currentPath) ? state.currentPath : "/index.html";

    headers.forEach(function (header) {
      let listItem = document.createElement("li");
      let anchor = document.createElement("a");

      if (header.tagName === "H1") {
        i++;
        j = 0;
        anchor.textContent = i + ". " + header.textContent;
      } else {
        j++;
        const subItem = document.createElement("span");
        subItem.style.fontSize = "0.85em";
        subItem.textContent = "   " + i + "-" + j + ". " + header.textContent;
        anchor.appendChild(subItem);
      }

      header.setAttribute("id", header.textContent);
      // SPA 라우팅 경로를 접두어로 추가하여 주소창에 현재 페이지 경로를 유지하고 sub-anchor로 스크롤하도록 함
      anchor.href = "#" + currentPath + "#" + header.textContent;

      anchor.addEventListener("click", function (ev) {
        ev.stopPropagation();
        // 좁은 화면의 서랍은 본문을 가리므로 항목을 고르면 닫는다
        if (isDrawerOpen && isMobile()) close();
      });

      listItem.appendChild(anchor);
      object.appendChild(listItem);
    });

    if (object && object.id === "toc-tree") refreshAvailability();
  }

  function getScroller() {
    return window.SiteModules.Navigation.getScroller();
  }

  // 목차 링크가 이 제목을 가리키는지: 링크 주소는 "#<문서 경로>#<제목>" 꼴이다
  function isAnchorFor(anchor, header) {
    const href = anchor.getAttribute("href") || "";
    return href.endsWith("#" + header.textContent);
  }

  function handleScroll() {
    // 본문 영역의 위쪽 끝에서 20px 안으로 올라온 마지막 제목이 지금 보고 있는 항목이다
    const scrollerTop = getScroller().getBoundingClientRect().top;

    // 목차에 현재 보고있는 내용에 밑줄로 표기하기
    headers.forEach(function (header) {
      if (header.getBoundingClientRect().top - scrollerTop <= CURRENT_HEADING_OFFSET_PX) {
        target = header;
      }

      // querySelector 대신 안전하게 DOM 순회하며 active-toc 클래스 제거
      const tocTree = document.getElementById("toc-tree");
      if (tocTree) {
        const anchors = tocTree.querySelectorAll("a");
        anchors.forEach(anchor => {
          if (isAnchorFor(anchor, header)) {
            anchor.classList.remove("active-toc");
          }
        });
      }
    });

    if (target && target.textContent) {
      const tocTree = document.getElementById("toc-tree");
      if (tocTree) {
        const anchors = tocTree.querySelectorAll("a");
        anchors.forEach(anchor => {
          if (isAnchorFor(anchor, target)) {
            anchor.classList.add("active-toc");
          }
        });
      }
    }
  }

  function scrollToHash() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#')) {
      const id = decodeURIComponent(hash.substring(1));
      const targetElement = document.getElementById(id);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth" });
      }
    }
  }

  return {
    init: init,
    addContentsList: addContentsList,
    scrollToHash: scrollToHash,
    refreshAvailability: refreshAvailability,
    open: open,
    close: close,
    toggle: toggle,
    setPinned: setPinned,
    isOpen: () => isDrawerOpen,
    isPinned: () => prefs.pinned
  };
})();
