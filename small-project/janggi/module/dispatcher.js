// dispatcher.js - 전면 이벤트 위임 디스패처
// 모든 인라인 핸들러(onclick, onchange, oninput)를 data-action 기반으로 위임

(function () {
  // ===== 액션 레지스트리 =====
  // data-action 값 → 핸들러 함수 매핑
  const actions = {
    // --- 게임 코어 (main.js) ---
    toggleNation,
    disalbeSettingBox,
    enalbeSettingBox,
    prev,
    next,
    download,
    toggleCoordinates,

    // --- 설정 (settings.js) ---
    adjustPieceSize,
    adjustPieceFontSize,
    adjustCoordsFontSize,
    changeFontSize,
    changeBoardColor,
    changeChoColor,
    changeHanColor,
    changePieceShape,
    changeCandiShape,
    changeCandiColor,
    changeAnimDuration,
    changeAnimHeight,
    changeSettingsBgColor,
    changeSettingsOpacity,
    changeSettingsTextColorType,
    changeSettingsTextColorCustom,
    changeSettingsAccentColor,
    selectSlot,
    copyConfigToClipboard,
    resetCategory1,
    resetCategory2,
    resetCategory3,
    resetCategory4,
    changeAiMode,
    changeCursorLockMode,
    changeAutoplaySpeed,
    changeAutoplayUseAnim,

    // --- 점수판/UI (ui.js) ---
    rotateScorePanel,
    setScoreSlide,
    updateScoreboardSettings,
    updateMetadataFromForm,
    updateCurrentStepComment,
    toggleMetadataCategory,
    toggleSettingCategory,
    toggleAutoplay,
    goToStart,
    goToEnd,
    hideCommentBubble,

    // --- 기보 (record.js) ---
    openRecordModal,
    closeRecordModal,
    saveRecordToLibrary,
    loadRecordFromClipboard,

    // --- 키보드 모달 (keyboard.js) ---
    openShortcutModal,
    closeShortcutModal,
    handleModalOverlayClick,
    resetDefaultShortcuts,
    changeModalBgColor,
    changeModalOpacity,

    // --- 코멘트 모달 (ui.js) ---
    openCommentModal,
    closeCommentModal,
    saveCommentModal,
    handleCommentModalOverlayClick,
    changeCommentBgColor,
    changeCommentOpacity,
    changeCommentDuration,

    // --- 차림 (main.js) ---
    changeCharim,
  };

  // ===== data-action 인자 파서 =====
  function getActionArgs(el) {
    const args = {};
    for (const attr of el.attributes) {
      if (attr.name.startsWith("data-") && attr.name !== "data-action") {
        // data-type → type, data-delta → delta, data-group → group
        const key = attr.name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        // 숫자 자동 변환
        const num = Number(attr.value);
        args[key] = isNaN(num) ? attr.value : num;
      }
    }
    return args;
  }

  // ===== 핸들러 디스패치 =====
  function dispatch(el, event) {
    const actionName = el.dataset.action;
    if (!actionName) return;

    const handler = actions[actionName];
    if (!handler) {
      console.warn(`[dispatcher] 등록되지 않은 액션: ${actionName}`);
      return;
    }

    // data-stop-propagation 속성이 있으면 전파 중단
    if (el.hasAttribute("data-stop-propagation")) {
      event.stopPropagation();
    }

    const args = getActionArgs(el);

    // 인자 패턴에 따라 핸들러 호출
    if (Object.keys(args).length === 0) {
      // 단순 호출 또는 this.value/this.checked 자동 감지
      if (el.tagName === "SELECT" || (el.tagName === "INPUT" && el.type === "range") ||
          (el.tagName === "INPUT" && el.type === "number") ||
          (el.tagName === "INPUT" && el.type === "color") ||
          el.tagName === "TEXTAREA") {
        handler(el.value);
      } else if (el.tagName === "INPUT" && el.type === "checkbox") {
        handler(el.checked);
      } else {
        // event 인자가 필요한 핸들러 vs el(this) 인자가 필요한 핸들러 구분
        const eventHandlers = new Set([
          "handleModalOverlayClick", "handleCommentModalOverlayClick",
          "toggleMetadataCategory"
        ]);
        handler(eventHandlers.has(actionName) ? event : el);
      }
    } else if ("type" in args && "delta" in args) {
      // adjustPieceSize('king', -0.05) 패턴
      handler(args.type, args.delta);
    } else if ("amount" in args) {
      // changeFontSize(-1) 패턴
      handler(args.amount);
    } else if ("group" in args && "pieceType" in args) {
      // changeCharim(group, type, element) 패턴
      handler(args.group, args.pieceType, el);
    } else if ("num" in args) {
      // selectSlot(1) 패턴
      handler(args.num);
    } else if ("index" in args) {
      // setScoreSlide(0) 패턴
      handler(args.index);
    } else if ("categoryId" in args) {
      // toggleSettingCategory('board-view-category') 패턴
      handler(args.categoryId);
    } else if ("value" in args) {
      // changeXxx('custom') 패턴  
      handler(args.value);
    } else {
      // 기본: 이벤트 전달
      handler(event);
    }
  }

  // ===== 이벤트 리스너 등록 =====
  document.addEventListener("click", function (e) {
    // data-stop-propagation 전용 요소 (data-action 없이)
    const stopEl = e.target.closest("[data-stop-propagation]");
    if (stopEl && !stopEl.dataset.action) {
      e.stopPropagation();
    }
    const el = e.target.closest("[data-action]");
    if (el) dispatch(el, e);
  });

  document.addEventListener("change", function (e) {
    const el = e.target.closest("[data-action]");
    if (el) dispatch(el, e);
  });

  document.addEventListener("input", function (e) {
    const el = e.target.closest("[data-action]");
    if (el) dispatch(el, e);
  });
})();
