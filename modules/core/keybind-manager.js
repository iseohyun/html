// modules/core/keybind-manager.js
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

      // 숫자 키 1~5 탭 클릭 에뮬레이션
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
