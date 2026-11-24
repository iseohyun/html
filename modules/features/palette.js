/**
 * @file modules/features/palette.js
 * @module SiteModules.Palette
 * @description 사이트 전체의 「팔레트 색」: 테마가 정하지 않는 색(슬라이드 그림 · 도식 · 차트 등)에 쓰는 5×3 색(색조 5개 × 명암 3단계).
 *   - 테마(밝게 · 어둡게 · 스톤 · 네이비)는 뼈대와 본문의 몇 가지 역할 색만 정한다. 팔레트 색은 테마와 따로 고르며 테마를 바꾸지 않는다.
 *   - 저장한 팔레트를 :root 의 --spN-d · --spN-m · --spN-l 로 적용한다. 저장값이 없으면 palette.css 의 기본값을 쓴다.
 *   - 고르는 곳은 두 군데이고 값은 하나다: 전체 설정의 「팔레트 색」 줄(renderSettingsRow), 슬라이드 읽기 설정(.sl-settings)의 같은 이름 줄.
 *     슬라이드 쪽 줄은 slides.js 를 고치지 않고 붙으므로, 설정 상자를 새로 만들 때마다(문서를 열 때 · 전체 화면) 다시 붙인다.
 *   - 「고르기」: UniPalette 간단 보기를 count 5 · steps 3 으로 띄우고, 고르는 동안 바로 적용한다. 취소하면 되돌린다.
 *     UniPalette 는 고를 때만 불러온다. 돌려받는 단계는 어두운 쪽부터라 d · m · l 순서와 같다.
 *   - 「기본값」: 저장값을 지우고 기본 5×3 으로 돌아간다.
 *   - 값은 iseohyun_palette_v1 에 [[어둡게, 가운데, 밝게] × 5] 로 저장한다(예전 슬라이드 색 키에 있던 값은 한 번 옮긴다).
 *     읽기 · 쓰기에 실패해도 기본값으로 동작한다.
 * @exports init, apply, pick, reset, readSaved, renderSettingsRow, STORAGE_KEY, DEFAULT_PALETTE
 */

window.SiteModules = window.SiteModules || {};

