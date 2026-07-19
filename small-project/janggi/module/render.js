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
    pieces[i].e.style.width = `${unitSize * ratio}px`;
    pieces[i].e.style.height = `${unitSize * ratio}px`;

    // 클릭되었을 때 수행할 함수를 지정합니다. (중복 등록 방지를 위해 onclick 속성 사용)
    pieces[i].e.onclick = function () { selected(i) };
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
  // 가로줄 10라인 (y좌표 순서: 1,2,...,9,0)
  const yOrder = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
  for (let idx = 0; idx < 10; idx++) {
    let axis = getAxis(1, yOrder[idx]);
    lineSts += `M${axis.x} ${axis.y} h${Math.floor(unitSize * 8)} `;
  }
  // 세로줄 9라인
  for (let i = 0; i < 9; i++) {
    let axis = getAxis(i + 1, 1);
    lineSts += `M${axis.x} ${axis.y} v${Math.floor(unitSize * 9)} `;
  }
  // 내 궁성 (y=0,9,8)
  var tmpAxis = getAxis(4, 0);
  lineSts += `M${tmpAxis.x} ${tmpAxis.y}`;
  tmpAxis = getAxis(6, 8);
  lineSts += `L${tmpAxis.x} ${tmpAxis.y}`;

  tmpAxis = getAxis(6, 0);
  lineSts += `M${tmpAxis.x} ${tmpAxis.y}`;
  tmpAxis = getAxis(4, 8);
  lineSts += `L${tmpAxis.x} ${tmpAxis.y}`;

  // 상대 궁성 (y=1,2,3)
  tmpAxis = getAxis(4, 3);
  lineSts += `M${tmpAxis.x} ${tmpAxis.y}`;
  tmpAxis = getAxis(6, 1);
  lineSts += `L${tmpAxis.x} ${tmpAxis.y}`;
  tmpAxis = getAxis(4, 1);
  lineSts += `M${tmpAxis.x} ${tmpAxis.y}`;
  tmpAxis = getAxis(6, 3);
  lineSts += `L${tmpAxis.x} ${tmpAxis.y}`;

  // 내 마커 (기존 y=4→7, y=3→8)
  lineSts += checkBoardMarker(1, 7);
  lineSts += checkBoardMarker(3, 7);
  lineSts += checkBoardMarker(5, 7);
  lineSts += checkBoardMarker(7, 7);
  lineSts += checkBoardMarker(9, 7);
  lineSts += checkBoardMarker(2, 8);
  lineSts += checkBoardMarker(8, 8);

  // 상대 마커 (기존 y=7→4, y=8→3)
  lineSts += checkBoardMarker(1, 4);
  lineSts += checkBoardMarker(3, 4);
  lineSts += checkBoardMarker(5, 4);
  lineSts += checkBoardMarker(7, 4);
  lineSts += checkBoardMarker(9, 4);
  lineSts += checkBoardMarker(2, 3);
  lineSts += checkBoardMarker(8, 3);

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
        text.setAttribute("font-size", `${unitSize * coordsTextScale}px`);
        text.setAttribute("font-weight", "800");
        text.setAttribute("opacity", "0.85");
        text.textContent = x;
        coordsGroup.appendChild(text);
      }

      // 2. 가로선 (줄) 번호: 왼쪽에 배치 (맨 위가 1, 맨 아래가 0)
      const yLabels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
      for (let idx = 0; idx < yLabels.length; idx++) {
        let axis = getAxis(1, yLabels[idx]);
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", boardPaddingLeft - 25);
        text.setAttribute("y", axis.y);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "middle");
        text.setAttribute("fill", "#4b3621");
        text.setAttribute("font-size", `${unitSize * coordsTextScale}px`);
        text.setAttribute("font-weight", "800");
        text.setAttribute("opacity", "0.85");
        text.textContent = yLabels[idx];
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
// 새 좌표계: y값은 그대로 사용 (1=상단, 0=하단)
function setting(code) {
  for (var i = 0; i < code.length; i += 2) {
    pieces[i / 2].x = parseInt(code[i], 10);
    pieces[i / 2].y = parseInt(code[i + 1], 10);
    initPieces[i / 2] = { x: pieces[i / 2].x, y: pieces[i / 2].y };
  }
}

