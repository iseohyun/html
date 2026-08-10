/**
 * KakaoTalk Shortcut Manager & Edit History System
 * Module: shortcut-manager.js
 */

(function () {
  'use strict';

  let historyStack = [];
  let historyIndex = -1;
  const MAX_HISTORY = 50;
  let isScrollLocked = false;
  let isInitializingHistory = false;

  /**
   * 스크롤 고정 토스트 알림 메시지 출력
   */
  function showToastNotification(message, isLocked) {
    let toast = document.getElementById('scroll-lock-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'scroll-lock-toast';
      toast.style.cssText = `
        position: fixed;
        top: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(-10px);
        background: rgba(15, 23, 42, 0.92);
        color: #ffffff;
        padding: 10px 20px;
        border-radius: 30px;
        font-size: 0.95rem;
        font-weight: bold;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        border: 1.5px solid ${isLocked ? '#ef4444' : '#10b981'};
        z-index: 99999;
        pointer-events: none;
        opacity: 0;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        align-items: center;
        gap: 8px;
      `;
      document.body.appendChild(toast);
    }

    toast.style.border = `1.5px solid ${isLocked ? '#ef4444' : '#10b981'}`;
    toast.innerHTML = `${isLocked ? '🔒' : '🔓'} ${message}`;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';

    if (window._toastTimer) clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-10px)';
    }, 1500);
  }

  /**
   * 스크롤 고정 토글 (애니메이션 -> 부가 기능 -> 스크롤 고정 #input-auto-scroll 체크박스 토글)
   */
  function toggleScrollLock(forceState) {
    const autoScrollEl = document.getElementById('input-auto-scroll');
    let isChecked = false;

    if (autoScrollEl) {
      if (typeof forceState === 'boolean') {
        autoScrollEl.checked = forceState;
      } else {
        autoScrollEl.checked = !autoScrollEl.checked;
      }
      isChecked = autoScrollEl.checked;
      autoScrollEl.dispatchEvent(new Event('change', { bubbles: true }));
      autoScrollEl.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      if (typeof forceState === 'boolean') {
        isScrollLocked = forceState;
      } else {
        isScrollLocked = !isScrollLocked;
      }
      isChecked = isScrollLocked;
    }

    if (isChecked) {
      showToastNotification('스크롤 고정 (Scroll Lock) ON', true);
    } else {
      showToastNotification('스크롤 고정 (Scroll Lock) OFF', false);
    }
  }

  /**
   * Undo / Redo 버튼 활성화 상태 동기화
   */
  function updateHistoryButtonStates() {
    const btnUndo = document.getElementById('btn-undo-history');
    const btnRedo = document.getElementById('btn-redo-history');

    if (btnUndo) {
      const canUndo = historyIndex > 0;
      btnUndo.disabled = !canUndo;
      btnUndo.style.opacity = canUndo ? '1' : '0.4';
      btnUndo.style.cursor = canUndo ? 'pointer' : 'not-allowed';
    }

    if (btnRedo) {
      const canRedo = historyIndex >= 0 && historyIndex < historyStack.length - 1;
      btnRedo.disabled = !canRedo;
      btnRedo.style.opacity = canRedo ? '1' : '0.4';
      btnRedo.style.cursor = canRedo ? 'pointer' : 'not-allowed';
    }
  }

  /**
   * 히스토리 스택에 현재 UI 설정 스냅샷 추가
   */
  function pushHistoryState(label) {
    if (isInitializingHistory) return;
    if (!window.ChatInterface || !window.ChatInterface.gatherConfigFromUI) return;

    const currentConfig = window.ChatInterface.gatherConfigFromUI();
    const currentChatText = window.ChatInterface.getChatInputVal ? window.ChatInterface.getChatInputVal() : '';
    const currentAvatarMap = window.ChatInterface.getAvatarSettingsMap ? JSON.parse(JSON.stringify(window.ChatInterface.getAvatarSettingsMap())) : {};

    const snapshot = {
      config: JSON.parse(JSON.stringify(currentConfig)),
      chatText: currentChatText,
      avatarMap: currentAvatarMap,
      label: label || '설정 변경',
      timestamp: Date.now()
    };

    // 동일한 스냅샷 중복 기록 방지
    if (historyIndex >= 0 && historyStack[historyIndex]) {
      const prev = historyStack[historyIndex];
      if (JSON.stringify(prev.config) === JSON.stringify(snapshot.config) &&
          prev.chatText === snapshot.chatText &&
          JSON.stringify(prev.avatarMap) === JSON.stringify(snapshot.avatarMap)) {
        return;
      }
    }

    // 복원 상태(Undo 수행 상태)에서 새 작업을 수행하는 경우 현재 위치 이후(Redo 스택) 모두 삭제 후 새 작업 추가
    if (historyIndex >= 0 && historyIndex < historyStack.length - 1) {
      historyStack = historyStack.slice(0, historyIndex + 1);
    }

    historyStack.push(snapshot);
    if (historyStack.length > MAX_HISTORY) {
      historyStack.shift();
      historyIndex = historyStack.length - 1;
    } else {
      historyIndex = historyStack.length - 1;
    }

    refreshHistoryUIIfOpen();
    updateHistoryButtonStates();
  }

  /**
   * 지정된 히스토리 스냅샷으로 UI 복원
   */
  function applyHistoryState(snapshot) {
    if (!snapshot || !window.ChatInterface) return;
    isInitializingHistory = true;

    try {
      const oldCfg = window.ChatInterface.gatherConfigFromUI ? window.ChatInterface.gatherConfigFromUI() : {};

      if (snapshot.config) {
        if (window.ChatInterface.applySettingsToUI) {
          window.ChatInterface.applySettingsToUI(snapshot.config);
        } else if (window.ChatInterface.loadConfigToUI) {
          window.ChatInterface.loadConfigToUI(snapshot.config);
        }
      }
      if (snapshot.chatText !== undefined && window.ChatInterface.setChatInputVal) {
        window.ChatInterface.setChatInputVal(snapshot.chatText);
      }
      if (snapshot.avatarMap && window.ChatInterface.setAvatarSettingsMap) {
        window.ChatInterface.setAvatarSettingsMap(snapshot.avatarMap);
      }

      if (window.logColorChange && snapshot.config) {
        const newCfg = snapshot.config;
        const srcTag = `히스토리 복원 (스냅샷: ${snapshot.label || 'Undo/Redo'})`;
        if (oldCfg['background-color'] && newCfg['background-color']) {
          window.logColorChange(srcTag, '대화방 배경색', oldCfg['background-color'], newCfg['background-color']);
        }
        if (oldCfg['me-bubble-color'] && newCfg['me-bubble-color']) {
          window.logColorChange(srcTag, '내 말풍선 색', oldCfg['me-bubble-color'], newCfg['me-bubble-color']);
        }
        if (oldCfg['you-bubble-color'] && newCfg['you-bubble-color']) {
          window.logColorChange(srcTag, '상대방 말풍선 색', oldCfg['you-bubble-color'], newCfg['you-bubble-color']);
        }
      }
    } finally {
      isInitializingHistory = false;
    }

    if (window.ChatEngine && window.ChatEngine.drawCanvasChat) {
      const canvas = document.getElementById('chat-canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const config = window.ChatInterface.gatherConfigFromUI();
        const text = window.ChatInterface.getChatInputVal ? window.ChatInterface.getChatInputVal() : '';
        const { dialogs } = window.ChatInterface.parseInputText ? window.ChatInterface.parseInputText(text) : { dialogs: [] };
        const avatarMap = window.ChatInterface.getAvatarSettingsMap ? window.ChatInterface.getAvatarSettingsMap() : {};
        window.ChatEngine.drawCanvasChat(canvas, ctx, config, dialogs, avatarMap);
      }
    }

    // 언두나 리두가 일어났을 때 히스토리 드로어 패널을 열고 상태 업데이트
    if (window.ChatInterface && window.ChatInterface.openDrawerTab) {
      window.ChatInterface.openDrawerTab('drawer-tab-history', '📜 작업 히스토리', null);
    }

    renderHistoryPanelUI();
    updateHistoryButtonStates();
  }

  /**
   * 커스텀 단축키 설정 데이터 정의 (주단축키 / 보조단축키)
   */
  const DEFAULT_SHORTCUTS = {
    scrollLock: {
      id: 'scrollLock',
      label: '스크롤 고정 토글',
      defaultPrimary: 'CapsLock',
      primaryKey: 'CapsLock',
      defaultSecondary: 'ScrollLock',
      secondaryKey: 'ScrollLock'
    },
    progressInc: {
      id: 'progressInc',
      label: '대화 진행률 증가',
      defaultPrimary: '+',
      primaryKey: '+',
      defaultSecondary: 'NumpadAdd',
      secondaryKey: 'NumpadAdd'
    },
    progressDec: {
      id: 'progressDec',
      label: '대화 진행률 감소',
      defaultPrimary: '-',
      primaryKey: '-',
      defaultSecondary: 'NumpadSub',
      secondaryKey: 'NumpadSub'
    },
    play: {
      id: 'play',
      label: '재생 & 일시정지',
      defaultPrimary: 'Space',
      primaryKey: 'Space',
      defaultSecondary: 'P',
      secondaryKey: 'P'
    },
    download: {
      id: 'download',
      label: '이미지 / SVG 저장',
      defaultPrimary: 'Ctrl + S',
      primaryKey: 'Ctrl + S',
      defaultSecondary: 'Cmd + S',
      secondaryKey: 'Cmd + S'
    },
    load: {
      id: 'load',
      label: '설정 파일 불러오기',
      defaultPrimary: 'Ctrl + O',
      primaryKey: 'Ctrl + O',
      defaultSecondary: 'Cmd + O',
      secondaryKey: 'Cmd + O'
    },
    undo: {
      id: 'undo',
      label: '실행 취소 (Undo)',
      defaultPrimary: 'Ctrl + Z',
      primaryKey: 'Ctrl + Z',
      defaultSecondary: 'Alt + Backspace',
      secondaryKey: 'Alt + Backspace'
    },
    redo: {
      id: 'redo',
      label: '다시 실행 (Redo)',
      defaultPrimary: 'Ctrl + Y',
      primaryKey: 'Ctrl + Y',
      defaultSecondary: 'Ctrl + Shift + Z',
      secondaryKey: 'Ctrl + Shift + Z'
    },
    cycleMeName: {
      id: 'cycleMeName',
      label: '내 이름 순환 (ㄱㄴㄷ순)',
      defaultPrimary: '~',
      primaryKey: '~',
      defaultSecondary: '`',
      secondaryKey: '`'
    },
    toggleFontBold: {
      id: 'toggleFontBold',
      label: '글꼴 굵게 토글',
      defaultPrimary: 'Ctrl + B',
      primaryKey: 'Ctrl + B',
      defaultSecondary: 'Cmd + B',
      secondaryKey: 'Cmd + B'
    }
  };

  let recordingKeyId = null;
  let recordingKeyType = null; // 'primary' | 'secondary'

  function formatKeyName(e) {
    let parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey && e.key !== 'Shift') parts.push('Shift');
    if (e.altKey && e.key !== 'Alt') parts.push('Alt');

    let k = e.key;
    if (k === ' ') k = 'Space';
    if (k !== 'Control' && k !== 'Shift' && k !== 'Alt' && k !== 'Meta') {
      if (k.length === 1) k = k.toUpperCase();
      parts.push(k);
    }
    return parts.join(' + ');
  }

  function renderShortcutGuideUI() {
    const container = document.getElementById('drawer-tab-shortcut-container');
    if (!container) return;

    let html = `
      <table style="width: 100%; border-collapse: collapse; border-style: hidden; font-size: 0.8rem; background: #ffffff; margin: 0; padding: 0; box-sizing: border-box;">
        <thead>
          <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1; color: #0f172a; font-weight: bold;">
            <th style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: center; width: 1%; white-space: nowrap;">단축키 명</th>
            <th style="padding: 8px 4px; border: 1px solid #cbd5e1; text-align: center;">주단축키</th>
            <th style="padding: 8px 4px; border: 1px solid #cbd5e1; text-align: center;">보조단축키</th>
            <th style="padding: 8px 2px; border: 1px solid #cbd5e1; text-align: center; width: 36px;">초기화</th>
          </tr>
        </thead>
        <tbody>
    `;

    Object.keys(DEFAULT_SHORTCUTS).forEach((keyId, idx) => {
      const item = DEFAULT_SHORTCUTS[keyId];
      const isRecPrimary = recordingKeyId === keyId && recordingKeyType === 'primary';
      const isRecSecondary = recordingKeyId === keyId && recordingKeyType === 'secondary';
      const isCustPrimary = item.primaryKey !== item.defaultPrimary;
      const isCustSecondary = item.secondaryKey !== item.defaultSecondary;
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

      html += `
        <tr style="background: ${bg}; border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 7px 8px; border: 1px solid #e2e8f0; font-weight: bold; color: #0f172a; white-space: nowrap; width: 1%;">
            ${item.label}
          </td>

          <td style="padding: 4px 2px; border: 1px solid #e2e8f0; text-align: center;">
            <kbd class="shortcut-key-badge" data-key-id="${keyId}" data-type="primary" style="
              background: ${isRecPrimary ? '#fef3c7' : '#ffffff'};
              border: 1px solid ${isRecPrimary ? '#f59e0b' : (isCustPrimary ? '#3b82f6' : '#cbd5e1')};
              border-radius: 4px;
              padding: 2px 4px;
              font-size: 0.76rem;
              font-weight: bold;
              box-shadow: 0 1px 0 ${isRecPrimary ? '#d97706' : '#cbd5e1'};
              color: ${isRecPrimary ? '#92400e' : (isCustPrimary ? '#1d4ed8' : '#0f172a')};
              cursor: pointer;
              user-select: none;
              display: inline-block;
              max-width: 100%;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            ">${isRecPrimary ? '입력중...' : (item.primaryKey || '-')}</kbd>
          </td>

          <td style="padding: 4px 2px; border: 1px solid #e2e8f0; text-align: center;">
            <kbd class="shortcut-key-badge" data-key-id="${keyId}" data-type="secondary" style="
              background: ${isRecSecondary ? '#fef3c7' : '#ffffff'};
              border: 1px solid ${isRecSecondary ? '#f59e0b' : (isCustSecondary ? '#3b82f6' : '#cbd5e1')};
              border-radius: 4px;
              padding: 2px 4px;
              font-size: 0.76rem;
              font-weight: bold;
              box-shadow: 0 1px 0 ${isRecSecondary ? '#d97706' : '#cbd5e1'};
              color: ${isRecSecondary ? '#92400e' : (isCustSecondary ? '#1d4ed8' : '#0f172a')};
              cursor: pointer;
              user-select: none;
              display: inline-block;
              max-width: 100%;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            ">${isRecSecondary ? '입력중...' : (item.secondaryKey || '-')}</kbd>
          </td>

          <td style="padding: 4px 1px; border: 1px solid #e2e8f0; text-align: center; width: 36px;">
            <button type="button" class="btn-reset-shortcut" data-key-id="${keyId}" title="기본값 복원" style="
              background: #f1f5f9;
              border: 1px solid #cbd5e1;
              border-radius: 4px;
              width: 22px;
              height: 22px;
              font-size: 0.75rem;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              color: #475569;
              transition: background 0.2s ease;
              padding: 0;
            ">↺</button>
          </td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    container.innerHTML = html;

    container.querySelectorAll('.shortcut-key-badge').forEach(badge => {
      badge.addEventListener('click', (e) => {
        const kId = e.currentTarget.getAttribute('data-key-id');
        const kType = e.currentTarget.getAttribute('data-type');
        recordingKeyId = kId;
        recordingKeyType = kType;
        renderShortcutGuideUI();
      });
    });

    container.querySelectorAll('.btn-reset-shortcut').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const kId = e.currentTarget.getAttribute('data-key-id');
        if (DEFAULT_SHORTCUTS[kId]) {
          DEFAULT_SHORTCUTS[kId].primaryKey = DEFAULT_SHORTCUTS[kId].defaultPrimary;
          DEFAULT_SHORTCUTS[kId].secondaryKey = DEFAULT_SHORTCUTS[kId].defaultSecondary;
          renderShortcutGuideUI();
          showToastNotification(`${DEFAULT_SHORTCUTS[kId].label} 단축키가 기본값으로 초기화되었습니다.`, false);
        }
      });
    });
  }

  /**
   * 작업 히스토리 패널 UI 렌더링
   */
  function renderHistoryPanelUI() {
    const container = document.getElementById('drawer-tab-history-container');
    if (!container) return;

    if (historyStack.length === 0) {
      container.innerHTML = `<div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 0.9rem;">기록된 작업 히스토리가 없습니다.</div>`;
      return;
    }

    let html = `
      <div style="background: #f1f5f9; border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-size: 0.88rem; font-weight: bold; color: #334155;">히스토리 스택 (${historyIndex + 1} / ${historyStack.length})</span>
        <div style="display: flex; gap: 6px;">
          <button type="button" id="btn-panel-undo" style="padding: 4px 10px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; font-size: 0.8rem; font-weight: bold;" ${historyIndex <= 0 ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>↩️ 실행 취소</button>
          <button type="button" id="btn-panel-redo" style="padding: 4px 10px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; font-size: 0.8rem; font-weight: bold;" ${historyIndex >= historyStack.length - 1 ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>↪️ 다시 실행</button>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
    `;

    for (let i = historyStack.length - 1; i >= 0; i--) {
      const item = historyStack[i];
      const isActive = i === historyIndex;
      const timeStr = item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

      html += `
        <div class="history-item-card" data-index="${i}" style="
          background: ${isActive ? '#eff6ff' : '#ffffff'};
          border: 1.5px solid ${isActive ? '#3b82f6' : '#e2e8f0'};
          border-radius: 8px;
          padding: 10px 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
        ">
          <div>
            <div style="font-size: 0.88rem; font-weight: ${isActive ? 'bold' : 'normal'}; color: ${isActive ? '#1d4ed8' : '#1e293b'};">
              ${isActive ? '👉 ' : ''}${item.label || '설정 변경'}
            </div>
            <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 2px;">${timeStr}</div>
          </div>
          ${isActive ? '<span style="background: #3b82f6; color: #fff; font-size: 0.72rem; padding: 2px 8px; border-radius: 12px; font-weight: bold;">현재</span>' : ''}
        </div>
      `;
    }

    html += `</div>`;
    container.innerHTML = html;

    container.querySelectorAll('.history-item-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
        if (!isNaN(idx) && idx >= 0 && idx < historyStack.length) {
          historyIndex = idx;
          applyHistoryState(historyStack[historyIndex]);
          showToastNotification(`히스토리 복원: [${historyIndex + 1}/${historyStack.length}] ${historyStack[historyIndex].label}`, false);
          refreshHistoryUIIfOpen();
        }
      });
    });

    const btnPanelUndo = document.getElementById('btn-panel-undo');
    if (btnPanelUndo && !btnPanelUndo.disabled) {
      btnPanelUndo.addEventListener('click', undo);
    }

    const btnPanelRedo = document.getElementById('btn-panel-redo');
    if (btnPanelRedo && !btnPanelRedo.disabled) {
      btnPanelRedo.addEventListener('click', redo);
    }
  }

  function refreshHistoryUIIfOpen() {
    updateHistoryButtonStates();
    const historyContainer = document.getElementById('drawer-tab-history-container');
    if (historyContainer && historyContainer.offsetParent !== null) {
      renderHistoryPanelUI();
    }
  }

  function openHistoryPanel() {
    renderHistoryPanelUI();
    if (window.ChatInterface && window.ChatInterface.openDrawerTab) {
      window.ChatInterface.openDrawerTab('drawer-tab-history', '📜 작업 히스토리', null);
    }
  }

  /**
   * Undo (되돌리기)
   */
  function undo() {
    if (historyIndex > 0) {
      historyIndex--;
      applyHistoryState(historyStack[historyIndex]);
      showToastNotification(`실행 취소 (Undo) ↩️ [${historyIndex + 1}/${historyStack.length}]`, false);
      refreshHistoryUIIfOpen();
    } else {
      showToastNotification('더 이상 실행 취소할 내역이 없습니다.', false);
    }
  }

  /**
   * Redo (다시 실행)
   */
  function redo() {
    if (historyIndex >= 0 && historyIndex < historyStack.length - 1) {
      historyIndex++;
      applyHistoryState(historyStack[historyIndex]);
      showToastNotification(`다시 실행 (Redo) ↪️ [${historyIndex + 1}/${historyStack.length}]`, false);
      refreshHistoryUIIfOpen();
    } else {
      showToastNotification('더 이상 다시 실행할 내역이 없습니다.', false);
    }
  }

  /**
   * 키보드 단축키 이벤트 처리
   */
  function handleKeyDown(e) {
    if (recordingKeyId && recordingKeyType) {
      if (e.key === 'Escape') {
        recordingKeyId = null;
        recordingKeyType = null;
        renderShortcutGuideUI();
        return;
      }
      e.preventDefault();
      const formatted = formatKeyName(e);
      const targetItem = DEFAULT_SHORTCUTS[recordingKeyId];
      if (targetItem) {
        if (recordingKeyType === 'primary') {
          targetItem.primaryKey = formatted;
        } else if (recordingKeyType === 'secondary') {
          targetItem.secondaryKey = formatted;
        }
        const typeLabel = recordingKeyType === 'primary' ? '주단축키' : '보조단축키';
        showToastNotification(`${targetItem.label} ${typeLabel}가 [ ${formatted} ]로 변경되었습니다.`, false);
      }
      recordingKeyId = null;
      recordingKeyType = null;
      renderShortcutGuideUI();
      return;
    }

    const isInputFocused = (
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'TEXTAREA' ||
      e.target.tagName === 'SELECT' ||
      e.target.isContentEditable
    );

    const isCtrl = e.ctrlKey || e.metaKey;
    const key = e.key;

    // 1. Ctrl 조합 단축키 (텍스트 입력창 내부에서도 동작 가능한 전역 저장/불러오기/Undo)
    if (isCtrl) {
      const keyLower = key.toLowerCase();

      // Ctrl + S: 저장 패널 서랍 탭 열기
      if (keyLower === 's') {
        e.preventDefault();
        const btnIconDownload = document.getElementById('btn-icon-download');
        if (window.ChatInterface && window.ChatInterface.openDrawerTab) {
          window.ChatInterface.openDrawerTab('drawer-tab-download', '💾 이미지 및 파일 저장', btnIconDownload);
        }
        return;
      }

      // Ctrl + O: 설정 불러오기
      if (keyLower === 'o') {
        e.preventDefault();
        const btnLoadSettings = document.getElementById('btn-load-settings');
        if (btnLoadSettings) btnLoadSettings.click();
        return;
      }

      // Ctrl + Z / Ctrl + Shift + Z: Undo & Redo
      if (keyLower === 'z') {
        if (isInputFocused && e.target.tagName === 'TEXTAREA') {
          // 텍스트 영역 내부 일반 Undo는 브라우저 기본 동작 보존
          return;
        }
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      // Ctrl + Y: Redo
      if (keyLower === 'y') {
        if (isInputFocused && e.target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        redo();
        return;
      }

      // Ctrl + B: 환경설정 > 글꼴 상세 > 굵게 토글
      if (keyLower === 'b') {
        e.preventDefault();
        toggleFontBold();
        return;
      }
    }

    // Escape 키: 다단계 닫기 (모달 -> 편집 모드 -> 슬라이딩 드로어 패널 닫기)
    if (key === 'Escape') {
      const openModals = Array.from(document.querySelectorAll('.modal')).filter(m => {
        const style = window.getComputedStyle(m);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      if (openModals.length > 0) {
        openModals.forEach(m => { m.style.display = 'none'; });
        if (isInputFocused && e.target && typeof e.target.blur === 'function') e.target.blur();
        return;
      }

      if (window.APP_MODE === 'COLOR_EDIT' || window.APP_MODE === 'LAYOUT_EDIT') {
        if (typeof window.setAppMode === 'function') {
          window.setAppMode('NORMAL');
        }
        if (isInputFocused && e.target && typeof e.target.blur === 'function') e.target.blur();
        return;
      }

      if (window.ChatInterface && window.ChatInterface.closeDrawer) {
        window.ChatInterface.closeDrawer();
        if (isInputFocused && e.target && typeof e.target.blur === 'function') e.target.blur();
      }
      return;
    }

    // 입력창이 포커스된 경우 단일 키 단축키는 작동 방지 (문자 입력 보호)
    if (isInputFocused) return;

    // 2. CapsLock: 스크롤 고정 토글
    if (key === 'CapsLock') {
      e.preventDefault();
      toggleScrollLock();
      return;
    }

    // 3. Space: 시뮬레이션 재생/일시정지
    if (key === ' ' || key === 'Spacebar') {
      e.preventDefault();
      const btnPlay = document.getElementById('btn-play');
      if (btnPlay) btnPlay.click();
      return;
    }

    // 4. + / -: 대화 진행률 조절
    if (key === '+' || key === '=' || key === 'NumpadAdd') {
      e.preventDefault();
      const progressInput = document.getElementById('input-progress');
      if (progressInput) {
        const maxVal = parseInt(progressInput.max, 10) || 100;
        const curVal = parseInt(progressInput.value, 10) || 0;
        if (curVal < maxVal) {
          progressInput.value = curVal + 1;
          progressInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      return;
    }

    if (key === '-' || key === '_' || key === 'NumpadSubtract') {
      e.preventDefault();
      const progressInput = document.getElementById('input-progress');
      if (progressInput) {
        const minVal = parseInt(progressInput.min, 10) || 0;
        const curVal = parseInt(progressInput.value, 10) || 0;
        if (curVal > minVal) {
          progressInput.value = curVal - 1;
          progressInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      return;
    }

    // 5. ~ 또는 ` 키: 대화 참여자 중 ㄱㄴㄷ순으로 다음 사람을 내 이름으로 선택
    if (key === '~' || key === '`' || e.code === 'Backquote') {
      e.preventDefault();
      cycleNextMeName();
      return;
    }
  }

  /**
   * 대화 참여자 중에서 ㄱㄴㄷ순으로 다음 사람을 내 이름으로 자동 선택
   */
  function cycleNextMeName() {
    const inputMeName = document.getElementById('input-me-name');
    if (!inputMeName) return;

    // input-me-name 옵션 목록에서 빈값 제외 참여자 이름 수집
    const options = Array.from(inputMeName.options);
    const names = options
      .map(opt => opt.value ? opt.value.trim() : '')
      .filter(val => val !== '');

    if (names.length === 0) {
      showToastNotification('대화 참여자가 없습니다.', false);
      return;
    }

    // ㄱㄴㄷ (한글 순서) 정렬
    names.sort((a, b) => a.localeCompare(b, 'ko'));

    const currentVal = inputMeName.value ? inputMeName.value.trim() : '';
    const currentIndex = names.indexOf(currentVal);

    let nextIndex = 0;
    if (currentIndex !== -1) {
      nextIndex = (currentIndex + 1) % names.length;
    }

    const nextName = names[nextIndex];
    inputMeName.value = nextName;
    inputMeName.dispatchEvent(new Event('change', { bubbles: true }));
    inputMeName.dispatchEvent(new Event('input', { bubbles: true }));

    showToastNotification(`내 이름: [ ${nextName} ] (ㄱㄴㄷ순 선택)`, false);
  }

  /**
   * 환경설정 > 글꼴 상세 > 굵게 토글 연동 함수
   */
  function toggleFontBold() {
    const inputFontBold = document.getElementById('input-font-bold');
    if (!inputFontBold) return;

    inputFontBold.checked = !inputFontBold.checked;
    inputFontBold.dispatchEvent(new Event('change', { bubbles: true }));
    inputFontBold.dispatchEvent(new Event('input', { bubbles: true }));

    const statusStr = inputFontBold.checked ? '적용' : '해제';
    showToastNotification(`글꼴 굵게 [ ${statusStr} ]`, false);
  }

  /**
   * 단축키 안내 패널 오픈 (sliding-drawer-panel 탭으로 동작)
   */
  function openShortcutModal() {
    renderShortcutGuideUI();
    if (window.ChatInterface && window.ChatInterface.openDrawerTab) {
      const btnShortcut = document.getElementById('btn-open-shortcut-modal');
      window.ChatInterface.openDrawerTab('drawer-tab-shortcut', '⌨️ 키보드 단축키 안내', btnShortcut);
    }
  }

  /**
   * 초기화
   */
  function init() {
    window.addEventListener('keydown', handleKeyDown);

    // 초기 스냅샷 1회 등록 (앱 로드 0.3초 후)
    setTimeout(() => {
      pushHistoryState('초기 상태');
      renderShortcutGuideUI();
      renderHistoryPanelUI();
    }, 300);

    // 전역 클릭 위임 이벤트로 Undo / Redo 버튼 클릭 처리
    document.addEventListener('click', (e) => {
      const btnUndo = e.target.closest('#btn-undo-history');
      if (btnUndo && !btnUndo.disabled) {
        undo();
        return;
      }

      const btnRedo = e.target.closest('#btn-redo-history');
      if (btnRedo && !btnRedo.disabled) {
        redo();
        return;
      }
    });
  }

  // 모듈 바인딩
  window.ShortcutManager = {
    init,
    pushHistoryState,
    undo,
    redo,
    toggleScrollLock,
    openShortcutModal,
    openHistoryPanel
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
