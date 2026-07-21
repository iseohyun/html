/**
 * simulation.js
 * 베지어 곡선 수학 및 선형 보간(lerp) 계산 모듈 (DOM 의존성 없음)
 */

/**
 * 두 점 사이를 t 비율(0.0 ~ 1.0)로 선형 보간한 좌표를 리턴합니다.
 * @param {Object} p1 - { x, y }
 * @param {Object} p2 - { x, y }
 * @param {number} t - 매개변수 (0.0 ~ 1.0)
 * @returns {Object} - 보간된 좌표 { x, y }
 */
function lerp(p1, p2, t) {
  return {
    x: (p2.x - p1.x) * t + p1.x,
    y: (p2.y - p1.y) * t + p1.y
  };
}

/**
 * 제어점 목록과 매개변수 t를 바탕으로, 각 차수 단계별로 수렴하는 모든 보조선 좌표 단계를 재귀적으로 계산합니다.
 * 예: 4개 제어점 입력 시 [[P'0, P'1, P'2], [P''0, P''1], [P_final]] 리턴
 * @param {Array} points - [{ x, y }]
 * @param {number} t - 매개변수 (0.0 ~ 1.0)
 * @returns {Array} - 각 보간 단계별 점 좌표의 2차원 배열
 */
function calculateInterpolationSteps(points, t) {
  if (points.length < 2) return [];
  
  const steps = [];
  let currentLayer = points.map(p => ({ x: p.x, y: p.y }));
  
  while (currentLayer.length > 1) {
    const nextLayer = [];
    for (let i = 0; i < currentLayer.length - 1; i++) {
      nextLayer.push(lerp(currentLayer[i], currentLayer[i + 1], t));
    }
    steps.push(nextLayer);
    currentLayer = nextLayer;
  }
  
  return steps;
}

/**
 * 베지어 곡선의 특정 t 시점 궤적 종점 좌표를 리턴합니다.
 * @param {Array} points - [{ x, y }]
 * @param {number} t - 매개변수 (0.0 ~ 1.0)
 * @returns {Object} - 최종 궤적 좌표 { x, y }
 */
function getBezierPointAtT(points, t) {
  const steps = calculateInterpolationSteps(points, t);
  if (steps.length === 0) return { x: 0, y: 0 };
  const finalLayer = steps[steps.length - 1];
  return finalLayer[0];
}
