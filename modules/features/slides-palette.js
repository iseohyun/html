/**
 * @file modules/features/slides-palette.js
 * @module SiteModules.SlidesPalette
 * @description 보고서 형식 슬라이드의 5×3 색(색조 5개 × 명암 3단계).
 *   - 저장한 팔레트를 :root 의 --spN-d · --spN-m · --spN-l 로 적용한다. 저장값이 없으면 slides-palette.css 의 기본값을 쓴다.
 *   - 슬라이드 읽기 설정(.sl-settings)에 「슬라이드 색」 줄을 덧붙인다. slides.js 를 고치지 않고 붙는 별도 모듈이라,
 *     slides.js 가 설정 상자를 새로 만들 때마다(문서를 열 때 · 전체 화면) 다시 붙인다.
 *   - 「고르기」: UniPalette 간단 보기를 count 5 · steps 3 으로 띄우고, 고르는 동안 바로 적용한다. 취소하면 되돌린다.
 *     UniPalette 는 고를 때만 불러온다(unipalette-theme.js 와 같은 주소). 돌려받는 단계는 어두운 쪽부터라 d · m · l 순서와 같다.
 *   - 「기본값」: 저장값을 지우고 기본 5×3 으로 돌아간다.
 *   - 값은 iseohyun_slides_palette_v1 에 [[어둡게, 가운데, 밝게] × 5] 로 저장한다. 읽기 · 쓰기에 실패해도 기본값으로 동작한다.
 * @exports init, apply, pick, reset, readSaved, STORAGE_KEY
 */

window.SiteModules = window.SiteModules || {};

(function () {
  // 문서를 열 때마다 이 파일이 다시 실행되므로, 이미 있으면 붙이기만 다시 한다
  if (window.SiteModules.SlidesPalette) {
    window.SiteModules.SlidesPalette.init();
    return;
  }

  const STORAGE_KEY = "iseohyun_slides_palette_v1";
  const PICK_STORAGE_KEY = "iseohyun_slides_palette_pick_v1";
  const BASE_URL = "https://iseohyun.github.io/UniPalette/";
  const SCRIPTS = ["version.js", "calcColor.js", "unipalette.js"];
  const STYLE = "unipalette.css";
  const HUES = 5;
  const STEPS = 3;
  const TONES = ["d", "m", "l"];
  // UniPalette 기본값(base #E44D1B · linear · 명암 20~80)으로 뽑은 5×3. slides-palette.css 의 :root 와 같다
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

  /** 저장한 팔레트. 없거나 모양이 어긋나면 null */
  function readSaved() {
    try {
      const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return isPalette(p) ? p : null;
    } catch (err) {
      console.warn("[SlidesPalette] 저장한 슬라이드 색을 읽지 못했습니다:", err);
      return null;
    }
  }

  function save(p) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch (err) {
      console.warn("[SlidesPalette] 슬라이드 색을 저장하지 못했습니다:", err);
    }
  }

  function clearSaved() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn("[SlidesPalette] 저장한 슬라이드 색을 지우지 못했습니다:", err);
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
      title: "슬라이드 색 고르기",
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
      console.error("[SlidesPalette] 슬라이드 색을 고르지 못했습니다:", err);
      apply(before);
      return false;
    }).finally(() => {
      picking = false;
    });
  }

  /** 저장값을 지우고 기본 5×3 으로 돌아간다 */
  function reset() {
    clearSaved();
    apply(null);
  }

  /* ---------- 읽기 설정의 「슬라이드 색」 줄 ---------- */

  const ROW_HTML =
    '<div class="sl-row" data-sl-palette><span class="sl-label">슬라이드 색</span><div class="sl-line">' +
    '<span class="sl-pal-chips" aria-hidden="true"></span>' +
    '<button class="pill-btn" type="button" data-sl-pal="pick">고르기</button>' +
    '<button class="pill-btn" type="button" data-sl-pal="reset" aria-pressed="false">기본값</button>' +
    "</div></div>";

  function chipsHtml(p) {
    return p.map(hue =>
      '<span class="sl-pal-chip">' + hue.map(hex => '<i style="background:' + hex + '"></i>').join("") + "</span>"
    ).join("");
  }

  function paintRows(p) {
    const isDefault = !readSaved();
    document.querySelectorAll(".sl-settings [data-sl-palette]").forEach(row => {
      const chips = row.querySelector(".sl-pal-chips");
      if (chips) chips.innerHTML = chipsHtml(p);
      const resetBtn = row.querySelector('[data-sl-pal="reset"]');
      if (resetBtn) resetBtn.setAttribute("aria-pressed", String(isDefault));
    });
  }

  function attach() {
    let added = false;
    document.querySelectorAll(".sl-settings").forEach(box => {
      if (box.querySelector("[data-sl-palette]")) return;
      box.insertAdjacentHTML("beforeend", ROW_HTML);
      added = true;
    });
    if (added) paintRows(readSaved() || DEFAULT_PALETTE);
  }

  function onClick(e) {
    const btn = e.target.closest && e.target.closest(".sl-settings [data-sl-pal]");
    if (!btn) return;
    e.preventDefault();
    if (btn.getAttribute("data-sl-pal") === "pick") pick();
    else reset();
  }

  function init() {
    apply(readSaved());
    attach();
    if (observer) return;
    // slides.js 가 설정 상자를 새로 만들거나 옮기면(문서 열기 · 전체 화면) 줄을 다시 붙인다
    observer = new MutationObserver(() => {
      const boxes = document.querySelectorAll(".sl-settings");
      for (let i = 0; i < boxes.length; i++) {
        if (!boxes[i].querySelector("[data-sl-palette]")) {
          attach();
          return;
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", onClick);
  }

  window.SiteModules.SlidesPalette = {
    STORAGE_KEY: STORAGE_KEY,
    init: init,
    apply: apply,
    pick: pick,
    reset: reset,
    readSaved: readSaved
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
