/**
 * main.js
 * 모든 모듈을 유기적으로 연결
 */

let learningTime = 60; // 기본 학습 시간 (초)
let timeLeft = 60;
let timerInterval = null;
let questionStartTime = 0; // 응답 시간 측정을 위한 변수
let sessionHistory = []; // 최근 5문제 기록 저장
let isTimeUp = false; // 시간이 종료되었는지 여부

const totalStandardHiraganaCount = (ENGINE.range.end - ENGINE.range.start + 1) - ENGINE.smallChars.length;
const timeOptions = [10, 20, 30, 60];
let isPaused = false;

window.addEventListener('load', () => {
  console.log("DOM and Resources fully loaded.");

  initSettingsUI(); // 설정 UI 및 아이콘 생성

  // 브라우저 음성 엔진 미리 활성화 유도
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
  }

  // 1. Firebase 인증 상태 감시
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      console.log("인증 확인됨:", user.displayName);

      // 로그인 상태일 때 실행할 로직
      initUser(user.uid);      // db-handler.js: 사용자 UID 설정

      // 사용자 프로필 정보 저장 (이름, 이메일)
      saveUserProfile(user.displayName, user.email);

      // 사용자 설정값 로드 및 적용
      const userConfig = await getUserConfig();
      if (userConfig) {
        Object.assign(ENGINE.CONFIG, userConfig);
        console.log("개인화 설정 로드 완료:", userConfig);
      }

      await ENGINE.initPool(); // engine.js: 학습 풀 초기화
      showStartButton();       // main.js: 시작 UI 표시
    } else {
      console.log("로그인이 필요합니다.");
    }
  });
});

/**
 * 설정 UI(아이콘 및 모달)를 초기화합니다.
 */
