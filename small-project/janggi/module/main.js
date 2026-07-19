// main.js - Entry point, Event listeners, and UI controller functions
var commentBubbleTimeout = null;
var boardAnimating = false;
var rotateActive = false;
var flipActive = false;



function initData() {
  for (let i = 0; i < 32; i++) {
    pieces[i] = { x: 0, y: 0, e: 0, m: 0 };
  }

  getData();

  initElements();
}

function initElements() {
  if (iAmCho) {
    pieces[0].e = document.getElementById("cho-king");
    pieces[1].e = document.getElementById("cho-cha1");
    pieces[2].e = document.getElementById("cho-cha2");
    pieces[3].e = document.getElementById("cho-po1");
    pieces[4].e = document.getElementById("cho-po2");
    pieces[5].e = document.getElementById("cho-ma1");
    pieces[6].e = document.getElementById("cho-ma2");
    pieces[7].e = document.getElementById("cho-sang1");
    pieces[8].e = document.getElementById("cho-sang2");
    pieces[9].e = document.getElementById("cho-sa1");
    pieces[10].e = document.getElementById("cho-sa2");
    pieces[11].e = document.getElementById("cho-zol1");
    pieces[12].e = document.getElementById("cho-zol2");
    pieces[13].e = document.getElementById("cho-zol3");
    pieces[14].e = document.getElementById("cho-zol4");
    pieces[15].e = document.getElementById("cho-zol5");
    pieces[16].e = document.getElementById("han-king");
    pieces[17].e = document.getElementById("han-cha1");
    pieces[18].e = document.getElementById("han-cha2");
    pieces[19].e = document.getElementById("han-po1");
    pieces[20].e = document.getElementById("han-po2");
    pieces[21].e = document.getElementById("han-ma1");
    pieces[22].e = document.getElementById("han-ma2");
    pieces[23].e = document.getElementById("han-sang1");
    pieces[24].e = document.getElementById("han-sang2");
    pieces[25].e = document.getElementById("han-sa1");
    pieces[26].e = document.getElementById("han-sa2");
    pieces[27].e = document.getElementById("han-zol1");
    pieces[28].e = document.getElementById("han-zol2");
    pieces[29].e = document.getElementById("han-zol3");
    pieces[30].e = document.getElementById("han-zol4");
    pieces[31].e = document.getElementById("han-zol5");
  } else {
    pieces[0].e = document.getElementById("han-king");
    pieces[1].e = document.getElementById("han-cha1");
    pieces[2].e = document.getElementById("han-cha2");
    pieces[3].e = document.getElementById("han-po1");
    pieces[4].e = document.getElementById("han-po2");
    pieces[5].e = document.getElementById("han-ma1");
    pieces[6].e = document.getElementById("han-ma2");
    pieces[7].e = document.getElementById("han-sang1");
    pieces[8].e = document.getElementById("han-sang2");
    pieces[9].e = document.getElementById("han-sa1");
    pieces[10].e = document.getElementById("han-sa2");
    pieces[11].e = document.getElementById("han-zol1");
    pieces[12].e = document.getElementById("han-zol2");
    pieces[13].e = document.getElementById("han-zol3");
    pieces[14].e = document.getElementById("han-zol4");
    pieces[15].e = document.getElementById("han-zol5");
    pieces[16].e = document.getElementById("cho-king");
    pieces[17].e = document.getElementById("cho-cha1");
    pieces[18].e = document.getElementById("cho-cha2");
    pieces[19].e = document.getElementById("cho-po1");
    pieces[20].e = document.getElementById("cho-po2");
    pieces[21].e = document.getElementById("cho-ma1");
    pieces[22].e = document.getElementById("cho-ma2");
    pieces[23].e = document.getElementById("cho-sang1");
    pieces[24].e = document.getElementById("cho-sang2");
    pieces[25].e = document.getElementById("cho-sa1");
    pieces[26].e = document.getElementById("cho-sa2");
    pieces[27].e = document.getElementById("cho-zol1");
    pieces[28].e = document.getElementById("cho-zol2");
    pieces[29].e = document.getElementById("cho-zol3");
    pieces[30].e = document.getElementById("cho-zol4");
    pieces[31].e = document.getElementById("cho-zol5");
  }
}

function getData() {
  const urlParams = new URLSearchParams(window.location.search);
  let param_P = urlParams.get('p');
  if (param_P == undefined) {
    // 나: 마상마상 - 너 : 마상마상
    setting("5910902888207030804060173757779752119123832171318141611434547494");
  } else {
    for (let i = 0; i < 4; i++) {
      if (param_P.includes(knownStart[0][i])) {
        newGameState[0] = i;
      }
    }
    for (let i = 0; i < 4; i++) {
      if (param_P.includes(knownStart[1][i])) {
        newGameState[1] = i;
      }
    }
    setting(param_P);
  }

  // 상차림 단추 색상 및 미니어처 예시 배치도 동기화
  syncCharimButtonStyles();

  let param_log = urlParams.get('log');
  if (param_log != undefined) {
    const logArr = param_log.split(',');
    logArr.forEach(logStr => {
      if (logStr.length != 0) {
        var j = 1;
        for (; j < logStr.length; j++) {
          if (logStr.charAt(j) > 'A') break;
        }

        const i = parseInt(logStr.substring(0, j));
        const x = Az2n(logStr.charAt(j));
        const y = Az2n(logStr.charAt(j + 1));
        const t = (logStr.length == (j + 2)) ? 32 : parseInt(logStr.substring(j + 2, logStr.length));
        log.push({ i, x, y, t });
      }
    });
  }

  let param_cho = urlParams.get('cho');
  if (param_cho == undefined) {
    changeNation(true);
  } else {
    if (param_cho == "Y") {
      changeNation(true);
    } else {
      changeNation(false);
    }
  }

  let param_turn = urlParams.get('t');
  if (param_turn != undefined) {
    param_turn = parseInt(param_turn);
    if (!isNaN(param_turn)) {
      const turn = document.getElementById('turn');
      turn.value = param_turn;
    }
  }
}

// 장기말이 클릭되었을 때, 동작을 기술합니다.
function selected(i) {
  if (gameEnded) return;
  kbCursorActive = false;
  updateKeyboardCursor();

  const turnEl = document.getElementById("turn");
  const curTurn = turnEl ? parseInt(turnEl.value, 10) : log.length;
  const isChoTurn = (curTurn % 2 === 0);
  const currentTeam = isChoTurn ? "cho" : "han";

  // 턴 및 조작 제한 (기본 턴 제한 + AI 전용 가드)
  const isChoPiece = (i < 16) === iAmCho;
  if (isChoTurn) {
    if (!isChoPiece) return; // 초의 턴인데 한의 기물을 조작하려고 하는 경우 차단
    if (aiMode === 1) return; // AI가 초인데 사용자가 조작하려고 하는 경우 차단
  } else {
    if (isChoPiece) return; // 한의 턴인데 초의 기물을 조작하려고 하는 경우 차단
    if (aiMode === 2) return; // AI가 한인데 사용자가 조작하려고 하는 경우 차단
  }

  // Clean up any old diagnostic overlay if present
  const oldDebug = document.getElementById("janggi-debug-info");
  if (oldDebug) oldDebug.remove();

  if (curSelect == i) {
    clearCandiBox();
    moveSelectBox(i, false);
    curSelect = 32;
    return;
  }

  moveSelectBox(i);
  curSelect = i;

  // 이전에 이미 선택된 객체로부터 그려진 이동가능 경로를 삭제합니다.
  clearCandiBox();

  // 해당 진영의 장군 회피 가능한 실제 합법적인 수들만 필터링하여 그립니다.
  const validMoves = getFilteredLegalMoves(currentTeam);
  
  const originalCreateCandiBox = createCandiBox;
  createCandiBox = function(idx, tx, ty) {
    const isValid = validMoves.some(m => m.i === idx && m.x === tx && m.y === ty);
    if (isValid) {
      originalCreateCandiBox(idx, tx, ty);
    }
  };

  drawCandidates(i);

  // 원래 함수 복원
  createCandiBox = originalCreateCandiBox;
}

// 움직임 처리
function move(i, x, y) {
  kbCursorActive = false;
  updateKeyboardCursor();
  currentLoadedRecordId = null;
  updateSavedRecordsListUI();

  // 따먹은 객체가 있다면 처리
  let t = whoIsit(x, y);
  if (t < 32) {
    setPieces(t, 0, 0);

    // 점수 재계산
    updateScore();
  }

  // 이동 기록 관리
  let turn = document.getElementById("turn");
  let curTurn = parseInt(turn.value);
  document.getElementById("prev").disabled = false;

  // 로그를 되돌린 상태에서의 동작은 이후의 로그를 삭제하게 해요.
  while (log.length > curTurn) {
    log.pop();
  }

  log.push({ i, x, y, t });
  turn.value = curTurn + 1;

  // 객체 이동
  setPieces(i, x, y, true);

  // 선택 상자 및 이동가능 경로 후보지 삭제
  clearCandiBox();
  
  let tmpAxis = getAxis(x, y);
  selectBox.setAttribute("x", tmpAxis.x - unitSize / 2);
  selectBox.setAttribute("y", tmpAxis.y - unitSize / 2);

  const recordBox = document.getElementById("record-box");
  if (recordBox && recordBox.style.display === "flex") {
    updateRecordUI();
  }
  updateCommentBubble();

  // 외통수 여부 판단
  checkGameStatus();

  // AI 플레이 대기 및 실행 트리거
  if (!gameEnded) {
    checkAndRunAI();
  }
}

function disalbeSettingBox() {
  const settingBox = document.getElementById("setting-box");
  settingBox.style.display = "none";
  
  const article = document.getElementById("janggi-app");
  if (article) article.classList.remove("settings-open");
  
  svg.classList.add("no-transition");
  initBoard();
  initPositions();
  svg.offsetHeight; // Force reflow
  svg.classList.remove("no-transition");
}

function enalbeSettingBox() {
  const settingBox = document.getElementById("setting-box");
  settingBox.style.display = "flex";
  
  const article = document.getElementById("janggi-app");
  if (article) article.classList.add("settings-open");
  
  svg.classList.add("no-transition");
  initBoard();
  initPositions();
  svg.offsetHeight; // Force reflow
  svg.classList.remove("no-transition");
}

function next() {
  // 보조 마커를 지웁니다.
  clearCandiBox();

  // 현재 턴을 가져옵니다.
  const turn = document.getElementById("turn");
  var curTurn = parseInt(turn.value);

  // 로그에 기록된 다음 턴이 있는지 확인합니다.
  if (log.length > curTurn) {
    // 로그에 따라 장기말을 움직입니다.
    setPieces(log[curTurn].i, log[curTurn].x, log[curTurn].y, true);

    // 선택창은 현재 움직인 말을 보여주되, 선택이 되지 않은 상태로 만듭니다.
    curSelect = 32;
    moveSelectBox(log[curTurn].i);

    // 만약, 잡은 돌이 있다면 삭제합니다.
    if (log[curTurn].t != 32)
      setPieces(log[curTurn].t, 0, 0, true);

    // 턴 정보를 업데이트 합니다.
    turn.value = curTurn + 1;

    // 다음 로그가 없다면, 다음 버튼을 비활성화 시킵니다.
    // 이전 버튼을 활성화 합니다.
    if (log.length - 1 == curTurn)
      document.getElementById("next").disabled = true;
    document.getElementById("prev").disabled = false;
  }
  updateScore();
  
  const recordBox = document.getElementById("record-box");
  if (recordBox && recordBox.style.display === "flex") {
    updateRecordUI();
  }

  // 외통수 여부 재검사 (앞으로 갈 때도 최종 상태 도달 시 외통 재확인)
  checkGameStatus();

  updateCommentBubble();

  checkAndRunAI();
}

function performSinglePrev() {
  // 보조 마커를 지웁니다.
  clearCandiBox();
  gameEnded = false; // 뒤로가기를 하면 게임 종료 플래그를 지우고 다시 둘 수 있게 합니다.

  // 현재 턴을 가져옵니다.
  const turn = document.getElementById("turn");
  var curTurn = parseInt(turn.value) - 1;

  // 이전 정보가 있다면 되돌립니다.
  if (curTurn >= 0) {
    // 따먹은 객채가 있다면 되돌립니다.
    if (log[curTurn].t != 32) {
      setPieces(log[curTurn].t, log[curTurn].x, log[curTurn].y, true);
    }

    // 현재 턴에 움직인 객체가 어디서 왔는지 조회합니다.
    let originPos = whereWasIt(log[curTurn].i, curTurn - 1);

    // 조회된 정보를 기반으로 돌을 과거로 되돌립니다.
    setPieces(log[curTurn].i, originPos.x, originPos.y, true);

    // 움직인 말은 선택되지 않은 상태로 만들어줍니다. 사용자가 선택하면 그 때 선택상태가 됩니다.
    curSelect = 32;
    moveSelectBox(log[curTurn].i);

    // 턴 정보를 업데이트 합니다.
    turn.value = curTurn;

    // 만약 0턴이라면, 이전 버튼을 비활성화 합니다.
    // 다음 버튼은 활성화 합니다.
    if (curTurn == 0)
      document.getElementById("prev").disabled = true;
    document.getElementById("next").disabled = false;
  }
  updateScore();
  
  const recordBox = document.getElementById("record-box");
  if (recordBox && recordBox.style.display === "flex") {
    updateRecordUI();
  }
  updateCommentBubble();
}

function prev() {
  if (aiMode !== 0) {
    const turn = document.getElementById("turn");
    if (turn) {
      const curTurn = parseInt(turn.value, 10);
      const isChoTurn = (curTurn % 2 === 0);
      const aiIsCho = (aiMode === 1);
      const aiIsHan = (aiMode === 2);
      
      const isUserTurnNow = (isChoTurn && !aiIsCho) || (!isChoTurn && !aiIsHan);
      
      if (isUserTurnNow && log.length >= 2) {
        performSinglePrev();
        performSinglePrev();
        checkAndRunAI();
        return;
      }
    }
  }
  performSinglePrev();
  checkAndRunAI();
}

function changeCharim(group, type, element) {
  newGameState[group] = type;
  syncCharimButtonStyles();
  saveCurrentConfigToSlot();
  currentLoadedRecordId = null;
  updateSavedRecordsListUI();
}

function syncCharimButtonStyles() {
  let charim_group = document.getElementsByClassName("charim0");
  Array.from(charim_group).forEach((element, i) => {
    element.style.backgroundColor = (i === newGameState[0]) ? "#3b82f6" : "#1e293b";
  });

  charim_group = document.getElementsByClassName("charim1");
  Array.from(charim_group).forEach((element, i) => {
    element.style.backgroundColor = (i === newGameState[1]) ? "#3b82f6" : "#1e293b";
  });
  
  updateCharimPreview();
}

function updateCharimPreview() {
  const previewHan = document.getElementById("preview-han");
  const previewCho = document.getElementById("preview-cho");
  if (!previewHan || !previewCho) return;
  
  const layouts = [
    ["馬", "象", "馬", "象"], // 0: 마상마상
    ["馬", "象", "象", "馬"], // 1: 마상상마
    ["象", "馬", "馬", "象"], // 2: 상마마상
    ["象", "馬", "象", "馬"]  // 3: 상마상마
  ];
  
  let hanL = layouts[newGameState[1]];
  let choL = layouts[newGameState[0]];
  
  let topIsCho = !iAmCho;
  let bottomIsCho = iAmCho;
  
  let topTokenClass = topIsCho ? "preview-token-cho" : "preview-token-han";
  let bottomTokenClass = bottomIsCho ? "preview-token-cho" : "preview-token-han";
  
  previewHan.innerHTML = `
    <span class="preview-token preview-token-neutral">車</span>
    <span class="preview-token ${topTokenClass}">${hanL[0]}</span>
    <span class="preview-token ${topTokenClass}">${hanL[1]}</span>
    <span class="preview-token preview-token-neutral">士</span>
    <span class="preview-token preview-token-empty"></span>
    <span class="preview-token preview-token-neutral">士</span>
    <span class="preview-token ${topTokenClass}">${hanL[2]}</span>
    <span class="preview-token ${topTokenClass}">${hanL[3]}</span>
    <span class="preview-token preview-token-neutral">車</span>
  `;
  
  previewCho.innerHTML = `
    <span class="preview-token preview-token-neutral">車</span>
    <span class="preview-token ${bottomTokenClass}">${choL[0]}</span>
    <span class="preview-token ${bottomTokenClass}">${choL[1]}</span>
    <span class="preview-token preview-token-neutral">士</span>
    <span class="preview-token preview-token-empty"></span>
    <span class="preview-token preview-token-neutral">士</span>
    <span class="preview-token ${bottomTokenClass}">${choL[2]}</span>
    <span class="preview-token ${bottomTokenClass}">${choL[3]}</span>
    <span class="preview-token preview-token-neutral">車</span>
  `;
}

function changeNation(amIcho) {
  iAmCho = amIcho;
  const topEl = document.getElementById("nation-top");
  const bottomEl = document.getElementById("nation-bottom");
  if (!topEl || !bottomEl) return;
  
  if (amIcho) {
    bottomEl.style.backgroundColor = "#3b82f6";
    bottomEl.style.color = "white";
    bottomEl.innerHTML = "초";
    
    topEl.style.backgroundColor = "#ef4444";
    topEl.style.color = "white";
    topEl.innerHTML = "한";
  } else {
    bottomEl.style.backgroundColor = "#ef4444";
    bottomEl.style.color = "white";
    bottomEl.innerHTML = "한";
    
    topEl.style.backgroundColor = "#3b82f6";
    topEl.style.color = "white";
    topEl.innerHTML = "초";
  }
  
  // Re-bind pieces elements to match the new iAmCho state
  initElements();
  
  updateCharimPreview();
  saveCurrentConfigToSlot();
  currentLoadedRecordId = null;
  updateSavedRecordsListUI();
}

function toggleNation() {
  changeNation(!iAmCho);
  
  // 1. 착수 로그 및 상태 초기화
  log.length = 0;
  const turnEl = document.getElementById("turn");
  if (turnEl) turnEl.value = 0;
  gameEnded = false;
  curSelect = 32;
  clearCandiBox();
  const selectBox = document.getElementById("select-box");
  if (selectBox) {
    selectBox.setAttribute("x", -1000);
    selectBox.setAttribute("y", -1000);
  }

  // 2. 현재 설정한 상차림에 부합하는 배치 데이터 산출 및 복원
  let startingLayoutCode = knownStart[0][newGameState[0]] + knownStart[1][newGameState[1]];
  setting(startingLayoutCode);

  // 3. 보드 및 기물 위치 갱신
  svg.classList.add("no-transition");
  initBoard();
  initPositions();
  svg.offsetHeight; // Force reflow
  svg.classList.remove("no-transition");

  saveCurrentConfigToSlot();
  checkAndRunAI();
}

