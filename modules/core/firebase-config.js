/**
 * @file modules/core/firebase-config.js
 * @module SiteModules.FirebaseConfig
 * @description Firebase 프로젝트 설정 보관 및 compat SDK(app/auth/firestore) 지연 로드·초기화.
 * @requires SiteModules.Config
 * @exports config, loadSDKs, initialize, getAuth, getDb
 */
window.SiteModules = window.SiteModules || {};

window.SiteModules.FirebaseConfig = (function () {
  const config = window.SiteModules.Config.firebase;
  const SDK_BASE_URL = "https://www.gstatic.com/firebasejs/" + window.SiteModules.Config.firebaseSdkVersion;

  let sdkLoadingPromise = null;

  function loadSDKs() {
    if (sdkLoadingPromise) return sdkLoadingPromise;

    sdkLoadingPromise = new Promise((resolve, reject) => {
      if (window.firebase && window.firebase.auth && window.firebase.firestore) {
        resolve();
        return;
      }

      const appScript = document.createElement("script");
      appScript.src = SDK_BASE_URL + "/firebase-app-compat.js";
      appScript.onload = () => {
        const authScript = document.createElement("script");
        authScript.src = SDK_BASE_URL + "/firebase-auth-compat.js";
        authScript.onload = () => {
          const fsScript = document.createElement("script");
          fsScript.src = SDK_BASE_URL + "/firebase-firestore-compat.js";
          fsScript.onload = () => {
            window.firebase.initializeApp(config);
            resolve();
          };
          fsScript.onerror = reject;
          document.head.appendChild(fsScript);
        };
        authScript.onerror = reject;
        document.head.appendChild(authScript);
      };
      appScript.onerror = reject;
      document.head.appendChild(appScript);
    });

    return sdkLoadingPromise;
  }

  function initialize() {
    loadSDKs().catch(err => console.error("Firebase SDK 로딩 실패:", err));
  }

  return {
    config: config,
    loadSDKs: loadSDKs,
    initialize: initialize,
    getAuth: function () {
      return window.firebase ? window.firebase.auth() : null;
    },
    getDb: function () {
      return window.firebase ? window.firebase.firestore() : null;
    }
  };
})();