function initSettingsUI() {
  // 반응형 레이아웃을 위한 스타일 주입
  const style = document.createElement('style');
  style.innerHTML = `
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden; /* 스크롤바 제거 */
      display: flex;
      flex-direction: column;
      justify-content: flex-start; 
      align-items: center;     /* 가로 중앙 정렬 */
      background-color: #f8f9fa; /* 부드러운 배경색 추가 */
    }
    #timer-container {
      width: 100%;
      height: 30px;
      background: #eee;
      display: flex;
      align-items: center;
      position: relative;
      cursor: pointer;
      border-bottom: 2px solid #ddd;
    }
    #timer-bar {
      height: 100%;
      background: #e62224;
      width: 0%;
      transition: width 1s linear;
    }
    #timer-text {
      margin-left: 10px;
      font-weight: bold;
      color: #333;
      z-index: 5;
      white-space: nowrap;
    }
    #options { 
      display: flex; 
      gap: 20px; 
      justify-content: center; 
      width: 700px; 
      max-width: 95vw; 
      flex-wrap: nowrap; 
      margin: 40px 0;
    }
    .option-btn {
      flex: 1;
      aspect-ratio: 1 / 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem !important;
      border: 3px solid #444 !important; /* 테두리 강화 */
      background: white;
      box-shadow: 0 4px 0 #333;
      border-radius: 12px;
    }
    @media (max-width: 600px) {
      #options { flex-direction: row; flex-wrap: nowrap; }
      #options .option-btn { 
        flex: 1; 
        padding: 15px 5px !important; 
        font-size: 1.2rem; 
        min-width: 0;
      }
    }
    #history-bar { display: flex; gap: 8px; min-height: 36px; align-items: center; }
    .result-icon {
      width: 32px; height: 32px; border-radius: 8px; /* 원에서 둥근 사각형으로 변경 */
      display: flex; align-items: center; justify-content: center;
      color: white; font-weight: bold; font-size: 1.1rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .result-correct { background-color: #4CAF50; border: 2px solid #388E3C; }
    .result-incorrect { background-color: #F44336; border: 2px solid #D32F2F; }
    
    /* 분석 모드용 스타일 */
    .analysis-active .stat-normal { display: none; }
    .analysis-active .stat-analysis { display: block !important; }
    
    .footer-area {
      width: 100%;
      max-width: 700px;
      display: flex;
      justify-content: space-between;
      padding: 10px 20px;
      font-size: 11px;
      color: #999;
      margin-top: auto;
    }
    #weight-display {
      font-size: 0.8rem;
      color: #673ab7;
      font-weight: bold;
    }
    #weight-history-row {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 10px;
    }
    .chart-tag {
      position: absolute;
      bottom: 100%;
      left: 0;
      font-size: 7px;
      background: rgba(255,255,255,0.9);
      padding: 1px;
      white-space: nowrap;
      z-index: 10;
      color: #e62224;
      pointer-events: none;
      transform: rotate(-90deg);
      transform-origin: 0 100%;
    }
  `;
  document.head.appendChild(style);

  // 레이아웃 재구성
  const appContainer = document.getElementById('app-container');
  appContainer.style.cssText = 'width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center;';

  // 1. 최상단: 타이머 바
  const timerContainer = document.createElement('div');
  timerContainer.id = 'timer-container';
  timerContainer.onclick = pauseGame;
  timerContainer.innerHTML = `<div id="timer-bar"></div><div id="timer-text">60s</div>`;
  document.body.prepend(timerContainer);

  // 2. 상단: 사용자 정보 (이미 index.html에 있음, 위치만 조정)
  const statusBar = document.querySelector('.status-bar');
  statusBar.style.cssText = 'margin: 15px auto; border: none; font-size: 1.1rem; width: 80%; padding: 0 20px;';

  // 3. 중앙 요소들 (가중치 + 히스토리 로우)
  const infoRow = document.createElement('div');
  infoRow.id = 'weight-history-row';

  const weightDiv = document.createElement('div');
  weightDiv.id = 'weight-display';
  weightDiv.innerText = '';

  const historyDiv = document.createElement('div');
  historyDiv.id = 'history-bar';

  infoRow.appendChild(weightDiv);
  infoRow.appendChild(historyDiv);
  document.getElementById('audio-trigger').before(infoRow);

  // 하단: Firebase Status + Report
  const footer = document.createElement('div');
  footer.className = 'footer-area';
  footer.innerHTML = `<span id="auth-status-footer">Firebase Synced</span><span>Report: kana-loop-v1</span>`;
  appContainer.appendChild(footer);
  document.getElementById('auth-status').style.display = 'none'; // 기존것 숨김

  // 설정 배경 오버레이 생성 (배경 클릭 방지용)
  const overlay = document.createElement('div');
  overlay.id = 'settings-overlay';
  overlay.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1999;';
  document.body.appendChild(overlay);

  // 3. 설정 모달 레이어 생성
  const modal = document.createElement('div');
  modal.id = 'settings-modal';
  modal.style.cssText = 'display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:white; padding:25px; border:1px solid #ddd; border-radius:15px; z-index:2000; box-shadow:0 4px 15px rgba(0,0,0,0.2); width:80%; max-width:800px; max-height:90vh; overflow-y:auto;';

  const initialIdx = timeOptions.indexOf(learningTime) !== -1 ? timeOptions.indexOf(learningTime) : 3;

  const hr = '<hr style="border:0; border-top:1px solid #eee; margin:20px 0;">';

  modal.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom: 2px solid #f4f4f4; padding-bottom:10px;">
      <h3 style="margin:0">학습 설정</h3>
      <div style="cursor:pointer; font-size:28px; line-height:1;" onclick="toggleSettings()">&times;</div>
    </div>
    
    <div style="margin-bottom:15px">
      <label style="display:block; margin-bottom:10px; font-weight:bold;">목표 학습 시간:</label>
      <div style="display:flex; align-items:center; gap:15px;">
        <input type="range" id="time-slider" min="0" max="3" step="1" value="${initialIdx}" 
               style="flex:1; cursor:pointer;" oninput="updateTimeFromSlider(this.value)">
        <span id="time-val-display" style="font-weight:bold; min-width:30px; text-align:right;">${learningTime}</span>s
      </div>
    </div>
    ${hr}
    <div style="margin-bottom:20px; padding:15px; background:#f9f9f9; border-radius:10px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:10px;">
        <span style="font-weight:bold; font-size:14px;">최근 일주일 학습량</span>
        <span style="font-size:12px; color:#666;">총 학습: <span id="total-study-time" style="font-weight:bold; color:#4a90e2;">0분</span></span>
      </div>
      <div id="study-chart-container" style="display:flex; align-items:flex-end; gap:8px; height:100px; padding-top:10px;">
        <!-- 차트 막대들이 이곳에 렌더링됩니다 -->
      </div>
    </div>
    ${hr}
    <div style="display: flex; flex-direction: row; align-items: center; justify-content: space-between;">
      <div style="font-size:14px; color:#444;">
        <p>진행률: <span id="settings-active-count">0 / ${totalStandardHiraganaCount} (0.0%)</span></p>
      </div>
      <div style="text-align:right;">
        <button onclick="renderProgressPage()" style="background:#4a90e2; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer;">개별 진도 확인</button>
      </div>
    </div>
    ${hr}
    <div style="font-size: 13px; color: #555;">
      <h4 style="margin: 0 0 10px 0; color: #333;">개인화 설정값</h4>
      <div id="personalized-settings-list" style="line-height: 1.6;">
        <!-- 시스템 가중치 정보가 여기에 표시됩니다 -->
      </div>
      <div style="margin-top: 20px; border-top: 1px dashed #ddd; padding-top: 15px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <h4 style="margin:0; color:#333; font-size:13px;">응답 속도 분포 <span style="font-weight:normal; font-size:11px;">(<span style="color:#4CAF50;">■</span>전체 <span style="color:#FF0000;">━</span>최근10 <span style="color:#0000FF;">━</span>최근5)</span></h4>
          <span id="avg-response-time" style="font-size:11px; color:#666; font-weight:bold;">평균반응속도: 0.0초 → 0.0초 → 0.0초</span>
        </div>
        <div id="response-time-chart" style="display:flex; align-items:flex-end; gap:1px; height:60px; background:#f0f0f0; border-radius:4px; overflow:visible; position:relative;"></div>
        <div style="display:flex; justify-content:space-between; font-size:9px; color:#aaa; margin-top:3px;"><span>0s</span><span>1s</span><span>2s</span><span>3s</span><span>4s</span><span>5s+</span></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

window.updateTimeFromSlider = (idx) => {
  learningTime = timeOptions[idx];
  document.getElementById('time-val-display').innerText = learningTime;
  const timerText = document.getElementById('timer-text');
  if (timerText && !timerInterval) timerText.innerText = learningTime + 's';
};

function toggleSettings() {
  const modal = document.getElementById('settings-modal');
  const overlay = document.getElementById('settings-overlay');
  const isOpening = modal.style.display === 'none';

  modal.style.display = isOpening ? 'block' : 'none';
  overlay.style.display = isOpening ? 'block' : 'none';

  if (isOpening) {
    const learnedCount = ENGINE.activePool.length;
    const percentage = totalStandardHiraganaCount > 0 ? ((learnedCount / totalStandardHiraganaCount) * 100).toFixed(1) : 0;
    document.getElementById('settings-active-count').innerText = `${learnedCount} / ${totalStandardHiraganaCount} (${percentage}%)`;

    renderStudyStats();

    // 개인화 설정값 표시 업데이트
    const config = ENGINE.CONFIG;
    const listContainer = document.getElementById('personalized-settings-list');
    if (listContainer) {
      listContainer.innerHTML = `
        <div style="margin-top:8px;"><b>• 기억 감쇠 (DECAY_FACTOR):</b> <span style="color:#4CAF50; font-weight:bold;">${config.DECAY_FACTOR.toFixed(2)}</span><br>
        &nbsp;&nbsp;<small>최근 학습 데이터를 과거 데이터보다 얼마나 더 중요하게 여길지 결정합니다.</small></div>
        <p style="margin-top:10px; font-size:11px; color:#999; border-top:1px dashed #ddd; padding-top:5px;">* 이 수치들은 학습 패턴에 따라 시스템이 실시간으로 자동 최적화합니다.</p>
      `;
    }

    renderResponseTimeChart();
  }
}

/**
 * 정답 응답 속도에 대한 누적 빈도 그래프를 렌더링합니다.
 */
async function renderResponseTimeChart() {
  const container = document.getElementById('response-time-chart');
  const avgDisplay = document.getElementById('avg-response-time');
  if (!container) return;

  const allData = await getAllProgress();
  const correctBins = new Array(51).fill(0);
  const recent5Bins = new Array(51).fill(0);
  const recent10Bins = new Array(51).fill(0);
  let totalCorrectCount = 0;
  let recent5Count = 0;
  let recent10Count = 0;

  Object.values(allData).forEach(data => {
    const attempts = data.total_attempts || 0;
    const limit = Math.min(attempts, 100);
    let foundInThisChar = 0;

    // 각 글자별 링 버퍼 역순(최신순) 탐색
    for (let i = 0; i < limit; i++) {
      const idx = (data.head - i + 100) % 100;
      const isCorrect = data.results && data.results[idx] === 1;
      const ms = data.speeds ? data.speeds[idx] : 0;
      const binIndex = Math.min(Math.floor(ms / 100), 50);

      if (isCorrect) {
        correctBins[binIndex]++;
        totalCorrectCount++;

        // 글자별 최근 5개/10개 수집
        if (foundInThisChar < 5) {
          recent5Bins[binIndex]++;
          recent5Count++;
        }
        if (foundInThisChar < 10) {
          recent10Bins[binIndex]++;
          recent10Count++;
        }
        foundInThisChar++;
      }
    }
  });

  // 데이터 유무 로그 출력
  if (totalCorrectCount > 0 && recent5Count === 0) {
    console.log("Recent 5/10 data: 각 글자별 정답 데이터가 부족하여 그래프가 0으로 표기될 수 있습니다.");
  } else {
    console.log(`통계 확인 - 전체정답: ${totalCorrectCount}, 최근5합계: ${recent5Count}, 최근10합계: ${recent10Count}`);
  }

  if (avgDisplay) {
    const calculateMedianSec = (bins, total) => {
      if (total === 0) return "0.0";
      let sum = 0;
      const idx = bins.findIndex(count => {
        sum += count;
        return sum >= total * 0.5;
      });
      return (idx * 0.1).toFixed(1);
    };

    const medianSec = calculateMedianSec(correctBins, totalCorrectCount);
    const recent10MedianSec = calculateMedianSec(recent10Bins, recent10Count);
    const recent5MedianSec = calculateMedianSec(recent5Bins, recent5Count);

    avgDisplay.innerText = `평균반응속도: ${medianSec}초 → ${recent10MedianSec}초 → ${recent5MedianSec}초`;

    const maxCorrectFreq = Math.max(...correctBins, 1);
    const maxRecent5Freq = Math.max(...recent5Bins, 1);
    const maxRecent10Freq = Math.max(...recent10Bins, 1);

    // 전체 데이터 50% 지점 인덱스 (막대 색상 강조용)
    let curSum = 0;
    const fiftyPercentIdx = correctBins.findIndex(c => (curSum += c) >= totalCorrectCount * 0.5);

    // 꺾은선 그래프 좌표 생성: 각 bin의 가로 중앙에 점을 배치
    const getLinePoints = (bins, max) => bins.map((v, i) => ({
      x: ((i + 0.5) / 51) * 100,
      y: 100 - (v / max) * 100
    }));

    const r10Data = getLinePoints(recent10Bins, maxRecent10Freq);
    const r5Data = getLinePoints(recent5Bins, maxRecent5Freq);

    const barHtml = correctBins.map((cVal, idx) => {
      const cHeight = (cVal / maxCorrectFreq) * 100;
      const isFiftyPercent = idx === fiftyPercentIdx && totalCorrectCount > 0;
      const bgColor = isFiftyPercent ? '#2196F3' : '#4CAF50';
      const timeLabel = idx === 50 ? "5.0s 이상" : (idx * 0.1).toFixed(1) + "s";
      return `<div title="${timeLabel} (전체: ${cVal}, 최근10: ${recent10Bins[idx]}, 최근5: ${recent5Bins[idx]})" 
                   style="flex:1; height:${cHeight}%; background:${bgColor}; min-width:1px;"></div>`;
    }).join('');

    const svgHtml = `
  <svg viewBox="0 0 100 100" preserveAspectRatio="none" 
       style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; overflow:visible;">
    
    <polyline points="${r10Data.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}" 
              fill="none" stroke="#ff0000" stroke-width="1" stroke-linejoin="round" opacity="1" vector-effect="non-scaling-stroke" />

    <polyline points="${r5Data.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}" 
              fill="none" stroke="#0000ff" stroke-width="1" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
  </svg>
`;

    container.innerHTML = barHtml + svgHtml;
  }
}

async function renderStudyStats() {
  const stats = await getStudyStats();
  const container = document.getElementById('study-chart-container');
  const totalDisplay = document.getElementById('total-study-time');
  if (!container) return;

  // 총합 표시 (초 -> 분/초)
  const totalMin = Math.floor(stats.total / 60);
  const totalSec = stats.total % 60;
  totalDisplay.innerText = totalMin > 0 ? `${totalMin}분 ${totalSec}초` : `${totalSec}초`;

  // 최근 7일 날짜 생성
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }

  const maxSec = Math.max(...days.map(d => stats.history[d] || 0), 1);

  container.innerHTML = days.map(day => {
    const sec = stats.history[day] || 0;
    const height = (sec / maxSec) * 100;
    const label = day.slice(5); // MM-DD
    return `
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end;">
        <div title="${sec}초" style="width:100%; max-width:30px; height:${height}%; background:#4a90e2; border-radius:4px 4px 0 0; min-height:2px;"></div>
        <div style="font-size:9px; margin-top:5px; color:#999; white-space:nowrap;">${label}</div>
      </div>
    `;
  }).join('');
}

