/**
 * chart.js
 * SVG 요소들의 실시간 드로잉, 눈금자(Ruler) 및 십자 가이드라인(Guideline) 렌더링을 담당하는 뷰 제어 모듈입니다.
 */

/**
 * 캔버스 크기에 맞춰 배경 격자 사각형의 크기를 갱신합니다.
 */
function setBackgroundSize() {
  var svgEl = document.querySelector(SELECTORS.svg);
  var ground = document.getElementById("ground");
  if (svgEl && ground) {
    ground.setAttribute('width', svgEl.clientWidth);
    ground.setAttribute('height', svgEl.clientHeight);
  }
}

/**
 * 동심원들의 지름을 현재 unit 크기에 연동하여 재설정합니다.
 */
function drawConcentricCircles() {
  var svgEl = document.querySelector(SELECTORS.svg);
  if (!svgEl) return;
  var centerX = svgEl.clientWidth / 2;
  var centerY = svgEl.clientHeight / 2;

  for (var i = 0; i < 16; i++) {
    var circle = document.getElementById('unit-circle' + i);
    if (circle) {
      circle.setAttribute("r", state.unit * (i + 1));
      circle.setAttribute("cx", centerX);
      circle.setAttribute("cy", centerY);
    }
  }
}

/**
 * x축 및 y축 라인 좌표를 화면 중앙 기준으로 재계산하여 드로잉합니다.
 */
function drawCoordinateAxes() {
  var svgEl = document.querySelector(SELECTORS.svg);
  if (!svgEl) return;
  var centerX = svgEl.clientWidth / 2;
  var centerY = svgEl.clientHeight / 2;

  var axisX = document.getElementById('axis-x');
  if (axisX) {
    axisX.setAttribute("d", `M0,${centerY} L${svgEl.clientWidth - 20},${centerY}`);
  }

  var axisY = document.getElementById('axis-y');
  if (axisY) {
    axisY.setAttribute("d", `M${centerX},${svgEl.clientHeight} L${centerX},20`);
  }
}

/**
 * 제어점 번호 텍스트(1, 2)가 화면 가장자리에서 잘리지 않도록 위치를 세부 보정합니다.
 */
function adjustTextLabelPosition(element, x, y) {
  var svgEl = document.querySelector(SELECTORS.svg);
  if (!svgEl || !element || element.children.length < 2) return;

  var textNode = element.children[1];
  if (x > svgEl.clientWidth - 20) {
    textNode.setAttribute("x", -15);
  } else {
    textNode.setAttribute("x", 12);
  }

  if (y > svgEl.clientHeight - 10) {
    textNode.setAttribute("y", 0);
  } else {
    textNode.setAttribute("y", 12);
  }
}

/**
 * Z1, Z2 점을 잇는 보조 실선 및 각도 호(Arc)의 좌표를 렌더링합니다.
 */
function drawControlPath() {
  var svgEl = document.querySelector(SELECTORS.svg);
  if (!svgEl) return;
  var centerX = svgEl.clientWidth / 2;
  var centerY = svgEl.clientHeight / 2;

  // 1. Z1, Z2 보조 실선 그리기
  var pathD = "";
  for (var i = 0; i < state.points.length; i++) {
    pathD += `M${centerX},${centerY} L${state.points[i].x},${state.points[i].y} `;
  }
  var controlPath = document.getElementById("control-path");
  if (controlPath) {
    controlPath.setAttribute('d', pathD);
  }

  // 2. 각도 호(Arc) 보조선 그리기
  var arcPathD = "";
  var angleSizeStep = 25 / state.unit;

  for (var i = 0; i < state.points.length; i++) {
    var angle = Math.atan2(centerY - state.points[i].y, state.points[i].x - centerX);
    var angleSize = angleSizeStep * (i + 1);

    var angleStart = { x: angleSize, y: 0 };
    var angleEnd = { x: Math.cos(angle) * angleSize, y: Math.sin(angle) * angleSize };

    var startPx = coordinatesToSvg(angleStart, state.unit, svgEl.clientWidth, svgEl.clientHeight);
    var endPx = coordinatesToSvg(angleEnd, state.unit, svgEl.clientWidth, svgEl.clientHeight);

    arcPathD += `M${startPx.x} ${startPx.y} A${angleSize * state.unit} ${angleSize * state.unit} 0 0 ${(angle > 0) ? 0 : 1} ${endPx.x} ${endPx.y} `;
  }

  var anglePath = document.getElementById("angle-path");
  if (anglePath) {
    anglePath.setAttribute('d', arcPathD);
  }

  // Phase 1 극형식 기하 레이어(각도 꼬리물기 호 & 닮음 삼각형) 드로잉
  drawPolarDetails();
}

