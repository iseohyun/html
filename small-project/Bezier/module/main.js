/**
 * main.js
 * 프로그램의 시작점으로서 DOM 로딩 완료 이벤트, 사용자 제어 인터랙션, 주소창 파라미터 싱크 및 애니메이션 라이프사이클을 주관합니다.
 */

// 부모 SPA 호스트 웹사이트가 본문 콘텐츠를 비동기로 가져와 주입하더라도 정상 기동하도록 처리
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  // 즉시 실행
  initApp();
}

/**
 * 앱 구동 초기화 함수
 */
function initApp() {
  console.log('[Bezier] initApp() called.');
  
  // 1. 격자 및 SVG 뷰포트 정렬
  resizeGround();
  
  // 2. URL 매개변수로부터 제어점 좌표 복원 및 로드
  loadPointsFromUrl();
  
  // 3. 제어점 SVG 동적 렌더링
  renderControlPoints();
  
  // 4. 초기 곡선 및 보조선 그리기
  drawPath();
  
  // 5. 버튼 상태 업데이트
  updateButtonStates();
  
  // 6. 이벤트 바인더 연결
  setupEvents();

  // 7. 창 크기 변경 시 격자 영역 동적 리사이즈 리스너
  window.addEventListener('resize', () => {
    resizeGround();
    drawPath();
  });
}

/**
 * URL 파라미터 `?p=rx1,ry1,rx2,ry2...` 로부터 0~1 상대좌표를 읽어 픽셀 좌표로 변환 로드합니다.
 */
function loadPointsFromUrl() {
  const svgEl = document.querySelector(SELECTORS.svg);
  const width = svgEl ? svgEl.clientWidth : 800;
  const height = svgEl ? svgEl.clientHeight : 550;

  state.points = [];

  // 1. window.location.search 와 window.location.hash 에서 ?p= 파라미터 획득
  let paramP = null;
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.has('p')) {
    paramP = searchParams.get('p');
  } else {
    const hashStr = window.location.hash;
    const queryIdx = hashStr.indexOf('?');
    if (queryIdx !== -1) {
      const hashParams = new URLSearchParams(hashStr.slice(queryIdx));
      paramP = hashParams.get('p');
    }
  }

  if (!paramP) {
    // 쿼리 매개변수가 없을 시 디폴트 3개 제어점 지정 (2차 베지어)
    state.points = [
      { x: 0.15 * width, y: 0.75 * height },
      { x: 0.50 * width, y: 0.15 * height },
      { x: 0.85 * width, y: 0.75 * height }
    ];
  } else {
    const coords = paramP.split(',');
    for (let i = 0; i < coords.length - 1; i += 2) {
      const rx = parseFloat(coords[i]);
      const ry = parseFloat(coords[i + 1]);
      if (!isNaN(rx) && !isNaN(ry)) {
        state.points.push({
          x: rx * width,
          y: ry * height
        });
      }
    }

    // 제어점 개수 최소/최대 예외 방어 가드 (최소 2개)
    if (state.points.length < 2) {
      state.points = [
        { x: 0.15 * width, y: 0.75 * height },
        { x: 0.85 * width, y: 0.75 * height }
      ];
    }
  }

  // 로드된 현재의 위치를 URL 쿼리 파라미터에 동기화
  syncUrlParams();
}

/**
 * 새로고침(F5) 시 현재 좌표를 그대로 복구할 수 있도록 주소창의 쿼리 매개변수를 동기화합니다.
 * (history.replaceState를 활용해 화면 깜빡임/리로드 없이 URL만 동기화)
 */
function syncUrlParams() {
  const svgEl = document.querySelector(SELECTORS.svg);
  if (!svgEl) return;

  const width = svgEl.clientWidth || 800;
  const height = svgEl.clientHeight || 550;

  const paramList = [];
  state.points.forEach(pt => {
    const rx = Math.round((pt.x / width) * 1000) / 1000;
    const ry = Math.round((pt.y / height) * 1000) / 1000;
    paramList.push(`${rx},${ry}`);
  });

  const baseHash = window.location.hash.split('?')[0] || "";
  const newUrl = window.location.pathname + baseHash + `?p=${paramList.join(',')}`;
  window.history.replaceState(null, "", newUrl);
}

/**
 * 제어점 개수 제한(최소 2개, 최대 4개)에 맞춰 버튼 활성/비활성 처리
 */