function pauseGame() {
  if (timerInterval && !isTimeUp) {
    clearInterval(timerInterval);
    isPaused = true;
    if (confirm("잠시 정지되었습니다. 취소하고 나갈까요?\n[확인]: 학습중단, [취소]: 계속진행")) {
      showStartButton();
    } else {
      isPaused = false;
      resumeTimer();
    }
  }
}

function resumeTimer() {
  timerInterval = setInterval(tick, 1000);
  isGamePaused = false; // 타이머 재개 시 일시정지 상태 해제
  updateTimerUI(); // UI 즉시 업데이트
}

// 오답 아이콘 클릭 시 진도 확인 페이지 열기
async function openProgressFromHistory(char) {
  pauseTimerOnly(); // 타이머 일시정지 (프롬프트 없이)
  await renderProgressPage(); // 진도 확인 페이지 열기
  // TODO: 특정 문자로 스크롤하거나 강조하는 로직 추가 가능
}

/**
 * 전체 학습 데이터를 초기화하고 첫 상태로 되돌립니다.
 */
window.resetAllProgressData = async () => {
  if (confirm("모든 학습 데이터와 통계가 삭제됩니다. 정말 초기화하시겠습니까?")) {
    await resetAllProgress(); // DB 데이터 삭제

    // 엔진 상태 리셋
    ENGINE.activePool = [];
    ENGINE.recentResults = [];
    await ENGINE.initPool(); // 기본 풀 재구성

    showStartButton(); // 메인 화면으로 복귀 (오버레이 자동 제거)
  }
};

