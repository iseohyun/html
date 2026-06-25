// modules/core/auth-handler.js
window.SiteModules = window.SiteModules || {};

window.SiteModules.Auth = (function() {
  let isLoginProcessing = false;

  function getOrCreateGuestId() {
    let guestId = localStorage.getItem('GUEST_ID');
    if (!guestId) {
      guestId = 'GUEST_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('GUEST_ID', guestId);
    }
    return guestId;
  }

  function handleRedirectCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');
    const loginProvider = localStorage.getItem('login_provider');

    if (authCode && loginProvider) {
      window.SiteModules.FirebaseConfig.loadSDKs().then(() => {
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
    const state = Math.random().toString(36).substr(2, 11);
    const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    window.location.href = naverAuthUrl;
  }

  function kakaoLogin() {
    if (isLoginProcessing) return;
    isLoginProcessing = true;

    localStorage.setItem('login_provider', 'kakao');
    const redirectUri = window.location.origin + "/";
    const clientId = "af28f94aa8260ab663fd27dffea1ee77";
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;

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

    const suggestionHistory = existingData.suggestionHistory || [];
    suggestionHistory.push({
      text: text,
      timestamp: Date.now()
    });

    await docRef.set({
      uid: uid,
      name: displayName,
      email: email,
      suggestion: text,
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

  function getLocalDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  }

  function getDayKey(timestamp) {
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  function mergeHistory(local, server, deletedKeys) {
    const combined = [...local, ...server];
    const groups = {};
    combined.forEach(item => {
      const ts = item.timestamp || Date.now();
      const dayKey = getDayKey(ts);
      const key = `${item.url}_${dayKey}`;
      
      // Filter out deleted keys
      if (deletedKeys.includes(key)) {
        return;
      }
      
      if (!groups[key] || groups[key].timestamp < ts) {
        groups[key] = {
          title: item.title,
          url: item.url,
          category: item.category || "",
          timestamp: ts
        };
      }
    });
    const merged = Object.values(groups);
    merged.sort((a, b) => b.timestamp - a.timestamp);
    return merged;
  }

  async function syncHistory(user) {
    await window.SiteModules.FirebaseConfig.loadSDKs();
    const db = window.SiteModules.FirebaseConfig.getDb();
    if (!db) return;

    let activeUser = user;
    if (!activeUser) {
      const auth = window.SiteModules.FirebaseConfig.getAuth();
      activeUser = auth ? auth.currentUser : null;
    }

    let uid = "";
    if (activeUser) {
      uid = activeUser.uid;
    } else {
      uid = getOrCreateGuestId();
    }

    const todayStr = getLocalDateString();
    const syncKey = 'last_sync_date_' + uid;
    const lastSyncDate = localStorage.getItem(syncKey);

    // 2-5. 방문기록에 대하여 서버에 읽고 쓰기는 하루에 단 1회만 일어날 수 있다.
    if (lastSyncDate === todayStr) {
      console.log(`[History] Already synced today for user ${uid}. Skipping server sync.`);
      return;
    }

    console.log(`[History] Starting server sync for user ${uid}...`);

    try {
      const docRef = db.collection('visits').doc(uid);
      const docSnap = await docRef.get();
      const serverData = docSnap.exists ? docSnap.data() : {};
      const serverHistory = serverData.history || [];

      // Load local history
      let localHistory = [];
      try {
        localHistory = JSON.parse(localStorage.getItem("site_recent_visits") || "[]");
      } catch (e) {
        localHistory = [];
      }

      // Load deleted keys from buffer
      let deletedKeys = [];
      try {
        deletedKeys = JSON.parse(localStorage.getItem("site_recent_visits_deleted") || "[]");
      } catch (e) {
        deletedKeys = [];
      }

      // Merge and apply exclusions/deduplication
      const merged = mergeHistory(localHistory, serverHistory, deletedKeys);

      // Save merged to local storage
      localStorage.setItem("site_recent_visits", JSON.stringify(merged));
      
      // Clear deleted keys buffer since they are now synced and applied
      localStorage.removeItem("site_recent_visits_deleted");

      // Trigger UI render
      if (window.SiteModules.Navigation && typeof window.SiteModules.Navigation.renderRecentVisits === 'function') {
        window.SiteModules.Navigation.renderRecentVisits();
      }

      // 2-4. 과거 이력을 읽어온 것에서, 브라우저에 더 기록된 내용이 있다면 서버에 기록한다.(쓰기)
      // Check if merged is different from serverHistory
      const hasNewContent = JSON.stringify(merged) !== JSON.stringify(serverHistory);
      if (hasNewContent) {
        console.log(`[History] Browser has more/newer records. Writing to server...`);
        await docRef.set({
          uid: uid,
          history: merged,
          updatedAt: Date.now()
        }, { merge: true });
      } else {
        console.log(`[History] No new content to write to server.`);
      }

      // Mark as synced for today
      localStorage.setItem(syncKey, todayStr);
      console.log(`[History] Sync complete for today.`);
    } catch (err) {
      console.error("[History] Sync failed:", err);
    }
  }

  return {
    getOrCreateGuestId: getOrCreateGuestId,
    handleRedirectCallback: handleRedirectCallback,
    googleLogin: googleLogin,
    naverLogin: naverLogin,
    kakaoLogin: kakaoLogin,
    logoutUser: logoutUser,
    submitSuggestion: submitSuggestion,
    getUserSuggestion: getUserSuggestion,
    syncHistory: syncHistory
  };
})();
