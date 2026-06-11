/**
 * main.js
 * 모든 모듈을 유기적으로 결합하고 세션 흐름을 제어하는 핵심 컨트롤러
*/
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import {
  userConfig,
  TIME_STEPS,
  SPEECH_STEPS
} from './components/store.js';
import {
  initAudioEngine,
  playSoundTest,
  playTargetVoice,
  preloadSessionVoices
} from './components/audio-manager.js';
import { db } from './components/firebase-config.js';
import { auth } from './components/firebase-config.js';
import {
  initUser,
  getAllProgress,
  updateProgress,
  saveSessionPoolState,
  updateDailyStudyTime,
  updateDailyStats,
  getUserConfig,
  saveUserConfig
} from './components/db-handler.js';
import {
  initSessionPool,
  generateFourOptions,
  calculateReviewState,
  ALPHABETS,
  INTERVALS
} from './components/engine.js';
import {
  getStandardCharCount,
  refreshPersonalizedSettings,
  renderStudyStatsChart,
  renderResponseTimeChart,
  renderProgressTable,
  getStageColor,
  toggleAnalysisMode
} from './components/ui-modal-handler.js';
import {
  requestNotificationPermission,
  scheduleReviewNotification
} from './components/notification-handler.js';

import settingTemplate from './view/setting.html?raw';
import progressTemplate from './view/progress.html?raw';
import sessionBoardTemplate from './view/leaderboard.html?raw';
import loginTemplate from './view/login.html?raw';

let isLoginProcessing = false;

const MAIN_SELECTION_HTML = `
  <div class="mode-selection">
    <button class="mode-btn" onclick="startSessionWorkflow('study')">학습 모드</button>
    <button class="mode-btn" onclick="startSessionWorkflow('speedrun')">스피드런</button>
  </div>
`;

let currentPool = [];             // 현재 세션에 바인딩된 MAX_POOL_SIZE(10개) 단어 객체 배열
let currentQuestion = null;       // 현재 출제된 정답 및 보기 구조 { target, options }
let sessionHistory = [];          // 이번 세션 내의 정답/오답 및 속도 히스토리 로그 누적

let timeLeft = 30;
let timerInterval = null;         // 1초마다 세션 타이머를 갱신(상단 초시계바)
let questionStartTime = 0;        // 실시간 반응속도 측정용 마일스톤

let isPaused = false;
let isTimeUp = false;

window.addEventListener('load', initApp);

/**
 * 어플리케이션 통합 초기화 진입점
 */
async function initApp() {
  // 웹 푸시 알림 기본 권한 획득 처리
  requestNotificationPermission();

  // 오디오 엔진 안착 완료 신호를 완벽히 획득할 때까지 스크립트 홀딩
  const audioReady = await initAudioEngine();
  console.log(audioReady ? "[Init] TTS 오디오 가동 스탠바이 완결" : "[Init] TTS 오디오 초기화 실패");

  // 파이어베이스 인증 상태 변화 관찰(Observer) 가동
  onAuthStateChanged(auth, async (user) => {
    const userNameDisplay = document.getElementById('profile-name');

    if (user) {
      if (userNameDisplay) {
        const pureName = user.displayName.split(' ')[0].split('(')[0].trim();
        userNameDisplay.innerText = pureName;
      }

      console.log(`[Observer] 로그인 확인: ${user.displayName}`);
      await initUser(user.uid);

      // 사용자 최신 환경설정 수급 및 덮어쓰기
      const savedConfig = await getUserConfig();
      if (savedConfig) {
        // 복사본 배정이 아닌 중앙 저장소 상태 객체 필드 동기화
        Object.assign(userConfig, savedConfig);
      }

      // 화면 전면 리셋 및 메인 모드 선택기 복원
      resetToMainModeSelection();
    } else {
      console.log("게스트 임시 세션으로 구동을 시작합니다.");
      await initUser(null);
      if (userNameDisplay) {
        userNameDisplay.innerText = "게스트님";
      }
    }

    // 공통 타임라인 인터페이스 가시화 정산
    updateTimerProgressBar(userConfig.learningTime, userConfig.learningTime);
  });
}

