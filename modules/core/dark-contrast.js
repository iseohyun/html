/**
 * @file modules/core/dark-contrast.js
 * @module SiteModules.DarkContrast
 * @description 어두운 테마(data-skin dark · navy)에서 문서 본문의 "예전 문서가 직접 쓴 색" 때문에 글자가 안 보이는 곳을 고친다.
 *   - style.css 는 사이트 공통 규칙만 덮어쓴다. 문서마다 <style> 이나 style 속성으로 직접 쓴 색(옅은 회색 칸, 검정 · 파랑 글자)은
 *     CSS 로 일일이 덮을 수 없으므로, 본문을 그린 뒤 글자와 그 뒤 바탕의 대비를 재서 3:1 이 안 되는 요소만 글자색을 바꾼다.
 *       · 바탕이 밝으면(예: 옅은 회색 칸) 글자를 짙은 색으로
 *       · 바탕이 어두우면(예: 검정 · 파랑 글자) 글자를 같은 색조의 옅은 색으로
 *   - 바꾼 요소에는 data-dark-fix 를 달고 원래 style 속성의 색을 기억해 두었다가, 밝은 테마로 돌아오면 되돌린다.
 *   - 건드리지 않는 곳: 슬라이드(.slides-doc, 스스로 테마를 따름), svg · 수식(그림 규칙이 따로 있음),
 *     일부러 글자와 바탕을 같은 색으로 가린 퀴즈 단추(button.quiz · button.quiz2), .no-dark-fix 안.
 *   - 본문이 바뀌면(문서 이동 · 코드 불러오기) 잠시 뒤 다시 잰다. 테마가 바뀌면(data-skin) 바로 다시 잰다.
 * @exports run, revert
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.DarkContrast = (function () {
  const MIN_RATIO = 3;
  const DARK_TEXT = "#1b1e1d";
  const SKIP = ".slides-doc, svg, mjx-container, .MathJax, button.quiz, button.quiz2, .no-dark-fix, script, style";
  let timer = null;

  function isDark() {
    const skin = document.documentElement.getAttribute("data-skin");
    return skin === "dark" || skin === "navy";
  }

  function parse(c) {
    const m = c && c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }

  function lum(c) {
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }

  function ratio(a, b) {
    const x = lum(a), y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }

  function backgroundOf(el, stop) {
    for (let e = el; e; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c && c.a > 0.5) return c;
      if (e === stop) break;
    }
    return parse(getComputedStyle(stop).backgroundColor) || { r: 0, g: 0, b: 0 };
  }

  /** 같은 색조의 옅은 색: 흰색과 섞어 대비가 맞을 때까지 */
  function lighten(c, bg) {
    for (let k = 0.3; k <= 1; k += 0.1) {
      const mix = { r: Math.round(c.r + (255 - c.r) * k), g: Math.round(c.g + (255 - c.g) * k), b: Math.round(c.b + (255 - c.b) * k) };
      if (ratio(mix, bg) >= 4.5) return "rgb(" + mix.r + ", " + mix.g + ", " + mix.b + ")";
    }
    return "rgb(255, 255, 255)";
  }

  function fix(el, color) {
    if (!el.hasAttribute("data-dark-fix")) el.setAttribute("data-dark-fix", el.style.getPropertyValue("color") + "|" + el.style.getPropertyPriority("color"));
    el.style.setProperty("color", color, "important");
  }

  /** 바꾼 글자색을 되돌린다 */
  function revert(root) {
    (root || document).querySelectorAll("[data-dark-fix]").forEach(el => {
      const saved = el.getAttribute("data-dark-fix").split("|");
      if (saved[0]) el.style.setProperty("color", saved[0], saved[1] || "");
      else el.style.removeProperty("color");
      el.removeAttribute("data-dark-fix");
    });
  }

  /** 지금 본문을 재서 고친다 (어두운 테마가 아니면 되돌리기만 한다) */
  function run() {
    const article = document.querySelector("#app-main > article");
    if (!article) return;
    revert(article);
    if (!isDark()) return;
    const seen = new Set();
    const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.textContent.trim()) continue;
      const el = node.parentElement;
      if (!el || seen.has(el)) continue;
      seen.add(el);
      if (el.closest(SKIP)) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const fg = parse(cs.color);
      if (!fg || fg.a < 0.3) continue;
      const bg = backgroundOf(el, article);
      if (ratio(fg, bg) >= MIN_RATIO) continue;
      fix(el, lum(bg) > 0.4 ? DARK_TEXT : lighten(fg, bg));
    }
  }

  function schedule(delay) {
    clearTimeout(timer);
    timer = setTimeout(run, delay);
  }

  function init() {
    // 본문이 바뀌면 잠시 뒤 다시 잰다 (스스로 바꾼 style 은 childList 가 아니므로 다시 불리지 않는다).
    // 뼈대(#app-main)는 이 모듈보다 늦게 생길 수 있어 body 를 지켜보고, 본문 밖과 슬라이드 안(자막 · 짚기)의 바뀜은 무시한다.
    new MutationObserver(records => {
      if (records.some(r => r.target.closest && r.target.closest("#app-main") && !r.target.closest(".slides-doc"))) schedule(400);
    }).observe(document.body, { childList: true, subtree: true });
    new MutationObserver(() => schedule(0)).observe(document.documentElement, { attributes: true, attributeFilter: ["data-skin"] });
    schedule(400);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  return { run: run, revert: revert };
})();
