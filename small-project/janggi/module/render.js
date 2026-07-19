// render.js - Board drawing and HTML display updates

function initBoard() {
  // 화면 크기를 가져옵니다. 장기판은 제어판(controlBox)의 넓이를 제외한 가장 큰 크기로 그려져야 합니다.
  const controlBox = document.getElementById("control-box");

  const tmpWidth = window.innerWidth - 2 * (boardMargin + boardPadding);
  const tmpHeight = window.innerHeight - controlBox.offsetHeight - 2 * (boardMargin + boardPadding);

  // 장기판의 최대 크기를 계산합니다.
  unitSize = (tmpWidth * 9) > (tmpHeight * 10) ? tmpHeight / 10 : tmpWidth / 9;

  boardWidth = unitSize * 9 + boardPadding * 2;
  boardHeight = unitSize * 10 + boardPadding * 2;

  // 장기판을 그립니다.
  drawBoard();

  // 말의 크기를 조절합니다.
  for (let i = 0; i < 32; i++) {
    pieces[i].e.setAttribute("width", unitSize * piecesSize);
    pieces[i].e.setAttribute("height", unitSize * piecesSize);

    // 클릭되었을 때 수행할 함수를 지정합니다.
    pieces[i].e.addEventListener("click", function () { selected(i) });
  }
}

function drawBoard() {
  // svg의 넓이를 다시 설정합니다.
  svg.style.height = boardHeight;
  svg.style.width = boardWidth;
  svg.style.margin = boardMargin;

  // 장기판의 크기를 설정합니다.
  board.style.width = `${boardWidth}px`;
  board.style.height = `${boardHeight}px`;

  // 장기판에 8 * 9 의 정사각형 그림을 그립니다.
  const lines = document.getElementById('lines');
  var lineSts = "";
  // 가로줄 10라인
  for (let i = 0; i < 10; i++) {
    let axis = getAxis(1, i + 1);
    lineSts += `M${axis.x} ${axis.y} h${Math.floor(unitSize * 8)} `;
  }
  // 세로줄 9라인
  for (let i = 0; i < 9; i++) {
    let axis = getAxis(i + 1, 10);
    lineSts += `M${axis.x} ${axis.y} v${Math.floor(unitSize * 9)} `;
  }
  // 내 궁성
  var tmpAxis = getAxis(4, 1);
  lineSts += `M${tmpAxis.x} ${tmpAxis.y}`;
  tmpAxis = getAxis(6, 3);
  lineSts += `L${tmpAxis.x} ${tmpAxis.y}`;

  tmpAxis = getAxis(6, 1);
  lineSts += `M${tmpAxis.x} ${tmpAxis.y}`;
  tmpAxis = getAxis(4, 3);
  lineSts += `L${tmpAxis.x} ${tmpAxis.y}`;

  // 상대 궁성
  tmpAxis = getAxis(4, 8);
  lineSts += `M${tmpAxis.x} ${tmpAxis.y}`;
  tmpAxis = getAxis(6, 10);
  lineSts += `L${tmpAxis.x} ${tmpAxis.y}`;
  tmpAxis = getAxis(4, 10);
  lineSts += `M${tmpAxis.x} ${tmpAxis.y}`;
  tmpAxis = getAxis(6, 8);
  lineSts += `L${tmpAxis.x} ${tmpAxis.y}`;

  // 내 마커
  lineSts += checkBoardMarker(1, 4);
  lineSts += checkBoardMarker(3, 4);
  lineSts += checkBoardMarker(5, 4);
  lineSts += checkBoardMarker(7, 4);
  lineSts += checkBoardMarker(9, 4);
  lineSts += checkBoardMarker(2, 3);
  lineSts += checkBoardMarker(8, 3);

  // 상대 마커
  lineSts += checkBoardMarker(1, 7);
  lineSts += checkBoardMarker(3, 7);
  lineSts += checkBoardMarker(5, 7);
  lineSts += checkBoardMarker(7, 7);
  lineSts += checkBoardMarker(9, 7);
  lineSts += checkBoardMarker(2, 8);
  lineSts += checkBoardMarker(8, 8);

  lines.setAttribute('d', lineSts);
}

function checkBoardMarker(x, y) {
  const markerSize = 10;
  let tmpAxis = getAxis(x, y);
  return `M${tmpAxis.x - markerSize / 2} ${tmpAxis.y - markerSize / 2} l${markerSize} ${markerSize} M${tmpAxis.x - markerSize / 2} ${tmpAxis.y + markerSize / 2} l${markerSize} ${-markerSize} `;
}