/**
 * 곱셈 애니메이션 진행도 t에 따른 최종 곱 연산 보조 가이드 및 아크 회전 궤적을 렌더링합니다.
 */
function drawAnimatePath(i, j) {
  var svgEl = document.querySelector(SELECTORS.svg);
  if (!svgEl) return;
  var centerX = svgEl.clientWidth / 2;
  var centerY = svgEl.clientHeight / 2;

  var angle_i = Math.atan2(centerY - state.points[i].y, state.points[i].x - centerX);
  var angle_j = Math.atan2(centerY - state.points[j].y, state.points[j].x - centerX);

  // Z1 기준 가이드 아크
  var ptr_is = { x: Math.cos(angle_i) * 1.1, y: Math.sin(angle_i) * 1.1 };
  var ptr_is_px = coordinatesToSvg(ptr_is, state.unit, svgEl.clientWidth, svgEl.clientHeight);
  var angle_cur = angle_i + angle_j * state.t;
  var ptr_it = { x: Math.cos(angle_cur) * 1.1, y: Math.sin(angle_cur) * 1.1 };
  var ptr_it_px = coordinatesToSvg(ptr_it, state.unit, svgEl.clientWidth, svgEl.clientHeight);
  
  var path = `M${ptr_is_px.x} ${ptr_is_px.y} A${state.unit * 1.1} ${state.unit * 1.1} 0 0 ${(angle_j > 0) ? 0 : 1} ${ptr_it_px.x} ${ptr_it_px.y} `;

  // Z2 기준 가이드 아크
  var ptr_js = { x: 1, y: 0 };
  var ptr_js_px = coordinatesToSvg(ptr_js, state.unit, svgEl.clientWidth, svgEl.clientHeight);
  var ptr_jt = { x: Math.cos(angle_j * state.t), y: Math.sin(angle_j * state.t) };
  var ptr_jt_px = coordinatesToSvg(ptr_jt, state.unit, svgEl.clientWidth, svgEl.clientHeight);

  path += `M${ptr_js_px.x} ${ptr_js_px.y} A${state.unit} ${state.unit} 0 0 ${(angle_j > 0) ? 0 : 1} ${ptr_jt_px.x} ${ptr_jt_px.y} `;

  // Z3 = Z1 * Z2 * t 좌표 연산 후 가이드선
  var pi = svgToCoordinates({ x: state.points[i].x, y: state.points[i].y }, state.unit, svgEl.clientWidth, svgEl.clientHeight);
  var pj = svgToCoordinates({ x: state.points[j].x, y: state.points[j].y }, state.unit, svgEl.clientWidth, svgEl.clientHeight);
  var pk = multiplyComplex(pi, pj, state.t);
  
  console.log(`(${T(pi.x)} + ${T(pi.y)}i) x (${T(pj.x)} + ${T(pj.y)}i) \n= (${T(pi.x)}x${T(pj.x)}-${T(pi.y)}x${T(pj.y)}) + (${T(pi.x)}x${T(pj.y)}+${T(pi.y)}x${T(pj.x)})i \n= ${T(pk.x)} + ${T(pk.y)}i`);
  
  var pk_px = coordinatesToSvg(pk, state.unit, svgEl.clientWidth, svgEl.clientHeight);
  
  path += `M${centerX},${centerY} L ${pk_px.x},${pk_px.y}`;

  // 현재 곱셈점 붉은 마크 위치 동기화
  var curPos = document.getElementById('cur-position');
  if (curPos) {
    curPos.setAttribute('cx', pk_px.x);
    curPos.setAttribute('cy', pk_px.y);
  }

  // 애니메이션 궤적 렌더링
  var animatePath = document.getElementById("animate-path");
  if (animatePath) {
    animatePath.setAttribute('d', path);
  }
}

