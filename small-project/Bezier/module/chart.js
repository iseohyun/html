/**
 * chart.js
 * SVG 제어점 동적 렌더링, 마우스 드래그 컨트롤 및 선분/곡선 드로잉 모듈
 */

/**
 * SVG의 클라이언트 크기에 맞춰 배경 격자(ground) 넓이/높이를 설정합니다.
 */
function resizeGround() {
  const svgEl = document.querySelector(SELECTORS.svg);
  const groundEl = document.querySelector(SELECTORS.ground);
  if (svgEl && groundEl) {
    groundEl.setAttribute("width", svgEl.clientWidth || "800");
    groundEl.setAttribute("height", svgEl.clientHeight || "550");
    drawRulers(); // 리사이즈 시 눈금자 재생성
  }
}

/**
 * 제어점(Control Points) 데이터를 기반으로 SVG `<g>` 노드들을 동적으로 재생성합니다.
 * (새로고침 깜빡임 없이 즉각 제어점을 추가/제거)
 */
function renderControlPoints() {
  const svgEl = document.querySelector(SELECTORS.svg);
  if (!svgEl) return;

  // 기존 동적 생성된 제어점 노드들 소거
  const existingGNode = svgEl.querySelectorAll("g[id^='svg-ptr']");
  existingGNode.forEach(node => node.remove());

  // 데이터 배열을 기준으로 노드 재생성
  state.points.forEach((pt, i) => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");

    g.setAttribute("id", "svg-ptr" + i);
    g.setAttribute("transform", `translate(${pt.x}, ${pt.y})`);

    circle.setAttribute("r", "5");
    circle.setAttribute("fill", "white");
    circle.setAttribute("stroke", "#E8C48E");
    circle.setAttribute("stroke-width", "1.5");
    circle.style.cursor = "pointer";
    g.appendChild(circle);

    text.textContent = i + 1;
    g.appendChild(text);
    
    setTextPos(g, pt.x, pt.y);
    pt.g = g; // 돔 참조 연결

    // 제어점 마우스 누름 이벤트: 드래그 바인딩
    g.onmousedown = function (e) {
      // 애니메이션 재생 중이면 일시정지 (사용자 드래그 우선)
      if (state.timer) {
        pauseAnimation();
      }

      state.target = { element: g, index: i };

      // 가이드라인 노출
      const guideH = document.querySelector(SELECTORS.guideH);
      const guideV = document.querySelector(SELECTORS.guideV);
      if (guideH) guideH.setAttribute("opacity", "1");
      if (guideV) guideV.setAttribute("opacity", "1");
      
      svgEl.onmousemove = function (ev) {
        if (state.target) {
          const rect = svgEl.getBoundingClientRect();
          const x = ev.clientX - rect.left;
          const y = ev.clientY - rect.top;

          // 범위 가드 (상단 눈금자 높이 25px, 좌측 눈금자 너비 35px 영역 가드)
          const boundedX = Math.max(35, Math.min(x, svgEl.clientWidth));
          const boundedY = Math.max(25, Math.min(y, svgEl.clientHeight));

          state.points[state.target.index].x = boundedX;
          state.points[state.target.index].y = boundedY;

          state.target.element.setAttribute("transform", `translate(${boundedX}, ${boundedY})`);
          setTextPos(state.target.element, boundedX, boundedY);
          
          // 가이드라인 위치 갱신
          if (guideH) {
            guideH.setAttribute("y1", boundedY);
            guideH.setAttribute("y2", boundedY);
          }
          if (guideV) {
            guideV.setAttribute("x1", boundedX);
            guideV.setAttribute("x2", boundedX);
          }

          // 제어점 좌표 변화에 맞춰 실시간 궤적 렌더링
          drawPath();
          
          // 새로고침 시 좌표 복원을 위한 조용한 주소창 쿼리스트링 동기화
          syncUrlParams();
        }
      };
    };

    svgEl.appendChild(g);
  });

  // SVG 전역 마우스 업 이벤트 바인딩
  svgEl.onmouseup = function () {
    state.target = null;
    svgEl.onmousemove = null;
    
    // 가이드라인 비활성화
    const guideH = document.querySelector(SELECTORS.guideH);
    const guideV = document.querySelector(SELECTORS.guideV);
    if (guideH) guideH.setAttribute("opacity", "0");
    if (guideV) guideV.setAttribute("opacity", "0");
  };
}

