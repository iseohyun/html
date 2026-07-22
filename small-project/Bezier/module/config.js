/**
 * config.js
 * 전역 상태(state) 및 UI 엘리먼트 선택자 상수 관리 모듈
 */

var state = {
  points: [],      // 제어점 데이터 목록: { x: number, y: number, g: SVGElement }
  target: null,    // 현재 마우스 드래그 중인 제어점 정보: { element: SVGElement, index: number }
  t: 0.5,          // 선형 보간 매개변수 t 값 (0.0 ~ 1.0)
  timer: null,     // 애니메이션 타이머 ID
  isDraggingT: false // t 슬라이더 드래그 여부
};

var SELECTORS = {
  svg: "svg",
  ground: "#ground",
  controlPath: "#control-path",
  animatePath: "#animate-path",
  bezierPath: "#bezier-path",
  curPosition: "#cur-position",
  playBtn: "#play",
  tRange: "#t-value",
  addBtn: "#btn-add",
  removeBtn: "#btn-remove",
  reloadBtn: "#btn-reload",
  guideH: "#guide-h",
  guideV: "#guide-v",
  rulerContainer: "#ruler-container"
};