// 데이터를 가져옵니다.
function setting(code) {
  for (var i = 0; i < code.length; i += 2) {
    pieces[i / 2].x = parseInt(code[i], 10);
    pieces[i / 2].y = parseInt(code[i + 1] == 0 ? 10 : code[i + 1], 10);
    initPieces[i / 2] = { x: pieces[i / 2].x, y: pieces[i / 2].y };
  }
}

// 데이터에 따라 말의 위치를 배치합니다.
function initPositions() {
  for (let i = 0; i < 32; i++) {
    let tmpAxis = getAxis(pieces[i].x, pieces[i].y);
    pieces[i].e.setAttribute("x", tmpAxis.x - unitSize * piecesSize / 2);
    pieces[i].e.setAttribute("y", tmpAxis.y - unitSize * piecesSize / 2);
  }

  let curTurn = parseInt(document.getElementById("turn").value);
  for (let i = 0; i < curTurn; i++) {
    setPieces(log[i].i, log[i].x, log[i].y);
    if (log[i].t != 32) setPieces(log[i].t, 0, 0);
  }

  updateScore();
}

function updateScore() {
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

  const diff = document.getElementById("score-diff");

  if (iAmCho) {
    scoreB += 1.5;
    document.getElementById("score-han").value = scoreB;
    document.getElementById("score-cho").value = scoreA;
    if (scoreB > scoreA) {
      diff.style.backgroundColor = "#FCC";
    } else {
      diff.style.backgroundColor = "#CCF";
    }
  } else {
    scoreA += 1.5;
    document.getElementById("score-han").value = scoreA;
    document.getElementById("score-cho").value = scoreB;
    document.getElementById("score-diff").value = scoreB - scoreA;
    if (scoreA > scoreB) {
      diff.style.backgroundColor = "#FCC";
    } else {
      diff.style.backgroundColor = "#CCF";
    }
  }
  diff.value = Math.abs(scoreA - scoreB);
}

function moveSelectBox(i, visible = true) {
  // 1. Remove selected class from all pieces
  for (let j = 0; j < 32; j++) {
    if (pieces[j] && pieces[j].e) {
      pieces[j].e.classList.remove("selected");
    }
  }

  // 2. Add selected class to the active piece
  if (visible && pieces[i] && pieces[i].e) {
    pieces[i].e.classList.add("selected");
  }

  // Hide original red selection border
  selectBox.setAttribute("stroke-width", 0);

  let tmpAxis = getAxis(pieces[i].x, pieces[i].y);
  selectBox.setAttribute("x", tmpAxis.x - unitSize / 2);
  selectBox.setAttribute("y", tmpAxis.y - unitSize / 2);
  selectBox.setAttribute("width", unitSize);
  selectBox.setAttribute("height", unitSize);
}

// 이동가능 경로 1개를 그립니다. (네온 블루 서클 스타일)
function createCandiBox(i, x, y) {
  if (x < 1 || x > 9 || y < 1 || y > 10) return;

  let tmpAxis = getAxis(x, y);
  const candiBox = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  candiBox.setAttribute("cx", tmpAxis.x);
  candiBox.setAttribute("cy", tmpAxis.y);
  candiBox.setAttribute("r", (unitSize * piecesSize / 2) - 4);
  candiBox.setAttribute("fill", "#3b82f6");
  candiBox.setAttribute("fill-opacity", "0.15");
  candiBox.setAttribute("stroke", "#3b82f6");
  candiBox.setAttribute("stroke-width", "2.5");
  candiBox.setAttribute("filter", "url(#candi-glow)");
  candiBox.style.cursor = "pointer";

  candiBoxList.push(candiBox);
  candiBox.addEventListener("click", function () {
    move(i, x, y);
  });
  svg.appendChild(candiBox);
}

function setPieces(i, x, y) {
  let tmpAxis = getAxis(x, y);
  pieces[i].x = x;
  pieces[i].y = y;
  pieces[i].e.setAttribute("x", tmpAxis.x - unitSize * piecesSize / 2);
  pieces[i].e.setAttribute("y", tmpAxis.y - unitSize * piecesSize / 2);
}

// 현재 그려진 모든 이동가능 경로를 삭제합니다.
function clearCandiBox() {
  for (let i = candiBoxList.length - 1; i >= 0; i--) {
    svg.removeChild(candiBoxList[i]);
    candiBoxList.pop();
  }
}
