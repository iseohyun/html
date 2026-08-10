// main.js - Entry point, Event listeners, and UI controller functions
var commentBubbleTimeout = null;

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
  
  // Rebind onclick handlers to matching indices to prevent selection mismatch after changeNation()
  for (let i = 0; i < 32; i++) {
    if (pieces[i].e) {
      pieces[i].e.onclick = function () { selected(i) };
    }
  }
}

function getData() {
  const urlParams = new URLSearchParams(window.location.search);
  
  // 1. Parse param_cho first to set active nation
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

  // 2. Parse param_P and normalize it for matching starting layout types
  let param_P = urlParams.get('p');
  if (param_P == undefined) {
    // 나: 마상마상 - 너 : 마상마상 (Standard starting layout)
    setting("5910902888207030804060173757779752119123832171318141611434547494");
  } else {
    let normalizedP = normalizeLayoutCode(param_P, !iAmCho);
    let choIdx = 0;
    let hanIdx = 0;
    for (let i = 0; i < 4; i++) {
      if (normalizedP.includes(knownStart[0][i])) {
        choIdx = i;
      }
    }
    for (let i = 0; i < 4; i++) {
      if (normalizedP.includes(knownStart[1][i])) {
        hanIdx = i;
      }
    }
    if (iAmCho) {
      newGameState[0] = choIdx;
      newGameState[1] = hanIdx;
    } else {
      newGameState[0] = hanIdx;
      newGameState[1] = choIdx;
    }
    setting(param_P);
  }

  // 상차림 단추 색상 및 미니어처 예시 배치도 동기화
  syncCharimButtonStyles();

  // 3. Parse log parameter
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

  let param_turn = urlParams.get('t');
  if (param_turn != undefined) {
    param_turn = parseInt(param_turn, 10);
    if (!isNaN(param_turn)) {
      const turn = document.getElementById('turn');
      if (turn) turn.value = param_turn;
    }
  } else {
    const turn = document.getElementById('turn');
    if (turn) turn.value = log.length;
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
  } else {
    if (isChoPiece) return; // 한의 턴인데 초의 기물을 조작하려고 하는 경우 차단
  }

  // 만약 AI 모드가 켜져 있고, 현재 턴이 AI(위쪽)의 턴이면 사용자 조작 차단
  if (aiMode === 1) {
    const isUserTurn = (isChoTurn === iAmCho);
    if (!isUserTurn) return;
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
      const isUserTurnNow = (isChoTurn === iAmCho);
      
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
  let startingLayoutCode = getStartingLayoutCode();
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
  let startingLayoutCode = getStartingLayoutCode();
  
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
  checkAndRunAI();
}

// ----------------------------------------------------
// Save/Load Slots Logic
// ----------------------------------------------------
let activeSlot = 1;

// 게임 초기화 실행부
function initGame() {
  // 1. 데이터 및 기물 DOM 바인딩 선행 수행
  initData();
  
  // URL에서 대국 정보를 읽은 직후, 주소창의 대국 상태 파라미터(p, log, t, cho)만 비워 새로고침 시 무조건 새 게임이 시작되도록 함
  const url = new URL(window.location.href);
  if (url.searchParams.has("p") || url.searchParams.has("log") || url.searchParams.has("t") || url.searchParams.has("cho")) {
    url.searchParams.delete("p");
    url.searchParams.delete("log");
    url.searchParams.delete("t");
    url.searchParams.delete("cho");
    window.history.replaceState({}, "", url.toString());
  }
  
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
    if (aiMode === 2) aiMode = 1;
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
  if (localStorage.getItem("autoplaySpeed") !== null) {
    autoplaySpeed = parseFloat(localStorage.getItem("autoplaySpeed"));
  }
  if (localStorage.getItem("autoplayUseAnim") !== null) {
    autoplayUseAnim = (localStorage.getItem("autoplayUseAnim") === "true");
  }

  applyLoadedConfig();

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

}

initGame();
