/**
 * @file modules/core/settings.js
 * @module SiteModules.Settings
 * @description 어느 화면에서나 같은 "전체 설정"(테마, 글자 크기)의 저장 · 적용과 전체 설정 페이지(settings.html) 그리기.
 *   - 값이 바뀔 때마다 localStorage 에 저장한다. 키 끝의 판 번호는 저장 모양이 바뀌면 올린다.
 *   - 읽을 때 항목마다 허용된 값인지 확인하고, 어긋난 항목만 기본값으로 둔다. 읽기/쓰기에 실패해도 기본값으로 동작한다.
 *   - 테마는 :root[data-skin] 으로 적용한다. 뼈대 · 홈 · 문서 둘레의 바탕에 적용되고, 문서 본문은 밝은 종이로 유지된다.
 *   - 「UniPalette」 테마는 UniPalette로 고른 색으로 만든 토큰을 :root 의 style 에 직접 쓴다
 *     (값은 modules/features/unipalette-theme.js 가 저장하고, 여기서는 저장된 값만 읽어 적용한다).
 *   - 「하이라이트」(선택·호버 면, --active)와 「인터페이스」(켜진 메뉴 글자, --sidebar-active-color)는 테마가 정한 색(자동)을 쓰고,
 *     후보색을 고르면 그 색으로 강제한다. 후보는 UniPalette 테마면 고른 팔레트의 색, 다른 테마면 정해 둔 목록(ACCENT_CANDIDATES).
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
    { value: "custom", label: "UniPalette" },
    { value: "system", label: "시스템" }
  ];
  const FONT_SCALES = [
    { value: "0.9", label: "작게" },
    { value: "1", label: "보통" },
    { value: "1.1", label: "크게" },
    { value: "1.25", label: "아주 크게" }
  ];
  // UniPalette 가 아닌 테마에서 「하이라이트」·「인터페이스」로 고를 수 있는 후보색
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
    // 하이라이트·인터페이스는 「자동」 또는 색 값 (UniPalette 팔레트의 색도 후보이므로 목록으로 막지 않는다)
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

  function customTheme() {
    return window.SiteModules && window.SiteModules.UniPaletteTheme;
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
  function applyAccent(usedCustom) {
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
    } else if (usedCustom && tokens["--active"] && face) {
      // UniPalette 의 자동 글자색(서브 1)은 바뀐 면 위에서도 읽히게 다시 맞춘다
      const saved = customTheme().readSaved();
      const sub1 = saved && saved.palette.length >= 5 ? customTheme().assignRoles(saved.palette).roles.sub1 : null;
      if (sub1) tokens["--sidebar-active-color"] = uiText(sub1, face, dark);
    }
    if (tokens["--sidebar-active-color"]) rootEl.style.setProperty("--sidebar-active-color", tokens["--sidebar-active-color"]);
    saveAccentTokens(tokens);
  }

  function apply() {
    const rootEl = document.documentElement;
    const custom = customTheme();
    if (custom) custom.clearTokens();
    rootEl.style.removeProperty("--active");
    rootEl.style.removeProperty("--sidebar-active-color");
    // 「UniPalette」인데 저장된 배색이 없으면(지워졌거나 모양이 바뀜) 밝게로 보인다
    const usedCustom = current.theme === "custom" && custom && custom.applySaved();
    if (!usedCustom) {
      const skin = current.theme === "custom" ? "light" : resolveSkin(current.theme);
      if (skin === "light") rootEl.removeAttribute("data-skin");
      else rootEl.setAttribute("data-skin", skin);
    }
    applyAccent(!!usedCustom);
    rootEl.style.setProperty("--font-scale", current.fontScale);
  }

  /**
   * 하이라이트·인터페이스의 후보색. UniPalette 테마면 고른 팔레트의 색(역할 이름을 붙여서), 아니면 정해 둔 목록.
   * 지금 고른 색이 후보에 없으면(테마를 바꾼 경우 등) 「지금 색」으로 덧붙인다.
   */
  function accentCandidates(key) {
    let list = ACCENT_CANDIDATES;
    const custom = customTheme();
    const saved = current.theme === "custom" && custom ? custom.readSaved() : null;
    if (saved && saved.palette.length >= 5) {
      const roleNames = { primary: "테마색", sub1: "서브 1", sub2: "서브 2", sub3: "서브 3", highlight: "하이라이트" };
      const byIndex = custom.assignRoles(saved.palette).byIndex;
      list = saved.palette.map((hex, i) => ({ value: hex.toUpperCase(), label: roleNames[byIndex[i]] || hex }));
    }
    const value = current[key];
    if (value !== "auto" && !list.some(c => c.value === value.toUpperCase())) {
      list = list.concat([{ value: value.toUpperCase(), label: "지금 색" }]);
    }
    return list;
  }

  /** 「UniPalette」 단추: 대화상자로 배색을 고르고, 고르면 테마를 custom 으로 둔다 */
  function pickCustom(onPicked, onFailed) {
    const custom = customTheme();
    if (!custom) {
      console.warn("[Settings] UniPalette 테마 모듈이 없습니다.");
      return;
    }
    custom.pick(apply)
      .then(picked => {
        if (!picked) return;
        current.theme = "custom";
        save();
        apply();
        if (onPicked) onPicked();
      })
      .catch(err => {
        console.error("[Settings] UniPalette 배색을 고르지 못했습니다:", err);
        if (onFailed) onFailed(err);
      });
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
    current = Object.assign({}, DEFAULTS);   // 고른 UniPalette 배색 값은 남겨 두어, 다시 누르면 그 색에서 시작한다
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
        // UniPalette 는 누를 때마다 대화상자를 열어 다시 고른다
        if (key === "theme" && option.value === "custom") {
          pickCustom(() => { markPressed(); refreshAccentRows(); }, () => {
            btn.textContent = "UniPalette (불러오지 못함)";
            setTimeout(() => { btn.textContent = option.label; }, 3000);
          });
          return;
        }
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
    note.textContent = "테마는 메뉴, 헤더, 홈 화면, 문서 둘레의 바탕에 적용됩니다. 문서 본문은 그림과 예제가 제대로 보이도록 밝은 종이로 유지합니다. 설정은 이 브라우저에 기억됩니다. " +
      "「UniPalette」를 누르면 색 고르기 창이 열리고, 고르는 동안 사이트 배색이 바로 바뀝니다. 첫 색이 바탕·글자·비활성 탭의 색조, 가장 먼 색이 알림 점, 가장 가까운 색이 선택 면이 됩니다. 어두운 배색을 원하면 「어둡게」를 고른 뒤 「UniPalette」를 누르세요. " +
      "「하이라이트」(선택·호버 면)와 「인터페이스」(켜진 메뉴 글자)는 보통 테마가 정하지만, 후보색을 누르면 그 색으로 바꿉니다. UniPalette 테마에서는 고른 팔레트의 색이 후보가 됩니다.";

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
