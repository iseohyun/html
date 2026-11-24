/**
 * @file modules/core/settings.js
 * @module SiteModules.Settings
 * @description 어느 화면에서나 같은 "전체 설정"(테마, 팔레트 색, 글자 크기)의 저장 · 적용과 전체 설정 페이지(settings.html) 그리기.
 *   - 값이 바뀔 때마다 localStorage 에 저장한다. 키 끝의 판 번호는 저장 모양이 바뀌면 올린다.
 *   - 읽을 때 항목마다 허용된 값인지 확인하고, 어긋난 항목만 기본값으로 둔다. 읽기/쓰기에 실패해도 기본값으로 동작한다.
 *   - 테마는 :root[data-skin] 으로 적용한다. 테마는 정해 둔 몇 가지 역할 색(바탕 · 표면 · 선 · 글자 …)이고,
 *     뼈대 · 홈 · 문서 본문 모두에 적용된다.
 *   - 「팔레트 색」은 테마가 정하지 않는 색(슬라이드 그림 · 도식 등)에 쓰는 5×3 색이다. 테마와 따로 고르며 테마를 바꾸지 않는다.
 *     저장 · 적용 · 고르기는 modules/features/palette.js 가 맡고, 여기서는 줄만 그린다.
 *   - 「하이라이트」(선택·호버 면, --active)와 「인터페이스」(켜진 메뉴 글자, --sidebar-active-color)는 테마가 정한 색(자동)을 쓰고,
 *     후보색을 고르면 그 색으로 강제한다. 후보는 정해 둔 목록(ACCENT_CANDIDATES).
 *     후보색은 그대로 쓰지 않고, 테마의 밝기에 맞춰 면은 옅게(어두운 테마는 짙게), 글자는 면과 4.5:1 대비가 되게 다듬는다.
 *     비활성 탭의 면(--tab-idle)은 테마색의 음영이라 여기서 바꾸지 않는다.
 *   - 화면을 열 때의 첫 적용은 깜빡임을 줄이기 위해 modules/script.js 가 같은 키(와 계산해 둔 색 토큰)를 읽어 먼저 한다.
 * @requires SiteModules.ColorMath
 * @exports get, set, reset, apply, renderPage, THEMES, FONT_SCALES, ACCENT_CANDIDATES
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.Settings = (function () {
  const STORAGE_KEY = window.SiteSettingsStorageKey || "iseohyun_settings_v1";
  // 「하이라이트」·「인터페이스」를 강제할 때 계산한 토큰 값. modules/script.js 가 화면을 그리기 전에 먼저 적용한다.
  const ACCENT_TOKENS_KEY = window.SiteAccentTokensKey || "iseohyun_accent_tokens_v1";
  const Color = window.SiteModules.ColorMath;

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
  // 「하이라이트」·「인터페이스」로 고를 수 있는 후보색
  const ACCENT_CANDIDATES = [
    { value: "#E53935", label: "빨강" },
    { value: "#FB8C00", label: "주황" },
    { value: "#FDD835", label: "노랑" },
    { value: "#43A047", label: "초록" },
    { value: "#00897B", label: "청록" },
    { value: "#1E88E5", label: "파랑" },
    { value: "#3949AB", label: "남색" },
    { value: "#8E24AA", label: "보라" }
  ];
  const ACCENT_ROWS = [
    { key: "accent", label: "하이라이트", hint: "선택·호버 면" },
    { key: "ui", label: "인터페이스", hint: "켜진 메뉴 글자" }
  ];
  // 기본 테마는 기기의 밝게/어둡게 설정을 따르는 "시스템". 하이라이트·인터페이스는 테마가 정하는 색(자동)
  const DEFAULTS = { theme: "system", fontScale: "1", accent: "auto", ui: "auto" };
  const OPTIONS = { theme: THEMES, fontScale: FONT_SCALES };

  let current = load();

  function isAllowed(key, value) {
    // 하이라이트·인터페이스는 「자동」 또는 색 값
    if (key === "accent" || key === "ui") return value === "auto" || Color.isHex(value);
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

  function isDarkSkin() {
    const skin = document.documentElement.getAttribute("data-skin");
    return skin === "dark" || skin === "navy";
  }

  /** 하이라이트 후보색 → 선택·호버 면 (밝은 테마는 옅게, 어두운 테마는 짙게) */
  function accentFace(hex, dark) {
    return dark ? Color.tone(hex, 0.6, 10, 50, 22) : Color.tone(hex, 0.6, 10, 60, 88);
  }

  /** 인터페이스 후보색 → 켜진 메뉴 글자 (선택 면 위에서 4.5:1 이상) */
  function uiText(hex, face, dark) {
    return Color.ensureContrast(hex, face, 4.5, dark);
  }

  function tokenNow(name) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return Color.isHex(v) ? v.toUpperCase() : null;
  }

  function saveAccentTokens(tokens) {
    try {
      if (Object.keys(tokens).length) localStorage.setItem(ACCENT_TOKENS_KEY, JSON.stringify(tokens));
      else localStorage.removeItem(ACCENT_TOKENS_KEY);
    } catch (err) {
      console.warn("[Settings] 하이라이트 색을 저장하지 못했습니다:", err);
    }
  }

  // 테마를 적용한 뒤, 강제로 고른 하이라이트·인터페이스 색을 덮어쓴다
  function applyAccent() {
    const rootEl = document.documentElement;
    const dark = isDarkSkin();
    const tokens = {};
    if (current.accent !== "auto") {
      tokens["--active"] = accentFace(current.accent, dark);
      rootEl.style.setProperty("--active", tokens["--active"]);
    }
    const face = tokenNow("--active");
    if (current.ui !== "auto" && face) {
      tokens["--sidebar-active-color"] = uiText(current.ui, face, dark);
    }
    if (tokens["--sidebar-active-color"]) rootEl.style.setProperty("--sidebar-active-color", tokens["--sidebar-active-color"]);
    saveAccentTokens(tokens);
  }

  function apply() {
    const rootEl = document.documentElement;
    rootEl.style.removeProperty("--active");
    rootEl.style.removeProperty("--sidebar-active-color");
    const skin = resolveSkin(current.theme);
    if (skin === "light") rootEl.removeAttribute("data-skin");
    else rootEl.setAttribute("data-skin", skin);
    applyAccent();
    rootEl.style.setProperty("--font-scale", current.fontScale);
  }

  /**
   * 하이라이트·인터페이스의 후보색: 정해 둔 목록.
   * 지금 고른 색이 후보에 없으면(예전에 다른 후보에서 고른 경우 등) 「지금 색」으로 덧붙인다.
   */
  function accentCandidates(key) {
    let list = ACCENT_CANDIDATES;
    const value = current[key];
    if (value !== "auto" && !list.some(c => c.value === value.toUpperCase())) {
      list = list.concat([{ value: value.toUpperCase(), label: "지금 색" }]);
    }
    return list;
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
    current = Object.assign({}, DEFAULTS);   // 팔레트 색은 따로 저장하므로 그대로 둔다(그 줄의 「기본값」으로 되돌린다)
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
      const markPressed = () => {
        controls.querySelectorAll(".pill-btn").forEach(other => {
          other.setAttribute("aria-pressed", String(other === btn));
        });
      };
      btn.addEventListener("click", () => {
        set(key, option.value);
        markPressed();
        if (key === "theme") refreshAccentRows();   // 후보색과 견본의 밝기가 테마를 따라 바뀐다
      });
      controls.appendChild(btn);
    });
    return row;
  }

  let accentRowEls = [];

  /** 하이라이트·인터페이스 줄: 「자동」과 후보색 견본. 견본은 테마에 맞춰 다듬은 실제 색으로 보인다. */
  function createAccentRow(row) {
    const { row: rowEl, controls } = createRow(row.label);
    rowEl.dataset.accentRow = row.key;
    const hint = document.createElement("span");
    hint.className = "set-hint";
    hint.textContent = row.hint;
    rowEl.firstChild.appendChild(hint);

    const dark = isDarkSkin();
    const face = tokenNow("--active") || "#DCE1DE";
    const buttons = [];
    const choose = value => {
      set(row.key, value);
      refreshAccentRows();
    };

    const autoBtn = document.createElement("button");
    autoBtn.type = "button";
    autoBtn.className = "pill-btn";
    autoBtn.textContent = "자동";
    autoBtn.title = "테마가 정한 색";
    autoBtn.dataset.setting = row.key;
    autoBtn.dataset.value = "auto";
    autoBtn.addEventListener("click", () => choose("auto"));
    buttons.push(autoBtn);
    controls.appendChild(autoBtn);

    accentCandidates(row.key).forEach(c => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "color-swatch";
      btn.dataset.setting = row.key;
      btn.dataset.value = c.value;
      // 견본은 테마에 맞춰 다듬은 실제 색: 하이라이트는 면, 인터페이스는 지금 선택 면 위의 글자
      const shown = row.key === "accent" ? accentFace(c.value, dark) : uiText(c.value, face, dark);
      btn.style.setProperty("--swatch", shown);
      btn.style.setProperty("--swatch-face", row.key === "ui" ? face : shown);
      btn.title = c.label + " " + c.value;
      btn.setAttribute("aria-label", row.label + ": " + c.label);
      btn.addEventListener("click", () => choose(c.value));
      buttons.push(btn);
      controls.appendChild(btn);
    });
    const pressed = current[row.key] === "auto" ? "auto" : current[row.key].toUpperCase();
    buttons.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.value === pressed)));
    return rowEl;
  }

  // 테마나 색을 바꾸면 후보와 견본을 다시 그린다 (자리는 그대로, 누르던 단추에 초점을 돌려준다)
  function refreshAccentRows() {
    const focused = document.activeElement;
    const focusKey = focused && focused.dataset ? focused.dataset.setting + "|" + focused.dataset.value : "";
    accentRowEls = accentRowEls.map((el, i) => {
      if (!el.isConnected) return el;
      const fresh = createAccentRow(ACCENT_ROWS[i]);
      el.replaceWith(fresh);
      return fresh;
    });
    accentRowEls.forEach(el => el.querySelectorAll("button").forEach(b => {
      if (b.dataset.setting + "|" + b.dataset.value === focusKey) b.focus();
    }));
  }

  /** 전체 설정 페이지의 내용을 container 안에 그린다. */
  function renderPage(container) {
    if (!container) return;
    const card = document.createElement("div");
    card.className = "set-card";

    card.appendChild(createChoiceRow("테마", "theme"));
    accentRowEls = ACCENT_ROWS.map(createAccentRow);
    accentRowEls.forEach(el => card.appendChild(el));
    const palette = window.SiteModules && window.SiteModules.Palette;
    if (palette) {
      const pal = createRow("팔레트 색");
      const hint = document.createElement("span");
      hint.className = "set-hint";
      hint.textContent = "슬라이드 · 도식";
      pal.row.firstChild.appendChild(hint);
      palette.renderSettingsRow(pal.row, pal.controls);
      card.appendChild(pal.row);
    }
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
    note.textContent = "테마는 메뉴, 헤더, 홈 화면과 문서 본문에 함께 적용됩니다. 어두운 테마에서는 흰 바탕을 전제로 그린 도식(SVG)의 색을 뒤집어 보여 주고, 사진은 그대로 둡니다. 설정은 이 브라우저에 기억됩니다. " +
      "「팔레트 색」은 테마가 정하지 않는 색(슬라이드 그림 · 도식)에 쓰는 5×3 색입니다. 「고르기」를 누르면 UniPalette 색 고르기 창이 열리고, 고르는 동안 바로 바뀝니다. 슬라이드 읽기 설정의 같은 줄과 같은 값입니다. " +
      "「하이라이트」(선택·호버 면)와 「인터페이스」(켜진 메뉴 글자)는 보통 테마가 정하지만, 후보색을 누르면 그 색으로 바꿉니다.";

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
    ACCENT_CANDIDATES: ACCENT_CANDIDATES,
    get: get,
    set: set,
    reset: reset,
    apply: apply,
    renderPage: renderPage
  };
})();
