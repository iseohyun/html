/**
 * auth-handler.js
 * 사용자 인증 및 로그인 상태 관리
 */
import { auth } from './firebase-config.js';
const provider = new firebase.auth.GoogleAuthProvider();

// 로그인 버튼 이벤트 바인딩 (index.html에 버튼 추가 필요 시 사용)
const login = async () => {
  const ua = navigator.userAgent.toLowerCase();
  const isKakao = ua.indexOf('kakao') > -1;
  const isInstagram = ua.indexOf('instagram') > -1;
  const isLine = ua.indexOf('line') > -1;

  // 1. 인앱 브라우저 감지 및 외부 브라우저 강제 유도 (구글 로그인 정책 대응)
  if (isKakao || isInstagram || isLine) {
    const currentUrl = window.location.href;

    if (ua.indexOf('android') > -1) {
      // 안드로이드: 크롬 강제 실행 Intent 스킴 사용
      const urlNoProtocol = currentUrl.replace(/https?:\/\//, '');
      location.href = `intent://${urlNoProtocol}#Intent;scheme=https;package=com.android.chrome;end`;
      return;
    } else if (isKakao) {
      // iOS 카카오톡: 카카오톡 전용 외부 브라우저 호출 스킴 사용
      location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(currentUrl);
      return;
    } else {
      // 기타 iOS(인스타그램 등): 강제 전환 스킴이 제한적이므로 가이드 팝업 출력
      alert("보안을 위해 인앱 브라우저에서는 구글 로그인이 차단됩니다.\n\n우측 상단 버튼을 눌러 'Safari로 열기' 또는 '기본 브라우저로 열기'를 선택해 주세요.");
      return;
    }
  }

  try {
    await auth.signInWithPopup(provider);
  } catch (error) {
    // 팝업이 차단된 일반 모바일 브라우저(사파리 등) 대응을 위한 리다이렉트 방식 전환
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
      auth.signInWithRedirect(provider);
    } else {
      console.error("Login Error:", error.message);
    }
  }
};
window.login = login;

// 로그아웃
const logout = () => auth.signOut();

// 사용자 전환 함수
const switchUser = async () => {
  if (confirm("사용자를 전환하시겠습니까?")) {
    try {
      await auth.signOut();
      await login();
    } catch (error) {
      console.error("Switch User Error:", error.message);
    }
  }
};
window.switchUser = switchUser; // 전역에서 접근 가능하도록 설정

// Firebase 인증 상태 감시
auth.onAuthStateChanged(async (user) => {
  const statusText = document.getElementById('user-info');
  const authStatus = document.getElementById('auth-status');

  if (user) {
    const cleanName = user.displayName ? user.displayName.replace(/\s*\(.*\)/, "").trim() : "User";

    const template = document.getElementById('user-profile-template');
    const clone = template.content.cloneNode(true);

    clone.querySelector('.profile-name').innerText = cleanName;

    statusText.innerHTML = '';
    statusText.appendChild(clone);

    authStatus.innerText = "Firebase Synced";
    if (typeof initUser === 'function') {
      await initUser(user.uid);
    }

  } else {
    statusText.innerHTML = `<button class="login-btn" onclick="login()">Google Login</button>`;
    authStatus.innerText = "Login to sync with Firebase";

    if (typeof initUser === 'function') {
      initUser(null);
    }
  }
});