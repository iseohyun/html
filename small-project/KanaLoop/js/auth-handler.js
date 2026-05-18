/**
 * auth-handler.js
 * 사용자 인증 및 로그인 상태 관리
 */

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

// 볼륨 테스트 기능
const playVolumeTest = () => {
  const btn = document.getElementById('volume-test-btn');
  if (!btn || btn.classList.contains('vol-playing')) return;

  const originalHTML = btn.innerHTML;
  const utterance = new SpeechSynthesisUtterance("ボリュームテスト");
  utterance.lang = 'ja-JP';
  utterance.rate = 0.9;

  utterance.onstart = () => {
    btn.innerHTML = '🔊';
    btn.classList.add('vol-playing');
  };
  utterance.onend = () => {
    btn.innerHTML = originalHTML;
    btn.classList.remove('vol-playing');
  };
  window.speechSynthesis.speak(utterance);
};
window.playVolumeTest = playVolumeTest;

// 애니메이션 스타일 주입
const volStyle = document.createElement('style');
volStyle.textContent = `
  @keyframes pulse-red { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }
  .vol-playing { animation: pulse-red 0.8s infinite; color: #e62224; display: inline-block; font-weight: bold; }
`;
document.head.appendChild(volStyle);

// 인증 상태 감시 (핵심 로직)
auth.onAuthStateChanged((user) => {
  const statusText = document.getElementById('user-info');
  const authStatus = document.getElementById('auth-status');

  if (user) {
    const cleanName = user.displayName ? user.displayName.replace(/\s*\(.*\)/, "").trim() : "User";
    
    statusText.style.display = 'flex';
    statusText.style.justifyContent = 'space-between';
    statusText.style.width = '100%';
    statusText.style.alignItems = 'center';
    
    statusText.innerHTML = `
      <div>
        <span onclick="toggleSettings()" style="cursor:pointer; text-decoration:underline; font-weight:bold;">${cleanName}님</span>
        <span onclick="switchUser()" style="cursor:pointer; margin-left:5px; font-size:0.9rem;" title="사용자 전환">🔄</span>
      </div>
      <div style="display: flex; gap: 15px; align-items: center;">
        <span id="volume-test-btn" onclick="playVolumeTest()" style="cursor:pointer; font-weight: bold; color: #4a90e2; font-size: 0.85rem;">볼륨 테스트</span>
        <span onclick="window.open('help.html', '_blank')" style="cursor:pointer; font-size: 1.1rem;" title="도움말">❓</span>
      </div>
    `;
    authStatus.innerText = "Firebase Synced";
  } else {
    // 로그아웃 상태
    statusText.innerHTML = `<button class="login-btn" onclick="login()">Google Login</button>`;
    authStatus.innerText = "Guest Mode (Sync disabled)";
  }
});