/**
 * 텍스트 라벨이 SVG 캔버스 가장자리에서 삐져나가지 않도록 경계 위치를 자동 조정합니다.
 */
function setTextPos(element, x, y) {
  const svgEl = document.querySelector(SELECTORS.svg);
  if (!svgEl || element.children.length < 2) return;

  const textNode = element.children[1];
  const paddingX = x > svgEl.clientWidth - 25 ? -18 : 12;
  const paddingY = y > svgEl.clientHeight - 15 ? -5 : 12;

  textNode.setAttribute("x", paddingX);
  textNode.setAttribute("y", paddingY);
}

/**
 * 보조 골격선, 임시 보간선, 빨간색 최종 곡선을 일괄적으로 다시 드로잉합니다.
 */
function drawPath() {
  drawBezierPath();
  drawControlPath();
  drawAnimatePath();
}

/**
 * 제어점들을 직계로 연결하는 보조 골격선(Control Path)을 렌더링합니다.
 */
function drawControlPath() {
  const pathEl = document.querySelector(SELECTORS.controlPath);
  if (!pathEl || state.points.length < 2) return;

  let pathData = `M ${state.points[0].x},${state.points[0].y} L`;
  for (let i = 1; i < state.points.length; i++) {
    pathData += ` ${state.points[i].x},${state.points[i].y}`;
  }
  pathEl.setAttribute("d", pathData);
}

/**
 * 현재 t값에 맞게 순차 보간된 보조선(Animate Path)들과 최종 추적용 붉은 점 위치를 갱신합니다.
 */
function drawAnimatePath() {
  const pathEl = document.querySelector(SELECTORS.animatePath);
  const curPosEl = document.querySelector(SELECTORS.curPosition);
  if (!pathEl || !curPosEl || state.points.length < 2) return;

  const steps = calculateInterpolationSteps(state.points, state.t);
  let animatePathData = "";

  // 1단계부터 마지막 직전 단계까지 모든 보간 선분의 골격 조립
  // 예: 4개 제어점 시 [[P'0, P'1, P'2], [P''0, P''1]]의 선분을 조립
  for (let s = 0; s < steps.length - 1; s++) {
    const layer = steps[s];
    if (layer.length > 0) {
      animatePathData += ` M ${layer[0].x},${layer[0].y} L`;
      for (let i = 1; i < layer.length; i++) {
        animatePathData += ` ${layer[i].x},${layer[i].y}`;
      }
    }
  }

  pathEl.setAttribute("d", animatePathData);

  // 최종 수렴 포인트 위치 설정
  const finalPoint = getBezierPointAtT(state.points, state.t);
  curPosEl.setAttribute("cx", finalPoint.x);
  curPosEl.setAttribute("cy", finalPoint.y);
}

/**
 * 최종 빨간색 베지어 곡선(Bezier Path)을 렌더링합니다.
 * (하위 호환성과 정밀도를 위해 n개 단계로 나뉜 일반화 궤적을 렌더링)
 */
function drawBezierPath() {
  const pathEl = document.querySelector(SELECTORS.bezierPath);
  if (!pathEl || state.points.length < 2) return;

  let pathData = "";

  if (state.points.length === 2) {
    // 1차 선형
    pathData = `M ${state.points[0].x},${state.points[0].y} L ${state.points[1].x},${state.points[1].y}`;
  } else if (state.points.length === 3) {
    // 2차 베지어 (Q 커맨드 사용)
    pathData = `M ${state.points[0].x},${state.points[0].y} Q ${state.points[1].x},${state.points[1].y} ${state.points[2].x},${state.points[2].y}`;
  } else if (state.points.length === 4) {
    // 3차 베지어 (C 커맨드 사용)
    pathData = `M ${state.points[0].x},${state.points[0].y} C ${state.points[1].x},${state.points[1].y} ${state.points[2].x},${state.points[2].y} ${state.points[3].x},${state.points[3].y}`;
  } else {
    // 5개 제어점 이상 고차 베지어 곡선의 경우, t를 100등분하여 궤적 라인들을 연결
    const steps = 100;
    const pathPoints = [];
    for (let i = 0; i <= steps; i++) {
      const tempT = i / steps;
      pathPoints.push(getBezierPointAtT(state.points, tempT));
    }
    pathData = `M ${pathPoints[0].x},${pathPoints[0].y} L`;
    for (let i = 1; i < pathPoints.length; i++) {
      pathData += ` ${pathPoints[i].x},${pathPoints[i].y}`;
    }
  }

  pathEl.setAttribute("d", pathData);
}