function download() {
  const svgData = new XMLSerializer().serializeToString(svg);
  const svgImage = new Image();
  svgImage.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = boardWidth;
    canvas.height = boardHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(svgImage, 0, 0, boardWidth, boardHeight);
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = "janggi.png";
      link.href = url;
      link.click();
    });
  };
  svgImage.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);
}

function changeFontSize(amount) {
  const elements = document.querySelectorAll('input, button');
  elements.forEach(element => {
    const fontSize = parseFloat(getComputedStyle(element).fontSize);
    element.style.fontSize = `${fontSize + amount}px`;
  });
}

function toggleCoordinates() {
  showCoordinates = !showCoordinates;
  localStorage.setItem("showCoordinates", showCoordinates);
  const btn = document.getElementById("toggle-coords-btn-settings");
  if (btn) {
    btn.textContent = showCoordinates ? "좌표 표시 중" : "좌표 숨김 중";
  }
  svg.classList.add("no-transition");
  initBoard();
  initPositions();
  svg.offsetHeight; // Force reflow
  svg.classList.remove("no-transition");
  saveCurrentConfigToSlot();
}

function startNewGame() {
  gameEnded = false;
  // 1. 착수 로그 비우기
  log.length = 0;
  
  // 2. 턴 수 0으로 초기화
  const turnEl = document.getElementById("turn");
  if (turnEl) turnEl.value = 0;
  
  // 3. 현재 설정한 상차림에 부합하는 배치 데이터 산출
  let startingLayoutCode = knownStart[0][newGameState[0]] + knownStart[1][newGameState[1]];
  
  // 4. 기물 위치 데이터 복원
  setting(startingLayoutCode);
  
  // 5. 기물 선택 상태 초기화
  curSelect = 32;
  clearCandiBox();
  const selectBox = document.getElementById("select-box");
  if (selectBox) {
    selectBox.setAttribute("x", -1000);
    selectBox.setAttribute("y", -1000);
  }
  
  // 6. 점수판 및 순위 갱신
  updateScore();
  
  // 7. 기물들을 초기 배치 좌표로 즉시 이동시킵니다. (트랜지션 애니메이션 차단)
  svg.classList.add("no-transition");
  initPositions();
  svg.offsetHeight; // force reflow
  svg.classList.remove("no-transition");
  
  // 8. 설정창 닫기
  disalbeSettingBox();
  
  // 9. 메타데이터 및 타이머 리셋
  gameMetadata = {
    choPlayer: "",
    hanPlayer: "",
    tournament: "",
    round: "",
    nickname: "",
    summary: ""
  };
  updateMetadataFormFromState();
  updateMetadataDisplay();
  initScoreboardRotation();
  updateCommentBubble();
}

function adjustPieceSize(type, delta) {
  if (type === "king") {
    sizeKing = Math.round(Math.max(0.5, Math.min(2.0, sizeKing + delta)) * 100) / 100;
    localStorage.setItem("sizeKing", sizeKing);
    const span = document.getElementById("val-size-king");
    if (span) span.textContent = sizeKing.toFixed(2);
  } else if (type === "middle") {
    sizeMiddle = Math.round(Math.max(0.5, Math.min(2.0, sizeMiddle + delta)) * 100) / 100;
    localStorage.setItem("sizeMiddle", sizeMiddle);
    const span = document.getElementById("val-size-middle");
    if (span) span.textContent = sizeMiddle.toFixed(2);
  } else if (type === "small") {
    sizeSmall = Math.round(Math.max(0.5, Math.min(2.0, sizeSmall + delta)) * 100) / 100;
    localStorage.setItem("sizeSmall", sizeSmall);
    const span = document.getElementById("val-size-small");
    if (span) span.textContent = sizeSmall.toFixed(2);
  }
  
  svg.classList.add("no-transition");
  initPositions();
  svg.offsetHeight;
  svg.classList.remove("no-transition");
  saveCurrentConfigToSlot();
}

function adjustPieceFontSize(type, delta) {
  if (type === "king") {
    fontScaleKing = Math.round(Math.max(0.5, Math.min(2.0, fontScaleKing + delta)) * 100) / 100;
    localStorage.setItem("fontScaleKing", fontScaleKing);
    const span = document.getElementById("val-font-king");
    if (span) span.textContent = fontScaleKing.toFixed(2);
  } else if (type === "middle") {
    fontScaleMiddle = Math.round(Math.max(0.5, Math.min(2.0, fontScaleMiddle + delta)) * 100) / 100;
    localStorage.setItem("fontScaleMiddle", fontScaleMiddle);
    const span = document.getElementById("val-font-middle");
    if (span) span.textContent = fontScaleMiddle.toFixed(2);
  } else if (type === "small") {
    fontScaleSmall = Math.round(Math.max(0.5, Math.min(2.0, fontScaleSmall + delta)) * 100) / 100;
    localStorage.setItem("fontScaleSmall", fontScaleSmall);
    const span = document.getElementById("val-font-small");
    if (span) span.textContent = fontScaleSmall.toFixed(2);
  }
  
  updatePieceGraphics();
  saveCurrentConfigToSlot();
}

function adjustCoordsFontSize(delta) {
  coordsTextScale = Math.round(Math.max(0.1, Math.min(0.5, coordsTextScale + delta)) * 100) / 100;
  localStorage.setItem("coordsTextScale", coordsTextScale);
  const span = document.getElementById("val-coords-size");
  if (span) span.textContent = coordsTextScale.toFixed(2);
  
  drawBoard();
  saveCurrentConfigToSlot();
}