/**
 * 모드 선택 버튼 클릭 시 초기 화면을 가리고 게임창을 기동하는 진입점
 */
window.startSessionWorkflow = async function (mode) {
  const modeLayer = document.getElementById('mode-selection-layer');
  const gameLayer = document.getElementById('quiz-game-layer');
  const title = document.getElementById('current-mode-title');

  if (modeLayer) modeLayer.style.display = 'none';
  if (gameLayer) gameLayer.style.display = 'block';
  if (title) title.innerText = mode === 'study' ? '학습 모드' : '기록 모드';

  await startQuizSession();
};

/**
 * 퀴즈 풀이 화면 기동 및 예약 풀 세팅
 */
async function startQuizSession() {
  isTimeUp = false;
  isPaused = false;
  sessionHistory = [];

  // 정답/오답 히스토리 바 초기화
  const historyBar = document.getElementById('history-bar');
  if (historyBar) historyBar.innerHTML = '';

  // 복습 주기 도래 풀 10개 수급
  const dbData = await getAllProgress(userConfig.currentDomain);
  currentPool = initSessionPool(userConfig.currentDomain, dbData, userConfig.autoProgress, userConfig.MAX_POOL_SIZE);

  if (!currentPool || currentPool.length === 0) {
    alert("선택된 도메인에 출제 가능한 가나 후보군이 존재하지 않습니다.");
    return;
  }

  const userInfoRight = document.querySelector('.user-info-right');
  if (userInfoRight) {
    userInfoRight.classList.add('hidden');
  }

  // 풀이 확정되는 즉시 10개 단어 TTS 사전 로드 가동
  await preloadSessionVoices(currentPool);

  // 타이머 시동
  timeLeft = userConfig.learningTime;
  updateTimerProgressBar(timeLeft, userConfig.learningTime);
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(tickSessionTimer, 1000);

  // 첫 문항 출제
  await renderNextQuestion();
}

/**
 * 복습 풀 내에서 무작위 4지선다 결합 후 화면 출력
 */
async function renderNextQuestion() {
  const optionsContainer = document.getElementById('options');
  if (!optionsContainer) return;
  optionsContainer.innerHTML = '';

  // 풀 내부에서 한 단어를 랜덤 추출하여 4지선다 문항 생성
  const targetItem = currentPool[Math.floor(Math.random() * currentPool.length)];
  currentQuestion = generateFourOptions(targetItem, currentPool);

  // 상단 대시보드 지면 갱신 (현재 문제의 복습 단계 인덱스 정보 가시화)
  const weightDisplay = document.getElementById('weight-display');
  if (weightDisplay) {
    weightDisplay.innerText = `Stage ${currentQuestion.target.stage} | 아웃: ${currentQuestion.target.outCnt}/3`;
  }

  // 프리로드된 메모리를 직접 타격하므로 레이턴시 차단
  window.audioTriggerClick = () => {
    playTargetVoice(currentQuestion.target.char);
  };

  const audioBtn = document.getElementById('audio-trigger');
  if (audioBtn) {
    audioBtn.onclick = window.audioTriggerClick;
  }

  // 최초 자동 발송 호출 및 반응속도 타이밍 측정 시작
  window.audioTriggerClick();
  questionStartTime = Date.now();

  // 4지선다 보기 버튼 DOM 렌더 가공
  currentQuestion.options.forEach(charId => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';

    const matchingItem = currentPool.find(p => p.charId === charId);
    btn.innerText = matchingItem ? matchingItem.char : '';

    // [조작 실수 방지 필터링 탑재]
    btn.onclick = () => {
      const latency = Date.now() - questionStartTime;
      if (latency < 150) return; // 150ms 이하 초고속 연타 조작은 단순 물리적 실수 처리 무시
      handleUserAnswer(charId, latency);
    };
    optionsContainer.appendChild(btn);
  });
}

/**
 * 유저 응답 결과 정산 및 가중치 업데이트 스케줄링 처리
 */