function startTimer() {
  timeLeft = learningTime;
  isTimeUp = false;
  isGamePaused = false; // 새 타이머 시작 시 일시정지 상태 초기화
  updateTimerUI();

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(tick, 1000);
}

function tick() {
  timeLeft--;
  if (timeLeft <= 0) {
    clearInterval(timerInterval);
    isTimeUp = true;

    if (isTimeUp) {
      // 1. 학습 시간 기록
      updateDailyStudyTime(learningTime);

      // 2. 평균 반응 속도 통계 계산 및 기록
      const correctAttempts = sessionHistory.filter(h => h.isCorrect);
      if (correctAttempts.length > 0) {
        const calcAvg = (arr) => arr.reduce((a, b) => a + b.speed, 0) / arr.length;

        const avgAll = calcAvg(correctAttempts);
        const avgR10 = calcAvg(correctAttempts.slice(-10));
        const avgR5 = calcAvg(correctAttempts.slice(-5));

        updateDailyStats(avgAll, avgR10, avgR5);
      }
    }

    const timerText = document.getElementById('timer-text');
    if (timerText) timerText.innerText = "마지막 문제!";
    const timerBar = document.getElementById('timer-bar');
    if (timerBar) timerBar.style.width = '100%';
  } else {
    updateTimerUI();
  }
}