function darkenColor(hex, percent) {
  hex = hex.replace(/^\s*#|\s*$/g, '');
  if (hex.length === 3) {
    hex = hex.replace(/(.)/g, '$1$1');
  }
  let r = parseInt(hex.substr(0, 2), 16),
      g = parseInt(hex.substr(2, 2), 16),
      b = parseInt(hex.substr(4, 2), 16);
  
  let factor = 1 - (percent / 100);
  r = Math.max(0, Math.min(255, Math.round(r * factor)));
  g = Math.max(0, Math.min(255, Math.round(g * factor)));
  b = Math.max(0, Math.min(255, Math.round(b * factor)));
  
  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');
  
  return `#${rHex}${gHex}${bHex}`;
}

function changeBoardColor(value) {
  const select = document.getElementById("board-color-select");
  const picker = document.getElementById("board-color-picker");
  const boardEl = document.getElementById("board");
  if (!boardEl) return;
  
  if (value === "custom" || value.startsWith("#")) {
    if (select) select.value = "custom";
    if (picker) {
      picker.style.display = "inline-block";
      if (value.startsWith("#")) picker.value = value;
    }
    
    let chosenColor = picker ? picker.value : "#dfb67c";
    boardColorType = chosenColor;
    localStorage.setItem("boardColorType", boardColorType);
    boardEl.setAttribute("fill", chosenColor);
    boardEl.setAttribute("filter", "");
  } else {
    if (picker) picker.style.display = "none";
    if (select) select.value = value;
    boardColorType = value;
    localStorage.setItem("boardColorType", boardColorType);
    
    if (value === "wood") {
      boardEl.setAttribute("fill", "url(#board-grad)");
      boardEl.setAttribute("filter", "url(#wood-grain)");
    } else if (value === "green") {
      boardEl.setAttribute("fill", "#2e5c3e");
      boardEl.setAttribute("filter", "");
    } else if (value === "dark") {
      boardEl.setAttribute("fill", "#2d3130");
      boardEl.setAttribute("filter", "");
    } else if (value === "navy") {
      boardEl.setAttribute("fill", "#1e293b");
      boardEl.setAttribute("filter", "");
    }
  }
}

function changeChoColor(value) {
  const select = document.getElementById("cho-color-select");
  const picker = document.getElementById("cho-color-picker");
  const piecesEl = document.querySelectorAll(".cho-piece");
  
  let chosenColor = value;
  if (value === "custom" || value.startsWith("#")) {
    if (select) select.value = "custom";
    if (picker) {
      picker.style.display = "inline-block";
      if (value.startsWith("#")) {
        picker.value = value;
        chosenColor = value;
      } else {
        chosenColor = picker.value || "#1e3a8a";
      }
    } else {
      chosenColor = value.startsWith("#") ? value : "#1e3a8a";
    }
    choColorType = chosenColor;
    localStorage.setItem("choColorType", choColorType);
    
    const p0 = darkenColor(chosenColor, 25);
    const p1 = darkenColor(chosenColor, 15);
    const p2 = chosenColor;
    
    piecesEl.forEach(p => {
      const polygons = p.querySelectorAll("polygon");
      if (polygons.length >= 3) {
        polygons[0].setAttribute("fill", p0);
        polygons[1].setAttribute("fill", p1);
        polygons[2].setAttribute("fill", p2);
      }
      const circles = p.querySelectorAll("circle");
      if (circles.length >= 3) {
        circles[0].setAttribute("fill", p0);
        circles[1].setAttribute("fill", p1);
        circles[2].setAttribute("fill", p2);
      }
    });
  } else {
    if (picker) picker.style.display = "none";
    if (select) select.value = value;
    choColorType = value;
    localStorage.setItem("choColorType", choColorType);
    
    piecesEl.forEach(p => {
      const polygons = p.querySelectorAll("polygon");
      if (polygons.length >= 3) {
        if (value === "blue") {
          polygons[0].setAttribute("fill", "#1e3a8a");
          polygons[1].setAttribute("fill", "#1e293b");
          polygons[2].setAttribute("fill", "url(#cho-face-grad)");
        } else if (value === "green") {
          polygons[0].setAttribute("fill", "#15803d");
          polygons[1].setAttribute("fill", "#14532d");
          polygons[2].setAttribute("fill", "#e8f5e9");
        } else if (value === "gold") {
          polygons[0].setAttribute("fill", "#b45309");
          polygons[1].setAttribute("fill", "#78350f");
          polygons[2].setAttribute("fill", "#fef3c7");
        }
      }
      const circles = p.querySelectorAll("circle");
      if (circles.length >= 3) {
        if (value === "blue") {
          circles[0].setAttribute("fill", "#1e3a8a");
          circles[1].setAttribute("fill", "#1e293b");
          circles[2].setAttribute("fill", "url(#cho-face-grad)");
        } else if (value === "green") {
          circles[0].setAttribute("fill", "#15803d");
          circles[1].setAttribute("fill", "#14532d");
          circles[2].setAttribute("fill", "#e8f5e9");
        } else if (value === "gold") {
          circles[0].setAttribute("fill", "#b45309");
          circles[1].setAttribute("fill", "#78350f");
          circles[2].setAttribute("fill", "#fef3c7");
        }
      }
    });
  }
}

function changeHanColor(value) {
  const select = document.getElementById("han-color-select");
  const picker = document.getElementById("han-color-picker");
  const piecesEl = document.querySelectorAll(".han-piece");
  
  let chosenColor = value;
  if (value === "custom" || value.startsWith("#")) {
    if (select) select.value = "custom";
    if (picker) {
      picker.style.display = "inline-block";
      if (value.startsWith("#")) {
        picker.value = value;
        chosenColor = value;
      } else {
        chosenColor = picker.value || "#991b1b";
      }
    } else {
      chosenColor = value.startsWith("#") ? value : "#991b1b";
    }
    hanColorType = chosenColor;
    localStorage.setItem("hanColorType", hanColorType);
    
    const p0 = darkenColor(chosenColor, 25);
    const p1 = darkenColor(chosenColor, 15);
    const p2 = chosenColor;
    
    piecesEl.forEach(p => {
      const polygons = p.querySelectorAll("polygon");
      if (polygons.length >= 3) {
        polygons[0].setAttribute("fill", p0);
        polygons[1].setAttribute("fill", p1);
        polygons[2].setAttribute("fill", p2);
      }
      const circles = p.querySelectorAll("circle");
      if (circles.length >= 3) {
        circles[0].setAttribute("fill", p0);
        circles[1].setAttribute("fill", p1);
        circles[2].setAttribute("fill", p2);
      }
    });
  } else {
    if (picker) picker.style.display = "none";
    if (select) select.value = value;
    hanColorType = value;
    localStorage.setItem("hanColorType", hanColorType);
    
    piecesEl.forEach(p => {
      const polygons = p.querySelectorAll("polygon");
      if (polygons.length >= 3) {
        if (value === "red") {
          polygons[0].setAttribute("fill", "#991b1b");
          polygons[1].setAttribute("fill", "#3f1c0d");
          polygons[2].setAttribute("fill", "url(#han-face-grad)");
        } else if (value === "purple") {
          polygons[0].setAttribute("fill", "#7e22ce");
          polygons[1].setAttribute("fill", "#4c1d95");
          polygons[2].setAttribute("fill", "#faf5ff");
        } else if (value === "slate") {
          polygons[0].setAttribute("fill", "#374151");
          polygons[1].setAttribute("fill", "#1f2937");
          polygons[2].setAttribute("fill", "#f3f4f6");
        }
      }
      const circles = p.querySelectorAll("circle");
      if (circles.length >= 3) {
        if (value === "red") {
          circles[0].setAttribute("fill", "#991b1b");
          circles[1].setAttribute("fill", "#3f1c0d");
          circles[2].setAttribute("fill", "url(#han-face-grad)");
        } else if (value === "purple") {
          circles[0].setAttribute("fill", "#7e22ce");
          circles[1].setAttribute("fill", "#4c1d95");
          circles[2].setAttribute("fill", "#faf5ff");
        } else if (value === "slate") {
          circles[0].setAttribute("fill", "#374151");
          circles[1].setAttribute("fill", "#1f2937");
          circles[2].setAttribute("fill", "#f3f4f6");
        }
      }
    });
  }
}

function changePieceShape(value) {
  if (!value || typeof value !== "string") value = "octagon";
  pieceShapeType = value;
  localStorage.setItem("pieceShapeType", pieceShapeType);
  const octs = document.querySelectorAll(".piece-svg polygon");
  const circs = document.querySelectorAll(".piece-svg circle");
  if (value === "octagon") {
    octs.forEach(el => el.style.display = "");
    circs.forEach(el => el.style.display = "none");
  } else if (value === "circle") {
    octs.forEach(el => el.style.display = "none");
    circs.forEach(el => el.style.display = "");
  }
  saveCurrentConfigToSlot();
}

function changeCandiShape(value) {
  if (!value || typeof value !== "string") value = "empty_circle";
  candiShapeType = value;
  localStorage.setItem("candiShapeType", candiShapeType);
  saveCurrentConfigToSlot();
}

function changeCandiColor(value) {
  const select = document.getElementById("candi-color-select");
  const picker = document.getElementById("candi-color-picker");
  
  if (value === "custom" || value.startsWith("#")) {
    if (select) select.value = "custom";
    if (picker) {
      picker.style.display = "inline-block";
      if (value.startsWith("#")) {
        picker.value = value;
        candiColorType = value;
      } else {
        candiColorType = picker.value || "#3b82f6";
      }
    } else {
      candiColorType = value.startsWith("#") ? value : "#3b82f6";
    }
  } else {
    if (picker) picker.style.display = "none";
    if (select) select.value = value;
    candiColorType = value;
  }
  localStorage.setItem("candiColorType", candiColorType);
  saveCurrentConfigToSlot();
}

function changeAnimDuration(val) {
  animDuration = Math.round(parseFloat(val) * 10) / 10;
  localStorage.setItem("animDuration", animDuration);
  const valSpan = document.getElementById("anim-duration-val");
  if (valSpan) {
    valSpan.textContent = animDuration.toFixed(1);
  }
  if (svg) {
    svg.style.setProperty("--anim-duration", `${animDuration}s`);
  }
  saveCurrentConfigToSlot();
}

function changeAnimHeight(val) {
  animHeight = Math.round(parseFloat(val) * 10) / 10;
  localStorage.setItem("animHeight", animHeight);
  const valSpan = document.getElementById("anim-height-val");
  if (valSpan) {
    valSpan.textContent = animHeight.toFixed(1);
  }
  saveCurrentConfigToSlot();
}

function changeSettingsBgColor(value) {
  const select = document.getElementById("settings-bg-select");
  const picker = document.getElementById("settings-bg-picker");
  
  if (value === "custom" || value.startsWith("#")) {
    if (select) select.value = "custom";
    if (picker) {
      picker.style.display = "inline-block";
      if (value.startsWith("#")) {
        picker.value = value;
        settingsBgColor = value;
      } else {
        settingsBgColor = picker.value || "#0f172a";
      }
    } else {
      settingsBgColor = value.startsWith("#") ? value : "#0f172a";
    }
  } else {
    if (picker) picker.style.display = "none";
    if (select) select.value = value;
    settingsBgColor = value;
  }
  localStorage.setItem("settingsBgColor", settingsBgColor);
  updateSettingsBoxStyle();
  updateSettingsTextColor();
  saveCurrentConfigToSlot();
}

function changeSettingsOpacity(val) {
  settingsOpacity = Math.round(parseFloat(val) * 100) / 100;
  localStorage.setItem("settingsOpacity", settingsOpacity);
  const valSpan = document.getElementById("settings-opacity-val");
  if (valSpan) {
    valSpan.textContent = settingsOpacity.toFixed(2);
  }
  updateSettingsBoxStyle();
  saveCurrentConfigToSlot();
}

function changeSettingsTextColorType(value) {
  if (!value || typeof value !== "string") value = "auto";
  settingsTextColorType = value;
  localStorage.setItem("settingsTextColorType", settingsTextColorType);
  const picker = document.getElementById("settings-text-color-picker");
  if (value === "custom") {
    if (picker) picker.style.display = "inline-block";
  } else {
    if (picker) picker.style.display = "none";
  }
  updateSettingsTextColor();
  saveCurrentConfigToSlot();
}

function changeSettingsTextColorCustom(value) {
  if (!value || typeof value !== "string") value = "#f8fafc";
  settingsTextColorCustom = value;
  localStorage.setItem("settingsTextColorCustom", settingsTextColorCustom);
  updateSettingsTextColor();
  saveCurrentConfigToSlot();
}

function changeSettingsAccentColor(value) {
  const select = document.getElementById("settings-accent-color-select");
  const picker = document.getElementById("settings-accent-color-picker");
  
  if (value === "custom" || value.startsWith("#")) {
    if (select) select.value = "custom";
    if (picker) {
      picker.style.display = "inline-block";
      if (value.startsWith("#")) {
        picker.value = value;
        settingsAccentColor = value;
      } else {
        settingsAccentColor = picker.value || "#3b82f6";
      }
    } else {
      settingsAccentColor = value.startsWith("#") ? value : "#3b82f6";
    }
  } else {
    if (picker) picker.style.display = "none";
    if (select) select.value = value;
    settingsAccentColor = value;
  }
  localStorage.setItem("settingsAccentColor", settingsAccentColor);
  updateSettingsAccentColor();
  saveCurrentConfigToSlot();
}

function updateSettingsBoxStyle() {
  const box = document.getElementById("setting-box");
  if (!box) return;
  
  let hex = settingsBgColor.replace(/^\s*#|\s*$/g, '');
  if (hex.length === 3) {
    hex = hex.replace(/(.)/g, '$1$1');
  }
  let r = parseInt(hex.substr(0, 2), 16) || 15;
  let g = parseInt(hex.substr(2, 2), 16) || 23;
  let b = parseInt(hex.substr(4, 2), 16) || 42;
  
  box.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${settingsOpacity})`;
}

function updateSettingsTextColor() {
  const box = document.getElementById("setting-box");
  if (!box) return;
  
  let color = "#f8fafc";
  
  if (settingsTextColorType === "auto") {
    let hex = settingsBgColor.replace(/^\s*#|\s*$/g, '');
    if (hex.length === 3) hex = hex.replace(/(.)/g, '$1$1');
    let r = parseInt(hex.substr(0, 2), 16) || 15;
    let g = parseInt(hex.substr(2, 2), 16) || 23;
    let b = parseInt(hex.substr(4, 2), 16) || 42;
    
    let luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    color = luminance > 0.5 ? "#0f172a" : "#f8fafc";
  } else if (settingsTextColorType === "complementary") {
    let hex = settingsBgColor.replace(/^\s*#|\s*$/g, '');
    if (hex.length === 3) hex = hex.replace(/(.)/g, '$1$1');
    let r = 255 - (parseInt(hex.substr(0, 2), 16) || 15);
    let g = 255 - (parseInt(hex.substr(2, 2), 16) || 23);
    let b = 255 - (parseInt(hex.substr(4, 2), 16) || 42);
    color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  } else if (settingsTextColorType === "custom") {
    color = settingsTextColorCustom || "#f8fafc";
  }
  
  box.style.color = color;
  
  const titles = box.querySelectorAll(".category-title, .settings-title, td, span, table");
  titles.forEach(el => {
    if (el.tagName !== "BUTTON" && el.tagName !== "SELECT" && el.tagName !== "INPUT" && !el.classList.contains("slot-btn") && el.id !== "close-btn") {
      el.style.color = color;
    }
  });
}

function updateSettingsAccentColor() {
  const box = document.getElementById("setting-box");
  if (!box) return;
  
  const sliders = box.querySelectorAll("input[type='range']");
  sliders.forEach(slider => {
    slider.style.accentColor = settingsAccentColor;
  });
  
  const activeButtons = box.querySelectorAll(".slot-btn.active, .start-settings-btn");
  activeButtons.forEach(btn => {
    btn.style.backgroundColor = settingsAccentColor;
    if (btn.classList.contains("slot-btn")) {
      btn.style.borderColor = settingsAccentColor;
    }
  });
  
  const valSpans = box.querySelectorAll("#anim-duration-val, #anim-height-val, #settings-opacity-val");
  valSpans.forEach(span => {
    span.style.color = settingsAccentColor;
  });
}

// ----------------------------------------------------
// Save/Load Slots Logic
// ----------------------------------------------------
let activeSlot = 1;

function selectSlot(num) {
  activeSlot = num;
  localStorage.setItem("janggi_active_slot", activeSlot);
  updateSlotButtonsUI();
  loadConfigFromSlot();
}

function updateSlotButtonsUI() {
  const s1 = document.getElementById("slot-1-btn");
  const s2 = document.getElementById("slot-2-btn");
  if (!s1 || !s2) return;
  if (activeSlot === 1) {
    s1.classList.add("active");
    s2.classList.remove("active");
  } else {
    s2.classList.add("active");
    s1.classList.remove("active");
  }
  updateSettingsAccentColor();
}

function saveCurrentConfigToSlot() {
  const config = {
    showCoordinates,
    sizeKing,
    sizeMiddle,
    sizeSmall,
    fontScaleKing,
    fontScaleMiddle,
    fontScaleSmall,
    coordsTextScale,
    boardColorType,
    choColorType,
    hanColorType,
    pieceShapeType,
    candiShapeType,
    candiColorType,
    animDuration,
    animHeight,
    settingsBgColor,
    settingsOpacity,
    settingsTextColorType,
    settingsTextColorCustom,
    settingsAccentColor,
    aiMode,
    cursorLockMode,
    shortcutKeys,
    scoreAutoRotate,
    scoreRotateInterval,
    scoreShowSlide1,
    scoreShowSlide2,
    scoreShowSlide3,
    autoplaySpeed,
    autoplayUseAnim,
    shortcutModalBgColor,
    shortcutModalOpacity,
    commentBoxBgColor,
    commentBoxOpacity,
    commentDisplayDuration
  };
  localStorage.setItem("janggi_settings_slot_" + activeSlot, JSON.stringify(config));
}

function loadConfigFromSlot() {
  const saved = localStorage.getItem("janggi_settings_slot_" + activeSlot);
  if (!saved) {
    saveCurrentConfigToSlot();
    return;
  }
  try {
    const config = JSON.parse(saved);
    if (config.showCoordinates !== undefined && config.showCoordinates !== null) showCoordinates = config.showCoordinates;
    if (config.sizeKing !== undefined && config.sizeKing !== null) sizeKing = config.sizeKing;
    if (config.sizeMiddle !== undefined && config.sizeMiddle !== null) sizeMiddle = config.sizeMiddle;
    if (config.sizeSmall !== undefined && config.sizeSmall !== null) sizeSmall = config.sizeSmall;
    if (config.fontScaleKing !== undefined && config.fontScaleKing !== null) fontScaleKing = config.fontScaleKing;
    if (config.fontScaleMiddle !== undefined && config.fontScaleMiddle !== null) fontScaleMiddle = config.fontScaleMiddle;
    if (config.fontScaleSmall !== undefined && config.fontScaleSmall !== null) fontScaleSmall = config.fontScaleSmall;
    if (config.coordsTextScale !== undefined && config.coordsTextScale !== null) coordsTextScale = config.coordsTextScale;
    if (config.boardColorType) boardColorType = config.boardColorType;
    if (config.choColorType) choColorType = config.choColorType;
    if (config.hanColorType) hanColorType = config.hanColorType;
    if (config.pieceShapeType) pieceShapeType = config.pieceShapeType;
    if (config.candiShapeType) candiShapeType = config.candiShapeType;
    if (config.candiColorType) candiColorType = config.candiColorType;
    if (config.animDuration !== undefined && config.animDuration !== null) animDuration = config.animDuration;
    if (config.animHeight !== undefined && config.animHeight !== null) animHeight = config.animHeight;
    if (config.settingsBgColor) settingsBgColor = config.settingsBgColor;
    if (config.settingsOpacity !== undefined && config.settingsOpacity !== null) settingsOpacity = config.settingsOpacity;
    if (config.settingsTextColorType) settingsTextColorType = config.settingsTextColorType;
    if (config.settingsTextColorCustom) settingsTextColorCustom = config.settingsTextColorCustom;
    if (config.settingsAccentColor) settingsAccentColor = config.settingsAccentColor;
    if (config.aiMode !== undefined && config.aiMode !== null) aiMode = parseInt(config.aiMode, 10);
    if (config.cursorLockMode !== undefined && config.cursorLockMode !== null) cursorLockMode = (config.cursorLockMode === "true" || config.cursorLockMode === true);
    if (config.shortcutKeys) {
      shortcutKeys = migrateShortcutKeys(config.shortcutKeys);
    }
    if (config.scoreAutoRotate !== undefined && config.scoreAutoRotate !== null) scoreAutoRotate = (config.scoreAutoRotate === "true" || config.scoreAutoRotate === true);
    if (config.scoreRotateInterval !== undefined && config.scoreRotateInterval !== null) scoreRotateInterval = parseInt(config.scoreRotateInterval, 10);
    if (config.scoreShowSlide1 !== undefined && config.scoreShowSlide1 !== null) scoreShowSlide1 = (config.scoreShowSlide1 === "true" || config.scoreShowSlide1 === true);
    if (config.scoreShowSlide2 !== undefined && config.scoreShowSlide2 !== null) scoreShowSlide2 = (config.scoreShowSlide2 === "true" || config.scoreShowSlide2 === true);
    if (config.scoreShowSlide3 !== undefined && config.scoreShowSlide3 !== null) scoreShowSlide3 = (config.scoreShowSlide3 === "true" || config.scoreShowSlide3 === true);
    if (config.autoplaySpeed !== undefined && config.autoplaySpeed !== null) autoplaySpeed = parseFloat(config.autoplaySpeed);
    if (config.autoplayUseAnim !== undefined && config.autoplayUseAnim !== null) autoplayUseAnim = (config.autoplayUseAnim === "true" || config.autoplayUseAnim === true);
    if (config.shortcutModalBgColor) shortcutModalBgColor = config.shortcutModalBgColor;
    if (config.shortcutModalOpacity !== undefined && config.shortcutModalOpacity !== null) shortcutModalOpacity = parseFloat(config.shortcutModalOpacity);
    if (config.commentBoxBgColor) commentBoxBgColor = config.commentBoxBgColor;
    if (config.commentBoxOpacity !== undefined && config.commentBoxOpacity !== null) commentBoxOpacity = parseFloat(config.commentBoxOpacity);
    if (config.commentDisplayDuration !== undefined && config.commentDisplayDuration !== null) commentDisplayDuration = parseInt(config.commentDisplayDuration, 10);
    
    applyShortcutModalTheme();
    applyCommentBoxTheme();
    
    // Update comment duration input field
    const durationInput = document.getElementById("comment-duration-input");
    if (durationInput) durationInput.value = commentDisplayDuration;
    
    localStorage.setItem("showCoordinates", showCoordinates);
    localStorage.setItem("sizeKing", sizeKing);
    localStorage.setItem("sizeMiddle", sizeMiddle);
    localStorage.setItem("sizeSmall", sizeSmall);
    localStorage.setItem("fontScaleKing", fontScaleKing);
    localStorage.setItem("fontScaleMiddle", fontScaleMiddle);
    localStorage.setItem("fontScaleSmall", fontScaleSmall);
    localStorage.setItem("coordsTextScale", coordsTextScale);
    localStorage.setItem("pieceShapeType", pieceShapeType);
    localStorage.setItem("candiShapeType", candiShapeType);
    localStorage.setItem("animDuration", animDuration);
    localStorage.setItem("animHeight", animHeight);
    localStorage.setItem("settingsBgColor", settingsBgColor);
    localStorage.setItem("settingsOpacity", settingsOpacity);
    localStorage.setItem("settingsTextColorType", settingsTextColorType);
    localStorage.setItem("settingsTextColorCustom", settingsTextColorCustom);
    localStorage.setItem("settingsAccentColor", settingsAccentColor);
    localStorage.setItem("aiMode", aiMode);
    localStorage.setItem("cursorLockMode", cursorLockMode);
    localStorage.setItem("shortcutKeys", JSON.stringify(shortcutKeys));
    localStorage.setItem("scoreAutoRotate", scoreAutoRotate);
    localStorage.setItem("scoreRotateInterval", scoreRotateInterval);
    localStorage.setItem("scoreShowSlide1", scoreShowSlide1);
    localStorage.setItem("scoreShowSlide2", scoreShowSlide2);
    localStorage.setItem("scoreShowSlide3", scoreShowSlide3);
    localStorage.setItem("autoplaySpeed", autoplaySpeed);
    localStorage.setItem("autoplayUseAnim", autoplayUseAnim);
    localStorage.setItem("shortcutModalBgColor", shortcutModalBgColor);
    localStorage.setItem("shortcutModalOpacity", shortcutModalOpacity);
    localStorage.setItem("commentBoxBgColor", commentBoxBgColor);
    localStorage.setItem("commentBoxOpacity", commentBoxOpacity);
    localStorage.setItem("commentDisplayDuration", commentDisplayDuration);
    
    changeBoardColor(boardColorType);
    changeChoColor(choColorType);
    changeHanColor(hanColorType);
    changePieceShape(pieceShapeType);
    changeCandiShape(candiShapeType);
    changeCandiColor(candiColorType);
    changeAnimDuration(animDuration);
    changeAnimHeight(animHeight);
    changeSettingsBgColor(settingsBgColor);
    changeSettingsOpacity(settingsOpacity);
    changeSettingsTextColorType(settingsTextColorType);
    if (settingsTextColorType === "custom") changeSettingsTextColorCustom(settingsTextColorCustom);
    changeSettingsAccentColor(settingsAccentColor);
    
    initBoard();
    initPositions();
    initSettingsUI();
    applyScoreboardConfig();
  } catch (e) {
    console.error("Failed to load settings from slot", e);
  }
}

function copyConfigToClipboard(btn) {
  const config = {
    showCoordinates,
    sizeKing,
    sizeMiddle,
    sizeSmall,
    fontScaleKing,
    fontScaleMiddle,
    fontScaleSmall,
    coordsTextScale,
    boardColorType,
    choColorType,
    hanColorType,
    pieceShapeType,
    candiShapeType,
    candiColorType,
    animDuration,
    animHeight,
    settingsBgColor,
    settingsOpacity,
    settingsTextColorType,
    settingsTextColorCustom,
    settingsAccentColor,
    aiMode
  };
  const text = JSON.stringify(config);
  navigator.clipboard.writeText(text).then(() => {
    const originalText = btn.textContent;
    btn.textContent = "✅";
    setTimeout(() => {
      btn.textContent = "📋";
    }, 1500);
  }).catch(err => {
    console.error("Clipboard copy failed", err);
  });
}

// ----------------------------------------------------
// Category Reset Functions
// ----------------------------------------------------
function resetCategory1() {
  changeCharim(1, 0, null); // Top default: 마상마상
  changeCharim(0, 0, null); // Bottom default: 마상마상
  changeNation(true); // default nation: Cho (iAmCho = true)
  saveCurrentConfigToSlot();
}

function resetCategory2() {
  console.log("[Janggi Reset Debug] resetCategory2() called");
  showCoordinates = true;
  sizeKing = 1.15;
  sizeMiddle = 0.90;
  sizeSmall = 0.70;
  fontScaleKing = 1.25;
  fontScaleMiddle = 1.45;
  fontScaleSmall = 1.45;
  coordsTextScale = 0.18;
  boardColorType = "wood";
  choColorType = "blue";
  hanColorType = "red";
  pieceShapeType = "octagon";
  candiShapeType = "empty_circle";
  candiColorType = "#3b82f6";
  
  localStorage.setItem("showCoordinates", showCoordinates);
  localStorage.setItem("sizeKing", sizeKing);
  localStorage.setItem("sizeMiddle", sizeMiddle);
  localStorage.setItem("sizeSmall", sizeSmall);
  localStorage.setItem("fontScaleKing", fontScaleKing);
  localStorage.setItem("fontScaleMiddle", fontScaleMiddle);
  localStorage.setItem("fontScaleSmall", fontScaleSmall);
  localStorage.setItem("coordsTextScale", coordsTextScale);
  localStorage.setItem("pieceShapeType", pieceShapeType);
  localStorage.setItem("candiShapeType", candiShapeType);
  
  changeBoardColor(boardColorType);
  changeChoColor(choColorType);
  changeHanColor(hanColorType);
  changePieceShape(pieceShapeType);
  changeCandiShape(candiShapeType);
  changeCandiColor(candiColorType);
  
  initBoard();
  initPositions();
  initSettingsUI();
  saveCurrentConfigToSlot();
}

function resetCategory3() {
  changeAnimDuration(0.5);
  changeAnimHeight(0.2);
  saveCurrentConfigToSlot();
}

function resetCategory4() {
  settingsBgColor = "#0f172a";
  settingsOpacity = 0.55;
  settingsTextColorType = "auto";
  settingsTextColorCustom = "#f8fafc";
  settingsAccentColor = "#3b82f6";
  aiMode = 0;
  
  localStorage.setItem("settingsBgColor", settingsBgColor);
  localStorage.setItem("settingsOpacity", settingsOpacity);
  localStorage.setItem("settingsTextColorType", settingsTextColorType);
  localStorage.setItem("settingsTextColorCustom", settingsTextColorCustom);
  localStorage.setItem("settingsAccentColor", settingsAccentColor);
  localStorage.setItem("aiMode", aiMode);
  
  changeSettingsBgColor(settingsBgColor);
  changeSettingsOpacity(settingsOpacity);
  changeSettingsTextColorType(settingsTextColorType);
  changeSettingsAccentColor(settingsAccentColor);
  
  initSettingsUI();
  saveCurrentConfigToSlot();
}

function initSettingsUI() {
  const coordsBtn = document.getElementById("toggle-coords-btn-settings");
  if (coordsBtn) {
    coordsBtn.textContent = showCoordinates ? "좌표 표시 중" : "좌표 숨김 중";
  }
  
  const durSlider = document.getElementById("anim-duration-slider");
  if (durSlider) durSlider.value = animDuration;
  const durVal = document.getElementById("anim-duration-val");
  if (durVal) durVal.textContent = animDuration.toFixed(1);
  
  const heightSlider = document.getElementById("anim-height-slider");
  if (heightSlider) heightSlider.value = animHeight;
  const heightVal = document.getElementById("anim-height-val");
  if (heightVal) heightVal.textContent = animHeight.toFixed(1);
  
  const valSizeKing = document.getElementById("val-size-king");
  if (valSizeKing) valSizeKing.textContent = sizeKing.toFixed(2);
  const valSizeMiddle = document.getElementById("val-size-middle");
  if (valSizeMiddle) valSizeMiddle.textContent = sizeMiddle.toFixed(2);
  const valSizeSmall = document.getElementById("val-size-small");
  if (valSizeSmall) valSizeSmall.textContent = sizeSmall.toFixed(2);
  
  const valFontKing = document.getElementById("val-font-king");
  if (valFontKing) valFontKing.textContent = fontScaleKing.toFixed(2);
  const valFontMiddle = document.getElementById("val-font-middle");
  if (valFontMiddle) valFontMiddle.textContent = fontScaleMiddle.toFixed(2);
  const valFontSmall = document.getElementById("val-font-small");
  if (valFontSmall) valFontSmall.textContent = fontScaleSmall.toFixed(2);
  
  const valCoordsSize = document.getElementById("val-coords-size");
  if (valCoordsSize) valCoordsSize.textContent = coordsTextScale.toFixed(2);
  
  const boardColorSelect = document.getElementById("board-color-select");
  const boardColorPicker = document.getElementById("board-color-picker");
  if (boardColorSelect) {
    if (boardColorType.startsWith("#")) {
      boardColorSelect.value = "custom";
      if (boardColorPicker) {
        boardColorPicker.style.display = "inline-block";
        boardColorPicker.value = boardColorType;
      }
    } else {
      boardColorSelect.value = boardColorType;
      if (boardColorPicker) boardColorPicker.style.display = "none";
    }
  }
  
  const choColorSelect = document.getElementById("cho-color-select");
  const choColorPicker = document.getElementById("cho-color-picker");
  if (choColorSelect) {
    if (choColorType.startsWith("#")) {
      choColorSelect.value = "custom";
      if (choColorPicker) {
        choColorPicker.style.display = "inline-block";
        choColorPicker.value = choColorType;
      }
    } else {
      choColorSelect.value = choColorType;
      if (choColorPicker) choColorPicker.style.display = "none";
    }
  }
  
  const hanColorSelect = document.getElementById("han-color-select");
  const hanColorPicker = document.getElementById("han-color-picker");
  if (hanColorSelect) {
    if (hanColorType.startsWith("#")) {
      hanColorSelect.value = "custom";
      if (hanColorPicker) {
        hanColorPicker.style.display = "inline-block";
        hanColorPicker.value = hanColorType;
      }
    } else {
      hanColorSelect.value = hanColorType;
      if (hanColorPicker) hanColorPicker.style.display = "none";
    }
  }
  
  const pieceShapeSelect = document.getElementById("piece-shape-select");
  if (pieceShapeSelect) pieceShapeSelect.value = pieceShapeType;
  
  const candiShapeSelect = document.getElementById("candi-shape-select");
  if (candiShapeSelect) candiShapeSelect.value = candiShapeType;
  
  const candiColorSelect = document.getElementById("candi-color-select");
  const candiColorPicker = document.getElementById("candi-color-picker");
  if (candiColorSelect) {
    if (candiColorType.startsWith("#") && !["#3b82f6", "#10b981", "#f97316", "#a855f7", "#eab308"].includes(candiColorType)) {
      candiColorSelect.value = "custom";
      if (candiColorPicker) {
        candiColorPicker.style.display = "inline-block";
        candiColorPicker.value = candiColorType;
      }
    } else {
      candiColorSelect.value = candiColorType;
      if (candiColorPicker) candiColorPicker.style.display = "none";
    }
  }
  
  const settingsBgSelect = document.getElementById("settings-bg-select");
  const settingsBgPicker = document.getElementById("settings-bg-picker");
  if (settingsBgSelect) {
    if (settingsBgColor.startsWith("#") && !["#0f172a", "#1e293b", "#1e1b4b", "#022c22"].includes(settingsBgColor)) {
      settingsBgSelect.value = "custom";
      if (settingsBgPicker) {
        settingsBgPicker.style.display = "inline-block";
        settingsBgPicker.value = settingsBgColor;
      }
    } else {
      settingsBgSelect.value = settingsBgColor;
      if (settingsBgPicker) settingsBgPicker.style.display = "none";
    }
  }
  
  const settingsOpacitySlider = document.getElementById("settings-opacity-slider");
  if (settingsOpacitySlider) settingsOpacitySlider.value = settingsOpacity;
  const settingsOpacityVal = document.getElementById("settings-opacity-val");
  if (settingsOpacityVal) settingsOpacityVal.textContent = settingsOpacity.toFixed(2);

  const settingsTextColorSelect = document.getElementById("settings-text-color-select");
  const settingsTextColorPicker = document.getElementById("settings-text-color-picker");
  if (settingsTextColorSelect) {
    settingsTextColorSelect.value = settingsTextColorType;
    if (settingsTextColorType === "custom") {
      if (settingsTextColorPicker) {
        settingsTextColorPicker.style.display = "inline-block";
        settingsTextColorPicker.value = settingsTextColorCustom;
      }
    } else {
      if (settingsTextColorPicker) settingsTextColorPicker.style.display = "none";
    }
  }

  const settingsAccentSelect = document.getElementById("settings-accent-color-select");
  const settingsAccentPicker = document.getElementById("settings-accent-color-picker");
  if (settingsAccentSelect) {
    if (settingsAccentColor.startsWith("#") && !["#3b82f6", "#10b981", "#f97316", "#a855f7", "#eab308"].includes(settingsAccentColor)) {
      settingsAccentSelect.value = "custom";
      if (settingsAccentPicker) {
        settingsAccentPicker.style.display = "inline-block";
        settingsAccentPicker.value = settingsAccentColor;
      }
    } else {
      settingsAccentSelect.value = settingsAccentColor;
      if (settingsAccentPicker) settingsAccentPicker.style.display = "none";
    }
  }
  
  const aiModeSelect = document.getElementById("ai-mode-select");
  if (aiModeSelect) aiModeSelect.value = aiMode;

  const cursorLockSelect = document.getElementById("cursor-lock-select");
  if (cursorLockSelect) cursorLockSelect.value = cursorLockMode ? "true" : "false";

  // Scoreboard Settings Sync
  const autoRotateEl = document.getElementById("score-auto-rotate");
  if (autoRotateEl) autoRotateEl.value = scoreAutoRotate ? "true" : "false";
  
  const rotateIntervalEl = document.getElementById("score-rotate-interval");
  if (rotateIntervalEl) rotateIntervalEl.value = scoreRotateInterval.toString();
  
  const showSlide1El = document.getElementById("score-show-slide1");
  if (showSlide1El) showSlide1El.checked = scoreShowSlide1;
  
  const showSlide2El = document.getElementById("score-show-slide2");
  if (showSlide2El) showSlide2El.checked = scoreShowSlide2;
  
  const showSlide3El = document.getElementById("score-show-slide3");
  if (showSlide3El) showSlide3El.checked = scoreShowSlide3;

  // Autoplay Settings Sync
  const autoplaySpeedSlider = document.getElementById("autoplay-speed-slider");
  if (autoplaySpeedSlider) autoplaySpeedSlider.value = autoplaySpeed;
  const autoplaySpeedVal = document.getElementById("autoplay-speed-val");
  if (autoplaySpeedVal) autoplaySpeedVal.textContent = autoplaySpeed.toFixed(1);
  const autoplayUseAnimCheck = document.getElementById("autoplay-use-anim");
  if (autoplayUseAnimCheck) autoplayUseAnimCheck.checked = autoplayUseAnim;
}

// ----------------------------------------------------
// 기보 라이브러리 및 보관함 로직
// ----------------------------------------------------
function getLayoutName(type) {
  const names = ["마상마상", "마상상마", "상마마상", "상마상마"];
  return names[type] || "마상마상";
}

function getScoreLeadString() {
  let scoreA = 0;
  let scoreB = 0;
  if (pieces[1].x != 0 || pieces[1].y != 0) scoreA += 13;
  if (pieces[2].x != 0 || pieces[2].y != 0) scoreA += 13;
  if (pieces[3].x != 0 || pieces[3].y != 0) scoreA += 7;
  if (pieces[4].x != 0 || pieces[4].y != 0) scoreA += 7;
  if (pieces[5].x != 0 || pieces[5].y != 0) scoreA += 5;
  if (pieces[6].x != 0 || pieces[6].y != 0) scoreA += 5;
  if (pieces[7].x != 0 || pieces[7].y != 0) scoreA += 3;
  if (pieces[8].x != 0 || pieces[8].y != 0) scoreA += 3;
  if (pieces[9].x != 0 || pieces[9].y != 0) scoreA += 3;
  if (pieces[10].x != 0 || pieces[10].y != 0) scoreA += 3;
  if (pieces[11].x != 0 || pieces[11].y != 0) scoreA += 2;
  if (pieces[12].x != 0 || pieces[12].y != 0) scoreA += 2;
  if (pieces[13].x != 0 || pieces[13].y != 0) scoreA += 2;
  if (pieces[14].x != 0 || pieces[14].y != 0) scoreA += 2;
  if (pieces[15].x != 0 || pieces[15].y != 0) scoreA += 2;
  
  if (pieces[17].x != 0 || pieces[17].y != 0) scoreB += 13;
  if (pieces[18].x != 0 || pieces[18].y != 0) scoreB += 13;
  if (pieces[19].x != 0 || pieces[19].y != 0) scoreB += 7;
  if (pieces[20].x != 0 || pieces[20].y != 0) scoreB += 7;
  if (pieces[21].x != 0 || pieces[21].y != 0) scoreB += 5;
  if (pieces[22].x != 0 || pieces[22].y != 0) scoreB += 5;
  if (pieces[23].x != 0 || pieces[23].y != 0) scoreB += 3;
  if (pieces[24].x != 0 || pieces[24].y != 0) scoreB += 3;
  if (pieces[25].x != 0 || pieces[25].y != 0) scoreB += 3;
  if (pieces[26].x != 0 || pieces[26].y != 0) scoreB += 3;
  if (pieces[27].x != 0 || pieces[27].y != 0) scoreB += 2;
  if (pieces[28].x != 0 || pieces[28].y != 0) scoreB += 2;
  if (pieces[29].x != 0 || pieces[29].y != 0) scoreB += 2;
  if (pieces[30].x != 0 || pieces[30].y != 0) scoreB += 2;
  if (pieces[31].x != 0 || pieces[31].y != 0) scoreB += 2;

  let scoreHan = 0;
  let scoreCho = 0;
  if (iAmCho) {
    scoreB += 1.5;
    scoreHan = scoreB;
    scoreCho = scoreA;
  } else {
    scoreA += 1.5;
    scoreHan = scoreA;
    scoreCho = scoreB;
  }

  if (scoreHan > scoreCho) {
    return `한_${(scoreHan - scoreCho).toFixed(1)}점`;
  } else if (scoreCho > scoreHan) {
    return `초_${(scoreCho - scoreHan).toFixed(1)}점`;
  } else {
    return `동점_0.0점`;
  }
}

function getStartingCode() {
  let code = "";
  for (let idx = 0; idx < 32; idx++) {
    code += `${initPieces[idx].x}${initPieces[idx].y}`;
  }
  return code;
}

function rebuildHistory() {
  const tempPieces = [];
  for (let idx = 0; idx < 32; idx++) {
    tempPieces[idx] = { x: initPieces[idx].x, y: initPieces[idx].y };
  }
  
  const history = [];
  for (let step = 0; step < log.length; step++) {
    const moveInfo = log[step];
    const i = moveInfo.i;
    const endX = moveInfo.x;
    const endY = moveInfo.y;
    const t = moveInfo.t;
    
    const startX = tempPieces[i].x;
    const startY = tempPieces[i].y;
    
    const player = ((i <= 15) === iAmCho) ? "초" : "한";
    
    let pieceName = "";
    if (i === 0) pieceName = "궁";
    else if (i === 1 || i === 2) pieceName = "차";
    else if (i === 3 || i === 4) pieceName = "포";
    else if (i === 5 || i === 6) pieceName = "마";
    else if (i === 7 || i === 8) pieceName = "상";
    else if (i === 9 || i === 10) pieceName = "사";
    else if (i >= 11 && i <= 15) pieceName = "졸";
    else if (i === 16) pieceName = "궁";
    else if (i === 17 || i === 18) pieceName = "차";
    else if (i === 19 || i === 20) pieceName = "포";
    else if (i === 21 || i === 22) pieceName = "마";
    else if (i === 23 || i === 24) pieceName = "상";
    else if (i === 25 || i === 26) pieceName = "사";
    else if (i >= 27 && i <= 31) pieceName = "병";
    
    history.push({
      step: step + 1,
      player,
      pieceName,
      startX,
      startY,
      endX,
      endY,
      captured: t,
      comment: moveInfo.comment || ""
    });
    
    tempPieces[i].x = endX;
    tempPieces[i].y = endY;
    if (t < 32) {
      tempPieces[t].x = 0;
      tempPieces[t].y = 0;
    }
  }
  
  return history;
}

function generateGameRecordText() {
  const bottomLayout = getLayoutName(newGameState[0]);
  const topLayout = getLayoutName(newGameState[1]);
  let sideLayoutDesc = "";
  if (iAmCho) {
    sideLayoutDesc = `초하(${bottomLayout}) vs 한상(${topLayout})`;
  } else {
    sideLayoutDesc = `한하(${bottomLayout}) vs 초상(${topLayout})`;
  }
  
  let lines = [];
  lines.push(`상차림: ${sideLayoutDesc}`);
  
  if (gameMetadata.choPlayer) lines.push(`초나라: ${gameMetadata.choPlayer}`);
  if (gameMetadata.hanPlayer) lines.push(`한나라: ${gameMetadata.hanPlayer}`);
  if (gameMetadata.tournament) lines.push(`대회명: ${gameMetadata.tournament}`);
  if (gameMetadata.round) lines.push(`대국정보: ${gameMetadata.round}`);
  if (gameMetadata.nickname) lines.push(`기보별명: ${gameMetadata.nickname}`);
  if (gameMetadata.summary) {
    const cleanSummary = gameMetadata.summary.replace(/\r?\n/g, "  ");
    lines.push(`총평: ${cleanSummary}`);
  }
  
  lines.push("");
  
  const history = rebuildHistory();
  history.forEach(h => {
    const commentSuffix = h.comment ? ` (${h.comment})` : "";
    lines.push(`${h.step}. ${h.player} ${h.startY}${h.startX}${h.pieceName}${h.endY}${h.endX}${commentSuffix}`);
  });
  
  return lines.join("\n");
}

function openRecordModal() {
  const recordBox = document.getElementById("record-box");
  if (recordBox) {
    recordBox.style.display = "flex";
    
    const article = document.getElementById("janggi-app");
    if (article) article.classList.add("record-open");
    
    updateRecordUI();
    updateSavedRecordsListUI();
  }
}

function closeRecordModal() {
  const recordBox = document.getElementById("record-box");
  if (recordBox) {
    recordBox.style.display = "none";
    
    const article = document.getElementById("janggi-app");
    if (article) article.classList.remove("record-open");
  }
}

function showToast(message) {
  let toast = document.getElementById("janggi-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "janggi-toast";
    toast.style.cssText = "position: fixed; top: 24px; left: 50%; transform: translateX(-50%) translateY(-20px); background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px; color: #f8fafc; padding: 12px 24px; font-size: 14px; font-weight: bold; z-index: 99999; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); pointer-events: none; opacity: 0; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); backdrop-filter: blur(8px);";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.offsetHeight; // Force reflow
  toast.style.transform = "translateX(-50%) translateY(0)";
  toast.style.opacity = "1";
  
  setTimeout(() => {
    toast.style.transform = "translateX(-50%) translateY(-20px)";
    toast.style.opacity = "0";
  }, 1000);
}

function loadRecordFromClipboard() {
  if (navigator.clipboard && navigator.clipboard.readText) {
    navigator.clipboard.readText().then(text => {
      if (text && text.trim()) {
        importRecordFromText(text);
        currentLoadedRecordId = null;
        updateSavedRecordsListUI();
        showToast("기보를 복원하였습니다.");
      } else {
        fallbackPromptLoad();
      }
    }).catch(err => {
      console.warn("Failed to read clipboard using Clipboard API, trying prompt fallback:", err);
      fallbackPromptLoad();
    });
  } else {
    fallbackPromptLoad();
  }
}

function fallbackPromptLoad() {
  const text = prompt("클립보드에서 가져오지 못했습니다. 복사한 기보 텍스트를 여기에 붙여넣어 주세요:");
  if (text && text.trim()) {
    importRecordFromText(text);
    currentLoadedRecordId = null;
    updateSavedRecordsListUI();
    showToast("기보를 복원하였습니다.");
  }
}

function updateRecordUI() {
  // record-text-area가 제거되었으므로 빈 함수 또는 체크용으로 둠
  const recordTextArea = document.getElementById("record-text-area");
  if (recordTextArea) {
    recordTextArea.value = generateGameRecordText();
  }
}

function saveRecordToLibrary(btn) {
  const recordText = generateGameRecordText();
  
  // 1. 클립보드 복사
  navigator.clipboard.writeText(recordText).then(() => {
    showToast("기보가 클립보드에 복사 및 저장되었습니다!");
    if (btn) {
      btn.classList.add("success");
      btn.disabled = true;
      setTimeout(() => {
        btn.classList.remove("success");
        btn.disabled = false;
      }, 1000);
    }
  }).catch(err => {
    console.error("클립보드 복사 실패", err);
    alert("클립보드 복사에 실패하였습니다.");
  });

  // 2. localStorage 보관함 저장
  const bottomLayout = getLayoutName(newGameState[0]);
  const topLayout = getLayoutName(newGameState[1]);
  let sideLayoutDesc = "";
  if (iAmCho) {
    sideLayoutDesc = `초하(${bottomLayout}) vs 한상(${topLayout})`;
  } else {
    sideLayoutDesc = `한하(${bottomLayout}) vs 초상(${topLayout})`;
  }
  const recordName = `${sideLayoutDesc}_${log.length}수_${getScoreLeadString()}`;
  
  const now = new Date();
  const saveDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  const newRecord = {
    id: Date.now(),
    name: recordName,
    date: saveDate,
    text: recordText
  };
  
  let saved = JSON.parse(localStorage.getItem("janggi_saved_records") || "[]");
  saved.unshift(newRecord);
  localStorage.setItem("janggi_saved_records", JSON.stringify(saved));
  
  // 방금 저장한 기보를 현재 불러온 기보로 활성화 처리
  currentLoadedRecordId = newRecord.id;

  // 3. UI 갱신
  updateSavedRecordsListUI();
}

function renameSavedRecord(id) {
  let saved = JSON.parse(localStorage.getItem("janggi_saved_records") || "[]");
  const recordIndex = saved.findIndex(r => r.id === id);
  if (recordIndex === -1) return;
  
  const currentName = saved[recordIndex].name;
  const newName = prompt("기보 이름을 변경하시겠습니까?", currentName);
  if (newName === null) return; // User cancelled
  
  const trimmedName = newName.trim();
  if (!trimmedName) {
    alert("이름은 비워둘 수 없습니다.");
    return;
  }
  
  saved[recordIndex].name = trimmedName;
  localStorage.setItem("janggi_saved_records", JSON.stringify(saved));
  updateSavedRecordsListUI();
  showToast("이름이 수정되었습니다.");
}

function updateSavedRecordsListUI() {
  const container = document.getElementById("saved-records-list");
  if (!container) return;
  
  container.innerHTML = "";
  let saved = JSON.parse(localStorage.getItem("janggi_saved_records") || "[]");
  
  if (saved.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 24px 0; color: #64748b; font-size: 0.9em;">저장된 기보가 없습니다.</div>`;
    return;
  }
  
  saved.forEach(record => {
    const isCurrent = record.id === currentLoadedRecordId;
    const row = document.createElement("div");
    row.className = "saved-record-row" + (isCurrent ? " active" : "");
    row.innerHTML = `
      <div class="saved-record-info">
        <span class="saved-record-name">${record.name}</span>
        <span class="saved-record-date">${record.date}</span>
      </div>
      <div class="saved-record-actions">
        <button class="saved-record-btn load-btn" onclick="loadSavedRecord(${record.id})" title="기보 불러오기">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
        <button class="saved-record-btn edit-btn" onclick="renameSavedRecord(${record.id})" title="이름 수정">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="saved-record-btn delete-btn" onclick="deleteSavedRecord(${record.id}, event)" title="기보 삭제">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </div>
    `;
    container.appendChild(row);
  });
}

