/**
 * @file modules/core/diagnostics.js
 * @module SiteModules.Diag
 * @description 문의에 몰래 붙이는 진단 정보.
 *   - 이 페이지에서 난 최근 오류(console.error · console.warn · 잡히지 않은 오류 · 처리되지 않은 Promise 거절)를
 *     몇 개만 기억한다. 화면에는 보이지 않고, 오류는 그대로 콘솔에도 찍힌다.
 *   - 문의 대화나 메일을 보낼 때 snapshot() 을 함께 보내면 관리자만 펼쳐 본다. 보낸 뒤에는 clear() 로 비운다.
 *   - 다른 모듈보다 먼저 불러와야 처음부터 오류를 모은다(modules/script.js 의 목록 맨 앞).
 * @exports record, snapshot, hasErrors, clear
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.Diag = window.SiteModules.Diag || (function () {
  const MAX_ENTRIES = 12;
  const MAX_TEXT = 400;
  const MAX_SNAPSHOT = 4000;
  const entries = [];

  function describe(value) {
    if (value instanceof Error) {
      return `${value.name}: ${value.message}${value.code ? ` [${value.code}]` : ""}`;
    }
    if (value && typeof value === "object") {
      if (value.message) return `${value.message}${value.code ? ` [${value.code}]` : ""}`;
      try { return JSON.stringify(value); } catch (err) { return String(value); }
    }
    return String(value);
  }

  function push(level, args) {
    const text = Array.from(args, describe).join(" ").replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
    if (!text) return;
    entries.push({ at: new Date(), level, text });
    if (entries.length > MAX_ENTRIES) entries.shift();
  }

  // 콘솔에 찍히는 오류와 경고를 그대로 두고 기록만 더한다
  ["error", "warn"].forEach(level => {
    const original = console[level];
    if (typeof original !== "function") return;
    console[level] = function () {
      try { push(level, arguments); } catch (err) { /* 기록 실패는 무시 */ }
      return original.apply(console, arguments);
    };
  });

  window.addEventListener("error", e => {
    const where = e.filename ? ` @ ${e.filename.replace(window.location.origin, "")}:${e.lineno}` : "";
    push("error", [`${e.message || "스크립트 오류"}${where}`]);
  });
  window.addEventListener("unhandledrejection", e => push("error", ["처리되지 않은 거절:", e.reason]));

  function pad(n) { return String(n).padStart(2, "0"); }

  function loginLabel() {
    const Auth = window.SiteModules.Auth;
    if (!Auth || !Auth.isSignedIn()) return "안 함";
    const profile = Auth.currentProfile ? Auth.currentProfile() : null;
    return (profile && profile.provider) || "알 수 없음";
  }

  /**
   * 오류를 콘솔에 찍고 진단 기록에 남긴다. 화면에는 보이지 않는다.
   * @param {string} context 어디서 난 오류인지 (예: "ContactChat 대화 불러오기")
   * @param {*} err
   */
  function record(context, err) {
    console.error(`[${context}]`, err);
  }

  /** 관리자가 볼 진단 글. 빌드 · 주소 · 브라우저 · 화면 · 로그인과 최근 오류 */
  function snapshot() {
    const lines = [
      `빌드: ${window.SiteVersion || "-"}`,
      `주소: ${window.location.href}`,
      `브라우저: ${navigator.userAgent}`,
      `화면: ${window.innerWidth}x${window.innerHeight}`,
      `로그인: ${loginLabel()}`,
      `최근 오류 ${entries.length}개:`
    ];
    entries.forEach(e => {
      lines.push(`${pad(e.at.getHours())}:${pad(e.at.getMinutes())}:${pad(e.at.getSeconds())} ${e.level} ${e.text}`);
    });
    return lines.join("\n").slice(0, MAX_SNAPSHOT);
  }

  return {
    record: record,
    snapshot: snapshot,
    /** 보낼 만한 오류가 있는지 */
    hasErrors: () => entries.length > 0,
    /** 문의를 보낸 뒤 비운다 */
    clear: () => { entries.length = 0; }
  };
})();