/**
 * 상단 및 좌측 좌표 눈금자(Ruler)를 생성하여 렌더링합니다.
 */
function drawRulers() {
  const container = document.querySelector(SELECTORS.rulerContainer);
  const svgEl = document.querySelector(SELECTORS.svg);
  if (!container || !svgEl) return;

  container.innerHTML = ""; // 기존 눈금자 소거

  const width = svgEl.clientWidth || 800;
  const height = svgEl.clientHeight || 550;
  const rulerWidth = 35; // 좌측 눈금자 폭
  const rulerHeight = 25; // 상단 눈금자 높이

  // 1. 눈금자 배경 Rect 생성
  // 상단 배경
  const topBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  topBg.setAttribute("x", 0);
  topBg.setAttribute("y", 0);
  topBg.setAttribute("width", width);
  topBg.setAttribute("height", rulerHeight);
  topBg.setAttribute("class", "ruler-bg");
  container.appendChild(topBg);

  // 좌측 배경
  const leftBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  leftBg.setAttribute("x", 0);
  leftBg.setAttribute("y", 0);
  leftBg.setAttribute("width", rulerWidth);
  leftBg.setAttribute("height", height);
  leftBg.setAttribute("class", "ruler-bg");
  container.appendChild(leftBg);

  // 2. 가로(상단) 눈금자 마크 및 텍스트 생성
  // 좌측 눈금자 영역(35px) 이후부터 10px 간격으로 마크
  for (let x = rulerWidth; x < width; x += 10) {
    const isMajor = ((x - rulerWidth) % 50 === 0);
    const tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
    tick.setAttribute("x1", x);
    tick.setAttribute("x2", x);
    
    if (isMajor) {
      tick.setAttribute("y1", rulerHeight - 8);
      tick.setAttribute("y2", rulerHeight);
      tick.setAttribute("class", "ruler-tick-major");
      
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", x - 6);
      text.setAttribute("y", 12);
      text.setAttribute("class", "ruler-text");
      text.textContent = x - rulerWidth; // 눈금자 원점은 35px 지점
      container.appendChild(text);
    } else {
      tick.setAttribute("y1", rulerHeight - 4);
      tick.setAttribute("y2", rulerHeight);
      tick.setAttribute("class", "ruler-tick");
    }
    container.appendChild(tick);
  }

  // 3. 세로(좌측) 눈금자 마크 및 텍스트 생성
  // 상단 눈금자 영역(25px) 이후부터 10px 간격으로 마크
  for (let y = rulerHeight; y < height; y += 10) {
    const isMajor = ((y - rulerHeight) % 50 === 0);
    const tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
    tick.setAttribute("y1", y);
    tick.setAttribute("y2", y);

    if (isMajor) {
      tick.setAttribute("x1", rulerWidth - 8);
      tick.setAttribute("x2", rulerWidth);
      tick.setAttribute("class", "ruler-tick-major");

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", 4);
      text.setAttribute("y", y + 3);
      text.setAttribute("class", "ruler-text");
      text.textContent = y - rulerHeight; // 눈금자 원점은 25px 지점
      container.appendChild(text);
    } else {
      tick.setAttribute("x1", rulerWidth - 4);
      tick.setAttribute("x2", rulerWidth);
      tick.setAttribute("class", "ruler-tick");
    }
    container.appendChild(tick);
  }

  // 4. 눈금자 모서리 교차 영역 커버링용 Rect 생성 (좌상단 0,0 ~ 35,25)
  const corner = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  corner.setAttribute("x", 0);
  corner.setAttribute("y", 0);
  corner.setAttribute("width", rulerWidth);
  corner.setAttribute("height", rulerHeight);
  corner.setAttribute("fill", "#fafafa");
  corner.setAttribute("stroke", "#e5e7eb");
  corner.setAttribute("stroke-width", 1);
  container.appendChild(corner);
}
