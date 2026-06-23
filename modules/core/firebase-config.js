// modules/core/firebase-config.js
window.SiteModules = window.SiteModules || {};

window.SiteModules.FirebaseConfig = (function () {
  const config = {
    apiKey: "AIzaSyBu8rZQ_E_LKiGXu9jeIWn5FCPU7cWu734",
    authDomain: "iseohyun.firebaseapp.com",
    projectId: "iseohyun",
    storageBucket: "iseohyun.firebasestorage.app",
    messagingSenderId: "480884385518",
    appId: "1:480884385518:web:e624e46512c8c3834675ff",
    measurementId: "G-FP4D4V74P5"
  };

  let sdkLoadingPromise = null;

  function loadSDKs() {
    if (sdkLoadingPromise) return sdkLoadingPromise;

    sdkLoadingPromise = new Promise((resolve, reject) => {
      if (window.firebase && window.firebase.auth && window.firebase.firestore) {
        resolve();
        return;
      }

      const appScript = document.createElement("script");
      appScript.src = "https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js";
      appScript.onload = () => {
        const authScript = document.createElement("script");
        authScript.src = "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth-compat.js";
        authScript.onload = () => {
          const fsScript = document.createElement("script");
          fsScript.src = "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore-compat.js";
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
