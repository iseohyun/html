/**
 * components/audio-manager.js
 * Web Speech API(TTS) 전담 제어 및 음성 합성 보완 모듈
 */

import { userConfig } from './store.js';

const AUDIO_CONFIG_MAP = {
  hira: { text: "ボリュームテスト", lang: "ja-JP" },
  kata: { text: "ボリュームテスト", lang: "ja-JP" },
  hangle: { text: "볼륨 테스트", lang: "ko-KR" },
  english: { text: "volume test", lang: "en-US" },
  ENGLISH: { text: "volume test", lang: "en-US" }
};

let audioCache = {};

// ===========================================================================
// [최상단 진입점 보장 관문] 앱 구동 초기화 시 딱 한 번 대기 유도
// ===========================================================================

/**
 * 어플리케이션 초기 로드 시점 전용: TTS 엔진 가동 및 목소리 완전 안착 보장 함수
 * @returns {Promise<boolean>} API 가용 및 로드 성공 여부 플래그
 */
export function initAudioEngine() {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      console.warn("[TTS Critical] 이 브라우저는 Web Speech API를 지원하지 않습니다.");
      return resolve(false);
    }

    const triggerWarmUp = () => {
      // 빈 음절을 볼륨 0으로 재생하여 오디오 컨텍스트 동적 활성화(웜업 완결)
      const silentUtterance = new SpeechSynthesisUtterance("");
      silentUtterance.volume = 0;
      window.speechSynthesis.speak(silentUtterance);
      resolve(true);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      triggerWarmUp();
    } else {
      // 보관함이 비어있다면 로딩 완료 통지 신호(Flag)가 올 때 딱 한 번만 캐치하여 해제
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null; // 이벤트 단발성 소비 처리
        triggerWarmUp();
      };
    }
  });
}

// ===========================================================================
// 코어 비즈니스 로직 함수 레이어 (해당 조건 체크 생략)
// ===========================================================================

/**
 * 현재 활성화된 도메인에 매치되는 최적의 다국어 목소리 객체 도출 내부 헬퍼
 */
function _getBestVoice() {
  const voices = window.speechSynthesis.getVoices();
  const currentDomain = userConfig.currentDomain || 'hira';
  const targetLang = AUDIO_CONFIG_MAP[currentDomain]?.lang || 'ja-JP';

  return voices.find(v => v.lang === targetLang && v.name.includes('Google')) ||
    voices.find(v => v.lang === targetLang) ||
    null;
}

/**
 * 세션 시작 시 10개 단어의 TTS 객체를 메모리에 선행 배치 (지연 속도 해제)
 */
export function preloadSessionVoices(sessionPool) {
  audioCache = {};

  const currentDomain = userConfig.currentDomain || 'hira';
  const targetLang = AUDIO_CONFIG_MAP[currentDomain]?.lang || 'ja-JP';
  const matchedVoice = _getBestVoice();

  sessionPool.forEach(item => {
    const utterance = new SpeechSynthesisUtterance(item.char);
    if (matchedVoice) utterance.voice = matchedVoice;
    utterance.lang = targetLang;
    utterance.rate = userConfig.speechRate || 0.85;

    audioCache[item.char] = utterance;
  });

  console.log(`[TTS Cache] ${currentDomain} 도메인 퀴즈용 발음 객체 프리로드 완결.`);
}

/**
 * 프리로드된 오디오 객체를 추적하여 딜레이 없이 큐에 주입
 */
export function playTargetVoice(charStr) {
  window.speechSynthesis.cancel(); // 적체 큐 즉시 클리어

  const utterance = audioCache[charStr] || new SpeechSynthesisUtterance(charStr);

  // 캐시에 없는 유실 항목 임시 생성 대응 시에도 정석 목소리 즉시 필터링 적용
  if (!audioCache[charStr]) {
    const matchedVoice = _getBestVoice();
    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang;
    }
    utterance.rate = userConfig.speechRate || 0.85;
  }

  window.speechSynthesis.speak(utterance);
}

/**
 * 사운드 환경 설정 테스트 전용 구동 인터페이스
 */
export function playSoundTest(currentDomain) {
  window.speechSynthesis.cancel();

  const domainKey = currentDomain || 'hira';
  const currentConf = AUDIO_CONFIG_MAP[domainKey] || AUDIO_CONFIG_MAP['hira'];
  const matchedVoice = _getBestVoice();

  const utterance = new SpeechSynthesisUtterance(currentConf.text);
  if (matchedVoice) utterance.voice = matchedVoice;
  utterance.lang = currentConf.lang;
  utterance.rate = userConfig.speechRate || 0.85;

  window.speechSynthesis.speak(utterance);
}

/**
 * 세션 종료 혹은 도메인 변경 시 가용 스피치 큐 강제 파괴 클리어
 */
export function stopAllVoices() {
  window.speechSynthesis.cancel();
}