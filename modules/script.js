// modules/script.js
// Version: 20260719v1
// 하위 호환성을 유지하기 위한 통합 진입점(Bootstrapper) 스크립트입니다.
// 핵심 모듈들을 비동기로 로드하고 어플리케이션을 초기화합니다.

window.SiteVersion = "20260719v1";

(function() {
  // SPA 리다이렉트 처리: index.html이 아닌 개별 서브페이지로 직접 접속 시 홈(SPA 숙주)의 해시 경로로 강제 전환시킵니다.
  const path = window.location.pathname;
  if (path !== "/" && path !== "/index.html" && !path.endsWith("/index.html") && path.endsWith(".html")) {
    window.location.replace("/#" + path + window.location.search + window.location.hash);
    return;
  }

  const scripts = [
    '/modules/core/firebase-config.js',
    '/modules/core/auth-handler.js',
    '/modules/core/keybind-manager.js',
    '/modules/core/navigation.js',
    '/modules/core/toc.js',
    '/modules/core/document.js',
    '/modules/ui/clipboard.js',
    '/modules/ui/quiz.js',
    '/modules/ui/code-loader.js',
    '/modules/features/site-history.js'
  ];

  let loadedCount = 0;
  
  function onScriptLoad() {
    loadedCount++;
    if (loadedCount === scripts.length) {
      // 모든 모듈 스크립트 로드 완료 시 초기화 실행
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
      } else {
        initApp();
      }
    }
  }

  function initApp() {
    // 순차적으로 모듈 초기화 수행
    if (window.SiteModules) {
      if (window.SiteModules.FirebaseConfig) window.SiteModules.FirebaseConfig.initialize();
      if (window.SiteModules.Auth) window.SiteModules.Auth.handleRedirectCallback();
      if (window.SiteModules.KeybindManager) window.SiteModules.KeybindManager.init();
      if (window.SiteModules.Navigation) window.SiteModules.Navigation.init();
      if (window.SiteModules.TOC) window.SiteModules.TOC.init();
      if (window.SiteModules.Document) window.SiteModules.Document.init();
      if (window.SiteModules.CodeLoader) window.SiteModules.CodeLoader.init();
      if (window.SiteModules.Clipboard) window.SiteModules.Clipboard.init();
      if (window.SiteModules.Quiz) window.SiteModules.Quiz.init();
    }
  }

  // 각 모듈 동적 로드
  scripts.forEach(src => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false; // 브라우저 스크립트 실행 순서 보장
    s.onload = onScriptLoad;
    s.onerror = (err) => console.error(`[Bootstrapper] Failed to load script: ${src}`, err);
    document.head.appendChild(s);
  });
})();