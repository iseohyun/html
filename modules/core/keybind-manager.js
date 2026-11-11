/**
 * @file modules/core/keybind-manager.js
 * @module SiteModules.KeybindManager
 * @description 전역 단축키 처리. 숫자 1~3으로 사이드바 탭(사이트맵/목차/검색)을 전환하고,
 *   Alt 키를 누르는 동안 단축키 배지를 표시한다. 입력 필드 포커스 중에는 동작하지 않는다.
 * @exports init
 */
window.SiteModules = window.SiteModules || {};

window.SiteModules.KeybindManager = (function() {
  function init() {
    window.addEventListener('keydown', (e) => {
      // 입력 필드(INPUT, TEXTAREA, SELECT)에서 포커스되어 타이핑 중일 때는 단축키 동작을 무시합니다.
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      // Alt 키다운 시 배지 보이기 활성화 및 브라우저 기본 포커스 동작 차단
      if (e.key === 'Alt') {
        e.preventDefault();
        document.body.classList.add('show-keybinds');
        return;
      }

      // 숫자 키 1~3 탭 클릭 에뮬레이션
      if (e.key === '1') {
        e.preventDefault();
        const el = document.getElementById("nav-sitemap");
        if (el) el.click();
      } else if (e.key === '2') {
        e.preventDefault();
        const el = document.getElementById("nav-toc");
        if (el) el.click();
      } else if (e.key === '3') {
        e.preventDefault();
        const el = document.getElementById("nav-search");
        if (el) el.click();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'Alt') {
        e.preventDefault();
        document.body.classList.remove('show-keybinds');
      }
    });

    window.addEventListener('blur', () => {
      document.body.classList.remove('show-keybinds');
    });
  }

  return {
    init: init
  };
})();