async function handleUserAnswer(selectedCharId, latency) {
  const target = currentQuestion.target;
  const isCorrect = selectedCharId === target.charId;

  // 로컬 캐시 풀 업데이트
  const updatedItem = calculateReviewState({ ...target }, isCorrect, latency);
  const poolIdx = currentPool.findIndex(p => p.charId === target.charId);
  if (poolIdx !== -1) currentPool[poolIdx] = updatedItem;

  // 히스토리 로컬 배열 저장 및 우측 서브바 UI 갱신
  sessionHistory.push({
    char: target.char,     // 이전 문제의 정답 글자 (예: 'あ')
    isCorrect: isCorrect,
    speed: latency
  });
  updateHistoryBarUI();

  // 2. 문제를 다 풀고 난 뒤에 타임업 여부를 검사
  if (isTimeUp) {
    await terminateQuizSession();
  } else {
    await renderNextQuestion();
  }
}

function tickSessionTimer() {
  timeLeft--;
  if (timeLeft <= 0) {
    clearInterval(timerInterval);
    timerInterval = null; // 타이머 참조 해제
    isTimeUp = true; // 플래그만 켜두고 유저가 버튼을 누를 때까지 렌더링에 관여하지 않음

    // 유저에게 세션 시간이 만료되어 마지막 문제임을 시각적으로 넌지시 인지시킴
    const weightDisplay = document.getElementById('weight-display');
    if (weightDisplay) {
      weightDisplay.innerText = "⏰ 시간 만료! 마지막 문항 정산 중...";
      weightDisplay.style.color = "#dc3545";
    }
  } else {
    updateTimerProgressBar(timeLeft, userConfig.learningTime);
  }
}

function updateTimerProgressBar(left, total) {
  const timerBar = document.getElementById('timer-progress-bar');
  if (timerBar) {
    const percentage = ((total - left) / total) * 100;
    timerBar.style.width = percentage + '%';
  }
}

/**
 * 세션이 정상 타임아웃 종료되었을 때 성적 요약 및 최종 알림 예약 프로세스 마감
 */
async function terminateQuizSession() {
  // 1. 추가적인 타이머 및 비동기 오작동을 막기 위해 인터벌 클리어
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // 2. 플래그 상태 전면 초기화 (무한 로그 반복 차단)
  isTimeUp = false;
  isPaused = false;

  // 세션이 마감되어 초기화면으로 복귀할 때 우측 메뉴를 다시 노출
  const userInfoRight = document.querySelector('.user-info-right');
  if (userInfoRight) {
    userInfoRight.classList.remove('hidden');
  }

  // 3. DB 저장이 밀리더라도 화면은 즉시 원본 복원 구동
  resetToMainModeSelection();

  // 4. 화면 전환 뒤 백그라운드 처리
  try {
    await saveSessionPoolState(userConfig.currentDomain, currentPool);
    console.log("세션 풀 스트릭 데이터 일괄 동기화 완료.");

    await updateDailyStudyTime(userConfig.learningTime);

    const correctLogs = sessionHistory.filter(h => h.isCorrect);
    if (correctLogs.length > 0) {
      const calcAvg = (arr) => arr.reduce((sum, log) => sum + log.speed, 0) / arr.length;
      const avgAll = calcAvg(correctLogs);
      const avgR10 = calcAvg(correctLogs.slice(-10));
      const avgR5 = calcAvg(correctLogs.slice(-5));

      await updateDailyStats(avgAll, avgR10, avgR5);
    }

    const nextTargetStage = Math.min(...currentPool.map(p => p.stage));
    const delayMin = INTERVALS[nextTargetStage] || 10;

    await scheduleReviewNotification(userConfig.currentDomain, delayMin);
  } catch (dbError) {
    console.error("백엔드 데이터 처리 중 예외 발생 (화면 복귀는 유지됨):", dbError);
  }
}

/**
 * 세션 타임아웃 또는 강제 이탈 시 메인 선택 화면으로 리셋 복귀
 */
function resetToMainModeSelection() {
  if (timerInterval) clearInterval(timerInterval);

  const mainBox = document.getElementById('main-box');
  if (mainBox) mainBox.innerHTML = MAIN_SELECTION_HTML; // 완벽히 원본 상태 복원
}

