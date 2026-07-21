/**
 * config.js
 * 시뮬레이션 및 차트의 설정값(상수), 색상 테마, UI 선택자 및 전역 상태(state)를 관리합니다.
 */

// UI DOM 요소 선택자 정의
const SELECTORS = {
  btnRun: '#btn-run',
  loadingSpinner: '#loading-spinner',
  loadingPercent: '#loading-percent',
  inputHouseholds: '#number-of-households',
  rangeHouseholds: '#range-households',
  inputSexRatio: '#sex-ratios',
  rangeSexRatio: '#range-sex-ratios',
  
  // 남아선호사상 결과 필드
  resultSonPreferBirths: '#son-prefer-births',
  resultSonPreferRate: '#son-prefer-rate',
  resultSonPreferRatio: '#son-prefer-ratio',
  
  // 1가구 2자녀 결과 필드
  resultTwoChildrenBirths: '#two-children-births',
  resultTwoChildrenRate: '#two-children-rate',
  resultTwoChildrenRatio: '#two-children-ratio',
  
  svg: 'svg',
  bottomLine: '#bottom-line',
  verticalGridline: '#vertical-grideline',
  verticalText: '#vertical-text'
};

// 차트 관련 상수 정의
const CHART_CONFIG = {
  barWidth: 50,
  chartHeight: 300, // 그리드 기준 기본 높이
  animationIntervalMs: 10,
  animationStep: 0.01,
  // 색상 테마 (남아선호_남, 남아선호_여, 2자녀_남, 2자녀_여)
  colors: ['#0000FF', '#FF0000', '#8888FF', '#FF8888']
};

// 시뮬레이션 및 애니메이션의 런타임 상태 객체
const state = {
  // 시뮬레이션 누적 데이터
  simulationData: {
    sonPrefer: { male: 105, female: 100, totalBirths: 205, birthRate: 1.95 },
    twoChildren: { male: 105, female: 100, totalBirths: 205, birthRate: 2.00 }
  },
  
  // 차트 엘리먼트 캐싱
  chartElements: {
    bars: [],
    labels: [],
    values: []
  },
  
  // 애니메이션 변수
  animation: {
    timer: null,
    progress: 0, // 0 ~ 1
    maxVal: 105 // Y축 기준 최대값
  }
};
