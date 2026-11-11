/**
 * @file modules/core/auth-handler.js
 * @module SiteModules.Auth
 * @description 구글(팝업)·네이버·카카오(OAuth 코드 → 커스텀 토큰) 로그인, 게스트 ID 발급,
 *   건의사항(suggestions 컬렉션) 저장/조회.
 * @requires SiteModules.FirebaseConfig
 * @exports getOrCreateGuestId, handleRedirectCallback, googleLogin, naverLogin, kakaoLogin,
 *   logoutUser, submitSuggestion, getUserSuggestion
 */
window.SiteModules = window.SiteModules || {};

window.SiteModules.Auth = (function() {
  let isLoginProcessing = false;
  const OAUTH_STATE_KEY = 'oauth_state';

  // 로그인 시작 시 추측 불가능한 state를 발급·보관 (콜백에서 대조)
  function issueOAuthState() {
    const state = generateSecureToken();
    sessionStorage.setItem(OAUTH_STATE_KEY, state);
    return state;
  }

  // 게스트 문서 ID는 접근 권한 역할을 하므로 추측 불가능한 암호학적 난수(128bit)로 생성합니다.
  function generateSecureToken() {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }

  function getOrCreateGuestId() {
    let guestId = localStorage.getItem('GUEST_ID');
    if (!guestId) {
      guestId = 'GUEST_' + generateSecureToken();
      localStorage.setItem('GUEST_ID', guestId);
    }
    return guestId;
  }

  function handleRedirectCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');
    const loginProvider = localStorage.getItem('login_provider');

    if (authCode && loginProvider) {
      // OAuth CSRF 방어: 로그인 시작 시 저장한 state와 콜백의 state가 일치해야만 토큰 교환 진행
      const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);
      sessionStorage.removeItem(OAUTH_STATE_KEY);
      if (!expectedState || urlParams.get('state') !== expectedState) {
        console.error("[Auth] OAuth state 불일치로 로그인 콜백을 거부했습니다.");
        localStorage.removeItem('login_provider');
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
        alert("로그인 요청을 확인할 수 없습니다. 다시 시도해 주세요.");
        return;
      }

      window.SiteModules.FirebaseConfig.loadSDKs().catch(err => {
        console.error("[Auth] Firebase SDK 로딩 실패:", err);
        localStorage.removeItem('login_provider');
        alert("로그인 처리 중 오류 발생");
        throw err;
      }).then(() => {
        // 즉시 주소창에서 query parameter 지우기 (해시 보존)
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);

        let endpoint = 'https://naverlogin-kw55rtsoba-uc.a.run.app';
        let requestBody = { code: authCode };

        if (loginProvider === 'kakao') {
          endpoint = 'https://kakaologin-kw55rtsoba-uc.a.run.app';
          requestBody.redirectUri = window.location.origin + "/";
        }

        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
        .then(res => res.json())
        .then(data => {
          if (data.firebaseToken) {
            const auth = window.SiteModules.FirebaseConfig.getAuth();
            if (auth) {
              auth.signInWithCustomToken(data.firebaseToken)
                .then(() => {
                  alert((loginProvider === 'kakao' ? '카카오' : '네이버') + " 로그인 성공!");
                });
            }
          } else {
            console.error(data);
            alert("로그인 토큰 교환 실패");
          }
        })
        .catch(err => {
          console.error(err);
          alert("로그인 처리 중 오류 발생");
        })
        .finally(() => {
          localStorage.removeItem('login_provider');
        });
      });
    }
  }

  function googleLogin(onSuccess) {
    if (isLoginProcessing) return;
    isLoginProcessing = true;

    const ua = navigator.userAgent.toLowerCase();
    const isKakao = ua.indexOf('kakao') > -1;
    const isInstagram = ua.indexOf('instagram') > -1;
    const isLine = ua.indexOf('line') > -1;

    // 인앱 브라우저 감지 및 우회
    if (isKakao || isInstagram || isLine) {
      const currentUrl = window.location.href;
      if (ua.indexOf('android') > -1) {
        const urlNoProtocol = currentUrl.replace(/https?:\/\//, '');
        location.href = `intent://${urlNoProtocol}#Intent;scheme=https;package=com.android.chrome;end`;
        isLoginProcessing = false;
        return;
      } else if (isKakao) {
        location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(currentUrl);
        isLoginProcessing = false;
        return;
      } else {
        alert("보안을 위해 인앱 브라우저에서는 구글 로그인이 차단됩니다.\n\n우측 상단 버튼을 눌러 'Safari로 열기' 또는 '기본 브라우저로 열기'를 선택해 주세요.");
        isLoginProcessing = false;
        return;
      }
    }

    window.SiteModules.FirebaseConfig.loadSDKs().then(() => {
      const auth = window.SiteModules.FirebaseConfig.getAuth();
      if (!auth) {
        isLoginProcessing = false;
        return;
      }

      const provider = new window.firebase.auth.GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');

      auth.signInWithPopup(provider)
        .then((result) => {
          if (onSuccess) onSuccess(result.user);
        })
        .catch((error) => {
          if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
            auth.signInWithRedirect(provider);
          } else {
            console.error(error);
            alert("구글 로그인 실패: " + error.message);
          }
        })
        .finally(() => {
          isLoginProcessing = false;
        });
    });
  }

  function naverLogin() {
    if (isLoginProcessing) return;
    isLoginProcessing = true;

    localStorage.setItem('login_provider', 'naver');
    const redirectUri = window.location.origin + "/";
    const clientId = "hemXaBshyStfBhmNg05m";
    const state = issueOAuthState();
    const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    window.location.href = naverAuthUrl;
  }

  function kakaoLogin() {
    if (isLoginProcessing) return;
    isLoginProcessing = true;

    localStorage.setItem('login_provider', 'kakao');
    const redirectUri = window.location.origin + "/";
    const clientId = "af28f94aa8260ab663fd27dffea1ee77";
    const state = issueOAuthState();
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    window.location.href = kakaoAuthUrl;
  }

  function logoutUser(onSuccess) {
    if (confirm("로그아웃 하시겠습니까? 게스트 모드로 전환됩니다.")) {
      window.SiteModules.FirebaseConfig.loadSDKs().then(() => {
        const auth = window.SiteModules.FirebaseConfig.getAuth();
        if (auth) {
          auth.signOut()
            .then(() => {
              if (onSuccess) onSuccess();
            })
            .catch((err) => console.error("로그아웃 오류:", err));
        }
      });
    }
  }

  function getNormalizedPageKey() {
    let hashPath = window.location.hash.split('?')[0] || ""; // "#/small-project/Bezier/index.html"
    if (hashPath.startsWith('#/')) {
      hashPath = hashPath.substring(2); // "small-project/Bezier/index.html"
    }

    const parts = hashPath.split('/');
    if (parts[0] === "small-project" && parts.length >= 2) {
      return `@small-project>${parts[1]}`;
    }

    return hashPath || "home";
  }

  async function submitSuggestion(text) {
    await window.SiteModules.FirebaseConfig.loadSDKs();
    const auth = window.SiteModules.FirebaseConfig.getAuth();
    const db = window.SiteModules.FirebaseConfig.getDb();
    if (!db) return;

    let uid = "";
    let displayName = "게스트";
    let email = "";

    if (auth && auth.currentUser) {
      uid = auth.currentUser.uid;
      displayName = auth.currentUser.displayName || "이름 없음";
      email = auth.currentUser.email || "";
    } else {
      uid = getOrCreateGuestId();
      displayName = uid;
    }

    const docRef = db.collection('suggestions').doc(uid);
    const docSnap = await docRef.get();
    const existingData = docSnap.exists ? docSnap.data() : {};

    const pageKey = getNormalizedPageKey();

    const suggestionHistory = existingData.suggestionHistory || [];
    suggestionHistory.push({
      text: text,
      page: pageKey,
      timestamp: Date.now()
    });

    await docRef.set({
      uid: uid,
      name: displayName,
      email: email,
      suggestion: text,
      page: pageKey,
      suggestionHistory: suggestionHistory,
      reply: existingData.reply || "",
      updatedAt: Date.now()
    }, { merge: true });
  }

  async function getUserSuggestion() {
    await window.SiteModules.FirebaseConfig.loadSDKs();
    const auth = window.SiteModules.FirebaseConfig.getAuth();
    const db = window.SiteModules.FirebaseConfig.getDb();
    if (!db) return null;

    let uid = "";
    if (auth && auth.currentUser) {
      uid = auth.currentUser.uid;
    } else {
      uid = getOrCreateGuestId();
    }

    const docRef = db.collection('suggestions').doc(uid);
    const docSnap = await docRef.get();
    return docSnap.exists ? docSnap.data() : null;
  }
  return {
    getOrCreateGuestId: getOrCreateGuestId,
    handleRedirectCallback: handleRedirectCallback,
    googleLogin: googleLogin,
    naverLogin: naverLogin,
    kakaoLogin: kakaoLogin,
    logoutUser: logoutUser,
    submitSuggestion: submitSuggestion,
    getUserSuggestion: getUserSuggestion
  };
})();
