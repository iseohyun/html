// ui.js - 점수판, 코멘트, 자동재생, 탐색, 레이아웃 유틸리티

var scoreRotationInterval = null;
var scoreboardTimerInterval = null;

function initScoreboardRotation() {
  applyScoreboardConfig();
  
  if (scoreboardTimerInterval) clearInterval(scoreboardTimerInterval);
  scoreboardTimerInterval = setInterval(() => {
    updateScoreboardTimer();
  }, 1000);
  
  choTimeSpent = 0;
  hanTimeSpent = 0;
}

function getActiveSlides() {
  const active = [];
  if (scoreShowSlide1) active.push(0);
  if (scoreShowSlide2) active.push(1);
  if (scoreShowSlide3) active.push(2);
  if (active.length === 0) active.push(0);
  return active;
}

function applyScoreboardConfig() {
  const activeSlides = getActiveSlides();
  
  const dots = document.querySelectorAll(".score-dot");
  if (dots.length === 3) {
    dots[0].style.display = scoreShowSlide1 ? "inline-block" : "none";
    dots[1].style.display = scoreShowSlide2 ? "inline-block" : "none";
    dots[2].style.display = scoreShowSlide3 ? "inline-block" : "none";
  }
  
  if (!activeSlides.includes(currentScoreSlideIndex)) {
    setScoreSlide(activeSlides[0]);
  } else {
    setScoreSlide(currentScoreSlideIndex);
  }
  
  if (scoreRotationInterval) clearInterval(scoreRotationInterval);
  if (scoreAutoRotate && activeSlides.length > 1) {
    scoreRotationInterval = setInterval(() => {
      rotateScorePanel();
    }, scoreRotateInterval * 1000);
  }
}

function rotateScorePanel() {
  const activeSlides = getActiveSlides();
  if (activeSlides.length <= 1) {
    if (activeSlides.length === 1) {
      setScoreSlide(activeSlides[0]);
    }
    return;
  }
  const currIdxInActive = activeSlides.indexOf(currentScoreSlideIndex);
  const nextIdxInActive = (currIdxInActive + 1) % activeSlides.length;
  setScoreSlide(activeSlides[nextIdxInActive]);
}

function setScoreSlide(index) {
  currentScoreSlideIndex = index;
  const slides = document.querySelectorAll(".score-slide");
  const dots = document.querySelectorAll(".score-dot");
  
  slides.forEach((slide, i) => {
    if (i === index) {
      slide.classList.add("active");
    } else {
      slide.classList.remove("active");
    }
  });
  
  dots.forEach((dot, i) => {
    if (i === index) {
      dot.classList.add("active");
    } else {
      dot.classList.remove("active");
    }
  });
  
  const activeSlides = getActiveSlides();
  if (scoreRotationInterval) clearInterval(scoreRotationInterval);
  if (scoreAutoRotate && activeSlides.length > 1) {
    scoreRotationInterval = setInterval(() => {
      rotateScorePanel();
    }, scoreRotateInterval * 1000);
  }
}

function updateScoreboardSettings() {
  const autoRotateEl = document.getElementById("score-auto-rotate");
  const rotateIntervalEl = document.getElementById("score-rotate-interval");
  const showSlide1El = document.getElementById("score-show-slide1");
  const showSlide2El = document.getElementById("score-show-slide2");
  const showSlide3El = document.getElementById("score-show-slide3");
  
  if (autoRotateEl) scoreAutoRotate = (autoRotateEl.value === "true");
  if (rotateIntervalEl) scoreRotateInterval = parseInt(rotateIntervalEl.value, 10);
  if (showSlide1El) scoreShowSlide1 = showSlide1El.checked;
  if (showSlide2El) scoreShowSlide2 = showSlide2El.checked;
  if (showSlide3El) scoreShowSlide3 = showSlide3El.checked;
  
  applyScoreboardConfig();
  saveCurrentConfigToSlot();
}

function updateScoreboardTimer() {
  if (gameEnded) return;
  
  const turnInput = document.getElementById("turn");
  if (!turnInput) return;
  const curTurn = parseInt(turnInput.value, 10);
  const isChoTurn = (curTurn % 2 === 0);
  
  if (isChoTurn) {
    choTimeSpent++;
  } else {
    hanTimeSpent++;
  }
  
  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };
  
  const choTimerVal = document.getElementById("cho-timer-val");
  const hanTimerVal = document.getElementById("han-timer-val");
  if (choTimerVal) choTimerVal.textContent = formatTime(choTimeSpent);
  if (hanTimerVal) hanTimerVal.textContent = formatTime(hanTimeSpent);
  
  const activeTurnDesc = document.getElementById("active-turn-timer-desc");
  if (activeTurnDesc) {
    activeTurnDesc.textContent = isChoTurn ? "초나라 (Blue) 차례" : "한나라 (Red) 차례";
    activeTurnDesc.style.color = isChoTurn ? "#60a5fa" : "#f87171";
  }
}