/**
 * 드래그 중에만 조작 위치를 보조하는 정렬 십자 가이드라인(Guideline)을 활성화합니다.
 */
function updateDragGuideLine(x, y, isVisible) {
  var guideH = document.getElementById("guide-h");
  var guideV = document.getElementById("guide-v");
  if (!guideH || !guideV) return;

  if (isVisible) {
    guideH.setAttribute("y1", y);
    guideH.setAttribute("y2", y);
    guideH.setAttribute("x1", 0);
    guideH.setAttribute("x2", "100%");
    guideH.style.opacity = "1";

    guideV.setAttribute("x1", x);
    guideV.setAttribute("x2", x);
    guideV.setAttribute("y1", 0);
    guideV.setAttribute("y2", "100%");
    guideV.style.opacity = "1";
  } else {
    guideH.style.opacity = "0";
    guideV.style.opacity = "0";
  }
}

/**
 * 캔버스 외곽에 픽셀 거리를 나타내는 눈금자(Ruler) 레이어를 렌더링합니다.
 */
function drawRulers() {
  var svgEl = document.querySelector(SELECTORS.svg);
  if (!svgEl) return;

  var width = svgEl.clientWidth || 800;
  var height = svgEl.clientHeight || 550;

  var container = document.getElementById("ruler-layer");
  if (!container) {
    container = document.createElementNS("http://www.w3.org/2000/svg", "g");
    container.setAttribute("id", "ruler-layer");
    svgEl.appendChild(container);
  }
  container.innerHTML = "";

  // 1. 눈금자 배경 바
  var topBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  topBg.setAttribute("x", 0);
  topBg.setAttribute("y", 0);
  topBg.setAttribute("width", width);
  topBg.setAttribute("height", 25);
  topBg.setAttribute("class", "ruler-bg");
  container.appendChild(topBg);

  var leftBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  leftBg.setAttribute("x", 0);
  leftBg.setAttribute("y", 0);
  leftBg.setAttribute("width", 35);
  leftBg.setAttribute("height", height);
  leftBg.setAttribute("class", "ruler-bg");
  container.appendChild(leftBg);

  // 2. 상단 가로 눈금선들
  for (var x = 35; x < width; x += 10) {
    var isMajor = (x - 35) % 50 === 0;
    var tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
    tick.setAttribute("x1", x);
    tick.setAttribute("x2", x);
    tick.setAttribute("y1", isMajor ? 10 : 17);
    tick.setAttribute("y2", 25);
    tick.setAttribute("class", isMajor ? "ruler-tick-major" : "ruler-tick");
    container.appendChild(tick);

    if (isMajor) {
      var text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", x - 6);
      text.setAttribute("y", 9);
      text.setAttribute("class", "ruler-text");
      text.textContent = x - 35;
      container.appendChild(text);
    }
  }

  // 3. 좌측 세로 눈금선들
  for (var y = 25; y < height; y += 10) {
    var isMajor = (y - 25) % 50 === 0;
    var tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
    tick.setAttribute("y1", y);
    tick.setAttribute("y2", y);
    tick.setAttribute("x1", isMajor ? 15 : 22);
    tick.setAttribute("x2", 35);
    tick.setAttribute("class", isMajor ? "ruler-tick-major" : "ruler-tick");
    container.appendChild(tick);

    if (isMajor) {
      var text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", 2);
      text.setAttribute("y", y + 3);
      text.setAttribute("class", "ruler-text");
      text.textContent = y - 25;
      container.appendChild(text);
    }
  }

  // 4. 모퉁이 결합부 박스
  var corner = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  corner.setAttribute("x", 0);
  corner.setAttribute("y", 0);
  corner.setAttribute("width", 35);
  corner.setAttribute("height", 25);
  corner.setAttribute("fill", "#e0e0e0");
  corner.setAttribute("stroke", "#bdbdbd");
  corner.setAttribute("stroke-width", 1);
  container.appendChild(corner);
}