// 세션 도중 일시정지 버튼 클릭 시 타이머 정지 및 세션 종료 처리
window.pauseGameTrigger = function () {
  if (!timerInterval || isTimeUp) return;

  clearInterval(timerInterval);
  isPaused = true;

  terminateQuizSession();
};

function updateHistoryBarUI() {
  const container = document.getElementById('history-bar');
  if (!container) return;
  container.innerHTML = '';

  // 최신 성적 5개를 우측 디자인 명세 슬롯 구조에 정확히 맵핑
  sessionHistory.slice(-5).forEach((item, idx) => {
    const div = document.createElement('div');
    div.id = `quiz-history${idx + 1}`;
    div.innerText = item.char;

    // 일반 텍스트 지면 및 스타일 주입
    div.style.cssText = item.isCorrect
      ? "background:#4CAF50; color:white; padding:5px; text-align:center; border-radius:4px; font-size:12px; font-weight:bold; width:100%;"
      : "background:#FFCDD2; color:#C62828; padding:5px; text-align:center; border-radius:4px; font-size:12px; font-weight:bold; width:100%;";
    container.appendChild(div);
  });
}

// 글로벌 전역 윈도우 스코프 함수 가용 이관 등록
window.toggleSettings = () => {
  const modal = document.getElementById('settings-modal');
  const overlay = document.getElementById('settings-overlay');
  if (!modal || !overlay) return;

  const isOpening = modal.style.display === 'none';
  modal.style.display = isOpening ? 'block' : 'none';
  overlay.style.display = isOpening ? 'block' : 'none';

  if (isOpening) {
    const totalCount = getStandardCharCount(userConfig.currentDomain);
    const masteredCount = currentPool.filter(p => p.stage >= 5).length;

    const countDisplay = document.getElementById('settings-active-count');
    if (countDisplay) countDisplay.innerText = `${masteredCount} / ${totalCount}`;

    refreshPersonalizedSettings(userConfig);
    renderResponseTimeChart(userConfig.currentDomain);
  }
};

window.toggleAutoProgress = () => {
  userConfig.autoProgress = !userConfig.autoProgress;
  const btn = document.getElementById('btn-toggle-auto');
  if (btn) {
    btn.innerText = userConfig.autoProgress ? "자동진도 켜짐" : "자동진도 꺼짐";
    btn.style.background = userConfig.autoProgress ? "#4CAF50" : "#9E9E9E";
  }
  saveUserConfig(userConfig);
};

/**
 * 브라우저 탭 닫기, 새로고침 등 강제 종료 이탈 프로세스 감지
 */
window.addEventListener('beforeunload', (event) => {
  if (timerInterval && !isTimeUp && currentPool.length > 0) {

    // 강제 종료 시점까지 플레이어가 쌓은 중간 결과를 DB에 배치 동기화 전송 시도
    saveSessionPoolState(userConfig.currentDomain, currentPool);
    updateDailyStudyTime(learningTime - timeLeft); // 플레이한 시간만큼만 정산

    // 구형 브라우저 호환용 경고창 유도 (탭 닫기 전 확인 안내 문구)
    event.preventDefault();
    event.returnValue = '';
  }
});

/**
 * 선택된 모드(study / speedrun) 무대를 동적 빌드하고 엔진 가동
 */
window.startSessionWorkflow = async function (mode) {
  const mainBox = document.getElementById('main-box');
  if (!mainBox) return;

  // 1. 외부 에셋 템플릿 주입으로 무대 교체
  mainBox.innerHTML = sessionBoardTemplate;

  // 2. 네이밍 충돌이 해결된 타이틀 바인딩
  const title = document.getElementById('current-mode-title');
  if (title) {
    title.innerText = mode === 'study' ? '학습 모드' : '스피드런';
  }

  await startQuizSession();
};

/**
 * ALPHABETS 구조(배열/객체)에 유연하게 대응하고 userConfig를 바라보는 도메인 토글러
 */