function updateMetadataFromForm() {
  const choVal = document.getElementById("meta-cho-player").value;
  const hanVal = document.getElementById("meta-han-player").value;
  const tourVal = document.getElementById("meta-tournament").value;
  const roundVal = document.getElementById("meta-round").value;
  const nickVal = document.getElementById("meta-nickname").value;
  const sumVal = document.getElementById("meta-summary").value;
  
  gameMetadata.choPlayer = choVal;
  gameMetadata.hanPlayer = hanVal;
  gameMetadata.tournament = tourVal;
  gameMetadata.round = roundVal;
  gameMetadata.nickname = nickVal;
  gameMetadata.summary = sumVal;
  
  updateMetadataDisplay();
}

function updateMetadataFormFromState() {
  const choEl = document.getElementById("meta-cho-player");
  const hanEl = document.getElementById("meta-han-player");
  const tourEl = document.getElementById("meta-tournament");
  const roundEl = document.getElementById("meta-round");
  const nickEl = document.getElementById("meta-nickname");
  const sumEl = document.getElementById("meta-summary");
  
  if (choEl) choEl.value = gameMetadata.choPlayer || "";
  if (hanEl) hanEl.value = gameMetadata.hanPlayer || "";
  if (tourEl) tourEl.value = gameMetadata.tournament || "";
  if (roundEl) roundEl.value = gameMetadata.round || "";
  if (nickEl) nickEl.value = gameMetadata.nickname || "";
  if (sumEl) sumEl.value = gameMetadata.summary || "";
}

function updateMetadataDisplay() {
  const tourDisp = document.getElementById("meta-tournament-display");
  const choDisp = document.getElementById("meta-cho-player-display");
  const hanDisp = document.getElementById("meta-han-player-display");
  
  if (tourDisp) {
    tourDisp.textContent = gameMetadata.tournament || (gameMetadata.nickname ? gameMetadata.nickname : "대회명 미지정");
  }
  if (choDisp) {
    choDisp.textContent = gameMetadata.choPlayer || "초나라";
  }
  if (hanDisp) {
    hanDisp.textContent = gameMetadata.hanPlayer || "한나라";
  }
}

function updateCurrentStepComment() {
  const turnInput = document.getElementById("turn");
  if (!turnInput) return;
  const curTurn = parseInt(turnInput.value, 10);
  if (curTurn <= 0) return;
  
  const commentInput = document.getElementById("current-step-comment");
  if (!commentInput) return;
  
  if (log[curTurn - 1]) {
    log[curTurn - 1].comment = commentInput.value;
    updateCommentBubble();
  }
}

function updateCommentBubble() {
  const turnInput = document.getElementById("turn");
  if (!turnInput) return;
  const curTurn = parseInt(turnInput.value, 10);
  
  const bubble = document.getElementById("comment-bubble");
  const bubbleText = document.getElementById("comment-bubble-text");
  const commentFormInput = document.getElementById("current-step-comment");
  const commentTitle = document.getElementById("current-step-comment-title");
  
  if (commentTitle) {
    commentTitle.textContent = `현재 수순 (${curTurn}수) 코멘트`;
  }
  
  if (curTurn <= 0) {
    if (bubble) bubble.style.display = "none";
    if (commentFormInput) commentFormInput.value = "";
    return;
  }
  
  const currentMove = log[curTurn - 1];
  if (currentMove) {
    const comment = currentMove.comment || "";
    if (commentFormInput) {
      commentFormInput.value = comment;
    }
    
    if (comment.trim()) {
      if (bubbleText) bubbleText.textContent = comment;
      if (bubble) bubble.style.display = "block";
      applyCommentBoxTheme();
      
      // 코멘트 말풍선 자동 숨김 시간 설정 (0은 무제한)
      if (commentBubbleTimeout) {
        clearTimeout(commentBubbleTimeout);
        commentBubbleTimeout = null;
      }
      if (commentDisplayDuration > 0) {
        commentBubbleTimeout = setTimeout(() => {
          if (bubble) bubble.style.display = "none";
        }, commentDisplayDuration * 1000);
      }
    } else {
      if (bubble) bubble.style.display = "none";
      if (commentBubbleTimeout) {
        clearTimeout(commentBubbleTimeout);
        commentBubbleTimeout = null;
      }
    }
  } else {
    if (commentFormInput) commentFormInput.value = "";
    if (bubble) bubble.style.display = "none";
    if (commentBubbleTimeout) {
      clearTimeout(commentBubbleTimeout);
      commentBubbleTimeout = null;
    }
  }
}