function updateTimerUI() {
  const timerBar = document.getElementById('timer-bar');
  const timerText = document.getElementById('timer-text');
  if (timerBar && timerText) {
    const percentage = ((learningTime - timeLeft) / learningTime) * 100;
    timerBar.style.width = percentage + '%';
    timerText.innerText = timeLeft + 's';
  }
}

/**
 * 시작 버튼을 화면에 출력합니다.
 */
function showStartButton() {
  const optionsContainer = document.getElementById('options');
  const audioBtn = document.getElementById('audio-trigger');

  // 진행 상황 오버레이가 열려있다면 제거
  const existingOverlay = document.getElementById('progress-overlay');
  if (existingOverlay) existingOverlay.remove();

  // 1. 초기 UI 정리 (오디오 버튼 숨김 등)
  if (audioBtn) audioBtn.style.display = 'none';

  // 타이머 관련 초기화
  if (timerInterval) clearInterval(timerInterval);
  const timerBar = document.getElementById('timer-bar');
  isGamePaused = false; // 시작 버튼 화면으로 돌아올 때 일시정지 상태 초기화
  const timerText = document.getElementById('timer-text');
  if (timerBar) timerBar.style.width = '0%';
  if (timerText) timerText.innerText = learningTime + 's';
  if (document.getElementById('weight-display')) document.getElementById('weight-display').innerText = '';
  ENGINE.lastAddedChar = null; // 추가 문자 기록 초기화
  ENGINE.recentResults = []; // 새 학습 세션 시작 시 난이도 조절용 정답 기록 초기화

  // 히스토리 초기화
  sessionHistory = [];
  const historyBar = document.getElementById('history-bar');
  if (historyBar) historyBar.innerHTML = '';

  // 너비 설정 초기화
  optionsContainer.style.width = '';
  optionsContainer.style.maxWidth = '';
  optionsContainer.innerHTML = '';

  // 2. 시작 버튼 생성
  const startBtn = document.createElement('button');
  startBtn.className = 'option-btn';
  startBtn.innerText = '시작하기';
  startBtn.style.width = '100%';
  startBtn.style.padding = '20px';

  startBtn.onclick = () => {
    warmUpAudio(); // 음성 엔진 예열
    if (audioBtn) audioBtn.style.display = 'inline-block'; // 오디오 버튼 다시 표시
    startTimer(); // 타이머 시작
    renderQuestion(); // 실제 문제 시작 (내부에서 비동기 처리)
  };

  optionsContainer.appendChild(startBtn);
}

