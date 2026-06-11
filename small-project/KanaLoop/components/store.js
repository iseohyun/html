// components/store.js

// 1. 사용자 공학 기획 옵션 기본 상태
export const userConfig = {
  learningTime: 60,
  MAX_POOL_SIZE: 10,
  autoProgress: true,
  speechRate: 0.85,
  currentDomain: 'hira'
};

// 2. 내부 관리용 매핑 스텝 데이터 (상수 격리)
export const TIME_STEPS = [20, 30, 40, 50, 60, 90];
export const SPEECH_STEPS = [0.5, 0.7, 0.85, 1.0, 1.5, 2.0];

/**
 * 시간 변경 및 UI 동기화
 */
export function updateTimeFromSlider(val) {
  const targetTime = TIME_STEPS[val] || 60;
  userConfig.learningTime = targetTime;

  const display = document.getElementById('time-val-display');
  if (display) display.innerText = targetTime;
}

/**
 * 음성 속도 변경 및 UI 동기화
 */
export function updateSpeechFromSlider(val) {
  const targetSpeed = SPEECH_STEPS[val] || 0.85;
  userConfig.speechRate = targetSpeed;

  const display = document.getElementById('speech-val-display');
  if (display) display.innerText = targetSpeed;
}

// 3. [★핵심] HTML 인라인 온클릭/온인풋 연동을 위한 전역 스코프 강제 주입
window.updateTimeFromSlider = updateTimeFromSlider;
window.updateSpeechFromSlider = updateSpeechFromSlider;