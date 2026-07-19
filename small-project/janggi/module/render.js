// render.js - Board drawing and HTML display updates

function initBoard() {
  // 제어판 요소를 가져옵니다.
  const controlBox = document.getElementById("control-box");
  // 제어판의 부모 컨테이너(상위 SPA의 article 등)를 기준으로 크기를 가져옵니다.
  const container = controlBox.parentElement || document.body;

  let containerWidth = container.clientWidth || window.innerWidth;
  
  // 상단 고정 헤더(fixed header)의 존재 여부와 높이를 감지합니다.
  const header = document.querySelector("header");
  const headerHeight = header ? header.offsetHeight : 0;
  
  // 헤더가 있는 경우(임베드 모드) 제어판 상단에 마진을 주어 헤더 밑으로 밀어냅니다.
  const headerGap = headerHeight > 0 ? headerHeight + 5 : 5;
  controlBox.style.marginTop = `${headerGap}px`;

  // 컨테이너가 고정 높이가 아니거나 유동적으로 늘어날 경우를 대비하여 뷰포트 물리 높이를 한계치로 설정합니다.
  const containerRect = container.getBoundingClientRect();
  const topOffset = containerRect.top > 0 ? containerRect.top : 0;
  
  // 뷰포트 내 남은 실제 물리적 높이 계산 (헤더 마진 공간 추가로 차감)
  const viewportRemainingHeight = window.innerHeight - topOffset - headerGap;
  
  // 실제 사용 가능한 물리 한계 높이
  let containerHeight = container.clientHeight;
  if (!containerHeight || containerHeight > viewportRemainingHeight) {
    containerHeight = viewportRemainingHeight;
  }

  // 좌표선 옵션 활성화 여부에 따른 패딩 세팅 (비대칭 패딩 적용)
  if (showCoordinates) {
    boardPaddingLeft = 45;
    boardPaddingTop = 45;
  } else {
    boardPaddingLeft = 20;
    boardPaddingTop = 20;
  }
  boardPaddingRight = 20;
  boardPaddingBottom = 20;

  // 여백(margin)을 제외한 가용 너비와 높이를 구합니다.
  const marginOffset = 2 * boardMargin;
  const tmpWidth = containerWidth - marginOffset;
  // 제어판 높이와 상하 마진 및 최소 안전 마진(15px)을 제외하여 가용 높이 계산
  const tmpHeight = containerHeight - controlBox.offsetHeight - marginOffset - 15;

  // boardPadding을 제외한 격자 영역의 가용 너비와 높이
  const gridAvailableWidth = tmpWidth - (boardPaddingLeft + boardPaddingRight);
  const gridAvailableHeight = tmpHeight - (boardPaddingTop + boardPaddingBottom);

  // 가용 영역 내에서 9:10 비율에 맞춘 unitSize 계산
  const unitByWidth = gridAvailableWidth / 9;
  const unitByHeight = gridAvailableHeight / 10;
  unitSize = Math.min(unitByWidth, unitByHeight);

  // 최종 보드 크기 계산 (격자 영역 + 양측 패딩)
  boardWidth = unitSize * 9 + boardPaddingLeft + boardPaddingRight;
  boardHeight = unitSize * 10 + boardPaddingTop + boardPaddingBottom;



  // 제어판의 넓이를 장기판 넓이와 일치시킵니다.
  controlBox.style.width = `${boardWidth}px`;

  // 장기판을 그립니다.
  drawBoard();

  // 말의 크기를 조절합니다.
  for (let i = 0; i < 32; i++) {
    const ratio = getPieceSizeRatio(i);
    pieces[i].e.setAttribute("width", unitSize * ratio);
    pieces[i].e.setAttribute("height", unitSize * ratio);

    // 클릭되었을 때 수행할 함수를 지정합니다.
    pieces[i].e.addEventListener("click", function () { selected(i) });
  }
}