window.toggleDomain = function () {
  if (typeof ALPHABETS === 'undefined' || !ALPHABETS) {
    alert("DB가 없습니다.");
    return;
  }

  const domains = Array.isArray(ALPHABETS) ? ALPHABETS : Object.keys(ALPHABETS);

  if (domains.length === 0) {
    alert("DB가 없습니다.");
    return;
  }

  // 1. 세션 진행 중 이탈 방어 벨브
  if (timerInterval && !isTimeUp) {
    if (confirm("현재 진행 중인 세션이 초기화됩니다. 도메인을 변경할까요?")) {
      // 가동 중이던 타이머와 세션 상태를 정산/종료 처리
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      isPaused = false;
    } else {
      return; // 취소를 누르면 함수 종료
    }
  }

  // 2. 다음 순번 도메인 추적 및 전역 스코프 동기화
  const currentIndex = domains.indexOf(userConfig.currentDomain);
  const nextIndex = (currentIndex + 1) % domains.length;

  userConfig.currentDomain = domains[nextIndex];
  window.currentDomain = userConfig.currentDomain;

  // 3. 데이터셋 객체 내부에서 실제 출력할 진짜 글자를 동적 추출
  const domainBtn = document.querySelector("span[onclick='toggleDomain()']");
  if (domainBtn) {
    const targetDataset = ALPHABETS[currentDomain];

    if (targetDataset && targetDataset.length > 0) {
      // 셋의 첫 번째 데이터 유닛(예: {char: "あ"} 또는 {char: "ア"} 등)에서 글자를 추출
      const firstItem = targetDataset[0];
      const representChar = (typeof firstItem === 'object' && firstItem.char) ? firstItem.char : firstItem;

      domainBtn.innerText = representChar.charAt(0);
    } else {
      console.warn(`도메인 ${currentDomain}의 데이터셋이 비어있거나 형식이 올바르지 않습니다.`);
      domainBtn.innerText = "?";
    }
  }

  console.log(`[Domain Swap] 현재 활성 도메인: ${currentDomain}`);

  resetToMainModeSelection();
};

window.playSoundTest = function () {
  playSoundTest(currentDomain);
};

/**
 * view/ 디렉터리의 조각 HTML을 원격 수급하여 모달 창에 주입하는 핵심 엔진
 */