function toggleMetadataCategory(event) {
  if (event.target.closest('button')) return;
  
  const category = document.getElementById("metadata-category");
  const content = document.getElementById("metadata-category-content");
  const arrow = document.getElementById("accordion-arrow");
  
  if (!category || !content) return;
  
  const isCollapsed = category.classList.contains("collapsed");
  
  if (isCollapsed) {
    category.classList.remove("collapsed");
    content.style.display = "block";
    if (arrow) arrow.style.transform = "rotate(180deg)";
  } else {
    category.classList.add("collapsed");
    content.style.display = "none";
    if (arrow) arrow.style.transform = "rotate(0deg)";
  }
}

function toggleSettingCategory(categoryId) {
  const category = document.getElementById(categoryId);
  const content = document.getElementById(categoryId + "-content");
  let arrowId = "";
  if (categoryId === "board-view-category") arrowId = "board-view-arrow";
  else if (categoryId === "anim-category") arrowId = "anim-arrow";
  else if (categoryId === "settings-category") arrowId = "settings-arrow";
  
  const arrow = document.getElementById(arrowId);
  
  if (!category || !content) return;
  
  const isCollapsed = category.classList.contains("collapsed");
  
  if (isCollapsed) {
    category.classList.remove("collapsed");
    content.style.display = "block";
    if (arrow) arrow.style.transform = "rotate(180deg)";
  } else {
    category.classList.add("collapsed");
    content.style.display = "none";
    if (arrow) arrow.style.transform = "rotate(0deg)";
  }
}

var autoplayInterval = null;
var isAutoplayActive = false;

function toggleAutoplay() {
  if (isAutoplayActive) {
    stopAutoplay();
  } else {
    startAutoplay();
  }
}

function startAutoplay() {
  if (isAutoplayActive) return;
  const turnEl = document.getElementById("turn");
  if (!turnEl) return;
  let curTurn = parseInt(turnEl.value, 10);
  if (curTurn >= log.length) {
    showToast("이미 마지막 수순입니다.");
    return;
  }
  isAutoplayActive = true;
  showToast("자동 재생 시작");
  updateAutoplayUI();
  
  autoplayInterval = setInterval(() => {
    let curTurn = parseInt(turnEl.value, 10);
    if (curTurn < log.length) {
      if (!autoplayUseAnim) {
        svg.classList.add("no-transition");
      }
      next();
      if (!autoplayUseAnim) {
        svg.offsetHeight; // force reflow
        svg.classList.remove("no-transition");
      }
    } else {
      stopAutoplay();
      showToast("자동 재생 완료");
    }
  }, autoplaySpeed * 1000);
}

function stopAutoplay() {
  if (!isAutoplayActive) return;
  isAutoplayActive = false;
  if (autoplayInterval) {
    clearInterval(autoplayInterval);
    autoplayInterval = null;
  }
  showToast("자동 재생 정지");
  updateAutoplayUI();
}

function updateAutoplayUI() {
  const playBtn = document.getElementById("nav-play-btn");
  if (playBtn) {
    if (isAutoplayActive) {
      playBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"/>
          <rect x="14" y="4" width="4" height="16" rx="1"/>
        </svg>
      `;
      playBtn.title = "자동 재생 일시정지 (P)";
    } else {
      playBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="6,4 20,12 6,20"/>
        </svg>
      `;
      playBtn.title = "자동 재생 시작 (P)";
    }
  }
}

