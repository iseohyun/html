/**
 * KakaoTalk UI Interaction & Controller Module
 * Version: 0.0.10
 */

(function () {
  'use strict';

  // 현재 구동중인 경로(해시 또는 일반 경로)를 판별해 절대 리소스 경로를 반환하는 헬퍼 함수
  function getAbsoluteUrl(relativePath) {
    let basePath = '/small-project/KakaoTalk/';
    const hash = window.location.hash;
    if (hash && hash.startsWith('#/')) {
      const cleanHash = hash.substring(2);
      const lastSlashIdx = cleanHash.lastIndexOf('/');
      if (lastSlashIdx !== -1) {
        basePath = '/' + cleanHash.substring(0, lastSlashIdx + 1);
      }
    } else {
      const path = window.location.pathname;
      const lastSlashIdx = path.lastIndexOf('/');
      if (lastSlashIdx !== -1) {
        basePath = path.substring(0, lastSlashIdx + 1);
      }
    }
    return basePath + relativePath;
  }

  // 전역 상태 변수
  const THEME_PRESETS = {
    light: {
      'setting-bgcolor': '#acc0d1',
      'me-bubble-color': '#fee500',
      'me-text-color': '#000000',
      'you-bubble-color': '#ffffff',
      'you-text-color': '#000000',
      'you-name-color': '#374151',
      'time-color': '#64748b',
      'date-text-color': '#475569'
    },
    dark: {
      'setting-bgcolor': '#000000',
      'me-bubble-color': '#fee500',
      'me-text-color': '#000000',
      'you-bubble-color': '#2a2a2a',
      'you-text-color': '#ffffff',
      'you-name-color': '#d1d1d6',
      'time-color': '#8e8e93',
      'date-text-color': '#8e8e93'
    }
  };

  let originalSettingsText = '';
  let loadedConfig = {};
  let avatarSettingsMap = {};
  let startRangeIndex = 1; // v1.1.0 대화 시작 범위
  let endRangeIndex = 0;   // v1.1.0 대화 끝 범위 (0일 때 totalCount로 대입)
  const defaultColors = ["#E44D1B", "#C27800", "#669900", "#00A879", "#009DD1", "#4182FB", "#A760E2", "#D94594"];
  let globalColorIndex = 0;
  let globalVoiceIndex = 0;
  let koreanVoices = [];

  // 도움말 HTML 백업
  let helpContentHtml = '';

  // DOM 캐시
  let chatInput, canvas, btnLoadExample, fileLoader, btnDownload;
  let btnResetSettings, btnSaveSettings, btnLoadSettings, settingFileLoader;
  let inputMeName, avatarModal, btnOpenAvatarModal, btnCloseModal, btnSaveAvatars, avatarSettingsList;
  
  // v0.0.10 추가 DOM 캐시
  let inputFontSize, inputFontBold, inputMeBubbleColor, inputYouBubbleColor, inputTimeColor;
  let btnHelp, helpModal, btnCloseHelp, helpModalBody;

  let triggerUpdateCallback = null;

  function initKoreanVoices() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      koreanVoices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('ko'));
    }
  }

  if (typeof window !== 'undefined' && window.speechSynthesis) {
    initKoreanVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        initKoreanVoices();
        Object.keys(avatarSettingsMap).forEach(person => {
          if (!avatarSettingsMap[person].voiceURI && koreanVoices.length > 0) {
            avatarSettingsMap[person].voiceURI = koreanVoices[0].voiceURI;
          }
        });
      };
    }
  }

  function getOrRegisterAvatarSettings(person) {
    if (!avatarSettingsMap[person]) {
      let selectedVoiceURI = '';
      if (koreanVoices.length > 0) {
        selectedVoiceURI = koreanVoices[globalVoiceIndex % koreanVoices.length].voiceURI;
        globalVoiceIndex++;
      }

      avatarSettingsMap[person] = {
        color: defaultColors[globalColorIndex % defaultColors.length],
        text: person.charAt(0),
        textColor: '#ffffff',
        image: '',
        voiceURI: selectedVoiceURI
      };
      globalColorIndex++;
    }
    return avatarSettingsMap[person];
  }

  /**
   * 도움말 파일 비동기 미리 로드
   */
  async function fetchHelpContent() {
    try {
      const res = await fetch(getAbsoluteUrl('help.html'));
      if (res.ok) {
        const fullHtml = await res.text();
        // body 태그 내부의 순수 도움말 가이드 내용만 파싱하여 추출
        const match = fullHtml.match(/<body>([\s\S]*?)<\/body>/i);
        helpContentHtml = match ? match[1].trim() : fullHtml;
      }
    } catch (e) {
      console.warn('도움말 로드 실패:', e);
      helpContentHtml = '도움말 파일(help.html)을 가져올 수 없습니다.';
    }
  }

  /**
   * UI 컨트롤러 초기화 및 이벤트 리스너 바인딩
   */
  function initInterface(onUpdateCallback) {
    triggerUpdateCallback = onUpdateCallback;

    // DOM 참조 캐싱
    chatInput = document.getElementById('chat-input');
    canvas = document.getElementById('chat-canvas');
    btnLoadExample = document.getElementById('btn-load-example');
    fileLoader = document.getElementById('file-loader');
    btnDownload = document.getElementById('btn-download');

    btnResetSettings = document.getElementById('btn-reset-settings');
    btnSaveSettings = document.getElementById('btn-save-settings');
    btnLoadSettings = document.getElementById('btn-load-settings');
    settingFileLoader = document.getElementById('setting-file-loader');
    inputMeName = document.getElementById('input-me-name');
    avatarModal = document.getElementById('avatar-modal');
    btnOpenAvatarModal = document.getElementById('btn-open-avatar-modal');
    btnCloseModal = document.getElementById('btn-close-modal');
    btnSaveAvatars = document.getElementById('btn-save-avatars');
    avatarSettingsList = document.getElementById('avatar-settings-list');

    // v0.0.10 DOM 캐싱
    inputFontSize = document.getElementById('input-font-size');
    inputFontBold = document.getElementById('input-font-bold');
    inputMeBubbleColor = document.getElementById('input-me-bubble-color');
    inputYouBubbleColor = document.getElementById('input-you-bubble-color');
    inputTimeColor = document.getElementById('input-time-color');

    btnHelp = document.getElementById('btn-help');
    helpModal = document.getElementById('help-modal');
    btnCloseHelp = document.getElementById('btn-close-help');
    helpModalBody = document.getElementById('help-modal-body');

    // 도움말 문서 연동 기동
    fetchHelpContent();

    if (btnHelp && helpModal && helpModalBody) {
      btnHelp.addEventListener('click', () => {
        helpModalBody.innerHTML = helpContentHtml;
        helpModal.style.display = 'flex';
      });
    }

    // ======================================================
    // 모든 모달 닫기 버튼 및 배경 클릭 이벤트 종합 핸들러
    // ======================================================
    const bindModalClose = (modalId, closeBtnId, cancelBtnId) => {
      const modal = document.getElementById(modalId);
      if (!modal) return;

      if (closeBtnId) {
        const closeBtn = document.getElementById(closeBtnId);
        if (closeBtn) {
          closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
        }
      }
      if (cancelBtnId) {
        const cancelBtn = document.getElementById(cancelBtnId);
        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => { modal.style.display = 'none'; });
        }
      }
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    };

    bindModalClose('download-modal', 'btn-close-download');
    bindModalClose('mobile-save-modal', 'btn-close-mobile-save', 'btn-close-mobile-save-confirm');
    bindModalClose('avatar-modal', 'btn-close-modal');
    bindModalClose('help-modal', 'btn-close-help');
    bindModalClose('theme-detail-modal', 'btn-close-theme-modal', 'btn-cancel-theme-modal');

    // 다운로드 옵션 카드의 다운로드 액션 연결
    const downloadModal = document.getElementById('download-modal');
    const optDownloadStatic = document.getElementById('opt-download-static');
    const optDownloadSvg = document.getElementById('opt-download-svg');
    const optDownloadAnimation = document.getElementById('opt-download-animation');
    const optDownloadFull = document.getElementById('opt-download-full');

    if (optDownloadStatic) {
      optDownloadStatic.addEventListener('click', () => {
        if (downloadModal) downloadModal.style.display = 'none';
        if (btnDownload) btnDownload.click();
      });
    }
    if (optDownloadSvg) {
      optDownloadSvg.addEventListener('click', () => {
        if (downloadModal) downloadModal.style.display = 'none';
        downloadCanvasSVG();
      });
    }
    if (optDownloadAnimation) {
      optDownloadAnimation.addEventListener('click', () => {
        if (downloadModal) downloadModal.style.display = 'none';
        const btnPlay = document.getElementById('btn-play');
        if (btnPlay) btnPlay.click();
      });
    }
    if (optDownloadFull) {
      optDownloadFull.addEventListener('click', () => {
        if (downloadModal) downloadModal.style.display = 'none';
        if (btnDownload) btnDownload.click();
      });
    }

    // 텍스트 실시간 반영
    chatInput.addEventListener('input', (e) => {
      syncMeNameDropdown(e.target.value);
      if (triggerUpdateCallback) triggerUpdateCallback(true);
    });

    const bindLiveUpdate = (id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => { if (triggerUpdateCallback) triggerUpdateCallback(true); });
        el.addEventListener('change', () => { if (triggerUpdateCallback) triggerUpdateCallback(true); });
      }
    };

    [
      'input-capture-time',
      'input-battery',
      'input-your-name',
      'input-bg-color',
      'input-me-name',
      'input-wifi',
      'input-cell',
      'input-width',
      'input-height',
      'input-progress',
      'input-speed',
      'input-font',
      'input-font-size', // 글꼴 크기 연동
      'input-font-bold', // 글꼴 굵기 연동
      'input-bubble-round', // 말풍선 라운드 크기 연동
      'input-me-bubble-color', // 내 말풍선 색 피커 연동
      'input-you-bubble-color', // 상대 말풍선 색 피커 연동
      'input-time-color', // 대화 시간 색 피커 연동
      'input-avatar-center-x', // 초상화 세로 중심선 연동
      'input-name-offset', // 상대이름 오프셋 연동
      'input-bubble-left-offset', // 대화상자 좌오프셋 연동
      'input-bubble-top-offset', // 대화상자 상오프셋 연동
      'input-bubble-padding', // 버블 패딩 연동
      'input-bubble-margin' // 버블 마진 연동
    ].forEach(bindLiveUpdate);

    // 말풍선 라운드 슬라이더 값 변경 시 라벨 갱신 연동
    const inputBubbleRound = document.getElementById('input-bubble-round');
    const labelBubbleRound = document.getElementById('label-bubble-round');
    if (inputBubbleRound && labelBubbleRound) {
      const updateRoundLabel = () => {
        labelBubbleRound.textContent = inputBubbleRound.value + ' px';
        if (triggerUpdateCallback) triggerUpdateCallback(true);
      };
      inputBubbleRound.addEventListener('input', updateRoundLabel);
      inputBubbleRound.addEventListener('change', updateRoundLabel);
    }

    // 등장시간 슬라이더 값 변경 시 라벨 갱신 연동
    const inputDuration = document.getElementById('input-duration');
    const labelDuration = document.getElementById('label-duration');
    if (inputDuration && labelDuration) {
      const updateDurationLabel = () => {
        labelDuration.textContent = inputDuration.value + '초';
        if (triggerUpdateCallback) triggerUpdateCallback(true);
      };
      inputDuration.addEventListener('input', updateDurationLabel);
      inputDuration.addEventListener('change', updateDurationLabel);
    }
    // 대화 속도 슬라이더 값 변경 시 라벨 갱신 연동 (v0.1.0)
    const inputSpeed = document.getElementById('input-speed');
    const labelSpeed = document.getElementById('label-speed');
    if (inputSpeed && labelSpeed) {
      const updateSpeedLabel = () => {
        labelSpeed.textContent = inputSpeed.value + '초';
      };
      inputSpeed.addEventListener('input', updateSpeedLabel);
      inputSpeed.addEventListener('change', updateSpeedLabel);
    }

    document.querySelectorAll('input[name="effect"], #input-auto-scroll, #input-tts').forEach((el) => {
      el.addEventListener('change', () => { if (triggerUpdateCallback) triggerUpdateCallback(true); });
    });

    // ======================================================
    // 우측 SPA 네비게이션 바 & 슬라이딩 드로어 이벤트 연동
    // ======================================================
    const btnIconLoad = document.getElementById('btn-icon-load');
    const btnIconDownload = document.getElementById('btn-icon-download');
    const btnIconHelp = document.getElementById('btn-icon-help');

    const btnIconAnim = document.getElementById('btn-icon-anim');
    const btnIconSettings = document.getElementById('btn-icon-settings');
    const btnIconRaw = document.getElementById('btn-icon-raw');

    const slidingDrawer = document.getElementById('sliding-drawer-panel');
    const drawerTitle = document.getElementById('drawer-title');
    const btnCloseDrawer = document.getElementById('btn-close-drawer');
    const rightSpaNav = document.getElementById('right-spa-nav');

    // 1. 즉시 실행 아이콘 바인딩
    if (btnIconLoad) {
      btnIconLoad.addEventListener('click', () => {
        if (fileLoader) fileLoader.click();
      });
    }

    if (btnIconDownload) {
      btnIconDownload.addEventListener('click', () => {
        const downloadModal = document.getElementById('download-modal');
        if (downloadModal) {
          downloadModal.style.display = 'flex';
        } else if (btnDownload) {
          btnDownload.click();
        }
      });
    }

    if (btnIconHelp) {
      btnIconHelp.addEventListener('click', () => {
        if (btnHelp) btnHelp.click();
      });
    }

    // 2. 드로어 패널 탭 switching 및 열기/닫기
    const articleElem = document.getElementById('kakaotalk-article');

    const openDrawerTab = (tabId, titleText, activeBtn) => {
      if (!slidingDrawer) return;

      const isCurrentActive = activeBtn && activeBtn.classList.contains('active');
      const isClosed = slidingDrawer.classList.contains('drawer-closed');

      if (isCurrentActive && !isClosed) {
        closeDrawer();
        return;
      }

      document.querySelectorAll('.drawer-tab-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));

      const targetTab = document.getElementById(tabId);
      if (targetTab) targetTab.classList.add('active');
      if (activeBtn) activeBtn.classList.add('active');
      if (drawerTitle) drawerTitle.textContent = titleText;

      slidingDrawer.classList.remove('drawer-closed');
      if (rightSpaNav) rightSpaNav.classList.add('drawer-open');

      if (tabId === 'drawer-tab-raw') {
        slidingDrawer.classList.add('raw-tab-active');
      } else {
        slidingDrawer.classList.remove('raw-tab-active');
      }

      if (articleElem && rightSpaNav && !rightSpaNav.classList.contains('nav-overlay-mode')) {
        articleElem.classList.add('drawer-push-active');
      }

      if (triggerUpdateCallback) triggerUpdateCallback(true);
    };

    const closeDrawer = () => {
      if (slidingDrawer) {
        slidingDrawer.classList.add('drawer-closed');
        slidingDrawer.classList.remove('raw-tab-active');
      }
      if (rightSpaNav) rightSpaNav.classList.remove('drawer-open');
      document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
      if (articleElem) articleElem.classList.remove('drawer-push-active');
      if (triggerUpdateCallback) triggerUpdateCallback(true);
    };

    if (btnIconAnim) {
      btnIconAnim.addEventListener('click', () => openDrawerTab('drawer-tab-anim', '🎬 애니메이션 설정', btnIconAnim));
    }
    if (btnIconSettings) {
      btnIconSettings.addEventListener('click', () => openDrawerTab('drawer-tab-settings', '⚙️ 환경설정', btnIconSettings));
    }
    if (btnIconRaw) {
      btnIconRaw.addEventListener('click', () => openDrawerTab('drawer-tab-raw', '📄 원문 보기 / 실시간 에디터', btnIconRaw));
    }
    if (btnCloseDrawer) {
      btnCloseDrawer.addEventListener('click', closeDrawer);
    }

    // 3. 패널 표시 모드 (고정 Push ↔ 고정 해제 Overlay) 토글 핸들러
    let currentPanelMode = 'push'; // 'push' (고정) | 'overlay' (고정 해제)
    const btnDrawerModeToggle = document.getElementById('btn-drawer-mode-toggle');

    const updatePanelModeUI = () => {
      const isPush = currentPanelMode === 'push';
      const titleText = isPush 
        ? '패널 고정 모드 (Push) - 클릭하여 고정 해제(Overlay 모드)로 전환' 
        : '패널 고정 해제 모드 (Overlay) - 클릭하여 고정(Push 모드)로 전환';

      if (btnDrawerModeToggle) {
        btnDrawerModeToggle.innerHTML = '📌';
        btnDrawerModeToggle.setAttribute('title', titleText);
        if (isPush) {
          btnDrawerModeToggle.classList.remove('unpinned');
          btnDrawerModeToggle.style.filter = 'none';
        } else {
          btnDrawerModeToggle.classList.add('unpinned');
          btnDrawerModeToggle.style.filter = 'grayscale(100%) opacity(0.55)';
        }
      }

      if (rightSpaNav) {
        if (isPush) {
          rightSpaNav.classList.remove('nav-overlay-mode');
          rightSpaNav.classList.add('nav-push-mode');
        } else {
          rightSpaNav.classList.remove('nav-push-mode');
          rightSpaNav.classList.add('nav-overlay-mode');
        }
      }

      if (articleElem && rightSpaNav && rightSpaNav.classList.contains('drawer-open')) {
        if (isPush) {
          const w = slidingDrawer ? slidingDrawer.offsetWidth : 380;
          articleElem.style.paddingRight = w + 'px';
          articleElem.classList.add('drawer-push-active');
        } else {
          articleElem.style.paddingRight = '0px';
          articleElem.classList.remove('drawer-push-active');
        }
      }

      if (triggerUpdateCallback) triggerUpdateCallback(true);
    };

    const togglePanelMode = () => {
      currentPanelMode = currentPanelMode === 'push' ? 'overlay' : 'push';
      updatePanelModeUI();
    };

    if (btnDrawerModeToggle) btnDrawerModeToggle.addEventListener('click', togglePanelMode);

    // 4. 모바일 네비게이션 숨김 토글
    const btnMobileNavToggle = document.getElementById('btn-mobile-nav-toggle');
    if (btnMobileNavToggle && rightSpaNav) {
      btnMobileNavToggle.addEventListener('click', () => {
        rightSpaNav.classList.toggle('mobile-collapsed');
      });
    }

    // 5. 스크롤 위치 감지 & 다시 펼치기(▼)/접기(▲) 상태 핸들링
    let isNavPinned = false;
    const btnReexpandNav = document.getElementById('btn-reexpand-nav');
    const btnFoldNav = document.getElementById('btn-fold-nav');

    const handleScrollNavState = () => {
      if (!rightSpaNav) return;
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;

      if (isNavPinned) {
        // '다시 펼치기(▼)'로 펼쳐진 고정 상태: '다시 접기(▲)'를 누르기 전까지 스크롤해도 펼침 유지
        rightSpaNav.classList.remove('nav-scrolled-up');
        if (btnReexpandNav) btnReexpandNav.style.display = 'none';
        return;
      }

      if (scrollY > 30) {
        rightSpaNav.classList.add('nav-scrolled-up');
        if (btnReexpandNav) btnReexpandNav.style.display = 'flex';
      } else {
        rightSpaNav.classList.remove('nav-scrolled-up');
        if (btnReexpandNav) btnReexpandNav.style.display = 'none';
      }
    };

    if (btnReexpandNav) {
      btnReexpandNav.addEventListener('click', () => {
        isNavPinned = true;
        handleScrollNavState();
      });
    }

    if (btnFoldNav) {
      btnFoldNav.addEventListener('click', () => {
        isNavPinned = false;
        handleScrollNavState();
      });
    }

    window.addEventListener('scroll', handleScrollNavState, { passive: true });
    handleScrollNavState();

    // 6. 환경설정 접이식 카테고리 (Accordion) Open/Close 토글 핸들러
    document.querySelectorAll('.setting-accordion-header').forEach((header) => {
      header.addEventListener('click', () => {
        const accordion = header.closest('.setting-accordion');
        if (accordion) {
          accordion.classList.toggle('collapsed');
        }
      });
    });

    // 7. 유한 상태 머신 (FSM) 기반 캔버스 앱 모드 제어 (window.APP_MODE = 'NORMAL' | 'COLOR_EDIT' | 'LAYOUT_EDIT')
    window.APP_MODE = 'NORMAL';
    let previousAppMode = 'NORMAL';

    const btnCanvasPickerMode = document.getElementById('btn-canvas-picker-mode');
    const canvasPickerTooltip = document.getElementById('canvas-picker-tooltip');

    window.setAppMode = (newMode) => {
      if (window.APP_MODE === newMode) return;

      if (newMode === 'LAYOUT_EDIT') {
        previousAppMode = window.APP_MODE;
      }

      window.APP_MODE = newMode;

      if (btnCanvasPickerMode) {
        if (newMode === 'COLOR_EDIT') {
          btnCanvasPickerMode.classList.add('active');
          console.log('🎯 [앱 모드 전환 ➔ COLOR_EDIT (색 편집 모드)]');
        } else {
          btnCanvasPickerMode.classList.remove('active');
          if (newMode === 'NORMAL') console.log('🎯 [앱 모드 전환 ➔ NORMAL (일반 모드)]');
          else if (newMode === 'LAYOUT_EDIT') console.log('🎯 [앱 모드 전환 ➔ LAYOUT_EDIT (레이아웃 보조선 모드)]');
        }
      }

      if (canvas) {
        if (newMode === 'COLOR_EDIT') {
          canvas.style.cursor = 'eyedropper';
        } else if (newMode === 'LAYOUT_EDIT') {
          canvas.style.cursor = 'crosshair';
          if (canvasPickerTooltip) canvasPickerTooltip.style.display = 'none';
        } else {
          canvas.style.cursor = 'default';
          if (canvasPickerTooltip) canvasPickerTooltip.style.display = 'none';
        }
      }
    };

    window.restorePreviousAppMode = () => {
      window.setAppMode(previousAppMode || 'NORMAL');
    };

    if (btnCanvasPickerMode) {
      btnCanvasPickerMode.addEventListener('click', (e) => {
        e.stopPropagation(); // 아코디언 접힘 방지
        const targetMode = window.APP_MODE === 'COLOR_EDIT' ? 'NORMAL' : 'COLOR_EDIT';
        window.setAppMode(targetMode);

        if (targetMode === 'COLOR_EDIT') {
          const colorAccordion = btnCanvasPickerMode.closest('.setting-accordion');
          if (colorAccordion && colorAccordion.classList.contains('collapsed')) {
            colorAccordion.classList.remove('collapsed');
          }
        }
      });
    }

    // ESC 키 다단계 닫기 계층 구조 (1단계: 컬러피커 닫기, 2단계: COLOR_EDIT 모드 끄기)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const isPickerVisible = customColorPickerModal && customColorPickerModal.style.display !== 'none';
        if (isPickerVisible) {
          customColorPickerModal.style.display = 'none';
        } else if (window.APP_MODE === 'COLOR_EDIT') {
          window.setAppMode('NORMAL');
        }
      }
    });

    const getCanvasHitObject = (e) => {
      if (!canvas || !window._canvasHitRegions) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = (canvas.width || 1080) / rect.width;
      const scaleY = (canvas.height || 2340) / rect.height;
      const cX = (e.clientX - rect.left) * scaleX;
      const cY = (e.clientY - rect.top) * scaleY;

      for (const region of window._canvasHitRegions) {
        const { x, y, width, height } = region.rect;
        if (cX >= x && cX <= x + width && cY >= y && cY <= y + height) {
          return region;
        }
      }
      return null;
    };

    let lastLoggedTooltipText = '';
    let isDraggingAvatarLine = false;
    let hoveringAvatarLine = false;

    window.addEventListener('mouseup', () => {
      if (isDraggingAvatarLine) {
        isDraggingAvatarLine = false;
        // 드래그 해제 시 최종 스냅샷 렌더링 및 캐시 커밋
        if (triggerUpdateCallback) triggerUpdateCallback(true);
      }
    });

    if (canvas) {
      canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = (canvas.width || 1080) / rect.width;
        const cX = (e.clientX - rect.left) * scaleX;

        // 초상화 세로 중심선 X값 읽기 (기본값 73)
        const inputAvatarCenterX = document.getElementById('input-avatar-center-x');
        const avatarCX = inputAvatarCenterX ? (parseInt(inputAvatarCenterX.value, 10) || 73) : 73;

        // 마우스 포인터가 세로 중심선 근처(±24 픽셀)에 위치해 있는지 검출
        const isNearAvatarLine = window.APP_MODE === 'LAYOUT_EDIT' && Math.abs(cX - avatarCX) < 24;
        hoveringAvatarLine = isNearAvatarLine;

        // 드래그 중인 경우 값 업데이트
        if (isDraggingAvatarLine) {
          const newCx = Math.max(0, Math.min(1080, Math.round(cX)));
          if (inputAvatarCenterX) {
            inputAvatarCenterX.value = newCx;
            loadedConfig['avatar-center-x'] = newCx;
          }
          if (triggerUpdateCallback) triggerUpdateCallback(false); // 드래그 중에는 가볍게 캔버스 컨텍스트만 갱신
        }

        // 마우스 커서 처리
        if (window.APP_MODE === 'COLOR_EDIT') {
          canvas.style.cursor = 'eyedropper';
        } else if (window.APP_MODE === 'LAYOUT_EDIT') {
          canvas.style.cursor = isNearAvatarLine ? 'ew-resize' : 'crosshair';
        } else {
          canvas.style.cursor = 'default';
        }

        const hit = getCanvasHitObject(e);
        if (hit) {
          let labelText = hit.type === 'avatar' ? `👤 ${hit.person} 초상화` : `🎨 ${hit.label}`;
          if (lastLoggedTooltipText !== labelText) {
            lastLoggedTooltipText = labelText;
            console.log('💬 [캔버스 오브젝트 감지]:', labelText, `(targetId: ${hit.targetId || 'avatar'})`);
          }

          if (window.APP_MODE === 'COLOR_EDIT' && canvasPickerTooltip) {
            let tooltipText = hit.type === 'avatar' ? `👤 ${hit.person} 초상화 (클릭 시 아바타 변경 모달 이동)` : `🎨 ${hit.label} (클릭 시 색상 변경)`;
            canvasPickerTooltip.textContent = tooltipText;
            canvasPickerTooltip.style.left = (e.clientX + 16) + 'px';
            canvasPickerTooltip.style.top = (e.clientY + 16) + 'px';
            canvasPickerTooltip.style.display = 'block';
          }
        } else {
          lastLoggedTooltipText = '';
          if (canvasPickerTooltip) canvasPickerTooltip.style.display = 'none';
        }
      });

      canvas.addEventListener('mousedown', (e) => {
        if (window.APP_MODE === 'LAYOUT_EDIT' && hoveringAvatarLine) {
          isDraggingAvatarLine = true;
          e.preventDefault();
          e.stopPropagation();
        }
      });

      canvas.addEventListener('mouseleave', () => {
        if (canvasPickerTooltip) canvasPickerTooltip.style.display = 'none';
      });

      canvas.addEventListener('click', (e) => {
        // 철통 가드: COLOR_EDIT 모드가 아닐 경우 캔버스 클릭에 의한 피커 열기 엄격 차단
        if (window.APP_MODE !== 'COLOR_EDIT') return;

        const hit = getCanvasHitObject(e);
        if (!hit) return;

        e.stopPropagation();

        if (hit.type === 'avatar') {
          if (btnOpenAvatarModal) {
            btnOpenAvatarModal.click();
            setTimeout(() => {
              const avatarSpeakerSelect = document.getElementById('avatar-speaker-select');
              if (avatarSpeakerSelect) {
                avatarSpeakerSelect.value = hit.person;
                avatarSpeakerSelect.dispatchEvent(new Event('change', { bubbles: true }));
              }
              const avatarSettingsList = document.getElementById('avatar-settings-list');
              const targetRow = avatarSettingsList ? avatarSettingsList.querySelector(`.avatar-item-row[data-speaker="${hit.person}"]`) : null;
              if (targetRow) {
                targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetRow.classList.add('avatar-row-highlight');
                setTimeout(() => targetRow.classList.remove('avatar-row-highlight'), 2500);
              }
            }, 150);
          }
        } else if (hit.targetId) {
          const colorInput = document.getElementById(hit.targetId);
          if (colorInput) {
            const rightSpaNav = document.getElementById('right-spa-nav');
            if (rightSpaNav && !rightSpaNav.classList.contains('drawer-open')) {
              rightSpaNav.classList.add('drawer-open');
            }

            const colorAccordion = colorInput.closest('.setting-accordion');
            if (colorAccordion && colorAccordion.classList.contains('collapsed')) {
              colorAccordion.classList.remove('collapsed');
            }

            colorInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            openCustomColorPicker(colorInput, hit.label, { x: e.clientX, y: e.clientY });
          }
        }
      });
    }

    // ----------------------------------------------------
    // 초콤팩트 메뉴얼 컬러 피커 모달 (210x180 2D Canvas: 위 흰색, 아래 검은색 + NxN Mosaic Grid)
    // ----------------------------------------------------
    const customColorPickerModal = document.getElementById('custom-color-picker-modal');
    const colorMapCanvas = document.getElementById('custom-color-map-canvas');
    const colorMapCursor = document.getElementById('custom-color-map-cursor');
    const pickerMosaicSlider = document.getElementById('input-picker-mosaic');
    const btnPickerDefault = document.getElementById('btn-picker-default-color');
    const btnPickerCancel = document.getElementById('btn-picker-cancel');
    const btnPickerConfirm = document.getElementById('btn-picker-confirm');

    let currentTargetColorInput = null;
    let initialColorValue = '#FFFFFF';
    let currentPointX = 105, currentPointY = 90;
    let isColorMapDragging = false;

    const defaultColorMap = {
      'color-bg': '#acc0d1',
      'color-me-bubble': '#fee500',
      'color-me-text': '#000000',
      'color-other-bubble': '#ffffff',
      'color-other-text': '#000000',
      'color-other-name': '#333333',
      'color-time-text': '#556677',
      'color-date-bg': '#b1c3d5',
      'color-date-text': '#ffffff',
      'color-footer-bg': '#ffffff',
      'color-footer-text': '#000000',
      'color-footer-border': '#e2e8f0'
    };

    function hexToRgb(hex) {
      hex = hex ? hex.replace('#', '') : 'FFFFFF';
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const num = parseInt(hex, 16);
      return isNaN(num) ? { r: 255, g: 255, b: 255 } : { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
    }

    function rgbToHex(r, g, b) {
      return '#' + [r, g, b].map(x => {
        const h = Math.max(0, Math.min(255, Math.round(x))).toString(16);
        return h.length === 1 ? '0' + h : h;
      }).join('').toUpperCase();
    }

    function hslToRgb(h, s, l) {
      h = (h % 360 + 360) % 360;
      if (s === 0) {
        const val = Math.round(l * 255);
        return { r: val, g: val, b: val };
      }
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const hk = h / 360;
      return {
        r: Math.round(hue2rgb(p, q, hk + 1/3) * 255),
        g: Math.round(hue2rgb(p, q, hk) * 255),
        b: Math.round(hue2rgb(p, q, hk - 1/3) * 255)
      };
    }

    function getCanvasPixelRgb(x, y, w = 210, h = 180) {
      const hVal = (x / w) * 360;
      const yN = Math.max(0, Math.min(1, y / h));
      let sVal, lVal;

      if (yN <= 0.5) {
        sVal = yN * 2;
        lVal = 1.0 - yN;
      } else {
        sVal = 1.0;
        lVal = 1.0 - yN;
      }

      return hslToRgb(hVal, sVal, lVal);
    }

    function render2DColorMap(mosaicSize = 1) {
      if (!colorMapCanvas) return;
      const ctx = colorMapCanvas.getContext('2d');
      const w = 210;
      const h = 180;

      mosaicSize = Math.max(1, Math.min(30, mosaicSize));

      if (mosaicSize === 1) {
        const imgData = ctx.createImageData(w, h);
        const data = imgData.data;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const rgb = getCanvasPixelRgb(x, y, w, h);
            const idx = (y * w + x) * 4;
            data[idx] = rgb.r;
            data[idx + 1] = rgb.g;
            data[idx + 2] = rgb.b;
            data[idx + 3] = 255;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      } else {
        ctx.clearRect(0, 0, w, h);
        const step = mosaicSize;

        for (let y = 0; y < h; y += step) {
          const blockH = Math.min(step, h - y);
          const cy = y + blockH / 2;

          for (let x = 0; x < w; x += step) {
            const blockW = Math.min(step, w - x);
            const cx = x + blockW / 2;

            const rgb = getCanvasPixelRgb(cx, cy, w, h);
            const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

            ctx.fillStyle = hex;
            ctx.fillRect(x, y, blockW, blockH);
          }
        }
      }
    }

    function findPointFromHex(hex) {
      const targetRgb = hexToRgb(hex);
      let bestX = 105, bestY = 90, minDiff = Infinity;
      for (let y = 0; y <= 180; y += 4) {
        for (let x = 0; x <= 210; x += 4) {
          const rgb = getCanvasPixelRgb(x, y, 210, 180);
          const diff = Math.abs(rgb.r - targetRgb.r) + Math.abs(rgb.g - targetRgb.g) + Math.abs(rgb.b - targetRgb.b);
          if (diff < minDiff) {
            minDiff = diff;
            bestX = x;
            bestY = y;
          }
        }
      }
      return { x: bestX, y: bestY };
    }

    function updateColorPickerFromPoint(x, y, updateCanvas = true) {
      x = Math.max(0, Math.min(210, x));
      y = Math.max(0, Math.min(180, y));

      const mosaicVal = parseInt(pickerMosaicSlider ? pickerMosaicSlider.value : 1) || 1;

      let sampleX = x;
      let sampleY = y;

      if (mosaicVal > 1) {
        const step = mosaicVal;
        const blockX = Math.floor(x / step) * step;
        const blockY = Math.floor(y / step) * step;
        const blockW = Math.min(step, 210 - blockX);
        const blockH = Math.min(step, 180 - blockY);
        sampleX = blockX + blockW / 2;
        sampleY = blockY + blockH / 2;
      }

      currentPointX = sampleX;
      currentPointY = sampleY;

      if (colorMapCursor) {
        colorMapCursor.style.left = currentPointX + 'px';
        colorMapCursor.style.top = currentPointY + 'px';
      }

      render2DColorMap(mosaicVal);

      const rgb = getCanvasPixelRgb(sampleX, sampleY, 210, 180);
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

      if (currentTargetColorInput && updateCanvas) {
        currentTargetColorInput.value = hex;
        if (triggerUpdateCallback) triggerUpdateCallback(true);
      }
    }

    function openCustomColorPicker(targetInput, targetLabel = '색상 선택', anchorPos = null) {
      if (!targetInput) return;
      currentTargetColorInput = targetInput;
      initialColorValue = targetInput.value || '#ffffff';

      const defColor = defaultColorMap[targetInput.id] || '#acc0d1';
      if (btnPickerDefault) {
        btnPickerDefault.style.backgroundColor = defColor;
      }

      if (pickerMosaicSlider) {
        pickerMosaicSlider.min = 1;
        pickerMosaicSlider.max = 30;
        pickerMosaicSlider.value = window._mosaicSize || 1;
      }

      const pt = findPointFromHex(initialColorValue);

      if (customColorPickerModal) {
        if (anchorPos && typeof anchorPos.x === 'number' && typeof anchorPos.y === 'number') {
          const targetLeft = Math.min(window.innerWidth - 230, Math.max(10, anchorPos.x + 20));
          const targetTop = Math.min(window.innerHeight - 250, Math.max(10, anchorPos.y - 30));
          customColorPickerModal.style.position = 'fixed';
          customColorPickerModal.style.left = targetLeft + 'px';
          customColorPickerModal.style.top = targetTop + 'px';
          customColorPickerModal.style.right = 'auto';
          customColorPickerModal.style.bottom = 'auto';
          customColorPickerModal.style.margin = '0';
        }
        customColorPickerModal.style.display = 'flex';
      }
      updateColorPickerFromPoint(pt.x, pt.y, false);
    }

    if (colorMapCanvas) {
      const handleColorMapPointer = (e) => {
        const rect = colorMapCanvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
        updateColorPickerFromPoint(x, y, true);
      };

      colorMapCanvas.addEventListener('mousedown', (e) => {
        isColorMapDragging = true;
        handleColorMapPointer(e);
      });

      window.addEventListener('mousemove', (e) => {
        if (isColorMapDragging) handleColorMapPointer(e);
      });

      window.addEventListener('mouseup', () => {
        isColorMapDragging = false;
      });
    }

    if (pickerMosaicSlider) {
      pickerMosaicSlider.addEventListener('input', () => {
        const val = parseInt(pickerMosaicSlider.value) || 1;
        window._mosaicSize = val;
        render2DColorMap(val);
        if (triggerUpdateCallback) triggerUpdateCallback(true);
      });
    }

    if (btnPickerDefault) {
      btnPickerDefault.addEventListener('click', () => {
        if (!currentTargetColorInput) return;
        const defVal = defaultColorMap[currentTargetColorInput.id] || '#ffffff';
        const pt = findPointFromHex(defVal);
        updateColorPickerFromPoint(pt.x, pt.y, true);
      });
    }

    if (btnPickerCancel) {
      btnPickerCancel.addEventListener('click', () => {
        if (currentTargetColorInput) {
          currentTargetColorInput.value = initialColorValue;
          if (triggerUpdateCallback) triggerUpdateCallback(true);
        }
        if (customColorPickerModal) customColorPickerModal.style.display = 'none';
      });
    }

    if (btnPickerConfirm) {
      btnPickerConfirm.addEventListener('click', () => {
        if (customColorPickerModal) customColorPickerModal.style.display = 'none';
      });
    }

    function makeElementDraggable(headerElem, containerElem) {
      if (!headerElem || !containerElem) return;
      let isDragging = false;
      let offsetX = 0, offsetY = 0;

      headerElem.style.cursor = 'grab';

      headerElem.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('modal-close') || e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'CANVAS') return;

        isDragging = true;

        const rect = containerElem.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        containerElem.style.position = 'fixed';
        containerElem.style.left = rect.left + 'px';
        containerElem.style.top = rect.top + 'px';
        containerElem.style.right = 'auto';
        containerElem.style.bottom = 'auto';
        containerElem.style.margin = '0';

        headerElem.style.cursor = 'grabbing';
        document.body.style.cursor = 'grabbing';

        e.preventDefault();
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const newLeft = e.clientX - offsetX;
        const newTop = e.clientY - offsetY;
        containerElem.style.left = newLeft + 'px';
        containerElem.style.top = newTop + 'px';
      });

      window.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          headerElem.style.cursor = 'grab';
          document.body.style.cursor = '';
        }
      });
    }

    makeElementDraggable(document.getElementById('avatar-modal-header'), document.querySelector('#avatar-modal .modal-content'));
    makeElementDraggable(document.querySelector('#custom-color-picker-modal .modal-content'), document.getElementById('custom-color-picker-modal'));

    window.openCustomColorPicker = openCustomColorPicker;

    document.querySelectorAll('.setting-accordion input[type="color"]').forEach((colorInput) => {
      const handleOpenPicker = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const labelElem = colorInput.closest('.control-row')?.querySelector('label');
        const labelText = labelElem ? labelElem.textContent : '색상 선택';
        openCustomColorPicker(colorInput, labelText);
      };

      colorInput.addEventListener('click', handleOpenPicker);
      colorInput.addEventListener('pointerdown', handleOpenPicker);
    });

    // 8. 슬라이딩 드로어 패널 좌측 테두리 드래그 폭(width) 조절
    const drawerResizer = document.getElementById('drawer-resizer-handle');
    let isResizingDrawer = false;

    if (drawerResizer && slidingDrawer) {
      drawerResizer.addEventListener('mousedown', (e) => {
        isResizingDrawer = true;
        drawerResizer.classList.add('resizing');
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
      });

      window.addEventListener('mousemove', (e) => {
        if (!isResizingDrawer) return;
        const newWidth = Math.max(260, Math.min(800, window.innerWidth - e.clientX));
        slidingDrawer.style.width = newWidth + 'px';

        if (articleElem && rightSpaNav && !rightSpaNav.classList.contains('nav-overlay-mode') && rightSpaNav.classList.contains('drawer-open')) {
          articleElem.style.paddingRight = newWidth + 'px';
        }
      });

      window.addEventListener('mouseup', () => {
        if (isResizingDrawer) {
          isResizingDrawer = false;
          if (drawerResizer) drawerResizer.classList.remove('resizing');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          if (triggerUpdateCallback) triggerUpdateCallback(true);
        }
      });
    }

    // 카테고리 아코디언 Open/Close
    document.querySelectorAll('.category-header').forEach((header) => {
      header.addEventListener('click', (e) => {
        if (e.target.closest('.animation-controls') || e.target.closest('.setting-controls')) return;
        const category = header.closest('.category');
        if (category) {
          category.classList.toggle('collapsed');
        }
      });
    });

    // 더블 슬라이더 드래그 이벤트 기동
    setupDoubleSliderEvents();

    // 예시 데이터 로드
    btnLoadExample.addEventListener('click', () => {
      fileLoader.click();
    });

    fileLoader.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target.result;
        chatInput.value = text;

        // v0.0.10 피드백: 파일 로드 시 파싱된 대화방 이름을 UI 인풋에 연동
        const { config: parsedConfig, dialogs: rawDialogs } = parseInputText(text);
        if (parsedConfig['your-name']) {
          const yourNameEl = document.getElementById('input-your-name');
          if (yourNameEl) {
            yourNameEl.value = parsedConfig['your-name'];
          }
        }

        // 불러온 대화 개수에 맞게 대화 범위(1 ~ totalCount) 및 슬라이더 자동 재조정
        const cleanDialogs = rawDialogs.filter(d => d.person && d.person.trim() !== '');
        const totalCount = cleanDialogs.length;
        if (totalCount > 0) {
          startRangeIndex = 1;
          endRangeIndex = totalCount;
          const progressEl = document.getElementById('input-progress');
          if (progressEl) {
            progressEl.min = 1;
            progressEl.max = totalCount;
            progressEl.value = totalCount;
          }
        } else {
          startRangeIndex = 1;
          endRangeIndex = 0;
        }

        syncMeNameDropdown(text);
        await parseAndApplyDateHeader(text);
        if (triggerUpdateCallback) triggerUpdateCallback(true);
      };
      reader.readAsText(file);
    });

    // 설정 복원/저장
    btnResetSettings.addEventListener('click', () => {
      if (confirm('설정값을 초기 기본값으로 리셋하시겠습니까?')) {
        const settings = parseSettings(originalSettingsText);
        applySettingsToUI(settings);
        if (triggerUpdateCallback) triggerUpdateCallback(true);
      }
    });

    btnSaveSettings.addEventListener('click', saveSettingsToFile);

    btnLoadSettings.addEventListener('click', () => {
      settingFileLoader.click();
    });

    settingFileLoader.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target.result;
        const loadedSettings = parseSettings(text);
        applySettingsToUI(loadedSettings);
        if (triggerUpdateCallback) triggerUpdateCallback(true);
        alert('설정 파일이 성공적으로 적용되었습니다.');
      };
      reader.readAsText(file);
    });

    // 대화상대 초상화 상세 모달 열기
    btnOpenAvatarModal.addEventListener('click', () => {
      const { dialogs } = parseInputText(chatInput.value);
      const persons = new Set();
      dialogs.forEach(d => {
        if (d.person && !d.person.startsWith('=')) {
          persons.add(d.person);
        }
      });
      renderAvatarModalContent(persons);
      avatarModal.style.display = 'flex';
    });

    btnCloseModal.addEventListener('click', () => {
      avatarModal.style.display = 'none';
    });

    avatarModal.addEventListener('click', (e) => {
      if (e.target === avatarModal) {
        avatarModal.style.display = 'none';
      }
    });

    // 아바타 설정값 모달 적용 저장
    btnSaveAvatars.addEventListener('click', () => {
      const rows = avatarSettingsList.querySelectorAll('.avatar-item-row');
      rows.forEach(row => {
        const idFull = row.querySelector('.avatar-preview-circle').id;
        const person = idFull.replace('avatar-preview-', '');
        
        const textVal = row.querySelector(`#avatar-text-${person}`).value || person.charAt(0);
        const colorVal = row.querySelector(`#avatar-color-${person}`).value;
        const textColorVal = row.querySelector(`#avatar-textcolor-${person}`).value;
        const base64ImageVal = row.querySelector(`#avatar-image-data-${person}`).value || '';
        const voiceSelect = row.querySelector(`#avatar-voice-${person}`);
        const voiceURIVal = voiceSelect ? voiceSelect.value : '';
        avatarSettingsMap[person] = {
          color: colorVal,
          text: textVal,
          textColor: textColorVal,
          image: base64ImageVal,
          voiceURI: voiceURIVal
        };
      });

      avatarModal.style.display = 'none';
      if (triggerUpdateCallback) triggerUpdateCallback(true);
    });

    // SPA 라우팅(http://127.0.0.1/#/small-project/KakaoTalk/index.html) 대응 전역 이벤트 위임 (v1.4.0)
    // 일반 클릭: PNG 저장 / Ctrl+클릭: SVG 즉시 저장 (팝업 없음)
    document.addEventListener('click', (e) => {
      const btnDownloadTarget = e.target ? e.target.closest('#btn-download') : null;
      if (btnDownloadTarget) {
        e.preventDefault();
        e.stopPropagation();

        // Ctrl 키 또는 Cmd(Mac) 키가 누른 채 클릭한 경우 -> SVG 파일 즉시 저장!
        if (e.ctrlKey || e.metaKey) {
          downloadCanvasSVG();
          return;
        }

        // 일반 클릭 -> PNG 이미지 즉시 저장!
        downloadCanvasImage();
      }
    }, true);

    // v1.3.0 테마 상세보기 모달 이벤트 기동
    setupThemeModalEvents();

    // 디폴트 데이터 로딩 기동
    loadDefaultData();
  }

  function rgbToHex(colorStr) {
    if (!colorStr) return '#bacee0';
    colorStr = colorStr.trim();
    if (colorStr.startsWith('#')) return colorStr;

    const match = colorStr.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    return '#bacee0';
  }

  async function parseAndApplyDateHeader(text) {
    const dateRegex = /저장한 날짜\s*:\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(오전|오후)\s*(\d{1,2}):(\d{1,2})/;
    const match = text.match(dateRegex);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      const day = match[3].padStart(2, '0');
      const ampm = match[4];
      let hour = parseInt(match[5]);
      const minute = match[6].padStart(2, '0');

      if (ampm === '오후' && hour < 12) hour += 12;
      else if (ampm === '오전' && hour === 12) hour = 0;

      const hourStr = hour.toString().padStart(2, '0');
      const captureTimeEl = document.getElementById('input-capture-time');
      if (captureTimeEl) {
        captureTimeEl.value = `${year}-${month}-${day}T${hourStr}:${minute}`;
      }
    }
  }

  function parseSettings(text) {
    const config = {};
    const lines = text.split('\n');
    lines.forEach((line) => {
      line = line.trim();
      if (line.startsWith('-')) {
        const [rawKey, ...valueParts] = line.slice(1).split(':');
        const value = valueParts.join(':').trim();
        
        let key = rawKey.trim();
        if (key === 'setting-bgcolor' || key === 'background-color' || key === '_bgcolor') {
          key = 'background-color';
        }

        if (key.startsWith('avatar_')) {
          const person = key.replace('avatar_', '');
          const [bgCol, innerTxt, fgCol, imgData, voiceURI] = value.split('|');
          avatarSettingsMap[person] = {
            color: bgCol || '#DE8',
            text: innerTxt || person.charAt(0),
            textColor: fgCol || '#ffffff',
            image: imgData || '',
            voiceURI: voiceURI || ''
          };
          return;
        }

        config[key] = value;
      }
    });
    return config;
  }

  function applySettingsToUI(config) {
    if (config['capture-time']) {
      const timeVal = config['capture-time'];
      const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)/i;
      const match = timeVal.match(timeRegex);
      const today = new Date();
      let year = today.getFullYear();
      let month = (today.getMonth() + 1).toString().padStart(2, '0');
      let day = today.getDate().toString().padStart(2, '0');
      let hourStr = '15';
      let minStr = '18';

      if (match) {
        let hour = parseInt(match[1]);
        const min = match[2];
        const ampm = match[3].toUpperCase();

        if (ampm === 'PM' && hour < 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;

        hourStr = hour.toString().padStart(2, '0');
        minStr = min;
      }
      const timeEl = document.getElementById('input-capture-time');
      if (timeEl) timeEl.value = `${year}-${month}-${day}T${hourStr}:${minStr}`;
    }
    if (config['battery']) {
      const batteryVal = config['battery'].replace('%', '').trim();
      const batteryEl = document.getElementById('input-battery');
      if (batteryEl) batteryEl.value = batteryVal;
    }
    const yourNameEl = document.getElementById('input-your-name');
    if (yourNameEl && config['your-name']) {
      yourNameEl.value = config['your-name'];
    }
    if (config['background-color']) {
      const bgColorEl = document.getElementById('input-bg-color');
      if (bgColorEl) bgColorEl.value = rgbToHex(config['background-color']);
    }
    if (config['me']) {
      loadedConfig['me'] = config['me'];
      if (inputMeName) inputMeName.value = config['me'];
    }
    const inputFont = document.getElementById('input-font');
    if (config['font'] && inputFont) {
      inputFont.value = config['font'];
    }
    
    // v0.0.10 복원 추가
    if (config['font-size'] && inputFontSize) {
      inputFontSize.value = config['font-size'];
    }
    if (config['font-bold'] !== undefined && inputFontBold) {
      inputFontBold.checked = (config['font-bold'] === 'true' || config['font-bold'] === true);
    }
    const inputBubbleRoundRestore = document.getElementById('input-bubble-round');
    const labelBubbleRoundRestore = document.getElementById('label-bubble-round');
    if (config['bubble-round'] && inputBubbleRoundRestore) {
      inputBubbleRoundRestore.value = config['bubble-round'];
      if (labelBubbleRoundRestore) labelBubbleRoundRestore.textContent = config['bubble-round'] + ' px';
    }
    if (config['me-bubble-color'] && inputMeBubbleColor) {
      inputMeBubbleColor.value = config['me-bubble-color'];
    }
    if (config['you-bubble-color'] && inputYouBubbleColor) {
      inputYouBubbleColor.value = config['you-bubble-color'];
    }
    if (config['time-color'] && inputTimeColor) {
      inputTimeColor.value = config['time-color'];
    }
    
    // 색상 복원
    ['color-bg', 'color-me-bubble', 'color-me-text', 'color-other-bubble', 'color-other-text', 'color-other-name', 'color-time-text', 'color-date-text', 'color-date-bg', 'color-footer-bg', 'color-footer-text', 'color-footer-border'].forEach(id => {
      const el = document.getElementById(id);
      if (el && config[id]) el.value = config[id];
    });

    // 레이아웃 복원
    ['avatar-center-x', 'name-offset', 'bubble-left-offset', 'bubble-top-offset', 'bubble-padding', 'bubble-margin', 'time-margin'].forEach(key => {
      const el = document.getElementById(`input-${key}`);
      if (el && config[key] !== undefined) el.value = config[key];
    });
    if (config['time-align']) {
      const el = document.getElementById('select-time-align');
      if (el) el.value = config['time-align'];
    }
    if (config['show-footer'] !== undefined) {
      const el = document.getElementById('input-show-footer');
      if (el) el.checked = (config['show-footer'] === 'true' || config['show-footer'] === true);
    }

    const inputDuration = document.getElementById('input-duration');
    const labelDuration = document.getElementById('label-duration');
    if (config['duration'] && inputDuration) {
      inputDuration.value = config['duration'];
      if (labelDuration) labelDuration.textContent = config['duration'] + '초';
    }

    loadedConfig = { ...loadedConfig, ...config };
  }

  function gatherConfigFromUI() {
    const checkEl = document.getElementById('input-capture-time');
    if (!checkEl) {
      return { ...loadedConfig };
    }

    const config = { ...loadedConfig };

    const captureTimeInput = checkEl.value;
    if (captureTimeInput) {
      const dt = new Date(captureTimeInput);
      if (!isNaN(dt.getTime())) {
        let hours = dt.getHours();
        const minutes = dt.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? '오후' : '오전';
        hours = hours % 12;
        hours = hours ? hours : 12;
        config['capture-time'] = `${ampm} ${hours}:${minutes}`;
      }
    } else {
      config['capture-time'] = '오후 3:18';
    }

    const batteryEl = document.getElementById('input-battery');
    const batteryVal = batteryEl ? (batteryEl.value || '83') : '83';
    const labelBatteryEl = document.getElementById('label-battery');
    if (labelBatteryEl) labelBatteryEl.textContent = batteryVal + '%';
    config['battery'] = batteryVal + '%';

    const yourNameEl = document.getElementById('input-your-name');
    config['your-name'] = yourNameEl ? (yourNameEl.value || '그룹채팅') : '그룹채팅';

    const selThemeEl = document.getElementById('select-theme');
    const selTheme = selThemeEl ? selThemeEl.value : 'light';
    const preset = (typeof THEME_PRESETS !== 'undefined' && THEME_PRESETS[selTheme]) ? THEME_PRESETS[selTheme] : THEME_PRESETS['light'];

    if (selTheme === 'light' || selTheme === 'dark') {
      config['background-color'] = preset['setting-bgcolor'];
      config['me-bubble-color'] = preset['me-bubble-color'];
      config['me-text-color'] = preset['me-text-color'];
      config['you-bubble-color'] = preset['you-bubble-color'];
      config['you-text-color'] = preset['you-text-color'];
      config['you-name-color'] = preset['you-name-color'];
      config['time-color'] = preset['time-color'];
      config['date-text-color'] = preset['date-text-color'];
    } else {
      config['background-color'] = loadedConfig['setting-bgcolor'] || preset['setting-bgcolor'];
      config['me-bubble-color'] = loadedConfig['me-bubble-color'] || preset['me-bubble-color'];
      config['me-text-color'] = loadedConfig['me-text-color'] || preset['me-text-color'];
      config['you-bubble-color'] = loadedConfig['you-bubble-color'] || preset['you-bubble-color'];
      config['you-text-color'] = loadedConfig['you-text-color'] || preset['you-text-color'];
      config['you-name-color'] = loadedConfig['you-name-color'] || preset['you-name-color'];
      config['time-color'] = loadedConfig['time-color'] || preset['time-color'];
      config['date-text-color'] = loadedConfig['date-text-color'] || preset['date-text-color'];
    }

    config['me'] = inputMeName ? inputMeName.value : '';

    // 개별 색상 컨트롤 오버라이드
    const colorBg = document.getElementById('color-bg');
    if (colorBg) config['background-color'] = colorBg.value;

    const colorMeBubble = document.getElementById('color-me-bubble');
    if (colorMeBubble) config['me-bubble-color'] = colorMeBubble.value;

    const colorMeText = document.getElementById('color-me-text');
    if (colorMeText) config['me-text-color'] = colorMeText.value;

    const colorOtherBubble = document.getElementById('color-other-bubble');
    if (colorOtherBubble) config['you-bubble-color'] = colorOtherBubble.value;

    const colorOtherText = document.getElementById('color-other-text');
    if (colorOtherText) config['you-text-color'] = colorOtherText.value;

    const colorOtherName = document.getElementById('color-other-name');
    if (colorOtherName) config['you-name-color'] = colorOtherName.value;

    const colorTimeText = document.getElementById('color-time-text');
    if (colorTimeText) config['time-color'] = colorTimeText.value;

    const colorDateText = document.getElementById('color-date-text');
    if (colorDateText) config['date-text-color'] = colorDateText.value;

    const colorDateBg = document.getElementById('color-date-bg');
    if (colorDateBg) config['date-bg-color'] = colorDateBg.value;

    const colorFooterBg = document.getElementById('color-footer-bg');
    if (colorFooterBg) config['color-footer-bg'] = colorFooterBg.value;

    const colorFooterText = document.getElementById('color-footer-text');
    if (colorFooterText) config['color-footer-text'] = colorFooterText.value;

    const colorFooterBorder = document.getElementById('color-footer-border');
    if (colorFooterBorder) config['color-footer-border'] = colorFooterBorder.value;

    const inputShowFooter = document.getElementById('input-show-footer');
    if (inputShowFooter) config['show-footer'] = inputShowFooter.checked;

    // 레이아웃 상세 오프셋 오버라이드
    const inputAvatarCenterX = document.getElementById('input-avatar-center-x');
    if (inputAvatarCenterX) config['avatar-center-x'] = (inputAvatarCenterX.value !== '') ? parseInt(inputAvatarCenterX.value, 10) : 73;

    const inputNameOffset = document.getElementById('input-name-offset');
    if (inputNameOffset) config['name-offset'] = parseInt(inputNameOffset.value) || 0;

    const inputBubbleLeftOffset = document.getElementById('input-bubble-left-offset');
    if (inputBubbleLeftOffset) config['bubble-left-offset'] = parseInt(inputBubbleLeftOffset.value) || 0;

    const inputBubbleTopOffset = document.getElementById('input-bubble-top-offset');
    if (inputBubbleTopOffset) config['bubble-top-offset'] = parseInt(inputBubbleTopOffset.value) || 0;

    const inputBubblePadding = document.getElementById('input-bubble-padding');
    if (inputBubblePadding) config['bubble-padding'] = parseInt(inputBubblePadding.value) || 0;

    const inputBubbleMargin = document.getElementById('input-bubble-margin');
    if (inputBubbleMargin) config['bubble-margin'] = parseInt(inputBubbleMargin.value) || 0;

    const selectTimeAlign = document.getElementById('select-time-align');
    if (selectTimeAlign) config['time-align'] = selectTimeAlign.value;

    const inputTimeMargin = document.getElementById('input-time-margin');
    if (inputTimeMargin) config['time-margin'] = parseInt(inputTimeMargin.value) || 0;

    const wifiEl = document.getElementById('input-wifi');
    const parsedWifi = wifiEl ? parseInt(wifiEl.value) : NaN;
    config['wifi'] = !isNaN(parsedWifi) ? parsedWifi : 4;
    const labelWifiEl = document.getElementById('label-wifi');
    if (labelWifiEl) labelWifiEl.textContent = (config['wifi'] * 25) + '%';

    const cellEl = document.getElementById('input-cell');
    const parsedCell = cellEl ? parseInt(cellEl.value) : NaN;
    config['cell'] = !isNaN(parsedCell) ? parsedCell : 4;
    const labelCellEl = document.getElementById('label-cell');
    if (labelCellEl) labelCellEl.textContent = (config['cell'] * 25) + '%';

    const inputW = document.getElementById('input-width');
    const inputH = document.getElementById('input-height');
    config['width'] = inputW ? (parseInt(inputW.value) || 1080) : (loadedConfig['width'] || 1080);
    config['height'] = inputH ? (parseInt(inputH.value) || 2340) : (loadedConfig['height'] || 2340);

    const progressEl = document.getElementById('input-progress');

    // v0.0.10: [현재 대화 / 전체 개수] 진행 라벨 세부 매핑
    const chatInputVal = chatInput ? chatInput.value : '';
    const { dialogs: rawDialogs } = parseInputText(chatInputVal);
    const cleanDialogs = rawDialogs.filter(d => d.person && d.person.trim() !== '');
    const totalCount = cleanDialogs.length;

    // v1.1.0 대화 범위 안전 조정 및 초기화
    if (totalCount > 0) {
      if (endRangeIndex === 0 || endRangeIndex > totalCount) {
        endRangeIndex = totalCount;
      }
      startRangeIndex = Math.max(1, Math.min(startRangeIndex, totalCount));
      endRangeIndex = Math.max(startRangeIndex, Math.min(endRangeIndex, totalCount));
    } else {
      startRangeIndex = 1;
      endRangeIndex = 0;
    }

    config['start-index'] = startRangeIndex;
    config['end-index'] = endRangeIndex;

    // 더블 슬라이더 인터페이스 및 라벨 갱신
    updateDoubleSliderUI(totalCount);

    // 대화 진행률 슬라이더 가드 보정 (Clamp) - 트랙 범위는 1 ~ totalCount 고정!
    let pVal = progressEl ? parseInt(progressEl.value) : 0;
    if (progressEl) {
      // 진행률 슬라이더의 물리 트랙 범위는 항상 오리지널 전체 대화수로 유지!
      progressEl.min = 1;
      progressEl.max = Math.max(1, totalCount);

      // 입력된 값만 대화 범위 [startRangeIndex, endRangeIndex] 내로 엄격하게 가드 제한!
      if (pVal < startRangeIndex) {
        pVal = startRangeIndex;
        progressEl.value = pVal; // 슬라이더 조작 시 턱 걸려서 더 안 넘어가도록 피드백!
      } else if (pVal > endRangeIndex) {
        pVal = endRangeIndex;
        progressEl.value = pVal; // 슬라이더 조작 시 턱 걸려서 더 안 넘어가도록 피드백!
      }
    }
    
    config['progress'] = pVal;

    const labelProgressEl = document.getElementById('label-progress');
    if (labelProgressEl) {
      labelProgressEl.textContent = `${pVal} / ${totalCount}개`;
    }

    const inputFont = document.getElementById('input-font');
    if (inputFont) {
      config['font'] = inputFont.value;
    }
    
    // v0.0.10 수집 추가
    if (inputFontSize) {
      config['font-size'] = inputFontSize.value;
    }
    if (inputFontBold) {
      config['font-bold'] = inputFontBold.checked;
    }
    const inputBubbleRoundEl = document.getElementById('input-bubble-round');
    if (inputBubbleRoundEl) {
      config['bubble-round'] = parseInt(inputBubbleRoundEl.value, 10);
    }
    if (inputMeBubbleColor) {
      config['me-bubble-color'] = inputMeBubbleColor.value;
    }
    if (inputYouBubbleColor) {
      config['you-bubble-color'] = inputYouBubbleColor.value;
    }
    if (inputTimeColor) {
      config['time-color'] = inputTimeColor.value;
    }

    const autoScrollEl = document.getElementById('input-auto-scroll');
    config['auto-scroll'] = autoScrollEl ? autoScrollEl.checked : true;

    return config;
  }

  function syncMeNameDropdown(text) {
    const { dialogs } = parseInputText(text);
    const persons = new Set();
    dialogs.forEach(d => {
      if (d.person && !d.person.startsWith('=')) {
        persons.add(d.person);
        getOrRegisterAvatarSettings(d.person);
      }
    });

    const currentValue = inputMeName.value;
    inputMeName.innerHTML = '<option value="">없음</option>';
    
    persons.forEach(person => {
      const option = document.createElement('option');
      option.value = person;
      option.textContent = person;
      inputMeName.appendChild(option);
    });

    const yourNameEl = document.getElementById('input-your-name');
    const roomName = yourNameEl ? yourNameEl.value.trim() : '';
    const personsArr = Array.from(persons);

    // 참여자 3명 이상일 때 실물 캡처처럼 "그룹채팅 5" 자동 인원수 표시 연동
    if (personsArr.length >= 3 && yourNameEl && (!roomName || roomName === '그룹채팅' || roomName.startsWith('그룹채팅'))) {
      yourNameEl.value = `그룹채팅 ${personsArr.length}`;
      loadedConfig['your-name'] = yourNameEl.value;
    }

    if (personsArr.length === 2 && roomName && personsArr.includes(roomName)) {
      const autoMe = personsArr.find(p => p !== roomName);
      if (autoMe) {
        inputMeName.value = autoMe;
        loadedConfig['me'] = autoMe;
        return;
      }
    }

    const targetMe = currentValue || loadedConfig['me'];
    if (targetMe && persons.has(targetMe)) {
      inputMeName.value = targetMe;
    } else {
      inputMeName.value = '';
    }
  }

  function handleImageUpload(file, person, previewCircle, base64HiddenInput) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const canvasObj = document.createElement('canvas');
        canvasObj.width = 120;
        canvasObj.height = 120;
        const ctxObj = canvasObj.getContext('2d');

        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctxObj.drawImage(img, sx, sy, minDim, minDim, 0, 0, 120, 120);

        const compressedBase64 = canvasObj.toDataURL('image/jpeg', 0.85);
        base64HiddenInput.value = compressedBase64;

        previewCircle.textContent = '';
        previewCircle.style.backgroundImage = `url(${compressedBase64})`;
        previewCircle.style.backgroundSize = 'cover';
        previewCircle.style.backgroundPosition = 'center';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function renderAvatarModalContent(persons) {
    const personsArr = Array.from(persons); // Set 또는 Array 모두 호환되도록 배열 변환
    avatarSettingsList.innerHTML = '';
    initKoreanVoices();

    const avatarSpeakerSelect = document.getElementById('avatar-speaker-select');
    
    // 현재 모달에 활성화되어 있는 유저의 입력을 임시 저장하는 헬퍼 함수
    const saveCurrentActiveSpeaker = () => {
      const activeRow = avatarSettingsList.querySelector('.avatar-item-row');
      if (activeRow) {
        const activePerson = activeRow.getAttribute('data-speaker');
        const textVal = activeRow.querySelector(`#avatar-text-${activePerson}`).value || activePerson.charAt(0);
        const colorVal = activeRow.querySelector(`#avatar-color-${activePerson}`).value;
        const textColorVal = activeRow.querySelector(`#avatar-textcolor-${activePerson}`).value;
        const base64ImageVal = activeRow.querySelector(`#avatar-image-data-${activePerson}`).value || '';
        const voiceSelect = activeRow.querySelector(`#avatar-voice-${activePerson}`);
        const voiceURIVal = voiceSelect ? voiceSelect.value : '';
        avatarSettingsMap[activePerson] = {
          color: colorVal,
          text: textVal,
          textColor: textColorVal,
          image: base64ImageVal,
          voiceURI: voiceURIVal
        };
      }
    };

    // 특정 유저의 한 프로필만 렌더링하는 함수
    const renderSpeakerRow = (person) => {
      avatarSettingsList.innerHTML = '';
      const settings = getOrRegisterAvatarSettings(person);
      const row = document.createElement('div');
      row.className = 'avatar-item-row';
      row.setAttribute('data-speaker', person);

      const voiceOptions = koreanVoices.map(v => 
        `<option value="${v.voiceURI}" ${settings.voiceURI === v.voiceURI ? 'selected' : ''}>${v.name}</option>`
      ).join('');

      row.innerHTML = `
        <div class="avatar-preview-container">
          <div id="avatar-preview-${person}" class="avatar-preview-circle">${settings.text}</div>
        </div>
        <div class="avatar-inputs-grid">
          <div style="font-weight: bold; color: #0f172a; margin-bottom: 2px;">대화 상대: ${person}</div>
          <div class="avatar-input-subrow">
            <label>표시 글자</label>
            <input type="text" id="avatar-text-${person}" value="${settings.text}" maxlength="2" style="width: 100%;">
          </div>
          <div class="avatar-input-subrow">
            <label>배경 색상</label>
            <input type="color" id="avatar-color-${person}" value="${settings.color}">
          </div>
          <div class="avatar-input-subrow">
            <label>글자 색상</label>
            <input type="color" id="avatar-textcolor-${person}" value="${settings.textColor}">
          </div>
          <div class="avatar-input-subrow">
            <label>프로필 사진</label>
            <div class="avatar-image-controls">
              <label for="file-avatar-${person}" class="avatar-btn-upload">사진 찾기</label>
              <input type="file" id="file-avatar-${person}" accept="image/*" style="display: none;">
              <button type="button" id="btn-del-avatar-${person}" class="avatar-btn-delete">사진 삭제</button>
            </div>
            <input type="hidden" id="avatar-image-data-${person}" value="${settings.image || ''}">
          </div>
          <div class="avatar-input-subrow">
            <label>목소리 낭독</label>
            <select id="avatar-voice-${person}" class="avatar-voice-select">
              <option value="">기본 음성</option>
              ${voiceOptions}
            </select>
          </div>
          <div class="avatar-input-subrow">
            <label>추천 팔레트</label>
            <div class="palette-container">
              ${defaultColors.map(c => `<span class="palette-color-dot" style="background-color: ${c};" data-color="${c}" data-person="${person}"></span>`).join('')}
            </div>
          </div>
        </div>
      `;
      avatarSettingsList.appendChild(row);

      const textInput = row.querySelector(`#avatar-text-${person}`);
      const colorInput = row.querySelector(`#avatar-color-${person}`);
      const textColorInput = row.querySelector(`#avatar-textcolor-${person}`);
      const previewCircle = row.querySelector(`#avatar-preview-${person}`);
      const fileInput = row.querySelector(`#file-avatar-${person}`);
      const delBtn = row.querySelector(`#btn-del-avatar-${person}`);
      const base64HiddenInput = row.querySelector(`#avatar-image-data-${person}`);

      if (settings.image) {
        previewCircle.textContent = '';
        previewCircle.style.backgroundImage = `url(${settings.image})`;
        previewCircle.style.backgroundSize = 'cover';
        previewCircle.style.backgroundPosition = 'center';
      } else {
        previewCircle.style.backgroundColor = settings.color;
        previewCircle.style.color = settings.textColor;
      }

      const refreshPreview = () => {
        if (!base64HiddenInput.value) {
          previewCircle.textContent = textInput.value || person.charAt(0);
          previewCircle.style.backgroundImage = 'none';
          previewCircle.style.backgroundColor = colorInput.value;
          previewCircle.style.color = textColorInput.value;
        } else {
          previewCircle.textContent = '';
        }
      };

      textInput.addEventListener('input', refreshPreview);
      colorInput.addEventListener('input', refreshPreview);
      textColorInput.addEventListener('input', refreshPreview);

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          handleImageUpload(file, person, previewCircle, base64HiddenInput);
        }
      });

      delBtn.addEventListener('click', () => {
        base64HiddenInput.value = '';
        fileInput.value = '';
        refreshPreview();
      });

      row.querySelectorAll('.palette-color-dot').forEach(dot => {
        dot.addEventListener('click', () => {
          const selectedColor = dot.getAttribute('data-color');
          colorInput.value = selectedColor;
          refreshPreview();
        });
      });
    };

    if (avatarSpeakerSelect) {
      avatarSpeakerSelect.innerHTML = personsArr.map(p => `<option value="${p}">${p}</option>`).join('');
      avatarSpeakerSelect.onchange = () => {
        // 셀렉트 변경 전 현재 화면의 데이터 임시 보존
        saveCurrentActiveSpeaker();
        const selectedPerson = avatarSpeakerSelect.value;
        renderSpeakerRow(selectedPerson);
      };
    }

    // 기본적으로 첫 번째 사람을 모달에 바로 로드하여 보여줌
    if (personsArr.length > 0) {
      const initialSpeaker = avatarSpeakerSelect ? avatarSpeakerSelect.value : personsArr[0];
      renderSpeakerRow(initialSpeaker);
    }
  }

  function saveSettingsToFile() {
    const uiConfig = gatherConfigFromUI();
    let settingText = '## settings\n';
    
    settingText += `-capture-time: ${uiConfig['capture-time']}\n`;
    settingText += `-battery: ${uiConfig['battery']}\n`;
    settingText += `-your-name: ${uiConfig['your-name']}\n`;
    settingText += `-background-color: ${uiConfig['background-color']}\n`;
    settingText += `-me: ${uiConfig['me']}\n`;
    settingText += `-font: ${uiConfig['font'] || 'sans-serif'}\n`;
    
    // v0.0.10 직렬화 세이브
    settingText += `-font-size: ${uiConfig['font-size'] || '38'}\n`;
    settingText += `-font-bold: ${uiConfig['font-bold'] !== undefined ? uiConfig['font-bold'] : 'false'}\n`;
    settingText += `-bubble-round: ${uiConfig['bubble-round'] !== undefined ? uiConfig['bubble-round'] : '32'}\n`;
    settingText += `-me-bubble-color: ${uiConfig['me-bubble-color'] || '#fee500'}\n`;
    settingText += `-you-bubble-color: ${uiConfig['you-bubble-color'] || '#2a2a2a'}\n`;
    settingText += `-time-color: ${uiConfig['time-color'] || '#8e8e93'}\n`;
    
    const inputDuration = document.getElementById('input-duration');
    settingText += `-duration: ${inputDuration ? inputDuration.value : '0.5'}\n`;

    Object.keys(avatarSettingsMap).forEach(person => {
      const s = avatarSettingsMap[person];
      settingText += `-avatar_${person}: ${s.color}|${s.text}|${s.textColor}|${s.image || ''}|${s.voiceURI || ''}\n`;
    });

    const blob = new Blob([settingText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'iseohyun.prj.kakaotalk.setting.defalut.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function loadDefaultData() {
    const defaultSettingsFallback = `- height: 2340\n- background-color: #acc0d1\n- me-bubble-color: #fee500\n- me-text-color: #000000\n- you-bubble-color: #ffffff\n- you-text-color: #000000\n- me-name: 구인호\n- your-name: 그룹채팅`;
    const defaultExampleFallback = `2026년 7월 19일 오전 11:37, 구인호 : 재현아 우리 양양 갔을 때 먹었던 가오리찜 가게 이름이 뭐냐\n\n2026년 7월 22일 오전 11:35\n2026년 7월 22일 오전 11:35, 정재현 : 황가네\n2026년 7월 22일 오전 11:36, 구인호 : 빠르네 ㅋㅋㅋ\n2026년 7월 22일 오전 11:46, 최경은 : ㅋㅋㅋㅋㅋ\n2026년 7월 22일 오전 11:47, 구인호 : 우리가 가려던 식당인 듯하군\n2026년 7월 22일 오전 11:47, 구인호 : 그런느낌\n2026년 7월 22일 오전 11:49, 구인호 : 다른곳이라고 답이 옴 ㅋㅋ\n2026년 7월 22일 오후 2:16, 정재현 : 이모네?\n2026년 7월 22일 오후 2:16, 정재현 : 거긴 매콤하고 황가네는 좀 달콤하고\n2026년 7월 22일 오후 2:17, 정재현 : 근데 거긴 속촌데 양양은 모르겠다\n2026년 7월 22일 오후 2:23, 구인호 : 숙소가 고성이라 속초 양양 어디로 갈지는 모름\n2026년 7월 22일 오후 4:22, 정재현 : 고성이랑 양양은 한시간 거린데\n2026년 7월 22일 오후 4:23, 구인호 : 일단 만석닭강정은 감`;

    try {
      originalSettingsText = defaultSettingsFallback;
      const settings = parseSettings(originalSettingsText);
      applySettingsToUI(settings);

      if (chatInput && (!chatInput.value || chatInput.value.trim() === '')) {
        chatInput.value = defaultExampleFallback;
        const { dialogs: rawDialogs } = parseInputText(defaultExampleFallback);
        const cleanDialogs = rawDialogs.filter(d => d.person && d.person.trim() !== '');
        const totalCount = cleanDialogs.length;
        startRangeIndex = 1;
        endRangeIndex = totalCount || 4;
        const progressEl = document.getElementById('input-progress');
        if (progressEl) {
          progressEl.min = 1;
          progressEl.max = totalCount || 4;
          progressEl.value = totalCount || 4;
        }
        syncMeNameDropdown(defaultExampleFallback);
        await parseAndApplyDateHeader(defaultExampleFallback);
      }

      if (triggerUpdateCallback) triggerUpdateCallback(true);
    } catch (error) {
      console.warn('기본 데이터 초기화 경고:', error);
    }
  }

  /**
   * 대화 데이터 파싱 및 시간 메타데이터 정밀 추출 (v0.0.10)
   */
  function parseInputText(text) {
    const lines = text.split('\n');
    const config = {};
    const dialogs = [];

    const chatRegex = /^(\d{4}년 \d{1,2}월 \d{1,2}일 (오전|오후) \d{1,2}:\d{1,2}),\s*([^:]+)\s*:\s*(.*)$/;
    const dateHeaderRegex = /^(\d{4}년 \d{1,2}월 \d{1,2}일)\s*(오전|오후)\s*\d{1,2}:\d{1,2}$/;
    const simpleDateRegex = /^(\d{4}년 \d{1,2}월 \d{1,2}일(\s*[월화수목금토일]요일)?)$/;

    lines.forEach((line) => {
      line = line.trim();
      if (!line) return;

      if (line.startsWith('-')) {
        const [rawKey, ...valueParts] = line.slice(1).split(':');
        const value = valueParts.join(':').trim();
        
        let key = rawKey.trim();
        if (key === 'setting-bgcolor' || key === 'background-color' || key === '_bgcolor') {
          key = 'background-color';
        }

        if (key.startsWith('avatar_')) {
          const person = key.replace('avatar_', '');
          const [bgCol, innerTxt, fgCol, imgData, voiceURI] = value.split('|');
          avatarSettingsMap[person] = {
            color: bgCol || '#DE8',
            text: innerTxt || person.charAt(0),
            textColor: fgCol || '#ffffff',
            image: imgData || '',
            voiceURI: voiceURI || ''
          };
          return;
        }

        config[key] = value;
        return;
      }

      if (line.startsWith('#')) return;

      if (line.endsWith('카카오톡 대화')) {
        let roomName = line;
        if (roomName.endsWith(' 님과 카카오톡 대화')) {
          roomName = roomName.replace(' 님과 카카오톡 대화', '').trim();
        } else if (roomName.endsWith('님과 카카오톡 대화')) {
          roomName = roomName.replace('님과 카카오톡 대화', '').trim();
        } else {
          roomName = roomName.replace('카카오톡 대화', '').trim();
        }
        if (roomName) config['your-name'] = roomName;
        return;
      }

      if (line.startsWith('저장한 날짜 :')) return;

      const chatMatch = line.match(chatRegex);
      if (chatMatch) {
        const person = chatMatch[3].trim();
        const message = chatMatch[4].trim();

        // 메타데이터 대화 시각 추출 (예: "오후 12:01" -> "12:01")
        let parsedTime = '';
        const timePart = chatMatch[1].match(/(오전|오후)\s*(\d{1,2}):(\d{2})/);
        if (timePart) {
          const ampm = timePart[1];
          let h = parseInt(timePart[2]);
          const m = timePart[3];
          parsedTime = `${ampm} ${h}:${m}`;
        }

        dialogs.push({ person, message, time: parsedTime, rawTime: chatMatch[1] });
        return;
      }

      const dateHeaderMatch = line.match(dateHeaderRegex) || line.match(simpleDateRegex);
      if (dateHeaderMatch) {
        const dateStr = dateHeaderMatch[1];
        const formattedDate = dateStr
          .replace('년', '-')
          .replace('월', '-')
          .replace('일', '')
          .replace(/\s+/g, '');
        dialogs.push({ person: '=' + formattedDate, message: '' });
        return;
      }

      if (line.startsWith('=')) {
        dialogs.push({ person: line, message: '' });
        return;
      }



      if (dialogs.length > 0) {
        const lastDialog = dialogs[dialogs.length - 1];
        if (lastDialog.person && !lastDialog.person.startsWith('=')) {
          lastDialog.message += ' \\ ' + line;
        }
      }
    });

    return { config, dialogs };
  }

  function downloadCanvasImage() {
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kakaotalk_chat.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function downloadCanvasSVG() {
    if (!canvas) return;
    const inputVal = chatInput ? chatInput.value : '';
    const { config: parsedConfig, dialogs } = parseInputText(inputVal);
    const fullConfig = gatherConfigFromUI(parsedConfig);

    let svgString = '';
    if (window.ChatEngine && window.ChatEngine.exportTrueSVG) {
      svgString = window.ChatEngine.exportTrueSVG(canvas, fullConfig, dialogs, avatarSettingsMap);
    }

    if (!svgString) {
      console.error('SVG 내보내기 실패: ChatEngine.exportTrueSVG가 결과물을 생성하지 못했습니다.');
      return;
    }

    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kakaotalk_chat.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function updateDoubleSliderUI(totalCount) {
    const track = document.querySelector('.double-slider-container');
    const range = document.getElementById('double-slider-range');
    const handleStart = document.getElementById('slider-handle-start');
    const handleEnd = document.getElementById('slider-handle-end');
    const labelRange = document.getElementById('label-double-range');

    if (!track || !range || !handleStart || !handleEnd || !labelRange) return;

    if (totalCount <= 0) {
      labelRange.textContent = '1 ~ 0';
      handleStart.style.left = '0%';
      handleEnd.style.left = '0%';
      range.style.left = '0%';
      range.style.right = '100%';
      return;
    }

    labelRange.textContent = `${startRangeIndex} ~ ${endRangeIndex}`;

    // 인덱스를 0% ~ 100% 비율로 변환 (1 -> 0%, totalCount -> 100%)
    const maxDivisor = Math.max(1, totalCount - 1);
    const startPercent = ((startRangeIndex - 1) / maxDivisor) * 100;
    const endPercent = ((endRangeIndex - 1) / maxDivisor) * 100;

    handleStart.style.left = `${startPercent}%`;
    handleEnd.style.left = `${endPercent}%`;

    range.style.left = `${startPercent}%`;
    range.style.right = `${100 - endPercent}%`;
  }

  function setupDoubleSliderEvents() {
    const container = document.querySelector('.double-slider-container');
    const handleStart = document.getElementById('slider-handle-start');
    const handleEnd = document.getElementById('slider-handle-end');

    if (!container || !handleStart || !handleEnd) return;

    let activeHandle = null;

    const onStart = (e) => {
      const target = e.target.closest('.double-slider-handle');
      if (!target) return;

      activeHandle = target;
      activeHandle.classList.add('active');

      e.preventDefault();
      onMove(e);
    };

    const onMove = (e) => {
      if (!activeHandle) return;

      const rect = container.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      let ratio = (clientX - rect.left) / rect.width;
      ratio = Math.max(0, Math.min(1, ratio));

      const chatInputVal = chatInput ? chatInput.value : '';
      const { dialogs: rawDialogs } = parseInputText(chatInputVal);
      const cleanDialogs = rawDialogs.filter(d => d.person && d.person.trim() !== '');
      const totalCount = cleanDialogs.length;

      if (totalCount <= 0) return;

      let index = Math.round(ratio * (totalCount - 1)) + 1;

      if (activeHandle === handleStart) {
        index = Math.min(index, endRangeIndex);
        startRangeIndex = index;
      } else {
        index = Math.max(index, startRangeIndex);
        endRangeIndex = index;
      }

      const tooltip = activeHandle.querySelector('.slider-tooltip');
      if (tooltip) {
        const dialog = cleanDialogs[index - 1];
        let textVal = '';
        if (dialog) {
          textVal = dialog.person.startsWith('=') ? dialog.person.slice(1) : dialog.message;
        }
        textVal = textVal.trim();
        const tooltipText = textVal.length > 5 ? textVal.substring(0, 5) + '...' : textVal;
        tooltip.textContent = tooltipText || '(빈 메시지)';
      }

      if (triggerUpdateCallback) {
        triggerUpdateCallback(false);
      }
    };

    const onEnd = () => {
      if (activeHandle) {
        activeHandle.classList.remove('active');
        activeHandle = null;
      }
    };

    handleStart.addEventListener('mousedown', onStart);
    handleEnd.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    handleStart.addEventListener('touchstart', onStart, { passive: false });
    handleEnd.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
  }

  /**
   * 테마 모달 실시간 예시 미리보기 전용 미니 렌더러 (v1.3.0)
   * 360x460 규격에 맞춰 7개 세부 색상을 실제 카카오톡 화면처럼 정교하고 아름답게 렌더링
   */
  function drawThemePreviewCanvas(canvas, ctx, colors) {
    const width = 360;
    const height = 460;

    canvas.width = width;
    canvas.height = height;

    const bgColor = colors['setting-bgcolor'] || '#acc0d1';
    const meBubbleColor = colors['me-bubble-color'] || '#fee500';
    const meTextColor = colors['me-text-color'] || '#000000';
    const youBubbleColor = colors['you-bubble-color'] || '#ffffff';
    const youTextColor = colors['you-text-color'] || '#000000';
    const youNameColor = colors['you-name-color'] || '#374151';
    const timeColor = colors['time-color'] || '#64748b';
    const dateTextColor = colors['date-text-color'] || '#475569';

    // 1. 전체 대화방 배경 칠하기
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // 2. 미니 상태바 (Status Bar)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.font = '500 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('오전 10:04', 16, 22);

    ctx.textAlign = 'right';
    ctx.fillText('📶 83% 🔋', width - 16, 22);

    // 3. 미니 상단 헤더 (Header Bar)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('←  그룹채팅 5', 16, 54);

    ctx.textAlign = 'right';
    ctx.font = '16px sans-serif';
    ctx.fillText('🔍  ☰', width - 16, 54);

    // 4. 날짜 헤더 뱃지 (Date Badge)
    const dateStr = '2026년 8월 9일 일요일';
    ctx.font = '500 11px sans-serif';
    const dateMetrics = ctx.measureText(dateStr);
    const dateW = dateMetrics.width + 20;
    const dateX = (width - dateW) / 2;
    const dateY = 76;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.beginPath();
    ctx.roundRect(dateX, dateY, dateW, 22, 11);
    ctx.fill();

    ctx.fillStyle = dateTextColor;
    ctx.textAlign = 'center';
    ctx.fillText(dateStr, width / 2, dateY + 15);

    // 5. 상대방 메시지 (정재현)
    const youY = 118;
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(32, youY + 18, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('정', 32, youY + 23);

    ctx.fillStyle = youNameColor;
    ctx.font = '500 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('정재현', 56, youY + 12);

    const youMsg = '안녕하세요! 색상 변경 테스트입니다.';
    ctx.font = '13px sans-serif';
    const youMsgW = Math.min(ctx.measureText(youMsg).width + 20, 230);
    const youBubbleY = youY + 20;

    ctx.fillStyle = youBubbleColor;
    ctx.beginPath();
    ctx.roundRect(56, youBubbleY, youMsgW, 32, 12);
    ctx.fill();

    ctx.fillStyle = youTextColor;
    ctx.fillText(youMsg, 66, youBubbleY + 20);

    ctx.fillStyle = timeColor;
    ctx.font = '10px sans-serif';
    ctx.fillText('오후 2:16', 56 + youMsgW + 6, youBubbleY + 26);

    // 6. 내 메시지 (나)
    const meY = 198;
    const meMsg = '네, 실시간으로 색상이 변경되네요!';
    ctx.font = '13px sans-serif';
    const meMsgW = Math.min(ctx.measureText(meMsg).width + 20, 230);
    const meBubbleX = width - 16 - meMsgW;

    ctx.fillStyle = timeColor;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('오후 2:17', meBubbleX - 6, meY + 26);

    ctx.fillStyle = meBubbleColor;
    ctx.beginPath();
    ctx.roundRect(meBubbleX, meY, meMsgW, 32, 12);
    ctx.fill();

    ctx.fillStyle = meTextColor;
    ctx.textAlign = 'left';
    ctx.fillText(meMsg, meBubbleX + 10, meY + 20);

    // 7. 하단 메시지 입력창
    const inputY = height - 44;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(10, inputY, width - 20, 34, 17);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('+   메시지 입력...', 24, inputY + 22);

    ctx.textAlign = 'right';
    ctx.fillText('😀  #', width - 24, inputY + 22);
  }

  /**
   * 대화방 테마 상세보기 모달 제어 및 실시간 캔버스 미리보기 연동 (v1.3.0)
   * SPA 해시 라우팅 (/#/small-project/KakaoTalk/index.html) 환경 대응: 이벤트 위임 & body 텔레포트 적용
   */
  function setupThemeModalEvents() {
    const teleportModal = () => {
      const modal = document.getElementById('theme-detail-modal');
      if (modal && modal.parentElement !== document.body) {
        document.body.appendChild(modal);
      }
      return modal;
    };

    const updatePreview = () => {
      const previewCanvas = document.getElementById('theme-preview-canvas');
      if (!previewCanvas) return;
      const ctx = previewCanvas.getContext('2d');
      if (!ctx) return;

      const modalPickers = {
        'setting-bgcolor': document.getElementById('input-modal-bg-color'),
        'me-bubble-color': document.getElementById('input-modal-me-bubble-color'),
        'me-text-color': document.getElementById('input-modal-me-text-color'),
        'you-bubble-color': document.getElementById('input-modal-you-bubble-color'),
        'you-text-color': document.getElementById('input-modal-you-text-color'),
        'you-name-color': document.getElementById('input-modal-you-name-color'),
        'time-color': document.getElementById('input-modal-time-color'),
        'date-text-color': document.getElementById('input-modal-date-text-color')
      };

      const colors = {
        'setting-bgcolor': modalPickers['setting-bgcolor']?.value || '#acc0d1',
        'me-bubble-color': modalPickers['me-bubble-color']?.value || '#fee500',
        'me-text-color': modalPickers['me-text-color']?.value || '#000000',
        'you-bubble-color': modalPickers['you-bubble-color']?.value || '#ffffff',
        'you-text-color': modalPickers['you-text-color']?.value || '#000000',
        'you-name-color': modalPickers['you-name-color']?.value || '#374151',
        'time-color': modalPickers['time-color']?.value || '#64748b',
        'date-text-color': modalPickers['date-text-color']?.value || '#475569'
      };

      drawThemePreviewCanvas(previewCanvas, ctx, colors);
    };

    // SPA 전역 document 이벤트 위임 (DOM이 동적 교체되어도 100% 모달 팝업 감지)
    document.addEventListener('click', (e) => {
      const btnOpen = e.target.closest('#btn-open-theme-modal');
      if (btnOpen) {
        e.preventDefault();
        e.stopPropagation();

        const modal = teleportModal();
        if (!modal) return;

        const selTheme = document.getElementById('select-theme');
        const curThemeKey = selTheme ? selTheme.value : 'light';
        const preset = THEME_PRESETS[curThemeKey] || THEME_PRESETS['light'];

        const modalPickers = {
          'setting-bgcolor': document.getElementById('input-modal-bg-color'),
          'me-bubble-color': document.getElementById('input-modal-me-bubble-color'),
          'me-text-color': document.getElementById('input-modal-me-text-color'),
          'you-bubble-color': document.getElementById('input-modal-you-bubble-color'),
          'you-text-color': document.getElementById('input-modal-you-text-color'),
          'you-name-color': document.getElementById('input-modal-you-name-color'),
          'time-color': document.getElementById('input-modal-time-color'),
          'date-text-color': document.getElementById('input-modal-date-text-color')
        };

        Object.keys(modalPickers).forEach(key => {
          const picker = modalPickers[key];
          if (picker) {
            const val = loadedConfig[key] || preset[key];
            if (val) picker.value = val;
          }
        });

        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('z-index', '999999', 'important');
        updatePreview();
        return;
      }

      const btnApply = e.target.closest('#btn-apply-theme-modal');
      if (btnApply) {
        const modal = document.getElementById('theme-detail-modal');
        const selTheme = document.getElementById('select-theme');
        const modalPickers = {
          'setting-bgcolor': document.getElementById('input-modal-bg-color'),
          'me-bubble-color': document.getElementById('input-modal-me-bubble-color'),
          'me-text-color': document.getElementById('input-modal-me-text-color'),
          'you-bubble-color': document.getElementById('input-modal-you-bubble-color'),
          'you-text-color': document.getElementById('input-modal-you-text-color'),
          'you-name-color': document.getElementById('input-modal-you-name-color'),
          'time-color': document.getElementById('input-modal-time-color'),
          'date-text-color': document.getElementById('input-modal-date-text-color')
        };

        Object.keys(modalPickers).forEach(key => {
          const picker = modalPickers[key];
          if (picker) {
            loadedConfig[key] = picker.value;
          }
        });

        if (selTheme) selTheme.value = 'custom';
        if (modal) modal.style.setProperty('display', 'none', 'important');
        if (triggerUpdateCallback) triggerUpdateCallback(true);
        return;
      }

      const btnCancel = e.target.closest('#btn-cancel-theme-modal');
      const btnCloseHeader = e.target.closest('#btn-close-theme-modal');
      if (btnCancel || btnCloseHeader) {
        const modal = document.getElementById('theme-detail-modal');
        if (modal) modal.style.setProperty('display', 'none', 'important');
        return;
      }

      const modal = document.getElementById('theme-detail-modal');
      if (modal && e.target === modal) {
        modal.style.setProperty('display', 'none', 'important');
      }
    });

    document.addEventListener('change', (e) => {
      if (e.target.id === 'select-theme') {
        const selThemeKey = e.target.value;
        if (selThemeKey === 'light' || selThemeKey === 'dark') {
          const preset = THEME_PRESETS[selThemeKey];
          if (preset) {
            Object.keys(preset).forEach(key => {
              loadedConfig[key] = preset[key];
            });
          }
        }
        if (triggerUpdateCallback) triggerUpdateCallback(true);
      }
    });

    document.addEventListener('input', (e) => {
      if (e.target.id && e.target.id.startsWith('input-modal-')) {
        updatePreview();
      }
    });
  }

  // 글로벌 Interface 네임스페이스 등록
  window.ChatInterface = {
    initInterface,
    gatherConfigFromUI,
    parseInputText,
    getAvatarSettingsMap: () => avatarSettingsMap,
    getChatInputVal: () => chatInput ? chatInput.value : ''
  };

})();
