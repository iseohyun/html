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

// 인증 상태 감시 (핵심 로직)
auth.onAuthStateChanged((user) => {
  const statusText = document.getElementById('user-info');
  const authStatus = document.getElementById('auth-status');

  if (user) {
    // 로그인 성공 시
    // 이름 뒤의 괄호와 별명 제거 (예: "홍길동 (길동이)" -> "홍길동")
    const cleanName = user.displayName ? user.displayName.replace(/\s*\(.*\)/, "").trim() : "User";
    statusText.innerHTML = `<span onclick="toggleSettings()" style="cursor:pointer; text-decoration:underline; font-weight:bold;">${cleanName}님</span> <span onclick="switchUser()" style="cursor:pointer; margin-left:5px; font-size:0.9rem;" title="사용자 전환">🔄</span>`;
    authStatus.innerText = "Firebase Synced";

    // [중요] 사용자의 고유 UID를 DB 핸들러에 전달
    // dbHandler.initUser(user.uid); 

    // 엔진 시작
    // engine.start(user.uid);
  } else {
    // 로그아웃 상태
    statusText.innerHTML = `<button class="login-btn" onclick="login()">Google Login</button>`;
    authStatus.innerText = "Guest Mode (Sync disabled)";
  }
});