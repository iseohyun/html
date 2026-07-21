/**
 * chart.js
 * SVG를 이용한 막대 그래프 드로잉, Y축 가이드 라인 생성 및 애니메이션 처리를 담당합니다.
 * simulation.js에서 계산된 state 데이터를 기반으로 화면을 갱신합니다.
 */

/**
 * SVG 내부의 막대 및 라벨 요소를 초기 생성하여 캐싱합니다.
 */
function initChart() {
  console.log('[Chart] initChart() called.');
  const svg = document.querySelector(SELECTORS.svg);
  console.log('[Chart] SVG element lookup:', svg);
  if (!svg) {
    console.error('[Chart] ERROR: SVG element not found in DOM!');
    return;
  }

  // 기존 동적 생성된 rect 및 text 요소 정리 (#vertical-text 그룹 내부의 text는 유지)
  const dynamicElements = svg.querySelectorAll('rect, text');
  console.log(`[Chart] Cleaning up ${dynamicElements.length} existing elements from SVG.`);
  dynamicElements.forEach(el => {
    if (!el.closest('#vertical-text')) {
      el.remove();
    }
  });

  state.chartElements.bars = [];
  state.chartElements.values = [];
  state.chartElements.labels = [];

  const categories = ["남아선호사상", "1가구 2자녀"];

  // 4개의 막대와 상단 값 표시 텍스트 생성
  for (let i = 0; i < 4; i++) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');

    rect.setAttribute('fill', CHART_CONFIG.colors[i]);
    rect.setAttribute('rx', '4');

    svg.appendChild(rect);
    svg.appendChild(text);

    state.chartElements.bars.push(rect);
    state.chartElements.values.push(text);
  }

  // 2개의 카테고리 라벨 텍스트 생성
  for (let i = 0; i < 2; i++) {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.innerHTML = categories[i];
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('fill', '#444');
    svg.appendChild(text);
    state.chartElements.labels.push(text);
  }
  console.log('[Chart] initChart() finished creating bars and labels.');
}

/**
 * 차트의 전체 구도 배치 및 Y축 그리드라인을 그리고 애니메이션을 시작합니다.
 */
function redrawChart() {
  console.log('[Chart] redrawChart() called.');
  const svg = document.querySelector(SELECTORS.svg);
  if (!svg) {
    console.error('[Chart] redrawChart failed: SVG not found.');
    return;
  }

  const chartX = svg.clientWidth || svg.width.baseVal.value || 800;
  const chartY = CHART_CONFIG.chartHeight;
  const max = state.animation.maxVal || 105;
  const barWidth = CHART_CONFIG.barWidth;

  console.log('[Chart] Layout metrics:', { chartX, chartY, max, barWidth });

  // 바닥 가로선 좌표 갱신
  const bottomLine = document.getElementById("bottom-line");
  if (bottomLine) {
    bottomLine.setAttribute("d", `M10 350 h${chartX - 20}`);
    console.log('[Chart] Bottom line path updated.');
  } else {
    console.warn('[Chart] WARNING: #bottom-line element not found.');
  }

  const categoryCount = 2;

  // 각 카테고리 및 내부 막대들의 가로 배치 설정
  for (let i = 0; i < categoryCount; i++) {
    const label = state.chartElements.labels[i];
    label.setAttribute("y", chartY + 70); // Y: 370px

    const centerX = (chartX / (categoryCount + 1)) * (i + 1);
    
    // getBoundingClientRect는 렌더링된 이후 정확하나 기본값 fallback 지정
    const labelWidth = label.getBoundingClientRect().width || 90;
    label.setAttribute("x", centerX - labelWidth / 2);

    for (let j = 0; j < 2; j++) {
      const idx = i * 2 + j;
      const bar = state.chartElements.bars[idx];
      const valText = state.chartElements.values[idx];

      const totalBarGroupWidth = barWidth * 2 + 8; // 막대 2개 너비 + 여백
      const startX = centerX - totalBarGroupWidth / 2;
      const barX = startX + (barWidth + 8) * j;

      bar.setAttribute("x", barX);
      bar.setAttribute("width", barWidth);

      valText.setAttribute("x", barX);
      valText.setAttribute("y", chartY + 40);
    }
  }

  // Y축 기준선 렌더링
  drawGridLines(chartX, chartY, max);

  // 애니메이션 효과 갱신 시작
  startChartAnimation();
}

/**
 * Y축 기준선 및 눈금 텍스트 생성
 */
