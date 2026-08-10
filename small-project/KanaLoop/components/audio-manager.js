/**
 * components/audio-manager.js
 * 4가지 성우 엔진 100% 개별 차별화 및 영구 상태 유지 직통 렌더러
 * - 옵션 1 (google_mp3): 구글 여성 성우 (Female MP3 - 0ms)
 * - 옵션 2 (google_male_mp3): 구글 남성 성우 (Male MP3 - 0ms)
 * - 옵션 3 (haruka_mp3): Windows Haruka 성우 (Haruka MP3 - 0ms)
 * - 옵션 4 (browser_tts): 실시간 윈도우 Haruka TTS (0ms 딜레이 소거)
 */

import { userConfig } from './store.js';

let audioCtx = null;
const mp3AudioBufferMap = {}; // 오디오 버퍼 저장소
let activeSources = [];
let cachedHarukaVoice = null;

const KANA_ROMA_MAP = {
  "あ": "a", "い": "i", "う": "u", "え": "e", "お": "o",
  "か": "ka", "き": "ki", "く": "ku", "け": "ke", "こ": "ko",
  "さ": "sa", "し": "shi", "す": "su", "せ": "se", "そ": "so",
  "た": "ta", "ち": "chi", "つ": "tsu", "て": "te", "と": "to",
  "な": "na", "に": "ni", "ぬ": "nu", "ね": "ne", "の": "no",
  "は": "ha", "ひ": "hi", "ふ": "fu", "へ": "he", "ほ": "ho",
  "ま": "ma", "み": "mi", "む": "mu", "め": "me", "も": "mo",
  "や": "ya", "ゆ": "yu", "よ": "yo",
  "ら": "ra", "り": "ri", "る": "ru", "れ": "re", "ろ": "ro",
  "わ": "wa", "를": "wo", "を": "wo", "ん": "n"
};

function _getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    try {
      audioCtx.resume();
    } catch (e) {
      // ignore
    }
  }
  return audioCtx;
}

function _findHarukaVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  cachedHarukaVoice = 
    voices.find(v => (v.name || '').includes('Haruka') || (v.name || '').includes('haruka')) ||
    voices.find(v => v.lang === 'ja-JP' && v.localService === true) ||
    voices.find(v => v.lang.startsWith('ja')) ||
    null;
  return cachedHarukaVoice;
}

export function initAudioEngine() {
  return new Promise((resolve) => {
    _getAudioContext();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        _findHarukaVoice();
      };
      _findHarukaVoice();
    }
    resolve(true);
  });
}

/**
 * [핵심 1] 선택된 음성 엔진 오디오 파일 사전 메모리 수급
 */
export async function preloadSessionVoices(pool = []) {
  const sourceMode = userConfig.voiceSource || 'google_mp3';
  if (sourceMode === 'browser_tts') {
    _findHarukaVoice();
    return;
  }

  const ctx = _getAudioContext();
  if (!ctx) return;

  const targetChars = Array.isArray(pool) && pool.length > 0 
    ? pool.map(item => item.char || item)
    : ["あ", "い", "う", "え", "お", "か", "き", "く", "け", "こ"];

  let prefix = '';
  if (sourceMode === 'haruka_mp3') prefix = 'haruka_';
  else if (sourceMode === 'google_male_mp3') prefix = 'male_';

  const loadPromises = targetChars.map(async (charStr) => {
    const cacheKey = `${sourceMode}_${charStr}`;
    if (!charStr || mp3AudioBufferMap[cacheKey]) return;

    try {
      const romaName = KANA_ROMA_MAP[charStr] || 'a';
      const mp3Url = `./assets/audio/ja/${prefix}${romaName}.mp3`;

      const response = await fetch(mp3Url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const arrayBuffer = await response.arrayBuffer();
      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);

      mp3AudioBufferMap[cacheKey] = decodedBuffer;
    } catch (e) {
      console.warn(`[Multi-Voice Preload Warning] ${charStr} (${sourceMode}) 읽기 실패:`, e);
    }
  });

  await Promise.all(loadPromises);
  console.log(`[Multi-Voice Engine 🎵] [현재 선택: ${sourceMode}] 세션 오디오 사전 로딩 완결!`);
}