(function () {
  // 문서를 열 때마다 머리의 스크립트가 다시 실행될 수 있으므로, 이미 있으면 붙이기만 다시 한다
  if (window.SiteModules.Palette) {
    window.SiteModules.Palette.init();
    return;
  }

  const STORAGE_KEY = "iseohyun_palette_v1";
  const OLD_STORAGE_KEY = "iseohyun_slides_palette_v1";
  const PICK_STORAGE_KEY = "iseohyun_palette_pick_v1";
  const STYLE_HREF = "/modules/features/palette.css";
  const BASE_URL = "https://iseohyun.github.io/UniPalette/";
  const SCRIPTS = ["version.js", "calcColor.js", "unipalette.js"];
  const STYLE = "unipalette.css";
  const HUES = 5;
  const STEPS = 3;
  const TONES = ["d", "m", "l"];
  // UniPalette 기본값(base #E44D1B · linear · 명암 20~80)으로 뽑은 5×3. palette.css 의 :root 와 같다
  const DEFAULT_PALETTE = [
    ["#5B1F0B", "#E44D1B", "#F4B8A4"],
    ["#375B0B", "#8AE41B", "#D0F4A4"],
    ["#0B5B3F", "#1BE49E", "#A4F4D8"],
    ["#0B175B", "#1B39E4", "#A4B0F4"],
    ["#5B0B57", "#E41BDA", "#F4A4F0"]
  ];

  let loading = null;
  let observer = null;
  let picking = false;

  /* ---------- 값 ---------- */

  function isHex(v) {
    return typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
  }

  function isPalette(p) {
    return Array.isArray(p) && p.length === HUES &&
      p.every(hue => Array.isArray(hue) && hue.length === STEPS && hue.every(isHex));
  }

  function readKey(key) {
    const p = JSON.parse(localStorage.getItem(key) || "null");
    return isPalette(p) ? p : null;
  }

  /** 저장한 팔레트. 없거나 모양이 어긋나면 null */
  function readSaved() {
    try {
      const p = readKey(STORAGE_KEY);
      if (p) return p;
      // 예전 「슬라이드 색」 값이 있으면 새 키로 옮긴다
      const old = readKey(OLD_STORAGE_KEY);
      if (old) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(old));
        localStorage.removeItem(OLD_STORAGE_KEY);
      }
      return old;
    } catch (err) {
      console.warn("[Palette] 저장한 팔레트 색을 읽지 못했습니다:", err);
      return null;
    }
  }

  function save(p) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch (err) {
      console.warn("[Palette] 팔레트 색을 저장하지 못했습니다:", err);
    }
  }

  function clearSaved() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(OLD_STORAGE_KEY);
    } catch (err) {
      console.warn("[Palette] 저장한 팔레트 색을 지우지 못했습니다:", err);
    }
  }

  /** 팔레트를 :root 에 적는다. 팔레트가 아니면 적은 값을 지워 CSS 기본값으로 돌아간다 */
  function apply(p) {
    const style = document.documentElement.style;
    for (let n = 1; n <= HUES; n++) {
      TONES.forEach((t, k) => {
        const name = "--sp" + n + "-" + t;
        if (isPalette(p)) style.setProperty(name, p[n - 1][k]);
        else style.removeProperty(name);
      });
    }
    paintRows(isPalette(p) ? p : DEFAULT_PALETTE);
  }

  function isDark() {
    const skin = document.documentElement.getAttribute("data-skin");
    return skin === "dark" || skin === "navy";
  }

  /* ---------- 스타일 (모든 화면에서 쓰므로 스스로 붙인다) ---------- */

  function ensureStyle() {
    if (document.querySelector('link[data-site-palette]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = STYLE_HREF + (window.SiteVersion ? "?v=" + window.SiteVersion : "");
    link.setAttribute("data-site-palette", "");
    document.head.appendChild(link);
  }

  /* ---------- UniPalette (고를 때만 불러온다) ---------- */

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("UniPalette를 불러오지 못했습니다: " + src));
      document.head.appendChild(s);
    });
  }

  function loadUniPalette() {
    if (window.UniPalette && typeof window.UniPalette.pick === "function") return Promise.resolve();
    if (loading) return loading;
    if (!document.querySelector('link[data-unipalette-style]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = BASE_URL + STYLE;
      link.setAttribute("data-unipalette-style", "");
      document.head.appendChild(link);
    }
    loading = SCRIPTS.reduce(
      (chain, name) => chain.then(() => loadScript(BASE_URL + name).catch(err => {
        if (name === "version.js") return; // 판 표시만 담은 파일이라 없어도 고를 수 있다
        throw err;
      })),
      Promise.resolve()
    ).catch(err => {
      loading = null;
      throw err;
    });
    return loading;
  }

  /** UniPalette 간단 보기로 고른다. 고르면 저장하고 true, 취소하거나 실패하면 원래대로 두고 false */
  function pick() {
    if (picking) return Promise.resolve(false);
    picking = true;
    const before = readSaved();
    const start = before || DEFAULT_PALETTE;
    return loadUniPalette().then(() => window.UniPalette.pick({
      count: HUES,
      minCount: HUES,
      steps: STEPS,
      view: "simple",
      lang: "ko",
      theme: isDark() ? "dark" : "light",
      title: "팔레트 색 고르기",
      storageKey: PICK_STORAGE_KEY,
      base: start[0][1],
      onChange: p => { if (isPalette(p)) apply(p); }
    })).then(p => {
      if (!isPalette(p)) {
        apply(before);
        return false;
      }
      save(p);
      apply(p);
      return true;
    }).catch(err => {
      console.error("[Palette] 팔레트 색을 고르지 못했습니다:", err);
      apply(before);
      throw err;
    }).finally(() => {
      picking = false;
    });
  }

  /** 저장값을 지우고 기본 5×3 으로 돌아간다 */
  function reset() {
    clearSaved();
    apply(null);
  }

  /* ---------- 설정 줄: 전체 설정 · 슬라이드 읽기 설정 ---------- */

  function chipsHtml(p) {
    return p.map(hue =>
      '<span class="pal-chip">' + hue.map(hex => '<i style="background:' + hex + '"></i>').join("") + "</span>"
    ).join("");
  }

  const CONTROLS_HTML =
    '<span class="pal-chips" aria-hidden="true"></span>' +
    '<button class="pill-btn" type="button" data-pal="pick">고르기</button>' +
    '<button class="pill-btn" type="button" data-pal="reset" aria-pressed="false">기본값</button>';

  const SLIDE_ROW_HTML =
    '<div class="sl-row" data-palette-row><span class="sl-label">팔레트 색</span><div class="sl-line">' + CONTROLS_HTML + "</div></div>";

  function paintRow(row, p, isDefault) {
    const chips = row.querySelector(".pal-chips");
    if (chips) chips.innerHTML = chipsHtml(p);
    const resetBtn = row.querySelector('[data-pal="reset"]');
    if (resetBtn) resetBtn.setAttribute("aria-pressed", String(isDefault));
  }

  function paintRows(p) {
    const isDefault = !readSaved();
    document.querySelectorAll("[data-palette-row]").forEach(row => paintRow(row, p, isDefault));
  }

  /** 전체 설정 페이지의 「팔레트 색」 줄 안쪽(controls)을 채운다. 줄 요소(row)에 표시를 단다(아직 문서에 붙기 전이라 직접 칠한다) */
  function renderSettingsRow(row, controls) {
    row.setAttribute("data-palette-row", "");
    controls.insertAdjacentHTML("beforeend", CONTROLS_HTML);
    const saved = readSaved();
    paintRow(row, saved || DEFAULT_PALETTE, !saved);
  }

  function attachSlideRows() {
    let added = false;
    document.querySelectorAll(".sl-settings").forEach(box => {
      if (box.querySelector("[data-palette-row]")) return;
      box.insertAdjacentHTML("beforeend", SLIDE_ROW_HTML);
      added = true;
    });
    if (added) paintRows(readSaved() || DEFAULT_PALETTE);
  }

  function onClick(e) {
    const btn = e.target.closest && e.target.closest("[data-palette-row] [data-pal]");
    if (!btn) return;
    e.preventDefault();
    if (btn.getAttribute("data-pal") === "pick") {
      pick().catch(() => {
        const label = btn.textContent;
        btn.textContent = "고르기 (불러오지 못함)";
        setTimeout(() => { btn.textContent = label; }, 3000);
      });
    } else {
      reset();
    }
  }

  function init() {
    ensureStyle();
    apply(readSaved());
    attachSlideRows();
    if (observer || !document.body) return;
    // slides.js 가 설정 상자를 새로 만들거나 옮기면(문서 열기 · 전체 화면) 줄을 다시 붙인다
    observer = new MutationObserver(() => {
      const boxes = document.querySelectorAll(".sl-settings");
      for (let i = 0; i < boxes.length; i++) {
        if (!boxes[i].querySelector("[data-palette-row]")) {
          attachSlideRows();
          return;
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", onClick);
  }

  window.SiteModules.Palette = {
    STORAGE_KEY: STORAGE_KEY,
    DEFAULT_PALETTE: DEFAULT_PALETTE,
    init: init,
    apply: apply,
    pick: pick,
    reset: reset,
    readSaved: readSaved,
    renderSettingsRow: renderSettingsRow
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