/**
 * 특정 점의 실시간 수학적 수치(좌표, 크기, 각도)를 계산하여 HTML 툴팁 오버레이로 표현합니다.
 * pointId: 0 (Z1) 또는 1 (Z2)
 */
function updatePointTooltip(pointId, x, y) {
  var svgEl = document.querySelector(SELECTORS.svg);
  if (!svgEl) return;
  var container = svgEl.parentNode;
  if (!container) return;

  var tooltipId = 'imaginary-tooltip-' + pointId;
  var tooltipEl = document.getElementById(tooltipId);
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.setAttribute('id', tooltipId);
    tooltipEl.setAttribute('class', 'imaginary-tooltip');
    container.appendChild(tooltipEl);
  }

  // 1) 수학적 복소 좌표 환산
  var coord = svgToCoordinates({ x: x, y: y }, state.unit, svgEl.clientWidth, svgEl.clientHeight);
  
  // 크기(Magnitude) 계산: sqrt(x^2 + y^2)
  var magnitude = Math.sqrt(coord.x * coord.x + coord.y * coord.y);
  
  // 각도(Angle) 계산: atan2(y, x) -> degree (0 ~ 360도로 변환)
  var angleRad = Math.atan2(coord.y, coord.x);
  var angleDeg = angleRad * (180 / Math.PI);
  if (angleDeg < 0) angleDeg += 360;

  // 2) 툴팁 HTML 주입 (Z1은 파란색, Z2는 초록색 헤더)
  tooltipEl.innerHTML = `
    <div class="tooltip-header">
      <span style="font-weight: bold; color: ${pointId === 0 ? '#4285f4' : '#34a853'};">Z${pointId + 1} Info</span>
      <span class="tooltip-close" onclick="closePointTooltip(${pointId})">×</span>
    </div>
    <div class="tooltip-body">
      <strong>Coord:</strong> ${T(coord.x)} + ${T(coord.y)}i<br>
      <strong>Magnitude:</strong> ${T(magnitude)}<br>
      <strong>Angle:</strong> ${T(angleDeg)}°
    </div>
  `;

  // 3) 원점(중앙)으로부터 제어점 방향 벡터 계산
  var centerX = svgEl.clientWidth / 2;
  var centerY = svgEl.clientHeight / 2;
  var dx = x - centerX;
  var dy = y - centerY;
  var len = Math.sqrt(dx * dx + dy * dy);

  var ux = 0.707; // 디폴트 우상단 오프셋 방향
  var uy = -0.707;
  if (len > 0) {
    ux = dx / len;
    uy = dy / len;
  }

  // 툴팁 위치 배치 (제어점의 원점 반대 방향으로 밀착 정렬)
  var svgRect = svgEl.getBoundingClientRect();
  var containerRect = container.getBoundingClientRect();

  // 툴팁을 먼저 화면에 띄우고 크기를 실측
  tooltipEl.style.display = 'block';
  tooltipEl.style.opacity = '1';

  var D = 28; // 제어점 마크 외곽 여백 마진
  var W = tooltipEl.offsetWidth || 140;
  var H = tooltipEl.offsetHeight || 85;

  var tooltipX = x + ux * D;
  var tooltipY = y + uy * D;

  // 방향 비례 정렬 공식을 활용해 툴팁 자체 너비/높이에 맞춰 좌표 보정
  var leftOffset = (svgRect.left - containerRect.left) + tooltipX - (1 - ux) * (W / 2);
  var topOffset = (svgRect.top - containerRect.top) + tooltipY - (1 - uy) * (H / 2);

  tooltipEl.style.left = leftOffset + 'px';
  tooltipEl.style.top = topOffset + 'px';
}

