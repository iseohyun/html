/**
 * auth-handler.js
 * 사용자 인증 및 로그인 상태 관리
 */

const provider = new firebase.auth.GoogleAuthProvider();

// 로그인 버튼 이벤트 바인딩 (index.html에 버튼 추가 필요 시 사용)
const login = async () => {
  try {
    const result = await auth.signInWithPopup(provider);
    console.log("Logged in:", result.user.displayName);
  } catch (error) {
    console.error("Login Error:", error.message);
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