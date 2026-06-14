/*
 * store.js
 * 사용자 설정 저장 및 반영
 */

export const userConfig = {
  learningTime: 60,
  MAX_POOL_SIZE: 10,
  autoProgress: true,
  speechRate: 0.85,
  currentDomain: 'hira'
};

export const TIME_STEPS = [20, 30, 40, 50, 60, 90];
export const SPEECH_STEPS = [0.5, 0.7, 0.85, 1.0, 1.5, 2.0];

window.updateTimeFromSlider = updateTimeFromSlider;
window.updateSpeechFromSlider = updateSpeechFromSlider;

export function updateTimeFromSlider(val) {
  const targetTime = TIME_STEPS[val] || 60;
  userConfig.learningTime = targetTime;

  const display = document.getElementById('time-val-display');
  if (display) display.innerText = targetTime;
}

export function updateSpeechFromSlider(val) {
  const targetSpeed = SPEECH_STEPS[val] || 0.85;
  userConfig.speechRate = targetSpeed;

  const display = document.getElementById('speech-val-display');
  if (display) display.innerText = targetSpeed;
}