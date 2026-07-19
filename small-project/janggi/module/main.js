// main.js - Entry point, Event listeners, and UI controller functions

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
    setting("5211912383217131814161143454749459109028882070308040601737577797");
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

  // 나의 이동가능 경로를 그립니다.
  drawCandidates(i);
}

// 움직임 처리
function move(i, x, y) {
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
}

function prev() {
  // 보조 마커를 지웁니다.
  clearCandiBox();

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
}

function changeCharim(group, type, element) {
  newGameState[group] = type;
  syncCharimButtonStyles();
  saveCurrentConfigToSlot();
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
  
  updateCharimPreview();
  saveCurrentConfigToSlot();
}

function toggleNation() {
  changeNation(!iAmCho);
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
  // 1. 착수 로그 비우기
  log.length = 0;
  
  // 2. 턴 수 0으로 초기화
  const turnEl = document.getElementById("turn");
  if (turnEl) turnEl.value = 0;
  
  // 3. 현재 설정한 상차림에 부합하는 배치 데이터 산출
  let param_P = knownStart[0][newGameState[0]] + knownStart[1][newGameState[1]];
  
  // 4. 기물 위치 데이터 복원
  setting(param_P);
  
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
}

function adjustPieceSize(type, delta) {
  if (type === "king") {
    sizeKing = Math.max(0.5, Math.min(2.0, sizeKing + delta));
    localStorage.setItem("sizeKing", sizeKing);
    const span = document.getElementById("val-size-king");
    if (span) span.textContent = sizeKing.toFixed(2);
  } else if (type === "middle") {
    sizeMiddle = Math.max(0.5, Math.min(2.0, sizeMiddle + delta));
    localStorage.setItem("sizeMiddle", sizeMiddle);
    const span = document.getElementById("val-size-middle");
    if (span) span.textContent = sizeMiddle.toFixed(2);
  } else if (type === "small") {
    sizeSmall = Math.max(0.5, Math.min(2.0, sizeSmall + delta));
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
    fontScaleKing = Math.max(0.5, Math.min(2.0, fontScaleKing + delta));
    localStorage.setItem("fontScaleKing", fontScaleKing);
    const span = document.getElementById("val-font-king");
    if (span) span.textContent = fontScaleKing.toFixed(2);
  } else if (type === "middle") {
    fontScaleMiddle = Math.max(0.5, Math.min(2.0, fontScaleMiddle + delta));
    localStorage.setItem("fontScaleMiddle", fontScaleMiddle);
    const span = document.getElementById("val-font-middle");
    if (span) span.textContent = fontScaleMiddle.toFixed(2);
  } else if (type === "small") {
    fontScaleSmall = Math.max(0.5, Math.min(2.0, fontScaleSmall + delta));
    localStorage.setItem("fontScaleSmall", fontScaleSmall);
    const span = document.getElementById("val-font-small");
    if (span) span.textContent = fontScaleSmall.toFixed(2);
  }
  
  updatePieceGraphics();
  saveCurrentConfigToSlot();
}

function adjustCoordsFontSize(delta) {
  coordsTextScale = Math.max(0.1, Math.min(0.5, coordsTextScale + delta));
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
      if (value.startsWith("#")) picker.value = value;
    }
    chosenColor = picker ? picker.value : "#1e3a8a";
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
      if (value.startsWith("#")) picker.value = value;
    }
    chosenColor = picker ? picker.value : "#991b1b";
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
      if (value.startsWith("#")) picker.value = value;
    }
    candiColorType = picker ? picker.value : "#3b82f6";
    localStorage.setItem("candiColorType", candiColorType);
  } else {
    if (picker) picker.style.display = "none";
    if (select) select.value = value;
    candiColorType = value;
    localStorage.setItem("candiColorType", candiColorType);
  }
  saveCurrentConfigToSlot();
}

function changeAnimDuration(val) {
  animDuration = parseFloat(val);
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
  animHeight = parseFloat(val);
  localStorage.setItem("animHeight", animHeight);
  const valSpan = document.getElementById("anim-height-val");
  if (valSpan) {
    valSpan.textContent = animHeight.toFixed(1);
  }
  saveCurrentConfigToSlot();
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
    animHeight
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
    if (config.showCoordinates !== undefined) showCoordinates = config.showCoordinates;
    if (config.sizeKing !== undefined) sizeKing = config.sizeKing;
    if (config.sizeMiddle !== undefined) sizeMiddle = config.sizeMiddle;
    if (config.sizeSmall !== undefined) sizeSmall = config.sizeSmall;
    if (config.fontScaleKing !== undefined) fontScaleKing = config.fontScaleKing;
    if (config.fontScaleMiddle !== undefined) fontScaleMiddle = config.fontScaleMiddle;
    if (config.fontScaleSmall !== undefined) fontScaleSmall = config.fontScaleSmall;
    if (config.coordsTextScale !== undefined) coordsTextScale = config.coordsTextScale;
    if (config.boardColorType !== undefined) boardColorType = config.boardColorType;
    if (config.choColorType !== undefined) choColorType = config.choColorType;
    if (config.hanColorType !== undefined) hanColorType = config.hanColorType;
    if (config.pieceShapeType !== undefined) pieceShapeType = config.pieceShapeType;
    if (config.candiShapeType !== undefined) candiShapeType = config.candiShapeType;
    if (config.candiColorType !== undefined) candiColorType = config.candiColorType;
    if (config.animDuration !== undefined) animDuration = config.animDuration;
    if (config.animHeight !== undefined) animHeight = config.animHeight;
    
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
    
    changeBoardColor(boardColorType);
    changeChoColor(choColorType);
    changeHanColor(hanColorType);
    changePieceShape(pieceShapeType);
    changeCandiShape(candiShapeType);
    changeCandiColor(candiColorType);
    changeAnimDuration(animDuration);
    changeAnimHeight(animHeight);
    
    initBoard();
    initPositions();
    initSettingsUI();
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
    animHeight
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
  showCoordinates = true;
  sizeKing = 1.10;
  sizeMiddle = 0.95;
  sizeSmall = 0.75;
  fontScaleKing = 1.00;
  fontScaleMiddle = 1.00;
  fontScaleSmall = 1.00;
  coordsTextScale = 0.22;
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
}

// 안전한 초기 호출부 (스크립트 로드 순서 비동기 대응)
function checkAndInit() {
  if (typeof pieces !== "undefined" && 
      typeof initBoard === "function" && 
      typeof initPositions === "function") {
    
    // active slot 로드
    if (localStorage.getItem("janggi_active_slot") !== null) {
      activeSlot = parseInt(localStorage.getItem("janggi_active_slot"), 10);
    }
    updateSlotButtonsUI();
    
    // 슬롯으로부터 구성정보 로드 (없다면 현재 상태 저장)
    loadConfigFromSlot();

    initData();
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

    // 애니메이션 시간 초기값 설정
    if (svg) {
      svg.style.setProperty("--anim-duration", `${animDuration}s`);
    }

    window.addEventListener("resize", () => {
      // 크기 조절 시 레이아웃 재배치가 애니메이션되는 것을 방지합니다.
      svg.classList.add("no-transition");
      initBoard();
      initPositions();
      svg.offsetHeight; // Force reflow
      svg.classList.remove("no-transition");
    });
  } else {
    setTimeout(checkAndInit, 10);
  }
}

checkAndInit();