function goToStart() {
  clearCandiBox();
  let startingLayoutCode = getStartingLayoutCode();
  setting(startingLayoutCode);
  curSelect = 32;
  const selectBox = document.getElementById("select-box");
  if (selectBox) {
    selectBox.setAttribute("x", -1000);
    selectBox.setAttribute("y", -1000);
  }
  const turnEl = document.getElementById("turn");
  if (turnEl) turnEl.value = 0;
  updateScore();
  const recordBox = document.getElementById("record-box");
  if (recordBox && recordBox.style.display === "flex") {
    updateRecordUI();
  }
  updateCommentBubble();
  document.getElementById("prev").disabled = true;
  if (log.length > 0) {
    document.getElementById("next").disabled = false;
  } else {
    document.getElementById("next").disabled = true;
  }
  
  svg.classList.add("no-transition");
  initPositions();
  svg.offsetHeight; // Force reflow
  svg.classList.remove("no-transition");
  
  checkAndRunAI();
}

function goToEnd() {
  clearCandiBox();
  const turnEl = document.getElementById("turn");
  if (!turnEl) return;
  let curTurn = parseInt(turnEl.value, 10);
  
  svg.classList.add("no-transition");
  while (curTurn < log.length) {
    setPieces(log[curTurn].i, log[curTurn].x, log[curTurn].y, true);
    if (log[curTurn].t != 32) {
      setPieces(log[curTurn].t, 0, 0, true);
    }
    curTurn++;
  }
  turnEl.value = log.length;
  curSelect = 32;
  const lastMove = log[log.length - 1];
  if (lastMove) {
    moveSelectBox(lastMove.i);
  }
  document.getElementById("next").disabled = true;
  if (log.length > 0) {
    document.getElementById("prev").disabled = false;
  }
  updateScore();
  const recordBox = document.getElementById("record-box");
  if (recordBox && recordBox.style.display === "flex") {
    updateRecordUI();
  }
  initPositions();
  svg.offsetHeight; // Force reflow
  svg.classList.remove("no-transition");
  
  checkGameStatus();
  updateCommentBubble();
  checkAndRunAI();
}

function changeAutoplaySpeed(val) {
  autoplaySpeed = parseFloat(val);
  const valEl = document.getElementById("autoplay-speed-val");
  if (valEl) valEl.textContent = autoplaySpeed.toFixed(1);
  
  if (isAutoplayActive) {
    stopAutoplay();
    startAutoplay();
  }
  saveCurrentConfigToSlot();
}

function changeAutoplayUseAnim(checked) {
  autoplayUseAnim = checked;
  saveCurrentConfigToSlot();
}

function openCommentModal() {
  const turnInput = document.getElementById("turn");
  if (!turnInput) return;
  const curTurn = parseInt(turnInput.value, 10);
  if (curTurn <= 0) {
    showToast("코멘트를 입력할 수순이 없습니다. (0수 상태)");
    return;
  }
  
  const title = document.getElementById("comment-modal-title");
  if (title) title.textContent = `현재 수순 (${curTurn}수) 코멘트 편집`;
  
  const currentMove = log[curTurn - 1];
  const textarea = document.getElementById("comment-modal-textarea");
  if (textarea && currentMove) {
    textarea.value = currentMove.comment || "";
  }
  
  const commentBgPicker = document.getElementById("comment-bg-picker");
  if (commentBgPicker) commentBgPicker.value = commentBoxBgColor;
  
  const commentOpacitySlider = document.getElementById("comment-opacity-slider");
  if (commentOpacitySlider) commentOpacitySlider.value = commentBoxOpacity;
  
  const commentOpacityVal = document.getElementById("comment-opacity-val");
  if (commentOpacityVal) commentOpacityVal.textContent = commentBoxOpacity.toFixed(2);
  
  const commentModal = document.getElementById("comment-modal");
  if (commentModal) {
    commentModal.style.display = "flex";
    applyCommentBoxTheme();
    setTimeout(() => {
      commentModal.classList.add("open");
      if (textarea) textarea.focus();
    }, 10);
  }
}

function closeCommentModal() {
  const commentModal = document.getElementById("comment-modal");
  if (commentModal) {
    commentModal.classList.remove("open");
    setTimeout(() => {
      commentModal.style.display = "none";
    }, 300);
  }
}

function saveCommentModal() {
  const turnInput = document.getElementById("turn");
  if (!turnInput) return;
  const curTurn = parseInt(turnInput.value, 10);
  if (curTurn <= 0) return;
  
  const textarea = document.getElementById("comment-modal-textarea");
  if (textarea && log[curTurn - 1]) {
    log[curTurn - 1].comment = textarea.value;
    
    // 동기화: 메타데이터 창의 입력 필드도 갱신
    const commentFormInput = document.getElementById("current-step-comment");
    if (commentFormInput) {
      commentFormInput.value = textarea.value;
    }
    
    updateCommentBubble();
    showToast(`${curTurn}수 코멘트가 저장되었습니다.`);
  }
  closeCommentModal();
}

