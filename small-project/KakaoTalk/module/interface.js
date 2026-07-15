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
  let originalSettingsText = '';
  let loadedConfig = {};
  let avatarSettingsMap = {};
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

      btnCloseHelp.addEventListener('click', () => {
        helpModal.style.display = 'none';
      });

      window.addEventListener('click', (e) => {
        if (e.target === helpModal) {
          helpModal.style.display = 'none';
        }
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
      'input-me-bubble-color', // 내 말풍선 색 피커 연동
      'input-you-bubble-color', // 상대 말풍선 색 피커 연동
      'input-time-color' // 대화 시간 색 피커 연동
    ].forEach(bindLiveUpdate);

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
        const { config: parsedConfig } = parseInputText(text);
        if (parsedConfig['your-name']) {
          const yourNameEl = document.getElementById('input-your-name');
          if (yourNameEl) {
            yourNameEl.value = parsedConfig['your-name'];
          }
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

    window.addEventListener('click', (e) => {
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
        const voiceURIVal = row.querySelector(`#avatar-voice-${person}`).value || '';

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

    btnDownload.addEventListener('click', downloadCanvasImage);

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
      document.getElementById('input-capture-time').value = `${year}-${month}-${day}T${hourStr}:${minStr}`;
    }
    if (config['battery']) {
      const batteryVal = config['battery'].replace('%', '').trim();
      document.getElementById('input-battery').value = batteryVal;
    }
    const yourNameEl = document.getElementById('input-your-name');
    if (yourNameEl && config['your-name']) {
      yourNameEl.value = config['your-name'];
    }
    if (config['background-color']) {
      document.getElementById('input-bg-color').value = rgbToHex(config['background-color']);
    }
    if (config['me']) {
      loadedConfig['me'] = config['me'];
      inputMeName.value = config['me'];
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
    if (config['me-bubble-color'] && inputMeBubbleColor) {
      inputMeBubbleColor.value = config['me-bubble-color'];
    }
    if (config['you-bubble-color'] && inputYouBubbleColor) {
      inputYouBubbleColor.value = config['you-bubble-color'];
    }
    if (config['time-color'] && inputTimeColor) {
      inputTimeColor.value = config['time-color'];
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
    const config = { ...loadedConfig };

    const captureTimeInput = document.getElementById('input-capture-time').value;
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

    const batteryVal = document.getElementById('input-battery').value || '83';
    document.getElementById('label-battery').textContent = batteryVal + '%';
    config['battery'] = batteryVal + '%';

    const yourNameEl = document.getElementById('input-your-name');
    config['your-name'] = yourNameEl ? (yourNameEl.value || '그룹채팅') : '그룹채팅';

    const hexBgColor = document.getElementById('input-bg-color').value || '#acc0d1';
    config['background-color'] = hexBgColor;

    config['me'] = inputMeName.value || '나';

    config['wifi'] = parseInt(document.getElementById('input-wifi').value);
    document.getElementById('label-wifi').textContent = (config['wifi'] * 25) + '%';

    config['cell'] = parseInt(document.getElementById('input-cell').value);
    document.getElementById('label-cell').textContent = (config['cell'] * 25) + '%';

    const inputW = document.getElementById('input-width');
    const inputH = document.getElementById('input-height');
    config['width'] = inputW ? (parseInt(inputW.value) || 1080) : 1080;
    config['height'] = inputH ? (parseInt(inputH.value) || 2000) : 2000;

    const progressEl = document.getElementById('input-progress');
    const progressVal = progressEl ? parseInt(progressEl.value) : 0;
    config['progress'] = progressVal;

    // v0.0.10: [현재 대화 / 전체 개수] 진행 라벨 세부 매핑
    const chatInputVal = chatInput ? chatInput.value : '';
    const { dialogs: rawDialogs } = parseInputText(chatInputVal);
    const cleanDialogs = rawDialogs.filter(d => d.person && d.person.trim() !== '');
    const totalCount = cleanDialogs.length;

    if (progressEl && parseInt(progressEl.max) !== totalCount) {
      progressEl.max = totalCount;
    }

    const labelProgressEl = document.getElementById('label-progress');
    if (labelProgressEl) {
      labelProgressEl.textContent = `${progressVal} / ${totalCount}개`;
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

    // v0.0.10 피드백: 참여자 2명 및 방 이름이 상대방 이름일 때 상대방을 제외한 나머지 화자를 내 이름으로 자동 선택
    const yourNameEl = document.getElementById('input-your-name');
    const roomName = yourNameEl ? yourNameEl.value.trim() : '';
    const personsArr = Array.from(persons);

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
    avatarSettingsList.innerHTML = '';
    initKoreanVoices();

    persons.forEach(person => {
      const settings = getOrRegisterAvatarSettings(person);
      const row = document.createElement('div');
      row.className = 'avatar-item-row';

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
    });
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
    settingText += `-font-bold: ${uiConfig['font-bold'] !== undefined ? uiConfig['font-bold'] : 'true'}\n`;
    settingText += `-me-bubble-color: ${uiConfig['me-bubble-color'] || '#ffeb34'}\n`;
    settingText += `-you-bubble-color: ${uiConfig['you-bubble-color'] || '#ffffff'}\n`;
    settingText += `-time-color: ${uiConfig['time-color'] || '#cccccc'}\n`;
    
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
    try {
      const [settingsRes, exampleRes] = await Promise.all([
        fetch(getAbsoluteUrl('src/default-setting.md')),
        fetch(getAbsoluteUrl('example/example1.txt'))
      ]);

      if (!settingsRes.ok) throw new Error('default-setting.md 로드 실패');
      if (!exampleRes.ok) throw new Error('example1.txt 로드 실패');

      originalSettingsText = await settingsRes.text();
      const exampleText = await exampleRes.text();

      const settings = parseSettings(originalSettingsText);
      applySettingsToUI(settings);

      chatInput.value = exampleText.trim();
      syncMeNameDropdown(exampleText);
      await parseAndApplyDateHeader(exampleText);
      if (triggerUpdateCallback) triggerUpdateCallback(true);
    } catch (error) {
      console.error('기본 데이터 초기화 실패:', error);
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
    a.download = 'capture.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
