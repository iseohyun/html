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

    // 시작 버튼을 수정합니다.
    let charim_group = document.getElementsByClassName("charim0");
    Array.from(charim_group).forEach(element => {
      element.style.backgroundColor = "#EFEFEF"
    });
    charim_group[newGameState[0]].style.backgroundColor = "#CCC";

    charim_group = document.getElementsByClassName("charim1");
    Array.from(charim_group).forEach(element => {
      element.style.backgroundColor = "#EFEFEF"
    });
    charim_group[newGameState[1]].style.backgroundColor = "#CCC";

    setting(param_P);
  }

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
    pieces[t].e.setAttribute("x", -unitSize);
    pieces[t].e.setAttribute("y", -unitSize);
    pieces[t].x = 0;
    pieces[t].y = 0;

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
  setPieces(i, x, y);

  // 선택 상자 및 이동가능 경로 후보지 삭제
  clearCandiBox();
  
  let tmpAxis = getAxis(x, y);
  selectBox.setAttribute("x", tmpAxis.x - unitSize / 2);
  selectBox.setAttribute("y", tmpAxis.y - unitSize / 2);
}

function disalbeSettingBox() {
  const settingBox = document.getElementById("setting-box");
  settingBox.style.display = "none";
}

function enalbeSettingBox() {
  const settingBox = document.getElementById("setting-box");
  settingBox.style.display = "block";
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
    setPieces(log[curTurn].i, log[curTurn].x, log[curTurn].y);

    // 선택창은 현재 움직인 말을 보여주되, 선택이 되지 않은 상태로 만듭니다.
    curSelect = 32;
    moveSelectBox(log[curTurn].i);

    // 만약, 잡은 돌이 있다면 삭제합니다.
    if (log[curTurn].t != 32)
      setPieces(log[curTurn].t, 0, 0);

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
      setPieces(log[curTurn].t, log[curTurn].x, log[curTurn].y);
    }

    // 현재 턴에 움직인 객체가 어디서 왔는지 조회합니다.
    let originPos = whereWasIt(log[curTurn].i, curTurn - 1);

    // 조회된 정보를 기반으로 돌을 과거로 되돌립니다.
    setPieces(log[curTurn].i, originPos.x, originPos.y);

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
  let btnGroup = document.getElementsByClassName("charim" + group);
  for (let i = 0; i < btnGroup.length; i++) {
    btnGroup[i].style.backgroundColor = "#EFEFEF";
  }
  element.style.backgroundColor = "#CCC";
  newGameState[group] = type;
}

function newStart() {
  location.href = "index.html";
}

function reload() {
  let param_P = knownStart[0][newGameState[0]] + knownStart[1][newGameState[1]];
  param_P = `?p=${param_P}`;

  let param_log = "&log=";
  log.forEach(e => {
    param_log += e.i + n2Az(e.x) + n2Az(e.y) + ((e.t != 32) ? e.t : "") + ",";
  });
  let param_cho = "&cho=" + ((iAmCho) ? "Y" : "N");

  let param_turn = "&t=" + parseInt(document.getElementById("turn").value);

  location.href = param_P + param_log + param_cho + param_turn;
}

function reload_now() {
  let param_P = "?p=";
  for (let i = 0; i < 32; i++) {
    param_P += pieces[i].x;
    param_P += ((pieces[i].y == 10) ? 0 : pieces[i].y);
  }
  location.href = param_P;
}

function changeNation(amIcho) {
  iAmCho = amIcho;
  const topEl = document.getElementById("nation-top");
  const bottomEl = document.getElementById("nation-bottom");
  if (amIcho) {
    bottomEl.style["background-color"] = "#AAF";
    bottomEl.innerHTML = "초";
    topEl.style["background-color"] = "#FAA";
    topEl.innerHTML = "한";
  } else {
    topEl.style["background-color"] = "#AAF";
    topEl.innerHTML = "초";
    bottomEl.style["background-color"] = "#FAA";
    bottomEl.innerHTML = "한";
  }
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
  const btn = document.getElementById("toggle-coords-btn");
  if (btn) {
    btn.textContent = showCoordinates ? "좌표 보기 닫기" : "좌표 보기";
  }
  // 좌표 상태에 따라 패딩을 재계산하고 보드를 다시 그립니다.
  initBoard();
  initPositions();
}

// 안전한 초기 호출부 (스크립트 로드 순서 비동기 대응)
function checkAndInit() {
  if (typeof pieces !== "undefined" && 
      typeof initBoard === "function" && 
      typeof initPositions === "function") {
    initData();
    initBoard();
    initPositions();

    window.addEventListener("resize", () => {
      initBoard();
      initPositions();
    });
  } else {
    setTimeout(checkAndInit, 10);
  }
}

checkAndInit();