function loadSavedRecord(id) {
  let saved = JSON.parse(localStorage.getItem("janggi_saved_records") || "[]");
  const record = saved.find(r => r.id === id);
  if (record) {
    importRecordFromText(record.text);
    currentLoadedRecordId = id;
    updateSavedRecordsListUI();
    showToast("기보를 불러왔습니다.");
  }
}

function deleteSavedRecord(id, event) {
  if (event) event.stopPropagation();
  if (!confirm("이 기보를 정말 삭제하시겠습니까?")) return;
  
  let saved = JSON.parse(localStorage.getItem("janggi_saved_records") || "[]");
  saved = saved.filter(r => r.id !== id);
  localStorage.setItem("janggi_saved_records", JSON.stringify(saved));
  
  if (currentLoadedRecordId === id) {
    currentLoadedRecordId = null;
  }
  
  updateSavedRecordsListUI();
  showToast("기보가 삭제되었습니다.");
}

function clearAllSavedRecords() {
  if (!confirm("모든 저장된 기보를 삭제하시겠습니까?")) return;
  localStorage.removeItem("janggi_saved_records");
  currentLoadedRecordId = null;
  updateSavedRecordsListUI();
  showToast("모든 기보가 삭제되었습니다.");
}

function parseMoveLine(line, index) {
  let clean = line.trim();
  if (!clean) return null;
  
  // 마크다운 강조 기호 제거
  clean = clean.replace(/[\*_`]/g, "").trim();
  
  // Extract comment if present inside parentheses
  let comment = "";
  const commentMatch = clean.match(/\(([^)]+)\)/);
  if (commentMatch) {
    comment = commentMatch[1].trim();
    clean = clean.replace(/\([^)]+\)/, "").trim();
  }
  
  // Extract step number if present at start (e.g., "1. " or "1: ")
  let step = null;
  const stepMatch = clean.match(/^(\d+)\s*[\.:]/);
  if (stepMatch) {
    step = parseInt(stepMatch[1], 10);
    clean = clean.replace(/^(\d+)\s*[\.:]/, "").trim();
  }
  
  // Extract player if present
  let player = null;
  if (clean.includes("초")) {
    player = "초";
    clean = clean.replace("초", "").trim();
  } else if (clean.includes("한")) {
    player = "한";
    clean = clean.replace("한", "").trim();
  }
  
  // Remove arrows and normalize whitespaces
  clean = clean.replace(/->|=>/g, "").replace(/\s+/g, "");
  
  // Extract all digits and optional piece character
  const pieceMatch = clean.match(/[궁차포마상사졸병]/);
  const pieceName = pieceMatch ? pieceMatch[0] : "";
  if (!pieceName) return null;
  
  const digits = clean.replace(/[^0-9]/g, "");
  
  let startStr = "";
  let endStr = "";
  
  if (digits.length === 4) {
    startStr = digits.slice(0, 2);
    endStr = digits.slice(2);
  } else if (digits.length === 5) {
    if (digits.startsWith("10")) {
      startStr = digits.slice(0, 3);
      endStr = digits.slice(3);
    } else {
      startStr = digits.slice(0, 2);
      endStr = digits.slice(2);
    }
  } else if (digits.length === 6) {
    startStr = digits.slice(0, 3);
    endStr = digits.slice(3);
  } else {
    return null;
  }
  
  const startX = parseInt(startStr.slice(-1), 10);
  let startY = parseInt(startStr.slice(0, -1), 10);
  if (startY === 10) startY = 0;
  
  const endX = parseInt(endStr.slice(-1), 10);
  let endY = parseInt(endStr.slice(0, -1), 10);
  if (endY === 10) endY = 0;
  
  if (startX < 1 || startX > 9 || startY < 0 || startY > 9) return null;
  if (endX < 1 || endX > 9 || endY < 0 || endY > 9) return null;
  
  if (!player) {
    player = (index % 2 === 0) ? "초" : "한";
  }
  if (!step) {
    step = index + 1;
  }
  
  return { step, player, startX, startY, endX, endY, pieceName, comment };
}

function determineIAmChoFromText(text) {
  const lines = text.split("\n");
  let validLineIdx = 0;
  for (let idx = 0; idx < lines.length; idx++) {
    const parsed = parseMoveLine(lines[idx], validLineIdx);
    if (parsed) {
      validLineIdx++;
      if (parsed.pieceName) {
        const isZol = parsed.pieceName === "졸";
        const isByung = parsed.pieceName === "병";
        if (isZol || isByung) {
          const isBottom = parsed.startY >= 6;
          if (isZol) {
            return isBottom;
          } else {
            return !isBottom;
          }
        }
      }
    }
  }
  return true; // Default fallback: bottom is Cho
}

function parseLayoutText(text) {
  const lines = text.split("\n");
  for (let line of lines) {
    const clean = line.replace(/\s+/g, "");
    // Match "초하(마상마상)vs한상(마상마상)" pattern
    const match = clean.match(/(초|한)(하|상)\((마상마상|마상상마|상마마상|상마상마)\)vs(초|한)(하|상)\((마상마상|마상상마|상마마상|상마상마)\)/);
    if (match) {
      const side1 = match[1];
      const pos1 = match[2];
      const layout1 = match[3];
      
      const side2 = match[4];
      const pos2 = match[5];
      const layout2 = match[6];
      
      let bottomLayoutStr = "";
      let topLayoutStr = "";
      let determinedChoIsBottom = true;
      
      if (pos1 === "하") {
        bottomLayoutStr = layout1;
        determinedChoIsBottom = (side1 === "초");
      } else {
        topLayoutStr = layout1;
      }
      
      if (pos2 === "하") {
        bottomLayoutStr = layout2;
        determinedChoIsBottom = (side2 === "초");
      } else {
        topLayoutStr = layout2;
      }
      
      const names = ["마상마상", "마상상마", "상마마상", "상마상마"];
      const bottomType = names.indexOf(bottomLayoutStr);
      const topType = names.indexOf(topLayoutStr);
      
      if (bottomType !== -1 && topType !== -1) {
        const startingCode = knownStart[0][bottomType] + knownStart[1][topType];
        return { startingCode, determinedChoIsBottom };
      }
    }
  }

  // Fallback: 유연한 매칭 (상차림: 키워드가 들어간 줄)
  for (let line of lines) {
    const clean = line.replace(/[\*_`]/g, "").trim();
    if (clean.startsWith("상차림:")) {
      const content = clean.substring(4).trim();
      const names = ["마상마상", "마상상마", "상마마상", "상마상마"];
      
      let foundLayouts = [];
      for (let name of names) {
        if (content.includes(name)) {
          foundLayouts.push(name);
        }
      }
      
      if (foundLayouts.length === 1) {
        const layout = foundLayouts[0];
        const typeIdx = names.indexOf(layout);
        const startingCode = knownStart[0][typeIdx] + knownStart[1][typeIdx];
        return { startingCode, determinedChoIsBottom: true };
      } else if (foundLayouts.length >= 2) {
        const typeIdx1 = names.indexOf(foundLayouts[0]);
        const typeIdx2 = names.indexOf(foundLayouts[1]);
        const startingCode = knownStart[0][typeIdx1] + knownStart[1][typeIdx2];
        return { startingCode, determinedChoIsBottom: true };
      }
    }
  }
  return null;
}

