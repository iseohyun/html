(function(window) {
  'use strict';

  var cfg = window.WebpointerConfig;
  var state = window.WebpointerState;

  function buildContinuousBezierPathD(pts, activePt, toolType, firstCtrl, hoverPt, liveCtrl, ctrls3Arr) {
    if (!pts || pts.length === 0) return '';
    var fullPts = pts.slice();
    if (activePt) fullPts.push(activePt);
    if (fullPts.length === 0) return '';

    var d = 'M ' + fullPts[0].px + ' ' + fullPts[0].py;
    if (fullPts.length === 1) return d;

    if (toolType === 'bez2') {
      var P0 = fullPts[0];
      var P1 = fullPts[1];
      var c1x = firstCtrl ? firstCtrl.cx : Math.round((P0.px + P1.px) / 2);
      var c1y = firstCtrl ? firstCtrl.cy : (Math.min(P0.py, P1.py) - 100);

      d += ' Q ' + c1x + ' ' + c1y + ', ' + P1.px + ' ' + P1.py;

      var prevC = { x: c1x, y: c1y };
      for (var i = 2; i < fullPts.length; i++) {
        var prevP = fullPts[i - 1];
        var currP = fullPts[i];
        var reflX = 2 * prevP.px - prevC.x;
        var reflY = 2 * prevP.py - prevC.y;
        d += ' Q ' + reflX + ' ' + reflY + ', ' + currP.px + ' ' + currP.py;
        prevC = { x: reflX, y: reflY };
      }
    } else if (toolType === 'bez3') {
      ctrls3Arr = ctrls3Arr || [];
      for (var seg = 0; seg < fullPts.length - 1; seg++) {
        var pStart = fullPts[seg];
        var pEnd = fullPts[seg + 1];
        var ctrl1, ctrl2;

        if (ctrls3Arr[seg]) {
          ctrl1 = ctrls3Arr[seg].c1;
          ctrl2 = ctrls3Arr[seg].c2;
        } else {
          if (seg === 0) {
            ctrl1 = { x: pStart.px, y: Math.round((pStart.py + pEnd.py) / 2 - 50) };
            ctrl2 = { x: pEnd.px, y: Math.round((pStart.py + pEnd.py) / 2 - 50) };
          } else {
            var prevC2 = ctrls3Arr[seg - 1].c2;
            ctrl1 = { x: 2 * pStart.px - prevC2.x, y: 2 * pStart.py - prevC2.y };
            ctrl2 = { x: pEnd.px, y: Math.round((pStart.py + pEnd.py) / 2 - 50) };
          }
        }
        d += ' C ' + ctrl1.x + ' ' + ctrl1.y + ', ' + ctrl2.x + ' ' + ctrl2.y + ', ' + pEnd.px + ' ' + pEnd.py;
      }
    }
    return d;
  }

  function finishMultiBezier() {
    if (!state.isMultiBezierActive) return;

    if (state.activeBezierObj) {
      var finalD = buildContinuousBezierPathD(state.bezierPoints, null, cfg.currentTool, state.activeBezierObj.attrs.firstCtrl, null, null, state.activeBezierObj.attrs.ctrls3);
      state.activeBezierObj.attrs.pathD = finalD;
      state.activeBezierObj.attrs.points = state.bezierPoints.slice();

      if (state.bezierPoints.length >= 2 && !state.activeBezierObj.attrs.firstCtrl && cfg.currentTool === 'bez2') {
        var p0 = state.bezierPoints[0], p1 = state.bezierPoints[1];
        state.activeBezierObj.attrs.firstCtrl = {
          cx: Math.round((p0.px + p1.px) / 2),
          cy: Math.min(p0.py, p1.py) - 100
        };
      }
      if (window.WebpointerRender && window.WebpointerRender.updateElementAttributes) {
        window.WebpointerRender.updateElementAttributes(state.activeBezierObj);
      }
    }

    state.isMultiBezierActive = false;
    state.bezierPoints = [];
    state.activeBezierObj = null;
  }

  window.WebpointerBezier = {
    buildContinuousBezierPathD: buildContinuousBezierPathD,
    finishMultiBezier: finishMultiBezier
  };
})(window);
