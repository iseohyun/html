/**
 * main.js
 * 모든 모듈을 유기적으로 결합하고 세션 흐름을 제어하는 핵심 컨트롤러
*/
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
  saveUserConfig,
  getWeeklyStats,
  submitSpeedrunRanking,
  getGlobalRankings
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
  toggleAnalysisMode,
  renderLeaderboardUI
} from './components/ui-modal-handler.js';
import {
  requestNotificationPermission,
  scheduleReviewNotification
} from './components/notification-handler.js';
import {
  initAuthObserver,
  googleLogin,
  kakaoLogin,
  naverLogin,
  logoutUser
} from './components/auth-handler.js';

window.playSoundTest = playSoundTest;
window.toggleAnalysisMode = toggleAnalysisMode;

const MAIN_SELECTION_HTML = `
  <div class="mode-selection">
    <button class="mode-btn" onclick="startSessionWorkflow('study')" style="position: relative;">
      학습 모드
      <span class="keybind-badge" id="kb-badge-startStudy" style="top: 10px; right: 10px;">Q</span>
    </button>
    <button class="mode-btn" onclick="startSessionWorkflow('record')" style="position: relative;">
      기록 모드
      <span class="keybind-badge" id="kb-badge-startRecord" style="top: 10px; right: 10px;">W</span>
    </button>
    <button class="mode-btn" onclick="startSessionWorkflow('spectator')" style="position: relative;">
      관전 모드
      <span class="keybind-badge" id="kb-badge-startSpectator" style="top: 10px; right: 10px;">E</span>
    </button>
    <div class="mode-btn-empty" style="aspect-ratio: 1 / 1;"></div>
  </div>
`;

let currentMode = 'study'; // 'study' 또는 'record'

let currentPool = [];
let currentQuestion = null;
let sessionHistory = [];
let initialStages = {}; // 세션 진입 당시 글자별 stage 상태 보관함
let spectatorIntervalId = null; // 관전모드 타이머
let lastSpectatorCharId = null; // 관전모드 직전 출력 글자 ID

let timeLeft = 30;
let timerInterval = null; // 1초마다 세션 타이머를 갱신(상단 초시계바)
let questionStartTime = 0; // 실시간 반응속도 측정용 마일스톤

let isPaused = false;
let isTimeUp = false;

// 스피드런(기록 모드) 전용 상태 변수
let srElapsedTime = 0;
let srTotalCount = 0;
let srCurrentIndex = 0;
let srCorrectCount = 0;

window.addEventListener('load', initApp);

async function initApp() {
  // 웹 푸시 알림 기본 권한 획득 처리
  requestNotificationPermission();

  // 오디오 엔진 안착 완료 신호를 완벽히 획득할 때까지 스크립트 홀딩
  const audioReady = await initAudioEngine();
  console.log(audioReady ? "[Init] TTS 오디오 가동 스탠바이 완결" : "[Init] TTS 오디오 초기화 실패");

  // 인증 모듈을 통한 상태 변화 관찰(Observer) 가동
  initAuthObserver(async (user) => {
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
        if (!savedConfig.keybindings) {
          savedConfig.keybindings = JSON.parse(JSON.stringify(userConfig.keybindings));
        } else {
          savedConfig.keybindings = Object.assign({}, userConfig.keybindings, savedConfig.keybindings);
        }
        Object.assign(userConfig, savedConfig);
      }

      // 불러온 도메인 상태를 전역 변수 및 UI 버튼에 즉시 동기화
      window.currentDomain = userConfig.currentDomain;
      updateDomainUI();

      // 화면 전면 리셋 및 메인 모드 선택기 복원
      resetToMainModeSelection();
    } else {
      console.log("게스트 임시 세션으로 구동을 시작합니다.");
      await initUser(null);
      if (userNameDisplay) {
        userNameDisplay.innerText = "게스트";
      }
      
      window.currentDomain = userConfig.currentDomain;
      updateDomainUI();
      resetToMainModeSelection();
    }

    updateVisualBadges();
    updateReviewCountBadge();

    // 공통 타임라인 인터페이스 가시화 정산
    updateTimerProgressBar(userConfig.learningTime, userConfig.learningTime);
  });
}

/**
 * 모드 선택 버튼 클릭 시 초기 화면을 가리고 게임창을 기동하는 진입점
 */