function rotateLayoutCode180(code) {
  if (code.length !== 64) return code;
  const coords = [];
  for (let i = 0; i < 32; i++) {
    const px = parseInt(code[2 * i], 10);
    const py = parseInt(code[2 * i + 1], 10);
    if (px === 0 && py === 0) {
      coords.push({ x: 0, y: 0 });
    } else {
      coords.push({ x: 10 - px, y: flipYCoordinate(py) });
    }
  }
  // Swap 0-15 and 16-31
  const rotated = [];
  for (let i = 0; i < 16; i++) {
    rotated[i] = coords[i + 16];
    rotated[i + 16] = coords[i];
  }
  return rotated.map(c => `${c.x}${c.y}`).join("");
}

function importRecordFromText(text) {
  if (!text || !text.trim()) {
    alert("기보 데이터가 비어 있습니다.");
    return;
  }
  
  // 마크다운 강조 표시(*, **, ` 등) 제거하여 파싱 안정성 확보
  text = text.replace(/[\*_`]/g, "");
  
  gameEnded = false;
  
  // 0. 메타데이터 초기화 및 파싱
  gameMetadata = {
    choPlayer: "",
    hanPlayer: "",
    tournament: "",
    round: "",
    nickname: "",
    summary: ""
  };
  
  const rawLines = text.split("\n");
  for (let line of rawLines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;
    if (cleanLine.match(/^(\d+)\s*[\.:]/)) {
      break; // 첫 착수가 등장하면 헤더 파싱 중단
    }
    const parts = cleanLine.split(":");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join(":").trim();
      if (key === "초나라") gameMetadata.choPlayer = val;
      else if (key === "한나라") gameMetadata.hanPlayer = val;
      else if (key === "대회명") gameMetadata.tournament = val;
      else if (key === "대국정보") gameMetadata.round = val;
      else if (key === "기보별명") gameMetadata.nickname = val;
      else if (key === "총평") gameMetadata.summary = val;
    }
  }
  
  updateMetadataFormFromState();
  updateMetadataDisplay();
  
  // 1. 착수 로그 파싱 (헤더 감지에 앞서 먼저 파싱)
  const parsedMoves = [];
  let validLineIdx = 0;
  for (let line of rawLines) {
    const move = parseMoveLine(line, validLineIdx);
    if (move) {
      parsedMoves.push(move);
      validLineIdx++;
    }
  }
  
  // 2. 뒤집힌 기보 감지 및 복원 (한나라가 첫 수를 두는 경우)
  let shouldFlipImport = false;
  if (parsedMoves.length > 0 && parsedMoves[0].player === "한") {
    shouldFlipImport = true;
    
    parsedMoves.forEach(move => {
      // 플레이어 대칭 스왑
      move.player = (move.player === "초") ? "한" : "초";
      // 좌표 180도 스왑
      move.startX = 10 - move.startX;
      move.startY = flipYCoordinate(move.startY);
      move.endX = 10 - move.endX;
      move.endY = flipYCoordinate(move.endY);
      // 기물 이름 스왑 (졸 <-> 병)
      if (move.pieceName === "졸") {
        move.pieceName = "병";
      } else if (move.pieceName === "병") {
        move.pieceName = "졸";
      }
    });
  }

  // 3. 상차림 코드 및 진영(iAmCho) 파싱
  let startingCode = "";
  let determinedCho = true;
  
  const layoutTextMatch = parseLayoutText(text);
  if (layoutTextMatch) {
    startingCode = layoutTextMatch.startingCode;
    determinedCho = layoutTextMatch.determinedChoIsBottom;
  } else {
    const layoutMatch = text.match(/\b\d{64}\b/);
    if (layoutMatch) {
      startingCode = layoutMatch[0];
    } else {
      startingCode = getStartingCode();
    }
    determinedCho = determineIAmChoFromText(text);
  }
  
  // 만약 뒤집힌 기보라면 초기 상차림 및 진영도 180도 역회전 적용
  if (shouldFlipImport) {
    if (!layoutTextMatch) {
      startingCode = rotateLayoutCode180(startingCode);
    }
    determinedCho = true;
  }
  
  changeNation(determinedCho);
  
  if (parsedMoves.length === 0 && !layoutTextMatch && !text.match(/\b\d{64}\b/)) {
    alert("유효한 기보 데이터를 찾을 수 없습니다. 형식을 확인해 주세요.");
    return;
  }
  
  // 3. 보드 초기 상차림으로 재설정
  setting(startingCode);
  log.length = 0;
  
  // 4. 착수 시뮬레이션을 통해 log 배열 빌드 및 기물 메모리 위치 동기화
  for (let move of parsedMoves) {
    let pieceId = -1;
    for (let pIdx = 0; pIdx < 32; pIdx++) {
      if (pieces[pIdx].x === move.startX && pieces[pIdx].y === move.startY) {
        pieceId = pIdx;
        break;
      }
    }
    
    if (pieceId === -1) {
      console.warn(`기물을 찾을 수 없습니다: x=${move.startX}, y=${move.startY}`);
      continue;
    }
    
    let capturedId = 32;
    for (let pIdx = 0; pIdx < 32; pIdx++) {
      if (pieces[pIdx].x === move.endX && pieces[pIdx].y === move.endY) {
        capturedId = pIdx;
        break;
      }
    }
    
    log.push({ i: pieceId, x: move.endX, y: move.endY, t: capturedId, comment: move.comment || "" });
    
    pieces[pieceId].x = move.endX;
    pieces[pieceId].y = move.endY;
    if (capturedId < 32) {
      pieces[capturedId].x = 0;
      pieces[capturedId].y = 0;
    }
  }
  
  // 5. 그래픽 보드 업데이트
  svg.classList.add("no-transition");
  initPositions();
  updateScore();
  
  // 턴 카운터 업데이트
  const turnInput = document.getElementById("turn");
  if (turnInput) {
    turnInput.value = log.length;
  }
  
  // 네비게이션 버튼 처리
  document.getElementById("prev").disabled = (log.length === 0);
  document.getElementById("next").disabled = true;
  
  // 기물 선택 프레임 제거
  curSelect = 32;
  clearCandiBox();
  const selectBox = document.getElementById("select-box");
  if (selectBox) {
    selectBox.setAttribute("x", -1000);
    selectBox.setAttribute("y", -1000);
  }
  
  svg.offsetHeight; // reflow 강제
  svg.classList.remove("no-transition");
  
  // 기보 텍스트 영역 최신화
  updateRecordUI();
  
  // AI 플레이 대기 및 실행 트리거
  checkAndRunAI();
}

// AI 대국 모드 제어 함수
function changeAiMode(val) {
  aiMode = parseInt(val, 10);
  localStorage.setItem("aiMode", aiMode);
  saveCurrentConfigToSlot();
  checkAndRunAI();
}

function changeCursorLockMode(val) {
  cursorLockMode = (val === "true" || val === true);
  localStorage.setItem("cursorLockMode", cursorLockMode);
  saveCurrentConfigToSlot();
  initSettingsUI();
}

var aiThinking = false;

function checkAndRunAI() {
  if (aiMode === 0) return;
  if (aiThinking) return;
  
  const turn = document.getElementById("turn");
  if (!turn) return;
  const curTurn = parseInt(turn.value, 10);
  
  // 기보 리뷰 모드 등 과거를 돌려보는 중이면 AI 작동 차단
  if (curTurn < log.length) return;
  
  const isChoTurn = (curTurn % 2 === 0);
  const aiIsCho = (aiMode === 1);
  const aiIsHan = (aiMode === 2);
  
  if ((isChoTurn && aiIsCho) || (!isChoTurn && aiIsHan)) {
    aiThinking = true;
    
    // 약간의 딜레이를 주어 AI가 생각하는 척하는 자연스러운 연출 적용
    setTimeout(() => {
      try {
        const aiTeam = isChoTurn ? "cho" : "han";
        const bestMove = getBestAIMove(aiTeam);
        
        if (bestMove) {
          console.log(`[AI Move] Executing move: Piece ${bestMove.i} (${pieces[bestMove.i].e.id}) -> x=${bestMove.x}, y=${bestMove.y}`);
          move(bestMove.i, bestMove.x, bestMove.y);
        } else {
          console.warn("[AI Move] No legal moves found for AI.");
        }
      } catch (err) {
        console.error("[AI Error] Error during AI move calculation:", err);
      } finally {
        aiThinking = false;
      }
    }, 500);
  }
}

function isKingInCheck(team) {
  const kingIdx = ((team === "cho") === iAmCho) ? 0 : 16;
  const kingX = pieces[kingIdx].x;
  const kingY = pieces[kingIdx].y;
  
  if (kingX === 0 && kingY === 0) return false;
  
  const opponentTeam = (team === "cho") ? "han" : "cho";
  const opponentMoves = getLegalMoves(opponentTeam);
  
  for (let m of opponentMoves) {
    if (m.x === kingX && m.y === kingY) {
      return true;
    }
  }
  return false;
}

function getFilteredLegalMoves(team) {
  const allMoves = getLegalMoves(team);
  const validMoves = [];
  
  const savedState = pieces.map(p => ({ x: p.x, y: p.y }));
  
  for (let move of allMoves) {
    const originalPos = savedState[move.i];
    const targetPieceIdx = pieces.findIndex((p, idx) => idx !== move.i && p.x === move.x && p.y === move.y);
    
    pieces[move.i].x = move.x;
    pieces[move.i].y = move.y;
    let capturedPiece = null;
    if (targetPieceIdx !== -1) {
      capturedPiece = { idx: targetPieceIdx, x: pieces[targetPieceIdx].x, y: pieces[targetPieceIdx].y };
      pieces[targetPieceIdx].x = 0;
      pieces[targetPieceIdx].y = 0;
    }
    
    const inCheck = isKingInCheck(team);
    
    pieces[move.i].x = originalPos.x;
    pieces[move.i].y = originalPos.y;
    if (capturedPiece) {
      pieces[capturedPiece.idx].x = capturedPiece.x;
      pieces[capturedPiece.idx].y = capturedPiece.y;
    }
    
    if (!inCheck) {
      validMoves.push(move);
    }
  }
  
  return validMoves;
}

function checkGameStatus() {
  const turn = document.getElementById("turn");
  if (!turn) return;
  const curTurn = parseInt(turn.value, 10);
  
  const isChoTurn = (curTurn % 2 === 0);
  const currentTeam = isChoTurn ? "cho" : "han";
  
  const inCheck = isKingInCheck(currentTeam);
  const validMoves = getFilteredLegalMoves(currentTeam);
  
  if (validMoves.length === 0) {
    if (inCheck) {
      gameEnded = true;
      const winner = isChoTurn ? "한나라 (Red)" : "초나라 (Blue)";
      setTimeout(() => {
        alert(`외통수! ${winner}가 승리하였습니다!`);
      }, 100);
    }
  }
}

function getLegalMoves(team) {
  let moves = [];
  const originalCreateCandiBox = createCandiBox;
  
  // 임시 가로채기(Mocking) 리스너 주입
  createCandiBox = function(idx, tx, ty) {
    if (tx < 1 || tx > 9 || ty < 0 || ty > 9) return;
    moves.push({ i: idx, x: tx, y: ty });
  };
  
  const isCho = (team === "cho");
  const startIdx = (isCho === iAmCho) ? 0 : 16;
  const endIdx = (isCho === iAmCho) ? 15 : 31;
  
  for (let idx = startIdx; idx <= endIdx; idx++) {
    if (pieces[idx].x !== 0) {
      drawCandidates(idx);
    }
  }
  
  // 원래 함수 복구
  createCandiBox = originalCreateCandiBox;
  return moves;
}

function getBestAIMove(aiTeam) {
  const isChoAI = (aiTeam === "cho");
  const aiMoves = getFilteredLegalMoves(aiTeam);
  
  if (aiMoves.length === 0) return null;
  
  // 현재 보드 좌표 백업
  const savedState = pieces.map(p => ({ x: p.x, y: p.y }));
  
  let bestScore = isChoAI ? -Infinity : Infinity;
  let bestMoves = [];
  
  for (let aiMove of aiMoves) {
    // 1. AI 수 시뮬레이션
    const originalPos = savedState[aiMove.i];
    const targetPieceIdx = pieces.findIndex((p, idx) => idx !== aiMove.i && p.x === aiMove.x && p.y === aiMove.y);
    
    pieces[aiMove.i].x = aiMove.x;
    pieces[aiMove.i].y = aiMove.y;
    let capturedPiece = null;
    if (targetPieceIdx !== -1) {
      capturedPiece = { idx: targetPieceIdx, x: pieces[targetPieceIdx].x, y: pieces[targetPieceIdx].y };
      pieces[targetPieceIdx].x = 0;
      pieces[targetPieceIdx].y = 0;
    }
    
    // 2. 상대방의 최선 대응 수 예측 (Depth 2 Minimax)
    const opponentTeam = isChoAI ? "han" : "cho";
    const opponentReplies = getFilteredLegalMoves(opponentTeam);
    
    let worstReplyScore = isChoAI ? Infinity : -Infinity;
    
    if (opponentReplies.length === 0) {
      worstReplyScore = isChoAI ? 999999 : -999999;
    } else {
      for (let reply of opponentReplies) {
        // 상대방 수 시뮬레이션
        const replyOrigPos = { x: pieces[reply.i].x, y: pieces[reply.i].y };
        const replyTargetIdx = pieces.findIndex((p, idx) => idx !== reply.i && p.x === reply.x && p.y === reply.y);
        
        pieces[reply.i].x = reply.x;
        pieces[reply.i].y = reply.y;
        let replyCaptured = null;
        if (replyTargetIdx !== -1) {
          replyCaptured = { idx: replyTargetIdx, x: pieces[replyTargetIdx].x, y: pieces[replyTargetIdx].y };
          pieces[replyTargetIdx].x = 0;
          pieces[replyTargetIdx].y = 0;
        }
        
        // 보드 점수 평가
        const score = evaluateBoard();
        
        // 상대방 수 롤백
        pieces[reply.i].x = replyOrigPos.x;
        pieces[reply.i].y = replyOrigPos.y;
        if (replyCaptured) {
          pieces[replyCaptured.idx].x = replyCaptured.x;
          pieces[replyCaptured.idx].y = replyCaptured.y;
        }
        
        // 상대방(한/초)은 자신에게 가장 유리한 수(점수 최소화/최대화)를 선택함
        if (isChoAI) {
          if (score < worstReplyScore) {
            worstReplyScore = score;
          }
        } else {
          if (score > worstReplyScore) {
            worstReplyScore = score;
          }
        }
      }
    }
    
    // AI 수 롤백
    pieces[aiMove.i].x = originalPos.x;
    pieces[aiMove.i].y = originalPos.y;
    if (capturedPiece) {
      pieces[capturedPiece.idx].x = capturedPiece.x;
      pieces[capturedPiece.idx].y = capturedPiece.y;
    }
    
    // 약간의 랜덤성(Jitter)을 주어 대국 양상의 다양성 확보 (동점일 때 다른 선택을 하도록 유도)
    const scoreWithJitter = worstReplyScore + (Math.random() - 0.5) * 0.1;
    
    if (isChoAI) {
      if (scoreWithJitter > bestScore) {
        bestScore = scoreWithJitter;
        bestMoves = [aiMove];
      } else if (Math.abs(scoreWithJitter - bestScore) < 0.01) {
        bestMoves.push(aiMove);
      }
    } else {
      if (scoreWithJitter < bestScore) {
        bestScore = scoreWithJitter;
        bestMoves = [aiMove];
      } else if (Math.abs(scoreWithJitter - bestScore) < 0.01) {
        bestMoves.push(aiMove);
      }
    }
  }
  
  if (bestMoves.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * bestMoves.length);
  return bestMoves[randomIndex];
}

function evaluateBoard() {
  let score = 0;
  
  // 각 기물의 절댓값 가치 정의 (초 = 양수, 한 = 음수)
  const values = [
    100000, // 궁 (Cho 0)
    130,   // 차
    130,   // 차
    70,    // 포
    70,    // 포
    50,    // 마
    50,    // 마
    30,    // 상
    30,    // 상
    30,    // 사
    30,    // 사
    20,    // 졸
    20,    // 졸
    20,    // 졸
    20,    // 졸
    20,    // 졸
    
    -100000, // 궁 (Han 16)
    -130,   // 차
    -130,   // 차
    -70,    // 포
    -70,    // 포
    -50,    // 마
    -50,    // 마
    -30,    // 상
    -30,    // 상
    -30,    // 사
    -30,    // 사
    -20,    // 병
    -20,    // 병
    -20,    // 병
    -20,    // 병
    -20     // 병
  ];
  
  for (let idx = 0; idx < 32; idx++) {
    if (pieces[idx].x !== 0) {
      const isChoPiece = (idx < 16) === iAmCho;
      const val = Math.abs(values[idx]);
      score += isChoPiece ? val : -val;
      
      // 포지션 가치: X축은 중앙에 가까울수록 가치 증가 (최대 2점)
      const xDist = Math.abs(pieces[idx].x - 5);
      const xBonus = (4 - xDist) * 0.5 * (isChoPiece ? 1 : -1);
      
      // Y축은 상대편 진영 방향으로 진격할수록 가치 증가 (최대 3점, 졸/병/마/상 전진성 유도)
      const dist = (idx < 16) ? (10 - pieces[idx].y) : (pieces[idx].y - 1);
      const yBonus = dist * 0.3 * (isChoPiece ? 1 : -1);
      
      score += xBonus + yBonus;
    }
  }
  
  // 덤 (한나라 후수 1.5점 가중치 보정)
  score -= 1.5;
  
  return score;
}

// 게임 초기화 실행부
function initGame() {
  // 1. 데이터 및 기물 DOM 바인딩 선행 수행
  initData();
  
  // active slot 로드
  if (localStorage.getItem("janggi_active_slot") !== null) {
    activeSlot = parseInt(localStorage.getItem("janggi_active_slot"), 10);
  }
  updateSlotButtonsUI();
  
  // 슬롯으로부터 구성정보 로드 (DOM 조작 안심 수행)
  loadConfigFromSlot();

  // 로컬 스토리지 개별값 로드 대응
  if (localStorage.getItem("aiMode") !== null) {
    aiMode = parseInt(localStorage.getItem("aiMode"), 10);
  }
  if (localStorage.getItem("cursorLockMode") !== null) {
    cursorLockMode = (localStorage.getItem("cursorLockMode") === "true");
  }
  if (localStorage.getItem("shortcutKeys") !== null) {
    try {
      const parsedKeys = JSON.parse(localStorage.getItem("shortcutKeys"));
      shortcutKeys = migrateShortcutKeys(parsedKeys);
    } catch (e) {
      console.error("Failed parsing shortcutKeys from localStorage:", e);
    }
  }
  if (localStorage.getItem("shortcutModalBgColor") !== null) {
    shortcutModalBgColor = localStorage.getItem("shortcutModalBgColor");
  }
  if (localStorage.getItem("shortcutModalOpacity") !== null) {
    shortcutModalOpacity = parseFloat(localStorage.getItem("shortcutModalOpacity"));
  }
  if (localStorage.getItem("commentBoxBgColor") !== null) {
    commentBoxBgColor = localStorage.getItem("commentBoxBgColor");
  }
  if (localStorage.getItem("commentBoxOpacity") !== null) {
    commentBoxOpacity = parseFloat(localStorage.getItem("commentBoxOpacity"));
  }
  if (localStorage.getItem("commentDisplayDuration") !== null) {
    commentDisplayDuration = parseInt(localStorage.getItem("commentDisplayDuration"), 10);
  }
  applyShortcutModalTheme();
  applyCommentBoxTheme();
  
  const durationInput = document.getElementById("comment-duration-input");
  if (durationInput) durationInput.value = commentDisplayDuration;
  if (localStorage.getItem("autoplaySpeed") !== null) {
    autoplaySpeed = parseFloat(localStorage.getItem("autoplaySpeed"));
  }
  if (localStorage.getItem("autoplayUseAnim") !== null) {
    autoplayUseAnim = (localStorage.getItem("autoplayUseAnim") === "true");
  }

  initSettingsUI();
  
  // 초기 로딩 시 말들이 0,0에서 날아오는 트랜지션을 방지합니다.
  svg.classList.add("no-transition");
  initBoard();
  initPositions();
  svg.offsetHeight; // Force reflow
  svg.classList.remove("no-transition");
  
  // 설정값의 외관 테마 적용
  changeBoardColor(boardColorType);
  changeChoColor(choColorType);
  changeHanColor(hanColorType);
  changePieceShape(pieceShapeType);
  updateSettingsBoxStyle();
  updateSettingsTextColor();
  updateSettingsAccentColor();

  // 애니메이션 시간 초기값 설정
  if (svg) {
    svg.style.setProperty("--anim-duration", `${animDuration}s`);
  }

  const turnEl = document.getElementById("turn");
  if (turnEl) {
    turnEl.addEventListener("change", function() {
      let targetTurn = parseInt(this.value, 10);
      if (isNaN(targetTurn)) return;
      if (targetTurn < 0) targetTurn = 0;
      if (targetTurn > log.length) targetTurn = log.length;
      this.value = targetTurn;
      
      let startingCode = getStartingCode();
      setting(startingCode);
      
      for (let idx = 0; idx < targetTurn; idx++) {
        const m = log[idx];
        pieces[m.i].x = m.x;
        pieces[m.i].y = m.y;
        if (m.t < 32) {
          pieces[m.t].x = 0;
          pieces[m.t].y = 0;
        }
      }
      
      svg.classList.add("no-transition");
      initPositions();
      updateScore();
      
      document.getElementById("prev").disabled = (targetTurn === 0);
      document.getElementById("next").disabled = (targetTurn === log.length);
      
      curSelect = 32;
      clearCandiBox();
      const selectBox = document.getElementById("select-box");
      if (selectBox) {
        selectBox.setAttribute("x", -1000);
        selectBox.setAttribute("y", -1000);
      }
      
      svg.offsetHeight;
      svg.classList.remove("no-transition");
      
      const recordBox = document.getElementById("record-box");
      if (recordBox && recordBox.style.display === "flex") {
        updateRecordUI();
      }
      
      updateCommentBubble();
      checkAndRunAI();
    });
  }

  window.addEventListener("resize", () => {
    // 크기 조절 시 레이아웃 재배치가 애니메이션되는 것을 방지합니다.
    svg.classList.add("no-transition");
    initBoard();
    initPositions();
    svg.offsetHeight; // Force reflow
    svg.classList.remove("no-transition");
  });

  // 키보드 단축키 방향키 및 엔터 리스너 등록
  window.addEventListener("keydown", handleKeyDown, true);

  // 로드 직후 AI 작동 여부 검사
  checkAndRunAI();
  initScoreboardRotation();
  updateCommentBubble();
}

function matchShortcutKey(action, keyEvent) {
  const shortcut = shortcutKeys[action];
  if (!shortcut) return false;
  
  const matchCombo = (combo) => {
    if (!combo || !combo.key) return false;
    let keyMatch = keyEvent.key.toLowerCase() === combo.key.toLowerCase();
    if (!keyMatch && combo.key === "`" && keyEvent.code === "Backquote") {
      keyMatch = true;
    }
    const ctrlMatch = (keyEvent.ctrlKey || keyEvent.metaKey) === !!combo.ctrl;
    const altMatch = keyEvent.altKey === !!combo.alt;
    const shiftMatch = keyEvent.shiftKey === !!combo.shift;
    return keyMatch && ctrlMatch && altMatch && shiftMatch;
  };
  
  return matchCombo(shortcut.primary) || matchCombo(shortcut.secondary);
}

