/**
 * simulation.js
 * 복소평면의 좌표계 변환 및 복소수 곱셈 연산을 처리하는 순수 비즈니스 로직 모듈입니다.
 * DOM에 직접 의존하지 않고 전달받은 매개변수를 이용해 순수 함수로 동작합니다.
 */

/**
 * 소수점 2자리 반올림 정렬용 헬퍼 함수
 */
function T(num) {
  return Math.round(num * 100) / 100;
}

/**
 * 수학적 복소평면 좌표 (x, y)를 SVG 캔버스 상의 픽셀 좌표로 변환합니다.
 */
function coordinatesToSvg(point, unit, width, height) {
  return {
    x: point.x * unit + width / 2,
    y: -point.y * unit + height / 2
  };
}

/**
 * SVG 캔버스 상의 픽셀 좌표를 수학적 복소평면 좌표 (x, y)로 변환합니다.
 */
function svgToCoordinates(point, unit, width, height) {
  return {
    x: (point.x - width / 2) / unit,
    y: (height / 2 - point.y) / unit
  };
}

/**
 * 두 복소수 pi와 pj의 곱셈 결과에 매개변수 t(0.0 ~ 1.0)를 보간 적용한 값을 계산합니다.
 * Z3 = (Z1 * Z2) * t
 */
function multiplyComplex(pi, pj, t) {
  return {
    x: (pi.x * pj.x - pi.y * pj.y) * t,
    y: (pi.x * pj.y + pi.y * pj.x) * t
  };
}
