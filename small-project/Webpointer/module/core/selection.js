(function(window) {
  'use strict';

  var cfg = window.WebpointerConfig;

  function getStepCoords(e) {
    var svgBox = document.getElementById('mainSvg');
    if (!svgBox) return { stepX: 0, stepY: 0, rawX: 0, rawY: 0, px: 0, py: 0 };
    var rect = svgBox.getBoundingClientRect();

    var mouseX = e.clientX - rect.left;
    var mouseY = e.clientY - rect.top;

    var px = (mouseX / rect.width) * (cfg.SVG_WIDTH || 960);
    var py = (mouseY / rect.height) * (cfg.SVG_HEIGHT || 540);

    var rawX = Math.round(px);
    var rawY = Math.round(py);

    var stepX = Math.round((rawX / (cfg.SVG_WIDTH || 960)) * (cfg.STEPS_X || 40));
    var stepY = Math.round((rawY / (cfg.SVG_HEIGHT || 540)) * (cfg.STEPS_Y || 40));

    stepX = Math.max(0, Math.min(cfg.STEPS_X || 40, stepX));
    stepY = Math.max(0, Math.min(cfg.STEPS_Y || 40, stepY));

    return { stepX: stepX, stepY: stepY, rawX: rawX, rawY: rawY, px: px, py: py };
  }

  function getDistanceToObj(px, py, obj) {
    var a = obj.attrs;
    if (obj.type === 'point') {
      return Math.hypot(px - a.cx, py - a.cy);
    } else if (obj.type === 'line') {
      var x1 = a.x1, y1 = a.y1, x2 = a.x2, y2 = a.y2;
      var A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
      var dot = A * C + B * D;
      var lenSq = C * C + D * D;
      var param = lenSq !== 0 ? dot / lenSq : -1;
      var xx, yy;
      if (param < 0) { xx = x1; yy = y1; }
      else if (param > 1) { xx = x2; yy = y2; }
      else { xx = x1 + param * C; yy = y1 + param * D; }
      return Math.hypot(px - xx, py - yy);
    } else if (obj.type === 'rect' || obj.type === 'rounded') {
      var rx = a.x, ry = a.y, rw = a.width, rh = a.height;
      if (px >= rx && px <= rx + rw && py >= ry && py <= ry + rh) return 0;
      var dx = Math.max(rx - px, 0, px - (rx + rw));
      var dy = Math.max(ry - py, 0, py - (ry + rh));
      return Math.hypot(dx, dy);
    } else if (obj.type === 'text') {
      var bounds = window.WebpointerObjects ? window.WebpointerObjects.getObjectBounds(obj) : { minX: a.x, maxX: a.x + 80, minY: a.y - 20, maxY: a.y };
      if (px >= bounds.minX && px <= bounds.maxX && py >= bounds.minY && py <= bounds.maxY) return 0;
      var dX = Math.max(bounds.minX - px, 0, px - bounds.maxX);
      var dY = Math.max(bounds.minY - py, 0, py - bounds.maxY);
      return Math.hypot(dX, dY);
    } else if (obj.type === 'ellipse' || obj.type === 'arc') {
      return Math.hypot(px - a.cx, py - a.cy);
    } else if (obj.type === 'bez2' || obj.type === 'bez3') {
      if (a.points && a.points.length > 0) {
        var minD = Infinity;
        a.points.forEach(function(pt) {
          var dPt = Math.hypot(px - pt.px, py - pt.py);
          if (dPt < minD) minD = dPt;
        });
        return minD;
      }
      return Math.hypot(px - a.x1, py - a.y1);
    }
    return Infinity;
  }

  function findNearestObject(px, py) {
    var threshold = cfg.proximityThreshold !== undefined ? cfg.proximityThreshold : 30;
    if (threshold <= 0) return null;

    var nearestObj = null;
    var minDistance = Infinity;

    cfg.objectsMap.forEach(function(obj) {
      var d = getDistanceToObj(px, py, obj);
      if (d < minDistance) {
        minDistance = d;
        nearestObj = obj;
      }
    });

    if (nearestObj && minDistance <= threshold) {
      return nearestObj;
    }
    return null;
  }

  function selectObjectWithGroup(objId, isToggle) {
    if (!isToggle) cfg.selectedIds.clear();

    var target = cfg.objectsMap.get(objId);
    if (!target) return;

    if (target.parentId) {
      cfg.objectsMap.forEach(function(o, id) {
        if (o.parentId === target.parentId) {
          if (isToggle && cfg.selectedIds.has(id)) cfg.selectedIds.delete(id);
          else cfg.selectedIds.add(id);
        }
      });
    } else {
      if (isToggle && cfg.selectedIds.has(objId)) cfg.selectedIds.delete(objId);
      else cfg.selectedIds.add(objId);
    }
  }

  window.WebpointerSelection = {
    getStepCoords: getStepCoords,
    getDistanceToObj: getDistanceToObj,
    findNearestObject: findNearestObject,
    selectObjectWithGroup: selectObjectWithGroup
  };
})(window);
