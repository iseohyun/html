/**
 * main.js
 * 프로그램의 시작점으로서 DOM 로딩 완료 이벤트, 사용자 상호작용 및 리사이즈 이벤트를 관리합니다.
 * 인라인 Blob Web Worker를 내장하여 SPA 동적 로드 시 발생하는 404 경로 예외를 원천적으로 차단합니다.
 */

// 인라인 웹 워커 소스코드 정의 (파일 경로 404 방지용 Blob 이식)
const SIMULATION_WORKER_CODE = `
self.onmessage = function(e) {
  const { householdsCount, sexRatio } = e.data;

  let sonPreferMale = 0;
  let sonPreferFemale = 0;
  let twoChildrenMale = 0;
  let twoChildrenFemale = 0;

  // 진척률 스트리밍 보고 주기 계산 (총 가구 수의 1% 단위, 최소 10가구 단위)
  const updateStep = Math.max(10, Math.floor(householdsCount / 100));

  for (let i = 0; i < householdsCount; i++) {
    let birth;

    // 1. 남아선호사상 시뮬레이션
    do {
      birth = Math.random() * (sexRatio + 100);
      if (birth < sexRatio) {
        sonPreferMale++;
      } else {
        sonPreferFemale++;
      }
    } while (birth >= sexRatio);

    // 2. 1가구 2자녀 시뮬레이션
    for (let c = 0; c < 2; c++) {
      const birthChild = Math.random() * (sexRatio + 100);
      if (birthChild < sexRatio) {
        twoChildrenMale++;
      } else {
        twoChildrenFemale++;
      }
    }

    // 중간 실시간 보고 전송
    if (i > 0 && i % updateStep === 0) {
      self.postMessage({
        type: 'progress',
        percent: Math.round((i / householdsCount) * 100),
        data: {
          sonPrefer: { male: sonPreferMale, female: sonPreferFemale },
          twoChildren: { male: twoChildrenMale, female: twoChildrenFemale }
        }
      });
    }
  }

  // 최종 연산 완료 및 결과 전송
  self.postMessage({
    type: 'complete',
    percent: 100,
    data: {
      sonPrefer: {
        male: sonPreferMale,
        female: sonPreferFemale
      },
      twoChildren: {
        male: twoChildrenMale,
        female: twoChildrenFemale
      }
    }
  });
};
`;

// Web Worker 및 Blob URL 인스턴스 홀더
let simulationWorker = null;
let activeWorkerUrl = null;

function initApp() {
  console.log('[Main] initApp() called. Document readyState:', document.readyState);

  // 1. 차트 요소 구성 초기화
  initChart();

  // 2. 기본 초기 데이터 상태로 초기 차트 렌더링
  redrawChart();

  // 3. 시뮬레이션 실행 버튼 이벤트 연결
  const btnRun = document.querySelector(SELECTORS.btnRun);
  if (btnRun) {
    btnRun.addEventListener('click', handleRunSimulation);
  }

  // 4. 창 크기 변경 시 차트 반응형 레이아웃 갱신
  window.addEventListener('resize', () => {
    redrawChart();
  });

  // 5. 입력 필드 - 슬라이더(Range) 양방향 동기화 설정
  setupDualInputBindings();

  // 6. LaTeX 수학 수식 파싱 가동
  triggerMathRendering();
}

/**
 * KaTeX 자동 렌더링 라이브러리를 호출해 문서 내 수식을 미려하게 렌더링합니다.
 */
function triggerMathRendering() {
  if (typeof renderMathInElement === "function") {
    renderMathInElement(document.body, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '\\(', right: '\\)', display: false}
      ],
      throwOnError: false
    });
    console.log('[Main] KaTeX mathematical rendering triggered.');
  }
}

/**
 * 숫자 입력창과 Range 슬라이더의 양방향 이벤트를 연동합니다.
 */
