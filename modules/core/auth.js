/**
 * @file modules/core/auth.js
 * @module SiteModules.Auth
 * @description 구글 로그인(Firebase Auth)과 관리자 판정.
 *   - 로그인은 문의 창의 "로그인" 항목에서 한다. 관리자로 로그인하면 사이트맵의 "개발중" 문서가 보인다.
 *   - Firebase SDK 는 로그인을 누를 때, 또는 이 브라우저에서 로그인한 적이 있을 때만 불러온다
 *     (로그인하지 않는 방문자는 Firebase 를 내려받지 않는다).
 *   - 관리자 판정은 화면에서만 한다: 구글이 확인해 준 메일 주소의 SHA-256 값을 설정의 값과 견준다.
 *     이것은 "가리기"일 뿐 보호가 아니다. 개발 중인 문서의 파일은 공개 저장소에 그대로 있다.
 * @requires SiteModules.Config
 * @exports init, login, logout, isSignedIn, isAdmin, onChange
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.Auth = (function () {
  // 이 브라우저에서 로그인한 적이 있다는 표시. 있으면 다음 방문 때 로그인 상태를 되살리려고 SDK 를 불러온다.
  const SIGNED_IN_HINT_KEY = "iseohyun_auth_hint_v1";
  // 앱 안의 브라우저(카카오톡 등)에서는 구글이 로그인을 막는다
  const IN_APP_BROWSER_PATTERN = /kakaotalk|instagram|line\//i;

  let sdkPromise = null;
  let currentUser = null;
  let isAdminUser = false;
  let stateVersion = 0;
  const listeners = [];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`스크립트를 불러오지 못했습니다: ${src}`));
      document.head.appendChild(script);
    });
  }

  function loadSdk() {
    if (!sdkPromise) {
      const config = window.SiteModules.Config;
      const base = `https://www.gstatic.com/firebasejs/${config.firebaseSdkVersion}`;
      sdkPromise = loadScript(`${base}/firebase-app-compat.js`)
        .then(() => loadScript(`${base}/firebase-auth-compat.js`))
        .then(() => {
          if (!window.firebase.apps.length) window.firebase.initializeApp(config.firebase);
          const auth = window.firebase.auth();
          auth.onAuthStateChanged(handleUserChange);
          return auth;
        })
        .catch(err => {
          sdkPromise = null; // 다음에 다시 시도할 수 있게
          throw err;
        });
    }
    return sdkPromise;
  }

  async function sha256Hex(text) {
    const bytes = new TextEncoder().encode(text);
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  }

  // 구글이 확인해 준 메일 주소만 믿는다
  async function checkAdmin(user) {
    if (!user || !user.email || !user.emailVerified) return false;
    const hash = await sha256Hex(user.email.trim().toLowerCase());
    return window.SiteModules.Config.admin.emailHashes.includes(hash);
  }

  async function handleUserChange(user) {
    const version = ++stateVersion;
    let nextIsAdmin = false;
    try {
      nextIsAdmin = await checkAdmin(user);
    } catch (err) {
      console.error("[Auth] 관리자 확인 실패:", err);
    }
    if (version !== stateVersion) return; // 그 사이 상태가 또 바뀌었다

    currentUser = user || null;
    isAdminUser = nextIsAdmin;
    try {
      if (currentUser) localStorage.setItem(SIGNED_IN_HINT_KEY, "1");
      else localStorage.removeItem(SIGNED_IN_HINT_KEY);
    } catch (err) {
      console.warn("[Auth] 로그인 표시를 저장하지 못했습니다:", err);
    }
    listeners.forEach(listener => {
      try { listener(); } catch (err) { console.error("[Auth] 상태 변경 처리 실패:", err); }
    });
  }

  /** 구글 로그인 창을 띄운다. 실패하면 이유를 담아 거절한다. */
  async function login() {
    if (IN_APP_BROWSER_PATTERN.test(navigator.userAgent)) {
      throw new Error("앱 안의 브라우저에서는 구글 로그인이 막혀 있습니다. 기본 브라우저로 열어 주세요.");
    }
    const auth = await loadSdk();
    const provider = new window.firebase.auth.GoogleAuthProvider();
    provider.addScope("email");
    await auth.signInWithPopup(provider);
  }

  async function logout() {
    const auth = await loadSdk();
    await auth.signOut();
  }

  /** 이 브라우저에서 로그인한 적이 있으면 로그인 상태를 되살린다. */
  function init() {
    let hasHint = false;
    try {
      hasHint = localStorage.getItem(SIGNED_IN_HINT_KEY) === "1";
    } catch (err) {
      console.warn("[Auth] 로그인 표시를 읽지 못했습니다:", err);
    }
    if (hasHint) loadSdk().catch(err => console.error("[Auth] 로그인 상태를 되살리지 못했습니다:", err));
  }

  return {
    init: init,
    login: login,
    logout: logout,
    isSignedIn: () => !!currentUser,
    isAdmin: () => isAdminUser,
    /** 로그인 상태나 관리자 여부가 바뀔 때마다 부른다 */
    onChange: (listener) => { listeners.push(listener); }
  };
})();
