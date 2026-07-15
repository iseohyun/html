/**
 * KakaoTalk Main Bootstrapper & Simulation Controller
 * Version: 0.0.10
 */

(function () {
  'use strict';

  let playInterval = null;
  let currentUtterance = null;
  let koreanVoices = [];
  let isAnimating = false; // 자동 재생 진행 활성화 플래그
  let ttsSafetyTimeout = null; // TTS 엔진 락 방지 타임아웃 가드

  function initKoreanVoices() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      koreanVoices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('ko'));
    }
  }

  if (typeof window !== 'undefined' && window.speechSynthesis) {
    initKoreanVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = initKoreanVoices;
    }
  }

  /**
   * UI 환경설정 값을 바탕으로 캔버스 엔진을 리렌더링
   * @param {boolean} resetAnimation 신규 말풍선 등장 애니메이션 시작 처리 여부
   */
  function triggerCanvasUpdate(resetAnimation) {
    if (!window.ChatEngine || !window.ChatInterface) return;

    const canvas = document.getElementById('chat-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const config = window.ChatInterface.gatherConfigFromUI();
    const text = window.ChatInterface.getChatInputVal();
    const { dialogs } = window.ChatInterface.parseInputText(text);
    const avatarSettingsMap = window.ChatInterface.getAvatarSettingsMap();

    const effectEl = document.querySelector('input[name="effect"]:checked');
    const effect = effectEl ? effectEl.value : 'opacity';

    const durationEl = document.getElementById('input-duration');
    const durationSec = durationEl ? parseFloat(durationEl.value) : 0.5;
    const durationMs = durationSec * 1000;

    if (resetAnimation && durationSec > 0) {
      window.ChatEngine.triggerAnimation(effect, durationMs);
    } else if (resetAnimation) {
      window.ChatEngine.stopAnimation();
    }

    window.ChatEngine.drawCanvasChat(canvas, ctx, config, dialogs, avatarSettingsMap);
  }

  /**
   * TTS 한국어 낭독 수행
   */
  function speakText(text, speaker, callback) {
    stopTTS();

    const cleanText = text.replace(/\\/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanText) {
      if (callback) callback();
      return;
    }

    currentUtterance = new SpeechSynthesisUtterance(cleanText);
    currentUtterance.lang = 'ko-KR';
    currentUtterance.rate = 1.0;

    const avatarMap = window.ChatInterface.getAvatarSettingsMap();
    const settings = avatarMap[speaker];
    if (settings && settings.voiceURI && koreanVoices.length > 0) {
      const targetVoice = koreanVoices.find(v => v.voiceURI === settings.voiceURI);
      if (targetVoice) {
        currentUtterance.voice = targetVoice;
      }
    }

    let hasCalledCallback = false;
    const fireCallbackOnce = () => {
      if (ttsSafetyTimeout) {
        clearTimeout(ttsSafetyTimeout);
        ttsSafetyTimeout = null;
      }
      if (!hasCalledCallback) {
        hasCalledCallback = true;
        if (callback) callback();
      }
    };

    currentUtterance.onend = () => {
      currentUtterance = null;
      fireCallbackOnce();
    };

    currentUtterance.onerror = () => {
      currentUtterance = null;
      fireCallbackOnce();
    };

    // 4초 세이프티 가드 타이머 구동 (브라우저 스피치 엔진 좀비 락 대응)
    ttsSafetyTimeout = setTimeout(() => {
      ttsSafetyTimeout = null;
      fireCallbackOnce();
    }, 4000);

    window.speechSynthesis.speak(currentUtterance);
  }

  function stopTTS() {
    if (ttsSafetyTimeout) {
      clearTimeout(ttsSafetyTimeout);
      ttsSafetyTimeout = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    currentUtterance = null;
  }

  /**
   * 시뮬레이션 자동 재생 시작
   */
  function startAnimation() {
    const btnPlay = document.getElementById('btn-play');
    const progressInput = document.getElementById('input-progress');
    const speedInput = document.getElementById('input-speed');
    if (!btnPlay || !progressInput || !speedInput) return;

    stopAnimation();
    isAnimating = true; // 재생 상태 켜기
    btnPlay.classList.add('playing');
    btnPlay.textContent = '■';

    let progress = parseInt(progressInput.value) || 0;
    const maxVal = parseInt(progressInput.max) || 100;

    if (progress >= maxVal) progress = 0;

    const runNextTick = () => {
      if (!isAnimating) return; // 정지 상태이면 중단

      if (progress >= maxVal) {
        progressInput.value = 0;
        const event = new Event('input', { bubbles: true });
        progressInput.dispatchEvent(event);
        stopAnimation();
        return;
      }

      progress += 1;
      progressInput.value = progress;
      const event = new Event('input', { bubbles: true });
      progressInput.dispatchEvent(event);
      triggerCanvasUpdate(true);

      // 마지막 렌더링된 화자 및 텍스트 낭독 수행
      const text = window.ChatInterface.getChatInputVal();
      const { dialogs } = window.ChatInterface.parseInputText(text);
      const visibleDialogs = dialogs.slice(0, progress);

      let lastText = '';
      let lastSpeaker = '';
      if (visibleDialogs.length > 0) {
        const lastItem = visibleDialogs[visibleDialogs.length - 1];
        if (lastItem.person && !lastItem.person.startsWith('=')) {
          lastText = lastItem.message;
          lastSpeaker = lastItem.person;
        }
      }

      const ttsChecked = document.getElementById('input-tts')?.checked;
      const speedSec = parseFloat(speedInput.value) || 0.5;
      const intervalMs = Math.max(50, speedSec * 1000); // 0~2초에 비례한 밀리초 간격 (0초일 때 50ms 최소 가드)

      if (ttsChecked && lastText) {
        speakText(lastText, lastSpeaker, () => {
          if (!isAnimating) return; // 비동기 취소 대응
          playInterval = setTimeout(runNextTick, intervalMs);
        });
      } else {
        playInterval = setTimeout(runNextTick, intervalMs);
      }
    };

    runNextTick();
  }

  /**
   * 시뮬레이션 자동 재생 정지
   */
  function stopAnimation() {
    const btnPlay = document.getElementById('btn-play');
    isAnimating = false; // 재생 상태 끄기
    if (playInterval) {
      clearTimeout(playInterval);
      playInterval = null;
    }
    stopTTS();
    if (btnPlay) {
      btnPlay.classList.remove('playing');
      btnPlay.textContent = '▶';
    }
  }

  // DOM 로드 및 초기화 수행 단독 기동 함수 (v0.1.1 2단계)
  function initKakaoTalkApp() {
    if (!window.ChatEngine || !window.ChatInterface) {
      console.error('필수 엔진/인터페이스 모듈이 로드되지 않았습니다.');
      return;
    }

    // 1. UI 인터페이스 기동 및 업데이트 콜백 주입
    window.ChatInterface.initInterface((resetAnim) => {
      triggerCanvasUpdate(resetAnim);
    });

    const canvas = document.getElementById('chat-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');

      // v0.1.0 피드백: 캔버스 내부 마우스 휠 스크롤 연동 (상단 헤더 고정 본문 스크롤)
      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (window.ChatEngine) {
          const scrollSpeed = 0.8;
          const maxScroll = window.ChatEngine.getMaxScrollY();
          let currentTarget = window.ChatEngine.getTargetScrollY();
          currentTarget = Math.min(maxScroll, Math.max(0, currentTarget + e.deltaY * scrollSpeed));
          window.ChatEngine.setTargetScrollY(currentTarget);
          triggerCanvasUpdate(false);
        }
      }, { passive: false });

      // 2. 캔버스 60fps 렌더 루프 개시
      window.ChatEngine.startRenderLoop(
        () => window.ChatEngine.isAnimActive(),
        () => {
          const config = window.ChatInterface.gatherConfigFromUI();
          const text = window.ChatInterface.getChatInputVal();
          const { dialogs } = window.ChatInterface.parseInputText(text);
          const avatarSettingsMap = window.ChatInterface.getAvatarSettingsMap();
          window.ChatEngine.drawCanvasChat(canvas, ctx, config, dialogs, avatarSettingsMap);
        }
      );
    }

    // 3. 재생, 이전/이후 한 스텝 컨트롤 버튼 이벤트 추가 바인딩
    const btnPrev = document.getElementById('btn-prev');
    const btnPlay = document.getElementById('btn-play');
    const btnStep = document.getElementById('btn-step');
    const progressInput = document.getElementById('input-progress');

    if (btnPrev && progressInput) {
      btnPrev.addEventListener('click', () => {
        if (btnPlay?.classList.contains('playing')) return;

        let val = parseInt(progressInput.value) || 0;
        if (val > 0) {
          val -= 1;
          progressInput.value = val;
          const event = new Event('input', { bubbles: true });
          progressInput.dispatchEvent(event);
          triggerCanvasUpdate(true);
        }
      });
    }

    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        if (btnPlay.classList.contains('playing')) {
          stopAnimation();
        } else {
          startAnimation();
        }
      });
    }

    if (btnStep && progressInput) {
      btnStep.addEventListener('click', () => {
        if (btnPlay?.classList.contains('playing')) return;

        let val = parseInt(progressInput.value) || 0;
        const maxVal = parseInt(progressInput.max) || 0;
        if (val < maxVal) {
          val += 1;
          progressInput.value = val;
          const event = new Event('input', { bubbles: true });
          progressInput.dispatchEvent(event);
          triggerCanvasUpdate(true);
        }
      });
    }

    // 물리적 scrollTop에 의한 상단 잘림 원천 봉쇄 방지
    const svgBox = document.getElementById('svg-box');
    if (svgBox) {
      svgBox.scrollTop = 0;
    }
  }

  // 글로벌 API 등록
  window.KakaoTalkMain = {
    init: initKakaoTalkApp
  };

  // 단독 모드에서의 자동 실행
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initKakaoTalkApp);
  } else {
    initKakaoTalkApp();
  }

})();