function handleKeyDown(e) {
  if (boardAnimating) return;
  
  const isEscape = (e.key === "Escape");
  const activeEl = document.activeElement;
  if (!isEscape && activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "SELECT")) {
    return;
  }

  if (isRecordingKey !== null) return; // 단축키 입력 녹화 중에는 전역 단축키 핸들러 작동 정지

  // 1. 새 게임 (게임이 끝났어도 새 게임은 가능해야 함)
  if (matchShortcutKey("newGame", e)) {
    e.preventDefault();
    e.stopPropagation();
    startNewGame();
    return;
  }

  // 2. 기보 불러오기
  if (matchShortcutKey("loadNotation", e)) {
    e.preventDefault();
    e.stopPropagation();
    loadRecordFromClipboard();
    return;
  }

  // 3. 기보 복사 및 저장
  if (matchShortcutKey("copyNotation", e)) {
    e.preventDefault();
    e.stopPropagation();
    saveRecordToLibrary(null);
    return;
  }

  // 4. 앞으로 이동 (복기용)
  if (matchShortcutKey("forwardStep", e)) {
    e.preventDefault();
    e.stopPropagation();
    next();
    return;
  }

  // 5. 뒤로 이동 (복기용)
  if (matchShortcutKey("backwardStep", e)) {
    e.preventDefault();
    e.stopPropagation();
    prev();
    return;
  }

  // 6. 맨 앞으로 이동 (복기용)
  if (matchShortcutKey("goToStart", e)) {
    e.preventDefault();
    e.stopPropagation();
    goToStart();
    return;
  }

  // 7. 맨 뒤로 이동 (복기용)
  if (matchShortcutKey("goToEnd", e)) {
    e.preventDefault();
    e.stopPropagation();
    goToEnd();
    return;
  }

  // 8. 자동 재생 토글 (복기용)
  if (matchShortcutKey("autoplayToggle", e)) {
    e.preventDefault();
    e.stopPropagation();
    toggleAutoplay();
    return;
  }

  // 8a. 단축키 지정 설정창 열기
  if (matchShortcutKey("openShortcutSettings", e)) {
    e.preventDefault();
    e.stopPropagation();
    openShortcutModal();
    return;
  }

  // 8b. 현재 수순 코멘트 편집창 열기
  if (matchShortcutKey("openCommentEdit", e)) {
    e.preventDefault();
    e.stopPropagation();
    openCommentModal();
    return;
  }

  // 8c. 상대 AI 모드 토글 (Z)
  if (matchShortcutKey("toggleOpponentAI", e)) {
    e.preventDefault();
    e.stopPropagation();
    toggleOpponentAI();
    return;
  }

  // 8d. AI 훈수 받기 (X)
  if (matchShortcutKey("requestAIHint", e)) {
    e.preventDefault();
    e.stopPropagation();
    requestAIHint();
    return;
  }

  // 8e. 판 좌우 반전 ([)
  if (matchShortcutKey("flipHorizontal", e)) {
    e.preventDefault();
    e.stopPropagation();
    flipBoardHorizontal();
    return;
  }

  // 8f. 판 상하 반전 (])
  if (matchShortcutKey("flipVertical", e)) {
    e.preventDefault();
    e.stopPropagation();
    flipBoardVertical();
    return;
  }

  // 8g. 좌표보기 토글 (/)
  if (matchShortcutKey("toggleCoordinates", e)) {
    e.preventDefault();
    e.stopPropagation();
    toggleCoordinates();
    return;
  }

  // 9. 커서락 모드 토글
  if (matchShortcutKey("cursorLockToggle", e)) {
    e.preventDefault();
    e.stopPropagation();
    cursorLockMode = !cursorLockMode;
    localStorage.setItem("cursorLockMode", cursorLockMode);
    
    // UI 업데이트
    const cursorLockSelect = document.getElementById("cursor-lock-select");
    if (cursorLockSelect) cursorLockSelect.value = cursorLockMode ? "true" : "false";
    
    showToast(cursorLockMode ? "커서락 모드 활성화" : "커서락 모드 비활성화");
    return;
  }

  // 10. ESC 취소 및 설정 창 열기 (단축키/코멘트 대화창 열려있으면 해당 모달을 저장하지 않고 닫음)
  if (matchShortcutKey("cancel", e)) {
    e.preventDefault();
    e.stopPropagation();
    
    // 1) 코멘트 편집창이 열려있다면 저장하지 않고 닫기
    const commentModal = document.getElementById("comment-modal");
    if (commentModal && commentModal.style.display === "flex") {
      closeCommentModal();
      return;
    }
    
    // 2) 단축키 설정 모달이 열려있다면 닫기
    const shortcutModal = document.getElementById("shortcut-modal");
    if (shortcutModal && shortcutModal.style.display === "flex") {
      closeShortcutModal();
      return;
    }

    // 3) 상차림 설정창이 열려있다면 닫기
    const settingBox = document.getElementById("setting-box");
    if (settingBox && settingBox.style.display === "flex") {
      disalbeSettingBox();
      return;
    }

    if (kbCursorActive) {
      if (curSelect < 32) {
        selected(curSelect); // 선택 해제
      } else {
        // 이미 선택 해제되어 있는 상태에서 ESC를 한번 더 누르면 상차림(설정) 열기
        kbCursorActive = false;
        updateKeyboardCursor();
        enalbeSettingBox();
      }
    } else {
      // 키보드 커서가 안 켜져 있을 때 ESC를 누르면 바로 상차림 열기
      enalbeSettingBox();
    }
    return;
  }

  // 이 아래 기물 조작(착수) 관련 입력은 게임 진행 중일 때만 반응
  if (gameEnded) return;

  // 방향키 처리 (지정된 up, down, left, right 키)
  const isUp = matchShortcutKey("up", e);
  const isDown = matchShortcutKey("down", e);
  const isLeft = matchShortcutKey("left", e);
  const isRight = matchShortcutKey("right", e);

  if (isUp || isDown || isLeft || isRight) {
    e.preventDefault();
    e.stopPropagation();
    
    if (cursorLockMode) {
      const turnEl = document.getElementById("turn");
      const curTurn = turnEl ? parseInt(turnEl.value, 10) : log.length;
      const isChoTurn = (curTurn % 2 === 0);
      const currentTeam = isChoTurn ? "cho" : "han";
      const allFilteredMoves = getFilteredLegalMoves(currentTeam);
      
      const isForward = (isRight || isDown);
      
      if (curSelect === 32) {
        // 커서락 모드 - 선택 기물 고르기
        const selectablePieceIds = Array.from(new Set(allFilteredMoves.map(m => m.i))).sort((a, b) => a - b);
        if (selectablePieceIds.length > 0) {
          let currIdx = selectablePieceIds.findIndex(id => pieces[id].x === kbCursorX && pieces[id].y === kbCursorY);
          
          if (!kbCursorActive) {
            kbCursorActive = true;
            // 최초 활성화 시에는 현재 턴 왕의 위치와 가장 가까운 기물이나 첫 기물 선택
            const kingIdx = (isChoTurn === iAmCho) ? 0 : 16;
            currIdx = selectablePieceIds.indexOf(kingIdx);
            if (currIdx === -1) currIdx = 0;
          } else {
            if (isForward) {
              currIdx = (currIdx + 1) % selectablePieceIds.length;
            } else {
              currIdx = (currIdx - 1 + selectablePieceIds.length) % selectablePieceIds.length;
            }
          }
          
          kbCursorX = pieces[selectablePieceIds[currIdx]].x;
          kbCursorY = pieces[selectablePieceIds[currIdx]].y;
        }
      } else {
        // 커서락 모드 - 기물이 이미 선택된 상태에서 가용한 후보 영역 중에서만 순환 이동
        const validMoves = allFilteredMoves.filter(m => m.i === curSelect);
        if (validMoves.length > 0) {
          let currIdx = validMoves.findIndex(m => m.x === kbCursorX && m.y === kbCursorY);
          
          if (!kbCursorActive) {
            kbCursorActive = true;
            currIdx = 0;
          } else {
            if (isForward) {
              currIdx = (currIdx + 1) % validMoves.length;
            } else {
              currIdx = (currIdx - 1 + validMoves.length) % validMoves.length;
            }
          }
          
          kbCursorX = validMoves[currIdx].x;
          kbCursorY = validMoves[currIdx].y;
        }
      }
    } else {
      // 일반 자유 이동 모드
      if (!kbCursorActive) {
        kbCursorActive = true;
        
        // 이미 선택된 기물이 있다면 해당 기물 좌표에서 시작, 아니면 현재 턴 왕의 위치에서 시작
        if (curSelect < 32 && pieces[curSelect].x !== 0) {
          kbCursorX = pieces[curSelect].x;
          kbCursorY = pieces[curSelect].y;
        } else {
          const turnEl = document.getElementById("turn");
          const curTurn = turnEl ? parseInt(turnEl.value, 10) : log.length;
          const isChoTurn = (curTurn % 2 === 0);
          const kingIdx = (isChoTurn === iAmCho) ? 0 : 16;
          kbCursorX = pieces[kingIdx].x;
          kbCursorY = pieces[kingIdx].y;
        }
      }
      
      // 키보드 모드 활성화 여부와 상관없이 항상 이동 명령을 즉각 실행
      if (isUp) {
        let ny = yPrev(kbCursorY);
        if (ny !== -1) kbCursorY = ny;
      } else if (isDown) {
        let ny = yNext(kbCursorY);
        if (ny !== -1) kbCursorY = ny;
      } else if (isLeft) {
        if (kbCursorX > 1) kbCursorX -= 1;
      } else if (isRight) {
        if (kbCursorX < 9) kbCursorX += 1;
      }
    }
    
    updateKeyboardCursor();
    return;
  }

  // 엔터 또는 스페이스바로 선택 및 착수 실행
  if (matchShortcutKey("select", e)) {
    if (!kbCursorActive) return;
    e.preventDefault();

    const turnEl = document.getElementById("turn");
    const curTurn = turnEl ? parseInt(turnEl.value, 10) : log.length;
    const isChoTurn = (curTurn % 2 === 0);
    const currentTeam = isChoTurn ? "cho" : "han";

    if (curSelect === 32) {
      // 기물 선택 시도
      let pIdx = whoIsit(kbCursorX, kbCursorY);
      if (pIdx < 32) {
        // 내 기물일 때만 선택 허용
        const isChoPiece = (pIdx < 16) === iAmCho;
        if (isChoTurn === isChoPiece) {
          selected(pIdx);
        }
      }
    } else {
      // 기물이 이미 선택되어 있는 경우
      const validMoves = getFilteredLegalMoves(currentTeam);
      const matchedMove = validMoves.find(m => m.i === curSelect && m.x === kbCursorX && m.y === kbCursorY);
      
      if (matchedMove) {
        // 이동 실행!
        move(curSelect, kbCursorX, kbCursorY);
      } else {
        // 후보 이동지가 아닌 경우, 해당 좌표에 내 다른 기물이 있으면 해당 기물로 선택 변경
        let pIdx = whoIsit(kbCursorX, kbCursorY);
        const isChoPiece = (pIdx < 16) === iAmCho;
        if (pIdx < 32 && (isChoTurn === isChoPiece)) {
          selected(pIdx);
        } else {
          // 허공이나 상대 기물 클릭 시 선택 취소
          selected(curSelect);
        }
      }
    }
    updateKeyboardCursor();
  }
}