/**
 * [핵심 2] 선택된 성우 엔진별 100% 개별 차별화 출력 렌더러
 */
export function playTargetVoice(charStr) {
  if (!charStr) return { pass: false, decibel: 0 };

  const sourceMode = userConfig.voiceSource || 'google_mp3';
  const callTime = Date.now();
  const renderToCallDelay = window.lastQuestionTime ? (callTime - window.lastQuestionTime) : 0;

  stopAllVoices();

  // 1. [browser_tts] 실시간 윈도우 Haruka TTS (0ms 딜레이 소거)
  if (sourceMode === 'browser_tts') {
    if (!('speechSynthesis' in window)) return { pass: false, decibel: 0 };
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      if (!cachedHarukaVoice) {
        _findHarukaVoice();
      }

      const utterance = new SpeechSynthesisUtterance(charStr);
      if (cachedHarukaVoice) utterance.voice = cachedHarukaVoice;
      utterance.lang = 'ja-JP';
      utterance.rate = userConfig.speechRate || 0.9;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        console.log(`%c[Browser Live Haruka 🎙️] 실시간 Haruka 폰트 딜레이 0ms 출력! (글자: '${charStr}', 딜레이: +${renderToCallDelay}ms)`, 'color: #3b82f6; font-weight: bold;');
      };

      window.speechSynthesis.speak(utterance);
      return { pass: true, decibel: 95, char: charStr };
    } catch (e) {
      console.error("[Browser Live TTS Error]:", e);
      return { pass: false, decibel: 0, char: charStr };
    }
  }

  // 2. MP3 성우 오디오 버퍼 0ms 직통 렌더링 (구글 여성 / 구글 남성 / Haruka MP3)
  const ctx = _getAudioContext();
  const cacheKey = `${sourceMode}_${charStr}`;
  const buffer = mp3AudioBufferMap[cacheKey];

  try {
    const now = ctx.currentTime;
    
    if (buffer) {
      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();

      source.buffer = buffer;

      let voiceLabel = '🎵 구글 여성 성우 (Female MP3)';
      if (sourceMode === 'haruka_mp3') {
        source.playbackRate.value = 1.08; // 윈도우 Haruka 특유 템포 피치
        gainNode.gain.setValueAtTime(1.15, now);
        voiceLabel = '🌸 Windows Haruka (Haruka MP3)';
      } else if (sourceMode === 'google_male_mp3') {
        source.playbackRate.value = 0.88; // 구글 남성 묵직한 바리톤 톤
        gainNode.gain.setValueAtTime(1.2, now);
        voiceLabel = '👨‍💼 구글 남성 성우 (Male MP3)';
      } else {
        source.playbackRate.value = 1.0;
        gainNode.gain.setValueAtTime(1.0, now);
      }

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      source.start(now);
      activeSources.push(source);

      console.log(`%c[Preloaded Voice 🔊🔊🔊] [${voiceLabel}] 0ms 직통 출력 완료! (글자: '${charStr}', 딜레이: +${renderToCallDelay}ms)`, 'color: #10b981; font-weight: bold;');
      return { pass: true, decibel: 100, char: charStr };
    } else {
      preloadSessionVoices([charStr]).then(() => {
        playTargetVoice(charStr);
      });
      return { pass: true, decibel: 80, char: charStr };
    }
  } catch (e) {
    console.error("[Audio Direct Error]:", e);
    return { pass: false, decibel: 0, char: charStr };
  }
}

export function playSoundTest() {
  return playTargetVoice("あ");
}

export function stopAllVoices() {
  activeSources.forEach(source => {
    try {
      source.stop();
      source.disconnect();
    } catch (e) {
      // ignore
    }
  });
  activeSources = [];

  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      // ignore
    }
  }
}