// 데이터에 따라 말의 위치를 배치합니다.
function initPositions() {
  for (let i = 0; i < 32; i++) {
    const ratio = getPieceSizeRatio(i);
    let targetX, targetY;
    
    if (pieces[i].x === 0 && pieces[i].y === 0) {
      targetX = -unitSize * ratio * 2;
      targetY = -unitSize * ratio * 2;
    } else {
      let tmpAxis = getAxis(pieces[i].x, pieces[i].y);
      targetX = tmpAxis.x - unitSize * ratio / 2;
      targetY = tmpAxis.y - unitSize * ratio / 2;
    }
    
    pieces[i].e.setAttribute("width", unitSize * ratio);
    pieces[i].e.setAttribute("height", unitSize * ratio);
    pieces[i].e.style.width = `${unitSize * ratio}px`;
    pieces[i].e.style.height = `${unitSize * ratio}px`;
    
    let transformStr = `translate(${targetX}px, ${targetY}px)`;
    if (typeof rotateActive !== 'undefined' && rotateActive) {
      transformStr += ' rotate(-180deg)';
    } else if (typeof flipActive !== 'undefined' && flipActive) {
      transformStr += ' rotateY(-180deg)';
    }
    pieces[i].e.style.transform = transformStr;
  }

  // 기물 내 글자 오버레이 크기 적용
  updatePieceGraphics();

  let curTurn = parseInt(document.getElementById("turn").value, 10);
  if (isNaN(curTurn)) curTurn = log.length;
  curTurn = Math.min(curTurn, log.length);
  for (let i = 0; i < curTurn; i++) {
    if (log[i]) {
      setPieces(log[i].i, log[i].x, log[i].y);
      if (log[i].t != 32) setPieces(log[i].t, 0, 0);
    }
  }

  updateScore();
  updateKeyboardCursor();
}

