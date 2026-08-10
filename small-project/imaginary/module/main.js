/**
 * main.js
 * 복소평면 시뮬레이션의 이벤트 흐름 제어, 라이프사이클 관리 및 화면 무깜빡임 실시간 URL 동기화를 담당합니다.
 */

// 페이지 로딩 시 앱 기동
function initApp() {
  console.log('[Imaginary] initApp() called.');

  initReadUrl();
  setBackgroundSize();
  drawRulers();
  drawCoordinateAxes();
  drawConcentricCircles();
  initPoints();
  drawControlPath();
  drawAnimatePath(state.A, state.B);

  // 5. DOM 이벤트 바인딩
  setupEventBindings();
}

/**
 * URL 또는 해시 경로 뒤에 붙은 쿼리 파라미터(?p=...&z=...)를 파싱하여 전역 상태를 복원합니다.
 */
function initReadUrl() {
  var searchStr = window.location.search;
  
  // SPA 특성상 해시 뒤에 쿼리가 붙어 들어오는 경우 대응 (예: #/small-project/imaginary/index.html?p=...)
  var hash = window.location.hash;
  if (hash.includes("?")) {
    searchStr = hash.substring(hash.indexOf("?"));
  }

  var urlParams = new URLSearchParams(searchStr);
  var param_P = urlParams.get('p');
  
  state.points = [];
  if (param_P) {
    var parts = param_P.split(',');
    var tempX = null;
    parts.forEach((val, idx) => {
      if (idx % 2 === 0) {
        tempX = parseFloat(val);
      } else {
        state.points.push({ x: tempX, y: parseFloat(val) });
      }
    });
  }

  // 데이터가 유실되었거나 없을 시 기본 좌표 부여 (Z1: 1+i, Z2: 1-i)
  if (state.points.length < 2) {
    state.points = [{ x: 1, y: 1 }, { x: 1, y: -1 }];
  }

  var param_Z = urlParams.get('z');
  if (param_Z) {
    state.unit = parseInt(param_Z, 10);
  }
}

/**
 * 제어점들을 화면에 드로잉하고 마우스 드래그 동작을 연결합니다.
 */
function initPoints() {
  var svgEl = document.querySelector(SELECTORS.svg);
  if (!svgEl) return;

  // 기존 동적 제어점 그룹 노드가 있다면 일괄 소거
  svgEl.querySelectorAll("g[id^='svg-ptr']").forEach(el => el.remove());

  var centerX = svgEl.clientWidth / 2;
  var centerY = svgEl.clientHeight / 2;

  state.points.forEach((pt, i) => {
    // 픽셀 공간 좌표로 복원
    var svgPos = coordinatesToSvg(pt, state.unit, svgEl.clientWidth, svgEl.clientHeight);
    pt.x = svgPos.x;
    pt.y = svgPos.y;

    // SVG Node 구성
    var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute('id', 'svg-ptr' + i);
    g.setAttribute("transform", `translate(${pt.x}, ${pt.y})`);

    var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute('r', '5');
    circle.setAttribute('fill', 'white');
    circle.setAttribute('stroke', '#EBC48E');
    circle.setAttribute('stroke-width', '2');
    circle.setAttribute('cx', '0');
    circle.setAttribute('cy', '0');
    circle.style.cursor = 'pointer';
    g.appendChild(circle);

    var text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.style.fontSize = '14px';
    text.style.fontWeight = 'bold';
    text.style.fontFamily = 'monospace';
    text.textContent = (i + 1);
    g.appendChild(text);

    adjustTextLabelPosition(g, pt.x, pt.y);
    pt.g = g;

    // 드래그 마우스 다운 이벤트
    g.onmousedown = function (e) {
      e.preventDefault();
      state.target = { element: g, index: i };

      // 드래그 시작 시 해당 제어점 툴팁 즉시 갱신 노출
      updatePointTooltip(i, pt.x, pt.y);

      // 드래그 중인 상태를 보조하기 위해 십자 가이드라인 즉시 투사
      updateDragGuideLine(pt.x, pt.y, true);

      svgEl.onmousemove = function (ev) {
        if (state.target !== undefined) {
          var rect = svgEl.getBoundingClientRect();
          var mouseX = ev.clientX - rect.left;
          var mouseY = ev.clientY - rect.top;

          // 눈금자와 겹침을 방지하기 위한 최소 바운드 가드 제약
          var boundedX = Math.max(35, Math.min(mouseX, svgEl.clientWidth));
          var boundedY = Math.max(25, Math.min(mouseY, svgEl.clientHeight));

          state.points[state.target.index].x = boundedX;
          state.points[state.target.index].y = boundedY;

          adjustTextLabelPosition(state.target.element, boundedX, boundedY);
          state.target.element.setAttribute("transform", `translate(${boundedX}, ${boundedY})`);

          // 툴팁 수치 및 좌표 실시간 업데이트
          updatePointTooltip(state.target.index, boundedX, boundedY);

          // 십자 가이드라인 동적 추적 업데이트
          updateDragGuideLine(boundedX, boundedY, true);

          drawControlPath();
          drawAnimatePath(state.A, state.B);
        }
      };

      svgEl.onmouseup = function () {
        state.target = undefined;
        svgEl.onmousemove = null;
        // 십자 가이드라인 소거
        updateDragGuideLine(0, 0, false);
        // 드래그 완료 후 조용하게 URL 갱신 동기화
        syncUrlParams();
      };
    };

    svgEl.appendChild(g);
  });

  // 빨간색 현재 연산점 초기 설정
  var zeroPt = coordinatesToSvg({ x: 0, y: 0 }, state.unit, svgEl.clientWidth, svgEl.clientHeight);
  var curPos = document.getElementById('cur-position');
  if (curPos) {
    curPos.setAttribute('cx', zeroPt.x);
    curPos.setAttribute('cy', zeroPt.y);
  }
}

