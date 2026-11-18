/**
 * @file modules/features/unipalette-theme.js
 * @module SiteModules.UniPaletteTheme
 * @description 전체 설정의 테마 「UniPalette」. UniPalette 모듈로 고른 색으로 사이트 배색을 만든다.
 *   - UniPalette(대화상자 모듈)는 처음 고를 때만 github.io에서 불러온다(version.js, calcColor.js, unipalette.js, unipalette.css).
 *   - 서로 떨어진 색 5개 이상을 역할로 나눈다(UniPalette 견본 앱의 배색 규칙과 같음):
 *       첫 색 = 테마색 → 바탕·표면·가라앉은 면·선·글자를 이 색조에서 채도를 낮춰 만든다
 *       가장 먼 색(반대색) = 하이라이트색 → 알림 점(--alert)
 *       나머지를 테마색에서 가까운 순서로 서브 1·2·3 → 서브 1이 선택·호버 면(--active)과 켜진 메뉴 글자
 *   - 고르는 동안 onChange로 사이트에 바로 적용하고, 취소하면 원래 테마로 되돌린다.
 *   - 계산한 토큰 값은 iseohyun_custom_skin_v1 에 저장한다. 화면을 열 때는 modules/script.js 와
 *     settings.js 가 이 값만 읽어 적용하므로, 평소에는 UniPalette를 불러오지 않는다.
 *   - 문서 본문(article)은 다른 테마와 같이 밝은 종이로 남는다.
 * @exports pick, readSaved, applySaved, clearTokens, TOKEN_NAMES, STORAGE_KEY
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.UniPaletteTheme = (function () {
  const STORAGE_KEY = window.SiteCustomSkinKey || "iseohyun_custom_skin_v1";
  const BASE_URL = "https://iseohyun.github.io/UniPalette/";
  const SCRIPTS = ["version.js", "calcColor.js", "unipalette.js"];
  const STYLE = "unipalette.css";
  const MIN_COLORS = 5;
  const TOKEN_NAMES = ["--bg", "--surface", "--sunken", "--line", "--fg", "--muted", "--active", "--alert", "--sidebar-active-color"];
  const ROLE_NAMES = { primary: "테마색", sub1: "서브 1 · 선택", sub2: "서브 2", sub3: "서브 3", highlight: "하이라이트" };

  let loading = null;

  /* ---------- 저장된 배색 ---------- */

  function isHex(v) {
    return typeof v === "string" && /^#[0-9A-F]{6}$/i.test(v);
  }

  /** 저장된 배색. 모양이 어긋나면 null */
  function readSaved() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || !Array.isArray(saved.palette) || !saved.tokens) return null;
      if (!TOKEN_NAMES.every(name => isHex(saved.tokens[name]))) return null;
      return { palette: saved.palette.filter(isHex), dark: saved.dark === true, tokens: saved.tokens };
    } catch (err) {
      console.warn("[UniPaletteTheme] 저장된 배색을 읽지 못했습니다:", err);
      return null;
    }
  }

  function save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn("[UniPaletteTheme] 배색을 저장하지 못했습니다:", err);
    }
  }

  function applyTokens(tokens, dark) {
    const root = document.documentElement;
    TOKEN_NAMES.forEach(name => root.style.setProperty(name, tokens[name]));
    if (dark) root.setAttribute("data-skin", "dark");
    else root.removeAttribute("data-skin");
  }

  function clearTokens() {
    const root = document.documentElement;
    TOKEN_NAMES.forEach(name => root.style.removeProperty(name));
  }

  /** 저장된 배색을 적용한다. 없으면 false */
  function applySaved() {
    const saved = readSaved();
    if (!saved) return false;
    applyTokens(saved.tokens, saved.dark);
    return true;
  }

  /* ---------- UniPalette 불러오기 ---------- */

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = false;
      s.onload = resolve;
      s.onerror = () => reject(new Error("UniPalette를 불러오지 못했습니다: " + src));
      document.head.appendChild(s);
    });
  }

  function loadUniPalette() {
    if (window.UniPalette && typeof window.UniPalette.pick === "function") return Promise.resolve();
    if (loading) return loading;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = BASE_URL + STYLE + "?v=" + window.SiteVersion;
    document.head.appendChild(link);
    loading = SCRIPTS.reduce(
      (chain, file) => chain.then(() => loadScript(BASE_URL + file + "?v=" + window.SiteVersion)),
      Promise.resolve()
    ).catch(err => {
      loading = null;
      throw err;
    });
    return loading;
  }

  /* ---------- 팔레트 → 사이트 토큰 (calcColor.js 의 함수를 쓴다) ---------- */

  function hueDistance(a, b) {
    const d = Math.abs(hexToHsl(a).h - hexToHsl(b).h) % 360;
    return d > 180 ? 360 - d : d;
  }

  /** 0번이 테마색, 가장 먼 색이 하이라이트, 나머지는 가까운 순서로 서브 1·2·3 */
  function assignRoles(colors) {
    const byIndex = new Array(colors.length).fill("");
    const roles = { primary: colors[0] };
    byIndex[0] = "primary";
    const rest = colors.map((hex, i) => ({ hex, i, d: hueDistance(colors[0], hex) })).slice(1);
    rest.sort((x, y) => x.d - y.d || x.i - y.i);
    const far = rest.pop();
    roles.highlight = far.hex;
    byIndex[far.i] = "highlight";
    ["sub1", "sub2", "sub3"].forEach((role, k) => {
      roles[role] = rest[k].hex;
      byIndex[rest[k].i] = role;
    });
    return { roles, byIndex };
  }

  function contrast(a, b) {
    const la = getRelativeLuminance(a);
    const lb = getRelativeLuminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function tone(hex, satScale, satMin, satMax, lightness) {
    const hsl = hexToHsl(hex);
    return hslToHex(hsl.h, clamp(hsl.s * satScale, satMin, satMax), lightness);
  }

  /** 바탕과의 대비가 target이 될 때까지 글자 명도를 바탕 반대쪽으로 민다 */
  function ensureContrast(fg, bg, target, dark) {
    if (contrast(fg, bg) >= target) return fg;
    const hsl = hexToHsl(fg);
    const step = dark ? 1 : -1;
    for (let l = hsl.l + step; l >= 0 && l <= 100; l += step) {
      const hex = hslToHex(hsl.h, hsl.s, l);
      if (contrast(hex, bg) >= target) return hex;
    }
    return dark ? "#FFFFFF" : "#000000";
  }

  function buildTokens(palette, dark) {
    const colors = palette.map(item => (Array.isArray(item) ? item[Math.floor(item.length / 2)] : item));
    const roles = assignRoles(colors).roles;
    const p = roles.primary;
    const t = dark ? {
      "--bg": tone(p, 0.45, 6, 40, 9),
      "--surface": tone(p, 0.45, 6, 40, 13),
      "--sunken": tone(p, 0.45, 6, 40, 6),
      "--line": tone(p, 0.4, 6, 35, 24),
      "--fg": tone(p, 0.3, 4, 25, 92),
      "--muted": tone(p, 0.3, 4, 25, 68),
      "--active": tone(roles.sub1, 0.6, 10, 50, 22)
    } : {
      "--bg": tone(p, 0.4, 5, 35, 96),
      "--surface": tone(p, 0.3, 3, 25, 99.5),
      "--sunken": tone(p, 0.45, 6, 40, 91),
      "--line": tone(p, 0.4, 6, 35, 83),
      "--fg": tone(p, 0.5, 6, 40, 12),
      "--muted": tone(p, 0.35, 5, 30, 38),
      "--active": tone(roles.sub1, 0.6, 10, 60, 88)
    };
    // 글자는 가장 어려운 면(밝은 배색은 가라앉은 면, 어두운 배색은 표면)에서도 읽히게 맞춘다
    const hardest = dark ? t["--surface"] : t["--sunken"];
    t["--fg"] = ensureContrast(t["--fg"], hardest, 4.5, dark);
    t["--muted"] = ensureContrast(t["--muted"], hardest, 4.5, dark);
    t["--sidebar-active-color"] = ensureContrast(roles.sub1, t["--active"], 4.5, dark);
    const hl = hexToHsl(roles.highlight);
    t["--alert"] = hslToHex(hl.h, Math.max(hl.s, 60), clamp(hl.l, 40, 60));
    return t;
  }

  /* ---------- 고르기 ---------- */

  function isDarkNow() {
    const skin = document.documentElement.getAttribute("data-skin");
    return skin === "dark" || skin === "navy";
  }

  /**
   * UniPalette 간단 보기를 띄운다. 고르는 동안 사이트에 바로 적용하고,
   * 「선택」이면 저장하고 true, 취소면 restore()를 불러 원래대로 하고 false.
   * 바탕의 밝기는 고르기 직전의 테마를 따른다(어두운 배색은 「어둡게」를 고른 뒤 고른다).
   */
  function pick(restore) {
    const dark = isDarkNow();
    const saved = readSaved();
    return loadUniPalette().then(() => {
      const options = {
        count: MIN_COLORS,
        minCount: MIN_COLORS,
        steps: 1,
        view: "simple",
        lang: "ko",
        theme: dark ? "dark" : "light",
        title: "사이트 배색 고르기",
        storageKey: "iseohyun_unipalette_pick_v1",
        labels: (n, hexes) => (hexes && hexes.length >= MIN_COLORS
          ? assignRoles(hexes).byIndex.map(role => (role ? ROLE_NAMES[role] : ""))
          : null),
        onChange: palette => applyTokens(buildTokens(palette, dark), dark)
      };
      if (saved && saved.palette.length) options.base = saved.palette[0];
      return window.UniPalette.pick(options);
    }).then(palette => {
      if (palette === null) {
        clearTokens();
        if (typeof restore === "function") restore();
        return false;
      }
      const tokens = buildTokens(palette, dark);
      save({ palette: palette.map(item => (Array.isArray(item) ? item[Math.floor(item.length / 2)] : item)), dark, tokens });
      applyTokens(tokens, dark);
      return true;
    }).catch(err => {
      console.error("[UniPaletteTheme] 배색을 고르지 못했습니다:", err);
      clearTokens();
      if (typeof restore === "function") restore();
      throw err;
    });
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    TOKEN_NAMES: TOKEN_NAMES,
    pick: pick,
    readSaved: readSaved,
    applySaved: applySaved,
    clearTokens: clearTokens
  };
})();