function handleCommentModalOverlayClick(e) {
  if (e.target.id === "comment-modal") {
    closeCommentModal();
  }
}

function changeCommentBgColor(color) {
  commentBoxBgColor = color;
  const picker = document.getElementById("comment-bg-picker");
  if (picker) picker.value = color;
  applyCommentBoxTheme();
  saveCurrentConfigToSlot();
}

function changeCommentOpacity(opacity) {
  commentBoxOpacity = parseFloat(opacity);
  const slider = document.getElementById("comment-opacity-slider");
  if (slider) slider.value = opacity;
  const valDisp = document.getElementById("comment-opacity-val");
  if (valDisp) valDisp.textContent = commentBoxOpacity.toFixed(2);
  applyCommentBoxTheme();
  saveCurrentConfigToSlot();
}

function applyCommentBoxTheme() {
  const commentModalContent = document.querySelector("#comment-modal .modal-content");
  if (commentModalContent) {
    const rgba = hexToRgba(commentBoxBgColor, commentBoxOpacity);
    commentModalContent.style.background = rgba;
    commentModalContent.style.backdropFilter = "blur(12px)";
  }
  
  const commentBubble = document.getElementById("comment-bubble");
  if (commentBubble) {
    const rgba = hexToRgba(commentBoxBgColor, commentBoxOpacity);
    commentBubble.style.background = rgba;
    commentBubble.style.backdropFilter = "blur(12px)";
    commentBubble.style.border = `1px solid ${commentBoxBgColor}`;
  }
}

function changeCommentDuration(val) {
  commentDisplayDuration = parseInt(val, 10);
  if (isNaN(commentDisplayDuration) || commentDisplayDuration < 0) {
    commentDisplayDuration = 0;
  }
  const input = document.getElementById("comment-duration-input");
  if (input) input.value = commentDisplayDuration;
  saveCurrentConfigToSlot();
  
  updateCommentBubble();
  showToast(`코멘트 표시 시간이 ${commentDisplayDuration === 0 ? "무제한" : commentDisplayDuration + "초"}으로 설정되었습니다.`);
}

function hideCommentBubble() {
  const bubble = document.getElementById("comment-bubble");
  if (bubble) bubble.style.display = "none";
  if (commentBubbleTimeout) {
    clearTimeout(commentBubbleTimeout);
    commentBubbleTimeout = null;
  }
}

// Bind to window to prevent module scoping issues

function normalizeLayoutCode(code, flipped) {
  if (!flipped || !code || code.length !== 64) return code;
  let coords = [];
  for (let i = 0; i < 64; i += 2) {
    coords.push({
      x: parseInt(code[i], 10),
      y: parseInt(code[i + 1], 10)
    });
  }
  let normCoords = new Array(32);
  for (let i = 0; i < 16; i++) {
    const c1 = coords[i];
    const c2 = coords[i + 16];
    const y1Flipped = (c1.x !== 0 || c1.y !== 0) ? flipYCoordinate(c1.y) : c1.y;
    const y2Flipped = (c2.x !== 0 || c2.y !== 0) ? flipYCoordinate(c2.y) : c2.y;
    normCoords[i] = { x: c2.x, y: y2Flipped };
    normCoords[i + 16] = { x: c1.x, y: y1Flipped };
  }
  for (let i = 0; i < 32; i++) {
    if (normCoords[i].x !== 0) {
      normCoords[i].x = 10 - normCoords[i].x;
    }
  }
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += `${normCoords[i].x}${normCoords[i].y}`;
  }
  return result;
}

function getStartingLayoutCode() {
  let choIdx, hanIdx;
  if (iAmCho) {
    choIdx = newGameState[0];
    hanIdx = newGameState[1];
  } else {
    // Flipped state: bottom team is Han (type is newGameState[0]), top team is Cho (type is newGameState[1]).
    // But standard starting layout maps index 0 of knownStart to Cho, index 1 to Han.
    // So Cho's standard index is newGameState[1], Han's standard index is newGameState[0].
    choIdx = newGameState[1];
    hanIdx = newGameState[0];
  }
  
  let stdCode = knownStart[0][choIdx] + knownStart[1][hanIdx];
  return normalizeLayoutCode(stdCode, !iAmCho);
}