function updateButtonStates() {
  const addBtn = document.querySelector(SELECTORS.addBtn);
  const removeBtn = document.querySelector(SELECTORS.removeBtn);

  if (addBtn) addBtn.disabled = false; // 상한선 전면 해제
  if (removeBtn) removeBtn.disabled = (state.points.length <= 2);
}

/**
 * DOM 컨트롤 버튼 및 슬라이더에 대한 이벤트 리스너 바인딩
 */
function setupEvents() {
  const playBtn = document.querySelector(SELECTORS.playBtn);
  const tRange = document.querySelector(SELECTORS.tRange);
  const addBtn = document.querySelector(SELECTORS.addBtn);
  const removeBtn = document.querySelector(SELECTORS.removeBtn);
  const reloadBtn = document.querySelector(SELECTORS.reloadBtn);

  // 1. Play / Pause 버튼 이벤트
  if (playBtn) {
    playBtn.addEventListener('click', toggleAnimation);
  }

  // 2. t 슬라이더 입력 이벤트 (실시간 드래깅 감지)
  if (tRange) {
    // 기본 슬라이더 밸류 동기화
    tRange.value = state.t * 1000;
    
    tRange.addEventListener('input', (e) => {
      state.t = e.target.value / 1000;
      drawAnimatePath();
    });

    tRange.addEventListener('mousedown', () => {
      state.isDraggingT = true;
      if (state.timer) {
        pauseAnimation();
      }
    });

    tRange.addEventListener('mouseup', () => {
      state.isDraggingT = false;
    });
  }

  // 3. 제어점 추가 (+) 버튼 이벤트 (페이지 리로드 제거)
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const svgEl = document.querySelector(SELECTORS.svg);
      const width = svgEl ? svgEl.clientWidth : 800;
      const height = svgEl ? svgEl.clientHeight : 550;

      // 중앙 부분에 새 제어점 생성 삽입
      state.points.push({
        x: width / 2,
        y: height / 2
      });

      renderControlPoints();
      drawPath();
      updateButtonStates();
      syncUrlParams();
    });
  }

  // 4. 제어점 제거 (-) 버튼 이벤트 (페이지 리로드 제거)
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      if (state.points.length > 2) {
        state.points.pop();
        renderControlPoints();
        drawPath();
        updateButtonStates();
        syncUrlParams();
      }
    });
  }

  // 5. Reload (Reset) 버튼 이벤트 (깜빡이는 페이지 리로드를 스마트한 원복 리셋으로 대체)
  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => {
      pauseAnimation();
      
      // t 값 중앙값으로 초기화 및 슬라이더 복원
      state.t = 0.5;
      if (tRange) {
        tRange.value = 500;
      }
      
      // 디폴트 주소 쿼리로 변환 및 좌표 전면 리로드 (해시 경로 보존)
      const baseHash = window.location.hash.split('?')[0] || "";
      window.history.replaceState(null, "", window.location.pathname + baseHash);
      loadPointsFromUrl();
      renderControlPoints();
      drawPath();
      updateButtonStates();
    });
  }
}

/**
 * 애니메이션 재생 및 일시정지 토글
 */
function toggleAnimation() {
  if (state.timer) {
    pauseAnimation();
  } else {
    startAnimation();
  }
}

/**
 * 애니메이션 시작 루프 구동
 */
function startAnimation() {
  const playBtn = document.querySelector(SELECTORS.playBtn);
  const tRange = document.querySelector(SELECTORS.tRange);
  if (playBtn) playBtn.textContent = "Pause";

  // t가 끝에 가있으면 다시 처음부터 시작
  if (state.t >= 1.0) {
    state.t = 0.0;
    if (tRange) tRange.value = 0;
  }

  state.timer = setInterval(() => {
    state.t += 0.005;
    
    if (state.t >= 1.0) {
      state.t = 1.0;
      if (tRange) tRange.value = 1000;
      drawAnimatePath();
      pauseAnimation();
      return;
    }

    if (tRange) tRange.value = state.t * 1000;
    drawAnimatePath();
  }, 30);
}

/**
 * 애니메이션 타이머 중지 및 정지 처리
 */
function pauseAnimation() {
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }
  const playBtn = document.querySelector(SELECTORS.playBtn);
  if (playBtn) playBtn.textContent = "Play";
}