/**
 * 화면 새로고침(깜빡임) 없이 조용하게 브라우저 주소창의 파라미터 상태를 갱신합니다.
 * 부모 SPA 프레임의 해시 경로를 동적으로 검수 보존합니다.
 */
function syncUrlParams() {
  var svgEl = document.querySelector(SELECTORS.svg);
  if (!svgEl) return;

  var param_P = "";
  state.points.forEach(pt => {
    var coord = svgToCoordinates({ x: pt.x, y: pt.y }, state.unit, svgEl.clientWidth, svgEl.clientHeight);
    param_P += T(coord.x) + "," + T(coord.y) + ",";
  });
  if (param_P.endsWith(",")) {
    param_P = param_P.slice(0, -1);
  }

  // 부모 SPA 해시 주소 영역 검수 및 보존
  var baseHash = window.location.hash.split("?")[0] || "#/small-project/imaginary/index.html";
  var newUrl = window.location.pathname + baseHash + "?p=" + param_P + "&z=" + state.unit;
  window.history.replaceState(null, "", newUrl);
}



/**
 * 이벤트 바인딩 설정 및 윈도우 생명주기 누수 클린업 큐 등록
 */
function setupEventBindings() {
  // 1. Play/Pause 애니메이션 버튼 연동
  var playBtn = document.querySelector(SELECTORS.playBtn);
  if (playBtn) {
    playBtn.onclick = function() {
      if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
        playBtn.textContent = "play";
      } else {
        playBtn.textContent = "pause";
        state.timer = setInterval(function() {
          if (state.t >= 1) {
            clearInterval(state.timer);
            state.timer = null;
            state.t = 0.0;
            playBtn.textContent = "play";
            var tRange = document.querySelector(SELECTORS.tRange);
            if (tRange) tRange.value = 0;
            return;
          }

          state.t += 0.02;
          var tRange = document.querySelector(SELECTORS.tRange);
          if (tRange) tRange.value = state.t * 1000;
          drawAnimatePath(state.A, state.B);
        }, 30);
      }
    };
  }

  // 2. Timer (t-value) 슬라이더 연동
  var tRange = document.querySelector(SELECTORS.tRange);
  if (tRange) {
    tRange.oninput = function() {
      // 드래그 동작 시 애니메이션을 즉각 멈춥니다
      if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
        var playBtn = document.querySelector(SELECTORS.playBtn);
        if (playBtn) playBtn.textContent = "play";
      }
      state.t = tRange.value / 1000;
      drawAnimatePath(state.A, state.B);
    };
  }

  // 3. 마우스 휠(wheel) 줌인/줌아웃 이벤트 연동
  var handleWheelZoom = function(e) {
    var svgEl = document.querySelector(SELECTORS.svg);
    if (!svgEl) return;
    
    // 이벤트 타겟이 SVG 노드 내부이거나 SVG 자체인 경우에만 작동
    if (svgEl.contains(e.target) || e.target === svgEl) {
      e.preventDefault(); // 본문 페이지 스크롤 방지
      
      var width = svgEl.clientWidth || 800;
      var height = svgEl.clientHeight || 550;

      // 1) 기존 포인트들의 위치를 수학적 절대값 좌표로 임시 백업
      var backups = state.points.map(pt => {
        return svgToCoordinates({ x: pt.x, y: pt.y }, state.unit, width, height);
      });

      // 2) 휠 스크롤 방향에 따라 unit 가감 (임계 제한 30 ~ 300)
      var zoomStep = 10;
      if (e.deltaY < 0) {
        state.unit = Math.min(300, state.unit + zoomStep);
      } else {
        state.unit = Math.max(30, state.unit - zoomStep);
      }

      // 3) 백업 좌표를 확대 축소된 픽셀 좌표로 환산하여 제어점 노드 이동 적용
      state.points.forEach((pt, i) => {
        var nextPx = coordinatesToSvg(backups[i], state.unit, width, height);
        pt.x = nextPx.x;
        pt.y = nextPx.y;
        
        var svg_ptr = document.getElementById("svg-ptr" + i);
        if (svg_ptr) {
          svg_ptr.setAttribute("transform", `translate(${pt.x}, ${pt.y})`);
          adjustTextLabelPosition(svg_ptr, pt.x, pt.y);
        }
      });

      // 4) 보조 요소들 동기화 갱신
      drawControlPath();
      drawConcentricCircles();
      drawCoordinateAxes();
      drawRulers();
      drawAnimatePath(state.A, state.B);

      // 5) 활성화된 툴팁 리포지셔닝
      state.points.forEach((pt, idx) => {
        var tooltipEl = document.getElementById('imaginary-tooltip-' + idx);
        if (tooltipEl && tooltipEl.style.display !== 'none') {
          updatePointTooltip(idx, pt.x, pt.y);
        }
      });

      syncUrlParams();
    }
  };

  window.addEventListener("wheel", handleWheelZoom, { passive: false });
  window.activeWindowListeners = window.activeWindowListeners || [];
  window.activeWindowListeners.push({ type: "wheel", fn: handleWheelZoom });

  // 4. 리사이즈 윈도우 리스너 바인딩 및 전역 추적 큐 등록 (누수 방어)
  var handleResize = function() {
    var svgEl = document.querySelector(SELECTORS.svg);
    if (!svgEl) return;

    var width = svgEl.clientWidth || 800;
    var height = svgEl.clientHeight || 550;

    // 만약 최초 로드 후 드로잉이 아예 실행되지 않은 빈 상태라면 포인트 생성부터 태웁니다.
    if (state.points.length > 0 && !state.points[0].g) {
      setBackgroundSize();
      drawRulers();
      drawCoordinateAxes();
      drawConcentricCircles();
      initPoints();
      drawControlPath();
      drawAnimatePath(state.A, state.B);
      return;
    }

    // 리사이즈 전 상대적 위치 보존을 위한 수학적 복소 좌표 백업
    var backups = state.points.map(pt => {
      return svgToCoordinates({ x: pt.x, y: pt.y }, state.unit, width, height);
    });

    setBackgroundSize();
    drawRulers();
    drawCoordinateAxes();
    drawConcentricCircles();

    // 픽셀 공간 상 위치 재배치
    state.points.forEach((pt, i) => {
      var nextPx = coordinatesToSvg(backups[i], state.unit, width, height);
      pt.x = nextPx.x;
      pt.y = nextPx.y;

      var svg_ptr = document.getElementById("svg-ptr" + i);
      if (svg_ptr) {
        svg_ptr.setAttribute("transform", `translate(${pt.x}, ${pt.y})`);
        adjustTextLabelPosition(svg_ptr, pt.x, pt.y);
      }
    });

    drawControlPath();
    drawAnimatePath(state.A, state.B);

    // 활성화된 툴팁 리포지셔닝
    state.points.forEach((pt, idx) => {
      var tooltipEl = document.getElementById('imaginary-tooltip-' + idx);
      if (tooltipEl && tooltipEl.style.display !== 'none') {
        updatePointTooltip(idx, pt.x, pt.y);
      }
    });
  };

  var svgEl = document.querySelector(SELECTORS.svg);
  var resizeObserver = new ResizeObserver(function(entries) {
    for (var entry of entries) {
      handleResize();
    }
  });
  if (svgEl) {
    resizeObserver.observe(svgEl);
    window.activeResizeObservers = window.activeResizeObservers || [];
    window.activeResizeObservers.push(resizeObserver);
  }

  window.addEventListener("resize", handleResize);
  window.activeWindowListeners = window.activeWindowListeners || [];
  window.activeWindowListeners.push({ type: "resize", fn: handleResize });
}

// 윈도우 전역 노출 바인딩 설정
window.initApp = initApp;

// SPA 기동 검수
function checkAndInit() {
  if (document.readyState === "complete" || document.readyState === "interactive") {
    initApp();
  } else {
    document.addEventListener("DOMContentLoaded", initApp);
  }
}
checkAndInit();