function drawBoard() {
  // svg의 viewBox와 크기 속성을 설정합니다. (반응형 100% 대응)
  svg.setAttribute("width", boardWidth);
  svg.setAttribute("height", boardHeight);
  svg.setAttribute("viewBox", `0 0 ${boardWidth} ${boardHeight}`);

  // CSS 스타일로 계산 완료된 정확한 수치를 적용합니다.
  svg.style.width = `${boardWidth}px`;
  svg.style.height = `${boardHeight}px`;
  svg.style.display = "block";
  svg.style.margin = "0 auto";

  // 장기판의 크기를 설정합니다.
  board.setAttribute("width", boardWidth);
  board.setAttribute("height", boardHeight);

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

  // 공식 기보용 좌표 레이블 작성 (대한장기협회 기준)
  const coordsGroup = document.getElementById("coords-labels");
  if (coordsGroup) {
    coordsGroup.innerHTML = "";

    if (showCoordinates) {
      // 1. 세로선 (열) 번호: 맨 위쪽에 1~9열 배치 (왼쪽이 1, 오른쪽이 9)
      for (let x = 1; x <= 9; x++) {
        let axis = getAxis(x, 1);
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", axis.x);
        text.setAttribute("y", boardPaddingTop - 25);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "middle");
        text.setAttribute("fill", "#4b3621"); // 목판화풍 짙은 갈색
        text.setAttribute("font-size", `${unitSize * 0.22}px`);
        text.setAttribute("font-weight", "800");
        text.setAttribute("opacity", "0.85");
        text.textContent = x;
        coordsGroup.appendChild(text);
      }

      // 2. 가로선 (줄) 번호: 왼쪽에 1~10줄 배치 (아래쪽이 1, 위쪽이 10)
      for (let y = 1; y <= 10; y++) {
        let axis = getAxis(1, y);
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", boardPaddingLeft - 25);
        text.setAttribute("y", axis.y);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "middle");
        text.setAttribute("fill", "#4b3621");
        text.setAttribute("font-size", `${unitSize * 0.22}px`);
        text.setAttribute("font-weight", "800");
        text.setAttribute("opacity", "0.85");
        text.textContent = y;
        coordsGroup.appendChild(text);
      }
    }
  }
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
    const ratio = getPieceSizeRatio(i);
    let tmpAxis = getAxis(pieces[i].x, pieces[i].y);
    pieces[i].e.setAttribute("x", tmpAxis.x - unitSize * ratio / 2);
    pieces[i].e.setAttribute("y", tmpAxis.y - unitSize * ratio / 2);
  }

  let curTurn = parseInt(document.getElementById("turn").value);
  for (let i = 0; i < curTurn; i++) {
    setPieces(log[i].i, log[i].x, log[i].y);
    if (log[i].t != 32) setPieces(log[i].t, 0, 0);
  }

  updateScore();
}

function updateScore() {
  let scoreA = 0; // 초나라 점수 (기본)
  let scoreB = 0; // 한나라 점수 (기본)
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
    scoreB += 1.5; // 한나라 후수 덤 적용
    scoreHan = scoreB;
    scoreCho = scoreA;
  } else {
    scoreA += 1.5; // 한나라 후수 덤 적용
    scoreHan = scoreA;
    scoreCho = scoreB;
  }

  // 텍스트 수치 업데이트
  document.getElementById("han-score-val").textContent = `한: ${scoreHan.toFixed(1)}`;
  document.getElementById("cho-score-val").textContent = `초: ${scoreCho.toFixed(1)}`;

  // 점수차 및 강조 색상
  const scoreDiff = Math.abs(scoreHan - scoreCho);
  const diffEl = document.getElementById("diff-score-val");
  diffEl.textContent = scoreDiff.toFixed(1);
  
  if (scoreHan > scoreCho) {
    diffEl.style.color = "#b91c1c"; // 한나라 리드 시 빨간색
  } else if (scoreCho > scoreHan) {
    diffEl.style.color = "#1e3a8a"; // 초나라 리드 시 파란색
  } else {
    diffEl.style.color = "#0f172a"; // 동점 시 어두운 회색
  }

  // 막대그래프 비율 갱신 (최대 100%)
  const total = scoreHan + scoreCho;
  let hanPercent = 50;
  let choPercent = 50;
  if (total > 0) {
    hanPercent = (scoreHan / total) * 100;
    choPercent = 100 - hanPercent;
  }

  document.getElementById("han-score-bar").style.width = `${hanPercent}%`;
  document.getElementById("cho-score-bar").style.width = `${choPercent}%`;
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

  const ratio = getPieceSizeRatio(i);
  let tmpAxis = getAxis(x, y);
  const candiBox = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  candiBox.setAttribute("cx", tmpAxis.x);
  candiBox.setAttribute("cy", tmpAxis.y);
  candiBox.setAttribute("r", (unitSize * ratio / 2) - 4);
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
  const ratio = getPieceSizeRatio(i);
  pieces[i].e.setAttribute("x", tmpAxis.x - unitSize * ratio / 2);
  pieces[i].e.setAttribute("y", tmpAxis.y - unitSize * ratio / 2);
}

// 현재 그려진 모든 이동가능 경로를 삭제합니다.
function clearCandiBox() {
  for (let i = candiBoxList.length - 1; i >= 0; i--) {
    svg.removeChild(candiBoxList[i]);
    candiBoxList.pop();
  }
}
