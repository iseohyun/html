/**
 * @file modules/core/settings.js
 * @module SiteModules.Settings
 * @description 어느 화면에서나 같은 "전체 설정"(테마, 글자 크기)의 저장 · 적용과 전체 설정 페이지(settings.html) 그리기.
 *   - 값이 바뀔 때마다 localStorage 에 저장한다. 키 끝의 판 번호는 저장 모양이 바뀌면 올린다.
 *   - 읽을 때 항목마다 허용된 값인지 확인하고, 어긋난 항목만 기본값으로 둔다. 읽기/쓰기에 실패해도 기본값으로 동작한다.
 *   - 테마는 :root[data-skin] 으로 적용한다. 지금은 뼈대(레일 · 패널 · 헤더)에만 적용되고 문서 본문은 밝게 유지된다.
 *   - 화면을 열 때의 첫 적용은 깜빡임을 줄이기 위해 modules/script.js 가 같은 키를 읽어 먼저 한다.
 * @exports get, set, reset, apply, renderPage, THEMES, FONT_SCALES
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.Settings = (function () {
  const STORAGE_KEY = window.SiteSettingsStorageKey || "iseohyun_settings_v1";

  const THEMES = [
    { value: "light", label: "밝게" },
    { value: "dark", label: "어둡게" },
    { value: "gray", label: "스톤" },
    { value: "navy", label: "네이비" },
    { value: "system", label: "시스템" }
  ];
  const FONT_SCALES = [
    { value: "0.9", label: "작게" },
    { value: "1", label: "보통" },
    { value: "1.1", label: "크게" },
    { value: "1.25", label: "아주 크게" }
  ];
  const DEFAULTS = { theme: "light", fontScale: "1" };
  const OPTIONS = { theme: THEMES, fontScale: FONT_SCALES };

  let current = load();

  function isAllowed(key, value) {
    return OPTIONS[key].some(option => option.value === value);
  }

  function load() {
    const settings = Object.assign({}, DEFAULTS);
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      Object.keys(DEFAULTS).forEach(key => {
        if (isAllowed(key, saved[key])) settings[key] = saved[key];
      });
    } catch (err) {
      console.warn("[Settings] 설정을 읽지 못해 기본값을 씁니다:", err);
    }
    return settings;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch (err) {
      console.warn("[Settings] 설정을 저장하지 못했습니다:", err);
    }
  }

  // "시스템"은 기기의 밝게/어둡게 설정을 따른다
  function resolveSkin(theme) {
    if (theme !== "system") return theme;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function apply() {
    const rootEl = document.documentElement;
    const skin = resolveSkin(current.theme);
    if (skin === "light") rootEl.removeAttribute("data-skin");
    else rootEl.setAttribute("data-skin", skin);
    rootEl.style.setProperty("--font-scale", current.fontScale);
  }

  function get(key) {
    return current[key];
  }

  function set(key, value) {
    if (!(key in DEFAULTS) || !isAllowed(key, value)) {
      console.warn(`[Settings] 허용되지 않은 값입니다: ${key}=${value}`);
      return;
    }
    current[key] = value;
    save();
    apply();
  }

  function reset() {
    current = Object.assign({}, DEFAULTS);
    save();
    apply();
  }

  function createRow(labelText) {
    const row = document.createElement("div");
    row.className = "topic-row";
    const label = document.createElement("div");
    label.className = "topic-label";
    label.textContent = labelText;
    const controls = document.createElement("div");
    controls.className = "controls-line";
    row.append(label, controls);
    return { row, controls };
  }

  function createChoiceRow(labelText, key) {
    const { row, controls } = createRow(labelText);
    OPTIONS[key].forEach(option => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pill-btn";
      btn.textContent = option.label;
      btn.dataset.setting = key;
      btn.dataset.value = option.value;
      btn.setAttribute("aria-pressed", String(current[key] === option.value));
      btn.addEventListener("click", () => {
        set(key, option.value);
        controls.querySelectorAll(".pill-btn").forEach(other => {
          other.setAttribute("aria-pressed", String(other === btn));
        });
      });
      controls.appendChild(btn);
    });
    return row;
  }

  /** 전체 설정 페이지의 내용을 container 안에 그린다. */
  function renderPage(container) {
    if (!container) return;
    const card = document.createElement("div");
    card.className = "set-card";

    card.appendChild(createChoiceRow("테마", "theme"));
    card.appendChild(createChoiceRow("글자 크기", "fontScale"));

    const keys = createRow("단축키");
    const keysLink = document.createElement("a");
    keysLink.className = "pill-btn";
    keysLink.href = "#/settings-keys.html";
    keysLink.textContent = "단축키 보기 · 바꾸기";
    keys.controls.appendChild(keysLink);
    card.appendChild(keys.row);

    const restore = createRow("되돌리기");
    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "pill-btn";
    resetBtn.id = "settings-reset-btn";
    resetBtn.textContent = "설정 기본값으로";
    resetBtn.addEventListener("click", () => {
      reset();
      container.replaceChildren();
      renderPage(container);
    });
    restore.controls.appendChild(resetBtn);
    card.appendChild(restore.row);

    const note = document.createElement("p");
    note.className = "set-note";
    note.textContent = "테마는 지금 왼쪽 메뉴와 위쪽 헤더에 적용됩니다. 문서 본문은 읽기 쉽도록 밝은 바탕을 유지합니다. 설정은 이 브라우저에 기억됩니다.";

    container.append(card, note);
  }

  // 기기의 밝게/어둡게 설정이 바뀌면 "시스템" 테마를 다시 맞춘다
  if (window.matchMedia) {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => { if (current.theme === "system") apply(); };
    if (media.addEventListener) media.addEventListener("change", onChange);
  }

  apply();

  return {
    THEMES: THEMES,
    FONT_SCALES: FONT_SCALES,
    get: get,
    set: set,
    reset: reset,
    apply: apply,
    renderPage: renderPage
  };
})();