function setupDualInputBindings() {
  const inputHouseholds = document.querySelector(SELECTORS.inputHouseholds);
  const rangeHouseholds = document.querySelector(SELECTORS.rangeHouseholds);
  const inputSexRatio = document.querySelector(SELECTORS.inputSexRatio);
  const rangeSexRatio = document.querySelector(SELECTORS.rangeSexRatio);

  if (inputHouseholds && rangeHouseholds) {
    // Number 입력 ➡️ Range 동기화 (로그 변환)
    inputHouseholds.addEventListener('input', () => {
      let val = parseInt(inputHouseholds.value, 10);
      if (isNaN(val)) return;
      val = Math.max(100, Math.min(10000000000, val));
      rangeHouseholds.value = Math.log10(val);
    });
    // Range 입력 ➡️ Number 동기화 (지수 변환)
    rangeHouseholds.addEventListener('input', () => {
      const exponent = parseFloat(rangeHouseholds.value);
      inputHouseholds.value = Math.round(Math.pow(10, exponent));
    });
  }

  if (inputSexRatio && rangeSexRatio) {
    inputSexRatio.addEventListener('input', () => {
      let val = parseFloat(inputSexRatio.value);
      if (isNaN(val)) return;
      val = Math.max(80, Math.min(120, val));
      rangeSexRatio.value = val;
    });
    rangeSexRatio.addEventListener('input', () => {
      inputSexRatio.value = rangeSexRatio.value;
    });
  }
}

