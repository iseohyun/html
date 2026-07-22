/**
 * config.js
 * 복소평면 시뮬레이션의 전역 상태(state) 및 DOM 선택자(SELECTORS) 정의 모듈
 */

// 전역 UI DOM 선택자 정의
var SELECTORS = {
  svg: 'svg',
  ground: '#ground',
  controlPath: '#control-path',
  anglePath: '#angle-path',
  animatePath: '#animate-path',
  axisX: '#axis-x',
  axisY: '#axis-y',
  curPosition: '#cur-position',
  playBtn: '#play',
  tRange: '#t-value'
};

// 시뮬레이션 및 애니메이션 변수 런타임 상태 객체
var state = {
  unit: 100,
  points: [], // 각 점의 위치: { x: number, y: number, g: SVGElement }
  target: undefined, // 드래그 중인 타겟 정보: { element: SVGElement, index: number }
  mouse: { x: 0, y: 0 },
  t: 0.0,
  timer: null,
  A: 0, // 곱할 대상 점 index (1번 점)
  B: 1  // 곱할 대상 점 index (2번 점)
};