// ----------------------------------------------------
// 단축키 커스텀 설정 모달 구현부
// ----------------------------------------------------
var isRecordingKey = null; // 현재 바인딩 기록 대기 중인 기능 키 (예: { action, type })

const shortcutActionNames = {
  newGame: "새 대국 시작하기",
  autoplayToggle: "자동 재생 토글",
  openShortcutSettings: "단축키 지정 설정창 열기",
  openCommentEdit: "현재 수순 코멘트 편집창 열기",
  toggleOpponentAI: "상대 AI 모드 켜기/끄기",
  requestAIHint: "AI 훈수 한 수 받기",
  flipHorizontal: "판 좌우 반전",
  flipVertical: "판 상하 반전",
  up: "위로 이동",
  down: "아래로 이동",
  left: "왼쪽 이동",
  right: "오른쪽 이동",
  select: "선택 및 착수",
  cursorLockToggle: "커서락 모드 토글",
  cancel: "선택 취소",
  copyNotation: "기보 클립보드 복사",
  loadNotation: "기보 클립보드 불러오기",
  forwardStep: "앞으로 이동",
  backwardStep: "뒤로 이동",
  goToStart: "맨 앞으로 이동",
  goToEnd: "맨 뒤로 이동"
};

function migrateShortcutKeys(parsedKeys) {
  if (!parsedKeys) return shortcutKeys;
  const migrated = {};
  
  const parseSingle = (v) => {
    if (!v) return null;
    if (typeof v === "string") {
      let ctrl = false;
      let alt = false;
      let shift = false;
      let key = v;
      if (key.toLowerCase().startsWith("ctrl + ")) {
        ctrl = true;
        key = key.substring(7);
      } else if (key.toLowerCase().startsWith("alt + ")) {
        alt = true;
        key = key.substring(6);
      }
      return { key, ctrl, alt, shift };
    }
    if (typeof v === "object") {
      return {
        key: v.key || "",
        ctrl: !!v.ctrl,
        alt: !!v.alt,
        shift: !!v.shift
      };
    }
    return null;
  };

  Object.keys(shortcutKeys).forEach(key => {
    const legacyVal = parsedKeys[key];
    const defaultVal = shortcutKeys[key];
    
    if (legacyVal) {
      if (typeof legacyVal === "string") {
        migrated[key] = {
          primary: parseSingle(legacyVal),
          secondary: null
        };
      } else if (typeof legacyVal === "object") {
        if (legacyVal.primary !== undefined || legacyVal.secondary !== undefined) {
          migrated[key] = {
            primary: parseSingle(legacyVal.primary),
            secondary: parseSingle(legacyVal.secondary)
          };
        } else if (legacyVal.key !== undefined) {
          migrated[key] = {
            primary: parseSingle(legacyVal),
            secondary: null
          };
        }
      }
    }
    
    if (!migrated[key]) {
      migrated[key] = {
        primary: defaultVal ? defaultVal.primary : null,
        secondary: defaultVal ? defaultVal.secondary : null
      };
    }
  });
  

  // 강제 핫키 정정 마이그레이션 (구버전 스토리지 마이그레이션 보호)
  if (migrated.openShortcutSettings && migrated.openShortcutSettings.primary && migrated.openShortcutSettings.primary.key === "?") {
    migrated.openShortcutSettings.primary.shift = true;
  }
  if (migrated.autoplayToggle && migrated.autoplayToggle.primary && migrated.autoplayToggle.primary.key === "p") {
    migrated.autoplayToggle.primary.ctrl = false;
  }
  if (migrated.openCommentEdit && migrated.openCommentEdit.primary && migrated.openCommentEdit.primary.key === "`") {
    migrated.openCommentEdit.primary.ctrl = false;
    migrated.openCommentEdit.primary.alt = false;
    migrated.openCommentEdit.primary.shift = false;
  }

  return migrated;
}

function formatKeyCombination(combo) {
  if (!combo || !combo.key) return "미지정";
  const parts = [];
  if (combo.ctrl) parts.push("Ctrl");
  if (combo.alt) parts.push("Alt");
  if (combo.shift) parts.push("Shift");
  
  let k = combo.key;
  const kl = k.toLowerCase();
  if (kl === " ") k = "Space";
  else if (kl === "arrowup") k = "↑";
  else if (kl === "arrowdown") k = "↓";
  else if (kl === "arrowleft") k = "←";
  else if (kl === "arrowright") k = "→";
  else if (k.length === 1) k = k.toUpperCase();
  
  parts.push(k);
  return parts.join(" + ");
}

function changeModalBgColor(color) {
  shortcutModalBgColor = color;
  const picker = document.getElementById("modal-bg-picker");
  if (picker) picker.value = color;
  applyShortcutModalTheme();
  saveCurrentConfigToSlot();
}

function changeModalOpacity(opacity) {
  shortcutModalOpacity = parseFloat(opacity);
  const slider = document.getElementById("modal-opacity-slider");
  if (slider) slider.value = opacity;
  const valEl = document.getElementById("modal-opacity-val");
  if (valEl) valEl.textContent = shortcutModalOpacity.toFixed(2);
  applyShortcutModalTheme();
  saveCurrentConfigToSlot();
}

