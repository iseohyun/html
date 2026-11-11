/**
 * @file modules/script.js
 * @version 20261110v3
 * @description 통합 진입점(Bootstrapper). 캐시 버스팅 버전(window.SiteVersion)을 정의하고,
 *   서브페이지 직접 접속을 SPA 해시 경로로 리다이렉트한 뒤 코어/UI/기능 모듈을 순서대로 로드·초기화한다.
 */

window.SiteVersion = "20261110v3";
(function() {
  const styleLink = document.querySelector('link[rel="stylesheet"][href^="/style.css"]');
  if (styleLink) {
    styleLink.href = "/style.css?v=" + window.SiteVersion;
  } else {
    const newStyleLink = document.createElement("link");
    newStyleLink.rel = "stylesheet";
    newStyleLink.href = "/style.css?v=" + window.SiteVersion;
    document.head.insertBefore(newStyleLink, document.head.firstChild);
  }
})();

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
    s.src = src + "?v=" + window.SiteVersion;
    s.async = false; // 브라우저 스크립트 실행 순서 보장
    s.onload = onScriptLoad;
    s.onerror = (err) => console.error(`[Bootstrapper] Failed to load script: ${src}`, err);
    document.head.appendChild(s);
  });
})();