async function openRemoteModalPopup(viewName) {
  if (timerInterval && !isTimeUp) return;

  try {
    // 1. 원격 혹은 로컬 템플릿 소스 수급
    let htmlContent = "";
    if (viewName === 'progress') htmlContent = progressTemplate;
    else if (viewName === 'setting') htmlContent = settingTemplate;
    else if (viewName === 'leaderboard') htmlContent = sessionBoardTemplate;
    else if (viewName === 'login') htmlContent = loginTemplate;
    else {
      const response = await fetch(`./view/${viewName}.html`);
      if (!response.ok) throw new Error(`HTML 수급 실패`);
      htmlContent = await response.text();
    }

    // 2. [순서 보정] DOM 주입 전에 문자열 치환부터 완결
    if (viewName === 'setting') {
      const timeIdx = TIME_STEPS.indexOf(userConfig.learningTime) ?? 4;
      const speechIdx = SPEECH_STEPS.indexOf(userConfig.speechRate) ?? 2;

      htmlContent = htmlContent
        .replace('{{timeIdx}}', timeIdx)
        .replace('{{learningTime}}', userConfig.learningTime)
        .replace('{{MAX_POOL_SIZE}}', userConfig.MAX_POOL_SIZE)
        .replace('{{speechIdx}}', speechIdx)
        .replace('{{speechRate}}', userConfig.speechRate)
        .replace('{{#if autoProgress}}checked{{/if}}', userConfig.autoProgress ? 'checked' : '')
        .replace('{{currentDomain}}', userConfig.currentDomain);
    }

    // 3. 정제된 컴포넌트를 기반으로 단일 객체 생성 및 돔 트리 등록
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal-content"><span class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</span>${htmlContent}</div>`;
    document.body.appendChild(overlay);

    // 4. 진도 모달인 경우에만 정밀 고착 완료 플래그 감시 (무한 동결 원천 차단)
    if (viewName === 'progress') {
      await new Promise((resolve) => {
        // 이미 즉시 동착되어 존재한다면 즉시 통과 처리 (방어 코드)
        if (document.getElementById('response-time-chart')) return resolve();

        const observer = new MutationObserver((mutations, obs) => {
          if (document.getElementById('response-time-chart')) {
            obs.disconnect();
            resolve();
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      });

      console.log("[Trigger] 진도 모달 렌더링 파이프라인 가동 (DOM 안착 확인)");
      const currentDomainData = await getAllProgress(userConfig.currentDomain);

      window.userConfig = userConfig;
      window.globalProgressCache = { [userConfig.currentDomain]: currentDomainData };

      // 안전하게 확보된 공간 위에 렌더러 엔진 시동
      await renderResponseTimeChart(userConfig.currentDomain);
      renderProgressTable(userConfig.currentDomain, currentDomainData);

      if (typeof currentWeeklyStats !== 'undefined') {
        renderStudyStatsChart(currentWeeklyStats);
      } else {
        renderStudyStatsChart({ total: 0, history: {} });
      }
    }

    // 5. 컴포넌트 마운트 직후 이벤트 리스너 바인딩
    if (viewName === 'setting') {
      document.getElementById('pool-size')?.addEventListener('input', (e) => {
        userConfig.MAX_POOL_SIZE = parseInt(e.target.value, 10) || 10;
      });

      document.getElementById('auto-progress')?.addEventListener('change', (e) => {
        userConfig.autoProgress = e.target.checked;
      });
    }

  } catch (error) {
    console.error("모달 수급 및 초기화 파이프라인 에러 발생:", error);
  }
}

window.popupHelp = () => openRemoteModalPopup('help');
window.popupLeaderboard = () => openRemoteModalPopup('leaderboard');
window.popupSetting = () => openRemoteModalPopup('setting');
window.popupProgress = () => openRemoteModalPopup('progress');
window.popupLogin = () => openRemoteModalPopup('login');

/**
 * 구글 계정을 이용한 팝업 로그인 처리 및 유저 세션 가동
 */
window.googleLogin = async function () {
  if (isLoginProcessing) return;
  isLoginProcessing = true;

  try {
    // 팝업 격발 직전 데이터 누락 상태 최종 심문
    if (!auth || !auth.app || !auth.app.options || !auth.app.options.apiKey) {
      console.error("오류: 파이어베이스 auth 인스턴스 초기화 데이터 유실됨:", auth);
      alert("로그인 모듈 초기화 실패. 콘솔 창을 확인하세요.");
      return;
    }

    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
    provider.addScope('https://www.googleapis.com/auth/userinfo.email');

    // 정상 데이터가 확인된 상태에서 안전하게 팝업 요청 격발
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    if (typeof resetToMainModeSelection === 'function') {
      resetToMainModeSelection();
    }

  } catch (error) {
    console.error(`[Login Error]`, error.code, error.message);
  } finally {
    isLoginProcessing = false;
  }
};

import { doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { writeBatch, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

/**
 * 특정 단일 문자의 진도를 강제로 최하위 스키마(Stage=1)로 활성화
 */
window.activateSingleCharProgress = async function (domain, charId) {
  if (!auth.currentUser) return;

  // 가장 낮은 수준의 가중치 기본 데이터 스키마 정의
  const initialSchema = {
    domain: domain,
    charId: parseInt(charId),
    stage: 1,              // 가라데이터 진입 1단계 지정
    recentLatencies: [2500], // 기본 평균 레이턴시 가이드라인 주입 (2.5초)
    latenciesIdx: 1,
    outCnt: 0,
    resetOutCnt: 0,
    totalSolved: 1,
    lastSessionTime: Date.now(),
    sessionStreak: 0
  };

  try {
    // 1. 백엔드 Firestore 물리 저장소 적재
    const docRef = doc(db, 'users', auth.currentUser.uid, 'progress', domain, 'chars', charId.toString());
    await setDoc(docRef, initialSchema);

    // 2. 런타임 메모리 전역 캐시 실시간 동기화 업데이트 (화면 즉시 반영용)
    if (window.globalProgressCache && window.globalProgressCache[domain]) {
      window.globalProgressCache[domain][charId.toString()] = initialSchema;
    }

    // 3. 표 구성 렌더러 재기동으로 실시간 음영 해제 및 진한 글씨 투사
    renderProgressTable(domain, window.globalProgressCache[domain]);
    console.log(`[UI Sync] 문자 ID ${charId} 진도 활성화 완료`);
  } catch (error) {
    console.error("진도 활성화 처리 중 에러:", error);
  }
};

/**
 * 특정 단일 문자의 진도 기록을 완전히 소멸시키고 초기화
 */
window.resetSingleCharProgress = async function (domain, charId) {
  if (!auth.currentUser) return;

  try {
    // 1. 백엔드 데이터 완전 삭제
    const docRef = doc(db, 'users', auth.currentUser.uid, 'progress', domain, 'chars', charId.toString());
    await deleteDoc(docRef);

    // 2. 런타임 메모리 전역 캐시에서 해당 문자 파괴
    if (window.globalProgressCache && window.globalProgressCache[domain]) {
      delete window.globalProgressCache[domain][charId.toString()];
    }

    // 3. 표 구성 렌더러 재기동으로 실시간 음영 및 회색 배경 복원
    renderProgressTable(domain, window.globalProgressCache[domain]);
    console.log(`[UI Sync] 문자 ID ${charId} 기록 초기화 및 음영 복구 완료`);
  } catch (error) {
    console.error("진도 초기화 처리 중 에러:", error);
  }
};

/**
 * 3. [모두 해금] 현재 도메인의 모든 문자를 Stage 1로 강제 동기화 정산
 */
window.unlockAllCharacters = async function () {
  if (!auth.currentUser) return;
  const domain = userConfig.currentDomain;
  const rawDataset = ALPHABETS[domain] || [];

  if (!confirm(`현재 도메인(${domain})의 모든 문자를 Stage 1 단계로 일괄 해금하시겠습니까?`)) return;

  const batch = writeBatch(db);
  const updatedCache = { ...window.globalProgressCache[domain] };
  let globalIdx = 0;

  rawDataset.forEach((rowStr) => {
    for (let i = 0; i < rowStr.length; i++) {
      if (rowStr[i] === '_') continue; // 언더바 인덱스 연산 제외

      const cId = globalIdx.toString();
      const schema = {
        domain,
        charId: globalIdx,
        stage: 1,
        recentLatencies: [2500],
        latenciesIdx: 1,
        outCnt: 0,
        resetOutCnt: 0,
        totalSolved: 1,
        lastSessionTime: Date.now(),
        sessionStreak: 0
      };

      const docRef = doc(db, 'users', auth.currentUser.uid, 'progress', domain, 'chars', cId);
      batch.set(docRef, schema);
      updatedCache[cId] = schema;

      globalIdx++;
    }
  });

  try {
    await batch.commit();
    window.globalProgressCache[domain] = updatedCache;
    renderProgressTable(domain, updatedCache);
    console.log(`[Batch Sync] ${domain} 도메인 일괄 해금 완료`);
  } catch (error) {
    console.error("일괄 해금 처리 중 오류:", error);
  }
};

/**
 * 3. [초기화] 현재 도메인의 DB 및 캐시 내역을 전면 초기화하여 무대 음영 처리
 */
window.resetAllProgressData = async function () {
  if (!auth.currentUser) return;
  const domain = userConfig.currentDomain;

  if (!confirm(`경고: 현재 도메인(${domain})의 모든 학습 기록이 영구 삭제됩니다.\n진행하시겠습니까?`)) return;

  try {
    // Firestore 내 하위 컬렉션 전체 탐색 후 동시 파괴를 위한 배치 구성
    const colRef = collection(db, 'users', auth.currentUser.uid, 'progress', domain, 'chars');
    const snapshot = await getDocs(colRef);

    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    await batch.commit();

    // 로컬 런타임 캐시 완전 비우기
    window.globalProgressCache[domain] = {};

    // 테이블 새로고침 렌더링 호출
    renderProgressTable(domain, {});
    console.log(`[Batch Sync] ${domain} 도메인 전면 초기화 정산 마감`);
  } catch (error) {
    console.error("전체 초기화 처리 중 오류:", error);
  }
};