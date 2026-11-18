/**
 * @file modules/core/color-math.js
 * @module SiteModules.ColorMath
 * @description 색 계산 도우미. 전체 설정의 「하이라이트」·「인터페이스」 색과 UniPalette 테마가 함께 쓴다.
 *   UniPalette(calcColor.js)는 처음 고를 때만 불러오므로, 화면을 열 때 필요한 계산은 여기서 한다.
 * @exports isHex, hexToHsl, hslToHex, contrast, ensureContrast, tone
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.ColorMath = (function () {
  function isHex(v) {
    return typeof v === "string" && /^#[0-9A-F]{6}$/i.test(v);
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  /** "#RRGGBB" → { h: 0~360, s: 0~100, l: 0~100 } */
  function hexToHsl(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: h, s: s * 100, l: l * 100 };
  }

  /** (h: 0~360, s: 0~100, l: 0~100) → "#RRGGBB" */
  function hslToHex(h, s, l) {
    s = clamp(s, 0, 100) / 100;
    l = clamp(l, 0, 100) / 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const hex = v => Math.round(v * 255).toString(16).padStart(2, "0");
    return ("#" + hex(f(0)) + hex(f(8)) + hex(f(4))).toUpperCase();
  }

  function luminance(hex) {
    const ch = i => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * ch(1) + 0.7152 * ch(3) + 0.0722 * ch(5);
  }

  /** WCAG 대비 (1~21) */
  function contrast(a, b) {
    const la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
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

  /** 색조는 두고, 채도를 satScale 배(satMin~satMax 안)로, 명도를 lightness 로 바꾼 색 */
  function tone(hex, satScale, satMin, satMax, lightness) {
    const hsl = hexToHsl(hex);
    return hslToHex(hsl.h, clamp(hsl.s * satScale, satMin, satMax), lightness);
  }

  return {
    isHex: isHex,
    hexToHsl: hexToHsl,
    hslToHex: hslToHex,
    contrast: contrast,
    ensureContrast: ensureContrast,
    tone: tone
  };
})();