/**
 * 툴팁 닫기 액션 (× 클릭 시 숨김)
 */
function closePointTooltip(pointId) {
  var tooltipEl = document.getElementById('imaginary-tooltip-' + pointId);
  if (tooltipEl) {
    tooltipEl.style.display = 'none';
  }
}
window.closePointTooltip = closePointTooltip;

/**
 * Phase 1: 복소평면 극형식 기하 시각화 (각도 덧셈 꼬리물기 호 및 닮음비 삼각형)
 */
function drawPolarDetails() {
  var svgEl = document.querySelector(SELECTORS.svg);
  if (!svgEl || state.points.length < 2) return;

  var centerX = svgEl.clientWidth / 2;
  var centerY = svgEl.clientHeight / 2;

  // 1. 주요 점들의 SVG 픽셀 좌표 도출
  var O = { x: centerX, y: centerY };
  var E = coordinatesToSvg({ x: 1, y: 0 }, state.unit, svgEl.clientWidth, svgEl.clientHeight);
  var Z1 = { x: state.points[0].x, y: state.points[0].y };
  var Z2 = { x: state.points[1].x, y: state.points[1].y };

  // 복소수 Z1, Z2 의 수학적 좌표 환산 후 최종 Z3 = Z1 * Z2 곱셈 픽셀 좌표 도출
  var pi = svgToCoordinates(Z1, state.unit, svgEl.clientWidth, svgEl.clientHeight);
  var pj = svgToCoordinates(Z2, state.unit, svgEl.clientWidth, svgEl.clientHeight);
  var pk = multiplyComplex(pi, pj, 1.0); // t = 1.0 최종 곱 연산 지점
  var Z3 = coordinatesToSvg(pk, state.unit, svgEl.clientWidth, svgEl.clientHeight);

  // 2. 닮음비 삼각형 (Similarity Triangles) 드로잉
  // 기준 삼각형 T1: O - E(1,0) - Z1 (파란색)
  var triBase = document.getElementById("triangle-base");
  if (triBase) {
    triBase.setAttribute("points", `${O.x},${O.y} ${E.x},${E.y} ${Z1.x},${Z1.y}`);
  }

  // 결과 삼각형 T2: O - Z2 - Z3 (보라/빨간색)
  var triResult = document.getElementById("triangle-result");
  if (triResult) {
    triResult.setAttribute("points", `${O.x},${O.y} ${Z2.x},${Z2.y} ${Z3.x},${Z3.y}`);
  }

  // 3. 각도 덧셈 꼬리물기 호 (Arc Chaining) 드로잉
  // Z1 의 편각 angle1, Z2 의 편각 angle2
  var angle1 = Math.atan2(centerY - Z1.y, Z1.x - centerX);
  var angle2 = Math.atan2(centerY - Z2.y, Z2.x - centerX);

  // 파란 호 Z1 끝점 (angle1 위치, 호 반지름 25px)
  var angleSize = 25;
  var chainStart = { x: Math.cos(angle1) * (25 / state.unit), y: Math.sin(angle1) * (25 / state.unit) };
  var chainStartPx = coordinatesToSvg(chainStart, state.unit, svgEl.clientWidth, svgEl.clientHeight);

  // Z2 각도만큼 더해진 최종 꼬리물기 호 끝점 (angle1 + angle2 위치)
  var angleTotal = angle1 + angle2;
  var chainEnd = { x: Math.cos(angleTotal) * (25 / state.unit), y: Math.sin(angleTotal) * (25 / state.unit) };
  var chainEndPx = coordinatesToSvg(chainEnd, state.unit, svgEl.clientWidth, svgEl.clientHeight);

  var chainArcD = `M${chainStartPx.x} ${chainStartPx.y} A${angleSize} ${angleSize} 0 0 ${(angle2 > 0) ? 0 : 1} ${chainEndPx.x} ${chainEndPx.y}`;

  var chainArcPath = document.getElementById("chain-arc-path");
  if (chainArcPath) {
    chainArcPath.setAttribute("d", chainArcD);
  }
}