window.startSessionWorkflow = async function (mode) {
  currentMode = mode;
  try {
    const versionQuery = window.APP_VERSION ? `?v=${window.APP_VERSION}` : '';
    const viewFile = mode === 'spectator' ? 'spectatorMode' : 'studyMode';
    const response = await fetch(`./view/${viewFile}.html${versionQuery}`);
    if (!response.ok) throw new Error(`${viewFile}.html 수급 실패`);

    const htmlContent = await response.text();
    const mainBox = document.getElementById('main-box');
    if (mainBox) mainBox.innerHTML = htmlContent;

    const title = document.getElementById('current-mode-title');
    if (title) {
      if (mode === 'study') title.innerText = '학습 모드';
      else if (mode === 'record') title.innerText = '스피드런 모드';
      else if (mode === 'spectator') title.innerText = '관전 모드';
    }

    if (mode === 'study') {
      await startQuizSession();
    } else if (mode === 'record') {
      await startSpeedrunSession();
    } else if (mode === 'spectator') {
      await startSpectatorSession();
    }
  } catch (error) {
    console.error("세션 진입 중 에러 발생:", error);
  }
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

  // 최초 진입 시 stage 상태 기록
  initialStages = {};
  currentPool.forEach(item => {
    initialStages[item.charId] = item.stage;
  });

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
  optionsContainer.style.pointerEvents = 'auto'; // 새 문제 출제 시 클릭 비활성화 해제

  // 풀 내부에서 한 단어를 랜덤 추출하여 4지선다 문항 생성
  const targetItem = currentPool[Math.floor(Math.random() * currentPool.length)];
  currentQuestion = generateFourOptions(targetItem, currentPool);

  // 상단 대시보드 지면 갱신 (실시간 가나 상태 인디케이터 배지 그리드 출력)
  updatePoolIndicatorUI();

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

  const keybinds = ['4 / A', '5 / S', '1 / Z', '2 / X'];
  currentQuestion.options.forEach((charId, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';

    const matchingItem = currentPool.find(p => p.charId === charId);
    const charText = matchingItem ? matchingItem.char : '';
    btn.innerHTML = `<span class="keybind-hint">${keybinds[idx]}</span><span>${charText}</span>`;
    btn.dataset.charId = charId; // 정답 버튼 추적용 데이터 속성 추가

    // 조작 실수 방지 필터링 탑재
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
  // 애니메이션 효과 진행 중 중복 클릭 방지
  const optionsContainer = document.getElementById('options');
  if (optionsContainer) {
    optionsContainer.style.pointerEvents = 'none';
  }

  const target = currentQuestion.target;
  const isCorrect = selectedCharId === target.charId;

  // 로컬 캐시 풀 업데이트
  const updatedItem = calculateReviewState({ ...target }, isCorrect, latency);
  const poolIdx = currentPool.findIndex(p => p.charId === target.charId);
  if (poolIdx !== -1) currentPool[poolIdx] = updatedItem;
  updatePoolIndicatorUI();

  // 히스토리 로컬 배열 저장 및 우측 서브바 UI 갱신
  sessionHistory.push({
    char: target.char,     // 이전 문제의 정답 글자 (예: 'あ')
    isCorrect: isCorrect,
    speed: latency
  });
  updateHistoryBarUI();

  if (!isCorrect) {
    const feedbackMode = userConfig.errorFeedbackMode || 'both';

    if (feedbackMode !== 'none') {
      // 오답일 경우: 정답 음성 재출력 (both 일 때만)
      if (feedbackMode === 'both' && window.audioTriggerClick) window.audioTriggerClick();

      // 정답 선택지를 찾아 1초간 녹색으로 서서히 변화시킴
      const correctBtn = document.querySelector(`.option-btn[data-char-id="${target.charId}"]`);
      if (correctBtn) {
        correctBtn.style.transition = 'background-color 1s ease, color 1s ease';
        correctBtn.style.backgroundColor = '#4CAF50'; // 녹색
        correctBtn.style.color = 'white';
      }

      // 변화 과정을 충분히 인지할 수 있도록 1초(1000ms) 대기
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      // '표시 안하기'인 경우 딜레이를 최소화하여 빠른 진행 유도
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

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

    // 실제 플레이한 시간(목표 설정 시간 - 남은 시간)만큼만 정산하여 저장
    const playedTime = Math.max(0, userConfig.learningTime - timeLeft);
    await updateDailyStudyTime(playedTime, userConfig.currentDomain);

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
    updateReviewCountBadge(); // 세션 종료 후 복습 필요 문항 수 배지 갱신
  } catch (dbError) {
    console.error("백엔드 데이터 처리 중 예외 발생 (화면 복귀는 유지됨):", dbError);
  }
}

function buildFullDomainPool(domain) {
  let rawDataset = ALPHABETS[domain] || [];
  if (typeof rawDataset === 'string') rawDataset = [rawDataset];
  const pool = [];
  let globalIdx = 0;
  rawDataset.forEach((rowStr) => {
    for (let i = 0; i < rowStr.length; i++) {
      const char = rowStr[i];
      if (char !== '_') {
        pool.push({ domain, charId: globalIdx, char, stage: 0 });
        globalIdx++; // 언더바가 아닐 때만 고유 ID 인덱스 증가
      }
    }
  });
  return pool;
}

async function startSpeedrunSession() {
  isTimeUp = false;
  isPaused = false;
  sessionHistory = [];

  const historyBar = document.getElementById('history-bar');
  if (historyBar) historyBar.innerHTML = '';

  const dbData = await getAllProgress(userConfig.currentDomain);
  const fullPool = buildFullDomainPool(userConfig.currentDomain);

  // 전체 문자에 대해, 기존 해금 기록이 있으면 연결하고 없으면 isUnlocked: false 처리
  currentPool = fullPool.map(item => {
    const dbItem = dbData[item.charId.toString()];
    return dbItem ? { ...dbItem, char: item.char, isUnlocked: (dbItem.stage > 0) } : { ...item, isUnlocked: false };
  });

  // 스피드런용 무작위 셔플 (랜덤 출제)
  currentPool.sort(() => Math.random() - 0.5);

  if (!currentPool || currentPool.length === 0) {
    alert("선택된 도메인에 출제 가능한 문자가 없습니다.");
    return;
  }

  srTotalCount = currentPool.length;
  srCurrentIndex = 0;
  srCorrectCount = 0;
  srElapsedTime = 0;

  const userInfoRight = document.querySelector('.user-info-right');
  if (userInfoRight) userInfoRight.classList.add('hidden');

  await preloadSessionVoices(currentPool);

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(tickSpeedrunTimer, 1000);

  await renderNextSpeedrunQuestion();
}

async function renderNextSpeedrunQuestion() {
  const optionsContainer = document.getElementById('options');
  if (!optionsContainer) return;
  optionsContainer.innerHTML = '';
  optionsContainer.style.pointerEvents = 'auto';

  // 모든 문항을 1번씩 순회했으면 종료
  if (srCurrentIndex >= srTotalCount) {
    await terminateSpeedrunSession();
    return;
  }

  const targetItem = currentPool[srCurrentIndex];
  // 전체 도메인 Pool 안에서 랜덤 오답 4지선다 생성
  currentQuestion = generateFourOptions(targetItem, currentPool);

  const weightDisplay = document.getElementById('weight-display');
  if (weightDisplay) {
    weightDisplay.innerText = `진행률: ${srCurrentIndex + 1} / ${srTotalCount} | ⏱️ ${formatTime(srElapsedTime)}`;
  }

  // 진행률 바 (진행한 만큼 게이지가 꽉 차오름)
  updateTimerProgressBar(srTotalCount - (srCurrentIndex + 1), srTotalCount);

  window.audioTriggerClick = () => { playTargetVoice(currentQuestion.target.char); };
  const audioBtn = document.getElementById('audio-trigger');
  if (audioBtn) audioBtn.onclick = window.audioTriggerClick;

  window.audioTriggerClick();
  questionStartTime = Date.now();

  const keybinds = ['4 / A', '5 / S', '1 / Z', '2 / X'];
  currentQuestion.options.forEach((charId, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    const matchingItem = currentPool.find(p => p.charId === charId);
    const charText = matchingItem ? matchingItem.char : '';
    btn.innerHTML = `<span class="keybind-hint">${keybinds[idx]}</span><span>${charText}</span>`;
    btn.dataset.charId = charId;

    btn.onclick = () => {
      const latency = Date.now() - questionStartTime;
      if (latency < 150) return;
      handleSpeedrunAnswer(charId, latency);
    };
    optionsContainer.appendChild(btn);
  });
}

async function handleSpeedrunAnswer(selectedCharId, latency) {
  const optionsContainer = document.getElementById('options');
  if (optionsContainer) optionsContainer.style.pointerEvents = 'none';

  const target = currentQuestion.target;
  const isCorrect = selectedCharId === target.charId;

  if (isCorrect) srCorrectCount++;

  // 해금된(학습한) 문자인 경우에만 진도를 갱신합니다. (미해금 문자 건너뜀)
  if (target.isUnlocked) {
    const updatedItem = calculateReviewState({ ...target }, isCorrect, latency);
    currentPool[srCurrentIndex] = { ...updatedItem, isUnlocked: true };
  }

  sessionHistory.push({ char: target.char, isCorrect, speed: latency });
  updateHistoryBarUI();

  if (!isCorrect) {
    const feedbackMode = userConfig.errorFeedbackMode || 'both';

    if (feedbackMode !== 'none') {
      if (feedbackMode === 'both' && window.audioTriggerClick) window.audioTriggerClick();
      const correctBtn = document.querySelector(`.option-btn[data-char-id="${target.charId}"]`);
      if (correctBtn) {
        correctBtn.style.transition = 'background-color 1s ease, color 1s ease';
        correctBtn.style.backgroundColor = '#4CAF50';
        correctBtn.style.color = 'white';
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  srCurrentIndex++;
  await renderNextSpeedrunQuestion();
}

function tickSpeedrunTimer() {
  srElapsedTime++;
  const weightDisplay = document.getElementById('weight-display');
  if (weightDisplay && currentMode !== 'study') {
    weightDisplay.innerText = `진행률: ${srCurrentIndex + 1 > srTotalCount ? srTotalCount : srCurrentIndex + 1} / ${srTotalCount} | ⏱️ ${formatTime(srElapsedTime)}`;
  }
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

async function terminateSpeedrunSession() {
  if (timerInterval) {  // 퀴즈 화면이 아니거나, 오답 확인 대기 중(pointerEvents === 'none')일 때는 무시
    if (!optionsContainer || optionsContainer.style.pointerEvents === 'none') return;

    if (e.code === 'Space') {
      e.preventDefault(); // 스페이스바 화면 스크롤 방지
      if (window.audioTriggerClick) window.audioTriggerClick();
      return;
    }

    const key = e.key.toLowerCase();
    let optionIndex = -1;
    // 퀴즈 화면이 아니거나, 오답 확인 대기 중(pointerEvents === 'none')일 때는 무시
    if (!optionsContainer || optionsContainer.style.pointerEvents === 'none') return;

    if (e.code === 'Space') {
      e.preventDefault(); // 스페이스바 화면 스크롤 방지
      if (window.audioTriggerClick) window.audioTriggerClick();
      return;
    }

    clearInterval(timerInterval);
    timerInterval = null;
  }
  isPaused = false;
  isTimeUp = false;

  const userInfoRight = document.querySelector('.user-info-right');
  if (userInfoRight) userInfoRight.classList.remove('hidden');

  resetToMainModeSelection();

  try {
    // 스피드런에서 푼 데이터 중 이미 해금되어 학습 중인 문자들만 추려서 동기화 진행
    const itemsToSave = currentPool.filter(item => item.isUnlocked);
    if (itemsToSave.length > 0) {
      await saveSessionPoolState(userConfig.currentDomain, itemsToSave);
      console.log(`스피드런 세션 해금 문자 진도 동기화 완료 (${itemsToSave.length}개)`);
    }

    await updateDailyStudyTime(srElapsedTime, userConfig.currentDomain);

    const accuracy = Math.round((srCorrectCount / srTotalCount) * 100);

    // 게스트이거나 닉네임이 없는 경우 랭킹 등록용 이름 입력받기
    let playerName = document.getElementById('profile-name')?.innerText || "게스트";
    if (!auth.currentUser || playerName === "게스트") {
      const defaultGuestName = localStorage.getItem('GUEST_ID') || "게스트";
      playerName = prompt("스피드런 랭킹에 등록할 닉네임을 입력해 주세요.", defaultGuestName) || defaultGuestName;
    }

    // 도메인 기록 명칭 분리 (영문 대소문자 구별)
    let recordDomain = userConfig.currentDomain;
    if (recordDomain.toLowerCase() === 'english' || recordDomain.toLowerCase() === 'alphabet') {
      const sampleItem = currentPool.find(p => /[a-zA-Z]/.test(p.char));
      const sampleChar = sampleItem ? sampleItem.char : 'A';
      recordDomain = (sampleChar === sampleChar.toUpperCase()) ? 'english(A)' : 'english(a)';
    }

    const recordId = await submitSpeedrunRanking(recordDomain, srTotalCount, srElapsedTime, accuracy, playerName);

    alert(`스피드런 모드 완료!\n⏱️ 소요 시간: ${formatTime(srElapsedTime)}\n🎯 정답률: ${accuracy}%`);

    window.highlightRecordId = recordId;
    window.highlightRemaining = 2; // 이번 자동 팝업(1) + 다음번 직접 팝업(1) 총 2회 유지
    window.popupLeaderboard(recordDomain);
  } catch (dbError) {
    console.error("스피드런 데이터 처리 중 예외 발생:", dbError);
  }
}

}

/**
 * 관전 모드 기동 및 설정
 */
async function startSpectatorSession() {
  lastSpectatorCharId = null;

  // 1. 도메인 진도 전체 데이터 가져오기
  const dbData = await getAllProgress(userConfig.currentDomain);
  
  // 2. 해금된 글자만 필터링
  const allCharacters = [];
  const rows = ALPHABETS[userConfig.currentDomain] || [];
  let idCounter = 0;
  for (const row of rows) {
    for (const char of row) {
      if (char !== '_') {
        const saved = dbData[idCounter] || {};
        allCharacters.push({
          domain: userConfig.currentDomain,
          charId: idCounter,
          char,
          stage: saved.stage !== undefined ? saved.stage : 0,
          recentLatencies: saved.recentLatencies || [],
          latenciesIdx: saved.latenciesIdx || 0,
          outCnt: saved.outCnt || 0,
          resetOutCnt: saved.resetOutCnt || 0,
          totalSolved: saved.totalSolved || 0,
          lastSessionTime: saved.lastSessionTime || 0,
          sessionStreak: saved.sessionStreak || 0,
          hasHistory: (saved.totalSolved || 0) > 0,
          isEligibleForPromotion: false
        });
        idCounter++;
      }
    }
  }

  // 해금된 글자 (solved 기록 존재)
  let unlocked = allCharacters.filter(item => item.hasHistory);

  // 3. 만약 해금된 글자가 전혀 없으면, 기본 10개 글자로 풀 방어 구축
  if (unlocked.length === 0) {
    unlocked = allCharacters.slice(0, 10);
  }

  // 4. 평균 반응속도 기준 계산 및 내림차순 정렬 (느린 순)
  const getAvg = (item) => {
    if (!item.recentLatencies || item.recentLatencies.length === 0) return 0;
    return item.recentLatencies.reduce((a, b) => a + b, 0) / item.recentLatencies.length;
  };

  unlocked.sort((a, b) => getAvg(b) - getAvg(a));

  // 느린 기준 10개 문자 추출
  currentPool = unlocked.slice(0, 10);

  // 5. 우측 사용자 정보 영역 숨기기
  const userInfoRight = document.querySelector('.user-info-right');
  if (userInfoRight) userInfoRight.classList.add('hidden');

  // 6. 음원 사전 로딩
  await preloadSessionVoices(currentPool);

  // 7. 상단 인디케이터 배지들 출력
  initialStages = {};
  currentPool.forEach(item => {
    initialStages[item.charId] = item.stage;
  });
  updatePoolIndicatorUI();

  // 8. 1초당 1개씩 동작하는 루프 기동
  const intervalMs = (userConfig.spectatorInterval || 1) * 1000;
  
  // 첫 문자 즉시 출력
  tickSpectator();
  
  if (spectatorIntervalId) clearInterval(spectatorIntervalId);
  spectatorIntervalId = setInterval(tickSpectator, intervalMs);
}

/**
 * 1주기마다 글자를 무작위 선택하여 음성 및 글자 출력 (단, 2번 연속 선택 불가)
 */
function tickSpectator() {
  if (currentPool.length === 0) return;

  // 2번 연속 선택 방지를 위해 직전 ID 배제 필터링
  const candidates = currentPool.filter(item => item.charId !== lastSpectatorCharId);
  const nextItem = candidates.length > 0
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : currentPool[0];

  lastSpectatorCharId = nextItem.charId;

  // 글자 UI 갱신 및 스케일 애니메이션 트리거
  const charEl = document.getElementById('spectator-char');
  if (charEl) {
    charEl.innerText = nextItem.char;
    charEl.classList.remove('pulse-scale');
    void charEl.offsetWidth; // 리플로우 트리거
    charEl.classList.add('pulse-scale');
  }

  // 음성 재생
  playTargetVoice(nextItem.char);

  // 상단 배지 강조 (해당 문자 배지는 크게 키우고 테두리 검정, 다른 배지들은 원래 스타일 복구)
  const badges = document.querySelectorAll('.pool-badge');
  badges.forEach(badge => {
    const bCharId = parseInt(badge.dataset.charId);
    if (bCharId === nextItem.charId) {
      badge.style.transform = 'scale(1.25)';
      badge.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
      badge.style.border = '2.5px solid #2b2b2b';
      badge.style.zIndex = '10';
    } else {
      badge.style.transform = 'none';
      badge.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      badge.style.zIndex = '1';
      
      const item = currentPool.find(p => p.charId === bCharId);
      if (item) {
        if (item.isEligibleForPromotion) {
          badge.style.border = '1.5px solid #2b8a3e';
        } else if (!item.hasHistory) {
          badge.style.border = '1.5px dashed #868e96';
        } else {
          badge.style.border = 'none';
        }
      }
    }
  });
}

/**
 * 관전 모드 종료 시 리셋 프로세스
 */
function terminateSpectatorSession() {
  if (spectatorIntervalId) {
    clearInterval(spectatorIntervalId);
    spectatorIntervalId = null;
  }
  
  const userInfoRight = document.querySelector('.user-info-right');
  if (userInfoRight) userInfoRight.classList.remove('hidden');

  resetToMainModeSelection();
}

window.exitSpectatorTrigger = function () {
  terminateSpectatorSession();
};

/**
 * 세션 타임아웃 또는 강제 이탈 시 메인 선택 화면으로 리셋 복귀
 */
function resetToMainModeSelection() {
  if (timerInterval) clearInterval(timerInterval);
  if (spectatorIntervalId) clearInterval(spectatorIntervalId);
  spectatorIntervalId = null;

  const mainBox = document.getElementById('main-box');
  if (mainBox) {
    mainBox.innerHTML = MAIN_SELECTION_HTML;
    updateVisualBadges(); // 모드 버튼이 동적 교체되었으므로 Q/W 단축키 배지 재생성 반영
  }
}

/**
 * 활성화된 도메인에 맞춰 상단 UI 버튼의 텍스트(아이콘)를 동기화하는 함수
 */
function updateDomainUI() {
  const domainBtn = document.querySelector(".domain-btn");
  if (domainBtn) {
    const targetDataset = ALPHABETS[userConfig.currentDomain];
    if (targetDataset && targetDataset.length > 0) {
      const firstItem = targetDataset[0];
      const representChar = (typeof firstItem === 'object' && firstItem.char) ? firstItem.char : firstItem;
      domainBtn.innerText = representChar.charAt(0);
    } else {
      domainBtn.innerText = "?";
    }
  }
}

// 세션 도중 일시정지 버튼 클릭 시 타이머 정지 및 세션 종료 처리
window.pauseGameTrigger = function () {
  if (!timerInterval || isTimeUp) return;

  clearInterval(timerInterval);
  isPaused = true;

  if (currentMode === 'study') {
    terminateQuizSession();
  } else {
    terminateSpeedrunSession();
  }
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

/**
 * 실시간 가나 상태 인디케이터 배지 목록 갱신
 */
function updatePoolIndicatorUI() {
  const weightDisplay = document.getElementById('weight-display');
  if (!weightDisplay) return;
  if (isTimeUp) return; // 시간 만료 경고 문구 유지

  weightDisplay.innerHTML = '';
  weightDisplay.style.display = 'flex';
  weightDisplay.style.gap = '6px';
  weightDisplay.style.flexWrap = 'wrap';
  weightDisplay.style.alignItems = 'center';

  currentPool.forEach(item => {
    const badge = document.createElement('div');
    badge.className = 'pool-badge';
    badge.innerText = item.char;
    badge.dataset.charId = item.charId;
    
    // 배경색은 현재의 stage 색상
    let bg = getStageColor(item.stage);
    
    // out count는 오직 글자의 색(font-color)을 변경함
    let color = '#333';
    if (item.outCnt === 1) {
      color = '#e67e22'; // 주황색
    } else if (item.outCnt === 2) {
      color = '#e74c3c'; // 빨간색
    }
    
    badge.style.backgroundColor = bg;
    badge.style.color = color;
    badge.style.fontWeight = 'bold'; // 가독성을 위해 굵은 글씨 유지
    
    // 테두리는 승급을 나타냄
    // 굵은선: 이번세션에서 승급성공 (hasBeenPromotedThisSession)
    // 실선: 승급가능 (isEligibleForPromotion)
    // 점선: 신규단어 (!hasHistory)
    // 없음: 승급기회 없음
    badge.style.boxSizing = 'border-box';
    if (item.hasBeenPromotedThisSession) {
      badge.style.border = '3px solid #2b8a3e'; // 굵은선
    } else if (item.isEligibleForPromotion) {
      badge.style.border = '1.5px solid #2b8a3e'; // 실선
    } else if (!item.hasHistory) {
      badge.style.border = '1.5px dashed #868e96'; // 점선
    } else {
      badge.style.border = 'none'; // 없음
    }
    
    badge.style.width = '30px';
    badge.style.height = '30px';
    badge.style.display = 'inline-flex';
    badge.style.alignItems = 'center';
    badge.style.justifyContent = 'center';
    badge.style.borderRadius = '6px';
    badge.style.fontSize = '14px';
    badge.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    badge.style.transition = 'all 0.2s ease';
    
    weightDisplay.appendChild(badge);
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
    if (currentMode === 'study') {
      saveSessionPoolState(userConfig.currentDomain, currentPool);
      const playedTime = Math.max(0, userConfig.learningTime - timeLeft);
      updateDailyStudyTime(playedTime, userConfig.currentDomain);
    } else {
      const itemsToSave = currentPool.filter(item => item.isUnlocked);
      if (itemsToSave.length > 0) saveSessionPoolState(userConfig.currentDomain, itemsToSave);
      updateDailyStudyTime(srElapsedTime, userConfig.currentDomain);
    }

    // 구형 브라우저 호환용 경고창 유도 (탭 닫기 전 확인 안내 문구)
    event.preventDefault();
    event.returnValue = '';
  }
});

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
  updateDomainUI();

  console.log(`[Domain Swap] 현재 활성 도메인: ${userConfig.currentDomain}`);

  resetToMainModeSelection();
  updateReviewCountBadge();
};

/**
 * view/ 디렉터리의 조각 HTML을 원격 수급하여 모달 창에 주입하는 핵심 엔진
 */
async function openRemoteModalPopup(viewName) {
  if (timerInterval && !isTimeUp) return;

  try {
    const versionQuery = window.APP_VERSION ? `?v=${window.APP_VERSION}` : '';
    const response = await fetch(`./view/${viewName}.html${versionQuery}`);
    if (!response.ok) throw new Error("HTML 조각 수급 실패");

    let htmlContent = await response.text();

    // DOM 주입 전에 문자열 치환부터 완결
    if (viewName === 'setting') {
      const timeIdx = TIME_STEPS.indexOf(userConfig.learningTime) ?? 4;
      const speechIdx = SPEECH_STEPS.indexOf(userConfig.speechRate) ?? 2;

      let userName = auth.currentUser ? (auth.currentUser.displayName || "이름 없음") : "게스트";
      if (userName.includes('(')) userName = userName.split('(')[0].trim();

      let rawEmail = auth.currentUser ? auth.currentUser.email : "";
      let maskedEmail = "";
      if (rawEmail) {
        const parts = rawEmail.split('@');
        if (parts.length === 2) {
          const idPart = parts[0];
          const keepLen = Math.ceil(idPart.length / 2);
          maskedEmail = idPart.substring(0, keepLen) + '*'.repeat(idPart.length - keepLen) + '@' + parts[1];
        }
      }

      // 단축키 설정 UI 동적 빌드
      let kbHtml = `
        <div style="margin-top: 20px; border-top: 1px solid #ddd; padding-top: 15px;">
          <h3 style="font-size: 14px; margin-bottom: 10px;">⌨️ 메인화면 단축키 설정</h3>
          <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid #eee;">
                <th style="text-align: left; padding: 4px;">기능</th>
                <th style="text-align: center; padding: 4px; width: 85px;">정 (Primary)</th>
                <th style="text-align: center; padding: 4px; width: 85px;">부 (Secondary)</th>
              </tr>
            </thead>
            <tbody>
      `;

      const mainKeys = ['toggleDomain', 'playSoundTest', 'popupProgress', 'popupSetting', 'popupLeaderboard', 'popupHelp', 'popupLogin', 'startStudy', 'startRecord', 'startSpectator'];
      const ingameKeys = ['option0', 'option1', 'option2', 'option3'];

      mainKeys.forEach(k => {
        const bind = userConfig.keybindings[k] || { label: k, primary: "", secondary: "" };
        kbHtml += `
          <tr style="border-bottom: 1px solid #f9f9f9;">
            <td style="padding: 6px 4px;">${bind.label}</td>
            <td style="text-align: center; padding: 4px;">
              <button class="kb-bind-btn" data-action="${k}" data-type="primary" style="width: 75px; padding: 3px; font-size: 11px; border: 1px solid #ccc; border-radius: 3px; cursor: pointer; background: #fff;">${bind.primary || '-'}</button>
            </td>
            <td style="text-align: center; padding: 4px;">
              <button class="kb-bind-btn" data-action="${k}" data-type="secondary" style="width: 75px; padding: 3px; font-size: 11px; border: 1px solid #ccc; border-radius: 3px; cursor: pointer; background: #fff;">${bind.secondary || '-'}</button>
            </td>
          </tr>
        `;
      });

      kbHtml += `
            </tbody>
          </table>
          
          <hr style="margin: 20px 0; border: 0; border-top: 1px solid #ddd;" />
          
          <h3 style="font-size: 14px; margin-bottom: 10px;">🎮 인게임 단축키 설정</h3>
          <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid #eee;">
                <th style="text-align: left; padding: 4px;">기능</th>
                <th style="text-align: center; padding: 4px; width: 85px;">정 (Primary)</th>
                <th style="text-align: center; padding: 4px; width: 85px;">부 (Secondary)</th>
              </tr>
            </thead>
            <tbody>
      `;

      ingameKeys.forEach(k => {
        const bind = userConfig.keybindings[k] || { label: k, primary: "", secondary: "" };
        kbHtml += `
          <tr style="border-bottom: 1px solid #f9f9f9;">
            <td style="padding: 6px 4px;">${bind.label}</td>
            <td style="text-align: center; padding: 4px;">
              <button class="kb-bind-btn" data-action="${k}" data-type="primary" style="width: 75px; padding: 3px; font-size: 11px; border: 1px solid #ccc; border-radius: 3px; cursor: pointer; background: #fff;">${bind.primary || '-'}</button>
            </td>
            <td style="text-align: center; padding: 4px;">
              <button class="kb-bind-btn" data-action="${k}" data-type="secondary" style="width: 75px; padding: 3px; font-size: 11px; border: 1px solid #ccc; border-radius: 3px; cursor: pointer; background: #fff;">${bind.secondary || '-'}</button>
            </td>
          </tr>
        `;
      });

      kbHtml += `
            </tbody>
          </table>
        </div>
      `;

      htmlContent = htmlContent
        .replace('{{userName}}', userName)
        .replace('{{userEmail}}', maskedEmail)
        .replace('{{timeIdx}}', timeIdx)
        .replace('{{learningTime}}', userConfig.learningTime)
        .replace('{{MAX_POOL_SIZE}}', userConfig.MAX_POOL_SIZE)
        .replace('{{speechIdx}}', speechIdx)
        .replace('{{speechRate}}', userConfig.speechRate)
        .replace('{{#if autoProgress}}checked{{/if}}', userConfig.autoProgress ? 'checked' : '')
        .replace('{{keybindingsConfig}}', kbHtml);
    }

    // 정제된 컴포넌트를 기반으로 단일 객체 생성 및 돔 트리 등록
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal-content"><span class="modal-close" style="transform: scale(2); transform-origin: top right; display: inline-block; cursor: pointer;">&times;</span>${htmlContent}</div>`;

    // 오버레이 및 닫기 버튼 클릭 시 모달 닫기 및 설정 일괄 저장 처리
    const closeHandler = (e) => {
      if (e.target.classList.contains('modal-close') || e.target === overlay) {
        overlay.remove();
        if (viewName === 'setting') {
          saveUserConfig(userConfig);
          console.log("[Settings] 설정 모달 종료 - 일괄 저장 완료");
        }
        if (viewName === 'leaderboard') {
          if (window.highlightRemaining > 0) {
            window.highlightRemaining--;
          }
          if (!window.highlightRemaining || window.highlightRemaining <= 0) {
            window.highlightRecordId = null; // 유효 횟수 소진 시 하이라이트 해제
          }
        }
      }
    };
    overlay.addEventListener('click', closeHandler);

    document.body.appendChild(overlay);

    // 진도 모달인 경우에만 정밀 고착 완료 플래그 감시
    if (viewName === 'progress') {
      await new Promise((resolve) => {
        if (document.getElementById('response-time-chart')) return resolve();

        const observer = new MutationObserver((mutations, obs) => {
          if (document.getElementById('response-time-chart')) {
            obs.disconnect();
            resolve();
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      });

      const currentDomainData = await getAllProgress(userConfig.currentDomain);

      window.userConfig = userConfig;
      window.globalProgressCache = { [userConfig.currentDomain]: currentDomainData };

      // 안전하게 확보된 공간 위에 렌더러 엔진 시동
      await renderResponseTimeChart(userConfig.currentDomain);
      renderProgressTable(userConfig.currentDomain, currentDomainData);

      const currentWeeklyStats = await getWeeklyStats(userConfig.currentDomain);
      if (currentWeeklyStats) {
        renderStudyStatsChart(currentWeeklyStats);
      } else {
        renderStudyStatsChart({ total: 0, history: {} });
      }
    }

    // 리더보드 모달인 경우 DB 데이터 동기화 및 렌더링 (더미 데이터 교체)
    if (viewName === 'leaderboard') {
      await new Promise((resolve) => {
        if (document.getElementById('leaderboard-list')) return resolve();
        const observer = new MutationObserver((mutations, obs) => {
          if (document.getElementById('leaderboard-list')) {
            obs.disconnect();
            resolve();
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      });
      try {
        const targetDomain = window.targetLeaderboardDomain || 'all';
        const rankings = await getGlobalRankings(10, targetDomain);
        renderLeaderboardUI(rankings);

        // 리더보드의 도메인 필터 셀렉트 박스 UI 값 동기화
        setTimeout(() => {
          const domainSelect = document.querySelector('select[onchange*="changeLeaderboardDomain"]');
          if (domainSelect) domainSelect.value = targetDomain;
        }, 10);
      } catch (err) {
        console.error("[Leaderboard] 랭킹 데이터 조회 및 렌더링 실패:", err);
      }
    }

    // 5. 컴포넌트 마운트 직후 이벤트 리스너 바인딩
    if (viewName === 'setting') {
      const ageSelect = document.getElementById('user-age');
      if (ageSelect) ageSelect.value = userConfig.age || '미상';

      const genderSelect = document.getElementById('user-gender');
      if (genderSelect) genderSelect.value = userConfig.gender || '미상';

      const spectatorIntervalSelect = document.getElementById('spectator-interval');
      if (spectatorIntervalSelect) spectatorIntervalSelect.value = (userConfig.spectatorInterval || 1).toString();

      const btnErrorShow = document.getElementById('btn-error-show');
      const btnErrorAudio = document.getElementById('btn-error-audio');

      const updateErrorFeedbackUI = () => {
        if (!btnErrorShow || !btnErrorAudio) return;
        if (userConfig.errorFeedbackMode === 'none') {
          btnErrorShow.innerText = "무시";
          btnErrorShow.style.background = "#9E9E9E";
          btnErrorAudio.style.background = "#9E9E9E";
          btnErrorAudio.disabled = true;
        } else {
          btnErrorShow.innerText = "표시";
          btnErrorShow.style.background = "#4CAF50";
          btnErrorAudio.disabled = false;

          if (userConfig.errorFeedbackMode === 'both') {
            btnErrorAudio.innerText = "+ 음성";
            btnErrorAudio.style.background = "#2196F3";
          } else {
            btnErrorAudio.innerText = "정답만";
            btnErrorAudio.style.background = "#FF9800";
          }
        }
      };

      if (btnErrorShow && btnErrorAudio) {
        if (!userConfig.errorFeedbackMode) userConfig.errorFeedbackMode = 'both';
        updateErrorFeedbackUI();

        btnErrorShow.addEventListener('click', () => {
          userConfig.errorFeedbackMode = userConfig.errorFeedbackMode === 'none' ? 'both' : 'none';
          updateErrorFeedbackUI();
        });

        btnErrorAudio.addEventListener('click', () => {
          userConfig.errorFeedbackMode = userConfig.errorFeedbackMode === 'both' ? 'visual_only' : 'both';
          updateErrorFeedbackUI();
        });
      }

      document.getElementById('pool-size')?.addEventListener('input', (e) => {
        userConfig.MAX_POOL_SIZE = parseInt(e.target.value, 10) || 10;
      });

      document.getElementById('auto-progress')?.addEventListener('change', (e) => {
        userConfig.autoProgress = e.target.checked;
      });

      document.getElementById('user-age')?.addEventListener('change', (e) => {
        userConfig.age = e.target.value || '미상';
      });

      document.getElementById('user-gender')?.addEventListener('change', (e) => {
        userConfig.gender = e.target.value || '미상';
      });

      document.getElementById('spectator-interval')?.addEventListener('change', (e) => {
        userConfig.spectatorInterval = parseFloat(e.target.value) || 1;
      });

      // --- 키 바인딩 버튼 이벤트 리스너 바인딩 ---
      const bindButtons = overlay.querySelectorAll('.kb-bind-btn');
      bindButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();

          if (window.activeKeybindBtn) return;

          window.activeKeybindBtn = btn;
          btn.innerText = "입력 대기...";
          btn.style.background = "#fff3cd";
          btn.style.borderColor = "#ffc107";

          const keydownHandler = (keyEvent) => {
            keyEvent.preventDefault();
            keyEvent.stopPropagation();

            const newKey = keyEvent.key;
            const action = btn.dataset.action;
            const type = btn.dataset.type;

            let formattedKey = newKey;

            // 중복 검사
            const mainKeys = ['toggleDomain', 'playSoundTest', 'popupProgress', 'popupSetting', 'popupLeaderboard', 'popupHelp', 'popupLogin', 'startStudy', 'startRecord', 'startSpectator'];
            const ingameKeys = ['option0', 'option1', 'option2', 'option3'];
            const isMain = mainKeys.includes(action);
            const targetGroup = isMain ? mainKeys : ingameKeys;

            let isDuplicate = false;
            let duplicateLabel = "";

            for (const otherAction of targetGroup) {
              const otherBind = userConfig.keybindings[otherAction];
              if (!otherBind) continue;
              if (otherAction === action) {
                const otherType = type === 'primary' ? 'secondary' : 'primary';
                if ((otherBind[otherType] || '').toLowerCase() === formattedKey.toLowerCase()) {
                  isDuplicate = true;
                  duplicateLabel = `${otherBind.label} (${otherType === 'primary' ? '정' : '부'})`;
                  break;
                }
              } else {
                if ((otherBind.primary || '').toLowerCase() === formattedKey.toLowerCase()) {
                  isDuplicate = true;
                  duplicateLabel = `${otherBind.label} (정)`;
                  break;
                }
                if ((otherBind.secondary || '').toLowerCase() === formattedKey.toLowerCase()) {
                  isDuplicate = true;
                  duplicateLabel = `${otherBind.label} (부)`;
                  break;
                }
              }
            }

            if (isDuplicate) {
              alert(`이미 '${formattedKey}' 키는 ${duplicateLabel}에 할당되어 있습니다.`);
              btn.innerText = userConfig.keybindings[action][type] || '-';
            } else {
              userConfig.keybindings[action][type] = formattedKey;
              btn.innerText = formattedKey;
              updateVisualBadges();
            }

            btn.style.background = "#fff";
            btn.style.borderColor = "#ccc";
            window.activeKeybindBtn = null;
            window.removeEventListener('keydown', keydownHandler, true);
          };

          window.addEventListener('keydown', keydownHandler, true);
        });
      });
    }

  } catch (error) {
    console.error("모달 수급 및 초기화 파이프라인 에러 발생:", error);
  }
}

window.popupHelp = () => openRemoteModalPopup('help');
window.popupLeaderboard = (domain = 'all') => {
  window.targetLeaderboardDomain = domain;
  openRemoteModalPopup('leaderboard');
};
window.popupSetting = () => openRemoteModalPopup('setting');
window.popupProgress = () => openRemoteModalPopup('progress');
window.popupLogin = () => openRemoteModalPopup('login');

/**
 * 리더보드 도메인 필터 변경 시 호출
 */
window.changeLeaderboardDomain = async function (targetDomain) {
  window.targetLeaderboardDomain = targetDomain;
  const listContainer = document.getElementById('leaderboard-list');
  if (listContainer) listContainer.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 30px; color:#777;">데이터를 불러오는 중입니다...</td></tr>';
  try {
    const rankings = await getGlobalRankings(10, targetDomain);
    renderLeaderboardUI(rankings);
  } catch (err) {
    console.error("[Leaderboard] 랭킹 데이터 필터링 실패:", err);
  }
};

/**
 * 로그인/로그아웃 액션을 전역 스코프로 노출 (auth-handler.js 모듈로 위임)
 */
window.googleLogin = () => googleLogin(resetToMainModeSelection);
window.kakaoLogin = kakaoLogin;
window.naverLogin = naverLogin;
window.logout = () => logoutUser(resetToMainModeSelection);

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

    const actualCache = await getAllProgress(domain);
    actualCache[charId.toString()] = initialSchema;

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

    const actualCache = await getAllProgress(domain);
    delete actualCache[charId.toString()];

    // 3. 표 구성 렌더러 재기동으로 실시간 음영 및 회색 배경 복원
    renderProgressTable(domain, window.globalProgressCache[domain]);
    console.log(`[UI Sync] 문자 ID ${charId} 기록 초기화 및 음영 복구 완료`);
  } catch (error) {
    console.error("진도 초기화 처리 중 에러:", error);
  }
};

/**
 * 현재 도메인의 모든 문자를 Stage 1로 강제 동기화 정산
 */
window.unlockAllCharacters = async function () {
  if (!auth.currentUser) return;
  const domain = userConfig.currentDomain;
  let rawDataset = ALPHABETS[domain] || [];
  if (typeof rawDataset === 'string') rawDataset = [rawDataset];

  if (!confirm(`현재 도메인(${domain})의 미해금 문자를 모두 Stage 1 단계로 일괄 해금하시겠습니까?`)) return;

  const batch = writeBatch(db);
  const updatedCache = { ...window.globalProgressCache[domain] };
  const actualCache = await getAllProgress(domain);
  let globalIdx = 0;
  let unlockedCount = 0;

  rawDataset.forEach((rowStr) => {
    for (let i = 0; i < rowStr.length; i++) {
      if (rowStr[i] === '_') continue; // 언더바 인덱스 연산 제외

      const cId = globalIdx.toString();

      // 이미 학습 중인 데이터(해금된 데이터)는 무시하고 스킵
      if (updatedCache[cId] && updatedCache[cId].stage > 0) {
        globalIdx++;
        continue;
      }

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
 * 현재 도메인의 DB 및 캐시 내역을 전면 초기화하여 무대 음영 처리
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
    const actualCache = await getAllProgress(domain);
    Object.keys(actualCache).forEach(k => delete actualCache[k]);

    // 테이블 새로고침 렌더링 호출
    renderProgressTable(domain, {});
    console.log(`[Batch Sync] ${domain} 도메인 전면 초기화 정산 마감`);
  } catch (error) {
    console.error("전체 초기화 처리 중 오류:", error);
  }
};

/**
 * 키바인딩 매칭 헬퍼 함수
 */
function matchKey(e, bind) {
  if (!bind) return false;
  const key = e.key.toLowerCase();
  const primary = (bind.primary || '').toLowerCase();
  const secondary = (bind.secondary || '').toLowerCase();
  
  if (key === ' ' || key === 'space') {
    return primary === ' ' || primary === 'space' || secondary === ' ' || secondary === 'space';
  }
  
  return key === primary || key === secondary;
}

/**
 * 키바인딩 UI 가시 배지 텍스트 갱신 함수
 */
function updateVisualBadges() {
  if (!userConfig.keybindings) return;
  
  const ids = {
    popupLogin: 'kb-badge-popupLogin',
    toggleDomain: 'kb-badge-toggleDomain',
    playSoundTest: 'kb-badge-playSoundTest',
    popupProgress: 'kb-badge-popupProgress',
    popupSetting: 'kb-badge-popupSetting',
    popupLeaderboard: 'kb-badge-popupLeaderboard',
    popupHelp: 'kb-badge-popupHelp',
    startStudy: 'kb-badge-startStudy',
    startRecord: 'kb-badge-startRecord',
    startSpectator: 'kb-badge-startSpectator'
  };
  
  Object.keys(ids).forEach(action => {
    const el = document.getElementById(ids[action]);
    if (el) {
      const bind = userConfig.keybindings[action];
      if (bind) {
        let displayKey = bind.primary || bind.secondary || '-';
        if (displayKey.toLowerCase() === 'escape') displayKey = 'ESC';
        if (displayKey === ' ') displayKey = 'Space';
        el.innerText = displayKey;
      }
    }
  });
}

/**
 * 복습 대기 상태 글자 수 실시간 배지 업데이트 함수
 */
async function updateReviewCountBadge() {
  const badge = document.getElementById('review-count-badge');
  if (!badge) return;

  try {
    const domain = userConfig.currentDomain;
    const dbData = await getAllProgress(domain) || {};
    const now = Date.now();
    const rows = ALPHABETS[domain] || [];
    
    let count = 0;
    let idCounter = 0;
    
    for (const row of rows) {
      for (const char of row) {
        if (char !== '_') {
          const charId = idCounter++;
          const saved = dbData[charId];
          if (saved && saved.totalSolved > 0) {
            const stage = saved.stage !== undefined ? saved.stage : 0;
            const lastSessionTime = saved.lastSessionTime || 0;
            const timeDiffMin = (now - lastSessionTime) / (60 * 1000);
            if (timeDiffMin >= INTERVALS[stage]) {
              count++;
            }
          }
        }
      }
    }

    if (count > 0) {
      badge.innerText = count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  } catch (err) {
    console.error("복습 개수 배지 업데이트 실패:", err);
    badge.style.display = 'none';
  }
}

/**
 * 키보드 단축키 바인딩
 */
window.addEventListener('keydown', (e) => {
  // 세팅 창 등의 입력(Input, Select) 필드에서 타이핑 중일 때는 단축키 동작 무시
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

  // Alt 키 배지 토글 (기본 브라우저 포커스 동작 차단)
  if (e.key === 'Alt') {
    e.preventDefault();
    document.body.classList.add('show-keybinds');
    return;
  }

  const bindings = userConfig.keybindings || {};

  // ESC 키로 모달 닫기
  if (e.key === 'Escape') {
    const activeOverlay = document.querySelector('.modal-overlay');
    if (activeOverlay) {
      e.preventDefault();
      activeOverlay.click(); // 오버레이 클릭 이벤트를 트리거하여 모달 닫기 및 설정 자동 저장
      return;
    }
  }

  // 관전 화면 탈출 처리 (ESC 누를 시 즉시 메인 화면 복귀)
  const spectatorLayer = document.getElementById('spectator-game-layer');
  if (spectatorLayer && e.key === 'Escape') {
    e.preventDefault();
    terminateSpectatorSession();
    return;
  }

  const optionsContainer = document.getElementById('options');

  // 퀴즈 화면 탈출 처리 (ESC 누를 시 컨펌창 띄우고 취소 시 타이머 재개)
  if (optionsContainer && e.key === 'Escape') {
    e.preventDefault();
    const wasInterval = timerInterval;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    isPaused = true;

    const confirmExit = confirm("현재 학습 세션을 종료하고 메인 화면으로 돌아가시겠습니까?");
    if (confirmExit) {
      if (currentMode === 'study') {
        terminateQuizSession();
      } else {
        terminateSpeedrunSession();
      }
    } else {
      isPaused = false;
      if (wasInterval) {
        if (currentMode === 'study') {
          timerInterval = setInterval(tickSessionTimer, 1000);
        } else {
          timerInterval = setInterval(tickSpeedrunTimer, 1000);
        }
      }
    }
    return;
  }
  
  // 퀴즈 화면이 아닐 때 (메인화면인 경우) 단축키 설정
  if (!optionsContainer) {
    if (document.querySelector('.modal-overlay')) return;

    if (matchKey(e, bindings.toggleDomain)) {
      e.preventDefault();
      if (typeof window.toggleDomain === 'function') window.toggleDomain();
    } else if (matchKey(e, bindings.playSoundTest)) {
      e.preventDefault();
      if (typeof window.playSoundTest === 'function') window.playSoundTest();
    } else if (matchKey(e, bindings.popupProgress)) {
      e.preventDefault();
      if (typeof window.popupProgress === 'function') window.popupProgress();
    } else if (matchKey(e, bindings.popupSetting)) {
      e.preventDefault();
      if (typeof window.popupSetting === 'function') window.popupSetting();
    } else if (matchKey(e, bindings.popupLeaderboard)) {
      e.preventDefault();
      if (typeof window.popupLeaderboard === 'function') window.popupLeaderboard();
    } else if (matchKey(e, bindings.popupHelp)) {
      e.preventDefault();
      if (typeof window.popupHelp === 'function') window.popupHelp();
    } else if (matchKey(e, bindings.popupLogin)) {
      e.preventDefault();
      if (typeof window.popupLogin === 'function') window.popupLogin();
    } else if (matchKey(e, bindings.startStudy)) {
      e.preventDefault();
      if (typeof startSessionWorkflow === 'function') startSessionWorkflow('study');
    } else if (matchKey(e, bindings.startRecord)) {
      e.preventDefault();
      if (typeof startSessionWorkflow === 'function') startSessionWorkflow('record');
    } else if (matchKey(e, bindings.startSpectator)) {
      e.preventDefault();
      if (typeof startSessionWorkflow === 'function') startSessionWorkflow('spectator');
    }
    return;
  }

  // 퀴즈 화면이지만 오답 확인 대기 중(pointerEvents === 'none')일 때는 무시
  if (optionsContainer.style.pointerEvents === 'none') return;

  // 스페이스바 음성 재생 단축키
  if (e.code === 'Space') {
    e.preventDefault();
    if (window.audioTriggerClick) window.audioTriggerClick();
    return;
  }

  let optionIndex = -1;
  if (matchKey(e, bindings.option0)) optionIndex = 0;      // 왼쪽 위
  else if (matchKey(e, bindings.option1)) optionIndex = 1; // 오른쪽 위
  else if (matchKey(e, bindings.option2)) optionIndex = 2; // 왼쪽 아래
  else if (matchKey(e, bindings.option3)) optionIndex = 3; // 오른쪽 아래

  if (optionIndex !== -1) {
    const buttons = optionsContainer.querySelectorAll('.option-btn');
    if (buttons && buttons.length > optionIndex) {
      buttons[optionIndex].click();
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'Alt') {
    e.preventDefault();
    document.body.classList.remove('show-keybinds');
  }
});

window.addEventListener('blur', () => {
  document.body.classList.remove('show-keybinds');
});