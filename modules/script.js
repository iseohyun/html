/**
 * @file modules/script.js
 * @version 20261121v6
 * @description 통합 진입점(Bootstrapper). 캐시 버스팅 버전(window.SiteVersion)을 정의하고,
 *   서브페이지 직접 접속을 SPA 해시 경로로 리다이렉트한 뒤 코어/UI/기능 모듈을 순서대로 로드·초기화한다.
 */

window.SiteVersion = "20261121v6";
// 전체 설정의 저장 키. 끝의 판 번호는 저장 모양이 바뀌면 올린다. (modules/core/settings.js 가 같은 키를 쓴다)
window.SiteSettingsStorageKey = "iseohyun_settings_v1";
// 「UniPalette」 테마가 계산해 둔 토큰 값. (modules/features/unipalette-theme.js 가 같은 키를 쓴다)
window.SiteCustomSkinKey = "iseohyun_custom_skin_v1";
// 전체 설정의 「하이라이트」·「인터페이스」를 강제할 때 계산해 둔 토큰 값. (modules/core/settings.js 가 같은 키를 쓴다)
window.SiteAccentTokensKey = "iseohyun_accent_tokens_v1";
(function() {
  // 저장해 둔 테마와 글자 크기를 화면이 그려지기 전에 먼저 적용한다 (깜빡임 방지).
  // 값의 검증과 그 밖의 처리는 settings.js 가 로드된 뒤 다시 한다.
  try {
    const saved = JSON.parse(localStorage.getItem(window.SiteSettingsStorageKey) || "{}");
    let skin = saved.theme || "system";
    if (skin === "system") {
      skin = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    if (skin === "custom") {
      const custom = JSON.parse(localStorage.getItem(window.SiteCustomSkinKey) || "null");
      if (custom && custom.tokens) {
        Object.keys(custom.tokens).forEach(name => {
          if (/^--[a-z-]+$/.test(name) && /^#[0-9A-F]{6}$/i.test(custom.tokens[name])) {
            document.documentElement.style.setProperty(name, custom.tokens[name]);
          }
        });
        if (custom.dark === true) document.documentElement.setAttribute("data-skin", "dark");
      }
    }
    if (["dark", "gray", "navy"].includes(skin)) document.documentElement.setAttribute("data-skin", skin);
    // 하이라이트·인터페이스: 테마 뒤에 덮어쓴다 (선택 면과 켜진 메뉴 글자만 허용)
    const accent = JSON.parse(localStorage.getItem(window.SiteAccentTokensKey) || "null");
    if (accent) {
      ["--active", "--sidebar-active-color"].forEach(name => {
        if (/^#[0-9A-F]{6}$/i.test(accent[name])) document.documentElement.style.setProperty(name, accent[name]);
      });
    }
    if (["0.9", "1", "1.1", "1.25"].includes(saved.fontScale)) document.documentElement.style.setProperty("--font-scale", saved.fontScale);
  } catch (err) {
    console.warn("[Bootstrapper] 저장된 설정을 읽지 못했습니다:", err);
  }
})();

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
    '/modules/core/diagnostics.js',
    '/modules/core/site-config.js',
    '/modules/core/auth.js',
    '/modules/core/color-math.js',
    '/modules/features/unipalette-theme.js',
    '/modules/core/settings.js',
    '/modules/core/keybind-manager.js',
    '/modules/core/icons.js',
    '/modules/core/header.js',
    '/modules/core/hierarchy.js',
    '/modules/core/search.js',
    '/modules/features/contact-push.js',
    '/modules/features/contact-chat.js',
    '/modules/features/contact-window.js',
    '/modules/features/contact.js',
    '/modules/ui/markdown.js',
    '/modules/core/navigation.js',
    '/modules/core/toc.js',
    '/modules/core/document.js',
    '/modules/ui/clipboard.js',
    '/modules/ui/quiz.js',
    '/modules/ui/code-loader.js',
    '/modules/features/site-history.js',
    '/modules/features/update-check.js'
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
      if (window.SiteModules.KeybindManager) window.SiteModules.KeybindManager.init();
      if (window.SiteModules.Navigation) window.SiteModules.Navigation.init();
      if (window.SiteModules.TOC) window.SiteModules.TOC.init();
      if (window.SiteModules.Document) window.SiteModules.Document.init();
      if (window.SiteModules.CodeLoader) window.SiteModules.CodeLoader.init();
      if (window.SiteModules.Clipboard) window.SiteModules.Clipboard.init();
      if (window.SiteModules.Quiz) window.SiteModules.Quiz.init();
      if (window.SiteModules.UpdateCheck) window.SiteModules.UpdateCheck.init();
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