/**
 * 상단 히스토리 UI 업데이트
 */
function updateHistoryUI() {
  const container = document.getElementById('history-bar');
  if (!container) return;
  container.innerHTML = '';

  // 최근 5개만 추출하여 아이콘 생성
  sessionHistory.slice(-5).forEach(item => {
    const icon = document.createElement('div');
    icon.className = `result-icon ${item.isCorrect ? 'result-correct' : 'result-incorrect'}`;
    icon.innerText = item.char;
    if (!item.isCorrect) { // 오답 아이콘에만 클릭 이벤트 추가
      icon.style.cursor = 'pointer';
      icon.title = `${item.char} 다시 확인`;
      icon.onclick = () => openProgressFromHistory(item.char);
    }
    container.appendChild(icon);
  });
}

/**
 * 음성 엔진 예열: 첫 재생 시 소리가 안 나는 현상 방지
 */
function warmUpAudio() {
  if (!window.speechSynthesis) return;

  // 빈 문자열을 재생하여 엔진을 깨움
  const silentMsg = new SpeechSynthesisUtterance("");
  silentMsg.volume = 0;
  window.speechSynthesis.speak(silentMsg);
  window.speechSynthesis.getVoices(); // 목소리 목록 로드 강제 호출
}

/**
 * 학습 진도표 페이지 렌더링
 */