function hexToRgba(hex, alpha) {
  let hexStr = hex || "#0f172a";
  if (hexStr.length === 4) {
    hexStr = "#" + hexStr[1] + hexStr[1] + hexStr[2] + hexStr[2] + hexStr[3] + hexStr[3];
  }
  let r = parseInt(hexStr.slice(1, 3), 16);
  let g = parseInt(hexStr.slice(3, 5), 16);
  let b = parseInt(hexStr.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    r = 15; g = 23; b = 42;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyShortcutModalTheme() {
  const modalContent = document.querySelector("#shortcut-modal .modal-content");
  if (!modalContent) return;
  
  let hex = shortcutModalBgColor || "#0f172a";
  let opacity = shortcutModalOpacity !== undefined ? shortcutModalOpacity : 0.9;
  
  modalContent.style.background = hexToRgba(hex, opacity);
}

function openShortcutModal() {
  const modal = document.getElementById("shortcut-modal");
  if (!modal) return;
  
  const picker = document.getElementById("modal-bg-picker");
  if (picker) picker.value = shortcutModalBgColor;
  const slider = document.getElementById("modal-opacity-slider");
  if (slider) slider.value = shortcutModalOpacity;
  const valEl = document.getElementById("modal-opacity-val");
  if (valEl) valEl.textContent = shortcutModalOpacity.toFixed(2);
  
  applyShortcutModalTheme();
  populateShortcutTable();
  modal.style.display = "flex";
  modal.offsetHeight; // Force reflow
  modal.classList.add("open");
}

function closeShortcutModal() {
  const modal = document.getElementById("shortcut-modal");
  if (!modal) return;
  
  isRecordingKey = null;
  modal.classList.remove("open");
  setTimeout(() => {
    modal.style.display = "none";
  }, 300);
}

function handleModalOverlayClick(e) {
  if (e.target.id === "shortcut-modal") {
    closeShortcutModal();
  }
}

function populateShortcutTable() {
  const tbody = document.getElementById("shortcut-table-body");
  if (!tbody) return;
  
  tbody.innerHTML = "";
  
  Object.keys(shortcutKeys).forEach(actionKey => {
    if (actionKey === "selectAlt") return; // Deprecated
    
    const tr = document.createElement("tr");
    tr.className = "shortcut-row";
    
    const tdName = document.createElement("td");
    tdName.textContent = shortcutActionNames[actionKey] || actionKey;
    tr.appendChild(tdName);
    
    // Primary key
    const tdPrimary = document.createElement("td");
    const btnPrimary = document.createElement("button");
    btnPrimary.className = "shortcut-key-btn";
    
    let displayPrimary = formatKeyCombination(shortcutKeys[actionKey].primary);
    
    if (isRecordingKey && isRecordingKey.action === actionKey && isRecordingKey.type === "primary") {
      btnPrimary.textContent = "입력 대기...";
      btnPrimary.classList.add("recording");
    } else {
      btnPrimary.textContent = displayPrimary;
    }
    
    btnPrimary.onclick = (e) => {
      e.stopPropagation();
      startRecordingKey(actionKey, "primary");
    };
    tdPrimary.appendChild(btnPrimary);
    tr.appendChild(tdPrimary);
    
    // Secondary key
    const tdSecondary = document.createElement("td");
    const btnSecondary = document.createElement("button");
    btnSecondary.className = "shortcut-key-btn";
    
    let displaySecondary = formatKeyCombination(shortcutKeys[actionKey].secondary);
    
    if (isRecordingKey && isRecordingKey.action === actionKey && isRecordingKey.type === "secondary") {
      btnSecondary.textContent = "입력 대기...";
      btnSecondary.classList.add("recording");
    } else {
      btnSecondary.textContent = displaySecondary;
    }
    
    btnSecondary.onclick = (e) => {
      e.stopPropagation();
      startRecordingKey(actionKey, "secondary");
    };
    tdSecondary.appendChild(btnSecondary);
    tr.appendChild(tdSecondary);
    
    tbody.appendChild(tr);
  });
}

function startRecordingKey(actionKey, type) {
  isRecordingKey = { action: actionKey, type: type };
  populateShortcutTable();
  
  const handleKeyRecord = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const keyName = e.key;
    
    if (["control", "shift", "alt", "meta"].includes(keyName.toLowerCase())) {
      return;
    }
    
    if ((keyName === "Escape" || keyName === "Backspace") && isRecordingKey.action !== "cancel") {
      shortcutKeys[isRecordingKey.action][isRecordingKey.type] = null;
      isRecordingKey = null;
      saveCurrentConfigToSlot();
      populateShortcutTable();
      window.removeEventListener("keydown", handleKeyRecord, true);
      showToast("단축키가 해제되었습니다.");
      return;
    }
    
    const combo = {
      key: keyName,
      ctrl: e.ctrlKey || e.metaKey,
      alt: e.altKey,
      shift: e.shiftKey
    };
    
    let duplicated = false;
    Object.keys(shortcutKeys).forEach(aKey => {
      const keysObj = shortcutKeys[aKey];
      const matchCombo = (c) => {
        if (!c || !c.key) return false;
        return c.key.toLowerCase() === combo.key.toLowerCase() &&
               !!c.ctrl === !!combo.ctrl &&
               !!c.alt === !!combo.alt &&
               !!c.shift === !!combo.shift;
      };
      if (keysObj && (matchCombo(keysObj.primary) || matchCombo(keysObj.secondary))) {
        if (aKey === isRecordingKey.action) return;
        duplicated = true;
      }
    });
    
    if (duplicated) {
      showToast("이미 다른 기능에 지정된 키 조합입니다!");
      isRecordingKey = null;
      populateShortcutTable();
      window.removeEventListener("keydown", handleKeyRecord, true);
      return;
    }
    
    shortcutKeys[isRecordingKey.action][isRecordingKey.type] = combo;
    isRecordingKey = null;
    saveCurrentConfigToSlot();
    window.removeEventListener("keydown", handleKeyRecord, true);
    populateShortcutTable();
    showToast(`단축키가 '${formatKeyCombination(combo)}'(으)로 지정되었습니다.`);
  };
  
  window.addEventListener("keydown", handleKeyRecord, true);
}

function resetDefaultShortcuts() {
  shortcutKeys = {
    newGame: {
      primary: { key: "n", ctrl: false, alt: false, shift: false },
      secondary: { key: "F2", ctrl: false, alt: false, shift: false }
    },
    autoplayToggle: {
      primary: { key: "p", ctrl: false, alt: false, shift: false },
      secondary: { key: "p", ctrl: false, alt: true, shift: false }
    },
    openShortcutSettings: {
      primary: { key: "?", ctrl: false, alt: false, shift: true },
      secondary: null
    },
    openCommentEdit: {
      primary: { key: "`", ctrl: false, alt: false, shift: false },
      secondary: null
    },
    toggleOpponentAI: {
      primary: { key: "z", ctrl: false, alt: false, shift: false },
      secondary: null
    },
    requestAIHint: {
      primary: { key: "x", ctrl: false, alt: false, shift: false },
      secondary: null
    },
    flipHorizontal: {
      primary: { key: "[", ctrl: false, alt: false, shift: false },
      secondary: null
    },
    flipVertical: {
      primary: { key: "]", ctrl: false, alt: false, shift: false },
      secondary: null
    },
    toggleCoordinates: {
      primary: { key: "/", ctrl: false, alt: false, shift: false },
      secondary: null
    },
    up: {
      primary: { key: "ArrowUp", ctrl: false, alt: false, shift: false },
      secondary: { key: "w", ctrl: false, alt: false, shift: false }
    },
    down: {
      primary: { key: "ArrowDown", ctrl: false, alt: false, shift: false },
      secondary: { key: "s", ctrl: false, alt: false, shift: false }
    },
    left: {
      primary: { key: "ArrowLeft", ctrl: false, alt: false, shift: false },
      secondary: { key: "a", ctrl: false, alt: false, shift: false }
    },
    right: {
      primary: { key: "ArrowRight", ctrl: false, alt: false, shift: false },
      secondary: { key: "d", ctrl: false, alt: false, shift: false }
    },
    select: {
      primary: { key: "Enter", ctrl: false, alt: false, shift: false },
      secondary: { key: " ", ctrl: false, alt: false, shift: false }
    },
    cursorLockToggle: {
      primary: { key: "CapsLock", ctrl: false, alt: false, shift: false },
      secondary: null
    },
    cancel: {
      primary: { key: "Escape", ctrl: false, alt: false, shift: false },
      secondary: null
    },
    copyNotation: {
      primary: { key: "s", ctrl: false, alt: true, shift: false },
      secondary: { key: "s", ctrl: true, alt: false, shift: false }
    },
    loadNotation: {
      primary: { key: "v", ctrl: false, alt: true, shift: false },
      secondary: { key: "v", ctrl: true, alt: false, shift: false }
    },
    forwardStep: {
      primary: { key: "ArrowRight", ctrl: false, alt: true, shift: false },
      secondary: null
    },
    backwardStep: {
      primary: { key: "ArrowLeft", ctrl: false, alt: true, shift: false },
      secondary: null
    },
    goToStart: {
      primary: { key: "ArrowLeft", ctrl: true, alt: false, shift: false },
      secondary: { key: "Home", ctrl: false, alt: false, shift: false }
    },
    goToEnd: {
      primary: { key: "ArrowRight", ctrl: true, alt: false, shift: false },
      secondary: { key: "End", ctrl: false, alt: false, shift: false }
    }
  };
  saveCurrentConfigToSlot();
  populateShortcutTable();
  showToast("단축키 기본값이 복원되었습니다.");
}

// === Milestone 1: Rotating Scoreboard & Metadata speech bubble helpers ===
var currentScoreSlideIndex = 0;
var scoreRotationInterval = null;
var scoreboardTimerInterval = null;
var choTimeSpent = 0;
var hanTimeSpent = 0;

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
  let startingLayoutCode = knownStart[0][newGameState[0]] + knownStart[1][newGameState[1]];
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

function flipBoardHorizontal() {
  const boardSvg = document.getElementById("janggi-svg");
  if (!boardSvg || boardAnimating) return;
  
  boardAnimating = true;
  
  // Save starting positions
  const startPositions = [];
  for (let i = 0; i < 32; i++) {
    startPositions[i] = { x: pieces[i].x, y: pieces[i].y };
  }
  const oldKbCursorX = kbCursorX;
  const oldKbCursorY = kbCursorY;
  
  // Phase 1: Board flips horizontally as one body.
  boardSvg.classList.add("flip-h-anim");
  
  setTimeout(() => {
    // Phase 2: Board finished flipping. Now we run the flip and translate the pieces.
    flipActive = true;
    
    executeFlipBoardHorizontal();
    
    // Set up start transforms with midpoint origin
    for (let i = 0; i < 32; i++) {
      if (pieces[i].x !== 0 && startPositions[i].x !== 0) {
        const startPos = startPositions[i];
        const endPos = { x: pieces[i].x, y: pieces[i].y };
        
        const axisA = getAxis(startPos.x, startPos.y);
        const axisB = getAxis(endPos.x, endPos.y);
        
        const ratio = (i === 0 || i === 16) ? sizeKing : ((i === 1 || i === 2 || i === 17 || i === 18 || i === 3 || i === 4 || i === 19 || i === 20 || i === 5 || i === 6 || i === 21 || i === 22 || i === 7 || i === 8 || i === 23 || i === 24) ? sizeMiddle : sizeSmall);
        const sizeVal = unitSize * ratio;
        
        const ax = axisA.x - sizeVal / 2;
        const ay = axisA.y - sizeVal / 2;
        
        const bx = axisB.x - sizeVal / 2;
        const by = axisB.y - sizeVal / 2;
        
        const dx = (ax - bx) / 2;
        const dy = (ay - by) / 2;
        
        pieces[i].e.style.transition = "none";
        pieces[i].e.style.transformOrigin = `calc(50% + ${dx}px) calc(50% + ${dy}px)`;
        pieces[i].e.style.transform = `translate(${bx}px, ${by}px) rotateY(-180deg)`;
        pieces[i].e.classList.add("smooth-move-anim");
      }
    }
    
    const cursor = document.getElementById("kb-cursor");
    if (cursor && kbCursorActive) {
      const sizeVal = unitSize * 0.85;
      const axisA = getAxis(oldKbCursorX, oldKbCursorY);
      const axisB = getAxis(kbCursorX, kbCursorY);
      
      const ax = axisA.x - sizeVal / 2;
      const ay = axisA.y - sizeVal / 2;
      
      const bx = axisB.x - sizeVal / 2;
      const by = axisB.y - sizeVal / 2;
      
      const dx = (ax - bx) / 2;
      const dy = (ay - by) / 2;
      
      cursor.style.transition = "none";
      cursor.style.transformOrigin = `calc(50% + ${dx}px) calc(50% + ${dy}px)`;
      cursor.style.transform = `translate(${bx}px, ${by}px) rotateY(-180deg)`;
      cursor.classList.add("smooth-move-anim");
    }
    
    // Force style recalculation to apply start state
    document.body.offsetHeight;
    
    // Trigger transition to target transforms
    for (let i = 0; i < 32; i++) {
      if (pieces[i].x !== 0 && startPositions[i].x !== 0) {
        const endPos = { x: pieces[i].x, y: pieces[i].y };
        const axisB = getAxis(endPos.x, endPos.y);
        const ratio = (i === 0 || i === 16) ? sizeKing : ((i === 1 || i === 2 || i === 17 || i === 18 || i === 3 || i === 4 || i === 19 || i === 20 || i === 5 || i === 6 || i === 21 || i === 22 || i === 7 || i === 8 || i === 23 || i === 24) ? sizeMiddle : sizeSmall);
        const sizeVal = unitSize * ratio;
        const bx = axisB.x - sizeVal / 2;
        const by = axisB.y - sizeVal / 2;
        
        pieces[i].e.style.transition = "";
        pieces[i].e.style.transform = `translate(${bx}px, ${by}px) rotateY(0deg)`;
      }
    }
    
    if (cursor && kbCursorActive) {
      const axisB = getAxis(kbCursorX, kbCursorY);
      const sizeVal = unitSize * 0.85;
      const bx = axisB.x - sizeVal / 2;
      const by = axisB.y - sizeVal / 2;
      
      cursor.style.transition = "";
      cursor.style.transform = `translate(${bx}px, ${by}px) rotateY(0deg)`;
    }
    
    setTimeout(() => {
      // Clean up Phase 2
      boardSvg.classList.remove("flip-h-anim");
      for (let i = 0; i < 32; i++) {
        pieces[i].e.style.transformOrigin = "";
        pieces[i].e.style.transform = "";
        pieces[i].e.classList.remove("smooth-move-anim");
      }
      if (cursor) {
        cursor.style.transformOrigin = "";
        cursor.style.transform = "";
        cursor.classList.remove("smooth-move-anim");
      }
      flipActive = false;
      
      initPositions();
      if (kbCursorActive) updateKeyboardCursor();
      
      boardAnimating = false;
    }, 500); // Phase 2 duration
    
  }, 500); // Phase 1 duration
}

function executeFlipBoardHorizontal() {
  // 1. Flip initPieces
  for (let i = 0; i < 32; i++) {
    if (initPieces[i].x !== 0) {
      initPieces[i].x = 10 - initPieces[i].x;
    }
  }
  // 2. Reset pieces to initPieces
  for (let i = 0; i < 32; i++) {
    pieces[i].x = initPieces[i].x;
    pieces[i].y = initPieces[i].y;
  }
  // 3. Flip log entries
  log.forEach(entry => {
    entry.x = 10 - entry.x;
  });
  // 4. Flip cursor position
  kbCursorX = 10 - kbCursorX;
  
  // 5. Clear select and candidates
  curSelect = 32;
  clearCandiBox();
  
  // 6. Redraw
  initPositions();
  
  // 7. Update URL search params to match new state
  const url = new URL(window.location.href);
  const pCodeArr = new Array(32);
  for (let i = 0; i < 32; i++) {
    pCodeArr[i] = `${initPieces[i].x}${initPieces[i].y}`;
  }
  url.searchParams.set("p", pCodeArr.join(""));
  
  const logStrArr = log.map(entry => {
    return `${entry.i}${n2Az(entry.x)}${n2Az(entry.y)}${entry.t !== 32 ? entry.t : ""}`;
  });
  if (logStrArr.length > 0) {
    url.searchParams.set("log", logStrArr.join(","));
  }
  window.history.replaceState({}, "", url.toString());

  showToast("판 좌우 반전 및 기존 수순 변환 완료");
}

function flipYCoordinate(y) {
  // y 좌표 sequence: 1(top) -> 2 -> ... -> 9 -> 0(bottom)
  // rowIndex = (y + 9) % 10. rowIndex 범위는 0 (top) ~ 9 (bottom)
  const r = (y + 9) % 10;
  const flippedR = 9 - r;
  return (flippedR + 1) % 10;
}

function flipBoardVertical() {
  const boardSvg = document.getElementById("janggi-svg");
  if (!boardSvg || boardAnimating) return;
  
  boardAnimating = true;
  
  // Save starting positions
  const startPositions = [];
  for (let i = 0; i < 32; i++) {
    startPositions[i] = { x: pieces[i].x, y: pieces[i].y };
  }
  const oldKbCursorX = kbCursorX;
  const oldKbCursorY = kbCursorY;
  
  // Phase 1: Board spins 180 degrees as one body.
  boardSvg.classList.add("rotate-180-anim");
  
  setTimeout(() => {
    // Phase 2: Board finished spinning. Now we run the flip and translate the pieces.
    rotateActive = true;
    
    executeFlipBoardVertical();
    
    // Set up start transforms with midpoint origin
    // Since executeFlipBoardVertical swapped the DOM elements and coordinates of pieces[i] and pieces[i+16],
    // the startPosition of the element currently in pieces[i].e was stored at oldIndex = (i+16)%32.
    for (let i = 0; i < 32; i++) {
      const oldIndex = (i + 16) % 32;
      if (pieces[i].x !== 0 && startPositions[oldIndex].x !== 0) {
        const startPos = startPositions[oldIndex];
        const endPos = { x: pieces[i].x, y: pieces[i].y };
        
        const axisA = getAxis(startPos.x, startPos.y);
        const axisB = getAxis(endPos.x, endPos.y);
        
        const ratio = (i === 0 || i === 16) ? sizeKing : ((i === 1 || i === 2 || i === 17 || i === 18 || i === 3 || i === 4 || i === 19 || i === 20 || i === 5 || i === 6 || i === 21 || i === 22 || i === 7 || i === 8 || i === 23 || i === 24) ? sizeMiddle : sizeSmall);
        const sizeVal = unitSize * ratio;
        
        const ax = axisA.x - sizeVal / 2;
        const ay = axisA.y - sizeVal / 2;
        
        const bx = axisB.x - sizeVal / 2;
        const by = axisB.y - sizeVal / 2;
        
        const dx = (ax - bx) / 2;
        const dy = (ay - by) / 2;
        
        pieces[i].e.style.transition = "none";
        pieces[i].e.style.transformOrigin = `calc(50% + ${dx}px) calc(50% + ${dy}px)`;
        pieces[i].e.style.transform = `translate(${bx}px, ${by}px) rotate(-180deg)`;
        pieces[i].e.classList.add("smooth-move-anim");
      }
    }
    
    const cursor = document.getElementById("kb-cursor");
    if (cursor && kbCursorActive) {
      const sizeVal = unitSize * 0.85;
      const axisA = getAxis(oldKbCursorX, oldKbCursorY);
      const axisB = getAxis(kbCursorX, kbCursorY);
      
      const ax = axisA.x - sizeVal / 2;
      const ay = axisA.y - sizeVal / 2;
      
      const bx = axisB.x - sizeVal / 2;
      const by = axisB.y - sizeVal / 2;
      
      const dx = (ax - bx) / 2;
      const dy = (ay - by) / 2;
      
      cursor.style.transition = "none";
      cursor.style.transformOrigin = `calc(50% + ${dx}px) calc(50% + ${dy}px)`;
      cursor.style.transform = `translate(${bx}px, ${by}px) rotate(-180deg)`;
      cursor.classList.add("smooth-move-anim");
    }
    
    // Force style recalculation to apply start state
    document.body.offsetHeight;
    
    // Trigger transition to target transforms
    for (let i = 0; i < 32; i++) {
      const oldIndex = (i + 16) % 32;
      if (pieces[i].x !== 0 && startPositions[oldIndex].x !== 0) {
        const endPos = { x: pieces[i].x, y: pieces[i].y };
        const axisB = getAxis(endPos.x, endPos.y);
        const ratio = (i === 0 || i === 16) ? sizeKing : ((i === 1 || i === 2 || i === 17 || i === 18 || i === 3 || i === 4 || i === 19 || i === 20 || i === 5 || i === 6 || i === 21 || i === 22 || i === 7 || i === 8 || i === 23 || i === 24) ? sizeMiddle : sizeSmall);
        const sizeVal = unitSize * ratio;
        const bx = axisB.x - sizeVal / 2;
        const by = axisB.y - sizeVal / 2;
        
        pieces[i].e.style.transition = "";
        pieces[i].e.style.transform = `translate(${bx}px, ${by}px) rotate(0deg)`;
      }
    }
    
    if (cursor && kbCursorActive) {
      const axisB = getAxis(kbCursorX, kbCursorY);
      const sizeVal = unitSize * 0.85;
      const bx = axisB.x - sizeVal / 2;
      const by = axisB.y - sizeVal / 2;
      
      cursor.style.transition = "";
      cursor.style.transform = `translate(${bx}px, ${by}px) rotate(0deg)`;
    }
    
    setTimeout(() => {
      // Clean up Phase 2
      boardSvg.classList.remove("rotate-180-anim");
      for (let i = 0; i < 32; i++) {
        pieces[i].e.style.transformOrigin = "";
        pieces[i].e.style.transform = "";
        pieces[i].e.classList.remove("smooth-move-anim");
      }
      if (cursor) {
        cursor.style.transformOrigin = "";
        cursor.style.transform = "";
        cursor.classList.remove("smooth-move-anim");
      }
      rotateActive = false;
      
      initPositions();
      if (kbCursorActive) updateKeyboardCursor();
      
      boardAnimating = false;
    }, 500); // Phase 2 duration
    
  }, 500); // Phase 1 duration
}

function executeFlipBoardVertical() {
  // 1. Flip and swap initPieces Y coordinates and X coordinates (0-15 <-> 16-31)
  for (let i = 0; i < 16; i++) {
    const p1 = initPieces[i];
    const p2 = initPieces[i + 16];
    
    const y1Flipped = (p1.x !== 0 || p1.y !== 0) ? flipYCoordinate(p1.y) : p1.y;
    const y2Flipped = (p2.x !== 0 || p2.y !== 0) ? flipYCoordinate(p2.y) : p2.y;
    
    const tempX = p1.x;
    const tempY = y1Flipped;
    
    p1.x = p2.x;
    p1.y = y2Flipped;
    
    p2.x = tempX;
    p2.y = tempY;
  }
  // 2. Reset pieces to initPieces
  for (let i = 0; i < 32; i++) {
    pieces[i].x = initPieces[i].x;
    pieces[i].y = initPieces[i].y;
  }
  // 3. Flip and swap log entries
  log.forEach(entry => {
    entry.y = flipYCoordinate(entry.y);
    entry.i = (entry.i + 16) % 32;
    if (entry.t !== 32) {
      entry.t = (entry.t + 16) % 32;
    }
  });
  // 4. Flip cursor position
  kbCursorY = flipYCoordinate(kbCursorY);
  
  // 5. Clear select and candidates
  curSelect = 32;
  clearCandiBox();
  
  // 6. Toggle iAmCho (the human plays the other team now, bottom side)
  iAmCho = !iAmCho;
  changeNation(iAmCho);
  
  // 7. AI takes the top side
  if (aiMode !== 0) {
    aiMode = iAmCho ? 2 : 1;
    localStorage.setItem("aiMode", aiMode);
    const aiModeSelect = document.getElementById("ai-mode-select");
    if (aiModeSelect) aiModeSelect.value = aiMode;
  }
  
  // 8. Now apply the horizontal flip (automatically trigger [ horizontal flip effect)
  // Flip X coords of initPieces
  for (let i = 0; i < 32; i++) {
    if (initPieces[i].x !== 0) {
      initPieces[i].x = 10 - initPieces[i].x;
    }
  }
  // Reset pieces to initPieces again
  for (let i = 0; i < 32; i++) {
    pieces[i].x = initPieces[i].x;
    pieces[i].y = initPieces[i].y;
  }
  // Flip log entries X coords
  log.forEach(entry => {
    entry.x = 10 - entry.x;
  });
  // Flip cursor X
  kbCursorX = 10 - kbCursorX;

  // 9. Redraw
  initPositions();
  
  // 10. Update URL search params to match new state
  const url = new URL(window.location.href);
  const pCodeArr = new Array(32);
  for (let i = 0; i < 32; i++) {
    pCodeArr[i] = `${initPieces[i].x}${initPieces[i].y}`;
  }
  url.searchParams.set("p", pCodeArr.join(""));
  url.searchParams.set("cho", iAmCho ? "Y" : "N");
  
  const logStrArr = log.map(entry => {
    return `${entry.i}${n2Az(entry.x)}${n2Az(entry.y)}${entry.t !== 32 ? entry.t : ""}`;
  });
  if (logStrArr.length > 0) {
    url.searchParams.set("log", logStrArr.join(","));
  }
  window.history.replaceState({}, "", url.toString());

  showToast("판 180도 회전 및 기존 수순 변환 완료 (AI 위쪽 자동 할당)");

  // 11. Run AI if it's now the AI's turn
  checkAndRunAI();
}

function toggleOpponentAI() {
  if (aiMode !== 0) {
    aiMode = 0;
    showToast("상대 AI 모드 꺼짐");
  } else {
    // AI plays the top side: Han if iAmCho is true, Cho if iAmCho is false
    aiMode = iAmCho ? 2 : 1;
    showToast(`상대 AI 모드 켜짐 (${aiMode === 1 ? "초나라" : "한나라"} AI가 위쪽에서 플레이)`);
  }
  localStorage.setItem("aiMode", aiMode);
  saveCurrentConfigToSlot();
  
  const aiModeSelect = document.getElementById("ai-mode-select");
  if (aiModeSelect) aiModeSelect.value = aiMode;
  
  checkAndRunAI();
}

function requestAIHint() {
  const turnEl = document.getElementById("turn");
  if (!turnEl) return;
  const curTurn = parseInt(turnEl.value, 10);
  const isChoTurn = (curTurn % 2 === 0);
  const isMyTurn = (isChoTurn === iAmCho);
  
  if (!isMyTurn) {
    showToast("내 턴이 아닙니다. (훈수는 내 턴에만 가능)");
    return;
  }
  
  const myTeam = iAmCho ? "cho" : "han";
  const bestMove = getBestAIMove(myTeam);
  if (bestMove) {
    showToast("AI 훈수 착수!");
    move(bestMove.i, bestMove.x, bestMove.y);
  } else {
    showToast("추천할 수 있는 합법적인 수가 없습니다.");
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
window.rotateScorePanel = rotateScorePanel;
window.setScoreSlide = setScoreSlide;
window.updateMetadataFromForm = updateMetadataFromForm;
window.updateCurrentStepComment = updateCurrentStepComment;
window.updateCommentBubble = updateCommentBubble;
window.updateScoreboardSettings = updateScoreboardSettings;
window.toggleMetadataCategory = toggleMetadataCategory;
window.toggleSettingCategory = toggleSettingCategory;
window.toggleAutoplay = toggleAutoplay;
window.goToStart = goToStart;
window.goToEnd = goToEnd;
window.changeAutoplaySpeed = changeAutoplaySpeed;
window.changeAutoplayUseAnim = changeAutoplayUseAnim;
window.changeModalBgColor = changeModalBgColor;
window.changeModalOpacity = changeModalOpacity;
window.applyShortcutModalTheme = applyShortcutModalTheme;
window.openShortcutModal = openShortcutModal;
window.closeShortcutModal = closeShortcutModal;
window.handleModalOverlayClick = handleModalOverlayClick;
window.resetDefaultShortcuts = resetDefaultShortcuts;
window.openCommentModal = openCommentModal;
window.closeCommentModal = closeCommentModal;
window.saveCommentModal = saveCommentModal;
window.handleCommentModalOverlayClick = handleCommentModalOverlayClick;
window.changeCommentBgColor = changeCommentBgColor;
window.changeCommentOpacity = changeCommentOpacity;
window.applyCommentBoxTheme = applyCommentBoxTheme;
window.flipBoardHorizontal = flipBoardHorizontal;
window.flipBoardVertical = flipBoardVertical;
window.toggleOpponentAI = toggleOpponentAI;
window.requestAIHint = requestAIHint;
window.changeCommentDuration = changeCommentDuration;
window.hideCommentBubble = hideCommentBubble;

initGame();
