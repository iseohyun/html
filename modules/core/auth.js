/**
 * @file modules/core/auth.js
 * @module SiteModules.Auth
 * @description 구글 · 카카오 · 네이버 로그인(Firebase Auth)과 관리자 판정.
 *   - 카카오 · 네이버: 작은 창에서 그 로그인 화면을 열고, /auth/{kakao|naver}-callback.html 이 돌려준 인가 코드를
 *     Cloud Function(kakaoLogin · naverLogin)에 보내 받은 Firebase 커스텀 토큰으로 로그인한다.
 *   - 로그인은 문의 창의 "로그인" 항목에서 한다. 관리자로 로그인하면 사이트맵의 "개발중" 문서가 보인다.
 *   - Firebase SDK 는 로그인을 누를 때, 또는 이 브라우저에서 로그인한 적이 있을 때만 불러온다
 *     (로그인하지 않는 방문자는 Firebase 를 내려받지 않는다).
 *   - 관리자 판정은 화면에서만 한다: 구글이 확인해 준 메일 주소의 SHA-256 값을 설정의 값과 견준다.
 *     이것은 "가리기"일 뿐 보호가 아니다. 개발 중인 문서의 파일은 공개 저장소에 그대로 있다.
 * @requires SiteModules.Config
 * @exports init, login, logout, ready, loadScript, isSignedIn, isProviderReady, isAdmin, onChange
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.Auth = (function () {
  // 이 브라우저에서 로그인한 적이 있다는 표시. 있으면 다음 방문 때 로그인 상태를 되살리려고 SDK 를 불러온다.
  const SIGNED_IN_HINT_KEY = "iseohyun_auth_hint_v1";
  // 앱 안의 브라우저(카카오톡 등)에서는 구글이 로그인을 막는다(카카오 로그인은 된다)
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

  function cancelledError(message) {
    const err = new Error(message);
    err.code = "auth/popup-closed-by-user";
    return err;
  }

  /** 로그인 창(콜백 페이지)이 돌려줄 인가 코드를 기다린다. 창을 닫으면 취소로 거절한다. */
  function waitForCode(popup, state, name) {
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = (fn, value) => {
        if (done) return;
        done = true;
        window.removeEventListener("message", onMessage);
        clearInterval(timer);
        fn(value);
      };
      const onMessage = (e) => {
        const data = e.data;
        if (e.origin !== window.location.origin || !data || data.type !== "oauth-callback") return;
        if (data.state !== state) return finish(reject, new Error("로그인 요청이 맞지 않습니다. 다시 시도해 주세요."));
        if (data.error) {
          return finish(reject, data.error === "access_denied" ? cancelledError(`${name} 로그인을 취소했습니다`) : new Error(`${name} 로그인이 거절되었습니다 (${data.error})`));
        }
        if (!data.code) return finish(reject, new Error(`${name} 로그인 창이 인가 코드를 주지 않았습니다`));
        finish(resolve, data.code);
      };
      // 코드를 받기 전에 창을 닫았으면 취소(창이 닫히며 보낸 메시지가 먼저 닿도록 조금 기다린다)
      const timer = setInterval(() => {
        if (popup.closed) setTimeout(() => finish(reject, cancelledError(`${name} 로그인 창을 닫았습니다`)), 500);
      }, 500);
      window.addEventListener("message", onMessage);
    });
  }

  /** 그 로그인을 지금 쓸 수 있는지. 카카오 · 네이버는 설정에 clientId 가 있어야 한다. */
  function isProviderReady(provider) {
    if (provider === "google") return true;
    const conf = window.SiteModules.Config[provider];
    return !!(conf && conf.clientId);
  }

  /**
   * 카카오 · 네이버 로그인. 팝업 차단을 피하려고 기다리는 일 없이 바로 창부터 연다.
   * 창이 돌려준 인가 코드를 Cloud Function(loginEndpoint)에 보내 받은 커스텀 토큰으로 Firebase 에 로그인한다.
   */
  async function loginWithOAuth(provider) {
    const conf = window.SiteModules.Config[provider];
    if (!isProviderReady(provider)) throw new Error(`${conf ? conf.name : provider} 로그인은 아직 준비 중입니다`);
    if (!conf.allowedOrigins.includes(window.location.origin)) {
      throw new Error(`이 주소(${window.location.origin})에서는 ${conf.name} 로그인을 쓸 수 없습니다. https://iseohyun.com 에서 해 주세요.`);
    }
    const redirectUri = window.location.origin + conf.callbackPath;
    const state = Array.from(window.crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join("");
    const url = `${conf.authorizeUrl}?${new URLSearchParams({ response_type: "code", client_id: conf.clientId, redirect_uri: redirectUri, state })}`;
    const popup = window.open(url, `${provider}-login`, "width=480,height=720");
    if (!popup) throw new Error(`팝업이 막혀 ${conf.name} 로그인 창을 열지 못했습니다. 이 사이트의 팝업을 허용해 주세요.`);

    const code = await waitForCode(popup, state, conf.name);
    let res;
    try {
      res = await fetch(conf.loginEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, state, redirectUri })
      });
    } catch (err) {
      throw new Error(`${conf.name} 로그인 서버에 연결하지 못했습니다`);
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.token) throw new Error(body.error || `${conf.name} 로그인 서버 오류 (${res.status})`);
    const auth = await loadSdk();
    await auth.signInWithCustomToken(body.token);
  }

  /**
   * 로그인 창을 띄운다. 실패하면 이유를 담아 거절한다.
   * @param {"google"|"kakao"|"naver"} [provider="google"]
   */
  async function login(provider = "google") {
    if (provider !== "google") return loginWithOAuth(provider);
    if (IN_APP_BROWSER_PATTERN.test(navigator.userAgent)) {
      throw new Error("앱 안의 브라우저에서는 구글 로그인이 막혀 있습니다. 기본 브라우저로 열어 주세요.");
    }
    const auth = await loadSdk();
    const googleProvider = new window.firebase.auth.GoogleAuthProvider();
    googleProvider.addScope("email");
    await auth.signInWithPopup(googleProvider);
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
    /** Firebase 앱과 로그인 SDK 를 불러와 auth 를 돌려준다(다른 Firebase SDK 를 더 불러올 때 먼저 부른다) */
    ready: loadSdk,
    loadScript: loadScript,
    isSignedIn: () => !!currentUser,
    isProviderReady: isProviderReady,
    isAdmin: () => isAdminUser,
    /** 로그인 상태나 관리자 여부가 바뀔 때마다 부른다 */
    onChange: (listener) => { listeners.push(listener); }
  };
})();