async function renderProgressPage() {
  // 설정 모달이 열려있다면 닫기
  const settingsModal = document.getElementById('settings-modal');
  const settingsOverlay = document.getElementById('settings-overlay'); // 설정 오버레이도 함께 닫기
  if (settingsModal) settingsModal.style.display = 'none';
  if (settingsOverlay) settingsOverlay.style.display = 'none';

  const optionsContainer = document.getElementById('options');
  optionsContainer.innerHTML = '<p>데이터를 불러오는 중...</p>';

  const allData = await getAllProgress();

  const rows = [
    ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ', 'ん'], // 행 시작점
    ['が', 'ざ', 'だ', 'ば', 'ぱ'] // 탁음/반탁음 시작점
  ];

  const cols = ['あ', 'い', 'う', 'え', 'お']; // 단(段)

  // 차트 생성을 위한 맵핑 (청음 46 + 탁음 20 + 반탁음 5)
  const hiraganaTable = [
    "あいうえお", "かきくけこ", "さしすせそ", "たちつてと", "なにぬねの", "はひふへほ", "まみむめも", "やゆよ", "らりるれろ", "わを", "ん",
    "がぎぐげご", "ざじずぜぞ", "だぢづでど", "ばびぶべぼ", "ぱぴぷぺぽ"
  ].map(s => s.split(''));

  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; position: sticky; top: -20px; background: white; padding: 20px 0 15px 0; z-index: 10; margin: -20px 0 15px 0; border-bottom: 1px solid #eee;">
      <h2 style="margin:0">학습 통계</h2>
      <div>
        <button id="btn-analysis" style="padding:5px 15px; background:#673ab7; color:white; border:none; border-radius:3px; cursor:pointer; margin-right:5px;">분석</button>
        <button onclick="resetAllProgressData()" style="padding:5px 15px; background:#f44336; color:white; border:none; border-radius:3px; cursor:pointer; margin-right:5px;">초기화</button>
        <button onclick="showStartButton()" style="padding:5px 15px;">닫기</button>
      </div>
    </div>
    <div style="width:100%; overflow-x:auto;">
      <table id="progress-table" style="width:100%; border-collapse:collapse; font-size:12px; text-align:center; background:white; table-layout: fixed;">
  `;

  hiraganaTable.forEach(rowChars => {
    html += '<tr>';
    rowChars.forEach(char => {
      if (char === '_' || char === ' ') {
        html += '<td style="border:1px solid #eee; background:#f9f9f9;"></td>';
        return;
      }
      const code = char.charCodeAt(0).toString();
      const data = allData[code] || { total_attempts: 0, results: [], speeds: [] };
      const results = data.results || [];
      const speeds = data.speeds || [];

      // 최근 100회 기준 정답률 및 평균 속도 계산
      const attempts = Math.min(data.total_attempts, 100);
      const recentResults = results.slice(0, attempts);
      const recentSpeeds = speeds.slice(0, attempts);

      const accuracy = attempts > 0 ? (recentResults.reduce((a, b) => a + b, 0) / attempts * 100).toFixed(0) : 0;
      const avgSpeed = attempts > 0 ? (recentSpeeds.reduce((a, b) => a + b, 0) / attempts).toFixed(0) : 0;

      // 가중치 계산 및 색상 결정
      const weight = ENGINE.calculateWeight(data);
      // Hue: 120(초록) -> 0(빨강). 가중치 1~10 범위를 매핑
      const hue = Math.max(0, 120 - (weight - 1) * (120 / 9));
      const weightColor = `hsl(${hue}, 80%, 90%)`;

      html += `
        <td class="progress-cell" data-weight-color="${weightColor}" style="border:1px solid #ddd; padding:5px; width:18%; transition: background 0.3s;">
          <div style="font-size:1.4rem; font-weight:bold;">${char}</div>
          <div class="stat-normal" style="color:#666; font-size:10px;">
            ${data.total_attempts}회<br>
            ${accuracy}%<br>
            ${avgSpeed}ms
          </div>
          <div class="stat-analysis" style="display:none; color:#d32f2f; font-weight:bold; font-size:11px;">
            가중치:<br>${weight.toFixed(2)}
          </div>
        </td>
      `;
    });
    html += '</tr>';
  });

  html += `</table></div>`;

  // 오버레이(배경) 엘리먼트 생성 및 스타일 설정
  const overlay = document.createElement('div');
  overlay.id = 'progress-overlay';
  overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:3000; display:flex; align-items:center; justify-content:center;';

  const contentContainer = document.createElement('div');
  contentContainer.style.cssText = 'background:white; padding:20px; border-radius:10px; width:90%; max-width:600px; max-height:80vh; overflow-y:auto; box-shadow: 0 4px 15px rgba(0,0,0,0.3);';
  contentContainer.innerHTML = html;

  overlay.appendChild(contentContainer);
  document.body.appendChild(overlay);

  // 분석 버튼 이벤트 바인딩
  const analysisBtn = document.getElementById('btn-analysis');
  const table = document.getElementById('progress-table');
  const cells = document.querySelectorAll('.progress-cell');

  let isAnalysisMode = false; // 분석 모드 토글 상태

  analysisBtn.onclick = () => {
    isAnalysisMode = !isAnalysisMode;
    if (isAnalysisMode) {
      analysisBtn.innerText = '현황'; // 분석 모드일 때는 '현황'으로 버튼 텍스트 변경
      table.classList.add('analysis-active');
      cells.forEach(cell => {
        cell.style.backgroundColor = cell.getAttribute('data-weight-color');
      });
    } else {
      analysisBtn.innerText = '가중치'; // 현황 모드일 때는 '가중치'로 버튼 텍스트 변경
      table.classList.remove('analysis-active');
      cells.forEach(cell => {
        cell.style.backgroundColor = 'white';
      });
    }
  };
}

async function renderQuestion() {
  // 엔진으로부터 정답과 보기를 한 번에 가져와서 동기화 문제를 방지
  const { target, options } = await ENGINE.generateQuestion();

  // 가중치(확률) 표시
  const dbData = await getAllProgress();
  const targetData = dbData[target] || { total_attempts: 0, results: [], speeds: [] };
  const weight = ENGINE.calculateWeight(targetData);

  // 전체 세션 정확도 계산 (n = 지금까지 푼 전체 문제 수)
  const sessionTotal = sessionHistory.length;
  const sessionCorrect = sessionHistory.filter(h => h.isCorrect).length;
  const sessionAccuracy = sessionTotal > 0 ? (sessionCorrect / sessionTotal * 100).toFixed(0) : 0;

  let displayInfo = `현재 문제 가중치: ${weight.toFixed(2)} / 정확도: ${sessionCorrect} / ${sessionTotal} (${sessionAccuracy}%)`;

  // 새 문자가 추가되었다면 표시
  if (ENGINE.lastAddedChar) {
    displayInfo += ` / 추가된 문자: ${ENGINE.lastAddedChar}`;
  }

  document.getElementById('weight-display').innerText = displayInfo;

  const audioBtn = document.getElementById('audio-trigger');
  const optionsContainer = document.getElementById('options');

  // 1. 기존 버튼 싹 비우기 (중복 방지)
  optionsContainer.innerHTML = '';

  // 2. 소리 재생 함수 정의
  const playTargetSound = () => {
    if (!window.speechSynthesis) return;

    // 진행 중인 모든 음성 취소 (겹침 방지)
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(ENGINE.toChar(target));
    utterance.lang = 'ja-JP';
    utterance.rate = 0.9; // 너무 빠르면 잘 안 들릴 수 있으므로 약간 느리게

    // 에러 핸들링 추가
    utterance.onerror = (e) => console.error("TTS 재생 오류:", e);

    window.speechSynthesis.speak(utterance);
  };

  // 3. 다시 듣기 버튼(스피커 아이콘)에 함수 바인딩
  audioBtn.onclick = playTargetSound;

  // 4. 문제 시작 시 자동 음성 출력
  playTargetSound();

  // 5. 문제 시작 시간 기록
  questionStartTime = Date.now();

  // 6. 선택지 버튼 동적 생성
  options.forEach(code => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerText = ENGINE.toChar(code);

    // 중요: 인덱스가 아니라 '유니코드 값' 자체를 넘깁니다.
    btn.onclick = () => checkAnswer(code, target);
    optionsContainer.appendChild(btn);
  });

  // 설정창 내부 정보 업데이트 (창이 닫혀있더라도 데이터 갱신)
  if (document.getElementById('settings-active-count')) {
    document.getElementById('settings-active-count').innerText = ENGINE.activePool.length;
  }
}

async function checkAnswer(selected, correct) {
  // [테스트 코드 시작]
  // console.group("--- Answer Check ---");
  // console.log("선택된 값(selected):", selected, typeof selected);
  // console.log("실제 정답(correct):", correct, typeof correct);
  // console.log("문자 변환 - 선택:", ENGINE.toChar(selected));
  // console.log("문자 변환 - 정답:", ENGINE.toChar(correct));
  // console.log("비교 결과:", Number(selected) === Number(correct));
  // console.groupEnd();
  // [테스트 코드 끝]
  // 숫자 대 숫자로 정확히 비교
  const isCorrect = Number(selected) === Number(correct);

  // 응답 속도 계산 (ms)
  const responseTime = Date.now() - questionStartTime;

  ENGINE.recentResults.push(isCorrect);
  sessionHistory.push({ char: ENGINE.toChar(correct), isCorrect, speed: responseTime });
  updateHistoryUI();

  // DB 업데이트 (정답여부와 속도 전달)
  updateProgress(correct.toString(), isCorrect, responseTime, ENGINE.expectedWeight);

  if (isCorrect) {
    if (isTimeUp) {
      showStartButton(); // 마지막 문제를 맞히면 종료
    } else {
      await renderQuestion(); // 시간 남았으면 다음 문제
    }
  }
}