/**
 * @file modules/core/keybind-manager.js
 * @module SiteModules.KeybindManager
 * @description 전역 단축키. 자주 쓰는 동작에 한 글자 단축키를 붙이고, Alt 를 누르는 동안 해당 버튼 모서리에 배지를 보여 준다.
 *   - 입력 칸에 글자를 넣는 중이거나 Ctrl/Alt/Cmd 와 함께 누른 키는 건드리지 않는다.
 *   - 사용자가 바꾼 단축키는 전체 설정과 별도의 키로 브라우저에 기억한다(판 번호 포함).
 *   - 단축키 페이지(settings-keys.html)를 그린다: 목록, 바꾸기, 기본값으로.
 * @exports init, getBindings, setKey, resetKeys, renderPage
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.KeybindManager = (function () {
  const STORAGE_KEY = "iseohyun_keybinds_v1";

  function clickIfVisible(selector) {
    const target = document.querySelector(selector);
    if (target && !target.hidden && target.offsetParent !== null) target.click();
  }

  // 검색 패널을 열고 검색 칸에 커서를 둔다
  function focusSearch() {
    const pane = document.getElementById("tab-search");
    const panel = document.getElementById("sidebar-panel");
    const isOpen = pane && pane.classList.contains("active") && panel && !panel.classList.contains("collapsed");
    if (!isOpen) clickIfVisible("#nav-search");
    const input = document.getElementById("sidebar-search-input");
    if (input) setTimeout(() => input.focus(), 0);
  }

  function moveTab(step) {
    const tabs = Array.from(document.querySelectorAll("#header-tabs .app-tab"));
    const index = tabs.findIndex(tab => tab.getAttribute("aria-selected") === "true");
    const next = tabs[index + step];
    if (index >= 0 && next) next.click();
  }

  // badge: Alt 를 누르는 동안 배지를 붙일 요소
  const ACTIONS = [
    { id: "rail1", label: "사이트맵", defaultKey: "1", badge: "#nav-sitemap", run: () => clickIfVisible("#nav-sitemap") },
    { id: "rail2", label: "목차", defaultKey: "2", badge: "#nav-toc", run: () => clickIfVisible("#nav-toc") },
    { id: "rail3", label: "검색 패널", defaultKey: "3", badge: "#nav-search", run: () => clickIfVisible("#nav-search") },
    { id: "menu", label: "사이드바 여닫기", defaultKey: "m", badge: "#header-menu-btn", run: () => clickIfVisible("#header-menu-btn") },
    { id: "filter", label: "필터 여닫기", defaultKey: "f", badge: "#header-filter-btn", run: () => clickIfVisible("#header-filter-btn") },
    { id: "search", label: "검색 칸으로", defaultKey: "/", run: focusSearch },
    { id: "settings", label: "화면별 설정 여닫기", defaultKey: ",", badge: "#header-settings-btn", run: () => clickIfVisible("#header-settings-btn") },
    { id: "prevTab", label: "이전 탭", defaultKey: "[", run: () => moveTab(-1) },
    { id: "nextTab", label: "다음 탭", defaultKey: "]", run: () => moveTab(1) }
  ];

  let customKeys = loadCustomKeys();

  function normalizeKey(key) {
    return typeof key === "string" && key.length === 1 ? key.toLowerCase() : "";
  }

  function loadCustomKeys() {
    const valid = {};
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const used = new Set();
      ACTIONS.forEach(action => {
        const key = normalizeKey(saved[action.id]);
        // 모양이 어긋났거나 겹치는 항목만 기본값으로 둔다
        if (key && key !== " " && !used.has(key)) {
          valid[action.id] = key;
          used.add(key);
        }
      });
    } catch (err) {
      console.warn("[Keybind] 단축키를 읽지 못해 기본값을 씁니다:", err);
    }
    return valid;
  }

  function saveCustomKeys() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customKeys));
    } catch (err) {
      console.warn("[Keybind] 단축키를 저장하지 못했습니다:", err);
    }
  }

  function getKey(action) {
    return customKeys[action.id] || action.defaultKey;
  }

  /** 지금의 단축키 목록: [{ id, label, key, defaultKey }] */
  function getBindings() {
    return ACTIONS.map(action => ({ id: action.id, label: action.label, key: getKey(action), defaultKey: action.defaultKey }));
  }

  /**
   * 동작의 단축키를 바꾼다.
   * @returns {{ok: boolean, message?: string}} 이미 쓰는 키면 어디서 쓰는지 알려 준다
   */
  function setKey(actionId, rawKey) {
    const key = normalizeKey(rawKey);
    const action = ACTIONS.find(item => item.id === actionId);
    if (!action) return { ok: false, message: "알 수 없는 동작입니다." };
    if (!key || key === " ") return { ok: false, message: "글자, 숫자, 기호 한 글자만 쓸 수 있습니다." };

    const owner = ACTIONS.find(item => item.id !== actionId && getKey(item) === key);
    if (owner) return { ok: false, message: `"${key.toUpperCase()}" 는 이미 "${owner.label}"에서 씁니다.` };

    if (key === action.defaultKey) delete customKeys[actionId];
    else customKeys[actionId] = key;
    saveCustomKeys();
    applyBadges();
    return { ok: true };
  }

  function resetKeys() {
    customKeys = {};
    saveCustomKeys();
    applyBadges();
  }

  // 배지에 쓸 글자를 대상 요소의 data-key 에 적는다 (CSS 가 [data-key]::after 로 그린다)
  function applyBadges() {
    ACTIONS.forEach(action => {
      if (!action.badge) return;
      const target = document.querySelector(action.badge);
      if (target) target.setAttribute("data-key", getKey(action));
    });
  }

  function isTyping(target) {
    if (!target) return false;
    return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
  }

  function init() {
    window.addEventListener("keydown", (e) => {
      // Alt 를 누르는 동안 단축키 배지를 보여 준다 (브라우저 메뉴로 초점이 넘어가지 않게 기본 동작은 막는다)
      if (e.key === "Alt") {
        e.preventDefault();
        applyBadges();
        document.body.classList.add("show-keys");
        return;
      }

      // 입력 중이거나 조합 키와 함께 누른 키는 건드리지 않는다 (브라우저 단축키와 부딪히지 않게)
      if (isTyping(e.target) || e.ctrlKey || e.altKey || e.metaKey) return;
      // 단축키를 바꾸는 중에는 실행하지 않는다
      if (document.body.classList.contains("is-capturing-key")) return;

      const key = normalizeKey(e.key);
      if (!key) return;
      const action = ACTIONS.find(item => getKey(item) === key);
      if (!action) return;

      e.preventDefault();
      action.run();
    });

    window.addEventListener("keyup", (e) => {
      if (e.key === "Alt") {
        e.preventDefault();
        document.body.classList.remove("show-keys");
      }
    });

    window.addEventListener("blur", () => {
      document.body.classList.remove("show-keys");
    });
  }

  /** 단축키 페이지의 내용을 container 안에 그린다. */
  function renderPage(container) {
    if (!container) return;
    container.replaceChildren();

    const card = document.createElement("div");
    card.className = "set-card";
    const message = document.createElement("p");
    message.className = "set-note";
    message.id = "keys-message";
    message.setAttribute("role", "status");
    message.textContent = "키가 적힌 버튼을 누른 다음 새 키를 누르면 바뀝니다. Esc 로 취소합니다.";

    let stopCapture = null;

    getBindings().forEach(binding => {
      const row = document.createElement("div");
      row.className = "topic-row";
      const label = document.createElement("div");
      label.className = "topic-label";
      label.textContent = binding.label;
      const controls = document.createElement("div");
      controls.className = "controls-line";

      const keyBtn = document.createElement("button");
      keyBtn.type = "button";
      keyBtn.className = "pill-btn key-cap";
      keyBtn.dataset.action = binding.id;
      keyBtn.textContent = binding.key.toUpperCase();
      keyBtn.title = `${binding.label} 단축키 바꾸기`;

      keyBtn.addEventListener("click", () => {
        if (stopCapture) stopCapture();
        keyBtn.setAttribute("aria-pressed", "true");
        keyBtn.textContent = "…";
        message.textContent = `"${binding.label}"에 쓸 새 키를 누르세요. Esc 로 취소합니다.`;
        document.body.classList.add("is-capturing-key");

        const onKey = (e) => {
          if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
          e.preventDefault();
          e.stopPropagation();
          if (e.key === "Escape") {
            stopCapture();
            message.textContent = "취소했습니다.";
            return;
          }
          const result = setKey(binding.id, e.key);
          if (!result.ok) {
            message.textContent = result.message;
            return;
          }
          stopCapture();
          renderPage(container);
        };
        window.addEventListener("keydown", onKey, true);
        stopCapture = () => {
          window.removeEventListener("keydown", onKey, true);
          document.body.classList.remove("is-capturing-key");
          keyBtn.setAttribute("aria-pressed", "false");
          keyBtn.textContent = binding.key.toUpperCase();
          stopCapture = null;
        };
      });

      controls.appendChild(keyBtn);
      if (binding.key !== binding.defaultKey) {
        const hint = document.createElement("span");
        hint.className = "key-default-hint";
        hint.textContent = `기본값 ${binding.defaultKey.toUpperCase()}`;
        controls.appendChild(hint);
      }
      row.append(label, controls);
      card.appendChild(row);
    });

    const fixedRow = document.createElement("div");
    fixedRow.className = "topic-row";
    fixedRow.innerHTML = `<div class="topic-label">열린 창 닫기</div><div class="controls-line"><span class="pill-btn key-cap is-fixed">ESC</span><span class="key-default-hint">바꿀 수 없음</span></div>`;
    card.appendChild(fixedRow);

    const actions = document.createElement("div");
    actions.className = "controls-line";
    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "pill-btn";
    resetBtn.id = "keys-reset-btn";
    resetBtn.textContent = "단축키 기본값으로";
    resetBtn.addEventListener("click", () => {
      if (stopCapture) stopCapture();
      resetKeys();
      renderPage(container);
    });
    const backLink = document.createElement("a");
    backLink.className = "pill-btn";
    backLink.href = "#/settings.html";
    backLink.textContent = "← 전체 설정";
    actions.append(backLink, resetBtn);

    container.append(card, message, actions);

    // 다른 문서로 옮기면 키 입력 대기를 풀어 준다
    if (typeof window.SiteModules.registerPageCleanup === "function") {
      window.SiteModules.registerPageCleanup(() => { if (stopCapture) stopCapture(); });
    }
  }

  return {
    init: init,
    getBindings: getBindings,
    setKey: setKey,
    resetKeys: resetKeys,
    renderPage: renderPage
  };
})();