function checkAndInit() {
  // 의존성 함수들이 올바르게 렌더링 준비를 갖췄는지 체크
  if (typeof initChart === "function" && 
      typeof SELECTORS !== "undefined") {
    initApp();
  } else {
    setTimeout(checkAndInit, 10);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", checkAndInit);
} else {
  checkAndInit();
}

/**
 * Blob URL 방식을 이용해 인라인 웹 워커를 실행하고 결과를 UI에 표시합니다.
 */
function handleRunSimulation() {
  console.log('[Main] handleRunSimulation() triggered.');
  const btnRun = document.querySelector(SELECTORS.btnRun);
  const spinner = document.querySelector(SELECTORS.loadingSpinner);
  const spinnerPercent = document.querySelector(SELECTORS.loadingPercent);
  const householdsInput = document.querySelector(SELECTORS.inputHouseholds);
  const sexRatioInput = document.querySelector(SELECTORS.inputSexRatio);

  if (!householdsInput || !sexRatioInput) return;

  const householdsCount = parseInt(householdsInput.value, 10) || 16000000;
  const sexRatio = parseFloat(sexRatioInput.value) || 105;

  // Y축 최댓값을 사전에 수학적으로 예측하여 고정 (실시간 요동 방지)
  state.animation.maxVal = householdsCount * 1.3;

  // 1. 기존 동작 중인 워커 및 URL 리소스 명시적 정리
  cleanupActiveWorker();

  // 2. UI 로딩 상태 가시화 및 버튼 비활성화 (프리징 방지)
  if (btnRun) btnRun.disabled = true;
  if (spinnerPercent) spinnerPercent.innerText = '0%';
  if (spinner) {
    spinner.className = 'spinner-visible';
  }

  // 3. 인라인 Blob URL 생성 및 Web Worker 인스턴스 기동
  console.log('[Main] Creating Inline Blob Web Worker...');
  try {
    const blob = new Blob([SIMULATION_WORKER_CODE], { type: 'application/javascript' });
    activeWorkerUrl = URL.createObjectURL(blob);
    simulationWorker = new Worker(activeWorkerUrl);
  } catch (err) {
    console.error('[Main] Failed to instantiate Blob Web Worker:', err);
    if (btnRun) btnRun.disabled = false;
    if (spinner) spinner.className = 'spinner-hidden';
    return;
  }

  // 4. 연산 파라미터 전달 및 비동기 시작
  simulationWorker.postMessage({ householdsCount, sexRatio });

  // 5. 백그라운드 연산 진행 및 완료 수신 리스너 정의
  simulationWorker.onmessage = function(e) {
    const { type, percent, data } = e.data;

    // 5-1. 데이터 상태 동기화
    const { sonPrefer, twoChildren } = data;
    const sonPreferTotal = sonPrefer.male + sonPrefer.female;
    const sonPreferRate = sonPreferTotal / householdsCount;
    
    const twoChildrenTotal = twoChildren.male + twoChildren.female;
    const twoChildrenRate = twoChildrenTotal / householdsCount;

    state.simulationData.sonPrefer.male = sonPrefer.male;
    state.simulationData.sonPrefer.female = sonPrefer.female;
    state.simulationData.sonPrefer.totalBirths = sonPreferTotal;
    state.simulationData.sonPrefer.birthRate = sonPreferRate;

    state.simulationData.twoChildren.male = twoChildren.male;
    state.simulationData.twoChildren.female = twoChildren.female;
    state.simulationData.twoChildren.totalBirths = twoChildrenTotal;
    state.simulationData.twoChildren.birthRate = twoChildrenRate;

    // 5-2. 퍼센트 텍스트 갱신
    if (spinnerPercent) {
      spinnerPercent.innerText = `${percent}%`;
    }

    if (type === 'progress') {
      // 실시간 그래프 물오르듯 쌓이는 연출 드로잉
      updateChartRealtime();
    } 
    else if (type === 'complete') {
      console.log('[Main] Inline Worker simulation complete.');
      
      // 6. UI 입력 필드에 3개 최종 지표 바인딩
      updateResultUI(householdsCount);

      // 7. 최종 완성형 차트 갱신 (이중 애니메이션 없이 고정 좌표로 마감)
      updateChartRealtime();

      // 8. 워커 인스턴스 정리 및 UI 원복
      if (btnRun) btnRun.disabled = false;
      if (spinner) {
        spinner.className = 'spinner-hidden';
      }
      
      cleanupActiveWorker();
      triggerMathRendering();
      console.log('[Main] Worker execution cycle finished and cleaned.');
    }
  };
}

/**
 * 활성 워커 인스턴스를 중단하고 Blob URL 임시 객체를 가비지 컬렉션(GC) 회수 처리합니다.
 */
function cleanupActiveWorker() {
  if (simulationWorker) {
    simulationWorker.terminate();
    simulationWorker = null;
  }
  if (activeWorkerUrl) {
    URL.revokeObjectURL(activeWorkerUrl);
    activeWorkerUrl = null;
  }
}

/**
 * 3대 지표 수치 결과를 포맷팅하여 UI 인풋에 표기합니다.
 */
function updateResultUI(householdsCount) {
  // 남아선호사상 결과 DOM
  const spBirthsInput = document.querySelector(SELECTORS.resultSonPreferBirths);
  const spRateInput = document.querySelector(SELECTORS.resultSonPreferRate);
  const spRatioInput = document.querySelector(SELECTORS.resultSonPreferRatio);

  // 1가구 2자녀 결과 DOM
  const tcBirthsInput = document.querySelector(SELECTORS.resultTwoChildrenBirths);
  const tcRateInput = document.querySelector(SELECTORS.resultTwoChildrenRate);
  const tcRatioInput = document.querySelector(SELECTORS.resultTwoChildrenRatio);

  const sp = state.simulationData.sonPrefer;
  const tc = state.simulationData.twoChildren;

  // 남아선호사상 UI 반영
  if (spBirthsInput) spBirthsInput.value = formatCommas(sp.totalBirths);
  if (spRateInput) spRateInput.value = sp.birthRate.toFixed(3) + "명";
  if (spRatioInput) {
    const ratio = (sp.male / sp.female) * 100;
    spRatioInput.value = ratio.toFixed(2);
  }

  // 1가구 2자녀 UI 반영
  if (tcBirthsInput) tcBirthsInput.value = formatCommas(tc.totalBirths);
  if (tcRateInput) tcRateInput.value = tc.birthRate.toFixed(3) + "명";
  if (tcRatioInput) {
    const ratio = (tc.male / tc.female) * 100;
    tcRatioInput.value = ratio.toFixed(2);
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
 * 정밀한 정수 표기를 위한 세자리 컴마 헬퍼 함수
 */
function formatCommas(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