function drawGridLines(chartX, chartY, max) {
  const verticalGridline = document.getElementById('vertical-grideline');
  const verticalText = document.getElementById('vertical-text');
  if (!verticalGridline || !verticalText) return;

  verticalGridline.innerHTML = '';
  verticalText.innerHTML = '';

  let tmpMax = max;
  let yUnit = 1;

  while (tmpMax > 10) {
    tmpMax /= 10;
    yUnit *= 10;
  }

  if (tmpMax >= 3) {
    tmpMax = Math.floor(tmpMax);
  } else {
    yUnit /= 2;
    tmpMax *= 2;
    tmpMax = Math.floor(tmpMax);
  }

  const numOfLines = tmpMax - 1;

  for (let i = 1; i <= numOfLines; i++) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const Y = chartY + 50 - ((chartY / (numOfLines + 1)) * i);
    const d = `M20 ${Y} H${chartX - 20}`;
    path.setAttribute('d', d);
    verticalGridline.appendChild(path);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', 15);
    text.setAttribute('y', Y - 5);
    text.innerHTML = formatCompactKorean(yUnit * i);
    verticalText.appendChild(text);
  }
}

/**
 * 10ms 단위로 막대 높이를 서서히 차오르게 하는 애니메이션 효과
 */
function startChartAnimation() {
  console.log('[Chart] startChartAnimation() triggered.');
  if (state.animation.timer) {
    console.log('[Chart] Clearing existing timer:', state.animation.timer);
    clearInterval(state.animation.timer);
    state.animation.timer = null;
  }

  state.animation.progress = 0;

  state.animation.timer = setInterval(() => {
    if (state.animation.progress >= 1) {
      console.log('[Chart] Animation complete. Stopping timer.');
      clearInterval(state.animation.timer);
      state.animation.timer = null;
      state.animation.progress = 1;
      drawBars();
      return;
    }

    state.animation.progress += CHART_CONFIG.animationStep;
    drawBars();
  }, CHART_CONFIG.animationIntervalMs);
  console.log('[Chart] New timer registered with ID:', state.animation.timer);
}

/**
 * 현재 애니메이션 진행 상태(progress)에 맞춰 막대 높이와 텍스트 값 표시
 */
function drawBars() {
  const chartY = CHART_CONFIG.chartHeight;
  const max = state.animation.maxVal || 105;
  const progress = state.animation.progress;
  const barWidth = CHART_CONFIG.barWidth;

  const values = [
    state.simulationData.sonPrefer.male,
    state.simulationData.sonPrefer.female,
    state.simulationData.twoChildren.male,
    state.simulationData.twoChildren.female
  ];

  for (let i = 0; i < 4; i++) {
    const currentVal = Math.floor(values[i] * progress);
    const barHeight = (currentVal / max) * chartY;
    const Y = chartY - barHeight + 50;

    const bar = state.chartElements.bars[i];
    const valText = state.chartElements.values[i];

    if (bar && valText) {
      bar.setAttribute("y", Y);
      bar.setAttribute("height", barHeight);

      valText.innerHTML = formatCompactKorean(currentVal);
      valText.setAttribute("y", Y - 8);

      const textWidth = valText.getBoundingClientRect().width || 45;
      const barX = parseFloat(bar.getAttribute("x"));
      
      if (isNaN(barX)) {
        console.warn(`[Chart] WARNING: barX is NaN for bar index ${i}. Using default 0.`);
        valText.setAttribute("x", barWidth / 2 - textWidth / 2);
      } else {
        valText.setAttribute("x", barX + barWidth / 2 - textWidth / 2);
      }
    } else {
      console.error(`[Chart] ERROR: Missing bar or valText element cache at index ${i}!`, { bar, valText });
    }
  }
}

/**
 * 만, 억 단위 한국식 숫자 변환기 (만 단위 소수점 1자리, 억 단위 소수점 2자리, 만 미만 정수)
 */
function formatCompactKorean(number) {
  const val = Number(number);
  if (isNaN(val)) return "0";
  
  if (val >= 100000000) {
    return (val / 100000000).toFixed(2) + "억";
  }
  if (val >= 10000) {
    return (val / 10000).toFixed(1) + "만";
  }
  return Math.round(val).toString();
}

/**
 * 실시간 시뮬레이션 진척 데이터를 즉각 화면에 드로잉합니다.
 * 애니메이션 타이머를 멈추고 현재 데이터 그대로 그리드와 막대를 즉시 그립니다.
 */
function updateChartRealtime() {
  if (state.animation.timer) {
    clearInterval(state.animation.timer);
    state.animation.timer = null;
  }
  
  const svg = document.querySelector(SELECTORS.svg);
  if (!svg) return;
  
  const chartX = svg.clientWidth || svg.width.baseVal.value || 800;
  const chartY = CHART_CONFIG.chartHeight;
  const max = state.animation.maxVal || 105;
  
  // Y축 기준선 갱신
  drawGridLines(chartX, chartY, max);
  
  // 막대 직접 그리기
  state.animation.progress = 1.0;
  drawBars();
}