function updateKeyboardCursor() {
  const cursor = document.getElementById("kb-cursor");
  if (!cursor) return;
  
  if (!kbCursorActive) {
    cursor.style.display = "none";
    return;
  }
  
  const size = unitSize * 0.85;
  let axis = getAxis(kbCursorX, kbCursorY);
  let targetX = axis.x - size / 2;
  let targetY = axis.y - size / 2;
  
  cursor.setAttribute("width", size);
  cursor.setAttribute("height", size);
  cursor.style.width = `${size}px`;
  cursor.style.height = `${size}px`;
  cursor.style.display = "block";
  
    let transformStr = `translate(${targetX}px, ${targetY}px)`;
  if (typeof rotateActive !== 'undefined' && rotateActive) {
    transformStr += ' rotate(-180deg)';
  } else if (typeof flipActive !== 'undefined' && flipActive) {
    transformStr += ' rotateY(-180deg)';
  }
  cursor.style.transform = transformStr;
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

function createCandiBox(i, x, y) {
  if (x < 1 || x > 9 || !isValidY(y)) {
    return;
  }
  
  const ratio = getPieceSizeRatio(i);
  let tmpAxis = getAxis(x, y);
  let targetX = tmpAxis.x - unitSize * ratio / 2;
  let targetY = tmpAxis.y - unitSize * ratio / 2;

  // 브라우저 동적 SVG 렌더링 버그 우회를 위해 <g> 그룹 엘리먼트로 생성
  const candiBox = document.createElementNS("http://www.w3.org/2000/svg", "g");
  candiBox.setAttribute("class", "candi-svg");
  candiBox.setAttribute("pointer-events", "all");
  candiBox.setAttribute("transform", `translate(${targetX}, ${targetY})`); // Standard SVG transform attribute without px unit
  candiBox.style.cursor = "pointer";

  const boxSize = unitSize * ratio;
  const center = boxSize / 2;

  if (candiShapeType === "empty_square") {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", boxSize * 0.1);
    rect.setAttribute("y", boxSize * 0.1);
    rect.setAttribute("width", boxSize * 0.8);
    rect.setAttribute("height", boxSize * 0.8);
    rect.setAttribute("rx", boxSize * 0.1);
    rect.setAttribute("ry", boxSize * 0.1);
    rect.setAttribute("fill", candiColorType);
    rect.setAttribute("fill-opacity", "0.2"); // Elegant semi-transparent fill
    rect.setAttribute("stroke", candiColorType);
    rect.setAttribute("stroke-width", "4"); // Premium thin border
    rect.setAttribute("pointer-events", "all");
    rect.style.pointerEvents = "auto";
    candiBox.appendChild(rect);
  } else if (candiShapeType === "filled_circle") {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", center);
    circle.setAttribute("cy", center);
    circle.setAttribute("r", boxSize * 0.4);
    circle.setAttribute("fill", candiColorType);
    circle.setAttribute("fill-opacity", "0.75");
    circle.setAttribute("pointer-events", "all");
    circle.style.pointerEvents = "auto";
    candiBox.appendChild(circle);
  } else { // default "empty_circle"
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", center);
    circle.setAttribute("cy", center);
    circle.setAttribute("r", boxSize * 0.4);
    circle.setAttribute("fill", candiColorType);
    circle.setAttribute("fill-opacity", "0.2"); // Semi-transparent fill
    circle.setAttribute("stroke", candiColorType); // Theme color stroke
    circle.setAttribute("stroke-width", "4"); // Elegant border width
    circle.setAttribute("pointer-events", "all");
    circle.style.pointerEvents = "auto";
    candiBox.appendChild(circle);
  }
  
  candiBox.style.cursor = "pointer";

  candiBoxList.push(candiBox);
  candiBox.addEventListener("click", function () {
    move(i, x, y);
  });
  
  svg.appendChild(candiBox);
}

// 장기알 서예 글씨 이미지의 크기와 정렬 오프셋을 동적으로 갱신합니다.
function updatePieceGraphics() {
  for (let i = 0; i < 32; i++) {
    if (!pieces[i] || !pieces[i].e) continue;
    const img = pieces[i].e.querySelector("image");
    if (img) {
      let baseSize = ((i >= 9 && i <= 15) || (i >= 25 && i <= 31)) ? 82 : 74;
      let scale = 1.0;
      if (i === 0 || i === 16) {
        scale = fontScaleKing;
      } else if ((i >= 1 && i <= 8) || (i >= 17 && i <= 24)) {
        scale = fontScaleMiddle;
      } else {
        scale = fontScaleSmall;
      }
      let w = baseSize * scale;
      let h = baseSize * scale;
      let imgX = 50 - w / 2 - 3;
      let imgY = 50 - h / 2 - 3;
      img.setAttribute("x", imgX);
      img.setAttribute("y", imgY);
      img.setAttribute("width", w);
      img.setAttribute("height", h);
    }
  }
}

function setPieces(i, x, y, animate = false) {
  pieces[i].x = x;
  pieces[i].y = y;
  const ratio = getPieceSizeRatio(i);
  
  // 기존 진행 중인 프레임이 있다면 취소하여 동시성 레이스 차단
  if (pieces[i].animId) {
    cancelAnimationFrame(pieces[i].animId);
    pieces[i].animId = null;
  }

  if (x === 0 && y === 0) {
    // 따먹혀서 판 밖으로 나가는 경우 애니메이션 없이 즉시 숨김
    let targetX = -unitSize * ratio * 2;
    let targetY = -unitSize * ratio * 2;
    pieces[i].e.style.transform = `translate(${targetX}px, ${targetY}px) scale(1)`;
    pieces[i].e.style.filter = "";
    return;
  }

  // 기물 이동 시 z-index 보장을 위해 DOM 트리의 맨 뒤로 이동 (항상 화면 최상단에 렌더링)
  svg.appendChild(pieces[i].e);

  let tmpAxis = getAxis(x, y);
  let endX = tmpAxis.x - unitSize * ratio / 2;
  let endY = tmpAxis.y - unitSize * ratio / 2;

  // 만약 애니메이션 설정 시간이 0초이거나, animate 플래그가 false인 경우 즉시 이동
  if (!animate || animDuration <= 0) {
    pieces[i].e.style.transform = `translate(${endX}px, ${endY}px) scale(1)`;
    pieces[i].e.style.filter = "";
    return;
  }

  // 현재 위치 추출 (현재 transform 값에서 파싱)
  let startX = endX;
  let startY = endY;
  const transformStr = pieces[i].e.style.transform;
  if (transformStr && transformStr.includes("translate")) {
    const matches = transformStr.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
    if (matches && matches.length >= 3) {
      startX = parseFloat(matches[1]);
      startY = parseFloat(matches[2]);
    }
  }

  // 시작 위치와 끝 위치가 완전히 동일하다면 연산 없이 배치
  if (Math.abs(startX - endX) < 0.5 && Math.abs(startY - endY) < 0.5) {
    pieces[i].e.style.transform = `translate(${endX}px, ${endY}px) scale(1)`;
    pieces[i].e.style.filter = "";
    return;
  }

  // 3D 곡선 경로를 만들기 위해 포물선 제어점 연산 (animHeight 비율 적용)
  let dx = endX - startX;
  let dy = endY - startY;
  let dist = Math.sqrt(dx * dx + dy * dy);
  let archH = dist * 0.22 * animHeight; // 3D 높이 포물선 아치 깊이
  
  let p1X = (startX + endX) / 2;
  let p1Y = (startY + endY) / 2 - archH; // Y축 상향(마이너스) 방향으로 둥글게

  let startTime = performance.now();
  let duration = animDuration * 1000;

  function animateFrame(now) {
    let elapsed = now - startTime;
    let t = Math.min(elapsed / duration, 1);
    
    // Ease-in-out Cubic 보간 곡선 적용
    let te = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    // 2차 베지어 포물선 위치 계산
    let xt = (1 - te) * (1 - te) * startX + 2 * (1 - te) * te * p1X + te * te * endX;
    let yt = (1 - te) * (1 - te) * startY + 2 * (1 - te) * te * p1Y + te * te * endY;

    // 기물 들었다 놓기 크기 조절 (가운데 50% 지점에서 최대 1.18배 * animHeight 배율)
    let scale = 1 + 0.18 * animHeight * Math.sin(te * Math.PI);

    // 높은 고도에 맞춰 다이나믹 그림자 팽창 연산
    let shadowBlur = 4 + 10 * animHeight * Math.sin(te * Math.PI);
    let shadowOffset = 4 + 8 * animHeight * Math.sin(te * Math.PI);
    
    pieces[i].e.style.transform = `translate(${xt}px, ${yt}px) scale(${scale})`;
    pieces[i].e.style.filter = `drop-shadow(${shadowOffset}px ${shadowOffset * 1.5}px ${shadowBlur}px rgba(0, 0, 0, 0.42))`;

    if (t < 1) {
      pieces[i].animId = requestAnimationFrame(animateFrame);
    } else {
      pieces[i].e.style.transform = `translate(${endX}px, ${endY}px) scale(1)`;
      pieces[i].e.style.filter = "";
      pieces[i].animId = null;
    }
  }

  pieces[i].animId = requestAnimationFrame(animateFrame);
}

// 현재 그려진 모든 이동가능 경로를 삭제합니다.
function clearCandiBox() {
  for (let i = candiBoxList.length - 1; i >= 0; i--) {
    svg.removeChild(candiBoxList[i]);
    candiBoxList.pop();
  }
}
